#!/usr/bin/env python3
"""Cutout rigging: a skeleton over one drawing, stock clips, stock faces.

A character stays what it always was — one full-body drawing — but a
`rig.json` in its folder puts a simple skeleton over it. The drawing is
cut into parts (one per bone, each pixel going to its nearest bone, with
overlap at the joints so nothing tears), and the parts swing around their
pivots. Nobody draws walk frames: reusable keyframed clips (walk, wave,
nod...) live in `pipeline/clips/` and play on any character whose bones
share the canonical names. Missing bones are skipped — a bird with no
arms still walks.

Faces work the same way: declare where the eyes and mouth are (in
char.json) and stock blinks / mouth flaps are drawn ONTO the artwork in
its own colours — lid colour sampled from around the eye, ink for the
lid line — so `blink.png` and `talk.png` become optional everywhere.

Everything renders at the episode's frame rate with stepped (held) keys:
a walk is four drawings a cycle, not a smooth interpolation. That is the
house look, not a limitation.

CLI:
    python3 pipeline/rig.py sheet   characters/tim out.png   # rig overlaid
    python3 pipeline/rig.py preview characters/tim out.gif --clip walk
    python3 pipeline/rig.py pose    characters/tim out.png --clip wave --t 0.3

rig.json:
    {
      "joint_radius": 0.02,          # joint overlap, fraction of image height
      "bones": [
        {"name": "torso", "head": [0.44, 0.62], "tail": [0.44, 0.45]},
        {"name": "head",  "head": [0.44, 0.45], "tail": [0.44, 0.20],
         "parent": "torso"},
        ...                          # parent defaults to "root"
      ],
      "order": ["arm_r", "leg_r", "leg_l", "torso", "arm_l", "head"]
    }

Canonical bone names (clips address these; use what the drawing has):
    root (implicit) torso head
    arm_l arm_r            one-piece limbs, or
    arm_l_upper arm_l_lower ...  two-piece; a clip keyed on arm_l_upper
    leg_l leg_r / leg_*_upper leg_*_lower   falls back to plain arm_l

char.json face block (rigged or flat characters alike):
    "face": {"eyes": [{"at": [0.40, 0.27], "r": 0.012}, ...],
             "mouth": {"at": [0.44, 0.38], "w": 0.05},
             "bone": "head"}        # bone only matters when rigged
"""

import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# clip channels for a two-piece bone fall back to the one-piece bone
_SEGMENT_FALLBACK = {"_upper": "", "_lower": None}   # lower: just skipped


# ---------------------------------------------------------------- clips

class Clip:
    """A loopable set of keyframed channels, character-independent.

    {"period": 0.6, "loop": true, "interp": "step",
     "channels": {"leg_l_upper": {"rot": [[0.0, 22], [0.5, -18]]},
                  "root": {"dy": [[0.0, 0], [0.25, -0.02]], "dx": ...}}}

    Key times are phases (0..1 of the period). rot is degrees, clockwise
    positive (matching the renderer's `rotate:`). dx/dy are fractions of
    the character's standing height. interp "step" holds each key — the
    crude look — and is the default; "linear" eases for the rare clip
    that needs it (nothing in the stock library does).
    """

    def __init__(self, data, name="clip"):
        self.name = data.get("name", name)
        self.period = float(data.get("period", 1.0))
        self.loop = data.get("loop", True)
        self.interp = data.get("interp", "step")
        self.channels = data.get("channels", {})

    @staticmethod
    def load(path):
        with open(path) as f:
            return Clip(json.load(f), os.path.splitext(os.path.basename(path))[0])

    def _key(self, keys, phase):
        numeric = all(isinstance(k[1], (int, float)) for k in keys)
        if self.interp == "linear" and numeric:
            ks = keys + [[keys[0][0] + 1.0, keys[0][1]]] if self.loop else keys
            for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
                if t0 <= phase <= t1:
                    u = 0.0 if t1 <= t0 else (phase - t0) / (t1 - t0)
                    return v0 + (v1 - v0) * u
            return keys[-1][1]
        # step: hold the latest key at or before phase (wrapping)
        v = keys[-1][1]
        for t0, v0 in keys:
            if t0 <= phase:
                v = v0
        return v

    def sample(self, t):
        """{bone: {"rot"/"dx"/"dy": value}} at time t seconds into the clip."""
        if self.loop:
            phase = (t / self.period) % 1.0
        else:
            phase = max(0.0, min(1.0, t / self.period))
        out = {}
        for bone, chans in self.channels.items():
            out[bone] = {k: self._key(keys, phase)
                         for k, keys in chans.items()}
        return out


def find_clip(name, roots):
    """Resolve a clip name: show/character overrides beat the stock library."""
    stock = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clips")
    for root in list(roots) + [stock]:
        p = os.path.join(root, name + ".json")
        if os.path.exists(p):
            return Clip.load(p)
    raise SystemExit(f"no clip '{name}' (looked in {', '.join(roots)} and "
                     f"the stock library {stock})")


def pose_at(clip_specs, t):
    """Combine active clips into one pose at shot time t.

    clip_specs: [{"clip": Clip, "t": [t0, t1] or None, "amp": 1.0,
                  "period": override or None}]
    Returns {bone: {"rot": deg, "dx": frac, "dy": frac}} — dx/dy in
    fractions of the character's standing height (any bone can shift:
    the head bobs in a nod, the root bobs in a walk). Channels from
    simultaneous clips add, so walk + wave composes. A short ramp at
    each clip's window edges stops mid-swing snaps.
    """
    pose = {}
    for spec in clip_specs:
        clip = spec["clip"]
        t0, t1 = spec.get("t") or (0.0, float("inf"))
        if not t0 <= t <= t1:
            continue
        amp = spec.get("amp", 1.0)
        ramp = 0.15
        if t - t0 < ramp:
            amp *= (t - t0) / ramp
        if t1 != float("inf") and t1 - t < ramp:
            amp *= max(0.0, (t1 - t) / ramp)
        period = spec.get("period")
        local = t - t0
        if period:  # override without editing the clip file
            local = local * clip.period / period
        for bone, chans in clip.sample(local).items():
            slot = pose.setdefault(bone, {})
            for k, v in chans.items():
                if isinstance(v, str):     # part-shape switch: last wins
                    slot[k] = v
                else:
                    slot[k] = slot.get(k, 0.0) + v * amp
    return pose


# ---------------------------------------------------------------- rig

def _seg_dist(px, py, ax, ay, bx, by):
    """Distance from points (px, py arrays) to segment a-b."""
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    if L2 < 1e-9:
        return np.hypot(px - ax, py - ay)
    u = np.clip(((px - ax) * vx + (py - ay) * vy) / L2, 0.0, 1.0)
    return np.hypot(px - (ax + u * vx), py - (ay + u * vy))


class Bone:
    def __init__(self, d, W, H):
        self.name = d["name"]
        self.head = (d["head"][0] * W, d["head"][1] * H)
        self.tail = (d["tail"][0] * W, d["tail"][1] * H) if "tail" in d \
            else self.head
        self.parent = d.get("parent", "root")
        self.reach = d.get("reach", 1.0)   # >1 claims pixels more eagerly


class Rig:
    """Skeleton + auto-cut parts for one character folder."""

    def __init__(self, folder, layers):
        """layers: {"body": Image, "talk": Image|None, ...} pre-aligned."""
        self.folder = folder
        with open(os.path.join(folder, "rig.json")) as f:
            data = json.load(f)
        body = layers["body"]
        self.W, self.H = body.size
        self.joint_r = data.get("joint_radius", 0.02) * self.H
        # face may live here instead of char.json (the rig editor
        # exports one file); char.json wins when both declare it
        self.face = data.get("face")
        # per-shape base rotations, e.g. the kit-computed aim that
        # swings a pocket arm into the pelvis: {"arm_l": {"pocket": -9}}
        self.shape_rot = data.get("shape_rot") or {}
        self.bones = {}
        for bd in data.get("bones", []):
            b = Bone(bd, self.W, self.H)
            self.bones[b.name] = b
        if "root" not in self.bones:
            # implicit root at the hips: mean of leg heads, else torso head
            legs = [b for n, b in self.bones.items() if n.startswith("leg")]
            src = legs or [self.bones.get("torso")
                           or next(iter(self.bones.values()))]
            hx = sum(b.head[0] for b in src) / len(src)
            hy = sum(b.head[1] for b in src) / len(src)
            self.bones["root"] = Bone({"name": "root", "head": [0, 0]}, 1, 1)
            self.bones["root"].head = (hx, hy)
            self.bones["root"].tail = (hx, hy)
            self.bones["root"].parent = None
        else:
            self.bones["root"].parent = None
        self.order = data.get("order") or self._default_order()
        # rest visible height, for clip dx/dy scaling and stable sizing
        a = np.asarray(body.getchannel("A"), dtype=np.uint8)
        ys, xs = np.nonzero(a > 24)
        if len(xs) == 0:
            # a stub body: the kit splitter assembles body.png by
            # posing the parts, so it hands in a transparent canvas
            self.rest_bbox = (0, 0, self.W, self.H)
        else:
            self.rest_bbox = (int(xs.min()), int(ys.min()),
                              int(xs.max()) + 1, int(ys.max()) + 1)
        self.rest_h = self.rest_bbox[3] - self.rest_bbox[1]
        self.pad = int(round(0.3 * self.H))
        # parts: {bone: {shape: {variant: (img, (ox, oy))}}} in source
        # pixel space. A drawn kit (parts/ folder) replaces the auto-cut
        # entirely; otherwise every sheet is cut along the bones.
        kit_dir = os.path.join(folder, "parts")
        if os.path.isdir(kit_dir):
            self.parts = self._load_kit(kit_dir, data.get("parts") or {})
        else:
            self.parts = {b: {"default": v}
                          for b, v in self._cut(layers).items()}
        self._pose_cache = {}

    def _default_order(self):
        """Far limbs first, head last, so joints hide under the torso."""
        rank = {"arm_r": 0, "arm_r_upper": 0, "arm_r_lower": 1,
                "leg_r": 2, "leg_r_upper": 2, "leg_r_lower": 3,
                "leg_l": 4, "leg_l_upper": 4, "leg_l_lower": 5,
                "torso": 6,
                "arm_l": 7, "arm_l_upper": 7, "arm_l_lower": 8,
                "head": 9}
        names = [n for n in self.bones if n != "root"]
        return sorted(names, key=lambda n: rank.get(n, 6))

    def _cut(self, layers):
        """Assign every opaque pixel to its nearest bone, dilate joints.

        Returns {bone: {variant: (cropped RGBA, (ox, oy))}} where ox, oy
        locate the crop in source coordinates. Variant sheets (talk,
        blink, poses) are cut with the same masks — they are pre-aligned
        by contract.
        """
        try:
            from scipy import ndimage
        except ImportError:
            ndimage = None
        body = layers["body"]
        alpha = np.asarray(body.getchannel("A"), dtype=np.uint8) > 24
        ys, xs = np.nonzero(alpha)
        cut_bones = [n for n in self.order if n in self.bones]
        dists = np.empty((len(cut_bones), len(xs)), dtype=np.float32)
        for i, n in enumerate(cut_bones):
            b = self.bones[n]
            dists[i] = _seg_dist(xs.astype(np.float32),
                                 ys.astype(np.float32),
                                 b.head[0], b.head[1],
                                 b.tail[0], b.tail[1]) / b.reach
        owner = np.argmin(dists, axis=0)
        parts = {}
        for i, n in enumerate(cut_bones):
            mask = np.zeros(alpha.shape, dtype=bool)
            mask[ys[owner == i], xs[owner == i]] = True
            if not mask.any():
                continue
            if ndimage is not None and self.joint_r > 0:
                grown = (ndimage.distance_transform_edt(~mask)
                         <= self.joint_r) & alpha
            else:
                grown = mask
            my, mx = np.nonzero(grown)
            x0, x1 = int(mx.min()), int(mx.max()) + 1
            y0, y1 = int(my.min()), int(my.max()) + 1
            m8 = (grown[y0:y1, x0:x1] * 255).astype(np.uint8)
            variants = {}
            for vname, im in layers.items():
                if im is None:
                    continue
                crop = np.array(im.crop((x0, y0, x1, y1)))
                crop[..., 3] = np.minimum(crop[..., 3], m8)
                variants[vname] = (Image.fromarray(crop, "RGBA"), (x0, y0))
            parts[n] = variants
        return parts

    # ------------------------------------------------------ drawn kits

    @staticmethod
    def _find_dots(arr):
        """Locate and erase the two red registration dots in a part.

        Returns ((x, y), (x, y)) sorted top-first, and scrubs the dots
        by filling them from the nearest non-dot pixels (works whether
        a dot sits on the artwork or floats beside it).
        """
        from scipy import ndimage
        r = arr[..., 0].astype(int)
        gb = np.maximum(arr[..., 1], arr[..., 2]).astype(int)
        mask = (arr[..., 3] > 96) & (r > 130) & (r - gb > 55)
        lab, n = ndimage.label(mask)
        if n < 2:
            return None
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        top = np.argsort(sizes)[::-1][:2]
        if sizes[top[1]] < 4:
            return None
        dots = []
        scrub = np.zeros(mask.shape, dtype=bool)
        for i in top:
            ys, xs = np.nonzero(lab == i + 1)
            dots.append((float(xs.mean()), float(ys.mean())))
            scrub[ys, xs] = True
        scrub = ndimage.binary_dilation(scrub, iterations=2)
        _, idx = ndimage.distance_transform_edt(scrub, return_indices=True)
        arr[scrub] = arr[idx[0][scrub], idx[1][scrub]]
        return tuple(sorted(dots, key=lambda p: p[1]))

    def _register(self, img, dots, bone):
        """Scale+rotate a drawn part so its dots land on a bone at rest.

        The dot nearer the top of the part pairs with whichever bone end
        is higher at rest (limbs hang down, heads and torsos stand up —
        drawn the way they sit on the character, this always matches).
        Returns (img, (ox, oy)) in source space, same shape the auto-cut
        produces, so posing needs no special case.
        """
        (hx, hy), (tx, ty) = bone.head, bone.tail
        if hy <= ty:
            d_head, d_tail = dots
        else:
            d_tail, d_head = dots
        bv = (tx - hx, ty - hy)
        dv = (d_tail[0] - d_head[0], d_tail[1] - d_head[1])
        s = math.hypot(*bv) / max(math.hypot(*dv), 1e-6)
        delta = math.degrees(math.atan2(bv[1], bv[0])
                             - math.atan2(dv[1], dv[0]))
        w0, h0 = img.size
        img = img.resize((max(1, round(w0 * s)), max(1, round(h0 * s))),
                         Image.LANCZOS)
        px, py = d_head[0] * s, d_head[1] * s
        if abs(delta) > 0.05:
            sw, sh = img.size
            img = img.rotate(-delta, resample=Image.BICUBIC, expand=True)
            th = math.radians(delta)
            rx, ry = px - sw / 2, py - sh / 2
            px = rx * math.cos(th) - ry * math.sin(th) + img.width / 2
            py = rx * math.sin(th) + ry * math.cos(th) + img.height / 2
        return img, (int(round(hx - px)), int(round(hy - py)))

    def _load_kit(self, kit_dir, pivots):
        """Load parts/<part>.png drawn separately: no cutting, no tearing.

        Naming:  torso.png   head.png (+ head_talk / head_blink /
                 head_<pose>[_talk] variants)
                 arm_<shape>.png  leg_<shape>.png — drawn as the LEFT
                 limb, mirrored automatically for the right; a file
                 named arm_r_<shape>.png overrides the mirror.
        Registration: two red dots per drawing (see _find_dots), or a
        rig.json "parts" entry {"<file>": {"a": [x,y], "b": [x,y]}}
        with coordinates normalised to that part image.
        """
        if any(b.startswith("arm") and b.endswith(("_upper", "_lower"))
               for b in self.bones):
            raise SystemExit(
                "drawn kits support one-piece ARMS only; this rig has "
                "arm _upper/_lower bones")
        # legs MAY be two-piece: leg_l_upper (hip->knee) + leg_l_lower
        # (knee->ankle). The straight leg drawing is registered onto the
        # full hip->ankle span and split at the knee line (with overlap
        # so the joint never tears); other leg shapes are ignored — the
        # knee makes bent/kneel poses out of the one straight drawing.
        self._knee_split = "leg_l_upper" in self.bones
        raw = {}
        for f in sorted(os.listdir(kit_dir)):
            if not f.lower().endswith(".png"):
                continue
            stem = os.path.splitext(f)[0]
            img = Image.open(os.path.join(kit_dir, f)).convert("RGBA")
            arr = np.array(img)
            if stem in pivots:
                p = pivots[stem]
                dots = tuple(sorted(
                    [(p["a"][0] * img.width, p["a"][1] * img.height),
                     (p["b"][0] * img.width, p["b"][1] * img.height)],
                    key=lambda q: q[1]))
            else:
                dots = self._find_dots(arr)
                if dots is None:
                    raise SystemExit(
                        f"{kit_dir}/{f}: can't find the two red "
                        f"registration dots (or add a rig.json "
                        f"\"parts\" entry for it)")
                img = Image.fromarray(arr, "RGBA")
            raw[stem] = (img, dots)

        parts = {}

        def put(bone, shape, variant, img, dots, mirror=False):
            if bone not in self.bones:
                return
            if mirror:
                img = img.transpose(Image.FLIP_LEFT_RIGHT)
                dots = tuple((img.width - 1 - x, y) for x, y in dots)
            reg = self._register(img, dots, self.bones[bone])
            parts.setdefault(bone, {}).setdefault(shape, {})[variant] = reg

        def put_leg(side, shape, img, dots):
            up, lo = f"leg_{side}_upper", f"leg_{side}_lower"
            if up not in self.bones:
                put(f"leg_{side}", shape, "body", img, dots)
                return
            if shape != "straight":
                return  # a real knee replaces the drawn leg shapes
            bu, bl = self.bones[up], self.bones[lo]

            class _Span:  # the whole hip->ankle line, for registration
                head, tail = bu.head, bl.tail
            rimg, (ox, oy) = self._register(img, dots, _Span)
            ov = int(round(0.022 * self.H))
            cut_hi = max(1, min(rimg.height - 1,
                                int(round(bu.tail[1] + ov - oy))))
            cut_lo = max(1, min(rimg.height - 1,
                                int(round(bu.tail[1] - ov - oy))))
            parts.setdefault(up, {}).setdefault("straight", {})["body"] = \
                (rimg.crop((0, 0, rimg.width, cut_hi)), (ox, oy))
            parts.setdefault(lo, {}).setdefault("straight", {})["body"] = \
                (rimg.crop((0, cut_lo, rimg.width, rimg.height)),
                 (ox, oy + cut_lo))

        for stem, (img, dots) in raw.items():
            t = stem.split("_")
            if t[0] == "torso":
                put("torso", "default", "_".join(t[1:]) or "body",
                    img, dots)
            elif t[0] == "head":
                put("head", "default", "_".join(t[1:]) or "body",
                    img, dots)
            elif t[0] in ("arm", "leg"):
                side = t[1] if len(t) > 1 and t[1] in ("l", "r") else None
                shape = "_".join(t[2:] if side else t[1:]) or "straight"
                if side:
                    # explicit-side art, used verbatim
                    if t[0] == "leg":
                        put_leg(side, shape, img, dots)
                    else:
                        put(f"{t[0]}_{side}", shape, "body", img, dots)
                elif t[0] == "leg":
                    put_leg("l", shape, img, dots)
                    if f"leg_r_{shape}" not in raw:
                        put_leg("r", shape, img, dots)
                else:
                    # NOTHING is ever mirrored: a mirrored limb bends
                    # its joints backward and points its shoe against
                    # the walk. A sideless drawing is the left limb,
                    # and stands in AS-IS for a right limb that has no
                    # explicit art; flip_to_walk turns the whole
                    # character for the other travel direction.
                    put(f"{t[0]}_l", shape, "body", img, dots)
                    if f"{t[0]}_r_{shape}" not in raw:
                        put(f"{t[0]}_r", shape, "body", img, dots)
        for need in ("torso", "head"):
            if need in self.bones and need not in parts:
                raise SystemExit(f"{kit_dir}: a kit needs {need}.png")
        return parts

    # ------------------------------------------------------ kinematics

    def _world(self, pose):
        """Accumulated (angle_deg, pivot_xy_world, rest_head) per bone.

        A bone rotates about its head; children inherit. Any bone may
        also translate (dx/dy in fractions of standing height) — the
        root for a walk bob, the head for a nod.
        """
        out = {}

        def solve(name):
            if name in out:
                return out[name]
            b = self.bones[name]
            ch = pose.get(name, {})
            rot = ch.get("rot", 0.0)
            tx = ch.get("dx", 0.0) * self.rest_h
            ty = ch.get("dy", 0.0) * self.rest_h
            if b.parent is None or b.parent not in self.bones:
                out[name] = (rot, (b.head[0] + tx, b.head[1] + ty), b.head)
                return out[name]
            pang, ppiv, prest = solve(b.parent)
            # bone head carried by the parent's rotation about ITS pivot
            # (clockwise-positive, y-down screen coordinates)
            th = math.radians(pang)
            rx, ry = b.head[0] - prest[0], b.head[1] - prest[1]
            hx = ppiv[0] + rx * math.cos(th) - ry * math.sin(th)
            hy = ppiv[1] + rx * math.sin(th) + ry * math.cos(th)
            out[name] = (pang + rot, (hx + tx, hy + ty), b.head)
            return out[name]

        for n in self.bones:
            solve(n)
        return out

    def pose(self, bonevals, variant_for=None):
        """Render the posed character. Returns (RGBA, pad).

        The canvas is the source canvas grown by `pad` on every side, at
        source pixel scale, so callers keep sizing off the rest drawing.
        variant_for: {bone: sheet} — e.g. {"head": "talk"} swaps just the
        head part onto the artist's mouth-open sheet.
        """
        key = (tuple(sorted(
                   (b, tuple(sorted(
                       (k, v if isinstance(v, str) else round(v, 2))
                       for k, v in ch.items())))
                   for b, ch in bonevals.items() if ch)),
               tuple(sorted((variant_for or {}).items())))
        got = self._pose_cache.get(key)
        if got is not None:
            return got

        def shape_for(name):
            shapes = self.parts[name]
            want = bonevals.get(name, {}).get("shape")
            # a missing exotic shape degrades toward bent, then rest —
            # a clip asking for leg_kneel works on a kit without one;
            # no wanted shape at all means the rest drawing
            if want in shapes:
                return want
            chain = ("bent", "straight", "default") if want \
                else ("straight", "default")
            for fb in chain:
                if fb in shapes:
                    return fb
            return next(iter(shapes))

        # a shape can carry its own base rotation (the pocket aim)
        adj = {b: dict(ch) for b, ch in bonevals.items()}
        for name in self.order:
            if name not in self.parts:
                continue
            delta = (self.shape_rot.get(name) or {}).get(shape_for(name))
            if delta:
                slot = adj.setdefault(name, {})
                slot["rot"] = slot.get("rot", 0.0) + delta
        world = self._world(adj)
        pad = self.pad
        canvas = Image.new("RGBA", (self.W + 2 * pad, self.H + 2 * pad),
                           (0, 0, 0, 0))
        for name in self.order:
            if name not in self.parts:
                continue
            variants = self.parts[name][shape_for(name)]
            sheet = (variant_for or {}).get(name, "body")
            img, (ox, oy) = variants.get(sheet) or variants["body"]
            ang, piv, rest = world[name]
            if abs(ang) > 0.05:
                w0, h0 = img.size
                # positive angle = clockwise on screen (renderer convention)
                rot = img.rotate(-ang, resample=Image.BICUBIC, expand=True)
                # where the rest pivot landed inside the rotated crop:
                # clockwise rotation about the crop centre, y-down coords
                th = math.radians(ang)
                px, py = rest[0] - ox - w0 / 2, rest[1] - oy - h0 / 2
                qx = px * math.cos(th) - py * math.sin(th) + rot.width / 2
                qy = px * math.sin(th) + py * math.cos(th) + rot.height / 2
            else:
                rot = img
                qx, qy = rest[0] - ox, rest[1] - oy
            x = int(round(pad + piv[0] - qx))
            y = int(round(pad + piv[1] - qy))
            # clip to the canvas by hand: alpha_composite refuses overhang
            sx, sy = max(-x, 0), max(-y, 0)
            ex = min(rot.width, canvas.width - x)
            ey = min(rot.height, canvas.height - y)
            if ex > sx and ey > sy:
                canvas.alpha_composite(rot.crop((sx, sy, ex, ey)),
                                       (x + sx, y + sy))
        if len(self._pose_cache) > 64:
            self._pose_cache.clear()
        self._pose_cache[key] = (canvas, pad)
        return canvas, pad

    def bone_state(self, bone, bonevals):
        """(accumulated angle deg, world pivot, rest head) for a bone —
        what a prop pinned to that bone needs."""
        world = self._world(bonevals)
        if bone not in world:
            return 0.0, (0.0, 0.0), (0.0, 0.0)
        return world[bone]

    def anchor_world(self, at, bone, bonevals):
        """Where a rest-pose point riding a bone ends up, in padded coords."""
        world = self._world(bonevals)
        if bone not in world:
            return (at[0] * self.W + self.pad, at[1] * self.H + self.pad)
        ang, piv, rest = world[bone]
        th = math.radians(ang)
        rx, ry = at[0] * self.W - rest[0], at[1] * self.H - rest[1]
        return (piv[0] + rx * math.cos(th) - ry * math.sin(th) + self.pad,
                piv[1] + rx * math.sin(th) + ry * math.cos(th) + self.pad)


def resolve_channels(pose, bones):
    """Map clip channels onto the bones a rig actually has.

    arm_l_upper on a one-piece rig lands on arm_l; arm_l_lower is
    dropped; channels for bones that simply don't exist are ignored.
    """
    def merge(dst, ch):
        for k, v in ch.items():
            if isinstance(v, str):
                dst[k] = v
            else:
                dst[k] = dst.get(k, 0.0) + v

    out = {}
    for name, ch in pose.items():
        if name in bones:
            merge(out.setdefault(name, {}), ch)
            continue
        for suffix, repl in _SEGMENT_FALLBACK.items():
            if name.endswith(suffix):
                if repl is not None:
                    base = name[: -len(suffix)]
                    if base in bones:
                        merge(out.setdefault(base, {}), ch)
                break
    return out


# ---------------------------------------------------------------- faces

def _sample_colours(img, cx, cy, r):
    """(lid_fill, ink) sampled from the drawing around an eye.

    Fill is the modal colour on a ring just outside the eye (the skin or
    fur the artist actually used); ink is the darkest common colour in
    the neighbourhood, so lids match the character's line work.
    """
    arr = np.asarray(img)
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[max(0, int(cy - 3 * r)):min(H, int(cy + 3 * r)),
                      max(0, int(cx - 3 * r)):min(W, int(cx + 3 * r))]
    d = np.hypot(xx - cx, yy - cy)
    px = arr[yy, xx]
    ring = (d > 1.5 * r) & (d < 2.8 * r) & (px[..., 3] > 128)
    if not ring.any():
        return (250, 220, 120, 255), (20, 20, 20, 255)
    rgb = px[ring][:, :3].astype(np.int32)
    lum = rgb.sum(axis=1)
    mid = rgb[(lum > 210) & (lum < 690)]   # not ink, not paper-white
    if len(mid):
        # modal colour, coarsely quantised: flat marker fills collapse
        # to one bucket even through jpeg fuzz. The bucket votes, the
        # median of its own pixels wins — no posterised halo.
        q = (mid // 24)
        keys, counts = np.unique(q, axis=0, return_counts=True)
        win = keys[counts.argmax()]
        members = mid[(q == win).all(axis=1)]
        fill = tuple(np.median(members, axis=0).astype(int).tolist()) + (255,)
    else:
        fill = tuple(np.median(rgb, axis=0).astype(int).tolist()) + (255,)
    dark = rgb[lum <= 210]
    ink = tuple(np.median(dark, axis=0).astype(int).tolist()) + (255,) \
        if len(dark) else (20, 20, 20, 255)
    return fill, ink


def draw_closed_eye(img, cx, cy, r, style="arc", colours=None):
    """Stamp a closed eye over an open one, in the drawing's own colours."""
    fill, ink = colours or _sample_colours(img, cx, cy, r)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - 1.5 * r, cy - 1.5 * r, cx + 1.5 * r, cy + 1.5 * r],
              fill=fill)
    lw = max(2, int(r * 0.45))
    if style == "line":
        d.line([cx - 1.1 * r, cy, cx + 1.1 * r, cy], fill=ink, width=lw)
    else:  # relaxed downward arc, the marker-drawn shut eye
        d.arc([cx - 1.2 * r, cy - 1.4 * r, cx + 1.2 * r, cy + 0.9 * r],
              start=25, end=155, fill=ink, width=lw)


def draw_open_mouth(img, cx, cy, w, colours=None):
    """Stamp a dark open mouth — the stock flap for talk.png-less faces.

    A skin-coloured patch goes down first so the face's DRAWN closed
    mouth disappears under the open one instead of peeking past it.
    """
    fill, ink = colours or _sample_colours(img, cx, cy, w * 0.7)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - 0.85 * w, cy - 0.62 * w, cx + 0.85 * w,
               cy + 0.62 * w], fill=fill)
    h = w * 0.72
    d.ellipse([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
              fill=(30, 22, 22, 255), outline=ink,
              width=max(2, int(w * 0.10)))


def face_variant(img, face, blink=False, talk=False, transform=None,
                 feat_h=None):
    """Copy of img with stock blink and/or mouth flap stamped on.

    face: the char.json face block, coordinates normalised to the SOURCE
    drawing. transform maps a normalised rest point to pixel coordinates
    on img (rigged characters pass the FK mapping; flat ones omit it).
    feat_h: pixel height that feature sizes (r, w) are fractions of —
    the source drawing's height; defaults to img's own.
    """
    img = img.copy()
    W, H = img.size
    fh = feat_h or H
    if transform is None:
        def transform(at):
            return (at[0] * W, at[1] * H)
    if blink:
        for eye in face.get("eyes", []):
            cx, cy = transform(eye["at"])
            draw_closed_eye(img, cx, cy, eye.get("r", 0.012) * fh,
                            style=face.get("style", "arc"))
    if talk and face.get("mouth"):
        m = face["mouth"]
        cx, cy = transform(m["at"])
        draw_open_mouth(img, cx, cy, m.get("w", 0.05) * fh)
    return img


# ---------------------------------------------------------------- CLI

def _load_layers(folder):
    layers = {}
    for f in sorted(os.listdir(folder)):
        if f.lower().endswith(".png"):
            layers[os.path.splitext(f)[0]] = \
                Image.open(os.path.join(folder, f)).convert("RGBA")
    if "body" not in layers:
        raise SystemExit(f"{folder} has no body.png")
    return layers


def cmd_sheet(args):
    """Draw the skeleton, part bounds and face anchors over the artwork."""
    layers = _load_layers(args.character)
    rig = Rig(args.character, {"body": layers["body"]})
    img = layers["body"].copy()
    d = ImageDraw.Draw(img)
    palette = [(220, 40, 40), (40, 120, 220), (30, 160, 60), (230, 140, 20),
               (150, 60, 200), (200, 40, 140), (20, 170, 170), (120, 120, 40)]
    for i, name in enumerate(rig.order):
        if name not in rig.parts:
            continue
        col = palette[i % len(palette)]
        b = rig.bones[name]
        shapes = rig.parts[name]
        variants = shapes.get("straight") or shapes.get("default") \
            or next(iter(shapes.values()))
        crop, (ox, oy) = variants["body"]
        d.rectangle([ox, oy, ox + crop.width, oy + crop.height],
                    outline=col + (140,), width=3)
        d.line([b.head, b.tail], fill=col + (255,), width=8)
        r = rig.H * 0.008
        d.ellipse([b.head[0] - r, b.head[1] - r,
                   b.head[0] + r, b.head[1] + r], fill=col + (255,))
        d.text((b.head[0] + r * 1.5, b.head[1] - r * 3), name,
               fill=col + (255,), font_size=int(rig.H * 0.018))
    meta = os.path.join(args.character, "char.json")
    face = rig.face or {}
    if os.path.exists(meta):
        with open(meta) as f:
            face = json.load(f).get("face") or face
    if face:
        for eye in face.get("eyes", []):
            ex, ey = eye["at"][0] * rig.W, eye["at"][1] * rig.H
            er = eye.get("r", 0.012) * rig.H
            d.ellipse([ex - er, ey - er, ex + er, ey + er],
                      outline=(255, 0, 200, 255), width=3)
        if face.get("mouth"):
            m = face["mouth"]
            mx, my = m["at"][0] * rig.W, m["at"][1] * rig.H
            mw = m.get("w", 0.05) * rig.H
            d.rectangle([mx - mw / 2, my - mw * 0.3,
                         mx + mw / 2, my + mw * 0.3],
                        outline=(255, 0, 200, 255), width=3)
    img.save(args.out)
    print(f"wrote {args.out}  ({len(rig.parts)} parts: "
          f"{', '.join(rig.order)})", file=sys.stderr)


def _clip_specs(args, folder):
    roots = [os.path.join(folder, "clips"),
             os.path.join(os.path.dirname(folder.rstrip("/")), "clips")]
    specs = []
    for name in args.clip or ["walk"]:
        specs.append({"clip": find_clip(name, roots), "amp": args.amp})
    return specs


def cmd_preview(args):
    """Render a clip loop on a white card as a gif (or frame strip)."""
    layers = _load_layers(args.character)
    rig = Rig(args.character, layers)
    specs = _clip_specs(args, args.character)
    period = max(s["clip"].period for s in specs)
    fps = args.fps
    n = max(1, round(period * fps * args.loops))
    frames = []
    for f in range(n):
        t = f / fps + 10.0  # start deep into the loop: past the edge ramp
        p = resolve_channels(pose_at(specs, t), rig.bones)
        im, pad = rig.pose(p)
        card = Image.new("RGB", im.size, (245, 245, 240))
        card.paste(im, (0, 0), im)
        k = args.height / card.height
        frames.append(card.resize((int(card.width * k), args.height),
                                  Image.LANCZOS))
    frames[0].save(args.out, save_all=True, append_images=frames[1:],
                   duration=int(1000 / fps), loop=0)
    print(f"wrote {args.out}  {n} frames @ {fps}fps "
          f"({', '.join(s['clip'].name for s in specs)})", file=sys.stderr)


def cmd_pose(args):
    layers = _load_layers(args.character)
    rig = Rig(args.character, layers)
    specs = _clip_specs(args, args.character)
    p = resolve_channels(pose_at(specs, args.t + 10.0), rig.bones)
    im, pad = rig.pose(p)
    card = Image.new("RGB", im.size, (245, 245, 240))
    card.paste(im, (0, 0), im)
    card.save(args.out)
    print(f"wrote {args.out}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn in [("sheet", cmd_sheet), ("preview", cmd_preview),
                     ("pose", cmd_pose)]:
        p = sub.add_parser(name)
        p.add_argument("character", help="character folder with rig.json")
        p.add_argument("out")
        p.set_defaults(fn=fn)
        if name in ("preview", "pose"):
            p.add_argument("--clip", action="append",
                           help="clip name(s); repeat to layer (default walk)")
            p.add_argument("--amp", type=float, default=1.0)
        if name == "preview":
            p.add_argument("--fps", type=int, default=12)
            p.add_argument("--loops", type=int, default=2)
            p.add_argument("--height", type=int, default=480)
        if name == "pose":
            p.add_argument("--t", type=float, default=0.0,
                           help="seconds into the clip")
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
