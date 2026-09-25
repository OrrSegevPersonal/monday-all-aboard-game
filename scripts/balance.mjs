import {Game,createState,DEPTS,AGENTS,TIERS,done,activeRules} from '../engine.js';

const mode=process.argv[2]||'crew',count=Number(process.argv[3]||1000),offset=Number(process.argv[4]||1),exclude=process.argv[5]||'';
const report={mode,count,offset,exclude,wins:0,failures:{},upgrades:{},purchases:{},winningBuilds:{}};
function shop(g){
  const s=g.s;
  if(['manual','starter'].includes(mode))return;
  if(mode==='fixed'){
    if(s.tier!=='enterprise')g.upgrade();
    g.hire('coordinator','Galley');
    if(s.offers.length)g.buy(s.offers[0]);return;
  }
  const pref=(mode==='rules'?['standup','overtime','fast','cross','alert','bonus']:['fast','standup','overtime','alert','cross','bonus']).filter(id=>id!==exclude);
  // Buy useful throughput early, then unlock staffed departments.
  if(s.tier==='basic'&&s.automations.length===1){const id=pref.find(id=>s.offers.includes(id));if(id)g.buy(id);}
  if(s.tier==='basic'&&s.coins>=TIERS.pro.cost+5)g.upgrade();
  if(s.tier==='pro'&&s.agents.length===2&&s.coins>=TIERS.enterprise.cost+5)g.upgrade();
  const hires=mode==='rules'?['signoff','escalation','liaison','coordinator']:['escalation','signoff','coordinator','liaison'];
  for(const id of hires)if(s.agents.length<TIERS[s.tier].agents&&s.coins>=5&&!s.agents.some(a=>a.id===id))g.hire(id);
  if(s.tier!=='basic')for(const id of pref)if(activeRules(s).length<TIERS[s.tier].automations&&s.offers.includes(id)&&s.coins>=8)g.buy(id);
  const demand=Object.fromEntries(DEPTS.map(d=>[d,s.tomorrow.filter(i=>i.dept===d).reduce((n,i)=>n+2-(i.prepared||0),0)]));
  for(const a of s.agents){const dept=DEPTS.slice().sort((a,b)=>demand[b]-demand[a])[0];g.assign(a.id,dept);demand[dept]-=5;}
}
function target(g){
  const s=g.s,primaries=s.items.filter(i=>i.lane==='primary'&&!done(i));
  if(['manual','starter','fixed'].includes(mode))return primaries[0]||s.items.find(i=>!done(i));
  const inspection=s.events.find(e=>e.type==='inspection'&&!e.resolved);
  const rank=i=>{
    const agents=s.agents.filter(a=>a.dept===i.dept).length;
    let n=i.status*2-agents*6;
    if(i.tag==='Urgent'&&activeRules(s).includes('fast'))n+=5;
    if(inspection&&i.dept==='Galley')n+=i.status===2?10:-5;
    return n;
  };
  if(primaries.length)return primaries.sort((a,b)=>rank(b)-rank(a))[0];
  return s.items.filter(i=>!done(i)).sort((a,b)=>(b.lane==='secondary'?4:0)+b.status*2-((a.lane==='secondary'?4:0)+a.status*2))[0];
}
for(let seed=offset;seed<offset+count;seed++){
  const s=createState(seed);if(mode==='manual')s.automations=[];
  const g=new Game(s,{choose:async(_title,items)=>items.slice().sort((a,b)=>(b.lane==='primary')-(a.lane==='primary')||b.status-a.status)[0]?.id});
  // Retain counters without keeping an event history during large simulation batches.
  g.note=async()=>{};
  await g.startDay();let guard=0;
  while(!['won','lost'].includes(s.phase)&&guard++<1000){
    if(s.phase==='shop'){
      const oldTier=s.tier,old=new Set(s.automations.map(a=>a.id));shop(g);
      if(oldTier!==s.tier){const key=`${s.tier}:day${s.day+1}`;report.upgrades[key]=(report.upgrades[key]||0)+1;}
      for(const a of s.automations)if(!old.has(a.id))report.purchases[a.id]=(report.purchases[a.id]||0)+1;
      await g.startDay();continue;
    }
    if(s.pendingStuck){await g.resolveStuck(s.coins>=3?'coins':'actions');continue;}
    const unfinished=s.items.some(i=>i.lane==='primary'&&!done(i));
    const upcoming=s.events.some(e=>!e.resolved&&e.afterTurn<=s.playerTurns+1);
    if(!unfinished&&(upcoming||s.actions<3)){await g.endDay();continue;}
    const t=target(g);if(t)await g.act(t.id);else await g.endDay();
  }
  if(guard>=1000)throw new Error(`Stalled seed ${seed}`);
  if(s.phase==='won'){report.wins++;const key=s.automations.filter(a=>a.enabled).map(a=>a.id).sort().join('+');report.winningBuilds[key]=(report.winningBuilds[key]||0)+1;}
  else report.failures[s.day]=(report.failures[s.day]||0)+1;
}
report.winRate=report.wins/count;
console.log(JSON.stringify(report,null,2));
