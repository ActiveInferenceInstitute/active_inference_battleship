"""Source-bound figures and the real docxology/template three-edition renderer.

Run with the template's existing external environment through scripts/manuscript.ts.
This module never installs dependencies or changes the template checkout.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def project_metadata(root: Path = ROOT) -> dict:
    import yaml
    from research.publication_style import author_contact
    author_contact(root)
    metadata = json.loads((root/"project.json").read_text())
    config = yaml.safe_load((root/"manuscript/config.yaml").read_text())
    if (metadata["organization"] != "Active Inference Institute" or
        metadata["language"] != "en-US" or metadata["releaseStatus"] != "published" or
        metadata["repository"] != "https://github.com/ActInfInstitute/active_inference_battleship" or
        not re.fullmatch(r"10\.5281/zenodo\.[1-9][0-9]+", metadata.get("manuscriptDoi") or "") or
        metadata["softwareDoi"] is not None):
        raise ValueError("Inconsistent published project metadata")
    if (config["paper"]["title"] != metadata["title"] or
        config["paper"]["version"] != metadata["version"] or
        config["metadata"]["language"] != metadata["language"] or
        config["publication"]["release_status"] != metadata["releaseStatus"] or
        config["publication"].get("doi") != metadata["manuscriptDoi"]):
        raise ValueError("Manuscript metadata differs from project metadata")
    abstract = (root/"manuscript/00_abstract.md").read_text()
    if (metadata["repository"] not in abstract or "Zenodo" not in abstract or
        "https://doi.org/" + metadata["manuscriptDoi"] not in abstract or
        "planned public release" in abstract):
        raise ValueError("Abstract is missing the published release statement")
    return metadata


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_input_snapshot(root: Path, expected: dict[str, str]) -> None:
    for relative, digest in expected.items():
        path = root/relative
        if not path.is_file() or sha(path) != digest:
            raise RuntimeError(f"Manuscript input changed during rendering: {relative}")


def require_figure_geometry(figure, name: str, boxed_text=()) -> dict:
    from matplotlib.text import Text
    figure.canvas.draw()
    renderer=figure.canvas.get_renderer()
    canvas=figure.bbox
    inactive_ticks=set()
    for ax in figure.axes:
        for axis in (ax.xaxis,ax.yaxis):
            low,high=sorted(axis.get_view_interval())
            for tick in [*axis.get_major_ticks(),*axis.get_minor_ticks()]:
                # Matplotlib retains Text objects for locator ticks outside the
                # view, but Axis.draw excludes those ticks from the actual image.
                if not ax.axison or not axis.get_visible() or not low<=tick.get_loc()<=high:
                    inactive_ticks.update((tick.label1,tick.label2))
    texts=[t for t in figure.findobj(Text) if t not in inactive_ticks and t.get_visible() and t.get_text().strip()]
    for text in texts:
        bounds=text.get_window_extent(renderer)
        if (bounds.x0<canvas.x0-.5 or bounds.y0<canvas.y0-.5 or
            bounds.x1>canvas.x1+.5 or bounds.y1>canvas.y1+.5):
            raise ValueError(f"Figure text outside canvas: {name}: {text.get_text()}")
    for patch,text in boxed_text:
        outer=patch.get_window_extent(renderer)
        inner=text.get_window_extent(renderer)
        if (inner.x0<outer.x0+.5 or inner.y0<outer.y0+.5 or
            inner.x1>outer.x1-.5 or inner.y1>outer.y1-.5):
            raise ValueError(f"Figure text outside box: {name}: {text.get_text()}")
    return {"minimumSourceFontPt":min(t.get_fontsize() for t in texts),
            "dpi":220,"textBoundsChecked":len(texts),"boxedLabelsChecked":len(boxed_text)}


def verify_results(root: Path = ROOT) -> dict:
    result = json.loads((root / "research/generated/results.json").read_text())
    for relative, expected in result["sources"].items():
        if sha(root / relative) != expected:
            raise ValueError(f"Stale research input: {relative}")
    protocol = json.loads((root / "research/protocol.json").read_text())
    model = json.loads((root / "src/generated/model.json").read_text())
    if (protocol["boardSize"] != model["parameters"]["board_size"] or
        protocol["shipLengths"] != model["parameters"]["ship_lengths"]):
        raise ValueError("Research rules differ from the compiled GNN model")
    if sha(root/"models/battleship.gnn.md") != model["source"]["specificationSha256"]:
        raise ValueError("Compiled GNN specification binding differs")
    expected_cases = len(protocol["seeds"]) * len(protocol["catalogueSizes"]) * 4
    if len(result["cases"]) != expected_cases:
        raise ValueError("Incomplete research cases")
    keys = set()
    for case in result["cases"]:
        key = (case["count"], case["seed"], case["policy"])
        if key in keys:
            raise ValueError("Duplicate research case")
        keys.add(key)
        trace = case["trace"]
        if len(trace) != case["shots"] or not 17 <= len(trace) <= 100:
            raise ValueError("Invalid search length")
        if len({step["cell"] for step in trace}) != len(trace):
            raise ValueError("Repeated research shot")
        if sum(step["hit"] for step in trace) != 17:
            raise ValueError("Incomplete fleet search")
    expected_keys = {(n,s,p) for n in protocol["catalogueSizes"] for s in protocol["seeds"]
                     for p in protocol["policies"]}
    if keys != expected_keys:
        raise ValueError("Unexpected or missing research case")
    return result


def figures() -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
    import numpy as np

    data = verify_results()
    output = ROOT / "manuscript/figures"
    output.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 18,
                         "axes.spines.top": False, "axes.spines.right": False,
                         "savefig.facecolor": "white", "svg.fonttype": "none"})

    figure_geometry={}
    def save(fig, name, boxed_text=(), record_geometry=True):
        geometry=require_figure_geometry(fig,name,boxed_text)
        if record_geometry:figure_geometry[name]=geometry
        for extension in ("png", "pdf", "svg"):
            fig.savefig(output / f"{name}.{extension}", dpi=220, bbox_inches="tight", pad_inches=0.16)
        plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 5.3),layout="constrained")
    ax.set(xlim=(0, 10), ylim=(0, 5)); ax.axis("off")
    boxes = [(0.2, 3.1, "GNN source → parser\nStrict contract adapter\nModel + source digests"),
             (6.2, 3.1, "Compiled JSON\nTypeScript execution\nCatalog + controls"),
             (0.2, 0.4, "Environment only\nPrivate selected fleet\nPublic hit/miss outcome"),
             (6.2, 0.4, "Assistant\nPublic history + catalog\nBelief → one-shot scores")]
    boxed_text=[]
    for x, y, label in boxes:
        patch=FancyBboxPatch((x, y), 3.6, 1.4, boxstyle="round,pad=0.1",
                     facecolor="#eef5f6", edgecolor="#355968", linewidth=1.4)
        ax.add_patch(patch)
        text=ax.text(x+1.8, y+0.7, label, ha="center", va="center", linespacing=1.45, fontsize=18)
        boxed_text.append((patch,text))
    for start, end in [((4.1,3.8),(5.9,3.8)), ((8,2.9),(8,2.0)),
                       ((4.1,1.3),(5.9,1.3)), ((5.9,0.8),(4.1,0.8))]:
        ax.add_patch(FancyArrowPatch(start, end, arrowstyle="-|>", mutation_scale=14, color="#355968"))
    ax.text(5, 1.55, "observation", ha="center", fontsize=18)
    ax.text(5, 0.4, "chosen cell", ha="center", fontsize=18)
    save(fig, "architecture",boxed_text)

    names = {"random":"Uniform random", "hit":"Greedy hit", "information":"Greedy information", "efe":"One-step EFE"}
    colors = ["#7b8794", "#226a8f", "#a66b18", "#287d63"]
    fig, axes = plt.subplots(1, 2, figsize=(9, 4), sharey=True, layout="constrained")
    for ax, count in zip(axes, [256,4096], strict=True):
        for j, policy in enumerate(names):
            selected = [c["shots"] for c in data["cases"] if c["count"]==count and c["policy"]==policy]
            ax.scatter(np.arange(len(selected))*0.022+j-0.165, selected, color=colors[j], s=23, alpha=.85)
            ax.plot([j-.22,j+.22], [np.mean(selected)]*2, color="#172d3b", lw=2.4)
        ax.set_title(f"M = {count:,} · 16 cases", loc="left", fontsize=18)
        ax.set_xticks(range(4), ["Random", "Hit", "Info", "EFE"], rotation=18)
        ax.grid(axis="y", alpha=.18); ax.set_ylim(15,102)
    axes[0].set_ylabel("Completion shots")
    save(fig, "search-comparison",record_geometry=False)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4.5), layout="constrained")
    for noise, color, pattern, marker in zip(
            [0,.05,.15,.25], ["#226a8f","#287d63","#a66b18","#8e547f"],
            ["-","--","-.",":"], ["o","s","^","D"], strict=True):
        values = [a for a in data["analytic"] if a["noise"]==noise]
        x = [a["preference"] for a in values]
        delta = [a["uncertainG"]-a["commonG"] for a in values]
        style = {"color":color,"linestyle":pattern,"marker":marker,"markevery":10,"markersize":4}
        axes[0].plot(x, delta, **style, label=f"ε = {noise:g}")
        axes[1].plot(x, [np.exp(-4*d) for d in delta], **style)
    axes[0].axhline(0, color="#44515b", lw=.8, ls="--")
    axes[0].set_ylabel("ΔG (nats)")
    axes[1].axhline(1, color="#44515b", lw=.8, ls="--")
    axes[1].set_yscale("log"); axes[1].set_ylabel("Policy odds\n(log scale)")
    for ax in axes:
        ax.set_xlabel("Hit preference c (log odds)"); ax.grid(alpha=.18)
    handles,labels=axes[0].get_legend_handles_labels()
    fig.legend(handles,labels,loc="outside upper center",ncol=4,fontsize=18)
    save(fig, "analytic-tradeoff")
    (ROOT/"research/generated/main-figure-geometry.json").write_text(json.dumps(figure_geometry,indent=2)+"\n")

    lines = ["| Catalog | Policy | Mean shots | Median | Range | Mean Δ vs hit |",
             "|---:|:---|---:|---:|:---|---:|"]
    for row in data["summaries"]:
        lines.append(f'| {row["count"]:,} | {names[row["policy"]]} | {row["mean"]:.2f} | '
                     f'{row["median"]:g} | {row["min"]}–{row["max"]} | '
                     f'{row["pairedDifferenceFromHit"]:+.2f} |')
    (ROOT / "research/generated/results-table.md").write_text("\n".join(lines)+"\n")
    section = "# Results of the fixed search demonstration\n\n"
    section += "Each row summarizes all 16 fixed cases. Negative paired differences would mean fewer shots than greedy hit. All searches completed without exclusions.\n\n"
    section += "\n".join(lines)+"\n\n"
    section += "Table: Complete descriptive results; differences are paired within each seed and catalog size. {#tbl:search}\n\n"
    # The real template's longtable/float combination can place the next image
    # beyond the PDF page. Wrap the boundary so the project Word filter can
    # remove it after the template projects raw LaTeX into Office markup.
    section += "::: {.pdf-only}\n\n```{=latex}\n\\clearpage\n```\n\n:::\n\n"
    section += "![Original descriptive completion counts. Each point is one of 16 paired seed cases per catalog size under the four historical selectors; black horizontal marks are means. Jitter only separates cases. All 128 searches completed; EFE and greedy-hit counts tie in all 32 pairs. No significance tests or confidence intervals were specified for this exploratory demonstration.](figures/search-comparison.png){#fig:historical width=95%}\n"
    (ROOT / "manuscript/04_results.md").write_text(section)
    from research.strategy_figures import figures as strategy_figures
    from research.strategy_results import write_results
    strategy_figures(ROOT)
    write_results()
    from research.frontmatter import figure_manifest
    manifest = figure_manifest(ROOT)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n")
    from research.frontmatter import illustrations
    illustrations(ROOT)


def render() -> None:
    template = Path(os.environ["TEMPLATE_ROOT"]).resolve(strict=True)
    vault = next((p for p in ROOT.parents if (p/"vault.toml").is_file()), None)
    if vault is None or any(not Path(p).resolve().is_relative_to(vault)
                            for p in (sys.prefix, sys.base_prefix)):
        raise RuntimeError("Both Python environment and base interpreter must reside on GitVault")
    for tool in ("pandoc", "pandoc-crossref", "xelatex"):
        if shutil.which(tool) is None:
            raise RuntimeError(f"Required renderer tool unavailable: {tool}")
    verify_results()
    template_before = {str(p.relative_to(template)): sha(p)
                       for p in (template/"infrastructure").rglob("*.py") if p.is_file()}
    from infrastructure.rendering.config import RenderingConfig
    from infrastructure.rendering.pdf_renderer import PDFRenderer
    from infrastructure.rendering.web_renderer import WebRenderer
    from infrastructure.rendering import render_docx
    from infrastructure.rendering._pandoc_args import combined_pandoc_args
    from infrastructure.rendering._pandoc_filters import formalism_filter_args
    formalism_filter = Path(formalism_filter_args()[1]).resolve(strict=True)
    if not formalism_filter.is_relative_to(template):
        raise ValueError("Formalism filter is outside the selected template")
    formalism_before = sha(formalism_filter)
    tool_versions = {name: subprocess.run([name, "--version"], check=True, capture_output=True, text=True).stdout
                     for name in ("pandoc", "pandoc-crossref", "xelatex")}

    manuscript = ROOT/"manuscript"
    sources = sorted(manuscript.glob("[0-9][0-9]_*.md"))
    supplements = [ROOT/relative for relative in
                   ("research/SCHOLARSHIP_BATTLESHIP_20261025.md", "research/BATTLESHIP_ADDITIONS_20261025.bib",
                    "research/STRATEGY_SCHOLARSHIP_20261025.md", "research/STRATEGY_SCHOLARSHIP_ADDITIONS_20261025.bib",
                    "research/STRATEGY_STUDY.md", "research/strategy-protocol.json", "research/strategy-cases.json",
                    "research/generated/strategy-study/results.json", "research/generated/strategy-study/analysis.json",
                    "research/generated/strategy-study/comparisons.csv", "research/generated/strategy-study/preexecution.json",
                    "manuscript/01_introduction.md", "manuscript/references.bib")]
    from research.frontmatter import numbered_labels, verify_capture, verify_illustrations
    numbered_labels(ROOT)
    verify_capture(ROOT)
    verify_illustrations(ROOT)
    if not sources:
        raise ValueError("No manuscript sections")
    render_inputs = [*sources, ROOT/"project.json", manuscript/"config.yaml", manuscript/"preamble.md",
                     manuscript/"references.bib", manuscript/"docx.lua", manuscript/"web.css",
                     ROOT/"research/docx_reference.py", ROOT/"research/manuscript.py",
                     ROOT/"research/frontmatter.py", ROOT/"research/numbering.py", ROOT/"research/publication_style.py", ROOT/"research/graphical_abstract.py", manuscript/"frontmatter.tex",
                     ROOT/"scripts/capture-dashboard-for-manuscript.ts", ROOT/"research/strategy_analysis.py",
                     ROOT/"research/strategy_figures.py", ROOT/"research/strategy_results.py",
                     ROOT/"research/generated/strategy-study/figure-text.json",
                     ROOT/"research/generated/main-figure-geometry.json",
                     *[ROOT/"research/generated"/name for name in ("dashboard-capture.json", "dashboard-replay.json", "dashboard-analysis.json", "frontmatter.json")],
                     *[p for p in (manuscript/"figures").rglob("*") if p.is_file()]]
    input_before = {str(p.relative_to(ROOT)):sha(p) for p in [*render_inputs, *supplements]}
    metadata = project_metadata()
    from research.publication_style import validate_design_sources
    validate_design_sources(ROOT)
    output = ROOT/"output"
    bibliography = subprocess.run(["pandoc", str(manuscript/"references.bib"), "-f", "biblatex", "-t", "csljson"],
                                  check=True, capture_output=True, text=True)
    if bibliography.stderr.strip():
        raise ValueError(f"Bibliography parser warnings: {bibliography.stderr}")
    bibliography_entries = json.loads(bibliography.stdout)
    if not bibliography_entries or len({entry["id"] for entry in bibliography_entries}) != len(bibliography_entries):
        raise ValueError("Empty or duplicate bibliography entries")
    output.mkdir(parents=True, exist_ok=True)
    (output/"bibliography.json").write_text(bibliography.stdout)
    # PDFRenderer's compile contract resolves ../figures beside its pdf directory.
    # Stage genuine generated assets there; do not rewrite the emitted TeX.
    shutil.copytree(manuscript/"figures", output/"figures", dirs_exist_ok=True)
    config = RenderingConfig(manuscript_dir=str(manuscript), figures_dir=str(output/"figures"),
        output_dir=str(output), pdf_dir=str(output/"pdf"), web_dir=str(output/"web"),
        docx_dir=str(output/"docx"), template_dir=str(template/"infrastructure/rendering/templates"),
        latex_compiler="xelatex", web_asset_mode="cdn", enable_pdf=True,
        enable_html=True, enable_slides=False, enable_docx=True)
    # The PDF title-page API and source preamble own its first four physical pages.
    # The shared illustrated Markdown provides the same opening to HTML and DOCX.
    pdf_sources = [path for path in sources if path.name != "00_00_frontmatter.md"]
    pdf = PDFRenderer(config).render_combined(pdf_sources, manuscript, "active_inference_battleship")
    web = WebRenderer(config).render_combined(sources, manuscript, "active_inference_battleship")
    from infrastructure.rendering._web_assets import embed_css
    embed_css(web,manuscript/"web.css")
    # The template preserves relative figure links; publish the referenced assets too.
    shutil.copytree(manuscript/"figures", output/"web/figures", dirs_exist_ok=True)
    # Relative scholarly links work beside the local PDF/DOCX and the HTML edition.
    for source in supplements:
        for base in (output, output/"web"):
            target = base/source.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source,target)
    combined = output/"docx/manuscript.md"
    combined.parent.mkdir(parents=True, exist_ok=True)
    import yaml
    frontmatter = "---\n"+yaml.safe_dump({"title":metadata["title"], "author":"Daniel Ari Friedman — Active Inference Institute", "lang":metadata["language"]},sort_keys=False)+"---\n\n"
    combined.write_text(frontmatter+"\n\n".join(p.read_text() for p in sources))
    args = combined_pandoc_args([manuscript, output/"figures", output],
                               [manuscript/"references.bib"], edition="DOCX")
    from research.docx_reference import write_reference
    reference = output/"docx/reference.docx"
    write_reference(reference)
    args = ["--lua-filter",str(manuscript/"docx.lua"),*args]
    docx = output/"docx/active_inference_battleship.docx"
    render_docx(combined, docx, reference_doc=reference, extra_args=args)
    from research.docx_reference import keep_table_rows
    keep_table_rows(docx)
    # Keep recovery links functional when the complete HTML directory is served
    # on its own. These are the actual rendered editions, not alternate content.
    editions = output/"web/editions"
    editions.mkdir(exist_ok=True)
    for edition in (pdf, docx):
        shutil.copy2(edition, editions/edition.name)
    loaded = {}
    for module in tuple(sys.modules.values()):
        filename = getattr(module, "__file__", None)
        if filename:
            path = Path(filename).resolve()
            if path.is_relative_to(template/"infrastructure") and path.is_file() and path.suffix==".py":
                loaded[str(path.relative_to(template))] = sha(path)
    if any(template_before.get(path) != digest for path,digest in loaded.items()):
        raise RuntimeError("Imported template source changed during rendering")
    if sha(formalism_filter) != formalism_before:
        raise RuntimeError("Template formalism filter changed during rendering")
    require_input_snapshot(ROOT, input_before)
    receipt = {"templateRoot":str(template), "python":sys.version,
               "prefix":sys.prefix, "basePrefix":sys.base_prefix,
               "templateImports": loaded,
               "formalismFilter": {"path":str(formalism_filter.relative_to(template)),"sha256":formalism_before},
               "renderTools":tool_versions,
               "outputs": {str(p.relative_to(ROOT)):sha(p) for p in
                           [pdf,docx,output/"bibliography.json",output/"pdf/_combined_manuscript.aux",output/"pdf/_combined_manuscript.tex",
                            *[output/source.relative_to(ROOT) for source in supplements],
                            *[p for p in (output/"web").rglob("*") if p.is_file()]]},
               "inputs": input_before}
    (output/"render-receipt.json").write_text(json.dumps(receipt, indent=2)+"\n")


def main() -> None:
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("command", choices=["figures", "render", "verify", "test", "pages"])
    command = parser.parse_args().command
    if command == "figures": figures()
    elif command == "render": render()
    elif command == "pages":
        from research.pages import capture_pages
        capture_pages()
    elif command == "test":
        import unittest
        suite = unittest.defaultTestLoader.loadTestsFromNames(["research.test_manuscript", "research.test_strategy_analysis"])
        if not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful():
            raise SystemExit(1)
    else:
        from research.editions import validate_sources, validate_editions
        report = {"sources":validate_sources(), "editions":validate_editions()}
        destination = ROOT/"output/manuscript-validation.json"
        destination.write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
