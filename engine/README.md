# Instagram audience engine

A horizontal, self-running content engine. Every day it writes a short-form
script per active market, generates the imagery and voiceover, assembles a
1080x1920 Reel with burned-in captions, publishes it through the official
Instagram Graph API, and logs the run. Every Sunday it pulls insights and
issues SCALE / KILL / KEEP TESTING verdicts per market x format. Markets are
config rows, not code — the engine doesn't care what it's selling.

## How it runs itself

`.github/workflows/engine.yml` fires daily (production) and weekly (report)
on GitHub-hosted runners, on this branch. No server, no laptop. Each run
commits `engine/state/ledger.json` and `engine/state/report.md` back to the
branch, so the full decision history is in git. Rendered Reels are attached
to each workflow run as artifacts for 14 days.

Degradation is graceful by design: with no keys at all the pipeline still
renders draft Reels (template script, gradient slides, silent track) so you
can verify the machinery; each key you add upgrades one stage. Offline draft
packets are never published, even when Instagram credentials are present.

## The keys (repo → Settings → Secrets and variables → Actions)

| Secret | Unlocks | Where it comes from |
|---|---|---|
| `ANTHROPIC_API_KEY` | Real scripts (hooks, beats, captions) | console.anthropic.com |
| `REPLICATE_API_TOKEN` | Generated imagery per beat | replicate.com |
| `ELEVENLABS_API_KEY` | Voiceover track | elevenlabs.io |
| `IG_ACCESS_TOKEN` | Publishing + insights | Meta app, long-lived token, `instagram_business_content_publish` + `instagram_business_manage_insights` |
| `IG_USER_ID_<MARKET>` | Which account each market posts to | Graph API `me/accounts` → connected IG professional account id. `IG_USER_ID` alone works for a single account. |

Instagram publishing requires a **professional (Business/Creator) account**
connected to a Facebook Page and a Meta developer app — that's the one piece
only the account owner can set up. Everything is official-API only: no
scraping, no engagement automation, nothing that risks the account.

## Operating the engine

- **Add/replace a market**: edit `markets:` in `config.yaml`. A market is an
  audience, an angle, a DM keyword, a lead magnet, and 2+ format patterns.
- **Kill / scale**: follow `engine/state/report.md` verdicts — flip `active`,
  adjust `posts_per_day`, retire formats, add variants of winners.
- **Run manually**: Actions → engine → Run workflow (`daily` or `report`),
  or locally `python engine/run.py daily` (needs ffmpeg; set `FFMPEG_BIN` if
  not on PATH).

## Monetization path (wired into the content, not bolted on later)

Every Reel's final beat is a DM-keyword CTA tied to the market's lead magnet.
Connect a DM automation (e.g. ManyChat) to each account with one rule per
keyword — deliver the lead magnet against an email address. The list is the
asset; products and affiliate offers ride on it once a market's report shows
SCALE verdicts.
