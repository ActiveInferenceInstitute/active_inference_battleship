"""Contact and accessible red-link contract for all manuscript editions."""
from pathlib import Path
import re

LINK_RED = "A61B1B"
LINK_RED_DARK = "FFAAA0"
PDF_MARGIN_MM = 18


def author_contact(root: Path) -> dict:
    import yaml
    authors = yaml.safe_load((root / "manuscript/config.yaml").read_text())["authors"]
    if len(authors) != 1:
        raise ValueError("This cover requires one corresponding author")
    author = authors[0]
    email, orcid = author.get("email", ""), author.get("orcid", "")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("Missing or invalid cover email")
    if not re.fullmatch(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", orcid):
        raise ValueError("Missing or invalid cover ORCID")
    digits = orcid.replace("-", "")
    total = 0
    for digit in digits[:-1]:
        total = (total + int(digit)) * 2
    check = (12 - total % 11) % 11
    if digits[-1] != ("X" if check == 10 else str(check)):
        raise ValueError("Invalid ORCID checksum")
    return {"name": author["name"], "email": email, "orcid": orcid}


def validate_design_sources(root: Path) -> dict:
    contact = author_contact(root)
    preamble = (root / "manuscript/preamble.md").read_text()
    if rf"\usepackage[margin={PDF_MARGIN_MM}mm]{{geometry}}" not in preamble:
        raise ValueError("PDF margins must be the declared 18 mm")
    if rf"\definecolor{{BattleshipLink}}{{HTML}}{{{LINK_RED}}}" not in preamble:
        raise ValueError("PDF link color must be accessible red")
    for key in ("linkcolor", "citecolor", "urlcolor", "filecolor", "anchorcolor"):
        if f"{key}=BattleshipLink" not in preamble:
            raise ValueError(f"PDF {key} must be red")
    css = (root / "manuscript/web.css").read_text().lower()
    for color in (LINK_RED, LINK_RED_DARK):
        if f"--paper-link: #{color.lower()}" not in css:
            raise ValueError("Both HTML themes must use accessible red links")
    return {"contact": contact, "pdfMarginMm": PDF_MARGIN_MM,
            "linkRed": LINK_RED, "darkLinkRed": LINK_RED_DARK}


def validate_cover_text(text: str, contact: dict, edition: str) -> None:
    compact = re.sub(r"\s+", "", text)
    for key in ("email", "orcid"):
        if contact[key] not in compact:
            raise ValueError(f"{edition} cover is missing {key}")


def validate_pdf_link_ink(path: Path) -> int:
    """Inspect actual ink inside URI link annotations, not annotation border color."""
    import pdfplumber
    expected = tuple(int(LINK_RED[i:i + 2], 16) / 255 for i in (0, 2, 4))
    checked = 0
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for link in page.hyperlinks:
                if not link.get("uri"):
                    continue
                chars = [char for char in page.chars
                         if char["text"].strip() and
                         link["x0"] - .2 <= (char["x0"] + char["x1"]) / 2 <= link["x1"] + .2 and
                         link["top"] - .2 <= (char["top"] + char["bottom"]) / 2 <= link["bottom"] + .2]
                if not chars:
                    continue
                for char in chars:
                    color = char["non_stroking_color"]
                    if not isinstance(color, (list, tuple)) or len(color) != 3 or any(abs(a - b) > .003 for a, b in zip(color, expected, strict=True)):
                        raise ValueError(f"Hyperlink ink is not red on page {page.page_number}")
                checked += 1
    if not checked:
        raise ValueError("No visible URI hyperlink ink checked")
    return checked
