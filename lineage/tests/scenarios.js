// Headless scenario tests. Usage: node tests/scenarios.js <test> [seed]
// Tests: refuse interrupt theft recog engine explore soak
const T0=require('three');
function el(){ return { textContent:'', innerHTML:'', style:{cssText:''}, clientWidth:1000, clientHeight:700, classList:{add(){},remove(){},toggle(){return false;}}, addEventListener(){}, setPointerCapture(){}, getAttribute(){return 'x';}, querySelectorAll(){return [];}, getBoundingClientRect(){return {left:0,top:0};}, appendChild(){}, insertAdjacentHTML(){} }; }
const els={}; global.document={ getElementById:(id)=>els[id]||(els[id]=el()), createElement:()=>el(), body:el() }; global.setInterval=setInterval; global.clearInterval=clearInterval;
global.performance={ now:()=>Date.now() }; global.requestAnimationFrame=()=>{};
const Stub=function(){ return { setPixelRatio(){}, setSize(){}, render(){}, shadowMap:{}, domElement:el(), info:{render:{calls:0,triangles:0}} }; };
global.window={ innerWidth:1200, innerHeight:800, matchMedia:()=>({matches:false}), devicePixelRatio:1, addEventListener(){}, THREE:Object.assign({},T0,{WebGLRenderer:Stub}) };
const [test, seedArg]=process.argv.slice(2); const seed=+(seedArg||4444);
const path=require('path'); const html=require('fs').readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n'); const scripts=[...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].map(m=>m[1]); let src=scripts.find(x=>x.indexOf('"use strict"')>=0).replace(/var seed = \(function\(\)\{[^\n]*?SEED0 = seed;/, 'var seed = '+seed+'; var SEED0=seed;');
src=src.replace('window.__sim = {', 'window.__sim = {attempt:attempt, giveNew:giveNew, homUpdate:homUpdate, record:record, effRes:effRes, addItem:addItem, setTime:function(t){time=t;}, getTime:function(){return time;}, socialPull:socialPull, kill:kill, ');
eval(src);
const S=window.__sim, mine=()=>S.homs().filter(h=>h.band===0);
const step=(n)=>{ for(let i=0;i<n;i++) S.update(0.05); };
function nearestBush(h){ return S.sources.filter(s=>s.type==='bush').sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0]; }
function freeze(except){ mine().concat(S.homs().filter(h=>h.band===1)).forEach(h=>{ if(!except.includes(h)){ h.hunger=0.1; h.thirst=0.1; } }); }
const out={};
if (test==='engine'){
 const h=mine()[0]; h.hp=1; h.hunger=0.3; const tries=(n,f)=>{ let c=0; for(let i=0;i<n;i++){ if(f()) c++; } return c; };
 const near=(cls)=>S.items.find(i=>i.cls===cls&&!i.heldBy);
 // fish by hand
 const w=S.nearWater(h.x,h.y,40); h.x=w.x; h.y=w.y; h.hold=[null,null];
 out.fishByHand=tries(100,()=>{ h.hold=[null,null]; const r=S.attempt(h,'grab','hands',{k:'water',x:w.x,y:w.y}); return h.hold[0]&&h.hold[0].cls==='fish'; });
 // bite stone
 const st=S.addItem('stone',h.x,h.y,1); h.hp=1; const r1=S.attempt(h,'bite','teeth',{k:'item',ref:st}); out.biteStone=r1.msg; out.hpAfterBiteStone=+h.hp.toFixed(2);
 // bite nut gracile vs robust
 h.genes.bite=0.5; out.gracileNutCrack=tries(40,()=>{ const n=S.addItem('nut',h.x,h.y,1); h.hp=1; const r=S.attempt(h,'bite','teeth',{k:'item',ref:n}); return r.effect==='bite-crack'; });
 h.genes.bite=0.9; out.robustNutCrack=tries(40,()=>{ const n=S.addItem('nut',h.x,h.y,1); const r=S.attempt(h,'bite','teeth',{k:'item',ref:n}); return r.effect==='bite-crack'; });
 // squeeze berries
 const bb=S.addItem('berry',h.x,h.y,3); const r2=S.attempt(h,'squeeze','hands',{k:'item',ref:bb}); out.squeezeBerries=r2.effect;
 // hit stone with stone
 h.hold=[null,null]; S.giveNew(h,'stone',1); out.flakesIn20=tries(20,()=>{ const s2=S.addItem('stone',h.x,h.y,1); return S.attempt(h,'hit','stone',{k:'item',ref:s2}).effect==='hit-flake'; });
 // rub stick on stick until ember
 h.hold=[null,null]; S.giveNew(h,'stick',1); const tgtStick=S.addItem('stick',h.x,h.y,1); let rubs=0, ember=false; for(;rubs<40&&!ember;rubs++){ const r=S.attempt(h,'rub','stick',{k:'item',ref:tgtStick}); if (r.effect==='rub-friction') ember=true; } out.rubsToEmber=ember?rubs:'none';
 // scrape stick with flake
 h.hold=[null,null]; S.giveNew(h,'flake',1); const sk=S.addItem('stick',h.x,h.y,1); let sr=null; for (let i=0;i<5 && sr!=='scrape-sharpen';i++){ h.hold=[null,null]; S.giveNew(h,'flake',1); sr=S.attempt(h,'scrape','flake',{k:'item',ref:sk}).effect; } out.scrapeStick=sr; // a few strokes, not one
 // poke mound with stick
 const mound=S.sources.find(s=>s.type==='mound'); h.hold=[null,null]; S.giveNew(h,'stick',1); mound.stock=20; out.termitesIn10=tries(10,()=>S.attempt(h,'poke','stick',{k:'source',ref:mound}).effect==='poke-termites');
 // squeeze a rock with teeth (silly combo)
 const rock=S.addItem('stone',h.x,h.y,1); h.hp=1; out.squeezeRockTeeth=S.attempt(h,'squeeze','teeth',{k:'item',ref:rock}).msg;
 // chew stick -> brush
 const ss=S.addItem('stick',h.x,h.y,1); out.chewStick=S.attempt(h,'bite','teeth',{k:'item',ref:ss}).effect;
 out.PASS = out.fishByHand>0 && out.hpAfterBiteStone<1 && out.robustNutCrack>out.gracileNutCrack && out.squeezeBerries==='squeeze-mash' && out.flakesIn20>0 && out.rubsToEmber!=='none' && out.scrapeStick==='scrape-sharpen' && out.termitesIn10>0;
}
if (test==='explore'){ for (let i=0;i<2400*6;i++) S.update(0.05); const ps=Object.values(S.patterns).filter(p=>p.effect&&p.effect.indexOf('-')>0); out.composed=ps.length; out.examples=ps.slice(0,10).map(p=>(p.recognized?'[R] ':'')+(p.count)+'x '+require('util').format('%s',p.effect)+' '+p.held+'>'+p.tgt); out.recognized=ps.filter(p=>p.recognized).map(p=>p.key); out.PASS = ps.length>0; }
if (test==='soak'){ for (let d=0; d<12; d++){ for(let i=0;i<2400;i++){ S.update(0.05); if(i%20===0) S.render(0.05);} } const n=S.homs().length; out.aliveAfter12Days=n; out.PASS = true; }
if (test==='refuse'){
  // adults only: juveniles get pulled away to play, which is a different test
  const mine=()=>S.homs().filter(h=>h.band===0 && h.age>8);
  // well-fed hominin ordered to gather 30 times
  let refused=0, n=30;
  for (let k=0;k<n;k++){ const h=mine()[k%mine().length]; S.setFocus(h); h.hunger=0.05; h.thirst=0.1; h.frustration=0; h.push={}; h.hold=[null,null]; const b=nearestBush(h); b.stock=6; h.x=b.x+0.6; h.y=b.y; h.task=null;
    S.setTask(h,'gather',{k:'source',ref:b},'player'); let did=false, ref=false; for(let i=0;i<80;i++){ S.update(0.05); h.hunger=0.05; if (h.hold[0]&&h.hold[0].cls==='berry'){did=true;break;} if(!h.task){ ref=true; break; } } if(!did) refused++; }
  out.refusedFull = refused/n;
  let ok=0;
  for (let k=0;k<n;k++){ const h=mine()[k%mine().length]; S.setFocus(h); h.hunger=0.75; h.frustration=0; h.push={}; h.hold=[null,null]; const b=nearestBush(h); b.stock=6; h.x=b.x+0.6; h.y=b.y; h.task=null;
    S.setTask(h,'gather',{k:'source',ref:b},'player'); for(let i=0;i<80;i++){ S.update(0.05); h.hunger=0.75; if (h.hold[0]&&h.hold[0].cls==='berry'){ok++;break;} if(!h.task) break; } }
  out.hungryGathers = ok/n;
  // pushing raises frustration and sometimes succeeds
  const h=mine()[0]; S.setFocus(h); h.frustration=0; h.push={}; let succ=0, maxFr=0; const b=nearestBush(h);
  for (let k=0;k<12;k++){ h.hunger=0.05; h.hold=[null,null]; h.x=b.x+0.6; h.y=b.y; b.stock=6; S.setTask(h,'gather',{k:'source',ref:b},'player'); for(let i=0;i<60;i++){ S.update(0.05); h.hunger=0.05; maxFr=Math.max(maxFr,h.frustration||0); if (h.hold[0]){succ++;break;} if(!h.task) break; } }
  out.pushSuccesses=succ; out.frustrationAfterPushing=+maxFr.toFixed(2);
  out.PASS = out.refusedFull>=0.8 && out.hungryGathers>=0.7 && succ>=1 && maxFr>0.2;
}
if (test==='interrupt'){
  const h=mine().find(x=>x.sex==='m'&&x.age>8)||mine()[0]; S.setFocus(h);
  let lost=0, flip=1; const home={x:h.x,y:h.y}; const go=()=>{ flip=-flip; S.setTask(h,'move',{k:'ground',x:home.x+flip*5,y:home.y},'player'); };
  go(); for (let i=0;i<1200;i++){ S.update(0.05); if (!h.task || h.task.src!=='player'){ if (h.interrupt) lost++; go(); } }
  out.interruptionsPerMinute = lost;
  // challenge ignore costs rank
  const o=mine().find(x=>x!==h); h.rank=0.5; const r0=h.rank; h.interrupt={by:o,verb:'threaten',t:S.getTime()}; S.setTask(h,'move',{k:'ground',x:h.x+3,y:h.y},'player'); out.rankDrop=+(r0-h.rank).toFixed(3);
  // fight draws allies
  const victim=mine().find(x=>x!==h&&x!==o); const ally=mine().find(x=>x!==h&&x!==o&&x!==victim); ally.bonds[victim.id]=0.9; ally.bonds[o.id]=0.1; ally.x=victim.x+1; ally.y=victim.y; ally.asleep=false; ally.age=Math.max(ally.age,8); o.x=victim.x+0.5; o.y=victim.y;
  S.doVerb(o,'attack',{k:'hom',ref:victim},false); out.allyJoined = !!(ally.task && (ally.task.verb==='attack'||ally.task.verb==='threaten') && ally.task.t.ref===o);
  out.PASS = lost>=1 && out.rankDrop>0 && out.allyJoined;
}
if (test==='theft'){
  const st=mine()[0], thief=mine()[1], wit=mine()[2]; S.setFocus(null);
  st.hold=[null,null]; const it=S.addItem('berry', st.x, st.y, 4); it.storer=st.id; it.band=0; st.caches=[{x:it.x,y:it.y,count:4,t:S.getTime(),thieves:{}}];
  wit.bonds[st.id]=0.8; wit.x=it.x+2; wit.y=it.y; wit.asleep=false; thief.x=it.x+0.3; thief.y=it.y; thief.hold=[null,null];
  S.doVerb(thief,'pick',{k:'item',ref:it},false);
  st.x=it.x+20; st.y=it.y; // storer away
  st.x=it.x+1; st.y=it.y; st.lastCacheCheck=-99; st.lastAct=null; S.homUpdate(st,0.05);
  out.storerAngryAtThief = +(st.anger[thief.id]||0).toFixed(2);
  // dominance seizure across runs
  let seizures=0, kills=0, runs=0;
  for (let r=0;r<40;r++){
    const pool=mine().filter(x=>x.age>8); if (pool.length<2) break; const big=pool.sort((a,b)=>b.genes.size-a.genes.size)[0], small=pool.find(x=>x!==big); runs++;
    big.genes.aggression=0.85; big.rank=0.75; big.hunger=0.8; big.hp=1; big.hold=[null,null]; small.rank=0.3+Math.random()*0.5; small.genes.aggression=Math.random(); small.hp=0.25+Math.random()*0.75; small.hold=[null,null];
    const food={id:9000+r,cls:'berry',x:small.x,y:small.y,count:3,fresh:1,wet:0,cooked:false,dried:false,fermented:false,covered:false,burn:0,band:-1,heldBy:small.id}; small.hold[0]=food;
    big.x=small.x+0.5; big.y=small.y; big.task=null; small.hunger=0.05; small.task=null;
    S.setTask(big,'seize',{k:'hom',ref:small},'drive'); big.task.u=1.2; for (let i=0;i<300;i++){ S.update(0.05); if (small.dead){kills++;break;} if (big.hold.some(x=>x&&x.id===food.id)){seizures++;break;} if (!big.task || big.task.verb!=='seize') break; small.hunger=0.05; }
  }
  out.seizureRuns=runs; out.seized=seizures; out.killed=kills;
  // witnesses of killing lower resistance to hiding
  const vic=mine()[0], killer=mine()[1], w2=mine()[2]; vic.caches=[{x:vic.x,y:vic.y,count:2,t:0,thieves:{}}]; w2.x=vic.x+2; w2.y=vic.y; const before=S.effRes(w2,'bury','none','berry'); S.kill(vic, killer); out.witnessBuryResDrop=+(before-S.effRes(w2,'bury','none','berry')).toFixed(3);
  out.PASS = out.storerAngryAtThief>0.3 && seizures>=1 && kills>=1 && out.witnessBuryResDrop>0;
}
function p0dbg(){ const q=Object.values(S.patterns).find(p=>p.effect==='store'); return q?{payoff:+q.payoff.toFixed(1),bands:q.bands,own:q.bandOwn,key:q.key,rec:q.recognized,stores:Object.values(S.patterns).filter(p=>p.effect==='store').map(p=>p.key+':'+p.count)}:null; }
if (test==='recog'){
  const h=mine()[0]; S.setFocus(h); let firstDay=null, recogDay=null; const spot={x:h.x+1,y:h.y+1};
  for (let i=0;i<2400*4;i++){ S.update(0.05); h.thirst=Math.min(h.thirst,0.3);
    const p=Object.values(S.patterns).find(p=>p.effect==='store'); if (p && firstDay===null) firstDay=S.getTime()/120; if (p && p.recognized && recogDay===null) recogDay=S.getTime()/120;
    h.hp=Math.max(h.hp,0.6); // this test is about habits, not predators
    if (!h.task){ if (h.hold[0] && S.IT[h.hold[0].cls].food){ S.setTask(h,'place',{k:'ground',x:spot.x,y:spot.y},'player'); } else { h.hunger=Math.max(h.hunger,0.5); const b=nearestBush(h); if(b){ b.stock=Math.max(b.stock,3); S.setTask(h,'gather',{k:'source',ref:b},'player'); } } } }
  S.setFocus(null); out.trainedRes=+S.effRes(h,'place','berry','ground').toFixed(2);
  for (let i=0;i<2400*2;i++){ S.update(0.05); h.hp=Math.max(h.hp,0.6); if (i%200===0 && !h.dead){ h.hunger=Math.min(h.hunger,0.2); const fh=!h.hold[0]?0:(!h.hold[1]?1:-1); if(fh>=0){ const b=nearestBush(h); if(b){ b.stock=Math.max(b.stock,4); h.hold[fh]={id:70000+i,cls:'berry',x:h.x,y:h.y,count:3,fresh:1,wet:0,cooked:false,dried:false,fermented:false,covered:false,burn:0,band:-1,heldBy:h.id}; } } }
    const pp=Object.values(S.patterns).find(p=>p.effect==='store'); if (pp && pp.recognized && recogDay===null) recogDay=S.getTime()/120; }
  const p=Object.values(S.patterns).find(p=>p.effect==='store');
  out.traineeDead=h.dead; out.payoff=p0dbg(); out.deathLog=S.chronicle.filter(c=>c.text.indexOf(h.name)>=0).slice(0,3).map(c=>c.t.toFixed(1)+" "+c.text); out.traineeThought=h.thought; out.count=p&&p.count; out.days=p&&Object.keys(p.days).length; out.unprompted=p&&p.unprompted; out.firstDay=firstDay&&+firstDay.toFixed(2); out.recognisedDay=recogDay&&+recogDay.toFixed(2);
  out.PASS = !!recogDay && Object.keys(p.days).length>=2 && (p.unprompted||0)>=1 && (recogDay-firstDay)>=1;
  out.note = recogDay? 'recognised' : 'not yet recognised (needs an unprompted performance)';
}
if (test==='every'){
  // Every verb, with every body part and a wide range of held things, against every kind of target.
  // Each attempt must change something physical in the world. "Nothing happens" is a failure.
  const h=mine()[0]; S.setFocus(null); const home={x:h.x,y:h.y};
  const others=S.homs().filter(o=>o!==h && o.band===0 && o.age>8);
  const reset=()=>{ Object.assign(h,{hp:1,hunger:0.5,thirst:0.5,cold:0.3,fear:0.2,social:0.4,sick:0.1,energy:0.6,asleep:false,inTree:null,task:null,frustration:0,coat:null,tuck:null,wear:null,wetT:0,boredom:0.3,dead:false,fur:0.5,aversion:{}}); h.hold=[null,null]; };
  const findTile=(tt)=>{ for(let r=1;r<70;r++) for(let a=0;a<36;a++){ const x=home.x+Math.cos(a/36*6.283)*r, y=home.y+Math.sin(a/36*6.283)*r; if (S.T(x,y)===tt) return {x:Math.floor(x)+0.5,y:Math.floor(y)+0.5}; } return null; };
  const makers=[];
  Object.keys(S.IT).forEach(cls=>{ if (cls==='water') return; makers.push({name:'item:'+cls, mk:()=>{ h.x=home.x; h.y=home.y; return {k:'item',ref:S.addItem(cls,h.x+0.6,h.y,cls==='carcass'?1:2,cls==='carcass'?{meat:6,bones:2,hides:1}:(cls==='gourdW'?{water:3}:{}))}; }}); });
  ['bush','nutTree','figTree','tree','roots','mound','burrow','vine','outcrop'].forEach(ty=>makers.push({name:'source:'+ty, mk:()=>{ const s=S.sources.find(s=>s.type===ty); if(!s) return null; s.stock=Math.max(s.stock,3); s.rodents=2; s.loose=0; s.collapsed=false; h.x=s.x+0.8; h.y=s.y; return {k:'source',ref:s}; }}));
  makers.push({name:'fire', mk:()=>{ h.x=home.x; h.y=home.y; return {k:'fire',ref:S.addFire(h.x+0.8,h.y,2)}; }});
  makers.push({name:'water', mk:()=>{ const w=S.nearWater(home.x,home.y,40); h.x=w.x; h.y=w.y; return {k:'water',x:w.x,y:w.y}; }});
  [['grass',3],['sand',2],['rock',5],['wood',4]].forEach(([n,tt])=>{ const p=findTile(tt); if (p) makers.push({name:'ground:'+n, mk:()=>{ h.x=p.x; h.y=p.y; const s0=S.spotAt(p.x,p.y,1.2); if (s0) S.spots.splice(S.spots.indexOf(s0),1); return {k:'ground',x:p.x,y:p.y}; }}); });
  const g0=findTile(3);
  [['hole',{depth:0.6}],['basin',{depth:0.7,stones:5,water:4}],['pile',{stones:4}],['damp',{damp:0.8}],['puddle',{water:1,rock:true}]].forEach(([n,f])=>makers.push({name:'spot:'+n, mk:()=>{ h.x=g0.x; h.y=g0.y; S.spots.length=0; const s=S.makeSpot(g0.x+0.5,g0.y); Object.assign(s,f); return {k:'spot',ref:s}; }}));
  ['antelope','hyena','leopard','croc'].forEach(k=>makers.push({name:'animal:'+k, mk:()=>{ const a=S.creatures().find(c=>c.kind===k); if(!a) return null; a.dead=false; a.hp=2; a.state='idle'; a.cool=0; a.noticed=undefined; a.wary=5; a.bold=0.5; a.t=0; h.x=a.x+1; h.y=a.y; return {k:'animal',ref:a}; }}));
  makers.push({name:'hominin', mk:()=>{ const o=others[0]; o.dead=false; o.hp=1; o.fear=0.2; o.social=0.4; o.energy=0.6; o.task=null; o.copyOf=null; o.bonds[h.id]=0.4; o.anger[h.id]=0.1; o.rank=0.5; o.coat=null; o.wetT=0; o.boredom=0.3; h.x=o.x+0.8; h.y=o.y; return {k:'hom',ref:o}; }});
  makers.push({name:'self', mk:()=>{ h.x=home.x; h.y=home.y; return {k:'self'}; }});
  const heldList=[null,'stone','stick','flake','berry','leaves','water','gourd','gourdHalf','spear','bone','soil','mud','hide','brand','nut','cord','tinder','meat','ember','shard','bark','grubs'];
  let total=0; const fails=[];
  for (const M of makers) for (const held of heldList){
    const pre=new Set(S.items); const probe=M.mk(); if (!probe) continue;  for (let i=S.items.length-1;i>=0;i--) if (!pre.has(S.items[i])) S.items.splice(i,1);
    reset(); if (held){ if (held==='water') S.giveNew(h,'water',1,{vessel:'hands',life:6,units:1}); else S.giveNew(h,held,1,held==='brand'?{burn:1}:{}); }
    const verbs=S.compVerbs(probe,h); const combos=[]; for (const v of verbs) for (const ik of S.instrFor(v,h,probe)) combos.push([v,ik]);
    for (const [v,ik] of combos){
      const itemsBefore=new Set(S.items), firesBefore=S.fires.length;
      reset(); const t=M.mk(); if (!t) continue;
      if (held){ if (held==='water') S.giveNew(h,'water',1,{vessel:'hands',life:6,units:1}); else S.giveNew(h,held,1,held==='brand'?{burn:1}:{}); }
      const learn=(v==='sniff'); const before=S.fp(h,t,!learn); let r;
      try { r=S.attempt(h,v,ik,t); } catch(e){ fails.push(M.name+' | '+held+' | '+v+' '+ik+' | THREW '+e.message); continue; }
      const after=S.fp(h,t,!learn); total++;
      if (process.env.DUMP) (global.__dump=global.__dump||[]).push([M.name,held||'',v,ik,(r&&r.effect)||'',String((r&&r.msg)||'').replace(/[\t\n]/g,' ')].join('\t'));
      if (process.env.SAMPLE && Math.random()<0.0025) (out.sample=out.sample||[]).push(M.name+' | held '+held+' | '+v+' with '+ik+' => '+(r&&r.msg));
      if (!r || !r.effect || r.learnOnly || before===after || /nothing (much )?happens/i.test(r.msg||'')) fails.push(M.name+' | held '+held+' | '+v+' with '+ik+' | '+(r&&r.effect)+' | '+(r&&r.msg));
      for (let i=S.items.length-1;i>=0;i--) if (!itemsBefore.has(S.items[i])) S.items.splice(i,1);
      S.fires.length=Math.min(S.fires.length,firesBefore);
    }
  }
  if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, 'target\theld\tverb\twith\teffect\tmessage\n'+global.__dump.join('\n'));
  out.attempts=total; out.failures=fails.length; out.examples=fails.slice(0,30); out.groups=Object.entries(fails.reduce((m,f)=>{ const p=f.split(" | "); const k=p[0]+" | "+p[2].split(" with ")[0]; m[k]=(m[k]||0)+1; return m; },{})).sort((a,b)=>b[1]-a[1]).slice(0,60);
  out.PASS = total>2000 && fails.length===0;
}
if (test==='water'){
  const h=mine()[0]; S.setFocus(h); const others=S.homs().filter(o=>o!==h);
  const run=(sec)=>{ for(let i=0;i<sec*20;i++){ S.setRaining(false); others.forEach(o=>{ o.thirst=0.05; o.hunger=0.1; }); h.thirst=0.1; h.hunger=0.1; h.boredom=0; S.update(0.05); } };
  h.hp=1; h.hold=[null,null];
  const w=S.nearWater(h.x,h.y,40); h.x=w.x; h.y=w.y; let r;
  for (let i=0;i<30 && !(h.hold[0]&&h.hold[0].cls==='water');i++){ h.hold=[null,null]; r=S.attempt(h,'grab','hands',{k:'water',x:w.x,y:w.y}); }
  out.scoop=h.hold[0]&&h.hold[0].cls; out.scoopMsg=r.msg;
  run(8); out.spilledWithin8s=!h.hold.some(i=>i&&i.cls==='water');
  let g=null; for (let r2=3;r2<14&&!g;r2++) for (let a=0;a<24;a++){ const x=w.x+Math.cos(a/24*6.283)*r2, y=w.y+Math.sin(a/24*6.283)*r2; if (S.T(x,y)===3 && !S.spotAt(x,y,2)){ g={x:Math.floor(x)+0.5,y:Math.floor(y)+0.5}; break; } }
  const G={k:'ground',x:g.x,y:g.y}; h.x=g.x; h.y=g.y; h.hold=[null,null];
  S.giveNew(h,'water',1,{vessel:'hands',life:6,units:1}); r=S.attempt(h,'put','water',G); out.putOnDirt=r.msg;
  h.hold=[null,null]; S.giveNew(h,'stone',1); let hits=0;
  while (hits<30){ hits++; S.attempt(h,'hit','stone',G); const s=S.spotAt(g.x,g.y,1); if (s && s.depth>=0.5) break; }
  const s=S.spotAt(g.x,g.y,1); out.hitsToHole=hits; out.kindAfterDig=S.spotKind(s);
  h.hold=[null,null]; for (let k=0;k<2;k++){ S.giveNew(h,'water',1,{vessel:'hands',life:6,units:1}); S.attempt(h,'put','water',G); }
  out.holeWater=+s.water.toFixed(2); run(60); out.holeWaterAfter60s=+s.water.toFixed(2);
  for (let k=0;k<4;k++){ h.hold=[null,null]; S.giveNew(h,'stone',1); r=S.attempt(h,'put','stone',{k:'spot',ref:s}); } out.lineMsg=r.msg; out.kindAfterStones=S.spotKind(s);
  for (let k=0;k<3;k++){ h.hold=[null,null]; S.giveNew(h,'water',1,{vessel:'hands',life:6,units:1}); r=S.attempt(h,'put','water',{k:'spot',ref:s}); } out.fillMsg=r.msg; out.basinWater=+s.water.toFixed(2); run(60); out.basinWaterAfter60s=+s.water.toFixed(2);
  h.thirst=0.8; r=S.attempt(h,'drink','teeth',{k:'spot',ref:s}); out.drinkEffect=r.effect; out.thirstAfterDrink=+h.thirst.toFixed(2);
  h.x=w.x; h.y=w.y; for (let i=0;i<30 && !(h.hold[0]&&h.hold[0].vessel==='leaves');i++){ h.hold=[null,null]; S.giveNew(h,'leaves',1); S.attempt(h,'grab','hands',{k:'water',x:w.x,y:w.y}); }
  out.leafCup=h.hold[0]&&h.hold[0].vessel; run(12); out.leafStillHoldsAfter12s=!!(h.hold[0]&&h.hold[0].cls==='water');
  let p2=null; for (let r3=4;r3<20&&!p2;r3++) for (let a=0;a<24;a++){ const x=g.x+Math.cos(a/24*6.283)*r3, y=g.y+Math.sin(a/24*6.283)*r3; if (S.T(x,y)===3 && !S.spotAt(x,y,2)){ p2={x:Math.floor(x)+0.5,y:Math.floor(y)+0.5}; break; } }
  const kinds=[]; for (let k=0;k<6;k++){ h.hold=[null,null]; S.giveNew(h,'stone',1); S.attempt(h,'put','stone',{k:'ground',x:p2.x,y:p2.y}); kinds.push(S.spotKind(S.spotAt(p2.x,p2.y,1))); } out.stoneKinds=kinds.join(',');
  out.PASS = out.scoop==='water' && out.spilledWithin8s && /seeps/.test(out.putOnDirt) && out.hitsToHole<=8 && out.holeWaterAfter60s<out.holeWater && out.kindAfterStones==='basin' && out.basinWaterAfter60s>=1.5 && out.drinkEffect==='drink-drinkStore' && out.leafCup==='leaves' && out.leafStillHoldsAfter12s && kinds[2]==='pile' && kinds[5]==='ring';
}
if (test==='tutorial'){
  // Plays lesson one the way a player would: grab berries, put them down, repeat, then release and wait.
  S.startTutorial(0); const tt=S.tut, tutor=tt.tutor; S.gotoStep(1); S.setFocus(tutor); S.tutTick(); out.stepAfterFocus=tt.step;
  let spot=null; for (let r=1;r<6&&!spot;r++) for (let a=0;a<16;a++){ const x=tutor.x+Math.cos(a/16*6.283)*r, y=tutor.y+Math.sin(a/16*6.283)*r; if (S.T(x,y)===3||S.T(x,y)===4){ spot={x:x,y:y}; break; } }
  const t0=S.getTime(); let ticks=0;
  while (tt.step<6 && S.getTime()-t0<120*3){ S.update(0.05); ticks++; if (ticks%5===0) S.tutTick(); if (tutor.dead) break;
    if (!tutor.task){ if (tutor.hold.some(i=>i&&i.cls==='berry')) { if (tt.step===3) S.setTask(tutor,'attempt',{k:'self'},'player',{av:'eat',ai:'berry'}); else S.setTask(tutor,'attempt',{k:'ground',x:spot.x,y:spot.y},'player',{av:'put',ai:'berry'}); }
      else { const b=S.sources.filter(s=>s.type==='bush'&&s.stock>=1).sort((a,c)=>Math.hypot(a.x-tutor.x,a.y-tutor.y)-Math.hypot(c.x-tutor.x,c.y-tutor.y))[0]; S.setTask(tutor,'attempt',{k:'source',ref:b},'player',{av:'grab',ai:'hands'}); } } }
  out.secondsToTeach=Math.round(S.getTime()-t0); out.ateInstead=S.chronicle.length; out.storesByTutor=S.stats.stores[tutor.id]||0; out.natural=Math.round(S.tutNat(tutor)*100); out.stepReached=tt.step;
  S.setFocus(null); const t1=S.getTime();
  while (tt.step<7 && S.getTime()-t1<120*6){ S.update(0.05); ticks++; if (ticks%5===0) S.tutTick(); }
  const p=S.patterns['store|berry|ground']; out.daysToHabitAfterRelease=+((S.getTime()-t1)/120).toFixed(2); out.finalStep=tt.step; out.unprompted=p&&p.unprompted; out.tutorDead=tutor.dead;
  out.tutorLog=S.chronicle.filter(c=>c.text.indexOf(tutor.name)>=0).slice(0,6).map(c=>c.t.toFixed(2)+" "+c.text); out.thirst=+tutor.thirst.toFixed(2); out.hunger=+tutor.hunger.toFixed(2);
  out.PASS = out.stepAfterFocus===2 && out.stepReached>=6 && tt.step===7;
}
console.log(test, JSON.stringify(out));
