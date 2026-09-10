import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleCore} from '../src2d/core.js';
import {encounter} from '../src2d/waves.js';
import {radarTarget,radarEdge,radarView} from '../src2d/radar.js';
import {worldChunk,walkable,moveOnTerrain} from '../src2d/world.js';
const game=()=>{const g=new BattleCore({seed:123});g.start();return g;};
test('first half minute teaches on a sparse spider wave; subsequent harvests grow denser and tougher',()=>{
 for(let t=0;t<30;t++){const w=encounter(0,t);assert.ok(w.batch/w.interval<.5);assert.deepEqual(w.pool,[0]);assert.ok(w.hpScale<.52);}
 for(let r=0;r<3;r++){const early=encounter(r,0),later=encounter(r,r===0?186:r===1?206:182);assert.ok(later.batch/later.interval>early.batch/early.interval);assert.ok(later.hpScale>early.hpScale*1.3);}
});
test('early boss challenge is guarded, warns five seconds, persists, and does not grant skipped rewards',()=>{
 const g=game();assert.equal(g.challengeBoss(),false);g.regionTime=60;g.time=60;
 const before={xp:g.player.xp,spirit:g.player.spirit,materials:{...g.player.materials},time:g.time};
 g.mode='paused';assert.equal(g.challengeBoss(),false);g.mode='playing';assert.equal(g.challengeBoss(),true);assert.equal(g.challengeBoss(),false);
 assert.equal(g.regionTime,g.region.bossAt-5);assert.deepEqual({xp:g.player.xp,spirit:g.player.spirit,materials:g.player.materials,time:g.time},before);
 const loaded=BattleCore.load(g.save());loaded.mode='playing';loaded.player.invuln=100;
 assert.equal(encounter(0,loaded.regionTime).warn.seconds,5);
 for(let i=0;i<99;i++)loaded.tick(.05);assert.equal(loaded.bossSpawned,false);
 for(let i=0;i<3;i++)loaded.tick(.05);assert.equal(loaded.enemies.filter(e=>e.boss).length,1);assert.ok(loaded.time<66);
 const boss=loaded.enemies.find(e=>e.boss);loaded.damage(boss,1e9);
 assert.equal(loaded.pois.find(q=>q.kind==='portal').state,'ready');
 assert.equal(radarTarget(loaded).role,'portal');assert.equal(loaded.completeRegion(),true);
 loaded.nextRegion();assert.equal(loaded.canChallengeBoss,false);
});
test('guidance prefers usable resources, a ready forge, active defence, and distant boss edge arrows',()=>{
 const g=game();assert.notEqual(radarTarget(g).name,g.pois.find(q=>q.kind==='forge').name);
 const forge=g.pois.find(q=>q.kind==='forge');Object.assign(g.player,{x:forge.x,y:forge.y});g.player.materials.bamboo=1;
 assert.equal(radarTarget(g).name,forge.name);
 const herb=g.pois.find(q=>q.kind==='herb');herb.state='growing';assert.equal(radarTarget(g).name,herb.name);herb.state='done';
 const boss=g.spawn(g.region.boss,2500,2500);const target=radarTarget(g,boss),q=radarEdge(radarView(g.player),target);
 assert.equal(target.role,'boss');assert.equal(q.visible,false);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));
});
test('holding a direction walks around a tree without dash or any terrain penetration',()=>{
 for(let region=0;region<3;region++){
  let exercised=0;
  for(const s of worldChunk(region,0,0).solids){
   const start={x:s.x-s.rx-30,y:s.y,r:11};if(!walkable(region,start.x,start.y,11))continue;
   const body={...start};for(let i=0;i<150;i++){moveOnTerrain(region,body,2,0,true);assert.ok(walkable(region,body.x,body.y,11));}
   if(body.x>s.x+s.rx+11){assert.ok(body.x>start.x+50);exercised++;break;}
  }
  assert.ok(exercised,'must actually skirt an obstacle in each region');
 }
});
