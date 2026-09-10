export function registerGameTools({read,start,pause,choose}){
 const context=document.modelContext;if(!context?.registerTool)return()=>{};
 const life=new AbortController(),annotations=readOnlyHint=>({readOnlyHint,untrustedContentHint:false});
 const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}};
 const empty=input=>{if(input&&Object.keys(input).length)throw Error('此操作无需参数');};
 register({name:'qingzhu_read_game',title:'读取试炼状态',description:'读取当前角色、区域、法门、飞剑分配和升级选项。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:annotations(true),execute(input){empty(input);return read();}});
 register({name:'qingzhu_start_game',title:'开始新试炼',description:'使用当前选中的角色开始试炼，仅在标题或结算画面且无未完成存档时可用。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:annotations(false),execute(input){empty(input);start();return read();}});
 register({name:'qingzhu_pause_game',title:'暂停或继续试炼',description:'将进行中的试炼暂停，或继续已暂停的试炼。',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:annotations(false),execute(input){if(typeof input?.paused!=='boolean'||Object.keys(input).length!==1)throw Error('paused 必须是布尔值');pause(input.paused);return read();}});
 register({name:'qingzhu_choose_upgrade',title:'选择突破法门',description:'在当前突破的三项选项中选择一项，并继续试炼。index从0开始。',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:2}},required:['index'],additionalProperties:false},annotations:annotations(false),execute(input){if(!Number.isInteger(input?.index)||input.index<0||input.index>2||Object.keys(input).length!==1)throw Error('index 必须为0、1或2');if(!choose(input.index))throw Error('当前没有这一突破选项');return read();}});
 addEventListener('pagehide',()=>life.abort(),{once:true});return()=>life.abort();
}
