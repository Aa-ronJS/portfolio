#!/usr/bin/env python3
"""Builds a kit's customer deliverables into <kit>/dist/: one PDF per
document, one combined PDF, and the zip a buyer downloads.

Usage, from this directory:

    python3 build.py website-kit
    python3 build.py builders-kit

Needs: python3 with `markdown` (pip install markdown) and a Chromium
(set CHROMIUM=/path/to/chromium; defaults to the Playwright install).
"""
import html
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import markdown

HERE = Path(__file__).resolve().parent
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium")

KITS = {
    "website-kit": "The Website Kit",
    "builders-kit": "The Builder's Kit",
}

CSS = """
@page { margin: 22mm 18mm; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt;
       line-height: 1.55; color: #1a1f26; max-width: 46em; margin: 0 auto; }
h1 { font-family: Arial, Helvetica, sans-serif; font-size: 21pt; line-height: 1.15;
     margin: 0 0 0.6em; letter-spacing: -0.01em; }
h2 { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; margin: 1.6em 0 0.5em;
     padding-top: 0.6em; border-top: 2px solid #e0a232; }
h3 { font-family: Arial, Helvetica, sans-serif; font-size: 11.5pt; margin: 1.3em 0 0.4em; }
p, li { orphans: 3; widows: 3; }
ul, ol { padding-left: 1.4em; }
li { margin: 0.25em 0; }
blockquote { margin: 1em 0; padding: 0.6em 1em; background: #f6f2ea;
             border-left: 3px solid #e0a232; font-size: 10.5pt; }
blockquote p { margin: 0.3em 0; }
pre { background: #f6f2ea; border-left: 3px solid #e0a232; padding: 0.8em 1em;
      font-size: 9pt; white-space: pre-wrap; word-wrap: break-word; }
code { font-family: 'Courier New', monospace; font-size: 10pt; }
table { border-collapse: collapse; font-size: 10pt; margin: 1em 0; }
th, td { border: 1px solid #cbc4b6; padding: 0.4em 0.7em; text-align: left; }
th { font-family: Arial, sans-serif; background: #f6f2ea; }
strong { color: #000; }
hr { border: 0; border-top: 1px solid #cbc4b6; margin: 2em 0; }
.kit-footer { margin-top: 3em; padding-top: 0.8em; border-top: 1px solid #cbc4b6;
              font-size: 9pt; color: #6b7280; font-family: Arial, sans-serif; }
.doc-break { page-break-before: always; }
"""


def footer(kit_title: str) -> str:
    return (f'<div class="kit-footer">{html.escape(kit_title)} &middot; Aaron Steele '
            '&middot; aaronsteele.vercel.app &middot; Personal licence: yours to use '
            'for your business, not to redistribute or resell.</div>')


def wrap(kit_title: str, page_title: str, body: str) -> str:
    return (f"<!doctype html><html><head><meta charset='utf-8'>"
            f"<title>{html.escape(page_title)}</title><style>{CSS}</style></head>"
            f"<body>{body}{footer(kit_title)}</body></html>")


def to_pdf(html_path: Path, pdf_path: Path) -> None:
    subprocess.run(
        [CHROMIUM, "--headless", "--disable-gpu", "--no-sandbox",
         "--no-pdf-header-footer", f"--print-to-pdf={pdf_path}",
         html_path.as_uri()],
        check=True, capture_output=True)


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in KITS:
        sys.exit(f"usage: build.py <{'|'.join(KITS)}>")
    kit = sys.argv[1]
    kit_title = KITS[kit]
    src_dir = HERE / kit
    dist = src_dir / "dist"
    if not Path(CHROMIUM).exists():
        sys.exit(f"Chromium not found at {CHROMIUM}; set CHROMIUM=/path/to/chromium")
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir()

    sources = sorted(src_dir.glob("0*.md"))
    if not sources:
        sys.exit(f"no numbered documents in {src_dir}")

    bodies = []
    for src in sources:
        body = markdown.markdown(src.read_text(), extensions=["extra", "sane_lists"])
        bodies.append(body)
        title = re.search(r"<h1>(.*?)</h1>", body).group(1)
        html_path = dist / f"{src.stem}.html"
        html_path.write_text(wrap(kit_title, title, body))
        to_pdf(html_path, dist / f"{src.stem}.pdf")
        html_path.unlink()
        print(f"  {src.stem}.pdf")

    combined = '<div class="doc-break"></div>'.join(bodies)
    html_path = dist / f"{kit}-complete.html"
    html_path.write_text(wrap(kit_title, kit_title, combined))
    to_pdf(html_path, dist / f"{kit}-complete.pdf")
    html_path.unlink()
    print(f"  {kit}-complete.pdf")

    zip_path = dist / f"{kit}.zip"
    setup_dir = src_dir / "setup"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for pdf in sorted(dist.glob("*.pdf")):
            z.write(pdf, f"{kit}/pdf/{pdf.name}")
        for src in sources:
            z.write(src, f"{kit}/markdown/{src.name}")
        if setup_dir.is_dir():
            for f in sorted(setup_dir.rglob("*.md")):
                z.write(f, f"{kit}/setup/{f.relative_to(setup_dir)}")
            print(f"  setup/ included ({sum(1 for _ in setup_dir.rglob('*.md'))} files)")
    print(f"  {kit}.zip ({zip_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
