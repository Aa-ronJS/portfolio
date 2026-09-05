# App notes: first login, quirks, footprint

Every app runs at `https://<subdomain>.<BASE_DOMAIN>`. "Pre-seeded" means the
admin account is created automatically from `ADMIN_EMAIL` / `ADMIN_USER` /
`ADMIN_PASSWORD` in `.env`. "First-visit setup" means the **first person to
open the URL creates the admin account** — do it immediately after
`stackctl up`, because until then that page is an open signup.

| App | Subdomain | Admin account | RAM (approx) |
|---|---|---|---|
| homepage | `home.` + apex | None — it's the hub/launchpad (see docs/SSO.md) | ~150 MB |
| authentik | `auth.` | **Pre-seeded**: `akadmin` / `ADMIN_PASSWORD` | ~1 GB (server+worker) |
| calcom | `cal.` | First-visit setup (first signup becomes owner) | ~700 MB |
| invoiceninja | `invoices.` | **Pre-seeded** (`IN_USER_EMAIL`/`IN_PASSWORD` from .env) | ~500 MB |
| twenty | `crm.` | First-visit setup | ~1 GB (server+worker) |
| activepieces | `automate.` | First-visit setup | ~500 MB |
| listmonk | `newsletter.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`) | ~150 MB |
| formbricks | `forms.` | First-visit setup | ~400 MB |
| vikunja | `tasks.` | First-visit setup; then consider disabling registration | ~100 MB |
| docmost | `docs.` | First-visit setup (creates workspace + owner) | ~400 MB |
| mattermost | `chat.` | First-visit setup (first user is system admin) | ~500 MB |
| chatwoot | `support.` | Run the one-liner below once | ~1 GB (rails+sidekiq) |
| documenso | `sign.` | First-visit setup; needs signing cert first (below) | ~500 MB |
| umami | `analytics.` | **Default login `admin` / `umami`** — change it immediately | ~200 MB |
| nextcloud | `files.` | **Pre-seeded** (`ADMIN_USER`/`ADMIN_PASSWORD`) | ~500 MB |
| vaultwarden | `vault.` | Sign up, then set `VAULTWARDEN_SIGNUPS_ALLOWED=false` and re-up | ~50 MB |
| uptime-kuma | `status.` | First-visit setup | ~150 MB |
| ghost | `blog.` | Visit `/ghost` to create the owner account | ~300 MB |

A 4 GB VPS runs ~5 of these comfortably; 16 GB runs all of them.

## One-time steps

### Chatwoot — create the admin account
After `stackctl up chatwoot`, the URL shows an onboarding screen; complete it
in the browser, or create the account from the CLI:

```bash
docker exec -it fs-chatwoot-rails-1 bundle exec rails runner \
  "AccountBuilder.new(account_name:'My Business', email:'you@example.com', user_password:'<password>', confirmed: true).perform"
```

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

### Umami — change the default login
Umami ships with `admin` / `umami`. Log in and change it before anything else.

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
