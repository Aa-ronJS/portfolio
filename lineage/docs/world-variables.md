# Lineage: World Variables Reference

Oct 12, 2026

Every behaviour, tool, building and technology in the game is a combination of the atomic variables below. Nothing is scripted: an **actor** with a **state** applies a **verb** to an **object** made of **materials** with **properties**, in an **environment**, using **energy**, and the pattern system judges the **outcome**.

- Lists are comprehensive but not exhaustive. Each one is meant to grow by adding entries, never new systems.
- Most variables are continuous values (0 to 1, or real units), not on/off flags.
- Stage tags: **S1** is needed for Stage 1; later stages are marked S2 to S4.

## 1. Individuals

Every hominin and animal carries these state variables, updated continuously.

| Group | Variables |
| --- | --- |
| Drives | Hunger, thirst, fatigue, sleep pressure, temperature comfort, pain, fear, mating, social contact, grooming need, play, curiosity, boredom, dominance, protectiveness (offspring, kin), disgust, aggression, comfort-seeking |
| Body state | Health, energy reserves, body fat, hydration, core temperature, injuries (by location and severity), illness, infection, parasite load, pregnancy, lactation, age, life stage, fertility, strength, stamina, speed, carried load, wetness, cleanliness, intoxication |
| Senses | Vision range, night vision, hearing, smell, taste sensitivity, touch, pain threshold |
| Mind | Attention span, focus target, memory (places, individuals, events), impulse control, risk tolerance, frustration, mood, stress, confidence, habituation per stimulus, learning rate, problem solving, planning horizon, imitation drive |
| Skills | One value per recognised behaviour and per action chain, plus general skills: dexterity, throwing, climbing, swimming, tracking, foraging, knapping, carrying, fire tending, teaching |
| Resistance | One value per recognised behaviour, at three levels: specific (store berries), object class (store edibles), action chain (carry and place) |
| Social standing | Rank, reputation, bonds with each individual (affection, trust, fear, rivalry, kinship), mate, offspring, allies, enemies, group membership, leader status |
| Personality | Boldness, sociability, aggression, curiosity, patience, conformity, playfulness |
| Knowledge | Known places (food, water, danger, shelter), known individuals, known dangers, known safe and unsafe foods, observed behaviours and their outcomes |

## 2. Genes

Heritable axes: inherited from both parents plus mutation, and many affect several traits at once. Each carries an energy upkeep cost.

| Group | Gene axes |
| --- | --- |
| Body size and build | Height, body mass, limb length (arms, legs separately), torso length, shoulder width, hip width, robusticity, muscle mass, bone density, fat storage |
| Locomotion | Pelvis shape, spine curvature, foot arch, toe grasping, knee angle, arm-to-leg ratio, shoulder mobility, hand grip type, finger length, thumb opposability |
| Head and face | Brain size, braincase shape, brow ridge, face projection, jaw size, tooth size, enamel thickness, chewing muscle size, skull crest, nose shape, throat and larynx position |
| Skin and covering | Body hair density, hair colour, skin pigment, sweat gland density, skin thickness |
| Metabolism and physiology | Metabolic rate, gut length, gut flora, detox capacity (per toxin family), lactose and starch digestion, heat tolerance, cold tolerance, altitude tolerance, water conservation, diving reflex, breath holding |
| Immunity | General immunity, resistance per disease family, parasite resistance |
| Senses | Eyesight acuity, colour vision, night vision, hearing range, smell acuity, bitter and sweet taste sensitivity |
| Life history | Gestation length, birth interval, litter size, childhood length, age at maturity, lifespan, fertility window, infant helplessness |
| Behavioural tendencies | Aggression, sociability, curiosity, impulse control, attention span, anxiety, risk tolerance, dominance drive, pair bonding, paternal care, play drive |
| Cognitive | Learning rate, memory capacity, imitation, planning, vocal control, symbolic capacity, theory of mind |
| Display | Ornamental traits, colouring, body markings, vocal pitch (sexual selection) |

## 3. Verbs

Atomic actions. Every behaviour, from berry storing to building an engine, is a sequence of these applied to objects.

| Group | Verbs |
| --- | --- |
| Movement | Walk, run, climb, descend, jump, crawl, swim, wade, dive, hide, flee, approach, follow, lead, stalk, patrol, rest, sleep |
| Perception | Look, watch, listen, sniff, taste, touch, test (weight, sharpness, heat), search, track, scout |
| Ingestion | Eat, drink, chew, spit, lick, suckle, feed (another) |
| Handling | Pick up, hold, carry, drop, place, give, take, steal, hand over, throw, catch, roll, drag, push, pull, lift, hang, stack |
| Shaping | Strike, hit, pound, crack, break, split, cut, scrape, peel, strip, grind, rub, polish, bend, twist, tie, untie, knot, weave, coil, carve, drill, pierce, sharpen, flake |
| Earth and water | Dig, bury, fill, scoop, pour, splash, dam, channel, plant, uproot |
| Fire and heat | Ignite, feed fire, fan, smother, carry fire, roast, warm, quench |
| Combining | Join, wedge, bind, glue, mix, dip, coat, soak, wrap, cover, contain, seal, open |
| Social | Groom, hug, play, share, beg, threaten, display, submit, challenge, fight, bite, chase, mob, defend, protect, comfort, mate, court, nurse, carry infant, adopt, exile, reconcile |
| Communication | Call, vocalise, gesture, point, imitate, demonstrate, teach, signal, mark, draw, count (later: speak, write, read) |
| Group actions | Encircle, drive, ambush, relay, guard, take turns, divide (food, labour) |
| Care | Clean, tend wound, chew for infant, shelter, keep watch |

## 4. Object properties

Every object, from a berry to a circuit board, is described only by these. Names are labels added after the fact.

| Group | Properties |
| --- | --- |
| Form | Mass, volume, length, width, thickness, shape (round, flat, long, concave, hollow, pointed), edge sharpness, point sharpness, surface texture, symmetry, centre of mass |
| Mechanical | Hardness, toughness, brittleness, elasticity, flexibility, tensile strength, compressive strength, friction, density, cleavage (how it fractures), workability |
| State and condition | Phase (solid, liquid, gas, powder, paste), temperature, wetness, integrity or damage, wear, freshness, rot level, dryness, purity |
| Thermal | Melting point, boiling point, ignition point, burn rate, heat output, heat capacity, thermal conductivity, insulation |
| Chemical | Flammability, toxicity (by family), reactivity, acidity, solubility, oxidation tendency, corrosion resistance, fermentability, binding or adhesive strength |
| Biological | Edible, calories, protein, fat, carbohydrate, nutrients, digestibility, palatability (sweet, bitter, sour, salty), perishability, alive, growth rate, seed or regrowth, medicinal effect, intoxicating effect, disease carrier |
| Water | Buoyancy, porosity, permeability, absorbency, waterproofness |
| Electrical and magnetic (S4) | Conductivity, resistance, magnetism, charge storage, semiconducting behaviour |
| Optical and sound | Colour, brightness, transparency, reflectivity, glow or luminescence, sound when struck, resonance |
| Smell | Scent strength, scent type (attracts or repels which species) |
| Value and social | Rarity, ownership, symbolic meaning, ornamental appeal (emerge from culture, never preset) |

## 5. Base materials

Raw substances the world contains. Each is a bundle of property values from section 4, so new materials need data, not code.

| Group | Materials |
| --- | --- |
| Stone (S1) | Flint, chert, obsidian, quartzite, basalt, granite, limestone, sandstone, slate, pumice, river cobbles, gravel |
| Earths and minerals | Sand, clay (several types), mud, loam, silt, salt, ochre (red, yellow), chalk, gypsum, sulphur, flint nodules, natron |
| Ores and metals (S2 to S4) | Native copper, malachite, cassiterite (tin), galena (lead), iron ore (haematite, magnetite), meteoric iron, native gold, silver, zinc ore, bauxite (aluminium) |
| Water and liquids | Fresh water, salt water, brackish water, mud water, ice, snow, sap, resin, honey, oil, tar and bitumen |
| Plant materials | Wood (hard, soft, green, dry, rotten), bark, branches, twigs, leaves, grass, reeds, bamboo, vines, roots, tubers, fibres, seeds, grains, nuts, fruits, berries, fungi, moss, gourds, plant oils, latex |
| Animal materials | Meat, fat, marrow, blood, organs, bone, antler, horn, ivory, teeth, hide, fur, sinew, gut, feathers, shell, eggs, dung, wool, milk |
| Fire products | Charcoal, ash, embers, soot, smoke, burnt clay |
| Atmosphere | Air, oxygen supply, wind |
| Made materials (emerge, never preset) | Ceramic, lime, plaster, glass, bronze, iron, steel, brick, concrete, textile, rope, paper, soap, dyes, glue, gunpowder, rubber, plastics |

## 6. Living things

Animals and plants run on the same gene and drive systems as hominins, with simpler settings where full detail isn't needed.

| Group | Variables or members |
| --- | --- |
| Animal traits | Diet type, size, speed, endurance, senses, aggression, flightiness, temperament (tameability), social structure (solitary, pair, herd, pack), territoriality, activity time (day, night, dusk), habitat, migration, breeding rate, learning ability, wariness of hominins |
| Animal roles | Prey, predator, scavenger, competitor, pest, parasite host, pollinator, seed spreader, potential companion or livestock |
| Stage 1 animal groups | Antelope and small bovids, pigs, primates (baboons, monkeys), big cats, hyenas, wild dogs, crocodiles, hippos, elephants and relatives, giraffes, rhinos, rodents, hares, birds (ground, water, raptors, vultures), fish, shellfish, turtles, lizards, snakes, insects (termites, ants, bees), larvae and grubs |
| Plant traits | Growth rate, size, lifespan, season (fruiting, flowering), edible parts, toxicity, regrowth after harvest, spread rate, fire tolerance, drought tolerance, water need, wood quality, fibre quality |
| Stage 1 plant groups | Grasses, sedges, reeds, fruiting trees and shrubs, nut trees, tubers and roots, fungi, acacias, figs, palms, aquatic plants |
| Disease and parasites | Transmission route (contact, water, food, insect, animal), lethality, duration, immunity gained, host range, density dependence |
| Population (per species, per area) | Count, age structure, health, food supply, predation pressure, hunting pressure, trend |

## 7. Environment, terrain, climate and time

The world tile and its conditions. These set the difficulty of every action and the pressure behind selection.

| Group | Variables |
| --- | --- |
| Terrain | Elevation, slope, roughness, ground type (rock, sand, soil, mud, marsh), soil fertility, soil moisture, cover density, line of sight, caves and overhangs, cliffs, trees per area |
| Water | Water presence, depth, flow speed, quality, salinity, temperature, seasonal level, flood risk |
| Biome | Forest, woodland, savanna, grassland, wetland, lakeshore, river, coast, reef, desert, semi-desert, mountain, tundra, ice |
| Weather | Air temperature, humidity, rainfall, wind speed and direction, cloud, storms, lightning, drought, frost, snow |
| Climate (long term) | Mean temperature, aridity, seasonality strength, variability, sea level, glacial cycle phase |
| Light and time | Time of day, day length, moon phase, season, year, era |
| Hazards | Wildfire, flood, drought, volcanic activity, earthquake, landslide, disease outbreak |
| Resources per tile | Food by type and amount, water, stone types, wood, ores, regrowth rate, depletion |
| Hominin traces | Trails, camps, caches, middens, cleared or burned land, scent marks, territorial claims |

## 8. Energy and forces

Every transformation and machine is energy moving from one form to another. The game tracks each form as its own quantity.

| Group | Variables |
| --- | --- |
| Energy sources | Muscle (hominin), muscle (animal), fire, sunlight, wind, flowing water, falling water, tides, gravity (falling weights), stored elastic tension, chemical (food, fuel, explosives), steam pressure, electrical, magnetic |
| Forces | Impact, pressure, tension, compression, torque, friction, shear, lift, buoyancy, drag |
| Motion | Speed, direction, acceleration, momentum, rotation rate, oscillation |
| Heat | Temperature, heat flow, heat retention, airflow (oxygen to fire), insulation, radiant heat |
| Fluid flow | Flow rate, pressure, head (height of water), suction |
| Electrical (S4) | Voltage, current, resistance, power, charge storage, frequency |
| Light and sound | Intensity, wavelength or colour, pitch, volume, distance carried |
| Conversion | Efficiency of each conversion (fuel to heat, heat to motion, motion to electricity) and losses |

## 9. Processes, conditions and joining methods

Processes are general rules that change object properties when conditions are met. They are never tied to a named technology.

| Group | Processes |
| --- | --- |
| Mechanical | Fracture, flake, split, cut, abrade, grind, crush, compress, bend, stretch, twist, wear |
| Thermal | Heat, cool, dry, freeze, thaw, melt, solidify, boil, evaporate, condense, ignite, burn, smoulder, char, fire-harden, roast, cook, smoke |
| Chemical | Oxidise, reduce (smelt), dissolve, precipitate, ferment, rot, cure, tan, dye, set or harden (lime, plaster), corrode, react (acid with base, fuel with oxidiser), alloy, distil |
| Biological | Grow, reproduce, decay, digest, sprout, wilt, heal, infect, domesticate (selective breeding) |
| Water | Soak, swell, leach (wash out toxins), erode, deposit, float, sink, wash |
| Electrical (S4) | Conduct, insulate, induce, electrolyse, store charge, emit light, switch |

**Conditions that trigger processes:** temperature reached, time held, pressure, oxygen level, moisture, contact between materials, proportions of a mixture, presence of a catalyst, agitation or mixing, light exposure.

| Joining methods | Members |
| --- | --- |
| Physical | Wedge, stack, lean, interlock, peg, socket, notch, lash or bind, knot, weave, sew, wrap |
| Adhesive | Resin, tar, glue (hide, plant), clay, mortar, wax |
| Heat-based | Fire-fuse, solder, weld, cast in place, forge-join |
| Mechanical fixing | Nail, rivet, screw, bolt, hinge, axle |

## 10. Functions that assemblies can have

The game reads these off an object's properties and shape. A recognised assembly is just a set of parts that reliably performs one or more of them.

| Group | Functions |
| --- | --- |
| Force | Strike, cut, pierce, scrape, pound, grind, pry (lever), lift, pull, push, clamp, grip |
| Reach and projection | Extend reach, throw further, propel (sling, spring, bow), guide a projectile, return |
| Containment | Hold liquid, hold dry goods, seal, keep out pests, keep dry, insulate, keep heat in |
| Structure | Support load, span a gap, shelter, enclose, divide space, raise off the ground, anchor |
| Motion | Roll, rotate, slide, swing, pivot, transmit rotation (gears, belts), reciprocate, float, steer, brake |
| Energy | Capture energy (sail, wheel, mill), store energy (spring, weight, battery), release energy, convert energy, amplify force (pulley, lever, gearing) |
| Fire and heat | Hold fire, concentrate heat, raise temperature (bellows, kiln), control airflow, carry fire |
| Water | Carry water, lift water, direct flow, filter, purify, store |
| Sensing and signal | Make a signal (light, sound, mark), amplify sound, see further, measure (length, weight, time, temperature) |
| Information (S3 and S4) | Record, count, calculate, transmit at a distance, store and retrieve, switch, control |
| Body | Clothe, protect (armour), carry on the body, adorn, heal or treat |

## 11. Social, cultural and knowledge variables

These live on groups rather than individuals and decide whether knowledge survives long enough to build on.

| Group | Variables |
| --- | --- |
| Band | Size, age and sex structure, cohesion, average bond strength, trust, fear level, hierarchy steepness, leader, home range, camp site, food sharing rate, conflict rate, split pressure |
| Between groups | Contact frequency, relationship (hostile, wary, tolerant, allied), gene flow, culture flow, trade volume, territorial overlap, kinship links |
| Culture items | Every recognised behaviour, technique, assembly design and norm, with: practitioner count, spread rate, fidelity of copying, age, last performed, payoff record |
| Knowledge capacity | Population, connectivity, teaching rate, memory capacity, storage medium (memory, marks, writing, records), specialist count, free time from food work |
| Norms (emergent) | Sharing rules, mating rules, taboos, food rules, status rules, punishment, ritual, burial |
| Roles (emergent) | Forager, hunter, toolmaker, fire keeper, carer, teacher, healer, leader, specialist trades later |
| Communication | Signal repertoire size, vocal range, gesture set, word count (later), grammar depth (later), symbol use, number sense |
| Belief and meaning (S2 onward) | Symbols, sacred places, ornaments, art, stories, ancestor regard |
| Institutions (S2 to S4) | Stable clusters of norms and roles: kin groups, councils, exchange systems, schools, guilds, law, money, states |

## 12. Outcomes the pattern system tracks

The pattern system credits each behaviour with these results, which decide whether it spreads, fades or gets selected for.

| Group | Outcomes |
| --- | --- |
| Per action | Success, partial, harm, death, time taken, energy spent, items gained or lost, injury caused or received |
| Per individual | Calories gained, health change, survival, offspring born, offspring surviving, rank change, bonds gained or lost, skill gained |
| Per behaviour | Times performed, practitioners, payoff over time (food, safety, reproduction), failure modes seen, observers reached |
| Per band | Population trend, food security, deaths by cause, births, range size, conflicts won and lost, culture items held, culture items lost |
| Per lineage | Persistence, species count, gene pool change, extinct branches, absorbed branches, novel forms |
| Deviation record | Drive-predicted action, actual action, gap size (the raw signal behind every new behaviour) |
