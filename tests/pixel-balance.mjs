import {BattleCore} from '../src2d/core.js';
import {chooseCard,intent,eventChoice} from './pixel-policy.mjs';
import fs from 'node:fs/promises';
const results=[],output=process.env.QA_OUTPUT_DIR||'artifacts/qa';
for(const character of ['hanli','nangong','yinyue'])for(const build of ['swords','elements']){
 const g=new BattleCore({seed:62026,character});g.start();let action={},nextDecision=0,frames=0,minHp=g.player.hp,maxEnemies=0,maxProjectiles=0;
 const started=performance.now();
 while(!['won','lost'].includes(g.mode)&&g.time<1500&&frames<100000){
  if(g.mode==='upgrade'){g.chooseUpgrade(chooseCard(g.upgrades,build));continue;}
  if(g.mode==='transition'){g.nextRegion();continue;}
  if(g.mode==='event'){g.chooseEvent(eventChoice(g.eventOptions(),g.player));continue;}
  if(g.time>=nextDecision){action=intent({...g.snapshot(),player:g.player,pois:g.pois,pickups:g.pickups,targets:g.enemies,projectiles:g.projectiles.filter(b=>b.owner==='enemy'),hazards:g.hazards});nextDecision=g.time+.15;}
  g.tick(1/30,action);action.stance=false;action.relic=false;g.drainEvents();frames++;minHp=Math.min(minHp,g.player.hp);maxEnemies=Math.max(maxEnemies,g.enemies.length);maxProjectiles=Math.max(maxProjectiles,g.projectiles.length);
 }
 const result={character,build,...g.snapshot(),minHp,maxEnemies,maxProjectiles,cpuSeconds:(performance.now()-started)/1000};results.push(result);console.log(JSON.stringify(result));
}
await fs.mkdir(output,{recursive:true});await fs.writeFile(`${output}/pixel-balance.json`,JSON.stringify({type:'Deterministic simulation using normal actions; not browser play',results},null,2));
