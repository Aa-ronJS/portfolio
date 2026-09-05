#!/usr/bin/env python3
"""Founder Stack Console — a small web UI over stackctl.

Zero dependencies (stdlib only). Runs inside the console container with the
stack directory mounted at STACK_ROOT and the docker socket available, so it
can run stackctl exactly as an admin would in a shell. Auth: HTTP Basic with
ADMIN_USER / ADMIN_PASSWORD from .env.
"""
import base64, hmac, html, json, os, re, subprocess, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.environ.get("STACK_ROOT") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STACKCTL = os.path.join(ROOT, "stackctl")
ENVFILE = os.path.join(ROOT, ".env")

# verbs the UI may run, and which arguments they accept (validated)
ALLOWED = {
    "deploy": 0, "bootstrap": 0, "list": 0, "status": 0, "up": None, "down": None, "restart": None, "update": None,
    "backup": 0, "restore": 1, "sso": 1, "user": None, "tunnel": 1, "brand": 1, "logs": 1,
}
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# .env keys the settings page may edit
EDITABLE = {"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM",
            "BRAND_NAME", "BRAND_COLOR", "BRAND_LOGO_URL", "CF_TUNNEL_TOKEN",
            "VAULTWARDEN_SIGNUPS_ALLOWED"}
MAIL_APPS = ["invoiceninja", "listmonk", "chatwoot", "documenso", "ghost", "calcom",
             "formbricks", "docmost", "vaultwarden", "authentik", "rocketchat", "espocrm"]


def read_env():
    env = {}
    try:
        with open(ENVFILE) as f:
            for line in f:
                line = line.rstrip("\n")
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k] = v
    except FileNotFoundError:
        pass
    return env


def set_env(updates):
    lines = open(ENVFILE).read().split("\n")
    seen = set()
    for i, line in enumerate(lines):
        if "=" in line and not line.startswith("#"):
            k = line.split("=", 1)[0]
            if k in updates:
                lines[i] = f"{k}={updates[k]}"
                seen.add(k)
    for k, v in updates.items():
        if k not in seen:
            lines.append(f"{k}={v}")
    with open(ENVFILE, "w") as f:
        f.write("\n".join(lines).rstrip("\n") + "\n")


def run(args, env_extra=None):
    """Yield output lines from a stackctl invocation."""
    env = dict(os.environ, STACKCTL_NO_FOLLOW="1", TERM="dumb")
    if env_extra:
        env.update(env_extra)
    p = subprocess.Popen([STACKCTL] + args, cwd=ROOT, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, env=env, text=True, bufsize=1)
    for line in p.stdout:
        yield re.sub(r"\x1b\[[0-9;]*m", "", line)  # strip ANSI colour
    p.wait()
    yield f"\n[exit {p.returncode}]\n"


def state():
    env = read_env()
    apps = []
    out = "".join(run(["status"]))
    for line in out.splitlines()[1:]:
        m = re.match(r"^(\S+)\s+(running|stopped)\s+(\S+)\s*(.*)$", line)
        if m:
            apps.append({"name": m[1], "state": m[2], "url": m[3], "tag": m[4].strip()})
    backups = []
    bdir = os.path.join(ROOT, "backups")
    if os.path.isdir(bdir):
        backups = sorted(os.listdir(bdir), reverse=True)[:10]
    return {
        "domain": env.get("BASE_DOMAIN", ""),
        "arch": os.uname().machine,
        "apps": apps,
        "sso": env.get("SSO_ENABLED", "false") == "true",
        "smtp": {k: env.get(k, "") for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_FROM")},
        "smtp_password_set": bool(env.get("SMTP_PASSWORD")),
        "brand": {"name": env.get("BRAND_NAME", "Founder Stack"), "color": env.get("BRAND_COLOR", "#4f46e5"),
                  "logo_url": env.get("BRAND_LOGO_URL", "")},
        "tunnel_configured": bool(env.get("CF_TUNNEL_TOKEN")),
        "vault_signups": env.get("VAULTWARDEN_SIGNUPS_ALLOWED", "true"),
        "backups": backups,
    }


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "FounderStackConsole/1"

    def log_message(self, fmt, *a):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))

    # ---- helpers ----
    def authed(self):
        env = read_env()
        hdr = self.headers.get("Authorization", "")
        if hdr.startswith("Basic "):
            try:
                user, pw = base64.b64decode(hdr[6:]).decode().split(":", 1)
            except Exception:
                return False
            return hmac.compare_digest(user, env.get("ADMIN_USER", "admin")) and \
                hmac.compare_digest(pw, env.get("ADMIN_PASSWORD", ""))
        return False

    def deny(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Founder Stack Console"')
        self.send_header("Content-Length", "0")
        self.end_headers()

    def send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def stream(self, lines):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Transfer-Encoding", "chunked")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        for line in lines:
            b = line.encode()
            self.wfile.write(b"%x\r\n%s\r\n" % (len(b), b))
            self.wfile.flush()
        self.wfile.write(b"0\r\n\r\n")

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    # ---- routes ----
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/brand/logo.svg":  # public: other apps load the logo from here
            p = os.path.join(ROOT, "brand", "logo.svg")
            if os.path.exists(p):
                return self.send(200, open(p, "rb").read(), "image/svg+xml")
            return self.send(404, "no logo", "text/plain")
        if path == "/healthz":
            return self.send(200, "ok", "text/plain")
        if not self.authed():
            return self.deny()
        if path == "/":
            env = read_env()
            return self.send(200, PAGE.replace("__BRAND__", html.escape(env.get("BRAND_NAME", "Founder Stack")))
                             .replace("__COLOR__", html.escape(env.get("BRAND_COLOR", "#4f46e5"))))
        if path == "/api/state":
            return self.send(200, json.dumps(state()), "application/json")
        self.send(404, "not found", "text/plain")

    def do_POST(self):
        path = urlparse(self.path).path
        if not self.authed():
            return self.deny()
        try:
            body = self.body_json()
        except Exception:
            return self.send(400, "bad json", "text/plain")

        if path == "/api/run":
            args = [str(a) for a in body.get("args", [])]
            if not args or args[0] not in ALLOWED:
                return self.send(400, "command not allowed", "text/plain")
            verb, rest = args[0], args[1:]
            limit = ALLOWED[verb]
            if limit is not None and len(rest) != limit:
                return self.send(400, "bad arguments", "text/plain")
            # validate shapes: app names, emails, sub-verbs
            for i, a in enumerate(rest):
                if verb == "user":
                    ok = (i == 0 and a in ("add", "passwd", "rm")) or (i == 1 and EMAIL_RE.match(a)) or (i == 2)
                elif verb == "restore":
                    ok = NAME_RE.match(a) is not None
                elif verb in ("sso", "tunnel", "brand"):
                    ok = a in ("on", "off", "up", "down", "apply", "show")
                else:
                    ok = a == "--all" or NAME_RE.match(a) is not None
                if not ok:
                    return self.send(400, "bad arguments", "text/plain")
            if verb == "restore":
                rest = [os.path.join(ROOT, "backups", rest[0])]
            return self.stream(run([verb] + rest))

        if path == "/api/env":
            updates = {k: str(v) for k, v in body.get("set", {}).items() if k in EDITABLE}
            for k, v in updates.items():
                if "\n" in v or (k == "BRAND_COLOR" and not re.match(r"^#[0-9a-fA-F]{6}$", v)):
                    return self.send(400, f"bad value for {k}", "text/plain")
            if updates:
                set_env(updates)
            apply = body.get("apply")

            def lines():
                yield f"Saved: {', '.join(updates) or 'nothing'}\n"
                if apply == "smtp":
                    running = [a["name"] for a in state()["apps"] if a["state"] == "running" and a["name"] in MAIL_APPS]
                    if running:
                        yield f"Re-applying mail settings to: {' '.join(running)}\n"
                        yield from run(["up"] + running)
                elif apply == "brand":
                    yield from run(["brand", "apply"])
                elif apply == "vaultwarden":
                    yield from run(["up", "vaultwarden"])
            return self.stream(lines())
        self.send(404, "not found", "text/plain")


PAGE = r"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__BRAND__ · Console</title>
<style>
:root{--accent:__COLOR__;--bg:#0f172a;--panel:#1e293b;--panel2:#273449;--text:#e2e8f0;--muted:#94a3b8;--ok:#22c55e;--bad:#ef4444;--border:#334155}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{display:flex;align-items:center;gap:14px;padding:14px 22px;border-bottom:1px solid var(--border);background:var(--panel)}
header img{width:32px;height:32px;border-radius:8px}header h1{font-size:17px;margin:0;font-weight:600}header .sub{color:var(--muted);font-size:12px}
header a.hub{margin-left:auto;color:var(--muted);text-decoration:none}header a.hub:hover{color:var(--text)}
nav{display:flex;gap:4px;padding:10px 22px 0;border-bottom:1px solid var(--border);background:var(--panel)}
nav button{background:none;border:0;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;font:inherit}
nav button.on{color:var(--text);border-color:var(--accent)}
main{display:grid;grid-template-columns:1fr 420px;gap:18px;padding:18px 22px;max-width:1400px}
@media(max-width:1000px){main{grid-template-columns:1fr}}
section{display:none}section.on{display:block}
.card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px}
.card h2{margin:0 0 10px;font-size:15px}table{width:100%;border-collapse:collapse}td,th{padding:8px 6px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}
th{color:var(--muted);font-weight:500;font-size:12px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;background:var(--bad)}.dot.up{background:var(--ok)}
.tag{color:var(--muted);font-size:12px}a{color:var(--accent)}
button.b{background:var(--panel2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit;font-size:13px;margin:2px}
button.b:hover{border-color:var(--accent)}button.b.p{background:var(--accent);border-color:var(--accent);color:#fff}
input,select{background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font:inherit;width:100%}
label{display:block;color:var(--muted);font-size:12px;margin:10px 0 4px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
pre#out{background:#020617;border:1px solid var(--border);border-radius:12px;padding:14px;min-height:320px;max-height:78vh;overflow:auto;white-space:pre-wrap;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#cbd5e1;margin:0}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:var(--panel2);color:var(--muted)}.pill.on{background:rgba(34,197,94,.15);color:var(--ok)}
.hint{color:var(--muted);font-size:12.5px}.busy{opacity:.6;pointer-events:none}
.hero{background:linear-gradient(135deg,var(--panel),var(--panel2));border-color:var(--accent)}button.b.big{font-size:15px;padding:10px 18px}
</style></head><body>
<header><img src="/brand/logo.svg" alt=""><div><h1>__BRAND__ <span class="sub">console</span></h1><div class="sub" id="dom"></div></div><a class="hub" id="hublink" href="#">← Hub</a></header>
<nav><button data-t="apps" class="on">Apps</button><button data-t="people">People</button><button data-t="signon">Sign-on</button><button data-t="backups">Backups</button><button data-t="settings">Settings</button></nav>
<main><div>
<section id="apps" class="on">
<div class="card hero"><div><h2 style="font-size:19px">Deploy your stack</h2><p class="hint" style="margin:0 0 12px">One click: starts every app for this server, runs first-time setup from your settings, turns on single sign-on and applies your brand. Safe to click again any time.</p>
<button class="b p big" onclick="run(['deploy'])">Deploy everything</button> <span class="hint" id="deploysum"></span></div></div>
<div class="card"><h2>Apps <span class="tag" id="arch"></span></h2>
<div style="margin-bottom:10px"><button class="b" onclick="run(['update'])">Update all</button> <button class="b" onclick="run(['status'])">Refresh</button></div>
<table><thead><tr><th>App</th><th>URL</th><th></th></tr></thead><tbody id="apptbl"></tbody></table></div></section>
<section id="people"><div class="card"><h2>Add a teammate</h2><p class="hint">Creates the same email + password account in every running app (real single sign-on where the app supports it), and prints the password once.</p>
<label>Email</label><input id="u_email" type="email" placeholder="jane@yourco.com"><label>Password (blank = generate)</label><input id="u_pass" type="text" placeholder="leave blank to generate">
<div style="margin-top:10px"><button class="b p" onclick="user('add')">Add everywhere</button> <button class="b" onclick="user('passwd')">Rotate password</button> <button class="b" onclick="if(confirm('Remove this person from every app?'))user('rm')">Remove everywhere</button></div></div></section>
<section id="signon"><div class="card"><h2>Single sign-on <span class="pill" id="ssopill"></span></h2><p class="hint">One account for the team via Authentik. Apps that speak OIDC get a sign-on button; the rest use the same email + password the People tab creates.</p>
<button class="b p" onclick="run(['sso','on'])">Turn on</button> <button class="b" onclick="run(['sso','off'])">Turn off</button> <a class="b" id="authlink" style="display:inline-block;text-decoration:none" target="_blank">Open Authentik →</a></div>
<div class="card"><h2>Cloudflare Tunnel <span class="pill" id="tunpill"></span></h2><p class="hint">For a home server with no public IP. Set the token under Settings first.</p><button class="b p" onclick="run(['tunnel','up'])">Start tunnel</button> <button class="b" onclick="run(['tunnel','down'])">Stop tunnel</button></div></section>
<section id="backups"><div class="card"><h2>Backups</h2><p class="hint">Dumps every running database and archives every volume into <code>backups/&lt;timestamp&gt;</code>. Copy that folder off the server.</p>
<button class="b p" onclick="run(['backup'])">Back up now</button><table style="margin-top:12px"><tbody id="bktbl"></tbody></table></div></section>
<section id="settings">
<div class="card"><h2>Branding</h2><p class="hint">Applied to the hub, this console, and every app that supports branding (Authentik, Nextcloud, Mattermost, Rocket.Chat, Chatwoot, Listmonk, Ghost, Easy!Appointments).</p>
<div class="row"><div><label>Business name</label><input id="b_name"></div><div><label>Accent colour</label><input id="b_color" type="color"></div></div>
<label>Logo URL (blank = the logo in <code>brand/logo.svg</code>)</label><input id="b_logo" placeholder="https://…/logo.svg">
<div style="margin-top:10px"><button class="b p" onclick="saveEnv({BRAND_NAME:v('b_name'),BRAND_COLOR:v('b_color'),BRAND_LOGO_URL:v('b_logo')},'brand')">Save &amp; apply everywhere</button></div></div>
<div class="card"><h2>Outbound email (SMTP relay)</h2><p class="hint">Invoices, invites and newsletters need a relay. Free tiers: Resend (3,000/mo), Brevo (300/day).</p>
<div class="row"><div><label>Host</label><input id="s_host" placeholder="smtp.resend.com"></div><div><label>Port</label><input id="s_port" placeholder="587"></div></div>
<div class="row"><div><label>Username</label><input id="s_user"></div><div><label>Password / API key <span id="s_pwset" class="tag"></span></label><input id="s_pass" type="password" placeholder="unchanged"></div></div>
<label>From address</label><input id="s_from">
<div style="margin-top:10px"><button class="b p" onclick="saveSmtp()">Save &amp; apply to mail apps</button></div></div>
<div class="card"><h2>Other</h2><label>Vaultwarden: allow open sign-ups</label><select id="vw"><option value="true">yes (until your team has registered)</option><option value="false">no (locked down)</option></select>
<label>Cloudflare Tunnel token</label><input id="cf" type="password" placeholder="unchanged">
<div style="margin-top:10px"><button class="b" onclick="saveEnv({VAULTWARDEN_SIGNUPS_ALLOWED:v('vw')},'vaultwarden')">Save Vaultwarden</button> <button class="b" onclick="v('cf')&&saveEnv({CF_TUNNEL_TOKEN:v('cf')},null)">Save token</button></div></div>
</section></div>
<div><div class="card" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center"><strong>Output</strong><button class="b" onclick="document.getElementById('out').textContent=''">Clear</button></div><pre id="out">Ready.</pre></div></main>
<script>
const $=id=>document.getElementById(id),v=id=>$(id).value.trim();let S=null;
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,section').forEach(e=>e.classList.remove('on'));b.classList.add('on');$(b.dataset.t).classList.add('on');});
async function load(){S=await (await fetch('/api/state')).json();render();}
function render(){$('dom').textContent=S.domain;$('arch').textContent='('+S.arch+')';$('hublink').href='https://home.'+S.domain;$('authlink').href='https://auth.'+S.domain;
$('apptbl').innerHTML=S.apps.map(a=>`<tr><td><span class="dot ${a.state==='running'?'up':''}"></span>${a.name}<div class="tag">${a.tag||''}</div></td><td><a href="${a.url}" target="_blank">${a.url.replace('https://','')}</a></td><td style="text-align:right;white-space:nowrap">${a.state==='running'?`<button class="b" onclick="run(['restart','${a.name}'])">Restart</button><button class="b" onclick="run(['update','${a.name}'])">Update</button><button class="b" onclick="run(['logs','${a.name}'])">Logs</button><button class="b" onclick="run(['down','${a.name}'])">Stop</button>`:`<button class="b p" onclick="run(['up','${a.name}'])">Deploy</button>`}</td></tr>`).join('');
const up=S.apps.filter(a=>a.state==='running').length;$('deploysum').textContent=up?`${up} of ${S.apps.length} apps running · SSO ${S.sso?'on':'off'}`:'Nothing running yet.';
$('ssopill').textContent=S.sso?'on':'off';$('ssopill').className='pill'+(S.sso?' on':'');$('tunpill').textContent=S.tunnel_configured?'token set':'no token';
$('bktbl').innerHTML=S.backups.map(b=>`<tr><td>${b}</td><td style="text-align:right"><button class="b" onclick="if(confirm('Restore volumes from ${b}? Stop the apps first.'))run(['restore','${b}'])">Restore</button></td></tr>`).join('')||'<tr><td class="hint">No backups yet.</td></tr>';
$('b_name').value=S.brand.name;$('b_color').value=S.brand.color;$('b_logo').value=S.brand.logo_url;
$('s_host').value=S.smtp.SMTP_HOST;$('s_port').value=S.smtp.SMTP_PORT;$('s_user').value=S.smtp.SMTP_USER;$('s_from').value=S.smtp.SMTP_FROM;$('s_pwset').textContent=S.smtp_password_set?'(set)':'(not set)';$('vw').value=S.vault_signups;}
async function streamTo(res){const out=$('out');out.textContent='';const r=res.body.getReader(),d=new TextDecoder();for(;;){const {value,done}=await r.read();if(done)break;out.textContent+=d.decode(value);out.scrollTop=out.scrollHeight;}}
async function post(url,body){document.body.classList.add('busy');try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){$('out').textContent='Error: '+await res.text();return;}await streamTo(res);}finally{document.body.classList.remove('busy');load();}}
function run(args){$('out').textContent='$ stackctl '+args.join(' ')+'\n';return post('/api/run',{args});}
function user(sub){const e=v('u_email');if(!e)return alert('email required');const a=['user',sub,e];if(sub!=='rm'&&v('u_pass'))a.push(v('u_pass'));run(a);}
function saveEnv(set,apply){post('/api/env',{set,apply});}
function saveSmtp(){const set={SMTP_HOST:v('s_host'),SMTP_PORT:v('s_port')||'587',SMTP_USER:v('s_user'),SMTP_FROM:v('s_from')};if(v('s_pass'))set.SMTP_PASSWORD=$('s_pass').value;saveEnv(set,'smtp');}
load();
</script></body></html>"""

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"Founder Stack Console on :{port}, stack at {ROOT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
