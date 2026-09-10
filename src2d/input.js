export function createInput({onPause,onBag,onBlur,onUpgrade}){
 const keys=new Set(),queued={},stick={x:0,y:0};let pointer=null,flagStart=0,flagHeld=false;
 const queue=key=>queued[key]=true;
 const reset=()=>{keys.clear();stick.x=stick.y=0;pointer=null;flagStart=0;flagHeld=false;for(const k of Object.keys(queued))delete queued[k];const thumb=document.querySelector('#joystick i');if(thumb)thumb.style.transform='translate(0,0)';};
 addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;
  if(['Digit1','Digit2','Digit3'].includes(e.code)&&onUpgrade(Number(e.code.at(-1))-1))return;
  if(e.code==='Space')queue('dash');if(e.code==='KeyE')queue('skill');if(e.code==='KeyQ')queue('item');if(e.code==='KeyR')queue('interact');
  if(e.code==='KeyF'){flagStart=performance.now();flagHeld=true;}
  if(e.code==='Digit1')queued.quick=0;if(e.code==='Digit2')queued.quick=1;
  if(e.code==='Escape'||e.code==='KeyP')onPause();if(e.code==='Tab'||e.code==='KeyI')onBag();
 });
 addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF'&&flagHeld){if(performance.now()-flagStart<550)queue('flag');else queue('recall');flagHeld=false;}});
 for(const id of ['dash','skill','item','interact'])document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();queue(id);});
 const flag=document.getElementById('flag');flag.addEventListener('pointerdown',e=>{e.preventDefault();flag.setPointerCapture(e.pointerId);flagStart=performance.now();flagHeld=true;});flag.addEventListener('pointerup',()=>{if(flagHeld){queue(performance.now()-flagStart<550?'flag':'recall');flagHeld=false;}});flag.addEventListener('pointercancel',()=>flagHeld=false);
 const joy=document.getElementById('joystick'),thumb=joy.querySelector('i');
 function move(e){if(e.pointerId!==pointer)return;const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/42,y=(e.clientY-r.top-r.height/2)/42;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}stick.x=x;stick.y=y;thumb.style.transform=`translate(${x*32}px,${y*32}px)`;}
 joy.addEventListener('pointerdown',e=>{pointer=e.pointerId;joy.setPointerCapture(pointer);move(e);});joy.addEventListener('pointermove',move);joy.addEventListener('pointerup',reset);joy.addEventListener('pointercancel',reset);
 addEventListener('blur',()=>{reset();onBlur();});document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();onBlur();}});
 return{reset,read(){if(flagHeld&&performance.now()-flagStart>600){queue('recall');flagHeld=false;}let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x,y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+stick.y;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}const out={x,y,...queued};for(const k of Object.keys(queued))delete queued[k];return out;}};
}
