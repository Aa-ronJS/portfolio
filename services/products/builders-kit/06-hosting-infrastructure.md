# 7. Hosting and infrastructure

Everything between "works on my machine" and "works at your domain
for everyone". None of it is hard; all of it is where non-builders
get quietly overcharged, and all of it goes in your name.

## 7.1 DNS, actually explained

DNS is the internet's phone book: your domain is a name, and DNS
records say what the name points at. Five record types cover your
entire life, and knowing them is the difference between doing a
five-minute change yourself and paying someone $150 to click twice:

- **A record:** name points at a server's numeric address. "The
  website lives at this machine."
- **CNAME record:** name points at another name. "www is an alias
  for whatever the hosting platform says today." Hosting platforms
  prefer these because they can move machines without you editing
  anything.
- **MX records:** where this domain's email gets delivered. Break
  these and email stops; the single most careful edit you will make.
- **TXT records:** free-text proofs and policies. Site verification
  ("prove you own this domain" for search consoles) and the email
  authentication trio in 7.4 all live here.
- **Nameservers (NS):** which company's system answers all of the
  above. Changing nameservers moves the whole phone book; changing
  records edits one line. Prefer editing records.

Working rules: your DNS lives wherever your nameservers point
(usually the registrar; sometimes the host); keep a screenshot of
the working records before any change; changes take minutes to
hours to spread, so make them at quiet times and never two at once.
And every record you did not create is a question to answer, which
is 7.5's audit.

## 7.2 Hosting a rung 1 or 2 build

The static-plus-functions platforms (Vercel, Netlify and
Cloudflare Pages are the type; free tiers cover most small sites
genuinely) all work the same way, which is the point of having put
git underneath everything:

1. Connect the platform to your GitHub repository.
2. It builds and publishes automatically on every push. Deploy is
   now `git push`, which you already do at every green moment.
3. Functions in your `api/` folder just run; the platform is the
   server you do not own.
4. Add your custom domain in its dashboard; it tells you the exact
   A/CNAME records to create, and issues HTTPS certificates
   automatically and forever. Padlock without effort.

Instruction shape for the whole thing: "We're deploying to
[platform]. Walk me through connecting the repo and the domain,
one step at a time, telling me exactly which DNS records to create
and where to click. Then add the deploy story to CLAUDE.md and the
README." Twenty minutes the first time, seconds forever after.

Platform choice honesty: at this scale they are interchangeable
enough that proximity beats performance charts; pick one, log the
decision, move on. What would force a move is in their pricing
pages, not their marketing.

## 7.3 Environments and secrets

Two rules carry all of secrets management at this scale:

- **Secrets live in the platform's environment variables, never in
  the repository.** API keys for your email service, anything with
  the word "secret" or "key": set them in the hosting dashboard,
  read them in functions as environment variables. The AI knows
  this pattern; your job is to notice if a key ever appears in a
  file and stop the commit. Add "never write secrets into files" to
  CLAUDE.md and let the crew enforce it too.
- **If a secret ever touches the repo, rotate it** (generate a new
  one, revoke the old). Git remembers forever; deleting the line
  does not delete the history. Rotation is five minutes; hoping is
  not a control.

The platforms also give every push a **preview deployment**: a
private URL of that version before it becomes the real site. Free
staging. Use it for anything you want to see live-but-not-public,
and for showing work to another human before shipping.

## 7.4 Email that arrives

Two separate jobs people conflate, worth keeping apart:

- **Receiving and sending as a human** (you@domain): a mailbox
  product, per the Website Kit's advice; set the MX records it
  gives you.
- **Sending as a machine** (the contact form's notifications, later
  a booking system's confirmations): a transactional email service
  (Resend, Postmark and SendGrid are the type; free tiers cover a
  small site's volume). Your function calls it with an API key
  (7.3); it sends.

Both jobs need the authentication trio in TXT records, because
unauthenticated mail goes to spam in the 2020s: **SPF** (which
services may send as your domain), **DKIM** (cryptographic
signature), **DMARC** (the policy tying them together). Every
provider hands you the exact records; the AI explains any of them
on sight. The verification that matters: send a test to a gmail
address and look at it arriving in the inbox, not the spam folder,
with "signed-by: your domain" in the details.

## 7.5 The infrastructure register

The Website Kit's ownership register, upgraded to this tier: one
file (INFRA.md, in the repo, no secrets in it) listing every
account (registrar, DNS, host, email, transactional email, any
API), what it does, who can log in, what it costs, when it renews,
and where its secrets are set. Plus a dated screenshot of your DNS
records after any change.

Quarterly, ask the crew: "Read INFRA.md. Here's the current DNS
export and the platform dashboard's integrations list. What exists
that isn't in the register, and what's in the register that no
longer exists?" Drift found in minutes, at your desk, instead of
during an outage.
