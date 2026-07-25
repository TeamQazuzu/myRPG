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
- **开发状态**：v1.2 战斗核心系统，四系伤害/异常状态/随从AI/挂机采集已完成，处于可玩原型阶段

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

### 灰烟村内容（v1.1 扩展后）
- [x] 灰烟村·村口（安全区枢纽，通往10个地点）
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

### 新增系统（v1.1）
- [x] 商店/交易系统（买/卖/杂货店商品列表）
- [x] NPC对话系统（对话树/选项分支/动作执行/5个NPC）
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
- [ ] 更多灰烟村场景帧（裁缝铺/皮匠铺/村医屋/墓地）
- [ ] 装备词条状态效果接入（bleedOnCrit/burnOnHit/slowOnHit/stunOnHit等词条触发）
- [ ] 守门员Boss战特殊机制

### 中优先级
- [ ] 冒险地图帧探索（已知区域快速跳转/未知区域逐格探索）
- [ ] 装备强化（而非仅锻造升品质）
- [ ] 经验锁内的升级提示引导
- [ ] 挂机采集离线计算（基于时间戳）

### 低优先级
- [ ] 灰烬山脉区域（第二个大区域）
- [ ] 守门员战斗（村长/守夜人等特殊Boss战）
- [ ] 碎片收集系统（12碎片）
- [ ] 金龙/银龙随机事件
- [ ] 音乐/音效
- [ ] 成就系统
- [ ] 统计面板（击杀数/采集量/游戏时长）

---

## 已知问题（需修复）
1. **装备词条状态效果未接入**：词条池中定义了 bleedOnCrit/burnOnHit 等触发效果，但战斗引擎尚未读取装备词条来触发对应状态
2. **面板交互边界**：背包/装备面板操作后偶现状态不同步，需测试
3. **商店价格浮动未实现**：当前为固定价格，GDD 要求价格浮动

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
