/**
 * 寻亲风云录 - 通用工具库
 */
const Utils = {
  // ========== 随机数 ==========
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /** 加权随机选择 */
  weightedRandom(values, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < values.length; i++) {
      r -= weights[i];
      if (r <= 0) return values[i];
    }
    return values[values.length - 1];
  },

  /** 从数组中无放回随机抽取 n 个 */
  sample(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = this.randInt(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  },

  /** 从数组中随机取一个 */
  pickOne(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[this.randInt(0, arr.length - 1)];
  },

  // ========== UUID ==========
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // ========== 数值格式化 ==========
  formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return String(Math.floor(n));
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // ========== 装备生成 ==========
  generateItem(baseType, level, rarityOverride) {
    const rarities = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    const rarity = rarityOverride || this.pickOne(rarities);
    const rarityInfo = DATA.rarity[rarity];
    const type = baseType || this.pickOne(Object.keys(DATA.equipTypeToSlot));
    const slot = DATA.equipTypeToSlot[type];

    const item = {
      id: this.uuid(),
      name: this.generateItemName(type, rarity),
      type,
      slot,
      rarity,
      level,
      baseStats: this.generateBaseStats(type, level),
      affixes: [],
      sockets: [],
      enchant: null,
    };

    // 生成词条
    if (rarityInfo && rarityInfo.maxAffixes > 0) {
      const count = this.randInt(rarityInfo.minAffixes, rarityInfo.maxAffixes);
      const available = Object.entries(DATA.affixPool)
        .filter(([_, a]) => DATA.rarity[a.minRarity].tier <= rarityInfo.tier);
      const selected = this.sample(available, Math.min(count, available.length));
      item.affixes = selected.map(([id, data]) => ({ id, name: data.name, effect: data.effect, value: data.value }));
    }

    // 孔数（高品质概率有孔）
    if (['blue', 'purple', 'orange', 'red'].includes(rarity)) {
      const maxSockets = { blue: 1, purple: 2, orange: 3, red: 4 }[rarity] || 0;
      if (maxSockets > 0 && Math.random() < 0.4) {
        const socketCount = this.randInt(1, maxSockets);
        item.sockets = Array.from({ length: socketCount }, () => ({ gem: null }));
      }
    }

    return item;
  },

  generateItemName(type, rarity) {
    const prefixes = { sword: '剑', axe: '斧', hammer: '锤', bow: '弓', staff: '法杖', dagger: '匕首', wand: '魔杖', crossbow: '弩' };
    const armorNames = { shield: '盾', armor: '甲', helmet: '盔', legs: '护腿', boots: '靴', gloves: '手套', necklace: '项链', ring: '戒指' };
    const name = prefixes[type] || armorNames[type] || '装备';
    const qualityPrefix = { white: '破旧的', green: '精致的', blue: '卓越的', purple: '史诗的', orange: '传说的', red: '神话的' }[rarity] || '';
    return qualityPrefix + name;
  },

  generateBaseStats(type, level) {
    const stats = {};
    const multiplier = 1 + (level - 1) * 0.05;
    if (['sword', 'axe', 'hammer', 'bow', 'staff', 'dagger', 'wand', 'crossbow'].includes(type)) {
      stats.physAtk = Math.floor((type === 'staff' || type === 'wand' ? 2 : 8) * multiplier);
      if (type === 'staff' || type === 'wand') stats.magAtk = Math.floor(10 * multiplier);
    } else if (type === 'shield') {
      stats.physDef = Math.floor(6 * multiplier);
      stats.magDef = Math.floor(3 * multiplier);
    } else if (['armor', 'helmet', 'legs', 'boots', 'gloves'].includes(type)) {
      stats.physDef = Math.floor((type === 'armor' ? 10 : 4) * multiplier);
      stats.magDef = Math.floor((type === 'armor' ? 5 : 2) * multiplier);
      if (type === 'armor') stats.hp = Math.floor(20 * multiplier);
    } else if (['necklace', 'ring'].includes(type)) {
      stats.physAtk = Math.floor(2 * multiplier);
      stats.magAtk = Math.floor(2 * multiplier);
    }
    return stats;
  },

  // ========== 文本工具 ==========
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

try { module.exports = Utils; } catch(e) {}
