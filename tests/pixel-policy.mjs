import {navigation,walkable,safePosition,clearLine} from '../src2d/world.js';
// A controller using only observable state and normal game actions. Shared by
// fast deterministic simulations and the real-time browser play-through.
export function chooseCard(upgrades,build='swords'){
 const order=build==='swords'?['sword','blades','cauldron','ice','qingyuan','dayan','mingwang','xuanyin']:['ring','fire','centipede','puppet','sunv','dayan','mingwang','chongyuan'];
 return upgrades.map((u,i)=>({i,value:(order.includes(u.id)?100-order.indexOf(u.id)*7:0)+(u.owned?10:0)+(u.id==='sword'?u.rank*3:0)})).sort((a,b)=>b.value-a.value)[0]?.i||0;
}
export function intent(s){
 const p=s.player,t=s.time,targets=s.targets||[],pois=s.pois||[],boss=targets.find(e=>e.boss),d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 let goal;
 const forge=pois.filter(q=>q.kind==='forge').sort((a,b)=>d(a,p)-d(b,p))[0],canForge=(p.weapons.sword&&!p.swordCrafted&&p.materials.bamboo>0&&p.spirit>=20)||(s.realm==='元婴'&&p.swordCrafted&&!p.swordAwakened&&p.materials.gold>0&&p.spirit>=60)||(s.swordCount>=36&&!p.arrayRecipe&&p.materials.gold>1&&p.spirit>=100);
 if(canForge)goal=forge;
 else if(s.bossDead&&s.regionTime>=[360,420,420][s.regionIndex])goal=pois.filter(q=>q.kind==='portal').sort((a,b)=>d(a,p)-d(b,p))[0];
 else if(!boss){
  const fighting=pois.find(q=>q.state==='fighting');if(fighting){const a=t*.55;goal={x:fighting.x+Math.cos(a)*145,y:fighting.y+Math.sin(a)*145};}

  const growing=pois.find(q=>q.state==='growing');
  if(growing){const a=t*.75;goal={x:growing.x+Math.cos(a)*75,y:growing.y+Math.sin(a)*75};}
  else if(!goal&&p.hp<p.maxHp*.58)goal=pois.filter(q=>q.kind==='herb'&&q.state==='ready').sort((a,b)=>d(a,p)-d(b,p))[0];
  else if(!goal&&((p.weapons.sword&&!p.swordCrafted&&p.materials.bamboo<1)||(s.regionIndex>0&&p.materials.gold<2)))goal=pois.filter(q=>['elite','lure'].includes(q.kind)&&q.state==='ready'&&(q.kind!=='lure'||p.spirit>=20)).sort((a,b)=>d(a,p)-d(b,p))[0];
  if(!goal)goal=pois.filter(q=>q.kind==='chest'&&q.state==='ready').sort((a,b)=>d(a,p)-d(b,p))[0];
 }
 if(!goal&&!boss&&s.pickups?.length){goal=s.pickups.map(q=>({q,score:(q.kind==='vacuum'?500:q.kind==='heal'&&p.hp<p.maxHp*.8?150:Math.min(35,q.value*3))/(30+d(q,p))})).sort((a,b)=>b.score-a.score)[0]?.q;}
 if(!goal){if(boss){const a=Math.atan2(p.y-boss.y,p.x-boss.x)+.45;const radius=s.regionIndex===0?125:175;goal={x:boss.x+Math.cos(a)*radius,y:boss.y+Math.sin(a)*radius};}else goal={x:Math.cos(t*.033)*380,y:Math.sin(t*.033)*340};}
 const originalGoal=goal,projected=safePosition(s.regionIndex,goal.x,goal.y,p.r);const route=navigation(s.regionIndex,p.r).direction(p,projected);let vx=route.x,vy=route.y;
 for(const e of targets){const ed=d(p,e),safe=e.boss?e.r+80:e.r+48;if(ed<safe){const w=(safe-ed)/safe*4;vx+=(p.x-e.x)/(ed||1)*w;vy+=(p.y-e.y)/(ed||1)*w;}}
 for(const h of s.hazards||[]){const hd=d(p,h);if(hd<h.r+38){vx+=(p.x-h.x)/(hd||1)*3;vy+=(p.y-h.y)/(hd||1)*3;}}
 for(const b of s.projectiles||[]){if(b.owner!=='enemy')continue;const hd=d(p,b);if(hd<65){vx+=(p.x-b.x)/(hd||1)*2;vy+=(p.y-b.y)/(hd||1)*2;}}
 if(!walkable(s.regionIndex,p.x+vx*30,p.y+vy*30,p.r)){vx=route.x;vy=route.y;}
 const danger=targets.some(e=>d(p,e)<e.r+50)||s.hazards?.some(h=>d(p,h)<h.r+15&&h.timer<.4);
 return{x:vx,y:vy,dash:danger&&p.dash<=0,skill:p.skill<=0&&targets.some(e=>d(p,e)<300),item:p.shield<10&&p.consumables[p.quick[p.quickIndex]]>0&&danger,interact:pois.some(q=>q.id===goal.id)&&d(p,goal)<58,goal:goal.kind||'kite'};
}
export function eventChoice(options,p){
 for(const id of ['bamboo','awaken','array','chest','elite','lure'])if(options.some(o=>o.id===id&&!o.disabled))return id;
 if(options.some(o=>o.id==='grow'))return p.hp<p.maxHp*.7?'heal':'grow';
 if(options.some(o=>o.id==='portal'))return'portal';return'leave';
}
