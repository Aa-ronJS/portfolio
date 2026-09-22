# Physically rendered wall photo: pinhole camera, 4:3 frame, 26 mm equivalent, oblique view. No sheet.
import cv2, numpy as np, json, struct
import os as _os, sys as _sys; _os.chdir(_os.path.dirname(_os.path.abspath(__file__)))  # write beside this script, whatever the caller's directory
W, Hh, M = 4000, 2400, 600
canvas = np.full((Hh + 2*M, W + 2*M, 3), (200, 205, 210), np.uint8)
cv2.rectangle(canvas, (M, M), (M+W, M+Hh), (214, 224, 232), -1)
cv2.rectangle(canvas, (M, M+Hh-90), (M+W, M+Hh), (235, 240, 245), -1)
noise = np.random.default_rng(1).normal(0, 3, canvas.shape).astype(np.int16); canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
def rect(x1, y1, x2, y2, col, t=-1): cv2.rectangle(canvas, (M+x1, M+y1), (M+x2, M+y2), col, t)
DOOR = (300, 360, 1120, 2400); WIN = (2500, 600, 3700, 1600); GPO = (3800, 2050, 3916, 2126)  # 116 x 76 plate
rect(*DOOR, (70, 90, 120)); rect(DOOR[0]-40, DOOR[1]-40, DOOR[2]+40, DOOR[3], (240, 240, 240), 40)
rect(*WIN, (180, 150, 110)); rect(WIN[0]-50, WIN[1]-50, WIN[2]+50, WIN[3]+50, (245, 245, 245), 50)
cv2.line(canvas, (M+(WIN[0]+WIN[2])//2, M+WIN[1]), (M+(WIN[0]+WIN[2])//2, M+WIN[3]), (245,245,245), 30)
rect(1500, 700, 1900, 1000, (60, 70, 80)); rect(1520, 720, 1880, 980, (150, 170, 190))
rect(*GPO, (250, 250, 250)); rect(GPO[0]+2, GPO[1]+2, GPO[2]-2, GPO[3]-2, (240, 240, 240), 2)
iw, ih, f35 = 3000, 2250, 26.0
f = f35 * np.hypot(iw, ih) / 43.27
K = np.array([[f, 0, iw/2], [0, f, ih/2], [0, 0, 1]])
def rot(yaw, pitch, roll):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch); cr,sr=np.cos(roll),np.sin(roll)
    return np.array([[cr,-sr,0],[sr,cr,0],[0,0,1]]) @ np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]) @ np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
R = rot(np.radians(20), np.radians(6), np.radians(1.5)); C = np.array([W/2, Hh/2, 0]) + R.T @ np.array([0, 0, -4300]); t = -R @ C
Hm = K @ np.column_stack([R[:,0], R[:,1], t])            # wall mm (x right, y down, z=0) -> px
T = np.array([[1,0,-M],[0,1,-M],[0,0,1.0]])
photo = cv2.warpPerspective(canvas, Hm @ T, (iw, ih), flags=cv2.INTER_AREA, borderValue=(190,195,200))
photo = cv2.GaussianBlur(photo, (0,0), 0.9)
photo = np.clip(photo.astype(np.int16) + np.random.default_rng(2).normal(0, 2.5, photo.shape), 0, 255).astype(np.uint8)
ok, buf = cv2.imencode('.jpg', photo, [cv2.IMWRITE_JPEG_QUALITY, 88]); jpg = buf.tobytes()
# splice an EXIF APP1 with FocalLength 5.7 mm and FocalLengthIn35mmFilm 26 (big-endian TIFF)
def exif_app1(f35, fmm):
    ifd0 = struct.pack('>H', 1) + struct.pack('>HHII', 0x8769, 4, 1, 8 + 2 + 12 + 4) + struct.pack('>I', 0)
    exif_off = 8 + len(ifd0)
    n = 2; data_off = exif_off + 2 + n*12 + 4
    exif = struct.pack('>H', n) + struct.pack('>HHII', 0x920A, 5, 1, data_off) + struct.pack('>HHIHH', 0xA405, 3, 1, int(f35), 0) + struct.pack('>I', 0)
    exif += struct.pack('>II', int(fmm*100), 100)
    tiff = b'MM\x00\x2a' + struct.pack('>I', 8) + ifd0 + exif
    body = b'Exif\x00\x00' + tiff
    return b'\xff\xe1' + struct.pack('>H', len(body) + 2) + body
assert jpg[:2] == b'\xff\xd8'
with_exif = jpg[:2] + exif_app1(26, 5.7) + jpg[2:]
open('photo2.jpg', 'wb').write(with_exif); open('photo2-noexif.jpg', 'wb').write(jpg)
def P(x, y):
    v = Hm @ np.array([x, y, 1.0]); return [float(v[0]/v[2]), float(v[1]/v[2])]
truth = { 'f_px': float(f), 'f35': f35, 'size': [iw, ih],
  'wall': {'corners': [P(0,0), P(W,0), P(W,Hh), P(0,Hh)], 'w': W, 'h': Hh},
  'door': {'tl': P(*DOOR[:2]), 'br': P(*DOOR[2:]), 'corners': [P(DOOR[0],DOOR[1]), P(DOOR[2],DOOR[1]), P(DOOR[2],DOOR[3]), P(DOOR[0],DOOR[3])], 'top': P((DOOR[0]+DOOR[2])/2, DOOR[1]), 'bottom': P((DOOR[0]+DOOR[2])/2, DOOR[3]), 'w': 820, 'h': 2040},
  'window': {'tl': P(*WIN[:2]), 'br': P(*WIN[2:]), 'w': 1200, 'h': 1000},
  'gpo': {'left': P(GPO[0], (GPO[1]+GPO[3])/2), 'right': P(GPO[2], (GPO[1]+GPO[3])/2), 'corners': [P(GPO[0],GPO[1]), P(GPO[2],GPO[1]), P(GPO[2],GPO[3]), P(GPO[0],GPO[3])], 'w': 116, 'h': 76} }
json.dump(truth, open('truth2.json', 'w'), indent=1)
print('written; f_px', round(f), 'wall corners', [[round(a) for a in c] for c in truth['wall']['corners']])
