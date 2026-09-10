import {CHUNK_SIZE,spatialHash} from './world.js';

// Raster terrain from the generated material atlas; the generated layout is the
// source for dry paths and water. No whole-map image is stretched or repeated.
export function paintTerrain(chunk,kit){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle=['#454938','#887b68','#374043'][chunk.region];c.fillRect(0,0,512,512);
 c.scale(.5,.5);c.translate(CHUNK_SIZE/2,CHUNK_SIZE/2);
 const draw=(id,x,y,w,h)=>{const r=kit.rects[id];c.drawImage(kit.source,r.x,r.y,r.width,r.height,x,y,w,h);};
 for(const tile of chunk.ground)draw(0,tile.x,tile.y,128,128);
 for(const tile of chunk.ground){
  if(tile.tile===0)continue;const h=spatialHash(chunk.seed,tile.x,tile.y,13),x=tile.x+64,y=tile.y+64;
  c.save();c.beginPath();for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=28+((h>>>(i*3%22))%29),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.clip();c.globalAlpha=chunk.region===2?.38:.48;draw(tile.tile,tile.x,tile.y,128,128);c.restore();
 }
 const pattern=(id,size)=>{const p=document.createElement('canvas');p.width=p.height=size;const q=p.getContext('2d'),r=kit.rects[id];q.drawImage(kit.source,r.x,r.y,r.width,r.height,0,0,size,size);return c.createPattern(p,'repeat');};
 const water=pattern(3,192),earth=pattern(2,144);
 for(const pool of chunk.water){c.beginPath();c.ellipse(pool.x,pool.y,pool.rx+9,pool.ry+9,0,0,Math.PI*2);c.fillStyle=chunk.region===0?'#3a402e':chunk.region===1?'#626f66':'#54595a';c.fill();c.beginPath();c.ellipse(pool.x,pool.y,pool.rx,pool.ry,0,0,Math.PI*2);c.fillStyle=water;c.fill();c.strokeStyle=chunk.region===1?'#a1c3ad88':'#98b3ad55';c.lineWidth=4;c.stroke();}
 c.lineJoin='round';c.lineCap='round';
 for(const path of chunk.paths){
  c.beginPath();c.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)c.lineTo(path[i].x,path[i].y);
  c.strokeStyle=earth;c.lineWidth=120;c.globalAlpha=1;c.stroke();c.strokeStyle=chunk.region===0?'#727052':chunk.region===1?'#c8b89a':'#818b85';c.lineWidth=96;c.globalAlpha=.2;c.stroke();
 }
 c.globalAlpha=1;return canvas;
}
