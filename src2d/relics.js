import {hazardContains} from './hazards.js';
import {dist,angle,TAU} from './math.js';
import {safePosition} from './world.js';
import {staggerBoss} from './bosses.js';

export const RELICS={
 sword:{name:'剑啸破阵',cost:26,cooldown:12,description:'剑气贯穿前方敌群，重创法宝并削减首领定力。'},
 blades:{name:'母刃追魂',cost:24,cooldown:11,description:'标记近敌，子刃集中追杀；目标受伤提高，适合破绽期。'},
 ring:{name:'朱雀焚天',cost:30,cooldown:14,description:'引爆周围灼烧，再展开火域；对冰冻目标触发碎冰。'},
 cauldron:{name:'鼎镇山河',cost:32,cooldown:16,description:'收去身边弹幕，镇住敌群并强力破招。'},
 beetles:{name:'蚀甲虫潮',cost:26,cooldown:13,description:'放出追踪虫潮，暂时腐蚀敌人护体。'},
 spider:{name:'血网缚魂',cost:24,cooldown:12,description:'近敌处织出大网，束缚并标记目标，创造集火机会。'},
 centipede:{name:'六翼寒狱',cost:28,cooldown:13,description:'冻结近敌；冻住燃烧目标引发寒热爆裂。'},
 puppet:{name:'三才弩阵',cost:30,cooldown:16,description:'部署三具速射傀儡，守住当前位置。'},
 fire:{name:'流星火雨',cost:28,cooldown:13,description:'在近敌处降下火雨，持续灼烧，适合配合冰系法门。'},
 ice:{name:'冰焰封灵',cost:28,cooldown:14,description:'冰焰清除身边弹幕并削弱护体，衔接火系触发碎冰。'},
 magnet:{name:'五色归元',cost:34,cooldown:16,description:'清除附近弹幕与地面煞阵，强力削减首领定力。'},
 dragon:{name:'双龙破禁',cost:26,cooldown:12,description:'沿朝向突进并短暂无敌，双器穿透附近强敌。'}
};

export function selectRelic(g,id){
 if(!g.player.weapons[id]||!RELICS[id])return false;
 g.player.relic=id;return true;
}
export function cycleRelic(g){
 if(g.mode!=='playing')return false;
 const ids=Object.keys(g.player.weapons);selectRelic(g,ids[(ids.indexOf(g.player.relic)+1)%ids.length]);
 g.notify(`主祭 · ${RELICS[g.player.relic].name}`);return true;
}
export function toggleStance(g){
 const p=g.player;if(g.mode!=='playing'||!p.weapons.sword)return false;
 if(p.stance==='guard'&&p.mana<12){g.notify('强攻需要至少12灵力');return false;}
 p.stance=p.stance==='assault'?'guard':'assault';
 g.notify(p.stance==='assault'?'强攻 · 飞剑加速，持续耗灵，停止挡弹':'护卫 · 飞剑拦弹，恢复灵力');return true;
}
export function castRelic(g){
 const p=g.player,id=p.relic,def=RELICS[id];
 if(g.mode!=='playing'||p.relicCooldown>0||!def||!p.weapons[id])return false;
 if(p.mana<def.cost){g.notify(`祭器需要${def.cost}灵力`);return false;}
 p.mana-=def.cost;p.relicCooldown=def.cooldown;p.relicTotal=def.cooldown;p.castTime=.5;
 const rank=p.weapons[id],power=g.damageScale*(1+(rank-1)*.3)*(1+(p.passives.chongyuan||0)*.14);
 const target=g.nearest(p.x,p.y,380)||p,near=g.enemies.filter(e=>e.hp>0&&dist(e,p)<330);
 const impact=(e,damage,kind='relic',breakPower=38)=>{g.damage(e,damage*power,kind);if(e.boss&&e.hp>0)staggerBoss(g,e,breakPower);};
 const clear=radius=>{g.projectiles=g.projectiles.filter(b=>b.owner!=='enemy'||dist(b,p)>radius);};
 if(id==='sword'){
  const a=target===p?Math.atan2(p.dy,p.dx):angle(p,target),n=3+Math.min(6,Math.floor(g.swordCount/12));
  for(let i=0;i<n;i++){const b=a+(i-(n-1)/2)*.11;g.shoot('bladeburst',p.x,p.y,Math.cos(b),Math.sin(b),45*power,{speed:480,life:.95,r:10,pierce:6,breakPower:14});}
 }else if(id==='blades'){
  if(target!==p)target.exposed=6;
  for(let i=0;i<6;i++){const a=angle(p,target)+i*.08;g.shoot('blades',p.x,p.y,Math.cos(a),Math.sin(a),38*power,{speed:300,life:2,homing:6,pierce:2,delay:i*.08,breakPower:8});}
 }else if(id==='ring'||id==='fire'){
  const r=id==='ring'?145:110;
  for(const e of g.enemies)if(e.hp>0&&dist(e,target)<r+e.r)impact(e,40+(id==='ring'&&e.burn>0?e.burnDamage*3/power:0),'fire');
  g.zone('firefield',target.x,target.y,r,24*power,5,{interval:.7});
 }else if(id==='cauldron'||id==='magnet'){
  clear(id==='magnet'?330:240);for(const e of near)impact(e,id==='magnet'?60:50,'relic',id==='magnet'?85:65);
  if(id==='magnet')g.hazards=g.hazards.filter(h=>!hazardContains(h,p,300));
  else g.zone('cauldron',p.x,p.y,170,18*power,4,{pull:150});
 }else if(id==='beetles'){
  for(const e of near)e.exposed=7;
  for(let i=0;i<6;i++){const a=i*TAU/6;g.shoot('beetles',p.x,p.y,Math.cos(a),Math.sin(a),17*power,{speed:180,life:6,homing:7,pierce:99,r:8});}
 }else if(id==='spider'){
  g.zone('web',target.x,target.y,145,20*power,6*g.controlScale);
  for(const e of near)if(dist(e,target)<145){e.exposed=5;e.freeze=e.boss?.25:2;impact(e,25,'relic',55);}
 }else if(id==='centipede'||id==='ice'){
  if(id==='ice')clear(280);
  for(const e of near){impact(e,45,'frost',50);e.freeze=Math.max(e.freeze,e.boss?.3:2.5);e.slow=4;if(id==='ice')e.exposed=5;}
 }else if(id==='puppet'){
  for(let i=0;i<3;i++){const a=i*TAU/3,at=safePosition(g.regionIndex,p.x+Math.cos(a)*70,p.y+Math.sin(a)*70,20);g.zone('puppet',at.x,at.y,20,25*power,8,{interval:.5,rank});}
 }else if(id==='dragon'){
  g.move(p,p.dx*145,p.dy*145);p.invuln=Math.max(p.invuln,.8);
  for(const e of near)if(dist(e,p)<190)impact(e,90,'relic',60);
 }
 g.emit('blast',{x:target.x,y:target.y,r:100,color:['ice','centipede'].includes(id)?0x98ddff:0xefcd88});
 g.notify(`${def.name} · 已祭出`);return true;
}
