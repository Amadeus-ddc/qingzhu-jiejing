// A fixed encounter score: player HP, damage, build and kill rate never affect it.
// Design references (interpretation, not a reproduction of their wave tables):
// https://gameinformer.com/review/vampire-survivors/single-stick-masterpiece
// https://www.nintendolife.com/reviews/switch-eshop/vampire-survivors
// https://www.nintendo.com/jp/topics/article/3f3d9c44-6cc5-4197-a31b-1397f229c03b
// Movement and weapon coverage create the decisions; dense, fragile enemies let
// growth become visible. Quiet windows make collecting and exploration viable.
// The developer's interview describes a natural endpoint, not endless escalation.

const phase=(start,id,name,interval,batch,pool,hpScale,speedScale,formation,warning='',elite=false)=>({start,id,name,interval,batch,pool,hpScale,speedScale,formation,warning,elite});
const score=[
 {
  id:'forest',duration:360,
  // Poison spiders / wolves / shooting snakes / charging apes.
  phases:[
   phase(0,'harvest-1','蛛潮初起',1.5,2,[0,0,1],.6,.9,'arc'),
   phase(20,'pressure-1','狼群截路',.95,3,[1,1,2],.95,1,'arc','狼群将沿前路截入，准备闪避扑袭'),
   phase(52,'rest-1','林隙回息',3,1,[0],.65,.85,'arc'),
   phase(68,'reward-1','妖猿携宝',30,1,[3],1,1,'arc','携宝妖猿将至，击败可得灵材',true),
   phase(86,'harvest-2','灵草引群',.85,4,[0,1,1],.8,1,'ring','散妖将汇入林间，寻找可穿过的空隙'),
   phase(118,'pressure-2','猿群压道',1,3,[3,3,2],1.08,1,'line','妖猿与毒蟒将截住前路，避开冲锋与预瞄毒弹'),
   phase(152,'rest-2','山风暂歇',3,1,[0],.65,.85,'arc'),
   phase(168,'reward-2','赤蟒守藏',30,1,[2],1.1,1,'arc','携宝赤蟒将至，借树石挡住毒弹',true),
   phase(186,'harvest-3','百兽出谷',.85,6,[0,1,1],.78,1,'ring','散妖将涌出密林，清出一条退路'),
   phase(224,'approach','石殿前息',4,1,[0],.6,.8,'arc'),
   phase(240,'boss-entry','墨蛟现身',2,1,[1],.7,.95,'arc','墨蛟循灵息而来，留意突进、毒息与毒潭'),
   phase(260,'boss-harvest','殿外兽潮',.9,5,[0,1,1],.75,1,'ring','殿外散妖将聚来，清出躲避墨蛟的空地'),
   phase(284,'boss-pressure','毒蟒掠阵',1,3,[2,3],1.05,1,'line','毒蟒与妖猿将截路，避开冲锋与毒弹'),
   phase(310,'boss-rest','蛟息渐缓',4,1,[0],.6,.8,'arc'),
   phase(328,'boss-final','石殿决阵',1,4,[1,1,2],.9,1,'arc','最后一股余妖将至，留出迎战墨蛟的退路'),
  ],
 },
 {
  id:'sea',duration:420,
  // Chasing crabs / web scorpions / charging spearmen / shooting winged snakes.
  // Tides reverse the sequence: the second hard line precedes a harvest burst.
  phases:[
   phase(0,'harvest-1','退潮拾贝',.9,4,[0,0,1],.48,.84,'arc'),
   phase(28,'pressure-1','枪潮压礁',1.2,2,[2,2,3],.94,.98,'line','枪卫将沿礁径压来，先离开狭口'),
   phase(52,'rest-1','潮落采珊',4,1,[0],.5,.8,'arc'),
   phase(76,'reward-1','护礁蟹王',30,1,[0],1.05,.9,'arc','护礁蟹王将至，击败可得灵材',true),
   phase(94,'harvest-2','两岸归潮',1,6,[0,1,1],.5,.86,'ring','两岸散妖将归潮，可从开阔礁岸收割'),
   phase(126,'pressure-2','翼蛇封湾',1.15,2,[3,3,1],.94,1,'arc','翼蛇将封住湾口，横向移动躲开毒弹'),
   phase(150,'rest-2','沿岸回息',4,1,[0],.48,.8,'arc'),
   phase(180,'pressure-3','护礁蟹阵',1.1,2,[0,0,2],1.12,.92,'line','硬甲蟹阵将压来，借岔口绕过正面'),
   phase(206,'harvest-3','霓草引群',.75,6,[0,1,1],.46,.88,'ring','霓草将引来散妖，清场后收回灵气'),
   phase(228,'reward-2','海将携藏',30,1,[2],.94,.96,'arc','携藏海将将至，留开冲锋落点',true),
   phase(246,'rest-3','小潮拾遗',4,1,[0],.48,.8,'arc'),
   phase(274,'pressure-4','彩礁双潮',.9,3,[1,2,3],.9,.96,'arc','两股妖潮将汇向彩礁，勿久留桥口'),
   phase(300,'boss-entry','婴鲤现身',2,1,[0],.5,.84,'arc','婴鲤兽将现身中央彩礁，先留出撤离礁径'),
   phase(320,'boss-harvest','碎浪拾灵',1,6,[0,1,1],.48,.88,'ring','碎浪将带来散妖，可沿礁缘清场拾灵'),
   phase(344,'boss-pressure','海枪截流',1,2,[2,3],.92,.98,'line','海枪将截住礁径，先穿过空隙再迎敌'),
   phase(364,'boss-rest','浪歇礁明',4,1,[0],.48,.8,'arc'),
   phase(398,'boss-final','彩礁决阵',1,3,[0,1,3],.8,.94,'arc','最后一股海妖将至，保持通往岸边的退路'),
  ],
 },
 {
  id:'palace',duration:420,
  // Shooting cultists / charging stone golems / web ghosts / fast chasing bats.
  // Straight bat flights reward piercing attacks; staggered hard lines encourage
  // taking a side passage instead of repeating an open-field circle forever.
  phases:[
   phase(0,'harvest-1','殿门散蝠',1,5,[3,3,2],.55,.84,'arc'),
   phase(20,'pressure-1','甬道石卫',1.2,2,[1,1,0],.94,.94,'line','石卫将压入甬道，提前找好侧路'),
   phase(44,'rest-1','灯尽息阵',4,1,[3],.48,.78,'arc'),
   phase(76,'reward-1','狼首守匣',30,1,[1],.88,.9,'arc','守匣傀儡将至，击败可得灵材',true),
   phase(92,'harvest-2','蝠潮穿殿',.75,6,[3,3,3,2],.55,.9,'line','蝠潮将穿过长廊，可沿直道贯穿收割'),
   phase(116,'pressure-2','幽魂绕后',1.2,3,[2,2,0],.94,1,'arc','幽魂将从侧廊汇来，勿退入死角'),
   phase(138,'rest-2','冷灯拾遗',4,1,[3],.5,.78,'arc'),
   phase(162,'pressure-3','幡阵封门',1.1,2,[0,0,1],1.05,.94,'line','持幡邪修将封住长廊，借石壁断开射线'),
   phase(182,'harvest-3','碎阵灵气',.8,6,[3,3,2],.56,.9,'ring','散蝠与残魂将汇来，沿空出的甬道收割'),
   phase(216,'reward-2','邪修藏器',30,1,[0],.98,.94,'arc','藏器邪修将至，绕过石壁追取灵材',true),
   phase(234,'rest-3','古殿回息',4,1,[3],.48,.78,'arc'),
   phase(266,'pressure-4','石卫封路',.9,2,[1,0],1,.94,'line','最后一队石卫将封路，先留好折返空间'),
   phase(282,'approach','玄骨将临',4,1,[3],.48,.78,'arc'),
   phase(300,'boss-entry','玄骨现身',2.5,1,[3],.52,.84,'arc','玄骨将现身内殿深处，先收拢身旁余妖'),
   phase(324,'boss-harvest','万蝠穿堂',.75,6,[3,3,2],.52,.88,'line','散蝠将穿过殿堂，借贯穿攻击收回灵气'),
   phase(346,'boss-pressure','幡影合流',1.1,2,[0,2],.9,.96,'arc','幡影与幽魂将合流，沿侧廊错开攻势'),
   phase(368,'boss-rest','残灯回息',4,1,[3],.48,.78,'arc'),
   phase(398,'boss-final','内殿决阵',1.1,3,[3,0,2],.78,.94,'line','最后一股殿中余妖将至，保留转身的侧路'),
  ],
 },
];

/**
 * Returns the current timed spawn prescription; consumes no RNG and no state.
 *
 * Integration contract:
 * - Reset the spawn timer when phaseId changes. A batch may spawn only up to the
 *   remaining places under the live enemy cap of 300; never queue missed batches.
 * - pool entries are indices in REGIONS[regionIndex].enemy. Repeats are weights.
 * - hpScale/speedScale multiply catalog values for these regular spawned enemies,
 *   replacing the former universal HP time ramp. Keep existing elite modifiers.
 *   Do not apply these fields to the separately scheduled arena boss.
 * - An elite phase has batch=1 and interval longer than the entire phase. Spawn
 *   at most one marked elite per phaseId (persist that fact across saves). Its
 *   existing defeat reward supplies the promised material; no reward is granted
 *   merely for reaching its timestamp or for outliving it.
 * - formation describes intent. Core chooses safe positions, keeps spawns off
 *   screen and respects the authored terrain; this module never teleports bodies.
 * - warn is present for the 5 seconds before a signaled phase. Dedupe a notice by
 *   warn.phaseId; its seconds/text can also drive a live countdown without spam.
 */
export function encounter(regionIndex,regionTime){
 if(!Number.isInteger(regionIndex)||!score[regionIndex])throw new RangeError('Unknown encounter region');
 if(!Number.isFinite(regionTime))throw new RangeError('Encounter time must be finite');
 const region=score[regionIndex],time=Math.max(0,regionTime);
 if(time>=region.duration)return{name:'余妖散尽',phaseId:`${region.id}:settled`,interval:1,batch:0,pool:[],hpScale:1,speedScale:1,formation:'arc',elite:false};
 let index=0;while(index+1<region.phases.length&&time>=region.phases[index+1].start)index++;
 const current=region.phases[index],next=region.phases[index+1];
 const result={name:current.name,phaseId:`${region.id}:${current.id}`,interval:current.interval,batch:current.batch,pool:[...current.pool],hpScale:current.hpScale,speedScale:current.speedScale,formation:current.formation,elite:current.elite};
 if(next?.warning&&time>=next.start-5){
  const seconds=Math.ceil(next.start-time);
  result.warn={phaseId:`${region.id}:${next.id}`,name:next.name,seconds,text:`${seconds}息后 · ${next.warning}`,formation:next.formation};
 }
 return result;
}
