import {Application,Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
import {CHARACTERS,ENEMIES,REGIONS,WEAPONS,SWORD_COUNTS} from './catalog.js';
import {CHUNK_SIZE,chunkAt,worldChunk} from './world.js';
import {TAU,dist,clamp} from './math.js';
import {enemyAnimation} from './animation.js';
import {paintTerrain} from './terrain-view.js';

export class BattleView{
 constructor(host,art){this.host=host;this.art=art;this.units=new Map();this.swordSprites=new Map();this.projectileSprites=new Map();this.pickupSprites=new Map();this.poiSprites=new Map();this.poiLabels=new Map();this.fx=[];this.region=-1;this.groundTiles=new Map();this.groundChunk='';this.frames=0;this.frameTimes=[];this.reduced=localStorage.getItem('qingzhu-effects')==='low'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
 async init(){
  this.app=new Application();await this.app.init({resizeTo:this.host,background:0x132322,antialias:false,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl',powerPreference:'high-performance'});this.host.appendChild(this.app.canvas);this.app.canvas.setAttribute('aria-label','青竹劫境战斗场景');
  this.world=new Container();this.app.stage.addChild(this.world);this.groundLayer=new Container();this.world.addChild(this.groundLayer);this.floorFX=new Graphics();this.world.addChild(this.floorFX);this.shadows=new Graphics();this.world.addChild(this.shadows);this.actors=new Container({sortableChildren:true});this.world.addChild(this.actors);this.effects=new Graphics();this.world.addChild(this.effects);this.floating=new Container();this.world.addChild(this.floating);
  this.makeWeaponTextures();return this;
 }
 makeWeaponTextures(){
  const sword=new Graphics();sword.poly([0,-17,3,-11,3,10,0,14,-3,10,-3,-11]).fill(0x75c6a3).stroke({color:0xe2d291,width:1});sword.moveTo(0,-13).lineTo(0,9).stroke({color:0xc5f8da,width:1});for(let y=-8;y<7;y+=5)sword.rect(-1,y,3,1).fill(0xe9cf8a);sword.ellipse(0,11,5,2).fill(0xdac88e);sword.rect(-1,13,3,7).fill(0x385d4c);this.swordTexture=this.app.renderer.generateTexture(sword);sword.destroy();
  const gem=new Graphics().poly([0,-4,3,0,0,4,-3,0]).fill(0x93e0b2).stroke({color:0xd9ffe1,width:1});this.gemTexture=this.app.renderer.generateTexture(gem);gem.destroy();
  const heart=new Graphics().poly([0,-3,3,-5,5,-2,0,4,-5,-2,-3,-5]).fill(0xf5ae9d);this.healTexture=this.app.renderer.generateTexture(heart);heart.destroy();
  this.bulletTextures={};
  for(const [id,color] of Object.entries({blades:0xe4ce83,ring:0xffa476,beetles:0xc8ad66,frost:0xb6e5f4,fire:0xffaa73,ice:0x8ed8ef,dragon:0xb8c4d6,bolt:0xc9b089,enemy:0xf08588})){
   const q=new Graphics();if(id==='ring'){q.circle(0,0,14).stroke({width:3,color}).circle(0,0,9).stroke({width:1,color:0xffe3a8});for(let i=0;i<4;i++){const a=i*TAU/4;q.poly([Math.cos(a)*14,Math.sin(a)*14,Math.cos(a+.25)*22,Math.sin(a+.25)*22,Math.cos(a+.4)*12,Math.sin(a+.4)*12]).fill(color);}}
   else if(id==='beetles'){q.ellipse(0,0,4,6).fill(color).stroke({color:0xf6e9b7,width:1});for(let y=-3;y<=3;y+=3)q.moveTo(-6,y).lineTo(6,y).stroke({color,width:1});}
   else if(['blades','dragon','bolt'].includes(id)){q.poly([0,-13,3,-7,2,9,-2,9,-3,-7]).fill(color).stroke({color:0xebebd0,width:1});}
   else {q.poly([0,-9,6,-2,4,6,0,9,-4,6,-6,-2]).fill({color,alpha:.8});q.poly([0,-5,3,0,0,5,-2,0]).fill(0xfff5cc);}
   this.bulletTextures[id]=this.app.renderer.generateTexture(q);q.destroy();
  }
 }
 setRegion(index){
  this.region=index;for(const tile of this.groundTiles.values())this.removeGround(tile);for(const s of this.pickupSprites.values())if(!s.destroyed)s.destroy();this.pickupSprites.clear();for(const s of this.poiSprites.values())s.destroy();this.poiSprites.clear();for(const label of this.poiLabels.values())label.destroy();this.poiLabels.clear();
  this.groundTiles.clear();this.groundChunk='';
 }
 removeGround(tile){for(const s of tile.decor)s.destroy();tile.sprite.destroy({texture:true,textureSource:true});}
 streamGround(player){
  const c=chunkAt(player.x,player.y),key=`${c.x}:${c.y}`;if(key===this.groundChunk)return;this.groundChunk=key;
  const visible=new Set();for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const x=c.x+dx,y=c.y+dy,id=`${x}:${y}`;visible.add(id);let tile=this.groundTiles.get(id);
   if(!tile){
    const chunk=worldChunk(this.region,x,y),kit=this.art.worldKits[this.region],texture=Texture.from(paintTerrain(chunk,kit));texture.source.scaleMode='nearest';const sprite=new Sprite(texture);sprite.width=sprite.height=CHUNK_SIZE;sprite.position.set(x*CHUNK_SIZE-CHUNK_SIZE/2,y*CHUNK_SIZE-CHUNK_SIZE/2);this.groundLayer.addChildAt(sprite,0);
    const decor=[];for(const d of chunk.decor){const texture=d.sheet==='props'?this.art.props.frames[Math.floor(d.frame/4)][d.frame%4]:kit.textures[d.frame],s=new Sprite(texture);s.anchor.set(.5,.93);s.position.set(x*CHUNK_SIZE+d.x,y*CHUNK_SIZE+d.y);s.scale.set(d.width/s.texture.width);if(d.flip)s.scale.x*=-1;s.zIndex=s.y;s.label='scenery';s.landmark=d;s.visible=false;(d.layer==='ground'?this.groundLayer:this.actors).addChild(s);decor.push(s);}tile={sprite,decor,chunk};this.groundTiles.set(id,tile);
   }
  }
  for(const [id,tile]of this.groundTiles)if(!visible.has(id)){this.removeGround(tile);this.groundTiles.delete(id);}
 }
 drawScenery(g){const p=g.player;for(const tile of this.groundTiles.values())for(const s of tile.decor){s.visible=Math.abs(s.x-p.x)<g.visibleBounds.halfWidth+140&&Math.abs(s.y-p.y)<g.visibleBounds.halfHeight+180;if(s.visible){const behind=p.y<s.y&&p.y>s.y-s.height&&Math.abs(p.x-s.x)<s.width*.42;s.alpha=behind&&s.landmark.layer!=='ground'?.38:1;}}}
 sprite(map,id,texture,parent=this.actors){let s=map.get(id);if(!s){s=new Sprite(texture);s.anchor.set(.5,.88);parent.addChild(s);map.set(id,s);}if(s.texture!==texture)s.texture=texture;return s;}
 pose(sprite,sheet,row,col,height){const b=sheet.bounds[row][col],idle=sheet.bounds[row][0];sprite.anchor.set(b.footX/b.width,b.footY/b.height);sprite.scale.set(height/(idle.bottom-idle.top+1));}
 prune(map,active){for(const [id,s] of map)if(!active.has(id)){s.destroy();map.delete(id);}}
 consume(events){
  for(const e of events){
   if(e.type==='hit'){if(this.reduced&&this.fx.filter(f=>f.labelSprite).length>15)continue;if(this.fx.filter(f=>f.labelSprite).length>50)continue;const t=new Text({text:String(Math.round(e.amount)),style:{fontFamily:'Georgia',fontSize:e.amount>80?16:12,fill:e.kind==='lightning'?0xffe4a3:e.kind==='burn'?0xffb995:0xe6e6c7,stroke:{color:0x18201f,width:3},fontWeight:'600'}});t.anchor.set(.5);t.position.set(e.x,e.y);this.floating.addChild(t);this.fx.push({...e,life:.6,max:.6,labelSprite:t});}
   else if(['kill','blast','beam','lightning','dash','brick','focus','illusion','shield','flag','evolution'].includes(e.type)){this.fx.push({...e,life:e.type==='beam'?.32:e.type==='brick'?.8:e.type==='evolution'?1.6:.65,max:e.type==='evolution'?1.6:.65});}
  }
  if(this.fx.length>180){const removed=this.fx.splice(0,this.fx.length-180);for(const f of removed)f.labelSprite?.destroy();}
 }
 update(g,dt=1/60){
  if(this.region!==g.regionIndex)this.setRegion(g.regionIndex);this.streamGround(g.player);
  const p=g.player,w=this.app.screen.width,h=this.app.screen.height,scale=Math.min(w/960,h/540);this.scale=scale;g.visibleBounds={halfWidth:w/scale/2+25,halfHeight:h*.52/scale+25};this.world.scale.set(scale);this.world.position.set(Math.round(w/2-p.x*scale),Math.round(h*.52-p.y*scale));
  this.floorFX.clear();this.shadows.clear();this.effects.clear();this.drawScenery(g);this.drawZones(g);this.drawPOIs(g);this.drawUnits(g);this.drawSwords(g);this.drawProjectiles(g);this.drawPickups(g);this.drawFX(g,dt);this.drawAtmosphere(g);
  this.frames++;this.frameTimes.push(dt*1000);if(this.frameTimes.length>600)this.frameTimes.shift();
 }
 drawUnits(g){
  const p=g.player,active=new Set(['player']);let dir=Math.abs(p.dx)>Math.abs(p.dy)?(p.dx<0?1:2):p.dy<0?3:0;
  const frame=p.hurtTime>0?5:p.castTime>0?4:p.moving?[1,2,3,2][Math.floor(g.time*9)%4]:0;
  const s=this.sprite(this.units,'player',this.art[g.character].frames[dir][frame]);s.position.set(p.x,p.y);this.pose(s,this.art[g.character],dir,frame,74);s.zIndex=p.y;s.alpha=p.hidden>0?.4:p.invuln>0&&Math.floor(g.time*14)%2?.62:1;
  this.shadows.ellipse(p.x,p.y-1,15,5).fill({color:0x050d13,alpha:.5});
  if(p.shield>0)this.effects.ellipse(p.x,p.y-28,27,40).stroke({color:0xe0d09a,width:1.5,alpha:.7});
  if(g.decoy){const d=this.sprite(this.units,'decoy',this.art[g.character].frames[0][0]);d.position.set(g.decoy.x,g.decoy.y);this.pose(d,this.art[g.character],0,0,74);d.alpha=.38;d.tint=0xbfa1ed;d.zIndex=d.y;active.add('decoy');}
  for(const e of g.enemies){
   if(e.hp<=0||Math.abs(e.x-p.x)>650||Math.abs(e.y-p.y)>430)continue;active.add(e.id);
   const sheet=this.art[e.atlas],isSage=e.kind==='sage',pose=enemyAnimation(e),row=pose.row,frame=pose.column;
   const sprite=this.sprite(this.units,e.id,sheet.frames[row][frame]);sprite.position.set(e.x,e.y);const size=e.boss?(isSage?88:145):Math.max(34,e.r*3.1*(e.elite?1.1:1));this.pose(sprite,sheet,row,frame,size);sprite.scale.x=Math.abs(sprite.scale.x)*pose.flip;sprite.zIndex=e.y;sprite.tint=e.freeze>0?0xbbe4ff:e.hit>0?0xffdcb8:e.elite?0xefc8ff:0xffffff;
   this.shadows.ellipse(e.x,e.y-1,e.r*.8,e.r*.26).fill({color:0x050c13,alpha:.43});
   if(e.guard){const exposed=e.bossPhase==='recover';this.effects.ellipse(e.x,e.y-size*.38,e.r+7,size*.56).stroke({color:exposed?0xffd890:0xa9a0d8,width:exposed?2:1,alpha:exposed?.8:.32});}
   if(e.elite){this.floorFX.ellipse(e.x,e.y,e.r*1.4,e.r*.65).stroke({color:0xdbabd3,width:1.5,alpha:.7});}
   if((e.hp<e.maxHp||e.elite)&&!e.boss){const bar=e.r*2;this.effects.rect(e.x-bar/2,e.y-size*.72,bar,3).fill(0x18201f).rect(e.x-bar/2,e.y-size*.72,bar*Math.max(0,e.hp/e.maxHp),3).fill(e.elite?0xd6a6d4:0xbcd19b);}
   if(e.burn>0)for(let i=0;i<3;i++){const a=i*2+g.time*5;this.effects.rect(e.x+Math.cos(a)*e.r*.5,e.y-12-Math.sin(a)*10,2,5).fill({color:0xffb579,alpha:.7});}
   if(e.windup>0){const len=e.telegraphLength||(e.boss?190:135);this.floorFX.moveTo(e.x-e.dy*12,e.y+e.dx*12).lineTo(e.x+e.dx*len-e.dy*20,e.y+e.dy*len+e.dx*20).lineTo(e.x+e.dx*len+e.dy*20,e.y+e.dy*len-e.dx*20).lineTo(e.x+e.dy*12,e.y-e.dx*12).closePath().fill({color:0xed806c,alpha:.22}).stroke({color:0xffae84,width:1,alpha:.7});}
  }
  this.prune(this.units,active);
 }
 drawSwords(g){
  const active=new Set();for(const q of g.swords){active.add(q.id);const s=this.sprite(this.swordSprites,q.id,this.swordTexture);s.anchor.set(.5);s.position.set(q.x,q.y-9);s.rotation=q.a+Math.PI/2;s.zIndex=q.y+9;s.width=10;s.height=g.player.swordCrafted?33:29;s.tint=g.player.swordCrafted?0xffffff:0xd8e4e1;
   if(q.mode==='attack'||q.mode==='return')this.effects.moveTo(q.x,q.y-9).lineTo(q.x-Math.cos(q.a)*18,q.y-9-Math.sin(q.a)*18).stroke({width:2,color:g.player.swordCrafted?0xa1edcb:0xc9d6c1,alpha:.25});
  }this.prune(this.swordSprites,active);
 }
 drawProjectiles(g){
  const active=new Set();for(const q of g.projectiles){if(q.delay>0)continue;active.add(q.id);const s=this.sprite(this.projectileSprites,q.id,this.bulletTextures[q.kind]||this.bulletTextures.fire);s.anchor.set(.5);s.position.set(q.x,q.y-7);s.rotation=q.kind==='ring'?g.time*4:q.kind==='beetles'?Math.atan2(q.dy,q.dx):Math.atan2(q.dy,q.dx)+Math.PI/2;s.zIndex=q.y+12;const scale=q.kind==='ice'?2.5:q.kind==='frost'?1.3:1;s.scale.set(scale);s.alpha=q.kind==='ice'?.65:1;
  }this.prune(this.projectileSprites,active);
 }
 drawPickups(g){const active=new Set();for(const q of g.pickups){if(Math.abs(q.x-g.player.x)>610||Math.abs(q.y-g.player.y)>390)continue;active.add(q.id);const s=this.sprite(this.pickupSprites,q.id,q.kind==='heal'?this.healTexture:this.gemTexture,this.groundLayer);s.anchor.set(.5);s.position.set(q.x,q.y+Math.sin(q.age*3)*1.5);s.scale.set(q.kind==='vacuum'?2.5:q.value>20?1.7:1);s.tint=q.kind==='vacuum'?0xb9d7ff:q.value>20?0xf6cb81:0xffffff;}this.prune(this.pickupSprites,active);}
 drawPOIs(g){
  const active=new Set();for(const poi of g.pois){active.add(poi.id);const col=poi.kind==='herb'||poi.kind==='lure'?0:poi.kind==='chest'?1:poi.kind==='portal'?3:2;let texture=this.art.props.frames[3][col];if(poi.kind==='forge')texture=this.art.props.frames[2][2];if(poi.kind==='chest'&&g.regionIndex===2)texture=this.art.props.frames[2][3];
   const s=this.sprite(this.poiSprites,poi.id,texture);s.position.set(poi.x,poi.y);const width=poi.kind==='portal'?94:poi.kind==='forge'?64:poi.kind==='elite'?58:poi.kind==='chest'&&g.regionIndex===2?66:poi.kind==='lure'?48:52;s.width=width;s.height=width*texture.height/texture.width;s.zIndex=poi.y;s.alpha=['done','failed'].includes(poi.state)?.38:poi.state==='locked'?.45:1;
   if(!['done','failed','locked'].includes(poi.state)){const pulse=.35+Math.sin(g.time*2+poi.id)*.08;this.floorFX.ellipse(poi.x,poi.y,34,14).stroke({color:poi.kind==='forge'?0xebc68c:poi.kind==='lure'||poi.kind==='elite'?0xd7a9c3:0x9fd3b0,width:1,alpha:pulse});}
   let label=this.poiLabels.get(poi.id);if(!label){label=new Text({text:poi.name,style:{fontFamily:'PingFang SC',fontSize:12,fill:0xd8ddbd,stroke:{color:0x0e211c,width:4}}});label.anchor.set(.5);this.floating.addChild(label);this.poiLabels.set(poi.id,label);}label.position.set(poi.x,poi.y-s.height*.88-12);label.visible=dist(poi,g.player)<220&&!['done','failed'].includes(poi.state);label.text=poi.state==='growing'?`${poi.name} · ${Math.ceil(poi.remaining)}息`:poi.name;
   if(poi.state==='growing'){const ratio=1-poi.remaining/poi.total;this.effects.arc(poi.x,poi.y-35,36,-Math.PI/2,-Math.PI/2+ratio*TAU).stroke({color:0xc2e6a6,width:2});this.effects.rect(poi.x-20,poi.y+12,40,3).fill(0x172a26).rect(poi.x-20,poi.y+12,40*Math.max(0,poi.hp/100),3).fill(0x91c3a0);}
  }this.prune(this.poiSprites,active);this.prune(this.poiLabels,active);
 }
 drawZones(g){
  for(const h of g.hazards){const ratio=Math.min(1,h.age/Math.max(.1,h.age+h.timer)),active=h.timer<=0,color=active&&h.kind==='venom'?0xa5ab4c:active?0xad6998:0xda665e;this.floorFX.circle(h.x,h.y,h.r).fill({color,alpha:active?.32:.13}).stroke({color:active?0xd8d492:0xffa786,width:1.5,alpha:.8}).circle(h.x,h.y,h.r*ratio).fill({color,alpha:active?.18:.16});}
  for(const z of g.zones){
   const col={cauldron:0x88cbd9,web:0xd99bb0,puppet:0xc3a787,firefield:0xffa676,illusion:0xbca2e1}[z.kind];
   if(z.kind==='puppet'){this.effects.roundRect(z.x-9,z.y-28,18,24,2).fill(0x9a8d71).stroke({color:0xd8c8a0,width:1});this.effects.rect(z.x-6,z.y-36,12,9).fill(0x6f8579).rect(z.x-12,z.y-25,5,19).fill(0xa49979).rect(z.x+7,z.y-25,5,19).fill(0xa49979);continue;}
   this.floorFX.circle(z.x,z.y,z.r).fill({color:col,alpha:.08}).stroke({color:col,width:1,alpha:.45});
   if(z.kind==='web'){for(let i=0;i<8;i++){const a=i*TAU/8;this.floorFX.moveTo(z.x,z.y).lineTo(z.x+Math.cos(a)*z.r,z.y+Math.sin(a)*z.r).stroke({color:col,alpha:.35,width:1});}for(const r of [.35,.65])this.floorFX.circle(z.x,z.y,z.r*r).stroke({color:col,alpha:.3,width:1});}
   else for(let i=0;i<8;i++){const a=i*TAU/8+g.time*.35,r=z.r*.75;this.effects.rect(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r-6,2,5).fill({color:col,alpha:.7});}
  }
  const flags=g.flags;for(let i=0;i<flags.length;i++){const f=flags[i];this.effects.moveTo(f.x,f.y).lineTo(f.x,f.y-31).stroke({color:0xdcc18a,width:2}).poly([f.x,f.y-31,f.x+17,f.y-26,f.x,f.y-20]).fill(0xb5ceb4);if(i>0)this.floorFX.moveTo(flags[i-1].x,flags[i-1].y).lineTo(f.x,f.y).stroke({color:0xb4dbbf,width:1.3,alpha:.65});}
  if(g.array){const [a,b,c]=flags;this.floorFX.poly([a.x,a.y,b.x,b.y,c.x,c.y]).fill({color:g.array.kind==='sword'?0xd7c790:0x9bd1bc,alpha:.055}).stroke({color:g.array.kind==='sword'?0xe4d1a0:0xa5d1b5,width:1.8,alpha:.72});}
  else if(flags.length>0){const last=flags.at(-1);this.floorFX.moveTo(last.x,last.y).lineTo(g.player.x,g.player.y).stroke({color:0xb2c6ac,width:1,alpha:.3});if(flags.length===2)this.floorFX.moveTo(flags[0].x,flags[0].y).lineTo(g.player.x,g.player.y).stroke({color:0xb2c6ac,width:1,alpha:.3});}
 }
 drawFX(g,dt){
  for(const f of this.fx){f.life-=dt;const t=clamp(f.life/f.max,0,1);if(f.labelSprite){f.labelSprite.y-=dt*27;f.labelSprite.alpha=t;continue;}
   if(f.type==='lightning'){const dx=f.ex-f.x,dy=f.ey-f.y;this.effects.moveTo(f.x,f.y);for(let i=1;i<7;i++){const v=i/6,off=i===6?0:Math.sin(i*9+f.time)*13;this.effects.lineTo(f.x+dx*v-dy/(Math.hypot(dx,dy)||1)*off,f.y+dy*v+dx/(Math.hypot(dx,dy)||1)*off);}this.effects.stroke({color:0xffdf8c,width:1.5,alpha:t});}
   else if(f.type==='beam')this.effects.moveTo(f.x,f.y-10).lineTo(f.ex,f.ey-10).stroke({color:f.color,width:f.width*t,alpha:.55*t});
   else if(f.type==='brick'){const y=f.y-80*t;this.effects.rect(f.x-26,y-28,52,30).fill({color:0xf5cb78,alpha:t}).stroke({color:0xffe7b6,width:2,alpha:t});this.floorFX.ellipse(f.x,f.y,50*(1-t),20*(1-t)).stroke({color:0xf5c97c,width:2,alpha:t});}
   else if(f.type==='blast')this.effects.circle(f.x,f.y,(f.r||40)*(1-t*.8)).stroke({color:f.color||0xe6cb8a,width:2*t,alpha:t*.7});
   else if(f.type==='focus'||f.type==='shield'||f.type==='illusion')this.effects.ellipse(f.x,f.y-20,25+(1-t)*35,45+(1-t)*10).stroke({color:f.type==='illusion'?0xccadeb:0xd9dfaf,width:1,alpha:t*.6});
   else if(f.type==='kill'){for(let i=0;i<(this.reduced?3:6);i++){const a=i*TAU/6+f.time,r=(1-t)*22;this.effects.rect(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,2,2).fill({color:f.boss?0xf0d296:0xb3c59d,alpha:t});}}
  }
  for(const f of this.fx)if(f.life<=0)f.labelSprite?.destroy();this.fx=this.fx.filter(f=>f.life>0);
 }
 drawAtmosphere(g){
  if(this.reduced)return;const p=g.player;
  for(let i=0;i<24;i++){const a=i*2.399,x=p.x+Math.cos(a)*490+Math.sin(g.time*.2+i)*28,y=p.y+Math.sin(a)*285+(g.time*3+i*11)%60;this.effects.rect(x,y,1.5,1.5).fill({color:g.regionIndex===2?0xc6b183:0xb9d7b1,alpha:.1+(Math.sin(g.time+i)+1)*.12});}
 }
 destroy(){for(const f of this.fx)f.labelSprite?.destroy();this.app.destroy(true,{children:true,texture:true,textureSource:true});}
}
