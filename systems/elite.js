// ============================================
// 《寻亲风云录》随机精英怪遭遇系统
// 银龙/金龙每日刷新，龙类特种材料掉落
// ============================================

var EliteSystem = {

  // ========== 精英怪模板 ==========
  elites: {
    silver_dragon: {
      id: 'silver_dragon', name: '银龙', eliteType: 'silver_dragon',
      level: 0, // 动态= 区域最高等级+5
      hp: 0, maxHp: 0, attack: 0, defense: 0, speed: 0,
      type: 'elite',
      desc: '一条银色的龙形生物盘踞在此。它不是真正的龙，但比任何野兽都危险。',
      // 龙类特种材料掉落（不掉装备/金币）
      drops: [
        { name: '银龙鳞', rarity: 'purple', chance: 0.40 },
        { name: '龙牙', rarity: 'purple', chance: 0.30 },
        { name: '龙血结晶', rarity: 'orange', chance: 0.15 },
        { name: '龙筋', rarity: 'orange', chance: 0.10 },
        { name: '龙息精华', rarity: 'orange', chance: 0.05 },
      ],
    },
    golden_dragon: {
      id: 'golden_dragon', name: '金龙', eliteType: 'golden_dragon',
      level: 0, hp: 0, maxHp: 0, attack: 0, defense: 0, speed: 0,
      type: 'elite',
      desc: '金龙......传说中的生物。它的出现意味着某种机缘。',
      drops: [
        { name: '金龙鳞', rarity: 'orange', chance: 0.35 },
        { name: '龙牙', rarity: 'orange', chance: 0.30 },
        { name: '龙血结晶', rarity: 'orange', chance: 0.25 },
        { name: '龙筋', rarity: 'red', chance: 0.10 },
      ],
    },
  },

  // ========== 区域等级对应表 ==========
  zoneLevelRanges: {
    greyVillage: { min: 1, max: 20 },
    ashMountains: { min: 21, max: 40 },
    duskForest: { min: 41, max: 60 },
    ashTown: { min: 25, max: 45 },
    ashMine: { min: 41, max: 60 },
  },

  // ========== 检查是否应该生成精英怪 ==========
  // 返回 { spawn: bool, type: 'silver_dragon'|'golden_dragon', zone: string }
  checkEliteSpawn(state, zone) {
    if (!state.world) state.world = {};
    if (!state.world.eliteSpawns) state.world.eliteSpawns = {};
    var today = new Date().toDateString();
    var spawnInfo = state.world.eliteSpawns[zone];

    // 今日已生成
    if (spawnInfo && spawnInfo.date === today && !spawnInfo.defeated) {
      return { spawn: true, type: spawnInfo.type, zone: zone, scene: spawnInfo.scene };
    }
    if (spawnInfo && spawnInfo.date === today && spawnInfo.defeated) {
      return { spawn: false, reason: '今日精英已被击败' };
    }

    // 5%概率刷银龙，1%概率刷金龙（每次进入野外场景时判定）
    var roll = Math.random();
    var type = null;
    if (roll < 0.01) type = 'golden_dragon';
    else if (roll < 0.06) type = 'silver_dragon';

    if (!type) return { spawn: false };

    // 记录生成
    var zoneRange = this.zoneLevelRanges[zone] || { min: 1, max: 20 };
    state.world.eliteSpawns[zone] = {
      date: today,
      type: type,
      defeated: false,
      scene: null, // 由场景管理器设置
    };

    return { spawn: true, type: type, zone: zone, scene: null };
  },

  // ========== 生成精英怪战斗数据 ==========
  createEliteUnit(type, zone) {
    var template = this.elites[type];
    if (!template) return null;
    var zoneRange = this.zoneLevelRanges[zone] || { min: 1, max: 20 };
    var eliteLevel = zoneRange.max + 5;
    var isGolden = type === 'golden_dragon';
    // 精英属性 = 区域Boss级别
    var baseMulti = isGolden ? 3.0 : 2.0;
    var unit = {
      id: 'elite_' + type + '_' + Date.now(),
      name: template.name,
      level: eliteLevel,
      hp: Math.floor((200 + eliteLevel * 30) * baseMulti),
      maxHp: Math.floor((200 + eliteLevel * 30) * baseMulti),
      attack: Math.floor((30 + eliteLevel * 5) * baseMulti),
      defense: Math.floor((15 + eliteLevel * 3) * baseMulti),
      speed: Math.floor(10 + eliteLevel * 0.5),
      exp: Math.floor(eliteLevel * 80 * (isGolden ? 3 : 1.5)),
      gold: 0, // 精英怪不掉金币
      drop: null, // 精英怪不掉普通掉落
      type: 'elite',
      eliteType: type,
      isBoss: isGolden,
    };
    return unit;
  },

  // ========== 精英怪击败处理（发龙类材料）==========
  processEliteDefeat(eliteUnit, state) {
    if (!eliteUnit || !eliteUnit.eliteType) return { drops: [] };
    var template = this.elites[eliteUnit.eliteType];
    if (!template) return { drops: [] };

    var drops = [];
    for (var i = 0; i < template.drops.length; i++) {
      var d = template.drops[i];
      if (Math.random() < d.chance) {
        var item = {
          id: Utils.uuid(),
          name: d.name,
          type: 'material',
          rarity: d.rarity,
          level: eliteUnit.level,
          stack: 1,
          desc: '精英龙的珍贵材料',
        };
        StateUtils.addToInventory(state, item);
        drops.push(item);
      }
    }

    // 标记为已击败
    if (state.world && state.world.eliteSpawns) {
      for (var zone in state.world.eliteSpawns) {
        var info = state.world.eliteSpawns[zone];
        if (info.type === eliteUnit.eliteType && !info.defeated) {
          info.defeated = true;
        }
      }
    }

    // 精英经验（不带金币）
    if (eliteUnit.exp > 0) {
      StateUtils.addExp(state, eliteUnit.exp);
      // 队友共享精英经验
      if (state.companions && state.companions.length > 0 && typeof CompanionSystem !== 'undefined' && CompanionSystem) {
        state.companions.forEach(function(c) {
          if (!c) return;
          CompanionSystem.addExp(c, eliteUnit.exp, state);
        });
      }
    }

    return { drops: drops, exp: eliteUnit.exp };
  },
};

try { module.exports = EliteSystem; } catch(e) {}
