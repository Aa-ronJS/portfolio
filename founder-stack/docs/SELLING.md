# Productizing this stack: what's allowed

Self-hosting all of this **for your own business** is unambiguously fine under
every included license. Turning it into a product needs a little care.

## The safe product shapes

1. **Teach it** (course, ebook, paid community, YouTube + template repo):
   "Replace $700/mo of SaaS with a $10 VPS." You're selling your knowledge,
   setup scripts, and support — every license here permits that. This is the
   proven model (see how people sell Coolify/self-hosting courses).
2. **Done-for-you setup** (consulting): you install Founder Stack on the
   *client's* server, they own it. Also fine under every included license —
   you're a contractor, not a service provider.
3. **Managed hosting** (you run it, clients pay monthly): mostly fine but
   read per-license notes below — AGPL apps require offering your
   modifications' source to users, and you must not use the upstream
   projects' names/logos to market your service.

## Per-license notes

| License | Apps here | Self-host | Sell setup/course | Host for clients |
|---|---|---|---|---|
| MIT / Apache | Activepieces (CE), Vikunja, Ghost (MIT), Uptime Kuma, Umami | ✅ | ✅ | ✅ |
| AGPLv3 | Cal.com*, Twenty, Listmonk, Formbricks*, Docmost*, Documenso*, Nextcloud, Vaultwarden (GPL/AGPL), Invoice Ninja (Elastic**) | ✅ | ✅ | ✅ if you publish source of any modifications |
| MIT + paid enterprise tiers | Mattermost (team edition), Chatwoot, Rocket.Chat (community) | ✅ | ✅ | ✅ (stay on the open edition) |
| GPLv3 | EspoCRM (AGPLv3), Easy!Appointments (GPLv3) | ✅ | ✅ | ✅ if you publish source of any modifications |

\* These use AGPL for the core with some enterprise-only directories — the
stack uses only the open cores.
\*\* Invoice Ninja v5 is Elastic License 2.0: free to self-host and to set up
for clients; you may **not** offer it as a managed/hosted service to third
parties. If you go the managed-hosting route, swap it for Crater (MIT) or
handle invoicing clients differently.

## Deliberately excluded

- **n8n** — its "Sustainable Use License" prohibits offering it as a paid
  service and restricts commercial redistribution. Activepieces (MIT core)
  covers the same Zapier-replacement job with no resale problem.

## Trademark rules (the part people get sued over)

- Never market as "your own Calendly/HubSpot/DocuSign" in product names,
  domains, or ads. "Scheduling like Calendly" as a truthful comparison is
  generally fine; branding your product with their marks is not.
- The open-source projects' own names (Cal.com, Chatwoot, ...) are also
  trademarks: you can say your product *deploys* them, but don't imply
  they endorse you.

## What to be honest about with buyers

- ~$10–40/mo VPS + SMTP relay costs still exist. "Never pay SaaS again",
  not "never pay anything again".
- Someone has to run `stackctl update` and `stackctl backup` (or cron them).
  Selling the maintenance cron + off-site backup config as part of the
  product is exactly the value-add worth charging for.
- Payments, payroll, and SMS can't be self-hosted; don't promise them.
