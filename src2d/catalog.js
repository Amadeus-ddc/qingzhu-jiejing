export const VERSION=5;
export const SWORD_COUNTS=[1,3,6,12,24,36,48,72];
export const CHARACTERS={
 hanli:{id:'hanli',name:'韩立',epithet:'青竹御剑 · 炼器养灵',color:0x7fe4c9,starter:'sword',hp:110,speed:108,skill:'御剑集火',description:'从一口飞剑炼起。小瓶缩短灵草培养；青竹进阶后，集火附带辟邪神雷。',unlock:0},
 nangong:{id:'nangong',name:'南宫婉',epithet:'朱雀流火 · 焚阵破敌',color:0xffb295,starter:'ring',hp:100,speed:110,skill:'朱雀火域',description:'朱雀环往返灼烧。火域困住敌群，引爆已有灼烧。',unlock:1},
 yinyue:{id:'yinyue',name:'银月',epithet:'狐灵幻术 · 遁影游走',color:0xd5baff,starter:'sword',hp:95,speed:122,skill:'幻影土遁',description:'留下一道诱敌幻影，土遁穿过包围。移动更快，寻宝范围更广。',unlock:2}
};
export const REGIONS=[
 {id:'forest',name:'血色禁地',subtitle:'环山石殿',duration:360,bossAt:240,boss:'dragon',color:0x779776,ground:0x182e2c,accent:0x8ad5a2,enemy:['spider','wolf','snake','ape'],objective:'守护灵圃，取得金雷竹',material:'bamboo'},
 {id:'sea',name:'乱星海',subtitle:'红瑚岛',duration:420,bossAt:300,boss:'carp',color:0x689ca6,ground:0x163139,accent:0x84d8de,enemy:['crab','scorpion','spear','wing'],objective:'引妖猎材，寻得庚精',material:'gold'},
 {id:'temple',name:'虚天殿',subtitle:'内殿迷宫',duration:420,bossAt:300,boss:'sage',color:0x777b9e,ground:0x202536,accent:0xe7c991,enemy:['cultist','golem','ghost','bat'],objective:'突破元婴，炼成最后一式',material:'gold'}
];
export const WEAPONS={
 sword:{name:'青竹蜂云剑',short:'飞剑',icon:'剑',type:'御器',description:'实体飞剑在护卫、追击、镇阵之间分配。金雷竹炼成青竹，庚精开启七十二剑。',max:8,color:0x8ce9c8,interval:1.4,damage:21,range:320},
 blades:{name:'金蚨子母刃',short:'子母刃',icon:'刃',type:'御器',description:'一母带子，连续追踪同一目标。进阶增加子刃，最高一母八子。',max:5,color:0xf2d079,interval:2.2,damage:16,range:330},
 ring:{name:'朱雀环',short:'朱雀环',icon:'环',type:'御器',description:'向敌群掷出回旋朱雀环，沿途留下灼烧。',max:5,color:0xff9f66,interval:2.5,damage:27,range:290},
 cauldron:{name:'虚天鼎',short:'虚天鼎',icon:'鼎',type:'御器',description:'展开收摄之域，将敌人拉向中心并周期震击。',max:5,color:0xa6d7e5,interval:6.4,damage:23,range:250},
 beetles:{name:'噬金虫',short:'噬金虫',icon:'虫',type:'灵虫',description:'虫群持续啃噬一个敌人，击杀后扑向下一个。',max:5,color:0xe2c573,interval:2.8,damage:12,range:300},
 spider:{name:'血玉蜘蛛',short:'血玉蛛',icon:'蛛',type:'灵兽',description:'在敌群脚下结网，留住冲锋的敌人。',max:5,color:0xdc8c9e,interval:4.8,damage:18,range:300},
 centipede:{name:'六翼霜蚣',short:'霜蚣',icon:'霜',type:'灵虫',description:'吐出扇形寒气，短暂冻结目标。',max:5,color:0xb3e6f6,interval:3.8,damage:20,range:260},
 puppet:{name:'傀儡术',short:'傀儡',icon:'偶',type:'傀儡',description:'在附近部署定点傀儡，发射贯穿弩矢。',max:5,color:0xbda685,interval:7.5,damage:21,range:360},
 fire:{name:'火弹术',short:'火弹',icon:'火',type:'法术',description:'投出火弹，命中时爆炸并灼烧周围目标。',max:5,color:0xffab70,interval:2.2,damage:25,range:340},
 ice:{name:'乾蓝冰焰',short:'冰焰',icon:'冰',type:'异火',description:'生成缓慢推进的冰焰，减速并连续侵蚀敌群。',max:5,color:0x8ac9ff,interval:3.4,damage:19,range:330},
 magnet:{name:'元磁神光',short:'元磁',icon:'磁',type:'神通',description:'五色神光扫过一条直线，截断弹幕并压制敌人。',max:5,color:0xd6b4f3,interval:4.6,damage:39,range:350},
 dragon:{name:'乌龙夺',short:'乌龙夺',icon:'夺',type:'御器',description:'双器交错穿透，再折返手中，适合清理狭长敌群。',max:5,color:0xaab5cb,interval:3,damage:25,range:340}
};
export const PASSIVES={
 qingyuan:{name:'青元剑诀',icon:'诀',description:'御器伤害每重提高12%，飞剑护卫范围扩大。',max:5},
 dayan:{name:'大衍诀',icon:'衍',description:'提高自动出招速度，延长傀儡驻留时间。',max:5},
 chongyuan:{name:'三转重元功',icon:'元',description:'灵力上限与回复增长，手动法术威力提高。',max:5},
 mingwang:{name:'明王诀',icon:'体',description:'生命上限增长，受伤略减，突破时恢复生命。',max:5},
 xuanyin:{name:'玄阴经',icon:'阴',description:'控制持续时间延长，击杀缓慢回复生命。',max:5},
 sunv:{name:'素女轮回功',icon:'轮',description:'火系灼烧更强，每次闪避缩短角色法术冷却。',max:5}
};
export const CONSUMABLES={
 shield:{name:'金刚符',icon:'御',description:'获得能抵挡伤害的护盾。'},
 hide:{name:'隐身符',icon:'隐',description:'短暂隐身，敌人失去追踪。'},
 burrow:{name:'遁地符',icon:'遁',description:'沿移动方向穿行一段距离。'},
 thunder:{name:'连珠雷符',icon:'雷',description:'落下三道雷击，轰击周围强敌。'},
 ice:{name:'冰弹符',icon:'寒',description:'冻结近处敌人，并击碎敌方弹幕。'},
 brick:{name:'金光砖符宝',icon:'宝',description:'金砖砸落在最强敌人处，造成大范围伤害。'}
};
export const ENEMIES={
 spider:{name:'毒蛛',atlas:'forest',row:0,hp:30,speed:46,r:12,damage:11,behavior:'web',xp:2},
 wolf:{name:'山狼',atlas:'forest',row:1,hp:33,speed:78,r:13,damage:12,behavior:'chase',xp:2},
 snake:{name:'赤鳞蟒',atlas:'forest',row:2,hp:48,speed:49,r:14,damage:14,behavior:'shoot',xp:3},
 ape:{name:'妖猿',atlas:'forest',row:3,hp:92,speed:44,r:18,damage:18,behavior:'charge',xp:5},
 crab:{name:'蟹妖',atlas:'sea',row:0,hp:65,speed:32,r:17,damage:12,behavior:'chase',xp:3},
 scorpion:{name:'海蝎',atlas:'sea',row:1,hp:54,speed:42,r:15,damage:12,behavior:'web',xp:3},
 spear:{name:'海族枪卫',atlas:'sea',row:2,hp:60,speed:42,r:14,damage:15,behavior:'charge',xp:4},
 wing:{name:'翼蛇',atlas:'sea',row:3,hp:42,speed:57,r:12,damage:11,behavior:'shoot',xp:3},
 cultist:{name:'持幡邪修',atlas:'temple',row:0,hp:68,speed:33,r:13,damage:15,behavior:'shoot',xp:4},
 golem:{name:'古殿傀儡',atlas:'temple',row:1,hp:140,speed:27,r:20,damage:19,behavior:'charge',xp:6},
 ghost:{name:'幽魂',atlas:'temple',row:2,hp:52,speed:49,r:13,damage:13,behavior:'web',xp:4},
 bat:{name:'妖蝠',atlas:'temple',row:3,hp:37,speed:68,r:11,damage:10,behavior:'chase',xp:3},
 dragon:{name:'墨蛟',atlas:'bosses',row:0,hp:5800,speed:58,r:43,damage:28,behavior:'boss',xp:140,boss:true},
 carp:{name:'婴鲤兽',atlas:'bosses',row:1,hp:22000,speed:54,r:44,damage:29,behavior:'boss',xp:180,boss:true,guard:.45},
 sage:{name:'玄骨上人',atlas:'xuangu',row:0,hp:52000,speed:60,r:24,damage:32,behavior:'boss',xp:250,boss:true,guard:.45}
};
export const SOURCES=[
 {label:'金蚨子母刃与玄铁飞天盾',url:'https://www.readnovel.com/chapter/22305390000123802/95801083784870020'},
 {label:'小瓶催熟金雷竹',url:'https://www.wuxiaworld.com/novel/rmji/rmji-chapter-412'},
 {label:'三十六剑与大庚剑阵',url:'https://www.wuxiaworld.com/novel/rmji/rmji-chapter-788/'},
 {label:'旗盘与颠倒五行阵',url:'https://lite.wuxiaworld.com/novel/rmji/rmji-chapter-231'},
 {label:'银月的幻术',url:'https://www.wuxiaworld.com/novel/rmji/rmji-chapter-640/'}
];
