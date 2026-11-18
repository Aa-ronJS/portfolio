#!/usr/bin/env python3
"""Generate strict BPMN 2.0 XML (with DI layout) for the Olympic Dam
underground radio process set. One .bpmn file per page; render.js turns
them into a PDF with the bpmn.io renderer.

Layout model: each node sits in (lane, col, row). Happy path runs left to
right along row 0 of each lane; exceptions drop to lower rows of the same
lane and rejoin through merge gateways.
"""
import html, json, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
COLW, ROWH = 215, 135
TW, TH = 165, 96          # task size
EW, GW = 36, 50           # event, gateway size
X0, POOL_HDR, LANE_HDR = 40, 30, 30
XSTART = X0 + POOL_HDR + LANE_HDR + 30

KIND = {
    "start": ("startEvent", None), "startMsg": ("startEvent", "message"),
    "end": ("endEvent", None), "endMsg": ("endEvent", "message"),
    "task": ("task", None), "user": ("userTask", None), "manual": ("manualTask", None),
    "service": ("serviceTask", None), "call": ("callActivity", None),
    "xor": ("exclusiveGateway", None), "or": ("inclusiveGateway", None),
}

def esc(s): return html.escape(s, quote=True)

def size(t):
    k = KIND[t][0]
    if k.endswith("Event"): return EW, EW
    if k.endswith("Gateway"): return GW, GW
    return TW, TH

def build(page):
    lanes = page["lanes"]                       # [(id, name)]
    nodes = {}
    for n in page["nodes"]:
        nid, t, lane, col, row, label = n[:6]
        opts = n[6] if len(n) > 6 else {}
        nodes[nid] = dict(id=nid, t=t, lane=lane, col=col, row=row, label=label, opts=opts)
    # clash check
    seen = {}
    for n in nodes.values():
        k = (n["lane"], n["col"], n["row"])
        if k in seen: sys.exit(f"{page['id']}: {n['id']} clashes with {seen[k]} at {k}")
        seen[k] = n["id"]
    for a in page.get("annotations", []):
        k = (a[2], a[3], a[4])
        if k in seen: sys.exit(f"{page['id']}: annotation {a[0]} clashes with {seen[k]}")
        seen[k] = a[0]
    rows = {l: 1 for l, _ in lanes}
    for n in nodes.values(): rows[n["lane"]] = max(rows[n["lane"]], n["row"] + 1)
    for a in page.get("annotations", []): rows[a[2]] = max(rows[a[2]], a[4] + 1)
    ncols = max([n["col"] for n in nodes.values()] + [a[3] for a in page.get("annotations", [])]) + 1

    top_bb = page.get("blackbox_top", [])
    bot_bb = page.get("blackbox_bottom", [])
    y = 40 + len(top_bb) * 110
    pool_y = y
    laney = {}
    for l, _ in lanes:
        laney[l] = y; y += rows[l] * ROWH
    pool_h = y - pool_y
    pool_w = (XSTART - X0) + ncols * COLW + 20

    for n in nodes.values():
        w, h = size(n["t"])
        cx = XSTART + n["col"] * COLW + TW / 2
        cy = laney[n["lane"]] + n["row"] * ROWH + ROWH / 2
        n.update(w=w, h=h, cx=cx, cy=cy, x=cx - w / 2, y=cy - h / 2)

    def is_gw(n): return KIND[n["t"]][0].endswith("Gateway")

    def route(s, t, opt):
        sx, sy, tx, ty = s["cx"], s["cy"], t["cx"], t["cy"]
        sr, tl = s["x"] + s["w"], t["x"]
        mode = opt.get("route")
        if abs(sy - ty) < 1 and tx > sx:
            return [(sr, sy), (tl, ty)]
        if abs(sx - tx) < 1:
            if ty > sy: return [(sx, s["y"] + s["h"]), (tx, t["y"])]
            return [(sx, s["y"]), (tx, t["y"] + t["h"])]
        if tx < sx:  # backward loop, along the bottom of the source row
            yb = laney[s["lane"]] + (s["row"] + 1) * ROWH - 8
            return [(sx, s["y"] + s["h"]), (sx, yb), (tx, yb), (tx, t["y"] + t["h"])]
        down = ty > sy
        if mode is None:
            if is_gw(s): mode = "vh"
            elif is_gw(t): mode = "hv"
            else: mode = "hvh"
        if mode == "vh":
            p0 = (sx, s["y"] + s["h"]) if down else (sx, s["y"])
            return [p0, (sx, ty), (tl, ty)]
        if mode == "hv":
            pe = (tx, t["y"]) if down else (tx, t["y"] + t["h"])
            return [(sr, sy), (tx, sy), pe]
        # hvh: short horizontal, vertical in the gap, horizontal into target
        xm = sr + opt.get("gap", 22)
        return [(sr, sy), (xm, sy), (xm, ty), (tl, ty)]

    flows = []
    for i, f in enumerate(page["flows"]):
        s, t = f[0], f[1]
        label = f[2] if len(f) > 2 else ""
        opt = f[3] if len(f) > 3 else {}
        if s not in nodes or t not in nodes: sys.exit(f"{page['id']}: bad flow {s}->{t}")
        wp = route(nodes[s], nodes[t], opt)
        flows.append(dict(id=f"{page['id']}_f{i}", s=s, t=t, label=label, wp=wp, labend=opt.get("lab") == "end"))

    # crude collision report: segments crossing unrelated nodes
    for f in flows:
        for (x1, y1), (x2, y2) in zip(f["wp"], f["wp"][1:]):
            for n in nodes.values():
                if n["id"] in (f["s"], f["t"]): continue
                bx1, by1, bx2, by2 = n["x"] - 2, n["y"] - 2, n["x"] + n["w"] + 2, n["y"] + n["h"] + 2
                if x1 == x2 and bx1 < x1 < bx2 and min(y1, y2) < by2 and max(y1, y2) > by1:
                    print(f"  ! {page['id']}: {f['s']}->{f['t']} crosses {n['id']}")
                if y1 == y2 and by1 < y1 < by2 and min(x1, x2) < bx2 and max(x1, x2) > bx1:
                    print(f"  ! {page['id']}: {f['s']}->{f['t']} crosses {n['id']}")

    pid, cid = page["id"] + "_process", page["id"] + "_collab"
    inc = {k: [] for k in nodes}; out = {k: [] for k in nodes}
    for f in flows: out[f["s"]].append(f["id"]); inc[f["t"]].append(f["id"])

    X = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
         'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
         'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
         'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
         f'id="{page["id"]}_defs" targetNamespace="http://example.com/od-radio">']
    X.append(f'<bpmn:collaboration id="{cid}">')
    X.append(f'<bpmn:participant id="{page["id"]}_pool" name="{esc(page["pool"])}" processRef="{pid}"/>')
    for bid, bname in top_bb + bot_bb:
        X.append(f'<bpmn:participant id="{bid}" name="{esc(bname)}"/>')
    msgs = page.get("messages", [])
    for i, (s, t, lab) in enumerate(msgs):
        X.append(f'<bpmn:messageFlow id="{page["id"]}_m{i}" name="{esc(lab)}" sourceRef="{s}" targetRef="{t}"/>')
    X.append('</bpmn:collaboration>')
    X.append(f'<bpmn:process id="{pid}" name="{esc(page["title"])}" isExecutable="false">')
    X.append(f'<bpmn:laneSet id="{page["id"]}_ls">')
    for l, name in lanes:
        X.append(f'<bpmn:lane id="{page["id"]}_{l}" name="{esc(name)}">')
        for n in nodes.values():
            if n["lane"] == l: X.append(f'<bpmn:flowNodeRef>{n["id"]}</bpmn:flowNodeRef>')
        X.append('</bpmn:lane>')
    X.append('</bpmn:laneSet>')
    for n in nodes.values():
        tag, ev = KIND[n["t"]]
        extra = f' calledElement="{n["opts"]["calls"]}"' if n["t"] == "call" else ""
        X.append(f'<bpmn:{tag} id="{n["id"]}" name="{esc(n["label"])}"{extra}>')
        for f in inc[n["id"]]: X.append(f'<bpmn:incoming>{f}</bpmn:incoming>')
        for f in out[n["id"]]: X.append(f'<bpmn:outgoing>{f}</bpmn:outgoing>')
        if ev == "message": X.append(f'<bpmn:messageEventDefinition id="{n["id"]}_med"/>')
        X.append(f'</bpmn:{tag}>')
    for f in flows:
        X.append(f'<bpmn:sequenceFlow id="{f["id"]}" name="{esc(f["label"])}" sourceRef="{f["s"]}" targetRef="{f["t"]}"/>')
    for a in page.get("annotations", []):
        X.append(f'<bpmn:textAnnotation id="{a[0]}"><bpmn:text>{esc(a[1])}</bpmn:text></bpmn:textAnnotation>')
        if len(a) > 5 and a[5]:
            X.append(f'<bpmn:association id="{a[0]}_as" sourceRef="{a[5]}" targetRef="{a[0]}"/>')
    X.append('</bpmn:process>')

    # ---- DI ----
    X.append(f'<bpmndi:BPMNDiagram id="{page["id"]}_dia"><bpmndi:BPMNPlane id="{page["id"]}_plane" bpmnElement="{cid}">')
    def shape(el, x, y, w, h, extra=""):
        X.append(f'<bpmndi:BPMNShape id="{el}_di" bpmnElement="{el}"{extra}><dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}"/>')
    def lbl(x, y, w, h):
        X.append(f'<bpmndi:BPMNLabel><dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}"/></bpmndi:BPMNLabel>')
    shape(f'{page["id"]}_pool', X0, pool_y, pool_w, pool_h, ' isHorizontal="true"'); X.append('</bpmndi:BPMNShape>')
    for l, _ in lanes:
        shape(f'{page["id"]}_{l}', X0 + POOL_HDR, laney[l], pool_w - POOL_HDR, rows[l] * ROWH, ' isHorizontal="true"'); X.append('</bpmndi:BPMNShape>')
    bbpos = {}
    for i, (bid, _) in enumerate(top_bb):
        bbpos[bid] = (40 + i * 110, 70); shape(bid, X0, 40 + i * 110, pool_w, 70, ' isHorizontal="true"'); X.append('</bpmndi:BPMNShape>')
    for i, (bid, _) in enumerate(bot_bb):
        yy = pool_y + pool_h + 40 + i * 110
        bbpos[bid] = (yy, 70); shape(bid, X0, yy, pool_w, 70, ' isHorizontal="true"'); X.append('</bpmndi:BPMNShape>')
    for n in nodes.values():
        k = KIND[n["t"]][0]
        extra = ' isMarkerVisible="true"' if k == "exclusiveGateway" else ""
        if k == "callActivity": extra = ' isExpanded="false"'
        shape(n["id"], n["x"], n["y"], n["w"], n["h"], extra)
        if k.endswith("Gateway"):
            lbl(n["cx"] - 150, n["cy"] - 62, 122, 40)
        elif k.endswith("Event"):
            lbl(n["cx"] - 65, n["cy"] + 22, 130, 40)
        X.append('</bpmndi:BPMNShape>')
    for a in page.get("annotations", []):
        ax = XSTART + a[3] * COLW - 10
        ay = laney[a[2]] + a[4] * ROWH + 12
        shape(a[0], ax, ay, COLW * a[6] - 20 if len(a) > 6 else COLW - 20, 70); X.append('</bpmndi:BPMNShape>')
    for f in flows:
        X.append(f'<bpmndi:BPMNEdge id="{f["id"]}_di" bpmnElement="{f["id"]}">')
        for x, y in f["wp"]: X.append(f'<di:waypoint x="{x:.0f}" y="{y:.0f}"/>')
        if f["label"]:
            (x1, y1), (x2, y2) = (f["wp"][-2], f["wp"][-1]) if f["labend"] else (f["wp"][0], f["wp"][1])
            w = max(30, len(f["label"]) * 6.6)
            if x1 == x2: lbl(x1 + 6, y1 + (4 if y2 > y1 else -20), w, 14)
            else: lbl(x1 + 6, y1 - 18, w, 14)
        X.append('</bpmndi:BPMNEdge>')
    for i, (s, t, lab) in enumerate(msgs):
        sn = nodes[s]; byy, bh = bbpos[t]
        if byy < sn["y"]: wp = [(sn["cx"], sn["y"]), (sn["cx"], byy + bh)]
        else: wp = [(sn["cx"], sn["y"] + sn["h"]), (sn["cx"], byy)]
        X.append(f'<bpmndi:BPMNEdge id="{page["id"]}_m{i}_di" bpmnElement="{page["id"]}_m{i}">')
        for x, y in wp: X.append(f'<di:waypoint x="{x:.0f}" y="{y:.0f}"/>')
        lbl(wp[0][0] + 8, (wp[0][1] + wp[1][1]) / 2 - 7, len(lab) * 6.6, 14)
        X.append('</bpmndi:BPMNEdge>')
    for a in page.get("annotations", []):
        if len(a) > 5 and a[5]:
            n = nodes[a[5]]
            ax = XSTART + a[3] * COLW - 10; ay = laney[a[2]] + a[4] * ROWH + 12
            X.append(f'<bpmndi:BPMNEdge id="{a[0]}_as_di" bpmnElement="{a[0]}_as">'
                     f'<di:waypoint x="{n["cx"]:.0f}" y="{n["y"] + n["h"]:.0f}"/>'
                     f'<di:waypoint x="{ax + 10:.0f}" y="{ay:.0f}"/></bpmndi:BPMNEdge>')
    X.append('</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>')
    return "\n".join(X)

from pages import PAGES  # noqa: E402

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    index = []
    for p in PAGES:
        xml = build(p)
        fn = f'{p["num"]:02d}-{p["id"]}.bpmn'
        open(os.path.join(OUT, fn), "w").write(xml)
        index.append(dict(file=fn, num=p["num"], title=p["title"], blurb=p.get("blurb", "")))
        print("wrote", fn)
    json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=1)
