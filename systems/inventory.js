const InventorySystem = {
  addToInventory(state, item) {
    if (state.inventory.items.length >= state.inventory.capacity) {
      return { ok: false, reason: "背包已满", overflow: item };
    }
    if (item.stackable) {
      const existing = state.inventory.items.find(i =>
        i.type === item.type && i.name === item.name && i.stack < this.getStackLimit(i)
      );
      if (existing) {
        const space = this.getStackLimit(existing) - existing.stack;
        const add = Math.min(space, item.stack || 1);
        existing.stack += add;
        if ((item.stack || 1) > add) {
          item.stack -= add;
          return this.addToInventory(state, item);
        }
        return { ok: true, stacked: true };
      }
    }
    state.inventory.items.push({ ...item, stack: item.stack || 1 });
    return { ok: true, stacked: false };
  },
  removeFromInventory(state, itemId, count = 1) {
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
  getStackLimit(item) {
    if (!DATA.inventory || !DATA.inventory.stackLimits) return 99;
    if (item.type === "gold") return DATA.inventory.stackLimits.gold;
    if (item.rarity === "white" || item.rarity === "green") {
      return DATA.inventory.stackLimits.basic;
    }
    return DATA.inventory.stackLimits.rare;
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
    let slot = EquipmentSystem.typeToSlot(item.type);
    if (!slot) return { ok: false, reason: "该物品不可装备" };
    // 戒指特殊处理：若 ring1 已占用且是戒指，尝试 ring2
    if (item.type === "ring" && state.equipment.ring1 && state.equipment.ring1.type === "ring") {
      if (!state.equipment.ring2 || state.equipment.ring2.type !== "ring") {
        slot = "ring2";
      }
    }
    const result = EquipmentSystem.equip(state, item, slot);
    if (!result.ok) return result;
    state.inventory.items.splice(idx, 1);
    if (result.replaced) {
      const addResult = this.addToInventory(state, result.replaced);
      if (!addResult.ok) {
        return { ok: true, equipped: item, dropped: result.replaced, warning: "旧装备因背包已满被丢弃" };
      }
    }
    return { ok: true, equipped: item, replaced: result.replaced };
  },
  unequipToInventory(state, slot) {
    const result = EquipmentSystem.unequip(state, slot);
    if (!result.ok) return result;
    const addResult = this.addToInventory(state, result.item);
    if (!addResult.ok) {
      EquipmentSystem.equip(state, result.item, slot);
      return { ok: false, reason: "背包已满，无法卸下" };
    }
    return { ok: true, item: result.item };
  },
  addMaterial(state, materialId, count) {
    const existing = state.crafting.materials[materialId];
    if (existing) {
      state.crafting.materials[materialId] += count;
    } else {
      state.crafting.materials[materialId] = count;
    }
    return { ok: true, total: state.crafting.materials[materialId] };
  },
  spendMaterial(state, materialId, count) {
    const existing = state.crafting.materials[materialId] || 0;
    if (existing < count) {
      return { ok: false, reason: `材料不足，需要${count}，仅有${existing}` };
    }
    state.crafting.materials[materialId] -= count;
    if (state.crafting.materials[materialId] <= 0) {
      delete state.crafting.materials[materialId];
    }
    return { ok: true };
  },
  addGold(state, amount) {
    return StateUtils.addGold(state, amount);
  },
  spendGold(state, amount) {
    return StateUtils.spendGold(state, amount);
  },
  getInventorySummary(state) {
    const summary = {
      total: state.inventory.items.length,
      capacity: state.inventory.capacity,
      byRarity: {},
      byType: {},
      equipment: [],
      materials: [],
      consumables: [],
    };
    for (const item of state.inventory.items) {
      summary.byRarity[item.rarity] = (summary.byRarity[item.rarity] || 0) + (item.stack || 1);
      summary.byType[item.type] = (summary.byType[item.type] || 0) + (item.stack || 1);
      if (["sword","axe","hammer","bow","staff","dagger","shield","armor","helmet","legs","boots","gloves","necklace","ring"].includes(item.type)) {
        summary.equipment.push(item);
      } else if (["ore","gem","leather","cloth","herb","meat"].includes(item.type)) {
        summary.materials.push(item);
      } else {
        summary.consumables.push(item);
      }
    }
    return summary;
  },
  searchInventory(state, keyword) {
    return state.inventory.items.filter(i =>
      i.name.includes(keyword) ||
      (i.affixes && i.affixes.some(a => a.name.includes(keyword)))
    );
  },
  filterByRarity(state, rarity) {
    return state.inventory.items.filter(i => i.rarity === rarity);
  },
  filterByType(state, type) {
    return state.inventory.items.filter(i => i.type === type);
  },
  discard(state, itemId, count = 1) {
    return this.removeFromInventory(state, itemId, count);
  },
  sortInventory(state, sortBy = "rarity") {
    const rarityOrder = { red: 6, orange: 5, purple: 4, blue: 3, green: 2, white: 1, gold: 7 };
    state.inventory.items.sort((a, b) => {
      switch (sortBy) {
        case "rarity":
          return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        case "level":
          return (b.level || 0) - (a.level || 0);
        case "name":
          return a.name.localeCompare(b.name, "zh-CN");
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  },
};

try { module.exports = InventorySystem; } catch(e) {}
