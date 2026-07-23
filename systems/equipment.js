
const EquipmentSystem = {
  // ---------- 锻造 ----------
  forge: function(item) {
    const qo = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    const ci = qo.indexOf(item.quality);
    if (ci >= qo.length - 1) {
      return { ok: false, msg: '已达最高品质' };
    }

    const nq = qo[ci + 1];
    const mq = Utils.getMaxQuality(item.level);
    if (GAME_DATA.Q_ORDER[nq] > GAME_DATA.Q_ORDER[mq]) {
      return { ok: false, msg: '当前等级段最高' + Utils.getQualityName(mq) };
    }

    // 检查持有上限
    const bracket = Utils.getLevelBracket(GameState.data.player.level);
    const limit = GAME_DATA.qualityLimits[bracket];
    if (limit && nq === limit.maxQuality) {
      const count = this.countQualityInInventory(nq);
      if (count >= limit.sameLimit) {
        return { ok: false, msg: '已达到该品质持有上限（' + limit.sameLimit + '件）' };
      }
    }

    // 执行锻造
    item.quality = nq;
    const om = GAME_DATA.Q_MULTI[qo[ci]];
    const nm = GAME_DATA.Q_MULTI[nq];
    const r = nm / om;

    if (item.basePatk) item.basePatk = Math.floor(item.basePatk * r);
    if (item.baseMatk) item.baseMatk = Math.floor(item.baseMatk * r);
    if (item.basePdef) item.basePdef = Math.floor(item.basePdef * r);
    if (item.baseMdef) item.baseMdef = Math.floor(item.baseMdef * r);

    // 重随机词条
    const ac = { white: 0, green: Utils.rand(1, 2), blue: Utils.rand(2, 3), purple: Utils.rand(3, 4), orange: Utils.rand(4, 5), red: 6 };
    const cnt = ac[nq] || 0;
    item.affixes = [];
    if (cnt > 0) {
      const used = new Set();
      const pool = GAME_DATA.affixes.filter(function(a) {
        return GAME_DATA.Q_ORDER[a.q] <= GAME_DATA.Q_ORDER[Utils.getMaxQuality(item.level)] && !used.has(a.n);
      });
      for (let i = 0; i < cnt && pool.length > 0; i++) {
        const idx = Utils.rand(0, pool.length - 1);
        item.affixes.push({ n: pool[idx].n, e: pool[idx].e, q: pool[idx].q });
        used.add(pool[idx].n);
        pool.splice(idx, 1);
      }
    }

    item.enchant = null;
    item.desc = 'Lv.' + item.level + ' ' + Utils.getQualityName(nq) + GAME_DATA.slots[item.slot];

    return { ok: true, msg: item.name + ' 升级为' + Utils.getQualityName(nq) + '！词条已重随机。' };
  },

  countQualityInInventory: function(quality) {
    let count = 0;
    const items = GameState.data.inventory.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].quality === quality) count++;
    }
    // 检查已装备
    const eq = GameState.data.equipment;
    for (let slot in eq) {
      if (eq[slot] && eq[slot].quality === quality) count++;
    }
    return count;
  },

  // ---------- 附魔 ----------
  enchant: function(item) {
    if (item.enchant) {
      return { ok: false, msg: '已有附魔，需先清除' };
    }

    const types = ['物理', '魔法', '生命', '功能', '特殊'];
    const t = types[Utils.rand(0, types.length - 1)];
    const qnames = ['普通', '优秀', '稀有', '史诗', '传说'];
    const qw = [50, 30, 15, 4, 1];
    const qidx = Utils.weightedRandom([0, 1, 2, 3, 4], qw);
    const val = Math.floor(Utils.rand(5, 15) * [1.0, 1.3, 1.7, 2.2, 3.0][qidx]);

    item.enchant = {
      t: t,
      q: qnames[qidx],
      v: val,
      desc: t + '·' + qnames[qidx] + '：属性+' + val
    };

    return { ok: true, msg: '附魔成功！[' + item.enchant.desc + ']' };
  },

  clearEnchant: function(item) {
    item.enchant = null;
    return { ok: true, msg: '附魔已清除' };
  },

  // ---------- 镶嵌 ----------
  socket: function(item, idx, gem) {
    if (!item.sockets || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }

    const old = item.sockets[idx].gem;
    item.sockets[idx].gem = {
      name: gem.name,
      quality: gem.quality,
      gemType: gem.gemType || gem.runeType
    };

    return { ok: true, old: old, msg: gem.name + ' 已镶嵌' };
  },

  unsocket: function(item, idx) {
    if (!item.sockets || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }
    const g = item.sockets[idx].gem;
    if (!g) return { ok: false, msg: '空孔' };
    item.sockets[idx].gem = null;
    return { ok: true, gem: g, msg: '取出了 ' + g.name };
  },

  // ---------- 检查符文之语 ----------
  checkRuneword: function(item) {
    if (!item.sockets || item.sockets.length < 3) return null;
    const gems = item.sockets.map(function(s) { return s.gem; }).filter(function(g) { return g; });
    if (gems.length < 3) return null;

    const types = gems.map(function(g) { return g.gemType; });
    for (let k in GAME_DATA.runewords) {
      const rw = GAME_DATA.runewords[k];
      let match = true;
      for (let i = 0; i < rw.c.length; i++) {
        if (types[i] !== rw.c[i]) { match = false; break; }
      }
      if (match) return rw;
    }
    return null;
  },

  // ---------- 装备对比 ----------
  compare: function(equipped, candidate) {
    if (!equipped) return { isBetter: true, diffs: [] };
    if (!candidate) return { isBetter: false, diffs: [] };

    const diffs = [];
    let score = 0;
    const stats = [
      ['basePatk', '物理攻击'],
      ['baseMatk', '法术攻击'],
      ['basePdef', '物理护甲'],
      ['baseMdef', '法术护甲']
    ];

    stats.forEach(function(s) {
      const d = (candidate[s[0]] || 0) - (equipped[s[0]] || 0);
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
  getTotalStats: function() {
    const eq = GameState.data.equipment;
    const total = { patk: 0, matk: 0, pdef: 0, mdef: 0 };
    for (let slot in eq) {
      const item = eq[slot];
      if (!item) continue;
      total.patk += item.basePatk || 0;
      total.matk += item.baseMatk || 0;
      total.pdef += item.basePdef || 0;
      total.mdef += item.baseMdef || 0;
    }
    return total;
  }
};
