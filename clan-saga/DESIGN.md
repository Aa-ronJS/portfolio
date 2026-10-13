---
name: Clan Saga
colors:
  ground: "oklch(0.17 0.014 55)"
  surface-1: "oklch(0.205 0.016 55)"
  surface-2: "oklch(0.245 0.018 55)"
  surface-3: "oklch(0.29 0.02 55)"
  rule: "oklch(0.93 0.02 75 / 0.09)"
  rule-strong: "oklch(0.93 0.02 75 / 0.18)"
  text-hi: "oklch(0.93 0.018 78)"
  text-lo: "oklch(0.76 0.022 72)"
  text-faint: "oklch(0.62 0.022 68)"
  ochre: "oklch(0.68 0.13 48)"
  ochre-text: "oklch(0.78 0.11 55)"
  ochre-hover: "oklch(0.63 0.13 48)"
  on-ochre: "oklch(0.18 0.02 50)"
  paper: "oklch(0.95 0.014 82)"
  ink: "oklch(0.25 0.016 55)"
  ink-lo: "oklch(0.42 0.02 55)"
  paper-hover: "oklch(0.9 0.016 80)"
  paper-ochre: "oklch(0.55 0.13 45)"
  paper-ochre-hover: "oklch(0.5 0.13 45)"
  paper-on-ochre: "oklch(0.98 0.01 80)"
  on-scene: "oklch(0.97 0.01 80)"
  scrim: "oklch(0.12 0.012 55 / 0.82)"
  works: "oklch(0.76 0.13 145)"
  partial: "oklch(0.8 0.13 85)"
  fails: "oklch(0.72 0.14 28)"
typography:
  display: { fontFamily: "Newsreader", fontWeight: 560, opticalSize: 72, lineHeight: 1.04, letterSpacing: "-0.02em" }
  saga: { fontFamily: "Newsreader", fontWeight: 400, opticalSize: "auto", lineHeight: 1.6 }
  body: { fontFamily: "Satoshi", fontWeight: 450, lineHeight: 1.55 }
  label: { fontFamily: "Satoshi", fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.04em" }
rounded:
  pole: "2px"
spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96]
components:
  choice-row: { background: "transparent", hover: "surface-2", selected: "surface-3 plus ochre numeral", height: "56px" }
  primary-button: { background: "ochre", color: "on-ochre", radius: "2px", height: "48px" }
  stamp: { border: "2px solid outcome colour", font: "display", rotate: "-3deg" }
---

# Clan Saga design

## Overview

Pre-flight, answered before markup:

1. **Audience and device.** Aaron, at his Windows desktop in Edge, mouse and keyboard, an evening session of an hour or two. A King of Dragon Pass player (it is installed). Holds at narrow widths but the desktop is the design.
2. **Register.** Editorial-warm. This is a story told by the fire, not a dashboard.
3. **Reference, one move.** King of Dragon Pass (A Sharp, 1999; a game rather than a site, chosen on purpose because the genre is the brief). The move: a large scene above, plain prose below it, and the choices as a numbered text list you can answer with the number keys. No icon buttons for decisions.
4. **Accent.** Red ochre, `--brand-h: 48`, `--brand-c: 0.13`. Ochre is the oldest paint people ever used: hand stencils on cave walls. It marks the primary action, the selected choice and the chapter progress, and nothing else. Primary action uses the accent (2.10, brand), because the dark ground makes a white fill read as chrome.
5. **Type.** Newsreader (display at opsz 72 for chapter titles; text optical size for the saga itself) over Satoshi for the interface. Both self-hosted. Saga in a book serif because it is the told story; everything you operate is in the sans. (Fraunces was the first pick and was swapped out on 13 Oct 2026 because the Impeccable detector flags it as over-used.)
6. **Signature detail.** The tally bone: the top strip is a notched bone, one notch per season lived, a deeper notch at each chapter, the way the Lebombo and Ishango bones were notched. A stranger could screenshot it and know the game.
7. **Dark, and why.** The game is set by the fire at night and the scene paintings need a dark frame. Costed: elevation comes from lighter surfaces, the accent is held at chroma 0.13, and the saga book opens as a light paper sheet, which is the one deliberate light surface.
8. **Visual moment.** The living diorama: an SVG scene drawn in code for each chapter, in which every member of your clan appears as a figure (children smaller), with the season's light, and fire once the clan has it. Degraded tier: it is static SVG already, with no motion except a fade between seasons, removed under reduced motion. (Generated paintings were planned; the image service was over quota on 13 Oct 2026, so the scenes are hand-built SVG instead, which also lets them show the actual clan.)

## Colors

Warm umber neutrals tinted towards the ochre hue at chroma 0.014-0.02. Text-hi on ground is roughly APCA Lc 90; text-lo roughly Lc 70, used only for secondary lines at body size or above. Outcome colours (works, partial, fails) share L and C and vary only H, and always carry a word.

## Typography

Fluid steps via clamp(): step 0 body, step 1 lead, step 4 chapter titles. Display tracking negative only at the chapter title size. Saga prose at 65ch, line height 1.6.

## Layout

Two columns on desktop: the story column (scene, situation, choices, idea) at roughly 2:1 against the clan column (food, warmth, knowledge, places, people). One column below 64rem, story first. Hairline division policy throughout: one container, 1px rules, no cards in cards.

## Elevation & Depth

Surfaces step lighter with elevation. Shadows only on the two overlays (saga book, chapter interstitial), from `--shadow-high`.

## Shapes

Sharp pole: 2px on everything that has a corner.

## Components

Choice rows, the idea box with its person selector and microphone, the primary End the season button, the outcome stamp (works, half works, fails), the tally bone, the saga book.

## Do's and Don'ts

- Do keep every number in words a player understands ("food for about 3 seasons").
- Do say what the next season holds before the player chooses.
- Don't add a second accent, icon tiles, emoji, glows or blur.
- Don't hide anything behind hover.
