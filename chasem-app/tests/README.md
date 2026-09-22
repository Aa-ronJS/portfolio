# Tests

No framework. Each suite is a plain Node script that serves the app over HTTP, drives a real
Chromium at iPhone 13 size, and prints a `PASS` or `FAIL` line per case. `npm test` from
`chasem-app` runs the lot and exits non-zero if any suite does.

    npm install          # playwright-core and pdfjs-dist
    npm test             # everything
    npm test -- smoke/send/unit apptest/flow    # just these

Chromium comes from `QC_CHROME` if that is set, otherwise the sandbox's own copy at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## What is where

- `apptest/` — the app end to end: a job from first tap to quote, invoice and chase; the
  scheduler; the measuring flow against rendered walls; the landing page; the self-serve
  sign-up, credits and set-up links.
- `smoke/data/` — pricing, costing, import and export, the PDFs (read back with pdf.js), and
  hostile strings in every field on every screen.
- `smoke/measure/` — measuring on its own: the page detector against awkward photos, the
  A4 scale, RoomPlan LiDAR files, the AR button, the measurements file the pack writes.
- `smoke/send/` — sending: the relay payloads, Stripe, the calendar files, and what the phone
  does when a send or a cancel fails.
- `smoke/shell/` — routing, reloads, two tabs at once, the service worker and offline.

## Photos

The wall photos are rendered, not taken, so the true size of everything is known to the
millimetre and the numbers the app produces can be checked against it. They are not in the
repository (about 40 MB of JPEG); the scripts that draw them are. Needs Python with opencv
and numpy:

    python3 mtest/scene.py           # photo.jpg: a wall with an A4 sheet on it
    python3 mtest/scene2.py          # photo2.jpg: a pinhole render with EXIF
    python3 mtest/scene3.py          # the a4_* walls
    python3 mtest/scene3.py bias     # the fb_* walls, for the focal-length check
    python3 smoke/measure/scene4.py  # the awkward ones: dark, grainy, cut off, 12 MP
    python3 smoke/measure/fixtures.py

`mtest/sheet.png` is the printed measuring sheet itself and is in the repository, because it
is a source, not a render.

## Known findings

`smoke/measure/inputs` is a report as much as a check. Eight cases in it still fail and are
listed in `KNOWN` at the top of that file: three where something bright and rectangular in the
photo (a door panel, a picture frame) is taken for the A4 sheet, which then scales the wall
from the wrong thing, and five where the wall outline on a grainy or vignetted photo is not
good enough to use and the painter has to drag the corners himself. The run fails on anything
else, and says so when one of the eight starts passing so the line can be deleted.
