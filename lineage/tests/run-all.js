// Runs every scenario test on several world seeds and prints a summary.
const { execFileSync } = require('child_process');
const path = require('path');
const tests = ['refuse','interrupt','theft','recog','engine','explore','soak','every','water','tutorial'];
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['222','777','4444'];
let fails = 0;
for (const t of tests) for (const sd of seeds) {
  let line = '';
  try { line = execFileSync('node', [path.join(__dirname,'scenarios.js'), t, sd], {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim().split('\n').pop(); }
  catch (e) { line = t+' ERROR '+(e.stderr||e.message).split('\n')[0]; }
  const pass = /"PASS":true/.test(line);
  if (!pass) fails++;
  console.log((pass?'PASS ':'FAIL ')+t.padEnd(10)+' seed '+sd.padEnd(6)+' '+line.slice(0,160));
}
console.log(fails ? `\n${fails} result(s) failed. Some tests are probabilistic; see README.` : '\nAll passed.');
