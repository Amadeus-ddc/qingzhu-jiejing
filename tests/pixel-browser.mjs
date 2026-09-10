import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import {chooseCard,intent,eventChoice} from './pixel-policy.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const output=process.env.QA_OUTPUT_DIR||'artifacts/qa';
await fs.mkdir(output,{recursive:true});
for(const id of ['hanli','nangong','yinyue','xuangu','forest','sea','temple','bosses','props','worldkit-forest','worldkit-sea','worldkit-temple']){while(true){try{await fs.access(`assets/pixel/${id}.png`);break;}catch{await sleep(1000);}}}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--remote-debugging-port=9230','--disable-background-timer-throttling','--disable-renderer-backgrounding','--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e));});
await page.goto('http://127.0.0.1:4174/');await page.waitForFunction(()=>window.qingzhuQA,{timeout:90000});
await page.screenshot({path:`${output}/pixel-title-desktop.png`});
await page.locator('[data-action="start"]').click();
await page.waitForFunction(()=>window.qingzhuQA.read().mode==='playing');
await page.keyboard.press('p');const paused=await page.evaluate(()=>window.qingzhuQA.read());await sleep(600);const afterPause=await page.evaluate(()=>window.qingzhuQA.read());if(paused.time!==afterPause.time)throw Error('Pause advanced time');
await page.keyboard.press('p');await page.keyboard.press('Tab');await page.screenshot({path:`${output}/pixel-bag-desktop.png`});await page.locator('[data-slot="1"]').click();await page.locator('[data-consumable="ice"]').click();await page.locator('[data-slot="0"]').click();await page.locator('[data-consumable="shield"]').click();await page.locator('[data-action="resume"]').click();
const held=new Set();async function release(){for(const k of held)await page.keyboard.up(k);held.clear();}
let lastLog=-30,lastShot=-60,didReload=false,firstUpgrade=false,lastState,wallStart=Date.now(),bossShot=new Set(),arrayShot=new Set();const trace=[],bossTrace=[],minHP={};
while(Date.now()-wallStart<35*60*1000){
 const s=await page.evaluate(()=>window.qingzhuQA.read());lastState=s;minHP[s.regionIndex]=Math.min(minHP[s.regionIndex]??Infinity,s.hp);const visibleBoss=s.targets.find(t=>t.boss);if(visibleBoss)bossTrace.push({time:s.time,player:{x:s.player.x,y:s.player.y},...visibleBoss});
 if(s.mode==='playing'){
  const a=intent(s),desired=new Set();if(a.x>.3)desired.add('d');if(a.x<-.3)desired.add('a');if(a.y>.3)desired.add('s');if(a.y<-.3)desired.add('w');
  for(const k of held)if(!desired.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of desired)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  if(a.dash)await page.keyboard.press('Space');if(a.skill)await page.keyboard.press('e');if(a.item)await page.keyboard.press('q');if(a.interact)await page.keyboard.press('r');
  if(s.time-lastLog>=30){lastLog=s.time;const row={mode:s.mode,time:s.time,region:s.region,hp:s.hp,level:s.level,kills:s.kills,weapons:s.weapons,frameMS:s.frameMS,enemies:s.enemies,goal:a.goal,x:Math.round(s.player.x),y:Math.round(s.player.y)};trace.push(row);console.log(JSON.stringify(row));await fs.writeFile(`${output}/pixel-browser-progress.json`,JSON.stringify(row,null,2));}
  if(s.time-lastShot>=90){lastShot=s.time;await page.screenshot({path:`${output}/pixel-play-${String(Math.floor(s.time)).padStart(4,'0')}.png`});}
  const boss=s.targets.find(t=>t.boss);if(boss&&!bossShot.has(boss.kind)){bossShot.add(boss.kind);await page.screenshot({path:`${output}/pixel-boss-${boss.kind}.png`});}
  if(boss&&!s.array&&s.player.spirit>=15&&Math.hypot(boss.x-s.player.x,boss.y-s.player.y)<350){
   const flags=s.flags||[],p=s.player,d=q=>Math.hypot(q.x-p.x,q.y-p.y);let place=flags.length===0;
   if(flags.length===1)place=d(flags[0])>105&&d(flags[0])<280;
   if(flags.length===2){const [a,b]=flags;place=flags.every(q=>d(q)>60&&d(q)<300)&&Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/2>3500;}
   if(place)await page.keyboard.press('f');
   else if(flags.some(q=>d(q)>320)){await page.keyboard.down('f');await sleep(650);await page.keyboard.up('f');}
  }
  if(s.array&&!arrayShot.has(`${s.regionIndex}-${s.array.kind}`)){arrayShot.add(`${s.regionIndex}-${s.array.kind}`);await page.screenshot({path:`${output}/pixel-live-array-${s.regionIndex}-${s.array.kind}.png`});}

  if(s.time>55&&!didReload){await release();await page.keyboard.press('p');const before=await page.evaluate(()=>window.qingzhuQA.read());await page.reload();await page.waitForFunction(()=>window.qingzhuQA);await page.locator('[data-action="continue"]').click();const after=await page.evaluate(()=>window.qingzhuQA.read());if(Math.abs(after.time-before.time)>.2||after.swordCount!==before.swordCount||after.level!==before.level)throw Error('Reload did not restore run');didReload=true;console.log('Verified pause -> reload -> continue');}
 }else{
  await release();
  if(s.mode==='upgrade'){if(!firstUpgrade){await page.screenshot({path:`${output}/pixel-upgrade-desktop.png`});firstUpgrade=true;}await page.locator(`[data-upgrade="${chooseCard(s.upgrades)}"]`).click();}
  else if(s.mode==='event'){
   const options=await page.locator('[data-event]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.event,disabled:n.disabled})));
   const id=eventChoice(options,s.player);await page.locator(id==='leave'?'[data-action="leave"]':`[data-event="${id}"]`).click();
  }else if(s.mode==='transition'){await page.screenshot({path:`${output}/pixel-transition-${s.regionIndex}.png`});await page.locator('[data-action="next"]').click();}
  else if(s.mode==='paused'){await page.locator('[data-action="resume"]').click();}
  else if(['won','lost'].includes(s.mode)){await page.screenshot({path:`${output}/pixel-result-${s.mode}.png`});break;}
 }
 await sleep(180);
}
await release();const result={type:'Real-time Chromium play with normal keyboard and UI actions; no state mutation',wallSeconds:(Date.now()-wallStart)/1000,saveReloadVerified:didReload,liveArrays:[...arrayShot],errors,trace,minHP,bossTrace,final:lastState};await fs.writeFile(`${output}/pixel-browser-run.json`,JSON.stringify(result,null,2));console.log('FINAL',JSON.stringify({mode:lastState.mode,time:lastState.time,region:lastState.region,hp:lastState.hp,level:lastState.level,errors}));
await fs.writeFile(`${output}/pixel-browser-storage.json`,JSON.stringify(await page.context().storageState(),null,2));
await browser.close();
