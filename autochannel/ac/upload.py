"""YouTube upload (Data API v3, free) and the one-time sign-in.

Credentials come from three environment variables, set once as GitHub
secrets: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN. Get the refresh
token by running `python -m ac youtube-auth` on your own computer.

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

SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly"]


def _creds():
    from google.oauth2.credentials import Credentials

    missing = [k for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN") if not os.environ.get(k)]
    if missing:
        raise RuntimeError(f"missing {', '.join(missing)}; run `python -m ac youtube-auth` once")
    return Credentials(None, refresh_token=os.environ["YT_REFRESH_TOKEN"],
                       client_id=os.environ["YT_CLIENT_ID"], client_secret=os.environ["YT_CLIENT_SECRET"],
                       token_uri="https://oauth2.googleapis.com/token", scopes=SCOPES)


def authorise(client_secret_json: Path) -> None:
    """Run once on your own computer: opens a browser, prints the token."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_json), SCOPES)
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    print("\nAdd these three as GitHub repository secrets:\n")
    print(f"YT_CLIENT_ID      {creds.client_id}")
    print(f"YT_CLIENT_SECRET  {creds.client_secret}")
    print(f"YT_REFRESH_TOKEN  {creds.refresh_token}")


def _publish_at(hour: int | None) -> str | None:
    if hour is None:
        return None
    now = dt.datetime.now(dt.timezone.utc)
    at = now.replace(hour=int(hour), minute=0, second=0, microsecond=0)
    if at <= now + dt.timedelta(minutes=20):
        at += dt.timedelta(days=1)
    return at.isoformat().replace("+00:00", "Z")


def upload(video: Path, ep: dict, cfg: dict) -> str:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    p = cfg["publish"]
    yt = build("youtube", "v3", credentials=_creds(), cache_discovery=False)
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
    print(f"  uploaded https://youtu.be/{vid}" + (f" (goes live {publish_at})" if publish_at else ""))
    return vid
