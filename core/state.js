// ============================================
// 《寻亲风云录》核心状态管理
// 严格对应 GDD v11.0 第30章完整数据结构
// ============================================

// 创建预置经验丹
function createExpPill() {
  const pill = DATA.items.exp_pill;
  return {
    ...pill,
    id: Utils ? Utils.uuid() : `exp_pill_${Date.now()}_${Math.random()}`,
    stack: 1,
  };
}

// 默认新角色状态
function createDefaultState() {
  const expPills = Array(5).fill(null).map(() => createExpPill());
  return {
    version: "1.0.0",
    player: {
      name: "酒馆少年",
      level: 1,
      exp: 0,
      expToNext: 100,
      gold: 50,
      silver: 0,
      copper: 0,
      class: "见习战士",
      classPath: ["warrior"],
      elementSpec: null,
      awakened: false,
      attributes: {
        str: 8, agi: 8, int: 8,
        vit: 8, ten: 8, spi: 8,
      },
      attributePoints: 0,
      talentPoints: 0,
      talents: {},
      skills: ["normal_attack", "defend"],
      hp: 100,
      maxHp: 100,
      mp: 30,
      maxMp: 30,
      combatMode: "manual",
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
    },
    companions: [],
    inventory: {
      items: expPills,
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
      weapon:   { name: "父亲的旧短剑", type: "sword", rarity: "blue", level: 10, affixes: [] },
      offhand:  null,
      helmet:   null,
      chest:    null,
      legs:     null,
      boots:    null,
      gloves:   null,
      necklace: null,
      ring1:    null,
      ring2:    null,
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
      fragments: {
        collected: [],
        total: 12,
        unlocked: false,
      },
      heirloom: {
        slot1: { equipped: true,  item: { name: "父亲的旧短剑", type: "sword", rarity: "gold", level: 10, affixes: [] } },
        slot2: { equipped: true,  item: { name: "艾琳的旧弓",   type: "bow",   rarity: "gold", level: 10, affixes: [] } },
        slot3: { equipped: false, item: null },
        unlockedSlots: 2,
      },
      silverDragon: {
        lastSpawn: null,
        location: null,
        defeated: false,
      },
      goldenDragon: {
        lastSpawn: null,
        location: null,
        defeated: false,
      },
      offlineTime: 0,
      lastSave: new Date().toISOString(),
      flags: {},
      dungeonProgress: {
        greyVillage_cave: { currentStage: 0, completed: false },
      },
    },
    quests: {
      active: [],
      completed: [],
      events: {
        mineWhispers: false,
        oldLedger: false,
        smithSword: false,
        riverWoman: false,
        hunterBoar: false,
        merchantGoods: false,
        tailorCloak: false,
        doctorRecipe: false,
        gravekeeper: false,
        windEcho: false,
      },
    },
    buffs: {
      permanent: {},
      temporary: [],
    },
    crafting: {
      recipes: [],
      materials: {},
    },
    skills: {
      mining:      { level: 1, exp: 0 },
      smelting:    { level: 1, exp: 0 },
      weaving:     { level: 1, exp: 0 },
      cooking:     { level: 1, exp: 0 },
      skinning:    { level: 0, exp: 0 },
      tailoring:   { level: 0, exp: 0 },
      leatherwork: { level: 0, exp: 0 },
      chef:        { level: 0, exp: 0 },
      alchemy:     { level: 0, exp: 0 },
    },
    settings: {
      textSpeed: "normal",
      combatAnim: true,
      sound: true,
      music: true,
      hardcoreMode: false,
      autoSave: true,
      autoSaveInterval: 300,
    },
    combat: null,
    idle: null,
    narrative: {
      currentScene: "opening",
      dialogueHistory: [],
      flags: {},
    },
  };
}

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
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  },
  migrate(data) {
    if (!data.version) data.version = "1.0.0";
    if (!data.world) data.world = {};
    if (!data.world.flags) data.world.flags = {};
    if (!data.world.dungeonProgress) data.world.dungeonProgress = { greyVillage_cave: { currentStage: 0, completed: false } };
    if (!data.player.skills) data.player.skills = ["normal_attack", "defend"];
    if (data.companions) {
      data.companions.forEach(c => {
        if (!c.skills) c.skills = [];
        if (!c.talents) c.talents = {};
      });
    }
    return data;
  },
  delete() {
    localStorage.removeItem(SAVE_KEY);
  },
  exists() {
    return localStorage.getItem(SAVE_KEY) !== null;
  },
};

const StateUtils = {
  getLevelCap(state) {
    const gk = state.world.gatekeepers;
    if (gk.finalBoss.defeated) return 99;
    if (gk.hermit.defeated) return 99;
    if (gk.mechanicalGuard.defeated) return 80;
    if (gk.nightWatcher.defeated) return 60;
    if (gk.villageChief.defeated) return 40;
    return 20;
  },
  isExpLocked(state) {
    return state.player.level >= this.getLevelCap(state);
  },
  getZoneLevelRange(state) {
    const zone = DATA.world.zones[state.world.currentZone];
    return zone ? zone.levelRange : [1, 99];
  },
  // 经验共享：主角和所有存活随从获得等量经验
  addExp(state, amount) {
    if (this.isExpLocked(state)) {
      return { gained: 0, locked: true, message: this.getLockMessage(state) };
    }
    const result = { gained: amount, locked: false, leveled: false, companionsLeveled: [] };
    // 主角获得经验
    state.player.exp += amount;
    while (state.player.exp >= state.player.expToNext && state.player.level < 99) {
      state.player.exp -= state.player.expToNext;
      state.player.level++;
      state.player.attributePoints += 3;
      state.player.expToNext = Math.floor(100 * Math.pow(1.15, state.player.level - 1));
      result.leveled = true;
      if (this.isExpLocked(state)) break;
    }
    // 随从获得等量经验
    for (const comp of state.companions) {
      if (!comp.alive) continue;
      const compResult = this.addExpToCompanion(comp, amount);
      if (compResult.leveled) {
        result.companionsLeveled.push(comp.name);
      }
    }
    return result;
  },
  addExpToCompanion(companion, amount) {
    if (!companion.exp) companion.exp = 0;
    if (!companion.expToNext) companion.expToNext = Math.floor(100 * Math.pow(1.15, companion.level - 1));
    companion.exp += amount;
    let leveled = false;
    while (companion.exp >= companion.expToNext && companion.level < 99) {
      companion.exp -= companion.expToNext;
      companion.level++;
      companion.expToNext = Math.floor(100 * Math.pow(1.15, companion.level - 1));
      // 升级时提升属性
      this.levelUpCompanion(companion);
      leveled = true;
    }
    return { leveled };
  },
  levelUpCompanion(companion) {
    // 根据职业提升基础属性
    const attrs = companion.attributes;
    if (companion.class === 'warrior') {
      attrs.str += 2; attrs.vit += 2; attrs.ten += 1;
    } else if (companion.class === 'ranger') {
      attrs.agi += 3; attrs.str += 1;
    } else if (companion.class === 'mage') {
      attrs.int += 3; attrs.spi += 2;
    }
    // 重新计算HP/MP
    companion.maxHp = 80 + (attrs.vit - 8) * 10 + companion.level * 8;
    companion.maxMp = 20 + (attrs.spi - 8) * 5 + companion.level * 3;
    companion.hp = companion.maxHp;
    companion.mp = companion.maxMp;
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
    if (state.player.gold > DATA.currency.maxCarry) {
      const overflow = state.player.gold - DATA.currency.maxCarry;
      state.player.gold = DATA.currency.maxCarry;
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
  getCombatStats(state, unitId = "player") {
    const unit = unitId === "player" ? state.player : state.companions.find(c => c.id === unitId);
    if (!unit) return null;
    const base = { ...unit.attributes };
    const stats = {
      hp: unit.maxHp,
      mp: unit.maxMp,
      physAtk: base.str * 2,
      physDef: base.str * 1 + base.ten * 3,
      magAtk: base.int * 2,
      magDef: base.int * 1 + base.spi * 2 + base.ten * 3,
      hit: base.agi * 1.5,
      dodge: base.agi * 1,
      speed: base.agi * 0.8,
      critRate: 0.05,
      critDmg: 1.5,
      tenacity: base.ten * 1,
      hpRegen: base.vit * 0.3,
      mpRegen: base.spi * 0.5,
    };
    const eq = unitId === "player" ? state.equipment : unit.equipment;
    if (eq) {
      for (const slot of Object.keys(eq)) {
        const item = eq[slot];
        if (!item) continue;
        if (item.baseStats) {
          for (const [stat, val] of Object.entries(item.baseStats)) {
            if (stats[stat] !== undefined) stats[stat] += val;
          }
        }
        if (item.affixes) {
          for (const affix of item.affixes) {
            this.applyAffix(stats, affix);
          }
        }
      }
    }
    if (state.buffs && state.buffs.permanent) {
      for (const [key, buff] of Object.entries(state.buffs.permanent)) {
        if (buff.target === "all" || buff.target === unitId) {
          stats[buff.stat] = (stats[buff.stat] || 0) + buff.value;
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
      case "maxHp": stats.hp = (stats.hp || 0) * (1 + v); break;
      case "physDef": stats.physDef = (stats.physDef || 0) * (1 + v); break;
      case "critRate": stats.critRate = (stats.critRate || 0) + v; break;
      case "critDmg": stats.critDmg = (stats.critDmg || 0) + v; break;
      case "lifeSteal": stats.lifeSteal = (stats.lifeSteal || 0) + v; break;
      case "manaSteal": stats.manaSteal = (stats.manaSteal || 0) + v; break;
      case "hpRegen": stats.hpRegen = (stats.hpRegen || 0) + v; break;
      case "mpRegen": stats.mpRegen = (stats.mpRegen || 0) + v; break;
      case "pierce": stats.pierce = (stats.pierce || 0) + v; break;
      case "antiMagic": stats.antiMagic = (stats.antiMagic || 0) + v; break;
      case "fireRes": stats.fireRes = (stats.fireRes || 0) + v; break;
      case "frostRes": stats.frostRes = (stats.frostRes || 0) + v; break;
      case "lightRes": stats.lightRes = (stats.lightRes || 0) + v; break;
      case "allElemRes":
        stats.fireRes = (stats.fireRes || 0) + v;
        stats.frostRes = (stats.frostRes || 0) + v;
        stats.lightRes = (stats.lightRes || 0) + v;
        break;
      case "tenacity": stats.tenacity = (stats.tenacity || 0) + v; break;
      case "debuffCleanse": stats.debuffCleanse = (stats.debuffCleanse || 0) + v; break;
      case "protectChance": stats.protectChance = (stats.protectChance || 0) + v; break;
      case "companionDmg": stats.companionDmg = (stats.companionDmg || 0) + v; break;
      case "firstTurnSpeed": stats.firstTurnSpeed = (stats.firstTurnSpeed || 0) + v; break;
      case "dodgeSpeed": stats.dodge = (stats.dodge || 0) + v; stats.speed = (stats.speed || 0) * (1 + v); break;
      case "speedHpTrade":
        if (v && typeof v === "object") {
          stats.speed = (stats.speed || 0) * (1 + (v.spd || 0));
          stats.hp = (stats.hp || 0) * (1 + (v.hp || 0));
        }
        break;
      case "cheatDeathChance": stats.cheatDeathChance = (stats.cheatDeathChance || 0) + v; break;
      case "lowHpDmg": stats.lowHpDmg = (stats.lowHpDmg || 0) + v; break;
      case "veryLowHpDmg": stats.veryLowHpDmg = (stats.veryLowHpDmg || 0) + v; break;
      case "firstTurnDmg": stats.firstTurnDmg = (stats.firstTurnDmg || 0) + v; break;
    }
  },
  checkEquipLimit(state, item) {
    const limits = DATA.equipLimits.find(l => state.player.level >= l.levelRange[0] && state.player.level <= l.levelRange[1]);
    if (!limits) return { ok: true };
    const rarityTier = DATA.rarity[item.rarity]?.tier ?? 0;
    const maxTier = DATA.rarity[limits.maxRarity]?.tier ?? 99;
    if (rarityTier > maxTier) {
      return { ok: false, reason: `等级${state.player.level}无法穿戴${DATA.rarity[item.rarity].name}装备，最高${DATA.rarity[limits.maxRarity].name}` };
    }
    const equipped = Object.values(state.equipment).filter(e => e && e.rarity === item.rarity);
    if (equipped.length >= limits.sameColorMax) {
      return { ok: false, reason: `${DATA.rarity[item.rarity].name}装备最多穿戴${limits.sameColorMax}件`, conflict: equipped };
    }
    return { ok: true };
  },
  equipItem(state, item, slot) {
    const check = this.checkEquipLimit(state, item);
    if (!check.ok) return check;
    const expectedSlot = DATA.equipTypeToSlot[item.type];
    if (expectedSlot && expectedSlot !== slot && !(item.type === "ring" && slot.startsWith("ring"))) {
      return { ok: false, reason: `${item.type} 不能装备到 ${slot} 槽位` };
    }
    const old = state.equipment[slot];
    state.equipment[slot] = item;
    return { ok: true, replaced: old };
  },
  unequipItem(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, reason: "该槽位没有装备" };
    state.equipment[slot] = null;
    return { ok: true, item };
  },
  addToInventory(state, item) {
    if (state.inventory.items.length >= state.inventory.capacity) {
      return { ok: false, reason: "背包已满" };
    }
    // 尝试堆叠
    if (item.stackable) {
      const existing = state.inventory.items.find(i => i.id === item.id || (i.stackable && i.type === item.type && i.name === item.name));
      if (existing && existing.stack < (existing.maxStack || 99)) {
        existing.stack = (existing.stack || 1) + (item.stack || 1);
        return { ok: true, stacked: true };
      }
    }
    state.inventory.items.push(item);
    return { ok: true };
  },
  removeFromInventory(state, itemId, count = 1) {
    const idx = state.inventory.items.findIndex(i => i.id === itemId);
    if (idx === -1) return { ok: false, reason: "物品不存在" };
    const item = state.inventory.items[idx];
    if (item.stack && item.stack > count) {
      item.stack -= count;
      return { ok: true };
    }
    state.inventory.items.splice(idx, 1);
    return { ok: true };
  },
  // 使用物品
  useItem(state, itemId, targetId = 'player') {
    const item = state.inventory.items.find(i => i.id === itemId);
    if (!item) return { ok: false, reason: "物品不存在" };
    if (item.type !== 'consumable') return { ok: false, reason: "该物品不可使用" };

    const target = targetId === 'player' ? state.player : state.companions.find(c => c.id === targetId);
    if (!target) return { ok: false, reason: "目标不存在" };

    let result = { ok: true, msg: '' };
    switch (item.subtype) {
      case 'exp':
        if (targetId === 'player') {
          const expResult = this.addExp(state, item.expValue || 0);
          result.msg = `使用了${item.name}，获得${item.expValue}经验`;
          if (expResult.leveled) result.msg += '，升级了！';
        } else {
          const compResult = this.addExpToCompanion(target, item.expValue || 0);
          result.msg = `对${target.name}使用了${item.name}，获得${item.expValue}经验`;
          if (compResult.leveled) result.msg += '，升级了！';
        }
        break;
      case 'heal':
        target.hp = Math.min(target.maxHp, target.hp + (item.healHp || 0));
        result.msg = `使用了${item.name}，恢复${item.healHp}点生命值`;
        break;
      case 'mana':
        target.mp = Math.min(target.maxMp, target.mp + (item.healMp || 0));
        result.msg = `使用了${item.name}，恢复${item.healMp}点法力值`;
        break;
      default:
        return { ok: false, reason: "未知物品类型" };
    }
    // 消耗物品
    this.removeFromInventory(state, itemId, 1);
    return result;
  },
  recruitCompanion(state, npcId) {
    const npc = DATA.npcs[npcId];
    if (!npc || !npc.recruit) return { ok: false, reason: "不可招募" };
    if (state.companions.length >= 2) return { ok: false, reason: "随从已满（最多2名）" };
    // 检查是否已招募
    if (state.companions.some(c => c.id === npcId)) return { ok: false, reason: "该随从已在队伍中" };
    const companion = {
      id: npcId,
      name: npc.name,
      class: npc.class,
      level: state.player.level,
      hp: 80 + state.player.level * 10,
      maxHp: 80 + state.player.level * 10,
      mp: 20 + state.player.level * 5,
      maxMp: 20 + state.player.level * 5,
      attributes: this.generateCompanionAttributes(npc.class),
      equipment: {},
      aiStrategy: "balanced",
      alive: true,
      skills: this.getDefaultSkills(npc.class),
      talents: {},
    };
    state.companions.push(companion);
    return { ok: true, companion };
  },
  getDefaultSkills(classKey) {
    if (classKey === 'warrior') return ['normal_attack', 'shield_wall', 'slam'];
    if (classKey === 'ranger') return ['normal_attack', 'rapid_shot', 'slow_arrow'];
    if (classKey === 'mage') return ['normal_attack', 'fireball', 'heal'];
    return ['normal_attack'];
  },
  generateCompanionAttributes(classKey) {
    const base = { str: 8, agi: 8, int: 8, vit: 8, ten: 8, spi: 8 };
    if (classKey.includes("warrior")) { base.str = 12; base.vit = 10; base.ten = 10; }
    else if (classKey.includes("ranger")) { base.agi = 14; base.str = 10; }
    else if (classKey.includes("mage")) { base.int = 14; base.spi = 12; }
    return base;
  },
  handleDeath(state, zone) {
    if (!state || !state.player) return { mode: "error", message: "状态异常" };
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
    const zoneData = Object.values(DATA.world.zones).find(z => z.gatekeeper === gkId);
    if (zoneData) {
      state.inventory.capacity = Math.min(state.inventory.maxCapacity, state.inventory.capacity + DATA.inventory.perGatekeeperBonus);
    }
    if (gkId === "hermit") {
      state.world.fragments.unlocked = true;
    }
  },
  getAvailableZones(state) {
    const zones = [];
    const gk = state.world.gatekeepers;
    zones.push("greyVillage");
    if (gk.villageChief.defeated) zones.push("ashMountains");
    if (gk.nightWatcher.defeated) zones.push("ashMines");
    if (gk.mechanicalGuard.defeated) zones.push("newWorld");
    if (gk.hermit.defeated) zones.push("skyTower");
    return zones;
  },
};
