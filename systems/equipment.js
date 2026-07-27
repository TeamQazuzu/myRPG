const EquipmentSystem = {
  _getState() {
    if (window.gameApp && window.gameApp.state) return window.gameApp.state;
    return null;
  },

  forge(item) {
    const state = this._getState();
    if (!state) return { ok: false, msg: "无游戏状态" };
    const order = DATA.rarityOrder;
    const curIdx = order.indexOf(item.rarity);
    if (curIdx >= order.length - 1) return { ok: false, msg: "已达最高品质" };
    const newRarity = order[curIdx + 1];
    const limits = DATA.equipLimits.find(l => state.player.level >= l.levelRange[0] && state.player.level <= l.levelRange[1]);
    if (DATA.Q_ORDER[newRarity] > DATA.Q_ORDER[limits.maxRarity]) {
      return { ok: false, msg: "当前等级段最高" + DATA.rarity[limits.maxRarity].name };
    }
    if (limits && newRarity === limits.maxRarity) {
      const equippedCount = Object.values(state.equipment).filter(e => e && e.rarity === newRarity).length;
      const invCount = state.inventory.items.filter(i => i.rarity === newRarity).length;
      if (equippedCount + invCount >= limits.sameColorMax) {
        return { ok: false, msg: "已达该品质持有上限" };
      }
    }
    const oldMult = DATA.Q_MULTI[item.rarity];
    const newMult = DATA.Q_MULTI[newRarity];
    const ratio = newMult / oldMult;
    item.rarity = newRarity;
    if (item.baseStats) {
      for (const k in item.baseStats) {
        item.baseStats[k] = Math.floor(item.baseStats[k] * ratio);
      }
    }
    const rData = DATA.rarity[newRarity];
    const affixCount = Utils.randInt(rData.minAffixes, rData.maxAffixes);
    item.affixes = [];
    if (affixCount > 0) {
      const poolKeys = Object.keys(DATA.affixPool).filter(k =>
        DATA.Q_ORDER[DATA.affixPool[k].minRarity] <= DATA.Q_ORDER[newRarity]);
      const selected = Utils.sample(poolKeys, Math.min(affixCount, poolKeys.length));
      item.affixes = selected.map(id => ({ id, name: DATA.affixPool[id].name, effect: DATA.affixPool[id].effect, value: DATA.affixPool[id].value }));
    }
    item.enchant = null;
    return { ok: true, msg: item.name + " 升级为" + DATA.rarity[newRarity].name + "！词条已重随机。" };
  },

  enchant(item) {
    if (item.enchant) return { ok: false, msg: "已有附魔" };
    const types = ["物理", "魔法", "生命", "功能", "特殊"];
    const t = types[Utils.rand(0, types.length - 1)];
    const qnames = ["普通", "优秀", "稀有", "史诗", "传说"];
    const qw = [50, 30, 15, 4, 1];
    const qidx = Utils.weightedRandom([0,1,2,3,4], qw);
    const val = Math.floor(Utils.rand(5, 15) * [1.0, 1.3, 1.7, 2.2, 3.0][qidx]);
    item.enchant = { t, q: qnames[qidx], v: val, desc: t + "·" + qnames[qidx] + "：属性+" + val };
    return { ok: true, msg: "附魔成功！" + item.enchant.desc };
  },

  clearEnchant(item) {
    item.enchant = null;
    return { ok: true, msg: "附魔已清除" };
  },

  socket(item, idx, gem) {
    if (!item.sockets || idx >= item.sockets.length) return { ok: false, msg: "无效孔位" };
    const old = item.sockets[idx].gem;
    item.sockets[idx].gem = { name: gem.name, quality: gem.quality, gemType: gem.gemType || gem.runeType };
    return { ok: true, old, msg: gem.name + " 已镶嵌" };
  },

  unsocket(item, idx) {
    if (!item.sockets || idx >= item.sockets.length) return { ok: false, msg: "无效孔位" };
    const g = item.sockets[idx].gem;
    if (!g) return { ok: false, msg: "空孔" };
    item.sockets[idx].gem = null;
    return { ok: true, gem: g, msg: "取出了 " + g.name };
  },

  checkRuneword(item) {
    if (!item.sockets || item.sockets.length < 3) return null;
    const gems = item.sockets.map(s => s.gem).filter(g => g);
    if (gems.length < 3) return null;
    const types = gems.map(g => g.gemType);
    for (const key in DATA.runewords) {
      const rw = DATA.runewords[key];
      if (rw.gems.length !== types.length) continue;
      let match = true;
      for (let i = 0; i < rw.gems.length; i++) {
        if (types[i] !== rw.gems[i]) { match = false; break; }
      }
      if (match) return rw;
    }
    return null;
  },

  compare(equipped, candidate) {
    if (!equipped) return { isBetter: true, diffs: [] };
    if (!candidate) return { isBetter: false, diffs: [] };
    const diffs = [];
    let score = 0;
    const statPairs = [
      ["physAtk", "物理攻击"], ["magAtk", "法术攻击"],
      ["physDef", "物理护甲"], ["magDef", "法术护甲"],
    ];
    statPairs.forEach(([k, label]) => {
      const cv = (candidate.baseStats && candidate.baseStats[k]) || 0;
      const ev = (equipped.baseStats && equipped.baseStats[k]) || 0;
      const d = cv - ev;
      if (d !== 0) { diffs.push({ n: label, d, b: d > 0 }); score += d; }
    });
    const ca = (candidate.affixes || []).length;
    const ea = (equipped.affixes || []).length;
    if (ca !== ea) { diffs.push({ n: "词条数", d: ca - ea, b: ca > ea }); }
    const cs = (candidate.sockets || []).length;
    const es = (equipped.sockets || []).length;
    if (cs !== es) { diffs.push({ n: "镶嵌孔", d: cs - es, b: cs > es }); }
    return { isBetter: score > 0 || ca > ea, diffs };
  },

  getTotalStats(equipment) {
    const total = { physAtk: 0, magAtk: 0, physDef: 0, magDef: 0 };
    if (!equipment) return total;
    for (const slot in equipment) {
      const item = equipment[slot];
      if (!item || !item.baseStats) continue;
      total.physAtk += item.baseStats.physAtk || 0;
      total.magAtk += item.baseStats.magAtk || 0;
      total.physDef += item.baseStats.physDef || 0;
      total.magDef += item.baseStats.magDef || 0;
    }
    return total;
  },

  typeToSlot(type) {
    return DATA.typeToSlot[type] || null;
  },
};
