import {CHARACTERS,REGIONS,WEAPONS,PASSIVES,CONSUMABLES,ENEMIES,SWORD_COUNTS,VERSION} from './catalog.js';
import {clamp,dist,angle,TAU,SpatialHash,inTriangle,pointSegment} from './math.js';
import {WORLDS,walkable,clearLine,moveOnTerrain,navigation,safePosition,CHUNK_SIZE,chunkAt,offscreenPosition,worldChunk} from './world.js';
import {encounter} from './waves.js';
import {turnToward} from './animation.js';
import {stepBoss,strikeBoss,staggerBoss,stepBossRelic,breakRelic} from './bosses.js';
import {castRelic,toggleStance,cycleRelic} from './relics.js';
import {hazardContains} from './hazards.js';
import {updateWeapons,updateSwords,updateProjectiles,updateZones,castCharacterSkill,useConsumable} from './combat.js';

export class BattleCore{
 constructor({seed=Date.now(),character='hanli',meta={}}={}){
  this.seed=seed>>>0;this.character=CHARACTERS[character]?character:'hanli';this.meta={cleared:0,hpRank:0,pickupRank:0,...meta};this.hash=new SpatialHash();this.reset();
 }
 random(){this.rng=(this.rng+0x6D2B79F5)|0;let t=this.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 reset(){
  const c=CHARACTERS[this.character],maxHp=c.hp*(1+clamp(this.meta.hpRank,0,2)*.05);
  this.rng=this.seed;this.nextId=1;this.mode='title';this.time=0;this.regionIndex=0;this.regionTime=0;this.kills=0;this.score=0;this.bossSpawned=false;this.bossDead=false;this.spawnTimer=1;this.encounterId=null;this.warnId=null;this.lastElitePhase=null;this.upgrades=[];this.events=[];this.enemies=[];this.projectiles=[];this.zones=[];this.swords=[];this.pickups=[];this.hazards=[];this.flags=[];this.array=null;this.pois=[];this.decoy=null;this.weaponClocks={};this.rewardClaimed=false;this.claimId=`${this.seed}-${this.character}-${Date.now()}`;this.discoveries=[];this.currentEvent=null;this.poiRecords={};this.poiChunk='';this.bossHome=null;this.visibleBounds={halfWidth:505,halfHeight:330};
  this.player={x:0,y:110,r:11,hp:maxHp,maxHp,mana:100,maxMana:100,speed:c.speed,level:1,xp:0,xpNext:12,spirit:30,materials:{bamboo:0,gold:0},greenLiquid:this.character==='hanli'?2:0,weapons:{[c.starter]:1},passives:{},consumables:{shield:2,hide:1,burrow:1,thunder:1,ice:1,brick:0},quick:['shield','thunder'],quickIndex:0,dx:0,dy:1,moving:false,dash:0,dashTime:0,invuln:0,skill:0,castTime:0,hurtTime:0,shield:0,hidden:0,focus:0,swordCrafted:false,swordAwakened:false,arrayRecipe:false,arrayType:'five',attackClock:.7,guardClock:0};
  Object.assign(this.player,{stance:'guard',relic:c.starter,relicCooldown:0,relicTotal:12,parryClock:0});
  this.createRegion();this.syncSwords();
 }
 get region(){return REGIONS[this.regionIndex];}
 get world(){return WORLDS[this.regionIndex];}
 move(body,dx,dy){moveOnTerrain(this.regionIndex,body,dx,dy);}
 get swordCount(){return this.player.weapons.sword?SWORD_COUNTS[this.player.weapons.sword-1]:0;}
 get realm(){return this.regionIndex===2&&this.player.level>=25?'元婴':this.regionIndex>=1&&this.player.level>=15?'结丹':this.player.level>=7?'筑基':'炼气';}
 get damageScale(){return 1+(this.player.level-1)*.025;}
 get haste(){return 1+(this.player.passives.dayan||0)*.075;}
 get controlScale(){return 1+(this.player.passives.xuanyin||0)*.15;}
 id(){return this.nextId++;}
 emit(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>400)this.events.splice(0,this.events.length-400);}
 drainEvents(){return this.events.splice(0);}
 start(){this.reset();this.mode='playing';this.emit('region',{name:this.world.title});}
 pause(){if(this.mode==='playing')this.mode='paused';else if(this.mode==='paused')this.mode='playing';}
 notify(text){this.emit('notice',{text});}
 syncSwords(){
  const n=this.swordCount;while(this.swords.length<n){const i=this.swords.length;this.swords.push({id:this.id(),index:i,x:this.player.x,y:this.player.y,mode:'orbit',a:0,target:0,life:0,cooldown:.15*i});}
  if(this.swords.length>n)this.swords.length=n;
  const reserve=this.array?.kind==='sword'?Math.ceil(n/3):0;
  for(let i=0;i<n;i++){const s=this.swords[i];if(i<reserve)s.mode='array';else if(s.mode==='array')s.mode='return';}
 }
 createRegion(){
  this.player.x=this.world.spawn.x;this.player.y=this.world.spawn.y;this.poiRecords={};this.poiChunk='';this.bossHome={...this.world.boss};this.streamPOIs();
 }
 streamPOIs(force=false){
  const c=chunkAt(this.player.x,this.player.y),key=`${c.x}:${c.y}`;if(!force&&key===this.poiChunk)return;this.poiChunk=key;
  const nearby=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const cx=c.x+dx,cy=c.y+dy,chunk=worldChunk(this.regionIndex,cx,cy);
   for(let i=0;i<chunk.pois.length;i++){
    const q=chunk.pois[i],id=`${cx}:${cy}:${i}`;
    if(!this.poiRecords[id]){const at=safePosition(this.regionIndex,q.x+cx*CHUNK_SIZE,q.y+cy*CHUNK_SIZE,20);this.poiRecords[id]={...q,...at,id:this.id(),recordKey:id,state:'ready',hp:100,remaining:30};}
    nearby.push(this.poiRecords[id]);
   }
  }
  if(this.bossDead){
   if(!this.poiRecords.exit){const at=safePosition(this.regionIndex,this.bossHome.x,this.bossHome.y,24);this.poiRecords.exit={kind:'portal',name:this.regionIndex===2?'归途界门':'跨境界门',...at,id:this.id(),recordKey:'exit',state:'ready'};}
   const gate=this.poiRecords.exit;gate.state='ready';nearby.push(gate);
  }
  // Keep ongoing defended events active even when the camera enters a new chunk.
  for(const poi of this.pois)if(['growing','fighting'].includes(poi.state)&&!nearby.some(q=>q.id===poi.id))nearby.push(poi);
  this.pois=nearby.sort((a,b)=>dist(a,this.player)-dist(b,this.player));
 }
 spawn(kind,x,y,elite=false,poiId=0,profile=null){
  if(!ENEMIES[kind])return null;
  if(x===undefined){const at=offscreenPosition(this.regionIndex,this.player,{r:ENEMIES[kind].r,angle:this.random()*TAU,...this.visibleBounds});if(!at)return null;x=at.x;y=at.y;}
  const c=ENEMIES[kind],pos=safePosition(this.regionIndex,x,y,c.r*(elite?1.25:1)),scale=c.boss?1:profile?.hpScale??1;
  const e={...c,id:this.id(),kind,x:pos.x,y:pos.y,hp:c.hp*scale*(elite?3.6:1),maxHp:c.hp*scale*(elite?3.6:1),speed:c.speed*(elite?1.06:1)*(profile?.speedScale??1),elite,poiId,age:0,hit:0,attack:1+this.random()*2,windup:0,charge:0,dx:0,dy:1,slow:0,freeze:0,burn:0,burnDamage:0,burnTick:0,guardHit:0,attackCount:0,action:0,exposed:0,reactionLock:0};
  if(elite)e.r*=1.25;this.enemies.push(e);if(c.boss)this.emit('boss',{name:c.name});return e;
 }
 nearest(x,y,range=400){let target=null,dmin=range*range;for(const e of this.hash.query(x,y,range)){if(e.hp<=0)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<dmin&&clearLine(this.regionIndex,{x,y},e,0,true)){dmin=d;target=e;}}return target;}
 damage(e,amount,kind='hit'){
  if(e.hp<=0)return;
  const hot=['fire','firefield','ring'].includes(kind),cold=['ice','frost'].includes(kind);
  if((hot&&e.freeze>0||cold&&e.burn>0)&&!(e.reactionLock>0)){
   e.reactionLock=1.2;amount*=1.7;e.freeze=0;e.burn=0;
   if(e.boss)staggerBoss(this,e,28);this.emit('blast',{x:e.x,y:e.y,r:50,color:0xc4e9f0});
   if(e.boss)this.notify('寒热爆裂 · 削减定力');
  }
  if(e.guard){const shield=this.enemies.some(q=>q.ownerId===e.id&&['boneshield','seapearl'].includes(q.kind)&&q.hp>0);amount*=e.bossPhase==='recover'?1.3:e.exposed>0?.8:shield?.28:e.guard;}
  else if(e.exposed>0)amount*=1.2;
  if(e.artifact&&['relic','bladeburst','brick','lightning'].includes(kind))amount*=1.6;
  e.hp-=amount;e.hit=.12;this.emit('hit',{x:e.x,y:e.y-15,amount,kind});
  if(e.hp>0)return;
  if(e.artifact){breakRelic(this,e);this.emit('kill',{x:e.x,y:e.y});return;}
  this.kills++;this.score+=e.boss?1000:e.elite?120:10;this.emit('kill',{x:e.x,y:e.y,boss:e.boss,elite:e.elite});
  if(e.boss){for(const q of this.enemies)if(q.ownerId===e.id)q.hp=0;this.hazards=[];this.projectiles=this.projectiles.filter(q=>q.owner!=='enemy');this.bossDead=true;this.bossHome={x:e.x,y:e.y};this.streamPOIs(true);this.player.materials[this.region.material]++;this.player.spirit+=70;this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);this.player.xp+=e.xp;this.notify(`${e.name}已败 · ${this.region.material==='bamboo'?'金雷竹':'庚精'} +1`);}
  else{
   this.pickups.push({id:this.id(),x:e.x,y:e.y,value:e.xp*(e.elite?8:1),kind:e.elite?'vacuum':this.random()<.025?'heal':'xp',age:0});
   if(this.random()<.38||e.elite)this.player.spirit+=e.elite?25:1;
   if(e.elite){const mat=this.region.material;this.player.materials[mat]++;if(e.poiId){const poi=this.pois.find(p=>p.id===e.poiId);if(poi)poi.state='done';}this.notify(`${mat==='bamboo'?'金雷竹':'庚精'} +1`);}
   if(this.player.passives.xuanyin)this.player.hp=Math.min(this.player.maxHp,this.player.hp+.018*this.player.passives.xuanyin);
  }
 }
 hurt(amount){
  const p=this.player;if(this.mode!=='playing'||p.invuln>0)return false;amount*=1-(p.passives.mingwang||0)*.035;
  const absorbed=Math.min(p.shield,amount);p.shield-=absorbed;amount-=absorbed;p.hp=Math.max(0,p.hp-amount);p.invuln=.65;p.hurtTime=.22;this.emit('hurt',{x:p.x,y:p.y,amount});
  if(p.hp<=0){this.mode='lost';this.emit('lost');}return true;
 }
 shoot(kind,x,y,dx,dy,damage,extra={}){if(this.projectiles.length>=1200)return;this.projectiles.push({id:this.id(),kind,x,y,dx,dy,damage,speed:210,life:2,age:0,r:6,owner:'player',hits:[],pierce:1,...extra});}
 zone(kind,x,y,r,damage,duration,extra={}){this.zones.push({id:this.id(),kind,x,y,r,damage,duration,age:0,pulse:0,interval:.65,...extra});}
 gainLevels(){
  const p=this.player;if(this.mode!=='playing'||p.xp<p.xpNext)return;
  p.xp-=p.xpNext;p.level++;p.xpNext=Math.floor(12+p.level*5+p.level**1.22);p.hp=Math.min(p.maxHp,p.hp+2);this.openUpgrades();
 }
 openUpgrades(){
  const p=this.player,choices=[];
  for(const [id,w] of Object.entries(WEAPONS)){
   const swordCap=p.swordAwakened?8:this.realm==='炼气'?3:this.realm==='筑基'?5:7;
   const rank=p.weapons[id]||0,max=id==='sword'?swordCap:w.max;
   if(rank<max&&(rank||Object.keys(p.weapons).length<4))choices.push({type:'weapon',id,rank:rank+1,owned:rank>0});
  }
  for(const [id,w] of Object.entries(PASSIVES)){const rank=p.passives[id]||0;if(rank<w.max&&(rank||Object.keys(p.passives).length<4))choices.push({type:'passive',id,rank:rank+1,owned:rank>0});}
  for(let i=choices.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  const selected=[];const existing=choices.find(c=>c.owned);if(existing)selected.push(existing);
  for(const c of choices)if(selected.length<3&&!selected.includes(c))selected.push(c);
  while(selected.length<3)selected.push({type:'supply',id:selected.length%2?'spirit':'heal',rank:1});
  this.upgrades=selected;this.mode='upgrade';this.emit('upgrade');
 }
 chooseUpgrade(index){
  if(this.mode!=='upgrade'||!Number.isInteger(index)||index<0||index>=this.upgrades.length)return false;
  const c=this.upgrades[index],p=this.player;
  if(c.type==='weapon'){p.weapons[c.id]=c.rank;this.discoveries.push(c.id);this.syncSwords();this.notify(`${WEAPONS[c.id].name} · ${c.id==='sword'?this.swordCount+'口':c.rank+'重'}`);}
  else if(c.type==='passive'){p.passives[c.id]=c.rank;if(c.id==='mingwang'){p.maxHp+=9;p.hp=Math.min(p.maxHp,p.hp+20);}if(c.id==='chongyuan'){p.maxMana+=15;p.mana=Math.min(p.maxMana,p.mana+25);}this.discoveries.push(c.id);}
  else if(c.id==='heal')p.hp=Math.min(p.maxHp,p.hp+30);else p.spirit+=35;
  this.upgrades=[];this.mode='playing';this.gainLevels();return true;
 }
 placeFlag(){
  if(this.mode!=='playing')return false;
  if(this.array){this.notify('长按布阵键，收回现有阵法');return false;}
  const p=this.player;if(p.spirit<15){this.notify('布阵需要15灵石');return false;}
  if(this.flags.some(f=>dist(f,p)<48)){this.notify('阵旗相距至少48步，沿三角形走位布阵');return false;}
  if(this.flags.some(f=>dist(f,p)>320)){this.notify('离阵旗太远，长按布阵键可回收');return false;}
  if(this.flags.length===2){const [a,b]=this.flags,area=Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/2;if(area<3000){this.notify('三面旗需要围成足够大的三角阵');return false;}}
  this.flags.push({x:p.x,y:p.y});this.emit('flag',{x:p.x,y:p.y});
  if(this.flags.length===3){p.spirit-=15;const kind=p.arrayType==='sword'&&p.arrayRecipe&&this.swordCount>=36?'sword':'five';this.array={kind,flags:this.flags.map(f=>({...f})),age:0,pulse:0,duration:35};this.syncSwords();this.notify(kind==='sword'?`${Math.ceil(this.swordCount/3)}口飞剑离身镇阵`:'颠倒五行阵已成 · 困敌35息');}
  return true;
 }
 recallArray(){const had=this.flags.length>0;this.flags=[];this.array=null;this.syncSwords();if(had)this.notify('阵旗已收回，飞剑归队');return had;}
 updateArray(dt){
  if(!this.array)return;const a=this.array;a.age+=dt;a.pulse-=dt;
  for(const e of this.enemies)if(e.hp>0&&inTriangle(e,...a.flags))e.slow=Math.max(e.slow,.25);
  if(a.pulse<=0){a.pulse=.7;if(a.kind==='five')for(const e of this.enemies)if(e.hp>0&&inTriangle(e,...a.flags))this.damage(e,9*this.damageScale);}
  if(a.age>=a.duration)this.recallArray();
 }
 nearestPOI(){return this.pois.filter(p=>!['done','failed','growing','fighting','locked'].includes(p.state)).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];}
 interact(){const poi=this.nearestPOI();if(this.mode!=='playing'||!poi||dist(poi,this.player)>72)return false;this.currentEvent=poi.id;this.mode='event';return true;}
 eventOptions(){
  const p=this.player,poi=this.pois.find(q=>q.id===this.currentEvent);if(!poi)return [];
  if(poi.kind==='herb')return[{id:'grow',name:this.character==='hanli'&&p.greenLiquid>0?'小瓶催熟 · 绿液1 · 守护18息':'继续培养 · 守护30息',description:`取得${this.region.material==='bamboo'?'金雷竹':'庚精线索与灵材'}，灵气与40灵石。`},{id:'heal',name:'采摘灵药',description:'立即恢复35生命，取得12灵石。'}];
  if(poi.kind==='lure')return[{id:'lure',name:'以霓裳草诱妖 · 20灵石',description:`引来强化妖兽，必得${this.region.material==='bamboo'?'金雷竹':'庚精'}。`,disabled:p.spirit<20}];
  if(poi.kind==='elite')return[{id:'elite',name:'挑战材料守卫',description:`击败守卫，必得${this.region.material==='bamboo'?'金雷竹':'庚精'}。`}];
  if(poi.kind==='chest')return[{id:'chest',name:this.regionIndex===2?'破开残阵封藏':'搜寻遗物',description:poi.guarded?'取得灵石、符箓与灵气，但会惊动附近妖兽。':'取得灵石、符箓与灵气。'}];
  if(poi.kind==='portal')return[{id:'portal',name:this.regionIndex===2?'完成试炼':`前往${REGIONS[this.regionIndex+1].name}`,description:'恢复部分生命与全部灵力。'}];
  if(poi.kind==='forge')return[
   {id:'bamboo',name:p.swordCrafted?'青竹蜂云剑已炼成':'炼制青竹蜂云剑',description:'金雷竹1 + 灵石20。飞剑伤害提高，御剑集火附带神雷。',disabled:p.swordCrafted||!p.weapons.sword||p.materials.bamboo<1||p.spirit<20},
   {id:'array',name:p.arrayRecipe?'大庚剑阵已参悟':'参悟大庚剑阵',description:'庚精1 + 灵石40，需36口飞剑。解锁分剑镇阵。',disabled:p.arrayRecipe||this.swordCount<36||p.materials.gold<1||p.spirit<40},
   {id:'awaken',name:p.swordAwakened?'七十二剑炼法已解锁':'祭炼七十二剑',description:'庚精1 + 灵石60，需元婴境与青竹蜂云剑。之后升级可达72口。',disabled:p.swordAwakened||!p.swordCrafted||this.realm!=='元婴'||p.materials.gold<1||p.spirit<60},
   {id:'switch',name:`当前阵法：${p.arrayType==='five'?'颠倒五行阵':'大庚剑阵'}`,description:p.arrayRecipe?'切换装备的阵法；当前阵法会先回收。':'先参悟大庚剑阵，才能切换。',disabled:!p.arrayRecipe},
   {id:'supply',name:'补充符箓 · 25灵石',description:'金刚符与连珠雷符各1。',disabled:p.spirit<25}
  ];return [];
 }
 chooseEvent(id){
  if(this.mode!=='event')return false;if(id==='leave'){this.mode='playing';this.currentEvent=null;return true;}
  const option=this.eventOptions().find(o=>o.id===id);if(!option||option.disabled)return false;
  const poi=this.pois.find(p=>p.id===this.currentEvent),p=this.player;this.mode='playing';this.currentEvent=null;
  if(id==='grow'){poi.state='growing';const fast=this.character==='hanli'&&p.greenLiquid>0;poi.remaining=fast?18:30;if(fast)p.greenLiquid--;poi.total=poi.remaining;poi.spawn=0;this.notify('灵草正在培养，保护灵圃');}
  if(id==='heal'){p.hp=Math.min(p.maxHp,p.hp+35);p.spirit+=12;poi.state='done';}
  if(['elite','lure'].includes(id)){if(id==='lure')p.spirit-=20;poi.state='fighting';this.spawn(this.region.enemy[3],poi.x,poi.y-80,true,poi.id);}
  if(id==='chest'){poi.state='done';p.spirit+=25;p.xp+=20+this.regionIndex*18;const keys=Object.keys(CONSUMABLES);p.consumables[keys[Math.floor(this.random()*keys.length)]]++;if(poi.guarded){for(let i=0;i<4;i++)this.spawn(this.region.enemy[i%3],p.x+Math.cos(i*TAU/4)*240,p.y+Math.sin(i*TAU/4)*240);this.notify('封藏已破 · 妖兽被惊动');}else this.notify('取得灵石、符箓与灵气');}
  if(id==='bamboo'){p.materials.bamboo--;p.spirit-=20;p.swordCrafted=true;this.emit('evolution',{text:'青竹蜂云剑 · 炼成'});}
  if(id==='array'){p.materials.gold--;p.spirit-=40;p.arrayRecipe=true;p.arrayType='sword';this.emit('evolution',{text:'大庚剑阵 · 参悟'});}
  if(id==='awaken'){p.materials.gold--;p.spirit-=60;p.swordAwakened=true;this.emit('evolution',{text:'七十二剑 · 炼法已成'});}
  if(id==='switch'){this.recallArray();p.arrayType=p.arrayType==='sword'?'five':'sword';}
  if(id==='supply'){p.spirit-=25;p.consumables.shield++;p.consumables.thunder++;}
  if(id==='portal')this.completeRegion();this.gainLevels();return true;
 }
 completeRegion(){
  if(!this.bossDead)return false;
  this.meta.cleared=Math.max(this.meta.cleared,this.regionIndex+1);
  if(this.regionIndex===2){this.mode='won';this.emit('won');return true;}
  this.mode='transition';this.emit('transition');return true;
 }
 nextRegion(){
  if(this.mode!=='transition')return false;this.recallArray();this.regionIndex++;this.regionTime=0;this.spawnTimer=1;this.bossDead=false;this.bossSpawned=false;this.enemies=[];this.pickups=[];this.projectiles=[];this.zones=[];this.hazards=[];this.decoy=null;this.player.x=0;this.player.y=110;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);this.player.mana=this.player.maxMana;this.player.invuln=2;this.createRegion();this.syncSwords();this.mode='playing';this.emit('region',{name:this.world.title});return true;
 }
 get canChallengeBoss(){return !this.bossSpawned&&!this.bossDead&&this.regionTime>=60&&this.regionTime<this.region.bossAt-5;}
 challengeBoss(){
  if(this.mode!=='playing'||!this.canChallengeBoss)return false;
  // Advance only the encounter schedule, never survival time, XP or rewards.
  this.regionTime=this.region.bossAt-5;this.encounterId=null;this.spawnTimer=1;
  this.notify('已引动首领 · 五息后现身；跳过敌潮不会获得其奖励');return true;
 }
 tick(dt,input={}){
  if(this.mode!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;this.regionTime+=dt;const p=this.player;
  for(const key of ['dash','dashTime','invuln','skill','castTime','hurtTime','hidden','focus','relicCooldown','parryClock'])p[key]=Math.max(0,p[key]-dt);
  p.mana=Math.min(p.maxMana,p.mana+dt*(3.5+(p.passives.chongyuan||0)*.65));
  if(p.stance==='assault'&&p.weapons.sword&&this.enemies.some(e=>e.hp>0&&dist(e,p)<460)){p.mana=Math.max(0,p.mana-dt*(6+this.swordCount*.07));if(p.mana<1){p.stance='guard';this.notify('灵力将尽 · 飞剑归守');}}
  let mx=input.x||0,my=input.y||0,d=Math.hypot(mx,my);if(d>1){mx/=d;my/=d;}p.moving=d>.1;if(p.moving&&p.dashTime===0){p.dx=mx/(Math.hypot(mx,my)||1);p.dy=my/(Math.hypot(mx,my)||1);}
  if(input.dash&&p.dash<=0){p.dash=2.7;p.dashTime=.2;p.invuln=Math.max(p.invuln,.45);p.skill=Math.max(0,p.skill-(p.passives.sunv||0)*.6);this.emit('dash',{x:p.x,y:p.y});}
  if(p.dashTime>0){mx=p.dx;my=p.dy;}const speed=p.dashTime>0?410:p.speed;moveOnTerrain(this.regionIndex,p,mx*speed*dt,my*speed*dt,p.dashTime<=0);this.streamPOIs();
  if(input.stance)toggleStance(this);if(input.cycleRelic)cycleRelic(this);if(input.relic)castRelic(this);if(input.skill)castCharacterSkill(this);if(input.item)useConsumable(this);if(input.quick!==undefined)p.quickIndex=clamp(input.quick,0,1);if(input.flag)this.placeFlag();if(input.recall)this.recallArray();if(input.interact)this.interact();if(this.mode!=='playing')return;
  this.updateEncounters(dt);
  if(!this.bossSpawned&&this.regionTime>=this.region.bossAt){this.bossSpawned=true;this.bossHome=offscreenPosition(this.regionIndex,p,{r:ENEMIES[this.region.boss].r,angle:-Math.PI/2,...this.visibleBounds})||safePosition(this.regionIndex,p.x,p.y-420,ENEMIES[this.region.boss].r);this.spawn(this.region.boss,this.bossHome.x,this.bossHome.y);}
  this.hash.rebuild(this.enemies);updateWeapons(this,dt);updateSwords(this,dt);updateProjectiles(this,dt);updateZones(this,dt);this.updateArray(dt);this.updateEnemies(dt);this.updateWorld(dt);
  this.enemies=this.enemies.filter(e=>e.hp>0);this.gainLevels();
  if(this.bossDead&&this.regionTime>=this.region.duration){const portals=this.pois.filter(q=>q.kind==='portal');if(portals.some(q=>q.state==='locked')){for(const portal of portals)portal.state='ready';this.notify('界门已开启 · 前往附近界门进入下一境');}if(this.regionTime>=this.region.duration+45)this.completeRegion();}
 }
 updateEncounters(dt){
  const wave=encounter(this.regionIndex,this.regionTime),p=this.player;
  if(wave.warn&&this.warnId!==wave.warn.phaseId){this.warnId=wave.warn.phaseId;this.notify(wave.warn.text);}
  if(wave.phaseId!==this.encounterId){this.encounterId=wave.phaseId;this.spawnTimer=.15;}
  this.spawnTimer-=dt;if(this.spawnTimer>0||!wave.batch||(wave.elite&&this.lastElitePhase===wave.phaseId))return;
  this.spawnTimer=wave.interval;const batch=Math.min(wave.batch,300-this.enemies.length),pressure=wave.phaseId.includes('pressure'),a=pressure&&p.moving?Math.atan2(p.dy,p.dx)+(this.random()-.5)*1.6:this.random()*TAU;
  for(let i=0;i<batch;i++){
   const kind=this.region.enemy[wave.pool[Math.floor(this.random()*wave.pool.length)]],radius=ENEMIES[kind].r*(wave.elite?1.25:1);
   const angle=wave.formation==='ring'?a+i*TAU/batch:wave.formation==='arc'?a+(i-(batch-1)/2)*.22:a;
   const spread=wave.formation==='line'?(i-(batch-1)/2)*55:0;
   const preferred={x:p.x+Math.cos(angle)*590-Math.sin(angle)*spread,y:p.y+Math.sin(angle)*470+Math.cos(angle)*spread};
   const pos=offscreenPosition(this.regionIndex,p,{r:radius,preferred,angle,...this.visibleBounds});if(!pos)continue;
   this.spawn(kind,pos.x,pos.y,wave.elite,0,wave);if(wave.elite)this.lastElitePhase=wave.phaseId;
  }
 }
 updateEnemies(dt){
  const p=this.player;if(this.decoy){this.decoy.life-=dt;if(this.decoy.life<=0)this.decoy=null;}
  for(const e of this.enemies){
   if(e.hp<=0)continue;e.age+=dt;for(const key of ['hit','slow','freeze','action','guardHit','exposed','reactionLock'])e[key]=Math.max(0,e[key]-dt);e.attack-=dt;
   if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.6;this.damage(e,e.burnDamage,'burn');}}
   if(e.hp<=0||e.freeze>0){e.moving=false;continue;}
   if(e.artifact){stepBossRelic(this,e,dt);continue;}
   if(e.boss){stepBoss(this,e,dt);if(dist(e,p)<e.r+p.r)this.hurt(e.damage);continue;}
   let target=this.decoy&&dist(e,this.decoy)<320?this.decoy:p;
   const growing=this.pois.find(q=>q.state==='growing'&&dist(e,q)<190);if(growing)target=growing;
   if(p.hidden>0&&target===p){target={x:e.x+e.dx*20,y:e.y+e.dy*20};}
   const d=dist(e,target)||1,dx=(target.x-e.x)/d,dy=(target.y-e.y)/d;turnToward(e,dx,dt);const beforeX=e.x,beforeY=e.y;
   e.routeTime=(e.routeTime||0)-dt;if(e.routeTime<=0||!Number.isFinite(e.navTargetX)||Math.hypot(e.navTargetX-e.x,e.navTargetY-e.y)<1){const point=navigation(this.regionIndex,e.r).waypoint(e,target);e.navTargetX=point.x;e.navTargetY=point.y;e.routeTime=.22;}
   const routeDistance=Math.hypot(e.navTargetX-e.x,e.navTargetY-e.y),ndx=(e.navTargetX-e.x)/(routeDistance||1),ndy=(e.navTargetY-e.y)/(routeDistance||1);
   if(e.windup>0){e.windup-=dt;e.action=.2;if(e.windup<=0)e.charge=.65;}
   else if(e.charge>0){e.charge-=dt;this.move(e,e.dx*205*dt,e.dy*205*dt);}
   else if((e.behavior==='charge'||e.kind==='wolf')&&e.attack<=0&&d<310&&clearLine(this.regionIndex,e,target,e.r)){e.windup=e.kind==='wolf'?.6:.85;e.dx=dx;e.dy=dy;e.attack=e.kind==='wolf'?4.2:5;this.emit('warning',{x:e.x,y:e.y,dx,dy});}
   else{
    const mult=e.slow>0?.35:1,move=e.behavior==='shoot'?(!clearLine(this.regionIndex,e,target,0,true)||d>235?1:d<150?-.5:0):1;e.dx=dx;e.dy=dy;if(d>8){const step=move>0?Math.min(routeDistance,e.speed*mult*move*dt):e.speed*mult*move*dt;this.move(e,ndx*step,ndy*step);}
    if(e.attack<=0&&(!e.boss||dist(e,p)<460)){e.action=.35;e.attack=e.boss?3.6:e.behavior==='web'?5:3.5;
     if(e.boss)this.bossAttack(e);
     else if(e.behavior==='shoot'){
      const aim={x:target.x+(target.moving?target.dx*38:0),y:target.y+(target.moving?target.dy*38:0)},a=Math.atan2(aim.y-e.y,aim.x-e.x),spread=e.elite?[-.18,0,.18]:e.kind==='snake'?[-.09,.09]:[0];
      for(const offset of spread)this.shoot('enemy',e.x,e.y-16,Math.cos(a+offset),Math.sin(a+offset),e.damage,{owner:'enemy',speed:145,life:5,r:5});
     }
     else if(e.behavior==='web'&&d<250)this.hazards.push({id:this.id(),x:target.x,y:target.y,r:32,timer:1.1,age:0,damage:13});
    }
   }
   e.moving=Math.hypot(e.x-beforeX,e.y-beforeY)>.01;
   if(growing&&dist(e,growing)<e.r+16){growing.hp-=dt*(e.elite?14:5);if(growing.hp<=0){growing.state='failed';this.notify('灵圃被毁，本次培养失败');}}
   if(dist(e,p)<e.r+p.r)this.hurt(e.damage);
   if(!e.boss&&dist(e,p)>1050){const q=offscreenPosition(this.regionIndex,p,{r:e.r,angle:this.random()*TAU,...this.visibleBounds});if(q){e.x=q.x;e.y=q.y;e.routeTime=0;}}
  }
  for(const e of this.enemies){if(e.hp<=0||e.boss||e.artifact)continue;for(const b of this.hash.query(e.x,e.y,45)){if(b.id<=e.id||b.hp<=0||b.boss||b.artifact)continue;const dx=b.x-e.x,dy=b.y-e.y,d=Math.hypot(dx,dy),min=(e.r+b.r)*.66;if(d>.01&&d<min){const push=Math.min((min-d)*.16,3);this.move(e,-dx/d*push,-dy/d*push);this.move(b,dx/d*push,dy/d*push);}}}
 }
 bossAttack(e){
  strikeBoss(this,e);
 }
 updateWorld(dt){
  const p=this.player;
  for(const h of this.hazards){h.timer-=dt;h.age+=dt;if(h.timer<=0){if(hazardContains(h,p))this.hurt(h.damage);if(!h.armed){h.armed=true;this.emit('blast',{x:h.x,y:h.y,r:h.r,color:h.kind==='venom'?0xafa668:0xff806b});}if(h.activeFor)h.activeFor-=dt;}}
  this.hazards=this.hazards.filter(h=>h.timer>0||h.activeFor>0);
  p.gatherTime=Math.max(0,(p.gatherTime||0)-dt);const magnet=70*(1+clamp(this.meta.pickupRank,0,3)*.05)+(this.character==='yinyue'?24:0);
  for(const gem of this.pickups){gem.age+=dt;const d=dist(gem,p);if(d<magnet||p.gatherTime>0)gem.attracted=true;if(gem.attracted){const step=Math.min(d,(p.gatherTime>0?550:270)*dt);gem.x+=(p.x-gem.x)/(d||1)*step;gem.y+=(p.y-gem.y)/(d||1)*step;}if(d<16){gem.dead=true;p.xp+=gem.value;this.emit('pickup',{value:gem.value,kind:gem.kind});if(gem.kind==='heal')p.hp=Math.min(p.maxHp,p.hp+12);if(gem.kind==='vacuum'){p.gatherTime=3.5;this.notify('聚灵珠 · 收拢散落灵气');this.emit('gather',{x:p.x,y:p.y});}}}
  this.pickups=this.pickups.filter(q=>!q.dead);
  // Keep XP in its area when batching the entity pool. Distant drops are never
  // silently teleported to the player; a route back still matters.
  if(this.pickups.length>600){const clusters=new Map(),keep=[];for(const q of this.pickups){if(q.kind!=='xp'||q.attracted){keep.push(q);continue;}const key=`${Math.floor(q.x/140)}:${Math.floor(q.y/140)}`,existing=clusters.get(key);if(existing)existing.value+=q.value;else clusters.set(key,q);}this.pickups=[...keep,...clusters.values()];}
  for(const poi of this.pois){if(poi.state!=='growing')continue;if(dist(poi,p)>420){poi.state='failed';this.notify('离开太远，灵圃失守');continue;}poi.remaining-=dt;poi.spawn-=dt;if(poi.spawn<=0){poi.spawn=3.5;const a=this.random()*TAU;this.spawn(this.region.enemy[Math.floor(this.random()*3)],poi.x+Math.cos(a)*210,poi.y+Math.sin(a)*210);}if(poi.remaining<=0&&poi.hp>0){poi.state='done';p.materials[this.region.material]++;p.spirit+=40;p.xp+=p.xpNext*.5;this.notify(`灵草已成 · ${this.region.material==='bamboo'?'金雷竹':'庚精'} +1`);}}
 }
 snapshot(){const p=this.player;return{version:VERSION,mode:this.mode,character:this.character,region:this.region.name,regionIndex:this.regionIndex,time:Math.round(this.time*10)/10,regionTime:Math.round(this.regionTime),realm:this.realm,level:p.level,hp:Math.round(p.hp),maxHp:p.maxHp,mana:Math.round(p.mana),spirit:p.spirit,weapons:{...p.weapons},materials:{...p.materials},swordCount:this.swordCount,swordAllocation:{orbit:this.swords.filter(s=>s.mode==='orbit').length,attacking:this.swords.filter(s=>s.mode==='attack'||s.mode==='return').length,array:this.swords.filter(s=>s.mode==='array').length},enemies:this.enemies.length,kills:this.kills,bossDead:this.bossDead,upgrades:this.upgrades.map(c=>({...c})),nearby:this.nearestPOI()?.name||null};}
 save(){const data={version:VERSION};for(const k of Object.keys(this))if(k!=='hash'&&k!=='events')data[k]=this[k];return JSON.stringify(data);}
 static load(text){
  const d=JSON.parse(text);if(![4,5,VERSION].includes(d.version)||!CHARACTERS[d.character]||!d.player||!Number.isFinite(d.player.hp)||!Number.isFinite(d.time)||d.time<0||d.time>7200||!REGIONS[d.regionIndex])throw new Error('存档不兼容');
  const g=new BattleCore({seed:d.seed,character:d.character,meta:d.meta});for(const key of Object.keys(g))if(key!=='hash'&&key!=='events'&&key in d)g[key]=d[key];g.events=[];
  g.player={stance:'guard',relic:CHARACTERS[g.character].starter,relicCooldown:0,relicTotal:12,parryClock:0,...g.player};if(!g.player.weapons[g.player.relic])g.player.relic=Object.keys(g.player.weapons)[0]||g.player.relic;
  if(d.version<6)for(const e of g.enemies)if(e.boss){e.bossPhase='stalk';e.windup=0;e.charge=0;e.phaseTimer=0;e.attack=1;e.attackKind=null;}
  if(d.version===4){g.poiRecords={};g.poiChunk='';g.pois=[];g.currentEvent=null;if(g.mode==='event')g.mode='playing';for(const e of g.enemies){e.routeTime=0;delete e.navPoint;delete e.navTargetX;delete e.navTargetY;}g.bossHome??={x:g.player.x,y:g.player.y};}
  g.streamPOIs(true);for(const body of [g.player,...g.enemies]){const pos=safePosition(g.regionIndex,body.x,body.y,body.r);body.x=pos.x;body.y=pos.y;}if(g.mode==='playing')g.mode='paused';g.hash.rebuild(g.enemies);g.syncSwords();return g;
 }
}
