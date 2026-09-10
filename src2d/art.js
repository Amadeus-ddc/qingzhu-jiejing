import {Texture,Rectangle} from 'pixi.js';
import frameRects from './frames.json';
import worldFrames from './world-frames.json';

export const SHEETS={hanli:[6,4],nangong:[6,4],yinyue:[6,4],xuangu:[6,4],forest:[4,4],sea:[4,4],temple:[4,4],bosses:[4,2],props:[4,4]};

// Generated source sheets remain untouched. Color-key decoding is part of the
// texture loader, just as sprite-frame selection is part of the renderer.
export async function loadSheet(name,cols,rows){
 const source=new Image();source.src=`./assets/pixel/${name}.png`;await source.decode();
 const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>130&&b>130&&r-g>60&&b-g>60)d[i+3]=0;}
 // Decontaminate only the transparent boundary; purple interior artwork stays.
 for(let pass=0;pass<2;pass++){
  const alpha=new Uint8Array(canvas.width*canvas.height);for(let i=0;i<alpha.length;i++)alpha[i]=d[i*4+3];
  for(let py=1;py<canvas.height-1;py++)for(let px=1;px<canvas.width-1;px++){const n=py*canvas.width+px,i=n*4;if(!alpha[n])continue;if(alpha[n-1]&&alpha[n+1]&&alpha[n-canvas.width]&&alpha[n+canvas.width])continue;if(d[i]-d[i+1]>42&&d[i+2]-d[i+1]>42)d[i+3]=0;}
 }
 ctx.putImageData(pixels,0,0);
 const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
 const frames=[];const bounds=[];
 for(let row=0;row<rows;row++){
  const line=[],boxes=[];
  for(let col=0;col<cols;col++){
   const rect=frameRects[name][row][col],{x,y}=rect,right=x+rect.width,bottom=y+rect.height;
   line.push(new Texture({source:texture.source,frame:new Rectangle(x,y,right-x,bottom-y)}));
   let minX=right,maxX=x,minY=bottom,maxY=y,opaque=0;
   for(let py=y;py<bottom;py++)for(let px=x;px<right;px++){if(d[(py*canvas.width+px)*4+3]>150){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);opaque++;}}
   let footLeft=right,footRight=x;const footTop=Math.max(minY,maxY-Math.round((maxY-minY)*.14));
   for(let py=footTop;py<=maxY;py++)for(let px=minX;px<=maxX;px++)if(d[(py*canvas.width+px)*4+3]>150){footLeft=Math.min(footLeft,px);footRight=Math.max(footRight,px);}
   boxes.push({x,y,left:minX-x,top:minY-y,right:maxX-x,bottom:maxY-y,footX:(footLeft+footRight)/2-x,footY:maxY-y+1,opaque,width:right-x,height:bottom-y});
  }frames.push(line);bounds.push(boxes);
 }
 return{name,frames,bounds,width:canvas.width,height:canvas.height,texture,canvas};
}
export async function loadArt(onProgress=()=>{}){
 const art={};Object.defineProperty(art,'worldKits',{value:[]});let done=0;
 await Promise.all(Object.entries(SHEETS).map(async([name,[cols,rows]])=>{art[name]=await loadSheet(name,cols,rows);onProgress(++done,Object.keys(SHEETS).length);}));
 await Promise.all(['forest','sea','temple'].map(async(id,i)=>{const source=new Image();source.src=`./assets/pixel/worldkit-${id}.png`;await source.decode();const texture=Texture.from(source);texture.source.scaleMode='nearest';const rects=worldFrames[id];art.worldKits[i]={source,rects,textures:rects.map(r=>new Texture({source:texture.source,frame:new Rectangle(r.x,r.y,r.width,r.height)}))};}));
 return art;
}
export function portraitDataURL(art,name){const sheet=art[name],b=sheet.bounds[0][0],c=document.createElement('canvas');c.width=160;c.height=210;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const pad=10,w=b.right-b.left+1,h=b.bottom-b.top+1;const s=Math.min((160-pad*2)/w,(210-pad*2)/h);ctx.drawImage(sheet.canvas,b.x+b.left,b.y+b.top,w,h,(160-w*s)/2,210-pad-h*s,w*s,h*s);return c.toDataURL();}
