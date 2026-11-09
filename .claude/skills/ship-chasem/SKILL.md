---
name: ship-chasem
description: Ship a Chasem change to production (chasem.app and go.chasem.app). Syncs the app copy, bumps sw.js VERSION, runs both test suites, then deploys. Use when asked to ship, deploy, release or push Chasem live.
---

# Ship Chasem

Ship only when every step passes. If a step fails, stop, say which one, and show its output.
Don't deploy a red build "because it's only one test".

1. **Sync and bump.** If anything under `chasem-app/` changed since the last deploy:
   `tools/sync-chasem.sh --bump`. Otherwise run `tools/sync-chasem.sh`.
   Then `tools/check-chasem-sync.sh` must say `chasem sync: ok`.

2. **Relay tests.** `cd chasem-landing && npm ci && npm test` ends with ALL PASSED on every file.

3. **App tests.** These need the rendered wall photos. If `chasem-app/tests/mtest/truth.json` is missing:
   ```
   pip install -q opencv-python-headless numpy
   cd chasem-app/tests && python3 mtest/scene.py && python3 mtest/scene2.py \
     && python3 mtest/scene3.py && python3 mtest/scene3.py bias \
     && python3 smoke/measure/scene4.py && python3 smoke/measure/fixtures.py
   ```
   Then `cd chasem-app && npm ci && QC_CHROME=<chromium binary> npm test` must end with
   `every suite passed`. In a cloud session the binary is
   `ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome`. The suites take several minutes,
   so run them in the background.

4. **Commit** with a one-line message saying what changed for the tradie, not for the code.

5. **Deploy.** Only when Aaron has said to ship *this* change:
   `cd chasem-landing && npx vercel deploy --prod`. Deploying needs the Vercel login, so in a
   cloud session without one, stop here and tell him the branch is ready.

6. **Check it's live.** Fetch `https://go.chasem.app/sw.js` and confirm it serves the new
   VERSION. Fetch `https://chasem.app/` and confirm it answers 200.
