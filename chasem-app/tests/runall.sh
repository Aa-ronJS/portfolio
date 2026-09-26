#!/bin/bash
# Every suite, one after the other. Each prints PASS/FAIL lines and exits non-zero if any failed;
# this runner prints a tally at the end and exits non-zero if any suite did.
#
# Needs a Chromium: set QC_CHROME to its binary if it is not the sandbox default.
cd "$(dirname "$0")" || exit 1
ONLY="$*"
SUITES="apptest/flow apptest/e2e apptest/sendflow apptest/enquiry apptest/invguard apptest/auto apptest/geom
        apptest/detect apptest/sched-unit apptest/perf apptest/credits-app apptest/selfserve-app
        apptest/prefill-e2e apptest/setup-link apptest/calendar-app apptest/testdrive apptest/hostile apptest/usable apptest/wall apptest/signin apptest/cardpay apptest/pics apptest/addquote apptest/landing2 apptest/landing-welcome apptest/council6
        smoke/data/engine2 smoke/data/ingest smoke/data/import smoke/data/pdf smoke/data/pricing smoke/data/xss smoke/data/xss2
        smoke/measure/flow smoke/measure/flow2 smoke/measure/inputs smoke/measure/lidar smoke/measure/scale smoke/measure/ar
        smoke/send/app smoke/send/unit
        smoke/shell/pwa smoke/shell/routing smoke/shell/seeded"
# these need fixtures that tests/mtest and tests/smoke/measure generate (see tests/README.md):
#   apptest/fbias apptest/pack smoke/measure/pack
bad=0
for t in $SUITES; do
  [ -n "$ONLY" ] && case " $ONLY " in *" $t "*) ;; *) continue;; esac
  printf '%-28s' "$t"
  out=$( cd "$(dirname "$t")" && timeout 900 node "$(basename "$t").cjs" 2>&1 )
  code=$?
  line=$(printf '%s\n' "$out" | grep -E '^(ALL PASSED|FAILURES)' | tail -1)
  # a suite that prints FAILURES but exits 0 has still failed: the exit code is not the only word
  if [ $code -ne 0 ] || [ -z "$line" ] || [ "${line#FAILURES}" != "$line" ]; then bad=$((bad+1)); echo "FAILED (exit $code) ${line:-no summary line}"; printf '%s\n' "$out" | grep -E '^FAIL|Error|CRASH|HARNESS' | head -5 | sed 's/^/    /';
  else echo "$line"; fi
done
echo
[ $bad -eq 0 ] && echo "every suite passed" || echo "$bad suite(s) failed"
exit $bad
