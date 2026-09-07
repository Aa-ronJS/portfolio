'use strict';
/* The course, as data. The watch page renders this. Video URLs are empty until
   each one is recorded; the page says so honestly rather than embedding
   nothing. Paste the unlisted YouTube or Loom embed URL into `embed` and
   redeploy; buyers' links do not change. */

const lessons = [
  {
    n: '01', minutes: 8,
    title: 'A specification, not a wish.',
    embed: '',
    summary: 'Why "build me a dashboard" produces a beautiful wrong thing, and the one-page brief that stops it. Written live for a small real tool, then run.',
    doNow: 'Open a project you actually want built. Fill in checklist one for it before you watch video two. Ten minutes, badly, beats an hour of thinking about it.',
  },
  {
    n: '02', minutes: 8,
    title: 'Done is a claim, not a fact.',
    embed: '',
    summary: 'Two things an agent told me were finished that were not, and the check against something you do not control that would have caught both.',
    doNow: 'Add one external check to the tool from video one. Something the agent cannot fake: a different data source, a real API, the live website. Run it.',
  },
  {
    n: '03', minutes: 6,
    title: 'Set it against itself.',
    embed: '',
    summary: 'One run builds, a second run that knows nothing about the first tries to break it. How to brief the second run, and what it found in my own tool within an hour of going live.',
    doNow: 'Start a fresh session. Give it the checklist-two prompt and nothing else. Read what comes back before you believe your build works.',
  },
];

const checklists = [
  {
    n: 'Checklist 01',
    title: 'The one-page brief',
    intro: 'Fill this in before the first prompt. If a section is empty, that is the part the agent will invent.',
    sections: [
      { h: 'What it must do', items: [
        'The one sentence a user would say about it. Not a feature list.',
        'The three to five things it must do, each one testable by a person who did not build it.',
        'The inputs it gets, exactly, with a real example of each.',
        'The outputs it produces, exactly, with a real example of each.',
      ]},
      { h: 'What it must never do', items: [
        'Data it must not touch, delete or send anywhere.',
        'Actions it must ask before taking (spending money, emailing a customer, writing to the live system).',
        'Things it is not allowed to guess. Name them. "If the suburb is ambiguous, ask, do not pick one."',
        'Dependencies it may not add without asking.',
      ]},
      { h: 'The edge cases', items: [
        'The empty case: no records, no results, a blank field.',
        'The duplicate case: two of something that should be one.',
        'The stale case: data that was true last month.',
        'The hostile case: an input written by someone trying to break it.',
        'The one that already went wrong once. There is always one. Write it down.',
      ]},
      { h: 'What finished looks like', items: [
        'The exact command or click that proves it works, and what you expect to see.',
        'The external check: something outside the agent\'s control that the result must agree with.',
        'Who signs off, and what they will look at.',
        'What is explicitly out of scope, so "done" cannot quietly grow.',
      ]},
    ],
  },
  {
    n: 'Checklist 02',
    title: 'Before you believe it',
    intro: 'Run this every time an agent says it is finished. An agent saying done is a claim, not a fact.',
    sections: [
      { h: 'Did it do what was asked', items: [
        'Re-read your brief, then the result. Every "must do" line: show me, do not tell me.',
        'Run the finished-looks-like command yourself, in a fresh terminal, not in the agent\'s.',
        'Look for the thing it built instead. Extra features are a sign it filled a gap you left.',
      ]},
      { h: 'Does the proof prove anything', items: [
        'Open every test it wrote. Could this test fail? If you cannot make it fail, it is not a test.',
        'Find the numbers in any report it produced. Where did each one come from? Blanks scored against blanks read as perfect.',
        'Check the documentation against the code. Describe-then-not-build is the most common overclaim there is.',
      ]},
      { h: 'Does the world agree', items: [
        'Compare the output against a source the agent never touched: the original spreadsheet, the live API, a second provider.',
        'Feed it the edge cases from checklist one, especially the hostile one and the one that went wrong before.',
        'Give it the refusal test: ask it for something it should decline, and see whether it does.',
      ]},
      { h: 'The second run', items: [
        'New session, no memory of the first. Paste: "Here is a tool and its brief. Your job is to break it: find inputs it handles wrong, claims in its docs that are false, and tests that cannot fail. Report each with the exact steps."',
        'Fix what it finds. Then run it again. Stop when a run finds nothing you agree is real.',
        'Write down what it found. That list is next month\'s edge cases.',
      ]},
    ],
  },
];

module.exports = { lessons, checklists };
