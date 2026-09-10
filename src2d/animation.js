// The monster boss atlas contains directional poses, not a two-frame gait:
// columns 0/1 face left, 2 faces right, and 3 is a left-facing attack.
export function enemyAnimation(e){
 if(e.atlas==='bosses'){
  const attacking=e.action>0||e.windup>0||e.bossPhase==='windup';
  const column=attacking?3:e.moving?1:0;
  return{row:e.row,column,flip:e.facing>0?-1:1};
 }
 if(e.kind==='sage')return{row:Math.abs(e.dx)>Math.abs(e.dy)?(e.dx<0?1:2):e.dy<0?3:0,column:e.action>0||e.windup>0?4:e.moving?[1,2,3,2][Math.floor(e.age*7)%4]:0,flip:1};
 return{row:e.row,column:e.action>0||e.windup>0?3:e.moving?(Math.floor(e.age*7)%2)+1:0,flip:e.facing||1};
}

export function turnToward(e,dx,dt){
 e.turnHold=Math.max(0,(e.turnHold||0)-dt);
 if(Math.abs(dx)<.22||e.windup>0||e.charge>0)return;
 const facing=dx<0?-1:1;
 if(!e.facing){e.facing=facing;return;}
 if(facing!==e.facing&&e.turnHold<=0){e.facing=facing;e.turnHold=.25;}
}
