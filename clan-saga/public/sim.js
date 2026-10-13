/*
  Clan Saga: the rules of the world.

  Everything that can be decided without Claude is decided here, the same
  way every time: seasons, food, cold, danger, births, deaths, and what the
  clan's knowledge does. Claude is only asked one thing, in the game: does
  this idea work? Its answer comes back as tags from TAGS below, and this
  file turns those tags into effects.

  Runs in the browser (window.Sim) and in Node (require) so the balance
  test in tests/balance.js plays thousands of games headlessly.
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  // Food from gathering, Spring to Winter. The forest barely has seasons;
  // the north has a hungry winter.
  var YIELDS = {
    forest: [1.25, 1.35, 1.25, 0.95],
    open: [1.2, 1.3, 1.05, 0.8],
    fire: [1.1, 1.3, 1.15, 0.55],
    ice: [1.05, 1.3, 1.1, 0.4],
    village: [1.0, 1.25, 1.2, 0.55],
    copper: [1.0, 1.25, 1.2, 0.55],
    wheel: [1.0, 1.25, 1.2, 0.6]
  };

  // What the coming season looks like. Rolled at the end of each season and
  // shown to the player before they choose, so the right choice changes.
  var CONDITIONS = {
    herds:   { text: { forest: 'Bushpigs are rooting all through the undergrowth.', other: 'Big herds are passing close by.' }, advice: 'Herds are near: a good season to hunt.' },
    lean:    { text: { forest: 'The fruit has failed on the nearest trees.', other: 'A dry spell has withered the plants nearby.' }, advice: 'Plants are poor this season: gathering will not bring much.' },
    bounty:  { text: { forest: 'The figs are ripening everywhere at once.', other: 'Plants are fruiting everywhere at once.' }, advice: 'Food is everywhere: gather while it lasts.' },
    prowler: { text: { forest: 'A leopard has been seen near the sleeping trees.', other: 'Something has been circling the camp at night.' }, advice: 'A predator is close. Staying together and resting keeps people safe; hunting and scouting do not.' },
    fever:   { text: { forest: 'Some of the clan are coughing.', other: 'A fever is going round the camp.' }, advice: 'A fever is starting. Resting now will stop it spreading.' }
  };
  var MAX_CLAN = 14;

  // What each kind of knowledge does. Claude picks tags from this list; the
  // descriptions are what it reads when choosing.
  var TAGS = {
    tool_food:     { about: 'using a found object to get food (probing sticks, nut-cracking stones, leaf sponges)', gather: 0.25 },
    digging_stick: { about: 'digging tools for roots and tubers', gather: 0.15 },
    container:     { about: 'carrying or storing things: bags, baskets, gourds, skins', gather: 0.1, spoil: -0.12 },
    stone_tool:    { about: 'stone deliberately shaped to have a cutting edge or point: flakes, choppers, hand axes, blades', gather: 0.15, hunt: 0.3 },
    weapon:        { about: 'spears, clubs, throwing sticks, bows, slings', hunt: 0.5, defence: 2 },
    trap:          { about: 'snares, pits, fish weirs, nets', hunt: 0.25, huntRisk: -0.4 },
    fire:          { about: 'making fire, or catching and keeping fire alive', defence: 3, warmth: 1, sick: -0.05 },
    cooking:       { about: 'cooking or smoking food with fire', eat: -0.15, sick: -0.05 },
    shelter:       { about: 'windbreaks, huts, tents, houses, improving a cave', warmth: 1, births: 0.1 },
    clothing:      { about: 'sewn or tied clothes, cloaks, wraps, footwear', warmth: 2 },
    rope:          { about: 'cord, string, rope, sinew thread, lashing, hafting a head to a handle', gather: 0.05, hunt: 0.1 },
    boat:          { about: 'rafts, dugouts, reed boats', gather: 0.1 },
    medicine:      { about: 'treating wounds and sickness', heal: 1, sick: -0.05 },
    pottery:       { about: 'clay vessels hardened in fire', spoil: -0.15, eat: -0.05 },
    farming:       { about: 'planting, tending and harvesting crops', gather: 0.35 },
    herding:       { about: 'keeping and breeding animals', hunt: 0.4, huntRisk: -0.5 },
    kiln:          { about: 'enclosed ovens or pits that reach far higher heat than an open fire' },
    copper:        { about: 'getting metal from ore by smelting, or working metal into tools', gather: 0.15, hunt: 0.2, defence: 1 },
    wheel:         { about: 'a true wheel turning on an axle, carrying a load', gather: 0.1 },
    art:           { about: 'painting, carving, music, ornament, telling stories' },
    other:         { about: 'anything useful that fits none of the above' }
  };
  var TAG_KEYS = Object.keys(TAGS);

  // The seven chapters. `can` is what the judge is told the clan's bodies and
  // minds allow. Places are what the land holds; the materials listed are the
  // materials the judge lets the clan use.
  var CHAPTERS = [
    {
      id: 'forest', title: 'The Forest', when: 'about 7 million years ago', species: 'forest apes', art: 'ch1.jpg',
      adultAge: 8, lifespan: 34, cold: 0, predator: 'a leopard', predatorPower: 0,
      hunt: { label: 'Raid and scavenge', about: 'Eggs, grubs and the leavings of other animals. More food, more danger.' },
      goal: { tags: ['tool_food'], text: 'Use something you find to get food the clan cannot reach with bare hands.' },
      can: 'They are apes. They can grip, carry, throw and climb, and can strip, snap or bend a twig or a leaf. They can use sticks, stones and leaves as they find them. They cannot yet shape stone into an edge, cannot make or keep fire, and have no words: they learn only by watching each other.',
      intro: 'Your clan are apes in a great forest. They eat what falls and what they can reach. A termite mound stands at the foot of the Great Fig, and the termites inside are rich food, if anyone could get at them.',
      examples: ['Strip the leaves off a thin twig, poke it into a hole in the termite mound and pull it out slowly.', 'Lay a hard nut on a flat root and hit it with a heavy stone.'],
      hints: {
        teacher: ['The termites inside the mound are food. Fingers are too thick for the holes. What could fit?', 'A thin twig fits the holes. Termites bite whatever pokes into their nest.', 'Strip a thin twig of its leaves, poke it gently into a hole in the mound, wait, and draw it out slowly with the termites clinging on.'],
        elder: ['The old ones watched the termites a long time, and wondered how to reach inside.', 'They say the termites bite anything thin that enters their home, and do not let go.', 'Grandmother Fig stripped a twig bare and fed it to the mound. It came back covered in food.']
      },
      places: [
        { id: 'fig', name: 'The Great Fig', food: 1.0, mats: ['figs', 'leaves', 'thin twigs', 'vines', 'dead branches', 'a termite mound among the roots'] },
        { id: 'nuts', name: 'The Nut Grove', food: 1.15, mats: ['hard-shelled nuts', 'flat exposed roots', 'heavy loose stones', 'leaf litter'] },
        { id: 'stream', name: 'The Stream', food: 1.1, mats: ['water', 'smooth pebbles', 'mud', 'crabs', 'reeds'] },
        { id: 'edge', name: 'The Forest Edge', food: 0.95, mats: ['tall grass', 'scattered trees', 'open sky', 'antelope in the distance'] }
      ],
      names: ['Grey-Back', 'Long-Arm', 'Fig', 'Quiet', 'Brook', 'Nettle', 'Bark', 'Tumble', 'Moss', 'Shade', 'Hum', 'Pounce', 'Leaf', 'Burr', 'Twitch', 'Pebble', 'Dusk', 'Holler', 'Sway', 'Drip']
    },
    {
      id: 'open', title: 'The Open Land', when: 'about 1.8 million years ago', species: 'early humans who walk upright (Homo erectus)', art: 'ch2.jpg',
      adultAge: 12, lifespan: 36, cold: 0, predator: 'a pride of lions', predatorPower: 1,
      hunt: { label: 'Scavenge and hunt', about: 'Drive lions off their kills, run down tired game. More food, more danger.' },
      goal: { tags: ['stone_tool'], text: 'Shape a stone so it has a sharp edge.' },
      can: 'They walk and run upright over long distances and have strong, nimble hands. They can strike one stone against another and see where it breaks. They cooperate in groups and use calls and gestures, but have no real words yet, so new skills spread slowly. They have never made fire.',
      intro: 'The forest has shrunk to strips along the rivers. Your clan walk upright now, across open grassland where the big cats hunt. Meat is here for those who can cut it, and nobody in the clan can cut anything.',
      examples: ['Hold a round lava cobble in one hand and strike its edge hard with another stone, so a sharp flake breaks off.', 'Find a flint nodule and knock flakes off both sides until it has a sharp wavy edge.'],
      hints: {
        teacher: ['Teeth and nails cannot open a hide. A sharp edge could. Some stones break sharp.', 'Hard, fine-grained stone (lava, flint, quartzite) breaks into flakes with edges like glass when struck right.', 'Hold a cobble, strike near its edge with a hammerstone at a glancing angle, and keep the flake that breaks off. Strike around it to make a chopper.'],
        elder: ['The old ones cut their feet on broken stones by the lake, and remembered.', 'They say the black stone breaks with a sharp tongue, if you strike it at its edge.', 'Strider struck stone on stone at the lake shore until the stone bit back. Then he cut meat with it.']
      },
      places: [
        { id: 'lake', name: 'The Lake Shore', food: 1.0, mats: ['water', 'rounded cobbles of black lava rock', 'reeds', 'mud', 'birds’ eggs'] },
        { id: 'riverbed', name: 'The Dry River Bed', food: 1.0, mats: ['quartzite cobbles', 'flint nodules', 'sand', 'driftwood'] },
        { id: 'plains', name: 'The Grass Plains', food: 1.25, mats: ['antelope herds', 'tall dry grass', 'tubers under the soil', 'carcasses left by lions'] },
        { id: 'acacia', name: 'The Acacia Woods', food: 1.1, mats: ['hard wood', 'long thorns', 'tree gum', 'wild bees and honey'] }
      ],
      names: ['Strider', 'Thorn', 'Wide-Step', 'Dust', 'Heron', 'Lark', 'Root', 'Long-Shadow', 'Gourd', 'Bramble', 'Far-Look', 'Wade', 'Sun-Back', 'Hush', 'Grit', 'Swift', 'Reed', 'Kestrel', 'Sorrel', 'Hollow']
    },
    {
      id: 'fire', title: 'Fire', when: 'about 1 million years ago', species: 'early humans (Homo erectus), now in cooler hill country', art: 'ch3.jpg',
      adultAge: 12, lifespan: 38, cold: 1, predator: 'a cave bear', predatorPower: 2,
      hunt: { label: 'Hunt', about: 'Deer and boar in the river meadow. More food, more danger.' },
      goal: { tags: ['fire'], text: 'Make fire, or catch fire and keep it alive.' },
      can: 'They walk upright, shape good stone tools, and work together, using calls and gestures but few words. Their hands can do anything that patience and the right materials allow; nobody has ever shown them how to make fire.',
      intro: 'The clan have wandered north into hill country where winters bite. Nights are dark and the bears are bold. Sometimes lightning sets the dry woods burning, and the clan watch, afraid.',
      examples: ['When lightning burns a tree, carry a smouldering branch home and feed it dry twigs inside the cave, never letting it go out.', 'Strike a lump of pyrite with a flint over a nest of dry fungus and grass, and blow on the spark.'],
      hints: {
        teacher: ['Fire comes from lightning, from striking certain stones, and from rubbing wood. Look at what your places hold.', 'Pyrite struck with flint throws real sparks; dry tinder fungus catches them. Or a smouldering branch from a lightning fire can be carried and fed.', 'Nest dry fungus and grass, strike pyrite against flint so sparks land in it, blow gently until it flames, then feed it twigs, then sticks, in a sheltered hearth.'],
        elder: ['The old ones feared fire, and watched it eat the woods after the sky-cracks.', 'They say the gold stone of the hills holds fire inside it, and the dry fungus can catch it.', 'Ember-Eye struck the gold stone with flint over the fungus and blew, and the fire came to live with us.']
      },
      places: [
        { id: 'cave', name: 'The Cave in the Hills', food: 0.95, mats: ['shelter from rain', 'dry dust', 'old bones', 'a stream nearby'] },
        { id: 'woods', name: 'The Dry Woodland', food: 1.1, mats: ['dead wood', 'dry grass', 'tinder fungus on old trees', 'resinous pine'] },
        { id: 'ridge', name: 'Flint Ridge', food: 1.0, mats: ['flint', 'chalk', 'hard hammerstones'] },
        { id: 'goldhills', name: 'The Gold-Stone Hills', food: 0.9, mats: ['lumps of pyrite (a heavy shiny gold-coloured stone)', 'bare rock', 'heather'] },
        { id: 'meadow', name: 'The River Meadow', food: 1.25, mats: ['deer', 'wild boar', 'reeds', 'berries', 'straight hazel stems'] }
      ],
      names: ['Ember-Eye', 'Gorse', 'Stag', 'Hazel', 'Crow', 'Bracken', 'Brindle', 'Ridge', 'Owl', 'Heath', 'Moor', 'Flick', 'Sloe', 'Tor', 'Cinder', 'Wolf-Ear', 'Fen', 'Rook', 'Sedge', 'Larch']
    },
    {
      id: 'ice', title: 'The Long Cold', when: 'about 40,000 years ago', species: 'modern humans (Homo sapiens)', art: 'ch4.jpg',
      adultAge: 14, lifespan: 45, cold: 3, predator: 'a pack of wolves', predatorPower: 2,
      hunt: { label: 'Hunt', about: 'Reindeer, horse and the odd mammoth. More food, more danger.' },
      goal: { tags: ['clothing'], text: 'Make clothes that keep the clan alive through an ice age winter.' },
      can: 'They are modern humans, the same as us in body and mind, with full language. They can learn and teach anything the materials allow, and invent quickly once they know what they are aiming for.',
      intro: 'Ages have passed. Your clan are people now: they speak, sing and remember. But the world has turned cold. On the mammoth steppe, fire alone will not get anyone through the winter.',
      examples: ['Scrape a reindeer hide clean, then punch holes along its edges with a sharpened bone awl and lace the pieces together with sinew thread into a hooded coat.', 'Grind a splinter of bone into a needle with an eye, and sew furs into close-fitting trousers and coats.'],
      hints: {
        teacher: ['Fire warms a camp, not a hunter. Something has to go with each person.', 'Hides from the hunt keep out the wind. To shape them to a body they need joining: holes, and thread.', 'Scrape hides clean, cut them to shape with a flint blade, pierce holes with a bone awl (or sew with a bone needle) and stitch with dried sinew. Fur side in.'],
        elder: ['The old ones froze, and wished they wore the reindeer’s coat.', 'They say a bone splinter can bite through hide, and sinew can tie what it bit.', 'Willow pierced the hides with bone and bound them with sinew, and the cold could not find us.']
      },
      places: [
        { id: 'steppe', name: 'The Mammoth Steppe', food: 1.0, mats: ['grass', 'old bones', 'dried dung for fuel', 'dwarf willow', 'fire (known)'] },
        { id: 'deer', name: 'Reindeer Valley', food: 1.25, mats: ['reindeer (hides, sinew, antler, bone)', 'birch trees', 'birch bark'] },
        { id: 'river', name: 'The Frozen River', food: 1.0, mats: ['fish under the ice', 'driftwood', 'stones', 'fox and hare (furs)'] },
        { id: 'bonehills', name: 'The Bone Hills', food: 0.9, mats: ['flint', 'mammoth tusks', 'red ochre'] },
        { id: 'pines', name: 'The Pine Forest', food: 1.1, mats: ['pine wood', 'resin', 'moss', 'rabbits'] }
      ],
      baseline: [{ name: 'speech', tags: ['art'] }, { name: 'stone blades', tags: ['stone_tool'] }, { name: 'spears', tags: ['weapon'] }, { name: 'fire', tags: ['fire'] }],
      names: ['Willow', 'Bone-Song', 'Snow-Hare', 'Antler', 'Birch', 'Frost', 'Vixen', 'Ash', 'Raven', 'Ochre', 'Tallow', 'Rime', 'Moth', 'Elk-Runner', 'Wren', 'Lichen', 'Flurry', 'Ermine', 'Floe', 'Hearth-Song']
    },
    {
      id: 'village', title: 'The Village', when: 'about 9,000 years ago', species: 'modern humans, now farmers', art: 'ch5.jpg',
      adultAge: 14, lifespan: 48, cold: 1, predator: 'raiders from the hills', predatorPower: 2,
      hunt: { label: 'Hunt and fish', about: 'Gazelle on the plain, fish in the river. More food, more danger.' },
      goal: { tags: ['pottery'], text: 'Make a clay pot that holds water without falling apart.' },
      can: 'They are modern humans with full language who farm, live in houses and keep fire. They can learn anything the materials allow.',
      intro: 'The ice has gone. Your clan have settled by a river and plant barley and wheat. Grain must be kept from mice and damp, and baskets leak. The riverbank is thick with clay.',
      examples: ['Mix riverbank clay with sand, roll it into long coils and build a pot coil by coil, smooth it, let it dry for days, then bury it in a big hot bonfire.', 'Pinch a bowl from clay tempered with crushed shell, dry it in the shade, then fire it in a pit under dung and wood.'],
      hints: {
        teacher: ['Wet clay holds a shape; dry clay crumbles; burnt clay changes for good.', 'Pure clay cracks as it dries and fires. Mixing in sand or crushed shell stops that. It must dry fully before the fire.', 'Mix clay with sand, build a pot from coils, smooth it, dry it slowly for days in shade, then fire it in a pit or bonfire for hours until it glows.'],
        elder: ['The old ones saw the clay by the hearth turn hard as stone.', 'They say clay must be mixed with sand, or it bursts in the fire like a frightened bird.', 'Clay coiled the pot, waited for it to dry, and buried it in fire. In the morning it rang like stone.']
      },
      places: [
        { id: 'village', name: 'The River Village', food: 1.2, mats: ['barley and wheat fields', 'mud-brick houses', 'baskets', 'wood', 'fire (known)', 'goats'] },
        { id: 'claybank', name: 'The Clay Bank', food: 1.0, mats: ['fine wet clay', 'river sand', 'crushed shell'] },
        { id: 'marsh', name: 'The Reed Marsh', food: 1.1, mats: ['reeds', 'rushes', 'tar oozing from the ground (bitumen)', 'waterbirds'] },
        { id: 'oakhills', name: 'The Oak Hills', food: 1.05, mats: ['oak wood', 'flint', 'acorns', 'dry dung on the grazing'] }
      ],
      baseline: [{ name: 'farming', tags: ['farming'] }, { name: 'baskets', tags: ['container'] }, { name: 'houses', tags: ['shelter'] }, { name: 'sewn clothes', tags: ['clothing'] }],
      names: ['Barley', 'Sheaf', 'Lentil', 'Spindle', 'Tamarisk', 'Dove', 'Wattle', 'Ewe', 'Furrow', 'Sickle', 'Plum', 'Kid', 'Emmer', 'Quern', 'Dew', 'Poppy', 'Thresher', 'Mallow', 'Wick', 'Pomegranate']
    },
    {
      id: 'copper', title: 'Copper', when: 'about 7,000 years ago', species: 'modern humans, village farmers and potters', art: 'ch6.jpg',
      adultAge: 14, lifespan: 50, cold: 1, predator: 'raiders from the next valley', predatorPower: 3,
      hunt: { label: 'Hunt and herd', about: 'Wild game and the flocks. More food, more danger.' },
      goal: { tags: ['copper'], text: 'Get metal out of stone.' },
      can: 'They are modern humans with full language, skilled farmers and potters who know how to make a kiln burn very hot. They can learn anything the materials allow.',
      intro: 'Your village fires good pots now, in kilns hotter than any campfire. Up the gully there is a strange green stone. Beads made from it are prized, and once, in a hot kiln, someone saw a red bead of something shining in the ash.',
      examples: ['Crush green malachite, mix it with charcoal in a clay crucible, and blow into the fire through clay-tipped reed blowpipes until the copper melts out.', 'Build a small clay furnace, load it with charcoal and crushed green stone, and keep it roaring with bellows made from goatskin.'],
      hints: {
        teacher: ['Wood fire is not hot enough to free metal. Charcoal burns hotter, and blown air hotter again.', 'The green stone (malachite) gives up copper when it is very hot and buried in burning charcoal, with little air reaching it directly.', 'Burn wood under turf to make charcoal. Crush the green stone, pack it in a clay crucible inside a charcoal fire, and blow hard through reed blowpipes for an hour. Pour or pick out the copper.'],
        elder: ['The old ones saw the red bead in the kiln ash, and never knew where it came from.', 'They say the green stone bleeds red metal, but only in the hottest fire, fed by breath.', 'Ninefold Breath crushed the green stone, buried it in charcoal, and the whole family blew until the stone bled.']
      },
      places: [
        { id: 'hillvillage', name: 'The Hill Village', food: 1.25, mats: ['fields and flocks', 'pottery kiln (known)', 'fired clay pots', 'clay', 'goatskins'] },
        { id: 'gully', name: 'Green Stone Gully', food: 0.9, mats: ['green malachite', 'blue azurite', 'hard river stones'] },
        { id: 'charwood', name: 'The Charcoal Wood', food: 1.0, mats: ['oak and beech wood', 'turf', 'charcoal burners’ clearings'] },
        { id: 'reedbeds', name: 'The Reed Beds', food: 1.05, mats: ['hollow reeds', 'fish', 'wildfowl'] }
      ],
      baseline: [{ name: 'fired pottery', tags: ['pottery'] }, { name: 'kilns', tags: ['kiln'] }, { name: 'charcoal-making', tags: ['other'] }],
      names: ['Malachite', 'Kiln-Keeper', 'Bead', 'Fleece', 'Juniper', 'Shard', 'Glaze', 'Tumbler', 'Ewe-Herd', 'Myrtle', 'Ochre-Hand', 'Lintel', 'Pestle', 'Wren', 'Saffron', 'Charcoal', 'Linen', 'Oriole', 'Bellows', 'Thyme']
    },
    {
      id: 'wheel', title: 'The Wheel', when: 'about 5,500 years ago', species: 'modern humans, townspeople with copper tools', art: 'ch7.jpg',
      adultAge: 14, lifespan: 55, cold: 1, predator: 'raiders from the desert', predatorPower: 3,
      hunt: { label: 'Herd and trade', about: 'Drive the herds, trade downriver. More food, more risk.' },
      goal: { tags: ['wheel'], text: 'Make a wheel that turns on an axle and carries a load.' },
      can: 'They are modern humans with full language who smelt copper, work wood with copper chisels and axes, use rope, sledges and draught oxen, and build in mud brick. They can learn anything the materials allow.',
      intro: 'Your clan are townspeople now. Stone for the new temple must be dragged from the quarry on sledges, and the oxen strain and the runners stick. Potters in the town spin clay on a turning stone.',
      examples: ['Cut three thick planks of plane wood, join them edge to edge with wooden dowels and cross battens, trim them into a circle, bore a hole at the centre, and fit it on a greased wooden axle.', 'Mount two solid wooden wheels on a fixed axle under a sledge, with pegs through the axle so the wheels cannot slide off.'],
      hints: {
        teacher: ['Rollers under a sledge work, but they keep falling out behind. Something round has to stay with the load.', 'A round disc needs a hole in its exact centre and a smooth axle through it. The town’s potter’s wheel already turns on a pivot.', 'Join planks with dowels and battens, cut a true circle, bore the centre, fit two wheels to a greased axle held under the sledge by pegs. Expect the first to crack.'],
        elder: ['The old ones dragged stone on logs, and cursed the logs that rolled away.', 'They say the potter’s stone turns on its centre forever and never walks away.', 'Axle-Maker pierced the round of wood at its heart, and the stone walked to the temple on its own legs.']
      },
      places: [
        { id: 'town', name: 'The Town by the River', food: 1.3, mats: ['copper axes, adzes and chisels', 'rope', 'bitumen tar', 'animal fat', 'sledges', 'a potter’s turning stone'] },
        { id: 'grove', name: 'The Plane Tree Grove', food: 1.0, mats: ['big plane trees', 'straight-grained wood', 'oak'] },
        { id: 'quarry', name: 'The Quarry', food: 0.95, mats: ['heavy stone blocks', 'log rollers', 'ramps'] },
        { id: 'pastures', name: 'The Ox Pastures', food: 1.15, mats: ['oxen', 'donkeys', 'leather', 'yokes'] }
      ],
      baseline: [{ name: 'copper tools', tags: ['copper'] }, { name: 'rope', tags: ['rope'] }, { name: 'herding', tags: ['herding'] }],
      names: ['Axle-Maker', 'Cedar', 'Tally', 'Ox-Driver', 'Sledge', 'Adze', 'Date-Palm', 'Brick', 'Chisel', 'Tamarisk', 'Scribe', 'Reed-Mat', 'Yoke', 'Bitumen', 'Spoke', 'Lapis', 'Gypsum', 'Furrow', 'Cistern', 'Rush']
    }
  ];

  // ---------- randomness (seedable, so the balance test is repeatable) ----------
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  // ---------- people ----------
  function chapterOf(state) { return CHAPTERS[state.chapter]; }
  function living(state) { return state.members; }
  function isAdult(state, m) { return m.age >= chapterOf(state).adultAge; }
  function displayName(m) { return m.name; }

  function freshName(state, rng) {
    var used = {};
    state.members.forEach(function (m) { used[m.name] = 1; });
    var pool = chapterOf(state).names.filter(function (n) { return !used[n]; });
    if (pool.length) return pick(rng, pool);
    return pick(rng, chapterOf(state).names) + ' the Younger';
  }

  function newMember(state, rng, age) {
    var m = { id: state.nextId++, name: '', formerName: '', age: age, state: 'well', hurt: 0, born: state.seasonCount };
    m.name = freshName(state, rng);
    state.members.push(m);
    return m;
  }

  function startRoster(state, rng) {
    var ch = chapterOf(state);
    state.members = [];
    var ages = [ch.lifespan - 9, ch.adultAge + 12, ch.adultAge + 8, ch.adultAge + 5, ch.adultAge + 2, Math.max(2, ch.adultAge - 4), 1];
    ages.forEach(function (a) { newMember(state, rng, a + Math.floor(rng() * 3)); });
  }

  // ---------- knowledge ----------
  function activeTags(state) {
    var alive = {};
    state.members.forEach(function (m) { alive[m.id] = 1; });
    var tags = {};
    state.knowledge.forEach(function (k) {
      if (k.lost) return;
      if (!k.knowers.some(function (id) { return alive[id]; })) return;
      k.tags.forEach(function (t) { tags[t] = 1; });
    });
    return tags;
  }
  function bonus(state, key) {
    var tags = activeTags(state), sum = 0;
    Object.keys(tags).forEach(function (t) { if (TAGS[t] && TAGS[t][key]) sum += TAGS[t][key]; });
    return sum;
  }
  function knowsTag(state, tag) { return !!activeTags(state)[tag]; }
  // The chapter's challenge is met when the clan has the knowledge AND it has
  // been passed on to at least half of them: knowledge lives in people.
  function goalProgress(state) {
    var goal = chapterOf(state).goal.tags, best = null;
    var alive = {};
    state.members.forEach(function (m) { alive[m.id] = 1; });
    state.knowledge.forEach(function (k) {
      if (k.lost || !k.tags.some(function (t) { return goal.indexOf(t) >= 0; })) return;
      var n = k.knowers.filter(function (id) { return alive[id]; }).length;
      if (!best || n > best.knowers) best = { name: k.name, knowers: n };
    });
    var need = Math.ceil(state.members.length / 2);
    return { found: !!best && best.knowers > 0, name: best ? best.name : '', knowers: best ? best.knowers : 0, need: need, clan: state.members.length };
  }
  function goalMet(state) {
    var g = goalProgress(state);
    return g.found && g.knowers >= g.need;
  }
  function addKnowledge(state, name, tags, inventor) {
    var k = { name: name, tags: tags, inventor: inventor ? inventor.name : '', chapter: state.chapter, knowers: inventor ? [inventor.id] : state.members.map(function (m) { return m.id; }), lost: false };
    state.knowledge.push(k);
    return k;
  }

  // ---------- the clan's numbers, as words a player can read ----------
  function eaters(state) {
    var e = 0;
    state.members.forEach(function (m) { e += isAdult(state, m) ? 1 : 0.6; });
    return e * Math.max(0.6, 1 + bonus(state, 'eat'));
  }
  function seasonsOfFood(state) {
    var e = eaters(state);
    return e > 0 ? state.food / e : 0;
  }
  function warmth(state) { return bonus(state, 'warmth'); }
  function workers(state, exceptId) {
    return state.members.filter(function (m) { return isAdult(state, m) && m.state === 'well' && m.id !== exceptId; });
  }
  function bestPlaceFood(state) {
    var ch = chapterOf(state), best = 0.9;
    ch.places.forEach(function (p) { if (state.places.indexOf(p.id) >= 0) best = Math.max(best, p.food); });
    return best;
  }
  function knownPlaces(state) {
    return chapterOf(state).places.filter(function (p) { return state.places.indexOf(p.id) >= 0; });
  }
  function unknownPlaces(state) {
    return chapterOf(state).places.filter(function (p) { return state.places.indexOf(p.id) < 0; });
  }

  // ---------- the four things the clan can spend a season on ----------
  function actions(state) {
    var ch = chapterOf(state);
    return [
      { id: 'gather', label: 'Gather', about: 'Safe, steady food from the places you know.' },
      { id: 'hunt', label: ch.hunt.label, about: ch.hunt.about },
      { id: 'explore', label: 'Explore', about: unknownPlaces(state).length ? 'Look for a new place, and what it holds. A little food.' : 'Every place nearby is known. A little food, little else.' },
      { id: 'rest', label: 'Rest', about: 'Heal the hurt and sick. Children are likelier. Little food.' }
    ];
  }

  function gatherYield(state, n) {
    var c = state.now === 'lean' ? 0.45 : state.now === 'bounty' ? 1.5 : 1;
    return n * 1.2 * YIELDS[chapterOf(state).id][state.seasonCount % 4] * bestPlaceFood(state) * (1 + bonus(state, 'gather')) * c;
  }

  function rollNext(state, rng) {
    var ch = chapterOf(state);
    state.next = null;
    if (rng() < (ch.id === 'forest' ? 0.35 : 0.45)) {
      var keys = ['herds', 'lean', 'bounty', 'prowler', 'fever'];
      if (ch.id === 'forest') keys = ['herds', 'lean', 'bounty', 'bounty', 'prowler'];
      state.next = pick(rng, keys);
    }
  }
  function conditionText(state) {
    if (!state.next) return '';
    var c = CONDITIONS[state.next];
    return chapterOf(state).id === 'forest' ? c.text.forest : c.text.other;
  }

  // ---------- a new game, and a new chapter ----------
  function newGame(opts) {
    opts = opts || {};
    var seed = opts.seed || Math.floor(Math.random() * 1e9);
    var state = {
      v: 1, id: opts.id || ('clan-' + Date.now().toString(36)), clanName: opts.clanName || 'The Fig Clan', mode: opts.mode || 'teacher',
      seed: seed, rngCalls: 0, chapter: 0, seasonCount: 0, chapterSeason: 0, food: 0, nextId: 1,
      members: [], knowledge: [], places: [], worldFacts: [], log: [], sagas: [], opportunity: null, finished: null, hintLevel: 0, created: Date.now()
    };
    enterChapter(state, 0, makeRng(seed));
    return state;
  }

  function enterChapter(state, index, rng) {
    state.chapter = index;
    state.chapterSeason = 0;
    state.hintLevel = 0;
    state.opportunity = null;
    var ch = chapterOf(state);
    state.places = [ch.places[0].id];
    startRoster(state, rng);
    // Every living person in the new chapter knows everything the clan kept.
    state.knowledge.forEach(function (k) {
      if (!k.lost) k.knowers = state.members.map(function (m) { return m.id; });
    });
    (ch.baseline || []).forEach(function (b) {
      var have = state.knowledge.some(function (k) { return !k.lost && k.tags.some(function (t) { return b.tags.indexOf(t) >= 0; }); });
      if (!have) { var k = addKnowledge(state, b.name, b.tags, null); k.inventor = 'the ages between'; }
    });
    state.food = eaters(state) * 2;
    state.next = null;
    log(state, 'chapter', 'Chapter ' + (index + 1) + ': ' + ch.title + ', ' + ch.when + '.');
  }

  function log(state, kind, text) {
    state.log.push({ chapter: state.chapter, season: state.seasonCount, chapterSeason: state.chapterSeason, kind: kind, text: text });
  }

  function seasonName(state) { return SEASONS[state.seasonCount % 4]; }
  function yearOf(state) { return Math.floor(state.chapterSeason / 4) + 1; }

  // ---------- what the elder would say (teacher and elder modes) ----------
  function advice(state) {
    var s = seasonName(state), f = seasonsOfFood(state), ch = chapterOf(state);
    var hurt = state.members.filter(function (m) { return m.state !== 'well'; }).length;
    var lack = ch.cold - warmth(state);
    if (state.next === 'prowler' || state.next === 'fever') return CONDITIONS[state.next].advice;
    if (f < 1) return 'Food is nearly gone. ' + (state.next === 'herds' ? 'Herds are near: hunt.' : state.next === 'lean' ? 'Plants are poor, so hunting is the better hope.' : 'Gather or hunt this season, or people will go hungry.');
    if (state.next) return CONDITIONS[state.next].advice;
    if (s === 'Autumn' && f < 2.5) return 'Winter is next and food will be scarce. Store what you can now.';
    if (s === 'Autumn' && lack > 0) return 'Winter is coming, and the clan cannot keep warm. Expect sickness unless you find warmth.';
    if (hurt >= 2) return 'Several are hurt or sick. Resting would help them mend.';
    if (state.opportunity && state.opportunity.kind === 'fire') return 'Fire is burning on the ridge after the storm. Someone could try to bring it home.';
    if (unknownPlaces(state).length && f >= 2) return 'Food is good. Exploring may find new places and new materials.';
    var g = goalProgress(state);
    if (g.found && !goalMet(state)) return 'The new knowledge is spreading. Keep the ones who know it safe.';
    return 'Things are steady. A good season for someone to try something new.';
  }

  // ---------- resolving a season ----------
  // choice: 'gather' | 'hunt' | 'explore' | 'rest'
  // attempt: null or { whoId, verdict } where verdict is the judge's answer
  function resolveSeason(state, choice, attempt, rng) {
    rng = rng || makeRng(state.seed + state.seasonCount * 7919);
    var ch = chapterOf(state);
    var season = seasonName(state);
    var report = { lines: [], attempt: null, goalMet: false, deaths: [], births: [], foodBefore: state.food, choice: choice };
    state.now = state.next;
    state.next = null;
    var inventor = attempt ? findMember(state, attempt.whoId) : null;
    var line = function (kind, text) { report.lines.push({ kind: kind, text: text }); log(state, kind, text); };

    // 1. The attempt, if there was one.
    if (attempt && inventor && attempt.verdict) {
      var v = attempt.verdict;
      report.attempt = { who: inventor.name, verdict: v };
      if (v.outcome === 'works' && v.learned) {
        var tags = (v.tags || []).filter(function (t) { return TAGS[t]; });
        if (!tags.length) tags = ['other'];
        var oldName = inventor.name;
        if (v.epithet && v.epithet.length < 30 && v.epithet !== inventor.name) {
          inventor.formerName = inventor.formerName || inventor.name;
          inventor.name = v.epithet;
        }
        addKnowledge(state, v.learned, tags, inventor);
        var called = inventor.formerName && inventor.name !== oldName ? oldName + ', ever after called ' + inventor.name + ',' : inventor.name;
        line('invent', called + ' found the way: ' + v.learned + '.');
      } else if (v.outcome === 'partial') {
        line('try', inventor.name + ' tried something new. It half worked.');
      } else {
        line('try', inventor.name + ' tried something new, and it failed.');
      }
      if (v.injury === 'minor' || v.injury === 'serious') {
        inventor.state = 'hurt'; inventor.hurt = v.injury === 'serious' ? 3 : 1;
        line('hurt', inventor.name + ' was hurt in the attempt.');
      }
      if (v.food_found) state.food += Math.max(0, Math.min(4, v.food_found));
      if (v.world_fact) state.worldFacts.push(v.world_fact);
    }

    // 2. The clan's work for the season.
    var hands = workers(state, inventor ? inventor.id : -1);
    var n = hands.length;
    var got = 0;
    if (choice === 'gather') {
      got = gatherYield(state, n);
      line('work', 'The clan gathered food' + (season === 'Winter' ? ', what little winter gives.' : '.'));
    } else if (choice === 'hunt') {
      var luck = 0.55 + rng() * 0.9;
      got = n * 1.6 * (season === 'Winter' ? 0.85 : 1) * (state.now === 'herds' ? 1.6 : 1) * (1 + bonus(state, 'hunt')) * luck;
      var risk = 0.3 * Math.max(0.2, 1 + bonus(state, 'huntRisk')) - (knowsTag(state, 'weapon') ? 0.08 : 0);
      line('work', luck > 1.15 ? 'The ' + ch.hunt.label.toLowerCase().split(' ')[0] + ' went well. There was meat for everyone.' : luck < 0.8 ? 'The hunt went badly. Little came home.' : 'The hunters brought back a fair share.');
      if (n && rng() < risk) {
        var victim = pick(rng, hands);
        if (rng() < (knowsTag(state, 'weapon') ? 0.08 : 0.15)) {
          kill(state, victim, 'killed on the hunt', report, line);
        } else {
          victim.state = 'hurt'; victim.hurt = 2;
          line('hurt', victim.name + ' was hurt on the hunt.');
        }
      }
    } else if (choice === 'explore') {
      got = gatherYield(state, n) * 0.45;
      var unk = unknownPlaces(state);
      if (unk.length && n) {
        var found = unk[0];
        state.places.push(found.id);
        report.found = found;
        line('explore', 'Scouts found ' + found.name + ': ' + found.mats.join(', ') + '.');
      } else {
        got = gatherYield(state, n) * 0.7;
        line('explore', 'The scouts walked far and found nothing new.');
      }
      if (n && rng() < 0.1) { var lost = pick(rng, hands); lost.state = 'hurt'; lost.hurt = 1; line('hurt', lost.name + ' fell and was hurt while scouting.'); }
    } else {
      got = gatherYield(state, n) * 0.3;
      var mended = 0;
      state.members.forEach(function (m) { if (m.state !== 'well') { m.state = 'well'; m.hurt = 0; mended++; } });
      line('work', 'The clan rested' + (mended ? ', and ' + mended + (mended === 1 ? ' person mended.' : ' people mended.') : '.'));
    }
    state.food += got;
    report.gathered = got;

    // 3. Opportunities and dangers.
    if (state.opportunity) { state.opportunity.seasons--; if (state.opportunity.seasons <= 0) state.opportunity = null; }
    if ((ch.id === 'open' || ch.id === 'fire') && !knowsTag(state, 'fire') && (season === 'Summer' || season === 'Autumn') && rng() < (ch.id === 'fire' ? 0.35 : 0.12)) {
      state.opportunity = { kind: 'fire', seasons: 2 };
      line('omen', 'A dry storm came. Lightning struck the woods and fire is burning on the ridge.');
    }
    var predatorChance = (ch.id === 'forest' ? 0.05 : 0.08) + (choice === 'hunt' ? 0.06 : 0) + (choice === 'explore' ? 0.04 : 0);
    if (state.now === 'prowler') predatorChance = choice === 'rest' ? 0.1 : choice === 'gather' ? 0.45 : 0.7;
    if (state.now === 'fever' && choice !== 'rest') {
      var caught = 0;
      state.members.forEach(function (m) { if (m.state === 'well' && rng() < 0.3) { m.state = 'sick'; caught++; } });
      if (caught) line('sick', 'The fever spread. ' + caught + (caught === 1 ? ' person fell' : ' people fell') + ' sick.');
    }
    if (rng() < predatorChance && state.members.length) {
      var defence = workers(state, -1).length / 2.5 + bonus(state, 'defence');
      var strength = 1 + rng() * 4 + ch.predatorPower;
      if (defence >= strength) {
        line('danger', 'Out of the dark came ' + ch.predator + '. The clan drove it off together.');
      } else {
        var weak = state.members.slice().sort(function (a, b) { return frailty(state, b) - frailty(state, a); });
        var target = rng() < 0.5 ? weak[0] : pick(rng, state.members);
        if (rng() < 0.4) kill(state, target, 'taken by ' + ch.predator, report, line);
        else { target.state = 'hurt'; target.hurt = 2; line('danger', ch.predator.charAt(0).toUpperCase() + ch.predator.slice(1) + ' attacked. ' + target.name + ' was badly hurt.'); }
      }
    }

    // 4. Eating, hunger and spoilage.
    var need = eaters(state);
    state.food -= need;
    if (state.food < 0) {
      var deficit = -state.food;
      state.food = 0;
      line('hunger', deficit > need * 0.4 ? 'There was not enough food. The clan starved.' : 'Food ran short. Everyone went hungry.');
      var hungerDeaths = Math.floor(deficit / 3 + rng() * 0.4);
      for (var h = 0; h < hungerDeaths && state.members.length; h++) {
        var frail = state.members.slice().sort(function (a, b) { return frailty(state, b) - frailty(state, a); })[0];
        kill(state, frail, 'died of hunger', report, line);
      }
      if (deficit > 0.5) state.members.forEach(function (m) { if (m.state === 'well' && rng() < 0.15) m.state = 'sick'; });
    }
    var spoil = Math.max(0.05, 0.25 + bonus(state, 'spoil'));
    state.food = state.food * (1 - spoil);

    // 5. Cold.
    if (season === 'Winter') {
      var lack = ch.cold - warmth(state);
      if (lack > 0) {
        var fell = 0;
        state.members.forEach(function (m) {
          var p = 0.1 * lack * (isAdult(state, m) && m.age < ch.lifespan - 6 ? 1 : 1.8);
          if (rng() < p) { m.state = 'sick'; fell++; }
        });
        line('cold', fell ? 'The winter cold made ' + fell + (fell === 1 ? ' person' : ' people') + ' sick.' : 'The cold was bitter, but everyone came through it.');
      } else if (ch.cold > 0) {
        line('cold', 'The winter was cold, but the clan kept warm.');
      }
    }

    // 6. The sick and hurt: mend or die.
    state.members.slice().forEach(function (m) {
      if (m.state === 'sick') {
        var die = 0.12 * Math.max(0.3, 1 + bonus(state, 'sick') * 4) * (isAdult(state, m) && m.age < ch.lifespan - 6 ? 1 : 1.6);
        if (rng() < die) kill(state, m, 'died of sickness', report, line);
        else if (rng() < 0.35 + bonus(state, 'heal') * 0.2) m.state = 'well';
      } else if (m.state === 'hurt') {
        m.hurt -= 1 + bonus(state, 'heal');
        if (m.hurt <= 0) { m.state = 'well'; m.hurt = 0; }
      }
    });

    // 7. Ageing, old age, births, the clan splitting.
    state.members.forEach(function (m) { m.age += 0.25; });
    state.members.slice().forEach(function (m) {
      if (m.age > ch.lifespan && rng() < 0.12 + (m.age - ch.lifespan) * 0.03) kill(state, m, 'died of old age', report, line);
    });
    var adults = state.members.filter(function (m) { return isAdult(state, m) && m.age < ch.lifespan - 4; }).length;
    if ((season === 'Spring' || season === 'Summer') && adults >= 2 && state.members.length < MAX_CLAN && seasonsOfFood(state) >= 1.2) {
      var pBirth = 0.3 + (choice === 'rest' ? 0.25 : 0) + bonus(state, 'births') + Math.min(0.2, adults * 0.03);
      if (rng() < pBirth) {
        var baby = newMember(state, rng, 0);
        report.births.push(baby);
        line('birth', 'A child was born, and named ' + baby.name + '.');
      }
    }
    if (season === 'Spring' && state.members.length >= MAX_CLAN) {
      var young = state.members.filter(function (m) { return isAdult(state, m) && m.age < ch.adultAge + 6; }).slice(0, 2);
      if (young.length === 2) {
        state.members = state.members.filter(function (m) { return young.indexOf(m) < 0; });
        line('split', young[0].name + ' and ' + young[1].name + ' left to start a clan of their own.');
      }
    }

    // 8. Teaching: each piece of knowledge spreads to one more person.
    state.knowledge.forEach(function (k) {
      if (k.lost) return;
      var alive = state.members.map(function (m) { return m.id; });
      var keepers = k.knowers.filter(function (id) { return alive.indexOf(id) >= 0; });
      if (!keepers.length) {
        k.lost = true;
        line('lost', 'Everyone who knew ' + k.name + ' is dead. The clan has forgotten it.');
        return;
      }
      var learners = alive.filter(function (id) { return k.knowers.indexOf(id) < 0; });
      var spread = chapterOf(state).id === 'forest' || chapterOf(state).id === 'open' ? 1 : 2;
      for (var i = 0; i < spread && learners.length; i++) k.knowers.push(learners.splice(Math.floor(rng() * learners.length), 1)[0]);
    });

    // 9. The end of the season, and a look at the next one.
    state.seasonCount++;
    state.chapterSeason++;
    state.now = null;
    rollNext(state, rng);
    var adultsLeft = state.members.filter(function (m) { return isAdult(state, m); }).length;
    if (!state.members.length || !adultsLeft) {
      state.finished = 'lost';
      line('end', state.members.length ? 'Only children were left, and they could not survive alone. The clan is gone.' : 'The last of the clan is gone.');
    } else if (goalMet(state)) {
      report.goalMet = true;
      if (state.chapter === CHAPTERS.length - 1) state.finished = 'won';
    }
    report.foodAfter = state.food;
    return report;
  }

  function frailty(state, m) {
    var ch = chapterOf(state);
    var f = 0;
    if (m.age < 3) f += 3;
    else if (!isAdult(state, m)) f += 1;
    if (m.age > ch.lifespan - 6) f += 2.5;
    if (m.state !== 'well') f += 2;
    return f;
  }

  function kill(state, m, how, report, line) {
    var i = state.members.indexOf(m);
    if (i < 0) return;
    state.members.splice(i, 1);
    report.deaths.push({ name: m.name, how: how });
    line('death', m.name + ' ' + how + '.');
  }

  function findMember(state, id) {
    for (var i = 0; i < state.members.length; i++) if (state.members[i].id === id) return state.members[i];
    return null;
  }

  function advanceChapter(state) {
    var rng = makeRng(state.seed + 104729 * (state.chapter + 1));
    enterChapter(state, state.chapter + 1, rng);
    // A later chapter's goal may already be known: history beaten.
  }

  // Who should try the idea by default: the healthy adult who knows the least.
  function suggestedInventor(state) {
    var w = workers(state, -1);
    if (!w.length) return state.members[0] || null;
    return w.slice().sort(function (a, b) { return a.age - b.age; })[0];
  }

  // What the judge needs to know, in plain sentences.
  function judgeContext(state, whoId) {
    var ch = chapterOf(state);
    var who = findMember(state, whoId) || suggestedInventor(state);
    var known = state.knowledge.filter(function (k) { return !k.lost; }).map(function (k) { return k.name; });
    return {
      chapter: ch.title, when: ch.when, species: ch.species, can: ch.can,
      season: seasonName(state), year: yearOf(state), cold: ch.cold > 0 && seasonName(state) === 'Winter',
      places: knownPlaces(state).map(function (p) { return p.name + ': ' + p.mats.join(', '); }),
      knowledge: known,
      opportunity: state.opportunity && state.opportunity.kind === 'fire' ? 'After a lightning storm, fire is burning on a ridge nearby and dead wood is smouldering there.' : '',
      who: who ? { name: who.name, age: Math.floor(who.age), state: who.state, adult: isAdult(state, who) } : null,
      clanSize: state.members.length,
      worldFacts: state.worldFacts.slice(-20),
      goal: ch.goal.text,
      mode: state.mode
    };
  }

  return {
    SEASONS: SEASONS, TAGS: TAGS, TAG_KEYS: TAG_KEYS, CHAPTERS: CHAPTERS, MAX_CLAN: MAX_CLAN,
    makeRng: makeRng, newGame: newGame, resolveSeason: resolveSeason, advanceChapter: advanceChapter,
    chapterOf: chapterOf, actions: actions, advice: advice, seasonName: seasonName, yearOf: yearOf,
    seasonsOfFood: seasonsOfFood, warmth: warmth, activeTags: activeTags, knowsTag: knowsTag, goalMet: goalMet, goalProgress: goalProgress,
    knownPlaces: knownPlaces, unknownPlaces: unknownPlaces, isAdult: isAdult, workers: workers,
    suggestedInventor: suggestedInventor, conditionText: conditionText, CONDITIONS: CONDITIONS, judgeContext: judgeContext, findMember: findMember, addKnowledge: addKnowledge
  };
});
