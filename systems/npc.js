/**
 * 寻亲风云录 - NPC 交互系统（重构版）
 * 支持：招募、商店（买卖）、锻造、附魔、镶嵌
 */
const NPCSystem = {
  // ========== 场景NPC配置 ==========
  sceneNPCs: {
    '灰烟村·酒馆': [
      {
        id: 'ailin',
        name: '艾琳',
        dialogue: [
          { text: '你回来了。今天外面风很大，要小心。', condition: null },
          { text: '我父亲的弓还保养得很好...我可以陪你一起出发吗？', condition: null },
        ],
        actions: [
          { label: '招募（远程系）', type: 'recruit' },
          { label: '对话', type: 'talk' },
        ],
        recruitId: 'ailin',
      },
      {
        id: 'tavern_keeper',
        name: '酒馆老板',
        dialogue: [
          { text: '来杯麦酒吗？今天有上等的黑麦酒。', condition: null },
          { text: '听说村外的野狗最近很不安分，你可要小心。', condition: null },
        ],
        actions: [
          { label: '购买麦酒（5铜）', type: 'buy', item: { name: '麦酒', type: 'consumable', subtype: 'heal', heal: 15, price: 0.05 } },
          { label: '打听消息', type: 'talk' },
        ]
      }
    ],
    '灰烟村·杂货铺': [
      {
        id: 'merchant',
        name: '杂货商米拉',
        dialogue: [
          { text: '欢迎光临！这里有各种冒险必备品。', condition: null },
          { text: '你爹以前赊过账...不过那都过去了。', condition: null },
        ],
        actions: [
          { label: '打开商店', type: 'shop' },
          { label: '对话', type: 'talk' },
        ],
        shopType: 'grocery',
      }
    ],
    '灰烟村·铁匠铺': [
      {
        id: 'blacksmith_old',
        name: '老铁匠',
        dialogue: [
          { text: '叮叮当当！年轻人，想要一把趁手的武器吗？', condition: null },
          { text: '我年轻的时候也想过出去闯荡...但现在，炉火就是我的全部。', condition: null },
        ],
        actions: [
          { label: '对话', type: 'talk' },
        ],
        shopType: 'blacksmith',
      },
      {
        id: 'warrior_apprentice',
        name: '铁匠学徒',
        dialogue: [
          { text: '师傅说我力气够大，但还缺实战经验...', condition: null },
          { text: '如果有人愿意带我出去见见世面就好了。', condition: null },
        ],
        actions: [
          { label: '招募（战士系）', type: 'recruit' },
          { label: '对话', type: 'talk' },
        ],
        recruitId: 'warrior_apprentice',
      }
    ],
    '灰烟村·炼金铺': [
      {
        id: 'alchemist',
        name: '炼金师',
        dialogue: [
          { text: '瓶中冒着奇异的紫色烟雾...要试试新配制的药水吗？', condition: null },
        ],
        actions: [
          { label: '附魔/镶嵌装备', type: 'alchemist_menu' },
          { label: '对话', type: 'talk' },
        ],
        shopType: 'alchemist',
      },
      {
        id: 'mage_apprentice',
        name: '炼金学徒',
        dialogue: [
          { text: '这些配方太神奇了！但我更想知道外面的世界...', condition: null },
        ],
        actions: [
          { label: '招募（法系）', type: 'recruit' },
          { label: '对话', type: 'talk' },
        ],
        recruitId: 'mage_apprentice',
      }
    ],
    '灰烟村': [
      {
        id: 'village_chief',
        name: '村长',
        dialogue: [
          { text: '年轻人，你爹娘临走前嘱咐我照看你。', condition: null },
          { text: '如果你真想变强，就得去灰烟村外面看看。但记住，外面的世界很危险。', condition: null },
        ],
        actions: [
          { label: '接受试炼', type: 'gatekeeper_battle' },
          { label: '询问父母', type: 'talk' },
        ]
      },
      {
        id: 'village_kid',
        name: '村里的小孩',
        dialogue: [
          { text: '大哥哥/大姐姐，你会去荒地打狗吗？', condition: null },
          { text: '我长大后也要像你一样厉害！', condition: null },
        ],
        actions: [
          { label: '给糖', type: 'give' },
        ]
      }
    ]
  },

  // ========== 查询NPC ==========
  getNPCsForScene(sceneName) {
    // 尝试直接匹配
    if (this.sceneNPCs[sceneName]) return this.sceneNPCs[sceneName];
    // 尝试去掉前缀匹配
    const shortName = sceneName.replace(/^灰烟村[·\-_]/, '灰烟村·');
    if (this.sceneNPCs[shortName]) return this.sceneNPCs[shortName];
    // 尝试用DATA.scenes中的npcs字段构建
    const scene = DATA.scenes ? Object.values(DATA.scenes).find(s => s.name === sceneName) : null;
    if (scene && scene.npcs) {
      return scene.npcs.map(npcId => {
        const npcData = DATA.npcs[npcId];
        if (!npcData) return null;
        return {
          id: npcId,
          name: npcData.name,
          dialogue: [{ text: npcData.desc || '...', condition: null }],
          actions: this._inferActions(npcId, npcData, scene),
          recruitId: npcData.recruit ? npcId : null,
        };
      }).filter(Boolean);
    }
    return [];
  },

  _inferActions(npcId, npcData, scene) {
    const actions = [{ label: '对话', type: 'talk' }];
    if (npcData.recruit) {
      actions.push({ label: '招募', type: 'recruit' });
    }
    if (scene.shopType && (npcId === 'merchant' || npcId === 'blacksmith_old' || npcId === 'alchemist')) {
      actions.push({ label: '交易', type: 'shop' });
    }
    if (npcId === 'blacksmith_old') {
      // 铁匠暂时只有对话和交易，锻造制作系统待实现
    }
    if (npcId === 'alchemist') {
      actions.push({ label: '附魔/镶嵌', type: 'alchemist_menu' });
    }
    if (npcId === 'village_chief') {
      actions.push({ label: '挑战', type: 'gatekeeper_battle' });
    }
    return actions;
  },

  // ========== 对话系统 ==========
  getDialogue(npc) {
    if (!npc || !npc.dialogue) return '...';
    const available = npc.dialogue.filter(d => {
      if (!d.condition) return true;
      try { return d.condition(); } catch (e) { return false; }
    });
    if (available.length === 0) return '...';
    const state = window.gameApp ? window.gameApp.state : null;
    const key = `npc_talk_count_${npc.id}`;
    const count = (state && state.world.flags[key]) || 0;
    const idx = count % available.length;
    if (state) {
      if (!state.world.flags) state.world.flags = {};
      state.world.flags[key] = count + 1;
    }
    const line = available[idx];
    if (line.triggerEvent && state) {
      if (!state.quests.events[line.triggerEvent]) {
        state.quests.events[line.triggerEvent] = true;
        this.logEvent(`📜 触发事件：${line.triggerEvent}`);
      }
    }
    return line.text;
  },

  // ========== 招募系统 ==========
  canRecruit(state, npcId) {
    if (state.companions.length >= 2) return { ok: false, reason: '随从已满（最多2名）' };
    if (state.companions.some(c => c.id === npcId)) return { ok: false, reason: '该随从已在队伍中' };
    const npcData = DATA.npcs[npcId];
    if (!npcData || !npcData.recruit) return { ok: false, reason: '此NPC不可招募' };
    return { ok: true };
  },

  recruitCompanion(state, npcId) {
    const check = this.canRecruit(state, npcId);
    if (!check.ok) return { ok: false, msg: check.reason };

    const npcData = DATA.npcs[npcId];
    const playerLevel = state.player.level;

    // 创建随从对象
    const companion = {
      id: npcId,
      name: npcData.name,
      class: npcData.class,
      level: playerLevel,
      exp: 0,
      expToNext: Math.floor(100 * Math.pow(1.15, playerLevel - 1)),
      attributes: this._getCompanionBaseAttrs(npcData.class),
      hp: 0, maxHp: 0,
      mp: 0, maxMp: 0,
      alive: true,
      skills: this._getCompanionSkills(npcData.class),
      talents: {},
      equipment: {},
      aiStrategy: 'balanced',
    };

    // 根据等级调整属性
    this._scaleCompanionToLevel(companion);

    state.companions.push(companion);
    return { ok: true, msg: `${npcData.name} 加入了队伍！`, companion };
  },

  // ========== 解雇随从 ==========
  dismissCompanion(state, companionId) {
    const idx = state.companions.findIndex(c => c.id === companionId);
    if (idx === -1) return { ok: false, msg: '该随从不在队伍中' };
    const comp = state.companions[idx];
    state.companions.splice(idx, 1);
    return { ok: true, msg: `${comp.name} 离开了队伍。` };
  },

  _getCompanionBaseAttrs(classKey) {
    const attrs = { str: 8, agi: 8, int: 8, vit: 8, ten: 8, spi: 8 };
    if (classKey === 'warrior') {
      attrs.str = 12; attrs.vit = 10; attrs.ten = 10;
      attrs.agi = 6; attrs.int = 5; attrs.spi = 5;
    } else if (classKey === 'ranger') {
      attrs.agi = 14; attrs.str = 10;
      attrs.int = 5; attrs.vit = 7; attrs.ten = 6; attrs.spi = 6;
    } else if (classKey === 'mage') {
      attrs.int = 14; attrs.spi = 12;
      attrs.str = 5; attrs.agi = 6; attrs.vit = 6; attrs.ten = 5;
    }
    return attrs;
  },

  _getCompanionSkills(classKey) {
    if (classKey === 'warrior') return ['normal_attack', 'shield_wall', 'slam'];
    if (classKey === 'ranger') return ['normal_attack', 'rapid_shot', 'slow_arrow'];
    if (classKey === 'mage') return ['normal_attack', 'fireball', 'heal'];
    return ['normal_attack', 'defend'];
  },

  _scaleCompanionToLevel(companion) {
    const attrs = companion.attributes;
    const lv = companion.level;
    // 根据等级提升属性
    for (let i = 1; i < lv; i++) {
      if (companion.class === 'warrior') {
        attrs.str += 2; attrs.vit += 2; attrs.ten += 1;
      } else if (companion.class === 'ranger') {
        attrs.agi += 3; attrs.str += 1;
      } else if (companion.class === 'mage') {
        attrs.int += 3; attrs.spi += 2;
      }
    }
    companion.maxHp = 80 + (attrs.vit - 8) * 10 + lv * 8;
    companion.maxMp = 20 + (attrs.spi - 8) * 5 + lv * 3;
    companion.hp = companion.maxHp;
    companion.mp = companion.maxMp;
    // 计算战斗属性
    companion.physAtk = attrs.str * 2;
    companion.physDef = attrs.str * 1 + attrs.ten * 3;
    companion.magAtk = attrs.int * 2;
    companion.magDef = attrs.int * 1 + attrs.spi * 2 + attrs.ten * 3;
    companion.hit = attrs.agi * 1.5;
    companion.dodge = attrs.agi * 1;
    companion.speed = attrs.agi * 0.8;
    companion.critRate = 0.05;
    companion.critDmg = 1.5;
  },

  // ========== 商店系统 ==========
  getShopItems(shopType) {
    const shop = DATA.shops[shopType];
    if (!shop || !shop.items) return [];
    return shop.items.map(entry => {
      const item = DATA.items[entry.itemId];
      if (!item) return null;
      return { ...item, price: entry.price, stock: entry.stock };
    }).filter(Boolean);
  },

  buyItem(state, shopType, itemId, count = 1) {
    const shop = DATA.shops[shopType];
    if (!shop) return { ok: false, msg: '商店类型不存在' };
    const entry = shop.items.find(i => i.itemId === itemId);
    if (!entry) return { ok: false, msg: '商品不存在' };
    const itemTpl = DATA.items[itemId];
    if (!itemTpl) return { ok: false, msg: '物品模板不存在' };

    const totalPrice = entry.price * count;
    if (!StateUtils.spendGold(state, totalPrice)) {
      return { ok: false, msg: `金币不足，需要 ${totalPrice} 金币` };
    }

    const bought = { ...itemTpl, id: Utils.uuid(), stack: count };
    const addResult = InventorySystem.addToInventory(state, bought);
    if (!addResult.ok) {
      StateUtils.addGold(state, totalPrice); // 退款
      return { ok: false, msg: '背包已满' };
    }
    return { ok: true, msg: `购买成功：${itemTpl.name} x${count}`, item: bought };
  },

  sellItem(state, itemInstanceId, count = 1) {
    const item = state.inventory.items.find(i => i.id === itemInstanceId);
    if (!item) return { ok: false, msg: '物品不存在' };
    const stack = item.stack || 1;
    const sellCount = Math.min(count, stack);

    // 查找基础价格
    const tpl = DATA.items[item.id] || Object.values(DATA.items).find(t => t.name === item.name);
    const basePrice = item.price || (tpl ? tpl.price : 0);
    const sellPrice = Math.max(1, Math.floor(basePrice * 0.5 * sellCount));

    if (typeof InventorySystem !== 'undefined' && InventorySystem.removeFromInventory) {
      InventorySystem.removeFromInventory(state, itemInstanceId, sellCount);
    } else {
      if (sellCount >= stack) {
        state.inventory.items = state.inventory.items.filter(i => i.id !== itemInstanceId);
      } else {
        item.stack -= sellCount;
      }
    }

    StateUtils.addGold(state, sellPrice);
    return { ok: true, msg: `出售成功：${item.name} x${sellCount}，获得 ${sellPrice} 金币` };
  },

  // ========== 锻造系统 ==========
  // 装备强化次数上限（每件装备独立的forgeCount）
  _getMaxForgeCount(item) {
    // 稀有度越高，可锻造次数越多
    const tierMap = { white: 3, green: 5, blue: 8, purple: 10, orange: 12, red: 15, gold: 20 };
    return tierMap[item.rarity] || 3;
  },
  forgeEquipment(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, msg: '该槽位没有装备' };
    // 初始化锻造次数
    if (!item.forgeCount) item.forgeCount = 0;
    const maxCount = this._getMaxForgeCount(item);
    if (item.forgeCount >= maxCount) {
      return { ok: false, msg: `锻造次数已满（${maxCount}次）` };
    }
    // 费用随次数递增
    const cost = 10 + item.forgeCount * 10;
    if (!StateUtils.spendGold(state, cost)) {
      return { ok: false, msg: `锻造需要 ${cost} 金币` };
    }
    // 简化锻造：随机提升基础属性 5-15%
    const boost = 0.05 + Math.random() * 0.1;
    if (item.baseStats) {
      for (const key in item.baseStats) {
        item.baseStats[key] = Math.floor(item.baseStats[key] * (1 + boost));
      }
    }
    item.forgeCount++;
    return { ok: true, msg: `${item.name} 锻造成功！属性提升 ${Math.floor(boost * 100)}%（${item.forgeCount}/${maxCount}）` };
  },

  // ========== 附魔系统 ==========
  enchantEquipment(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, msg: '该槽位没有装备' };
    const cost = 15;
    if (!StateUtils.spendGold(state, cost)) {
      return { ok: false, msg: `附魔需要 ${cost} 金币` };
    }
    // 简化附魔：随机添加一条词条
    const affixPool = Object.entries(DATA.affixPool).filter(([k, v]) => {
      const rarityTier = DATA.rarity[item.rarity]?.tier || 0;
      const affixTier = DATA.rarity[v.minRarity]?.tier || 0;
      return affixTier <= rarityTier;
    });
    if (affixPool.length === 0) return { ok: false, msg: '该装备品质太低，无法附魔' };
    const [affixKey, affixData] = Utils.pickOne(affixPool);
    if (!item.affixes) item.affixes = [];
    item.affixes.push({ id: affixKey, name: affixData.name });
    return { ok: true, msg: `${item.name} 附魔成功！获得词条：${affixData.name}` };
  },

  socketEquipment(state, slot, gemId) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, msg: '该槽位没有装备' };
    const cost = 25;
    if (!StateUtils.spendGold(state, cost)) {
      return { ok: false, msg: `镶嵌需要 ${cost} 金币` };
    }
    // 简化镶嵌：添加宝石属性
    if (!item.sockets) item.sockets = [];
    if (item.sockets.length >= 3) return { ok: false, msg: '该装备孔洞已满' };
    const gem = DATA.items[gemId];
    item.sockets.push({ gemId, name: gem ? gem.name : '未知宝石' });
    return { ok: true, msg: `${item.name} 镶嵌成功！` };
  },

  // ========== 修理 ==========
  repairEquipment(state) {
    const cost = 2;
    if (!StateUtils.spendGold(state, cost)) {
      return { ok: false, msg: `修理费 ${cost} 金币不足` };
    }
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    state.companions.forEach(c => {
      if (c.alive) {
        c.hp = c.maxHp;
        c.mp = c.maxMp;
      }
    });
    return { ok: true, msg: '装备已修复，队伍也得到了休整。' };
  },

  // ========== 使用物品（经验丹等） ==========
  useItem(state, itemId, targetId = 'player') {
    const itemIdx = state.inventory.items.findIndex(i => i.id === itemId);
    if (itemIdx < 0) return { ok: false, msg: '物品不在背包中' };
    const item = state.inventory.items[itemIdx];

    if (item.subtype === 'exp' && item.expValue) {
      if (targetId === 'player') {
        const result = StateUtils.addExp(state, item.expValue);
        this._removeItem(state, itemIdx, 1);
        return { ok: true, msg: result.leveled ? `🆙 使用了${item.name}，升级了！` : `⭐ 使用了${item.name}，获得大量经验`, result };
      } else {
        const comp = state.companions.find(c => c.id === targetId);
        if (!comp) return { ok: false, msg: '目标随从不存在' };
        const result = StateUtils.addExpToCompanion(comp, item.expValue);
        this._removeItem(state, itemIdx, 1);
        return { ok: true, msg: result.leveled ? `🆙 ${comp.name}使用了${item.name}，升级了！` : `⭐ ${comp.name}使用了${item.name}，获得大量经验`, result };
      }
    }

    if (item.subtype === 'heal') {
      const healAmt = item.healHp || item.heal || 0;
      if (healAmt > 0) {
        const target = targetId === 'player' ? state.player : state.companions.find(c => c.id === targetId);
        if (!target) return { ok: false, msg: '目标不存在' };
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + healAmt);
        const healed = target.hp - before;
        this._removeItem(state, itemIdx, 1);
        return { ok: true, msg: `${target.name} 使用 ${item.name}，恢复 ${healed} HP` };
      }
    }

    if (item.subtype === 'mana' && item.healMp) {
      const target = targetId === 'player' ? state.player : state.companions.find(c => c.id === targetId);
      if (!target) return { ok: false, msg: '目标不存在' };
      const before = target.mp || 0;
      target.mp = Math.min(target.maxMp || before, before + item.healMp);
      const restored = target.mp - before;
      this._removeItem(state, itemIdx, 1);
      return { ok: true, msg: `${target.name} 使用 ${item.name}，恢复 ${restored} MP` };
    }

    return { ok: false, msg: '该物品无法使用' };
  },

  _removeItem(state, itemIdx, count) {
    const item = state.inventory.items[itemIdx];
    const stack = item.stack || 1;
    if (count >= stack) {
      state.inventory.items.splice(itemIdx, 1);
    } else {
      item.stack = stack - count;
    }
  },

  // ========== 处理NPC动作 ==========
  handleAction(npc, actionIndex, state) {
    const action = npc.actions[actionIndex];
    if (!action) return { ok: false, msg: '无效操作' };

    switch (action.type) {
      case 'talk':
        return { ok: true, msg: this.getDialogue(npc), type: 'dialogue' };

      case 'buy':
        if (!action.item) return { ok: false, msg: '商品信息错误' };
        const price = action.item.price || 1;
        if (!StateUtils.spendGold(state, price)) {
          return { ok: false, msg: `金币不足，需要 ${price} 金币` };
        }
        const bought = { ...action.item, id: Utils.uuid() };
        delete bought.price;
        const addResult = InventorySystem.addToInventory(state, bought);
        if (!addResult.ok) {
          StateUtils.addGold(state, price);
          return { ok: false, msg: '背包已满' };
        }
        return { ok: true, msg: `购买成功：${bought.name}`, type: 'buy' };

      case 'shop':
        return { ok: true, msg: 'shop', type: 'shop', shopType: npc.shopType || 'grocery' };

      case 'recruit': {
        const recruitId = npc.recruitId || npc.id;
        const result = this.recruitCompanion(state, recruitId);
        return { ok: result.ok, msg: result.msg, type: 'recruit', companion: result.companion };
      }

      case 'forge_menu':
        return { ok: true, msg: 'forge_menu', type: 'forge_menu' };

      case 'alchemist_menu':
        return { ok: true, msg: 'alchemist_menu', type: 'alchemist_menu' };

      case 'repair': {
        const res = this.repairEquipment(state);
        return { ok: res.ok, msg: res.msg, type: 'repair' };
      }

      case 'gatekeeper_battle':
        return { ok: true, msg: 'gatekeeper', type: 'gatekeeper' };

      case 'give':
        return { ok: true, msg: '小孩开心地接过了糖果。', type: 'give' };

      default:
        return { ok: false, msg: '暂未实现' };
    }
  },

  logEvent(msg) {
    console.log('[任务]', msg);
    const renderer = window.gameApp && window.gameApp.uiRenderer;
    if (renderer && renderer.addGameLog) renderer.addGameLog(msg);
  },

  checkQuestProgress(state) {
    const events = state.quests.events;
    const flags = state.world.flags;
    const greyVillageEvents = ['smithSword', 'riverWoman', 'hunterBoar'];
    const completed = greyVillageEvents.filter(e => events[e]).length;
    if (completed >= 2 && !flags.greyVillage_explored) {
      flags.greyVillage_explored = true;
      this.logEvent('📜 灰烟村的居民们开始信任你了。');
    }
  }
};

try { module.exports = NPCSystem; } catch(e) {}
