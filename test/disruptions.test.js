import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,createState,forecast,WORKLOAD,THROUGHPUT,done} from '../engine.js';
const task=(id,dept='Galley',status=1)=>({id,name:id,dept,status,lane:'primary',stuck:false,stuckRisk:0,points:20,tag:'Normal',prepared:0});
function setup(items){const s=createState(12);Object.assign(s,{phase:'playing',day:4,tier:'pro',actions:6,automations:[],items});return new Game(s);}
test('workload rises and preparation links refer to the exact next-day orders',async()=>{
  const g=new Game(createState(22));g.s.automations=[];
  for(let day=1;day<=10;day++){await g.startDay();assert.equal(g.s.items.filter(i=>i.lane==='primary').length,WORKLOAD[day-1]);assert.ok(g.s.items.every(i=>i.status===0));assert.deepEqual(g.s.items.filter(i=>i.lane==='secondary').map(i=>i.targetId),g.s.tomorrow.map(i=>i.id));g.s.items.forEach(i=>i.status=3);await g.endDay();}
});
test('forecast is seeded, applicable, independent of action RNG, and stable into tomorrow',async()=>{
  const s=createState(99),before=s.rng,a=forecast(s,7,[task('x')]);s.rng=500;assert.deepEqual(forecast(s,7,[task('x')]),a);assert.equal(new Set(a.map(e=>e.type)).size,2);assert.deepEqual(a.map(e=>e.afterTurn),[2,4]);assert.notEqual(s.rng,before);assert.deepEqual(forecast(s,3,[]),[]);
  const g=setup([task('done','Deck',3)]);g.s.phase='shop';g.s.day=3;await g.startDay();const expected=structuredClone(g.s.tomorrowEvents);g.s.items.forEach(i=>i.status=3);await g.endDay();await g.startDay();assert.deepEqual(g.s.events,expected);
});
test('inspection resets all unfinished Galley lanes but preserves Done and consumed preparation',async()=>{
  const a=task('prepared');Object.assign(a,{status:0,prepared:1});const b=task('prep');b.lane='secondary';const c=task('repeat');c.lane='recurring';const complete=task('complete','Galley',3),other=task('other','Deck');const g=setup([a,b,c,complete,other]);
  await g.act(a.id);assert.equal(a.status,2);g.s.playerTurns=2;g.s.events=[{type:'inspection',id:'inspect',afterTurn:2}];const score=g.s.dayScore;await g.resolveDisruptions();assert.deepEqual(g.s.items.map(i=>i.status),[0,0,0,3,1]);assert.equal(g.s.dayScore,score);await g.act(a.id);assert.equal(a.status,1);await g.resolveDisruptions();assert.equal(a.status,1);
});
test('all-hands resolves after agents, spends an action once, and clamps at zero',async()=>{
  const g=setup([task('player','Deck'),task('crew')]);g.s.playerTurns=1;g.s.agents=[{id:'coordinator',dept:'Galley'}];g.s.events=[{id:'all',type:'allhands',afterTurn:2}];await g.act('player');assert.equal(g.s.items[1].status,2);assert.equal(g.s.actions,4);assert.equal(g.s.playerTurns,2);assert.ok(g.s.log.findIndex(e=>e.target==='crew')<g.s.log.findIndex(e=>e.kind==='disruption'));await g.resolveDisruptions();assert.equal(g.s.actions,4);g.s.actions=0;g.s.events=[{id:'zero',type:'allhands',afterTurn:2}];await g.resolveDisruptions();assert.equal(g.s.actions,0);
});
test('briefing skips each matching agent once, even with no eligible work, without disabling perks',async()=>{
  const g=setup([task('p','Deck',0),task('a','Galley',0)]);g.s.agents=[{id:'coordinator',dept:'Galley'},{id:'escalation',dept:'Galley'}];g.s.events=[{id:'brief',type:'briefing',dept:'Galley',afterTurn:0}];await g.resolveDisruptions();assert.deepEqual(g.s.briefingSkips,['coordinator','escalation']);await g.act('p');assert.equal(g.s.items[1].status,0);assert.deepEqual(g.s.briefingSkips,[]);const c=g.context();c.queue.push({type:'stuck',item:g.s.items[1],actor:'player'});await g.drain(c);assert.equal(g.s.actions,6);await g.act('p');assert.equal(g.s.items[1].status,2);
});
test('Stuck saves and resumes the remaining agent slots before the scheduled disruption',async()=>{
  const g=setup([task('player','Deck',0),{...task('stuck','Galley',2),stuckRisk:1},task('second','Cabins',0)]);g.s.coins=9;g.s.playerTurns=1;g.s.agents=[{id:'coordinator',dept:'Galley'},{id:'liaison',dept:'Cabins'}];g.s.events=[{id:'all',type:'allhands',afterTurn:2}];await g.act('player');assert.equal(g.s.pendingStuck,'stuck');assert.equal(g.s.playerTurns,1);assert.equal(g.s.items[2].status,0);assert.equal(await g.act('player'),false);
  const resumed=new Game(JSON.parse(JSON.stringify(g.s)));await resumed.resolveStuck('coins');assert.equal(resumed.s.items[2].status,1);assert.equal(resumed.s.playerTurns,2);assert.equal(resumed.s.actions,4);assert.ok(resumed.s.events[0].resolved);assert.equal(await resumed.resolveStuck('coins'),false);
});
test('refunds do not move the event clock and ending early avoids future events',async()=>{
  const g=setup([{...task('urgent','Deck',2),tag:'Urgent'}]);g.s.automations=[{id:'fast',enabled:true}];g.s.events=[{id:'all',type:'allhands',afterTurn:2}];await g.act('urgent');assert.equal(g.s.actions,6);assert.equal(g.s.playerTurns,1);await g.endDay();assert.equal(g.s.phase,'shop');assert.ok(!g.s.events[0].resolved);
});
test('shops guarantee available unowned throughput without duplicates',()=>{
  for(let seed=0;seed<100;seed++){const g=new Game(createState(seed));g.rollOffers();assert.ok(g.s.offers.some(id=>THROUGHPUT.includes(id)));assert.equal(new Set(g.s.offers).size,3);}
});
test('a player incident resumes all agents and retains cascade score and limits across reload',async()=>{
  const g=setup([{...task('player','Galley',2),stuckRisk:1},task('crew','Cabins',0)]);g.s.coins=6;g.s.agents=[{id:'coordinator',dept:'Cabins'}];g.s.automations=[{id:'alert',enabled:true},{id:'bonus',enabled:true},{id:'chain',enabled:true}];await g.act('player');assert.equal(g.s.turn.nextAgent,0);assert.equal(g.s.turn.context.fires.alert,1);assert.equal(g.s.playerTurns,0);
  const h=new Game(JSON.parse(JSON.stringify(g.s)));await h.resolveStuck('coins');assert.equal(h.s.items[1].status,1);assert.equal(h.s.dayScore,50);assert.equal(h.s.playerTurns,1);assert.equal(h.s.turn,null);
});
