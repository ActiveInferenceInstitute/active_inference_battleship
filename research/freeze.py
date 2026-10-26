"""Freeze review inputs separately from the later acceptance report."""
import json
import argparse
import re
from pathlib import Path
import struct

from research.manuscript import ROOT, sha


def require_paint_coverage(captures: list[dict], frames: list[dict], *, native: bool) -> None:
    expected={row["path"] for row in captures
              if not native or re.fullmatch(r"output/qa/zoom/(light|dark)-\d+\.png",row["path"])}
    checked=[row["path"] for row in frames]
    if not expected or set(checked)!=expected or len(checked)!=len(set(checked)):
        raise ValueError("Incomplete or duplicate reader-paint coverage")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--round",required=True)
    round_name = parser.parse_args().round
    if re.fullmatch(r"r[1-9][0-9]*",round_name) is None:
        raise ValueError("Review round must be r followed by a positive integer")
    output = ROOT/f".cache/manuscript-review-{round_name}"
    if output.exists():
        raise ValueError(f"Refusing to overwrite frozen review: {output}")
    for name,paint in (("html-captures","reader-paint"),("native-zoom","reader-paint-native")):
        capture=json.loads((ROOT/f"output/{name}.json").read_text())
        validation=json.loads((ROOT/f"output/{paint}-validation.json").read_text())
        frames=json.loads((ROOT/f"output/{paint}.json").read_text())
        require_paint_coverage(capture["captures"],frames,native=name=="native-zoom")
        if capture.get("completed") is not True or validation["missing"]!=0 or validation["frames"]!=len(frames):
            raise ValueError(f"Incomplete reader capture/paint gate: {name}")
        captured={row["path"]:row["sha256"] for row in capture["captures"]}
        for frame in frames:
            if captured.get(frame["path"])!=frame["sha256"] or sha(ROOT/frame["path"])!=frame["sha256"]:
                raise ValueError(f"Unbound reader paint frame: {frame['path']}")
    if json.loads((ROOT/"output/menu-captures.json").read_text()).get("completed") is not True:
        raise ValueError("Incomplete menu capture gate")
    sources = []
    for directory in ("src","scripts","tests","e2e","models","manuscript","research","docs"):
        sources += [p for p in (ROOT/directory).rglob("*")
                    if p.is_file() and "__pycache__" not in p.parts]
    for name in ("README.md","DESIGN.md","project.json","package.json","bun.lock","biome.json","tsconfig.json",
                 "vite.config.ts","playwright.config.ts","index.html",".gitignore"):
        sources.append(ROOT/name)
    def rows(paths):
        return [{"path":str(p.relative_to(ROOT)),"sha256":sha(p),
                 "size":p.stat().st_size,"mtimeNs":p.stat().st_mtime_ns}
                for p in sorted(set(paths))]
    source_rows = rows(sources)
    manifests = [ROOT/"output/page-manifest.json",ROOT/"output/html-captures.json",ROOT/"output/native-zoom.json",ROOT/"output/menu-captures.json"]
    captures = []
    for manifest in manifests:
        captures += [{**capture,"surface":"manuscript"} for capture in json.loads(manifest.read_text())["captures"]]
    app_manifest=ROOT/".cache/capture-manifest.json"
    captures += [{**capture,"surface":"dashboard"} for capture in json.loads(app_manifest.read_text())]
    manifests += [app_manifest,ROOT/".cache/source-manifest.json"]
    image_rows = []
    for capture in captures:
        path = ROOT/capture["path"]
        content = path.read_bytes()
        if content[:8] != b"\x89PNG\r\n\x1a\n" or sha(path)!=capture["sha256"]:
            raise ValueError(f"Capture custody failure: {path}")
        width,height=struct.unpack(">II",content[16:24])
        image_rows.append({**capture,"width":width,"height":height,"size":len(content),
                           "mtimeNs":path.stat().st_mtime_ns})
    rendered_inputs = [p for p in sources if p.is_relative_to(ROOT/"manuscript")]
    latest_input = max(p.stat().st_mtime_ns for p in rendered_inputs)
    if any(row["mtimeNs"]<latest_input for row in image_rows if row["surface"]=="manuscript"):
        raise ValueError("Capture predates a manuscript rendering input")
    app_inputs = [p for p in sources if p.is_relative_to(ROOT/"src") or p.is_relative_to(ROOT/"models")]
    app_inputs += [ROOT/"project.json",ROOT/"index.html"]
    if any(row["mtimeNs"]<max(p.stat().st_mtime_ns for p in app_inputs)
           for row in image_rows if row["surface"]=="dashboard"):
        raise ValueError("Capture predates a dashboard rendering input")
    files = [ROOT/row["path"] for row in image_rows]+sources+manifests
    for directory in ("pdf","docx","docx-native","web","figures","reports"):
        files += [p for p in (ROOT/"output"/directory).rglob("*") if p.is_file()]
    files += [p for p in (ROOT/"output").glob("*.json")]
    files += [p for p in (ROOT/".cache").glob("manuscript-*.log")]
    files += [p for p in (ROOT/".cache").glob("institute-*.log")]
    files += [p for p in (ROOT/".cache").glob("*-probe.ts")]
    files += [p for p in (ROOT/".cache/browser-states").rglob("*.json")]
    files += [p for p in (ROOT/".cache/native-zoom").rglob("*.json")]
    files += [p for p in (ROOT/".cache/browser-matrix").rglob("*") if p.is_file()]
    files += [p for p in (ROOT/".cache/performance").rglob("*.json")]
    files += [p for p in (ROOT/".cache").glob("institute-*.json")]
    files += [ROOT/".cache/skip-capture-results.json"]
    files += [p for p in (ROOT/"dist").rglob("*") if p.is_file()]
    files += [p for p in (ROOT/"test-results").rglob("*") if p.is_file()]
    output.mkdir(parents=True,exist_ok=False)
    for name,data in [("source-manifest.json",source_rows),("capture-manifest.json",image_rows),
                      ("input-manifest.json",rows(files))]:
        (output/name).write_text(json.dumps(data,indent=2)+"\n")
    print(json.dumps({"sources":len(source_rows),"captures":len(image_rows),"inputs":len(set(files)),
                      "manifests":{p.name:sha(p) for p in output.glob("*.json")}},indent=2))


if __name__=="__main__": main()
