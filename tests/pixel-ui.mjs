import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal']});
const output=process.env.QA_OUTPUT_DIR||'artifacts/qa',checks=[],errors=[];await fs.mkdir(output,{recursive:true});
for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
 await context.addInitScript(()=>localStorage.setItem('qingzhu-human-meta-v2',JSON.stringify({cleared:3,hpRank:0,pickupRank:0,coins:200,discoveries:[],claims:[]})));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4174/');await page.waitForFunction(()=>window.qingzhuQA);
 for(const id of ['nangong','yinyue']){
  await page.locator(`[data-character="${id}"]`).click();await page.screenshot({path:`${output}/pixel-${id}-title-${mobile?'mobile':'desktop'}.png`});
  await page.locator('[data-action="start"]').click();if(await page.locator('[data-action="newconfirmed"]').count())await page.locator('[data-action="newconfirmed"]').click();
  await page.waitForFunction(()=>window.qingzhuQA.read().mode==='playing');const before=await page.evaluate(()=>window.qingzhuQA.read());
  if(mobile){const r=await page.locator('#joystick').boundingBox();const touch=await context.newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width-10,y:r.y+r.height/2,id:0}]});await page.waitForTimeout(800);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await page.locator('#skill').click();}
  else{await page.keyboard.down('d');await page.waitForTimeout(800);await page.keyboard.up('d');await page.keyboard.press('e');}
  await page.waitForTimeout(120);const after=await page.evaluate(()=>window.qingzhuQA.read());if(after.player.x<=before.player.x+20)throw Error(`${id} movement failed`);if(after.player.skill<=0)throw Error(`${id} skill failed`);
  await page.screenshot({path:`${output}/pixel-${id}-play-${mobile?'mobile':'desktop'}.png`});checks.push({mobile,character:id,moved:after.player.x-before.player.x,skillCooldown:after.player.skill,starter:after.weapons});
  await page.locator('#bag-button').click();if(!(await page.locator('[data-slot="0"]').isVisible()))throw Error('Bag inaccessible');await page.screenshot({path:`${output}/pixel-bag-${mobile?'mobile':'desktop'}-${id}.png`});await page.locator('[data-action="resume"]').click();
  await page.locator('#pause-button').click();await page.locator('[data-action="title"]').click();
 }
 await page.locator('[data-action="settings"]').click();await page.locator('[data-action="sound"]').click();await page.locator('[data-action="effects"]').click();await page.locator('[data-action="back"]').click();await page.locator('[data-action="meta"]').click();await page.locator('[data-action="buyhp"]').click();await page.locator('[data-action="buypickup"]').click();await page.locator('[data-action="back"]').click();await page.locator('[data-action="codex"]').click();await page.screenshot({path:`${output}/pixel-codex-${mobile?'mobile':'desktop'}.png`});await page.locator('[data-action="back"]').click();
 if(mobile){await page.setViewportSize({width:390,height:844});if(!(await page.locator('#rotate-hint').isVisible()))throw Error('Portrait guidance missing');await page.screenshot({path:`${output}/pixel-portrait-guidance.png`});}
 await context.close();
}
const page=await browser.newPage({viewport:{width:1100,height:1260}});page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4174/artifacts/qa/fixture.html?mode=gallery');await page.waitForFunction(()=>window.fixture?.ready);await page.screenshot({path:`${output}/pixel-character-frames.png`});await page.setViewportSize({width:1440,height:900});
for(const region of [0,1,2]){await page.goto(`http://127.0.0.1:4174/artifacts/qa/fixture.html?region=${region}`);await page.waitForFunction(()=>window.fixture?.ready);await page.waitForTimeout(1000);await page.screenshot({path:`${output}/pixel-formation-region-${region}.png`});}
await fs.writeFile(`${output}/pixel-ui-checks.json`,JSON.stringify({type:'UI checks with unlocked-character fixtures, plus separate preset visual scenes',checks,errors,webmcpNativeSupported:await page.evaluate(()=>!!document.modelContext)},null,2));console.log(JSON.stringify({checks,errors}));await browser.close();
