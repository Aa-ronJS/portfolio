/* A complete sample issue for MOCK_GENERATE=1 and for the demo on the landing
   page. Written by hand so the layout can be worked on without an API key. */
export function fixture(doc) {
  const n = (doc && doc.subject && doc.subject.name) || 'Sam';
  return {
    masthead_tagline: 'Fearless. Unverified. Delivered before the cake.',
    issue_line: `Special Birthday Edition. Est. the year ${n} was born.`,
    cover: {
      kicker: 'WORLD EXCLUSIVE',
      headline: `${n.toUpperCase()} IN BUNNINGS FOR FOURTH TIME THIS WEEK`,
      standfirst: `Sources confirm the ${n} household now owns three of the same drill and "a bag of screws for a project that does not exist".`,
      teasers: ['Thermostat war enters year six', 'The remote: what really happened', 'Agony aunt: "My family hides the esky"', 'Horoscope: Bunnings Rising'],
      caption: `${n}, pictured moments before "just popping in".`,
    },
    lead: {
      headline: 'THE DRILL BIT THAT BROKE A FAMILY',
      byline: 'By our Chief Hardware Correspondent',
      paragraphs: [
        `${n} was seen entering the Mile End Bunnings at 7:02am on Saturday, a source close to the family has revealed, in what is understood to be the fourth visit in five days.`,
        `"It was meant to be one thing," said a close friend who asked not to be named. "One thing. There were nine things in the trolley and one of them was a sausage."`,
        `Insiders describe a shed at the property "you cannot open the door of", stacked with what one expert called "a catalogue's worth of good intentions".`,
        `The claims come as the household thermostat dispute enters its sixth year. ${n} is understood to have installed a lock on the device in 2021. "Nobody else is allowed near it," said a source. "It is set to 19 and it is staying at 19."`,
        `Reached for comment, ${n} said the drills were "different drills" and that the screws were "for later".`,
        `A spokesperson for Bunnings declined to comment but confirmed that the sausage sizzle "has never been busier".`,
      ],
      pull_quote: 'There were nine things in the trolley and one of them was a sausage.',
    },
    interview: {
      headline: 'THE SOURCE SPEAKS: "I have seen the remote"',
      intro: `In a dimly lit kitchen, over a cup of tea that ${n} would describe as "too weak", we sat down with someone who has lived through it all.`,
      qa: [
        { q: 'Where is the remote right now?', a: `Under ${n}. It is always under ${n}. It has been under ${n} for a decade.` },
        { q: 'Describe the mower situation.', a: 'Sunday. Seven sharp. The whole street knows. A neighbour once moved.' },
        { q: 'The esky. Explain.', a: `It is the most important bag on any trip. It has its own seat. Children do not.` },
        { q: 'Is the shed for thinking or for hiding?', a: 'Yes.' },
        { q: 'What is the signature dish?', a: 'A dad joke, served with a completely straight face, to a table that has heard it forty times.' },
        { q: `One word for ${n}?`, a: 'Ute.' },
      ],
    },
    spotted: {
      headline: 'SPOTTED',
      items: [
        `Mile End Bunnings, 7:02am: ${n}, "just popping in", three hours.`,
        `The recliner, 2pm Sunday: ${n}, eyes closed, "not asleep, just resting them".`,
        `The driveway, any Saturday: the ute, being looked at admiringly, going nowhere.`,
        `The kitchen, 6:40am: the thermostat lock, being checked.`,
        `A family barbecue: a sausage described as a "snag" fourteen times in one afternoon.`,
        `The shed, dusk: a light on, a radio, and no visible project.`,
      ],
    },
    listicle: {
      headline: 'THE 5 GREATEST HITS OF A LEGENDARY CAREER',
      items: [
        { title: 'The Drill Trilogy (2019 to 2024)', blurb: 'Three identical drills. One task. Nobody knows what the task was.' },
        { title: 'The Thermostat Lock', blurb: 'A small padlock. A large statement. Nineteen degrees, forever.' },
        { title: 'The Great Remote Sit', blurb: 'A forty-minute search for a device located, eventually, under the searcher.' },
        { title: 'The Seven O\'Clock Mow', blurb: 'A neighbourhood tradition nobody in the neighbourhood asked for.' },
        { title: 'The Esky Seatbelt Incident', blurb: 'A cooler was buckled in. A teenager was not. Priorities were clarified.' },
      ],
    },
    agony: {
      headline: 'DEAR DEIRDRE',
      letter: `I only ever go in for one thing. One. I have a list, in my head, and the list has one item on it. And yet I come home with a bag of screws, two things that were on special, a sausage and a strong sense that I have been here before. My family has started timing me. Is this normal? Should I be worried? Also, is it warm in here to you? It feels warm.`,
      signoff: 'Just Popping In, Mile End',
      reply: `Dear Just Popping In, it is not warm in here. It is nineteen degrees and everybody knows why. As for the one thing: the trouble is not the list, it is the trolley. Nobody who intends to buy one thing takes a trolley. Next time take nothing. Walk in with your hands in your pockets. You will still come out with a sausage, but at least the shed will thank you.`,
    },
    horoscope: {
      sign: 'Bunnings Rising',
      reading: 'A powerful retail alignment this month brings an unexpected trip to a large green shed, possibly several. Resist the aisle marked "special". A remote you have given up on returns to you, though not before you stand up. Mercury is in the recliner. So are you.',
      lucky: 'Lucky number: 19. Lucky item: a bag of screws for later.',
    },
    classifieds: [
      { heading: 'FOR SALE', body: 'Cordless drill, as new, one of three. Buyer must not tell the owner. Mile End.' },
      { heading: 'WANTED', body: 'Anyone who has seen the remote since Tuesday. Reward: the remote.' },
      { heading: 'LOST', body: 'Sunday morning sleep-in. Last seen before the mower was purchased. Sentimental value.' },
      { heading: 'PUBLIC NOTICE', body: 'The thermostat is set to 19. This is not a discussion. Signed, Management.' },
      { heading: 'MISSED CONNECTIONS', body: 'You: in the recliner, eyes shut. Me: asking a question. You said you heard me. You did not.' },
      { heading: 'SERVICES', body: 'Dad jokes, all occasions, no notice required, cannot be stopped once started.' },
    ],
    ad: {
      brand: 'ShedSpace Pro',
      slogan: 'Because a fourth drill needs a home too.',
      fine_print: 'ShedSpace Pro does not create space. It creates the feeling of space, briefly, until the next trip. Not to be used as a solution.',
    },
    numbers: [
      { figure: '19°', label: 'The only temperature' },
      { figure: '3', label: 'Identical drills, one task' },
      { figure: '7:00', label: 'Sunday. Sharp. Every week' },
      { figure: '0', label: 'Times the remote was not under him' },
    ],
    poll: {
      question: `Where is ${n} right now?`,
      results: [{ option: 'Bunnings', pct: 41 }, { option: 'The shed', pct: 33 }, { option: 'The recliner, "not asleep"', pct: 22 }, { option: 'Adjusting the thermostat back to 19', pct: 4 }],
    },
    next_issue: ['The ute: a love story in eleven services', 'Esky seatbelt row reaches ombudsman', `Is ${n} the reason the street bought earplugs?`],
    photo_captions: (doc && doc.photos ? doc.photos : []).map((p, i) => p.caption || `Exhibit ${String.fromCharCode(65 + i)}: the evidence.`),
    editors_note: `${n}, everyone in this newsroom would be lost without you, and not just because you are the only one who knows where anything in the shed is. You turn up. You fix the thing. You make the same joke and somehow it still lands. The nineteen degrees we can live with. Happy birthday from every source who asked not to be named, all of whom love you. The Newsroom.`,
  };
}
