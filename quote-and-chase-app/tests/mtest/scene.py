import cv2, numpy as np, json, sys
import os as _os, sys as _sys; _os.chdir(_os.path.dirname(_os.path.abspath(__file__)))  # write beside this script, whatever the caller's directory
# Wall frame: mm, 1 px = 1 mm. Wall 4000 x 2400 with 300 mm of surroundings.
W, Hh, M = 4000, 2400, 300
canvas = np.full((Hh + 2*M, W + 2*M, 3), (200, 205, 210), np.uint8)   # surroundings (ceiling/floor grey-blue)
cv2.rectangle(canvas, (M, M), (M+W, M+Hh), (214, 224, 232), -1)          # wall, warm off-white (BGR)
cv2.rectangle(canvas, (M, M+Hh-90), (M+W, M+Hh), (235, 240, 245), -1)   # skirting
# subtle texture so it's not perfectly flat
noise = np.random.default_rng(1).normal(0, 3, canvas.shape).astype(np.int16)
canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
def rect(x1, y1, x2, y2, col, t=-1): cv2.rectangle(canvas, (M+x1, M+y1), (M+x2, M+y2), col, t)
DOOR = (300, 360, 1120, 2400)      # 820 x 2040
WIN  = (2500, 600, 3700, 1600)     # 1200 x 1000
rect(*DOOR, (70, 90, 120)); rect(DOOR[0]-40, DOOR[1]-40, DOOR[2]+40, DOOR[3], (240, 240, 240), 40)
rect(*WIN, (180, 150, 110)); rect(WIN[0]-50, WIN[1]-50, WIN[2]+50, WIN[3]+50, (245, 245, 245), 50)
cv2.line(canvas, (M+(WIN[0]+WIN[2])//2, M+WIN[1]), (M+(WIN[0]+WIN[2])//2, M+WIN[3]), (245,245,245), 30)
# picture frame and a power point for realism
rect(1500, 700, 1900, 1000, (60, 70, 80)); rect(1520, 720, 1880, 980, (150, 170, 190))
rect(3800, 2050, 3900, 2130, (240, 240, 240))
# the sheet: 210 x 297 mm at (SX, SY)
SX, SY = 1950, 900
sheet = cv2.imread('sheet.png'); sheet = cv2.resize(sheet, (210, 297), interpolation=cv2.INTER_AREA)
canvas[M+SY:M+SY+297, M+SX:M+SX+210] = sheet
# Camera: perspective map from wall mm to a 3000 x 2000 photo
src = np.float32([[0,0],[W,0],[W,Hh],[0,Hh]])
dst = np.float32([[330,270],[2690,390],[2740,1710],[290,1870]])
Ht = cv2.getPerspectiveTransform(src, dst)
# include the surroundings offset (canvas origin is at -M,-M in wall frame)
T = np.array([[1,0,-M],[0,1,-M],[0,0,1]], np.float64)
photo = cv2.warpPerspective(canvas, Ht @ T, (3000, 2000), flags=cv2.INTER_AREA, borderValue=(190,195,200))
photo = cv2.GaussianBlur(photo, (0,0), 0.9)
photo = np.clip(photo.astype(np.int16) + np.random.default_rng(2).normal(0, 2.5, photo.shape), 0, 255).astype(np.uint8)
cv2.imwrite('photo.jpg', photo, [cv2.IMWRITE_JPEG_QUALITY, 88])
def P(x, y):
    v = Ht @ np.array([x, y, 1.0]); return [float(v[0]/v[2]), float(v[1]/v[2])]
truth = { 'wall': {'tl': P(0,0), 'br': P(W,Hh), 'corners': [P(0,0), P(W,0), P(W,Hh), P(0,Hh)], 'w': W, 'h': Hh},
          'door': {'tl': P(*DOOR[:2]), 'br': P(*DOOR[2:]), 'w': DOOR[2]-DOOR[0], 'h': DOOR[3]-DOOR[1]},
          'window': {'tl': P(*WIN[:2]), 'br': P(*WIN[2:]), 'w': WIN[2]-WIN[0], 'h': WIN[3]-WIN[1]},
          'sheet_px_width': float(np.hypot(*(np.array(P(SX+210,SY)) - np.array(P(SX,SY))))) }
json.dump(truth, open('truth.json','w'), indent=1)
print('photo.jpg written; sheet spans about %.0f px across' % truth['sheet_px_width'])
