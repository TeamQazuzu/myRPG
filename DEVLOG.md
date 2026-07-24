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
- **开发状态**：v1.0 核心重写完成，灰烟村可测试战斗和采集，处于早期原型阶段

## 文件结构
```
index.html              ← 入口页面，按顺序加载以下脚本
core/data.js           ← 游戏数据定义（属性/职业/伤害类型/品质/80条词条/世界地图/守门员/NPC/货币等）
core/utils.js          ← 工具函数（随机/数值计算/装备生成/怪物生成/格式化/UUID等）
core/state.js          ← 状态管理 + 存档系统（SaveManager/StateUtils/默认状态createDefaultState）
systems/combat.js      ← 战斗引擎（回合制、3v6、攻击/技能/防御/道具/撤退、伤害计算、奖励发放）
systems/equipment.js   ← 装备系统（穿戴/卸下/锻造升级/附魔/镶嵌/符文之语/装备对比）
systems/inventory.js   ← 背包与仓库（堆叠/存取/升级/装备快捷操作/材料/搜索筛选排序）
systems/scene.js       ← 帧式场景管理（场景定义/敌人数据/战斗触发/采集/休息）
ui/renderer.js         ← UI渲染（冒险画面/战斗画面/单位卡片/日志/面板/角色创建/底部管理栏）
css/style.css          ← 完整样式（暗色主题/桌面+移动端响应式/品质颜色/面板/滚动条）
app.js                 ← 主入口（GameApp类、初始化/角色创建/自动存档/属性同步）
XQ.md                  ← 游戏设计文档（GDD v11.1）
DEVLOG.md              ← 本文件，开发进度与上下文
```

## 架构要点

### 模块加载顺序（index.html 中严格按此顺序）
data → utils → state → combat → equipment → inventory → scene → renderer → app

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

### 灰烟村测试内容
- [x] 灰烟村·村口（安全区枢纽，通往酒馆/铁匠铺/荒地/矿脉）
- [x] 灰烟村·酒馆（休息恢复HP/MP）
- [x] 灰烟村·铁匠铺（NPC对话占位）
- [x] 灰烟村·村边荒地（6只野狗战斗，测试3v6最大场面）
- [x] 灰烟村·村边矿脉（石头采集，测试采集系统）

### UI与交互
- [x] 双视图切换（冒险画面 ↔ 战斗画面）
- [x] 玩家信息栏（名字/等级/HP条/MP条/金币）
- [x] 战斗单位卡片（HP血条/三属性/死亡灰显/选中高亮）
- [x] 战斗日志（最近6条滚动）
- [x] 底部管理栏（背包/装备/队伍/存档/设置5个面板）
- [x] 移动端响应式优化（字号/触摸区域/血条/输入框）
- [x] 浮点数显示修复（属性数值取整/速度保留1位小数）

---

## 待开发功能

### 高优先级
- [ ] 对话系统（NPC对话树/选项分支）
- [ ] 商店/交易系统（买/卖/价格浮动）
- [ ] 技能系统（4元素分支技能/MP消耗/冷却）—— 目前技能按钮是 1.5 倍普攻占位
- [ ] 更多灰烟村场景帧（裁缝铺/皮匠铺/村医屋/墓地）
- [ ] 装备掉落（战斗后随机装备生成）

### 中优先级
- [ ] 冒险地图帧探索（已知区域快速跳转/未知区域逐格探索）
- [ ] 挂机采集系统
- [ ] 随从AI策略（攻击型/防御型/治疗型）
- [ ] 装备强化（而非仅锻造升品质）
- [ ] 经验锁内的升级提示引导

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
1. **技能占位**：技能按钮点击后使用 1.5 倍普攻，未接入真实技能系统
2. **道具占位**：道具按钮固定回复 30HP，未读取背包药品
3. **未实现功能**：对话/查看/挂机采集均为文字占位提示
4. **战斗HP同步**：战斗结束后 HP 变化未写回 state（需在 combat-end 事件中同步）
5. **死亡流程**：玩家死亡后无复活/重载流程处理
6. **面板交互**：装备面板和背包面板目前仅展示，无穿戴/使用/丢弃等操作
7. **装备属性叠加**：`syncPlayerToCombatData()` 遍历装备槽叠加基础属性，但未叠加词条属性

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

### 灰烟村场景地图（当前）
```
         ┌──────┐
         │ 矿脉  │ ← 采集石头
         └──┬───┘
┌──────┐ ┌──┴───┐ ┌──────┐
│酒馆  │─│灰烟村 │─│铁匠铺│
└──────┘ └──┬───┘ └──────┘
         ┌──┴───┐
         │ 荒地  │ ← 6只野狗战斗
         └──────┘
```

---

## 变更日志

### 2025-07 v1.0 初始版本
- 全部核心文件从头重写（10个文件）
- 修复：SyntaxError（可选链语法兼容）
- 修复：ReferenceError（UIRenderer 未定义，脚本加载顺序）
- 修复：浮点数显示（9.600000000000001 → 9.6）
- 新增：移动端响应式优化
- 新增：灰烟村5帧测试内容
