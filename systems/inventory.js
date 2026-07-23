
const InventorySystem = {
  selectedItem: null,
  selectedContext: null,

  // ---------- 获取背包物品 ----------
  getItems: function() {
    return GameState.data.inventory.items;
  },

  getCapacity: function() {
    return GameState.data.inventory.capacity;
  },

  getCount: function() {
    return this.getItems().length;
  },

  // ---------- 添加物品 ----------
  addItem: function(item) {
    const items = this.getItems();
    if (items.length >= this.getCapacity()) {
      log('背包已满！', 'system');
      return false;
    }

    // 尝试堆叠
    if (item.stackable) {
      const existing = items.find(function(i) {
        return i.name === item.name && i.quality === item.quality && i.type === item.type;
      });
      if (existing && existing.stackCount < existing.stackMax) {
        existing.stackCount = Math.min(existing.stackCount + item.stackCount, existing.stackMax);
        return true;
      }
    }

    items.push(item);
    return true;
  },

  // ---------- 移除物品 ----------
  removeItem: function(itemId) {
    const items = this.getItems();
    const idx = items.findIndex(function(i) { return i.id === itemId; });
    if (idx >= 0) {
      items.splice(idx, 1);
      return true;
    }
    return false;
  },

  // ---------- 查找物品 ----------
  findItem: function(itemId) {
    return this.getItems().find(function(i) { return i.id === itemId; });
  },

  // ---------- 拆分堆叠 ----------
  splitStack: function(itemId) {
    const item = this.findItem(itemId);
    if (!item || !item.stackable || item.stackCount <= 1) return false;

    const count = Math.floor(item.stackCount / 2);
    if (count < 1) return false;
    if (this.getItems().length >= this.getCapacity()) {
      log('背包已满，无法拆分！', 'system');
      return false;
    }

    item.stackCount -= count;
    const newItem = Utils.deepCopy(item);
    newItem.id = Utils.genId();
    newItem.stackCount = count;
    this.getItems().push(newItem);
    return true;
  },

  // ---------- 丢弃物品 ----------
  discardItem: function(itemId) {
    const item = this.findItem(itemId);
    if (!item) return false;
    if (!confirm('确定要丢弃 ' + item.name + ' 吗？')) return false;
    this.removeItem(itemId);
    this.selectedItem = null;
    return true;
  },

  // ---------- 移动到仓库 ----------
  moveToStorage: function(itemId) {
    const item = this.findItem(itemId);
    if (!item) return false;
    const storage = GameState.data.storage;
    if (storage.items.length >= storage.capacity) {
      log('仓库已满！', 'system');
      return false;
    }
    storage.items.push(item);
    this.removeItem(itemId);
    log(item.name + ' 已存入仓库', 'info');
    this.selectedItem = null;
    return true;
  },

  // ---------- 使用消耗品 ----------
  useConsumable: function(itemId) {
    const item = this.findItem(itemId);
    if (!item || item.type !== 'consumable') return false;

    const p = GameState.data.player;
    if (item.effect.healHp) {
      p.hp = Math.min(p.hp + item.effect.healHp, p.maxHp);
      log('使用了 ' + item.name + '，恢复 ' + item.effect.healHp + ' 点生命！', 'heal');
    }
    if (item.effect.healMp) {
      p.mp = Math.min(p.mp + item.effect.healMp, p.maxMp);
      log('使用了 ' + item.name + '，恢复 ' + item.effect.healMp + ' 点法力！', 'heal');
    }
    if (item.effect.buff) {
      p.buffs.push({
        stat: item.effect.buff.s,
        value: item.effect.buff.v,
        appliedAt: Date.now()
      });
      log('获得增益: ' + item.effect.buff.s + ' +' + (item.effect.buff.v * 100).toFixed(0) + '%', 'info');
    }

    // 减少数量
    const idx = this.getItems().findIndex(function(i) { return i.id === itemId; });
    if (idx >= 0) {
      if (this.getItems()[idx].stackCount > 1) {
        this.getItems()[idx].stackCount--;
      } else {
        this.getItems().splice(idx, 1);
      }
    }

    GameState.recalcStats();
    this.selectedItem = null;
    return true;
  },

  // ---------- 装备物品 ----------
  equipItem: function(itemId) {
    const item = this.findItem(itemId);
    if (!item || !item.slot) return false;

    let slot = item.slot;
    if (slot === 'ring') {
      slot = GameState.data.equipment.ring1 ? 'ring2' : 'ring1';
    }

    // 卸下当前装备
    if (GameState.data.equipment[slot]) {
      this.getItems().push(GameState.data.equipment[slot]);
    }

    // 装备新物品
    GameState.data.equipment[slot] = item;
    this.removeItem(itemId);

    log('装备了 ' + item.name, 'info');
    GameState.recalcStats();
    this.selectedItem = null;
    return true;
  },

  // ---------- 从装备栏卸下 ----------
  unequipItem: function(slot) {
    const item = GameState.data.equipment[slot];
    if (!item) return false;
    if (this.getItems().length >= this.getCapacity()) {
      log('背包已满，无法卸下装备！', 'system');
      return false;
    }

    this.getItems().push(item);
    GameState.data.equipment[slot] = null;

    log('卸下了 ' + item.name, 'info');
    GameState.recalcStats();
    return true;
  },

  // ---------- 检查装备是否已装备 ----------
  isEquipped: function(itemId) {
    const eq = GameState.data.equipment;
    for (let slot in eq) {
      if (eq[slot] && eq[slot].id === itemId) return true;
    }
    return false;
  },

  // ---------- 获取装备所在槽位 ----------
  getEquippedSlot: function(itemId) {
    const eq = GameState.data.equipment;
    for (let slot in eq) {
      if (eq[slot] && eq[slot].id === itemId) return slot;
    }
    return null;
  }
};

// ---------- 仓库系统 ----------
const StorageSystem = {
  selectedItem: null,

  getItems: function() {
    return GameState.data.storage.items;
  },

  getCapacity: function() {
    return GameState.data.storage.capacity;
  },

  getCount: function() {
    return this.getItems().length;
  },

  findItem: function(itemId) {
    return this.getItems().find(function(i) { return i.id === itemId; });
  },

  moveToInventory: function(itemId) {
    const item = this.findItem(itemId);
    if (!item) return false;
    if (InventorySystem.getItems().length >= InventorySystem.getCapacity()) {
      log('背包已满！', 'system');
      return false;
    }

    InventorySystem.getItems().push(item);
    const idx = this.getItems().findIndex(function(i) { return i.id === itemId; });
    if (idx >= 0) this.getItems().splice(idx, 1);

    log(item.name + ' 已取回背包', 'info');
    this.selectedItem = null;
    return true;
  }
};
