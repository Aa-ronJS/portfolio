import os
import pathlib

import yaml

ENGINE_DIR = pathlib.Path(__file__).resolve().parent.parent
STATE_DIR = ENGINE_DIR / "state"
OUT_DIR = pathlib.Path(os.environ.get("ENGINE_OUT_DIR", ENGINE_DIR / "out"))


def load():
    with open(ENGINE_DIR / "config.yaml") as f:
        cfg = yaml.safe_load(f)
    STATE_DIR.mkdir(exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    return cfg


def active_markets(cfg):
    return [m for m in cfg["markets"] if m.get("active")]


def provider_key(cfg, name):
    """Return the provider's API key from the environment, or None (fallback mode)."""
    return os.environ.get(cfg["providers"][name]["env_key"]) or None
