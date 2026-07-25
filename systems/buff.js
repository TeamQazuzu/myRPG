// ============================================
// 《寻亲风云录》永久小Buff系统
// 每次加成极小，有软上限和硬上限
// 全收集验证：约等于多穿1-2件橙装
// ============================================

var BuffSystem = {

  // ========== Buff数据库 ==========
  // 每个buff有：id, name, desc, effect(属性名->值), softCap, hardCap, source
  // softCap: 收益递减的阈值（达到后每次加成减半）
  // hardCap: 绝对上限
  // currentLevel: 当前已获得次数
  buffs: {},

  // ========== Buff模板定义 ==========
  _templates: {
    // ---- 探索类 ----
    'herb_master': { name: '草药通识', desc: '从草药中获得更多经验', effect: { expBonus: 0.02 }, softCap: 10, hardCap: 20, source: '探索' },
    'miner_eye': { name: '矿工之眼', desc: '采集矿石时有概率获得额外产出', effect: { gatherBonus: 0.03 }, softCap: 8, hardCap: 15, source: '采集' },
    'pathfinder': { name: '探路者', desc: '移动中偶尔发现隐藏物品', effect: { findHidden: 0.02 }, softCap: 5, hardCap: 10, source: '探索' },
    // ---- 战斗类 ----
    'iron_skin': { name: '铁皮', desc: '物理防御略微提升', effect: { flatDefense: 2 }, softCap: 10, hardCap: 20, source: '战斗' },
    'quick_reflex': { name: '快反射', desc: '速度略微提升', effect: { flatSpeed: 1 }, softCap: 8, hardCap: 15, source: '战斗' },
    'battle_sense': { name: '战斗直觉', desc: '暴击率略微提升', effect: { critRate: 0.01 }, softCap: 5, hardCap: 10, source: '战斗' },
    'thick_blood': { name: '浓血', desc: '生命上限略微提升', effect: { flatMaxHp: 8 }, softCap: 10, hardCap: 20, source: '战斗' },
    // ---- 食物类 ----
    'bread_lover': { name: '面包爱好者', desc: '面包恢复效果+5%', effect: { breadHealBonus: 0.05 }, softCap: 10, hardCap: 20, source: '食物' },
    'potion_efficient': { name: '药水精通', desc: '药水恢复效果+3%', effect: { potionHealBonus: 0.03 }, softCap: 8, hardCap: 15, source: '使用药水' },
    'meat_power': { name: '食肉者之力', desc: '攻击力略微提升', effect: { flatAttack: 1 }, softCap: 8, hardCap: 15, source: '食物' },
    // ---- 社交类 ----
    'village_beloved': { name: '村民之宠', desc: '在灰烟村休息恢复更多', effect: { villageRestBonus: 0.05 }, softCap: 5, hardCap: 10, source: '社交' },
    'merchant_friend': { name: '商人之友', desc: '商店购买价格降低2%', effect: { shopDiscount: 0.02 }, softCap: 5, hardCap: 10, source: '社交' },
    // ---- 成就类 ----
    'first_blood': { name: '初战告捷', desc: '首次击败敌人，攻击+1', effect: { flatAttack: 1 }, softCap: 1, hardCap: 1, source: '成就', oneTime: true },
    'undying': { name: '不屈意志', desc: '首次从死亡中存活，防御+2', effect: { flatDefense: 2 }, softCap: 1, hardCap: 1, source: '成就', oneTime: true },
    'boss_slayer': { name: '守门人克星', desc: '首次击败守门人，全属性+3', effect: { flatAttack: 1, flatDefense: 1, flatSpeed: 1 }, softCap: 1, hardCap: 1, source: '成就', oneTime: true },
  },

  // ========== 从state初始化 ==========
  initFromState(state) {
    if (!state.world) state.world = {};
    if (!state.world.buffs) state.world.buffs = {};
    this.buffs = state.world.buffs;
  },

  // ========== 获得Buff层数 ==========
  addBuff(buffId, state, count) {
    this.initFromState(state);
    var tpl = this._templates[buffId];
    if (!tpl) return { ok: false, reason: 'Buff不存在' };
    if (tpl.oneTime && this.buffs[buffId] && this.buffs[buffId] >= 1) {
      return { ok: false, reason: '该Buff只能获得一次' };
    }
    var addCount = count || 1;
    var current = this.buffs[buffId] || 0;
    var newLevel = Math.min(current + addCount, tpl.hardCap);
    this.buffs[buffId] = newLevel;
    return { ok: true, oldLevel: current, newLevel: newLevel, name: tpl.name };
  },

  // ========== 获取Buff当前层数 ==========
  getBuffLevel(buffId, state) {
    this.initFromState(state);
    return this.buffs[buffId] || 0;
  },

  // ========== 计算所有Buff的总加成 ==========
  // 返回扁平对象 { flatAttack: X, critRate: Y, ... }
  getTotalBuffBonuses(state) {
    this.initFromState(state);
    var total = {};
    for (var buffId in this.buffs) {
      if (!this.buffs.hasOwnProperty(buffId)) continue;
      var level = this.buffs[buffId];
      if (level <= 0) continue;
      var tpl = this._templates[buffId];
      if (!tpl || !tpl.effect) continue;
      for (var key in tpl.effect) {
        if (!tpl.effect.hasOwnProperty(key)) continue;
        var baseValue = tpl.effect[key];
        // 软上限递减：超过softCap后，每层收益减半
        var effectiveLevel = level;
        if (level > tpl.softCap) {
          var over = level - tpl.softCap;
          effectiveLevel = tpl.softCap + over * 0.5;
        }
        var value = baseValue * effectiveLevel;
        total[key] = (total[key] || 0) + value;
      }
    }
    return total;
  },

  // ========== 获取所有Buff信息列表（用于UI）==========
  getAllBuffInfo(state) {
    this.initFromState(state);
    var list = [];
    for (var buffId in this.buffs) {
      if (!this.buffs.hasOwnProperty(buffId)) continue;
      var level = this.buffs[buffId];
      if (level <= 0) continue;
      var tpl = this._templates[buffId];
      if (!tpl) continue;
      var effectDesc = '';
      for (var key in tpl.effect) {
        if (!tpl.effect.hasOwnProperty(key)) continue;
        effectDesc += this._effectName(key) + '+' + (tpl.effect[key] * level).toFixed(2) + ' ';
      }
      list.push({
        id: buffId, name: tpl.name, desc: tpl.desc,
        level: level, maxLevel: tpl.hardCap, softCap: tpl.softCap,
        source: tpl.source, effectDesc: effectDesc.trim(),
      });
    }
    return list;
  },

  _effectName(key) {
    var names = {
      expBonus: '经验加成', gatherBonus: '采集加成', findHidden: '发现隐藏',
      flatDefense: '防御', flatSpeed: '速度', critRate: '暴击率',
      flatMaxHp: '生命上限', flatAttack: '攻击',
      breadHealBonus: '面包恢复', potionHealBonus: '药水恢复',
      shopDiscount: '商店折扣', villageRestBonus: '休息恢复',
    };
    return names[key] || key;
  },
};

try { module.exports = BuffSystem; } catch(e) {}
