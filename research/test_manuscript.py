"""Real-file negative controls for the manuscript's research input gate."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import subprocess
import os
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from research.manuscript import ROOT, verify_results, require_input_snapshot, sha, project_metadata
from research.editions import validate_calculations, validate_local_links, require_revision, VisibleText, validate_ink, validate_page_geometry, require_release_statement, validate_reading_pages
from research.capture_pixels import validate_text_pixels
from research.freeze import require_paint_coverage
from research.docx_reference import write_reference
from research.frontmatter import numbered_labels, verify_capture


class ResearchCustodyTests(unittest.TestCase):
    def test_reader_alternatives_require_real_complete_current_editions(self):
        from research.editions import require_reader_alternatives
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as directory:
            root = Path(directory)
            paths = ["web/index.html", "pdf/active_inference_battleship_combined.pdf",
                     "docx/active_inference_battleship.docx",
                     "web/editions/active_inference_battleship_combined.pdf",
                     "web/editions/active_inference_battleship.docx"]
            for relative in paths:
                target = root/"output"/relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT/"output"/relative, target)
            self.assertEqual(set(require_reader_alternatives(root)), {"Open PDF", "Open Word"})
            pdf = root/"output/web/editions/active_inference_battleship_combined.pdf"
            original = pdf.read_bytes()
            pdf.write_bytes(original[:100])
            with self.assertRaisesRegex(ValueError, "changed rendered alternative"):
                require_reader_alternatives(root)
            pdf.write_bytes(original)
            word = root/"output/web/editions/active_inference_battleship.docx"
            word.rename(word.with_suffix(".preserved"))
            with self.assertRaisesRegex(ValueError, "Missing or changed"):
                require_reader_alternatives(root)
            shutil.copy2(ROOT/"output/web/editions/active_inference_battleship.docx", word)
            html = root/"output/web/index.html"
            html.write_text(html.read_text().replace("editions/active_inference_battleship_combined.pdf", "unavailable.pdf"))
            with self.assertRaisesRegex(ValueError, "alternative link"):
                require_reader_alternatives(root)

    def test_reference_opening_rejects_the_unbalanced_tail_layout(self):
        from research.editions import require_reference_opening
        self.assertEqual(require_reference_opening(["Conclusions", "References\nFirst entry"]), 2)
        with self.assertRaisesRegex(ValueError, "fresh page"):
            require_reference_opening(["Conclusions\nReferences\nFirst entry"])
        with self.assertRaisesRegex(ValueError, "Missing Word"):
            require_reference_opening(["Conclusions"])

    def test_catalog_count_token_rejects_the_observed_wrap(self):
        from research.editions import require_unbroken_counts
        self.assertEqual(require_unbroken_counts({"4,096": 2}, ["4,096", "4,096"]), {"4,096": 2})
        with self.assertRaisesRegex(ValueError, "counts wrap"):
            require_unbroken_counts({"4,096": 2}, ["4,096", "4,09", "6"])

    def test_real_word_caption_with_raised_exponent_is_complete(self):
        import pdfplumber
        from research.editions import require_caption_containment
        directory = ROOT / "tests/fixtures"
        expected = json.loads((directory / "word-caption-superscript.json").read_text())["caption"]
        with pdfplumber.open(directory / "word-caption-superscript.pdf") as document:
            text = document.pages[0].extract_text()
        self.assertEqual(require_caption_containment([expected], [text]), 1)
        with self.assertRaisesRegex(ValueError, "caption splits across pages"):
            require_caption_containment([expected], [text.replace("Integer ties are exact", "", 1)])

    def test_caption_pagination_rejects_the_split_figure_one(self):
        from research.editions import require_caption_containment
        from research.docx_reference import require_caption_styles
        caption = "Figure 1: GNN declarations, dimensions, and public observations."
        self.assertEqual(require_caption_containment([caption], [caption]), 1)
        with self.assertRaisesRegex(ValueError, "caption splits across pages"):
            require_caption_containment([caption], ["Figure 1: GNN declarations,", "dimensions, and public observations."])
        path = self.root / "captions.docx"
        write_reference(path)
        with ZipFile(path) as archive:
            styles = ET.fromstring(archive.read("word/styles.xml"))
        require_caption_styles(styles)
        uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        styles.find(f"{{{uri}}}style[@{{{uri}}}styleId='ImageCaption']/{{{uri}}}pPr/{{{uri}}}keepLines").set(f"{{{uri}}}val", "0")
        with self.assertRaisesRegex(ValueError, "caption pagination"):
            require_caption_styles(styles)

    def test_word_theme_rejects_implicit_office_fallback(self):
        from research.docx_reference import require_theme_fonts, write_reference
        path = self.root / "fonts.docx"
        write_reference(path)
        with ZipFile(path) as archive:
            theme = ET.fromstring(archive.read("word/theme/theme1.xml"))
        require_theme_fonts(theme)
        theme.find(".//{http://schemas.openxmlformats.org/drawingml/2006/main}latin").set("typeface", "Aptos")
        with self.assertRaisesRegex(ValueError, "Liberation Serif"):
            require_theme_fonts(theme)

    def test_interval_page_containment_rejects_a_split_numeric_field(self):
        from research.editions import require_interval_containment
        interval = "−0.977 (−1.273, −0.695)"
        self.assertEqual(require_interval_containment([interval], ["Heading " + interval, "Other page"]), 1)
        with self.assertRaisesRegex(ValueError, "splits across pages"):
            require_interval_containment([interval], ["−0.977 (−1.273,", "−0.695)"])
        with self.assertRaisesRegex(ValueError, "Missing statistical"):
            require_interval_containment([], [interval])

    def test_complete_opening_caption_rejects_the_previous_pdf_omission(self):
        from research.frontmatter import opening_captions
        from research.numbering import require_opening_caption
        for caption in opening_captions():
            require_opening_caption("Heading\n" + caption + "\n1", caption)
            with self.assertRaisesRegex(ValueError, "complete authored caption"):
                require_opening_caption(caption[:80], caption)

    def test_word_rows_reject_missing_keep_policy(self):
        from research.docx_reference import require_unsplit_rows, keep_table_rows
        uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        path = self.root / "rows.docx"
        xml = f'<w:document xmlns:w="{uri}"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>−0.977 (−1.273, −0.695)</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>'
        with ZipFile(path, "w") as archive:
            archive.writestr("word/document.xml", xml)
            archive.writestr("unchanged.txt", b"Preserved archive member")
        with self.assertRaisesRegex(ValueError, "one physical page"):
            require_unsplit_rows(ET.fromstring(xml))
        self.assertEqual(keep_table_rows(path), 1)
        with ZipFile(path) as archive:
            document = ET.fromstring(archive.read("word/document.xml"))
            self.assertEqual(require_unsplit_rows(document), 1)
            self.assertEqual(archive.read("unchanged.txt"), b"Preserved archive member")
        document.find(f".//{{{uri}}}cantSplit").set(f"{{{uri}}}val", "0")
        with self.assertRaisesRegex(ValueError, "one physical page"):
            require_unsplit_rows(document)

    def test_rendered_intervals_reject_real_display_math_conversion(self):
        import re
        from research.editions import require_plain_statistical_intervals
        broken=(ROOT/"tests/fixtures/statistical-interval-display.tex").read_text()
        with self.assertRaisesRegex(ValueError,"became display math"):
            require_plain_statistical_intervals(broken)
        plain=broken.replace(r"\[","(").replace(r"\]",")").replace("{[}","(").replace("{]}",")")
        self.assertEqual(require_plain_statistical_intervals(plain),
                         {"tables":3,"comparisons":24,"displayMath":False})
        incomplete=re.sub(r"(?m)^256 & Random.*\n","",plain,count=1)
        with self.assertRaisesRegex(ValueError,"Incomplete rendered"):
            require_plain_statistical_intervals(incomplete)
        with self.assertRaisesRegex(ValueError,"Duplicate statistical"):
            require_plain_statistical_intervals(plain+plain)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="battleship-paper-")
        self.root = Path(self.temp.name)
        data = json.loads((ROOT/"research/generated/results.json").read_text())
        for relative in [*data["sources"], "research/generated/results.json"]:
            target = self.root/relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT/relative, target)

    def tearDown(self):
        self.temp.cleanup()

    def mutate(self, transform):
        path = self.root/"research/generated/results.json"
        data = json.loads(path.read_text())
        transform(data)
        path.write_text(json.dumps(data))

    def test_complete_real_results(self):
        data = verify_results(self.root)
        self.assertEqual(len(data["cases"]), 128)
        result = validate_calculations(data)
        self.assertEqual(result["pairedEqualCounts"],32)
        self.assertEqual(result["pairedIdenticalShotOrder"],27)

    def test_all_displays_are_labeled_and_formalisms_resolve(self):
        labels = numbered_labels(ROOT)
        self.assertEqual(len(labels["equations"]), 10)
        self.assertEqual(len(labels["formalisms"]), 7)
        directory = self.root / "manuscript"
        directory.mkdir(exist_ok=True)
        model = directory / "02_model.md"
        software = directory / "03_software_and_protocol.md"
        for target in (model, software):
            shutil.copyfile(ROOT / "manuscript" / target.name, target)
        original = model.read_text()
        self.assertEqual(numbered_labels(self.root), labels)
        model.write_text(original.replace(" {#eq:likelihood}", "", 1))
        with self.assertRaisesRegex(ValueError, "Unnumbered display"):
            numbered_labels(self.root)
        model.write_text(original.replace("#eq:posterior", "#eq:likelihood", 1))
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            numbered_labels(self.root)
        model.write_text(original.replace("@def:belief", "@def:missing", 1))
        with self.assertRaisesRegex(ValueError, "Unresolved formalism reference"):
            numbered_labels(self.root)
        model.write_text(original.replace("#def:belief", "", 1))
        with self.assertRaisesRegex(ValueError, "Unlabeled or unnumbered formalism"):
            numbered_labels(self.root)
        model.write_text(original.replace(".definition #def:belief", ".definition .unnumbered #def:belief", 1))
        with self.assertRaisesRegex(ValueError, "Unlabeled or unnumbered formalism"):
            numbered_labels(self.root)

    def test_capture_custody_rejects_changed_pixels_and_data(self):
        receipt, _ = verify_capture(ROOT)
        files = ["research/generated/dashboard-capture.json", "research/generated/dashboard-analysis.json",
                 "research/generated/dashboard-replay.json", "scripts/capture-dashboard-for-manuscript.ts",
                 *[row["path"] for row in receipt["captures"]]]
        for name in files:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, path)
        verify_capture(self.root)
        path = self.root / receipt["captures"][0]["path"]
        original = path.read_bytes()
        path.write_bytes(original + b"changed")
        with self.assertRaisesRegex(ValueError, "Changed dashboard screenshot"):
            verify_capture(self.root)
        path.write_bytes(original)
        data = self.root / "research/generated/dashboard-analysis.json"
        data.write_text(data.read_text() + " ")
        with self.assertRaisesRegex(ValueError, "Changed dashboard experiment data"):
            verify_capture(self.root)

    def test_real_template_counters_renumber_after_an_inserted_block(self):
        from infrastructure.rendering._pandoc_args import combined_pandoc_args
        from lxml import html
        source = self.root / "counters.md"
        first = '::: {.definition #def:first title="First"}\n\nFirst definition.\n\n::: \n\n$$x=1$$ {#eq:first}\n\n'
        second = '::: {.definition #def:second title="Second"}\n\nSecond definition.\n\n:::\n\n$$y=2$$ {#eq:second}\n\nSee [@def:second] and @eq:second.\n'
        inserted = '::: {.definition #def:inserted}\n\nInserted definition.\n\n:::\n\n$$z=0$$ {#eq:inserted}\n\n'
        for prefix, content, expected in (("before", first + second, 2), ("after", inserted + first + second, 3)):
            source.write_text(content)
            for extension in ("html", "tex", "docx"):
                destination = self.root / f"{prefix}.{extension}"
                args = combined_pandoc_args([self.root], [], edition=extension)
                subprocess.run(["pandoc", str(source), *args, "-o", str(destination)], check=True, capture_output=True)
                marker = f"Definition {expected}"
                if extension == "html":
                    document = html.parse(str(destination))
                    self.assertIn(marker, " ".join(document.getroot().get_element_by_id("def:second").itertext()))
                    self.assertIn(rf"\qquad{{({expected})}}", "".join(document.getroot().get_element_by_id("eq:second").itertext()))
                elif extension == "tex":
                    text = destination.read_text()
                    self.assertIn(marker, text)
                    self.assertEqual(text.count(r"\begin{equation}"), expected)
                    self.assertIn(r"\label{eq:second}", text)
                else:
                    with ZipFile(destination) as archive:
                        document = ET.fromstring(archive.read("word/document.xml"))
                    ns = {"m": "http://schemas.openxmlformats.org/officeDocument/2006/math"}
                    displays = document.findall(".//m:oMathPara", ns)
                    self.assertEqual(len(displays), expected)
                    self.assertTrue("".join(displays[-1].itertext()).endswith(f"({expected})"))
                    self.assertIn(marker, " ".join(document.itertext()))

    def test_image_only_reading_frames_require_matching_source_ink(self):
        from PIL import Image, ImageDraw, ImageChops
        source = self.root / "illustration.png"
        picture = Image.new("RGB", (160, 160), "white")
        draw = ImageDraw.Draw(picture)
        for row in range(8):
            for column in range(8):
                draw.rectangle((column*20,row*20,column*20+19,row*20+19),
                               fill=("#182f3b" if (row+column)%2 else "#176d59"))
        picture.save(source)
        captured = self.root / "image-frame.png"
        picture.save(captured)
        frame = {"viewportWidth":160,"viewportHeight":160,"rectangles":[],
                 "images":[{"source":source.name,"x":0,"y":0,"width":160,"height":160,
                            "imageX":0,"imageY":0,"imageWidth":160,"imageHeight":160}]}
        result = validate_text_pixels(captured,frame,self.root)
        self.assertEqual(result["images"][0]["matchedFraction"],1)
        with self.assertRaisesRegex(ValueError,"bound project root"):
            validate_text_pixels(captured,frame)
        Image.new("RGB",(160,160),"white").save(captured)
        with self.assertRaisesRegex(ValueError,"mismatched image paint"):
            validate_text_pixels(captured,frame,self.root)
        ImageChops.offset(picture,20,0).save(captured)
        with self.assertRaisesRegex(ValueError,"mismatched image paint"):
            validate_text_pixels(captured,frame,self.root)
        frame["images"][0]["imageX"] = 20
        with self.assertRaisesRegex(ValueError,"Invalid reading image bounds"):
            validate_text_pixels(captured,frame,self.root)

    def test_real_metadata_rejects_false_release_and_title_drift(self):
        self.assertEqual(project_metadata()["organization"],"Active Inference Institute")
        for name in ("project.json","manuscript/config.yaml","manuscript/00_abstract.md"):
            destination=self.root/name
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(ROOT/name,destination)
        path=self.root/"project.json"
        original=json.loads(path.read_text())
        for key,value in (("organization","Active Inference Lab"),
                          ("manuscriptDoi","10.0000/not-assigned"),
                          ("repository","https://example.org/wrong-repository"),
                          ("title","A mismatched title")):
            path.write_text(json.dumps({**original,key:value}))
            with self.assertRaisesRegex(ValueError,"metadata"):
                project_metadata(self.root)
        path.write_text(json.dumps(original))
        abstract=self.root/"manuscript/00_abstract.md"
        abstract.write_text(abstract.read_text().replace("Zenodo","Elsewhere"))
        with self.assertRaisesRegex(ValueError,"published release statement"):
            project_metadata(self.root)

    def test_release_gate_rejects_missing_visible_text_and_wrong_link(self):
        repository="https://github.com/ActiveInferenceInstitute/active_inference_battleship"
        text="Active Inference Institute. Version 0.5.0. Zenodo DOI."
        require_release_statement(text,{repository},repository,"positive fixture")
        for phrase in ("Institute","Version 0.5.0","Zenodo","DOI"):
            with self.assertRaisesRegex(ValueError,"published-release statement"):
                require_release_statement(text.replace(phrase,""),{repository},repository,"negative fixture")
        with self.assertRaisesRegex(ValueError,"repository link"):
            require_release_statement(text,{"https://example.org/wrong"},repository,"negative link")
        doi=project_metadata()["manuscriptDoi"]
        links={repository,"https://doi.org/"+doi}
        require_release_statement(text+doi,links,repository,"published fixture",doi)
        with self.assertRaisesRegex(ValueError,"manuscript DOI"):
            require_release_statement(text,links,repository,"missing DOI",doi)
        with self.assertRaisesRegex(ValueError,"manuscript DOI"):
            require_release_statement(text+doi,{repository},repository,"missing DOI link",doi)

    def test_render_snapshot_rejects_changed_and_missing_real_inputs(self):
        source = self.root/"render-input.md"
        source.write_text("Original rendering input\n")
        snapshot = {source.name:sha(source)}
        require_input_snapshot(self.root,snapshot)
        source.write_text("Concurrent rendering input edit\n")
        with self.assertRaisesRegex(RuntimeError,"input changed during rendering"):
            require_input_snapshot(self.root,snapshot)
        source.rename(self.root/"preserved-input.md")
        with self.assertRaisesRegex(RuntimeError,"input changed during rendering"):
            require_input_snapshot(self.root,snapshot)

    def test_wrong_summary_rejected(self):
        data = verify_results(self.root)
        data["summaries"][0]["mean"] += .25
        with self.assertRaisesRegex(ValueError,"Incorrect summary"):
            validate_calculations(data)

    def test_wrong_information_rejected(self):
        data = verify_results(self.root)
        data["analytic"][0]["uncertainInformation"] += .01
        with self.assertRaisesRegex(ValueError,"Incorrect analytic score"):
            validate_calculations(data)

    def test_real_docx_reference_controls_table_equation_and_page_fields(self):
        reference = self.root/"reference.docx"
        write_reference(reference)
        source = self.root/"layout.md"
        source.write_text("Lead into the following equation.\n\n$$x=1$$\n\n"
                          "| Catalogue | Policy | Mean | Median | Range | Delta |\n"
                          "|---:|:---|---:|---:|:---|---:|\n"
                          "| 256 | Greedy information | 21.56 | 21 | 18–26 | .06 |\n\n"
                          "Table: Search example. {#tbl:search}\n")
        output = self.root/"layout.docx"
        subprocess.run(["pandoc",str(source),"--reference-doc",str(reference),
                        "--lua-filter",str(ROOT/"manuscript/docx.lua"),"-o",str(output)],
                       check=True,capture_output=True)
        ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        with ZipFile(output) as archive:
            styles = ET.fromstring(archive.read("word/styles.xml"))
            color = styles.find(".//w:style[@w:styleId='Hyperlink']/w:rPr/w:color",ns)
            self.assertIsNotNone(color)
            self.assertEqual(color.attrib,{f'{{{ns["w"]}}}val':"A61B1B"})
            document = ET.fromstring(archive.read("word/document.xml"))
            widths = [int(c.attrib[f'{{{ns["w"]}}}w'])
                      for c in document.findall(".//w:tblGrid/w:gridCol",ns)]
            self.assertEqual(len(widths),6)
            self.assertGreater(widths[1],2*widths[3])
            self.assertTrue(document.findall(".//w:pStyle[@w:val='EquationLead']",ns))
            footer_parts = [p for p in archive.namelist() if p.startswith("word/footer")]
            self.assertTrue(footer_parts)
            self.assertIn(b"PAGE",archive.read(footer_parts[0]))
        native = self.root/"native"
        native.mkdir()
        result = subprocess.run([os.environ["SOFFICE"],"--headless","--norestore",
            f'-env:UserInstallation={(self.root/"lo-profile").as_uri()}',
            "--convert-to","pdf:writer_pdf_Export","--outdir",str(native),str(output)],
            check=False,capture_output=True,text=True,timeout=60)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertTrue((native/"layout.pdf").is_file(),result.stdout+result.stderr)

    def test_missing_dossier_link_rejected(self):
        document = self.root/"dossier.md"
        bibliography = self.root/"references.bib"
        bibliography.write_text("Real bibliography file")
        document.write_text("[References](references.bib)")
        self.assertEqual(validate_local_links(document),1)
        document.write_text("[References](scholarship.bib)")
        with self.assertRaisesRegex(ValueError,"Missing local documentation link"):
            validate_local_links(document)

    def test_footer_only_and_empty_reading_pages_rejected(self):
        from reportlab.pdfgen import canvas
        for name,body in (("valid","A complete paragraph in this reading edition."),
                          ("footer-only",""), ("empty","")):
            path=self.root/f"reading-{name}.pdf"
            document=canvas.Canvas(str(path),pagesize=(300,300))
            if body:document.drawString(20,180,body)
            if name!="empty":document.drawString(145,15,"9")
            document.showPage();document.save()
            if name=="valid":self.assertEqual(validate_reading_pages(path),1)
            else:
                with self.assertRaisesRegex(ValueError,"Blank or nearly blank reading page"):
                    validate_reading_pages(path)

    def test_actual_template_excludes_pdf_only_page_boundary(self):
        from infrastructure.rendering import render_docx
        ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        boundary="```{=latex}\n\\clearpage\n```\n"
        for name,content,expected in (
                ("legacy",boundary,1),
                ("projected","::: {.pdf-only}\n\nPDF_ONLY_SENTINEL\n\n"+boundary+"\n:::\n",0)):
            source=self.root/f"{name}.md"
            source.write_text("Before the figure.\n\n"+content+"\nAfter the boundary.\n")
            output=self.root/f"{name}.docx"
            render_docx(source,output,extra_args=["--lua-filter",str(ROOT/"manuscript/docx.lua")])
            with ZipFile(output) as archive:
                document=ET.fromstring(archive.read("word/document.xml"))
                self.assertEqual(len(document.findall('.//w:br[@w:type="page"]',ns)),expected)
                text=" ".join(t.text or "" for t in document.findall(".//w:t",ns))
                self.assertNotIn("PDF_ONLY_SENTINEL",text)
                self.assertIn("After the boundary.",text)

    def test_real_reader_raster_pair_rejects_incomplete_paint(self):
        directory=ROOT/"research/fixtures/reader-paint"
        fixture=json.loads((directory/"fixture.json").read_text())
        validate_text_pixels(directory/"painted.png",fixture["frame"])
        with self.assertRaisesRegex(ValueError,"Missing text paint"):
            validate_text_pixels(directory/"clipped.png",fixture["frame"])

    def test_paint_coverage_rejects_omitted_and_duplicate_frames(self):
        reading=[{"path":f"output/qa/zoom/{theme}-00.png"} for theme in ("light","dark")]
        captures=[*reading,{"path":"output/qa/zoom/chrome-page-zoom-200.png"}]
        require_paint_coverage(captures,reading,native=True)
        require_paint_coverage(reading,reading,native=False)
        for frames in (reading[:-1],[*reading,reading[0]],[]):
            with self.assertRaisesRegex(ValueError,"reader-paint coverage"):
                require_paint_coverage(captures,frames,native=True)

    def test_revision_must_appear_in_reading_text(self):
        revision = "073f21d5b25c403d1ef0c965dd945bb2287d4de4"
        require_revision(revision[:20]+"\n"+revision[20:],revision,"PDF")
        html = VisibleText()
        html.feed(f'<style>/* {revision} */</style><p>GNN software</p>')
        with self.assertRaisesRegex(ValueError,"Missing visible GNN source revision"):
            require_revision("".join(html.parts),revision,"HTML")

    def test_original_native_hyperlink_color_fails_contrast(self):
        with self.assertRaisesRegex(ValueError,"contrast below"):
            validate_ink((79/255,129/255,189/255))
        self.assertGreaterEqual(validate_ink((166/255,27/255,27/255)),4.5)
        with self.assertRaisesRegex(ValueError,"Unsupported native text color"):
            validate_ink((0,))

    def test_current_guide_count_is_bound_to_the_parsed_bibliography(self):
        from research.editions import require_guide_reference_count
        parsed = subprocess.run(["pandoc", str(ROOT/"manuscript/references.bib"), "-f", "biblatex", "-t", "csljson"],
                                check=True,capture_output=True,text=True)
        expected = len(json.loads(parsed.stdout))
        guide = (ROOT/"docs/MANUSCRIPT.md").read_text()
        require_guide_reference_count(guide, expected)
        stale = guide.replace(f"references.bib`: {expected} ", "references.bib`: 21 ",1)
        self.assertNotEqual(stale,guide)
        with self.assertRaisesRegex(ValueError,"guide bibliography inventory"):
            require_guide_reference_count(stale, expected)
        with self.assertRaisesRegex(ValueError,"guide bibliography inventory"):
            require_guide_reference_count("Missing inventory", expected)

    def test_current_readme_count_is_bound_to_the_parsed_bibliography(self):
        from research.editions import require_readme_reference_count
        parsed = subprocess.run(["pandoc", str(ROOT/"manuscript/references.bib"), "-f", "biblatex", "-t", "csljson"],
                                check=True,capture_output=True,text=True)
        expected = len(json.loads(parsed.stdout))
        readme = (ROOT/"README.md").read_text()
        require_readme_reference_count(readme, expected)
        stale = readme.replace(f"engages {expected} sources", "engages 29 sources", 1)
        self.assertNotEqual(stale, readme)
        with self.assertRaisesRegex(ValueError, "README bibliography inventory"):
            require_readme_reference_count(stale, expected)
        with self.assertRaisesRegex(ValueError, "README bibliography inventory"):
            require_readme_reference_count("Missing inventory", expected)

    def test_contact_and_design_contract_rejects_missing_and_changed_fields(self):
        import yaml
        from research.publication_style import author_contact, validate_design_sources, validate_cover_text
        for name in ("config.yaml", "preamble.md", "web.css"):
            target = self.root/"manuscript"/name
            target.parent.mkdir(exist_ok=True)
            shutil.copyfile(ROOT/"manuscript"/name, target)
        design = validate_design_sources(self.root)
        contact = design["contact"]
        validate_cover_text(contact["email"] + " " + contact["orcid"], contact, "fixture")
        with self.assertRaisesRegex(ValueError, "missing email"):
            validate_cover_text(contact["orcid"], contact, "fixture")
        path = self.root/"manuscript/config.yaml"
        original = path.read_text()
        config = yaml.safe_load(original)
        for key, value in (("orcid", "0000-0001-6232-9097"), ("email", "not an address")):
            config["authors"][0][key] = value
            path.write_text(yaml.safe_dump(config))
            with self.assertRaises(ValueError): author_contact(self.root)
            config = yaml.safe_load(original)
        path.write_text(original)
        path = self.root/"manuscript/preamble.md"
        original = path.read_text()
        for bad in (original.replace("margin=18mm", "margin=24mm"),
                    original.replace("urlcolor=BattleshipLink", "urlcolor=blue")):
            path.write_text(bad)
            with self.assertRaises(ValueError): validate_design_sources(self.root)
        path.write_text(original)
        self.assertEqual(validate_design_sources(self.root)["pdfMarginMm"],18)

    def test_real_hyperlink_ink_rejects_blue_and_pure_red(self):
        from reportlab.pdfgen import canvas
        from research.publication_style import validate_pdf_link_ink, LINK_RED
        for name, color in (("good", "#" + LINK_RED), ("blue", "#185A87"), ("faint-red", "#FF0000")):
            path = self.root/f"link-{name}.pdf"
            document = canvas.Canvas(str(path),pagesize=(250,100))
            document.setFillColor(color)
            document.drawString(20,50,"Visible linked text")
            document.linkURL("https://orcid.org/0000-0001-6232-9096",(20,45,140,65),relative=0)
            document.save()
            if name == "good": self.assertEqual(validate_pdf_link_ink(path),1)
            else:
                with self.assertRaisesRegex(ValueError,"Hyperlink ink is not red"):
                    validate_pdf_link_ink(path)

    def test_graphical_generator_inventory_cannot_omit_changed_implementation(self):
        from research.frontmatter import verify_illustrations
        verify_illustrations(ROOT)
        for relative in ("research/frontmatter.py", "research/graphical_abstract.py",
                         "research/generated/frontmatter.json", "research/generated/dashboard-capture.json"):
            target = self.root/relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT/relative, target)
        path = self.root/"research/generated/frontmatter.json"
        original = json.loads(path.read_text())
        broken = {**original, "generators": {"research/frontmatter.py": original["generatorSha256"]}}
        path.write_text(json.dumps(broken))
        with self.assertRaisesRegex(ValueError, "Incomplete graphical generator inventory"):
            verify_illustrations(self.root)
        path.write_text(json.dumps(original))
        implementation = self.root/"research/graphical_abstract.py"
        implementation.write_text(implementation.read_text() + "\n# Changed implementation\n")
        with self.assertRaisesRegex(ValueError, "Changed graphical abstract generator"):
            verify_illustrations(self.root)

    def test_real_pdf_figure_overflow_rejected(self):
        from reportlab.pdfgen import canvas
        image = ROOT/"manuscript/figures/architecture.png"
        for name,y in [("valid",20),("overflow",-20)]:
            path = self.root/f"{name}.pdf"
            document = canvas.Canvas(str(path),pagesize=(200,200))
            document.drawImage(str(image),20,y,width=100,height=50)
            document.save()
        self.assertEqual(validate_page_geometry(self.root/"valid.pdf"),1)
        with self.assertRaisesRegex(ValueError,"Figure exceeds page bounds"):
            validate_page_geometry(self.root/"overflow.pdf")

    def test_real_pdf_text_all_four_bounds(self):
        from reportlab.pdfgen import canvas
        for name,x,y in [("valid",20,100),("left",-10,100),("right",195,100),
                         ("top",20,205),("bottom",20,-10)]:
            path = self.root/f"text-{name}.pdf"
            document = canvas.Canvas(str(path),pagesize=(200,200))
            document.drawString(x,y,"Deliberately placed text")
            document.save()
            if name=="valid":
                self.assertEqual(validate_page_geometry(path),0)
            else:
                with self.subTest(edge=name):
                    with self.assertRaisesRegex(ValueError,"Text exceeds page bounds"):
                        validate_page_geometry(path)

    def test_modified_source_rejected(self):
        path = self.root/"src/core/math.ts"
        path.write_text(path.read_text()+"\n// deliberately changed input\n")
        with self.assertRaisesRegex(ValueError, "Stale research input"):
            verify_results(self.root)

    def test_missing_case_rejected(self):
        self.mutate(lambda d: d["cases"].pop())
        with self.assertRaisesRegex(ValueError, "Incomplete research cases"):
            verify_results(self.root)

    def test_duplicate_case_rejected(self):
        self.mutate(lambda d: d["cases"].__setitem__(1, d["cases"][0]))
        with self.assertRaisesRegex(ValueError, "Duplicate research case"):
            verify_results(self.root)

    def test_repeat_shot_rejected(self):
        def change(data):
            trace = data["cases"][0]["trace"]
            trace[1]["cell"] = trace[0]["cell"]
        self.mutate(change)
        with self.assertRaisesRegex(ValueError, "Repeated research shot"):
            verify_results(self.root)

    def test_unfinished_search_rejected(self):
        def change(data):
            next(s for s in data["cases"][0]["trace"] if s["hit"])["hit"] = False
        self.mutate(change)
        with self.assertRaisesRegex(ValueError, "Incomplete fleet search"):
            verify_results(self.root)


if __name__ == "__main__":
    unittest.main()
