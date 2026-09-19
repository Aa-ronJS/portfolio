#!/usr/bin/env python3
"""Regenerate public/qr.svg for the deployed URL.

    pip install segno
    python3 tools/make-qr.py https://your-domain.com.au/#try

The QR points at the demo section of the landing page. Re-run this once
you know the final domain, then redeploy.
"""
import sys, pathlib
try:
    import segno
except ImportError:
    sys.exit("Run: pip install segno")

url = sys.argv[1] if len(sys.argv) > 1 else "https://quoteandchase.example.com/#try"
out = pathlib.Path(__file__).resolve().parent.parent / "public" / "qr.svg"
qr = segno.make(url, error="m")
qr.save(str(out), kind="svg", scale=8, border=2, dark="#16181d", light=None, xmldecl=False, svgclass=None, lineclass=None, omitsize=False)
print(f"wrote {out} for {url}")
