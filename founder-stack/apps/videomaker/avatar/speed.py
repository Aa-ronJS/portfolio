#!/usr/bin/env python3
"""Build-time patch: let the engine render every Nth frame (AVATAR_FRAME_STEP) so CPU renders finish in
1/N of the time. Frame timing is preserved (the clip's frame rate drops with it); the Video maker
re-encodes to a constant 30 fps afterwards."""
import re

p = "/sadtalker/src/generate_facerender_batch.py"; s = open(p).read()
if "AVATAR_FRAME_STEP" not in s:
    s = s.replace("    target_semantics_list = [] \n    frame_num = generated_3dmm.shape[0]",
                  "    import os as _os\n    generated_3dmm = generated_3dmm[::max(1, int(_os.environ.get('AVATAR_FRAME_STEP', '1')))]\n"
                  "    target_semantics_list = [] \n    frame_num = generated_3dmm.shape[0]")
    assert "AVATAR_FRAME_STEP" in s, "batch patch anchor missing"
    open(p, "w").write(s)

p = "/sadtalker/src/facerender/animate.py"; s = open(p).read()
if "AVATAR_FRAME_STEP" not in s:
    s, n = re.subn(r"fps=float\(25\)", "fps=25.0/max(1, int(os.environ.get('AVATAR_FRAME_STEP', '1')))", s)
    assert n >= 1, "fps anchor missing"
    open(p, "w").write(s)
print("speed patch applied")
