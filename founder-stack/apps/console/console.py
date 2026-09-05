#!/usr/bin/env python3
"""Founder Stack Console — the hub's control panel, a small web UI over stackctl.

Zero dependencies (stdlib only). Runs inside the console container with the
stack directory mounted at STACK_ROOT and the docker socket available, so it
runs stackctl exactly as an admin would in a shell. Auth: HTTP Basic with
ADMIN_USER / ADMIN_PASSWORD from .env.
"""
import base64, hmac, html, json, os, re, subprocess, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.environ.get("STACK_ROOT") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STACKCTL = os.path.join(ROOT, "stackctl")
ENVFILE = os.path.join(ROOT, ".env")

# verbs the UI may run, and how many args they accept (None = any number)
ALLOWED = {"deploy": None, "bootstrap": 0, "dns": None, "list": 0, "status": 0, "up": None, "down": None,
           "restart": None, "update": None, "backup": 0, "restore": 1, "sso": 1, "user": None,
           "tunnel": 1, "brand": 1, "logs": 1}
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
GLOBAL_EDITABLE = {"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "BRAND_NAME",
                   "BRAND_COLOR", "BRAND_LOGO_URL", "CF_TUNNEL_TOKEN", "TZ", "CF_API_TOKEN", "DUCKDNS_TOKEN"}
MAIL_APPS = ["invoiceninja", "listmonk", "chatwoot", "documenso", "ghost", "calcom", "formbricks",
             "docmost", "vaultwarden", "authentik", "rocketchat", "espocrm"]

# ---- catalogue: what each app is, for the wizard and the Apps tab ----
# label, group, description, core. Named by job — never by the upstream project.
APPS = {
    "homepage":        ("Hub", "Operations", "Start page with every app", True),
    "console":         ("Console", "Operations", "This control panel", True),
    "authentik":       ("Sign-on", "Operations", "One login for the whole team", True),
    "vaultwarden":     ("Passwords", "Operations", "Password manager for the team", False),
    "uptime-kuma":     ("Status page", "Operations", "Uptime monitoring & public status page", False),
    "activepieces":    ("Automations", "Operations", "Connect apps and automate workflows", False),
    "twenty":          ("CRM", "Customers", "Contacts, deals, pipeline", False),
    "espocrm":         ("CRM", "Customers", "Contacts, deals, pipeline", False),
    "chatwoot":        ("Support desk", "Customers", "Helpdesk inbox & website live chat", False),
    "calcom":          ("Booking calendar", "Customers", "Let customers book time with you", False),
    "easyappointments": ("Booking calendar", "Customers", "Let customers book time with you", False),
    "formbricks":      ("Forms", "Customers", "Surveys & intake forms", False),
    "invoiceninja":    ("Invoices", "Money", "Invoices, quotes, payments", False),
    "documenso":       ("Signatures", "Money", "E-sign contracts and agreements", False),
    "listmonk":        ("Newsletter", "Marketing", "Email campaigns & subscriber lists", False),
    "ghost":           ("Blog", "Marketing", "Website, blog, paid newsletter", False),
    "umami":           ("Analytics", "Marketing", "Privacy-friendly website analytics", False),
    "wordpress":       ("Website", "Marketing", "Your public website — pages, blog, and an online shop if you want one", False),
    "shlink":          ("Short links", "Marketing", "Branded short URLs with click stats", False),
    "mattermost":      ("Team chat", "Team", "Channels, direct messages, calls", False),
    "rocketchat":      ("Team chat", "Team", "Channels, direct messages, calls", False),
    "vikunja":         ("Tasks", "Team", "Projects, boards & to-dos", False),
    "docmost":         ("Docs", "Team", "Wiki & shared documents", False),
    "nextcloud":       ("Files", "Team", "File storage, sharing & sync", False),
}
ARM_PAIRS = {"twenty": "espocrm", "mattermost": "rocketchat", "calcom": "easyappointments"}

# ---- per-app granular settings: .env keys the compose files read ----
B = "bool"
APP_SETTINGS = {
    "vikunja":      [("VIKUNJA_REGISTRATION_OPEN", "Allow anyone to register", B, "Off = only people you add from People")],
    "vaultwarden":  [("VAULTWARDEN_SIGNUPS_ALLOWED", "Allow sign-ups", B, "Turn off once your team has registered")],
    "activepieces": [("ACTIVEPIECES_SIGNUP_OPEN", "Allow sign-ups", B, "Needed on for People → Add; turn off afterwards if you like")],
    "chatwoot":     [("CHATWOOT_ACCOUNT_SIGNUP", "Allow new account sign-ups", B, "Off = agents are added from People")],
    "mattermost":   [("MATTERMOST_OPEN_SERVER", "Anyone can create an account", B, "Off = invite/People only")],
    "documenso":    [("DOCUMENSO_DISABLE_SIGNUP", "Disable public sign-ups", B, "On = only SSO or People-created accounts")],
    "calcom":       [("CALCOM_DISABLE_SIGNUP", "Disable public sign-ups", B, "Keep off while adding people from People (it uses the signup API)")],
    "twenty":       [("TWENTY_DISABLE_SIGNUP", "Disable public sign-ups", B, "Keep off while adding people from People (invite-hash join)")],
    "rocketchat":   [("ROCKETCHAT_REGISTRATION", "Registration", "select:Public,Disabled,Secret URL", "Who can register directly")],
    "wordpress":    [("WORDPRESS_WOOCOMMERCE", "Online shop (WooCommerce)", B, "Installs and activates the shop on your website")],
}
ENV_PREFIX = {a: [a.upper().replace("-", "_") + "_"] for a in APPS}
ENV_PREFIX["uptime-kuma"] = ["UPTIME_KUMA_"]
ENV_PREFIX["authentik"] = ["AUTHENTIK_", "SSO_"]
ENV_PREFIX["homepage"] = ["BRAND_"]
SECRET_RE = re.compile(r"(PASSWORD|SECRET|TOKEN|KEY|_PASS)", re.I)


def read_env():
    env = {}
    try:
        for line in open(ENVFILE):
            line = line.rstrip("\n")
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1); env[k] = v
    except FileNotFoundError:
        pass
    return env


def set_env(updates):
    lines = open(ENVFILE).read().split("\n"); seen = set()
    for i, line in enumerate(lines):
        if "=" in line and not line.startswith("#"):
            k = line.split("=", 1)[0]
            if k in updates:
                lines[i] = f"{k}={updates[k]}"; seen.add(k)
    for k, v in updates.items():
        if k not in seen:
            lines.append(f"{k}={v}")
    open(ENVFILE, "w").write("\n".join(lines).rstrip("\n") + "\n")


def run(args):
    env = dict(os.environ, STACKCTL_NO_FOLLOW="1", TERM="dumb")
    p = subprocess.Popen([STACKCTL] + args, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         env=env, text=True, bufsize=1)
    for line in p.stdout:
        yield re.sub(r"\x1b\[[0-9;]*m", "", line)
    p.wait()
    yield f"\n[exit {p.returncode}]\n"


def is_arm():
    return os.uname().machine in ("aarch64", "arm64")


def default_apps():
    """The apps that fit this server (one side of each amd64/ARM pair)."""
    out = []
    for a in APPS:
        if is_arm() and a in ARM_PAIRS: continue
        if not is_arm() and a in ARM_PAIRS.values(): continue
        out.append(a)
    return out


def state():
    env = read_env(); apps = []
    out = "".join(run(["status"]))
    running = {}
    for line in out.splitlines()[1:]:
        m = re.match(r"^(\S+)\s+(running|stopped)\s+(\S+)\s*(.*)$", line)
        if m: running[m[1]] = (m[2], m[3], m[4].strip())
    # the apps that fit this server, plus any alternative that is actually running
    shown = default_apps() + [a for a in APPS if a not in default_apps() and running.get(a, ("stopped",))[0] == "running"]
    for a in shown:
        st = running.get(a, ("stopped", f"https://{a}.{env.get('BASE_DOMAIN','')}", ""))
        label, group, desc, core = APPS[a]
        apps.append({"name": a, "label": label, "group": group, "desc": desc, "core": core,
                     "state": st[0], "url": st[1], "tag": st[2], "configurable": a in APP_SETTINGS})
    bdir = os.path.join(ROOT, "backups")
    backups = sorted(os.listdir(bdir), reverse=True)[:10] if os.path.isdir(bdir) else []
    return {"domain": env.get("BASE_DOMAIN", ""), "arch": os.uname().machine, "apps": apps,
            "sso": env.get("SSO_ENABLED", "false") == "true",
            "smtp": {k: env.get(k, "") for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_FROM")},
            "smtp_password_set": bool(env.get("SMTP_PASSWORD")),
            "brand": {"name": env.get("BRAND_NAME", "Founder Stack"), "color": env.get("BRAND_COLOR", "#4f46e5"),
                      "logo_url": env.get("BRAND_LOGO_URL", "")},
            "tunnel_configured": bool(env.get("CF_TUNNEL_TOKEN")), "tz": env.get("TZ", "UTC"),
            "backups": backups, "admin_email": env.get("ADMIN_EMAIL", "")}


def app_config(name):
    env = read_env()
    settings = []
    for key, label, typ, helptext in APP_SETTINGS.get(name, []):
        settings.append({"key": key, "label": label, "type": typ, "help": helptext, "value": env.get(key, "")})
    raw = []
    for k, v in env.items():
        if any(k.startswith(p) for p in ENV_PREFIX.get(name, [])) and k not in {s["key"] for s in settings}:
            raw.append({"key": k, "value": ("•" * 10 if SECRET_RE.search(k) and v else v), "secret": bool(SECRET_RE.search(k))})
    return {"name": name, "label": APPS[name][0], "settings": settings, "raw": raw}


# ---- the conversational wizard: answers -> plan (deterministic rules) ----
def wizard_plan(a):
    team = a.get("team", "solo")
    kind = a.get("kind", "other")
    solo = team == "solo"
    yes = lambda k, default: a.get(k, "yes" if default else "no") == "yes"
    want = {"homepage", "console", "authentik", "vaultwarden", "uptime-kuma", "activepieces", "nextcloud", "vikunja"}
    if yes("crm", kind in ("consulting", "saas", "shop", "other")): want.add("twenty")
    if yes("bookings", kind in ("consulting", "local")): want.add("calcom")
    if yes("invoices", kind in ("consulting", "local", "other")): want.add("invoiceninja")
    if yes("support", kind in ("saas", "shop")): want.add("chatwoot")
    if yes("contracts", kind in ("consulting",)): want.add("documenso")
    if yes("forms", kind in ("consulting", "nonprofit", "saas")): want.add("formbricks")
    if yes("newsletter", kind in ("creator", "nonprofit", "shop")): want.update(["listmonk", "ghost"])
    if yes("analytics", True): want.add("umami")
    if yes("website", True): want.add("wordpress")
    if yes("links", kind in ("creator", "shop")): want.add("shlink")
    if not solo: want.update(["docmost", "mattermost"])
    # swap in ARM builds where needed
    apps = []
    for x in APPS:
        if x not in want: continue
        if is_arm() and x in ARM_PAIRS: x = ARM_PAIRS[x]
        apps.append(x)
    # security posture: closed sign-ups everywhere people are added from the console
    env = {"BRAND_NAME": a.get("name") or "Founder Stack", "BRAND_COLOR": a.get("color") or "#4f46e5",
           "VIKUNJA_REGISTRATION_OPEN": "false", "CHATWOOT_ACCOUNT_SIGNUP": "false", "MATTERMOST_OPEN_SERVER": "false",
           "DOCUMENSO_DISABLE_SIGNUP": "true", "ROCKETCHAT_REGISTRATION": "Disabled",
           "VAULTWARDEN_SIGNUPS_ALLOWED": "true", "ACTIVEPIECES_SIGNUP_OPEN": "true", "CALCOM_DISABLE_SIGNUP": "false",
           "TWENTY_DISABLE_SIGNUP": "false",
           "WORDPRESS_WOOCOMMERCE": "true" if (kind == "shop" and "wordpress" in apps) else "false"}
    if a.get("smtp_host"):
        env.update({"SMTP_HOST": a["smtp_host"], "SMTP_PORT": a.get("smtp_port") or "587",
                    "SMTP_USER": a.get("smtp_user", ""), "SMTP_PASSWORD": a.get("smtp_password", "")})
    if a.get("tz"): env["TZ"] = a["tz"]
    kinds = {"consulting": "consulting", "local": "local services", "shop": "online shop", "saas": "software",
             "creator": "creator", "nonprofit": "nonprofit", "other": ""}
    notes = [f"{len(apps)} apps for a {'solo' if solo else 'team'} {kinds.get(kind, kind)} business".replace("  ", " "),
             "Sign-ups closed everywhere you add people from the console; SSO on; brand applied",
             "Email relay: " + ("configured" if a.get("smtp_host") else "not yet — invites/invoices won't send until you add one in Settings")]
    return {"apps": apps, "env": env, "notes": notes}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "FounderStackConsole/2"

    def log_message(self, fmt, *a):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))

    def authed(self):
        env = read_env(); hdr = self.headers.get("Authorization", "")
        if hdr.startswith("Basic "):
            try: user, pw = base64.b64decode(hdr[6:]).decode().split(":", 1)
            except Exception: return False
            return hmac.compare_digest(user, env.get("ADMIN_USER", "admin")) and hmac.compare_digest(pw, env.get("ADMIN_PASSWORD", ""))
        return False

    def deny(self):
        self.send_response(401); self.send_header("WWW-Authenticate", 'Basic realm="Founder Stack Console"')
        self.send_header("Content-Length", "0"); self.send_header("Connection", "close"); self.end_headers()
        self.close_connection = True

    def send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(data)

    def stream(self, lines):
        self.send_response(200); self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Transfer-Encoding", "chunked"); self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff"); self.end_headers()
        for line in lines:
            b = line.encode(); self.wfile.write(b"%x\r\n%s\r\n" % (len(b), b)); self.wfile.flush()
        self.wfile.write(b"0\r\n\r\n")

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/brand/logo.svg":
            p = os.path.join(ROOT, "brand", "logo.svg")
            return self.send(200, open(p, "rb").read(), "image/svg+xml") if os.path.exists(p) else self.send(404, "no logo", "text/plain")
        if path == "/healthz": return self.send(200, "ok", "text/plain")
        if not self.authed(): return self.deny()
        if path == "/":
            env = read_env()
            return self.send(200, PAGE.replace("__BRAND__", html.escape(env.get("BRAND_NAME", "Founder Stack")))
                             .replace("__COLOR__", html.escape(env.get("BRAND_COLOR", "#4f46e5"))))
        if path == "/api/state": return self.send(200, json.dumps(state()), "application/json")
        m = re.match(r"^/api/app/([a-z0-9-]+)$", path)
        if m and m[1] in APPS: return self.send(200, json.dumps(app_config(m[1])), "application/json")
        self.send(404, "not found", "text/plain")

    def do_POST(self):
        path = urlparse(self.path).path
        # always drain the body first: on a keep-alive connection an unread body
        # would be parsed as the next request line
        try: body = self.body_json()
        except Exception: body = None
        if not self.authed(): return self.deny()
        if body is None: return self.send(400, "bad json", "text/plain")

        if path == "/api/run":
            args = [str(a) for a in body.get("args", [])]
            if not args or args[0] not in ALLOWED: return self.send(400, "command not allowed", "text/plain")
            verb, rest = args[0], args[1:]; limit = ALLOWED[verb]
            if limit is not None and len(rest) != limit: return self.send(400, "bad arguments", "text/plain")
            for i, a in enumerate(rest):
                if verb == "user": ok = (i == 0 and a in ("add", "passwd", "rm")) or (i == 1 and EMAIL_RE.match(a)) or (i == 2)
                elif verb == "restore": ok = NAME_RE.match(a) is not None
                elif verb in ("sso", "tunnel", "brand"): ok = a in ("on", "off", "up", "down", "apply", "show")
                elif verb == "dns": ok = a in ("ip", "check", "cloudflare", "duckdns", "up", "down")
                else: ok = a == "--all" or (NAME_RE.match(a) is not None and a in APPS)
                if not ok: return self.send(400, "bad arguments", "text/plain")
            if verb == "restore": rest = [os.path.join(ROOT, "backups", rest[0])]
            return self.stream(run([verb] + rest))

        if path == "/api/env":
            updates = {k: str(v) for k, v in body.get("set", {}).items() if k in GLOBAL_EDITABLE}
            if not self._valid(updates): return self.send(400, "bad value", "text/plain")
            if updates: set_env(updates)
            apply = body.get("apply")
            def lines():
                yield f"Saved: {', '.join(updates) or 'nothing'}\n"
                if apply == "smtp":
                    running = [a["name"] for a in state()["apps"] if a["state"] == "running" and a["name"] in MAIL_APPS]
                    if running: yield f"Re-applying mail settings to: {' '.join(running)}\n"; yield from run(["up"] + running)
                elif apply == "brand": yield from run(["brand", "apply"])
                elif apply == "cloudflare": yield from run(["dns", "cloudflare"])
                elif apply == "duckdns": yield from run(["dns", "duckdns", "up"])
            return self.stream(lines())

        m = re.match(r"^/api/app/([a-z0-9-]+)$", path)
        if m and m[1] in APPS:
            name = m[1]
            allowed = {k for k, *_ in APP_SETTINGS.get(name, [])} | {r["key"] for r in app_config(name)["raw"]}
            updates = {k: str(v) for k, v in body.get("set", {}).items() if k in allowed and not str(v).startswith("••")}
            if not self._valid(updates): return self.send(400, "bad value", "text/plain")
            if updates: set_env(updates)
            def lines():
                yield f"Saved {len(updates)} setting(s) for {name}.\n"
                if body.get("reup", True) and updates:
                    yield f"Re-applying {name}...\n"; yield from run(["up", name])
            return self.stream(lines())

        if path == "/api/domain/check":
            name = str(body.get("name", "")).strip().lower()
            if not re.match(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$", name): return self.send(400, "bad domain", "text/plain")
            r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "10", f"https://rdap.org/domain/{name}"],
                               capture_output=True, text=True)
            code = r.stdout.strip()
            status = "available" if code == "404" else "taken" if code == "200" else "unknown"
            return self.send(200, json.dumps({"name": name, "status": status}), "application/json")
        if path == "/api/wizard/plan":
            return self.send(200, json.dumps(wizard_plan(body.get("answers", {}))), "application/json")
        if path == "/api/wizard/apply":
            plan = wizard_plan(body.get("answers", {}))
            set_env(plan["env"])
            def lines():
                yield "Saved your answers: " + ", ".join(plan["env"].keys()) + "\n\n"
                yield from run(["deploy"] + plan["apps"])
            return self.stream(lines())
        self.send(404, "not found", "text/plain")

    @staticmethod
    def _valid(updates):
        for k, v in updates.items():
            if "\n" in v: return False
            if k == "BRAND_COLOR" and not re.match(r"^#[0-9a-fA-F]{6}$", v): return False
        return True


PAGE = r"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__BRAND__ · Console</title>
<style>
:root{--accent:__COLOR__;--bg:#f6f7fb;--panel:#ffffff;--panel2:#f1f4f9;--text:#0f172a;--muted:#64748b;--ok:#16a34a;--bad:#dc2626;--border:#e3e8ef;--shadow:0 1px 2px rgba(15,23,42,.04),0 8px 24px -12px rgba(15,23,42,.12)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{display:flex;align-items:center;gap:14px;padding:14px 26px;border-bottom:1px solid var(--border);background:var(--panel)}
header img{width:34px;height:34px;border-radius:9px}header h1{font-size:17px;margin:0;font-weight:650}header .sub{color:var(--muted);font-size:12px;font-weight:500}
header a.hub{margin-left:auto;color:var(--muted);text-decoration:none;font-weight:500}header a.hub:hover{color:var(--accent)}
nav{display:flex;gap:2px;padding:8px 26px 0;border-bottom:1px solid var(--border);background:var(--panel)}
nav button{background:none;border:0;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;font:inherit;font-weight:500}
nav button.on{color:var(--text);border-color:var(--accent)}
main{display:grid;grid-template-columns:1fr 440px;gap:20px;padding:20px 26px;max-width:1440px}
@media(max-width:1040px){main{grid-template-columns:1fr}}
section{display:none}section.on{display:block}
.card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:var(--shadow)}
.card h2{margin:0 0 8px;font-size:15px;font-weight:650}table{width:100%;border-collapse:collapse}td,th{padding:9px 6px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}
th{color:var(--muted);font-weight:500;font-size:12px}tr:last-child td{border-bottom:0}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;background:#cbd5e1}.dot.up{background:var(--ok)}
.tag{color:var(--muted);font-size:12px}a{color:var(--accent)}
button.b{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:6px 11px;cursor:pointer;font:inherit;font-size:13px;margin:2px;font-weight:500}
button.b:hover{border-color:var(--accent);color:var(--accent)}button.b.p{background:var(--accent);border-color:var(--accent);color:#fff}button.b.p:hover{color:#fff;filter:brightness(1.07)}
button.b.big{font-size:15px;padding:11px 20px;border-radius:11px}
input,select,textarea{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:8px 11px;font:inherit;width:100%}
input:focus,select:focus{outline:2px solid color-mix(in srgb,var(--accent) 35%,transparent);border-color:var(--accent)}
label{display:block;color:var(--muted);font-size:12px;margin:10px 0 4px;font-weight:500}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
pre#out{background:#0b1220;color:#dbe4f0;border:1px solid var(--border);border-radius:14px;padding:14px;min-height:340px;max-height:78vh;overflow:auto;white-space:pre-wrap;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;background:var(--panel2);color:var(--muted);font-weight:500}.pill.on{background:#dcfce7;color:#15803d}
.hint{color:var(--muted);font-size:12.5px}.busy{opacity:.6;pointer-events:none}
.hero{border-color:color-mix(in srgb,var(--accent) 40%,var(--border));background:linear-gradient(135deg,#fff,color-mix(in srgb,var(--accent) 6%,#fff))}
.group{margin-top:10px}.group h3{margin:12px 0 4px;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600}
.app{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid var(--border)}
.app:last-child{border-bottom:0}.app input{width:18px;height:18px;margin:0;accent-color:var(--accent)}.app .n{font-weight:600}.app .d{color:var(--muted);font-size:12px}
.chat{display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto;padding:4px 2px}
.msg{max-width:88%;padding:10px 14px;border-radius:14px;line-height:1.45}.msg.q{background:var(--panel2);align-self:flex-start;border-bottom-left-radius:4px}
.msg.a{background:var(--accent);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.choices{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.choices button{background:var(--panel);border:1px solid var(--border);border-radius:999px;padding:7px 14px;cursor:pointer;font:inherit}
.choices button:hover{border-color:var(--accent);color:var(--accent)}.plan li{margin:4px 0}
.drawer{border-left:3px solid var(--accent)}
.switch{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}.switch:last-child{border-bottom:0}
.switch select{width:auto}.switch input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent)}
</style></head><body>
<header><img src="/brand/logo.svg" alt=""><div><h1>__BRAND__ <span class="sub">console</span></h1><div class="sub" id="dom"></div></div><a class="hub" id="hublink" href="#">Open the hub →</a></header>
<nav><button data-t="setup">Set up</button><button data-t="apps">Apps</button><button data-t="domain">Domain &amp; DNS</button><button data-t="people">People</button><button data-t="signon">Sign-on</button><button data-t="backups">Backups</button><button data-t="settings">Settings</button></nav>
<main><div>

<section id="setup"><div class="card hero"><h2 style="font-size:18px">Let's set up your stack</h2><p class="hint" style="margin:0 0 10px">Answer a few questions and I'll pick the right apps, lock down sign-ups, apply your brand and deploy — one click at the end. You can change anything later under Apps.</p>
<div class="chat" id="chat"></div><div id="chatin"></div></div></section>

<section id="apps"><div class="card hero"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="flex:1"><h2 style="font-size:18px">Deploy</h2><p class="hint" style="margin:0">Tick what you want, click once. Deploy starts the apps, runs their first-time setup, turns on single sign-on and applies your brand. Re-run any time.</p></div>
<button class="b big p" onclick="deploySelected()">Deploy selected</button></div>
<div style="margin-top:12px"><button class="b" onclick="selAll(true)">Select all</button> <button class="b" onclick="selAll(false)">Select none</button> <button class="b" onclick="selRunning()">Select running</button> <span class="hint" id="selsum"></span></div></div>
<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Apps <span class="tag" id="arch"></span></h2><div><button class="b" onclick="run(['update'])">Update all</button> <button class="b" onclick="load()">Refresh</button></div></div>
<div id="applist"></div></div>
<div class="card drawer" id="cfg" hidden></div></section>

<section id="domain">
<div class="card"><h2>Your domain <span class="tag" id="dom2"></span></h2><p class="hint">Every app lives on a subdomain of it, and your website on the bare name. All of them need to point at this server — one wildcard record does it.</p>
<div style="margin:8px 0"><button class="b p" onclick="run(['dns','check'])">Check my DNS</button> <span class="hint">shows the records needed and whether the internet sees them yet</span></div></div>
<div class="card"><h2>Set the records for me</h2>
<label>Domain on Cloudflare (free plan) — API token with Zone → DNS → Edit</label><input id="cf_api" type="password" placeholder="paste token, then click">
<div style="margin:8px 0 14px"><button class="b p" onclick="v('cf_api')&&saveEnv({CF_API_TOKEN:v('cf_api')},'cloudflare')">Create records on Cloudflare</button></div>
<label>Free DuckDNS name (yourbiz.duckdns.org) — token from duckdns.org</label><input id="dd_tok" type="password" placeholder="paste token, then click">
<div style="margin:8px 0"><button class="b" onclick="v('dd_tok')&&saveEnv({DUCKDNS_TOKEN:v('dd_tok')},'duckdns')">Keep my IP updated (home servers)</button></div></div>
<div class="card"><h2>Need a domain?</h2><p class="hint">Check a name, then register it where it's cheapest. Roughly $10/year for .com; a free <code>.duckdns.org</code> name works for everything but looks less polished.</p>
<div class="choices" style="align-items:center"><input id="dom_q" placeholder="yourbusiness.com" style="max-width:320px" onkeydown="if(event.key==='Enter')domCheck()"><button class="b p" onclick="domCheck()">Check availability</button></div>
<div id="dom_res" style="margin-top:10px"></div></div></section>

<section id="people"><div class="card"><h2>Add a teammate</h2><p class="hint">Creates the same email + password account in every running app (real single sign-on where the app supports it) and shows the password once.</p>
<label>Email</label><input id="u_email" type="email" placeholder="jane@yourco.com"><label>Password (blank = generate)</label><input id="u_pass" type="text">
<div style="margin-top:10px"><button class="b p" onclick="user('add')">Add everywhere</button> <button class="b" onclick="user('passwd')">Rotate password</button> <button class="b" onclick="if(confirm('Remove this person from every app?'))user('rm')">Remove everywhere</button></div></div></section>

<section id="signon"><div class="card"><h2>Single sign-on <span class="pill" id="ssopill"></span></h2><p class="hint">One account for the whole team. Apps that support single sign-on get a sign-on button; the rest use the same email + password that People creates.</p>
<button class="b p" onclick="run(['sso','on'])">Turn on</button> <button class="b" onclick="run(['sso','off'])">Turn off</button> <a class="b" id="authlink" style="display:inline-block;text-decoration:none" target="_blank">Open Sign-on →</a></div>
<div class="card"><h2>Cloudflare Tunnel <span class="pill" id="tunpill"></span></h2><p class="hint">For a home server with no public IP. Set the token under Settings first.</p><button class="b p" onclick="run(['tunnel','up'])">Start tunnel</button> <button class="b" onclick="run(['tunnel','down'])">Stop tunnel</button></div></section>

<section id="backups"><div class="card"><h2>Backups</h2><p class="hint">Dumps every running database and archives every volume into <code>backups/&lt;timestamp&gt;</code>. Copy that folder off the server.</p>
<button class="b p" onclick="run(['backup'])">Back up now</button><table style="margin-top:12px"><tbody id="bktbl"></tbody></table></div></section>

<section id="settings">
<div class="card"><h2>Branding</h2><p class="hint">Applied to the hub, this console, Sign-on, Files, Team chat, Support desk, Newsletter, Blog and Booking calendar.</p>
<div class="row"><div><label>Business name</label><input id="b_name"></div><div><label>Accent colour</label><input id="b_color" type="color"></div></div>
<label>Logo URL (blank = the monogram in <code>brand/logo.svg</code>)</label><input id="b_logo" placeholder="https://…/logo.svg">
<div style="margin-top:10px"><button class="b p" onclick="saveEnv({BRAND_NAME:v('b_name'),BRAND_COLOR:v('b_color'),BRAND_LOGO_URL:v('b_logo')},'brand')">Save &amp; apply everywhere</button></div></div>
<div class="card"><h2>Outbound email (SMTP relay)</h2><p class="hint">Invoices, invites and newsletters need a relay. Free tiers: Resend (3,000/mo), Brevo (300/day).</p>
<div class="row"><div><label>Host</label><input id="s_host" placeholder="smtp.resend.com"></div><div><label>Port</label><input id="s_port" placeholder="587"></div></div>
<div class="row"><div><label>Username</label><input id="s_user"></div><div><label>Password / API key <span id="s_pwset" class="tag"></span></label><input id="s_pass" type="password" placeholder="unchanged"></div></div>
<label>From address</label><input id="s_from"><div style="margin-top:10px"><button class="b p" onclick="saveSmtp()">Save &amp; apply to mail apps</button></div></div>
<div class="card"><h2>Server</h2><label>Time zone</label><input id="tz" placeholder="Europe/London"><label>Cloudflare Tunnel token</label><input id="cf" type="password" placeholder="unchanged">
<div style="margin-top:10px"><button class="b" onclick="saveEnv({TZ:v('tz')},null)">Save time zone</button> <button class="b" onclick="v('cf')&&saveEnv({CF_TUNNEL_TOKEN:v('cf')},null)">Save token</button></div></div>
</section></div>
<div><div class="card" style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center"><strong>Output</strong><button class="b" onclick="document.getElementById('out').textContent=''">Clear</button></div><pre id="out">Ready.</pre></div></main>
<script>
const $=id=>document.getElementById(id),v=id=>$(id).value.trim();let S=null,SEL=new Set();
function tab(t){document.querySelectorAll('nav button,section').forEach(e=>e.classList.remove('on'));document.querySelector(`nav button[data-t="${t}"]`).classList.add('on');$(t).classList.add('on');}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
async function load(first){S=await (await fetch('/api/state')).json();if(first){SEL=new Set(S.apps.map(a=>a.name));tab(S.apps.some(a=>a.state==='running'&&!a.core)?'apps':'setup');}render();}
function render(){$('dom').textContent=S.domain;$('dom2').textContent=S.domain;$('arch').textContent='('+S.arch+')';$('hublink').href='https://home.'+S.domain;$('authlink').href='https://auth.'+S.domain;
const groups={};S.apps.forEach(a=>(groups[a.group]??=[]).push(a));
$('applist').innerHTML=Object.entries(groups).map(([g,list])=>`<div class="group"><h3>${g}</h3>${list.map(a=>`<div class="app"><input type="checkbox" ${SEL.has(a.name)?'checked':''} onchange="tog('${a.name}',this.checked)"><div><span class="dot ${a.state==='running'?'up':''}"></span><span class="n">${a.label}</span> <span class="tag">${a.url.replace('https://','')}</span><div class="d">${a.desc}</div></div><div style="white-space:nowrap">${a.state==='running'?`<a class="b" style="text-decoration:none;display:inline-block" href="${a.url}" target="_blank">Open</a>`:''}${a.configurable?`<button class="b" onclick="cfg('${a.name}')">Configure</button>`:''}${a.state==='running'?`<button class="b" onclick="run(['logs','${a.name}'])">Logs</button><button class="b" onclick="run(['restart','${a.name}'])">Restart</button><button class="b" onclick="run(['down','${a.name}'])">Stop</button>`:`<button class="b p" onclick="run(['deploy','${a.name}'])">Deploy</button>`}</div></div>`).join('')}</div>`).join('');
selsum();$('ssopill').textContent=S.sso?'on':'off';$('ssopill').className='pill'+(S.sso?' on':'');$('tunpill').textContent=S.tunnel_configured?'token set':'no token';
$('bktbl').innerHTML=S.backups.map(b=>`<tr><td>${b}</td><td style="text-align:right"><button class="b" onclick="if(confirm('Restore volumes from ${b}? Stop the apps first.'))run(['restore','${b}'])">Restore</button></td></tr>`).join('')||'<tr><td class="hint">No backups yet.</td></tr>';
$('b_name').value=S.brand.name;$('b_color').value=S.brand.color;$('b_logo').value=S.brand.logo_url;$('tz').value=S.tz;
$('s_host').value=S.smtp.SMTP_HOST;$('s_port').value=S.smtp.SMTP_PORT;$('s_user').value=S.smtp.SMTP_USER;$('s_from').value=S.smtp.SMTP_FROM;$('s_pwset').textContent=S.smtp_password_set?'(set)':'(not set)';
if(!$('chat').children.length)startWizard();}
function tog(n,on){on?SEL.add(n):SEL.delete(n);selsum();}function selsum(){const up=S.apps.filter(a=>a.state==='running').length;$('selsum').textContent=`${SEL.size} selected · ${up} of ${S.apps.length} running · SSO ${S.sso?'on':'off'}`;}
function selAll(on){SEL=new Set(on?S.apps.map(a=>a.name):S.apps.filter(a=>a.core).map(a=>a.name));render();}function selRunning(){SEL=new Set(S.apps.filter(a=>a.state==='running'||a.core).map(a=>a.name));render();}
function deploySelected(){if(!SEL.size)return alert('Select at least one app');run(['deploy',...SEL]);}
async function streamTo(res){const out=$('out');out.textContent='';const r=res.body.getReader(),d=new TextDecoder();for(;;){const {value,done}=await r.read();if(done)break;out.textContent+=d.decode(value);out.scrollTop=out.scrollHeight;}}
async function post(url,body){document.body.classList.add('busy');try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){$('out').textContent='Error: '+await res.text();return;}await streamTo(res);}finally{document.body.classList.remove('busy');load();}}
function run(args){$('out').textContent='$ stackctl '+args.join(' ')+'\n';return post('/api/run',{args});}
function user(sub){const e=v('u_email');if(!e)return alert('email required');const a=['user',sub,e];if(sub!=='rm'&&v('u_pass'))a.push(v('u_pass'));run(a);}
function saveEnv(set,apply){post('/api/env',{set,apply});}
function saveSmtp(){const set={SMTP_HOST:v('s_host'),SMTP_PORT:v('s_port')||'587',SMTP_USER:v('s_user'),SMTP_FROM:v('s_from')};if(v('s_pass'))set.SMTP_PASSWORD=$('s_pass').value;saveEnv(set,'smtp');}
async function domCheck(){const n=v('dom_q');if(!n)return;$('dom_res').innerHTML='<span class="hint">Checking…</span>';const r=await (await fetch('/api/domain/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})})).json();
const buy=`<div class="choices" style="margin-top:8px"><a class="b" style="text-decoration:none" target="_blank" href="https://dash.cloudflare.com/?to=/:account/domains/register/${n}">Cloudflare (at cost)</a><a class="b" style="text-decoration:none" target="_blank" href="https://porkbun.com/checkout/search?q=${n}">Porkbun</a><a class="b" style="text-decoration:none" target="_blank" href="https://www.namecheap.com/domains/registration/results/?domain=${n}">Namecheap</a></div>`;
$('dom_res').innerHTML=r.status==='available'?`<b style="color:var(--ok)">${n} looks available.</b> Register it, add it to Cloudflare (free), then paste a token above and the records are created for you.${buy}`:r.status==='taken'?`<b>${n} is taken.</b> Try another name.`:`Couldn't check right now. Try the registrars directly:${buy}`;}
// ---- per-app configuration drawer ----
async function cfg(name){const c=await (await fetch('/api/app/'+name)).json();const d=$('cfg');d.hidden=false;
d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Configure ${c.label}</h2><button class="b" onclick="$('cfg').hidden=true">Close</button></div>
${c.settings.map(s=>`<div class="switch"><div><div style="font-weight:600">${s.label}</div><div class="hint">${s.help}</div></div>${s.type==='bool'?`<input type="checkbox" data-k="${s.key}" ${s.value==='true'?'checked':''}>`:s.type.startsWith('select:')?`<select data-k="${s.key}">${s.type.slice(7).split(',').map(o=>`<option ${o===s.value?'selected':''}>${o}</option>`).join('')}</select>`:`<input data-k="${s.key}" value="${s.value}">`}</div>`).join('')||'<p class="hint">No quick settings for this app — see advanced below.</p>'}
<details style="margin-top:12px"><summary class="hint" style="cursor:pointer">Advanced: every setting this app reads (${c.raw.length}) — internal id <code>${name}</code></summary>${c.raw.map(r=>`<label>${r.key}</label><input data-k="${r.key}" value="${r.value}" ${r.secret?'type="password" placeholder="unchanged"':''}>`).join('')}</details>
<div style="margin-top:12px"><button class="b p" onclick="saveCfg('${name}')">Save &amp; re-apply ${c.label}</button></div>`;d.scrollIntoView({behavior:'smooth'});}
function saveCfg(name){const set={};$('cfg').querySelectorAll('[data-k]').forEach(el=>{set[el.dataset.k]=el.type==='checkbox'?String(el.checked):el.value;});post('/api/app/'+name,{set,reup:true});}
// ---- conversational wizard ----
const Q=[
 {k:'name',q:"What's your business called?",type:'text',ph:'Acme Studio'},
 {k:'kind',q:'What kind of business is it?',c:[['consulting','Consulting / agency'],['local','Local services & appointments'],['shop','Online shop'],['saas','Software / SaaS'],['creator','Creator / media'],['nonprofit','Nonprofit / community'],['other','Something else']]},
 {k:'team',q:'How many people will use it?',c:[['solo','Just me'],['small','2–5'],['mid','6–20'],['big','20+']]},
 {k:'bookings',q:'Do customers book time with you?',c:[['yes','Yes'],['no','No']]},
 {k:'invoices',q:'Do you send invoices or quotes?',c:[['yes','Yes'],['no','No']]},
 {k:'support',q:'Do you offer customer support chat or a helpdesk?',c:[['yes','Yes'],['no','No']]},
 {k:'contracts',q:'Do you need e-signatures for contracts?',c:[['yes','Yes'],['no','No']]},
 {k:'forms',q:'Surveys or intake forms?',c:[['yes','Yes'],['no','No']]},
 {k:'newsletter',q:'A newsletter or blog?',c:[['yes','Yes'],['no','No']]},
 {k:'crm',q:'Track contacts and deals in a CRM?',c:[['yes','Yes'],['no','No']]},
 {k:'website',q:'Do you want a public website (pages, blog — and a shop if you sell online)?',c:[['yes','Yes'],['no','No, I have one']]},
 {k:'links',q:'Branded short links for marketing (yourdomain/offer)?',c:[['yes','Yes'],['no','No']]},
 {k:'color',q:'Pick an accent colour for everything.',type:'color'},
 {k:'smtp',q:'Email relay for invoices, invites and newsletters? (Resend and Brevo have free tiers.)',c:[['later','Set up later'],['now','I have SMTP details']]},
];let A={},qi=0;
function startWizard(){$('chat').innerHTML='';A={};qi=0;ask();}
function say(t,cls){const m=document.createElement('div');m.className='msg '+cls;m.innerHTML=t;$('chat').appendChild(m);$('chat').scrollTop=1e9;}
function ask(){if(qi>=Q.length)return finishWizard();const q=Q[qi];say(q.q,'q');const box=$('chatin');
if(q.c){box.innerHTML=`<div class="choices">${q.c.map(([val,l])=>`<button onclick="answer('${val}','${l.replace(/'/g,"\\'")}')">${l}</button>`).join('')}</div>`;}
else if(q.type==='color'){box.innerHTML=`<div class="choices"><input type="color" id="wz_color" value="${S.brand.color}" style="width:60px;height:38px;padding:2px"><button onclick="answer($('wz_color').value,$('wz_color').value)">Use this colour</button></div>`;}
else{box.innerHTML=`<div class="choices" style="align-items:center"><input id="wz_text" placeholder="${q.ph||''}" style="max-width:320px" onkeydown="if(event.key==='Enter')answer(this.value,this.value)"><button onclick="answer($('wz_text').value,$('wz_text').value)">Next</button></div>`;setTimeout(()=>$('wz_text').focus(),50);}}
function answer(val,label){const q=Q[qi];if(!val)return;A[q.k]=val;say(label,'a');qi++;
if(q.k==='smtp'&&val==='now'){say('SMTP details:','q');$('chatin').innerHTML=`<div class="row" style="max-width:520px"><div><label>Host</label><input id="w_h" placeholder="smtp.resend.com"></div><div><label>Port</label><input id="w_p" value="587"></div><div><label>Username</label><input id="w_u"></div><div><label>Password / API key</label><input id="w_k" type="password"></div></div><div class="choices"><button onclick="A.smtp_host=v('w_h');A.smtp_port=v('w_p');A.smtp_user=v('w_u');A.smtp_password=$('w_k').value;say('SMTP saved','a');ask()">Continue</button></div>`;return;}
ask();}
async function finishWizard(){const plan=await (await fetch('/api/wizard/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:A})})).json();
const names=plan.apps.map(a=>(S.apps.find(x=>x.name===a)||{label:a}).label);
say(`Here's your plan:<ul class="plan">${plan.notes.map(n=>`<li>${n}</li>`).join('')}<li><b>Apps:</b> ${names.join(', ')}</li></ul>Deploy takes a few minutes the first time. Ready?`,'q');
$('chatin').innerHTML=`<div class="choices"><button class="b p big" style="border-radius:999px" onclick="applyWizard()">Deploy my stack</button><button onclick="startWizard()">Start over</button><button onclick="SEL=new Set(${JSON.stringify(plan.apps)});render();tab('apps')">Fine-tune in Apps first</button></div>`;}
function applyWizard(){$('out').textContent='Deploying your plan…\n';tab('apps');post('/api/wizard/apply',{answers:A});}
load(true);
</script></body></html>"""

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"Founder Stack Console on :{port}, stack at {ROOT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
