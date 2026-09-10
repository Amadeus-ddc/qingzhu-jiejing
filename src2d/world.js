// Spatially seeded terrain. Chunks are cache units, never repeating levels.
// Geometry, dressing, trails, events and radar use the same generated records.
export const CHUNK_SIZE=1024;
export const NAV_CELL_SIZE=32;
const HALF=CHUNK_SIZE/2,worldCache=new Map();
export const WORLDS=[
 {id:'forbidden-wilds',title:'血色禁地 · 山林遗迹',spawn:{x:0,y:280},boss:{x:0,y:-200},seed:71893},
 {id:'coral-frontier',title:'乱星海 · 潮汐群礁',spawn:{x:0,y:280},boss:{x:0,y:-200},seed:95273},
 {id:'ancient-palace',title:'虚天殿 · 遗廊深处',spawn:{x:0,y:280},boss:{x:0,y:-200},seed:134719}
];
export function spatialHash(seed,x,y,salt=0){let h=Math.imul(seed^x,0x85ebca6b);h=(h<<13)|(h>>>19);h=Math.imul(h^y,0xc2b2ae35)^Math.imul(salt+1,0x27d4eb2d);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return(h^(h>>>16))>>>0;}
const randomFor=seed=>()=>{seed=(seed+0x6D2B79F5)|0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
const ellipse=(x,y,rx,ry)=>({type:'ellipse',x,y,rx,ry});
export function chunkAt(x,y){return{x:Math.floor((x+HALF)/CHUNK_SIZE),y:Math.floor((y+HALF)/CHUNK_SIZE)};}
export function localPoint(x,y){const c=chunkAt(x,y);return{x:x-c.x*CHUNK_SIZE,y:y-c.y*CHUNK_SIZE};}
export function contains(s,x,y){
 if(s.type==='rect')return x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h;
 if(s.type==='ellipse')return((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<=1;
 let inside=false;const p=s.points;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside;return inside;
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
export function pathDistance(chunk,x,y){let d=Infinity;for(const path of chunk.paths)for(let i=1;i<path.length;i++)d=Math.min(d,segmentDistance(x,y,path[i-1],path[i]));return d;}
const features=[['竹影密林','荒废药圃','残垣古道','枯木浅泽','林间石祠','石兽旧庭'],['珊瑚浅滩','沉舟遗骸','潮汐水湾','礁石营地','海蚀石坛','漂流物滩'],['残柱回廊','碎石前庭','古殿祭坛','藏器偏殿','积水废廊','荒废药阁']];
const herbs=[['竹根灵草','古井药圃','林下药苗'],['珊瑚灵药','礁隙霓草','海崖灵草'],['封存丹匣','遗留药圃','石案丹药']];
const caches=[['石兽遗物','散修遗囊','残墙暗藏'],['沉舟遗匣','礁岸遗物','锚链下的灵匣'],['藏器石匣','残阵遗物','偏殿封藏']];
export function worldChunk(region,cx,cy){
 const key=`${region}:${cx}:${cy}`;if(worldCache.has(key))return worldCache.get(key);
 const def=WORLDS[region],seed=spatialHash(def.seed,cx,cy),rand=randomFor(seed),origin=cx===0&&cy===0;
 const type=origin?2:Math.floor(rand()*6),center={x:origin?0:rand()*250-125,y:origin?30:rand()*240-120};
 const chunk={key,cx,cy,region,seed,type,name:features[region][type],center,paths:[],solids:[],water:[],decor:[],pois:[],ground:[]};
 const edge=(axis,x,y)=>spatialHash(def.seed,x,y,axis)%481-240;
 const ends=[{x:-HALF,y:edge(41,cx-1,cy)},{x:HALF,y:edge(41,cx,cy)},{x:edge(53,cx,cy-1),y:-HALF},{x:edge(53,cx,cy),y:HALF}];
 for(const end of ends)chunk.paths.push([{...center},{x:(center.x+end.x)/2+(rand()-.5)*85,y:(center.y+end.y)/2+(rand()-.5)*85},end]);
 if(origin)chunk.paths.push([{x:0,y:280},{x:0,y:30},{x:0,y:-250}]);
 const decor=(frame,x,y,width,{solid=false,rx=12,ry=9,layer='actor',flip=false,sheet='kit'}={})=>{
  if(Math.abs(x)>HALF-45||Math.abs(y)>HALF-45)return false;
  if(solid&&(pathDistance(chunk,x,y)<68+Math.max(rx,ry)||Math.hypot(x-center.x,y-center.y)<112||chunk.water.some(s=>contains(s,x,y))))return false;
  if(solid&&chunk.solids.some(s=>contains(s,x,y)||contains(s,x-rx,y)||contains(s,x+rx,y)))return false;
  chunk.decor.push({id:chunk.decor.length,frame,x,y,width,layer,flip,solid,sheet});if(solid)chunk.solids.push(ellipse(x,y,rx,ry));return true;
 };
 if((region===1&&type!==1)||(region===0&&type===3)||(region===2&&type===4))for(let i=0;i<(region===1?2:1);i++){
  const pool=ellipse(center.x+(i?1:-1)*(180+rand()*75),center.y+(rand()-.5)*280,95+rand()*65,65+rand()*70);
  pool.x=Math.max(-HALF+80+pool.rx,Math.min(HALF-80-pool.rx,pool.x));pool.y=Math.max(-HALF+80+pool.ry,Math.min(HALF-80-pool.ry,pool.y));chunk.water.push(pool);
 }
 if(region===0){
  if(type===2||type===4)decor(9,center.x,center.y-150,170,{sheet:'props'});
  if(type===1)for(let i=0;i<8;i++)decor(4,center.x+(i%4-1.5)*43,center.y+155+Math.floor(i/4)*34,38,{layer:'ground'});
  if(type>=2&&type!==3){for(const side of [-1,1]){decor(14,center.x+side*190,center.y-135,135,{solid:true,rx:52,ry:16});decor(15,center.x+side*185,center.y+130,95,{solid:true,rx:25,ry:18});}decor(9,center.x+230,center.y+185,125,{solid:true,rx:13,ry:10});}
  if(type===3)for(let i=0;i<6;i++)decor(13,center.x+(rand()-.5)*680,center.y+(rand()-.5)*680,90+rand()*35,{solid:true,rx:11,ry:10});
 }else if(region===1){
  if(type===1)decor(7,center.x-190,center.y+10,185,{sheet:'props',solid:true,rx:30,ry:20});
  if(type===1||type===5){decor(11,center.x-155,center.y-85,185,{solid:true,rx:48,ry:16});decor(10,center.x+180,center.y+70,120,{solid:true,rx:35,ry:12});decor(14,center.x+155,center.y-180,92,{solid:true,rx:25,ry:12});}
  if(type===3||type===4){decor(15,center.x-190,center.y-110,100,{solid:true,rx:25,ry:16});decor(15,center.x+190,center.y+100,100,{solid:true,rx:25,ry:16});}
 }else{
  if(type===0||type===3)decor(9,center.x,center.y-160,180,{sheet:'props'});
  for(let i=0;i<6;i++){const side=i%2?1:-1;decor(type===1?7:6,center.x+side*(175+rand()*55),center.y+(Math.floor(i/2)-1)*160,86+rand()*30,{solid:true,rx:23,ry:18});}
  if(type===2||type===3)for(const side of [-1,1])decor(12,center.x+side*205,center.y-195,135,{solid:true,rx:26,ry:21});
  for(let i=0;i<3;i++)decor(11,center.x+(rand()-.5)*720,center.y+(rand()-.5)*720,140,{solid:true,rx:54,ry:15});
 }
 for(let i=0;i<42;i++){
  const x=rand()*(CHUNK_SIZE-130)-HALF+65,y=rand()*(CHUNK_SIZE-130)-HALF+65;
  if(region===0){const list=type===0?[9,9,10,11]:type===3?[13,8,12]:[10,11,9,8,12],id=list[Math.floor(rand()*list.length)],width=id===11?155+rand()*55:id===9?95+rand()*25:id===12?75+rand()*30:115+rand()*35;decor(id,x,y,width,{solid:true,rx:id===12?26:id===8?21:13,ry:id===12?17:10,flip:rand()<.5});}
  else if(region===1){const id=[5,6,8,9,10][Math.floor(rand()*5)];decor(id,x,y,65+rand()*65,{solid:true,rx:id===8||id===9?25:15,ry:12,flip:rand()<.5});}
  else{const id=[6,7,8,9,10,14,15][Math.floor(rand()*7)],width=id===14?22+rand()*10:id===9?19+rand()*9:id===8?34+rand()*13:48+rand()*35;decor(id,x,y,width,{solid:true,rx:id===7?28:id===14?10:14,ry:8,flip:rand()<.5});}
 }
 for(let i=0;i<112;i++){
  const x=rand()*CHUNK_SIZE-HALF,y=rand()*CHUNK_SIZE-HALF;if(chunk.water.some(s=>contains(s,x,y))&&pathDistance(chunk,x,y)>46)continue;
  const ids=region===0?[4,4,5,6,8,12]:region===1?[4,4,5,6,7,10]:[4,4,4,5,15],id=ids[Math.floor(rand()*ids.length)];decor(id,x,y,region===2?18+rand()*22:22+rand()*36,{layer:'ground',flip:rand()<.5});
 }
 for(const path of chunk.paths)for(let i=1;i<4;i++){const a=path[0],b=path[1],t=i/4;decor(region===0?5:4,a.x+(b.x-a.x)*t+42,a.y+(b.y-a.y)*t+20,22,{layer:'ground'});}
 for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++){const h=spatialHash(def.seed,cx*8+tx,cy*8+ty,97);chunk.ground.push({x:tx*128-HALF,y:ty*128-HALF,tile:h%3,rotation:(h>>>6)%4,tint:.93+((h>>>9)%8)/100});}
 const point=(kind,name,x,y,extra={})=>chunk.pois.push({kind,name,x,y,...extra});
 if(origin){point('forge','古道炼器处',-55,115);point('herb',herbs[region][0],165,190);point('chest',caches[region][0],center.x,center.y-200);point('elite',region===0?'石祠守卫':region===1?'护礁守卫':'古殿守卫',-230,225);}
 else{
  const a=rand()*Math.PI*2,kind=type===1||type===5?'herb':type===4?'elite':'chest';point(kind,kind==='herb'?herbs[region][seed%3]:kind==='elite'?`${chunk.name}守卫`:caches[region][seed%3],center.x+Math.cos(a)*40,center.y+Math.sin(a)*40,{guarded:kind==='chest'});
  if(type===2||type===3)point('forge',region===0?'山间炼器处':region===1?'礁石炼器台':'残殿炼器台',center.x-65,center.y+65);
  if(region===1&&type===0)point('lure','霓裳草丛',center.x+70,center.y-55);
 }
 if(worldCache.size>=144)worldCache.delete(worldCache.keys().next().value);worldCache.set(key,chunk);return chunk;
}
export function terrainAt(region,x,y){
 const c=chunkAt(x,y),w=worldChunk(region,c.x,c.y),lx=x-c.x*CHUNK_SIZE,ly=y-c.y*CHUNK_SIZE;
 if(w.solids.some(s=>contains(s,lx,ly)))return'wall';if(region!==0&&w.water.some(s=>contains(s,lx,ly))&&pathDistance(w,lx,ly)>60)return'water';return'floor';
}
function circleHitsEllipse(s,x,y,r){
 const ax=Math.abs(x-s.x),ay=Math.abs(y-s.y);if(ax>s.rx+r||ay>s.ry+r)return false;
 if((ax/s.rx)**2+(ay/s.ry)**2<=1)return true;if(!r)return false;
 // Closest point on an ellipse, solved by a monotone Lagrange multiplier.
 // Unlike perimeter samples, increasing a body's radius can never clear it.
 const xx=s.rx*s.rx,yy=s.ry*s.ry;let lo=0,hi=Math.max(s.rx,s.ry)*Math.hypot(ax,ay);
 for(let i=0;i<24;i++){const t=(lo+hi)/2;if((s.rx*ax/(t+xx))**2+(s.ry*ay/(t+yy))**2>1)lo=t;else hi=t;}
 const t=(lo+hi)/2;return(ax-xx*ax/(t+xx))**2+(ay-yy*ay/(t+yy))**2<=r*r+.0001;
}
export function walkable(region,x,y,r=0){
 const lo=chunkAt(x-r,y-r),hi=chunkAt(x+r,y+r);
 for(let cy=lo.y;cy<=hi.y;cy++)for(let cx=lo.x;cx<=hi.x;cx++){
  const w=worldChunk(region,cx,cy),lx=x-cx*CHUNK_SIZE,ly=y-cy*CHUNK_SIZE;
  if(w.solids.some(s=>circleHitsEllipse(s,lx,ly,r)))return false;
  if(region!==0&&pathDistance(w,lx,ly)>60-r&&w.water.some(s=>circleHitsEllipse(s,lx,ly,r)))return false;
 }
 return true;
}
export function moveOnTerrain(region,body,dx,dy){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(4,body.r*.6))),sx=dx/steps,sy=dy/steps;
 for(let i=0;i<steps;i++)if(walkable(region,body.x+sx,body.y+sy,body.r)){body.x+=sx;body.y+=sy;}else{if(walkable(region,body.x+sx,body.y,body.r))body.x+=sx;if(walkable(region,body.x,body.y+sy,body.r))body.y+=sy;}
}
export function clearLine(region,a,b,r=0,projectile=false){
 const dx=b.x-a.x,dy=b.y-a.y,lo=chunkAt(Math.min(a.x,b.x)-r,Math.min(a.y,b.y)-r),hi=chunkAt(Math.max(a.x,b.x)+r,Math.max(a.y,b.y)+r),shapes=[];
 for(let cy=lo.y;cy<=hi.y;cy++)for(let cx=lo.x;cx<=hi.x;cx++)for(const s of worldChunk(region,cx,cy).solids){const x=cx*CHUNK_SIZE+s.x,y=cy*CHUNK_SIZE+s.y;if(x+s.rx+r<Math.min(a.x,b.x)||x-s.rx-r>Math.max(a.x,b.x)||y+s.ry+r<Math.min(a.y,b.y)||y-s.ry-r>Math.max(a.y,b.y))continue;shapes.push({...s,x,y});}
 // Exact segment/ellipse hit plus the closest support point for a swept body.
 // End-point distance covers the cases whose minimum is beyond the segment.
 const length=Math.hypot(dx,dy),nx=-dy/(length||1),ny=dx/(length||1);
 for(const s of shapes){
  const x=(a.x-s.x)/s.rx,y=(a.y-s.y)/s.ry,vx=dx/s.rx,vy=dy/s.ry,t=Math.max(0,Math.min(1,-(x*vx+y*vy)/(vx*vx+vy*vy||1)));
  if((x+vx*t)**2+(y+vy*t)**2<=1)return false;
  if(r&&!projectile){
   if(circleHitsEllipse(s,a.x,a.y,r)||circleHitsEllipse(s,b.x,b.y,r))return false;
   const signed=nx*(s.x-a.x)+ny*(s.y-a.y),extent=Math.hypot(s.rx*nx,s.ry*ny),gap=Math.abs(signed)-extent;
   if(gap>0&&gap<=r&&extent){const sign=Math.sign(signed),qx=s.x-sign*s.rx*s.rx*nx/extent,qy=s.y-sign*s.ry*s.ry*ny/extent,projection=((qx-a.x)*dx+(qy-a.y)*dy)/(length*length||1);if(projection>=0&&projection<=1)return false;}
  }
 }
 if(projectile||region===0)return true;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));for(let i=0;i<=steps;i++){const t=i/steps;if(!walkable(region,a.x+dx*t,a.y+dy*t,r))return false;}return true;
}
const CELL=NAV_CELL_SIZE,DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],navCache=new Map();
const grid=p=>({x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)}),point=(x,y)=>({x:(x+.5)*CELL,y:(y+.5)*CELL}),cellKey=(x,y)=>`${x}:${y}`,octile=(x,y)=>10*(x+y)-6*Math.min(x,y);
class MinHeap{
 constructor(){this.items=[];}
 push(value){const a=this.items;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p].f<=value.f)break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.items,result=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].f<a[child].f)child++;if(a[child].f>=last.f)break;a[i]=a[child];i=child;}a[i]=last;}return result;}
}
export class Navigator{
 constructor(region,r=29){this.region=region;this.r=r;this.cells=new Map();this.edges=new Map();this.paths=new Map();}
 point(cell){return point(cell.x,cell.y);}
 index(p){return grid(p);}
 valid(x,y){const key=cellKey(x,y);if(!this.cells.has(key)){if(this.cells.size>=32768){this.cells.clear();this.edges.clear();}const p=point(x,y);this.cells.set(key,walkable(this.region,p.x,p.y,this.r));}return this.cells.get(key);}
 links(x,y){const key=cellKey(x,y);if(!this.edges.has(key)){let bits=0;const a=point(x,y);if(this.valid(x,y))for(let k=0;k<8;k++){const [dx,dy]=DIRS[k];if(this.valid(x+dx,y+dy)&&clearLine(this.region,a,point(x+dx,y+dy),this.r))bits|=1<<k;}this.edges.set(key,bits);}return this.edges.get(key);}
 closest(p){
  const at=grid(p);let best=null,dmin=Infinity;for(let ring=0;ring<=24;ring++){
   for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){if(ring&&Math.abs(dx)!==ring&&Math.abs(dy)!==ring)continue;const x=at.x+dx,y=at.y+dy;if(!this.valid(x,y)||!this.links(x,y))continue;const q=point(x,y),d=(q.x-p.x)**2+(q.y-p.y)**2;if(d<dmin){best={x,y};dmin=d;}}
   if(best&&ring*CELL>Math.sqrt(dmin)+CELL)break;
  }return best;
 }
 anchor(body){const at=grid(body);let best=null,dmin=Infinity;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=at.x+dx,y=at.y+dy;if(!this.valid(x,y)||!this.links(x,y))continue;const q=point(x,y),d=(q.x-body.x)**2+(q.y-body.y)**2;if(d<dmin&&clearLine(this.region,body,q,body.r??this.r)){best={x,y};dmin=d;}}return best;}
 route(start,end){
  const key=`${cellKey(start.x,start.y)}>${cellKey(end.x,end.y)}`;if(this.paths.has(key))return this.paths.get(key);
  const margin=15,minX=Math.min(start.x,end.x)-margin,minY=Math.min(start.y,end.y)-margin,width=Math.abs(start.x-end.x)+margin*2+1,height=Math.abs(start.y-end.y)+margin*2+1,length=width*height;
  const cost=new Float64Array(length).fill(Infinity),parent=new Int32Array(length).fill(-1),closed=new Uint8Array(length),heap=new MinHeap(),index=(x,y)=>(y-minY)*width+x-minX,first=index(start.x,start.y),last=index(end.x,end.y);cost[first]=0;heap.push({i:first,f:octile(Math.abs(end.x-start.x),Math.abs(end.y-start.y))});let visited=0;
  while(heap.items.length&&visited++<7000){const {i}=heap.pop();if(closed[i])continue;closed[i]=1;if(i===last)break;const x=i%width+minX,y=Math.floor(i/width)+minY,edges=this.links(x,y);for(let k=0;k<8;k++)if(edges&(1<<k)){const [dx,dy]=DIRS[k],nx=x+dx,ny=y+dy;if(nx<minX||ny<minY||nx>=minX+width||ny>=minY+height)continue;const j=index(nx,ny),next=cost[i]+(dx&&dy?14:10);if(next>=cost[j])continue;cost[j]=next;parent[j]=i;heap.push({i:j,f:next+octile(Math.abs(end.x-nx),Math.abs(end.y-ny))});}}
  const path=[];if(Number.isFinite(cost[last]))for(let i=last;i>=0;i=parent[i]){path.push(point(i%width+minX,Math.floor(i/width)+minY));if(i===first)break;}path.reverse();if(this.paths.size>=96)this.paths.delete(this.paths.keys().next().value);this.paths.set(key,path);return path;
 }
 waypoint(body,target){
  const r=body.r??this.r,dx=target.x-body.x,dy=target.y-body.y,d=Math.hypot(dx,dy),goal=d>800?{x:body.x+dx/d*700,y:body.y+dy/d*700}:target;
  if(clearLine(this.region,body,goal,r))return{x:goal.x,y:goal.y};
  const start=this.anchor(body),end=this.closest(goal);if(!start||!end)return{x:body.x,y:body.y};let path=this.route(start,end);
  // A rounded grid cell can be a small disconnected pocket even when its centre
  // is walkable. Choose a reachable neighbour instead of freezing at that goal.
  if(!path.length){const choices=[];for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if(this.valid(end.x+x,end.y+y)&&this.links(end.x+x,end.y+y))choices.push({x:end.x+x,y:end.y+y});choices.sort((a,b)=>(a.x-end.x)**2+(a.y-end.y)**2-(b.x-end.x)**2-(b.y-end.y)**2);for(const candidate of choices){path=this.route(start,candidate);if(path.length)break;}}
  let next=path[0]||{x:body.x,y:body.y};for(let i=1;i<Math.min(path.length,7);i++){if(!clearLine(this.region,body,path[i],r))break;next=path[i];}return{...next};
 }
 direction(body,target){const q=this.waypoint(body,target),dx=q.x-body.x,dy=q.y-body.y,n=Math.hypot(dx,dy)||1;return{x:dx/n,y:dy/n};}
}
export function navigation(region,r=29){const radius=Math.ceil(r/2)*2,key=`${region}:${radius}`;if(!navCache.has(key)){if(navCache.size>=32)navCache.delete(navCache.keys().next().value);navCache.set(key,new Navigator(region,radius));}return navCache.get(key);}
export function safePosition(region,x,y,r=16){const nav=navigation(region,r);if(walkable(region,x,y,r)&&nav.anchor({x,y,r}))return{x,y};const cell=nav.closest({x,y});return cell?nav.point(cell):{x,y};}
export function offscreenPosition(region,player,{r=16,preferred,angle=0,halfWidth=505,halfHeight=330,margin=32,maxDistance=1300}={}){
 const outside=q=>(Math.abs(q.x-player.x)>halfWidth+r+margin||Math.abs(q.y-player.y)>halfHeight+r+margin)&&Math.hypot(q.x-player.x,q.y-player.y)<=maxDistance,project=q=>{const p=safePosition(region,q.x,q.y,r);return outside(p)?p:null;};if(preferred){const p=project(preferred);if(p)return p;}const rx=halfWidth+r+margin+45,ry=halfHeight+r+margin+45;for(const scale of [1,1.25,1.5])for(let i=0;i<24;i++){const a=angle+i*Math.PI*2/24,p=project({x:player.x+Math.cos(a)*rx*scale,y:player.y+Math.sin(a)*ry*scale});if(p)return p;}return null;
}
