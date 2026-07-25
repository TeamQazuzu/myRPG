// ============================================
// 《寻亲风云录》装备系统
// ============================================
const EquipmentSystem = {
  // ---------- 装备类型到槽位映射 ----------
  typeToSlot(type) {
    return DATA.typeToSlot[type] || null;
  },

  // ---------- 穿戴装备 ----------
  equip(state, item, slot) {
    if (!item || !slot) return { ok: false, msg: "参数错误" };
    const expectedSlot = this.typeToSlot(item.type);
    if (expectedSlot && expectedSlot !== slot && !slot.startsWith(expectedSlot)) {
      return { ok: false, msg: `${item.name} 不能装备到 ${DATA.slots[slot] || slot} 槽位` };
    }
    const check = StateUtils.checkEquipLimit(state, item);
    if (!check.ok) return { ok: false, msg: check.reason };
    const old = state.equipment[slot];
    state.equipment[slot] = item;
    return { ok: true, msg: `装备了 ${item.name}`, replaced: old };
  },

  // ---------- 卸下装备 ----------
  unequip(state, slot) {
    const item = state.equipment[slot];
    if (!item) return { ok: false, msg: "该槽位没有装备" };
    state.equipment[slot] = null;
    return { ok: true, msg: `卸下了 ${item.name}`, item };
  },

  // ---------- 强化（+1/+2...不改变品质，提升基础属性）----------
  // 强化规则：
  //   每级 +5% 基础属性（攻击/防御）
  //   强化等级上限 = 品质对应上限（白+3, 绿+5, 蓝+8, 紫+10, 橙+12, 红+15, 金+10）
  //   强化不改变品质、词条、附魔
  //   100% 成功率，消耗金币
  // 强化等级显示在装备名后：武器名 +N
  enhance(item, state) {
    if (!item) return { ok: false, msg: '无效装备' };
    // 传家宝不可强化
    if (item.rarity === 'gold') return { ok: false, msg: '传家宝无法强化' };

    var currentEnhance = item.enhanceLevel || 0;
    // 获取品质对应强化上限
    var maxEnhance = this.getMaxEnhance(item.rarity);
    if (currentEnhance >= maxEnhance) {
      return { ok: false, msg: '已达品质强化上限（+' + maxEnhance + '）' };
    }

    // 计算强化费用：基础费用 × (1 + 当前等级 × 0.5)
    var baseCost = Math.floor(item.level * 5 + 10);
    var cost = Math.floor(baseCost * (1 + currentEnhance * 0.5));

    // 检查金币
    if (state && !StateUtils.spendGold(state, cost)) {
      return { ok: false, msg: '金币不足（需要 ' + cost + ' 金）' };
    }

    // 执行强化
    item.enhanceLevel = currentEnhance + 1;
    var bonus = 1 + 0.05 * item.enhanceLevel; // 累计+5%/级

    // 应用到基础属性
    if (item.baseStats) {
      item.baseStats.physAtk = Math.floor((item.baseStats.physAtk || 0) * 1.05);
      item.baseStats.magAtk = Math.floor((item.baseStats.magAtk || 0) * 1.05);
      item.baseStats.physDef = Math.floor((item.baseStats.physDef || 0) * 1.05);
      item.baseStats.magDef = Math.floor((item.baseStats.magDef || 0) * 1.05);
    }

    // 更新装备描述
    this._updateItemDesc(item);

    return { ok: true, msg: item.name + ' 强化至 +' + item.enhanceLevel + '！', cost: cost };
  },

  // 获取品质对应强化上限
  getMaxEnhance(rarity) {
    var limits = {
      white: 3, green: 5, blue: 8, purple: 10,
      orange: 12, red: 15, gold: 10,
    };
    return limits[rarity] || 3;
  },

  // 获取强化费用（预览用）
  getEnhanceCost(item) {
    if (!item) return 0;
    var currentEnhance = item.enhanceLevel || 0;
    var baseCost = Math.floor(item.level * 5 + 10);
    return Math.floor(baseCost * (1 + currentEnhance * 0.5));
  },

  // 更新装备描述（含强化等级）
  _updateItemDesc(item) {
    var enhanceStr = item.enhanceLevel ? ' +' + item.enhanceLevel : '';
    var qualityStr = Utils && Utils.getQualityName ? Utils.getQualityName(item.rarity) : (item.rarity || '');
    var slotStr = (DATA && DATA.slots && DATA.slots[item.type]) || item.type || '';
    item.desc = 'Lv.' + item.level + ' ' + qualityStr + slotStr + enhanceStr;
    if (!item.name || item.name.indexOf('+') === -1) {
      item.name = (item.baseName || item.name) + enhanceStr;
    } else {
      // 已有强化后缀，更新
      var baseName = item.baseName || item.name.replace(/\+\d+$/, '').trim();
      item.name = baseName + enhanceStr;
    }
  },

  // ---------- 锻造（升级品质） ----------
  forge(item) {
    const qo = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    const ci = qo.indexOf(item.rarity);
    if (ci >= qo.length - 1) {
      return { ok: false, msg: '已达最高品质' };
    }
    const nq = qo[ci + 1];
    const mq = Utils.getMaxQuality(item.level);
    if (DATA.Q_ORDER[nq] > DATA.Q_ORDER[mq]) {
      return { ok: false, msg: '当前等级段最高' + Utils.getQualityName(mq) };
    }
    // 检查持有上限
    const bracket = Utils.getLevelBracket(item.level);
    const limit = DATA.qualityLimits[bracket];
    if (limit && nq === limit.maxQuality) {
      const count = this.countQualityInInventory(nq);
      if (count >= limit.sameLimit) {
        return { ok: false, msg: '已达到该品质持有上限（' + limit.sameLimit + '件）' };
      }
    }
    // 执行锻造
    item.rarity = nq;
    const om = DATA.Q_MULTI[qo[ci]];
    const nm = DATA.Q_MULTI[nq];
    const r = nm / om;
    if (item.baseStats) {
      if (item.baseStats.physAtk) item.baseStats.physAtk = Math.floor(item.baseStats.physAtk * r);
      if (item.baseStats.magAtk) item.baseStats.magAtk = Math.floor(item.baseStats.magAtk * r);
      if (item.baseStats.physDef) item.baseStats.physDef = Math.floor(item.baseStats.physDef * r);
      if (item.baseStats.magDef) item.baseStats.magDef = Math.floor(item.baseStats.magDef * r);
    }
    // 重随机词条
    const rarityData = DATA.rarity[nq];
    const ac = {
      white: 0, green: Utils.randInt(1, 2), blue: Utils.randInt(2, 3),
      purple: Utils.randInt(3, 4), orange: Utils.randInt(4, 5), red: 6
    };
    const cnt = ac[nq] || 0;
    item.affixes = [];
    if (cnt > 0) {
      const used = new Set();
      const pool = Object.entries(DATA.affixPool).filter(function([id, a]) {
        return DATA.Q_ORDER[a.minRarity] <= DATA.Q_ORDER[Utils.getMaxQuality(item.level)] && !used.has(a.name);
      });
      for (let i = 0; i < cnt && pool.length > 0; i++) {
        const idx = Utils.randInt(0, pool.length - 1);
        const [affixId, affixData] = pool[idx];
        item.affixes.push({ id: affixId, name: affixData.name, effect: affixData.effect, value: affixData.value });
        used.add(affixData.name);
        pool.splice(idx, 1);
      }
    }
    item.enchant = null;
    item.desc = 'Lv.' + item.level + ' ' + Utils.getQualityName(nq) + (DATA.slots[item.type] || item.type);
    return { ok: true, msg: item.name + ' 升级为' + Utils.getQualityName(nq) + '！词条已重随机。' };
  },

  countQualityInInventory(quality) {
    let count = 0;
    // 注意：此函数依赖全局 state，实际调用时需传入 state
    // 这里保留兼容接口，实际计数逻辑在调用方处理
    return count;
  },

  // ---------- 附魔 ----------
  enchant(item) {
    if (item.enchant) {
      return { ok: false, msg: '已有附魔，需先清除' };
    }
    const types = ['物理', '魔法', '生命', '功能', '特殊'];
    const t = types[Utils.randInt(0, types.length - 1)];
    const qnames = ['普通', '优秀', '稀有', '史诗', '传说'];
    const qw = [50, 30, 15, 4, 1];
    const qidx = Utils.weightedRandom([0, 1, 2, 3, 4], qw);
    const val = Math.floor(Utils.randInt(5, 15) * [1.0, 1.3, 1.7, 2.2, 3.0][qidx]);
    item.enchant = {
      t: t,
      q: qnames[qidx],
      v: val,
      desc: t + '·' + qnames[qidx] + '：属性+' + val
    };
    return { ok: true, msg: '附魔成功！[' + item.enchant.desc + ']' };
  },

  clearEnchant(item) {
    item.enchant = null;
    return { ok: true, msg: '附魔已清除' };
  },

  // ---------- 镶嵌 ----------
  _ensureSocketObjects(item) {
    // sockets 生成时是数字数组 [0,1,2]，需转为对象数组 [{gem:null},...]
    if (item.sockets && item.sockets.length > 0 && typeof item.sockets[0] === 'number') {
      item.sockets = item.sockets.map(function() { return { gem: null }; });
    }
  },
  socket(item, idx, gem) {
    if (!item.sockets || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }
    this._ensureSocketObjects(item);
    const old = item.sockets[idx].gem;
    item.sockets[idx].gem = {
      name: gem.name,
      quality: gem.quality,
      gemType: gem.gemType || gem.runeType
    };
    return { ok: true, old: old, msg: gem.name + ' 已镶嵌' };
  },

  unsocket(item, idx) {
    if (!item.sockets || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }
    this._ensureSocketObjects(item);
    const g = item.sockets[idx].gem;
    if (!g) return { ok: false, msg: '空孔' };
    item.sockets[idx].gem = null;
    return { ok: true, gem: g, msg: '取出了 ' + g.name };
  },

  // ---------- 检查符文之语 ----------
  checkRuneword(item) {
    if (!item.sockets || item.sockets.length < 3) return null;
    const gems = item.sockets.map(function(s) { return s.gem; }).filter(function(g) { return g; });
    if (gems.length < 3) return null;
    const types = gems.map(function(g) { return g.gemType; });
    for (let k in DATA.runewords) {
      const rw = DATA.runewords[k];
      let match = true;
      for (let i = 0; i < rw.c.length; i++) {
        if (types[i] !== rw.c[i]) { match = false; break; }
      }
      if (match) return rw;
    }
    return null;
  },

  // ---------- 装备对比 ----------
  compare(equipped, candidate) {
    if (!equipped) return { isBetter: true, diffs: [] };
    if (!candidate) return { isBetter: false, diffs: [] };
    const diffs = [];
    let score = 0;
    const stats = [
      ['baseStats.physAtk', '物理攻击'],
      ['baseStats.magAtk', '法术攻击'],
      ['baseStats.physDef', '物理护甲'],
      ['baseStats.magDef', '法术护甲']
    ];
    stats.forEach(function(s) {
      const keys = s[0].split('.');
      const getVal = function(obj) {
        let o = obj;
        for (let k of keys) { o = o ? o[k] : undefined; }
        return o || 0;
      };
      const d = getVal(candidate) - getVal(equipped);
      if (d !== 0) {
        diffs.push({ n: s[1], d: d, b: d > 0 });
        score += d;
      }
    });
    const ca = (candidate.affixes || []).length;
    const ea = (equipped.affixes || []).length;
    if (ca !== ea) diffs.push({ n: '词条数', d: ca - ea, b: ca > ea });
    const cs = (candidate.sockets || []).length;
    const es = (equipped.sockets || []).length;
    if (cs !== es) diffs.push({ n: '镶嵌孔', d: cs - es, b: cs > es });
    return { isBetter: score > 0 || ca > ea, diffs: diffs };
  },

  // ---------- 获取装备属性总和 ----------
  getTotalStats(state) {
    const eq = state.equipment;
    const total = { physAtk: 0, magAtk: 0, physDef: 0, magDef: 0 };
    for (let slot in eq) {
      const item = eq[slot];
      if (!item) continue;
      if (item.baseStats) {
        total.physAtk += item.baseStats.physAtk || 0;
        total.magAtk += item.baseStats.magAtk || 0;
        total.physDef += item.baseStats.physDef || 0;
        total.magDef += item.baseStats.magDef || 0;
      }
    }
    return total;
  }
};

// 导出
try { module.exports = EquipmentSystem; } catch(e) {}
