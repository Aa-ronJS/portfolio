# Physically rendered wall photos with a plain A4 sheet (no markers) taped to the wall. Several variants.
import cv2, numpy as np, json, struct, sys
import os as _os, sys as _sys; _os.chdir(_os.path.dirname(_os.path.abspath(__file__)))  # write beside this script, whatever the caller's directory
def exif_app1(f35, fmm):
    ifd0 = struct.pack('>H', 1) + struct.pack('>HHII', 0x8769, 4, 1, 8 + 2 + 12 + 4) + struct.pack('>I', 0)
    exif_off = 8 + len(ifd0); n = 2; data_off = exif_off + 2 + n*12 + 4
    exif = struct.pack('>H', n) + struct.pack('>HHII', 0x920A, 5, 1, data_off) + struct.pack('>HHIHH', 0xA405, 3, 1, int(f35), 0) + struct.pack('>I', 0) + struct.pack('>II', int(fmm*100), 100)
    body = b'Exif\x00\x00' + b'MM\x00\x2a' + struct.pack('>I', 8) + ifd0 + exif
    return b'\xff\xe1' + struct.pack('>H', len(body) + 2) + body
def rot(yaw, pitch, roll):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch); cr,sr=np.cos(roll),np.sin(roll)
    return np.array([[cr,-sr,0],[sr,cr,0],[0,0,1]]) @ np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]) @ np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
def make(name, W=4000, Hh=2400, wall_bgr=(214,224,232), page=(1950, 900, 'portrait'), yaw=12, pitch=4, roll=1, dist=4300, f35=26.0, iw=3000, ih=2250, gradient=0.0, door=(300,360,1120,2400), win=(2500,600,3700,1600), exif=True, shadow=True, furniture=False, printed=None, exif_f35=None, shadow_all=0):
    M = 600
    canvas = np.full((Hh + 2*M, W + 2*M, 3), (200, 205, 210), np.uint8)
    cv2.rectangle(canvas, (M, M), (M+W, M+Hh), wall_bgr, -1)
    # ceiling a touch brighter, floor darker
    cv2.rectangle(canvas, (0, 0), (W+2*M, M), (232, 236, 238), -1); cv2.rectangle(canvas, (0, M+Hh), (W+2*M, Hh+2*M), (120, 140, 160), -1)
    cv2.rectangle(canvas, (M, M+Hh-90), (M+W, M+Hh), (235, 240, 245), -1)   # skirting
    cv2.rectangle(canvas, (M, M), (M+W, M+75), (238, 241, 243), -1)          # cornice
    if gradient: # light falloff left->right
        g = np.linspace(1.0, 1.0 - gradient, W + 2*M)[None, :, None]; canvas = np.clip(canvas * g, 0, 255).astype(np.uint8)
    noise = np.random.default_rng(1).normal(0, 3, canvas.shape).astype(np.int16); canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    def rect(x1, y1, x2, y2, col, t=-1): cv2.rectangle(canvas, (M+x1, M+y1), (M+x2, M+y2), col, t)
    if door: rect(*door, (70, 90, 120)); rect(door[0]-40, door[1]-40, door[2]+40, door[3], (240, 240, 240), 40)
    if win: rect(*win, (180, 150, 110)); rect(win[0]-50, win[1]-50, win[2]+50, win[3]+50, (245, 245, 245), 50); cv2.line(canvas, (M+(win[0]+win[2])//2, M+win[1]), (M+(win[0]+win[2])//2, M+win[3]), (245,245,245), 30)
    rect(1500, 700, 1900, 1000, (60, 70, 80)); rect(1520, 720, 1880, 980, (150, 170, 190))
    GPO = (3800, 2050, 3916, 2126); rect(*GPO, (250, 250, 250))
    if furniture: rect(2200, 1500, 3600, 2400, (90, 80, 70))   # a couch hiding the bottom-right corner
    px, py, orient = page; pw, ph = (210, 297) if orient == 'portrait' else (297, 210)
    if shadow: rect(px+3, py+4, px+pw+3, py+ph+4, tuple(int(c*0.82) for c in wall_bgr))  # soft edge shadow
    if shadow_all: rect(px-shadow_all, py-shadow_all, px+pw+shadow_all, py+ph+shadow_all, tuple(int(c*0.86) for c in wall_bgr))  # paper lifted at the edges: a thin shadow all round
    rect(px, py, px+pw, py+ph, (252, 252, 252))
    if printed:  # a printed document: heading, text lines, maybe a logo block. 1 unit = 1 mm on the wall
        rng = np.random.default_rng(7); dense = printed == 'dense'
        if dense: rect(px+20, py+15, px+80, py+45, (40, 60, 160))  # logo block
        y = py + (55 if dense else 30)
        rect(px+20, y, px+20+int(pw*0.55), y+6, (30, 30, 30)); y += 16  # heading
        while y < py + ph - 25:  # 10 pt body text: 2 mm x-height, 5 mm line pitch; dense = 4.5 mm pitch and heavier strokes
            x = px + 20
            while x < px + pw - 20:
                wlen = int(rng.integers(5, 22)); rect(x, y, min(x+wlen, px+pw-20), y+(2 if not dense else 3), (25, 25, 25)); x += wlen + 3
            y += 5 if not dense else 5
            if not dense and rng.random() < 0.12: y += 5
    f = f35 * np.hypot(iw, ih) / 43.27; K = np.array([[f, 0, iw/2], [0, f, ih/2], [0, 0, 1]])
    R = rot(np.radians(yaw), np.radians(pitch), np.radians(roll)); C = np.array([W/2, Hh/2, 0]) + R.T @ np.array([0, 0, -dist]); t = -R @ C
    Hm = K @ np.column_stack([R[:,0], R[:,1], t]); T = np.array([[1,0,-M],[0,1,-M],[0,0,1.0]])
    photo = cv2.warpPerspective(canvas, Hm @ T, (iw, ih), flags=cv2.INTER_AREA, borderValue=(190,195,200))
    photo = cv2.GaussianBlur(photo, (0,0), 0.9)
    photo = np.clip(photo.astype(np.int16) + np.random.default_rng(2).normal(0, 2.5, photo.shape), 0, 255).astype(np.uint8)
    ok, buf = cv2.imencode('.jpg', photo, [cv2.IMWRITE_JPEG_QUALITY, 88]); jpg = buf.tobytes()
    if exif: jpg = jpg[:2] + exif_app1(exif_f35 if exif_f35 else f35, 5.7) + jpg[2:]
    open(name + '.jpg', 'wb').write(jpg)
    def P(x, y):
        v = Hm @ np.array([x, y, 1.0]); return [float(v[0]/v[2]), float(v[1]/v[2])]
    truth = { 'f_px': float(f), 'size': [iw, ih], 'wall': {'corners': [P(0,0), P(W,0), P(W,Hh), P(0,Hh)], 'w': W, 'h': Hh},
      'page': {'corners': [P(px,py), P(px+pw,py), P(px+pw,py+ph), P(px,py+ph)], 'w': pw, 'h': ph},
      'door': {'tl': P(*door[:2]), 'br': P(*door[2:]), 'w': door[2]-door[0], 'h': door[3]-door[1]} if door else None,
      'window': {'tl': P(*win[:2]), 'br': P(*win[2:]), 'w': win[2]-win[0], 'h': win[3]-win[1]} if win else None }
    json.dump(truth, open(name + '.json', 'w'), indent=1)
    print(name, 'page px width ~%.0f' % np.hypot(*(np.array(truth['page']['corners'][1]) - np.array(truth['page']['corners'][0]))))
make('a4_basic')
make('a4_landscape', page=(1900, 1000, 'landscape'), yaw=-18, pitch=6, roll=-2)
make('a4_cream_gradient', wall_bgr=(200, 222, 236), gradient=0.25, yaw=22, pitch=8, dist=4800, exif=False)
make('a4_white_wall', wall_bgr=(244, 246, 247), page=(2100, 1300, 'portrait'), yaw=8, pitch=3, dist=3800)
make('a4_far_wide', W=5500, Hh=2700, page=(2600, 1100, 'portrait'), dist=6000, yaw=15, pitch=5, door=(400,660,1220,2700), win=(3200,700,4600,1800))
make('a4_furniture', furniture=True, yaw=10, pitch=5)
make('a4_printed', printed='text', yaw=14, pitch=5)
make('a4_printed_dense', printed='dense', yaw=-12, pitch=4, page=(2200, 950, 'portrait'))
make('a4_printed_landscape', printed='text', page=(1900, 1000, 'landscape'), yaw=9, pitch=3)
make('a4_nodoor', door=None, win=(1200,600,2400,1600), page=(2900, 1000, 'portrait'), yaw=-10)

import sys
if len(sys.argv) > 1 and sys.argv[1] == 'bias':
    for yaw in (4, 15, 25):
        make('fb_ok_y%d' % yaw, yaw=yaw, pitch=5)
        make('fb_true24_exif26_y%d' % yaw, yaw=yaw, pitch=5, f35=24.0, exif_f35=26)
        make('fb_true28_exif26_y%d' % yaw, yaw=yaw, pitch=5, f35=28.0, exif_f35=26)
        make('fb_true24_noexif_y%d' % yaw, yaw=yaw, pitch=5, f35=24.0, exif=False)
        make('fb_shadowall_y%d' % yaw, yaw=yaw, pitch=5, shadow_all=3)
        make('fb_printed_shadowall_y%d' % yaw, yaw=yaw, pitch=5, shadow_all=3, printed='text')
    make('fb_pitch15_roll6', yaw=12, pitch=15, roll=6)
    make('fb_pageleft', page=(300, 900, 'portrait'), yaw=12, pitch=5, door=None, win=(2500,600,3700,1600))
    make('fb_pageright', page=(3500, 900, 'portrait'), yaw=-14, pitch=5, win=None)
    make('fb_close', dist=2600, W=2900, Hh=2600, page=(1400, 1150, 'portrait'), door=(200,400,1020,2600), win=None, yaw=8, pitch=8)
    make('fb_close_printed', dist=2600, W=2900, Hh=2600, page=(1400, 1150, 'portrait'), door=(200,400,1020,2600), win=None, yaw=8, pitch=8, printed='text', shadow_all=3)
