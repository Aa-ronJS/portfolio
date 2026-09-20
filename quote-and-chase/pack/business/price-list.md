# Price list

Change every number here to your own rates. Claude uses ONLY this list
when quoting. All prices are ex GST, labour and materials included
unless a line says otherwise. AUD.

## Interior

| Item | Unit | Rate | Notes |
|---|---|---|---|
| Walls, 2 coats, light prep | m2 | 22 | standard low-sheen acrylic |
| Ceilings, 2 coats | m2 | 25 | flat ceiling white |
| Skirting boards and architraves, 2 coats | lineal m | 9 | gloss or semi-gloss enamel |
| Door, both sides incl. frame | each | 95 | flush door; add 30 for panelled |
| Door, one side only incl. frame | each | 55 | e.g. hallway side of bedroom doors |
| Window frame, interior | each | 65 | standard size |
| Wardrobe doors, per pair | each | 120 | |
| Feature wall, colour change | m2 | 28 | extra coat allowed |
| Wallpaper removal | m2 | 16 | plus wall prep below if needed |
| Moderate prep (patching, sanding, filling) | hour | 65 | |
| Heavy prep (water damage, peeling, plaster repair) | hour | 80 | |
| Stain block or sealer coat | m2 | 8 | over patched or stained areas |

## Exterior

| Item | Unit | Rate | Notes |
|---|---|---|---|
| Weatherboards, 2 coats | m2 | 38 | includes wash down and light sand |
| Render or brick, 2 coats | m2 | 30 | |
| Eaves and fascia | lineal m | 16 | |
| Gutters and downpipes | lineal m | 12 | |
| Exterior door, both sides | each | 140 | |
| Exterior window, frame and sill | each | 95 | |
| Deck oil, 2 coats | m2 | 24 | includes clean |
| Fence, one side, 2 coats | m2 | 18 | |
| Pressure wash before painting | m2 | 4 | |
| Scaffold or high-access allowance | per day | 350 | two storey and above |

## Job rules

- Minimum job charge: 450
- Travel: included within service area; 1.50 per km beyond it
- Paint is included at the rates above (mid-range trade paint). Premium
  paint requested by the client: add 15% to the affected lines.
- GST: add 10% to the total.
- Deposit: 20% on acceptance.

## Measuring rules Claude uses when the notes do not say

- Real measurements first: `measurements.json` from the measure sheet
  or a LiDAR scan beats everything below. Notes beat photo estimates.
- Scale from a photo: a standard internal door is 2040 mm high and
  820 mm wide; a brick course is 76 mm plus a 10 mm joint; a light
  switch sits about 1200 to 1350 mm off the floor. Use one of these
  if visible and say which.
- Ceiling height: assume 2.4 m unless the photo clearly shows higher.
- Wall area of a room = perimeter x height, minus 1.7 m2 per door and
  1.5 m2 per standard window.
- If only a floor size is known, assume the room is roughly square.
- Skirting length = perimeter minus door widths (0.9 m each).
- Condition, from the notes first and the photos second:
  "good" = clean walls, or the notes say nothing about prep. Light
  prep is included in the rate.
  "fair" = scuffs, marks, small dents, a few holes to fill, or the
  notes say "some prep", "decent prep", "patching". Add 1 hour
  moderate prep per 20 m2.
  "poor" = peeling, flaking, water damage, cracks, large holes,
  previous wallpaper, or the notes say "heavy", "major", "rough",
  "bad". Add 1 hour heavy prep per 10 m2 plus a sealer coat.
  If the notes fit "fair" do not upgrade to "poor" on a hunch; say
  so in the assumptions instead.
- If a photo is too dark or partial to judge, say so and quote the
  room at "good" with the assumption written down.
