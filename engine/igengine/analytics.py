"""Weekly kill/scale report, computed from the ledger alone.

The engine's editorial judgement lives here: per market x format it computes
follows-per-reach and share rate over the posts that have insights, then
issues SCALE / KILL / KEEP TESTING verdicts against config thresholds.
"""

from collections import defaultdict

from . import ledger, publish
from .config import STATE_DIR


def refresh_insights(cfg):
    """Pull current numbers for every published row that has none or is young."""
    for row in ledger.load():
        if not row.get("media_id"):
            continue
        data = publish.media_insights(cfg, row["market"], row["media_id"])
        if data:
            ledger.update(row["run_id"], row["market"], insights=data)


def report(cfg):
    th = cfg["engine"]["thresholds"]
    cells = defaultdict(list)
    for row in ledger.load():
        cells[(row["market"], row["format"])].append(row)

    lines = ["# Engine report", ""]
    lines.append("| market | format | posts | reach | follows/reach | shares/reach | verdict |")
    lines.append("|---|---|---|---|---|---|---|")
    for (market, fmt), rows in sorted(cells.items()):
        with_data = [r for r in rows if r.get("insights", {}).get("reach")]
        reach = sum(r["insights"]["reach"] for r in with_data)
        follows = sum(r["insights"].get("follows", 0) for r in with_data)
        shares = sum(r["insights"].get("shares", 0) for r in with_data)
        fpr = follows / reach if reach else 0.0
        spr = shares / reach if reach else 0.0

        if not with_data:
            verdict = "no data yet"
        elif fpr >= th["follows_per_reach_scale"] or spr >= th["share_rate_scale"]:
            verdict = "SCALE — double this format's share of the slot"
        elif len(rows) >= th["kill_after_posts"] and fpr <= th["follows_per_reach_kill"]:
            verdict = "KILL — retire the format, promote a new variant"
        else:
            verdict = "keep testing"
        lines.append(f"| {market} | {fmt} | {len(rows)} | {reach} "
                     f"| {fpr:.4f} | {spr:.4f} | {verdict} |")

    out = STATE_DIR / "report.md"
    out.write_text("\n".join(lines) + "\n")
    return out
