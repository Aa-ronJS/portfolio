#!/usr/bin/env python3
"""Turn an Apple RoomPlan export (JSON from a LiDAR iPhone/iPad scan) into the
measurements.json the quote reads.

    python3 tools/roomplan_to_measurements.py "quotes/incoming/12 Wattle St/Room.json" [--room "Lounge"] [--out measurements.json]

Accepts the JSON that RoomPlan's CapturedRoom encodes (walls, doors, windows,
openings, floors with `dimensions` in metres and a 4x4 `transform`), which is
what RoomScan, openPlan3D, swift-roomplan-jsonexport and the WWDC sample app
write. Also accepts a CapturedStructure export (several rooms). No packages
needed beyond Python itself.
"""
import argparse, json, math, pathlib, datetime

def surfaces(obj, key):
    v = obj.get(key) or []
    return v if isinstance(v, list) else []

def dims(s):
    d = s.get("dimensions") or [0, 0, 0]
    if isinstance(d, dict): d = [d.get("x", 0), d.get("y", 0), d.get("z", 0)]
    return [float(x) for x in d[:3]]

def transform(s):
    t = s.get("transform")
    if isinstance(t, list) and len(t) == 16: return [t[i:i+4] for i in range(0, 16, 4)]  # column-major 4x4 as flat list
    if isinstance(t, list) and len(t) == 4: return t
    return None

def position(s):
    t = transform(s)
    if not t: return None
    # simd_float4x4 encodes columns; translation is the 4th column = elements 12,13,14 in flat form
    try: return (float(t[3][0]), float(t[3][1]), float(t[3][2]))
    except Exception: return None

def wall_id(s): return s.get("identifier") or s.get("id")

def convert_room(room, name):
    walls = surfaces(room, "walls"); doors = surfaces(room, "doors"); windows = surfaces(room, "windows"); openings = surfaces(room, "openings")
    out_walls = []
    for w in walls:
        wd = dims(w); width_m, height_m = wd[0], wd[1]
        if width_m <= 0 or height_m <= 0: continue
        wid = wall_id(w); wpos = position(w)
        opens = []
        for kind, lst in (("door", doors), ("window", windows), ("opening", openings)):
            for o in lst:
                od = dims(o)
                parent = o.get("parentIdentifier")
                belongs = (parent is not None and parent == wid)
                if parent is None and wpos is not None:
                    op = position(o)
                    if op is not None and math.dist(op, wpos) < max(0.6, width_m / 2 + 0.3):
                        belongs = True
                if belongs and od[0] > 0 and od[1] > 0:
                    opens.append({"type": kind, "width_mm": round(od[0]*1000), "height_mm": round(od[1]*1000), "area_m2": round(od[0]*od[1], 3)})
        gross = width_m * height_m; open_area = sum(o["area_m2"] for o in opens)
        out_walls.append({"room": name, "wall": "Wall %d" % (len(out_walls)+1), "width_mm": round(width_m*1000), "height_mm": round(height_m*1000),
                          "gross_area_m2": round(gross, 3), "openings": opens, "paint_area_m2": round(gross - open_area, 3),
                          "method": "roomplan-lidar", "expected_error_pct": 2, "source_id": wid})
    floors = surfaces(room, "floors"); ceiling = None
    for f in floors:
        fd = dims(f)
        if fd[0] > 0 and fd[2] > 0: ceiling = round(fd[0]*fd[2], 3); break
    if ceiling is None and len(out_walls) >= 2:
        ws = sorted((w["width_mm"] for w in out_walls), reverse=True); ceiling = round(ws[0]*ws[1]/1e6, 3)
    return {"name": name, "walls": out_walls, "ceiling_area_m2_estimate": ceiling,
            "ceiling_note": "from the LiDAR floor surface" if floors else "longest two wall widths multiplied; check if not rectangular"}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("json"); ap.add_argument("--room", default=None); ap.add_argument("--out", default=None)
    a = ap.parse_args(); src = pathlib.Path(a.json); data = json.loads(src.read_text())
    rooms = []
    if isinstance(data, dict) and "rooms" in data and isinstance(data["rooms"], list) and data["rooms"] and "walls" in data["rooms"][0]:
        for i, r in enumerate(data["rooms"]): rooms.append(convert_room(r, a.room or ("Room %d" % (i+1))))
    else:
        rooms.append(convert_room(data, a.room or src.stem))
    out = {"version": 1, "unit": "mm", "made_with": "Apple RoomPlan export via roomplan_to_measurements.py",
           "exported_at": datetime.datetime.now().isoformat(timespec="seconds"), "rooms": rooms}
    dest = pathlib.Path(a.out) if a.out else src.with_name("measurements.json")
    dest.write_text(json.dumps(out, indent=2))
    nwalls = sum(len(r["walls"]) for r in rooms); nopen = sum(len(w["openings"]) for r in rooms for w in r["walls"])
    print("wrote %s: %d room(s), %d wall(s), %d opening(s)" % (dest, len(rooms), nwalls, nopen))

if __name__ == "__main__":
    main()
