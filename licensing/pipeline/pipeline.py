#!/usr/bin/env python3
"""Idea pipeline: scores every idea, works out what it's worth, and says
what to do next and whether it has earned any patent money.

    python3 licensing/pipeline/pipeline.py        # rebuilds BOARD.md

Edit ideas.json to add ideas or move them between stages.
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
PASS_MARK = 9          # of 14
FILE_BAR = 5000        # expected value needed before the A$100 provisional
PAY_YEARS = 2.5        # 3 years of royalties, cut for licences that end early
STRONG_SHARE = 0.2     # share of deals that turn out to be the strong case

STAGES = ["raw", "screened", "sized", "probed", "proven", "filed", "pitching", "interest", "deal"]
NEXT = {
    "raw": "Run the kill checks: is it on sale, is it patented, are there 5 companies to pitch?",
    "screened": "Score it out of 14 and estimate what a deal would pay.",
    "sized": "Problem probe: ask 10 companies about the problem only. Then bench test and 10 strangers.",
    "probed": "Bench test (about A$100) and show 10 strangers.",
    "proven": "File the provisional (A$100).",
    "filed": "Pitch 30 companies. Start the 12-month clock.",
    "pitching": "Follow up on days 7, 21, 45 and 90.",
    "interest": "Agree an evaluation option. Ask the company to pay for the full patent.",
    "deal": "Collect royalties. Check the minimums each year.",
}


def value(i):
    """Expected value in A$ of an idea, before costs."""
    blended = (1 - STRONG_SHARE) * i["modest"] + STRONG_SHARE * i["strong"]
    return i["odds"] * blended * PAY_YEARS


def money(n):
    return f"A${n:,.0f}"


def gate(i):
    score = sum(i["scores"])
    ev = value(i)
    if score < PASS_MARK:
        return "Below the pass mark. Shelve."
    if i["stage"] in ("sized", "probed", "proven") and ev < FILE_BAR:
        return "Too small to file for. Pitch only where no disclosure is needed, or shelve."
    if i["stage"] in ("sized", "probed"):
        return "Not yet. Prove it first."
    if i["stage"] == "proven":
        return "Yes: file the A$100 provisional."
    if i["stage"] in ("filed", "pitching"):
        return "No more patent money until a company commits."
    if i["stage"] == "interest":
        return "Full patent only if the company pays or signs an option."
    return ""


def main():
    ideas = json.loads((HERE / "ideas.json").read_text())["ideas"]
    live = [i for i in ideas if i["stage"] in STAGES and "odds" in i]
    screened = [i for i in ideas if i["stage"] == "screened" and "odds" not in i]
    raw = [i for i in ideas if i["stage"] == "raw"]
    dead = [i for i in ideas if i["stage"] in ("killed", "shelved")]
    live.sort(key=value, reverse=True)

    out = ["# Idea board", "",
           "Built by `pipeline.py` from `ideas.json`. Don't edit this file by hand.", "",
           f"{len(live)} live, {len(screened)} through the kill checks and waiting to be scored, "
           f"{len(raw)} waiting to be screened, {len(dead)} killed or shelved. "
           f"Patent money spent so far: {money(sum(i.get('spent', 0) for i in ideas))}.", "",
           "## Live ideas, best first", "",
           "| Idea | Stage | Score /14 | Odds | Worth (expected) | Patent money? | Next step |",
           "|------|-------|-----------|------|------------------|---------------|-----------|"]
    for i in live:
        out.append(f"| [{i['name']}](../{i['file']}) | {i['stage']} | {sum(i['scores'])} | "
                   f"{i['odds']:.0%} | {money(value(i))} | {gate(i)} | {NEXT[i['stage']]} |")
    out += ["", "\"Worth\" is odds x a blend of the modest and strong deal x 2.5 years of royalties. "
            "Every input is an estimate.", "",
            "## Through the kill checks, waiting to be scored", "",
            "| Idea | What the check found |", "|------|----------------------|"]
    out += [f"| {i['name']} | {i['note']} |" for i in screened]
    out += ["", "## Waiting to be screened", "",
            "Unchecked. Most will die at the kill checks.", "",
            "| Idea | Pattern |", "|------|---------|"]
    out += [f"| {i['name']} | {i['pattern']} |" for i in raw]
    out += ["", "## Killed or shelved", "", "| Idea | Why |", "|------|-----|"]
    out += [f"| {i['name']} | {i['reason']} |" for i in dead]
    (HERE / "BOARD.md").write_text("\n".join(out) + "\n")
    print(f"{len(live)} live, {len(screened)} screened, {len(raw)} raw, {len(dead)} dead")
    for i in live:
        print(f"  {i['name']:<24} {money(value(i)):>10}  {gate(i)}")


if __name__ == "__main__":
    main()
