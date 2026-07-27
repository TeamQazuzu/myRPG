const CompanionSystem = {
  recruit(state, npcId) {
    const npc = DATA.npcs[npcId];
    if (!npc || !npc.recruit) return { ok: false, reason: "不可招募" };
    if (state.companions.length >= 2) return { ok: false, reason: "随从已满（最多2人）" };
    if (state.companions.find(c => c.id === npcId)) return { ok: false, reason: "已在队伍中" };

    const maxHp = 80 + (npc.attributes.vit || 7) * 10;
    const maxMp = 20 + (npc.attributes.spi || 5) * 5;

    const companion = {
      id: npc.id,
      name: npc.name,
      class: npc.class,
      classPath: npc.classPath || [npc.class],
      elementSpec: npc.elementSpec || null,
      level: npc.level || 1,
      exp: 0,
      expToNext: Math.floor(100 * Math.pow(1.15, (npc.level || 1) - 1)),
      hp: maxHp,
      maxHp: maxHp,
      mp: maxMp,
      maxMp: maxMp,
      attributes: { ...npc.attributes },
      _spentPoints: {},
      equipment: this.cloneEquipment(npc.equipment),
      skills: [...(npc.skills || [])],
      skillPreset: [...(npc.skillPreset || [])],
      aiStrategy: npc.aiStrategy || "balanced",
      autoMode: "skillFirst",
      alive: true,
      cooldowns: {},
    };
    state.companions.push(companion);
    return { ok: true, companion };
  },

  cloneEquipment(src) {
    const dest = { weapon: null, offhand: null, helmet: null, chest: null, legs: null, boots: null, gloves: null, necklace: null, ring1: null, ring2: null };
    if (!src) return dest;
    for (const slot in src) {
      if (src[slot]) {
        dest[slot] = {
          ...src[slot],
          baseStats: src[slot].baseStats ? { ...src[slot].baseStats } : undefined,
          affixes: src[slot].affixes ? [...src[slot].affixes] : undefined,
        };
      }
    }
    return dest;
  },

  setAttributes(state, companionId, attr, delta) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    const availablePoints = Math.floor(c.level / 5);
    const spent = Object.values(c._spentPoints || {}).reduce((a, b) => a + b, 0);
    if (spent + delta > availablePoints) return { ok: false, reason: "属性点不足" };

    if (!c._spentPoints) c._spentPoints = {};
    c._spentPoints[attr] = (c._spentPoints[attr] || 0) + delta;
    c.attributes[attr] = (c.attributes[attr] || 8) + delta;
    if (attr === "vit") {
      c.maxHp += delta * 10;
      c.hp = Math.min(c.hp + delta * 10, c.maxHp);
    }
    if (attr === "spi") {
      c.maxMp += delta * 5;
      c.mp = Math.min(c.mp + delta * 5, c.maxMp);
    }
    return { ok: true };
  },

  equipItem(state, companionId, item, slot) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    if (!c.equipment) {
      c.equipment = { weapon: null, offhand: null, helmet: null, chest: null, legs: null, boots: null, gloves: null, necklace: null, ring1: null, ring2: null };
    }
    const old = c.equipment[slot];
    c.equipment[slot] = item;
    return { ok: true, replaced: old };
  },

  unequipItem(state, companionId, slot) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    const item = c.equipment[slot];
    if (!item) return { ok: false, reason: "空槽位" };
    c.equipment[slot] = null;
    return { ok: true, item };
  },

  setSkillPreset(state, companionId, preset) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    const validSkills = c.skills.filter(s => preset.includes(s));
    c.skillPreset = validSkills;
    return { ok: true };
  },

  setAutoMode(state, companionId, mode) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    c.autoMode = mode;
    return { ok: true };
  },

  learnSkill(state, companionId, skillId) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false, reason: "同伴不存在" };
    if (c.skills.includes(skillId)) return { ok: false, reason: "已掌握此技能" };
    const skill = DATA.skills[skillId];
    if (!skill) return { ok: false, reason: "技能不存在" };
    c.skills.push(skillId);
    if (!c.skillPreset.includes(skillId)) {
      c.skillPreset.push(skillId);
    }
    return { ok: true };
  },

  getAvailableSkills(state, companionId) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return [];
    const classData = DATA.classes[c.class];
    if (!classData) return [];
    const branch = c.classPath[0] === "mage" ? c.elementSpec : null;
    return classData.getSkills(c.level, branch);
  },

  getCompanionsForBattle(state) {
    return state.companions.filter(c => c.alive && c.hp > 0);
  },

  addExp(state, companionId, amount) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false };
    c.exp += amount;
    let leveled = false;
    while (c.exp >= c.expToNext && c.level < 99) {
      c.exp -= c.expToNext;
      c.level++;
      c.maxHp += 10;
      c.hp = c.maxHp;
      c.maxMp += 5;
      c.mp = c.maxMp;
      c.expToNext = Math.floor(100 * Math.pow(1.15, c.level - 1));
      leveled = true;
      const classData = DATA.classes[c.class];
      if (classData) {
        const branch = c.classPath[0] === "mage" ? c.elementSpec : null;
        const newSkills = classData.getSkills(c.level, branch);
        newSkills.forEach(s => { if (!c.skills.includes(s)) c.skills.push(s); });
      }
    }
    return { ok: true, leveled, newLevel: c.level };
  },

  revive(state, companionId) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return { ok: false };
    if (c.alive) return { ok: false, reason: "同伴存活" };
    c.alive = true;
    c.hp = Math.floor(c.maxHp * 0.5);
    c.mp = c.maxMp;
    return { ok: true };
  },

  remove(state, companionId) {
    const idx = state.companions.findIndex(c => c.id === companionId);
    if (idx === -1) return { ok: false };
    state.companions.splice(idx, 1);
    return { ok: true };
  },

  syncToBattleUnit(state, companionId) {
    const c = state.companions.find(c => c.id === companionId);
    if (!c) return null;
    const stats = StateUtils.getCompanionCombatStats(state, companionId);
    return {
      unitId: c.id,
      name: c.name,
      side: "ally",
      type: "companion",
      class: c.class,
      classPath: c.classPath,
      level: c.level,
      hp: c.hp,
      maxHp: c.maxHp,
      mp: c.mp,
      maxMp: c.maxMp,
      physAtk: stats.physAtk,
      physDef: stats.physDef,
      magAtk: stats.magAtk || 0,
      magDef: stats.magDef || 0,
      speed: stats.speed,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      hit: stats.hit,
      dodge: stats.dodge,
      alive: c.alive,
      skills: c.skills,
      skillPreset: c.skillPreset,
      cooldowns: {},
      aiStrategy: c.aiStrategy,
      autoMode: c.autoMode || "skillFirst",
    };
  },
};
