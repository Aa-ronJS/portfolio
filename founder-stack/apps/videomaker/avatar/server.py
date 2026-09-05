#!/usr/bin/env python3
"""AI presenter service: POST /lipsync (multipart: face=<photo>, audio=<wav>) -> mp4 of that person saying the audio."""
import cgi, glob, os, subprocess, tempfile, shutil
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SIZE = os.environ.get("AVATAR_SIZE", "256")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ctype="text/plain"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)

    def do_GET(self):
        ok = os.path.exists(f"/weights/checkpoints/SadTalker_V0.0.2_{SIZE}.safetensors") and os.path.exists("/weights/gfpgan/weights/detection_Resnet50_Final.pth")
        self.send(200 if ok else 503, "ok" if ok else "downloading model weights")

    def do_POST(self):
        if self.path != "/lipsync": return self.send(404, "not found")
        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type", "")})
        work = tempfile.mkdtemp()
        try:
            face, audio = form["face"], form["audio"]
            fpath = os.path.join(work, "face" + (os.path.splitext(face.filename)[1] or ".jpg")); open(fpath, "wb").write(face.file.read())
            apath = os.path.join(work, "audio.wav"); open(apath, "wb").write(audio.file.read())
            out = os.path.join(work, "out")
            cmd = ["python3", "inference.py", "--driven_audio", apath, "--source_image", fpath, "--result_dir", out, "--cpu",
                   "--still", "--preprocess", form.getfirst("preprocess", "crop"), "--size", SIZE, "--batch_size", "4"]
            r = subprocess.run(cmd, cwd="/sadtalker", capture_output=True, text=True, timeout=7200)
            vids = sorted(glob.glob(os.path.join(out, "*.mp4"))) or glob.glob(os.path.join(out, "**", "*.mp4"), recursive=True)
            if r.returncode != 0 or not vids:
                return self.send(500, "presenter render failed:\n" + (r.stderr or r.stdout)[-2500:])
            self.send(200, open(vids[0], "rb").read(), "video/mp4")
        except Exception as e:
            self.send(500, f"error: {e}")
        finally:
            shutil.rmtree(work, ignore_errors=True)


ThreadingHTTPServer(("0.0.0.0", 8090), Handler).serve_forever()
