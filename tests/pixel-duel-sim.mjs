import fs from 'node:fs/promises';
import {BattleCore} from '../src2d/core.js';
import {intent} from './pixel-policy.mjs';
import {safePosition} from '../src2d/world.js';
const equipment=JSON.parse(await fs.readFile('tests/pixel-late-build.json','utf8')),out=process.env.QA_OUTPUT_DIR||'artifacts/qa/combat-depth',results=[];
for(const controller of ['idle','circle','tactical']){
 const g=new BattleCore({seed:62026});g.start();g.regionIndex=2;g.createRegion();Object.assign(g.player,equipment,{...safePosition(2,0,160,11),hp:155,mana:100,shield:0,skill:0,hidden:0,invuln:0,focus:0,relic:'magnet'});g.syncSwords();g.bossSpawned=true;g.updateEncounters=()=>{};g.spawn('sage',0,-120);let action={},decision=0,seen=new Set(),stages=new Set(),casts=0,breaks=0,damageTaken=0;
 while(g.mode==='playing'&&!g.bossDead&&g.time<180){
  const boss=g.enemies.find(e=>e.boss);if(boss){stages.add(boss.stage||1);if(boss.attackKind)seen.add(boss.attackKind);}
  if(g.time>=decision){const s={...g.snapshot(),player:g.player,targets:g.enemies,projectiles:g.projectiles,hazards:g.hazards,pois:[]};action=controller==='idle'?{}:intent(s);if(controller==='circle'){const b=g.enemies.find(e=>e.boss),p=g.player,a=Math.atan2(p.y-b.y,p.x-b.x)+.45;action={x:b.x+Math.cos(a)*175-p.x,y:b.y+Math.sin(a)*175-p.y,skill:p.skill<=0};}decision=g.time+.15;}
  const before=g.player.hp;g.tick(1/30,action);action.stance=false;action.relic=false;damageTaken+=before-g.player.hp;for(const e of g.drainEvents()){if(e.type==='notice'&&e.text.includes('已祭出'))casts++;if(e.type==='notice'&&e.text.includes('被破招'))breaks++;}
 }
 const result={controller,mode:g.mode,bossDead:g.bossDead,time:g.time,hp:g.player.hp,damageTaken,bossHP:g.enemies.find(e=>e.boss)?.hp||0,attacks:[...seen],stages:[...stages],casts,breaks};results.push(result);console.log(JSON.stringify(result));
}
await fs.mkdir(out,{recursive:true});await fs.writeFile(`${out}/duel-simulation.json`,JSON.stringify({type:'Preset 72-sword isolated simulation; identical equipment, different normal-input policies',results},null,2));
