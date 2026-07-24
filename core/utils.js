// ============================================
// 《寻亲风云录》通用工具函数
// ============================================
const Utils = {
  // ========== 随机数工具 ==========

  // [0, 1) 随机浮点数
  random() {
    return Math.random();
  },
  // [min, max] 随机整数
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  // [min, max) 随机浮点数
  randFloat(min, max) {
    return min + Math.random() * (max - min);
  },
  // 按权重随机选择
  weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  },
  // 从数组中随机抽取n个不重复元素
  sample(array, n) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  },
  // 概率判定
  chance(probability) {
    return Math.random() < probability;
  },
  // 旧版兼容别名（equipment.js 可能用到 rand）
  rand(min, max) {
    return this.randInt(min, max);
  },

  // ========== 数值计算 ==========
  // 伤害浮动（±10%）
  damageRoll(baseDamage) {
    const variance = 0.1;
    const roll = this.randFloat(1 - variance, 1 + variance);
    return Math.floor(baseDamage * roll);
  },
  // 暴击判定
  critRoll(critRate, critDmg) {
    if (this.chance(critRate)) {
      return { crit: true, multiplier: critDmg };
    }
    return { crit: false, multiplier: 1 };
  },
  // 闪避判定
  dodgeRoll(hit, dodge) {
    const baseHit = 0.9;
    const hitRate = baseHit + (hit - dodge) * 0.01;
    return this.chance(Math.max(0.05, Math.min(0.95, hitRate)));
  },
  // 等级缩放公式
  levelScale(baseValue, level, exponent = 1.1) {
    return Math.floor(baseValue * Math.pow(level, exponent) / Math.pow(10, exponent));
  },
  // 经验曲线
  expCurve(level) {
    return Math.floor(100 * Math.pow(1.15, level - 1));
  },

  // ========== 装备系统辅助函数（equipment.js 依赖）==========
  // 根据等级获取等级段
  getLevelBracket(level) {
    if (level <= 20) return "bracket1";
    if (level <= 40) return "bracket2";
    if (level <= 60) return "bracket3";
    if (level <= 80) return "bracket4";
    return "bracket5";
  },
  // 根据等级获取该等级段允许的最高品质
  getMaxQuality(level) {
    if (level <= 20) return "blue";
    if (level <= 40) return "purple";
    if (level <= 60) return "orange";
    return "red";
  },
  // 获取品质中文名
  getQualityName(quality) {
    const r = DATA.rarity[quality];
    return r ? r.name : quality;
  },

  // ========== 装备生成 ==========
  // 生成随机装备
  generateEquipment(level, rarityBias = null) {
    // 确定品质
    let rarity;
    if (rarityBias) {
      rarity = rarityBias;
    } else {
      const roll = this.random();
      if (roll < 0.40) rarity = "white";
      else if (roll < 0.65) rarity = "green";
      else if (roll < 0.82) rarity = "blue";
      else if (roll < 0.93) rarity = "purple";
      else if (roll < 0.98) rarity = "orange";
      else rarity = "red";
    }
    const rarityData = DATA.rarity[rarity];
    const affixCount = this.randInt(rarityData.minAffixes, rarityData.maxAffixes);
    // 选择词条
    const availableAffixes = Object.entries(DATA.affixPool)
      .filter(([_, a]) => DATA.rarity[a.minRarity].tier <= rarityData.tier);

    const selected = this.sample(availableAffixes, Math.min(affixCount, availableAffixes.length));
    const affixes = selected.map(([id, data]) => ({
      id,
      name: data.name,
      effect: data.effect,
      value: data.value,
    }));
    // 确定装备类型
    const types = ["sword", "axe", "hammer", "bow", "staff", "dagger", "shield", "armor", "helmet", "boots", "gloves", "necklace", "ring"];
    const type = types[this.randInt(0, types.length - 1)];
    // 基础属性
    const baseStats = this.calcBaseStats(type, level);
    return {
      id: this.uuid(),
      name: this.generateItemName(type, rarity),
      type,
      rarity,
      level,
      baseStats,
      affixes,
      sockets: this.randInt(0, 3), // 0-3孔
      enchant: null,
    };
  },
  // 计算装备基础属性
  calcBaseStats(type, level) {
    const multipliers = {
      sword: { physAtk: 1.0 },
      axe: { physAtk: 1.2, speed: -0.1 },
      hammer: { physAtk: 1.5, speed: -0.2 },
      bow: { physAtk: 0.9, speed: 0.1 },
      staff: { magAtk: 1.0 },
      dagger: { physAtk: 0.6, speed: 0.2, critRate: 0.05 },
      shield: { physDef: 1.0, block: 0.1 },
      armor: { physDef: 0.8, magDef: 0.4, maxHp: 0.5 },
      helmet: { physDef: 0.4, magDef: 0.3, maxHp: 0.2 },
      boots: { speed: 0.1, dodge: 0.05 },
      gloves: { physAtk: 0.2, hit: 0.05 },
      necklace: { magDef: 0.3, maxHp: 0.1 },
      ring: { critRate: 0.02, speed: 0.05 },
    };
    const mult = multipliers[type] || {};
    const base = level * 5;
    const stats = {};
    for (const [stat, m] of Object.entries(mult)) {
      stats[stat] = Math.floor(base * m);
    }
    return stats;
  },
  // 生成装备名称
  generateItemName(type, rarity) {
    const prefixes = {
      sword: ["短剑", "长剑", "阔剑", "细剑"],
      axe: ["手斧", "战斧", "巨斧"],
      hammer: ["钉锤", "战锤", "巨锤"],
      bow: ["短弓", "长弓", "复合弓"],
      staff: ["法杖", "魔杖", "权杖"],
      dagger: ["匕首", "短刀", "刺刀"],
      shield: ["圆盾", "塔盾", "鸢盾"],
      armor: ["皮甲", "链甲", "板甲"],
      helmet: ["皮帽", "铁盔", "战盔"],
      boots: ["皮靴", "战靴", "铁靴"],
      gloves: ["手套", "护手", "铁手套"],
      necklace: ["项链", "护符", "吊坠"],
      ring: ["铜戒", "银戒", "金戒"],
    };
    const suffixes = {
      white: ["", "", ""],
      green: ["学徒的", "粗糙的", "破旧的"],
      blue: ["精制的", "坚固的", "锐利的"],
      purple: ["稀有的", "卓越的", "闪耀的"],
      orange: ["传说的", "史诗的", "神圣的"],
      red: ["神话的", "至尊的", "毁灭的"],
      gold: ["传家宝", "先祖的", "永恒的"],
    };
    const typeNames = prefixes[type] || ["物品"];
    const suffixList = suffixes[rarity] || [""];
    const suffix = suffixList[this.randInt(0, suffixList.length - 1)];
    const baseName = typeNames[this.randInt(0, typeNames.length - 1)];
    return (suffix ? suffix + baseName : baseName);
  },

  // ========== 怪物生成 ==========
  generateMonster(level, type = "normal") {
    const multipliers = {
      normal: { hp: 1.0, atk: 1.0, exp: 1.0, gold: 1.0 },
      elite: { hp: 2.5, atk: 1.5, exp: 3.0, gold: 2.0 },
      boss: { hp: 5.0, atk: 2.0, exp: 10.0, gold: 5.0 },
    };
    const mult = multipliers[type] || multipliers.normal;
    const names = {
      normal: ["野狼", "山贼", "蝙蝠", "蜘蛛", "史莱姆", "骷髅兵"],
      elite: ["精英守卫", "强化兽", "暗影刺客", "火焰元素"],
      boss: ["区域首领", "守门员", "机械守卫"],
    };
    const nameList = names[type] || names.normal;
    return {
      id: this.uuid(),
      name: nameList[this.randInt(0, nameList.length - 1)],
      level,
      type,
      hp: Math.floor(level * 50 * mult.hp),
      maxHp: Math.floor(level * 50 * mult.hp),
      atk: Math.floor(level * 8 * mult.atk),
      def: Math.floor(level * 4),
      speed: Math.floor(level * 2 + this.randInt(-5, 5)),
      critRate: 0.05,
      critDmg: 1.5,
      exp: Math.floor(level * 20 * mult.exp),
      gold: Math.floor(level * 5 * mult.gold),
      drops: [],
      statusEffects: [],
    };
  },

  // ========== 字符串工具 ==========
  // 格式化数字（千分位）
  formatNumber(num) {
    return num.toLocaleString("zh-CN");
  },
  // 格式化金币显示
  formatGold(gold, silver, copper) {
    const parts = [];
    if (gold > 0) parts.push(`${gold}金`);
    if (silver > 0) parts.push(`${silver}银`);
    if (copper > 0) parts.push(`${copper}铜`);
    return parts.join(" ") || "0铜";
  },
  // 生成UUID
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  // 深拷贝
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  // 节流函数
  throttle(fn, delay) {
    let last = 0;
    return function(...args) {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, args);
      }
    };
  },
  // 防抖函数
  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // ========== 时间工具 ==========
  // 格式化时长
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  },
  // 格式化日期
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  },

  // ========== 战斗日志格式化 ==========
  formatCombatLog(entry) {
    const { actor, target, action, damage, crit, status, healed } = entry;
    let text = "";
    if (healed) {
      text = `${actor} → ${target} ${action} 恢复${healed}生命`;
    } else if (damage !== undefined) {
      const critText = crit ? " 暴击！" : "";
      const statusText = status ? ` [${status}]` : "";
      text = `${actor} → ${target} ${action} ${damage}伤害${critText}${statusText}`;
    } else {
      text = `${actor} ${action}`;
    }
    return text;
  },

  // ========== 存档大小估算 ==========
  estimateSaveSize(state) {
    const json = JSON.stringify(state);
    return json.length;
  },
};

// 导出
try { module.exports = Utils; } catch(e) {}
