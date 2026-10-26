"""Check actual compiled equation/formalism numbers across all three writers."""
from collections import Counter
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from lxml import html

from research.frontmatter import FORMALISM_KINDS, ROOT, numbered_labels, opening_captions


def require_opening_caption(text: str, caption: str) -> None:
    import unicodedata
    compact = lambda value: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKC", value).casefold())
    if compact(caption) not in compact(text):
        raise ValueError("Opening page is missing its complete authored caption")


def validate_numbering(root: Path = ROOT) -> dict:
    labels = numbered_labels(root)
    auxiliary = (root / "output/pdf/_combined_manuscript.aux").read_text()
    tex = (root / "output/pdf/_combined_manuscript.tex").read_text()
    document = html.parse(str(root / "output/web/index.html"))
    with ZipFile(root / "output/docx/active_inference_battleship.docx") as archive:
        office = ET.fromstring(archive.read("word/document.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
          "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    displays = office.findall(".//m:oMathPara", ns)
    office_numbers = []
    for display in displays:
        match = re.search(r"\((\d+)\)\s*$", "".join(display.itertext()))
        if match is None:
            raise ValueError("DOCX display equation lacks a number")
        office_numbers.append(int(match.group(1)))
    expected_numbers = list(range(1, len(labels["equations"]) + 1))
    if office_numbers != expected_numbers:
        raise ValueError("DOCX equation numbers are not consecutive in source order")
    for number, label in enumerate(labels["equations"], 1):
        match = re.search(r"\\newlabel\{" + re.escape(label) + r"\}\{\{([^}]+)\}", auxiliary)
        if match is None or match.group(1) != str(number):
            raise ValueError(f"Compiled PDF equation number mismatch: {label}")
        nodes = document.xpath('//*[@id=$label]', label=label)
        if len(nodes) != 1 or rf"\qquad{{({number})}}" not in "".join(nodes[0].itertext()):
            raise ValueError(f"HTML equation number mismatch: {label}")
    source = "\n".join(path.read_text() for path in sorted((root / "manuscript").glob("[0-9][0-9]_*.md")))
    counts = Counter()
    office_text = " ".join(node.text or "" for node in office.findall(".//w:t", ns))
    html_text = " ".join(document.getroot().itertext())
    markers = []
    for match in re.finditer(r"(?m)^:::\s*\{\.(" + "|".join(FORMALISM_KINDS) + r")\s+#([\w:-]+)", source):
        kind, label = match.groups()
        counts[kind] += 1
        marker = f"{kind.capitalize()} {counts[kind]}"
        nodes = document.xpath('//*[@id=$label]', label=label)
        if len(nodes) != 1 or marker not in " ".join(nodes[0].itertext()):
            raise ValueError(f"HTML formalism number mismatch: {label}")
        if marker not in tex or marker not in office_text or marker not in html_text:
            raise ValueError(f"Formalism marker missing from an edition: {marker}")
        markers.append({"label": label, "marker": marker})
    return {"equationCount": len(expected_numbers), "equations": labels["equations"],
            "docxNumbers": office_numbers, "formalisms": markers,
            "mechanism": "Actual template formalism.lua, pandoc-crossref, and compiled LaTeX counters; no authored numeric tags."}


def validate_opening(path: Path) -> dict:
    import pdfplumber
    titles = ("GNN-based active inference", "From GNN to a decision", "Play and inspect beliefs", "Explain the next action")
    result = []
    with pdfplumber.open(path) as document:
        if len(document.pages) < 5:
            raise ValueError("Reading edition lacks the four-page visual opening")
        for number, title in enumerate(titles):
            page = document.pages[number]
            require_opening_caption(page.extract_text() or "", opening_captions()[number])
            if title not in " ".join((page.extract_text() or "").split()):
                raise ValueError(f"Incorrect opening page {number + 1}: {title}")
            area = sum((image["x1"] - image["x0"]) * (image["bottom"] - image["top"]) for image in page.images)
            fraction = area / (page.width * page.height)
            if len(page.images) != 1 or fraction < (0.18 if number == 0 else 0.40):
                raise ValueError(f"Opening visualization missing or too small on page {number + 1}")
            result.append({"page": number + 1, "title": title, "imageAreaFraction": fraction})
    return {"pages": result}
