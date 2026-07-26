# 《寻亲风云录》开发日志

> **给新对话AI的接续指南**：读取本文件 + `XQ.md`（设计文档，GDD v11.1）即可恢复全部上下文。
> 本文件记录：已完成功能、架构要点、待办事项、已知问题、技术备忘。
> XQ.md 记录：完整游戏设计（世界观/系统规则/数值表/叙事/区域结构）。
> 两者互补，缺一不可。

---

## 项目概述
- 纯前端文字RPG，HTML/CSS/Vanilla JS，无框架依赖
- GitHub: https://github.com/TeamQazuzu/myRPG
- 设计文档: `XQ.md`（根目录，GDD v11.1，已定稿可进入开发）
- **开发状态**：v2.1 经验锁修复 + EXP进度条 + 升级引导

## 文件结构
```
index.html              ← 入口页面，按顺序加载以下脚本
core/data.js           ← 游戏数据定义（属性/职业/伤害类型/品质/80条词条/技能/消耗品/世界地图/守门员/NPC/货币等）
core/utils.js          ← 工具函数（随机/数值计算/装备生成/怪物生成/格式化/UUID等）
core/state.js          ← 状态管理 + 存档系统（SaveManager/StateUtils/默认状态createDefaultState）
systems/combat.js      ← 战斗引擎（回合制、3v6、攻击/技能/防御/道具/撤退、四系伤害计算、异常状态引擎、随从AI策略、HP同步回写、死亡处理、装备掉落）
systems/equipment.js   ← 装备系统（穿戴/卸下/锻造升级/附魔/镶嵌/符文之语/装备对比）
systems/inventory.js   ← 背包与仓库（堆叠/存取/升级/装备快捷操作/材料/搜索筛选排序）
systems/shop.js        ← 商店/交易系统（买/卖/商品列表）
systems/dialogue.js    ← NPC对话系统（对话树/选项分支/动作执行/商店触发）
systems/skills.js      ← 技能系统（技能数据/可用性检查/MP消耗/冷却/四系伤害计算/状态效果施加/元素自动触发）
systems/scene.js       ← 帧式场景管理（灰烟村11帧/敌人数据/战斗触发/采集/挂机采集/休息/NPC对话/随从AI策略分配）
ui/renderer.js         ← UI渲染（冒险/战斗/面板/技能选择/物品详情/商店/对话/搜索筛选/状态图标/挂机采集结算）
css/style.css          ← 完整样式（暗色主题/桌面+移动端响应式/品质颜色/对话框/商店/详情面板）
app.js                 ← 主入口（GameApp类、初始化/角色创建/自动存档/属性同步含词条叠加）
XQ.md                  ← 游戏设计文档（GDD v11.1）
DEVLOG.md              ← 本文件，开发进度与上下文
```

## 架构要点

### 模块加载顺序（index.html 中严格按此顺序）
data → utils → state → combat → equipment → inventory → shop → dialogue → skills → scene → renderer → app

### 全局对象清单
| 全局变量 | 类型 | 文件 | 说明 |
|---------|------|------|------|
| `DATA` | Object字面量 | core/data.js | 所有静态游戏数据 |
| `Utils` | Object字面量 | core/utils.js | 工具函数集 |
| `SaveManager` | Object字面量 | core/state.js | 存档加载/保存/导出/导入/删除 |
| `StateUtils` | Object字面量 | core/state.js | 状态操作（背包/装备/货币等） |
| `CombatEngine` | Class | systems/combat.js | 战斗引擎，实例化使用 |
| `EquipmentSystem` | Object字面量 | systems/equipment.js | 装备操作集 |
| `InventorySystem` | Object字面量 | systems/inventory.js | 背包/仓库操作集 |
| `ShopSystem` | Object字面量 | systems/shop.js | 商店/交易操作集 |
| `DialogueSystem` | Object字面量 | systems/dialogue.js | NPC对话树管理 |
| `SkillSystem` | Object字面量 | systems/skills.js | 技能系统（可用技能/冷却/释放） |
| `SceneManager` | Class | systems/scene.js | 场景管理，实例化使用 |
| `UIRenderer` | Class | ui/renderer.js | UI渲染，实例化使用 |
| `GameApp` | Class | app.js | 应用主类，挂在 `window.gameApp` |

### 通信方式
CustomEvent 事件机制，UIRenderer 监听事件驱动渲染：
- `scene-change` → 切换场景画面
- `combat-start` → 切换到战斗画面
- `combat-update` → 更新战斗状态
- `combat-end` → 显示战斗结果，切回冒险画面
- `combat-player-turn` → 启用/禁用行动按钮
- `game-log` → 添加游戏日志

### 浏览器兼容
- 全部避免 `?.` 可选链和 `??` 空值合并，改用 `&&` 短路和 `||` 默认值
- 示例：`DATA.rarity[item.rarity] && DATA.rarity[item.rarity].tier || 0`

### 移动端适配
- 480px 断点响应式
- 所有触摸目标 ≥ 44px（Apple/Google 标准）
- 输入框 16px 防 iOS 自动缩放
- 战斗单位卡片最小 140px 宽
- 基准字号：桌面 15px / 移动 16px

---

## 已完成功能

### v1.0 核心重写（全部完成）
- [x] 六维属性系统（力量/敏捷/智力/体质/坚韧/精神）
- [x] 三大职业（战士/游侠/法师）+ 法师四元素分支（火/冰/雷/治疗）
- [x] 四种伤害类型（物理/火焰/冰霜/雷电）+ 对应状态效果（流血/灼烧/减速/僵直）
- [x] 七档装备品质（白/绿/蓝/紫/橙/红/金）+ 80条词条池
- [x] 装备承载上限（按等级段限制最高品质和同色数量）
- [x] 装备系统（穿戴/卸下/锻造升级品质/附魔/镶嵌/符文之语/对比）
- [x] 战斗引擎（回合制、速度排序、攻击/技能/防御/道具/撤退、伤害浮动、30回合上限）
- [x] 背包与仓库（堆叠/容量/存取/升级/装备快捷操作/材料/搜索筛选排序）
- [x] 存档系统（LocalStorage + JSON导出/导入/删除 + 自动存档）
- [x] 角色创建（命名/选职业/硬核模式）
- [x] 经验锁机制（5个守门员 → 5段等级上限 20/40/60/80/99）
- [x] 随从系统（艾琳开局入队，最多2个随从）
- [x] 帧式场景管理（场景/出口/行动按钮）

### 灰烟村内容（v1.1 扩展后 + v1.4 新增）
- [x] 灰烟村·村口（安全区枢纽，通往14个地点）
- [x] 灰烟村·酒馆（休息恢复HP/MP）
- [x] 灰烟村·铁匠铺（NPC对话：老哈）
- [x] 灰烟村·村边荒地（6只野狗战斗，测试3v6最大场面）
- [x] 灰烟村·村边矿脉（石头采集）
- [x] 灰烟村·药草园（采集草药 / 毒蛇战斗）
- [x] 灰烟村·村长家（NPC对话：村长）
- [x] 灰烟村·村东鱼塘（螃蟹战斗 / 水草采集）
- [x] 灰烟村·杂货铺（NPC对话→商店：三婶）
- [x] 灰烟村·练功场（单人/三人练兵战斗）
- [x] 灰烟村·后山小径（山贼战斗 / 野果采集）
- [x] 灰烟村·裁缝铺（NPC对话：玛莎+小柯）
- [x] 灰烟村·皮匠铺（NPC对话：诺恩）
- [x] 灰烟村·村医屋（NPC对话：蕾娜，部分恢复HP/MP）
- [x] 灰烟村·墓地（NPC对话：守墓人老格）

### 新增系统（v1.1）
- [x] 商店/交易系统（买/卖/杂货店商品列表）
- [x] NPC对话系统（对话树/选项分支/动作执行/10个NPC）
- [x] 技能系统框架（9个技能/MP消耗/冷却/选技能→点目标两阶段流程）
- [x] 装备掉落（战斗后按怪物类型概率生成随机装备）
- [x] 消耗品使用（背包中直接使用恢复HP/MP）

### 战斗核心系统（v1.2 新增）
- [x] 四系伤害类型完整实现（物理/火焰/冰霜/雷电，各有独立减伤公式）
- [x] 异常状态系统（流血DOT/灼烧可叠层/减速速度-30%/僵直跳过回合）
- [x] 状态效果结算引擎（回合开始DOT伤害/回合结束递减持续时间/死亡判定）
- [x] 技能接入真实伤害类型（技能伤害使用combat.calculateDamage按元素计算）
- [x] 元素技能自动触发状态（无显式apply_status的元素技能10%概率触发）
- [x] 随从AI策略系统（攻击型/防御型/治疗型/平衡型四种策略）
- [x] 挂机采集系统（8轮循环/70%采集/15%遇敌/10%金币/5%稀有/结算面板）

### 装备词条战斗接入（v1.3 新增）
- [x] 装备词条收集系统（collectAffixBonuses 在 normalizeUnit 时汇总所有装备词条）
- [x] 暴击系统（基础5%暴击率/1.5x暴伤 + 词条叠加，上限75%暴击率）
- [x] 四系攻击加成（physDmg/fireDmg/frostDmg/lightDmg 百分比乘算到攻击力）
- [x] 穿透减防（pierce 百分比忽略目标防御）
- [x] 元素抗性减伤（fireRes/frostRes/lightRes/allElemRes，上限75%）
- [x] 条件增伤（frostBonusOnSlow/lightBonusOnStun/fireBonusOnBurn/physBonusOnBleed）
- [x] 低血量增伤（lowHpDmg <30%/veryLowHpDmg <20%）
- [x] 首回合增伤（firstTurnDmg 第一回合伤害加成）
- [x] 词条命中触发（bleedOnCrit/burnOnHit/slowOnHit/stunOnHit 概率施加状态）
- [x] 命中减益（reduceArmor/reduceSpeed/burnReduceAtk 降低目标属性）
- [x] 生命/法力窃取（lifeSteal/manaSteal 按伤害百分比回复）
- [x] 不可屈挠（cheatDeathChance 玩家方致死时概率存活1HP）
- [x] 击杀爆炸 AOE（aoeOnKill 击杀敌人时概率对其他敌人造成火焰伤害）
- [x] 技能暴击 + 词条联动（useSkill 同样走暴击/条件增伤/窃取/命中触发链路）
- [x] 伤害日志增强（暴击/抗性减免/条件增伤/低血量/首回合 在日志中标注）

### UI与交互
- [x] 双视图切换（冒险画面 ↔ 战斗画面）
- [x] 玩家信息栏（名字/等级/HP条/MP条/金币）
- [x] 战斗单位卡片（HP血条/三属性/死亡灰显/选中高亮/异常状态图标）
- [x] 战斗日志（最近6条滚动）
- [x] 底部管理栏（背包/装备/队伍/存档/设置5个面板）
- [x] 背包面板增强（搜索/品质筛选/物品详情/穿戴/使用/丢弃）
- [x] 装备面板增强（属性总和/详情/卸下/锻造/附魔）
- [x] 战斗技能选择面板
- [x] 对话框UI（半透明遮罩/选项按钮/商店触发）
- [x] 挂机采集结算面板（汇总数据+详细日志+稀有发现高亮）
- [x] 异常状态图标显示（🩸流血/🔥灼烧/❄减速/⚡僵直，含剩余回合数）
- [x] 移动端响应式优化（字号/触摸区域/血条/输入框）
- [x] 浮点数显示修复（属性数值取整/速度保留1位小数）

---

## 待开发功能

### 高优先级
- [x] 守门员Boss特殊技能AI（村长嘲讽/治疗/铁壁、守夜人暗袭/连斩/弱点打击、机械守卫蓄力/护盾/震地）✅ v1.5/v2.0
- [x] 守夜人暗杀铺垫事件（37/38级随机暗杀，掉落组织线索）✅ v2.0
- [x] 多波次Boss战框架（GDD：2-4波，每波独立30回合，完全重置）✅ v2.0

### 中优先级
- [ ] 冒险地图帧探索（已知区域快速跳转/未知区域逐格探索）
- [x] 装备强化（而非仅锻造升品质）✅ v2.0/v2.1
- [x] 经验锁内的升级提示引导 ✅ v2.1
- [x] 挂机采集离线计算（基于时间戳）✅ v2.0

### 低优先级
- [ ] 灰烬山脉区域（第二个大区域）
- [ ] 碎片收集系统（12碎片）
- [ ] 金龙/银龙随机事件
- [ ] 音乐/音效
- [ ] 成就系统
- [ ] 统计面板（击杀数/采集量/游戏时长）

---

## 已知问题（需修复）
1. **面板交互边界**：背包/装备面板操作后偶现状态不同步，需测试
2. **商店价格浮动未实现**：当前为固定价格，GDD 要求价格浮动
3. **浏览器缓存**：开发时修改JS文件后需手动刷新（已通过 `index.html` 的 `?v=21` 版本号缓解，后续发版需更新版本号）

---

## 技术备忘（开发时必读）

### 数值格式化
- `unit.speed` 是浮点数，显示用 `.toFixed(1)`
- `unit.attack / defense` 可能有浮点误差，显示用 `Math.round()`

### 全局引用安全
- 所有 `window.gameApp` 引用前必须做 `&&` 短路检查
- 写法：`window.gameApp && window.gameApp.sceneManager && window.gameApp.sceneManager.scenes`

### 属性计算链路
1. 玩家六维属性 → `app.js` 的 `syncPlayerToCombatData()` → 计算 `state.player.attack/defense/speed/maxHp/maxMp`
2. 装备基础属性在上述函数中叠加
3. 随从战斗属性在 `scene.js` 的 `getAllyUnits()` 中硬编码构建
4. 敌人数据在 `scene.js` 的 `buildEnemyData()` 中定义

### 存档结构（state）
```
state = {
  player: { name, class, level, exp, hardcoreMode, hp, maxHp, mp, maxMp,
            attack, defense, speed, gold, location, attributes: {str,agi,int,vit,ten,spi} },
  equipment: { weapon, armor, helmet, boots, accessory, offhand },
  inventory: { items: [], capacity, materials: [] },
  storage: { items: [], capacity },
  companions: [],
  unlockedAreas: [],
  visitedScenes: [],
  gameLog: [],
  statistics: {},
  flags: {}
}
```

### 灰烟村场景地图（v1.1）
```
  ┌──────┐  ┌──────┐  ┌──────┐
  │ 矿脉 │  │药草园│  │ 鱼塘 │
  └──┬───┘  └──┬───┘  └──┬───┘
┌──┐┌──┐┌──┐┌──┴──┐┌──┐┌──┐
│酒││铁││杂││灰烟村││练││后│
│馆││匠││货││ 枢纽 ││功││山│
│  ││铺││铺││      ││场││  │
└──┘└──┘└──┘└──┬──┘└──┘└──┘
         ┌────┴────┐
         │  村长家  │
         └─────────┘
              │
         ┌──┴───┐
         │ 荒地  │
         └──────┘
```

---

## 变更日志

### 2026-07-26 v2.1 经验锁修复 + EXP进度条 + 升级引导

**Bug修复（关键）**
- 修复：`core/state.js` `getLevelCap()` 返回值错误，击败守门员后等级上限不提升（村长击败后应从20→40，守夜人击败后应从40→60，以此类推，隐者击败后→99）
  - 原代码：`villageChief.defeated → return 20`（与默认值相同，等于没提升）
  - 修复后：`villageChief.defeated → return 40`，`nightWatcher.defeated → return 60`，`mechanicalGuard.defeated → return 80`，`hermit.defeated → return 99`
- 修复：`app.js` 离线经验结算时，经验被锁定时 `expResult.gained` 为0，导致 `if (expResult.gained > 0)` 条件不满足，锁定提示消息不显示（改为先检查 `locked` 再检查 `gained`）

**新增功能**
- **EXP进度条**（`ui/renderer.js` + `css/style.css`）
  - 玩家信息栏新增EXP进度条，显示当前经验/升级所需经验
  - 正常状态：蓝色渐变进度条
  - 锁定状态：斜纹条纹图案 + "已封顶"文字
  - 等级上限指示器：正常状态显示灰色 `Lv.20`，锁定状态显示红色 `🔒Lv.20`（含tooltip提示）

- **经验锁引导横幅**（`ui/renderer.js` + `css/style.css`）
  - 玩家信息栏下方显示脉冲动画引导横幅
  - 内容：`🔒 [对应守门员的引导消息]`
  - 5个等级段各有独立提示（20→击败村长、40→守夜人、60→机械守卫、80→隐者、99→主人）

- **首次封顶引导通知**（`app.js` 新增 `checkExpLockGuidance()` 方法）
  - 玩家首次达到等级上限时，游戏日志显示引导消息（含守门员位置提示）
  - 使用 `state.world.flags.exp_lock_guided_[cap]` 标记，每个上限只提示一次
  - 在 `startGame()` 和战斗结束后自动调用

**其他改动**
- `index.html` 所有脚本加载添加 `?v=21` 版本号，解决浏览器缓存问题

**文件变更**
- 修改文件：`core/state.js`、`ui/renderer.js`、`css/style.css`、`app.js`、`index.html`、`DEVLOG.md`

### 2026-07-26 v2.0 守门员Boss技能AI + 多波次框架 + 暗杀事件

**Bug修复**
- 修复：`core/data.js` 多波次Boss的 `intro` 字段引号混用（`"...'`）导致 SyntaxError，整个 DATA 对象未定义，战斗无法启动
- 修复：村长嘲讽技能的 attack debuff 和 defense buff 永久不恢复（新增 `_originalAttack`/`_originalDefense` 备份 + `tickBossSkillCooldowns` 回合递减恢复）
- 修复：守夜人连斩技能的 setTimeout 异步导致双重 nextTurn 回合错位（改为 `_skipNextTurn` 标记方案，同步执行两次攻击）
- 修复：`MultiWaveBossCombatEngine` 构造函数无法透传 `gkData`（改为 `constructor(bossId, gkData, waveConfigs)`）
- 修复：`scene.js` triggerBossBattle 未根据 waves 配置选择 `MultiWaveBossCombatEngine`

**多波次Boss战框架完善（combat.js 修改）**
- `MultiWaveBossCombatEngine` 构造函数改为接收 `(bossId, gkData, waveConfigs)` 三参数
- `startNextWave` 完整实现：重置回合/行动顺序/防御加成，保留玩家HP/MP/技能冷却
- 每波独立回合数限制（`perWaveRounds`），Boss阶段重置
- `calculateRewards` 合并所有波次奖励 + 额外经验加成
- `scene.js` triggerBossBattle 自动识别 waves 配置并使用多波次引擎

**守夜人暗杀铺垫事件（scene.js 新增）**
- `checkNightwatcherAmbush(scene)` 方法：玩家进入灰烬山脉时检查等级与触发条件
- 37级首次暗杀：叙事→「组织铭牌碎片」线索→战斗（暗影刺客 Lv.40）→战后叙事
- 38级二次暗杀：同流程，强化玩家对Boss存在的感知
- 使用 `state.world.flags.nightwatcher_ambush_37/38` 追踪，守夜人已击败后不再触发

**UI波次指示器（renderer.js + style.css）**
- 多波次Boss战时回合信息显示为 `回合 X/Y  |  波次 A/B`
- Boss阶段圆点指示器 + 波次intro叙事横幅（`.wave-indicator` / `.wave-intro`）
- 战斗更新时动态刷新波次信息

**文件变更**
- 修改文件：`core/data.js`、`systems/combat.js`、`systems/scene.js`、`ui/renderer.js`、`css/style.css`、`DEVLOG.md`

### 2026-07-25 v1.5 守门员Boss战系统

**BossCombatEngine 类（combat.js 新增）**
- 继承 CombatEngine，新增 `bossId`/`gkData`/`phase`/`maxPhase`/`isRetreatBlocked` 等属性
- 根据守门员 combat.style 自动配置阶段系统：
  - `tank`（村长）：2阶段（100%-50%-0%），防御翻倍，每回合自愈3%最大HP
  - `glassCannon`（守夜人）：3阶段（100%-60%-30%-0%），暴击率+20%，阶段2暴击率再+20%，阶段3攻击力+50%
  - `meleeBoss`（机械守卫）：1阶段，每3回合技能间隔
- `checkPhaseTransition()` 每回合检查HP百分比触发阶段转换
- `onPhaseChange()` 阶段转换时强化Boss属性并日志提示
- 重写 `processTurn()` 在回合开始前检查阶段转换和村长自愈
- 重写 `endCombat()` 实现特殊失败处理（送回酒馆不消耗复活次数）、平局处理（HP=1,MP=0,损失5%金币）、击败回调触发
- 重写 `calculateRewards()` 确保Boss 100%掉落装备 + 守门员额外经验 + 特殊任务奖励物品
- `tickBossSkillCooldowns()` Boss技能冷却管理
- `setDefeatCallback()` 设置自定义击败回调

**Boss战通用机制（combat.js 修改）**
- `CombatEngine.playerAction('retreat')` 检查 `isRetreatBlocked`，Boss战禁止撤退并提示
- `CombatEngine.endCombat()` 检查 `_bossHandledDeath`，Boss战跳过正常死亡流程

**场景系统接入（scene.js 新增）**
- `buildGatekeeperUnit(gkId)` 从 DATA.gatekeepers 构建Boss单位数据（HP/ATK/DEF/暴击/掉落）
- `triggerBossBattle(gkId)` 完整的Boss战触发流程：
  - 检查守门员是否已被击败
  - 检查经验锁（必须达到等级上限才能挑战）
  - 创建 BossCombatEngine 并设置击败回调
  - 击败回调：调用 `StateUtils.defeatGatekeeper()` 解锁区域 + 扩容背包 + 设置叙事标记
  - 开场显示Boss台词（stance）

**村长对话树扩展（dialogue.js 修改）**
- 新增「我要离开这个村子」选项（条件：守门员未击败）→ 挑战分支 → `boss_battle:villageChief` 动作
- 新增「村长，我打赢了」选项（条件：守门员已击败）→ 获得父亲的旧信
- 新增 `boss_battle` 动作类型处理
- 对话选项条件过滤系统：`condition` + `conditionArg` 字段支持 `gatekeeper_not_defeated`/`gatekeeper_defeated`/`exp_locked`

**UI增强（renderer.js + style.css）**
- Boss战标题显示「👑 Boss战」+「禁止撤退」标签
- 阶段指示器（多阶段Boss显示 🔴/⚪ 阶段圆点 + Boss名字）
- Boss战隐藏撤退按钮
- 撤退按钮事件绑定改为安全检查（null guard）
- 新增 `boss_battle` 场景行动类型处理
- CSS：`.boss-phase-bar`/`.boss-name`/`.boss-phases`/`.no-retreat-hint` 样式

**文件变更**
- 修改文件：`systems/combat.js`、`systems/scene.js`、`systems/dialogue.js`、`ui/renderer.js`、`css/style.css`、`DEVLOG.md`

### 2026-07-25 v1.4 灰烟村场景扩展（裁缝铺/皮匠铺/村医屋/墓地）

**新增 4 个场景帧**
- 灰烟村·裁缝铺（安全区，NPC：玛莎+学徒小柯）
- 灰烟村·皮匠铺（安全区，NPC：诺恩）
- 灰烟村·村医屋（安全区，NPC：蕾娜，可部分恢复HP/MP）
- 灰烟村·墓地（安全区，NPC：守墓人老格）

**新增 5 个 NPC 对话树**
- 裁缝玛莎（3条分支：斗篷往事/布料/告别）
- 裁缝学徒小柯（3条分支：城里见闻/来由/告别）
- 皮匠诺恩（4条分支：鉴定皮子/特殊皮/诡异刀痕/告别）
- 村医蕾娜（3条分支：父母来访/伤口建议/告别）
- 守墓人老格（4条分支：墓中人/守墓职责/铜盒线索/日常）

**村医屋功能**
- 新增 heal_partial 行动类型：恢复50% HP + 30% MP
- renderer.js 新增 case 处理
- scene.js 新增 healPartial() 方法

**枢纽出口扩展**
- 灰烟村枢纽出口从 10 个增至 14 个

**叙事线索**
- 玛莎：父母定制斗篷、留存布头碎片（裁缝的斗篷支线伏笔）
- 小柯：灰烬镇大裁缝铺信息（世界扩展伏笔）
- 诺恩：老穆的野猪上有非猎人刀痕（组织活动线索）
- 蕾娜：父亲拿止痛药和金疮药、说"很远的路"
- 老格：二十年前外来女人留下小铜盒、等孩子来取（核心线索）

**文件变更**
- 修改文件：`systems/scene.js`、`systems/dialogue.js`、`ui/renderer.js`、`DEVLOG.md`

### 2026-07-25 v1.3 装备词条战斗接入

**calculateDamage 重构**
- 返回值从数字改为 `{ damage, resisted }` 对象
- 新增：四系攻击加成（physDmg/fireDmg/frostDmg/lightDmg 百分比乘算到基础攻击力）
- 新增：穿透减防（pierce 百分比忽略目标有效防御）
- 新增：元素抗性减伤（fireRes/frostRes/lightRes/allElemRes，魔法伤害受抗性减免，上限75%）

**executeAction 完整词条链路**
- 重写：伤害计算流程改为 11 步管线（基础伤害→暴击→条件增伤→低血量增伤→首回合增伤→扣血→日志→命中触发→窃取→元素状态→死亡判定）
- 新增：暴击判定（基础5%暴击率 + critRate词条，1.5x + critDmg词条，上限75%暴击率）
- 新增：条件增伤（目标有对应状态时额外伤害：冰霜+减速/雷电+僵直/火焰+灼烧/物理+流血）
- 新增：低血量增伤（HP<30% lowHpDmg / HP<20% veryLowHpDmg）
- 新增：首回合增伤（第一回合 firstTurnDmg 额外伤害）
- 新增：词条命中触发（bleedOnCrit暴击流血/burnOnHit命中灼烧/slowOnHit命中减速/stunOnHit命中僵直）
- 新增：命中减益（reduceArmor物理命中减甲/reduceSpeed冰霜命中减速/burnReduceAtk灼烧减攻）
- 新增：生命/法力窃取（lifeSteal/manaSteal 按最终伤害百分比回复）
- 新增：不可屈挠（cheatDeathChance 玩家方致死时概率保留1HP）
- 新增：击杀爆炸 AOE（aoeOnKill 击杀后概率对其他敌人造成50%攻击力火焰伤害）
- 新增：技能击杀同样触发不可屈挠和击杀爆炸

**技能系统联动**
- 修改：`skills.js` useSkill() 适配 calculateDamage 新返回值
- 新增：技能伤害同样走暴击判定、条件增伤、低血量增伤、首回合增伤
- 新增：技能命中后触发词条命中效果和生命/法力窃取
- 新增：技能暴击在日志中显示【暴击】标签

**日志增强**
- 伤害日志自动标注：暴击/抗性减免/条件增伤/低血量增伤/首回合增伤/吸血吸魔

**文件变更**
- 修改文件：`systems/combat.js`、`systems/skills.js`、`DEVLOG.md`

### 2026-07-25 v1.2.1 Bug修复批次

**修复 5 项**
- 修复：`combat.js` 使用药水时引用未定义变量 `beforeHp2`/`beforeMp2`（→ 重命名为 `beforeHealHp`/`beforeHealMp`，修正引用）
- 修复：`combat.js` applyStatusEffect() 中 `dmgTypeInfo` 死代码（`DATA && DATA.damageTypes ? null : null` 永远为 null，已删除）
- 修复：`data.js` 治疗术技能 `element: null` 导致 renderer 无法识别为治疗技能、无法点击友方目标（→ 改为 `element: "heal"`）
- 修复：`data.js` typeToSlot 缺少 `armor` 映射，generateEquipment 生成的防具无法装备（→ 补充 `armor: "chest"`）
- 修复：`equipment.js` socket/unsocket 将数字数组当对象使用（`item.sockets` 为 `[0,1,2]`，却访问 `[idx].gem`）→ 新增 `_ensureSocketObjects()` 自动转换

**文件变更**
- 修改文件：`systems/combat.js`、`core/data.js`、`systems/equipment.js`

### 2026-07-25 v1.2 战斗核心系统批次

**四系伤害 + 异常状态系统**
- 新增：`combat.js` calculateDamage() 支持 damageType 参数（物理减伤50%/魔法减伤30%）
- 新增：异常状态引擎（applyStatusEffect/processStatusEffects/tickStatusEffects/isStunned/getEffectiveSpeed）
- 新增：流血DOT（攻击力×0.3/回合，3回合，不可叠加）
- 新增：灼烧DOT（攻击力×0.4/回合，3回合，可叠加2层）
- 新增：减速（速度-30%，2回合，影响行动顺序排序）
- 新增：僵直（跳过1回合行动，在processTurn中检查）
- 新增：tryApplyStatusFromDamageType() 按概率自动触发状态（物理10%/火20%/冰25%/雷15%）
- 修改：executeAction() 传递伤害类型，普通攻击有概率触发对应异常状态
- 修改：calculateTurnOrder() 使用 getEffectiveSpeed() 考虑减速效果
- 修改：nextTurn() 回合结束时调用 tickStatusEffects() 递减所有状态持续时间
- 修改：processTurn() 回合开始时处理DOT伤害和僵直检查

**技能系统接入**
- 修改：`skills.js` useSkill() 使用 combat.calculateDamage() 按技能元素计算伤害
- 修改：apply_status 效果实际调用 combat.applyStatusEffect() 施加状态
- 新增：元素技能自动触发状态（无显式apply_status的火/冰/雷技能10%概率触发）

**随从AI策略系统**
- 新增：`combat.js` 四种AI策略（aggressive/healer/defensive/balanced）
- 攻击型：优先攻击HP最低的敌人
- 治疗型：队友HP<50%时消耗MP治疗，否则攻击
- 防御型：自身HP<30%时防御，否则攻击攻击力最高的敌人
- 平衡型：攻击第一个可用敌人（原始行为）
- 修改：`scene.js` getAllyUnits() 按职业分配默认AI策略（战士→攻击/法师→治疗/其他→平衡）

**挂机采集系统**
- 新增：`scene.js` idleGather() 8轮循环采集（70%采集/15%遇敌/10%金币/5%稀有）
- 新增：`renderer.js` startIdleGather() 结算面板渲染（汇总数据+详细日志）
- 新增：`style.css` 挂机采集结算面板样式

**UI 增强**
- 新增：`renderer.js` renderStatusIcons() 异常状态图标渲染（🩸🔥❄⚡+剩余回合数）
- 修改：updateUnitCard() 实时刷新状态图标和有效速度显示
- 新增：`style.css` 状态图标样式（四色边框区分状态类型）

**文件变更**
- 修改文件：`systems/combat.js`、`systems/skills.js`、`systems/scene.js`、`ui/renderer.js`、`css/style.css`、`DEVLOG.md`

### 2026-07-24 v1.1 功能扩展批次

**修复已知问题（4项）**
- 修复：战斗结束后 HP/MP 不同步回写 state → `combat.js` endCombat() 中加入同步逻辑
- 修复：玩家死亡后无复活/重载流程 → 调用 StateUtils.handleDeath()，区分灰烟村/外域/硬核模式
- 修复：道具按钮固定回复 30HP → 改为读取背包 consumable 物品，按优先级使用
- 修复：装备词条属性未叠加 → syncPlayerToCombatData() 遍历 affixes 调用 applyAffix()

**新增系统**
- 新增：商店/交易系统 `systems/shop.js`（ShopSystem：买/卖/商品列表）
- 新增：NPC 对话系统 `systems/dialogue.js`（DialogueSystem：对话树/选项分支/动作执行/商店触发）
- 新增：技能系统基础框架 `systems/skills.js`（SkillSystem：9个技能/MP消耗/冷却/等级职业分支限制）
- 新增：装备掉落机制（战斗后按怪物类型概率生成随机装备）
- 新增：消耗品数据定义 `DATA.consumables`

**扩展灰烟村场景（6个新帧）**
- 药草园（采集草药 / 驱赶毒蛇战斗）
- 村长家（与村长对话）
- 村东鱼塘（抓螃蟹 / 采集水草）
- 杂货铺（与三婶对话 → 打开商店）
- 练功场（单人对练 / 三人挑战）
- 后山小径（清剿山贼 / 采集野果）
- 新增敌人：毒蛇(Lv2)、村练兵(Lv3)、山贼(Lv3)
- 灰烟村中心枢纽出口扩展为 10 个

**增强 UI 面板**
- 背包面板：搜索框 + 品质筛选 + 点击详情 + 穿戴/使用/丢弃操作
- 装备面板：属性总和 + 详情面板 + 卸下/锻造/附魔操作
- 技能面板：战斗中选技能 → 点目标释放的两阶段流程
- 新增 CSS：对话框样式 / 物品详情 / 搜索筛选 / 商店面板

**新增 NPC 对话**
- 艾琳（2条分支）、铁匠老哈（3条分支）、杂货店米拉（商店+闲聊）
- 村长（父亲线索+家谱）、杂货铺三婶（商店+村庄八卦）

**文件变更**
- 新增文件：`systems/shop.js`、`systems/dialogue.js`、`systems/skills.js`
- 修改文件：`core/data.js`、`systems/combat.js`、`app.js`、`systems/scene.js`、`ui/renderer.js`、`css/style.css`、`index.html`
- 脚本加载顺序：data → utils → state → combat → equipment → inventory → shop → dialogue → skills → scene → renderer → app

### 2025-07 v1.0 初始版本
- 全部核心文件从头重写（10个文件）
- 修复：SyntaxError（可选链语法兼容）
- 修复：ReferenceError（UIRenderer 未定义，脚本加载顺序）
- 修复：浮点数显示（9.600000000000001 → 9.6）
- 新增：移动端响应式优化
- 新增：灰烟村5帧测试内容
