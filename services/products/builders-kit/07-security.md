# 8. Security

Security advice fails small builders in two directions: enterprise
checklists that do not apply, and silence. This document is the
middle: the realistic threat model for what you have built, the
protections that matter ranked, and, just as usefully, the things
you are allowed to ignore, said out loud.

## 8.1 Your actual threat model

Nobody is targeting you. What exists instead is weather: automated
scanning of everything on the internet, all the time, for known
weaknesses, plus opportunistic abuse of anything left open (forms,
inboxes, accounts with guessable passwords). Weather-proofing is
cheap and mostly done once; that is this document. The paranoid tier
(targeted attackers, nation states, disgruntled insiders) is not
your tier, and pretending it is wastes money that the real tier
needs.

Ranked by real-world frequency for a small business build:
account takeover via reused passwords, email-based fraud
(invoice redirection, lookalike domains), form and inbox abuse,
dependency and platform rot, and, for WordPress specifically,
unpatched plugins. Notice what leads: people and accounts, not
code. Secure those first.

## 8.2 Accounts: where the real risk lives

- **The email account that can reset everything is the crown
  jewel.** Strongest unique password, strongest available
  two-factor, recovery methods you control. Everything else chains
  from it.
- **Password manager, unique passwords everywhere, two-factor on
  every account in INFRA.md.** This paragraph outperforms every
  technical control in the rest of the kit combined, which is why
  it is the only bolded advice in the document.
- **Know your recovery story before you need it:** for each
  critical account, what happens if you lose your phone? Print the
  backup codes; store them like the passport they are.
- If anyone else ever gets access to anything, they get their own
  account with the least access that works, never your password,
  and INFRA.md records it. Offboarding is deleting their account,
  not changing yours everywhere.

## 8.3 The build itself

Rungs 1 and 2 are structurally hard to hack: no server you own, no
database, HTTPS automatic. What remains is yours to hold:

- **Secrets discipline** exactly per document 7: keys in platform
  environment variables, rotation on any exposure. Most "site
  hacked" stories at this rung are actually "key leaked".
- **Forms get abused, not hacked.** Spam bots will find your
  contact form within days. Defences in order of grace: a honeypot
  field (invisible to humans, filled by bots; the AI adds it in one
  increment), rate limiting in the function, and only if genuinely
  drowning, a CAPTCHA, which taxes every legitimate customer to
  punish bots. Also: cap message lengths, and never echo submitted
  content back into a page unescaped (say those words to the AI;
  it knows exactly what they mean).
- **Functions validate their inputs** as if every caller is
  hostile, because on the open internet every caller is a script.
  The spec's no-silent-failures rule pairs with this: reject
  loudly, log what was rejected.
- **Dependencies are a diet.** Every package is someone else's code
  running as you. The boring-stack doctrine already minimised them;
  quarterly, "list our dependencies, anything with known
  vulnerabilities or without updates for years?" and act on the
  answer.
- **WordPress track only:** updates applied monthly without fail
  (managed hosting does most of it), plugin count kept under ten,
  plugins chosen by maintenance recency not feature lists, admin
  accounts individually named with two-factor. Unpatched WordPress
  is the one place on this page where "hacked" is routine rather
  than rare.

## 8.4 Email fraud, because that is where small businesses bleed

The attacks that actually cost Australian small businesses money
are invoice redirection and impersonation, and they arrive through
email, not through your website. The site-adjacent defences: the
SPF/DKIM/DMARC trio from document 7 actually enforced (DMARC policy
moved from "monitor" to "quarantine" once reports look clean, an
increment the AI walks you through); a standing rule with your own
customers that bank details never change via email alone; and a
glance at lookalike domains of your own name once a year. None of
this is website work exactly, which is why nobody tells you, which
is why it is in the kit.

## 8.5 Backups and the recovery drill

Your repo on GitHub already backs up the site itself, which is most
of the answer at rungs 1 and 2. What it does not cover: DNS
configuration (the screenshots from document 7), environment
variables (INFRA.md says where they live; keep an offline copy of
which exist, not their values, and know where to regenerate each),
form submissions if you store any, and WordPress databases (managed
hosts back up; verify by finding the restore button, not by
believing the brochure).

Once, do the drill: pretend the platform account is gone, and walk
through what it would take to be live again from the repo plus your
records. The drill finds the missing piece while it is a note, not
an outage. Fifteen minutes, annually.

## 8.6 Permission to ignore, and when to call for help

You are allowed to ignore, at this scale: penetration testing, WAFs
(the CDN's free tier is plenty), security-header perfectionism
beyond what your platform defaults plus one AI hardening pass gives
you, SOC2-shaped anything, and every vendor email beginning "we
detected vulnerabilities on your website".

Call a professional the day: anything smells actually compromised
(strange content, strange sends, strange logins: change the crown-
jewel password first, then get help; hours matter and pride is
expensive); you start holding other people's sensitive data in
quantity; or a real client's contract demands formal security
posture. All three are past the kit's rung by definition, and
knowing the boundary is part of the method.
