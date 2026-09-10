import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleCore} from '../src2d/core.js';
import {enemyAnimation,turnToward} from '../src2d/animation.js';
import {updateZones} from '../src2d/combat.js';
import {safePosition,walkable} from '../src2d/world.js';

test('boss movement never alternates opposite directional artwork',()=>{
 for(const kind of['dragon','carp'])for(const facing of[-1,1]){
  const poses=[];for(let frame=0;frame<120;frame++)poses.push(enemyAnimation({kind,atlas:'bosses',row:kind==='dragon'?0:1,facing,moving:true,age:frame/60,action:0,windup:0}));
  assert.equal(new Set(poses.map(p=>p.column)).size,1);assert.equal(poses[0].column,1);assert.equal(poses[0].flip,-facing);
  assert.equal(enemyAnimation({atlas:'bosses',row:0,facing,moving:false}).column,0);
  assert.equal(enemyAnimation({atlas:'bosses',row:0,facing,moving:false,windup:.5}).column,3);
 }
 const e={facing:1};for(let i=0;i<120;i++)turnToward(e,i%2?.08:-.08,1/60);assert.equal(e.facing,1);
});

test('a boss locks its windup aim, completes its dash and recovery, and pursues away from its old home',()=>{
 const g=new BattleCore({seed:123});g.start();g.enemies=[];g.player.invuln=1e9;Object.assign(g.player,{x:0,y:30});g.bossHome={x:8000,y:8000};const boss=g.spawn('dragon',0,-250);boss.attack=0;
 g.updateEnemies(1/60);assert.equal(boss.bossPhase,'windup');const aim={...boss.aim},start={x:boss.x,y:boss.y},heading={x:boss.dx,y:boss.dy};g.player.x=90;
 for(let i=0;i<35;i++){g.updateEnemies(1/60);assert.deepEqual(boss.aim,aim);assert.equal(boss.x,start.x);assert.equal(boss.y,start.y);assert.equal(boss.dx,heading.x);assert.equal(boss.dy,heading.y);}
 const phases=new Set();for(let i=0;i<180;i++){g.updateEnemies(1/60);phases.add(boss.bossPhase);assert.ok(walkable(0,boss.x,boss.y,boss.r));}
 assert.ok(phases.has('dash')&&phases.has('recover')&&phases.has('stalk'));assert.ok(boss.y>start.y+100);assert.ok(Math.abs(boss.x)<500);
});

test('the boss attack cycle produces distinct telegraphed hazards and finite attacks',()=>{
 for(const[region,kind,attacks]of[[0,'dragon',['dash','venom','pools']],[1,'carp',['wave','pools','dash']],[2,'sage',['fan','pools','wave','summon']]]){
  const g=new BattleCore({seed:123});g.start();g.regionIndex=region;g.createRegion();g.enemies=[];g.player.invuln=1e9;Object.assign(g.player,safePosition(region,0,30,11));const boss=g.spawn(kind,0,-200);
  for(const attack of attacks){boss.attackKind=attack;boss.aim={x:g.player.x,y:g.player.y};g.bossAttack(boss);}
  assert.equal(boss.attackCount,attacks.length);assert.ok(g.projectiles.length>=7);assert.equal(g.hazards.length,3);assert.ok(g.hazards.every(h=>h.timer>=1.2&&h.activeFor===2.8));
  for(let i=0;i<300;i++)g.updateWorld(1/60);assert.equal(g.hazards.length,0);
 }
});

test('cauldron control slows a boss without pulling it back and forth',()=>{
 const g=new BattleCore({seed:123});g.start();g.enemies=[];const boss=g.spawn('dragon',0,30),small=g.spawn('spider',0,30);g.hash.rebuild(g.enemies);g.zones=[{kind:'cauldron',x:1,y:30,r:100,pull:90,age:0,duration:2,pulse:99,interval:1,damage:0}];
 for(let i=0;i<30;i++)updateZones(g,1/60);
 assert.equal(boss.x,0);assert.equal(boss.y,30);assert.ok(boss.slow>0);assert.equal(small.x,1);assert.equal(small.y,30);
});

test('late bosses have a visible defensive interval and a rewarding recovery opening',()=>{
 for(const kind of['carp','sage']){
  const g=new BattleCore({seed:123});g.start();const e=g.spawn(kind,0,30),start=e.hp;e.bossPhase='windup';g.damage(e,100);assert.equal(start-e.hp,45);
  const guarded=e.hp;e.bossPhase='recover';g.damage(e,100);assert.equal(guarded-e.hp,130);
  assert.equal(e.guard,.45);
 }
});

test('version four saves retain earned gear and claimed rewards when their map is migrated',()=>{
 const g=new BattleCore({seed:123});g.start();g.player.weapons={sword:5,cauldron:3};g.player.passives={xuanyin:2};g.player.materials={bamboo:2,gold:3};g.player.swordCrafted=true;g.player.consumables.brick=2;g.player.hp=57;g.lastElitePhase='forest:reward-1';g.meta.claims=['earlier-reward'];g.time=g.regionTime=110;g.syncSwords();
 const old=JSON.parse(g.save());old.version=4;old.poiRecords={old:{id:999,state:'done',kind:'chest'}};old.mode='event';old.currentEvent=999;
 const loaded=BattleCore.load(JSON.stringify(old));for(const key of['weapons','passives','materials','consumables','hp','swordCrafted'])assert.deepEqual(loaded.player[key],g.player[key]);assert.equal(loaded.swordCount,24);assert.equal(loaded.time,110);assert.equal(loaded.lastElitePhase,g.lastElitePhase);assert.deepEqual(loaded.meta.claims,g.meta.claims);assert.equal(loaded.currentEvent,null);assert.equal(loaded.mode,'paused');assert.ok(!loaded.poiRecords.old);
 const again=BattleCore.load(loaded.save());assert.deepEqual(again.player,loaded.player);assert.equal(again.time,loaded.time);
});
