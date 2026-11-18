# The council

Every script is pitched, commissioned, drafted and then reviewed by the
reviewers its channel lists in `channel.yaml` under `council.reviewers`.
It only reaches the queue when **every** reviewer passes it with a score
of at least `council.pass_score` (default 8) and no blocking issues.
Otherwise it's rewritten from their notes and reviewed again, up to
`council.max_rounds` (default 3), then binned to `rejected/` with every
review attached.

Each file here is one seat. The header sets:
- `veto: true`: a "reject" from this seat bins the script immediately.
- `search: true`: the seat researches on the web before judging.

Edit the text below the header to change how a seat thinks.
`commissioner.md` isn't a reviewer; it picks between three pitches
before anything is drafted.
