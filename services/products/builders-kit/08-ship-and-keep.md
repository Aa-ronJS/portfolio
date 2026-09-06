# 9. Ship and keep

The last document: launch verification, the running of the thing,
and the honest edges of the method.

## 9.1 Ship

Launch is the pre-ship review from document 6 (spec's "done means"
verified by hand, adversarial sweep completed) plus the public
plumbing: domain connected with the padlock showing, the search
console verified and sitemap submitted, one link-preview check, and
the infrastructure register current. Then push, and tell the people
who should know.

Keep the launch-day discipline of the whole kit: at 90 per cent,
ship. The remaining tenth improves faster with real users than with
another week of solitary polish, and the loop you now own makes
every improvement a small, safe increment.

## 9.2 The operating rhythm

**Weekly, two minutes:** open the site like a stranger on your
phone; submit nothing, just look. Glance at the form notifications
actually arriving.

**Monthly, twenty minutes, calendared:** the two-width click-
through; the search console's queries and clicks (learning what the
internet thinks you are for); WordPress track, updates applied;
one small content improvement, because stale sites read as closed
businesses. Run the adversarial prompt over anything you changed.

**Quarterly, an hour:** the dependency diet check and the INFRA.md
drift audit (documents 7 and 8); reread SPEC.md against reality and
update whichever one has drifted; skim DECISIONS.md and enjoy how
many arguments it has prevented.

**Annually:** the recovery drill; renewal dates confirmed against
the register; and a fresh look at whether the architecture rung
still fits the business, climbing only if a logged requirement
says so.

**Set up the free tripwires once:** an uptime monitor pinging the
site (free tiers abound) so you hear about downtime from a robot
rather than a customer, and the platform's deploy notifications on,
so a failed build never sits unnoticed.

## 9.3 Growing it without wrecking it

New features re-enter through the front door: spec first, decision
logged, increment built, adversarially reviewed, verified at two
widths, committed. The method does not change at feature twelve;
the projects that rot are the ones that stopped doing the loop
once they "knew what they were doing".

When a feature request forces a rung change (the first "users need
to log in", the first "we need to store bookings"), treat it as
architecture, not as a feature: back to document 5's table, cost
the step honestly, and remember the sheet-behind-a-function rung
before the framework rung. The best feature decisions this kit can
give you are the two or three you decline.

## 9.4 The honest edges

Where the method's returns genuinely thin out, so you can see the
boundary coming rather than hit it:

- **Sustained multi-person concurrency:** many hands in one repo
  daily wants engineering-team practices (reviews, CI, branch
  discipline) beyond this kit's scope.
- **Regulated and high-stakes data:** health records, payments
  handled directly rather than through a processor, anything with
  a compliance regime. The moment a form would collect it, stop
  and get advice.
- **Rescue of somebody else's ruin:** the method builds clean
  systems; excavating a haunted one is a different skill, priced
  accordingly, and my project-rescue page exists for a reason.
- **The hours simply not existing:** the kit compresses skill, not
  time. A neglected system plus this kit is still a neglected
  system.

At those edges, hiring is not the method failing; choosing the
right moment to hire is the method working. You will arrive at
that conversation with a spec, a decision log, an infrastructure
register and a verified system, which makes you the client every
professional hopes answers the phone, and makes their quote
smaller than it would have been. If the professional is me, your
licence year's fee is already off the invoice.

And that is the kit. Same closing instruction as the cheaper one,
meant just as literally: build the thing.
