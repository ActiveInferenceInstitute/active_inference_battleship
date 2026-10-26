"""Generate a documented reference style before Pandoc writes the manuscript."""
from io import BytesIO
from pathlib import Path
import subprocess
from lxml import etree as ET
from zipfile import ZipFile
from research.publication_style import LINK_RED
WORD_SERIF = "Liberation Serif"


def require_theme_fonts(theme) -> None:
    uri = "http://schemas.openxmlformats.org/drawingml/2006/main"
    latin = theme.findall(f".//{{{uri}}}fontScheme//{{{uri}}}latin")
    if len(latin) != 2 or any(font.get("typeface") != WORD_SERIF for font in latin):
        raise ValueError("Word major and minor theme fonts must be Liberation Serif")


def require_caption_styles(styles) -> None:
    uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    for identity, properties in {"ImageCaption": ("keepLines",), "TableCaption": ("keepLines", "keepNext"), "CaptionedFigure": ("keepNext",)}.items():
        style = styles.find(f"{{{uri}}}style[@{{{uri}}}styleId='{identity}']")
        for name in properties:
            flag = None if style is None else style.find(f"{{{uri}}}pPr/{{{uri}}}{name}")
            if flag is None or flag.get(f"{{{uri}}}val", "1") in {"0", "false", "off"}:
                raise ValueError(f"Word caption pagination requires {identity}/{name}")


def require_unsplit_rows(document) -> int:
    uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    rows = document.findall(f".//{{{uri}}}tbl/{{{uri}}}tr")
    if not rows or any(row.find(f"{{{uri}}}trPr/{{{uri}}}cantSplit") is None or
                       row.find(f"{{{uri}}}trPr/{{{uri}}}cantSplit").get(f"{{{uri}}}val", "1") in {"0", "false", "off"}
                       for row in rows):
        raise ValueError("Every manuscript table row must stay on one physical page")
    return len(rows)


def keep_table_rows(path: Path) -> int:
    """Apply the authored Word pagination policy after the template writer."""
    import os
    import tempfile
    uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    with ZipFile(path) as source:
        document = ET.fromstring(source.read("word/document.xml"))
        for row in document.findall(f".//{{{uri}}}tbl/{{{uri}}}tr"):
            properties = row.find(f"{{{uri}}}trPr")
            if properties is None:
                properties = ET.Element(f"{{{uri}}}trPr")
                row.insert(0, properties)
            keep = properties.find(f"{{{uri}}}cantSplit")
            if keep is None:
                keep = ET.SubElement(properties, f"{{{uri}}}cantSplit")
            keep.attrib.clear()
            cell = row.find(f"{{{uri}}}tc")
            if cell is None:
                raise ValueError("Table row is missing its catalog-count cell")
            cell_properties = cell.find(f"{{{uri}}}tcPr")
            if cell_properties is None:
                cell_properties = ET.Element(f"{{{uri}}}tcPr")
                cell.insert(0, cell_properties)
            no_wrap = cell_properties.find(f"{{{uri}}}noWrap")
            if no_wrap is None:
                no_wrap = ET.SubElement(cell_properties, f"{{{uri}}}noWrap")
            no_wrap.attrib.clear()
        count = require_unsplit_rows(document)
        data = BytesIO()
        with ZipFile(data, "w") as target:
            for info in source.infolist():
                target.writestr(info, ET.tostring(document, xml_declaration=True, encoding="UTF-8", standalone=True)
                                if info.filename == "word/document.xml" else source.read(info.filename))
    descriptor, temporary = tempfile.mkstemp(prefix="table-rows-", suffix=".docx", dir=path.parent)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(data.getvalue())
    os.replace(temporary, path)
    return count


def write_reference(destination: Path) -> None:
    default = subprocess.run(["pandoc","--print-default-data-file=reference.docx"],
                             check=True,capture_output=True).stdout
    uri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    ET.register_namespace("w",uri)
    def w(name): return f"{{{uri}}}{name}"
    relationship_uri = "http://schemas.openxmlformats.org/package/2006/relationships"
    office_uri = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    ET.register_namespace("r",office_uri)
    with ZipFile(BytesIO(default)) as source:
        theme = ET.fromstring(source.read("word/theme/theme1.xml"))
        for font in theme.findall(".//{http://schemas.openxmlformats.org/drawingml/2006/main}fontScheme//{http://schemas.openxmlformats.org/drawingml/2006/main}latin"):
            font.set("typeface", WORD_SERIF)
        require_theme_fonts(theme)
        styles = ET.fromstring(source.read("word/styles.xml"))
        for style in styles.findall(w("style")):
            identity = style.get(w("styleId"), "")
            if identity in {"ImageCaption", "TableCaption"}:
                properties = style.find(w("pPr"))
                if properties is None:
                    properties = ET.SubElement(style, w("pPr"))
                ET.SubElement(properties, w("keepLines"))
            if identity in {"Title", "Subtitle"} or identity.startswith("Heading"):
                properties = style.find(w("rPr"))
                if properties is None:
                    properties = ET.SubElement(style, w("rPr"))
                color = properties.find(w("color"))
                if color is None:
                    color = ET.SubElement(properties, w("color"))
                color.attrib.clear()
                color.set(w("val"), "000000")
        hyperlink = next((s for s in styles.findall(w("style"))
                          if s.get(w("styleId")) == "Hyperlink"),None)
        if hyperlink is None:
            raise ValueError("Pandoc reference lacks its Hyperlink style")
        for style in styles.findall(w("style")):
            if style.get(w("styleId")) not in {"Hyperlink","FollowedHyperlink"}:
                continue
            properties = style.find(w("rPr"))
            if properties is None:
                properties = ET.SubElement(style,w("rPr"))
            color = properties.find(w("color"))
            if color is None:
                color = ET.SubElement(properties,w("color"))
            color.attrib.clear()
            color.set(w("val"),LINK_RED)
        bibliography = next((s for s in styles.findall(w("style"))
                             if s.get(w("styleId")) == "Bibliography"),None)
        if bibliography is None:
            raise ValueError("Pandoc reference lacks its Bibliography style")
        paragraph_properties = bibliography.find(w("pPr"))
        if paragraph_properties is None:
            paragraph_properties = ET.SubElement(bibliography,w("pPr"))
        spacing = paragraph_properties.find(w("spacing"))
        if spacing is None:
            spacing = ET.SubElement(paragraph_properties,w("spacing"))
        spacing.attrib.update({w("before"):"0",w("after"):"0",w("line"):"240",w("lineRule"):"auto"})
        run_properties = bibliography.find(w("rPr"))
        if run_properties is None:
            run_properties = ET.SubElement(bibliography,w("rPr"))
        for property_name in ("sz","szCs"):
            size = run_properties.find(w(property_name))
            if size is None:
                size = ET.SubElement(run_properties,w(property_name))
            size.set(w("val"),"20")
        lead = ET.SubElement(styles,w("style"),{w("type"):"paragraph",w("styleId"):"EquationLead"})
        ET.SubElement(lead,w("name"),{w("val"):"Equation Lead"})
        ET.SubElement(lead,w("basedOn"),{w("val"):"BodyText"})
        properties = ET.SubElement(lead,w("pPr"))
        ET.SubElement(properties,w("keepNext"))
        ET.SubElement(properties,w("keepLines"))
        for identity, name in (("VisualPlateHeading", "Visual Plate Heading"), ("BodyOpening", "Body Opening"), ("ReferencesOpening", "References Opening")):
            style = ET.SubElement(styles, w("style"), {w("type"): "paragraph", w("styleId"): identity})
            ET.SubElement(style, w("name"), {w("val"): name})
            ET.SubElement(style, w("basedOn"), {w("val"): "Heading1"})
            properties = ET.SubElement(style, w("pPr"))
            ET.SubElement(properties, w("pageBreakBefore"))
            ET.SubElement(properties, w("keepNext"))
            ET.SubElement(properties, w("keepLines"))
        document = ET.fromstring(source.read("word/document.xml"))
        section = document.find(f".//{w('sectPr')}")
        if section is None or section.find(w("footerReference")) is not None:
            raise ValueError("Unexpected Pandoc reference section/footer structure")
        relationships = ET.fromstring(source.read("word/_rels/document.xml.rels"))
        footer_id = "rIdManuscriptFooter"
        ET.SubElement(relationships,f"{{{relationship_uri}}}Relationship",
                      {"Id":footer_id,"Type":office_uri+"/footer","Target":"footer-manuscript.xml"})
        ET.SubElement(section,w("footerReference"),
                      {w("type"):"default",f"{{{office_uri}}}id":footer_id})
        types = ET.fromstring(source.read("[Content_Types].xml"))
        ET.SubElement(types,"{http://schemas.openxmlformats.org/package/2006/content-types}Override",
                      {"PartName":"/word/footer-manuscript.xml",
                       "ContentType":"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"})
        footer = ET.Element(w("ftr"))
        paragraph = ET.SubElement(footer,w("p"))
        props = ET.SubElement(paragraph,w("pPr"))
        ET.SubElement(props,w("jc"),{w("val"):"center"})
        field = ET.SubElement(paragraph,w("fldSimple"),{w("instr"):"PAGE"})
        ET.SubElement(ET.SubElement(field,w("r")),w("t")).text="1"
        require_caption_styles(styles)
        replacements = {"word/styles.xml":styles,"word/document.xml":document,"word/theme/theme1.xml":theme,
                        "word/_rels/document.xml.rels":relationships,"[Content_Types].xml":types}
        destination.parent.mkdir(parents=True,exist_ok=True)
        with ZipFile(destination,"w") as output:
            for entry in source.infolist():
                content = ET.tostring(replacements[entry.filename],encoding="utf-8",xml_declaration=True) if entry.filename in replacements else source.read(entry.filename)
                output.writestr(entry,content)
            output.writestr("word/footer-manuscript.xml",ET.tostring(footer,encoding="utf-8",xml_declaration=True))
