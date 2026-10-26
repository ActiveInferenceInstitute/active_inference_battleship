"""Structural checks supplement (and never replace) inspection of every rendered page."""
from __future__ import annotations

import json
import math
from pathlib import Path
import re
import subprocess
from html.parser import HTMLParser
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from research.manuscript import ROOT, sha, verify_results, project_metadata


def validate_local_links(document: Path) -> int:
    count = 0
    for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)",document.read_text()):
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:",target) or target.startswith("#"):
            continue
        if not (document.parent/target.split("#")[0]).is_file():
            raise ValueError(f"Missing local documentation link: {target}")
        count += 1
    return count


def require_revision(text: str, revision: str, edition: str) -> None:
    if revision not in re.sub(r"\s+","",text):
        raise ValueError(f"Missing visible GNN source revision: {edition}")


def require_release_statement(text: str, links: set[str], repository: str, edition: str, doi: str | None = None) -> None:
    visible = re.sub(r"\s+", " ", text).casefold()
    required = ("active inference institute", "version 0.5.0", "zenodo", "doi")
    if any(phrase not in visible for phrase in required) or repository not in links:
        raise ValueError(f"Missing visible published-release statement or repository link: {edition}")
    if doi is not None and (doi not in re.sub(r"\s+", "", text) or "https://doi.org/" + doi not in links):
        raise ValueError(f"Missing visible manuscript DOI or DOI link: {edition}")
    if "planned public release" in visible or "no assigned manuscript doi" in visible:
        raise ValueError(f"Stale future-release statement: {edition}")


def validate_ink(color: tuple) -> float:
    if len(color)!=3 or any(not 0<=v<=1 for v in color):
        raise ValueError(f"Unsupported native text color: {color}")
    linear = [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in color]
    luminance = sum(v*w for v,w in zip(linear,(.2126,.7152,.0722),strict=True))
    contrast = 1.05/(luminance+.05)
    if contrast<4.5:
        raise ValueError(f"Native text contrast below 4.5:1: {contrast}")
    return contrast


def validate_page_geometry(path: Path) -> int:
    import pdfplumber
    count = 0
    with pdfplumber.open(path) as document:
        for number,page in enumerate(document.pages,1):
            for image in page.images:
                if (image["x0"] < -.1 or image["top"] < -.1 or
                    image["x1"] > page.width+.1 or image["bottom"] > page.height+.1):
                    raise ValueError(f"Figure exceeds page bounds: {path.name}, page {number}")
                count += 1
            if any(c["x0"] < -.1 or c["x1"] > page.width+.1 or
                   c["top"] < -.1 or c["bottom"] > page.height+.1 for c in page.chars):
                raise ValueError(f"Text exceeds page bounds: {path.name}, page {number}")
    return count


def validate_reading_pages(path: Path) -> int:
    """Reject footer-only/empty pages in either PDF projection."""
    from pypdf import PdfReader
    pages=PdfReader(path).pages
    if not pages:raise ValueError(f"Empty reading edition: {path.name}")
    for number,page in enumerate(pages,1):
        text=page.extract_text() or ""
        substantive=re.sub(r"[\W\d_]+","",text)
        if len(substantive)<20:
            raise ValueError(f"Blank or nearly blank reading page: {path.name}, page {number}")
    return len(pages)


def require_interval_containment(intervals: list[str], page_text: list[str]) -> int:
    import unicodedata
    compact = lambda value: re.sub(r"\s+", "", unicodedata.normalize("NFKC", value).replace("−", "-").replace("–", "-"))
    pages = [compact(text) for text in page_text]
    if not intervals:
        raise ValueError("Missing statistical table intervals")
    for interval in intervals:
        if not any(compact(interval) in page for page in pages):
            raise ValueError(f"Numeric table interval splits across pages or is missing: {interval}")
    return len(intervals)


def require_caption_containment(captions: list[str], page_text: list[str]) -> int:
    import unicodedata
    compact = lambda value: "".join(character for character in unicodedata.normalize("NFKC", value).casefold() if character.isalnum())
    pages = [compact(page) for page in page_text]
    if not captions:
        raise ValueError("Missing Word figure captions")
    for caption in captions:
        if not any(compact(caption) in page for page in pages):
            raise ValueError(f"Word figure caption splits across pages or is missing: {caption[:90]}")
    return len(captions)


def require_unbroken_counts(expected: dict[str, int], words: list[str]) -> dict[str, int]:
    from collections import Counter
    actual = Counter(words)
    if not expected or any(actual[token] < count for token, count in expected.items()):
        raise ValueError("Word table catalog counts wrap or are missing")
    return {token: actual[token] for token in expected}


def require_reference_opening(pages: list[str]) -> int:
    for number, text in enumerate(pages, 1):
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if "References" in lines:
            if lines[0] != "References":
                raise ValueError("Word references must begin on a fresh page")
            return number
    raise ValueError("Missing Word reference opening")


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0
        self.links: set[str] = set()

    def handle_starttag(self,tag,attrs):
        if tag in {"script","style"}: self.hidden += 1
        if tag == "a":
            self.links.update(value for key,value in attrs if key == "href" and value is not None)

    def handle_endtag(self,tag):
        if tag in {"script","style"}: self.hidden -= 1

    def handle_data(self,data):
        if not self.hidden: self.parts.append(data)


def validate_calculations(data: dict) -> dict:
    """Independent scalar arithmetic over retained traces; no inference imports."""
    summary_keys = set()
    for row in data["summaries"]:
        key = (row["count"], row["policy"])
        if key in summary_keys:
            raise ValueError("Duplicate summary")
        summary_keys.add(key)
        cases = [c for c in data["cases"] if (c["count"],c["policy"]) == key]
        values = sorted(c["shots"] for c in cases)
        n = len(values)
        if not n:
            raise ValueError("Empty summary")
        median = values[n//2] if n%2 else (values[n//2-1]+values[n//2])/2
        pairs = []
        for case in cases:
            baseline = next(c for c in data["cases"] if c["count"]==case["count"]
                            and c["seed"]==case["seed"] and c["policy"]=="hit")
            pairs.append(case["shots"]-baseline["shots"])
        expected = {"n":n,"mean":sum(values)/n,"median":median,"min":min(values),
                    "max":max(values),"pairedDifferenceFromHit":sum(pairs)/n}
        if any(not math.isclose(row[k],v,abs_tol=1e-12,rel_tol=0) for k,v in expected.items()):
            raise ValueError(f"Incorrect summary: {key}")
    expected_keys = {(c["count"],c["policy"]) for c in data["cases"]}
    if summary_keys != expected_keys:
        raise ValueError("Incomplete summaries")
    maximum_error = 0.0
    if len(data["analytic"]) != 324:
        raise ValueError("Incomplete analytic sweep")
    for row in data["analytic"]:
        eps,c = row["noise"],row["preference"]
        h = 0 if eps==0 else -eps*math.log(eps)-(1-eps)*math.log1p(-eps)
        expected_ig = math.log(2)-h
        expected_delta = (.5-eps)*c-expected_ig
        error = max(abs(row["uncertainInformation"]-expected_ig),
                    abs((row["uncertainG"]-row["commonG"])-expected_delta))
        maximum_error = max(maximum_error,error)
        if not error <= 2e-12:
            raise ValueError("Incorrect analytic score")
    hit_cases = [c for c in data["cases"] if c["policy"]=="hit"]
    identical = equal_counts = 0
    for hit in hit_cases:
        efe = next(c for c in data["cases"] if c["policy"]=="efe"
                   and c["count"]==hit["count"] and c["seed"]==hit["seed"])
        equal_counts += hit["shots"]==efe["shots"]
        identical += [s["cell"] for s in hit["trace"]] == [s["cell"] for s in efe["trace"]]
    return {"summaries":len(summary_keys),"analyticCases":len(data["analytic"]),
            "maximumAnalyticError":maximum_error,"pairedEqualCounts":equal_counts,
            "pairedIdenticalShotOrder":identical}


def require_guide_reference_count(text: str, expected: int) -> None:
    match = re.search(r"(?m)^- `manuscript/references\.bib`: (\d+) ", text)
    if match is None or int(match.group(1)) != expected:
        raise ValueError("Manuscript guide bibliography inventory differs from parsed references")


def require_readme_reference_count(text: str, expected: int) -> None:
    match = re.search(r"\*\*Manuscript and research:\*\*[^\n]*\bengages (\d+) sources", text)
    if match is None or int(match.group(1)) != expected:
        raise ValueError("README bibliography inventory differs from parsed references")


def require_plain_statistical_intervals(tex: str) -> dict:
    found={}
    for table in re.findall(r"\\begin\{longtable\}.*?\\end\{longtable\}",tex,re.S):
        labels=re.findall(r"\\label\{tbl:(shots|hits5|entropy5)\}",table)
        if not labels:continue
        if len(labels)!=1 or labels[0] in found:
            raise ValueError("Duplicate statistical table label")
        if any(token in table for token in (r"\[",r"\]",r"\begin{equation}",r"\begin{align}")):
            raise ValueError("Statistical intervals became display math")
        rows=re.findall(r"(?ms)^(?:256|4,096)\s*&.*?(?=\\\\)",table)
        if len(rows)!=8:
            raise ValueError("Incomplete rendered statistical table")
        pattern=r"[+-]?\d+\.\d+\s+\([+-]?\d+\.\d+,\s*[+-]?\d+\.\d+\)"
        if any(len(row.split('&'))!=5 or not re.fullmatch(pattern,row.split('&')[2].strip()) for row in rows):
            raise ValueError("Unreadable rendered mean and interval")
        found[labels[0]]=len(rows)
    if set(found)!={"shots","hits5","entropy5"}:
        raise ValueError("Missing rendered statistical tables")
    return {"tables":len(found),"comparisons":sum(found.values()),"displayMath":False}


def validate_sources(root: Path = ROOT) -> dict:
    project_metadata(root)
    data = verify_results(root)
    calculations = validate_calculations(data)
    from research.strategy_validation import validate_strategy_outputs
    strategy = validate_strategy_outputs(root)
    sections = sorted((root/"manuscript").glob("[0-9][0-9]_*.md"))
    content = "\n".join(p.read_text() for p in sections)
    from research.frontmatter import numbered_labels, verify_capture, verify_illustrations
    numbering = numbered_labels(root)
    verify_capture(root)
    verify_illustrations(root)
    revision = json.loads((root/"src/generated/model.json").read_text())["source"]["upstreamCommit"]
    require_revision(content,revision,"shared manuscript source")
    local_links = sum(validate_local_links(root/path) for path in
                      ("research/SCHOLARSHIP.md", "research/SCHOLARSHIP_UPDATE_20261023.md",
                       "research/STRATEGY_SCHOLARSHIP_20261025.md",
                       "docs/GNN_SPECIFICATION.md", "docs/RELEASE_PLAN.md"))
    bibliography = root/"manuscript/references.bib"
    parsed = subprocess.run(["pandoc", str(bibliography), "-f", "biblatex", "-t", "csljson"],
                            check=True, capture_output=True, text=True)
    if parsed.stderr.strip():
        raise ValueError(f"Bibliography parser diagnostic: {parsed.stderr}")
    entries = json.loads(parsed.stdout)
    require_guide_reference_count((root/"docs/MANUSCRIPT.md").read_text(),len(entries))
    require_readme_reference_count((root/"README.md").read_text(),len(entries))
    keys = {e["id"] for e in entries}
    bibliography_content = re.sub(r"@(?:eq|def|prop|example):[\w-]+", "", content)
    citations = set(re.findall(r"(?<![\w.+-])@([A-Za-z][A-Za-z0-9_-]+)", bibliography_content))
    citations = {k for k in citations if k.lower() not in {"fig","tbl","eq","sec"}}
    if citations-keys:
        raise ValueError(f"Unresolved bibliography keys: {sorted(citations-keys)}")
    if len(keys)!=len(entries) or not keys<=citations:
        raise ValueError("Duplicate or unused bibliography entries")
    for image in re.findall(r"!\[[^\]]*\]\(([^)]+)\)",content):
        path = root/"manuscript"/image
        if not path.is_file() or path.stat().st_size==0:
            raise ValueError(f"Missing manuscript image: {image}")
    manifest = json.loads((root/"manuscript/figures/manifest.json").read_text())
    for relative,digest in manifest.items():
        if sha(root/"manuscript/figures"/relative)!=digest:
            raise ValueError(f"Changed figure: {relative}")
    table = (root/"research/generated/results-table.md").read_text().strip()
    if table not in (root/"manuscript/04_results.md").read_text():
        raise ValueError("Manuscript table differs from generated table")
    return {**calculations,"strategyFollowup":strategy,"sections":len(sections),"references":len(keys),"figures":len(manifest),"numbering":numbering,
            "scholarshipLocalLinks":local_links}


def require_reader_alternatives(root: Path) -> dict:
    """Recovery downloads must be the complete current editions, not stale links."""
    from lxml import html
    web = root/"output/web"
    tree = html.fromstring((web/"index.html").read_text())
    expected = {"Open PDF": "pdf/active_inference_battleship_combined.pdf",
                "Open Word": "docx/active_inference_battleship.docx"}
    result = {}
    for label, relative in expected.items():
        targets = tree.xpath('//aside[contains(@class,"paper-math-loading")]//a[text()=$label]/@href', label=label)
        path = Path(relative)
        if targets != [f"editions/{path.name}"]:
            raise ValueError(f"Invalid rendered alternative link: {label}")
        source = root/"output"/path
        target = web/targets[0]
        if not source.is_file() or not target.is_file() or source.read_bytes() != target.read_bytes():
            raise ValueError(f"Missing or changed rendered alternative: {label}")
        result[label] = {"path": targets[0], "sha256": sha(target)}
    return result


def validate_editions(root: Path = ROOT) -> dict:
    from pypdf import PdfReader
    import pdfplumber
    from research.numbering import validate_numbering, validate_opening, require_opening_caption
    from research.frontmatter import opening_captions

    receipt = json.loads((root/"output/render-receipt.json").read_text())
    for relative,digest in {**receipt["inputs"],**receipt["outputs"]}.items():
        if sha(root/relative)!=digest:
            raise ValueError(f"Changed rendered input/output: {relative}")
    formalism = receipt["formalismFilter"]
    if sha(Path(receipt["templateRoot"]) / formalism["path"]) != formalism["sha256"]:
        raise ValueError("Changed template formalism filter")
    pdf = root/"output/pdf/active_inference_battleship_combined.pdf"
    from research.publication_style import validate_design_sources, validate_cover_text, validate_pdf_link_ink
    design = validate_design_sources(root)
    validate_cover_text(PdfReader(pdf).pages[0].extract_text(), design["contact"], "PDF")
    validate_cover_text(PdfReader(root/"output/docx-native/active_inference_battleship.pdf").pages[0].extract_text(), design["contact"], "DOCX")
    html_cover = VisibleText()
    html_cover.feed((root/"output/web/index.html").read_text().split('id="visual-model"')[0])
    validate_cover_text(" ".join(html_cover.parts), design["contact"], "HTML")
    red_pdf_links = validate_pdf_link_ink(pdf)
    alternatives = require_reader_alternatives(root)
    interval_text=require_plain_statistical_intervals((root/"output/pdf/_combined_manuscript.tex").read_text())
    numbering = validate_numbering(root)
    opening = {"pdf": validate_opening(pdf), "docx": validate_opening(root/"output/docx-native/active_inference_battleship.pdf")}
    authored = "\n".join(p.read_text() for p in sorted((root/"manuscript").glob("[0-9][0-9]_*.md")))
    expected_images = len(re.findall(r"!\[[^\]]*\]\(([^)]+)\)", authored))
    from research.strategy_validation import validate_figure_fonts
    plot_fonts={"pdf":validate_figure_fonts(root,pdf),
                "docx":validate_figure_fonts(root,root/"output/docx-native/active_inference_battleship.pdf")}
    if validate_page_geometry(pdf)!=expected_images:
        raise ValueError("PDF figure count differs from source")
    if validate_page_geometry(root/"output/docx-native/active_inference_battleship.pdf")!=expected_images:
        raise ValueError("Native DOCX figure count differs from source")
    validate_reading_pages(pdf)
    native_pages=validate_reading_pages(root/"output/docx-native/active_inference_battleship.pdf")
    reader = PdfReader(pdf)
    metadata = project_metadata(root)
    page_text = [page.extract_text() for page in reader.pages]
    text = "\n".join(page_text)
    pdf_links = {str(annotation.get_object().get("/A",{}).get("/URI",""))
                 for page in reader.pages for annotation in page.get("/Annots",[])}
    require_release_statement(text,pdf_links,metadata["repository"],"PDF",metadata["manuscriptDoi"])
    cover = reader.pages[0].extract_text()
    if metadata["manuscriptDoi"] not in re.sub(r"\s+", "", cover):
        raise ValueError("PDF cover lacks manuscript DOI")
    revision = json.loads((root/"src/generated/model.json").read_text())["source"]["upstreamCommit"]
    require_revision(text,revision,"PDF")
    html = VisibleText()
    html.feed((root/"output/web/index.html").read_text())
    for caption in opening_captions():
        require_opening_caption(" ".join(html.parts), caption)
    require_revision(" ".join(html.parts),revision,"HTML")
    require_release_statement(" ".join(html.parts),html.links,metadata["repository"],"HTML",metadata["manuscriptDoi"])
    for forbidden in ("\ufffd", "??", "@fig:", "@tbl:"):
        if forbidden in text:
            raise ValueError(f"Unresolved or corrupt PDF token: {forbidden}")
    for required in ("Abstract","References","0.8808","94.94","24.31"):
        if required not in text:
            raise ValueError(f"Missing PDF content: {required}")
    docx = root/"output/docx/active_inference_battleship.docx"
    ns = {"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main",
          "m":"http://schemas.openxmlformats.org/officeDocument/2006/math"}
    with ZipFile(docx) as archive:
        from research.docx_reference import require_theme_fonts
        require_theme_fonts(ET.fromstring(archive.read("word/theme/theme1.xml")))
        document = ET.fromstring(archive.read("word/document.xml"))
        from research.docx_reference import require_unsplit_rows
        unsplit_rows = require_unsplit_rows(document)
        media = [p for p in archive.namelist() if p.startswith("word/media/")]
        math_objects = document.findall(".//m:oMath",ns)
        if len(media)!=expected_images or len(math_objects)<15:
            raise ValueError("DOCX images or native equations missing")
        docx_text = " ".join(t.text or "" for t in document.findall(".//w:t",ns))
        for caption in opening_captions():
            require_opening_caption(docx_text, caption)
        intervals = []
        for table in document.findall(".//w:tbl", ns):
            rows = table.findall("w:tr", ns)
            if not rows or "Holm" not in " ".join(rows[0].itertext()):
                continue
            for row in rows[1:]:
                cells = row.findall("w:tc", ns)
                if len(cells) != 5:
                    raise ValueError("Incomplete Word statistical table row")
                intervals.append("".join(cells[2].itertext()))
        if len(intervals) != 24:
            raise ValueError("Incomplete Word statistical intervals")
        interval_rows = require_interval_containment(intervals, [page.extract_text() or "" for page in PdfReader(root/"output/docx-native/active_inference_battleship.pdf").pages])
        from collections import Counter
        count_cells = []
        for row in document.findall(".//w:tbl/w:tr", ns):
            cell = row.find("w:tc", ns)
            count = "".join(cell.itertext())
            if re.fullmatch(r"[0-9,]+", count):
                no_wrap = cell.find("w:tcPr/w:noWrap", ns)
                if no_wrap is None or no_wrap.get(f'{{{ns["w"]}}}val', "1") in {"0", "false", "off"}:
                    raise ValueError("Word table catalog-count cells must not wrap")
                count_cells.append(count)
        captions = ["".join(paragraph.itertext()) for paragraph in document.findall(".//w:p", ns)
                    if paragraph.find("w:pPr/w:pStyle[@w:val='ImageCaption']", ns) is not None]
        if len(captions) != expected_images:
            raise ValueError("Incomplete Word figure caption inventory")
        # Positional extraction retains the inline order of raised exponents;
        # pypdf's stream ordering moves the final superscript zero in 10^-10.
        with pdfplumber.open(root/"output/docx-native/active_inference_battleship.pdf") as projection:
            projection_text = [page.extract_text() or "" for page in projection.pages]
            caption_rows = require_caption_containment(captions, projection_text)
            reference_opening = require_reference_opening(projection_text)
            count_tokens = require_unbroken_counts(dict(Counter(count_cells)), [word["text"] for page in projection.pages for word in page.extract_words()])
        relationships = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        docx_links = {relationship.attrib.get("Target","") for relationship in relationships}
        require_release_statement(docx_text,docx_links,metadata["repository"],"DOCX",metadata["manuscriptDoi"])
        require_revision(docx_text,revision,"DOCX")
        styles = ET.fromstring(archive.read("word/styles.xml"))
        from research.docx_reference import require_caption_styles
        require_caption_styles(styles)
        color = styles.find(".//w:style[@w:styleId='Hyperlink']/w:rPr/w:color",ns)
        if color is None or color.attrib != {f'{{{ns["w"]}}}val':"A61B1B"}:
            raise ValueError("DOCX Hyperlink style must use the explicit accessible color")
        if "References" not in docx_text or "??" in docx_text:
            raise ValueError("DOCX references unresolved")
    with pdfplumber.open(root/"output/docx-native/active_inference_battleship.pdf") as native:
        colors = {tuple(character["non_stroking_color"])
                  for page in native.pages for character in page.chars}
        if not any(all(abs(a-b)<1e-8 for a,b in zip(color,(166/255,27/255,27/255),strict=True))
                   for color in colors):
            raise ValueError("Native DOCX rendering lacks the explicit hyperlink color")
        minimum_contrast = min(validate_ink(color) for color in colors)
    return {"pdfPages":len(reader.pages),"nativeDocxPages":native_pages,"docxMedia":len(media),"docxNativeEquations":len(math_objects),
            "publicationDesign":design,"redPdfUriLinks":red_pdf_links,"statisticalIntervalText":interval_text,"readerAlternatives":alternatives,
            "numbering": numbering,"opening":opening,"scientificFigureFontPt":plot_fonts,
            "nativeTextMinimumContrast":minimum_contrast,"visibleGnnRevision":revision,"unsplitTableRows":unsplit_rows,"containedWordIntervals":interval_rows,"containedWordCaptions":caption_rows,"unbrokenWordCounts":count_tokens,"wordReferenceOpeningPage":reference_opening}
