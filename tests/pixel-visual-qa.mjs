// Local camera-seam and static rendering diagnostics. No production-state API.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const mode=process.argv[2]||'seams',out='artifacts/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal']});
const errors=[],checks=[],startedAt=new Date().toISOString();
try{
 for(const mobile of mode==='stress'?[false,true]:[false]){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  const scenes=mode==='stress'?[{region:2,x:0,y:110}]:[0,1,2].flatMap(region=>[{region,x:1100,y:1100},{region,x:9900,y:-9900}]);
  for(const scene of scenes){
   await page.goto(`http://127.0.0.1:4174/artifacts/qa/fixture.html?mode=${mode==='stress'?'stress':'formation'}&region=${scene.region}&x=${scene.x}&y=${scene.y}`);
   await page.waitForFunction(()=>window.fixture?.ready,{timeout:60000});
   const before=await page.evaluate(()=>window.fixture.read());
   const wallStart=Date.now();await page.waitForTimeout(mode==='stress'?18000:1200);
   const state=await page.evaluate(()=>window.fixture.read());
   const suffix=mode==='stress'?(mobile?'mobile':'desktop'):`region-${scene.region}-${scene.x}-${scene.y}`;
   const screenshot=`${out}/pixel-${mode}-${suffix}.png`;
   await page.screenshot({path:screenshot});
   const worldCorners=[{x:0,y:0},{x:state.screen.width,y:0},{x:0,y:state.screen.height},{x:state.screen.width,y:state.screen.height}].map(p=>({x:scene.x+(p.x-state.screen.playerX)/state.screen.scale,y:scene.y+(p.y-state.screen.playerY)/state.screen.scale}));
   const coverage=worldCorners.every(p=>state.groundTileBounds.some(t=>p.x>=t.x&&p.x<=t.x+t.width&&p.y>=t.y&&p.y<=t.y+t.height));
   const positionsPreserved=state.player.x===scene.x&&state.player.y===scene.y;
   const playerCentered=Math.abs(state.screen.playerX-state.screen.width/2)<1&&Math.abs(state.screen.playerY-state.screen.height*.52)<1;
   if(!coverage||!positionsPreserved||!playerCentered||state.spriteMaps.groundTiles!==9)throw Error(`Camera coverage failed: ${suffix}`);
   if(mode==='stress'&&(state.regularEnemies!==300||state.bosses!==1||state.projectiles!==1000||state.swords!==72||state.samples<200))throw Error(`Stress population/sample mismatch: ${suffix}`);
   checks.push({scene,mobile,deviceScaleFactor:mobile?2:1,wallSeconds:(Date.now()-wallStart)/1000,screenshot,coverage,positionsPreserved,playerCentered,countsStable:before.enemies===state.enemies&&before.projectiles===state.projectiles&&before.swords===state.swords,...state});
   console.log(JSON.stringify({mode,suffix,p95:state.p95,cpuP95:state.cpuP95,samples:state.samples,coverage}));
  }
  await context.close();
 }
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
await fs.writeFile(`${out}/pixel-${mode}-checks.json`,JSON.stringify({type:mode==='stress'?'Static rendering stress; no enemy AI, physics, damage, or normal gameplay validation':'Preset camera placement and ground-tile coverage; visual review required for image seams',startedAt,finishedAt:new Date().toISOString(),cpuMeasurement:'Synchronous BattleView.update only; excludes asynchronous GPU work and sword pose update',textureMeasurement:'Distinct texture sources referenced by the current display tree; not GPU VRAM or all loaded assets',checks,errors},null,2));
