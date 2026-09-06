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
| MIT / Apache / BSD | Activepieces (CE), Vikunja, Ghost (MIT), Uptime Kuma, Umami, Shlink, Owncast, Excalidraw, Jitsi (Apache), Open WebUI, Ollama, Kokoro TTS, SadTalker (Apache-2.0, the AI presenter engine) | ✅ | ✅ | ✅ |
| Sustainable Use License | **n8n** | ✅ | ✅ (teaching/setup) | ❌ not as a paid hosted service — offer Activepieces there instead |
| AGPLv3 | Cal.com*, Twenty, Listmonk, Formbricks*, Docmost*, Documenso*, Nextcloud, Vaultwarden (GPL/AGPL), PeerTube, Postiz, Invoice Ninja (Elastic**) | ✅ | ✅ | ✅ if you publish source of any modifications |
| MIT + paid enterprise tiers | Mattermost (team edition), Chatwoot, Rocket.Chat (community) | ✅ | ✅ | ✅ (stay on the open edition) |
| GPL | EspoCRM (AGPLv3), Easy!Appointments (GPLv3), WordPress + WooCommerce (GPLv2) | ✅ | ✅ | ✅ if you publish source of any modifications |

\* These use AGPL for the core with some enterprise-only directories — the
stack uses only the open cores.
\*\* Invoice Ninja v5 is Elastic License 2.0: free to self-host and to set up
for clients; you may **not** offer it as a managed/hosted service to third
parties. If you go the managed-hosting route, swap it for Crater (MIT) or
handle invoicing clients differently.

## n8n, specifically

n8n's Sustainable Use License allows free self-hosting for your own
business and lets you teach, consult and set it up for clients. What it
does **not** allow is running it as a paid hosted service for others or
redistributing it commercially. So: it is the default Automations app for
your own stack and for the course/setup product; if you ever sell managed
hosting, switch those customers to Activepieces (MIT), which ships in the
stack as the optional simpler builder.

## The AI presenter, specifically

The talking-head engine is SadTalker (Apache-2.0), chosen over the better
known Wav2Lip precisely because Wav2Lip's weights are licensed for
non-commercial research only — unusable in a business product. The
presenter model weights are downloaded from the projects' own GitHub
releases on first start. The voice engine (Kokoro) is Apache-2.0 too. Use
only faces you have the right to use; a customer's own photo or a licensed
stock presenter, never a public figure.

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
