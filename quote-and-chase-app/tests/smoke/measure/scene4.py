# Adversarial variants built on scene3's renderer (copied, with page=None, an 'extra' drawing hook and post-processing).
import cv2, numpy as np, json, struct, sys
import os as _os, sys as _sys; _os.chdir(_os.path.dirname(_os.path.abspath(__file__)))  # write beside this script, whatever the caller's directory
import os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mtest'))
def exif_app1(f35, fmm):
    ifd0 = struct.pack('>H', 1) + struct.pack('>HHII', 0x8769, 4, 1, 8 + 2 + 12 + 4) + struct.pack('>I', 0)
    exif_off = 8 + len(ifd0); n = 2; data_off = exif_off + 2 + n*12 + 4
    exif = struct.pack('>H', n) + struct.pack('>HHII', 0x920A, 5, 1, data_off) + struct.pack('>HHIHH', 0xA405, 3, 1, int(f35), 0) + struct.pack('>I', 0) + struct.pack('>II', int(fmm*100), 100)
    body = b'Exif\x00\x00' + b'MM\x00\x2a' + struct.pack('>I', 8) + ifd0 + exif
    return b'\xff\xe1' + struct.pack('>H', len(body) + 2) + body
def rot(yaw, pitch, roll):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch); cr,sr=np.cos(roll),np.sin(roll)
    return np.array([[cr,-sr,0],[sr,cr,0],[0,0,1]]) @ np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]) @ np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
def make(name, W=4000, Hh=2400, wall_bgr=(214,224,232), page=(1950, 900, 'portrait'), yaw=12, pitch=4, roll=1, dist=4300, f35=26.0, iw=3000, ih=2250, gradient=0.0, door=(300,360,1120,2400), win=(2500,600,3700,1600), exif=True, shadow=True, furniture=False, extra=None, post=None, plain=False):
    M = 600
    canvas = np.full((Hh + 2*M, W + 2*M, 3), (200, 205, 210), np.uint8)
    cv2.rectangle(canvas, (M, M), (M+W, M+Hh), wall_bgr, -1)
    if plain:
        canvas[:] = wall_bgr
    else:
        cv2.rectangle(canvas, (0, 0), (W+2*M, M), (232, 236, 238), -1); cv2.rectangle(canvas, (0, M+Hh), (W+2*M, Hh+2*M), (120, 140, 160), -1)
        cv2.rectangle(canvas, (M, M+Hh-90), (M+W, M+Hh), (235, 240, 245), -1)
        cv2.rectangle(canvas, (M, M), (M+W, M+75), (238, 241, 243), -1)
    if gradient:
        g = np.linspace(1.0, 1.0 - gradient, W + 2*M)[None, :, None]; canvas = np.clip(canvas * g, 0, 255).astype(np.uint8)
    noise = np.random.default_rng(1).normal(0, 3, canvas.shape).astype(np.int16); canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    def rect(x1, y1, x2, y2, col, t=-1): cv2.rectangle(canvas, (M+x1, M+y1), (M+x2, M+y2), col, t)
    if not plain:
        if door: rect(*door, (70, 90, 120)); rect(door[0]-40, door[1]-40, door[2]+40, door[3], (240, 240, 240), 40)
        if win: rect(*win, (180, 150, 110)); rect(win[0]-50, win[1]-50, win[2]+50, win[3]+50, (245, 245, 245), 50); cv2.line(canvas, (M+(win[0]+win[2])//2, M+win[1]), (M+(win[0]+win[2])//2, M+win[3]), (245,245,245), 30)
        rect(1500, 700, 1900, 1000, (60, 70, 80)); rect(1520, 720, 1880, 980, (150, 170, 190))
        GPO = (3800, 2050, 3916, 2126); rect(*GPO, (250, 250, 250))
        if furniture: rect(2200, 1500, 3600, 2400, (90, 80, 70))
    if extra: extra(rect)
    if page:
        px, py, orient = page; pw, ph = (210, 297) if orient == 'portrait' else (297, 210)
        if shadow: rect(px+3, py+4, px+pw+3, py+ph+4, tuple(int(c*0.82) for c in wall_bgr))
        rect(px, py, px+pw, py+ph, (252, 252, 252))
    f = f35 * np.hypot(iw, ih) / 43.27; K = np.array([[f, 0, iw/2], [0, f, ih/2], [0, 0, 1]])
    R = rot(np.radians(yaw), np.radians(pitch), np.radians(roll)); C = np.array([W/2, Hh/2, 0]) + R.T @ np.array([0, 0, -dist]); t = -R @ C
    Hm = K @ np.column_stack([R[:,0], R[:,1], t]); T = np.array([[1,0,-M],[0,1,-M],[0,0,1.0]])
    photo = cv2.warpPerspective(canvas, Hm @ T, (iw, ih), flags=cv2.INTER_AREA, borderValue=(190,195,200))
    photo = cv2.GaussianBlur(photo, (0,0), 0.9)
    photo = np.clip(photo.astype(np.int16) + np.random.default_rng(2).normal(0, 2.5, photo.shape), 0, 255).astype(np.uint8)
    if post: photo = post(photo)
    ok, buf = cv2.imencode('.jpg', photo, [cv2.IMWRITE_JPEG_QUALITY, 88]); jpg = buf.tobytes()
    if exif: jpg = jpg[:2] + exif_app1(f35, 5.7) + jpg[2:]
    open(name + '.jpg', 'wb').write(jpg)
    def P(x, y):
        v = Hm @ np.array([x, y, 1.0]); return [float(v[0]/v[2]), float(v[1]/v[2])]
    truth = { 'f_px': float(f), 'size': [iw, ih], 'wall': {'corners': [P(0,0), P(W,0), P(W,Hh), P(0,Hh)], 'w': W, 'h': Hh},
      'page': ({'corners': [P(px,py), P(px+pw,py), P(px+pw,py+ph), P(px,py+ph)], 'w': pw, 'h': ph} if page else None),
      'door': {'tl': P(*door[:2]), 'br': P(*door[2:]), 'w': door[2]-door[0], 'h': door[3]-door[1]} if door and not plain else None,
      'window': {'tl': P(*win[:2]), 'br': P(*win[2:]), 'w': win[2]-win[0], 'h': win[3]-win[1]} if win and not plain else None }
    json.dump(truth, open(name + '.json', 'w'), indent=1)
    pc = truth['page']['corners'] if page else None
    print(name, 'page px', [[round(c[0]), round(c[1])] for c in pc] if pc else None, 'wall px', [[round(c[0]), round(c[1])] for c in truth['wall']['corners']])

def dark(p): return np.clip(p.astype(np.float32) * 0.35, 0, 255).astype(np.uint8)
def grain(p): return np.clip(p.astype(np.float32) + np.random.default_rng(7).normal(0, 12, p.shape), 0, 255).astype(np.uint8)
def vignette(p):
    h, w = p.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; r = np.hypot((xx - w/2) / (w/2), (yy - h/2) / (h/2)); m = np.clip(1 - 0.75 * (r / 1.2) ** 2, 0.15, 1)
    return np.clip(p.astype(np.float32) * m[..., None], 0, 255).astype(np.uint8)

make('big12mp', iw=4032, ih=3024)
make('portrait', iw=2250, ih=3000, dist=6500, yaw=8)
make('rot90', W=2600, Hh=3000, page=(1200, 1200, 'landscape'), dist=5200, yaw=10, pitch=3, door=(200,960,1020,3000), win=(1500,700,2400,1700))
make('cutedge', page=(3650, 900, 'portrait'), yaw=0, pitch=0, roll=0, dist=2600)
make('tiny', dist=9000)
make('huge', dist=1500, yaw=3, pitch=1)
make('doorpanel', page=None, extra=lambda rect: rect(1700, 900, 2300, 1800, (250, 250, 250)))
make('picture', page=None, extra=lambda rect: (rect(1900, 800, 2200, 1200, (30, 30, 30)), rect(1912, 812, 2188, 1188, (250, 250, 250))))
make('dark', post=dark)
make('grainy', post=grain)
make('vignette', post=vignette)
make('blank', plain=True, page=None, door=None, win=None)
