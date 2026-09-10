// Isolated late-build combat check. This fixture is excluded from the site build.
import {BattleCore} from '../src2d/core.js';
import {BattleView} from '../src2d/view.js';
import {loadArt} from '../src2d/art.js';
import {safePosition} from '../src2d/world.js';
const region=Number(new URLSearchParams(location.search).get('region')||2),art=await loadArt(),g=new BattleCore({seed:62026});g.start();g.regionIndex=region;g.createRegion();
const equipment=await(await fetch('/artifacts/qa/v4/late-player.json')).json();Object.assign(g.player,equipment,{x:0,y:280,hp:equipment.maxHp,skill:0,dash:0,shield:0,invuln:0,focus:0,hidden:0});Object.assign(g.player,safePosition(region,0,280,11));g.syncSwords();
g.regionTime=300;g.time=0;g.enemies=[];g.pois=[];g.updateEncounters=()=>{};g.bossSpawned=true;g.spawn(g.region.boss,0,-180);
const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);const view=await new BattleView(host,art).init();
const label=document.createElement('div');label.style.cssText='position:fixed;left:12px;top:12px;padding:8px 12px;background:#10251deb;color:#eee4c5;font:14px sans-serif;line-height:1.7';document.body.append(label);
const held=new Set(),pending=new Set();addEventListener('keydown',e=>{held.add(e.code);if(!e.repeat)pending.add(e.code);});addEventListener('keyup',e=>held.delete(e.code));
let last=performance.now(),acc=0;const timings=[];
function frame(t){const wall=(t-last)/1000;last=t;acc+=Math.min(.1,wall);timings.push(wall*1000);if(timings.length>900)timings.shift();
 while(acc>=1/60){const action={x:Number(held.has('KeyD'))-Number(held.has('KeyA')),y:Number(held.has('KeyS'))-Number(held.has('KeyW')),skill:pending.has('KeyE'),dash:pending.has('Space'),item:pending.has('KeyQ')};pending.clear();g.tick(1/60,action);acc-=1/60;}
 view.consume(g.drainEvents());view.update(g,Math.min(.1,wall));const boss=g.enemies.find(e=>e.boss);label.textContent=`独立首领战 · 已预设后期构筑 · 不计为正常通关\n${boss?.name||'首领已败'} · ${boss?.bossPhase==='recover'?'破绽 · 伤害↑':'护体 · 伤害↓'} · 首领生命 ${Math.ceil(boss?.hp||0)} · 玩家生命 ${Math.ceil(g.player.hp)}`;requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.bossCheck={ready:true,read(){const boss=g.enemies.find(e=>e.boss),sorted=timings.slice().sort((a,b)=>a-b);return JSON.parse(JSON.stringify({...g.snapshot(),player:g.player,targets:g.enemies,pois:[],projectiles:g.projectiles.filter(p=>p.owner==='enemy'),hazards:g.hazards,boss,p95:sorted[Math.floor(sorted.length*.95)]}));}};
