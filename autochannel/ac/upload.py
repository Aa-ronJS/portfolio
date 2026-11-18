"""YouTube upload (Data API v3, free) and the one-time sign-in.

One Google Cloud app (YT_CLIENT_ID, YT_CLIENT_SECRET) serves every
channel. Each channel has its own sign-in, YT_REFRESH_TOKEN_<NAME> (e.g.
YT_REFRESH_TOKEN_AARON), made by `python -m ac youtube-auth <name>
client_secret.json` on your own computer, choosing that channel when
Google asks which account or brand account to use.

Two traps this module checks for rather than trusting:
  * An OAuth app left in "Testing" mode issues refresh tokens that die
    after 7 days. Publish the consent screen ("In production"); the
    sign-in then shows an "unverified app" warning, which is fine for an
    app only you use.
  * Google has at times locked uploads from unaudited API projects to
    private. After every upload we read the video back and say so loudly
    if the privacy isn't what was asked for.
"""
from __future__ import annotations

import datetime as dt
import os
import time
from pathlib import Path

# Asked for once at sign-in. force-ssl lets the optimiser swap titles and
# post comments; yt-analytics lets it read thumbnail click-through.
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.force-ssl",
          "https://www.googleapis.com/auth/yt-analytics.readonly"]


def token_var(cfg: dict) -> str:
    return "YT_REFRESH_TOKEN_" + cfg["_slug"].upper().replace("-", "_")


def _creds(cfg: dict):
    from google.oauth2.credentials import Credentials

    var = token_var(cfg)
    if not os.environ.get(var) and os.environ.get("YT_REFRESH_TOKEN"):
        var = "YT_REFRESH_TOKEN"  # the workflow hands each job only its own channel's token
    missing = [k for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", var) if not os.environ.get(k)]
    if missing:
        raise RuntimeError(f"missing {', '.join(missing)}; run `python -m ac youtube-auth {cfg['_slug']}` once")
    return Credentials(None, refresh_token=os.environ[var],
                       client_id=os.environ["YT_CLIENT_ID"], client_secret=os.environ["YT_CLIENT_SECRET"],
                       token_uri="https://oauth2.googleapis.com/token", scopes=SCOPES)


def authorise(cfg: dict, client_secret_json: Path) -> None:
    """Run once per channel on your own computer: opens a browser, prints the token."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_json), SCOPES)
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    from googleapiclient.discovery import build

    me = build("youtube", "v3", credentials=creds, cache_discovery=False).channels().list(
        part="snippet", mine=True).execute()["items"][0]["snippet"]["title"]
    print(f"\nSigned in as the YouTube channel: {me}")
    print(f"If that's not the channel for '{cfg['_slug']}', run this again and pick the other one.\n")
    print("GitHub repository secrets (the first two are shared by every channel):\n")
    print(f"YT_CLIENT_ID      {creds.client_id}")
    print(f"YT_CLIENT_SECRET  {creds.client_secret}")
    print(f"{token_var(cfg):<17} {creds.refresh_token}")


def _publish_at(hour: int | None) -> str | None:
    if hour is None:
        return None
    now = dt.datetime.now(dt.timezone.utc)
    at = now.replace(hour=int(hour), minute=0, second=0, microsecond=0)
    if at <= now + dt.timedelta(minutes=20):
        at += dt.timedelta(days=1)
    return at.isoformat().replace("+00:00", "Z")


def client(cfg: dict):
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=_creds(cfg), cache_discovery=False)


def set_thumbnail(yt, vid: str, image: Path) -> bool:
    """Custom thumbnails need a phone-verified channel; failing that, the
    video keeps YouTube's own frame rather than failing the post."""
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    try:
        yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(image), mimetype="image/jpeg")).execute()
        return True
    except HttpError as e:
        why = "verify the channel by phone (youtube.com/verify)" if e.resp.status == 403 else str(e)[:200]
        print(f"  !! thumbnail not set: {why}")
        return False


def upload(video: Path, ep: dict, cfg: dict, thumb: Path | None = None) -> str:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    p = cfg["publish"]
    yt = build("youtube", "v3", credentials=_creds(cfg), cache_discovery=False)
    title = ep["title"][:100]
    if cfg["format"]["kind"] == "short" and "#shorts" not in title.lower() and len(title) < 92:
        title += " #shorts"
    desc = (ep.get("description", "").strip() + "\n\n" + p.get("description_footer", "")).strip()
    tags = list(dict.fromkeys((ep.get("tags") or []) + (p.get("default_tags") or [])))
    publish_at = _publish_at(p.get("publish_hour_utc"))
    status = {
        "privacyStatus": "private" if publish_at else p.get("privacy", "public"),
        "selfDeclaredMadeForKids": bool(p.get("made_for_kids", False)),
        "containsSyntheticMedia": bool(p.get("synthetic_media", True)),
    }
    if publish_at:
        status["publishAt"] = publish_at
    body = {"snippet": {"title": title, "description": desc[:4900], "tags": tags[:30],
                        "categoryId": str(p.get("category_id", "27"))},
            "status": status}

    media = MediaFileUpload(str(video), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp, tries = None, 0
    while resp is None:  # resumable: a dropped connection resumes, not restarts
        try:
            st, resp = req.next_chunk()
            if st:
                print(f"  upload {int(st.progress() * 100)}%")
        except HttpError as e:
            if e.resp.status not in (500, 502, 503, 504) or tries >= 6:
                raise
            tries += 1
            time.sleep(2 ** tries)
        except (ConnectionError, TimeoutError, OSError):
            if tries >= 6:
                raise
            tries += 1
            time.sleep(2 ** tries)
    vid = resp["id"]

    got = yt.videos().list(part="status", id=vid).execute()["items"][0]["status"]
    want = status["privacyStatus"]
    if got.get("privacyStatus") != want:
        print(f"!! YouTube set this video to {got.get('privacyStatus')}, not {want}. Your API "
              f"project is probably unaudited; see README > 'Uploads stuck on private'.")
    if thumb is not None and thumb.exists():
        set_thumbnail(yt, vid, thumb)
    print(f"  uploaded https://youtu.be/{vid}" + (f" (goes live {publish_at})" if publish_at else ""))
    return vid
