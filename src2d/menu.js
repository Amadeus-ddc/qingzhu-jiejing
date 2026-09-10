import {CHARACTERS,REGIONS} from './catalog.js';

// The title uses the same generated character frames as play, without repainting
// faces, clothing or equipment. Keep the quiet back-facing stance in the scene.
export function menuFigureDataURL(art,id){
 const sheet=art[id],b=sheet.bounds[3][id==='hanli'?4:0],canvas=document.createElement('canvas');
 canvas.width=b.right-b.left+5;canvas.height=b.bottom-b.top+5;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.drawImage(sheet.canvas,b.x+b.left,b.y+b.top,canvas.width-4,canvas.height-4,2,2,canvas.width-4,canvas.height-4);
 return canvas.toDataURL();
}

export function installTitleNavigation(getScreen){
 addEventListener('keydown',e=>{
  if(getScreen()!=='title')return;
  // The gameplay handler reserves Tab/Space/arrows. In the title those keys
  // belong to native buttons and the menu, so stop the gameplay listener first.
  if(e.code==='Tab'||e.code==='Space'){e.stopImmediatePropagation();return;}
  const modal=document.getElementById('modal');
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.code)){
   e.preventDefault();e.stopImmediatePropagation();
   const items=[...modal.querySelectorAll('.title-menu-item')],current=items.indexOf(document.activeElement);
   const next=e.code==='Home'?0:e.code==='End'?items.length-1:current<0?0:(current+(e.code==='ArrowDown'?1:-1)+items.length)%items.length;
   items[next]?.focus({preventScroll:true});
  }
  if(e.code==='Enter'&&!modal.contains(document.activeElement)){e.preventDefault();e.stopImmediatePropagation();modal.querySelector('.title-menu-item.is-main')?.click();}
 },{capture:true});
}

export function titleMarkup({selected,meta,figures,saved,timeLabel}){
 const c=CHARACTERS[selected],hasSave=!!saved;
 const menuItem=(label,action,main=false,detail='')=>`<button class="title-menu-item ${main?'is-main':''}" data-action="${action}"><span class="menu-cursor" aria-hidden="true">›</span><span>${label}</span>${detail?`<small>${detail}</small>`:''}</button>`;
 return `<section class="start-screen" aria-labelledby="game-title">
  <div class="title-scene" aria-hidden="true"><img class="title-landscape" src="./assets/pixel/menu/forbidden-valley.png" alt=""><img class="title-figure figure-${selected}" src="${figures[selected]}" alt=""></div>
  <div class="title-shade" aria-hidden="true"></div>
  <header class="title-masthead"><span>凡人修仙传<span class="masthead-dot">·</span>同人试炼</span><span class="title-volume">人界篇<span class="volume-line"></span>壹</span></header>
  <div class="title-content">
   <div class="title-wordmark"><p class="title-kicker">一剑入凡尘</p><h1 id="game-title">青竹<span>劫境</span></h1><span class="title-seal" aria-hidden="true">人界</span></div>
   <p class="title-premise">从一口飞剑起，走一程修仙路。</p>
   <nav class="title-menu" aria-label="主菜单">
    ${hasSave?menuItem('继续修行','continue',true,`${REGIONS[saved.regionIndex].name} · ${timeLabel(saved.time)}`):''}
    ${menuItem(hasSave?'重入劫境':'进入试炼','start',!hasSave)}
    ${menuItem('修行图鉴','codex')}
    ${menuItem('洞府传承','meta')}
    ${menuItem('设置','settings')}
   </nav>
  </div>
  <aside class="title-character" aria-label="选择修行角色">
   <button class="character-caption" data-action="characterinfo" aria-label="查看${c.name}的角色详情"><span class="character-caption-label">此行之人</span><h2>${c.name}</h2><span class="character-epithet">${c.epithet}</span><span class="character-caption-more" aria-hidden="true">↗</span></button>
   <p class="character-summary">${c.description}</p>
   <div class="character-tabs" role="group" aria-label="角色">${Object.values(CHARACTERS).map(v=>{
    const locked=meta.cleared<v.unlock;
    return `<button data-character="${v.id}" aria-label="选择${v.name}${locked?`，通过${REGIONS[v.unlock-1].name}后解锁`:''}" aria-pressed="${selected===v.id}" class="character-tab ${selected===v.id?'selected':''} ${locked?'locked':''}"><span class="character-tab-name">${v.name}</span><span class="character-tab-status">${locked?`${['','一','二'][v.unlock]}境后解锁`:selected===v.id?'已选':'可选'}</span></button>`;
   }).join('')}</div>
  </aside>
  <footer class="title-footer"><button class="title-help" data-action="help" aria-label="查看操作说明"><span class="desktop-help">WASD 移动<span>·</span>Space 闪避<span>·</span>E 法术</span><span class="touch-help">左侧移动<span>·</span>右侧施法</span><span class="help-arrow" aria-hidden="true">↗</span></button><span class="title-session-note">单人试炼<span>·</span>约 20 分钟<span>·</span>自动存档</span></footer>
 </section>`;
}
