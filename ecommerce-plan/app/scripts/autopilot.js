'use strict';
// Daily autopilot run. Cron at 7am Adelaide time:
//   0 7 * * * cd /path/to/app && npm run -s autopilot >> autopilot.log 2>&1
// Or from fly: `fly ssh console -C "node scripts/autopilot.js"` on a schedule,
// or a scheduled machine. Prints a JSON summary; exits non-zero if a job threw.
const ap = require('../lib/autopilot');

ap.runAll(process.argv[2] || undefined).then((out) => {
  console.log(JSON.stringify(out, null, 2));
  const errors = Object.values(out).filter((v) => v && v.error).length;
  process.exit(errors ? 1 : 0);
});
