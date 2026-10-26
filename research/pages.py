"""Native DOCX layout and bounded PDF page captures, with external profiles/temp."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

from pypdf import PdfReader

from research.manuscript import ROOT, sha


def capture_pages() -> None:
    output = ROOT/"output"
    docx = output/"docx/active_inference_battleship.docx"
    native = output/"docx-native"
    native.mkdir(parents=True,exist_ok=True)
    profile = Path(tempfile.mkdtemp(prefix="battleship-manuscript-libreoffice-", dir=os.environ["TMPDIR"]))
    soffice = Path(os.environ["SOFFICE"]).resolve(strict=True)
    version = subprocess.run([str(soffice),"--version"],check=True,capture_output=True,text=True)
    conversion = subprocess.run([str(soffice),"--headless", "--norestore",
        f"-env:UserInstallation={profile.as_uri()}","--convert-to","pdf:writer_pdf_Export",
        "--outdir",str(native),str(docx)],check=False,capture_output=True,text=True,timeout=120)
    if conversion.returncode != 0:
        raise RuntimeError(f"Native DOCX conversion failed ({conversion.returncode}): {conversion.stdout} {conversion.stderr}")
    converted = native/"active_inference_battleship.pdf"
    if not converted.is_file() or converted.stat().st_mtime_ns < docx.stat().st_mtime_ns:
        raise RuntimeError(f"Native DOCX conversion did not produce a fresh PDF: {conversion.stdout} {conversion.stderr}")
    captures = []
    for edition,pdf in [("pdf",output/"pdf/active_inference_battleship_combined.pdf"),
                        ("docx",converted)]:
        directory = output/"qa"/edition
        directory.mkdir(parents=True,exist_ok=True)
        subprocess.run(["pdftoppm","-r","110","-png",str(pdf),str(directory/"page")],
                       check=True,capture_output=True,text=True,timeout=120)
        pages = sorted(directory.glob("page-*.png"))
        count = len(PdfReader(pdf).pages)
        if len(pages)!=count:
            raise RuntimeError(f"Page-capture count mismatch: {edition}")
        for page in pages:
            captures.append({"path":str(page.relative_to(ROOT)),"sha256":sha(page)})
    receipt = {"soffice":str(soffice),"version":version.stdout.strip(),
               "nativePdfSha256":sha(converted),"docxSha256":sha(docx),
               "conversionStdout":conversion.stdout,"conversionStderr":conversion.stderr,
               "captures":captures}
    (output/"page-manifest.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps({"pages":len(captures),"nativeVersion":version.stdout.strip()}))
