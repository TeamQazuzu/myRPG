// ============================================
// 《寻亲风云录》随从系统
// 管理：随从数据库、招募、属性同步、战斗AI
// ============================================

var CompanionSystem = {

  // ========== 随从数据库 ==========
  companions: {
    'ailin': {
      id: 'ailin', name: '艾琳', title: '猎手的女儿',
      profession: 'ranger', quality: 'B', talentMax: 4,
      level: 1, maxLevel: 99,
      baseStats: { hp: 80, mp: 30, attack: 12, defense: 6, speed: 14 },
      growthStats: { hp: 8, mp: 2, attack: 2.5, defense: 0.8, speed: 1.5 },
      aiStrategy: 'aggressive',
      recruitCondition: { type: 'auto', levelReq: 1 },
      desc: '你从小一起长大的伙伴。父亲是村里最好的猎手，母亲......她从不提起。',
      battleQuotes: { start: ['我准备好了。', '别拖我后腿。'], kill: ['又一个。', '太弱了。'], lowHp: ['还能打......', '别管我，继续！'] },
    },
    'brong': {
      id: 'brong', name: '布隆', title: '铁壁佣兵',
      profession: 'warrior', quality: 'A', talentMax: 5,
      level: 1, maxLevel: 99,
      baseStats: { hp: 120, mp: 15, attack: 14, defense: 10, speed: 6 },
      growthStats: { hp: 14, mp: 1, attack: 2.8, defense: 1.8, speed: 0.5 },
      aiStrategy: 'tank',
      recruitCondition: { type: 'quest', questId: 'brong_recruit', levelReq: 15 },
      desc: '灰烬镇的雇佣兵，曾经是组织的一枚棋子。离开后靠接铁匠委托维生。',
      battleQuotes: { start: ['让我来挡在前面。', '跟紧我。'], kill: ['这就是力量。', '不堪一击。'], lowHp: ['......还没完。', '我还能撑。'] },
    },
    'laoKui': {
      id: 'laoKui', name: '老奎', title: '隐退的村长',
      profession: 'warrior', quality: 'S', talentMax: 6,
      level: 1, maxLevel: 99,
      baseStats: { hp: 100, mp: 20, attack: 16, defense: 12, speed: 8 },
      growthStats: { hp: 12, mp: 1.5, attack: 3.2, defense: 2.2, speed: 0.8 },
      aiStrategy: 'balanced',
      recruitCondition: { type: 'affection', npcId: 'chief_kui', affectionReq: 80, levelReq: 10 },
      desc: '灰烟村的村长，年轻时据说是个了不起的战士。',
      battleQuotes: { start: ['老骨头动一动也好。'], kill: ['哼。'], lowHp: ['老了啊......'] },
    },
    'xiaoke': {
      id: 'xiaoke', name: '小柯', title: '偷师的学徒',
      profession: 'ranger', quality: 'B', talentMax: 4,
      level: 1, maxLevel: 99,
      baseStats: { hp: 70, mp: 35, attack: 10, defense: 5, speed: 13 },
      growthStats: { hp: 7, mp: 3, attack: 2.2, defense: 0.7, speed: 1.8 },
      aiStrategy: 'aggressive',
      recruitCondition: { type: 'quest', questId: 'xiaoke_recruit', levelReq: 15 },
      desc: '从城里来的裁缝学徒，暗地里学了一手好箭法。',
      battleQuotes: { start: ['箭在弦上！'], kill: ['正中靶心！'], lowHp: ['别、别过来......'] },
    },
    'nuoen': {
      id: 'nuoen', name: '诺恩', title: '沉默的皮匠',
      profession: 'warrior', quality: 'A', talentMax: 5,
      level: 1, maxLevel: 99,
      baseStats: { hp: 110, mp: 10, attack: 15, defense: 14, speed: 5 },
      growthStats: { hp: 13, mp: 0.8, attack: 3.0, defense: 2.5, speed: 0.4 },
      aiStrategy: 'tank',
      recruitCondition: { type: 'item', itemName: '非自然的皮', levelReq: 10 },
      desc: '沉默寡言的皮匠，他的皮匠手艺里藏着不为人知的战斗技巧。',
    },
    'leina': {
      id: 'leina', name: '蕾娜', title: '村医',
      profession: 'mage_heal', quality: 'A', talentMax: 5,
      level: 1, maxLevel: 99,
      baseStats: { hp: 75, mp: 50, attack: 8, defense: 6, speed: 9 },
      growthStats: { hp: 7, mp: 5, attack: 1.5, defense: 0.8, speed: 1.0 },
      aiStrategy: 'support',
      skills: [{ id: 'heal_light', name: '治愈术', type: 'heal', mpCost: 15, healPct: 0.20, cooldown: 2 }],
      recruitCondition: { type: 'item', itemName: '珍稀药材', levelReq: 10 },
      desc: '村里的唯一大夫，懂得一些治疗法术。',
      battleQuotes: { start: ['小心点，我可不保证能救你第二次。'], lowHp: ['我需要治疗......'] },
    },
    'arthur': {
      id: 'arthur', name: '阿瑟', title: '被遗弃的法师',
      profession: 'mage_fire', quality: 'S', talentMax: 6,
      level: 1, maxLevel: 99,
      baseStats: { hp: 70, mp: 60, attack: 18, defense: 4, speed: 8 },
      growthStats: { hp: 6, mp: 6, attack: 3.5, defense: 0.6, speed: 0.8 },
      aiStrategy: 'aggressive',
      recruitCondition: { type: 'quest', questId: 'arthur_rescue', levelReq: 25 },
      desc: '被组织遗弃的火焰法师，在灰烬山脉的矿道中困了很久。',
      battleQuotes: { start: ['燃烧吧。'], kill: ['灰飞烟灭。'], lowHp: ['我不能倒在这里。'] },
    },
  },

  qualityName: { C: '普通', B: '优秀', A: '精良', S: '史诗', SS: '传说' },
  qualityColor: { C: '#aaa', B: '#4fc3f7', A: '#ab47bc', S: '#ff9800', SS: '#f44336' },

  getCompanionTemplate(id) { return this.companions[id] || null; },

  // ========== 检查招募条件 ==========
  checkRecruitCondition(companionId, state) {
    var tpl = this.companions[companionId];
    if (!tpl) return { ok: false, reason: '该随从不存在' };
    var pLv = state.player ? state.player.level || 1 : 1;
    if (pLv < tpl.recruitCondition.levelReq) return { ok: false, reason: '需要主角等级达到 ' + tpl.recruitCondition.levelReq + ' 级' };
    var cur = state.companions || [];
    if (cur.length >= 2) return { ok: false, reason: '随从已满（最多2个）' };
    if (cur.find(function(c) { return c.id === companionId; })) return { ok: false, reason: '该随从已在队伍中' };
    var cond = tpl.recruitCondition;
    if (cond.type === 'auto') return { ok: true };
    if (cond.type === 'quest') {
      var done = state.quests ? (state.quests.completed || []) : [];
      return done.indexOf(cond.questId) !== -1 ? { ok: true } : { ok: false, reason: '需要完成对应任务' };
    }
    if (cond.type === 'affection') {
      var aff = state.world && state.world.affection ? (state.world.affection[cond.npcId] || 0) : 0;
      return aff >= cond.affectionReq ? { ok: true } : { ok: false, reason: '需要对应NPC好感度达到 ' + cond.affectionReq };
    }
    if (cond.type === 'item') {
      var items = state.inventory ? state.inventory.items || [] : [];
      var has = items.find(function(it) { return it.name === cond.itemName || it.id === cond.itemId; });
      return has ? { ok: true } : { ok: false, reason: '需要拥有' + (cond.itemName || '对应物品') };
    }
    return { ok: false, reason: '未知招募条件' };
  },

  // ========== 招募随从 ==========
  recruitCompanion(companionId, state) {
    var check = this.checkRecruitCondition(companionId, state);
    if (!check.ok) return check;
    var tpl = this.companions[companionId];
    var pLv = state.player ? state.player.level || 1 : 1;
    var comp = this._createInstance(tpl, pLv);
    if (!state.companions) state.companions = [];
    state.companions.push(comp);
    // 消耗招募物品
    var cond = tpl.recruitCondition;
    if (cond.type === 'item' && (cond.itemName || cond.itemId)) {
      var items = state.inventory.items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].name === cond.itemName || items[i].id === cond.itemId) { items.splice(i, 1); break; }
      }
    }
    console.log('[随从] 招募了:', comp.name, '等级:', comp.level);
    return { ok: true, message: comp.name + ' 加入了你的队伍！', companion: comp };
  },

  _createInstance(tpl, level) {
    var s = this._calcStats(tpl, level);
    return {
      id: tpl.id, name: tpl.name, title: tpl.title,
      profession: tpl.profession, quality: tpl.quality, talentMax: tpl.talentMax,
      level: level, maxLevel: tpl.maxLevel,
      hp: s.hp, maxHp: s.maxHp, mp: s.mp, maxMp: s.maxMp,
      attack: s.attack, defense: s.defense, speed: s.speed,
      isCompanion: true, alive: true,
      aiStrategy: tpl.aiStrategy || 'balanced',
      skills: tpl.skills ? JSON.parse(JSON.stringify(tpl.skills)) : [],
      equipment: {}, talentPoints: 0, talents: [],
      exp: 0, expToNext: this._expToNext(level),
    };
  },

  _calcStats(tpl, level) {
    var b = tpl.baseStats, g = tpl.growthStats, l = Math.max(1, level);
    return {
      hp: Math.floor(b.hp + g.hp * (l-1)), maxHp: Math.floor(b.hp + g.hp * (l-1)),
      mp: Math.floor(b.mp + g.mp * (l-1)), maxMp: Math.floor(b.mp + g.mp * (l-1)),
      attack: Math.floor(b.attack + g.attack * (l-1)),
      defense: Math.floor(b.defense + g.defense * (l-1)),
      speed: Math.floor(b.speed + g.speed * (l-1)),
    };
  },

  _expToNext(level) { return Math.floor(50 * Math.pow(level, 1.5)); },

  // ========== 随从获得经验 ==========
  addExp(companion, exp) {
    if (!companion) return { leveledUp: false };
    companion.exp += exp;
    var up = false, gained = 0;
    while (companion.exp >= companion.expToNext && companion.level < companion.maxLevel) {
      companion.exp -= companion.expToNext;
      companion.level++; gained++; up = true;
      var tpl = this.companions[companion.id];
      if (tpl) {
        var ns = this._calcStats(tpl, companion.level);
        companion.maxHp = ns.maxHp; companion.maxMp = ns.maxMp;
        companion.hp = Math.min(companion.maxHp, companion.hp + (ns.maxHp - companion.maxHp));
        companion.mp = Math.min(companion.maxMp, companion.mp + (ns.maxMp - companion.maxMp));
        companion.hp = ns.maxHp; companion.mp = ns.maxMp; // 满血升级
        companion.attack = ns.attack; companion.defense = ns.defense; companion.speed = ns.speed;
      }
      companion.expToNext = this._expToNext(companion.level);
    }
    return { leveledUp: up, newLevel: companion.level, levelsGained: gained };
  },

  // ========== 移除随从 ==========
  removeCompanion(companionId, state) {
    if (!state.companions) return { ok: false, reason: '没有随从' };
    var idx = -1;
    for (var i = 0; i < state.companions.length; i++) { if (state.companions[i].id === companionId) { idx = i; break; } }
    if (idx === -1) return { ok: false, reason: '随从不在队伍中' };
    var removed = state.companions.splice(idx, 1)[0];
    if (removed.equipment) {
      for (var slot in removed.equipment) {
        if (removed.equipment[slot]) StateUtils.addToInventory(state, removed.equipment[slot]);
      }
    }
    return { ok: true, message: removed.name + ' 离开了队伍', removed: removed };
  },

  // ========== 战斗AI决策 ==========
  decideAction(companion, combat) {
    if (!companion || !combat) return null;
    var enemies = combat.getAliveEnemies();
    if (enemies.length === 0) return null;
    var strategy = companion.aiStrategy || 'balanced';
    if (strategy === 'aggressive') {
      var t = enemies.reduce(function(m, e) { return e.hp < m.hp ? e : m; }, enemies[0]);
      return { action: 'attack', target: t };
    }
    if (strategy === 'tank') {
      var t = enemies.reduce(function(m, e) { return (e.attack||0) > (m.attack||0) ? e : m; }, enemies[0]);
      return { action: 'attack', target: t };
    }
    if (strategy === 'support') {
      var p = combat.getPlayerUnit();
      if (p && p.hp < p.maxHp * 0.5 && companion.skills && companion.skills.length > 0) {
        var hs = companion.skills.find(function(s) { return s.type === 'heal'; });
        if (hs && companion.mp >= (hs.mpCost || 10)) return { action: 'skill', skill: hs, target: p };
      }
      return { action: 'attack', target: enemies[0] };
    }
    return { action: 'attack', target: enemies[0] };
  },

  // ========== 同步随从等级 ==========
  syncCompanionLevels(state) {
    if (!state.companions || !state.player) return;
    var pLv = state.player.level || 1;
    for (var i = 0; i < state.companions.length; i++) {
      var c = state.companions[i];
      if (c.level < pLv) {
        var tpl = this.companions[c.id];
        if (tpl) {
          var ns = this._calcStats(tpl, pLv);
          c.level = pLv; c.maxHp = ns.maxHp; c.maxMp = ns.maxMp;
          c.hp = ns.maxHp; c.mp = ns.maxMp;
          c.attack = ns.attack; c.defense = ns.defense; c.speed = ns.speed;
          c.expToNext = this._expToNext(pLv); c.exp = 0;
        }
      }
    }
  },

  // ========== 可招募列表 ==========
  getRecruitableList(state) {
    var list = [], recruited = (state.companions || []).map(function(c) { return c.id; });
    for (var key in this.companions) {
      if (!this.companions.hasOwnProperty(key) || recruited.indexOf(key) !== -1) continue;
      var t = this.companions[key], ck = this.checkRecruitCondition(key, state);
      list.push({ id: key, name: t.name, title: t.title, profession: t.profession, quality: t.quality, qualityName: this.qualityName[t.quality] || t.quality, canRecruit: ck.ok, reason: ck.ok ? null : ck.reason, desc: t.desc });
    }
    return list;
  },
};

try { module.exports = CompanionSystem; } catch(e) {}