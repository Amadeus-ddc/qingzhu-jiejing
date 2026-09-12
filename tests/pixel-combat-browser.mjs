import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BattleCore} from '../src2d/core.js';
import {safePosition} from '../src2d/world.js';
import {intent,chooseCard} from './pixel-policy.mjs';
const output=process.env.QA_OUTPUT_DIR||'artifacts/qa/combat-depth',equipment=JSON.parse(await fs.readFile('tests/pixel-late-build.json','utf8'));
await fs.mkdir(output,{recursive:true});
function preset(){const g=new BattleCore({seed:62026});g.start();g.regionIndex=2;g.createRegion();Object.assign(g.player,equipment,{...safePosition(2,0,160,11),hp:155,mana:100,shield:0,skill:0,hidden:0,invuln:0,focus:0,relic:'magnet',stance:'guard'});g.syncSwords();g.time=900;g.regionTime=418;g.bossSpawned=true;g.spawn('sage',0,-120);return g.save();}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--disable-background-timer-throttling']}),errors=[],results=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
  await context.addInitScript(save=>localStorage.setItem('qingzhu-human-run-v2',save),preset());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4174/');await page.waitForFunction(()=>window.qingzhuQA);await page.locator('[data-action="continue"]').click();await page.waitForFunction(()=>window.qingzhuQA.read().mode==='playing');
  // Exercise owned-relic selection in the actual bag and a cooldown-safe switch.
  await page.locator('#bag-button').click();await page.locator('[data-relic="magnet"]').click();await page.locator('[data-action="resume"]').click();
  const press=async(key,id)=>mobile?page.locator('#'+id).tap():page.keyboard.press(key);
  await press('z','stance');await page.waitForFunction(()=>window.qingzhuQA.read().player.stance==='assault');await press('z','stance');await page.waitForFunction(()=>window.qingzhuQA.read().player.stance==='guard');
  await press('c','relic');await page.waitForFunction(()=>window.qingzhuQA.read().player.relicCooldown>0);await press('v','cycleRelic');await page.waitForFunction(()=>window.qingzhuQA.read().player.relic==='cauldron');
  const used=await page.evaluate(()=>window.qingzhuQA.read());assert.ok(used.player.mana<100);assert.ok(used.player.relicCooldown>0);
  await page.locator('#bag-button').click();await page.locator('[data-relic="magnet"]').click();await page.locator('[data-action="resume"]').click();
  const controls=await page.locator('#skills').boundingBox();assert.ok(controls.x>=0&&controls.x+controls.width<=(mobile?844:1440));
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-controls.png`});
  const held=new Set(),shots=new Set(),trace=[];let state,start=Date.now(),touch,touching=false;const joy=mobile?await page.locator('#joystick').boundingBox():null;if(mobile)touch=await context.newCDPSession(page);
  while(Date.now()-start<140000){
   state=await page.evaluate(()=>window.qingzhuQA.read());const boss=state.targets.find(e=>e.boss);trace.push({time:state.time,hp:state.hp,bossHP:boss?.hp,stage:boss?.stage,phase:boss?.bossPhase,attack:boss?.attackKind,casts:state.player.relicCooldown,mana:state.mana,stance:state.player.stance,p95:state.frameMS.p95});
   if(state.bossDead||state.mode==='lost')break;
   if(state.mode==='upgrade'){if(touching){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touching=false;}await page.locator(`[data-upgrade="${chooseCard(state.upgrades)}"]`).click();continue;}
   assert.equal(state.mode,'playing');const a=intent(state),n=Math.hypot(a.x,a.y)||1;
   if(mobile){await touch.send('Input.dispatchTouchEvent',{type:touching?'touchMove':'touchStart',touchPoints:[{x:joy.x+joy.width/2+a.x/n*34,y:joy.y+joy.height/2+a.y/n*34,id:0}]});touching=true;}
   else{const desired=new Set();if(a.x>.3)desired.add('d');if(a.x<-.3)desired.add('a');if(a.y>.3)desired.add('s');if(a.y<-.3)desired.add('w');for(const k of held)if(!desired.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of desired)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
   for(const [key,id,needed]of[['Space','dash',a.dash],['e','skill',a.skill],['q','item',a.item],['c','relic',a.relic],['z','stance',a.stance]])if(needed){if(mobile){if(touching){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touching=false;}await page.locator('#'+id).tap();}else await page.keyboard.press(key);}
   const tag=boss&&`${boss.stage}-${boss.attackKind}`;if(boss?.bossPhase==='windup'&&!shots.has(tag)){shots.add(tag);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${tag}.png`});}
   await page.waitForTimeout(150);
  }
  if(touch){if(touching)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
  const result={mobile,bossDead:state.bossDead,mode:state.mode,seconds:state.time-900,minHP:Math.min(...trace.map(t=>t.hp)),stages:[...new Set(trace.map(t=>t.stage).filter(Boolean))],attacks:[...shots],p95:state.frameMS.p95,trace};results.push(result);console.log(JSON.stringify({...result,trace:undefined}));await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-result.png`});await fs.writeFile(`${output}/browser-combat.json`,JSON.stringify({type:'Real-time final-boss fixture with preset equipment; actual desktop keys and mobile touch, not a normal full run',results,errors},null,2));await context.close();
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);assert.ok(results.every(r=>r.bossDead));assert.ok(results.every(r=>r.stages.includes(3)));
