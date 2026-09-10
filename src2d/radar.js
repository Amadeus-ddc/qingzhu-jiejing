import {ENEMIES} from './catalog.js';
import {CHUNK_SIZE} from './world.js';

// The radar reads each generated area's actual geometry, including remote cells.
export const RADAR_CHUNK_SIZE=CHUNK_SIZE;
const unavailable=new Set(['done','failed','growing','fighting','locked']);
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const directions=['东','东南','南','西南','西','西北','北','东北'];

export function radarView(player,width=176,height=132){
 const pad=5,scale=(width-pad*2)/RADAR_CHUNK_SIZE,cx=width/2,cy=height/2;
 const minX=player.x-(cx-pad)/scale,maxX=player.x+(cx-pad)/scale;
 const minY=player.y-(cy-pad)/scale,maxY=player.y+(cy-pad)/scale;
 return{width,height,pad,scale,cx,cy,minX,maxX,minY,maxY,playerX:player.x,playerY:player.y};
}

export function radarPoint(view,point){
 const x=view.cx+(point.x-view.playerX)*view.scale,y=view.cy+(point.y-view.playerY)*view.scale;
 return{x,y,visible:x>=view.pad&&x<=view.width-view.pad&&y>=view.pad&&y<=view.height-view.pad};
}

export function radarTiles(view){
 const s=RADAR_CHUNK_SIZE,half=s/2,tiles=[];
 const minCX=Math.floor((view.minX+half)/s),maxCX=Math.floor((view.maxX+half-1e-7)/s);
 const minCY=Math.floor((view.minY+half)/s),maxCY=Math.floor((view.maxY+half-1e-7)/s);
 for(let cy=minCY;cy<=maxCY;cy++)for(let cx=minCX;cx<=maxCX;cx++){
  const p=radarPoint(view,{x:cx*s-half,y:cy*s-half});
  tiles.push({chunkX:cx,chunkY:cy,x:p.x,y:p.y,size:s*view.scale});
 }
 return tiles;
}

export function radarTarget(g,knownBoss){
 const boss=knownBoss??g.enemies.find(e=>e.boss&&e.hp>0);
 if(finitePoint(boss)&&boss.hp>0)return{x:boss.x,y:boss.y,name:boss.name||ENEMIES[boss.kind]?.name||'首领',role:'boss'};
 if(g.bossSpawned&&!g.bossDead&&finitePoint(g.bossHome))return{...g.bossHome,name:ENEMIES[g.region.boss]?.name||'首领',role:'boss'};
 let nearest=null,portal=null,nearDistance=Infinity,portalDistance=Infinity;
 for(const poi of g.pois){
  if(!finitePoint(poi)||unavailable.has(poi.state))continue;
  const d=(poi.x-g.player.x)**2+(poi.y-g.player.y)**2;
  if(d<nearDistance){nearest=poi;nearDistance=d;}
  if(poi.kind==='portal'&&d<portalDistance){portal=poi;portalDistance=d;}
 }
 const point=g.bossDead&&portal?portal:nearest;
 return point?{x:point.x,y:point.y,name:point.name,role:point.kind==='portal'?'portal':'poi'}:null;
}

export function radarObjective(g,target=radarTarget(g)){
 if(!target)return '四向探索 · 寻找境中机缘';
 const dx=target.x-g.player.x,dy=target.y-g.player.y,distance=Math.round(Math.hypot(dx,dy));
 const direction=distance<12?'近处':directions[(Math.round(Math.atan2(dy,dx)*4/Math.PI)+8)%8];
 return `${target.name} · ${direction} · 距 ${distance}`;
}

export function radarEdge(view,target){
 const p=radarPoint(view,target),dx=p.x-view.cx,dy=p.y-view.cy;
 if(p.visible)return{...p,angle:Math.atan2(dy,dx)};
 const scale=Math.min((view.cx-view.pad-6)/Math.abs(dx),(view.cy-view.pad-6)/Math.abs(dy));
 return{x:view.cx+dx*scale,y:view.cy+dy*scale,angle:Math.atan2(dy,dx),visible:false};
}

export function paintRadarTile(canvas,terrainAt,region,cx=0,cy=0){
 canvas.width=176;canvas.height=176;const c=canvas.getContext('2d');
 const colors={floor:region===1?'#845d58':'#536863',water:'#224657',wall:'#1d282d'};
 for(let y=0;y<176;y+=2)for(let x=0;x<176;x+=2){
  const terrain=terrainAt(region,((x+1)/176-.5+cx)*RADAR_CHUNK_SIZE,((y+1)/176-.5+cy)*RADAR_CHUNK_SIZE);
  c.fillStyle=colors[terrain]||colors.wall;c.fillRect(x,y,2,2);
 }
 return canvas;
}

export function drawRadar(c,g,tile,focus=radarTarget(g)){
 const v=radarView(g.player,c.canvas.width,c.canvas.height);
 c.clearRect(0,0,v.width,v.height);c.fillStyle='#0f1c20';c.fillRect(0,0,v.width,v.height);
 c.save();c.beginPath();c.rect(v.pad,v.pad,v.width-v.pad*2,v.height-v.pad*2);c.clip();c.imageSmoothingEnabled=false;
 for(const q of radarTiles(v)){
  // Adjacent tile edges share the same rounded pixel, preventing antialiased
  // hairline gaps while the camera crosses a chunk boundary.
  const x=Math.round(q.x),y=Math.round(q.y),right=Math.round(q.x+q.size),bottom=Math.round(q.y+q.size);
  c.drawImage(typeof tile==='function'?tile(q.chunkX,q.chunkY):tile,x,y,right-x,bottom-y);
 }
 for(const poi of g.pois){
  if(!finitePoint(poi))continue;const q=radarPoint(v,poi);if(!q.visible)continue;
  c.fillStyle=unavailable.has(poi.state)?'#445c50':poi.kind==='forge'?'#e8c17f':poi.kind==='portal'?'#8ecfd0':poi.kind==='elite'||poi.kind==='lure'?'#c791b9':'#b4cc8c';
  c.fillRect(q.x-2,q.y-2,4,4);
 }
 for(const enemy of g.enemies){
  if(enemy.hp<=0||!finitePoint(enemy))continue;const q=radarPoint(v,enemy);if(!q.visible)continue;
  const size=enemy.boss?4:1.5;c.fillStyle=enemy.boss?'#f6ad91':'#bd747488';c.fillRect(q.x-size/2,q.y-size/2,size,size);
 }
 if(focus){
  const q=radarEdge(v,focus),color=focus.role==='boss'?'#f6ad91':focus.role==='portal'?'#9fe2dd':'#e4cf98';
  c.strokeStyle=color;c.fillStyle=color;
  if(q.visible){c.beginPath();c.arc(q.x,q.y,5,0,Math.PI*2);c.lineWidth=1;c.stroke();}
  else{c.save();c.translate(q.x,q.y);c.rotate(q.angle);c.beginPath();c.moveTo(4,0);c.lineTo(-3,-3.5);c.lineTo(-3,3.5);c.closePath();c.fill();c.restore();}
 }
 c.fillStyle='#f8ebc2';c.beginPath();c.arc(v.cx,v.cy,3,0,Math.PI*2);c.fill();
 c.strokeStyle='#d4e7bf88';c.lineWidth=1;c.beginPath();c.arc(v.cx,v.cy,7,0,Math.PI*2);c.stroke();
 c.restore();c.strokeStyle='#73907477';c.lineWidth=1;c.strokeRect(v.pad+.5,v.pad+.5,v.width-v.pad*2-1,v.height-v.pad*2-1);
}
