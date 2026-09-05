# Founder Stack

**Your entire business software stack. One server. One install. $0/month in SaaS fees.**

Founder Stack replaces ~$700+/month of SaaS subscriptions with battle-tested,
self-hosted open-source equivalents — deployed together, behind one domain,
with HTTPS everywhere, in one command.

| You'd pay for | Typical cost | You get instead | Your URL |
|---|---|---|---|
| Calendly | $12+/mo | [Cal.com](https://cal.com) | `cal.yourdomain.com` |
| FreshBooks / QuickBooks | $30+/mo | [Invoice Ninja](https://invoiceninja.com) | `invoices.yourdomain.com` |
| HubSpot CRM | $20–800/mo | [Twenty](https://twenty.com) | `crm.yourdomain.com` |
| Zapier | $30+/mo | [Activepieces](https://activepieces.com) | `automate.yourdomain.com` |
| Mailchimp | $20+/mo | [Listmonk](https://listmonk.app) | `newsletter.yourdomain.com` |
| Typeform | $29+/mo | [Formbricks](https://formbricks.com) | `forms.yourdomain.com` |
| Asana / Trello | $11+/user/mo | [Vikunja](https://vikunja.io) | `tasks.yourdomain.com` |
| Notion / Confluence | $10+/user/mo | [Docmost](https://docmost.com) | `docs.yourdomain.com` |
| Slack | $8+/user/mo | [Mattermost](https://mattermost.com) | `chat.yourdomain.com` |
| Zendesk / Intercom | $55+/mo | [Chatwoot](https://chatwoot.com) | `support.yourdomain.com` |
| DocuSign | $25+/mo | [Documenso](https://documenso.com) | `sign.yourdomain.com` |
| Google Analytics 360 / Mixpanel | $0–lots | [Umami](https://umami.is) | `analytics.yourdomain.com` |
| Dropbox / Google Drive | $12+/mo | [Nextcloud](https://nextcloud.com) | `files.yourdomain.com` |
| 1Password | $8+/mo | [Vaultwarden](https://github.com/dani-garcia/vaultwarden) | `vault.yourdomain.com` |
| Statuspage / Pingdom | $10+/mo | [Uptime Kuma](https://github.com/louislam/uptime-kuma) | `status.yourdomain.com` |
| Substack / Wix | 10% / $16+/mo | [Ghost](https://ghost.org) | `blog.yourdomain.com` |

Total replaced: **$700+/month**. Total cost: **one VPS (~$10–40/month)**.

Plus two pieces that tie it together:

- **The hub** — `home.yourdomain.com` (and the bare domain): one page with
  every app as a tile, grouped by job (Customers / Money / Marketing /
  Team / Operations), with a live running-status dot per app and server
  CPU/RAM/disk at the top. Bookmark one URL, reach everything.
- **One identity** — real single sign-on (Authentik at
  `auth.yourdomain.com`, auto-configured by blueprint, `./stackctl sso on`)
  for every app that supports OIDC, plus scripted provisioning for the
  rest: `./stackctl user add jane@yourco.com` creates the same
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

## Quickstart

```bash
git clone https://github.com/Aa-ronJS/portfolio.git
cd portfolio/founder-stack
sudo ./install.sh          # installs Docker if needed, asks for your domain,
                           # generates every secret, starts the HTTPS proxy

./stackctl list            # see the catalog
./stackctl up homepage     # the hub — bookmark https://home.yourdomain.com
./stackctl up calcom listmonk umami    # start what you want...
./stackctl up --all                    # ...or everything
./stackctl sso on          # optional: one login for the stack (docs/SSO.md)
./stackctl user add jane@yourco.com    # one command onboards a teammate everywhere
./stackctl status
```

That's it. Every app comes up on its own subdomain with a Let's Encrypt
certificate. Admin credentials are pre-seeded from `.env` where the app
supports it; the rest ask you to create the admin account on first visit
(see [docs/APPS.md](docs/APPS.md) for the exact first-login step per app —
until you've done it, that URL is an open admin-signup page, so do it
right after `up`).

## Day-2 operations

```bash
./stackctl status              # what's running, and where
./stackctl logs chatwoot       # tail an app's logs
./stackctl backup              # dump every database + volume to ./backups/<timestamp>/
./stackctl restore <dir>       # restore a backup
./stackctl update              # pull newest images and restart, app by app
./stackctl down calcom         # stop an app (data is kept)
```

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
