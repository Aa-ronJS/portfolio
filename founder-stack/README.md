# Founder Stack

**Your entire business software stack. One server. One install. $0/month in SaaS fees.**

Founder Stack replaces ~$700+/month of SaaS subscriptions with battle-tested,
self-hosted open-source equivalents — deployed together, behind one domain,
with HTTPS everywhere, in one command.

| What you get | Replaces | Your address | Under the hood |
|---|---|---|---|
| Booking calendar | Calendly | `cal.yourdomain.com` | Cal.com |
| Invoices | FreshBooks / QuickBooks | `invoices.yourdomain.com` | Invoice Ninja |
| CRM | HubSpot | `crm.yourdomain.com` | Twenty |
| Newsletter | Mailchimp | `newsletter.yourdomain.com` | Listmonk |
| Forms | Typeform | `forms.yourdomain.com` | Formbricks |
| Tasks | Asana / Trello | `tasks.yourdomain.com` | Vikunja |
| Docs | Notion / Confluence | `docs.yourdomain.com` | Docmost |
| Team chat | Slack | `chat.yourdomain.com` | Mattermost |
| Support desk | Zendesk / Intercom | `support.yourdomain.com` | Chatwoot |
| Signatures | DocuSign | `sign.yourdomain.com` | Documenso |
| Analytics | Google Analytics | `analytics.yourdomain.com` | Umami |
| Files | Dropbox / Google Drive | `files.yourdomain.com` | Nextcloud |
| Passwords | 1Password | `vault.yourdomain.com` | Vaultwarden |
| Status page | Statuspage / Pingdom | `status.yourdomain.com` | Uptime Kuma |
| Blog | Substack / Wix | `blog.yourdomain.com` | Ghost |
| Website & shop | Squarespace / Wix / Shopify | `yourdomain.com` | WordPress (+ WooCommerce) |
| Short links | Bitly | `links.yourdomain.com` | Shlink |
| Domain & DNS | GoDaddy dashboard | console → Domain & DNS | Cloudflare / DuckDNS APIs |
| Automations | Zapier / Make | `automate.yourdomain.com` | n8n (full community edition); Activepieces as a simpler optional builder |
| Video maker | HeyGen / Canva video / Descript | `studio.yourdomain.com` | built in: ffmpeg + Kokoro TTS — script → narrated, captioned, branded MP4 |
| Video hosting | Wistia / Vimeo | `video.yourdomain.com` | PeerTube |
| Live streaming | StreamYard / Restream | `live.yourdomain.com` | Owncast |
| Meetings | Zoom / Google Meet | `meet.yourdomain.com` | Jitsi Meet |
| Whiteboard | Miro | `whiteboard.yourdomain.com` | Excalidraw |
| Social scheduler | Buffer / Hootsuite | `social.yourdomain.com` | Postiz |
| AI assistant | ChatGPT Team | `ai.yourdomain.com` | Open WebUI + Ollama (optional; CPU models) |

Everything is named by what it does — in the hub, the console, the CLI and
every message. The open-source projects underneath are listed here for
attribution and licensing (see [docs/SELLING.md](docs/SELLING.md)); nothing a
user sees mentions them. `stackctl` accepts the function names too:
`./stackctl up crm chat booking`.

Total replaced: **$1,000+/month**. Total cost: **one VPS (~$10–40/month)**.

Plus two pieces that tie it together:

- **The hub** — `home.yourdomain.com` (and the bare domain): one page with
  every app as a tile, grouped by job (Customers / Money / Marketing /
  Team / Operations), with a live running-status dot per app and server
  CPU/RAM/disk at the top. Bookmark one URL, reach everything.
- **The console** — `console.yourdomain.com`: the hub's control panel.
  A conversational **Set up** wizard asks about your business and turns the
  answers into a plan (which apps, sign-ups locked down, brand, email) that
  deploys with one click. **Apps** is tick-the-boxes → **Deploy selected**,
  with a Configure panel per app (quick switches plus every setting it
  reads). People, Sign-on, Backups and Settings round it out. Everything
  streams its output live; everything `stackctl` does, no shell needed.
- **Video, without a GPU** — the Video maker turns a script into a
  finished marketing video on a plain CPU server: each sentence is narrated
  by a local text-to-speech engine and becomes a scene (your images, or
  brand-colour title cards), with captions, intro and outro, as an MP4 you
  can post anywhere or host on your own Video hosting. Live streaming gives
  you a live page with chat you stream to from OBS. AI-avatar video (the
  HeyGen style) needs a GPU and is deliberately not faked here.
- **Domain & DNS, handled** — the console's Domain & DNS tab checks a
  name's availability, links you to at-cost registrars, shows the exact
  records your server needs, verifies what the internet sees, and creates
  the records for you on Cloudflare (paste a token) or keeps a free DuckDNS
  name pointed at a home server. `stackctl dns check|cloudflare|duckdns`.
- **One brand** — set your business name, logo and accent colour once (in
  the console or `.env`) and `stackctl brand apply` pushes it into the hub,
  the console, Sign-on, Files, Team chat, Support desk, Newsletter, Blog and
  Booking calendar, so the stack reads as one product.
- **One identity** — real single sign-on (`auth.yourdomain.com`,
  auto-configured, `./stackctl sso on`) for every app that supports it, plus
  scripted provisioning for the rest: `./stackctl user add jane@yourco.com` creates the same
  email + password account in every running app in one shot, and
  `user rm` offboards them everywhere. See [docs/SSO.md](docs/SSO.md).

## What it actually costs

The software is open source — no license fees, ever. What you pay for is
the machine it runs on and, optionally, email delivery:

| | $0 path | Comfortable path |
|---|---|---|
| Server | Oracle Cloud Always Free ARM VM (4 cores / 24 GB, forever) | any $10–40/mo VPS |
| Domain | free `yourbiz.duckdns.org` subdomain | a real domain, ~$10/yr |
| Email relay | Resend / Brevo free tier (3,000/mo or 300/day) | same, or Amazon SES at $0.10/1,000 |
| **Monthly total** | **$0** | **$10–40** |

The $0 path is fully supported — `install.sh` detects the ARM server and
`stackctl` swaps in ARM-capable equivalents for the three apps whose
upstreams only ship amd64 images. Step-by-step: [docs/ZERO-COST.md](docs/ZERO-COST.md).

Either way the cost is flat: adding your 50th teammate costs $0, not
$8 × 50/month.

## Requirements

- A Linux server (Ubuntu 22.04+/Debian 12+ recommended), amd64 or arm64.
  - 4 GB RAM comfortably runs 4–6 apps; 16 GB runs everything at once.
- A domain you control, with a **wildcard DNS record**:
  `*.yourdomain.com  A  <your-server-ip>` (and optionally the apex).
- Ports 80 and 443 open.

## Quickstart — one command

```bash
git clone https://github.com/Aa-ronJS/portfolio.git
cd portfolio/founder-stack
sudo ./install.sh
```

`install.sh` asks four things (domain, email, business name, optional SMTP
relay), generates every secret, starts the HTTPS proxy, then offers
**Deploy everything** — which starts every app, waits for them to come up,
runs each app's first-time setup from your answers, turns on single
sign-on and applies your brand. When it finishes you get three links: the
hub, the console, and sign-on. Add your team from the console's People tab.

Prefer to drive it yourself? Everything is also a command:

```bash
./stackctl deploy                       # the same one-shot, re-runnable any time
./stackctl up booking newsletter analytics   # or pick apps, by what they do
./stackctl user add jane@yourco.com     # one command onboards a teammate everywhere
./stackctl status
```

Every app comes up on its own subdomain with a Let's Encrypt certificate,
with its admin account pre-seeded or bootstrapped from `.env`
([docs/APPS.md](docs/APPS.md) lists the per-app details).

## Day-2 operations

```bash
./stackctl status              # what's running, and where
./stackctl logs support        # tail an app's logs
./stackctl backup              # dump every database + volume to ./backups/<timestamp>/
./stackctl restore <dir>       # restore a backup
./stackctl update              # pull newest images and restart, app by app
./stackctl down booking        # stop an app (data is kept)
./stackctl brand apply         # push name/logo/colour into every app
```

All of the above is also available in the console at `console.yourdomain.com`.

Backups are plain tarballs + SQL dumps — copy `./backups` off-server with
rclone/rsync/cron and you have disaster recovery.

## What this is (and isn't)

- Each app is the real upstream project on its official Docker image —
  not a fork, not a rewrite. You get their full feature set and updates.
- Email *sending* (invoices, newsletters, notifications) still needs an
  SMTP relay for deliverability — Amazon SES (~$0.10/1000 emails) or any
  SMTP provider. Set the `SMTP_*` values in `.env` and re-run
  `./stackctl up` on the affected apps. This is the one thing that can't
  be self-hosted well; everything else runs entirely on your box.
- Payments (Stripe), payroll, and SMS are regulated infrastructure and are
  intentionally out of scope.

## Repo layout

```
install.sh          one-time server bootstrap (Docker, .env, secrets, proxy)
stackctl            the CLI: up/down/status/logs/backup/restore/update
.env.example        every setting in one place; install.sh turns it into .env
traefik/            the HTTPS reverse proxy (Traefik v3 + Let's Encrypt)
apps/<name>/        one docker-compose.yml per app (self-contained)
docs/APPS.md        per-app first-login steps, notes, resource footprint
docs/SELLING.md     licensing notes if you productize this stack
```

## License notes

Every included app is free to self-host for your own business. If you plan
to resell hosting or bundle this as a product, read
[docs/SELLING.md](docs/SELLING.md) — licenses differ (MIT vs AGPL), and the
stack deliberately excludes tools (like n8n) whose licenses prohibit resale.
