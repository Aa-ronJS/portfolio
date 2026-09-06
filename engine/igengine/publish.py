"""Publish a rendered Reel through the official Instagram Graph API.

Requires two things per market in the environment:
  IG_ACCESS_TOKEN            long-lived token for the Meta app
  IG_USER_ID_<MARKET KEY>    the IG professional account id for that market
                             (e.g. IG_USER_ID_MONEY). IG_USER_ID alone works
                             as a single-account fallback.

Uses the resumable upload flow (rupload.facebook.com) so the video never
needs public hosting. Official API only — no scraping, no automation of
actions the API doesn't offer.
"""

import os
import time

import requests

GRAPH = "https://graph.facebook.com"
RUPLOAD = "https://rupload.facebook.com/ig-api-upload"


def credentials(cfg, market_key):
    token = os.environ.get(cfg["providers"]["instagram"]["env_key"])
    user_id = (os.environ.get(f"IG_USER_ID_{market_key.upper()}")
               or os.environ.get("IG_USER_ID"))
    if token and user_id:
        return token, user_id
    return None


def publish_reel(cfg, market_key, video_path, caption):
    creds = credentials(cfg, market_key)
    if not creds:
        return None
    token, user_id = creds
    ver = cfg["providers"]["instagram"]["api_version"]

    r = requests.post(
        f"{GRAPH}/{ver}/{user_id}/media",
        data={"media_type": "REELS", "upload_type": "resumable",
              "caption": caption, "share_to_feed": "true",
              "access_token": token},
        timeout=60)
    r.raise_for_status()
    container = r.json()["id"]

    size = os.path.getsize(video_path)
    with open(video_path, "rb") as f:
        up = requests.post(
            f"{RUPLOAD}/{ver}/{container}",
            headers={"Authorization": f"OAuth {token}",
                     "offset": "0", "file_size": str(size)},
            data=f, timeout=600)
    up.raise_for_status()

    for _ in range(60):  # up to ~5 minutes of processing
        status = requests.get(
            f"{GRAPH}/{ver}/{container}",
            params={"fields": "status_code", "access_token": token},
            timeout=60).json().get("status_code")
        if status == "FINISHED":
            break
        if status == "ERROR":
            raise RuntimeError(f"container {container} failed processing")
        time.sleep(5)
    else:
        raise RuntimeError(f"container {container} still processing; publish later")

    pub = requests.post(
        f"{GRAPH}/{ver}/{user_id}/media_publish",
        data={"creation_id": container, "access_token": token},
        timeout=60)
    pub.raise_for_status()
    return pub.json()["id"]


def media_insights(cfg, market_key, media_id):
    creds = credentials(cfg, market_key)
    if not creds:
        return None
    token, _ = creds
    ver = cfg["providers"]["instagram"]["api_version"]
    r = requests.get(
        f"{GRAPH}/{ver}/{media_id}/insights",
        params={"metric": "reach,plays,likes,comments,shares,saved,follows",
                "access_token": token},
        timeout=60)
    if not r.ok:  # older media or unavailable metrics — degrade quietly
        return None
    return {d["name"]: d["values"][0]["value"] for d in r.json().get("data", [])}
