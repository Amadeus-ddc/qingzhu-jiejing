// Local visual/performance fixture. Never included in the production build.
import {loadArt} from '../src2d/art.js';
import {BattleCore} from '../src2d/core.js';
import {BattleView} from '../src2d/view.js';
import {updateSwords} from '../src2d/combat.js';
const params=new URLSearchParams(location.search),art=await loadArt();
const mode=params.get('mode')||'formation';
if(mode==='gallery'){
 document.body.style.overflow='auto';const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=1260;document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.fillStyle='#21372f';ctx.fillRect(0,0,1100,1260);ctx.imageSmoothingEnabled=false;ctx.font='18px sans-serif';ctx.fillStyle='#e2d5ac';
 for(const [index,id]of['hanli','nangong','yinyue','xuangu'].entries()){
  const sheet=art[id],ox=(index%2)*550,oy=Math.floor(index/2)*630;ctx.fillText(id,ox+16,oy+25);
  for(let r=0;r<4;r++)for(let c=0;c<6;c++){const b=sheet.bounds[r][c],idle=sheet.bounds[r][0],s=100/(idle.bottom-idle.top+1),dx=ox+c*90+45-b.footX*s,dy=oy+r*140+160-b.footY*s;ctx.strokeStyle='#69836744';ctx.strokeRect(ox+c*90+2,oy+r*140+37,86,125);ctx.drawImage(sheet.canvas,b.x,b.y,b.width,b.height,dx,dy,b.width*s,b.height*s);}
 }
 window.fixture={ready:true,type:'asset gallery',frameCount:96};
}else{
 const g=new BattleCore({seed:17,character:params.get('character')||'hanli'});g.start();g.regionIndex=Number(params.get('region')||2);g.regionTime=310;g.time=1090;g.player.level=35;g.player.hp=g.player.maxHp=10000;g.player.mana=100;g.player.spirit=500;g.player.weapons={sword:8,blades:5,cauldron:5,ice:5};g.player.passives={qingyuan:5,dayan:5,mingwang:5,xuanyin:5};g.player.swordCrafted=g.player.swordAwakened=g.player.arrayRecipe=true;g.player.arrayType='sword';g.createRegion();g.syncSwords();
 g.player.x=-120;g.player.y=130;g.placeFlag();g.player.x=120;g.placeFlag();g.player.x=0;g.player.y=-90;g.placeFlag();g.player.x=0;g.player.y=110;
 const count=mode==='stress'?300:35;for(let i=0;i<count;i++){const a=i*2.399,r=90+(i%19)*17;g.spawn(g.region.enemy[i%4],Math.cos(a)*r,Math.sin(a)*r);}
 g.spawn(g.region.boss,125,-25);g.bossSpawned=true;
 if(mode==='stress')for(let i=0;i<1000;i++){const a=i*2.399;g.shoot(i%2?'enemy':'fire',Math.cos(a)*(80+i%350),Math.sin(a)*(80+i%220),Math.cos(a),Math.sin(a),1,{owner:i%2?'enemy':'player',life:100,r:6,speed:0});}
 // Coordinate changes belong to this local fixture, never the normal game API.
 const targetX=Number(params.get('x')??0),targetY=Number(params.get('y')??110),offsetX=targetX-g.player.x,offsetY=targetY-g.player.y;
 for(const q of [g.player,...g.enemies,...g.projectiles,...g.swords,...g.flags,...(g.array?.flags||[])]){q.x+=offsetX;q.y+=offsetY;}g.streamPOIs(true);
 const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);const view=await new BattleView(host,art).init();view.reduced=params.get('low')==='1';
 const label=document.createElement('div');label.style.cssText='position:fixed;top:14px;left:14px;color:#ead9ab;background:#10251de8;padding:10px;font:14px sans-serif';label.textContent='验收场景 · 预设后期状态 · 不计入实际通关';document.body.append(label);
 let last=performance.now(),samples=[],frames=0;function draw(t){const ms=t-last;last=t;g.time+=ms/1000;for(const e of g.enemies)e.age+=ms/1000;updateSwords(g,0);const start=performance.now();view.update(g,Math.min(.03,ms/1000));const renderMS=performance.now()-start;if(frames++>120)samples.push({ms,renderMS});if(samples.length>1200)samples.shift();requestAnimationFrame(draw);}requestAnimationFrame(draw);
 window.fixture={ready:true,moveCamera(x,y){g.player.x=x;g.player.y=y;g.streamPOIs(true);},read(){const sort=samples.map(x=>x.ms).sort((a,b)=>a-b),cpu=samples.map(x=>x.renderMS).sort((a,b)=>a-b),sources=new Set();let displayObjects=0,texturedObjects=0;function count(node){displayObjects++;if(node.texture?.source){texturedObjects++;sources.add(node.texture.source);}for(const c of node.children||[])count(c);}count(view.app.stage);return{type:mode==='stress'?'static rendering stress fixture, not a normal play session':'preset visual fixture, not a normal play session',region:g.regionIndex,player:{x:g.player.x,y:g.player.y},screen:{width:view.app.screen.width,height:view.app.screen.height,scale:view.scale,playerX:g.player.x*view.scale+view.world.x,playerY:g.player.y*view.scale+view.world.y},enemies:g.enemies.length,regularEnemies:g.enemies.filter(e=>!e.boss).length,bosses:g.enemies.filter(e=>e.boss).length,projectiles:g.projectiles.length,swords:g.swordCount,reserved:g.swords.filter(s=>s.mode==='array').length,samples:samples.length,p95:sort[Math.floor(sort.length*.95)],cpuP95:cpu[Math.floor(cpu.length*.95)],spriteMaps:{units:view.units.size,swords:view.swordSprites.size,projectiles:view.projectileSprites.size,pickups:view.pickupSprites.size,pois:view.poiSprites.size,poiLabels:view.poiLabels.size,groundTiles:view.groundTiles.size},poiLabelIds:[...view.poiLabels.keys()],displayObjects,texturedObjects,stageTextureSources:sources.size,groundTileBounds:[...view.groundTiles].map(([id,t])=>({id,x:t.sprite.x,y:t.sprite.y,width:t.sprite.width,height:t.sprite.height}))};}};
}
