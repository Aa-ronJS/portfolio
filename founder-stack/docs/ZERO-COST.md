# Running Founder Stack for literally $0/month

The software is free. The three things that normally cost money — a server,
a domain, and email delivery — each have a free tier big enough for a small
business. This is the exact recipe. Budget ~45 minutes.

| Need | Free option | Limit | Good enough for |
|---|---|---|---|
| Server | **Oracle Cloud "Always Free"** ARM VM | 4 cores, 24 GB RAM, 200 GB disk, forever | the entire stack, all apps at once |
| Domain | **DuckDNS** free subdomain (`yourbiz.duckdns.org`) | one name, wildcard subdomains work | everything; upgrade to a real domain (~$10/yr) when you want to look polished |
| Email | **Resend** free tier (or Brevo) | 3,000 emails/month (Brevo: 300/day) | invoices, invites, a modest newsletter |

Total: **$0/month, indefinitely.** No credit card is charged (Oracle asks
for one to verify identity; Always Free resources never bill).

Alternative server at $0: a machine you already own (old laptop, mini PC,
Raspberry Pi 4/5 with 8 GB) — see "Own hardware" at the bottom.

---

## 1. Server: Oracle Cloud Always Free (about 20 minutes)

1. Sign up at cloud.oracle.com → **Free Tier**. Pick a home region near you
   (it can't be changed later).
2. Compute → Instances → **Create instance**:
   - Image: **Ubuntu 22.04** (or 24.04)
   - Shape: **Ampere → VM.Standard.A1.Flex**, set **4 OCPU / 24 GB** (the
     full Always Free allowance; you can use it all on one VM)
   - Networking: create a new VCN with a **public IPv4**
   - Add your SSH public key, download the private key if generated
3. Note the **public IP**.
4. **Open ports 80 and 443** — two places, both required (this is the step
   everyone misses):
   - **Cloud firewall:** Networking → your VCN → Security Lists → Default →
     Add Ingress Rules: source `0.0.0.0/0`, TCP, destination port `80`;
     repeat for `443`.
   - **OS firewall:** Oracle's Ubuntu image ships with a restrictive
     iptables. SSH in and run:
     ```bash
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```

If instance creation fails with **"Out of host capacity"**: the ARM free
shapes are popular. Try a different Availability Domain, or a smaller size
(2 OCPU / 12 GB is plenty for 10+ apps), or retry later — it usually clears
within a day.

## 2. Domain: DuckDNS (5 minutes)

1. Go to duckdns.org, sign in (GitHub/Google), create a subdomain:
   `yourbiz` → you get `yourbiz.duckdns.org`.
2. Set its IP to your server's public IP.
3. Done. DuckDNS resolves **every** subdomain of your name to that IP
   (`cal.yourbiz.duckdns.org`, `crm.yourbiz.duckdns.org`, ...), which is
   exactly the wildcard the stack needs. Let's Encrypt issues certificates
   for DuckDNS names without any special handling.

When you install, answer the domain prompt with `yourbiz.duckdns.org`.

Prefer a real domain later? Buy one (~$10/yr), point a wildcard `A` record at
the same IP, change `BASE_DOMAIN` in `.env`, run `./stackctl up --all`
again — new certificates are issued automatically.

## 3. Email: Resend free tier (10 minutes)

Self-hosting a mail *server* is the one thing that does not work well —
big providers distrust new IPs and your mail lands in spam. A relay with a
good reputation fixes that, and the free tiers are generous:

- **Resend** — 3,000 emails/month, 100/day, free forever. Add and verify
  your domain (DNS records they show you), create an API key.
  SMTP: host `smtp.resend.com`, port `587`, user `resend`, password = API key.
- **Brevo** (alternative) — 300 emails/day free forever.
  SMTP: `smtp-relay.brevo.com`, port `587`, your login + SMTP key.

Enter these when `install.sh` asks, or later in `.env` (`SMTP_*`), then
`./stackctl up <app>` on the apps that send mail.

With a DuckDNS name you can't verify a sending domain, so the from-address
will be a Resend/Brevo shared one — fine for transactional mail. Buy a real
domain when you start sending newsletters.

## 4. Install (5 minutes)

```bash
ssh ubuntu@<server-ip>
git clone https://github.com/Aa-ronJS/portfolio.git
cd portfolio/founder-stack
sudo ./install.sh          # domain: yourbiz.duckdns.org, SMTP from step 3
./stackctl up --all
./stackctl sso on
./stackctl user add you@yourbiz.com
```

`install.sh` detects the ARM server and `up --all` automatically picks the
ARM-capable apps (below). Open `https://home.yourbiz.duckdns.org`.

## ARM compatibility (why three apps are swapped)

Every image was checked against its registry manifest. 17 of 20 stacks
publish arm64 images and run as-is. Three upstreams publish **amd64-only**
images, so on ARM the stack substitutes a like-for-like open-source
alternative on the same subdomain:

| amd64-only | ARM alternative | Same job | Notes |
|---|---|---|---|
| Cal.com | **Easy!Appointments** | booking pages, calendar sync | lighter; no team round-robin; admin auto-bootstrapped |
| Twenty CRM | **EspoCRM** | contacts, deals, pipeline, email | more mature; admin pre-seeded from `.env` |
| Mattermost | **Rocket.Chat** | team chat, channels, DMs, apps | admin pre-seeded; `stackctl user add` supported |

`stackctl list` marks them. On an amd64 server the originals are used and
the alternatives are simply available if you prefer them. The pairs share a
subdomain, so `stackctl up` refuses to start both sides at once.

## Own hardware instead of a cloud VM

An old laptop or mini PC running Ubuntu behind your home router works too.
Two obstacles, both solved for free:

- **No stable public IP / can't open ports (CGNAT):** use **Cloudflare
  Tunnel** (free). It makes an outbound connection from your box to
  Cloudflare and serves your subdomains through it — no port forwarding, no
  public IP needed. Requires a real domain on Cloudflare DNS (~$10/yr, the
  one non-free part of this route), or reuse a domain you already own.
- **Dynamic IP with ports you *can* open:** DuckDNS again — run its
  update script from cron so the name follows your IP.

Cloudflare Tunnel setup (10 minutes):

1. Add your domain to Cloudflare (free plan) and point its nameservers there.
2. Cloudflare dashboard → Zero Trust → Networks → Tunnels → **Create a
   tunnel** (Cloudflared) → copy the **token**.
3. Public hostname: subdomain `*`, domain yours, service **HTTPS** →
   `traefik:443`; under *Additional application settings → TLS* turn on
   **No TLS Verify**. (Cloudflare serves real certificates at its edge;
   inside your box Traefik uses its own.)
4. On the server: put the token in `.env` as `CF_TUNNEL_TOKEN`, then
   ```bash
   sudo ./install.sh          # same as always; ports 80/443 need not be open
   ./stackctl tunnel up
   ./stackctl up --all
   ```
Everything else — hub, SSO, `user add`, backups — works unchanged.

## What's still not free, honestly

- **Your time**: an hour to set up, ~10 minutes a month for
  `stackctl update` and checking backups. Cron both and it's ~zero.
- **Off-site backups**: `stackctl backup` writes locally; copy to free
  storage (a second Oracle free VM's 200 GB, or Backblaze B2's 10 GB free).
- **Scale**: past ~20 people or heavy newsletter volume you'll outgrow the
  free tiers — at which point a $20/mo server is still a rounding error
  against the SaaS bill you're not paying.
