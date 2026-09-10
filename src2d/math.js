export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
export const lerp=(a,b,t)=>a+(b-a)*t;
export function pointSegment(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
export function inTriangle(p,a,b,c){const s=(u,v,w)=>(u.x-w.x)*(v.y-w.y)-(v.x-w.x)*(u.y-w.y);const d1=s(p,a,b),d2=s(p,b,c),d3=s(p,c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));}
export class SpatialHash{
 constructor(size=80){this.size=size;this.cells=new Map();}
 rebuild(items){this.cells.clear();for(const e of items){if(e.hp<=0)continue;const key=`${Math.floor(e.x/this.size)},${Math.floor(e.y/this.size)}`;let cell=this.cells.get(key);if(!cell)this.cells.set(key,cell=[]);cell.push(e);}}
 query(x,y,r){const out=[];for(let ix=Math.floor((x-r)/this.size);ix<=Math.floor((x+r)/this.size);ix++)for(let iy=Math.floor((y-r)/this.size);iy<=Math.floor((y+r)/this.size);iy++){const cell=this.cells.get(`${ix},${iy}`);if(cell)out.push(...cell);}return out;}
}
