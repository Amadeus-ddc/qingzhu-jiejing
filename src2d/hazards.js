import {dist,pointSegment} from './math.js';

// Shared by damage, rendering and the observable-state play controller.
export function hazardContains(h,p,padding=p.r||0){
 if(h.shape==='line')return pointSegment(p.x,p.y,h.x,h.y,h.ex,h.ey)<=h.r+padding;
 const d=dist(h,p);
 return d<=h.r+padding&&(!h.inner||d>=h.inner-padding);
}

export function addHazard(g,owner,shape,extra={}){
 const h={id:g.id(),ownerId:owner.id,x:owner.x,y:owner.y,r:48,timer:1,age:0,damage:owner.damage*.75,activeFor:.35,kind:'rift',shape,...extra};
 g.hazards.push(h);return h;
}
