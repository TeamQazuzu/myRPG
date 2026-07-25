// systems/combat.js - 战斗引擎（重写版）
// 支持：主角+随从 vs 多敌人、撤退、HP正确显示
class CombatEngine {
  constructor() {
    this.turnOrder = [];      // 行动顺序队列
    this.currentTurnIndex = 0; // 当前行动者索引
    this.round = 1;           // 当前回合数
    this.maxRounds = 30;      // 最大回合数
    this.combatLog = [];      // 战斗日志
    this.isPlayerTurn = false;
    this.battleActive = false;
    this.actionTimeout = null;

    this.playerUnit = null;   // 主角
    this.allyUnits = [];      // 随从
    this.enemyUnits = [];     // 敌人

    this.allUnits = [];       // 所有单位（用于排序）
    this.defenseBoosts = {};  // 本回合防御加成 { unitId: boost }
    this.selectedTarget = null; // 玩家选中的目标
    this.cooldowns = {};      // 技能冷却 { skillId: remainingTurns }
    this.selectedSkill = null; // 当前选中的技能ID
  }

  // ========== 启动战斗 ==========
  startCombat(player, allies, enemies) {
    console.log('[战斗] 启动战斗');
    console.log('  主角:', player.name, 'HP:', player.maxHp);
    console.log('  随从:', allies.map(a => a.name).join(', ') || '无');
    console.log('  敌人:', enemies.map(e => e.name).join(', '));

    this.playerUnit = this.normalizeUnit(player, 'player');
    this.allyUnits = allies.map(a => this.normalizeUnit(a, 'ally'));
    this.enemyUnits = enemies.map(e => this.normalizeUnit(e, 'enemy'));

    this.allUnits = [this.playerUnit, ...this.allyUnits, ...this.enemyUnits];
    this.battleActive = true;
    this.combatLog = [];
    this.round = 1;
    this.currentTurnIndex = 0;
    this.defenseBoosts = {};
    this.selectedTarget = null;
    this.cooldowns = {};
    this.selectedSkill = null;

    this.calculateTurnOrder();

    const event = new CustomEvent('combat-start', { detail: { combat: this } });
    document.dispatchEvent(event);

    this.processTurn();
  }

  // ========== 标准化单位数据（修复HP undefined）==========
  normalizeUnit(unit, side) {
    const maxHp = unit.maxHp || unit.hp || 100;
    return {
      id: unit.id || ('unit_' + Math.random().toString(36).substr(2, 6)),
      name: unit.name || '未知',
      side: side,
      level: unit.level || 1,
      maxHp: maxHp,
      hp: unit.hp || maxHp,
      maxMp: unit.maxMp || unit.mp || 30,
      mp: unit.mp || unit.maxMp || 30,
      attack: unit.attack || 10,
      defense: unit.defense || 5,
      speed: unit.speed || 10,
      status: 'normal',
      isCompanion: unit.isCompanion || false,
      isPlayer: side === 'player',
      exp: unit.exp || 0,
      gold: unit.gold || 0,
      drop: unit.drop || null,
      alive: true,
      aiStrategy: unit.aiStrategy || 'balanced',
      // 异常状态系统：{ bleed: {duration, value}, burn: {duration, stacks, value}, slow: {duration}, stun: {duration} }
      statusEffects: {},
    };
  }

  // ========== 计算行动顺序（按有效速度排序，考虑减速/僵直）==========
  calculateTurnOrder() {
    const aliveUnits = this.allUnits.filter(u => u.alive && u.hp > 0);
    this.turnOrder = aliveUnits.sort((a, b) => this.getEffectiveSpeed(b) - this.getEffectiveSpeed(a));
    console.log('[战斗] 行动顺序:', this.turnOrder.map(u => `${u.name}(${this.getEffectiveSpeed(u).toFixed(1)})`).join(' -> '));
  }

  // ========== 处理当前回合 ==========
  processTurn() {
    if (!this.battleActive) return;
    if (this.checkBattleEnd()) return;

    // 获取当前行动者
    let currentUnit = this.turnOrder[this.currentTurnIndex];
    if (!currentUnit || !currentUnit.alive || currentUnit.hp <= 0) {
      this.nextTurn();
      return;
    }

    // 处理异常状态（DOT伤害、效果结算）
    var statusResult = this.processStatusEffects(currentUnit);
    if (statusResult) {
      // 状态效果导致单位死亡
      if (currentUnit.hp <= 0) {
        currentUnit.alive = false;
        if (this.checkBattleEnd()) return;
        this.nextTurn();
        return;
      }
    }

    // 检查僵直状态（跳过本回合行动）
    if (this.isStunned(currentUnit)) {
      var stunMsg = currentUnit.name + ' 处于僵直状态，无法行动';
      this.combatLog.push(stunMsg);
      this.dispatchUpdate(stunMsg);
      this.nextTurn();
      return;
    }

    console.log('[战斗] 当前行动:', currentUnit.name, '阵营:', currentUnit.side);

    if (currentUnit.side === 'player') {
      this.isPlayerTurn = true;
      this.waitForPlayerAction(currentUnit);
    } else if (currentUnit.side === 'ally') {
      this.isPlayerTurn = false;
      // 随从自动行动
      setTimeout(() => { this.allyTurn(currentUnit); }, 500);
    } else {
      this.isPlayerTurn = false;
      // 敌人自动行动
      setTimeout(() => { this.enemyTurn(currentUnit); }, 500);
    }
  }

  // ========== 等待玩家操作 ==========
  waitForPlayerAction(unit) {
    console.log('[战斗] 等待玩家操作...');
    const event = new CustomEvent('combat-player-turn', { detail: { combat: this, unit: unit } });
    document.dispatchEvent(event);

    if (this.actionTimeout) clearTimeout(this.actionTimeout);
    this.actionTimeout = setTimeout(() => {
      console.warn('[战斗] 玩家操作超时，自动攻击');
      if (this.isPlayerTurn && this.battleActive) {
        const target = this.enemyUnits.find(e => e.alive && e.hp > 0);
        if (target) this.playerAction('attack', target);
      }
    }, 15000);
  }

  // ========== 玩家行动 ==========
  playerAction(action, target) {
    if (!this.isPlayerTurn || !this.battleActive) return;

    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }

    const unit = this.playerUnit;
    console.log('[战斗] 玩家行动:', action, '目标:', target ? target.name : '无');

    switch (action) {
      case 'attack':
        if (!target || !target.alive) {
          target = this.enemyUnits.find(e => e.alive && e.hp > 0);
        }
        if (target) this.executeAction(unit, 'attack', target);
        else this.nextTurn();
        break;

      case 'skill':
        // 如果还没有选择技能，不直接执行，由UI面板处理技能选择
        // 如果已选择技能，则执行技能
        if (this.selectedSkill) {
          // 获取state引用
          var state = window.gameApp && window.gameApp.state ? window.gameApp.state : null;
          if (!target || !target.alive) {
            target = this.enemyUnits.find(function(e) { return e.alive && e.hp > 0; });
          }
          if (!target) {
            // 没有可用目标，取消技能选择
            this.selectedSkill = null;
            this.nextTurn();
            break;
          }
          // 检查技能是否可用
          var checkResult = SkillSystem && SkillSystem.canUseSkill ? SkillSystem.canUseSkill(state, this.selectedSkill, this) : { ok: false, reason: "技能系统未加载" };
          if (!checkResult.ok) {
            this.combatLog.push(checkResult.reason);
            this.dispatchUpdate(checkResult.reason);
            this.selectedSkill = null;
            this.nextTurn();
            break;
          }
          // 调用 SkillSystem.useSkill 执行技能
          var skillResult = SkillSystem.useSkill(this.selectedSkill, unit, target, this.allUnits, this);
          if (skillResult.log) {
            this.combatLog.push(skillResult.log);
            console.log('[战斗]', skillResult.log);
            this.dispatchUpdate(skillResult.log);
          }
          // 处理AOE追加目标的日志
          if (skillResult.aoeTargets && skillResult.aoeTargets.length > 0) {
            for (var si = 0; si < skillResult.aoeTargets.length; si++) {
              var aoeHit = skillResult.aoeTargets[si];
              if (aoeHit.target && !aoeHit.target.alive && aoeHit.target.hp <= 0) {
                var aoeKillMsg = "（" + aoeHit.target.name + " 倒下了）";
                this.combatLog.push(aoeKillMsg);
                this.dispatchUpdate(aoeKillMsg);
              }
            }
          }
          // 清除已选择的技能
          this.selectedSkill = null;
          if (this.checkBattleEnd()) return;
          this.nextTurn();
        } else {
          // 未选择技能，通过事件通知UI显示技能选择面板
          var evt = new CustomEvent('combat-select-skill', { detail: { combat: this } });
          document.dispatchEvent(evt);
        }
        break;

      case 'defend':
        this.defenseBoosts[unit.id] = 5;
        const defendMsg = `${unit.name} 进入防御姿态，防御力+5`;
        this.combatLog.push(defendMsg);
        this.dispatchUpdate(defendMsg);
        this.nextTurn();
        break;

      case 'item':
        // 从背包中查找消耗品（type为consumable或名称包含'药水'）
        var potion = null;
        if (window.gameApp && window.gameApp.state && window.gameApp.state.inventory) {
          var items = window.gameApp.state.inventory.items || [];
          // 优先使用HP药水（type为consumable且含有healHp属性，或名称包含'药水'）
          potion = items.find(function(it) {
            return it.type === 'consumable' && it.healHp && it.healHp > 0;
          });
          // 如果没有找到HP药水，尝试找任何名称包含'药水'的消耗品
          if (!potion) {
            potion = items.find(function(it) {
              return it.type === 'consumable' && it.name && it.name.indexOf('药水') !== -1;
            });
          }
          // 最后尝试任何consumable类型的物品
          if (!potion) {
            potion = items.find(function(it) {
              return it.type === 'consumable';
            });
          }
        }
        if (!potion) {
          var noItemMsg = '没有可用的药水';
          this.combatLog.push(noItemMsg);
          this.dispatchUpdate(noItemMsg);
          this.nextTurn();
          break;
        }
        // 使用药水效果
        var healHp = potion.healHp || 0;
        var healMp = potion.healMp || 0;
        var beforeHp2 = unit.hp;
        var beforeMp = unit.mp;
        if (healHp > 0) {
          unit.hp = Math.min(unit.maxHp, unit.hp + healHp);
        }
        if (healMp > 0) {
          unit.mp = Math.min(unit.maxMp, unit.mp + healMp);
        }
        var actualHealHp = unit.hp - beforeHp2;
        var actualHealMp = unit.mp - beforeMp2;
        var healMsg = unit.name + ' 使用了' + potion.name;
        if (actualHealHp > 0) healMsg += '，回复 ' + actualHealHp + ' HP';
        if (actualHealMp > 0) healMsg += '，回复 ' + actualHealMp + ' MP';
        if (actualHealHp === 0 && actualHealMp === 0) healMsg += '，但没有效果';
        // 从背包中移除使用的物品
        var potionIdx = window.gameApp.state.inventory.items.indexOf(potion);
        if (potionIdx !== -1) {
          window.gameApp.state.inventory.items.splice(potionIdx, 1);
        }
        this.combatLog.push(healMsg);
        this.dispatchUpdate(healMsg);
        this.nextTurn();
        break;

      case 'retreat':
        this.endCombat('retreat');
        break;

      default:
        this.nextTurn();
    }
  }

  // ========== 随从回合（支持AI策略）==========
  allyTurn(unit) {
    if (!this.battleActive || !unit.alive) {
      this.nextTurn();
      return;
    }

    var strategy = unit.aiStrategy || 'balanced';

    switch (strategy) {
      case 'aggressive':
        this.allyAggressiveTurn(unit);
        break;
      case 'healer':
        this.allyHealerTurn(unit);
        break;
      case 'defensive':
        this.allyDefensiveTurn(unit);
        break;
      default:
        this.allyBalancedTurn(unit);
    }
  }

  // 攻击型AI：优先攻击血量最低的敌人
  allyAggressiveTurn(unit) {
    var enemies = this.enemyUnits.filter(function(e) { return e.alive && e.hp > 0; });
    if (enemies.length === 0) {
      this.nextTurn();
      return;
    }
    // 选择HP最低的敌人
    var target = enemies.reduce(function(min, e) {
      return e.hp < min.hp ? e : min;
    }, enemies[0]);
    this.executeAction(unit, 'attack', target);
  }

  // 治疗型AI：有队友血量低于50%时使用药水治疗，否则攻击
  allyHealerTurn(unit) {
    // 检查是否有队友（包括主角）血量低于50%
    var allAllies = [this.playerUnit].concat(this.allyUnits).filter(function(u) {
      return u.alive && u.hp > 0;
    });

    var wounded = allAllies.filter(function(u) {
      var pct = u.maxHp > 0 ? u.hp / u.maxHp : 1;
      return pct < 0.5;
    });

    if (wounded.length > 0 && unit.mp >= 5) {
      // 治疗血量最低的队友
      var healTarget = wounded.reduce(function(min, u) {
        var p1 = u.maxHp > 0 ? u.hp / u.maxHp : 1;
        var p2 = min.maxHp > 0 ? min.hp / min.maxHp : 1;
        return p1 < p2 ? u : min;
      }, wounded[0]);

      // 简易治疗：消耗MP回复目标15%最大HP
      var healAmount = Math.floor(healTarget.maxHp * 0.15);
      unit.mp = Math.max(0, unit.mp - 5);
      var beforeHp = healTarget.hp;
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmount);
      var actualHeal = healTarget.hp - beforeHp;
      var healMsg = unit.name + ' 治疗 ' + healTarget.name + '，回复 ' + actualHeal + ' 点HP';
      this.combatLog.push(healMsg);
      this.dispatchUpdate(healMsg);
      this.nextTurn();
      return;
    }

    // 没有人需要治疗或MP不足，进行普通攻击
    var target = this.enemyUnits.find(function(e) { return e.alive && e.hp > 0; });
    if (target) {
      this.executeAction(unit, 'attack', target);
    } else {
      this.nextTurn();
    }
  }

  // 防御型AI：自身血量低于30%时防御，否则攻击攻击力最高的敌人
  allyDefensiveTurn(unit) {
    var hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
    if (hpPct < 0.3) {
      // 血量低时防御
      this.defenseBoosts[unit.id] = 5;
      var defendMsg = unit.name + ' 进入防御姿态，防御力+5';
      this.combatLog.push(defendMsg);
      this.dispatchUpdate(defendMsg);
      this.nextTurn();
      return;
    }

    // 攻击攻击力最高的敌人
    var enemies = this.enemyUnits.filter(function(e) { return e.alive && e.hp > 0; });
    if (enemies.length === 0) {
      this.nextTurn();
      return;
    }
    var target = enemies.reduce(function(max, e) {
      return (e.attack || 0) > (max.attack || 0) ? e : max;
    }, enemies[0]);
    this.executeAction(unit, 'attack', target);
  }

  // 平衡型AI：攻击第一个可用敌人（原始行为）
  allyBalancedTurn(unit) {
    var target = this.enemyUnits.find(function(e) { return e.alive && e.hp > 0; });
    if (target) {
      this.executeAction(unit, 'attack', target);
    } else {
      this.nextTurn();
    }
  }

  // ========== 敌人回合 ==========
  enemyTurn(unit) {
    if (!this.battleActive || !unit.alive) {
      this.nextTurn();
      return;
    }
    // 敌人攻击主角或随从（优先攻击HP最低的）
    const targets = [this.playerUnit, ...this.allyUnits].filter(u => u.alive && u.hp > 0);
    if (targets.length === 0) {
      this.nextTurn();
      return;
    }
    // 50%概率攻击主角，50%攻击HP最低的
    let target;
    if (Math.random() < 0.5) {
      target = this.playerUnit.alive && this.playerUnit.hp > 0 ? this.playerUnit : targets[0];
    } else {
      target = targets.reduce((min, u) => u.hp < min.hp ? u : min, targets[0]);
    }
    this.executeAction(unit, 'attack', target);
  }

  // ========== 执行行动（支持四系伤害类型和异常状态触发）==========
  // damageType: 'physical' | 'fire' | 'frost' | 'lightning'
  executeAction(attacker, action, target, damageType) {
    if (!target || !target.alive || target.hp <= 0) {
      this.nextTurn();
      return;
    }

    var dmgType = damageType || 'physical';
    let damage = 0;
    let logMessage = '';

    switch (action) {
      case 'attack':
        damage = this.calculateDamage(attacker, target, dmgType);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = attacker.name + ' 攻击 ' + target.name + '，造成 ' + damage + ' 点' + this.getDamageTypeName(dmgType) + '伤害';
        // 普通攻击有概率触发异常状态
        this.tryApplyStatusFromDamageType(target, dmgType, attacker);
        break;

      case 'skill':
        damage = Math.floor(this.calculateDamage(attacker, target, dmgType) * 1.5);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = attacker.name + ' 使用技能攻击 ' + target.name + '，造成 ' + damage + ' 点' + this.getDamageTypeName(dmgType) + '伤害';
        break;

      default:
        damage = this.calculateDamage(attacker, target, dmgType);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = attacker.name + ' 攻击 ' + target.name + '，造成 ' + damage + ' 点伤害';
    }

    // 检查目标是否死亡
    if (target.hp <= 0) {
      target.alive = false;
      logMessage += '（' + target.name + ' 倒下了）';
    }

    this.combatLog.push(logMessage);
    console.log('[战斗]', logMessage);
    this.dispatchUpdate(logMessage);

    if (this.checkBattleEnd()) return;
    this.nextTurn();
  }

  // 获取伤害类型中文名
  getDamageTypeName(damageType) {
    if (!damageType || damageType === 'physical') return '';
    if (DATA && DATA.damageTypes && DATA.damageTypes[damageType]) {
      return DATA.damageTypes[damageType].name;
    }
    return '';
  }

  // ========== 计算伤害（支持四系伤害类型）==========
  // damageType: 'physical' | 'fire' | 'frost' | 'lightning' | null（默认物理）
  calculateDamage(attacker, defender, damageType) {
    const baseAttack = attacker.attack || 5;
    let baseDefense = defender.defense || 2;

    // 应用防御加成
    if (this.defenseBoosts[defender.id]) {
      baseDefense += this.defenseBoosts[defender.id];
    }

    var dmgType = damageType || 'physical';
    var damage = 0;

    if (dmgType === 'physical') {
      // 物理伤害：受防御力影响较大
      damage = Math.max(1, baseAttack - baseDefense * 0.5);
    } else {
      // 魔法伤害（火焰/冰霜/雷电）：受防御力影响较小（仅30%）
      damage = Math.max(1, baseAttack - baseDefense * 0.3);
    }

    // 随机浮动 0.8 ~ 1.2
    const variance = 0.8 + Math.random() * 0.4;
    damage = Math.floor(damage * variance);
    return Math.max(1, damage);
  }

  // ========== 异常状态系统 ==========

  // 获取伤害类型对应的异常状态
  getStatusTypeForElement(element) {
    if (!DATA || !DATA.damageTypes) return null;
    var dt = DATA.damageTypes[element];
    return dt ? dt.status : null;
  }

  // 施加异常状态到目标
  // statusType: 'bleed' | 'burn' | 'slow' | 'stun'
  applyStatusEffect(target, statusType, sourceUnit, customDuration) {
    if (!target || !target.alive || target.hp <= 0) return false;
    if (!target.statusEffects) target.statusEffects = {};

    var dmgTypeInfo = DATA && DATA.damageTypes ? null : null;
    // 从 DATA.damageTypes 获取状态信息
    var statusInfo = null;
    if (DATA && DATA.damageTypes) {
      for (var key in DATA.damageTypes) {
        if (DATA.damageTypes[key].status === statusType) {
          statusInfo = DATA.damageTypes[key];
          break;
        }
      }
    }

    var duration = customDuration || (statusInfo ? statusInfo.duration : 2);
    var stackable = statusInfo ? statusInfo.stackable : false;
    var maxStacks = statusInfo ? (statusInfo.maxStacks || 1) : 1;
    var sourceAtk = (sourceUnit && sourceUnit.attack) || 5;

    // 流血：每回合 loss = 攻击力 × 0.3
    if (statusType === 'bleed') {
      if (target.statusEffects.bleed) {
        // 不可叠加，刷新持续时间
        target.statusEffects.bleed.duration = duration;
        target.statusEffects.bleed.value = sourceAtk * 0.3;
      } else {
        target.statusEffects.bleed = { duration: duration, value: sourceAtk * 0.3 };
      }
      return true;
    }

    // 灼烧：可叠加，最多 maxStacks 层
    if (statusType === 'burn') {
      if (target.statusEffects.burn) {
        if (target.statusEffects.burn.stacks < maxStacks) {
          target.statusEffects.burn.stacks++;
        }
        target.statusEffects.burn.duration = duration;
        target.statusEffects.burn.value = sourceAtk * 0.4;
      } else {
        target.statusEffects.burn = { duration: duration, stacks: 1, value: sourceAtk * 0.4 };
      }
      return true;
    }

    // 减速：不可叠加，刷新持续时间
    if (statusType === 'slow') {
      if (target.statusEffects.slow) {
        target.statusEffects.slow.duration = duration;
      } else {
        target.statusEffects.slow = { duration: duration };
      }
      return true;
    }

    // 僵直：不可叠加，刷新持续时间
    if (statusType === 'stun') {
      if (target.statusEffects.stun) {
        target.statusEffects.stun.duration = duration;
      } else {
        target.statusEffects.stun = { duration: duration };
      }
      return true;
    }

    return false;
  }

  // 处理单位身上的异常状态（在单位行动前结算DOT伤害）
  // 返回 true 如果有状态被处理
  processStatusEffects(unit) {
    if (!unit || !unit.alive || !unit.statusEffects) return false;
    var hasEffect = false;
    var logs = [];

    // 流血：DOT伤害
    if (unit.statusEffects.bleed) {
      var bleedDmg = Math.floor(unit.statusEffects.bleed.value);
      unit.hp = Math.max(0, unit.hp - bleedDmg);
      logs.push(unit.name + ' 流血，受到 ' + bleedDmg + ' 点伤害');
      hasEffect = true;
    }

    // 灼烧：DOT伤害（按层数叠加）
    if (unit.statusEffects.burn) {
      var burnDmg = Math.floor(unit.statusEffects.burn.value * unit.statusEffects.burn.stacks);
      unit.hp = Math.max(0, unit.hp - burnDmg);
      logs.push(unit.name + ' 灼烧（' + unit.statusEffects.burn.stacks + '层），受到 ' + burnDmg + ' 点伤害');
      hasEffect = true;
    }

    // 输出DOT日志
    for (var i = 0; i < logs.length; i++) {
      this.combatLog.push(logs[i]);
      this.dispatchUpdate(logs[i]);
    }

    return hasEffect;
  }

  // 回合结束时递减所有单位的状态持续时间
  tickStatusEffects() {
    var allUnits = this.allUnits;
    for (var i = 0; i < allUnits.length; i++) {
      var unit = allUnits[i];
      if (!unit.statusEffects) continue;

      // 流血
      if (unit.statusEffects.bleed) {
        unit.statusEffects.bleed.duration--;
        if (unit.statusEffects.bleed.duration <= 0) {
          delete unit.statusEffects.bleed;
        }
      }

      // 灼烧
      if (unit.statusEffects.burn) {
        unit.statusEffects.burn.duration--;
        if (unit.statusEffects.burn.duration <= 0) {
          delete unit.statusEffects.burn;
        }
      }

      // 减速
      if (unit.statusEffects.slow) {
        unit.statusEffects.slow.duration--;
        if (unit.statusEffects.slow.duration <= 0) {
          delete unit.statusEffects.slow;
        }
      }

      // 僵直
      if (unit.statusEffects.stun) {
        unit.statusEffects.stun.duration--;
        if (unit.statusEffects.stun.duration <= 0) {
          delete unit.statusEffects.stun;
        }
      }
    }
  }

  // 检查单位是否处于僵直状态
  isStunned(unit) {
    return unit && unit.statusEffects && unit.statusEffects.stun && unit.statusEffects.stun.duration > 0;
  }

  // 检查单位是否处于减速状态
  isSlowed(unit) {
    return unit && unit.statusEffects && unit.statusEffects.slow && unit.statusEffects.slow.duration > 0;
  }

  // 获取有效速度（考虑减速-30%）
  getEffectiveSpeed(unit) {
    if (!unit) return 0;
    var speed = unit.speed || 10;
    if (this.isSlowed(unit)) {
      speed = speed * 0.7;  // 减速：速度-30%
    }
    return speed;
  }

  // 尝试施加伤害类型对应的异常状态
  // baseChance: 基础概率，物理攻击默认10%，魔法技能默认根据元素
  tryApplyStatusFromDamageType(target, damageType, sourceUnit, baseChance) {
    if (!target || !target.alive || !damageType) return false;
    var statusType = this.getStatusTypeForElement(damageType);
    if (!statusType) return false;

    var chance = baseChance !== undefined ? baseChance : 0.15; // 默认15%概率
    if (damageType === 'physical') chance = baseChance !== undefined ? baseChance : 0.10; // 物理流血10%
    if (damageType === 'fire') chance = baseChance !== undefined ? baseChance : 0.20;     // 灼烧20%
    if (damageType === 'frost') chance = baseChance !== undefined ? baseChance : 0.25;    // 减速25%
    if (damageType === 'lightning') chance = baseChance !== undefined ? baseChance : 0.15; // 僵直15%

    if (Math.random() < chance) {
      var applied = this.applyStatusEffect(target, statusType, sourceUnit);
      if (applied) {
        var statusInfo = null;
        if (DATA && DATA.damageTypes && DATA.damageTypes[damageType]) {
          statusInfo = DATA.damageTypes[damageType];
        }
        var statusName = statusInfo ? statusInfo.statusName : statusType;
        var msg = target.name + ' 陷入' + statusName + '状态';
        this.combatLog.push(msg);
        this.dispatchUpdate(msg);
        return true;
      }
    }
    return false;
  }

  // ========== 下一回合 ==========
  nextTurn() {
    this.currentTurnIndex++;

    // 一轮结束
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
      this.round++;
      // 清除防御加成
      this.defenseBoosts = {};
      // 递减所有技能冷却
      for (var cid in this.cooldowns) {
        if (this.cooldowns.hasOwnProperty(cid) && this.cooldowns[cid] > 0) {
          this.cooldowns[cid]--;
          if (this.cooldowns[cid] <= 0) {
            delete this.cooldowns[cid];
          }
        }
      }
      // 递减所有异常状态持续时间
      this.tickStatusEffects();
      // 重新计算行动顺序（活着的单位，考虑减速/僵直）
      this.calculateTurnOrder();

      if (this.round > this.maxRounds) {
        this.endCombat('timeout');
        return;
      }
    }

    if (this.checkBattleEnd()) return;
    this.processTurn();
  }

  // ========== 检查战斗结束 ==========
  checkBattleEnd() {
    // 玩家方是否全灭
    const playerSide = [this.playerUnit, ...this.allyUnits];
    const playerAlive = playerSide.some(u => u.alive && u.hp > 0);
    if (!playerAlive) {
      this.endCombat('player_defeat');
      return true;
    }
    // 敌方是否全灭
    const enemiesAlive = this.enemyUnits.some(e => e.alive && e.hp > 0);
    if (!enemiesAlive) {
      this.endCombat('player_victory');
      return true;
    }
    return false;
  }

  // ========== 结束战斗 ==========
  endCombat(result) {
    if (!this.battleActive) return;
    this.battleActive = false;
    this.isPlayerTurn = false;

    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }

    let message = '';
    let rewards = null;

    switch (result) {
      case 'player_victory':
        message = '🎉 战斗胜利！';
        rewards = this.calculateRewards();
        console.log('[战斗] 玩家胜利，奖励:', rewards);
        break;
      case 'player_defeat':
        message = '💀 战斗失败...';
        console.log('[战斗] 玩家失败');
        break;
      case 'timeout':
        message = '⏰ 战斗超时，平局！';
        console.log('[战斗] 战斗超时');
        break;
      case 'retreat':
        message = '🏃 成功撤退！';
        console.log('[战斗] 玩家撤退');
        break;
      default:
        message = '战斗结束';
    }

    this.combatLog.push(message);

    // 战斗结束后同步HP/MP回state
    if (window.gameApp && window.gameApp.state) {
      var state = window.gameApp.state;
      // 同步主角HP/MP
      if (this.playerUnit) {
        state.player.hp = Math.max(1, this.playerUnit.hp);
        state.player.mp = Math.max(0, this.playerUnit.mp);
      }
      // 同步随从HP/MP
      if (this.allyUnits && this.allyUnits.length > 0 && state.companions) {
        this.allyUnits.forEach(function(ally) {
          var companion = state.companions.find(function(c) { return c.id === ally.id; });
          if (companion) {
            companion.hp = Math.max(0, ally.hp);
            companion.mp = Math.max(0, ally.mp);
            companion.alive = ally.hp > 0;
          }
        });
      }
    }

    // 死亡流程处理
    if (result === 'player_defeat' && window.gameApp && window.gameApp.state) {
      var deathState = window.gameApp.state;
      var currentZone = deathState.world && deathState.world.currentZone ? deathState.world.currentZone : 'greyVillage';
      var deathResult = StateUtils.handleDeath(deathState, currentZone);
      if (deathResult && deathResult.message) {
        this.combatLog.push(deathResult.message);
      }
    }

    const event = new CustomEvent('combat-end', {
      detail: { combat: this, result: result, message: message, rewards: rewards }
    });
    document.dispatchEvent(event);
  }

  // ========== 计算奖励 ==========
  calculateRewards() {
    var totalExp = 0;
    var totalGold = 0;
    var drops = [];
    var equipmentDrops = [];

    this.enemyUnits.forEach(function(e) {
      totalExp += e.exp || 0;
      totalGold += e.gold || 0;
      if (e.drop) drops.push(e.drop);
    });

    // 发放经验
    if (window.gameApp && window.gameApp.state) {
      var state = window.gameApp.state;
      var expResult = StateUtils.addExp(state, totalExp);
      StateUtils.addGold(state, totalGold);

      // 添加掉落物到背包
      drops.forEach(function(drop) {
        var item = {
          id: Utils.uuid(),
          name: drop.name,
          type: drop.type || 'material',
          rarity: drop.rarity || 'white',
          level: 1,
          stack: 1,
        };
        StateUtils.addToInventory(state, item);
      });

      // 装备掉落逻辑
      this.enemyUnits.forEach(function(enemy) {
        // 根据敌人类型决定掉落概率
        var dropChance = 0.15; // 普通怪15%
        if (enemy.type === 'elite') {
          dropChance = 0.50; // 精英怪50%
        } else if (enemy.type === 'boss') {
          dropChance = 1.0;  // Boss 100%
        }
        // 概率判定是否掉落
        if (Math.random() < dropChance) {
          var enemyLevel = enemy.level || 1;
          // 使用 Utils.generateEquipment 生成装备
          var equip = Utils.generateEquipment(enemyLevel);
          // 添加到背包
          StateUtils.addToInventory(state, equip);
          equipmentDrops.push(equip);
          // 记录掉落信息到战斗日志
          var dropMsg = '获得装备：' + equip.name + '（' + Utils.getQualityName(equip.rarity) + '）';
          console.log('[战斗]', dropMsg);
        }
      }.bind(this));

      // 如果有装备掉落，汇总显示
      if (equipmentDrops.length > 0) {
        var equipDropNames = equipmentDrops.map(function(eq) { return eq.name; }).join('、');
        var equipSummaryMsg = '装备掉落：' + equipDropNames;
        this.combatLog.push(equipSummaryMsg);
      }

      return { exp: totalExp, gold: totalGold, drops: drops, equipmentDrops: equipmentDrops, expResult: expResult };
    }
    return { exp: totalExp, gold: totalGold, drops: drops, equipmentDrops: equipmentDrops };
  }

  // ========== 发送更新事件 ==========
  dispatchUpdate(log) {
    const event = new CustomEvent('combat-update', { detail: { combat: this, log: log } });
    document.dispatchEvent(event);
  }

  // ========== Getters ==========
  getPlayerUnit() { return this.playerUnit; }
  getAllyUnits() { return this.allyUnits; }
  getEnemyUnits() { return this.enemyUnits; }
  getAllUnits() { return this.allUnits; }
  getAliveEnemies() { return this.enemyUnits.filter(e => e.alive && e.hp > 0); }
  getAliveAllies() { return [this.playerUnit, ...this.allyUnits].filter(u => u.alive && u.hp > 0); }

  // ========== 设置选中目标 ==========
  setSelectedTarget(unit) {
    this.selectedTarget = unit;
  }
}
