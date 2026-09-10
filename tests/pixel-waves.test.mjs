import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter} from '../src2d/waves.js';
import {REGIONS,ENEMIES} from '../src2d/catalog.js';

const rate=wave=>wave.batch/wave.interval;
const role=wave=>wave.phaseId.split(':')[1];
function phases(region){
 const result=[];
 for(let time=0;time<REGIONS[region].duration;time++){
  const wave=encounter(region,time);
  if(result.at(-1)?.wave.phaseId!==wave.phaseId){if(result.length)result.at(-1).end=time;result.push({start:time,wave});}
 }
 result.at(-1).end=REGIONS[region].duration;return result;
}
const meanHP=(region,wave)=>wave.pool.reduce((sum,i)=>sum+ENEMIES[REGIONS[region].enemy[i]].hp,0)/wave.pool.length*wave.hpScale;

test('the time score uses only existing enemies and respects spawn, HP and speed budgets',()=>{
 for(let region=0;region<3;region++){
  let peak=0;
  for(let time=0;time<REGIONS[region].duration;time+=.25){
   const wave=encounter(region,time);peak=Math.max(peak,rate(wave));
   assert.ok(wave.name&&wave.phaseId);assert.ok(Number.isInteger(wave.batch)&&wave.batch>=1&&wave.batch<=6);
   assert.ok(Number.isFinite(wave.interval)&&wave.interval>=.75);
   assert.ok(rate(wave)<=8);
   assert.ok(wave.hpScale>=.45&&wave.hpScale<=1.15);assert.ok(wave.speedScale>=.75&&wave.speedScale<=1.05);
   assert.ok(['ring','arc','line'].includes(wave.formation));assert.equal(typeof wave.elite,'boolean');
   assert.ok(wave.pool.length>0);for(const i of wave.pool){assert.ok(Number.isInteger(i)&&i>=0&&i<4);assert.equal(ENEMIES[REGIONS[region].enemy[i]].boss,undefined);}
  }
  if(region>0)assert.ok(peak>=7.5&&peak<=8,'later peaks should be brief crowds, not a flat low-density run');
 }
});

test('every region alternates fragile harvest crowds, positional pressure and usable quiet windows',()=>{
 for(let region=0;region<3;region++){
  const list=phases(region),harvest=list.filter(p=>role(p.wave).startsWith('harvest')),pressure=list.filter(p=>role(p.wave).startsWith('pressure')),rest=list.filter(p=>role(p.wave).startsWith('rest'));
  assert.ok(harvest.length>=3&&pressure.length>=2&&rest.length>=2);
  assert.ok(rest.some(p=>p.end-p.start>=(region===0?16:26)),'at least one quiet interval must accommodate a meaningful collection/medicinal detour');
  for(const {wave} of rest){assert.ok(rate(wave)<=.35);assert.equal(wave.elite,false);assert.equal(wave.formation,'arc');}
  for(const {wave} of pressure){
   assert.ok(['arc','line'].includes(wave.formation));
   assert.ok(wave.pool.some(i=>['shoot','charge'].includes(ENEMIES[REGIONS[region].enemy[i]].behavior)),'pressure must require handling a distinct enemy behavior');
   assert.ok(meanHP(region,wave)>meanHP(region,harvest[0].wave)*1.4,'a hard wave must feel different from a harvest crowd');
  }
  assert.ok(harvest.slice(1).every(p=>rate(p.wave)>=3.8&&p.wave.hpScale<=(region===0?.8:.65)));
  assert.ok(list.some((p,i)=>i>0&&rate(p.wave)<=.35&&rate(list[i-1].wave)>1),'pressure must visibly recede');
 }
});

test('the three regions have different timing and phase sequences rather than one repeated ramp',()=>{
 const signatures=[0,1,2].map(region=>phases(region).map(p=>`${p.start}/${role(p.wave)}/${p.wave.formation}/${p.wave.pool.join(',')}`).join('|'));
 assert.equal(new Set(signatures).size,3);
 const sequences=[0,1,2].map(region=>phases(region).filter(p=>p.start<REGIONS[region].bossAt).map(p=>role(p.wave).split('-')[0]).join(','));
 assert.equal(new Set(sequences).size,3,'quiet/pressure/harvest/reward order itself must differ');
 assert.ok(phases(1).some((p,i,list)=>role(p.wave).startsWith('pressure')&&role(list[i+1]?.wave||{phaseId:':'}).startsWith('harvest')));
 assert.ok(phases(2).some(p=>role(p.wave).startsWith('harvest')&&p.wave.formation==='line'),'corridor harvests should reward piercing coverage');
});

test('pressure, reward, crowd surges and boss entries give exactly five seconds of usable warning',()=>{
 for(let region=0;region<3;region++)for(const {start,wave} of phases(region)){
  if(!start)continue;
  const mustWarn=role(wave).startsWith('pressure')||wave.elite||role(wave)==='boss-entry'||role(wave)==='boss-pressure'||role(wave)==='boss-final'||rate(wave)>=5;
  if(!mustWarn)continue;
  assert.notEqual(encounter(region,start-5.001).warn?.phaseId,wave.phaseId,'warning cannot begin early');
  for(const left of [5,4.1,2.4,.001]){
   const warning=encounter(region,start-left).warn;assert.ok(warning,`${wave.phaseId} lacks a warning`);
   assert.equal(warning.phaseId,wave.phaseId);assert.equal(warning.seconds,Math.ceil(left));assert.equal(warning.formation,wave.formation);assert.ok(warning.text.includes('息后'));
  }
  assert.notEqual(encounter(region,start).warn?.phaseId,wave.phaseId,'the old countdown must end when its phase begins');
 }
});

test('elite rewards are single marked encounters and cannot become a repeated farming wave',()=>{
 for(let region=0;region<3;region++){
  const elites=phases(region).filter(p=>p.wave.elite);assert.ok(elites.length>=2);
  for(const {start,end,wave} of elites){assert.equal(wave.batch,1);assert.equal(wave.pool.length,1);assert.ok(wave.interval>end-start);assert.ok(end<=REGIONS[region].bossAt);assert.ok(encounter(region,start-1).warn.text.includes('将至'));}
 }
});

test('boss arrivals reduce adds, retain fragile harvest phases and lead to a natural endpoint',()=>{
 for(let region=0;region<3;region++){
  const {bossAt,duration}=REGIONS[region],arrival=encounter(region,bossAt);
  assert.equal(role(arrival),'boss-entry');assert.ok(rate(arrival)<=.5);assert.ok(arrival.hpScale<=(region===0?.7:.65));
  const late=phases(region).filter(p=>p.start>=bossAt);
  assert.ok(late.some(p=>rate(p.wave)>=5&&p.wave.hpScale<=(region===0?.8:.65)),'late low-level enemies should still be harvestable');
  assert.ok(late.some(p=>rate(p.wave)<=.35&&p.end-p.start>=(region===0?16:26)),'boss combat needs a real add-recovery window');
  assert.ok(late.every(p=>!p.wave.elite),'do not stack reward elites on the scheduled boss');
  for(const time of [duration,duration+45,duration+600,7200]){const ended=encounter(region,time);assert.equal(ended.batch,0);assert.equal(ended.elite,false);assert.equal(ended.warn,undefined);}
 }
});

test('queries are deterministic, order independent, and cannot be poisoned by mutating a result',()=>{
 const times=[0,25,71,176,235.2,295.2,344,419,600],expected=times.map(t=>encounter(1,t));
 for(let i=times.length-1;i>=0;i--)assert.deepEqual(encounter(1,times[i]),expected[i]);
 const changed=encounter(1,295.2);changed.pool.push(99);changed.name='changed';changed.warn.text='changed';
 assert.deepEqual(encounter(1,295.2),expected[times.indexOf(295.2)]);
 assert.deepEqual(encounter(0,-1),encounter(0,0));
 for(const region of [-1,3,1.5,null,'1'])assert.throws(()=>encounter(region,1),RangeError);
 for(const time of [NaN,Infinity,-Infinity,'2',null])assert.throws(()=>encounter(0,time),RangeError);
});
