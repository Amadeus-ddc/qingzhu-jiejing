import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chooseCard,intent,eventChoice} from './pixel-policy.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--disable-background-timer-throttling']});
const output='artifacts/qa/player-feedback';await fs.mkdir(output,{recursive:true});
const errors=[],checks=[],trace=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4174/');await page.waitForFunction(()=>window.qingzhuQA);
  await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>window.qingzhuQA.read().mode==='playing');
  await page.locator('#objective').waitFor({state:'visible'});await page.locator('#encounter-hint').waitFor({state:'visible'});
  assert.equal(await page.locator('#challenge-boss').isVisible(),false);
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-start.png`});
  if(mobile){
   const box=await page.locator('#joystick').boundingBox(),before=await page.evaluate(()=>window.qingzhuQA.read().player.x),cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-8,y:box.y+box.height/2,id:0}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(await page.evaluate(()=>window.qingzhuQA.read().player.x)>before+20);await cdp.detach();
   // Reuse the real desktop run's earned save to check the mobile challenge dialog.
   const save=await fs.readFile(`${output}/earned-run.json`,'utf8');
   await context.addInitScript(save=>localStorage.setItem('qingzhu-human-run-v2',save),save);await page.reload();await page.waitForFunction(()=>window.qingzhuQA);await page.locator('[data-action="continue"]').click();
  }else{
   const held=new Set();let lastLog=-15,started=Date.now();
   while(Date.now()-started<160000){
    const s=await page.evaluate(()=>window.qingzhuQA.read());
    if(s.mode==='playing'&&s.regionTime>=61)break;
    assert.notEqual(s.mode,'lost','normal opening policy died before 60 seconds');
    const action=s.mode==='playing'?intent({...s,targets:s.targets}):{},wanted=new Set();
    if(action.x>.3)wanted.add('d');if(action.x<-.3)wanted.add('a');if(action.y>.3)wanted.add('s');if(action.y<-.3)wanted.add('w');
    for(const k of held)if(!wanted.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
    if(s.mode==='playing'){
     for(const [a,k]of [['dash','Space'],['skill','e'],['item','q'],['interact','r']])if(action[a])await page.keyboard.press(k);
     if(s.time-lastLog>=15){lastLog=s.time;const row={time:s.time,hp:s.hp,level:s.level,kills:s.kills,enemies:s.enemies};trace.push(row);console.log(JSON.stringify(row));}
    }else if(s.mode==='upgrade')await page.locator(`[data-upgrade="${chooseCard(s.upgrades)}"]`).click();
    else if(s.mode==='event'){const options=await page.locator('[data-event]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.event,disabled:n.disabled})));const id=eventChoice(options,s.player);await page.locator(id==='leave'?'[data-action="leave"]':`[data-event="${id}"]`).click();}
    await page.waitForTimeout(100);
   }
   for(const k of held)await page.keyboard.up(k);
   assert.ok((await page.evaluate(()=>window.qingzhuQA.read())).regionTime>=61);
   await page.locator('#pause-button').click();await fs.writeFile(`${output}/earned-run.json`,await page.evaluate(()=>localStorage.getItem('qingzhu-human-run-v2')));await page.locator('[data-action="resume"]').click();
  }
  await page.locator('#challenge-boss').waitFor({state:'visible'});
  const button=await page.locator('#challenge-boss').boundingBox();assert.ok(button.y+button.height<(mobile?390:900));
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-ready.png`});
  await page.locator('#challenge-boss').click();assert.equal(await page.locator('[data-action="challenge"]').isVisible(),true);
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-challenge.png`});
  await page.locator('[data-action="resume"]').click();assert.ok((await page.evaluate(()=>window.qingzhuQA.read())).regionTime<100);
  await page.locator('#challenge-boss').click();const before=await page.evaluate(()=>window.qingzhuQA.read());await page.locator('[data-action="challenge"]').click();
  const after=await page.evaluate(()=>window.qingzhuQA.read());assert.ok(after.regionTime>=235&&after.regionTime<237);assert.ok(after.time-before.time<1);await page.locator('#challenge-boss').waitFor({state:'hidden'});
  const bossDeadline=Date.now()+12000;
  while(Date.now()<bossDeadline){const state=await page.evaluate(()=>window.qingzhuQA.read());if(state.targets.some(e=>e.boss))break;if(state.mode==='upgrade')await page.locator(`[data-upgrade="${chooseCard(state.upgrades)}"]`).click();await page.waitForTimeout(100);}
  assert.ok((await page.evaluate(()=>window.qingzhuQA.read())).targets.some(e=>e.boss));
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-boss.png`});
  checks.push({mobile,visibleObjective:true,earlyChallenge:true,normalTime:after.time,stageTime:after.regionTime,bossAppeared:true});await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${output}/browser.json`,JSON.stringify({checks,trace,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}
