// ============================================
// 《寻亲风云录》宝石镶嵌系统
// ============================================

var GemSystem = {

  // ========== 宝石数据库 ==========
  gems: {
    // ----- 基础宝石（白/绿）-----
    'ruby_s': {
      id: 'ruby_s', name: '小型红宝石', desc: '蕴含微弱火焰之力的红色宝石',
      rarity: 'white', icon: '🔴',
      type: 'fire', quality: 1,
      effect: { fireDmg: 0.05, attack: 2 },
    },
    'sapphire_s': {
      id: 'sapphire_s', name: '小型蓝宝石', desc: '散发淡蓝色光芒的宝石',
      rarity: 'white', icon: '🔵',
      type: 'frost', quality: 1,
      effect: { frostDmg: 0.05, defense: 2 },
    },
    'topaz_s': {
      id: 'topaz_s', name: '小型黄宝石', desc: '闪烁着电弧的小型宝石',
      rarity: 'white', icon: '🟡',
      type: 'lightning', quality: 1,
      effect: { lightDmg: 0.05, speed: 1 },
    },
    'emerald_s': {
      id: 'emerald_s', name: '小型翡翠', desc: '翠绿的宝石，生命力涌动其中',
      rarity: 'white', icon: '🟢',
      type: 'life', quality: 1,
      effect: { maxHp: 15, lifeSteal: 0.02 },
    },

    // ----- 中级宝石（蓝）-----
    'ruby_m': {
      id: 'ruby_m', name: '红宝石', desc: '蕴含强大火焰之力的红色宝石',
      rarity: 'blue', icon: '🔴',
      type: 'fire', quality: 2,
      effect: { fireDmg: 0.12, attack: 5 },
    },
    'sapphire_m': {
      id: 'sapphire_m', name: '蓝宝石', desc: '散发冰蓝色寒芒的宝石',
      rarity: 'blue', icon: '🔵',
      type: 'frost', quality: 2,
      effect: { frostDmg: 0.12, defense: 5, frostRes: 0.08 },
    },
    'topaz_m': {
      id: 'topaz_m', name: '黄宝石', desc: '电弧缠绕的中型宝石',
      rarity: 'blue', icon: '🟡',
      type: 'lightning', quality: 2,
      effect: { lightDmg: 0.12, speed: 2, critRate: 0.03 },
    },
    'emerald_m': {
      id: 'emerald_m', name: '翡翠', desc: '翠绿的生命之石',
      rarity: 'blue', icon: '🟢',
      type: 'life', quality: 2,
      effect: { maxHp: 40, lifeSteal: 0.04 },
    },
    'diamond_m': {
      id: 'diamond_m', name: '钻石', desc: '纯净无瑕的中型钻石',
      rarity: 'blue', icon: '💎',
      type: 'prismatic', quality: 2,
      effect: { allElemRes: 0.06, pierce: 0.05 },
    },

    // ----- 高级宝石（紫）-----
    'ruby_l': {
      id: 'ruby_l', name: '大型红宝石', desc: '灼热的火焰在宝石中永不熄灭',
      rarity: 'purple', icon: '🔴',
      type: 'fire', quality: 3,
      effect: { fireDmg: 0.20, attack: 10, burnOnHit: 0.15 },
    },
    'sapphire_l': {
      id: 'sapphire_l', name: '大型蓝宝石', desc: '寒气逼人的大型蓝宝石',
      rarity: 'purple', icon: '🔵',
      type: 'frost', quality: 3,
      effect: { frostDmg: 0.20, defense: 10, frostRes: 0.12, slowOnHit: 0.15 },
    },
    'topaz_l': {
      id: 'topaz_l', name: '大型黄宝石', desc: '雷电在宝石中奔涌',
      rarity: 'purple', icon: '🟡',
      type: 'lightning', quality: 3,
      effect: { lightDmg: 0.20, speed: 4, critRate: 0.06, stunOnHit: 0.10 },
    },
    'diamond_l': {
      id: 'diamond_l', name: '大型钻石', desc: '璀璨夺目的传奇钻石',
      rarity: 'purple', icon: '💎',
      type: 'prismatic', quality: 3,
      effect: { allElemRes: 0.12, pierce: 0.10, critDmg: 0.15 },
    },
  },

  // ========== 装备镶嵌槽规则 ==========
  // 品质对应的镶嵌槽数量
  socketSlots: {
    white: 0,
    green: 1,
    blue: 1,
    purple: 2,
    orange: 2,
    red: 3,
    gold: 2,
  },

  // 获取装备的镶嵌槽数
  getSocketCount(equipment) {
    if (!equipment) return 0;
    var base = this.socketSlots[equipment.rarity] || 0;
    // 强化等级每+3额外增加一个槽
    var enhanceBonus = Math.floor((equipment.enhanceLevel || 0) / 3);
    return base + enhanceBonus;
  },

  // ========== 镶嵌宝石 ==========
  // equipment: 装备对象（state.equipment 中的某个槽位装备）
  // gemId: 宝石ID
  // slotIndex: 镶嵌槽索引（从0开始）
  // 返回 { ok, message }
  socketGem(equipment, gemId, slotIndex) {
    if (!equipment) return { ok: false, message: '装备不存在' };
    var gemData = this.gems[gemId];
    if (!gemData) return { ok: false, message: '宝石不存在' };

    var maxSlots = this.getSocketCount(equipment);
    if (slotIndex < 0 || slotIndex >= maxSlots) {
      return { ok: false, message: '无效的镶嵌槽（最多 ' + maxSlots + ' 个）' };
    }

    // 初始化镶嵌槽数组
    if (!equipment.sockets) equipment.sockets = [];

    // 检查槽位是否已有宝石
    if (equipment.sockets[slotIndex]) {
      // 替换：先取出旧宝石
      var oldGem = equipment.sockets[slotIndex];
      equipment.sockets[slotIndex] = gemId;
      return {
        ok: true,
        message: '替换了 ' + (this.gems[oldGem] ? this.gems[oldGem].name : '未知宝石') + '，镶嵌了 ' + gemData.name,
        oldGem: oldGem,
      };
    }

    equipment.sockets[slotIndex] = gemId;
    return { ok: true, message: '成功镶嵌 ' + gemData.name, oldGem: null };
  },

  // ========== 取出宝石 ==========
  unsocketGem(equipment, slotIndex) {
    if (!equipment || !equipment.sockets) return { ok: false, message: '装备没有镶嵌槽' };
    if (slotIndex < 0 || slotIndex >= equipment.sockets.length) return { ok: false, message: '无效的槽位' };
    var gemId = equipment.sockets[slotIndex];
    if (!gemId) return { ok: false, message: '该槽位没有宝石' };
    var gemData = this.gems[gemId];
    equipment.sockets.splice(slotIndex, 1);
    return { ok: true, message: '取出了 ' + (gemData ? gemData.name : '未知宝石'), gemId: gemId };
  },

  // ========== 获取装备所有宝石的加成汇总 ==========
  getGemBonuses(equipment) {
    if (!equipment || !equipment.sockets) return {};
    var total = {};
    for (var i = 0; i < equipment.sockets.length; i++) {
      var gemId = equipment.sockets[i];
      if (!gemId) continue;
      var gemData = this.gems[gemId];
      if (!gemData || !gemData.effect) continue;
      for (var key in gemData.effect) {
        if (!gemData.effect.hasOwnProperty(key)) continue;
        if (typeof gemData.effect[key] === 'number') {
          total[key] = (total[key] || 0) + gemData.effect[key];
        }
      }
    }
    return total;
  },

  // ========== 生成随机宝石掉落 ==========
  // 根据敌人等级生成宝石
  generateGemDrop(enemyLevel, enemyType) {
    // 掉落概率按敌人类型分档：普通 8%，精英 25%，Boss 50%
    var dropChance = 0.08;
    if (enemyType === 'elite') dropChance = 0.25;
    else if (enemyType === 'boss') dropChance = 0.50;
    if (Math.random() >= dropChance) return null;

    // 品质根据敌人等级决定
    var roll = Math.random();
    var quality;
    if (enemyLevel >= 45 && roll < 0.20) {
      quality = 3; // 紫
    } else if (enemyLevel >= 25 && roll < 0.45) {
      quality = 2; // 蓝
    } else {
      quality = 1; // 白/绿
    }

    // 根据quality筛选可用宝石
    var candidates = [];
    for (var key in this.gems) {
      if (!this.gems.hasOwnProperty(key)) continue;
      if (this.gems[key].quality === quality) {
        candidates.push(key);
      }
    }
    if (candidates.length === 0) return null;

    var gemId = candidates[Math.floor(Math.random() * candidates.length)];
    var gemData = this.gems[gemId];
    return {
      id: Utils.uuid(),
      name: gemData.name,
      type: 'gem',
      rarity: gemData.rarity,
      level: 1,
      gemId: gemId, // 保留宝石模板ID引用
      stack: 1,
      desc: gemData.desc,
    };
  },

  // ========== 获取宝石模板数据 ==========
  getGemData(gemId) {
    return this.gems[gemId] || null;
  },

  // ========== 获取所有宝石列表（用于UI显示）==========
  getAllGems() {
    var list = [];
    for (var key in this.gems) {
      if (this.gems.hasOwnProperty(key)) {
        list.push(this.gems[key]);
      }
    }
    return list;
  },
};

// 导出
try { module.exports = GemSystem; } catch(e) {}
