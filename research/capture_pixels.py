"""Reject missing ordinary text and mismatched source-bound illustration ink.

Source rasters are resampled to the recorded display size before comparison.
These are bounded paint checks, not typography, appearance, or authenticity proof.
MathJax glyphs and occluded/hidden text remain excluded from the text check.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import re
import sys
import numpy as np
from PIL import Image


def validate_text_pixels(path: Path, frame: dict, root: Path | None = None) -> dict:
    width, height = frame["viewportWidth"], frame["viewportHeight"]
    if not all(isinstance(v,(int,float)) and math.isfinite(v) and v>0 for v in (width,height)):
        raise ValueError("Invalid capture viewport")
    if not frame["rectangles"] and not frame.get("images"):
        raise ValueError(f"Reader capture has no visible ordinary text to verify: {path.name}")
    with Image.open(path) as image:
        pixels = np.asarray(image.convert("RGB"),dtype=np.int16)
    scale_x,scale_y=pixels.shape[1]/width,pixels.shape[0]/height
    if abs(scale_x-scale_y)>.02:
        raise ValueError("Capture/viewport scale mismatch")
    missing=[]
    for rectangle in frame["rectangles"]:
        x,y,w,h=(rectangle[k] for k in ("x","y","width","height"))
        if not all(isinstance(v,(int,float)) and math.isfinite(v) for v in (x,y,w,h)) or min(w,h)<=0 or x<0 or y<0 or x+w>width+.01 or y+h>height+.01:
            raise ValueError("Invalid visible text rectangle")
        color=re.fullmatch(r"rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)",rectangle["color"])
        if color is None:raise ValueError("Unsupported text color")
        rgb=np.array([float(color[i]) for i in (1,2,3)])
        if np.any(rgb<0) or np.any(rgb>255) or (color[4] is not None and float(color[4])!=1):
            raise ValueError("Unsupported translucent text color")
        patch=pixels[math.floor(y*scale_y):math.ceil((y+h)*scale_y),math.floor(x*scale_x):math.ceil((x+w)*scale_x)]
        ink=int(np.count_nonzero(np.max(np.abs(patch-rgb),axis=2)<70))
        if ink<max(1,patch.shape[0]*patch.shape[1]*.001):
            missing.append({"y":y,"text":rectangle["text"],"inkPixels":ink})
    if missing:raise ValueError(f"Missing text paint in {path.name}: {json.dumps(missing)}")
    image_checks = []
    for region in frame.get("images", []):
        if root is None:
            raise ValueError("Image paint validation requires its bound project root")
        source = root / region["source"]
        if not source.resolve(strict=True).is_relative_to(root) or any(p.is_symlink() for p in (source, *source.parents)):
            raise ValueError("Unconfined reading image")
        values = [region[key] for key in ("x", "y", "width", "height", "imageX", "imageY", "imageWidth", "imageHeight")]
        if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in values):
            raise ValueError("Invalid reading image geometry")
        x,y,w,h,ix,iy,iw,ih = values
        if (min(w,h,iw,ih) <= 0 or x<0 or y<0 or x+w>width+.01 or y+h>height+.01
            or x<ix-.01 or y<iy-.01 or x+w>ix+iw+.01 or y+h>iy+ih+.01):
            raise ValueError("Invalid reading image bounds")
        with Image.open(source) as picture:
            rendered = picture.convert("RGB").resize((max(1,round(iw*scale_x)),max(1,round(ih*scale_y))),Image.Resampling.LANCZOS)
            expected = np.asarray(rendered, dtype=np.int16)
        gx,gy = np.meshgrid(np.linspace(x+.5,x+w-.5,80),np.linspace(y+.5,y+h-.5,80))
        sx = np.clip(((gx-ix)/iw*expected.shape[1]).astype(int),0,expected.shape[1]-1)
        sy = np.clip(((gy-iy)/ih*expected.shape[0]).astype(int),0,expected.shape[0]-1)
        colors = expected[sy,sx]
        ink = np.min(colors,axis=2)<150
        if np.count_nonzero(ink)<5:
            raise ValueError(f"Insufficient source ink to verify reading image: {path.name}")
        tx=np.clip((gx[ink]*scale_x).astype(int),0,pixels.shape[1]-1)
        ty=np.clip((gy[ink]*scale_y).astype(int),0,pixels.shape[0]-1)
        differences=np.full(tx.shape,1000,dtype=np.int16)
        for dx in range(-2,3):
            for dy in range(-2,3):
                actual=pixels[np.clip(ty+dy,0,pixels.shape[0]-1),np.clip(tx+dx,0,pixels.shape[1]-1)]
                differences=np.minimum(differences,np.max(np.abs(actual-colors[ink]),axis=1))
        matched=float(np.mean(differences<55))
        if matched<.70:
            raise ValueError(f"Missing or mismatched image paint in {path.name}: {matched:.3f}")
        image_checks.append({"source":region["source"],"inkSamples":int(np.count_nonzero(ink)),"matchedFraction":matched})
    return {"path":str(path),"rectangles":len(frame["rectangles"]),"images":image_checks,"missing":0}


def main() -> None:
    from research.manuscript import ROOT
    vault=next(p for p in ROOT.parents if (p/"vault.toml").is_file())
    if not all(Path(p).resolve().is_relative_to(vault) for p in (sys.prefix,sys.base_prefix)):
        raise ValueError("Both Python prefixes must reside on GitVault")
    parser=argparse.ArgumentParser(__doc__);parser.add_argument("manifest",type=Path);args=parser.parse_args()
    def confined(path: Path, *, exists: bool) -> Path:
        if not path.is_absolute():path=ROOT/path
        if not path.is_relative_to(ROOT) or ".." in path.parts:
            raise ValueError("Capture path outside project")
        for ancestor in (path,*path.parents):
            if ancestor.is_symlink():raise ValueError(f"Capture symlink boundary: {ancestor}")
            if ancestor==ROOT:break
        if not path.resolve(strict=exists).is_relative_to(ROOT):
            raise ValueError("Capture path outside project")
        return path
    manifest=confined(args.manifest,exists=True)
    frames=json.loads(manifest.read_text());rows=[]
    if not isinstance(frames,list) or not frames:raise ValueError("Empty reader frame manifest")
    for frame in frames:
        path=confined(ROOT/frame["path"],exists=True)
        rows.append(validate_text_pixels(path,frame,ROOT))
    output=confined(manifest.with_name(manifest.stem+"-validation.json"),exists=False)
    output.write_text(json.dumps({"frames":len(rows),"rectangles":sum(row["rectangles"] for row in rows),"missing":0,"checks":rows},indent=2)+"\n")
    print(json.dumps({"frames":len(rows),"rectangles":sum(row["rectangles"] for row in rows),"missing":0}))


if __name__=="__main__":main()
