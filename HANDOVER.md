# YAIR-game 项目交接文档

## 项目概述
《寻亲风云录》— 一个纯前端文字冒险RPG游戏，使用原生HTML/CSS/JavaScript开发，无需构建工具。

## 运行方式
```bash
# 方式1：Python
python -m http.server 8080 --directory <项目目录>

# 方式2：Node
npx http-server -p 8080 -c-1 <项目目录>

# 访问：http://localhost:8080/index.html
```

## 项目结构
```
YAIR-game/
├── index.html          # 入口HTML
├── app.js              # 主控制器（GameApp类）
├── style.css           # 全部样式
├── core/
│   ├── data.js         # 核心数据：物品、怪物、技能、场景定义
│   └── state.js        # 初始状态 & StateUtils（经验、金币、死亡处理等）
├── systems/
│   ├── combat.js       # 战斗引擎
│   ├── companion.js    # 同伴系统（招募、装备、升级、技能）
│   ├── equipment.js    # 装备系统
│   ├── inventory.js    # 背包系统（添加、移除、使用、堆叠）
│   └── scene.js        # 场景系统（场景切换、敌人创建）
└── ui/
    └── renderer.js     # UI渲染器（背包、装备、同伴、技能等面板）
```

## 已完成功能清单

### 1. 经验丹系统 ✅
- **文件**: `core/data.js`, `core/state.js`, `systems/inventory.js`
- **物品定义**: `expPillS` — 橙色品质，消耗品，使用获得1000000经验
- **初始预置**: 新角色背包含5个经验丹（stack=5）
- **使用逻辑**: `useItem(state, itemId, target)` 支持对主角/同伴使用
- **测试结果**: 使用1个经验丹 → 主角从Lv.1升至Lv.20

### 2. 物品堆叠系统 ✅
- **文件**: `systems/inventory.js` `_getStackLimit()`
- **堆叠规则**: 
  - 物品定义的 `maxStack` 优先
  - white/green品质默认99，其他10
- **已标记物品**: 经验丹、生命药水、法力药水、狗牙、兔毛、盗贼令牌等均为 `stackable: true, maxStack: 99`

### 3. 怪物掉落系统 ✅
- **文件**: `core/data.js`, `app.js`, `systems/scene.js`
- **掉落配置**: 每个怪物有 `drops` 数组，含 `item/chance/min/max`
- **关键修复**: 
  - 敌人单位添加 `monsterKey` 属性存储原始英文ID
  - `app.js` 的 `_onCombatEnd` 使用 `e.monsterKey` 而非 `e.name`（中文名）查找怪物数据
- **已知掉落**:
  - 野狼 → 狗牙(70%)、生命药水(5%)
  - 野兔 → 兔毛
  - 山贼 → 盗贼令牌(50%)、生命药水(15%)

### 4. 同伴物品使用 ✅
- **文件**: `systems/inventory.js`, `ui/renderer.js`, `style.css`
- **功能**: 背包中点击"使用"按钮 → 弹出目标选择面板 → 选择主角或同伴
- **支持物品类型**:
  - `exp`: 经验丹可给同伴使用（调用 `CompanionSystem.addExp`）
  - `heal`: 生命药水可给同伴使用
  - `mana`: 法力药水可给同伴使用
- **异常处理**: 同伴不存在、已阵亡均返回错误

### 5. 背包UI增强 ✅
- **文件**: `ui/renderer.js` `_renderInventory()`
- **显示**: 物品名称（品质色）、类型标签、等级、描述、堆叠数
- **交互**: 可使用物品显示绿色"使用"按钮 → 点击弹出目标选择器
- **日志**: 使用后显示 "经验+1000000给 酒馆少年" 等格式

### 6. 初始测试物品 ✅
新角色背包默认包含:
| 物品 | 堆叠 | 用途 |
|------|------|------|
| 经验丹 | ×5 | 测试升级（1000000经验/个） |
| 生命药水 | ×3 | 恢复50%生命 |
| 法力药水 | ×2 | 恢复50%法力 |

## 关键Bug修复记录

### Bug 1: 怪物掉落不生效
- **根因**: `_onCombatEnd` 用 `e.name`（中文名如"野狼"）查找 `DATA.monsters`，但key是英文"wolf"
- **修复**: `scene.js` 中 `_createEnemyUnit` 添加 `monsterKey` 属性；`app.js` 改用 `e.monsterKey` 查找

### Bug 2: 堆叠物品无法正确合并
- **根因**: `_getStackLimit` 未检查物品定义中的 `maxStack`
- **修复**: 优先读取 `DATA.items[item.id].maxStack`

## 待完成/可优化事项

### 1. 同伴物品使用的浏览器测试 ⚠️
- **状态**: 代码已实现，服务器端口冲突未能完成浏览器端测试
- **需要验证**: 
  - 招募同伴后，背包"使用"按钮是否弹出目标选择面板
  - 选择同伴后，经验丹是否正确给同伴加经验
  - 治疗药水能否恢复同伴HP
  - 阵亡同伴能否使用物品（应报错）

### 2. 战斗中药水自动使用
- **建议**: 战斗系统应支持自动使用药水（HP低于30%时使用）
- **涉及**: `systems/combat.js`

### 3. 更多消耗品类型
- 可扩展: 攻击卷轴、护盾卷轴、复活道具等
- 在 `inventory.js` 的 `useItem` switch中添加新 case

### 4. 仓库系统
- `inventory.js` 已有 `moveToStorage/moveToInventory` 方法
- 但UI尚未实现仓库面板

### 5. 更多怪物/场景内容
- 当前怪物较少，可在 `data.js` 中扩展
- 场景切换逻辑在 `scene.js`

## 技术规范
- 纯前端，无需编译
- 数据驱动: 所有游戏数据定义在 `core/data.js`
- 状态管理: `state` 对象通过 `window.gameApp.state` 全局访问
- 存档: LocalStorage (`chronicle_keeper_save`)
- 风格: 暗色主题，渐变配色，卡牌式UI

## 快速上手
1. 启动本地HTTP服务器
2. 打开 `http://localhost:8080/index.html`
3. 创建角色（战士/游侠/法师）
4. 在酒馆招募艾琳为同伴
5. 打开背包，点击经验丹的"使用"按钮 → 选择目标
6. 去荒地战斗验证掉落系统
