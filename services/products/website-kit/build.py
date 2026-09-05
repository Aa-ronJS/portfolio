#!/usr/bin/env python3
"""Builds the customer deliverables for the Website Kit into dist/:
one PDF per document, one combined PDF, and the zip a buyer downloads.

Needs: python3 with `markdown` (pip install markdown), and a Chromium
for the PDF step (set CHROMIUM=/path/to/chromium; defaults to the
Playwright install if present). Run from this directory:

    python3 build.py
"""
import base64
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
DIST = HERE / "dist"
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium")

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
code { font-family: 'Courier New', monospace; font-size: 10pt; }
strong { color: #000; }
hr { border: 0; border-top: 1px solid #cbc4b6; margin: 2em 0; }
.kit-footer { margin-top: 3em; padding-top: 0.8em; border-top: 1px solid #cbc4b6;
              font-size: 9pt; color: #6b7280; font-family: Arial, sans-serif; }
.doc-break { page-break-before: always; }
"""

FOOTER = ('<div class="kit-footer">The Website Kit &middot; Aaron Steele &middot; '
          'aaronsteele.vercel.app &middot; Personal licence: yours to use for your '
          'business, not to redistribute or resell.</div>')


def md_to_body(path: Path) -> str:
    return markdown.markdown(path.read_text(), extensions=["extra", "sane_lists"])


def wrap(title: str, body: str) -> str:
    return (f"<!doctype html><html><head><meta charset='utf-8'>"
            f"<title>{html.escape(title)}</title><style>{CSS}</style></head>"
            f"<body>{body}{FOOTER}</body></html>")


def to_pdf(html_path: Path, pdf_path: Path) -> None:
    subprocess.run(
        [CHROMIUM, "--headless", "--disable-gpu", "--no-sandbox",
         "--no-pdf-header-footer", f"--print-to-pdf={pdf_path}",
         html_path.as_uri()],
        check=True, capture_output=True)


def main() -> None:
    if not Path(CHROMIUM).exists():
        sys.exit(f"Chromium not found at {CHROMIUM}; set CHROMIUM=/path/to/chromium")
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    sources = sorted(HERE.glob("0*.md"))
    if len(sources) != 6:
        sys.exit(f"expected 6 numbered documents, found {len(sources)}")

    bodies = []
    for src in sources:
        body = md_to_body(src)
        bodies.append(body)
        title = re.search(r"<h1>(.*?)</h1>", body).group(1)
        html_path = DIST / f"{src.stem}.html"
        html_path.write_text(wrap(title, body))
        to_pdf(html_path, DIST / f"{src.stem}.pdf")
        html_path.unlink()
        print(f"  {src.stem}.pdf")

    combined = '<div class="doc-break"></div>'.join(bodies)
    html_path = DIST / "website-kit-complete.html"
    html_path.write_text(wrap("The Website Kit", combined))
    to_pdf(html_path, DIST / "website-kit-complete.pdf")
    html_path.unlink()
    print("  website-kit-complete.pdf")

    zip_path = DIST / "website-kit.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for pdf in sorted(DIST.glob("*.pdf")):
            z.write(pdf, f"website-kit/pdf/{pdf.name}")
        for src in sources:
            z.write(src, f"website-kit/markdown/{src.name}")
    print(f"  website-kit.zip ({zip_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
