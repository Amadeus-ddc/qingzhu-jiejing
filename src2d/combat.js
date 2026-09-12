import {clearLine,safePosition} from './world.js';
import {staggerBoss} from './bosses.js';
import {WEAPONS} from './catalog.js';
import {TAU,clamp,dist,angle,pointSegment,inTriangle} from './math.js';

const fireColor=0xffae76;
const damageFor=(g,id)=>WEAPONS[id].damage*g.damageScale*(1+((g.player.weapons[id]||1)-1)*.3)*(1+(['sword','blades','ring','cauldron','dragon'].includes(id)?(g.player.passives.qingyuan||0)*.12:0));
function burn(g,e,amount){e.burn=Math.max(e.burn,3);e.burnDamage=amount*(1+(g.player.passives.sunv||0)*.18);}

export function updateWeapons(g,dt){
 const p=g.player;
 for(const [id,rank] of Object.entries(p.weapons)){
  if(id==='sword')continue;g.weaponClocks[id]=(g.weaponClocks[id]??.7)-dt;if(g.weaponClocks[id]>0)continue;
  const def=WEAPONS[id],target=g.nearest(p.x,p.y,def.range);if(!target)continue;
  g.weaponClocks[id]=def.interval/g.haste;const a=angle(p,target),damage=damageFor(g,id),dx=Math.cos(a),dy=Math.sin(a);
  if(id==='blades'){
   const count=Math.min(9,1+rank*2);for(let i=0;i<count;i++){const b=a+(i-(count-1)/2)*.14;g.shoot('blades',p.x,p.y-12,Math.cos(b),Math.sin(b),damage,{speed:250,homing:4,life:1.8,delay:i*.06,pierce:rank>=4?2:1,r:5});}
  }else if(id==='ring')g.shoot('ring',p.x,p.y-12,dx,dy,damage,{speed:210,life:2.2,r:19+rank*2,pierce:18,boomerang:true,rank});
  else if(id==='cauldron')g.zone('cauldron',target.x,target.y,52+rank*9,damage,3.5+rank*.35,{pull:95,rank});
  else if(id==='beetles'){
   for(let i=0;i<2+rank;i++){const b=a+i*1.7;g.shoot('beetles',p.x+Math.cos(b)*25,p.y+Math.sin(b)*25,dx,dy,damage,{speed:130,life:4.5+rank*.45,homing:7,pierce:99,r:7,retarget:true,phase:i});}
  }else if(id==='spider')g.zone('web',target.x,target.y,52+rank*9,damage,4.5*g.controlScale,{rank});
  else if(id==='centipede'){
   for(let i=0;i<3+rank;i++){const b=a+(i-(2+rank)/2)*.13;g.shoot('frost',p.x,p.y,Math.cos(b),Math.sin(b),damage,{speed:160,life:1.7,r:12,pierce:3+rank,rank});}
  }else if(id==='puppet'){
   const b=g.time*1.5,spot=safePosition(g.regionIndex,p.x+Math.cos(b)*60,p.y+Math.sin(b)*50,20);g.zone('puppet',spot.x,spot.y,20,damage,(6+rank*.65)*(1+(p.passives.dayan||0)*.08),{interval:.9,rank});
  }else if(id==='fire'){
   for(let i=0;i<(rank>=4?2:1);i++)g.shoot('fire',p.x,p.y-15,Math.cos(a+i*.15),Math.sin(a+i*.15),damage,{speed:220,life:1.8,r:8+rank,blast:35+rank*6,rank});
  }else if(id==='ice')g.shoot('ice',p.x,p.y-10,dx,dy,damage,{speed:80,life:3.7,r:25+rank*3,pierce:99,retarget:false,rank});
  else if(id==='magnet'){
   const end={x:p.x+dx*def.range,y:p.y+dy*def.range};
   for(const e of g.hash.query((p.x+end.x)/2,(p.y+end.y)/2,def.range*.6))if(e.hp>0&&pointSegment(e.x,e.y,p.x,p.y,end.x,end.y)<e.r+18+rank*3){g.damage(e,damage);e.slow=1.6;}
   g.projectiles=g.projectiles.filter(b=>b.owner==='player'||pointSegment(b.x,b.y,p.x,p.y,end.x,end.y)>35);
   g.emit('beam',{x:p.x,y:p.y,ex:end.x,ey:end.y,width:14+rank*3,color:0xc5b6ec});
  }else if(id==='dragon'){
   for(let i=0;i<2;i++){const b=a+(i===0?-.19:.19);g.shoot('dragon',p.x,p.y-10,Math.cos(b),Math.sin(b),damage,{speed:260,life:2,boomerang:true,r:10,pierce:8+rank});}
  }
  g.emit('shot',{weapon:id});
 }
}

export function updateSwords(g,dt){
 const p=g.player,n=g.swords.length;if(!n)return;
 p.attackClock-=dt;p.guardClock-=dt;const guardPulse=p.guardClock<=0;if(guardPulse)p.guardClock=.18;
 const target=g.nearest(p.x,p.y,p.focus>0?460:340),rank=p.weapons.sword;
 const dmg=damageFor(g,'sword')*(p.swordCrafted?1.2:1)*(p.focus>0?1.35:1)*(p.stance==='assault'?1.2:1);
 const canFire=p.attackClock<=0&&target;
 let fired=false;
 for(const s of g.swords){
  s.cooldown=Math.max(0,s.cooldown-dt);
  if(s.mode==='array'){
   const a=g.array;if(!a){s.mode='return';continue;}
   const active=g.swords.filter(q=>q.mode==='array').length,t=(s.index/active+g.time*.035)%1,edge=Math.floor(t*3),f=t*3-edge,A=a.flags[edge],B=a.flags[(edge+1)%3];
   const oldX=s.x,oldY=s.y;s.x=A.x+(B.x-A.x)*f;s.y=A.y+(B.y-A.y)*f;s.a=Math.atan2(B.y-A.y,B.x-A.x);
   if(guardPulse)for(const e of g.hash.query(s.x,s.y,55))if(e.hp>0&&e.guardHit<=0&&pointSegment(e.x,e.y,oldX,oldY,s.x,s.y)<e.r+10){g.damage(e,dmg*.8);e.guardHit=.22;e.slow=.4;}
   continue;
  }
  if(s.mode==='orbit'){
   const rings=n>24?3:n>6?2:1,ring=s.index%rings,perRing=Math.ceil(n/rings),i=Math.floor(s.index/rings);
   const a=i/Math.max(perRing,1)*TAU+g.time*(ring%2?-.43:.52),r=n===1?32:45+ring*24+(p.passives.qingyuan||0)*2;
   s.x=p.x+Math.cos(a)*r;s.y=p.y+Math.sin(a)*r*.65-8;s.a=a+Math.PI/2;
   if(guardPulse&&p.stance!=='assault')for(const e of g.hash.query(s.x,s.y,40))if(e.hp>0&&e.guardHit<=0&&dist(s,e)<e.r+12){g.damage(e,dmg*.22);e.guardHit=.28;}
   if(canFire&&!fired&&s.cooldown<=0){s.mode='attack';s.target=target.id;s.life=1.2;fired=true;p.attackClock=Math.max(.11,1.15/Math.pow(n,.45))/g.haste/(p.focus>0?1.6:1)*(p.stance==='assault'?.72:1.12);}
  }else if(s.mode==='attack'){
   s.life-=dt;const e=g.enemies.find(e=>e.id===s.target&&e.hp>0);
   if(!e||s.life<=0){s.mode='return';continue;}
   const a=angle(s,e),step=(p.focus>0?590:450)*dt,oldX=s.x,oldY=s.y;s.x+=Math.cos(a)*step;s.y+=Math.sin(a)*step;s.a=a;
   if(!clearLine(g.regionIndex,{x:oldX,y:oldY},s,0,true)){s.mode='return';continue;}
   if(pointSegment(e.x,e.y,oldX,oldY,s.x,s.y)<e.r+7){g.damage(e,dmg);s.mode='return';if(p.focus>0&&p.swordCrafted){const other=g.nearest(e.x+24,e.y,100);if(other&&other.id!==e.id){g.damage(other,dmg*.45,'lightning');g.emit('lightning',{x:e.x,y:e.y,ex:other.x,ey:other.y});}}}
  }else{
   const d=dist(s,p),a=angle(s,p);s.x+=Math.cos(a)*Math.min(d,470*dt);s.y+=Math.sin(a)*Math.min(d,470*dt);s.a=a;
   if(d<38){s.mode='orbit';s.cooldown=.45;}
  }
 }
}

export function updateProjectiles(g,dt){
 const p=g.player;
 for(const b of g.projectiles){
  if(b.delay>0){b.delay-=dt;continue;}b.life-=dt;b.age+=dt;const oldX=b.x,oldY=b.y;
  if(b.homing){const target=g.nearest(b.x,b.y,240);if(target){const a=angle(b,target),t=Math.min(1,dt*b.homing);b.dx+=(Math.cos(a)-b.dx)*t;b.dy+=(Math.sin(a)-b.dy)*t;const n=Math.hypot(b.dx,b.dy)||1;b.dx/=n;b.dy/=n;}}
  if(b.boomerang&&b.age>.65){if(!b.returning){b.returning=true;b.hits=[];}const a=angle(b,p);b.dx=Math.cos(a);b.dy=Math.sin(a);if(dist(b,p)<20)b.life=-1;}
  b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;
  if(!clearLine(g.regionIndex,{x:oldX,y:oldY},b,0,true)){b.life=-1;continue;}
  if(b.owner==='enemy'){
   if(p.stance==='guard'&&g.swordCount>=6&&p.parryClock<=0&&p.mana>=3&&g.swords.some(s=>s.mode==='orbit'&&pointSegment(s.x,s.y,oldX,oldY,b.x,b.y)<14+b.r)){b.life=-1;p.mana-=3;p.parryClock=.45;g.emit('blast',{x:b.x,y:b.y,r:18,color:0xa9e6c8});continue;}
   if(p.hidden<=0&&pointSegment(p.x,p.y,oldX,oldY,b.x,b.y)<p.r+b.r){g.hurt(b.damage);b.life=-1;}
  }else{
   if((b.kind==='ice'||b.kind==='beetles')&&b.age-(b.hitReset||0)>.65){b.hits=[];b.hitReset=b.age;}
   for(const e of g.hash.query(b.x,b.y,b.r+70)){
    if(e.hp<=0||b.hits.includes(e.id)||pointSegment(e.x,e.y,oldX,oldY,b.x,b.y)>e.r+b.r)continue;
    g.damage(e,b.damage,b.kind);if(b.breakPower&&e.hp>0&&e.boss)staggerBoss(g,e,b.breakPower);b.hits.push(e.id);
    if(b.kind==='ring'||b.kind==='fire')burn(g,e,b.damage*.18);
    if(['ice','frost'].includes(b.kind)){e.slow=Math.max(e.slow,1.4*g.controlScale);if(b.kind==='frost')e.freeze=Math.max(e.freeze,(e.boss?.15:.5)*g.controlScale);}
    if(b.blast){for(const q of g.hash.query(b.x,b.y,b.blast+40))if(q.hp>0&&q.id!==e.id&&dist(q,b)<b.blast+q.r){g.damage(q,b.damage*.7,'fire');burn(g,q,b.damage*.12);}g.emit('blast',{x:b.x,y:b.y,r:b.blast,color:fireColor});}
    if(b.hits.length>=b.pierce){b.life=-1;break;}
   }
  }
 }
 g.projectiles=g.projectiles.filter(b=>b.life>0&&dist(b,p)<900);
}

export function updateZones(g,dt){
 for(const z of g.zones){
  z.age+=dt;z.duration-=dt;z.pulse-=dt;
  if(z.kind==='cauldron')for(const e of g.hash.query(z.x,z.y,z.r+40))if(e.hp>0&&dist(e,z)<z.r+e.r){const a=angle(e,z),step=e.boss?0:Math.min(dist(e,z),z.pull*dt);g.move(e,Math.cos(a)*step,Math.sin(a)*step);e.slow=Math.max(e.slow,.2);}
  if(z.kind==='web')for(const e of g.hash.query(z.x,z.y,z.r+40))if(e.hp>0&&dist(e,z)<z.r+e.r)e.slow=Math.max(e.slow,.4*g.controlScale);
  if(z.pulse>0)continue;z.pulse=z.interval;
  if(z.kind==='puppet'){
   const e=g.nearest(z.x,z.y,380);if(e){const a=angle(z,e);z.a=a;g.shoot('bolt',z.x,z.y-15,Math.cos(a),Math.sin(a),z.damage,{speed:320,life:1.3,pierce:2+Math.floor(z.rank/2),r:4});g.emit('puppet-shot',{x:z.x,y:z.y});}
  }else for(const e of g.hash.query(z.x,z.y,z.r+45))if(e.hp>0&&dist(e,z)<z.r+e.r){g.damage(e,z.damage,z.kind);if(z.kind==='firefield'){burn(g,e,z.damage*.3);e.slow=Math.max(e.slow,.3);}}
 }
 g.zones=g.zones.filter(z=>z.duration>0);
}

export function castCharacterSkill(g){
 const p=g.player;if(g.mode!=='playing'||p.skill>0)return false;if(p.mana<30){g.notify('灵力不足30');return false;}
 p.mana-=30;p.skill=10;p.castTime=.4;
 const power=g.damageScale*(1+(p.passives.chongyuan||0)*.14);
 if(g.character==='hanli'){
  p.focus=5;g.emit('focus',{x:p.x,y:p.y,crafted:p.swordCrafted});
  if(p.swordCrafted){for(const e of g.hash.query(p.x,p.y,240))if(e.hp>0&&dist(p,e)<240){g.damage(e,36*power,'lightning');if(e.boss)staggerBoss(g,e,38);e.freeze=e.boss?.2:.8;g.emit('lightning',{x:p.x,y:p.y-15,ex:e.x,ey:e.y-10});}}
 }else if(g.character==='nangong'){
  const target=g.nearest(p.x,p.y,270)||p;g.zone('firefield',target.x,target.y,125,28*power,5,{interval:.65});
  for(const e of g.hash.query(target.x,target.y,160))if(e.hp>0&&dist(target,e)<145){if(e.burn>0)g.damage(e,e.burnDamage*6,'fire');if(e.boss)staggerBoss(g,e,38);e.freeze=e.boss?.2:.8;}
  g.emit('blast',{x:target.x,y:target.y,r:125,color:0xffb076});
 }else{
  g.decoy={x:p.x,y:p.y,life:5};g.move(p,p.dx*135,p.dy*135);p.hidden=2;p.invuln=1.1;
  g.zone('illusion',g.decoy.x,g.decoy.y,95,18*power,5,{interval:1});g.emit('illusion',{x:g.decoy.x,y:g.decoy.y});
 }
 g.emit('thunder');return true;
}

export function useConsumable(g){
 const p=g.player,id=p.quick[p.quickIndex];if(g.mode!=='playing')return false;
 if(!p.consumables[id]){g.notify('这张符箓已用尽，可在行囊切换');return false;}p.consumables[id]--;p.castTime=.2;
 if(id==='shield'){p.shield+=60;g.emit('shield',{x:p.x,y:p.y});}
 if(id==='hide'){p.hidden=6;p.invuln=1;g.emit('illusion',{x:p.x,y:p.y});}
 if(id==='burrow'){g.move(p,p.dx*200,p.dy*200);p.invuln=1.1;g.emit('dash',{x:p.x,y:p.y});}
 if(id==='thunder'){
  const targets=g.enemies.filter(e=>e.hp>0&&dist(e,p)<380).sort((a,b)=>b.hp-a.hp).slice(0,3);
  for(const e of targets){g.damage(e,110*g.damageScale,'lightning');g.emit('lightning',{x:e.x-35,y:e.y-150,ex:e.x,ey:e.y});}
 }
 if(id==='ice'){for(const e of g.hash.query(p.x,p.y,230))if(e.hp>0&&dist(p,e)<230){e.freeze=e.boss?1:4;g.damage(e,40*g.damageScale,'ice');}g.projectiles=g.projectiles.filter(b=>b.owner==='player'||dist(b,p)>260);g.emit('blast',{x:p.x,y:p.y,r:230,color:0xa8dfff});}
 if(id==='brick'){
  const target=g.enemies.filter(e=>e.hp>0&&dist(e,p)<450).sort((a,b)=>b.hp-a.hp)[0]||p;
  for(const e of g.hash.query(target.x,target.y,190))if(e.hp>0&&dist(target,e)<155){g.damage(e,300*g.damageScale,'brick');e.freeze=e.boss?.3:1.5;}
  if(target.boss&&target.hp>0)staggerBoss(g,target,70);g.emit('brick',{x:target.x,y:target.y,r:155});
 }
 return true;
}
