// Headless scenario tests. Usage: node tests/scenarios.js <test> [seed]
// Tests: refuse interrupt theft recog engine explore soak
const T0=require('three');
function el(){ return { textContent:'', innerHTML:'', style:{cssText:''}, clientWidth:1000, clientHeight:700, classList:{add(){},remove(){},toggle(){return false;}}, addEventListener(){}, setPointerCapture(){}, getAttribute(){return 'x';}, querySelectorAll(){return [];}, getBoundingClientRect(){return {left:0,top:0};}, appendChild(){}, insertAdjacentHTML(){} }; }
const els={}; global.document={ getElementById:(id)=>els[id]||(els[id]=el()), createElement:()=>el(), body:el() }; global.setInterval=setInterval; global.clearInterval=clearInterval;
global.performance={ now:()=>Date.now() }; global.requestAnimationFrame=()=>{};
const Stub=function(){ return { setPixelRatio(){}, setSize(){}, render(){}, shadowMap:{}, domElement:el(), info:{render:{calls:0,triangles:0}} }; };
global.window={ innerWidth:1200, innerHeight:800, matchMedia:()=>({matches:false}), devicePixelRatio:1, addEventListener(){}, THREE:Object.assign({},T0,{WebGLRenderer:Stub}) };
const [test, seedArg]=process.argv.slice(2); const seed=+(seedArg||4444);
const path=require('path'); const html=require('fs').readFileSync(path.join(__dirname,'..','index.html'),'utf8'); const scripts=[...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].map(m=>m[1]); let src=scripts.find(x=>x.indexOf('"use strict"')>=0).replace(/var seed = \(function\(\)\{[^\n]*?SEED0 = seed;/, 'var seed = '+seed+'; var SEED0=seed;');
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
 h.hold=[null,null]; S.giveNew(h,'flake',1); const sk=S.addItem('stick',h.x,h.y,1); out.scrapeStick=S.attempt(h,'scrape','flake',{k:'item',ref:sk}).effect;
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
  const h=mine()[0]; S.setFocus(h); h.frustration=0; h.push={}; let succ=0; const b=nearestBush(h);
  for (let k=0;k<12;k++){ h.hunger=0.05; h.hold=[null,null]; h.x=b.x+0.6; h.y=b.y; b.stock=6; S.setTask(h,'gather',{k:'source',ref:b},'player'); for(let i=0;i<60;i++){ S.update(0.05); h.hunger=0.05; if (h.hold[0]){succ++;break;} if(!h.task) break; } }
  out.pushSuccesses=succ; out.frustrationAfterPushing=+(h.frustration||0).toFixed(2);
  out.PASS = out.refusedFull>=0.8 && out.hungryGathers>=0.7 && succ>=1 && h.frustration>0.2;
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
if (test==='recog'){
  const h=mine()[0]; S.setFocus(h); let firstDay=null, recogDay=null; const spot={x:h.x+1,y:h.y+1};
  for (let i=0;i<2400*4;i++){ S.update(0.05); h.thirst=Math.min(h.thirst,0.3);
    const p=Object.values(S.patterns).find(p=>p.effect==='store'); if (p && firstDay===null) firstDay=S.getTime()/120; if (p && p.recognized && recogDay===null) recogDay=S.getTime()/120;
    if (!h.task){ if (h.hold[0] && S.IT[h.hold[0].cls].food){ S.setTask(h,'place',{k:'ground',x:spot.x,y:spot.y},'player'); } else { h.hunger=Math.max(h.hunger,0.5); const b=nearestBush(h); if(b){ b.stock=Math.max(b.stock,3); S.setTask(h,'gather',{k:'source',ref:b},'player'); } } } }
  S.setFocus(null); out.trainedRes=+S.effRes(h,'place','berry','ground').toFixed(2);
  for (let i=0;i<2400*2;i++){ S.update(0.05); if (i%200===0 && !h.dead){ h.hunger=Math.min(h.hunger,0.2); const fh=!h.hold[0]?0:(!h.hold[1]?1:-1); if(fh>=0){ const b=nearestBush(h); if(b){ b.stock=Math.max(b.stock,4); h.hold[fh]={id:70000+i,cls:'berry',x:h.x,y:h.y,count:3,fresh:1,wet:0,cooked:false,dried:false,fermented:false,covered:false,burn:0,band:-1,heldBy:h.id}; } } }
    const pp=Object.values(S.patterns).find(p=>p.effect==='store'); if (pp && pp.recognized && recogDay===null) recogDay=S.getTime()/120; }
  const p=Object.values(S.patterns).find(p=>p.effect==='store');
  out.traineeDead=h.dead; out.traineeThought=h.thought; out.count=p&&p.count; out.days=p&&Object.keys(p.days).length; out.unprompted=p&&p.unprompted; out.firstDay=firstDay&&+firstDay.toFixed(2); out.recognisedDay=recogDay&&+recogDay.toFixed(2);
  out.PASS = !!recogDay && Object.keys(p.days).length>=2 && (p.unprompted||0)>=1 && (recogDay-firstDay)>=1;
  out.note = recogDay? 'recognised' : 'not yet recognised (needs an unprompted performance)';
}
console.log(test, JSON.stringify(out));
