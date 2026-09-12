import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleCore} from '../src2d/core.js';
import {ENEMIES,REGIONS} from '../src2d/catalog.js';
import {castCharacterSkill,updateProjectiles,updateWeapons,useConsumable} from '../src2d/combat.js';
import {CHUNK_SIZE,WORLDS,worldChunk,chunkAt,localPoint,terrainAt,walkable,clearLine,navigation,moveOnTerrain,safePosition,offscreenPosition} from '../src2d/world.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
const shifted=(p,cx,cy)=>({x:p.x+cx*CHUNK_SIZE,y:p.y+cy*CHUNK_SIZE});
function game(region=0,character='hanli'){
 const g=new BattleCore({seed:123,character});g.start();g.regionIndex=region;g.createRegion();g.updateEncounters=()=>{};g.bossSpawned=true;g.player.invuln=1e9;g.player.weapons={};g.swords=[];g.drainEvents();return g;
}
function assertSafe(region,body,label='body'){assert.ok(walkable(region,body.x,body.y,body.r),`${label} intersects terrain: ${JSON.stringify({region,x:body.x,y:body.y,r:body.r})}`);}
function followRoute(region,start,target,r,{limit=6500,arrival=6}={}){
 const body={...start,r},nav=navigation(region,r);let waypoint;
 for(let frame=0;frame<limit;frame++){
  if(distance(body,target)<=arrival)return body;
  if(frame%7===0||!waypoint||distance(body,waypoint)<1)waypoint=nav.waypoint(body,target);
  const dx=waypoint.x-body.x,dy=waypoint.y-body.y,n=Math.hypot(dx,dy),step=Math.min(4,n);
  if(n)moveOnTerrain(region,body,dx/n*step,dy/n*step);assertSafe(region,body,'navigating actor');
 }
 assert.fail(`route stuck: ${JSON.stringify({region,r,start,target,last:body,remaining:distance(body,target)})}`);
}
function obstacle(region,cx,cy,r=11){
 for(const s of worldChunk(region,cx,cy).solids){const centre=shifted(s,cx,cy),a={x:centre.x-s.rx-r-18,y:centre.y},b={x:centre.x+s.rx+r+18,y:centre.y};
  if(walkable(region,a.x,a.y,r)&&walkable(region,b.x,b.y,r))return{a,b,s:{...s,...centre}};
 }throw Error('The test chunk needs an isolated obstacle');
}
test('distant chunks have distinct deterministic layouts and connected border paths',()=>{
 for(let region=0;region<3;region++){
  const signatures=new Set(),types=new Set();
  for(let cy=-5;cy<=5;cy++)for(let cx=-5;cx<=5;cx++){
   const w=worldChunk(region,cx,cy);types.add(w.type);signatures.add(JSON.stringify([w.paths,w.decor,w.water]));assert.ok(w.decor.length>=90);
   const right=w.paths[1].at(-1),neighbour=worldChunk(region,cx+1,cy).paths[0].at(-1);assert.equal(right.y,neighbour.y);
   const bottom=w.paths[3].at(-1),below=worldChunk(region,cx,cy+1).paths[2].at(-1);assert.equal(bottom.x,below.x);
   for(const p of[right,bottom])assertSafe(region,{...shifted(p,cx,cy),r:44},'large actor at a trail seam');
  }
  assert.equal(signatures.size,121,'a whole map must not repeat at each chunk');assert.equal(types.size,6);
  const before=JSON.stringify(worldChunk(region,-4,4));for(let i=200;i<350;i++)worldChunk(region,i,-i);assert.equal(JSON.stringify(worldChunk(region,-4,4)),before);
 }
 assert.deepEqual(chunkAt(-CHUNK_SIZE/2-.01,CHUNK_SIZE/2),{x:-1,y:1});assert.deepEqual(localPoint(CHUNK_SIZE*4,-CHUNK_SIZE*4),{x:0,y:0});
});
test('paths and exploration sites are reachable near the start and in remote scenery',()=>{
 for(let region=0;region<3;region++)for(const[cx,cy]of[[0,0],[4,-4],[-5,3]]){
  const w=worldChunk(region,cx,cy),start=safePosition(region,cx*CHUNK_SIZE+w.center.x,cy*CHUNK_SIZE+w.center.y,11);
  for(const raw of w.pois){const point=shifted(raw,cx,cy),at=safePosition(region,point.x,point.y,20);assert.ok(distance(point,at)<150,'a shore event must stay within its landmark');assertSafe(region,{...at,r:20});followRoute(region,start,at,11);}
  for(const path of w.paths)followRoute(region,start,shifted(path.at(-1),cx,cy),11);
 }
});
test('walking can skirt obstacles while dash, burrow and fox skills cannot cross them',()=>{
 for(let region=0;region<3;region++)for(const[cx,cy]of[[0,0],[7,-7]]){
  const{a,s}=obstacle(region,cx,cy);
  for(const method of['walk','dash','long','burrow','skill']){
   const g=game(region,'yinyue');Object.assign(g.player,a,{dx:1,dy:0});
   if(method==='long')g.move(g.player,2000,0);
   else for(let frame=0;frame<120;frame++){
    if(method==='skill'){g.player.skill=0;g.player.mana=100;castCharacterSkill(g);}
    else if(method==='burrow'){g.player.quick=['burrow'];g.player.quickIndex=0;g.player.consumables.burrow=1;useConsumable(g);}
    else {if(method==='dash')g.player.dash=0;g.tick(1/30,{x:1,y:0,dash:method==='dash'});}
    assertSafe(region,g.player,method);
   }
   if(method!=='walk')assert.ok(g.player.x<=s.x-s.rx-g.player.r+.02,method+' crossed the obstacle');
  }
 }
});
test('a swept path stays clear when an actor radius decreases',()=>{
 const a={x:-4336,y:-3472},b={x:-4304,y:-3472};
 // Regression: perimeter samples said r=44 cleared a rock while r=43 collided,
 // making a boss alternate between an unusable waypoint and rest.
 for(let r=44;r>=10;r--)if(clearLine(0,a,b,r))for(let smaller=0;smaller<r;smaller++)assert.equal(clearLine(0,a,b,smaller),true);
});
test('live melee, ranged enemies and the boss pursue around remote scenery',()=>{
 for(const kind of['golem','cultist','sage']){
  const g=game(2),r=ENEMIES[kind].r,{a,b}=obstacle(2,7,-7,r);Object.assign(g.player,b);const e=g.spawn(kind,a.x,a.y);e.attack=99;g.hash.rebuild(g.enemies);
  assert.equal(clearLine(2,e,g.player,0,true),false);let reached=false;
  for(let frame=0;frame<3000;frame++){g.updateEnemies(1/30);assertSafe(2,e,'pursuing enemy');if(distance(e,g.player)<(kind==='golem'?e.r+30:235)&&clearLine(2,e,g.player,0,true)){reached=true;break;}}
  assert.ok(reached,kind+' remained behind its obstacle');assert.ok(Math.abs(e.x)>6000&&Math.abs(e.y)>6000);
 }
});
test('offscreen spawns and recycling remain local, reachable and outside the viewport',()=>{
 for(let region=0;region<3;region++)for(const[cx,cy]of[[0,0],[7,-7],[-8,8]])for(const r of[11,21.25,44]){
  const at=shifted({x:100,y:120},cx,cy),{s}=obstacle(region,cx,cy),safe=safePosition(region,s.x,s.y,r);assertSafe(region,{...safe,r});assert.ok(distance(safe,s)<300);assert.ok(navigation(region,r).anchor({...safe,r}));
  for(const bounds of[{halfWidth:505,halfHeight:330},{halfWidth:1080,halfHeight:330},{halfWidth:505,halfHeight:700}]){
   const q=offscreenPosition(region,at,{r,preferred:at,angle:.73,...bounds});assert.ok(q);assertSafe(region,{...q,r});assert.ok(distance(q,at)<=1300);assert.ok(Math.abs(q.x-at.x)>bounds.halfWidth+r+32||Math.abs(q.y-at.y)>bounds.halfHeight+r+32);
  }
 }
 assert.equal(offscreenPosition(0,{x:8800,y:8800},{halfWidth:2000,halfHeight:2000,maxDistance:1000}),null);
 const g=game();Object.assign(g.player,safePosition(0,8800,8800,11));const e=g.spawn('spider',0,-690);g.hash.rebuild(g.enemies);g.updateEnemies(1/30);assert.ok(distance(e,g.player)<1300);assertSafe(0,e);
});
test('enemy bodies, summons and deployed puppets spawn on usable ground',()=>{
 for(let region=0;region<3;region++){
  const g=game(region),random=seeded(809+region);Object.assign(g.player,safePosition(region,8800,-8800,11));g.streamPOIs(true);
  for(const kind of[...g.region.enemy,g.region.boss])for(let i=0;i<12;i++){
   const e=g.spawn(kind,8800+random()*2800-1400,-8800+random()*2800-1400,i%2===0&&!ENEMIES[kind].boss);assertSafe(region,e,'spawn');assert.ok(navigation(region,e.r).anchor(e));
  }
  g.player.weapons={puppet:1};g.weaponClocks.puppet=0;g.spawn(g.region.enemy[0],g.player.x+100,g.player.y);g.hash.rebuild(g.enemies);updateWeapons(g,.02);const puppet=g.zones.find(z=>z.kind==='puppet');assert.ok(puppet);assertSafe(region,puppet,'puppet');
 }
 const g=game(2),boss=g.spawn('sage',8900,-9500);boss.attackKind='banner';g.bossAttack(boss);assert.equal(g.enemies.filter(e=>e.kind==='soulbanner').length,1);for(const e of g.enemies)assertSafe(2,e,'summon');
});
test('projectiles hit thin rock edges while water only blocks walking',()=>{
 for(let region=0;region<3;region++)for(const[cx,cy]of[[0,0],[7,-7]]){
  const{s}=obstacle(region,cx,cy),a={x:s.x-s.rx-3,y:s.y+s.ry-.001},b={x:s.x+s.rx+3,y:a.y};assert.equal(clearLine(region,a,b,0,true),false);
  const g=game(region);g.shoot('bolt',a.x,a.y,1,0,20,{speed:distance(a,b)*10,life:3});updateProjectiles(g,.1);assert.equal(g.projectiles.length,0);
 }
 let checked=false;
 for(let cx=-4;cx<=4&&!checked;cx++)for(const pool of worldChunk(1,cx,4).water){
  const s={...pool,...shifted(pool,cx,4)},a={x:s.x-s.rx-25,y:s.y},b={x:s.x+s.rx+25,y:s.y};
  if(clearLine(1,a,b,0,true)&&!clearLine(1,a,b,11)){const g=game(1);Object.assign(g.player,a);g.shoot('bolt',a.x,a.y,1,0,20,{speed:distance(a,b),life:3});for(let i=0;i<10;i++)updateProjectiles(g,.1);assert.equal(g.projectiles.length,1);checked=true;break;}
 }
 assert.ok(checked,'a ray across water was exercised');
});
test('remote saves repair obstacle positions without returning to the origin',()=>{
 for(let region=0;region<3;region++){
  const g=game(region);Object.assign(g.player,safePosition(region,8800,9800,11));g.streamPOIs(true);g.spawn(g.region.enemy[0]);g.pause();const restored=BattleCore.load(g.save());assert.deepEqual(restored.player,g.player);assert.deepEqual(restored.enemies,g.enemies);
  const old=JSON.parse(g.save()),{s}=obstacle(region,7,7);Object.assign(old.player,{x:s.x,y:s.y});Object.assign(old.enemies[0],{x:s.x,y:s.y});const repaired=BattleCore.load(JSON.stringify(old));
  for(const body of[repaired.player,...repaired.enemies]){assertSafe(region,body,'restored body');assert.ok(distance(body,s)<300);}
  repaired.mode='playing';repaired.tick(1/30,{x:1,y:0});assertSafe(region,repaired.player);
 }
});
test('route cache stays bounded while exploring different chunks',()=>{
 const nav=navigation(2,14);for(let chunk=10;chunk<125;chunk++){const{a,b}=obstacle(2,chunk,-chunk,14);nav.waypoint({...a,r:14},b);}assert.ok(nav.paths.size>0&&nav.paths.size<=96);assert.ok(nav.cells.size<=32768);
});

test('actual enemy sizes take safe routes across chunks and far from the origin',()=>{
 for(let region=0;region<3;region++){
  const random=seeded(505+region);
  for(const kind of [...REGIONS[region].enemy,REGIONS[region].boss])for(const elite of [false,true]){
   if(elite&&ENEMIES[kind].boss)continue;const r=ENEMIES[kind].r*(elite?1.25:1);
   for(let sample=0;sample<12;sample++){
    const cx=sample%2?4:-4,cy=sample%3?4:-4;
    const start=safePosition(region,cx*CHUNK_SIZE+random()*2000-1000,cy*CHUNK_SIZE+random()*2000-1000,r),target=safePosition(region,cx*CHUNK_SIZE+random()*3000-1500,cy*CHUNK_SIZE+random()*3000-1500,r);
    followRoute(region,start,target,r,{arrival:r+11});
   }
  }
 }
 for(let region=0;region<3;region++)for(const target of [{x:8800,y:0},{x:-8800,y:0},{x:0,y:8800},{x:0,y:-8800},{x:7500,y:-7800}]){
  followRoute(region,safePosition(region,0,0,25),safePosition(region,target.x,target.y,25),25,{limit:12000});
 }
});
