import {clearLine,navigation} from './world.js';
import {turnToward} from './animation.js';
const sequence={dragon:['dash','venom','pools'],carp:['wave','pools','dash'],sage:['fan','pools','wave','summon']};
const names={dash:'突进',venom:'毒息',pools:'落煞',wave:'妖力环潮',fan:'幽焰扇击',summon:'唤魂'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function travel(g,e,target,dt){
 const d=distance(e,target);if(d<8){e.moving=false;return;}
 e.routeTime=(e.routeTime||0)-dt;
 if(e.routeTime<=0||!e.navPoint||distance(e,e.navPoint)<4){e.navPoint=navigation(g.regionIndex,e.r).waypoint(e,target);e.routeTime=.24;}
 const dx=e.navPoint.x-e.x,dy=e.navPoint.y-e.y,n=Math.hypot(dx,dy),step=Math.min(n,e.speed*(e.slow>0?.76:1)*dt),x=e.x,y=e.y;
 if(n)g.move(e,dx/n*step,dy/n*step);e.moving=Math.hypot(e.x-x,e.y-y)>.01;
}
export function stepBoss(g,e,dt){
 const p=g.player,start={x:e.x,y:e.y},d=distance(e,p),dx=(p.x-e.x)/(d||1),dy=(p.y-e.y)/(d||1);
 e.bossPhase??='stalk';e.phaseTimer=Math.max(0,(e.phaseTimer||0)-dt);
 if(e.bossPhase==='dash'){
  const x=e.x,y=e.y;g.move(e,e.dx*e.dashSpeed*dt,e.dy*e.dashSpeed*dt);e.moving=true;e.charge=e.phaseTimer;
  if(e.phaseTimer<=0||Math.hypot(e.x-x,e.y-y)<e.dashSpeed*dt*.2){e.bossPhase='recover';e.phaseTimer=.8;e.charge=0;e.moving=false;}
  return;
 }
 if(e.bossPhase==='windup'){
  e.windup=e.phaseTimer;e.action=.15;e.moving=false;
  if(e.phaseTimer<=0){e.windup=0;strikeBoss(g,e);if(e.attackKind==='dash'){e.bossPhase='dash';e.phaseTimer=e.hp<e.maxHp*.4?.9:.75;e.dashSpeed=e.kind==='dragon'?320:270;e.charge=e.phaseTimer;}else{e.bossPhase='recover';e.phaseTimer=.75;}}
  return;
 }
 if(e.bossPhase==='recover'){e.moving=false;if(e.phaseTimer<=0){e.bossPhase='stalk';e.attack=e.hp<e.maxHp*.4?1.15:1.75;}return;}
 turnToward(e,dx,dt);e.dx=dx;e.dy=dy;
 const range=e.kind==='sage'?220:e.kind==='carp'?155:135;
 if(d>range+20||!clearLine(g.regionIndex,e,p,0,true))travel(g,e,p,dt);else e.moving=false;
 if(e.attack<=0&&d<620&&p.hidden<=0){
  const list=sequence[e.kind],kind=list[e.attackCount%list.length];
  if(!['pools','summon'].includes(kind)&&!clearLine(g.regionIndex,e,p,kind==='dash'?e.r:0,kind!=='dash')){e.attack=.35;return;}
  e.attackKind=kind;e.attackLabel=names[kind];e.bossPhase='windup';e.phaseTimer=kind==='dash'?1:.85;e.windup=e.phaseTimer;e.telegraphLength=kind==='dash'?300:190;
  e.aim={x:p.x+(p.moving?p.dx*44:0),y:p.y+(p.moving?p.dy*44:0)};const n=distance(e,e.aim)||1;e.dx=(e.aim.x-e.x)/n;e.dy=(e.aim.y-e.y)/n;e.facing=e.dx<0?-1:1;e.turnHold=.3;
 }
 e.moving=Math.hypot(e.x-start.x,e.y-start.y)>.01;
}
export function strikeBoss(g,e){
 const p=g.player,furious=e.hp<e.maxHp*.4,list=sequence[e.kind],kind=e.attackKind||list[e.attackCount%list.length],aim=e.aim||{x:p.x,y:p.y};e.attackCount++;
 if(kind==='dash')return;
 if(kind==='pools'){
  const spots=[aim,{x:aim.x-p.dy*95,y:aim.y+p.dx*95},{x:aim.x+p.dy*95,y:aim.y-p.dx*95}];
  if(furious)spots.push({x:aim.x+p.dx*125,y:aim.y+p.dy*125});
  for(const q of spots)g.hazards.push({id:g.id(),...q,r:e.kind==='sage'?48:42,timer:1.2,age:0,damage:e.damage*.85,activeFor:2.8,kind:e.kind==='dragon'?'venom':'rift'});
 }else if(kind==='venom'||kind==='fan'){
  const a=Math.atan2(aim.y-e.y,aim.x-e.x),n=furious?9:7;
  for(let i=0;i<n;i++){const b=a+(i-(n-1)/2)*.19;g.shoot('enemy',e.x,e.y-18,Math.cos(b),Math.sin(b),e.damage*.75,{owner:'enemy',speed:175,life:5,r:7});}
 }else if(kind==='wave'){
  const n=furious?18:12,offset=e.age*.13;for(let i=0;i<n;i++){const a=i*Math.PI*2/n+offset;g.shoot('enemy',e.x,e.y-20,Math.cos(a),Math.sin(a),e.damage*.7,{owner:'enemy',speed:135,life:6,r:7});}
 }else if(kind==='summon'){for(let i=0;i<4;i++)g.spawn('ghost',e.x+(i-1.5)*55,e.y+85);}
}
