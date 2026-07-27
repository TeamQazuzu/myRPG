/**
 * 寻亲风云录 - NPC 对话与任务系统
 */
const NPCSystem = {
  // 场景NPC配置
  sceneNPCs: {
    '灰烟村_酒馆': [
      {
        id: 'ailin_tavern',
        name: '艾琳',
        dialogue: [
          { text: '你回来了。今天外面风很大，要小心。', condition: null },
          { text: '我父亲的弓还保养得很好...如果你需要，我可以教你一些射箭技巧。', condition: () => window.gameApp && window.gameApp.state.player.level >= 5 },
        ],
        actions: [
          { label: '对话', type: 'talk' },
          { label: '查看装备', type: 'inspect' },
        ]
      },
      {
        id: 'tavern_keeper',
        name: '酒馆老板',
        dialogue: [
          { text: '来杯麦酒吗？今天有上等的黑麦酒。', condition: null },
          { text: '听说村外的野狗最近很不安分，你可要小心。', condition: null },
        ],
        actions: [
          { label: '购买麦酒（5铜）', type: 'buy', item: { name: '麦酒', type: 'consumable', heal: 15, price: 0.05 } },
          { label: '打听消息', type: 'talk' },
        ]
      }
    ],
    '灰烟村_铁匠铺': [
      {
        id: 'blacksmith_old',
        name: '老铁匠',
        dialogue: [
          { text: '叮叮当当！年轻人，想要一把趁手的武器吗？', condition: null },
          { text: '我年轻的时候也想过出去闯荡...但现在，炉火就是我的全部。', condition: null },
          { text: '听说你父母在寻找什么...或许村长知道更多。', condition: null, triggerEvent: 'smithSword' },
        ],
        actions: [
          { label: '锻造装备', type: 'forge_menu' },
          { label: '修理装备', type: 'repair' },
        ]
      }
    ],
    '灰烟村_裁缝铺': [
      {
        id: 'tailor_woman',
        name: '裁缝',
        dialogue: [
          { text: '需要一件新衣服吗？刚到的棉布，质地很好。', condition: null },
          { text: '最近村里的布匹供应有些紧张...', condition: null },
        ],
        actions: [
          { label: '购买布衣', type: 'buy', item: { name: '布衣', type: 'armor', rarity: 'white', level: 1, price: 1 } },
        ]
      }
    ],
    '灰烟村': [
      {
        id: 'village_chief',
        name: '村长',
        dialogue: [
          { text: '年轻人，你爹娘临走前嘱咐我照看你。', condition: null },
          { text: '如果你真想变强，就得去灰烟村外面看看。但记住，外面的世界很危险。', condition: null },
          { text: '你爹娘...他们留下了一些东西。等你准备好了，我可以告诉你更多。', condition: () => window.gameApp && window.gameApp.state.player.level >= 10, triggerEvent: 'villageChiefTruth' },
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

  getNPCsForScene(sceneName) {
    return this.sceneNPCs[sceneName] || [];
  },

  getDialogue(npc) {
    if (!npc || !npc.dialogue) return '...';
    const available = npc.dialogue.filter(d => {
      if (!d.condition) return true;
      try { return d.condition(); } catch (e) { return false; }
    });
    if (available.length === 0) return '...';
    // 轮流显示，记录已对话次数
    const state = window.gameApp ? window.gameApp.state : null;
    const key = `npc_talk_count_${npc.id}`;
    const count = (state && state.world.flags[key]) || 0;
    const idx = count % available.length;
    if (state) {
      if (!state.world.flags) state.world.flags = {};
      state.world.flags[key] = count + 1;
    }
    const line = available[idx];
    // 触发事件
    if (line.triggerEvent && state) {
      if (!state.quests.events[line.triggerEvent]) {
        state.quests.events[line.triggerEvent] = true;
        NPCSystem.logEvent(`📜 触发事件：${line.triggerEvent}`);
      }
    }
    return line.text;
  },

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
          StateUtils.addGold(state, price); // 退款
          return { ok: false, msg: '背包已满' };
        }
        return { ok: true, msg: `购买成功：${bought.name}`, type: 'buy' };

      case 'forge_menu':
        return { ok: true, msg: 'forge_menu', type: 'forge_menu' };

      case 'repair':
        const repairCost = 2;
        if (!StateUtils.spendGold(state, repairCost)) {
          return { ok: false, msg: `修理费 ${repairCost} 金币不足` };
        }
        // 恢复装备耐久（简化：恢复玩家HP）
        state.player.hp = state.player.maxHp;
        return { ok: true, msg: '装备已修复，你也得到了休整。', type: 'repair' };

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

  // 检查任务推进
  checkQuestProgress(state) {
    const events = state.quests.events;
    const flags = state.world.flags;

    // 示例：完成所有灰烟村事件后解锁新场景
    const greyVillageEvents = ['smithSword', 'riverWoman', 'hunterBoar'];
    const completed = greyVillageEvents.filter(e => events[e]).length;
    if (completed >= 2 && !flags.greyVillage_explored) {
      flags.greyVillage_explored = true;
      this.logEvent('📜 灰烟村的居民们开始信任你了。');
    }
  }
};

try { module.exports = NPCSystem; } catch(e) {}
