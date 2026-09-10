import {CHARACTERS,WEAPONS,SWORD_COUNTS} from './catalog.js';

const fmt=n=>Number(n.toFixed(2)).toString();
const pct=n=>(Math.round((n+1e-9)*10)/10).toString();
const change=(a,b,unit='')=>`${fmt(a)}→${fmt(b)}${unit}`;
const multiplier=(a,b)=>`×${fmt(a)}→×${fmt(b)}`;
const implementsQingyuan=['sword','blades','ring','cauldron','dragon'];
const chilledWeapons=['spider','centipede','ice'];
const ownedNames=(p,ids)=>ids.filter(id=>p.weapons[id]).map(id=>id==='sword'&&!p.swordCrafted?'飞剑':WEAPONS[id].short);
const namesLine=(prefix,names)=>names.length?`${prefix}${names.slice(0,2).join('、')}${names.length>2?`等${names.length}件法门`:''}`:'';

function slotCopy(p,u){
 if(u.type==='supply')return '即时补给 · 不占法门槽';
 const source=u.type==='weapon'?p.weapons:p.passives,label=u.type==='weapon'?'攻击槽':'功法槽',occupied=Object.keys(source).length;
 if(source[u.id])return `${label}已占 ${occupied}/4 · 原位精进`;
 return occupied===3?`占用最后${label} · 4/4`:`新占${label} · ${occupied}→${occupied+1}/4`;
}

function weaponSynergy(p,id){
 const a=p.passives;
 if(['ring','fire'].includes(id)&&a.sunv)return `素女轮回功 · 灼烧伤害 ×${fmt(1+a.sunv*.18)}`;
 if(chilledWeapons.includes(id)&&a.xuanyin)return `玄阴经 · 控制时长 ×${fmt(1+a.xuanyin*.15)}`;
 if(id==='puppet'&&a.dayan)return `大衍诀 · 傀儡持续 ×${fmt(1+a.dayan*.08)}`;
 if(implementsQingyuan.includes(id)&&a.qingyuan)return `青元剑诀 · 本器伤害 ×${fmt(1+a.qingyuan*.12)}`;
 if(a.dayan)return `大衍诀 · 出招间隔 ×${fmt(1/(1+a.dayan*.075))}`;
 return '';
}

// Describes the actual before/after state, using combat.js and core.js formulas.
// Rank damage is additive to the rank-one coefficient, not +30% multiplicatively
// at every rank. Radius/width values use the game's own distance units.
export function upgradeDetails(g,u){
 const p=g.player,rank=u.rank,slot=slotCopy(p,u);
 if(u.type==='supply'){
  if(u.id==='heal'){const recovered=Math.min(30,p.maxHp-p.hp);return{headline:`回复 ${fmt(recovered)} 生命`,detail:`生命 ${change(p.hp,p.hp+recovered)}；最多回复30，超出上限不保留。`,synergy:'',slot};}
  return{headline:'灵石 +35',detail:`灵石 ${change(p.spirit,p.spirit+35)}，可用于炼器、机缘与布阵。`,synergy:'',slot};
 }
 if(u.type==='weapon'){
  const prev=p.weapons[u.id]||0,isNew=prev===0;
  const growth=prev?`单次伤害 +${pct(((1+(rank-1)*.3)/(1+(prev-1)*.3)-1)*100)}%` :'';
  const duration=r=>(6+r*.65)*(1+(p.passives.dayan||0)*.08);
  const countBlades=r=>Math.min(9,1+r*2),fireCount=r=>r>=4?2:1;
  const purposes={
   sword:'绕身护卫，自动追击近敌；一口剑同时只能执行一种任务。',
   blades:'朝近敌连续放出追踪飞刃，集中火力，也能击中邻近目标。',
   ring:'朝近敌掷出朱雀环，往返穿过敌群，命中附带灼烧。',
   cauldron:'在近敌位置展开收摄领域，牵引敌群并持续震击。',
   beetles:'多只灵虫自动追踪附近敌人，持续啃噬并反复命中。',
   spider:'在近敌脚下结网，持续减速并伤敌，为走位留下时间。',
   centipede:'朝近敌扇形吐出寒气，贯穿敌群并短暂冻结。',
   puppet:'身旁布置固定傀儡，每0.9秒瞄准近敌发射贯穿弩矢。',
   fire:'朝近敌发射火弹，命中后爆炸，点燃周围敌人。',
   ice:'慢速冰焰穿过敌群，减速并对同一目标反复造成伤害。',
   magnet:'朝近敌射出直线神光，同时清除束线附近的敌弹。',
   dragon:'向近敌交错掷出双器，去程与回程分别贯穿敌群。'
  };
  let headline='',detail='';
  switch(u.id){
   case 'sword':headline=isNew?'获得 1 口飞剑':`飞剑 ${change(SWORD_COUNTS[prev-1],SWORD_COUNTS[rank-1],' 口')}`;detail=`${growth}；${p.arrayRecipe?'分担护卫、追击与镇阵':'轮流绕身护卫、自动追击'}。`;break;
   case 'blades':headline=isNew?`每轮 ${countBlades(rank)} 枚飞刃`:countBlades(prev)!==countBlades(rank)?`每轮飞刃 ${change(countBlades(prev),countBlades(rank),' 枚')}`:growth;detail=countBlades(prev)!==countBlades(rank)?`${growth}${prev<4&&rank>=4?'；每刃贯穿 1→2 敌。':'；每轮依次放出。'}`:'数量保持9枚，每刃的命中伤害提高。';break;
   case 'ring':headline=`回旋环半径 ${isNew?fmt(19+rank*2):change(19+prev*2,19+rank*2)}`;detail=`${growth}；往返命中与灼烧一并增强。`;break;
   case 'cauldron':headline=`收摄半径 ${isNew?fmt(52+rank*9):change(52+prev*9,52+rank*9)}`;detail=`驻留 ${change(3.5+prev*.35,3.5+rank*.35,' 秒')}；${growth}。`;break;
   case 'beetles':headline=isNew?`放出 ${2+rank} 只灵虫`:`灵虫 ${change(2+prev,2+rank,' 只')}`;detail=`存留 ${change(4.5+prev*.45,4.5+rank*.45,' 秒')}；${growth}。`;break;
   case 'spider':headline=`蛛网半径 ${isNew?fmt(52+rank*9):change(52+prev*9,52+rank*9)}`;detail=`${growth}；每张网持续 ${fmt(4.5*(1+(p.passives.xuanyin||0)*.15))} 秒。`;break;
   case 'centipede':headline=isNew?`扇形寒气 ${3+rank} 道`:`寒气 ${change(3+prev,3+rank,' 道')}`;detail=`每道贯穿 ${change(3+prev,3+rank,' 敌')}；${growth}。`;break;
   case 'puppet':headline=`傀儡驻留 ${isNew?fmt(duration(rank)):change(duration(prev),duration(rank))} 秒`;detail=`${2+Math.floor(prev/2)!==2+Math.floor(rank/2)?`弩矢贯穿 ${change(2+Math.floor(prev/2),2+Math.floor(rank/2),' 敌')}；`:''}${growth}。`;break;
   case 'fire':headline=isNew?'每轮 1 枚火弹':fireCount(prev)!==fireCount(rank)?'火弹 1→2 枚':`爆炸半径 ${change(35+prev*6,35+rank*6)}`;detail=`${fireCount(prev)!==fireCount(rank)?`爆炸半径 ${change(35+prev*6,35+rank*6)}；`:''}${growth}。`;break;
   case 'ice':headline=`冰焰半径 ${isNew?fmt(25+rank*3):change(25+prev*3,25+rank*3)}`;detail=`${growth}；慢速穿群，对同一目标可反复命中。`;break;
   case 'magnet':headline=`伤敌束宽 ${isNew?fmt((18+rank*3)*2):change((18+prev*3)*2,(18+rank*3)*2)}`;detail=`${growth}；清弹范围保持不变。`;break;
   case 'dragon':headline=`每程贯穿 ${isNew?fmt(8+rank):change(8+prev,8+rank)} 敌`;detail=`${growth}；双器往返时分别计算贯穿次数。`;break;
  }
  return{headline,detail:isNew?purposes[u.id]:detail,synergy:weaponSynergy(p,u.id),slot};
 }
 const prev=p.passives[u.id]||0;
 let headline='',detail='',synergy='';
 switch(u.id){
  case 'qingyuan':
   headline=`御器伤害 ${multiplier(1+prev*.12,1+rank*.12)}`;
   detail=p.weapons.sword&&SWORD_COUNTS[p.weapons.sword-1]>1?`多剑护卫半径 +${(rank-prev)*2}；加持本局御器类法门。`:'仅强化飞剑、子母刃、朱雀环、虚天鼎与乌龙夺。';
   synergy=namesLine('当前受益 · ',ownedNames(p,implementsQingyuan));break;
  case 'dayan':
   headline=`出招间隔 −${pct((1-(1+prev*.075)/(1+rank*.075))*100)}%`;
   detail='按当前间隔缩短，影响飞剑追击与自动法门；角色法术冷却不变。';
   if(p.weapons.puppet)synergy=`傀儡驻留 ${change((6+p.weapons.puppet*.65)*(1+prev*.08),(6+p.weapons.puppet*.65)*(1+rank*.08),' 秒')}`;
   break;
  case 'chongyuan':{
   headline=`灵力上限 ${change(p.maxMana,p.maxMana+15)}`;
   detail=`每秒回复 ${change(3.5+prev*.65,3.5+rank*.65)}；即刻回复 ${fmt(Math.min(25,p.maxMana+15-p.mana))} 灵力。`;
   const bonus=pct(((1+rank*.14)/(1+prev*.14)-1)*100);
   if(g.character==='hanli'&&p.swordCrafted)synergy=`御剑集火的起手落雷伤害 +${bonus}%`;
   if(g.character==='nangong')synergy=`朱雀火域每跳伤害 +${bonus}%`;
   if(g.character==='yinyue')synergy=`诱敌幻影每跳伤害 +${bonus}%`;
   break;
  }
  case 'mingwang':
   headline=`生命上限 ${change(p.maxHp,p.maxHp+9)}`;
   detail=`受伤减免 ${change(prev*3.5,rank*3.5,'%')}；即刻回复 ${fmt(Math.min(20,p.maxHp+9-p.hp))} 生命。`;break;
  case 'xuanyin':
   headline=`控制时长 ${multiplier(1+prev*.15,1+rank*.15)}`;
   detail=`强化蛛网、霜蚣与冰焰；非首领击杀回血 ${change(prev*.07,rank*.07)}。`;
   synergy=namesLine('当前受益 · ',ownedNames(p,chilledWeapons));break;
  case 'sunv':
   headline=`灼烧伤害 ${multiplier(1+prev*.18,1+rank*.18)}`;
   detail=`每次闪避缩短角色法术冷却 ${change(prev*.6,rank*.6,' 秒')}。`;
   synergy=namesLine('当前受益 · ',[...ownedNames(p,['ring','fire']),...(g.character==='nangong'?[CHARACTERS.nangong.skill]:[])]);break;
 }
 return{headline,detail,synergy,slot};
}
