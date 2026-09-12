import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleCore} from '../src2d/core.js';
import {RELICS,castRelic,cycleRelic,toggleStance} from '../src2d/relics.js';
import {stepBoss,staggerBoss,strikeBoss} from '../src2d/bosses.js';
import {updateProjectiles} from '../src2d/combat.js';
import {hazardContains} from '../src2d/hazards.js';
import {safePosition,walkable} from '../src2d/world.js';
function setup(region=2){const g=new BattleCore({seed:916});g.start();g.regionIndex=region;g.createRegion();Object.assign(g.player,safePosition(region,0,120,11));g.enemies=[];g.updateEncounters=()=>{};g.bossSpawned=true;return g;}

test('all twelve owned relics perform an active action, charge mana and share a persistent cooldown',()=>{
 for(const id of Object.keys(RELICS)){
  const g=setup(),p=g.player;p.weapons={[id]:3,sword:3};p.relic=id;p.mana=100;g.syncSwords();const e=g.spawn('sage',p.x+90,p.y);g.hash.rebuild(g.enemies);
  assert.equal(castRelic(g),true,id);assert.equal(p.mana,100-RELICS[id].cost);assert.ok(g.projectiles.length||g.zones.length||e.hp<e.maxHp||e.exposed>0,id);
  const cooldown=p.relicCooldown;cycleRelic(g);assert.equal(castRelic(g),false);assert.equal(p.relicCooldown,cooldown);
  const loaded=BattleCore.load(g.save());assert.equal(loaded.player.relicCooldown,cooldown);assert.equal(loaded.player.relic,p.relic);
 }
});
test('insufficient mana and unowned relics never spend resources or start an attack',()=>{
 const g=setup();g.player.mana=1;assert.equal(castRelic(g),false);assert.equal(g.player.mana,1);g.player.mana=100;g.player.relic='magnet';assert.equal(castRelic(g),false);assert.equal(g.projectiles.length,0);
});
test('assault consumes mana under pressure and automatically returns to guard when exhausted',()=>{
 const g=setup();g.player.weapons.sword=8;g.player.mana=15;g.player.invuln=100;g.syncSwords();const e=g.spawn('sage',g.player.x+180,g.player.y);e.hp=e.maxHp=1e8;
 assert.equal(toggleStance(g),true);for(let i=0;i<150;i++)g.tick(.05,{});assert.equal(g.player.stance,'guard');assert.ok(g.player.mana<30);assert.equal(g.swords.length,72);
});
test('guard swords intercept a projectile at a real sword position; assault leaves it hostile',()=>{
 for(const stance of ['guard','assault']){const g=setup();g.player.weapons.sword=3;g.syncSwords();g.player.stance=stance;g.swords[0].x=g.player.x+50;g.swords[0].y=g.player.y;
  g.shoot('enemy',g.player.x+55,g.player.y,-1,0,20,{owner:'enemy',speed:100,life:2});updateProjectiles(g,.05);assert.equal(g.projectiles.length,stance==='guard'?0:1);assert.equal(g.player.mana,stance==='guard'?97:100);
 }
});
test('ring hazards preserve their inner refuge and chain collision matches the drawn strip',()=>{
 const ring={x:0,y:0,r:190,inner:100};assert.equal(hazardContains(ring,{x:0,y:0,r:11}),false);assert.equal(hazardContains(ring,{x:140,y:0,r:11}),true);assert.equal(hazardContains(ring,{x:220,y:0,r:11}),false);
 const line={shape:'line',x:0,y:0,ex:300,ey:0,r:18};assert.equal(hazardContains(line,{x:150,y:0,r:11}),true);assert.equal(hazardContains(line,{x:150,y:40,r:11}),false);
 const g=setup();g.hazards=[{...ring,id:1,timer:.5,age:0,activeFor:.2,damage:30}];Object.assign(g.player,{x:140,y:0});g.updateWorld(.2);assert.equal(g.player.hp,110);g.updateWorld(.31);assert.equal(g.player.hp,80);
});
test('Xuangu uses distinct stage repertoires with committed tells and reachable blink destinations',()=>{
 const stages=[{hp:1,wanted:['fan','mirror','chain','banner']},{hp:.6,wanted:['blink','frost','banner','reaper','fan']},{hp:.25,wanted:['eclipse','blink','mirror','frost','chain','banner','reaper']}];
 for(let index=0;index<stages.length;index++){
  const g=setup(),e=g.spawn('sage',g.player.x,g.player.y-180),seen=new Set();e.hp=e.maxHp*stages[index].hp;e.attack=0;g.player.invuln=1000;
  for(let i=0;i<3600;i++){
   e.attack-=1/60;stepBoss(g,e,1/60);
   if(e.bossPhase==='windup'){seen.add(e.attackKind);const aim={...e.aim};g.player.x+=.01;stepBoss(g,e,0);assert.deepEqual(e.aim,aim);if(e.blinkTo)assert.ok(walkable(2,e.blinkTo.x,e.blinkTo.y,e.r));}
   g.updateWorld(1/60);
  }
  assert.equal(e.stage,index+1);for(const move of stages[index].wanted)assert.ok(seen.has(move),`${index+1}: ${move}`);
  assert.ok(g.hazards.length<10);assert.ok(g.enemies.filter(q=>q.hp>0&&q.artifact).length<=5);
 }
});
test('destroying a boss artifact breaks its protection without XP or material farming',()=>{
 const g=setup(),boss=g.spawn('sage',0,0);boss.attackKind='mirror';boss.stage=1;strikeBoss(g,boss);const mirror=g.enemies.find(e=>e.kind==='boneshield');assert.ok(Number.isFinite(mirror.hp));
 boss.bossPhase='windup';const before=boss.hp;g.damage(boss,100);assert.equal(before-boss.hp,28);
 const xp=g.player.xp,kills=g.kills;g.damage(mirror,1e4,'relic');assert.equal(g.player.xp,xp);assert.equal(g.kills,kills);assert.ok(boss.exposed>0&&boss.poise>0);
 const exposed=boss.hp;g.damage(boss,100);assert.equal(exposed-boss.hp,80);
});
test('breaking poise cancels a committed attack and pending strikes, with a finite recovery lock',()=>{
 const g=setup(),e=g.spawn('sage',0,0);e.bossPhase='windup';e.phaseTimer=1;e.windup=1;e.attackKind='chain';e.maxPoise=150;
 g.hazards=[{ownerId:e.id,timer:1},{ownerId:e.id,timer:-1,activeFor:1}];g.shoot('enemy',0,0,1,0,20,{owner:'enemy',ownerId:e.id,delay:.5});
 assert.equal(staggerBoss(g,e,150),true);assert.equal(e.bossPhase,'recover');assert.equal(e.windup,0);assert.equal(g.hazards.length,1);assert.equal(g.projectiles.length,0);assert.equal(staggerBoss(g,e,150),false);
 for(let i=0;i<500;i++){e.attack-=.02;stepBoss(g,e,.02);}assert.equal(e.breakLock,0);assert.ok(e.attackCount>0);
});
test('ice and fire react once per target cooldown and contribute to a break',()=>{
 const g=setup(),e=g.spawn('sage',0,0);e.burn=3;g.damage(e,100,'frost');assert.equal(e.burn,0);assert.equal(e.poise,28);const poise=e.poise;e.burn=3;g.damage(e,100,'frost');assert.equal(e.poise,poise);
});
test('a defeated boss clears its artifacts and hostile effects before opening the portal',()=>{
 const g=setup(),e=g.spawn('sage',0,0);e.attackKind='banner';strikeBoss(g,e);e.attackKind='chain';strikeBoss(g,e);g.shoot('enemy',0,0,1,0,10,{owner:'enemy'});g.damage(e,1e9);assert.equal(g.bossDead,true);assert.equal(g.hazards.length,0);assert.equal(g.projectiles.length,0);assert.ok(g.enemies.every(q=>q.hp<=0));
});
test('version five migration preserves earned equipment and adds controls; version six retains boss phase and artifacts',()=>{
 const g=setup();g.player.weapons={ring:4,fire:2};g.player.hp=53;const old=JSON.parse(g.save());old.version=5;for(const key of ['stance','relic','relicCooldown','relicTotal','parryClock'])delete old.player[key];const loaded=BattleCore.load(JSON.stringify(old));assert.deepEqual(loaded.player.weapons,g.player.weapons);assert.equal(loaded.player.hp,53);assert.equal(loaded.player.relic,'ring');assert.equal(loaded.player.stance,'guard');
 const e=g.spawn('sage',0,0);e.stage=3;e.bossPhase='windup';e.attackKind='mirror';strikeBoss(g,e);const resumed=BattleCore.load(g.save());assert.deepEqual(resumed.enemies,g.enemies);
});
