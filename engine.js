export const DEPTS = ['Galley', 'Cabins', 'Engine Room', 'Deck'];
export const WORKLOAD = [2,2,3,3,4,5,6,7,9,10];
export const THROUGHPUT = ['standup','fast','overtime','cross'];
export const DISRUPTIONS = {allhands:'Mandatory all-hands',inspection:'Health inspection',briefing:'Department briefing'};
export function forecast(s,day,primaries) {
  if(s.balanceVersion!==2||day<4||day>10)return [];
  const rng={rng:(s.seed^Math.imul(day,0x9e3779b9))>>>0};
  const departments=[...new Set([...primaries.map(i=>i.dept),...DEPTS.slice((day-1)%2,(day-1)%2+2),...Array.from({length:WORKLOAD[day]||0},(_,n)=>DEPTS[(day+n)%4])])];
  const pool=['allhands','briefing',...(departments.includes('Galley')?['inspection']:[])];
  return Array.from({length:day<7?1:2},(_,n)=>{const type=pool.splice(Math.floor(random(rng)*pool.length),1)[0];return {id:`event-${day}-${n}`,type,afterTurn:2+n*2,resolved:false,...(type==='briefing'?{dept:departments[Math.floor(random(rng)*departments.length)]}:{})};});
}
export const TIERS = { basic: {automations:2,agents:0,cost:0}, pro: {automations:5,agents:2,cost:8}, enterprise: {automations:8,agents:4,cost:16} };
export const RULES = [
  ['bonus','Done → Bonus','When any task is completed → gain 5 score.','Common',3],
  ['assign','Auto-assign','When a Primary arrives → advance it one step.','Common',3],
  ['alert','Stuck → Alert','When work becomes Stuck → gain 1 action. Twice per day.','Common',3],
  ['standup','Daily Standup','When the day starts → advance two random unfinished work orders.','Common',3],
  ['galley','Galley Rush','When Galley work advances → gain 3 score.','Common',3],
  ['room','Room Service','When Cabin work completes → multiply its full payout by 1.5.','Common',3],
  ['fast','Fast Track','When Urgent work completes → gain 1 action.','Common',3],
  ['momentum','Momentum','When work advances → gain score equal to its position in this cascade.','Uncommon',5],
  ['overtime','Overtime','When the day ends → pay 2 coins for 2 extra actions tomorrow.','Uncommon',5],
  ['vip','VIP Lounge','When VIP work completes → double its full payout.','Uncommon',5],
  ['clear','Clear Blockers','When work becomes Stuck → clear it back to Working once per day.','Uncommon',5],
  ['chain','Chain Reaction','When three effects trigger → double this entire action’s score.','Rare',8],
  ['cross','Crossover','When Deck work completes → advance one chosen Galley work order.','Rare',8],
  ['touch','Touch Base','When work enters Review → send it back once per task per day and gain 10 score.','Rare',8],
].map(([id,name,text,rarity,cost])=>({id,name,text,rarity,cost}));
export const AGENTS = [
  {id:'coordinator',name:'The Coordinator',perk:'+3 score when this agent completes a preparation.',portrait:0},
  {id:'liaison',name:'VIP Liaison',perk:'+10 score when this agent completes VIP work.',portrait:1},
  {id:'escalation',name:'Escalation Manager',perk:'First blocker in its department each day grants +1 action.',portrait:2},
  {id:'quartermaster',name:'Quartermaster',perk:'First Recurring completion by this agent each day grants +1 coin.',portrait:3},
  {id:'signoff',name:'Sign-off Specialist',perk:'Once a day, this agent immediately approves a Primary it moves to Review.',portrait:4},
];
export const BOSSES = {3:{name:'Exorcise the espresso machine',dept:'Galley',rule:'Possessed appliances: its review has a 55% chance of becoming Stuck.'},6:{name:'Politely repel the pirates',dept:'Deck',rule:'Boarding party: its review has a 55% chance of becoming Stuck.'},9:{name:'Audit the haunted engine',dept:'Engine Room',rule:'Ghost in the machine: its review has a 55% chance of becoming Stuck.'}};
const NAMES = {
  Galley:['Feed the midnight passengers','Repair the buffet warmer','Prepare the captain’s dinner','Rescue the breakfast service'],
  Cabins:['Restore air conditioning','Deliver room-service dinner','Fix the very dramatic shower','Prepare the honeymoon suite'],
  'Engine Room':['Repair the coolant pump','Restart the water purifier','Investigate that strange noise','Restore the backup generator'],
  Deck:['Put on the evening show','Open the pool party','Rehearse the emergency disco','Stage karaoke night'],
};
const PREPS = {Galley:'Prep the ingredients',Cabins:'Stock the service trolley','Engine Room':'Stage the spare parts',Deck:'Check the lights and sound'};
const RECURRING = {Galley:'Polish the suspicious spoons',Cabins:'Refold the towel swans','Engine Room':'Label the mystery switches',Deck:'Mediate deck-chair diplomacy'};
export function createState(seed=Date.now()) {
  return {version:2,balanceVersion:2,events:[],tomorrowEvents:[],playerTurns:0,briefingSkips:[],turn:null,seed:Number(seed)>>>0,rng:Number(seed)>>>0,day:0,phase:'new',tier:'basic',coins:0,actions:0,dayScore:0,totalScore:0,nextActions:0,items:[],tomorrow:[],automations:[{id:'assign',enabled:true}],agents:[],daily:{},log:[],offers:[],rerolls:0,serial:0,pendingStuck:null};
}
export function random(s) { s.rng=(s.rng+0x6D2B79F5)>>>0; let t=s.rng; t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; }
export const done = i => i.status===3;
export function status(i) { return i.stuck?'Stuck':['Pending','Working on it','In review','Done'][i.status]; }
export function activeRules(s) { return s.automations.filter(a=>a.enabled).slice(0,TIERS[s.tier].automations).map(a=>a.id); }
export function agentTarget(s,a) {
  return s.items.filter(i=>i.dept===a.dept&&!done(i)).sort((x,y)=>['primary','secondary','recurring'].indexOf(x.lane)-['primary','secondary','recurring'].indexOf(y.lane)||y.status-x.status||s.items.indexOf(x)-s.items.indexOf(y))[0];
}
function generate(s,day) {
  const count=s.balanceVersion===2?WORKLOAD[day-1]:day<5?2:3, boss=BOSSES[day], result=[];
  for(let n=0;n<count;n++) {
    const dept=DEPTS[(day+n-1)%4];
    result.push({id:`task-${++s.serial}`,name:NAMES[dept][Math.floor(random(s)*4)],dept,lane:'primary',status:0,stuck:false,points:20+5*Math.floor(random(s)*4),tag:random(s)<.3?'VIP':random(s)<.4?'Urgent':'Normal',dueDay:day,prepared:0});
  }
  if(boss) result[count-1]={...result[count-1],name:boss.name,dept:boss.dept,boss:true,stuck:false,stuckRisk:.55,points:45};
  return result;
}
export class Game {
  constructor(state, {onEvent=async()=>{},choose=async(_title,items)=>items[0]?.id}={}) {this.s=state;this.onEvent=onEvent;this.choose=choose;this.busy=false;}
  async note(message,source=null,target=null,kind='event') {const e={message,source,target,kind};this.s.log.push(e);this.s.log=this.s.log.slice(-150);await this.onEvent(e);}
  context(){return {queue:[],fires:{},effects:0,moves:0,score:0,chain:false,halted:false};}
  async fire(c,id,target) {
    if(c.halted||(c.fires[id]||0)>= (id==='touch'?3:5))return false;
    if(c.effects>=50){c.halted=true;c.queue=[];await this.note('Cascade limit reached. The ship’s IT department intervened.',null,null,'guard');return false;}
    c.fires[id]=(c.fires[id]||0)+1;c.effects++;
    const source=id.replace('agent-action-','');
    await this.note(RULES.find(r=>r.id===source)?.name||AGENTS.find(a=>a.id===source)?.name||source,source,target,'trigger');
    if(id!=='chain'&&!c.chain&&c.effects>=3&&activeRules(this.s).includes('chain')) {c.chain=true;await this.note('Chain Reaction · all cascade score ×2','chain',target,'multiplier');}
    return true;
  }
  stuckRisk(i) { return i.stuckRisk ?? (i.tag==='Urgent'?.2:i.tag==='VIP'?.15:i.lane==='secondary'?.08:.1); }
  canResolveStuck() { return this.s.coins>=3||this.s.actions>=2; }
  async advance(c,i,actor='player',clear=false) {
    if(!i||done(i)||c.halted)return;
    if(this.s.pendingStuck)return;
    if(clear&&i.stuck){i.stuck=false;i.status=1;c.moves++;c.queue.push({type:'move',item:i,actor,to:1,position:c.moves});await this.note(`${i.name} · blocker cleared`,actor,i.id);return;}
    if(i.stuck)return;
    const preparedBoost=i.status===0&&!i.preparationConsumed?i.prepared||0:0;
    if(i.status===2&&this.canResolveStuck()&&random(this.s)<this.stuckRisk(i)) {
      i.stuck=true;this.s.pendingStuck=i.id;this.s.stuckActor=actor;c.queue.push({type:'stuck',item:i,actor});
      await this.note(`${i.name} is Stuck · a quick scenario needs your call`,actor,i.id,'stuck');return;
    }
    if(preparedBoost&&this.s.balanceVersion===2)i.preparationConsumed=true;
    i.status=Math.min(3,i.status+1+preparedBoost);
    const to=i.status;
    c.moves++;c.queue.push({type:'move',item:i,actor,to,position:c.moves});
    await this.note(`${i.name} → ${status(i)}`,actor,i.id,'advance');
    if(done(i))c.queue.push({type:'done',item:i,actor});
  }
  async drain(c) {
    while(c.queue.length&&!c.halted) {
      const e=c.queue.shift(),i=e.item;
      if(e.type==='done'&&i.lane==='secondary') {
        const next=this.s.tomorrow.find(t=>t.id===i.targetId);if(next){next.prepared=Math.min(2,(next.prepared||0)+1);next.preparedStatus=Math.min(2,next.prepared);await this.note(`Prepared carry-over: ${next.name} starts at ${['Pending','Working on it','In review'][next.preparedStatus]}`,null,i.id);}
      }
      let payout=e.type==='done'?i.points:0,multiplier=1;
      for(const id of activeRules(this.s)) {
        const eligible= {
          bonus:e.type==='done',assign:e.type==='arrival'&&i.lane==='primary',alert:e.type==='stuck'&&(this.s.daily.alert||0)<2,
          galley:e.type==='move'&&i.dept==='Galley',room:e.type==='done'&&i.lane!=='secondary'&&i.dept==='Cabins',fast:e.type==='done'&&i.lane!=='secondary'&&i.tag==='Urgent',
          momentum:e.type==='move',vip:e.type==='done'&&i.lane!=='secondary'&&i.tag==='VIP',
          cross:e.type==='done'&&i.lane!=='secondary'&&i.dept==='Deck'&&this.s.items.some(t=>t.dept==='Galley'&&t.lane!=='secondary'&&!done(t)),
          touch:e.type==='move'&&e.to===2&&i.status===2&&!this.s.daily[`touch-${i.id}`],
          clear:e.type==='stuck'&&!this.s.daily.clear,
        }[id];
        if(!eligible||!await this.fire(c,id,i.id))continue;
        if(id==='bonus')payout+=5;
        if(id==='assign'){const before=i.status;await this.advance(c,i,id);this.s.daily.autoAssigned=(this.s.daily.autoAssigned||0)+i.status-before;}
        if(id==='alert'){this.s.actions++;this.s.daily.alert=(this.s.daily.alert||0)+1;}
        if(id==='galley')c.score+=3;
        if(id==='room')multiplier*=1.5;
        if(id==='fast')this.s.actions++;
        if(id==='momentum')c.score+=e.position||c.moves;
        if(id==='vip')multiplier*=2;
        if(id==='touch'){i.status=1;c.score+=10;await this.note(`${i.name} · let’s Touch Base again`,id,i.id,'rewind');}
        if(id==='touch')this.s.daily[`touch-${i.id}`]=true;
        if(id==='clear'){i.stuck=false;this.s.pendingStuck=null;this.s.daily.clear=true;i.status=1;c.queue.push({type:'move',item:i,actor:id,to:1,position:++c.moves});await this.note(`${i.name} · blocker cleared by Clear Blockers`,id,i.id,'clear');}
        if(id==='cross') {const pool=this.s.items.filter(t=>t.dept==='Galley'&&t.lane!=='secondary'&&!done(t));const selected=await this.choose('Crossover · choose Galley work to advance',pool);await this.advance(c,pool.find(t=>t.id===selected)||pool[0],id);}
      }
      for(const a of this.s.agents) {
        if(a.dept!==i.dept)continue;
        const key=`perk-${a.id}`;
        if(e.type==='stuck'&&a.id==='escalation'&&!this.s.daily[key]&&await this.fire(c,a.id,i.id)){this.s.daily[key]=true;this.s.actions++;}
        if(e.actor!==a.id)continue;
        if(e.type==='done'&&a.id==='coordinator'&&i.lane==='secondary'&&await this.fire(c,a.id,i.id))payout+=3;
        if(e.type==='done'&&a.id==='liaison'&&i.lane!=='secondary'&&i.tag==='VIP'&&await this.fire(c,a.id,i.id))payout+=10;
        if(e.type==='done'&&a.id==='quartermaster'&&i.lane==='recurring'&&!this.s.daily[key]&&await this.fire(c,a.id,i.id)){this.s.daily[key]=true;this.s.coins++;}
        if(e.type==='move'&&a.id==='signoff'&&i.lane==='primary'&&e.to===2&&i.status===2&&!this.s.daily[key]&&await this.fire(c,a.id,i.id)){this.s.daily[key]=true;await this.advance(c,i,a.id);}
      }
      c.score+=payout*multiplier;
    }
  }
  async settle(c) {const score=Math.round(c.score*(c.chain?2:1));this.s.dayScore+=score;this.s.totalScore+=score;if(score)await this.note(`+${score} score${c.chain?' · chain ×2':''}`,null,null,'score');}
  async startDay() {
    if(!['new','shop'].includes(this.s.phase))return false;
    this.s.day++;this.s.phase='playing';this.s.dayScore=0;this.s.daily={};this.s.actions=6+this.s.nextActions;this.s.nextActions=0;
    this.s.items=this.s.tomorrow.length?this.s.tomorrow:generate(this.s,this.s.day);
    this.s.items.forEach(i=>{i.status=i.preparedStatus||0;i.preparationConsumed=Boolean(i.preparedStatus);i.stuck=false;});
    this.s.playerTurns=0;this.s.briefingSkips=[];this.s.turn=null;
    this.s.events=this.s.tomorrowEvents?.length?this.s.tomorrowEvents:forecast(this.s,this.s.day,this.s.items);
    this.s.tomorrow=this.s.day<10?generate(this.s,this.s.day+1):[];
    this.s.tomorrowEvents=forecast(this.s,this.s.day+1,this.s.tomorrow);
    for(const next of this.s.tomorrow)this.s.items.push({id:`prep-${next.id}`,name:PREPS[next.dept],dept:next.dept,lane:'secondary',status:0,stuck:false,points:5,tag:'Preparation',dueDay:this.s.day,targetId:next.id,targetName:next.name});
    for(const dept of DEPTS.slice((this.s.day-1)%2,(this.s.day-1)%2+2))this.s.items.push({id:`repeat-${this.s.day}-${dept}`,name:RECURRING[dept],dept,lane:'recurring',status:0,stuck:false,points:15,tag:'Normal',dueDay:this.s.day});
    await this.note(`Day ${this.s.day} · ${BOSSES[this.s.day]?.rule||'Another beautiful day in operations.'}`,null,null,'day');
    const c=this.context();
    for(const i of this.s.items.filter(i=>i.lane==='primary'))c.queue.push({type:'arrival',item:i});
    await this.drain(c);
    for(const id of activeRules(this.s)) {
      if(id==='standup') {const pool=this.s.items.filter(i=>i.lane!=='secondary'&&!done(i));for(let n=0;n<2&&pool.length;n++){const i=pool.splice(Math.floor(random(this.s)*pool.length),1)[0];if(await this.fire(c,id,i.id)){await this.advance(c,i,id);await this.drain(c);}}}
    }
    await this.settle(c);return true;
  }
  async act(id) {
    if(this.busy||this.s.pendingStuck||this.s.phase!=='playing'||this.s.actions<1)return false;
    const i=this.s.items.find(i=>i.id===id);if(!i||done(i))return false;
    this.busy=true;
    try {this.s.actions--;const c=this.context();if(this.s.balanceVersion===2)this.s.turn={nextAgent:0,context:c};await this.advance(c,i);await this.drain(c);
      if(this.s.pendingStuck){if(this.s.balanceVersion!==2)await this.settle(c);return true;}
      if(this.s.balanceVersion===2){await this.continueTurn(c);return true;}
      for(const a of this.s.agents.slice(0,TIERS[this.s.tier].agents)){const target=agentTarget(this.s,a);if(target&&await this.fire(c,`agent-action-${a.id}`,target.id)){await this.advance(c,target,a.id);await this.drain(c);if(this.s.pendingStuck)break;}}
      await this.settle(c);if(this.s.actions===0&&!this.s.pendingStuck)await this.endDay();return true;
    } finally {this.busy=false;}
  }
  async continueTurn(c=this.context()) {
    const turn=this.s.turn;
    if(turn)while(turn.nextAgent<Math.min(this.s.agents.length,TIERS[this.s.tier].agents)) {
      const a=this.s.agents[turn.nextAgent++];
      const skip=this.s.briefingSkips.indexOf(a.id);
      if(skip>=0){this.s.briefingSkips.splice(skip,1);await this.note(`${AGENTS.find(x=>x.id===a.id).name} · attending ${a.dept} briefing, turn skipped`,a.id,null,'agent-skip');continue;}
      const target=agentTarget(this.s,a);
      if(target&&await this.fire(c,`agent-action-${a.id}`,target.id)){await this.advance(c,target,a.id);await this.drain(c);}
      if(this.s.pendingStuck)return;
    }
    await this.settle(c);
    if(turn){this.s.turn=null;this.s.playerTurns++;await this.resolveDisruptions();}
    if(this.s.actions===0&&!this.s.pendingStuck)await this.endDay();
  }
  async resolveDisruptions() {
    for(const event of this.s.events||[]) {
      if(event.resolved||event.afterTurn>this.s.playerTurns)continue;
      event.resolved=true;
      if(event.type==='allhands'){const cost=Math.min(1,this.s.actions);this.s.actions-=cost;await this.note(`Mandatory all-hands · −${cost} action`,event.id,null,'disruption');}
      if(event.type==='inspection'){
        await this.note('Health inspection · unfinished Galley work returns to Pending',event.id,null,'disruption');
        for(const item of this.s.items.filter(i=>i.dept==='Galley'&&!done(i)&&i.status>0)){item.status=0;await this.note(`${item.name} → Pending · health inspection`,event.id,item.id,'reset');}
      }
      if(event.type==='briefing'){this.s.briefingSkips.push(...this.s.agents.filter(a=>a.dept===event.dept).map(a=>a.id));await this.note(`${event.dept} briefing · assigned agents skip their next turn`,event.id,null,'disruption');}
    }
  }
  async resolveStuck(method) {
    const i=this.s.items.find(item=>item.id===this.s.pendingStuck);
    const cost=method==='coins'?3:2;
    if(this.busy||!i||!i.stuck||!['coins','actions'].includes(method)||(method==='coins'?this.s.coins<cost:this.s.actions<cost))return false;
    this.busy=true;
    try {
    if(method==='coins')this.s.coins-=cost;else this.s.actions-=cost;
    this.s.pendingStuck=null;i.stuck=false;i.status=3;
    const c=this.s.balanceVersion===2&&this.s.turn?.context?this.s.turn.context:this.context(),actor=this.s.balanceVersion===2?this.s.stuckActor||`resolve-${method}`:`resolve-${method}`;c.queue.push({type:'move',item:i,actor,to:3,position:++c.moves});c.queue.push({type:'done',item:i,actor});
    await this.note(`${i.name} unblocked · ${method==='coins'?'outside help was invoiced':'the team sacrificed two actions'}`,`resolve-${method}`,i.id,'resolve');
    await this.drain(c);
    if(this.s.balanceVersion===2){if(!this.s.pendingStuck)await this.continueTurn(c);else if(!this.s.turn)await this.settle(c);}else{await this.settle(c);if(this.s.actions===0)await this.endDay();}return true;
    } finally {this.busy=false;}
  }
  async endDay() {
    if(this.s.phase!=='playing'||this.s.pendingStuck||this.s.turn)return false;
    if(this.s.items.some(i=>i.lane==='primary'&&!done(i))){this.s.phase='lost';await this.note('Unfinished mandatory work. The captain requests an exit interview.');return true;}
    const reward=3+this.s.items.filter(i=>i.lane==='primary').length+Math.floor(this.s.dayScore/40);this.s.coins+=reward;
    await this.note(`Day survived · +${reward} coins`,null,null,'reward');
    if(this.s.day===6&&this.s.items.some(i=>i.boss&&done(i))){this.s.coins+=4;await this.note('Boss Task mastered · +4 upgrade credit',null,null,'reward');}
    const retained=[];for(const a of this.s.agents){if(this.s.coins>=1){this.s.coins--;retained.push(a);}else await this.note(`${AGENTS.find(x=>x.id===a.id).name} quit: unpaid upkeep.`);}this.s.agents=retained;
    if(this.s.day>=10){this.s.phase='won';await this.note('Cruise complete. Everyone survived the meeting.');return true;}
    if(activeRules(this.s).includes('overtime')&&this.s.coins>=2){this.s.coins-=2;this.s.nextActions=2;await this.note('Overtime booked · −2 coins, +2 actions tomorrow','overtime');}
    this.s.phase='shop';this.s.rerolls=0;this.rollOffers();return true;
  }
  rollOffers() {
    const pool=RULES.filter(r=>!this.s.automations.some(a=>a.id===r.id));this.s.offers=[];
    while(pool.length&&this.s.offers.length<3){const weights=pool.map(r=>r.rarity==='Common'?6:r.rarity==='Uncommon'?3:1+this.s.day*.2);let roll=random(this.s)*weights.reduce((a,b)=>a+b,0);let index=weights.length-1;for(let n=0;n<weights.length;n++){roll-=weights[n];if(roll<0){index=n;break;}}this.s.offers.push(pool.splice(index,1)[0].id);}
    if(this.s.balanceVersion===2&&!this.s.offers.some(id=>THROUGHPUT.includes(id))){const choices=THROUGHPUT.filter(id=>!this.s.automations.some(a=>a.id===id));if(choices.length)this.s.offers[Math.min(2,this.s.offers.length)]=choices[Math.floor(random(this.s)*choices.length)];}
  }
  upgrade() {if(this.s.phase!=='shop')return false;const next=this.s.tier==='basic'?'pro':this.s.tier==='pro'?'enterprise':null;if(!next||this.s.coins<TIERS[next].cost)return false;this.s.coins-=TIERS[next].cost;this.s.tier=next;return true;}
  buy(id) {const r=RULES.find(r=>r.id===id);if(this.s.phase!=='shop'||!r||!this.s.offers.includes(id)||this.s.coins<r.cost||this.s.automations.some(a=>a.id===id))return false;this.s.coins-=r.cost;this.s.automations.push({id,enabled:activeRules(this.s).length<TIERS[this.s.tier].automations});this.s.offers=this.s.offers.filter(x=>x!==id);return true;}
  hire(id,dept=DEPTS[0]){if(this.s.phase!=='shop'||!AGENTS.some(a=>a.id===id)||!DEPTS.includes(dept)||this.s.coins<5||this.s.agents.length>=TIERS[this.s.tier].agents||this.s.agents.some(a=>a.id===id))return false;this.s.coins-=5;this.s.agents.push({id,dept});return true;}
  assign(id,dept){if(this.s.phase!=='shop'||!DEPTS.includes(dept))return false;const a=this.s.agents.find(a=>a.id===id);if(!a)return false;a.dept=dept;return true;}
  toggle(id){if(this.s.phase!=='shop')return false;const a=this.s.automations.find(a=>a.id===id);if(!a||!a.enabled&&activeRules(this.s).length>=TIERS[this.s.tier].automations)return false;a.enabled=!a.enabled;return true;}
  reorder(id,direction){if(this.s.phase!=='shop')return false;const n=this.s.automations.findIndex(a=>a.id===id),to=n+direction;if(n<0||to<0||to>=this.s.automations.length)return false;[this.s.automations[n],this.s.automations[to]]=[this.s.automations[to],this.s.automations[n]];return true;}
  sell(id){if(this.s.phase!=='shop')return false;const i=this.s.automations.findIndex(a=>a.id===id);if(i<0)return false;this.s.coins+=Math.floor(RULES.find(r=>r.id===id).cost/2);this.s.automations.splice(i,1);return true;}
  reroll(){const cost=2+this.s.rerolls;if(this.s.phase!=='shop'||this.s.coins<cost)return false;this.s.coins-=cost;this.s.rerolls++;this.rollOffers();return true;}
}
