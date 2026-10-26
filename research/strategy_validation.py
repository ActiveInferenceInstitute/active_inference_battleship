"""Verify retained statistical outputs against all declared pairs, never selected rows."""
import json
import math
from pathlib import Path
from research.strategy_analysis import ROOT, analyze, digest, verify_study


def validate_strategy_outputs(root: Path = ROOT) -> dict:
    data=verify_study(root)
    path=root/"research/generated/strategy-study/analysis.json"
    retained=json.loads(path.read_text())
    expected=analyze(data)
    if (retained["resultsSha256"]!=digest(root/"research/generated/strategy-study/results.json") or
        retained["analysisSha256"]!=digest(root/"research/strategy_analysis.py") or
        any(retained.get(key)!=value for key,value in expected.items())):
        raise ValueError("Changed or inconsistent strategy analysis")
    comparisons=retained["comparisons"]
    if len(comparisons)!=24 or any(r["wins"]+r["ties"]+r["losses"]!=128 for r in comparisons):
        raise ValueError("Incomplete planned strategy comparison family")
    return {"searches":len(data["cases"]),"shots":sum(c["shots"] for c in data["cases"]),
            "pairedUnits":256,"comparisons":len(comparisons),
            "combinedCompletionTies":sum(r["ties"] for r in comparisons if r["profile"]=="combined" and r["endpoint"]=="shots")}


def require_placed_font(source_points: float, dpi: float, pixels: int, placed_width_points: float) -> float:
    if not all(math.isfinite(value) and value>0 for value in (source_points,dpi,pixels,placed_width_points)):
        raise ValueError("Invalid scientific figure dimensions")
    actual=source_points*placed_width_points/(pixels/dpi*72)
    if actual<9:
        raise ValueError(f"Scientific figure text below 9 points after placement: {actual}")
    return actual


def validate_figure_fonts(root: Path, pdf: Path) -> dict:
    import re
    import pdfplumber
    from PIL import Image
    content="\n".join(p.read_text() for p in sorted((root/"manuscript").glob("[0-9][0-9]_*.md")))
    authored=re.findall(r"!\[[^\]]*\]\(([^)]+)\)",content)
    metadata=json.loads((root/"research/generated/strategy-study/figure-text.json").read_text())
    main_geometry=json.loads((root/"research/generated/main-figure-geometry.json").read_text())
    if set(main_geometry)!={"architecture","analytic-tradeoff"} or metadata.keys()&main_geometry.keys():
        raise ValueError("Incomplete or duplicate main figure geometry metadata")
    metadata.update(main_geometry)
    with pdfplumber.open(pdf) as document:
        images=[image for page in document.pages for image in page.images]
    if len(images)!=len(authored): raise ValueError("Figure order/count differs from authored sources")
    measurements={}
    for relative,placed in zip(authored,images,strict=True):
        name=Path(relative).stem
        if name not in metadata: continue
        width=Image.open(root/"manuscript"/relative).width
        info=metadata[name]
        measurements[name]=require_placed_font(info["minimumSourceFontPt"],info["dpi"],width,placed["width"])
    if set(measurements)!=set(metadata): raise ValueError("Incomplete scientific font placement checks")
    return measurements
