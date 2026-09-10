import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';

// A short regression against the shipped page, with only its display clock
// controlled. It does not mutate game state or claim real 120 Hz hardware QA.
const url=process.env.PIXEL_INPUT_URL||'http://127.0.0.1:4174/';
const output='artifacts/qa/input-cadence.json';
const halfFrame=1000/120;
const result={type:'Controlled requestAnimationFrame and performance.now clock on the production page; not natural 120 Hz hardware validation',url,startedAt:new Date().toISOString(),passed:false,displayFrameMS:halfFrame,simulationStepSeconds:1/60,stepEvidence:'The public time is rounded to 0.1 s. Exact simulation steps are observed through the player attack clock before the first enemy spawns.',cases:[],pageErrors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
 page.on('pageerror',error=>result.pageErrors.push(String(error)));
 await page.addInitScript(()=>{
  let now=0,nextId=0;const pending=new Map(),events=[];
  Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
  window.requestAnimationFrame=callback=>{const id=++nextId;pending.set(id,callback);return id;};
  window.cancelAnimationFrame=id=>pending.delete(id);
  for(const type of ['keydown','keyup'])addEventListener(type,event=>events.push({type,code:event.code,isTrusted:event.isTrusted,atMS:now}));
  Object.defineProperty(window,'inputCadenceHarness',{value:Object.freeze({
   pump(delta){now+=delta;const batch=[...pending.values()];pending.clear();for(const callback of batch)callback.call(window,now);return{atMS:now,callbacks:batch.length};},
   events:()=>events.slice()
  })});
  localStorage.setItem('qingzhu-sound','off');
  localStorage.setItem('qingzhu-effects','low');
 });
 const bundleResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/build/game.js');
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const bundle=await bundleResponse;result.productionBundle={url:bundle.url(),sha256:createHash('sha256').update(await bundle.body()).digest('hex')};
 const bootDeadline=Date.now()+60000;let ready=false,bootPumps=0;
 while(Date.now()<bootDeadline){
  await page.evaluate(()=>window.inputCadenceHarness.pump(0));bootPumps++;
  ready=await page.evaluate(()=>Boolean(window.qingzhuQA));if(ready)break;
  await page.waitForTimeout(20);
 }
 assert.ok(ready,'production boot did not finish while pumping its warm-up frames');
 result.bootPumps=bootPumps;
 await page.locator('[data-action="start"]').dispatchEvent('click');
 // Let the normal mode transition clear stale menu input before issuing keys.
 await page.evaluate(()=>window.inputCadenceHarness.pump(0));
 const read=()=>page.evaluate(()=>{const s=window.qingzhuQA.read(),p=s.player;return{mode:s.mode,time:s.time,attackClock:p.attackClock,x:p.x,y:p.y,mana:p.mana,skill:p.skill,focus:p.focus,dash:p.dash,dashTime:p.dashTime};});
 assert.equal((await read()).mode,'playing');
 for(const [key,action]of [['e','skill'],['Space','dash']]){
  const before=await read();
  await page.keyboard.down(key);
  const firstFrame=await page.evaluate(delta=>window.inputCadenceHarness.pump(delta),halfFrame);
  const afterNoStep=await read();
  await page.keyboard.up(key);
  const secondFrame=await page.evaluate(delta=>window.inputCadenceHarness.pump(delta),halfFrame);
  const afterStep=await read();
  const sample={key,action,before,firstFrame,afterNoStep,keyReleasedBeforeSimulationStep:true,secondFrame,afterStep};result.cases.push(sample);
  assert.equal(afterNoStep.attackClock,before.attackClock,`${action}: the first display frame must not run a simulation step`);
  assert.equal(afterNoStep[action],before[action],`${action}: the first display frame must leave the action queued`);
  assert.ok(Math.abs(before.attackClock-afterStep.attackClock-1/60)<1e-9,`${action}: the second display frame must execute exactly one simulation step`);
  if(action==='skill'){
   assert.equal(afterStep.skill,10,'released E must activate the actual skill');
   assert.equal(afterStep.mana,70,'the actual skill must consume 30 mana');
   assert.equal(afterStep.focus,5,'Han Li must enter the actual five-second focus state');
  }else{
   assert.equal(afterStep.dash,2.7,'released Space must start the actual dash cooldown');
   assert.equal(afterStep.dashTime,.2,'the actual dash must become active');
   sample.displacement=Math.hypot(afterStep.x-before.x,afterStep.y-before.y);
   assert.ok(Math.abs(sample.displacement-410/60)<1e-8,'the actual player must move one dash step');
  }
 }
 result.keyboardEvents=await page.evaluate(()=>window.inputCadenceHarness.events());
 assert.equal(result.keyboardEvents.filter(event=>event.isTrusted).length,4,'both short taps must use browser keyboard events');
 assert.deepEqual(result.pageErrors,[]);
 result.passed=true;
}catch(error){result.failure=String(error.stack||error);process.exitCode=1;}
finally{
 result.finishedAt=new Date().toISOString();
 await fs.mkdir('artifacts/qa',{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2));
 await browser.close();
}
console.log(JSON.stringify({passed:result.passed,type:result.type,cases:result.cases.map(test=>({action:test.action,firstFrameSteps:(test.before.attackClock-test.afterNoStep.attackClock)*60,secondFrameSteps:(test.afterNoStep.attackClock-test.afterStep.attackClock)*60,cooldown:test.afterStep[test.action],displacement:test.displacement})),failure:result.failure,output}));
