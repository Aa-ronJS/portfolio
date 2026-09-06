# Image pack: prompts for the house pipeline

No image-generation key exists in the build environment, so these are ready to
run through your own pipeline (`design-repo/tools/banana.py` on your key, or
`tools/nano_banana.py` in this folder with `GEMINI_API_KEY` set). One grade
across the whole set so the site reads as one photographer's work, matching
the light-first services palette rather than the portfolio's storm grade.

**House grade, appended to every prompt:**
> warm bone-white daylight interior, deep ink blue-black shadows, molten
> amber accent light, cinematic natural light, fine film grain, no text, no
> people's faces, photographic

**Format:** 3:2 landscape, target 1600px wide. Save to
`public/img/<name>.jpg`, then wire each into its page as a framed figure
(the portfolio's `.shot` pattern is already in `css/site.css` territory;
copy the `shot` styles from `/linehaul`'s page if wanted). Compress to
under ~200KB each before committing.

| File | Page | Subject prompt (before the grade line) |
|---|---|---|
| `hero-desk.jpg` | home | An Australian tradesman's paper quote book and a phone showing a tidy job list, side by side on a workshop bench |
| `ai-hands.jpg` | ai-development | A robotic drafting arm sketching plans while a human hand rests on the page holding a red checking pen |
| `wordpress-tools.jpg` | wordpress | A wall of well-organised hand tools in silhouette, one amber-lit spanner out of place |
| `rebuild-scaffold.jpg` | website-rebuild | Heritage shopfront mid-restoration behind neat scaffolding, signage carefully preserved under clear wrap |
| `ecommerce-dock.jpg` | ecommerce | Small parcels moving along a home-business packing bench, label printer glowing, evening light |
| `apps-field.jpg` | mobile-apps | A phone in a work-gloved hand on a dusty regional worksite, screen lit, no bars of reception on the horizon |
| `crm-cables.jpg` | crm-automation | Dozens of tangled office cables entering one side of a patch panel and leaving the other side in perfect order |
| `data-ledger.jpg` | data-and-reporting | An old paper ledger and a glowing spreadsheet on screen, reconciled line by line, one amber tick |
| `rescue-keys.jpg` | project-rescue | A ring of many old keys handed across a desk into an open palm, one tagged in amber |
| `ba-table.jpg` | business-analysis | An empty boardroom after a long workshop: butcher's paper, arrows, one circled decision |
| `answers-shelf.jpg` | answers hub | A wall of small labelled drawers like a hardware store's fastener cabinet, one drawer open and amber-lit |
| `industries-map.jpg` | industries hub | A weathered map of Australia on a workshop wall, hand-placed amber pins clustered around the south and west |

Rules carried over from the portfolio's imagery discipline: every image gets
opened and looked at before use, nothing depicts a real client's product,
nothing stands in for something that must be true, and every `alt` text
describes what is actually in the frame.
