#!/usr/bin/env python3
"""Video maker — script in, finished marketing video out. Stdlib + ffmpeg + a TTS service."""
import cgi, html, json, os, re, subprocess, tempfile, threading, time, urllib.request, shutil
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TTS = os.environ.get("TTS_URL", "http://tts:8880")
AVATAR = os.environ.get("AVATAR_URL", "http://avatar:8090")
BRAND = os.environ.get("BRAND_NAME", "Founder Stack")
COLOR = os.environ.get("BRAND_COLOR", "#4f46e5")
FFCOLOR = "0x" + COLOR.lstrip("#")   # ffmpeg colour syntax
DOMAIN = os.environ.get("BASE_DOMAIN", "")
OUT = "/data/videos"; os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H, FPS = 1920, 1080, 30
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-ar", "44100", "-ac", "2"]


def tts(text, voice, path):
    body = json.dumps({"model": "kokoro", "input": text, "voice": voice, "response_format": "wav", "speed": 1.0}).encode()
    req = urllib.request.Request(f"{TTS}/v1/audio/speech", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)


def voices():
    """[(id, label)] — voice ids from the speech engine, labelled by name, accent and gender."""
    try:
        with urllib.request.urlopen(f"{TTS}/v1/audio/voices", timeout=10) as r:
            ids = [v if isinstance(v, str) else (v.get("id") or v.get("name")) for v in json.load(r).get("voices", [])]
    except Exception:
        ids = ["af_heart", "af_bella", "am_adam", "bf_emma", "bm_george"]
    accents = {"a": "US", "b": "UK", "e": "Spanish", "f": "French", "h": "Hindi", "i": "Italian", "j": "Japanese", "p": "Portuguese", "z": "Chinese"}
    out = []
    for v in ids:
        if not v or "_" not in v: continue
        pre, name = v.split("_", 1)
        out.append((v, f"{name.capitalize()} · {accents.get(pre[:1], pre[:1].upper())} · {'female' if pre[1:2] == 'f' else 'male'}"))
    out.sort(key=lambda x: (x[0] != "af_heart", x[1]))
    return out


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def esc(t):  # drawtext escaping
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def wrap(t, n=38):
    words, lines, cur = t.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n and cur: lines.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    return "\n".join(lines[:6])


def card(text, sub, dur, path, audio=None, small=False):
    """Brand-colour title card (optionally with narration audio)."""
    vf = f"drawtext=fontfile={FONT}:text='{esc(wrap(text, 30 if not small else 40))}':fontcolor=white:fontsize={72 if not small else 56}:x=(w-text_w)/2:y=(h-text_h)/2-{60 if sub else 0}:line_spacing=18"
    if sub: vf += f",drawtext=fontfile={FONT}:text='{esc(sub)}':fontcolor=white@0.85:fontsize=40:x=(w-text_w)/2:y=(h/2)+{120 if not small else 150}"
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={FFCOLOR}:s={W}x{H}:r={FPS}:d={dur:.2f}"]
    cmd += ["-i", audio] if audio else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
    cmd += ["-vf", vf, "-t", f"{dur:.2f}", "-shortest"] + ENC + [path]
    subprocess.run(cmd, check=True, capture_output=True)


def image_seg(img, caption, dur, audio, path):
    """Photo/slide with the sentence as a caption bar."""
    vf = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,"
          f"drawbox=y=ih-190:h=190:color=black@0.55:t=fill,"
          f"drawtext=fontfile={FONT}:text='{esc(wrap(caption, 60))}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-170:line_spacing=10")
    cmd = ["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-i", img, "-i", audio, "-vf", vf, "-t", f"{dur:.2f}", "-shortest"] + ENC + [path]
    subprocess.run(cmd, check=True, capture_output=True)


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def lipsync(face, audio, out):
    """Ask the presenter engine to make the face speak the audio (multipart POST)."""
    boundary = "----fsboundary"; parts = []
    for name, path, ctype in (("face", face, "application/octet-stream"), ("audio", audio, "audio/wav")):
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{os.path.basename(path)}\"\r\nContent-Type: {ctype}\r\n\r\n".encode() + open(path, "rb").read() + b"\r\n")
    body = b"".join(parts) + f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{AVATAR}/lipsync", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=3600) as r, open(out, "wb") as f:
        shutil.copyfileobj(r, f)


def render_presenter(title, sentences, voice, face, work):
    """AI presenter: one continuous narration, lip-synced onto the face, captions timed per sentence."""
    wavs, times, t = [], [], 0.0
    for i, s in enumerate(sentences):
        w = f"{work}/s{i}.wav"; tts(s, voice, w); d = duration(w); wavs.append(w); times.append((t, t + d, s)); t += d
    lst = f"{work}/wavs.txt"; open(lst, "w").write("".join(f"file '{w}'\n" for w in wavs))
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "16000", "-ac", "1", f"{work}/narration.wav"], check=True, capture_output=True)
    lipsync(face, f"{work}/narration.wav", f"{work}/presenter.mp4")
    srt = f"{work}/captions.srt"
    open(srt, "w").write("".join(f"{i+1}\n{srt_time(a)} --> {srt_time(b)}\n{wrap(s, 60)}\n\n" for i, (a, b, s) in enumerate(times)))
    vf = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={FFCOLOR},"
          f"subtitles={srt}:force_style='FontName=DejaVu Sans,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=40'")
    subprocess.run(["ffmpeg", "-y", "-i", f"{work}/presenter.mp4", "-vf", vf] + ENC + [f"{work}/body.mp4"], check=True, capture_output=True)
    return [f"{work}/body.mp4"]


def video_name(title, face):
    name = re.sub(r"[^a-z0-9]+", "-", (title or "video").lower()).strip("-")[:40] or "video"
    if face: name += "-presenter"
    return f"{time.strftime('%Y%m%d-%H%M%S')}-{name}.mp4"


def render(title, script, voice, images, face, final):
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", script.strip()) if s.strip()]
    if not sentences: raise ValueError("empty script")
    work = tempfile.mkdtemp(); segs = []
    try:
        card(title or BRAND, BRAND if title else DOMAIN, 2.5, f"{work}/intro.mp4"); segs.append(f"{work}/intro.mp4")
        if face:
            segs += render_presenter(title, sentences, voice, face, work); sentences = []
        for i, s in enumerate(sentences):
            wav = f"{work}/s{i}.wav"; tts(s, voice, wav); d = max(duration(wav) + 0.4, 1.5)
            out = f"{work}/s{i}.mp4"
            if images: image_seg(images[i % len(images)], s, d, wav, out)
            else: card(s, "", d, out, audio=wav, small=True)
            segs.append(out)
        card(DOMAIN or BRAND, "", 3.0, f"{work}/outro.mp4"); segs.append(f"{work}/outro.mp4")
        lst = f"{work}/list.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in segs))
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", f"{work}/final.mp4"], check=True, capture_output=True)
        shutil.move(f"{work}/final.mp4", f"{OUT}/{final}")
    finally:
        shutil.rmtree(work, ignore_errors=True)
        for p in images + ([face] if face else []):
            shutil.rmtree(os.path.dirname(p), ignore_errors=True)


def render_job(title, script, voice, images, face, final):
    """Runs in the background: the page shows 'Rendering…' until the MP4 appears (or a .failed note)."""
    marker = f"{OUT}/{final}.rendering"; open(marker, "w").write(time.strftime("%H:%M"))
    try:
        render(title, script, voice, images, face, final)
    except subprocess.CalledProcessError as e:
        open(f"{OUT}/{final}.failed", "w").write((e.stderr or b"").decode(errors="replace")[-600:] or "video tool failed")
    except Exception as e:
        open(f"{OUT}/{final}.failed", "w").write(str(e)[:600])
    finally:
        try: os.remove(marker)
        except OSError: pass


PAGE = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>__BRAND__ · Video maker</title>
<style>:root{--a:__COLOR__}body{margin:0;background:#f6f7fb;color:#0f172a;font:14px/1.5 system-ui,sans-serif}header{background:#fff;border-bottom:1px solid #e3e8ef;padding:14px 26px;font-weight:650;font-size:17px}
main{max-width:1100px;margin:0 auto;padding:20px 26px;display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:900px){main{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:18px}h2{margin:0 0 8px;font-size:15px}label{display:block;color:#64748b;font-size:12px;margin:10px 0 4px;font-weight:500}
input,textarea,select{width:100%;border:1px solid #e3e8ef;border-radius:9px;padding:8px 11px;font:inherit;box-sizing:border-box}textarea{min-height:180px}
button{background:var(--a);color:#fff;border:0;border-radius:11px;padding:11px 20px;font:inherit;font-weight:600;font-size:15px;cursor:pointer;margin-top:12px}.hint{color:#64748b;font-size:12.5px}
video{width:100%;border-radius:10px;background:#000}.v{margin-bottom:16px}.v a{color:var(--a)}.job{border:1px dashed #cbd5e1;border-radius:10px;padding:10px 12px}.err{border-color:#fca5a5}.err pre{white-space:pre-wrap;font-size:11px;color:#64748b;margin:6px 0 0}</style></head><body>
<header>__BRAND__ <span style="color:#64748b;font-weight:500">video maker</span></header><main>
<form class="card" method="post" action="/render" enctype="multipart/form-data"><h2>Make a video</h2>
<p class="hint">Write what you want said. Each sentence becomes a scene: your images in turn, or brand-colour title cards if you add none. Narration, captions, intro and outro are automatic.</p>
<label>Title</label><input name="title" placeholder="Why customers love us">
<label>Script</label><textarea name="script" placeholder="We help small businesses look big. Book a call in two clicks. Get paid the same day."></textarea>
<label>Voice</label><select name="voice">__VOICES__</select>
<label>Images or slides (optional, used in order)</label><input type="file" name="images" multiple accept="image/*">
<label>AI presenter (optional): a photo or short clip of the person who should say it</label><input type="file" name="face" accept="image/*,video/mp4,video/quicktime">
<p class="hint">Head-and-shoulders, facing the camera, good light. The script is narrated and lip-synced onto their face; captions are added automatically. Presenter renders take about a minute per second of speech on a CPU server — start it and come back.</p>
<button type="submit">Render video</button><p class="hint">Renders in the background and appears on the right when done: about a minute for a one-minute slide video, much longer with an AI presenter.</p></form>
<div class="card"><h2>Your videos</h2>__VIDEOS__</div></main></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)

    def do_GET(self):
        if self.path == "/healthz": return self.send(200, "ok", "text/plain")
        if self.path.startswith("/videos/"):
            p = os.path.join(OUT, os.path.basename(self.path))
            if not os.path.exists(p): return self.send(404, "not found", "text/plain")
            self.send_response(200); self.send_header("Content-Type", "video/mp4"); self.send_header("Content-Length", str(os.path.getsize(p))); self.end_headers()
            with open(p, "rb") as f: shutil.copyfileobj(f, self.wfile); return
        names = sorted(os.listdir(OUT), reverse=True); vhtml = ""; busy = False
        for v in names[:14]:
            if v.endswith(".rendering"):
                busy = True; vhtml += f'<div class="v job"><b>Rendering…</b> {html.escape(v[:-10])} <span class="hint">started {html.escape(open(os.path.join(OUT, v)).read())} · this page refreshes itself</span></div>'
            elif v.endswith(".failed"):
                vhtml += f'<div class="v job err"><b>Failed:</b> {html.escape(v[:-7])}<pre>{html.escape(open(os.path.join(OUT, v)).read())}</pre></div>'
            elif v.endswith(".mp4"):
                vhtml += f'<div class="v"><video controls preload="metadata" src="/videos/{v}"></video><div><a href="/videos/{v}" download>{html.escape(v)}</a></div></div>'
        vhtml = vhtml or '<p class="hint">Nothing yet — render your first one.</p>'
        if busy: vhtml = '<meta http-equiv="refresh" content="15">' + vhtml
        vo = "".join(f'<option value="{html.escape(v)}">{html.escape(l)}</option>' for v, l in voices())
        self.send(200, PAGE.replace("__BRAND__", html.escape(BRAND)).replace("__COLOR__", html.escape(COLOR)).replace("__VOICES__", vo).replace("__VIDEOS__", vhtml))

    def do_POST(self):
        if self.path != "/render": return self.send(404, "not found", "text/plain")
        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type", "")})
        title = form.getfirst("title", "").strip(); script = form.getfirst("script", ""); voice = form.getfirst("voice", "af_heart")
        images = []; face = None
        if "face" in form and getattr(form["face"], "filename", "") and form["face"].file:
            fd = tempfile.mkdtemp(); face = os.path.join(fd, "face" + (os.path.splitext(form["face"].filename)[1] or ".jpg")); open(face, "wb").write(form["face"].file.read())
        if "images" in form:
            items = form["images"] if isinstance(form["images"], list) else [form["images"]]
            tmp = tempfile.mkdtemp()
            for i, it in enumerate(items):
                if getattr(it, "filename", "") and it.file:
                    p = os.path.join(tmp, f"img{i}{os.path.splitext(it.filename)[1] or '.jpg'}"); open(p, "wb").write(it.file.read()); images.append(p)
        if not script.strip(): return self.send(400, "<p>Write a script first.</p><p><a href='/'>Back</a></p>")
        final = video_name(title, face)
        open(f"{OUT}/{final}.rendering", "w").write(time.strftime("%H:%M"))
        threading.Thread(target=render_job, args=(title, script, voice, images, face, final), daemon=True).start()
        self.send_response(303); self.send_header("Location", "/"); self.send_header("Content-Length", "0"); self.end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
