"""Process the sample inbox.

    python run.py                 offline: text-layer extractor only
    python run.py --claude        Claude reads every PDF (needs ANTHROPIC_API_KEY)
    python run.py --claude-scans  offline extractor, Claude only for scans
"""
import argparse
import shutil
from pathlib import Path

from po_agent.extract import HeuristicExtractor
from po_agent.pipeline import process_inbox
from po_agent.validate import Reference

HERE = Path(__file__).parent

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--claude", action="store_true")
    ap.add_argument("--claude-scans", action="store_true")
    ap.add_argument("--inbox", default=HERE / "inbox", type=Path)
    ap.add_argument("--out", default=HERE / "out", type=Path)
    args = ap.parse_args()

    ref_dir = HERE / "reference"
    offline = HeuristicExtractor(Reference(ref_dir).customer_names())
    extractor, vision = offline, None
    if args.claude or args.claude_scans:
        from po_agent.extract import ClaudeExtractor
        vision = ClaudeExtractor()
        if args.claude:
            extractor = vision

    shutil.rmtree(args.out, ignore_errors=True)
    results = process_inbox(args.inbox, ref_dir, args.out, extractor, vision)
    for r in results:
        print(f"{r.status.upper():9} {r.attachment or r.subject:34} {r.output or r.reason}")
        for f in r.flags:
            where = f" line {f.line_no}" if f.line_no else ""
            print(f"            {'!' if f.blocking else '-'} {f.code}{where}: {f.message}")
    print(f"\nReport: {args.out / 'report.html'}")
