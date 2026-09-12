import {clearLine,navigation,safePosition} from './world.js';
import {turnToward} from './animation.js';
import {dist,TAU} from './math.js';
import {addHazard} from './hazards.js';

export const BOSS_MOVES={
 dash:{name:'裂地突进',hint:'横向闪避，落点后有收招空隙',wind:1.05},
 venom:{name:'墨毒吐息',hint:'离开扇面，别沿毒息后退',wind:1.1},
 pools:{name:'落煞封路',hint:'离开脚下红圈，保留闪避',wind:.8},
 tail:{name:'盘蛟扫尾',hint:'贴近内圈或退到外圈',wind:.8},
 wave:{name:'潮汐珠轮',hint:'从珠轮空隙穿过',wind:.9},
 tide:{name:'裂海三叠',hint:'连续三条水线，横移找空隙',wind:.8},
 pearl:{name:'海珠护体',hint:'击碎海珠削减定力，趁破招集火',wind:1.2},
 fan:{name:'骨剑追魂',hint:'横移避开锁定的三轮骨剑',wind:1.05},
 banner:{name:'玄阴摄魂幡',hint:'靠近击碎幡，截断其后的魂弹',wind:1.3},
 mirror:{name:'护魂骨镜',hint:'击碎骨镜解除护体，主动祭器可破招',wind:1.2},
 blink:{name:'鬼影换形',hint:'留意落点红圈，真身携带金色光环',wind:1.2},
 chain:{name:'索命骨链',hint:'离开细长锁链范围，横向闪避',wind:.8},
 frost:{name:'乾蓝幽焰',hint:'冰焰逐次落下，别绕回旧落点',wind:.8},
 reaper:{name:'冥河环煞',hint:'进入内圈或闪过环带',wind:.8},
 eclipse:{name:'幡镜合煞',hint:'先避骨链，再进环内，之后长破绽',wind:1.4}
};
const decks={
 dragon:[['dash','venom','pools','tail'],['dash','tail','venom','pools']],
 carp:[['wave','tide','dash','pearl'],['pearl','tide','wave','dash','pools']],
 sage:[['fan','mirror','chain','banner'],['blink','frost','banner','reaper','fan'],['eclipse','blink','mirror','frost','chain','banner','reaper']]
};
export const stageName=e=>e.kind==='sage'?['玄阴御器','夺舍幻形','幡镜合煞'][(e.stage||1)-1]:(e.stage||1)===1?'试探':'狂怒';
function travel(g,e,target,dt){
 const d=dist(e,target);if(d<8){e.moving=false;return;}
 e.routeTime=(e.routeTime||0)-dt;
 if(e.routeTime<=0||!e.navPoint||dist(e,e.navPoint)<4){e.navPoint=navigation(g.regionIndex,e.r).waypoint(e,target);e.routeTime=.24;}
 const dx=e.navPoint.x-e.x,dy=e.navPoint.y-e.y,n=Math.hypot(dx,dy),step=Math.min(n,e.speed*(e.slow>0?.76:1)*dt),x=e.x,y=e.y;
 if(n)g.move(e,dx/n*step,dy/n*step);e.moving=Math.hypot(e.x-x,e.y-y)>.01;
}
function recover(e,time=1.3){e.bossPhase='recover';e.phaseTimer=time;e.windup=0;e.charge=0;e.moving=false;}
export function staggerBoss(g,e,power){
 if(!e.boss||e.hp<=0||e.breakLock>0||e.bossPhase==='transition')return false;
 e.poise=Math.min(e.maxPoise||120,(e.poise||0)+power);
 if(e.poise<(e.maxPoise||120))return false;
 e.poise=0;e.breakLock=7;recover(e,2.6);e.attackLabel='破招 · 定力溃散';
 g.hazards=g.hazards.filter(h=>h.ownerId!==e.id||h.timer<=0);g.projectiles=g.projectiles.filter(b=>b.ownerId!==e.id||!(b.delay>0));
 g.notify(`${e.name}被破招 · 集火！`);g.emit('blast',{x:e.x,y:e.y,r:80,color:0xffd98a});return true;
}
function chooseMove(g,e,d){
 const list=decks[e.kind][(e.stage||1)-1],used=e.moveUses||{};
 // React only before the tell begins; a committed aim never follows input.
 const scored=list.map((kind,index)=>({kind,score:(used[kind]||0)*10+(kind===e.lastMove?30:0)+index*.08+(kind==='dash'?(d<120?8:-2):0)+(kind==='blink'?(d<135?-4:0):0)}));
 return scored.sort((a,b)=>a.score-b.score)[0].kind;
}
function beginMove(g,e,kind){
 const p=g.player,m=BOSS_MOVES[kind];e.attackKind=kind;e.attackLabel=m.name;e.counterHint=m.hint;
 e.bossPhase='windup';e.phaseTimer=m.wind;e.windup=m.wind;e.windTotal=m.wind;e.moving=false;e.action=.2;
 const target=g.decoy&&dist(g.decoy,e)<450?g.decoy:p;
 e.aim={x:target.x+(target.moving?target.dx*35:0),y:target.y+(target.moving?target.dy*35:0)};
 const n=dist(e,e.aim)||1;e.dx=(e.aim.x-e.x)/n;e.dy=(e.aim.y-e.y)/n;e.facing=e.dx<0?-1:1;e.turnHold=.3;
 e.telegraphLength=kind==='dash'?260:kind==='chain'?460:190;
 if(kind==='blink')e.blinkTo=safePosition(g.regionIndex,p.x-e.dy*160,p.y+e.dx*160,e.r);
}
export function stepBoss(g,e,dt){
 const p=g.player,d=dist(e,p);e.stage??=1;e.maxPoise??=e.kind==='sage'?150:120;e.poise??=0;e.moveUses??={};
 e.breakLock=Math.max(0,(e.breakLock||0)-dt);e.poise=Math.max(0,e.poise-dt*1.5);
 e.phaseTimer=Math.max(0,(e.phaseTimer||0)-dt);e.bossPhase??='stalk';
 const next=e.kind==='sage'?(e.hp/e.maxHp<.32?3:e.hp/e.maxHp<.68?2:1):(e.hp/e.maxHp<.5?2:1);
 if(next>e.stage&&e.bossPhase!=='transition'){
  e.stage++;e.bossPhase='transition';e.phaseTimer=1.7;e.windup=0;e.charge=0;e.attackLabel=stageName(e);e.counterHint='换式蓄势 · 可以恢复灵力并调整主祭法宝';
  e.moveUses={};g.emit('evolution',{text:`${e.name} · ${stageName(e)}`});return;
 }
 if(e.bossPhase==='transition'){e.moving=false;if(e.phaseTimer<=0){e.bossPhase='stalk';e.attack=0;}return;}
 if(e.bossPhase==='dash'){
  const x=e.x,y=e.y;g.move(e,e.dx*e.dashSpeed*dt,e.dy*e.dashSpeed*dt);e.moving=true;e.charge=e.phaseTimer;
  if(e.phaseTimer<=0||dist(e,{x,y})<e.dashSpeed*dt*.2){
   if(e.stage>1&&e.kind==='dragon')addHazard(g,e,'circle',{r:138,inner:62,timer:.8,activeFor:.4,damage:e.damage*.8});
   recover(e,1.6);
  }return;
 }
 if(e.bossPhase==='windup'){
  e.windup=e.phaseTimer;e.action=.15;e.moving=false;
  if(e.phaseTimer<=0){e.windup=0;strikeBoss(g,e);if(e.attackKind==='dash'){e.bossPhase='dash';e.phaseTimer=.8;e.dashSpeed=e.kind==='dragon'?330:290;e.charge=e.phaseTimer;}else recover(e,e.attackKind==='eclipse'?2.2:e.attackKind==='blink'?.65:e.kind==='sage'?.75:1.2);}
  return;
 }
 if(e.bossPhase==='recover'){e.moving=false;if(e.phaseTimer<=0){e.bossPhase='stalk';e.attack=e.stage>=3?.45:e.stage===2?.65:1.0;}return;}
 const dx=(p.x-e.x)/(d||1),dy=(p.y-e.y)/(d||1);turnToward(e,dx,dt);e.dx=dx;e.dy=dy;
 const range=e.kind==='sage'?230:e.kind==='carp'?170:135;
 if(d>range+25||!clearLine(g.regionIndex,e,p,0,true))travel(g,e,p,dt);
 else if(e.kind==='sage'&&d<135)travel(g,e,safePosition(g.regionIndex,e.x-dx*100,e.y-dy*100,e.r),dt);
 else e.moving=false;
 if(e.attack<=0&&d<600&&p.hidden<=0){
  const kind=chooseMove(g,e,d);
  if(['dash','fan','venom','chain'].includes(kind)&&!clearLine(g.regionIndex,e,p,kind==='dash'?e.r:0,kind!=='dash')){e.attack=.3;return;}
  beginMove(g,e,kind);
 }
}
function volley(g,e,aim,count,spread,speed,delay=0){
 const a=Math.atan2(aim.y-e.y,aim.x-e.x);
 for(let i=0;i<count;i++){const b=a+(i-(count-1)/2)*spread;g.shoot('enemy',e.x,e.y,Math.cos(b),Math.sin(b),e.damage*.65,{owner:'enemy',ownerId:e.id,speed,life:4.5,r:6,delay});}
}
function summonRelic(g,e,kind,count=1){
 for(const old of g.enemies)if(old.ownerId===e.id&&old.kind===kind)old.hp=0;
 for(let i=0;i<count;i++){
  const a=Math.atan2(g.player.y-e.y,g.player.x-e.x)+(i?-.85:.85),at=safePosition(g.regionIndex,e.x+Math.cos(a)*130,e.y+Math.sin(a)*130,16),q=g.spawn(kind,at.x,at.y);
  q.ownerId=e.id;q.life=kind==='phantom'?7:17;q.attack=1.8;q.hp=q.maxHp=kind==='phantom'?100:240+(e.stage||1)*80;q.damage=e.damage*.36;
 }
}
export function strikeBoss(g,e){
 const kind=e.attackKind||'fan',aim=e.aim||g.player,stage=e.stage||1;e.attackCount++;e.lastMove=kind;e.moveUses??={};e.moveUses[kind]=(e.moveUses[kind]||0)+1;
 if(kind==='dash')return;
 if(kind==='pools'||kind==='frost'){
  const n=kind==='frost'?5:3,side={x:-e.dy,y:e.dx};
  for(let i=0;i<n;i++){const offset=(i-(n-1)/2)*85;addHazard(g,e,'circle',{x:aim.x+side.x*offset,y:aim.y+side.y*offset,r:kind==='frost'?45:42,timer:1.2+i*.18,activeFor:kind==='frost'?3.2:2.8,kind:e.kind==='dragon'?'venom':kind==='frost'?'frost':'rift'});}
 }else if(kind==='venom')volley(g,e,aim,stage===1?7:9,.18,180);
 else if(kind==='fan'){
  for(let j=0;j<3;j++)volley(g,e,aim,3+(stage===3?2:0),.19,195+j*15,j*.28);
 }else if(kind==='wave'){
  const n=16,a=Math.atan2(aim.y-e.y,aim.x-e.x),gap=(e.attackCount*3)%n;
  for(let i=0;i<n;i++)if(i!==gap&&i!==(gap+1)%n){const b=i*TAU/n+a;g.shoot('enemy',e.x,e.y,Math.cos(b),Math.sin(b),e.damage*.6,{owner:'enemy',ownerId:e.id,speed:140,life:5,r:6});}
 }else if(kind==='tail'||kind==='reaper')addHazard(g,e,'circle',{x:kind==='tail'?e.x:aim.x,y:kind==='tail'?e.y:aim.y,r:kind==='tail'?165:190,inner:kind==='tail'?68:105,timer:1.1,activeFor:.6});
 else if(kind==='chain'||kind==='tide'||kind==='eclipse'){
  for(let i=0;i<(kind==='tide'?3:kind==='eclipse'?2:1);i++){
   const b=Math.atan2(aim.y-e.y,aim.x-e.x)+(kind==='tide'?(i-1)*.25:i*.42),length=480;
   addHazard(g,e,'line',{ex:e.x+Math.cos(b)*length,ey:e.y+Math.sin(b)*length,r:kind==='tide'?23:18,timer:1+i*.4,activeFor:.3});
  }
  if(kind==='eclipse')addHazard(g,e,'circle',{x:aim.x,y:aim.y,r:185,inner:96,timer:2.15,activeFor:.55});
 }else if(kind==='banner'||kind==='summon')summonRelic(g,e,'soulbanner',stage===3?2:1);
 else if(kind==='mirror')summonRelic(g,e,'boneshield');
 else if(kind==='pearl')summonRelic(g,e,'seapearl',2);
 else if(kind==='blink'){
  addHazard(g,e,'circle',{r:70,timer:1,activeFor:.3});summonRelic(g,e,'phantom',2);
  const to=e.blinkTo||safePosition(g.regionIndex,aim.x+150,aim.y,e.r);e.x=to.x;e.y=to.y;e.routeTime=0;
  addHazard(g,e,'circle',{r:118,inner:50,timer:1.1,activeFor:.4});g.emit('illusion',{x:e.x,y:e.y});
 }
}
export function stepBossRelic(g,e,dt){
 const owner=g.enemies.find(q=>q.id===e.ownerId&&q.hp>0);
 e.life-=dt;if(!owner||e.life<=0){e.hp=0;return;}e.moving=false;
 if(e.kind==='boneshield')return;
 if(e.attack<=0){
  if(!e.aim){e.aim={x:g.player.x,y:g.player.y};e.windup=.9;e.attack=.9;}
  else{volley(g,e,e.aim,e.kind==='soulbanner'?3:1,.24,145);e.aim=null;e.windup=0;e.attack=3.3;}
 }else if(e.aim)e.windup=e.attack;
}
export function breakRelic(g,e){
 const owner=g.enemies.find(q=>q.id===e.ownerId&&q.hp>0);
 g.projectiles=g.projectiles.filter(q=>q.ownerId!==e.id);g.hazards=g.hazards.filter(q=>q.ownerId!==e.id);
 if(owner){owner.exposed=Math.max(owner.exposed||0,4);staggerBoss(g,owner,70);g.notify(`${e.name}已碎 · 护体受损`);}
}
