
const SAVE_KEY = 'chronicle_keeper_save_v1';
const AUTO_SAVE_INTERVAL = 300000; // 5分钟

const GameState = {
  // ---------- 当前游戏状态 ----------
  data: null,

  // ---------- 初始化新游戏 ----------
  initNew: function(playerName) {
    const attrs = { str: 14, agi: 12, int: 10, vit: 13, ten: 10, spi: 9 };

    this.data = {
      version: GAME_DATA.version,
      player: {
        name: playerName || '酒馆少年',
        level: 10,
        exp: 0,
        expToNext: Utils.expForLevel(11),
        expCap: 20, // 经验上限（击败守门员解锁）
        gold: 120,
        diamond: 0,
        class: '未转职',
        classPath: [],
        awakened: false,
        attributes: Utils.deepCopy(attrs),
        attributePoints: 0,
        talentPoints: 0,
        talents: {},
        hp: 0,
        maxHp: 0,
        mp: 0,
        maxMp: 0,
        combatMode: 'manual',
        location: 'village-tavern',
        playTime: 0,
        deaths: 0,
        revivesLeft: 5,
        hardcore: false,
        dead: false,
        retired: false,
        canPlay: true,
        blessingChoice: null,
        buffs: []
      },
      companions: [],
      inventory: {
        items: [],
        capacity: 20,
        maxCapacity: 60
      },
      storage: {
        items: [],
        capacity: 50,
        maxCapacity: 250,
        upgradeLevel: 0
      },
      equipment: {
        weapon: null,
        offhand: null,
        helmet: null,
        chest: null,
        legs: null,
        boots: null,
        gloves: null,
        necklace: null,
        ring1: null,
        ring2: null
      },
      world: {
        currentZone: 'village',
        currentFrame: 'village-tavern',
        exploredFrames: ['village-tavern'],
        gatekeepersDefeated: {},
        fragments: { collected: [], total: 12 },
        heirloom: {
          slot1: null,
          slot2: null,
          slot3: null,
          unlockedSlots: 2
        },
        silverDragon: {},
        goldenDragon: {},
        offlineTime: 0,
        lastSave: Date.now(),
        gameStartTime: Date.now()
      },
      quests: {},
      crafting: {
        miningExp: 0,
        herbExp: 0,
        forgeExp: 0,
        enchantExp: 0
      },
      settings: {
        autoSave: true,
        sound: true,
        music: true,
        textSpeed: 'normal'
      },
      stats: {
        totalKills: 0,
        totalGoldEarned: 0,
        totalItemsFound: 0,
        highestDamage: 0,
        deepestFloor: 0
      }
    };

    // 计算初始属性
    this.recalcStats();

    // 设置初始HP/MP
    this.data.player.hp = this.data.player.maxHp;
    this.data.player.mp = this.data.player.maxMp;

    // 给予初始装备
    this.giveStarterEquipment();

    // 给予初始物品
    this.giveStarterItems();

    // 艾琳自动入队
    this.addCompanion({
      id: Utils.genId(),
      name: '艾琳',
      class: 'ranger',
      level: 10,
      exp: 0,
      attributes: { str: 10, agi: 16, int: 8, vit: 10, ten: 8, spi: 10 },
      hp: 100, maxHp: 100,
      mp: 40, maxMp: 40,
      equipment: {},
      skills: ['shoot', 'aim'],
      loyalty: 80,
      ai: 'balanced'
    });

    this.save();
    return this.data;
  },

  // ---------- 给予初始装备 ----------
  giveStarterEquipment: function() {
    const starters = GAME_DATA.starterEquipment;
    for (let i = 0; i < starters.length; i++) {
      const item = Utils.deepCopy(starters[i]);
      item.id = Utils.genId();
      item.type = 'equipment';
      item.stackable = false;
      item.desc = 'Lv.' + item.level + ' ' + Utils.getQualityName(item.quality) + GAME_DATA.slots[item.slot];
      this.data.equipment[item.slot] = item;
    }
  },

  // ---------- 给予初始物品 ----------
  giveStarterItems: function() {
    const si = GAME_DATA.starterInventory;

    // 材料
    for (let cat in si.materials) {
      for (let i = 0; i < si.materials[cat]; i++) {
        this.data.inventory.items.push(this.genMaterial(cat));
      }
    }

    // 消耗品
    for (let cat in si.consumables) {
      for (let i = 0; i < si.consumables[cat]; i++) {
        this.data.inventory.items.push(this.genConsumable(cat));
      }
    }

    // 测试装备
    for (let i = 0; i < si.testEquipment.length; i++) {
      const te = si.testEquipment[i];
      this.data.inventory.items.push(this.genEquipment(te.slot, te.level, te.quality));
    }

    // 带孔测试装备
    const socketed = this.genEquipment('weapon', 12, 'blue');
    socketed.sockets = [{ gem: null }, { gem: null }, { gem: null }];
    this.data.inventory.items.push(socketed);

    // 宝石
    const rg = this.genMaterial('gem');
    rg.gemType = 'red'; rg.name = '红宝石'; rg.quality = 'green';
    this.data.inventory.items.push(rg);

    const bg = this.genMaterial('gem');
    bg.gemType = 'blue'; bg.name = '蓝宝石'; bg.quality = 'green';
    this.data.inventory.items.push(bg);

    const fr = this.genMaterial('rune');
    fr.runeType = 'fire'; fr.name = '火焰符文'; fr.quality = 'blue';
    this.data.inventory.items.push(fr);
  },

  // ---------- 生成材料 ----------
  genMaterial: function(cat, forcedQ) {
    const pool = GAME_DATA.materials[cat] || [];
    const t = forcedQ
      ? (pool.find(function(x) { return x.q === forcedQ; }) || pool[0])
      : pool[Utils.rand(0, pool.length - 1)];
    return {
      id: Utils.genId(),
      name: t.n,
      type: 'material',
      category: cat,
      quality: t.q,
      desc: t.d,
      stackable: true,
      stackCount: 1,
      stackMax: t.m,
      gemType: t.g || null,
      runeType: t.r || null
    };
  },

  // ---------- 生成消耗品 ----------
  genConsumable: function(cat, forcedQ) {
    const pool = GAME_DATA.consumables[cat] || [];
    const t = forcedQ
      ? (pool.find(function(x) { return x.q === forcedQ; }) || pool[0])
      : pool[Utils.rand(0, pool.length - 1)];
    return {
      id: Utils.genId(),
      name: t.n,
      type: 'consumable',
      category: cat,
      quality: t.q,
      desc: t.d,
      stackable: true,
      stackCount: 1,
      stackMax: t.m,
      effect: {
        healHp: t.hp || 0,
        healMp: t.mp || 0,
        buff: t.b || null
      }
    };
  },

  // ---------- 生成装备 ----------
  genEquipment: function(slot, lv, forcedQ) {
    const ts = GAME_DATA.equipmentTemplates[slot];
    if (!ts) return null;

    const valid = ts.filter(function(t) { return lv >= t.min && lv <= t.max; });
    const t = valid.length > 0 ? valid[Utils.rand(0, valid.length - 1)] : ts[ts.length - 1];

    let q = forcedQ;
    if (!q) {
      const maxQ = Utils.getMaxQuality(lv);
      const maxV = GAME_DATA.Q_ORDER[maxQ];
      const cands = Object.keys(GAME_DATA.Q_WEIGHTS).filter(function(k) {
        return GAME_DATA.Q_ORDER[k] <= maxV;
      });
      const ws = cands.map(function(k) { return GAME_DATA.Q_WEIGHTS[k]; });
      q = Utils.weightedRandom(cands, ws);
      q = q || 'white';
    }

    const ratio = Math.min(1, Math.max(0, (lv - t.min) / (t.max - t.min)));
    const bp = t.patk ? Math.floor((t.patk[0] + (t.patk[1] - t.patk[0]) * ratio) * GAME_DATA.Q_MULTI[q]) : 0;
    const bm = t.matk ? Math.floor((t.matk[0] + (t.matk[1] - t.matk[0]) * ratio) * GAME_DATA.Q_MULTI[q]) : 0;
    const bpd = t.pdef ? Math.floor((t.pdef[0] + (t.pdef[1] - t.pdef[0]) * ratio) * GAME_DATA.Q_MULTI[q]) : 0;
    const bmd = t.mdef ? Math.floor((t.mdef[0] + (t.mdef[1] - t.mdef[0]) * ratio) * GAME_DATA.Q_MULTI[q]) : 0;

    const item = {
      id: Utils.genId(),
      name: t.p + t.b,
      slot: slot,
      quality: q,
      level: lv,
      basePatk: bp,
      baseMatk: bm,
      basePdef: bpd,
      baseMdef: bmd,
      affixes: [],
      sockets: [],
      enchant: null,
      desc: 'Lv.' + lv + ' ' + Utils.getQualityName(q) + GAME_DATA.slots[slot],
      stackable: false,
      type: 'equipment'
    };

    // 生成词条
    const ac = { white: 0, green: Utils.rand(1, 2), blue: Utils.rand(2, 3), purple: Utils.rand(3, 4), orange: Utils.rand(4, 5), red: 6 };
    const cnt = ac[q] || 0;
    if (cnt > 0) {
      const used = new Set();
      const pool = GAME_DATA.affixes.filter(function(a) {
        return GAME_DATA.Q_ORDER[a.q] <= GAME_DATA.Q_ORDER[Utils.getMaxQuality(lv)] && !used.has(a.n);
      });
      for (let i = 0; i < cnt && pool.length > 0; i++) {
        const idx = Utils.rand(0, pool.length - 1);
        item.affixes.push({ n: pool[idx].n, e: pool[idx].e, q: pool[idx].q });
        used.add(pool[idx].n);
        pool.splice(idx, 1);
      }
    }

    // 生成镶嵌孔
    const sc = { white: 0, green: 0.1, blue: 0.25, purple: 0.4, orange: 0.6, red: 0.8 };
    for (let i = 0; i < 3; i++) {
      if (Math.random() < (sc[q] || 0)) item.sockets.push({ gem: null });
    }

    return item;
  },

  // ---------- 添加随从 ----------
  addCompanion: function(companion) {
    if (this.data.companions.length >= 2) {
      log('随从已满（最多2人）', 'system');
      return false;
    }
    this.data.companions.push(companion);
    return true;
  },

  // ---------- 重新计算属性 ----------
  recalcStats: function() {
    const p = this.data.player;
    const a = p.attributes;

    const s = {
      patk: a.str * 2 + a.agi * 0.5,
      matk: a.int * 2 + a.spi * 0.3,
      pdef: a.str * 1 + a.ten * 3,
      mdef: a.int * 1 + a.spi * 2 + a.ten * 1,
      maxHp: a.vit * 10 + a.ten * 5,
      maxMp: a.spi * 5 + a.int * 2,
      hit: a.agi * 1.5 + 5,
      dodge: a.agi * 1 + 2,
      crit: a.agi * 0.8 + 1,
      hpRegen: a.vit * 0.3,
      mpRegen: a.spi * 0.2,
      critDmg: 1.5
    };

    // 装备加成
    const eq = this.data.equipment;
    for (let slot in eq) {
      const item = eq[slot];
      if (!item) continue;
      s.patk += item.basePatk || 0;
      s.matk += item.baseMatk || 0;
      s.pdef += item.basePdef || 0;
      s.mdef += item.baseMdef || 0;
    }

    p.stats = s;
    p.maxHp = Math.floor(s.maxHp);
    p.maxMp = Math.floor(s.maxMp);
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
  },

  // ---------- 经验处理 ----------
  addExp: function(amount) {
    const p = this.data.player;
    if (p.level >= p.expCap) {
      log('经验已达当前上限。击败守门员以解锁更高等级。', 'system');
      return;
    }

    p.exp += amount;
    while (p.exp >= p.expToNext && p.level < p.expCap) {
      p.exp -= p.expToNext;
      this.levelUp();
    }
    if (p.level >= p.expCap) {
      p.exp = 0;
    }
  },

  levelUp: function() {
    const p = this.data.player;
    p.level++;
    p.expToNext = Utils.expForLevel(p.level + 1);
    p.attributePoints += 3;
    p.talentPoints += 1;
    log('<b>等级提升！</b> 你达到了 Lv.' + p.level, 'system');
    this.recalcStats();
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  },

  // ---------- 存档 ----------
  save: function() {
    try {
      this.data.world.lastSave = Date.now();
      const json = JSON.stringify(this.data);
      localStorage.setItem(SAVE_KEY, json);
      log('游戏已保存', 'info');
      return true;
    } catch (e) {
      console.error('存档失败:', e);
      log('存档失败！', 'system');
      return false;
    }
  },

  // ---------- 读档 ----------
  load: function() {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;
      this.data = JSON.parse(json);

      // 计算离线收益
      this.calcOfflineReward();

      log('存档已读取', 'info');
      return this.data;
    } catch (e) {
      console.error('读档失败:', e);
      return null;
    }
  },

  // ---------- 检查是否有存档 ----------
  hasSave: function() {
    return !!localStorage.getItem(SAVE_KEY);
  },

  // ---------- 删除存档 ----------
  deleteSave: function() {
    localStorage.removeItem(SAVE_KEY);
    this.data = null;
  },

  // ---------- 导出存档 ----------
  exportSave: function() {
    if (!this.data) return null;
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chronicle_keeper_save_' + this.data.player.name + '_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    log('存档已导出', 'info');
  },

  // ---------- 导入存档 ----------
  importSave: function(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.version || !data.player) throw new Error('无效存档');
      this.data = data;
      this.save();
      log('存档已导入', 'info');
      return true;
    } catch (e) {
      log('导入失败：' + e.message, 'system');
      return false;
    }
  },

  // ---------- 计算离线收益 ----------
  calcOfflineReward: function() {
    const now = Date.now();
    const last = this.data.world.lastSave || now;
    const diff = Math.floor((now - last) / 1000); // 秒

    if (diff < 60) return; // 少于1分钟不算

    const maxOffline = 8 * 3600; // 8小时上限
    const effective = Math.min(diff, maxOffline);
    this.data.world.offlineTime = effective;

    // TODO: 根据当前挂机设置计算收益
    // 暂时只记录离线时间
    if (effective > 300) {
      const hours = Math.floor(effective / 3600);
      const mins = Math.floor((effective % 3600) / 60);
      log('你离线了 ' + (hours > 0 ? hours + '小时' : '') + mins + '分钟', 'info');
    }
  },

  // ---------- 自动存档 ----------
  startAutoSave: function() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    this._autoSaveTimer = setInterval(function() {
      if (GameState.data && GameState.data.settings.autoSave) {
        GameState.save();
      }
    }, AUTO_SAVE_INTERVAL);
  },

  stopAutoSave: function() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  }
};
