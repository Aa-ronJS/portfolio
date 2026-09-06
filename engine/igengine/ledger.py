"""Content ledger: one JSON file, committed back to the branch by the runner.

Every produced packet gets a row; publish and insight passes update it. The
weekly report reads nothing but this file, which keeps every decision the
engine makes auditable in git history.
"""

import json

from .config import STATE_DIR

LEDGER = STATE_DIR / "ledger.json"


def load():
    if LEDGER.exists():
        return json.loads(LEDGER.read_text())
    return []


def save(rows):
    STATE_DIR.mkdir(exist_ok=True)
    LEDGER.write_text(json.dumps(rows, indent=1, sort_keys=True) + "\n")


def append(row):
    rows = load()
    rows.append(row)
    save(rows)


def update(run_id, market, **fields):
    rows = load()
    for row in rows:
        if row["run_id"] == run_id and row["market"] == market:
            row.update(fields)
    save(rows)


def recent_hooks(market_key, limit=20):
    return [r["hook"] for r in load() if r["market"] == market_key][-limit:]
