# Portfolio framework: seven channels, one machine

One named channel (`aaron/`, plan in `aaron/STRATEGY.md`) plus six
anonymous ones, all run by the same engine. Everything in the named
channel's framework (script craft, packaging, decision rules, 3-month
review) applies to every channel. This file covers what changes when
there are seven. Written 18 Nov 2026.

## The principle

**Quality comes from the system, not from Aaron's hours.** Each channel
gets its own rules, researched scripts, rotated structures and its own
review. None of that thins out with more channels. What has to scale is
**distinctness**: seven channels from one engine must never look like
one template with the nouns swapped. That's the craft problem, and it's
also YouTube's "inauthentic content" test, which judges each channel
for signs of mass production.

## The seven

| Channel | Niche | Register | Main footage | Posts (UTC) |
|---|---|---|---|---|
| **Aaron Steele** (named) | Why the ordinary world works like this | Dry, wry | Pexels, maps | Tue, Fri |
| **Slow Orbit** | Space missions that went sideways | Calm, late-night | NASA, National Archives | Mon, Thu |
| **Odd Lines** | Odd borders and strange places | Brisk, wry | Maps, satellite imagery, drone stock | Wed, Sat |
| **Dry Fauna** | Animal behaviour, told deadpan | Deadpan | US Fish & Wildlife, NPS, NOAA, stock | Thu, Sun |
| **Restless Ground** | Volcanoes, storms, quakes, deep sea | Measured, urgent | USGS, NOAA, NASA Earth | Mon, Fri |
| **Hangar Archive** | Cold War aircraft and prototypes | Brisk, factual | DVIDS, National Archives, NASA Armstrong | Tue, Sat |
| **Footnote Hour** | Forgotten everyday history and words | Warm, amused | Prelinger films, Library of Congress, museum CC0 art | Wed, Sun |

Why these six: each has a free footage source that actually shows its
subject, sits in or near the education category where ads pay most
(median ~US$10 per 1,000 views), and doesn't compete with the others
for the same viewers. Rejected: a standalone ocean channel (splits
Dry Fauna and Restless Ground), standalone etymology (too little search
demand, folded into Footnote Hour), disasters (tragedy), mythology
(religion-adjacent and full of AI slop), food history (low pay).

Two pairs share some audience: Dry Fauna/Restless Ground (nature) and
Slow Orbit/Hangar Archive (NASA-era footage). Their topics don't
overlap, but never cross-post Shorts between them.

Two posts a day across the portfolio, fourteen a week, spread so no day
is heavier than another.

## Keeping seven channels distinct

Every channel differs on all of these, not one or two:

| Layer | How it varies |
|---|---|
| **Voice** | One voice, five registers. The clone copies the *delivery* of the recording it's made from, so Aaron records one take per register and each becomes its own voice file: `aaron-dry`, `aaron-calm`, `aaron-measured`, `aaron-brisk`, `aaron-warm`. Speed differs per channel too |
| **Script shape** | Own RULES.md: own audience, register, banned phrases and channel-specific rules. Structures rotate within each channel |
| **Pacing** | Calm channels cut slower (6–10 s), brisk ones faster (3–5 s) |
| **Look** | Own caption colours now; own caption font, title cards and map style (build list) |
| **Thumbnails** | Own template per channel: colour, type and composition (build list) |
| **Footage** | Different primary archives, so the same stock clip never anchors two channels |
| **Schedule** | Different posting days |

### About using Aaron's voice everywhere
His choice, with eyes open. Registers make the channels feel different,
but anyone who knows his voice well could connect them. YouTube itself
always knows: all seven are paid through one AdSense account (allowed:
one account can pay many channels; a *second* AdSense account per
person is what gets closed). Anonymity here means anonymous to
viewers, nothing more. The descriptions say "Narration synthesised with
Kyutai Pocket TTS" without "the creator's own voice", so the channels
aren't linked in writing.

## Accounts

- Each channel is a **Brand Account** under one Google login; viewers
  can't see who owns a Brand Account.
- One Google Cloud app serves all seven. Each channel signs in once
  (`python -m ac <channel> youtube-auth`) and gets its own secret,
  `YT_REFRESH_TOKEN_<CHANNEL>`. Each day's job only ever sees its own channel's.
- Upload quota is 100 a day per app; the portfolio uses 2.

## Aaron's time

- **Named channel:** 5 minutes a day, as planned.
- **Six anonymous channels:** one weekly batch, ~15 minutes. Each
  channel keeps 4 scripts ahead (two weeks), so a missed week costs
  nothing. `python -m ac pending` lists every script waiting, across
  channels; the phone version is on the build list.

## Money

Budget US$50/month for everything.

| Item | Estimate |
|---|---|
| Scripts: ~60 a month × ~$0.50 (researched, Claude Opus 5.5) | ~$30 |
| Voice, rendering, footage, upload | $0 |
| Compute: ~60 videos × ~15 min ≈ 900 of the 2,000 free private-repo minutes | $0 |
| Headroom (rewrites, thumbnail experiments) | ~$20 |

If scripts come in over budget, the first lever is fewer scripts
binned, not a cheaper model.

## Portfolio decision rules

The per-video and per-channel rules in `aaron/STRATEGY.md` section 8
apply to each channel. On top of those:

- **Judge channels against their own median**, never against each other
  in the first 3 months; niches have different natural audiences.
- **At the mid-February review, rank all seven** on share of video
  watched (the thing a cheap machine can improve) and on watch-time
  growth.
  - **Top 2:** move to 3 videos a week.
  - **Middle:** unchanged.
  - **Bottom 2:** change format or register for a month, then **retire
    or replace** with a reserve niche (national parks, or the runners-up
    from research) if still bottom.
- **Copy what works across channels:** a hook, structure or packaging
  idea that lifts one channel gets tried on two others, never all six
  at once.
- **One strike anywhere pauses everything.** A copyright claim, a
  community-guidelines strike or a demonetisation email stops posting on
  every channel until the cause is understood. Same machine, so possibly
  the same cause.

## Footage, licences and Content ID

- Every clip used is logged with its source URL and licence in the
  episode file (build list), so any claim can be answered in minutes.
- Public-domain footage gets bogus Content ID claims (NASA's own Mars
  landing upload was once taken down). Dispute them; a claimant who
  doesn't respond within 30 days loses the claim.
- Archive film: pictures only. Old soundtracks can still be in copyright.
- ESA: only items marked CC BY-SA. Mixkit: Free tier only. Videvo: never
  "editorial use". NASA: no logos, nothing implying endorsement.
- No channel leans mostly on one public-domain source that others have
  already uploaded wholesale.

## Shorts across the portfolio

About 2 Shorts per long video, not 10. Agency data shows heavy-Shorts
months coinciding with lower long-form ad rates, and Shorts pay little
(about $0.02–$1.50 per 1,000 views). They're trailers, judged on whether
long-form views follow.

## Build list additions (on top of `aaron/STRATEGY.md` section 9)

1. **Footage sources** beyond Pexels: Pixabay (API), NASA Image and
   Video Library (API), National Archives (API), DVIDS (API), Internet
   Archive / Prelinger, Wikimedia Commons, Smithsonian/Met CC0. Each
   channel lists its sources in channel.yaml; every clip's licence goes
   in the episode log.
2. **Stills mode:** slow pans and zooms on archive photos and paintings,
   for Footnote Hour and Hangar Archive.
3. **Per-channel look:** caption font, title cards, map style, cut pace.
4. **Per-channel thumbnail templates.**
5. **Weekly approval on the phone**: one digest of every pending script,
   with approve/bin/note per script.
6. **Portfolio weekly report**: all seven channels on one page, ranked by
   their own median.
7. **Strike switch**: one setting that pauses every channel.

## Before launch: checks to do by hand

- Search each channel name as a YouTube handle and a trademark; the
  research found no channel using them but didn't check handles.
- Record the five voice takes (`voices/README.md`).
- Create the six Brand Accounts and sign each in.

## Sources
- AIR Media-Tech, RPM by niche from verified revenue (2026): https://air.io/en/air-data-findings/which-youtube-niche-makes-the-most-money-in-2026-ranked-by-real-rpm-and-cpm
- AIR Media-Tech, Shorts RPM by niche (2026): https://air.io/en/air-data-findings/what-is-youtube-shorts-rpm-in-your-niche-in-2026
- Google, one AdSense account for several channels: https://support.google.com/youtube/answer/9914702
- NASA media usage: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA footage taken down by Content ID (Techdirt): https://www.techdirt.com/articles/20210407/15421746573/content-moderation-case-study-nasa-footage-taken-down-youtube-moderation-2012.shtml
- ESA copyright notice: https://www.esa.int/ESA_Multimedia/Copyright_Notice_Images
- NOAA image licensing: https://www.omao.noaa.gov/image-licensing-usage-info
- NPS b-roll terms: https://www.nps.gov/deva/learn/photosmultimedia/b-roll-footage.htm
- DVIDS API terms: https://api.dvidshub.net/docs/tos
- National Archives catalog API: https://www.archives.gov/research/catalog/help/api
- Prelinger Archives help: https://help.archive.org/help/prelinger-archive/
- Pixabay licence: https://pixabay.com/service/license-summary/
- Videvo licence types: https://help.videvo.net/article/27-license-types-and-usage
- YouTube, Content ID disputes: https://support.google.com/youtube/answer/2797454
- YouTube monetisation policies: https://support.google.com/youtube/answer/1311392
