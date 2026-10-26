"""Reproducible illustrated opening, using actual bound dashboard captures and data."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FORMALISM_KINDS = ("definition", "proposition", "theorem", "lemma", "corollary", "remark", "axiom", "claim", "example")
PLATES = (
    ("model-atlas", "From GNN to a decision", "A catalog label defines a fleet. Only the environment accesses the selected label; the assistant receives public coordinates and outcomes. GNN declares likelihood, static transition, preferences, and priors for repeated one-shot decisions."),
    ("dashboard-play", "Play and inspect beliefs", "One recorded Chrome session: seed 1943, 256 labels, six manual shots. Symbols show outcomes; overlay intensity shows beliefs. Whole DOM crops illustrate the interface, not independent experimental observations."),
    ("dashboard-decisions", "Explain the next action", "Legal-action forecasts and information in nats share the six-shot exported state. Selected and leading cells have distinct marks. The shared example uses hit preference 2.5, information weight 1, precision 8, assumed noise 0.02, and uniform habits. Sandbox inspection never fires a shot."),
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def numbered_labels(root: Path = ROOT) -> dict:
    equations, formalisms, references = [], [], []
    for path in sorted((root / "manuscript").glob("[0-9][0-9]_*.md")):
        text = path.read_text()
        displays = list(re.finditer(r"(?ms)^\$\$\n.*?^\$\$(?:[^\n]*)", text))
        for display in displays:
            label = re.search(r"\{#(eq:[\w-]+)\}\s*$", display.group())
            if label is None:
                raise ValueError(f"Unnumbered display equation: {path.name}")
            equations.append(label.group(1))
        for match in re.finditer(r"(?m)^:::\s*\{\.(" + "|".join(FORMALISM_KINDS) + r")\b([^}]*)\}", text):
            attributes = match.group(2)
            label = re.search(r"#([\w:-]+)", attributes)
            if label is None or ".unnumbered" in attributes:
                raise ValueError(f"Unlabeled or unnumbered formalism: {path.name}")
            formalisms.append(label.group(1))
        references += re.findall(r"@((?:eq|def|prop|example|thm|lemma|corollary|remark|axiom|claim):[\w-]+)", text)
    labels = equations + formalisms
    if len(labels) != len(set(labels)):
        raise ValueError("Duplicate equation or formalism label")
    if missing := set(references) - set(labels):
        raise ValueError(f"Unresolved formalism reference: {sorted(missing)}")
    return {"equations": equations, "formalisms": formalisms}


def verify_capture(root: Path = ROOT) -> tuple[dict, dict]:
    receipt = json.loads((root / "research/generated/dashboard-capture.json").read_text())
    if receipt.get("captureScriptSha256") != digest(root / "scripts/capture-dashboard-for-manuscript.ts"):
        raise ValueError("Changed dashboard capture script")
    for row in receipt["captures"]:
        path = root / row["path"]
        if not path.resolve(strict=True).is_relative_to(root) or digest(path) != row["sha256"]:
            raise ValueError("Changed dashboard screenshot")
    for relative, key in (("dashboard-analysis.json", "analysisSha256"), ("dashboard-replay.json", "replaySha256")):
        if digest(root / "research/generated" / relative) != receipt[key]:
            raise ValueError("Changed dashboard experiment data")
    snapshot = json.loads((root / "research/generated/dashboard-analysis.json").read_text())
    if (snapshot["seed"], snapshot["catalogueSize"], len(snapshot["observations"])) != (1943, 256, 6):
        raise ValueError("Unexpected dashboard capture state")
    if snapshot["observations"] != receipt["observations"] or snapshot["liveControls"] != receipt["controls"] or receipt["errors"]:
        raise ValueError("Dashboard capture state mismatch")
    return receipt, snapshot


def verify_illustrations(root: Path = ROOT) -> dict:
    provenance = json.loads((root / "research/generated/frontmatter.json").read_text())
    if provenance["generatorSha256"] != digest(root / "research/frontmatter.py"):
        raise ValueError("Changed frontmatter generator")
    if provenance["captureReceiptSha256"] != digest(root / "research/generated/dashboard-capture.json"):
        raise ValueError("Changed frontmatter capture receipt")
    generators = provenance.get("generators", {})
    if set(generators) != {"research/frontmatter.py", "research/graphical_abstract.py"}:
        raise ValueError("Incomplete graphical generator inventory")
    for relative, expected in generators.items():
        if digest(root / relative) != expected:
            raise ValueError("Changed graphical abstract generator")
    if (root / "manuscript/frontmatter.tex").read_text() != pdf_plate_preamble():
        raise ValueError("Changed frontmatter page layout")
    for relative, expected in provenance["assets"].items():
        path = root / relative
        if not path.resolve(strict=True).is_relative_to(root) or digest(path) != expected:
            raise ValueError("Changed frontmatter illustration")
    return provenance


def figure_manifest(root: Path = ROOT) -> dict:
    directory = root / "manuscript/figures"
    return {str(path.relative_to(directory)): digest(path) for path in sorted(directory.rglob("*"))
            if path.is_file() and path.name != "manifest.json"}


def illustrations(root: Path = ROOT) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
    import numpy as np
    from PIL import Image

    receipt, data = verify_capture(root)
    directory = root / "manuscript/figures"
    ink, muted, green, pale, rule = "#182F3B", "#425C68", "#176D59", "#EAF2F2", "#9EB5BE"
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11,
                         "text.color": ink, "svg.fonttype": "none", "savefig.facecolor": "white"})
    leader = next(action for action in data["actions"] if action["cell"] == data["selectedCell"])
    coordinate = f'{chr(65 + leader["cell"] // 10)}{leader["cell"] % 10 + 1}'
    generated = []

    def canvas(width=6.4, height=8.2):
        fig = plt.figure(figsize=(width, height), facecolor="white")
        ax = fig.add_axes((0, 0, 1, 1))
        ax.set(xlim=(0, width), ylim=(0, height)); ax.axis("off")
        return fig, ax

    def words(ax, x, y, text, size=11, **kwargs):
        return ax.text(x, y, text, fontsize=size, va="top", linespacing=1.45, **kwargs)

    def box(ax, x, y, w, h, title, detail, size=11):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.035", facecolor=pale, edgecolor=rule, linewidth=.8))
        words(ax, x + .15, y + h - .14, title, size + .7, weight="bold")
        words(ax, x + .15, y + h - .46, detail, size, color=muted)

    def screen(fig, name, x, y, width, height):
        path = directory / "dashboard" / f"{name}.png"
        image = Image.open(path)
        # Fit the whole actual DOM crop; no image pixels are retouched or omitted.
        ratio = image.width / image.height
        w = min(width, height * ratio); h = w / ratio
        axis = fig.add_axes(((x + (width - w) / 2) / 6.4, (y + (height - h) / 2) / 8.2, w / 6.4, h / 8.2))
        axis.imshow(image); axis.axis("off")

    def save(fig, name):
        from matplotlib.text import Text
        fig.canvas.draw()
        renderer = fig.canvas.get_renderer()
        bounds = fig.bbox
        for text in fig.findobj(Text):
            if not text.get_visible() or not text.get_text().strip():
                continue
            box = text.get_window_extent(renderer)
            if box.x0 < bounds.x0 - .2 or box.y0 < bounds.y0 - .2 or box.x1 > bounds.x1 + .2 or box.y1 > bounds.y1 + .2:
                raise ValueError(f"Illustration text outside canvas: {name}: {text.get_text()}")
        for extension in ("png", "pdf", "svg"):
            path = directory / f"{name}.{extension}"
            fig.savefig(path, dpi=300, pad_inches=0)
            generated.append(str(path.relative_to(root)))
        plt.close(fig)

    from research.graphical_abstract import graphical_opening
    graphical_opening(data, save)

    fig, ax = canvas()
    screen(fig, "masthead", .02, 7.66, 6.36, .47)
    screen(fig, "play-boards", .02, 2.65, 6.36, 4.84)
    screen(fig, "play-metrics", .02, 1.65, 6.36, .92)
    words(ax, .12, 1.39, "Read the display", 11.5, weight="bold")
    words(ax, .12, 1.06, "The left overlay aggregates posterior fleet occupancy. A hit or miss\nchanges beliefs; the suggested target is an action score, not a revealed ship.\nThe right fleet belongs to the human player and is hidden from the opponent.", 10.4, color=muted)
    words(ax, .12, .37, "Captured live: seed 1943 · 256 catalog labels · six player observations", 10, color=green, weight="bold")
    save(fig, "dashboard-play")

    fig, ax = canvas()
    words(ax, .10, 8.12, "Inspect an action before taking it", 12, weight="bold")
    screen(fig, "decision-map", .02, 4.02, 6.36, 3.86)
    screen(fig, "action-tradeoff-plot", .12, 1.62, 6.16, 2.30)
    words(ax, .12, 1.48, f"Selected {coordinate} · values from the same exported snapshot", 10.8, weight="bold")
    values = [f'Hit forecast  {100 * leader["predictedHit"]:.1f}%', f'Information  {leader["informationGain"]:.3f} nats',
              f'Preference cost  {leader["risk"]:.3f} nats', f'Weighted score  {leader["expectedFreeEnergy"]:.3f} nats']
    for index, value in enumerate(values):
        words(ax, .12 + (index % 2) * 3.22, 1.12 - (index // 2) * .31, value, 10.6, color=green)
    words(ax, .12, .42, "Dots are unvisited actions. Their overlap is meaningful; this is a decision\nmap under one subjective model, not a measured strategy comparison.", 10.1, color=muted)
    save(fig, "dashboard-decisions")

    (directory / "manifest.json").write_text(json.dumps(figure_manifest(root), indent=2) + "\n")
    provenance = {"format": "battleship-illustrated-frontmatter", "version": 1,
                  "generatorSha256": digest(Path(__file__)), "captureReceiptSha256": digest(root / "research/generated/dashboard-capture.json"),
                  "generators": {relative: digest(root / relative) for relative in
                                 ("research/frontmatter.py", "research/graphical_abstract.py")},
                  "assets": {name: digest(root / name) for name in generated},
                  "composition": "Whole bound DOM screenshots fitted without pixel retouching; original screenshots and experiment exports retained.",
                  "selectedCell": leader["cell"], "selectedAction": leader,
                  "scope": "Illustrative software state, not additional research outcomes."}
    (root / "research/generated/frontmatter.json").write_text(json.dumps(provenance, indent=2) + "\n")
    (root / "manuscript/frontmatter.tex").write_text(pdf_plate_preamble())


def opening_captions(root: Path = ROOT) -> list[str]:
    text = (root / "manuscript/00_00_frontmatter.md").read_text()
    captions = re.findall(r"!\[([^\]]+)\]\(figures/(?:graphical-abstract|model-atlas|dashboard-play|dashboard-decisions)\.png\)", text)
    if len(captions) != 4:
        raise ValueError("The opening requires four complete authored captions")
    return captions


def pdf_plate_preamble() -> str:
    escape = lambda text: re.sub(r"([&%$#_{}])", r"\\\1", text)
    captions = opening_captions()
    plates = "\n".join(r"\BattleshipPlate{" + title + "}{" + name + "}{" + escape(caption) + "}"
                       for (name, title, _), caption in zip(PLATES, captions[1:], strict=True))
    return r"""
\usepackage{etoolbox}
\AtEndEnvironment{titlepage}{\par\vspace{0.5em}\noindent\begin{minipage}{\linewidth}\small\raggedright
""" + escape(captions[0]) + r"""
\par\end{minipage}}
\newcommand{\BattleshipPlate}[3]{%
\clearpage\thispagestyle{plain}%
\noindent{\large\sffamily\bfseries #1}\par\vspace{0.7em}%
\noindent\includegraphics[width=\linewidth,height=0.78\textheight,keepaspectratio]{../figures/#2.png}\par%
\vspace{0.4em}\noindent{\small #3}\par\clearpage}
\let\BattleshipContents\tableofcontents
\renewcommand{\tableofcontents}{\setcounter{page}{2}
""" + plates + r"""
\BattleshipContents}
"""


if __name__ == "__main__":
    illustrations()
    print(json.dumps({"illustrations": 4, "source": "bound live dashboard and explicit model contract"}))
