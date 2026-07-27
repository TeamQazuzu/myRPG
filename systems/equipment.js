const EquipmentSystem = {
  typeToSlot: function(type) {
    return DATA.equipTypeToSlot[type] || null;
  },
  equip: function(state, item, slot) {
    return StateUtils.equipItem(state, item, slot);
  },
  unequip: function(state, slot) {
    return StateUtils.unequipItem(state, slot);
  },
  forge: function(state, item) {
    const qo = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    const ci = qo.indexOf(item.rarity || item.quality);
    if (ci < 0 || ci >= qo.length - 1) {
      return { ok: false, msg: '已达最高品质或品质无效' };
    }
    const nq = qo[ci + 1];
    const rarityInfo = DATA.rarity[nq];
    if (!rarityInfo) {
      return { ok: false, msg: '未知品质: ' + nq };
    }
    const limits = DATA.equipLimits.find(l => state.player.level >= l.levelRange[0] && state.player.level <= l.levelRange[1]);
    if (limits) {
      const maxTier = DATA.rarity[limits.maxRarity]?.tier ?? 99;
      if (rarityInfo.tier > maxTier) {
        return { ok: false, msg: '当前等级段最高' + DATA.rarity[limits.maxRarity].name };
      }
    }
    const count = this.countQualityInInventory(state, nq);
    if (limits && count >= limits.sameColorMax) {
      return { ok: false, msg: '已达到该品质持有上限（' + limits.sameColorMax + '件）' };
    }
    item.rarity = nq;
    if (item.baseStats) {
      for (const key of Object.keys(item.baseStats)) {
        item.baseStats[key] = Math.floor((item.baseStats[key] || 0) * 1.2);
      }
    }
    const affixCount = Utils.randInt(rarityInfo.minAffixes, rarityInfo.maxAffixes);
    item.affixes = [];
    if (affixCount > 0) {
      const available = Object.entries(DATA.affixPool)
        .filter(([_, a]) => DATA.rarity[a.minRarity].tier <= rarityInfo.tier);
      const selected = Utils.sample(available, Math.min(affixCount, available.length));
      item.affixes = selected.map(([id, data]) => ({ id, name: data.name, effect: data.effect, value: data.value }));
    }
    item.enchant = null;
    return { ok: true, msg: item.name + ' 升级为' + rarityInfo.name + '！词条已重随机。' };
  },
  countQualityInInventory: function(state, quality) {
    let count = 0;
    const items = state.inventory.items;
    for (let i = 0; i < items.length; i++) {
      if ((items[i].rarity || items[i].quality) === quality) count++;
    }
    const eq = state.equipment;
    for (let slot in eq) {
      if (eq[slot] && (eq[slot].rarity || eq[slot].quality) === quality) count++;
    }
    return count;
  },
  enchant: function(item) {
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
  clearEnchant: function(item) {
    item.enchant = null;
    return { ok: true, msg: '附魔已清除' };
  },
  socket: function(item, idx, gem) {
    if (!item.sockets || !Array.isArray(item.sockets) || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }
    const old = item.sockets[idx] ? item.sockets[idx].gem : null;
    item.sockets[idx] = { gem: { name: gem.name, quality: gem.quality, gemType: gem.gemType || gem.runeType } };
    return { ok: true, old: old, msg: gem.name + ' 已镶嵌' };
  },
  unsocket: function(item, idx) {
    if (!item.sockets || !Array.isArray(item.sockets) || idx >= item.sockets.length) {
      return { ok: false, msg: '无效的孔位' };
    }
    const g = item.sockets[idx] ? item.sockets[idx].gem : null;
    if (!g) return { ok: false, msg: '空孔' };
    item.sockets[idx] = { gem: null };
    return { ok: true, gem: g, msg: '取出了 ' + g.name };
  },
  checkRuneword: function(item) {
    if (!item.sockets || !Array.isArray(item.sockets) || item.sockets.length < 3) return null;
    const gems = item.sockets.map(function(s) { return s && s.gem; }).filter(function(g) { return g; });
    if (gems.length < 3) return null;
    const types = gems.map(function(g) { return g.gemType; });
    if (DATA.runewords) {
      for (let k in DATA.runewords) {
        const rw = DATA.runewords[k];
        let match = true;
        for (let i = 0; i < rw.c.length; i++) {
          if (types[i] !== rw.c[i]) { match = false; break; }
        }
        if (match) return rw;
      }
    }
    return null;
  },
  compare: function(equipped, candidate) {
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
    const _get = function(obj, path) {
      const parts = path.split('.');
      let val = obj;
      for (let i = 0; i < parts.length; i++) {
        if (val == null) return 0;
        val = val[parts[i]];
      }
      return val || 0;
    };
    stats.forEach(function(s) {
      const d = _get(candidate, s[0]) - _get(equipped, s[0]);
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
  getTotalStats: function(state) {
    const eq = state.equipment;
    const total = { patk: 0, matk: 0, pdef: 0, mdef: 0 };
    for (let slot in eq) {
      const item = eq[slot];
      if (!item) continue;
      total.patk += item.basePatk || item.baseStats?.physAtk || 0;
      total.matk += item.baseMatk || item.baseStats?.magAtk || 0;
      total.pdef += item.basePdef || item.baseStats?.physDef || 0;
      total.mdef += item.baseMdef || item.baseStats?.magDef || 0;
    }
    return total;
  }
};

try { module.exports = EquipmentSystem; } catch(e) {}
