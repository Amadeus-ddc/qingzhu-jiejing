// Isolated, labelled scene inspection. Does not mutate the playable game's state.
import {loadArt} from '../src2d/art.js';
import {BattleCore} from '../src2d/core.js';
import {BattleView} from '../src2d/view.js';
import {worldChunk,chunkAt,safePosition} from '../src2d/world.js';
const params=new URLSearchParams(location.search),region=Number(params.get('region')||0),art=await loadArt();
const g=new BattleCore({seed:123});g.start();g.regionIndex=region;g.createRegion();
Object.assign(g.player,safePosition(region,Number(params.get('x')||0),Number(params.get('y')||280),11));g.streamPOIs(true);
const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
const view=await new BattleView(host,art).init();
const label=document.createElement('div');label.style.cssText='position:fixed;left:14px;top:14px;padding:8px 12px;background:#10251dd9;color:#e5dfc7;font:14px sans-serif';label.textContent='场景检查 · 独立预设画面';document.body.append(label);
let last=performance.now(),frames=[];function draw(t){const dt=Math.min(.04,(t-last)/1000);last=t;g.time+=dt;view.update(g,dt);frames.push(dt*1000);if(frames.length>600)frames.shift();requestAnimationFrame(draw);}requestAnimationFrame(draw);
window.sceneCheck={ready:true,move(x,y){Object.assign(g.player,safePosition(region,x,y,11));g.streamPOIs(true);},read(){const c=chunkAt(g.player.x,g.player.y),chunk=worldChunk(region,c.x,c.y),p95=[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)];return{player:{x:g.player.x,y:g.player.y},chunk:chunk.key,landmark:chunk.name,decor:chunk.decor.length,visibleDecor:[...view.groundTiles.values()].flatMap(x=>x.decor).filter(x=>x.visible).length,chunks:view.groundTiles.size,p95,pois:g.pois.map(p=>({name:p.name,x:p.x,y:p.y,kind:p.kind}))};}};
