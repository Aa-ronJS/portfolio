# App notes: first login, quirks, footprint

Every app runs at `https://<subdomain>.<BASE_DOMAIN>`. "Pre-seeded" means the
admin account is created automatically from `ADMIN_EMAIL` / `ADMIN_USER` /
`ADMIN_PASSWORD` in `.env`. "First-visit setup" means the **first person to
open the URL creates the admin account** — do it immediately after
`stackctl up`, because until then that page is an open signup.

| App | Subdomain | Admin account | RAM (approx) |
|---|---|---|---|
| homepage | `home.` + apex | None — it's the hub/launchpad | ~150 MB |
| console | `console.` | `ADMIN_USER` / `ADMIN_PASSWORD` (HTTP auth) — the control panel | ~40 MB |
| authentik | `auth.` | **Pre-seeded**: `akadmin` / `ADMIN_PASSWORD` | ~1 GB (server+worker) |
| calcom | `cal.` | First-visit setup (first signup becomes owner) | ~700 MB |
| invoiceninja | `invoices.` | **Pre-seeded** (`IN_USER_EMAIL`/`IN_PASSWORD` from .env) | ~500 MB |
| twenty | `crm.` | **Auto-bootstrapped** by `stackctl user add` (workspace + admin = ADMIN_EMAIL) | ~1 GB (server+worker) |
| activepieces | `automate.` | First-visit setup | ~500 MB |
| listmonk | `newsletter.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`) | ~150 MB |
| formbricks | `forms.` | First-visit setup | ~400 MB |
| vikunja | `tasks.` | First-visit setup; then consider disabling registration | ~100 MB |
| docmost | `docs.` | **Auto-bootstrapped** by `stackctl user add` (workspace + owner = ADMIN_EMAIL) | ~400 MB |
| mattermost | `chat.` | First-visit setup (first user is system admin) | ~500 MB |
| chatwoot | `support.` | **Auto-bootstrapped** by `stackctl user add` (account + first user) | ~1 GB (rails+sidekiq) |
| documenso | `sign.` | First-visit setup; needs signing cert first (below) | ~500 MB |
| umami | `analytics.` | **Auto-rotated** by `stackctl user add` (default admin/umami → ADMIN_PASSWORD) | ~200 MB |
| nextcloud | `files.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`) | ~500 MB |
| vaultwarden | `vault.` | Sign up, then set `VAULTWARDEN_SIGNUPS_ALLOWED=false` and re-up | ~50 MB |
| uptime-kuma | `status.` | First-visit setup | ~150 MB |
| wordpress | apex, `www.`, `site.` | **Auto-bootstrapped** by `stackctl user add`/deploy (admin = ADMIN_USER); WooCommerce via the Website switch | ~300 MB |
| n8n | `automate.` | **Auto-bootstrapped** (owner = ADMIN_EMAIL); teammates get an invite link | ~400 MB |
| activepieces | `flows.` (optional) | First-visit setup | ~500 MB |
| videomaker | `studio.` | Admin login (HTTP auth); no accounts. AI presenter engine fetches ~1.3 GB of model weights on first start; presenter renders take ~1 min per second of speech on 4 CPU cores (`AVATAR_FRAME_STEP` trades smoothness for speed) | ~2.5 GB (TTS + presenter engines) |
| peertube | `video.` | **Pre-seeded**: `root` / `ADMIN_PASSWORD` | ~1 GB |
| owncast | `live.` | **Pre-seeded** admin password + OBS stream key from .env | ~150 MB |
| jitsi | `meet.` | No accounts (anyone with a room link); open UDP 10000 | ~1.5 GB |
| excalidraw | `whiteboard.` | No accounts | ~50 MB |
| postiz | `social.` | First person to register is the owner; then lock registration | ~800 MB |
| openwebui | `ai.` (optional) | **Auto-bootstrapped** admin; downloads the default model on first deploy | ~1 GB + model (2–5 GB) |
| shlink | `links.` + `links-admin.` | Admin UI behind the console login; API key pre-set | ~200 MB |
| ghost | `blog.` | **Auto-bootstrapped** by `stackctl user add` (owner = ADMIN_EMAIL) | ~300 MB |
| *ARM alternatives* (docs/ZERO-COST.md) | | | |
| easyappointments | `cal.` | **Auto-bootstrapped** by `stackctl user add` (admin = ADMIN_USER/ADMIN_PASSWORD) | ~150 MB |
| espocrm | `crm.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`) | ~400 MB |
| rocketchat | `chat.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`); wizard skipped | ~1 GB (app+mongo) |

A 4 GB VPS runs ~5 of these comfortably; 16 GB runs the whole default set; the AI assistant wants 8 GB of its own.

## One-time steps

### Documenso — generate the signing certificate
Documenso signs PDFs with a local certificate. Before first `up`:

```bash
cd apps/documenso && mkdir -p cert && cd cert
openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 3650 -subj "/CN=Documenso"
openssl pkcs12 -export -out cert.p12 -inkey key.pem -in cert.pem -passout pass:
```

This is a self-signed cert (fine for internal/most business use). For
eIDAS/qualified signatures you'd buy a cert and drop it in the same place.

### Vikunja — lock down registration
After your team has signed up, set `VIKUNJA_SERVICE_ENABLEREGISTRATION: "false"`
in `apps/vikunja/docker-compose.yml` and `stackctl up vikunja`.

## Outbound email

Apps that send email (Invoice Ninja, Listmonk, Chatwoot, Documenso, Ghost,
Cal.com, Formbricks, Docmost, Vaultwarden) read the shared `SMTP_*` values
from `.env`. Without them, everything still works except email delivery
(invites, receipts, campaigns). Cheapest reliable relay: Amazon SES.
After editing `.env`, re-run `stackctl up <app>` to apply.

## Adding/removing apps

Each app is one folder in `apps/` with a self-contained `docker-compose.yml`
following the same pattern (own database, `proxy` network, Traefik labels).
Copy any folder as a template to add your own; delete a folder to drop it
from the catalog. `stackctl` discovers apps by listing `apps/`.
