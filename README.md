# 青竹劫境 · 人界试炼

一个取材于《凡人修仙传》的非官方同人像素生存游戏。使用 AI 辅助开发，目前是可玩的早期版本，欢迎试玩、反馈问题和一起开发。

![青竹劫境主界面](docs/screenshots/01-青竹劫境.png)

公开试玩见 [原入口](https://qingzhu-jiejing.amajobs.chatgpt.site)；[GitHub Pages 备用入口](https://amadeus-ddc.github.io/qingzhu-jiejing/) 也可直接试玩。不同域名的存档分别保存。

## 怎么玩

控制角色走位，法器自动攻击。拾取灵气后升级，选择法术与功法，探索材料点并炼制法宝，也能放置阵旗组成阵法。

- 从韩立开始，通过前两境分别解锁南宫婉、银月。
- 血色禁地、乱星海、虚天殿三境。每境满 60 秒可提前挑战首领，击败后可立即离境。
- 十二种攻击法门，每局最多携带四件攻击法门和四门功法；每种已学法门都解锁一个主动祭器招式。
- C 主动祭器，V 换器，Z 切换护卫 / 强攻剑势。祭器共享冷却，强攻持续耗灵。冰火连击、击碎法宝和主动攻击可削减首领定力并破招。
- 飞剑从一口逐步成长到七十二口，金雷竹、庚精与境界共同决定进阶。
- 地图随探索延伸，包含道路、障碍、采集点和十八类场景主题。
- 墨蛟加入扫尾与追击，婴鲤兽使用潮线与海珠；玄骨分三阶段，使用可破坏法宝、换形、冰焰、骨链和组合攻击，各招有预警与反击窗口。
- 自动保存当前进度，支持刷新后继续。手机请横屏游玩，地图持续显示目标、距离与下一步提示。

## 本地运行

需要 Node.js 22 或更高版本。

```sh
git clone https://github.com/Amadeus-ddc/qingzhu-jiejing.git
cd qingzhu-jiejing
npm ci
npm run build
npm start
```

打开 [本地游戏](http://127.0.0.1:4174/)。每次修改源码后重新运行 `npm run build`。`dist/` 是可部署到静态网站服务的构建产物。

## 操作

| 操作 | 键位 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 闪避 | Space |
| 角色法术 | E |
| 放置阵旗 / 长按回收 | F |
| 与附近地点交互 | R |
| 使用符箓 | Q |
| 切换符箓快捷栏 | 1 / 2 |
| 行囊 | Tab |
| 暂停 | P / Esc |

手机横屏使用左侧摇杆和右侧按钮。

## 参与开发与反馈

欢迎直接提 [Issue](https://github.com/Amadeus-ddc/qingzhu-jiejing/issues)，或者 Fork 后提交 Pull Request。法宝与阵法设计、敌潮节奏、像素美术、操作手感和性能问题都可以讨论。

报告问题时，附上使用的设备与浏览器、所在关卡，以及问题出现前的操作；有截图会更容易复现。也欢迎直接说哪一段无聊、哪种法宝不好用、下一版想玩到什么。

## 开发与验证

- `src2d/` 是当前游戏源码，`assets/pixel/` 是运行时美术。
- `npm test` 检查战斗、地形、寻路和敌潮规则。
- `npm run test:balance` 运行六组确定性模拟，不等同于真人试玩。
- `node tests/pixel-browser.mjs` 通过键盘和界面进行浏览器验证，需要本机 Chrome 与已启动的本地服务。
- 战斗改版通过 55 项规则检查、六组确定性模拟，以及桌面键盘与横屏触控的独立玄骨战检查。
- `node tests/pixel-combat-browser.mjs` 用固定后期装备检查主祭、剑势和完整玄骨战；`node tests/pixel-duel-sim.mjs` 比较同一装备的三种操作策略，预设均不计作正常整局通关。
- `node tests/pixel-feedback-browser.mjs` 检查正常开局、提前挑战、存档续玩及触屏交互，需要本机 Chrome 和本地服务。
- 约 22 分钟的完整浏览器通关属于上一版历史验证，本版没有重新进行浏览器整局通关。详细范围见 [战斗改版验证记录](tests/COMBAT_DEPTH_VALIDATION.md)。

## 实机画面

![血色禁地](docs/screenshots/02-血色禁地.png)
![乱星海与剑阵](docs/screenshots/03-乱星海剑阵.png)
![虚天殿与七十二剑](docs/screenshots/04-虚天殿七十二剑.png)
![升级选择](docs/screenshots/05-升级选牌.png)
![法器与符箓](docs/screenshots/06-法器与符箓.png)

## 题材与来源

这是非官方同人项目，与原作及动画权利方没有关联。角色与世界观取材于《凡人修仙传》，玩法安排属于改编；美术使用 AI 辅助生成。章节依据与改编边界见 [三境场景依据](SOURCES_WORLD.md)。第三方依赖遵循各自许可证。

## 玩家反馈修订

本次加入主动祭器、剑势与破招系统，并重做玄骨三阶段决战。支持继续第 4、5 版存档，保留既有装备与材料。详见 [战斗改版验证记录](tests/COMBAT_DEPTH_VALIDATION.md)。此前开局、绕障与提前挑战的改动保留在 [上次修订记录](tests/PLAYER_FEEDBACK_VALIDATION.md)。
