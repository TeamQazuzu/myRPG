function createDefaultState() {
  return {
    version: "1.1.0",
    player: {
      name: "酒馆少年",
      level: 1,
      exp: 0,
      expToNext: 100,
      gold: 50, silver: 0, copper: 0,
      class: "见习战士",
      classPath: ["warrior"],
      elementSpec: null,
      awakened: false,
      attributes: { str: 8, agi: 8, int: 8, vit: 8, ten: 8, spi: 8 },
      attributePoints: 0,
      talentPoints: 0,
      talents: {},
      hp: 100, maxHp: 100,
      mp: 30, maxMp: 30,
      combatMode: "manual",
      autoMode: "skillFirst",
      autoSkills: [],
      location: "灰烟村·酒馆",
      zone: "greyVillage",
      playTime: 0,
      deaths: 0,
      revivesLeft: 5,
      hardcore: false,
      dead: false,
      retired: false,
      canPlay: true,
      blessingChoice: null,
      skills: [],
      skillPreset: [],
      cooldowns: {},
    },
    companions: [],
    inventory: {
      items: [
        { id: "expPillS_1", name: "经验丹", type: "consumable", rarity: "orange", level: 1, stackable: true, stack: 5, use: "exp", value: 1000000, desc: "使用获得1000000经验" },
        { id: "hpPotion_1", name: "生命药水", type: "consumable", rarity: "white", level: 1, stackable: true, stack: 3, use: "heal", value: 0.5, desc: "恢复50%生命" },
        { id: "mpPotion_1", name: "法力药水", type: "consumable", rarity: "white", level: 1, stackable: true, stack: 2, use: "mana", value: 0.5, desc: "恢复50%法力" },
      ],
      capacity: 20,
      maxCapacity: 100,
    },
    storage: {
      items: [],
      capacity: 50,
      maxCapacity: 250,
      upgradeLevel: 0,
    },
    equipment: {
      weapon:   { name: "父亲的旧短剑", type: "sword", rarity: "blue", level: 10, baseStats: { physAtk: 10 }, affixes: [] },
      offhand:  null, helmet: null, chest: null, legs: null,
      boots:    null, gloves: null, necklace: null, ring1: null, ring2: null,
    },
    world: {
      currentZone: "greyVillage",
      currentLocation: "酒馆",
      gatekeepers: {
        villageChief:     { defeated: false, attempts: 0 },
        nightWatcher:     { defeated: false, attempts: 0 },
        mechanicalGuard:  { defeated: false, attempts: 0 },
        hermit:           { defeated: false, attempts: 0 },
        finalBoss:        { defeated: false, attempts: 0 },
      },
      fragments: { collected: [], total: 12, unlocked: false },
      heirloom: {
        slot1: { equipped: true,  item: { name: "父亲的旧短剑", type: "sword", rarity: "gold", level: 10, affixes: [] } },
        slot2: { equipped: true,  item: { name: "艾琳的旧弓",   type: "bow",   rarity: "gold", level: 10, affixes: [] } },
        slot3: { equipped: false, item: null },
        unlockedSlots: 2,
      },
      silverDragon: { lastSpawn: null, location: null, defeated: false },
      goldenDragon: { lastSpawn: null, location: null, defeated: false },
      offlineTime: 0,
      lastSave: new Date().toISOString(),
    },
    quests: {
      active: [], completed: [],
      events: {
        mineWhispers: false, oldLedger: false, smithSword: false,
        riverWoman: false, hunterBoar: false, merchantGoods: false,
        tailorCloak: false, doctorRecipe: false, gravekeeper: false, windEcho: false,
      },
    },
    buffs: { permanent: {}, temporary: [] },
    crafting: { recipes: [], materials: {} },
    skills: {
      mining: { level: 1, exp: 0 }, smelting: { level: 1, exp: 0 },
      weaving: { level: 1, exp: 0 }, cooking: { level: 1, exp: 0 },
      skinning: { level: 0, exp: 0 }, tailoring: { level: 0, exp: 0 },
      leatherwork: { level: 0, exp: 0 }, chef: { level: 0, exp: 0 },
      alchemy: { level: 0, exp: 0 },
    },
    settings: {
      textSpeed: "normal",
      combatAnim: true,
      sound: true, music: true,
      hardcoreMode: false,
      autoSave: true,
      autoSaveInterval: 300,
    },
    combat: null,
    idle: null,
    narrative: { currentScene: "opening", dialogueHistory: [], flags: {} },
  };
}

const Utils = {
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  sample(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = this.randInt(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  },
  weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },
  uuid() { return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
  calcBaseStats(type, level) {
    const mult = 1 + (level - 1) * 0.15;
    switch (type) {
      case 'sword': case 'axe': case 'hammer':
        return { physAtk: Math.floor(8 * mult) };
      case 'bow': case 'crossbow':
        return { physAtk: Math.floor(6 * mult), critRate: 0.02 };
      case 'staff': case 'wand':
        return { magAtk: Math.floor(8 * mult) };
      case 'shield':
        return { physDef: Math.floor(5 * mult) };
      case 'dagger':
        return { physAtk: Math.floor(4 * mult), speed: 2 };
      case 'helmet': case 'chest': case 'legs': case 'boots': case 'gloves':
        return { physDef: Math.floor(3 * mult), maxHp: Math.floor(5 * mult) };
      case 'necklace':
        return { magDef: Math.floor(2 * mult), maxMp: Math.floor(3 * mult) };
      case 'ring':
        return { critRate: 0.01, physAtk: Math.floor(2 * mult) };
      default:
        return { physAtk: Math.floor(5 * mult) };
    }
  },
};

const SAVE_KEY = "chronicle_keeper_save";
const SaveManager = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return this.migrate(data);
    } catch (e) {
      console.error("存档加载失败:", e);
      return null;
    }
  },
  save(state) {
    try {
      state.world.lastSave = new Date().toISOString();
      const raw = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, raw);
      return true;
    } catch (e) {
      console.error("存档失败:", e);
      return false;
    }
  },
  export(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chronicle_keeper_${state.player.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(this.migrate(data));
        } catch (err) { reject(err); }
      };
      reader.readAsText(file);
    });
  },
  migrate(data) {
    if (!data.version) data.version = "1.1.0";
    if (!data.player.cooldowns) data.player.cooldowns = {};
    if (!data.player.skills) data.player.skills = [];
    if (!data.player.skillPreset) data.player.skillPreset = [];
    if (!data.player.autoMode) data.player.autoMode = "skillFirst";
    if (!data.player.autoSkills) data.player.autoSkills = [];
    if (!data.player.combatMode) data.player.combatMode = "auto";
    if (data.companions) {
      data.companions.forEach(c => {
        if (!c.cooldowns) c.cooldowns = {};
        if (!c.skills) c.skills = [];
        if (!c.skillPreset) c.skillPreset = [];
        if (!c.autoMode) c.autoMode = "skillFirst";
        if (!c._spentPoints) c._spentPoints = {};
        if (!c.expToNext) c.expToNext = Math.floor(100 * Math.pow(1.15, (c.level || 1) - 1));
        if (!c.equipment) c.equipment = { weapon: null, offhand: null, helmet: null, chest: null, legs: null, boots: null, gloves: null, necklace: null, ring1: null, ring2: null };
      });
    }
    return data;
  },
  delete() { localStorage.removeItem(SAVE_KEY); },
  exists() { return localStorage.getItem(SAVE_KEY) !== null; },
};

const StateUtils = {
  getLevelCap(state) {
    const gk = state.world.gatekeepers;
    if (gk.finalBoss.defeated) return 99;
    if (gk.hermit.defeated) return 80;
    if (gk.mechanicalGuard.defeated) return 60;
    if (gk.nightWatcher.defeated) return 40;
    if (gk.villageChief.defeated) return 20;
    return 20;
  },
  isExpLocked(state) {
    return state.player.level >= this.getLevelCap(state);
  },
  addExp(state, amount) {
    if (this.isExpLocked(state)) {
      return { gained: 0, locked: true, message: this.getLockMessage(state) };
    }
    state.player.exp += amount;
    let leveled = false;
    while (state.player.exp >= state.player.expToNext && state.player.level < 99) {
      state.player.exp -= state.player.expToNext;
      state.player.level++;
      state.player.attributePoints += 3;
      state.player.expToNext = Math.floor(100 * Math.pow(1.15, state.player.level - 1));
      leveled = true;
      if (this.isExpLocked(state)) break;
    }
    return { gained: amount, locked: false, leveled };
  },
  getLockMessage(state) {
    const cap = this.getLevelCap(state);
    return DATA.expLockMessages[cap] || "你已至当前极限。";
  },
  addGold(state, amount) {
    const totalCopper = state.player.gold * 100 + state.player.silver * 10 + state.player.copper + Math.floor(amount * 100);
    state.player.gold = Math.floor(totalCopper / 100);
    state.player.silver = Math.floor((totalCopper % 100) / 10);
    state.player.copper = totalCopper % 10;
    const maxCarry = 99999;
    if (state.player.gold > maxCarry) {
      const overflow = state.player.gold - maxCarry;
      state.player.gold = maxCarry;
      return { added: amount, overflow };
    }
    return { added: amount, overflow: 0 };
  },
  spendGold(state, amount) {
    const totalCopper = state.player.gold * 100 + state.player.silver * 10 + state.player.copper;
    const costCopper = Math.floor(amount * 100);
    if (totalCopper < costCopper) return false;
    const remaining = totalCopper - costCopper;
    state.player.gold = Math.floor(remaining / 100);
    state.player.silver = Math.floor((remaining % 100) / 10);
    state.player.copper = remaining % 10;
    return true;
  },
  addAttribute(state, attr, points) {
    if (state.player.attributePoints < points) return false;
    state.player.attributePoints -= points;
    state.player.attributes[attr] += points;
    if (attr === "vit") state.player.maxHp += points * 10;
    if (attr === "spi") state.player.maxMp += points * 5;
    return true;
  },
  getPlayerCombatStats(state) {
    const p = state.player;
    const attrs = p.attributes;
    const stats = {
      physAtk: attrs.str * 2,
      physDef: attrs.str * 1 + attrs.ten * 3,
      magAtk: attrs.int * 2,
      magDef: attrs.int * 1 + attrs.spi * 2 + attrs.ten * 3,
      speed: attrs.agi * 0.8,
      hit: attrs.agi * 1.5,
      dodge: attrs.agi * 1,
      maxHp: 100 + attrs.vit * 10,
      maxMp: 30 + attrs.spi * 5,
      critRate: 0.05,
      critDmg: 1.5,
    };
    if (state.equipment) {
      for (const slot in state.equipment) {
        const item = state.equipment[slot];
        if (!item) continue;
        if (item.baseStats) {
          for (const [k, v] of Object.entries(item.baseStats)) {
            stats[k] = (stats[k] || 0) + v;
          }
        }
        if (item.affixes) {
          for (const affix of item.affixes) {
            this.applyAffix(stats, affix);
          }
        }
      }
    }
    return stats;
  },
  getCompanionCombatStats(state, companionId) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return null;
    const attrs = c.attributes;
    const stats = {
      physAtk: attrs.str * 2,
      physDef: attrs.str * 1 + attrs.ten * 3,
      magAtk: attrs.int * 2,
      magDef: attrs.int * 1 + attrs.spi * 2 + attrs.ten * 3,
      speed: attrs.agi * 0.8,
      hit: attrs.agi * 1.5,
      dodge: attrs.agi * 1,
      maxHp: 80 + attrs.vit * 10,
      maxMp: 20 + attrs.spi * 5,
      critRate: 0.05,
      critDmg: 1.5,
    };
    if (c.equipment) {
      for (const slot in c.equipment) {
        const item = c.equipment[slot];
        if (!item) continue;
        if (item.baseStats) {
          for (const [k, v] of Object.entries(item.baseStats)) {
            stats[k] = (stats[k] || 0) + v;
          }
        }
        if (item.affixes) {
          for (const affix of item.affixes) {
            this.applyAffix(stats, affix);
          }
        }
      }
    }
    return stats;
  },
  applyAffix(stats, affix) {
    const pool = DATA.affixPool[affix.id];
    if (!pool) return;
    const v = pool.value;
    switch (pool.effect) {
      case "physDmg": stats.physAtk = (stats.physAtk || 0) * (1 + v); break;
      case "fireDmg": stats.fireAtk = (stats.fireAtk || 0) * (1 + v); break;
      case "frostDmg": stats.frostAtk = (stats.frostAtk || 0) * (1 + v); break;
      case "lightDmg": stats.lightAtk = (stats.lightAtk || 0) * (1 + v); break;
      case "speed": stats.speed = (stats.speed || 0) * (1 + v); break;
      case "maxHp": stats.maxHp = (stats.maxHp || 0) * (1 + v); break;
      case "physDef": stats.physDef = (stats.physDef || 0) * (1 + v); break;
      case "critRate": stats.critRate = (stats.critRate || 0) + v; break;
      case "critDmg": stats.critDmg = (stats.critDmg || 0) + v; break;
      case "pierce": stats.pierce = (stats.pierce || 0) + v; break;
      case "maxHp": stats.maxHp = Math.floor((stats.maxHp || 0) * (1 + v)); break;
      case "fireRes": stats.fireRes = (stats.fireRes || 0) + v; break;
      case "frostRes": stats.frostRes = (stats.frostRes || 0) + v; break;
      case "lightRes": stats.lightRes = (stats.lightRes || 0) + v; break;
      case "allElemRes":
        stats.fireRes = (stats.fireRes || 0) + v;
        stats.frostRes = (stats.frostRes || 0) + v;
        stats.lightRes = (stats.lightRes || 0) + v;
        break;
      case "hpRegen": stats.hpRegen = (stats.hpRegen || 0) + v; break;
      case "lifeSteal": stats.lifeSteal = (stats.lifeSteal || 0) + v; break;
      case "manaSteal": stats.manaSteal = (stats.manaSteal || 0) + v; break;
    }
  },
  addToInventory(state, item) {
    if (state.inventory.items.length >= state.inventory.capacity) {
      return { ok: false, reason: "背包已满" };
    }
    if (item.stackable) {
      const existing = state.inventory.items.find(i =>
        i.name === item.name && (i.stack || 1) < 99);
      if (existing) {
        existing.stack = (existing.stack || 1) + (item.stack || 1);
        return { ok: true, stacked: true };
      }
    }
    state.inventory.items.push({ ...item, stack: item.stack || 1 });
    return { ok: true };
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
  equipItem(state, item, slot) {
    const old = state.equipment[slot];
    state.equipment[slot] = item;
    return { ok: true, replaced: old };
  },
  unequipItem(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, reason: "空槽位" };
    state.equipment[slot] = null;
    return { ok: true, item };
  },
  handleDeath(state, zone) {
    if (state.player.hardcore) {
      state.player.retired = true;
      state.player.canPlay = false;
      return { mode: "retired", message: "角色已退役。存档进入碑文模式。" };
    }
    if (zone === "greyVillage") {
      state.player.hp = 1;
      state.player.location = "灰烟村·酒馆";
      return { mode: "revived", message: "村民将你救回了酒馆。", cost: 0 };
    }
    state.player.revivesLeft--;
    state.player.deaths++;
    if (state.player.revivesLeft <= 0) {
      state.player.dead = true;
      state.player.canPlay = false;
      return { mode: "epitaph", message: "复活次数耗尽。存档进入碑文模式。" };
    }
    state.player.hp = 1;
    state.player.mp = 0;
    state.player.location = "灰烟村·酒馆";
    return { mode: "revived", message: `消耗1次复活。剩余${state.player.revivesLeft}次。`, cost: 1 };
  },
  defeatGatekeeper(state, gkId) {
    const gk = state.world.gatekeepers[gkId];
    if (!gk) return;
    gk.defeated = true;
    if (gkId === "villageChief") state.inventory.capacity += 10;
    if (gkId === "nightWatcher") state.inventory.capacity += 20;
    if (gkId === "mechanicalGuard") state.inventory.capacity += 30;
    if (gkId === "hermit") {
      state.world.fragments.unlocked = true;
      state.inventory.capacity += 40;
    }
    if (gkId === "finalBoss") state.inventory.capacity += 100;
  },
  getAvailableZones(state) {
    const zones = ["greyVillage"];
    const gk = state.world.gatekeepers;
    if (gk.villageChief.defeated) zones.push("ashMountains");
    if (gk.nightWatcher.defeated) zones.push("ashMines");
    if (gk.mechanicalGuard.defeated) zones.push("newWorld");
    if (gk.hermit.defeated) zones.push("skyTower");
    return zones;
  },
};
