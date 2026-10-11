"""YouTube: sign in once, upload with resume, schedule into the channel's
release calendar. Plain urllib — the OAuth2 refresh dance and the
resumable-upload protocol are small enough not to need Google's client
libraries.

Credentials come from the environment (YT_CLIENT_ID, YT_CLIENT_SECRET,
YT_REFRESH_TOKEN — the GitHub Action's secrets) or from the file `auth`
writes (~/.config/essay-channel/youtube.json).
"""

import datetime as dt
import hashlib
import http.server
import json
import os
import secrets
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
import zoneinfo

CRED_FILE = os.path.expanduser("~/.config/essay-channel/youtube.json")
SCOPES = ("https://www.googleapis.com/auth/youtube.upload "
          "https://www.googleapis.com/auth/youtube.readonly")
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/youtube/v3"
UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos"
CHUNK = 8 * 1024 * 1024
MIN_LEAD_MINUTES = 15
TITLE_MAX = 100
DESCRIPTION_MAX = 5000
TAGS_MAX = 500
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
FOOTAGE_SITES = {"pexels": "Pexels (pexels.com)", "pixabay": "Pixabay (pixabay.com)"}


class ApiError(Exception):
    def __init__(self, code, detail, url=""):
        super().__init__("YouTube API %s: %s" % (code or "network", detail[:800]))
        self.code = code
        self.detail = detail
        self.url = url


def marker_tag(key):
    """Stamped on every upload so the channel itself remembers which
    episode a video is, even if the ledger is lost."""
    return "ec-" + hashlib.sha1(key.encode()).hexdigest()[:10]


# ---------------------------------------------------------------- calendar

def next_slot(pub, after, now=None):
    tz = zoneinfo.ZoneInfo(pub["timezone"])
    now = now or dt.datetime.now(dt.timezone.utc)
    floor = max(after or now, now + dt.timedelta(minutes=MIN_LEAD_MINUTES))
    local = floor.astimezone(tz)
    hh, mm = pub["slots"]["_hm"]
    day = local.date()
    for _ in range(28):
        cand = dt.datetime.combine(day, dt.time(hh, mm), tzinfo=tz)
        if DAYS[cand.weekday()] in pub["slots"]["days"] and cand > local:
            return cand.astimezone(dt.timezone.utc)
        day += dt.timedelta(days=1)
    raise SystemExit("publish.slots.days leaves no day to publish on")


def rfc3339(d):
    return d.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_rfc3339(s):
    return dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=dt.timezone.utc)


def last_scheduled(led):
    times = [parse_rfc3339(v["publish_at"]) for v in led["videos"].values()
             if v.get("publish_at")]
    return max(times) if times else None


# ---------------------------------------------------------------- metadata

def build_metadata(cfg, ep, script, tl, music, broll):
    key = ep.slug
    pub = cfg["publish"]
    title = " ".join(script["title"].replace("<", "").replace(">", "").split())
    chapters = []
    for sec in tl["sections"]:
        if sec["index"] == 0:
            chapters.append("00:00 %s" % (sec["heading"] or "Intro"))
        else:
            chapters.append("%s %s" % (_mmss(sec["start"]), sec["heading"]))
    sources = ["%s — %s" % (s["title"], s["url"]) for s in script.get("sources", [])]
    credits = []
    if music and music.get("credit"):
        credits.append(music["credit"])
    site = FOOTAGE_SITES.get((broll or {}).get("provider"))
    if site:
        credits.append("Footage from %s." % site)
    description = pub["description"].format(
        summary=script["summary"].strip(), title=title,
        chapters="\n".join(chapters), sources="\n".join(sources) or "(none)",
        credits="\n".join(credits))
    if credits and "{credits}" not in pub["description"]:
        description += "\n\n" + "\n".join(credits)
    tags = [marker_tag(key)]
    for t in list(pub["tags"]) + list(script.get("tags") or []):
        t = str(t).strip()
        if t and t not in tags and len(t) <= 30:
            tags.append(t)
    while sum(len(t) for t in tags) + 2 * len(tags) > TAGS_MAX:
        tags.pop()
    return {"key": key, "title": title[:TITLE_MAX].rstrip(),
            "description": description.strip()[:DESCRIPTION_MAX],
            "tags": tags, "category": str(pub["category"]),
            "language": cfg["language"], "chapters": chapters}


def _mmss(t):
    t = int(t)
    if t >= 3600:
        return "%d:%02d:%02d" % (t // 3600, t % 3600 // 60, t % 60)
    return "%02d:%02d" % (t // 60, t % 60)


# ---------------------------------------------------------------- auth

class Credentials:
    def __init__(self, client_id, client_secret, refresh_token, token_url=TOKEN_URL):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.token_url = token_url
        self._access = None
        self._expires = 0

    @classmethod
    def load(cls):
        env = os.environ
        if env.get("YT_CLIENT_ID") and env.get("YT_CLIENT_SECRET") \
                and env.get("YT_REFRESH_TOKEN"):
            return cls(env["YT_CLIENT_ID"], env["YT_CLIENT_SECRET"],
                       env["YT_REFRESH_TOKEN"])
        if os.path.exists(CRED_FILE):
            with open(CRED_FILE) as f:
                d = json.load(f)
            return cls(d["client_id"], d["client_secret"], d["refresh_token"])
        return None

    def access_token(self):
        if self._access and time.time() < self._expires - 60:
            return self._access
        body = urllib.parse.urlencode({
            "client_id": self.client_id, "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token"}).encode()
        req = urllib.request.Request(self.token_url, data=body, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            raise ApiError(e.code, "token refresh failed: " +
                           e.read().decode(errors="replace"), self.token_url)
        self._access = d["access_token"]
        self._expires = time.time() + int(d.get("expires_in", 3600))
        return self._access


class _AuthHandler(http.server.BaseHTTPRequestHandler):
    got = None

    def do_GET(self):
        _AuthHandler.got = self.path
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<p style='font:20px sans-serif'>Signed in. "
                         b"You can close this tab.</p>")

    def log_message(self, *a):
        pass


def _stdin_ready():
    try:
        import select
        return bool(select.select([sys.stdin], [], [], 0)[0])
    except Exception:
        return False


def auth(client_id=None, client_secret=None):
    """One-off sign-in with an OAuth client of type "Desktop app" (Google
    Cloud project with the YouTube Data API v3 enabled). The redirect is
    caught on localhost; if the browser is elsewhere, paste the URL it
    lands on."""
    client_id = client_id or os.environ.get("YT_CLIENT_ID") \
        or input("OAuth client id: ").strip()
    client_secret = client_secret or os.environ.get("YT_CLIENT_SECRET") \
        or input("OAuth client secret: ").strip()
    srv = http.server.HTTPServer(("127.0.0.1", 0), _AuthHandler)
    redirect = "http://127.0.0.1:%d/" % srv.server_address[1]
    state = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": redirect,
        "response_type": "code", "scope": SCOPES, "access_type": "offline",
        "prompt": "consent", "state": state})
    print("\nOpen this in the browser signed in to the channel:\n\n  %s\n" % url)
    try:
        webbrowser.open(url)
    except Exception:
        pass
    print("Waiting for Google to send the browser back to %s ...\n(if that "
          "browser is on another machine, paste the URL it lands on here)"
          % redirect)
    _AuthHandler.got = None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    code = None
    try:
        while code is None:
            if _AuthHandler.got:
                q = urllib.parse.parse_qs(urllib.parse.urlparse(_AuthHandler.got).query)
                if q.get("state", [None])[0] != state:
                    raise SystemExit("state mismatch; try again")
                code = q["code"][0]
            elif _stdin_ready():
                pasted = sys.stdin.readline().strip()
                if pasted:
                    q = urllib.parse.parse_qs(urllib.parse.urlparse(pasted).query)
                    code = q.get("code", [pasted])[0]
            else:
                time.sleep(0.2)
    except KeyboardInterrupt:
        raise SystemExit("cancelled")
    finally:
        srv.shutdown()
    body = urllib.parse.urlencode({
        "code": code, "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": redirect, "grant_type": "authorization_code"}).encode()
    with urllib.request.urlopen(urllib.request.Request(
            TOKEN_URL, data=body, method="POST"), timeout=60) as r:
        tok = json.load(r)
    if "refresh_token" not in tok:
        raise SystemExit("Google returned no refresh token; remove the app at "
                         "myaccount.google.com/permissions and run auth again")
    os.makedirs(os.path.dirname(CRED_FILE), exist_ok=True)
    with open(CRED_FILE, "w") as f:
        json.dump({"client_id": client_id, "client_secret": client_secret,
                   "refresh_token": tok["refresh_token"]}, f, indent=2)
    os.chmod(CRED_FILE, 0o600)
    ch = YouTube(Credentials(client_id, client_secret, tok["refresh_token"])).my_channel()
    print("\nSigned in as channel: %s\nSaved to %s\n" % (ch["title"], CRED_FILE))
    print("For the GitHub Action, add these repository secrets:\n"
          "  YT_CLIENT_ID      %s\n  YT_CLIENT_SECRET  (the secret)\n"
          "  YT_REFRESH_TOKEN  %s\n" % (client_id, tok["refresh_token"]))


# ---------------------------------------------------------------- api

class YouTube:
    def __init__(self, creds, api=API, upload=UPLOAD):
        self.creds = creds
        self.api = api
        self.upload_url = upload

    def call(self, method, url, params=None, body=None, headers=None,
             raw=None, tries=5):
        if params:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
        data = raw if raw is not None else (
            json.dumps(body).encode() if body is not None else None)
        last = None
        for attempt in range(tries):
            h = {"Authorization": "Bearer " + self.creds.access_token()}
            if body is not None:
                h["Content-Type"] = "application/json; charset=UTF-8"
            h.update(headers or {})
            req = urllib.request.Request(url, data=data, method=method, headers=h)
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    text = r.read()
                    return (json.loads(text) if text.strip() else {}), r.headers
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")
                if e.code == 401 and attempt == 0:
                    self.creds._access = None
                    last = e
                    continue
                if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                    last = e
                    time.sleep(2 ** attempt)
                    continue
                raise ApiError(e.code, detail, url) from None
            except (urllib.error.URLError, socket.timeout, ConnectionError,
                    TimeoutError) as e:
                last = e
                if attempt < tries - 1:
                    time.sleep(2 ** attempt)
                    continue
        raise ApiError(0, str(last), url)

    def my_channel(self):
        d, _ = self.call("GET", self.api + "/channels",
                         {"part": "snippet,contentDetails", "mine": "true"})
        items = d.get("items") or []
        if not items:
            raise ApiError(404, "this Google account has no YouTube channel")
        c = items[0]
        return {"id": c["id"], "title": c["snippet"]["title"],
                "uploads": c["contentDetails"]["relatedPlaylists"]["uploads"]}

    def uploaded_markers(self, max_pages=20):
        """{marker tag: video id} across the channel's uploads."""
        ch = self.my_channel()
        ids, token = [], None
        for _ in range(max_pages):
            params = {"part": "contentDetails", "playlistId": ch["uploads"],
                      "maxResults": 50}
            if token:
                params["pageToken"] = token
            d, _ = self.call("GET", self.api + "/playlistItems", params)
            ids += [i["contentDetails"]["videoId"] for i in d.get("items", [])]
            token = d.get("nextPageToken")
            if not token:
                break
        found = {}
        for i in range(0, len(ids), 50):
            d, _ = self.call("GET", self.api + "/videos",
                             {"part": "snippet", "id": ",".join(ids[i:i + 50])})
            for v in d.get("items", []):
                for t in v["snippet"].get("tags") or []:
                    if t.startswith("ec-"):
                        found[t] = v["id"]
        return found

    def video_status(self, ids):
        out = {}
        for i in range(0, len(ids), 50):
            d, _ = self.call("GET", self.api + "/videos",
                             {"part": "status,snippet", "id": ",".join(ids[i:i + 50])})
            for v in d.get("items", []):
                out[v["id"]] = {"privacy": v["status"]["privacyStatus"],
                                "publish_at": v["status"].get("publishAt"),
                                "title": v["snippet"]["title"]}
        return out

    def insert_video(self, mp4, meta, publish_at, log=print):
        size = os.path.getsize(mp4)
        body = {"snippet": {"title": meta["title"],
                            "description": meta["description"],
                            "tags": meta["tags"],
                            "categoryId": meta["category"],
                            "defaultLanguage": meta["language"]},
                "status": {"privacyStatus": "private",
                           "publishAt": rfc3339(publish_at),
                           "selfDeclaredMadeForKids": False}}
        _, headers = self.call(
            "POST", self.upload_url,
            {"uploadType": "resumable", "part": "snippet,status"},
            body=body, headers={"X-Upload-Content-Type": "video/mp4",
                                "X-Upload-Content-Length": str(size)})
        session = headers.get("Location")
        if not session:
            raise ApiError(0, "no upload session URL", self.upload_url)
        return self._send_bytes(session, mp4, size, log)

    def _send_bytes(self, session, mp4, size, log, max_failures=10):
        sent, failures = 0, 0
        with open(mp4, "rb") as f:
            while True:
                f.seek(sent)
                chunk = f.read(CHUNK)
                end = sent + len(chunk) - 1
                req = urllib.request.Request(session, data=chunk, method="PUT", headers={
                    "Content-Type": "video/mp4",
                    "Content-Length": str(len(chunk)),
                    "Content-Range": "bytes %d-%d/%d" % (sent, end, size)})
                try:
                    with urllib.request.urlopen(req, timeout=300) as r:
                        d = json.load(r)
                        log("uploaded %d/%d bytes" % (size, size))
                        return d["id"]
                except urllib.error.HTTPError as e:
                    if e.code == 308:
                        sent = _range_end(e.headers.get("Range"))
                        failures = 0
                        log("uploaded %d/%d bytes" % (sent, size))
                        continue
                    if e.code not in (429, 500, 502, 503, 504):
                        raise ApiError(e.code, e.read().decode(errors="replace"),
                                       session) from None
                    failures += 1
                except (urllib.error.URLError, socket.timeout, ConnectionError,
                        TimeoutError):
                    failures += 1
                if failures > max_failures:
                    raise ApiError(0, "upload kept failing after %d bytes" % sent,
                                   session)
                time.sleep(min(60, 2 ** failures))
                done, sent = self._resume_point(session, size, sent)
                if done is not None:
                    return done

    def _resume_point(self, session, size, sent):
        """Ask the session how much it has. Returns (video id if the upload
        is in fact complete, else None, next byte to send)."""
        req = urllib.request.Request(session, data=b"", method="PUT", headers={
            "Content-Length": "0", "Content-Range": "bytes */%d" % size})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)["id"], size
        except urllib.error.HTTPError as e:
            if e.code == 308:
                return None, _range_end(e.headers.get("Range"))
            if e.code in (429, 500, 502, 503, 504):
                return None, sent
            raise ApiError(e.code, e.read().decode(errors="replace"), session) from None
        except (urllib.error.URLError, socket.timeout, ConnectionError, TimeoutError):
            return None, sent

    def set_thumbnail(self, video_id, jpg):
        with open(jpg, "rb") as f:
            data = f.read()
        self.call("POST", self.upload_url.replace("/videos", "/thumbnails/set"),
                  {"videoId": video_id}, raw=data,
                  headers={"Content-Type": "image/jpeg",
                           "Content-Length": str(len(data))})


def _range_end(rng):
    if not rng:
        return 0
    return int(rng.split("-")[-1]) + 1
