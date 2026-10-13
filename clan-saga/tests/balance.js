// Plays thousands of games with no Claude and no screen, to check the
// balance: sensible play should nearly always get through, careless play
// should sometimes not, and no single choice should be all you ever need.
// Run: node tests/balance.js
'use strict';
var Sim = require('../public/sim.js');

var POLICIES = {
  // Reads the food and the season, as a thoughtful player would.
  sensible: function (s, rng) {
    var f = Sim.seasonsOfFood(s), season = Sim.seasonName(s);
    var hurt = s.members.filter(function (m) { return m.state !== 'well'; }).length;
    if (s.next === 'prowler' || s.next === 'fever') return 'rest';
    if (s.next === 'herds') return 'hunt';
    if (s.next === 'bounty') return 'gather';
    if (s.next === 'lean') return 'hunt';
    if (f < 1.2 || season === 'Autumn') return rng() < 0.5 ? 'hunt' : 'gather';
    if (hurt >= 2) return 'rest';
    if (Sim.unknownPlaces(s).length && f > 1.8) return 'explore';
    return rng() < 0.6 ? 'gather' : 'hunt';
  },
  gatherOnly: function () { return 'gather'; },
  huntOnly: function () { return 'hunt'; },
  random: function (s, rng) { return ['gather', 'hunt', 'explore', 'rest'][Math.floor(rng() * 4)]; }
};

// How quickly the player's ideas land: a chance per season that the
// chapter goal is invented, after a couple of seasons of looking around.
function play(policy, seed, ideaChance) {
  var s = Sim.newGame({ seed: seed });
  var rng = Sim.makeRng(seed * 31 + 7);
  var perChapter = [];
  var seasonsHere = 0, deathsHere = 0;
  while (!s.finished && s.seasonCount < 400) {
    var choice = POLICIES[policy](s, rng);
    var attempt = null;
    var who = Sim.suggestedInventor(s);
    if (who && s.chapterSeason >= 2 && rng() < 0.85) {
      var ch = Sim.chapterOf(s);
      var works = rng() < ideaChance;
      attempt = { whoId: who.id, verdict: works
        ? { outcome: 'works', learned: 'the goal', tags: ch.goal.tags.slice(0, 1), epithet: '', injury: 'none', food_found: 0 }
        : { outcome: rng() < 0.5 ? 'partial' : 'fails', learned: '', tags: [], epithet: '', injury: rng() < 0.05 ? 'minor' : 'none', food_found: 0 } };
    }
    var r = Sim.resolveSeason(s, choice, attempt);
    seasonsHere++; deathsHere += r.deaths.length;
    if (r.goalMet && !s.finished) {
      perChapter.push({ seasons: seasonsHere, deaths: deathsHere });
      seasonsHere = 0; deathsHere = 0;
      Sim.advanceChapter(s);
    }
  }
  if (s.finished === 'won') perChapter.push({ seasons: seasonsHere, deaths: deathsHere });
  return { result: s.finished || 'stuck', chapter: s.chapter, perChapter: perChapter, seasons: s.seasonCount };
}

var N = 2000;
var chance = Number(process.argv[2] || 0.25);
console.log('Idea success chance per season: ' + chance + ', games per policy: ' + N + '\n');
Object.keys(POLICIES).forEach(function (p) {
  var won = 0, lostAt = [0, 0, 0, 0, 0, 0, 0], seasons = 0, deathsByCh = [0, 0, 0, 0, 0, 0, 0], reachedCh = [0, 0, 0, 0, 0, 0, 0];
  for (var i = 1; i <= N; i++) {
    var g = play(p, i, chance);
    if (g.result === 'won') { won++; seasons += g.seasons; } else lostAt[g.chapter]++;
    g.perChapter.forEach(function (c, ci) { deathsByCh[ci] += c.deaths; reachedCh[ci]++; });
  }
  console.log(p.padEnd(11) + ' won ' + (100 * won / N).toFixed(1) + '%' +
    '   lost in chapter 1-7: ' + lostAt.join(' / ') +
    '   avg seasons to win: ' + (won ? (seasons / won).toFixed(0) : '-') +
    '\n            deaths per finished chapter: ' + deathsByCh.map(function (d, ci) { return reachedCh[ci] ? (d / reachedCh[ci]).toFixed(1) : '-'; }).join(' / '));
});
