const InventorySystem = {
  _getState() {
    if (window.gameApp && window.gameApp.state) return window.gameApp.state;
    return null;
  },

  addItem(state, item) {
    if (state.inventory.items.length >= state.inventory.capacity) {
      return { ok: false, reason: "背包已满", overflow: item };
    }
    const maxStack = this._getStackLimit(item);
    if (item.stackable) {
      const existing = state.inventory.items.find(i =>
        i.name === item.name && (i.stack || 1) < maxStack);
      if (existing) {
        const space = maxStack - (existing.stack || 1);
        const add = Math.min(space, item.stack || 1);
        existing.stack = (existing.stack || 1) + add;
        if ((item.stack || 1) > add) {
          item.stack = (item.stack || 1) - add;
          return this.addItem(state, item);
        }
        return { ok: true, stacked: true };
      }
    }
    state.inventory.items.push({ ...item, stack: item.stack || 1 });
    return { ok: true };
  },

  _getStackLimit(item) {
    if (item.maxStack) return item.maxStack;
    if (item.stackable === undefined && DATA.items && DATA.items[item.id]) {
      const def = DATA.items[item.id];
      if (def.maxStack) return def.maxStack;
    }
    if (item.type === "gold") return 9999;
    if (item.rarity === "white" || item.rarity === "green") return 99;
    return 10;
  },

  removeItem(state, itemId, count = 1) {
    const idx = state.inventory.items.findIndex(i => i.id === itemId);
    if (idx === -1) return { ok: false, reason: "物品不存在" };
    const item = state.inventory.items[idx];
    if (item.stack > count) {
      item.stack -= count;
      return { ok: true, removed: count, remaining: item.stack };
    }
    state.inventory.items.splice(idx, 1);
    return { ok: true, removed: item.stack, item };
  },

  moveToStorage(state, itemId, count = 1) {
    const invIdx = state.inventory.items.findIndex(i => i.id === itemId);
    if (invIdx === -1) return { ok: false, reason: "背包中没有该物品" };
    const item = state.inventory.items[invIdx];
    if (state.storage.items.length >= state.storage.capacity) {
      return { ok: false, reason: "仓库已满" };
    }
    if (item.stack > count) {
      item.stack -= count;
      state.storage.items.push({ ...item, stack: count, id: Utils.uuid() });
    } else {
      state.inventory.items.splice(invIdx, 1);
      state.storage.items.push(item);
    }
    return { ok: true };
  },

  moveToInventory(state, itemId, count = 1) {
    const stgIdx = state.storage.items.findIndex(i => i.id === itemId);
    if (stgIdx === -1) return { ok: false, reason: "仓库中没有该物品" };
    const item = state.storage.items[stgIdx];
    if (state.inventory.items.length >= state.inventory.capacity) {
      return { ok: false, reason: "背包已满" };
    }
    if (item.stack > count) {
      item.stack -= count;
      state.inventory.items.push({ ...item, stack: count, id: Utils.uuid() });
    } else {
      state.storage.items.splice(stgIdx, 1);
      state.inventory.items.push(item);
    }
    return { ok: true };
  },

  upgradeStorage(state) {
    const costs = [100, 300, 600, 1000, 1500];
    if (state.storage.upgradeLevel >= costs.length) {
      return { ok: false, reason: "仓库已达最大容量" };
    }
    const cost = costs[state.storage.upgradeLevel];
    if (!StateUtils.spendGold(state, cost)) {
      return { ok: false, reason: `需要${cost}金币` };
    }
    state.storage.upgradeLevel++;
    state.storage.capacity += 40;
    return { ok: true, newCapacity: state.storage.capacity };
  },

  equipFromInventory(state, itemId) {
    const idx = state.inventory.items.findIndex(i => i.id === itemId);
    if (idx === -1) return { ok: false, reason: "背包中没有该物品" };
    const item = state.inventory.items[idx];
    const slot = EquipmentSystem.typeToSlot(item.type);
    if (!slot) return { ok: false, reason: "该物品不可装备" };
    const old = state.equipment[slot];
    state.equipment[slot] = item;
    state.inventory.items.splice(idx, 1);
    if (old) {
      const addResult = this.addItem(state, old);
      if (!addResult.ok) {
        return { ok: true, equipped: item, dropped: old, warning: "旧装备因背包已满被丢弃" };
      }
    }
    return { ok: true, equipped: item, replaced: old };
  },

  unequipToInventory(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, reason: "空槽位" };
    state.equipment[slot] = null;
    const addResult = this.addItem(state, item);
    if (!addResult.ok) {
      state.equipment[slot] = item;
      return { ok: false, reason: "背包已满，无法卸下" };
    }
    return { ok: true, item };
  },

  useItem(state, itemId, target = null) {
    const idx = state.inventory.items.findIndex(i => i.id === itemId);
    if (idx === -1) return { ok: false, reason: "物品不存在" };
    const item = state.inventory.items[idx];
    if (!item.use) return { ok: false, reason: "该物品不可使用" };

    const consume = () => {
      if (item.stack > 1) {
        item.stack--;
      } else {
        state.inventory.items.splice(idx, 1);
      }
    };

    const getTarget = () => {
      if (!target || target === 'player') return state.player;
      const companion = state.companions.find(c => c.id === target);
      return companion || state.player;
    };

    switch (item.use) {
      case "exp": {
        if (!target || target === 'player') {
          const result = StateUtils.addExp(state, item.value);
          consume();
          return { ok: true, type: "exp", value: item.value, leveled: result.leveled, gained: result.gained, targetName: state.player.name };
        } else {
          const companion = state.companions.find(c => c.id === target);
          if (!companion) return { ok: false, reason: "同伴不存在" };
          if (!companion.alive) return { ok: false, reason: "同伴已阵亡" };
          const result = CompanionSystem.addExp(state, target, item.value);
          consume();
          return { ok: true, type: "exp", value: item.value, leveled: result.leveled, gained: item.value, targetName: companion.name, targetLevel: result.newLevel };
        }
      }
      case "heal": {
        if (!target || target === 'player') {
          const amount = Math.floor(state.player.maxHp * item.value);
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
          consume();
          return { ok: true, type: "heal", value: amount, targetName: state.player.name };
        } else {
          const companion = state.companions.find(c => c.id === target);
          if (!companion) return { ok: false, reason: "同伴不存在" };
          if (!companion.alive) return { ok: false, reason: "同伴已阵亡" };
          const amount = Math.floor(companion.maxHp * item.value);
          companion.hp = Math.min(companion.maxHp, companion.hp + amount);
          consume();
          return { ok: true, type: "heal", value: amount, targetName: companion.name };
        }
      }
      case "mana": {
        if (!target || target === 'player') {
          const amount = Math.floor(state.player.maxMp * item.value);
          state.player.mp = Math.min(state.player.maxMp, state.player.mp + amount);
          consume();
          return { ok: true, type: "mana", value: amount, targetName: state.player.name };
        } else {
          const companion = state.companions.find(c => c.id === target);
          if (!companion) return { ok: false, reason: "同伴不存在" };
          if (!companion.alive) return { ok: false, reason: "同伴已阵亡" };
          const amount = Math.floor(companion.maxMp * item.value);
          companion.mp = Math.min(companion.maxMp, companion.mp + amount);
          consume();
          return { ok: true, type: "mana", value: amount, targetName: companion.name };
        }
      }
      case "teleport": {
        state.player.location = "灰烟村";
        consume();
        return { ok: true, type: "teleport" };
      }
      default:
        return { ok: false, reason: "未知用途" };
    }
  },

  addMaterial(state, materialId, count) {
    if (!state.crafting.materials) state.crafting.materials = {};
    state.crafting.materials[materialId] = (state.crafting.materials[materialId] || 0) + count;
    return { ok: true, total: state.crafting.materials[materialId] };
  },

  spendMaterial(state, materialId, count) {
    const existing = state.crafting.materials[materialId] || 0;
    if (existing < count) return { ok: false, reason: `材料不足` };
    state.crafting.materials[materialId] -= count;
    if (state.crafting.materials[materialId] <= 0) {
      delete state.crafting.materials[materialId];
    }
    return { ok: true };
  },

  getSummary(state) {
    const summary = { total: state.inventory.items.length, capacity: state.inventory.capacity, byRarity: {}, byType: {} };
    for (const item of state.inventory.items) {
      summary.byRarity[item.rarity] = (summary.byRarity[item.rarity] || 0) + (item.stack || 1);
      summary.byType[item.type] = (summary.byType[item.type] || 0) + (item.stack || 1);
    }
    return summary;
  },

  sort(state, sortBy = "rarity") {
    const rarityOrder = { red: 6, orange: 5, purple: 4, blue: 3, green: 2, white: 1, gold: 7 };
    state.inventory.items.sort((a, b) => {
      switch (sortBy) {
        case "rarity": return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        case "level": return (b.level || 0) - (a.level || 0);
        case "name": return a.name.localeCompare(b.name, "zh-CN");
        case "type": return a.type.localeCompare(b.type);
        default: return 0;
      }
    });
  },
};
