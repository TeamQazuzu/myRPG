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

    // 稀有词条战斗状态追踪
    this._divineImmuneUsed = false;  // 神佑：每场一次
    this._divineCritUsed = false;    // 神罚：每场一次
    this._extraTurnUsed = false;     // 神速：每场一次
    this._dragonFireApplied = false; // 龙之息：战斗开始时触发一次
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

    // 龙之息：战斗开始对全体敌人造成火焰伤害
    this._applyDragonFireOnBattleStart();

    const event = new CustomEvent('combat-start', { detail: { combat: this } });
    document.dispatchEvent(event);

    this.processTurn();
  }

  // ========== 标准化单位数据（修复HP undefined）==========
  normalizeUnit(unit, side) {
    const maxHp = unit.maxHp || unit.hp || 100;
    var result = {
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
      statusEffects: {},
    };
    // 收集装备词条加成
    var equipment = null;
    if (side === 'player') {
      equipment = (window.gameApp && window.gameApp.state && window.gameApp.state.equipment) ? window.gameApp.state.equipment : null;
    } else if (side === 'ally' && unit.equipment) {
      equipment = unit.equipment;
    }
    result.affixBonuses = this.collectAffixBonuses(equipment);
    return result;
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
          // 处理主目标死亡（不可屈挠 + 击杀爆炸）
          if (target && !target.alive && target.hp <= 0) {
            // 不可屈挠（仅玩家方单位被击杀时）
            if (target.side === 'player' || target.side === 'ally') {
              if (this.tryCheatDeath(target)) {
                var cheatMsg = target.name + ' 发动了不可屈挠！';
                this.combatLog.push(cheatMsg);
                this.dispatchUpdate(cheatMsg);
              }
            }
            if (!target.alive) {
              // 击杀爆炸 AOE
              this.tryAoeOnKill(unit, target);
            }
          }
          // 处理AOE追加目标的死亡（击杀爆炸）
          if (skillResult.aoeTargets && skillResult.aoeTargets.length > 0) {
            for (var ai = 0; ai < skillResult.aoeTargets.length; ai++) {
              var aoeT = skillResult.aoeTargets[ai].target;
              if (aoeT && !aoeT.alive && aoeT.hp <= 0) {
                this.tryAoeOnKill(unit, aoeT);
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
        var beforeHealHp = unit.hp;
        var beforeHealMp = unit.mp;
        if (healHp > 0) {
          unit.hp = Math.min(unit.maxHp, unit.hp + healHp);
        }
        if (healMp > 0) {
          unit.mp = Math.min(unit.maxMp, unit.mp + healMp);
        }
        var actualHealHp = unit.hp - beforeHealHp;
        var actualHealMp = unit.mp - beforeHealMp;
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
        if (this.isRetreatBlocked) {
          var retreatBlockMsg = 'Boss战中无法撤退！';
          this.combatLog.push(retreatBlockMsg);
          this.dispatchUpdate(retreatBlockMsg);
          // 不结束回合，让玩家重新选择行动
          this.waitForPlayerAction(unit);
          return;
        }
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

  // ========== 执行行动（完整词条链路）==========
  // damageType: 'physical' | 'fire' | 'frost' | 'lightning'
  executeAction(attacker, action, target, damageType) {
    if (!target || !target.alive || target.hp <= 0) {
      this.nextTurn();
      return;
    }

    var dmgType = damageType || 'physical';
    var logMessage = '';
    var isCrit = false;
    var finalDamage = 0;

    // ---- 1. 计算基础伤害（含词条攻击加成/穿透/元素抗性）----
    var dmgResult = this.calculateDamage(attacker, target, dmgType);
    finalDamage = dmgResult.damage;

    // ---- 2. 暴击判定（神罚：每场一次必定暴击）----
    var critResult = this.rollCrit(attacker);
    isCrit = critResult.isCrit;
    // 神罚：每场战斗一次，必定暴击
    var ab = attacker.affixBonuses || {};
    if (!isCrit && ab.divineCrit && !this._divineCritUsed && (attacker.side === 'player' || attacker.side === 'ally')) {
      isCrit = true;
      critResult.isCrit = true;
      critResult.multiplier = (1.5 + (ab.critDmg || 0));
      this._divineCritUsed = true;
      var divineCritMsg = '神罚发动！必定暴击！';
      this.combatLog.push(divineCritMsg);
      this.dispatchUpdate(divineCritMsg);
    }
    if (isCrit) {
      finalDamage = Math.floor(finalDamage * critResult.multiplier);
    }

    // ---- 2.5 龙之怒（5%概率3倍伤害）----
    var dragonMult = this.tryDragonRage(attacker);
    if (dragonMult > 1.0) {
      finalDamage = Math.floor(finalDamage * dragonMult);
    }

    // ---- 2.6 天雷（5%概率1.5倍雷伤）----
    var thunderMult = this.trySkyThunder(attacker);
    if (thunderMult > 1.0) {
      finalDamage = Math.floor(finalDamage * thunderMult);
    }

    // ---- 3. 条件增伤 ----
    var condBonus = this.getConditionalBonus(attacker, target, dmgType);
    if (condBonus > 0) {
      finalDamage = Math.floor(finalDamage * (1 + condBonus));
    }

    // ---- 4. 低血量增伤 ----
    var lowHpBonus = this.getLowHpBonus(attacker);
    if (lowHpBonus > 0) {
      finalDamage = Math.floor(finalDamage * (1 + lowHpBonus));
    }

    // ---- 5. 首回合增伤 ----
    var firstTurnBonus = this.getFirstTurnBonus(attacker);
    if (firstTurnBonus > 0) {
      finalDamage = Math.floor(finalDamage * (1 + firstTurnBonus));
    }

    finalDamage = Math.max(1, finalDamage);

    // ---- 5.5 龙之鳞：受到攻击时5%概率免疫（防守方）----
    var defenderAb = target.affixBonuses || {};
    if (defenderAb.dragonImmune && defenderAb.dragonImmune > 0) {
      if (this.tryDragonImmune(target)) {
        logMessage = target.name + ' 龙之鳞发动，免疫了 ' + attacker.name + ' 的攻击！';
        this.combatLog.push(logMessage);
        this.dispatchUpdate(logMessage);
        if (this.checkBattleEnd()) return;
        this.nextTurn();
        return;
      }
    }

    // ---- 6. 扣血 ----
    target.hp = Math.max(0, target.hp - finalDamage);

    // ---- 7. 构建日志 ----
    var dmgTypeName = this.getDamageTypeName(dmgType);
    logMessage = attacker.name + ' 攻击 ' + target.name + '，造成 ' + finalDamage + ' 点' + dmgTypeName + '伤害';
    if (isCrit) logMessage += '【暴击】';
    if (dmgResult.resisted > 0) logMessage += '（抗性减免' + Math.floor(dmgResult.resisted * 100) + '%）';
    if (condBonus > 0) logMessage += '（条件增伤+' + Math.floor(condBonus * 100) + '%）';
    if (lowHpBonus > 0) logMessage += '（低血量增伤+' + Math.floor(lowHpBonus * 100) + '%）';
    if (firstTurnBonus > 0) logMessage += '（首回合增伤+' + Math.floor(firstTurnBonus * 100) + '%）';

    // ---- 8. 词条命中触发效果（流血/灼烧/减速/僵直/减甲/减攻）----
    var hitLogs = this.applyAffixOnHitEffects(attacker, target, dmgType, isCrit);
    for (var hi = 0; hi < hitLogs.length; hi++) {
      this.combatLog.push(hitLogs[hi]);
      this.dispatchUpdate(hitLogs[hi]);
    }

    // ---- 8.5 龙之息（30%概率附加火焰伤害+灼烧）----
    this.tryDragonFire(attacker, target);

    // ---- 9. 生命/法力窃取 ----
    var stealLogs = this.applyLifeManaSteal(attacker, finalDamage);
    for (var si = 0; si < stealLogs.length; si++) {
      logMessage += '，' + stealLogs[si];
    }

    // ---- 10. 普通攻击概率触发异常状态（元素基础概率）----
    if (action === 'attack') {
      this.tryApplyStatusFromDamageType(target, dmgType, attacker);
    }

    // ---- 10.5 冰河（5%概率全体冰冻）----
    this.tryIceAge(attacker);

    // ---- 10.6 连锁闪电 ----
    this.tryChainLightning(attacker, target, finalDamage);

    // ---- 10.7 冰霜新星（概率全体减速）----
    this.tryFrostNova(attacker);

    // ---- 11. 死亡判定 + 神佑 + 不可屈挠 + 击杀爆炸 ----
    if (target.hp <= 0) {
      // 神佑：每场战斗一次，免疫致命伤害（仅玩家方）
      if ((target.side === 'player' || target.side === 'ally') && ab.divineImmune && !this._divineImmuneUsed) {
        target.hp = 1;
        target.alive = true;
        this._divineImmuneUsed = true;
        logMessage += '（神佑发动！' + target.name + ' 免疫了致命伤害！）';
        this.combatLog.push('神佑！' + target.name + ' 免疫了致命伤害，保留1点生命！');
        this.dispatchUpdate('神佑！' + target.name + ' 免疫了致命伤害，保留1点生命！');
        this.combatLog.push(logMessage);
        this.dispatchUpdate(logMessage);
        if (this.checkBattleEnd()) return;
        this.nextTurn();
        return;
      }
      // 龙之鳞：5%免疫伤害（防守方）
      // （龙之鳞在受到攻击时判定，在扣血前更好，但为简化逻辑放在死亡判定前也可）
      // 不可屈挠（仅玩家方）
      if (target.side === 'player' || target.side === 'ally') {
        if (this.tryCheatDeath(target)) {
          logMessage += '（' + target.name + ' 发动了不可屈挠！）';
          this.combatLog.push(logMessage);
          this.dispatchUpdate(logMessage);
          if (this.checkBattleEnd()) return;
          this.nextTurn();
          return;
        }
      }
      target.alive = false;
      logMessage += '（' + target.name + ' 倒下了）';
      // 击杀爆炸 AOE
      this.tryAoeOnKill(attacker, target);
      // 检查AOE后是否有人死亡
      var aoeKilled = this.enemyUnits.filter(function(e) { return !e.alive && e.hp <= 0; });
      // 不在主日志中显示AOE击杀，tryAoeOnKill已经自行dispatch
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

  // ========== 计算伤害（支持四系伤害类型 + 词条加成）==========
  // damageType: 'physical' | 'fire' | 'frost' | 'lightning' | null（默认物理）
  // 返回 { damage: number, resisted: number }  resisted 为元素抗性减免的百分比描述
  calculateDamage(attacker, defender, damageType) {
    var ab = attacker.affixBonuses || {};
    var baseAttack = attacker.attack || 5;
    var baseDefense = defender.defense || 2;

    // 应用防御加成（防御姿态/Buff）
    if (this.defenseBoosts[defender.id]) {
      baseDefense += this.defenseBoosts[defender.id];
    }

    var dmgType = damageType || 'physical';

    // 穿透词条：按百分比忽略防御
    var pierce = ab.pierce || 0;
    var effectiveDef = baseDefense * (1 - pierce);

    // 词条攻击加成（百分比乘算）
    var elemBonus = 0;
    if (dmgType === 'physical') elemBonus = ab.physDmg || 0;
    else if (dmgType === 'fire') elemBonus = ab.fireDmg || 0;
    else if (dmgType === 'frost') elemBonus = ab.frostDmg || 0;
    else if (dmgType === 'lightning') elemBonus = ab.lightDmg || 0;
    baseAttack = baseAttack * (1 + elemBonus);

    var damage = 0;
    if (dmgType === 'physical') {
      damage = Math.max(1, baseAttack - effectiveDef * 0.5);
    } else {
      damage = Math.max(1, baseAttack - effectiveDef * 0.3);
    }

    // 元素抗性减伤（仅魔法伤害）
    var resisted = 0;
    if (dmgType !== 'physical') {
      resisted = this.getElementResist(defender, dmgType);
      damage = damage * (1 - resisted);
    }

    // 随机浮动 0.8 ~ 1.2
    var variance = 0.8 + Math.random() * 0.4;
    damage = Math.floor(damage * variance);
    damage = Math.max(1, damage);
    return { damage: damage, resisted: resisted };
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
      speed = speed * 0.7;
    }
    return speed;
  }

  // ========== 装备词条收集 ==========
  // 从装备字典中汇总所有词条效果为扁平对象，供战斗快速查询
  collectAffixBonuses(equipment) {
    var b = {
      critRate: 0, critDmg: 0, pierce: 0, antiMagic: 0,
      lifeSteal: 0, manaSteal: 0,
      firstTurnDmg: 0, lowHpDmg: 0, veryLowHpDmg: 0,
      bleedOnCrit: 0, burnOnHit: 0, slowOnHit: 0, stunOnHit: 0,
      frostBonusOnSlow: 0, lightBonusOnStun: 0, fireBonusOnBurn: 0, physBonusOnBleed: 0,
      burnMaxStacks: 0, burnReduceAtk: 0, bleedNoHeal: false,
      fireRes: 0, frostRes: 0, lightRes: 0, allElemRes: 0,
      cheatDeathChance: 0, aoeOnKill: 0, protectChance: 0, companionDmg: 0,
      chainTarget: 0, freezeAllChance: 0,
      dragonDmg: 0, dragonImmune: 0, dragonFire: 0,
      divineImmune: false, divineCrit: false, extraTurn: false,
      skyThunder: 0, iceAge: 0,
    };
    if (!equipment || !DATA || !DATA.affixPool) return b;
    for (var slot in equipment) {
      var item = equipment[slot];
      if (!item || !item.affixes) continue;
      for (var i = 0; i < item.affixes.length; i++) {
        var affix = item.affixes[i];
        var def = DATA.affixPool[affix.id];
        if (!def) continue;
        var v = def.value;
        var e = def.effect;
        // 攻击加成（百分比乘算，累积到attack用）
        if (e === 'physDmg' || e === 'fireDmg' || e === 'frostDmg' || e === 'lightDmg') {
          b[e] = (b[e] || 0) + v;
          continue;
        }
        // 数值型直接加
        if (e === 'critRate') { b.critRate += v; continue; }
        if (e === 'critDmg') { b.critDmg += v; continue; }
        if (e === 'pierce') { b.pierce += v; continue; }
        if (e === 'antiMagic') { b.antiMagic += v; continue; }
        if (e === 'speed') { /* speed handled in normalizeUnit via app.js */ continue; }
        if (e === 'maxHp') { /* maxHp handled in normalizeUnit via app.js */ continue; }
        if (e === 'physDef') { /* def handled in normalizeUnit */ continue; }
        if (e === 'lifeSteal') { b.lifeSteal += v; continue; }
        if (e === 'manaSteal') { b.manaSteal += v; continue; }
        if (e === 'firstTurnDmg') { b.firstTurnDmg += v; continue; }
        if (e === 'lowHpDmg' || e === 'desperate') { b.lowHpDmg += v; continue; }
        if (e === 'veryLowHpDmg' || e === 'desperate2') { b.veryLowHpDmg += v; continue; }
        if (e === 'bleedOnCrit') { b.bleedOnCrit += v; continue; }
        if (e === 'burnOnHit') { b.burnOnHit += v; continue; }
        if (e === 'slowOnHit') { b.slowOnHit += v; continue; }
        if (e === 'stunOnHit') { b.stunOnHit += v; continue; }
        if (e === 'frostBonusOnSlow') { b.frostBonusOnSlow += v; continue; }
        if (e === 'lightBonusOnStun') { b.lightBonusOnStun += v; continue; }
        if (e === 'fireBonusOnBurn') { b.fireBonusOnBurn += v; continue; }
        if (e === 'physBonusOnBleed') { b.physBonusOnBleed += v; continue; }
        if (e === 'burnMaxStacks') { b.burnMaxStacks = Math.max(b.burnMaxStacks, v); continue; }
        if (e === 'burnReduceAtk') { b.burnReduceAtk += v; continue; }
        if (e === 'bleedNoHeal') { b.bleedNoHeal = true; continue; }
        if (e === 'fireRes') { b.fireRes += v; continue; }
        if (e === 'frostRes') { b.frostRes += v; continue; }
        if (e === 'lightRes') { b.lightRes += v; continue; }
        if (e === 'allElemRes') { b.allElemRes += v; continue; }
        if (e === 'cheatDeathChance') { b.cheatDeathChance += v; continue; }
        if (e === 'aoeOnKill') { b.aoeOnKill += v; continue; }
        if (e === 'protectChance') { b.protectChance += v; continue; }
        if (e === 'companionDmg') { b.companionDmg += v; continue; }
        if (e === 'chainTarget') { b.chainTarget += v; continue; }
        if (e === 'freezeAllChance') { b.freezeAllChance += v; continue; }
        if (e === 'debuffCleanse') { /* 净化在受到debuff时触发 */ continue; }
        if (e === 'reduceArmor') { b._reduceArmor = (b._reduceArmor || 0) + v; continue; }
        if (e === 'reduceSpeed') { b._reduceSpeed = (b._reduceSpeed || 0) + v; continue; }
        if (e === 'reduceHit') { b._reduceHit = (b._reduceHit || 0) + v; continue; }
        if (e === 'dodgeSpeed') { /* 闪避速度 */ continue; }
        // 稀有词条（暂不实现完整逻辑，记录数值）
        if (e === 'dragonDmg') { b.dragonDmg = Math.max(b.dragonDmg, v); continue; }
        if (e === 'dragonImmune') { b.dragonImmune += v; continue; }
        if (e === 'dragonFire') { b.dragonFire = Math.max(b.dragonFire, v); continue; }
        if (e === 'divineImmune') { b.divineImmune = true; continue; }
        if (e === 'divineCrit') { b.divineCrit = true; continue; }
        if (e === 'extraTurn') { b.extraTurn = true; continue; }
        if (e === 'skyThunder') { b.skyThunder = Math.max(b.skyThunder, v); continue; }
        if (e === 'iceAge') { b.iceAge = Math.max(b.iceAge, v); continue; }
      }
    }
    // ===== 收集宝石加成 =====
    if (GemSystem && equipment) {
      var slots = ['weapon', 'armor', 'accessory'];
      for (var si = 0; si < slots.length; si++) {
        var slotEquip = equipment[slots[si]];
        if (slotEquip && slotEquip.sockets && slotEquip.sockets.length > 0) {
          var gemBonus = GemSystem.getGemBonuses(slotEquip);
          for (var gk in gemBonus) {
            if (!gemBonus.hasOwnProperty(gk)) continue;
            var gv = gemBonus[gk];
            if (typeof gv === 'number') {
              // 直接加到 affixBonuses
              if (b[gk] !== undefined) {
                b[gk] += gv;
              } else {
                b[gk] = gv;
              }
            }
          }
        }
      }
    }
    return b;
  }

  // ========== 暴击判定 ==========
  rollCrit(attacker) {
    var ab = attacker.affixBonuses || {};
    var critRate = 0.05 + (ab.critRate || 0); // 基础5% + 词条
    critRate = Math.min(critRate, 0.75); // 上限75%
    var critDmg = 1.5 + (ab.critDmg || 0); // 基础1.5x + 词条
    var isCrit = Math.random() < critRate;
    return { isCrit: isCrit, multiplier: isCrit ? critDmg : 1.0 };
  }

  // ========== 元素抗性减伤 ==========
  getElementResist(defender, damageType) {
    var db = defender.affixBonuses || {};
    var res = db.allElemRes || 0;
    if (damageType === 'fire') res += db.fireRes || 0;
    else if (damageType === 'frost') res += db.frostRes || 0;
    else if (damageType === 'lightning') res += db.lightRes || 0;
    return Math.min(res, 0.75); // 上限75%减伤
  }

  // ========== 条件增伤判定 ==========
  getConditionalBonus(attacker, target, damageType) {
    var ab = attacker.affixBonuses || {};
    var bonus = 0;
    // 目标有状态时增伤
    var se = target.statusEffects || {};
    if (damageType === 'physical' && se.bleed && se.bleed.duration > 0) {
      bonus += ab.physBonusOnBleed || 0;
    }
    if (damageType === 'fire' && se.burn && se.burn.duration > 0) {
      bonus += ab.fireBonusOnBurn || 0;
    }
    if (damageType === 'frost' && se.slow && se.slow.duration > 0) {
      bonus += ab.frostBonusOnSlow || 0;
    }
    if (damageType === 'lightning' && se.stun && se.stun.duration > 0) {
      bonus += ab.lightBonusOnStun || 0;
    }
    return bonus;
  }

  // ========== 低血量增伤 ==========
  getLowHpBonus(attacker) {
    var ab = attacker.affixBonuses || {};
    var hpPct = attacker.maxHp > 0 ? attacker.hp / attacker.maxHp : 1;
    if (hpPct < 0.2 && ab.veryLowHpDmg > 0) return ab.veryLowHpDmg;
    if (hpPct < 0.3 && ab.lowHpDmg > 0) return ab.lowHpDmg;
    return 0;
  }

  // ========== 首回合增伤 ==========
  getFirstTurnBonus(attacker) {
    if (this.round === 1 && attacker.affixBonuses && attacker.affixBonuses.firstTurnDmg > 0) {
      return attacker.affixBonuses.firstTurnDmg;
    }
    return 0;
  }

  // ========== 词条命中触发效果 ==========
  applyAffixOnHitEffects(attacker, target, damageType, isCrit) {
    var ab = attacker.affixBonuses || {};
    var logs = [];
    // 暴击流血
    if (isCrit && ab.bleedOnCrit > 0 && Math.random() < ab.bleedOnCrit) {
      var bld = Math.max(1, Math.floor((attacker.attack || 5) * 0.5));
      target.hp = Math.max(0, target.hp - bld);
      logs.push('暴击附加流血 +' + bld + ' 伤害');
      this.applyStatusEffect(target, 'bleed', attacker);
    }
    // 命中灼烧
    if (damageType === 'fire' && ab.burnOnHit > 0 && Math.random() < ab.burnOnHit) {
      this.applyStatusEffect(target, 'burn', attacker);
      logs.push('命中附加灼烧');
    }
    // 命中减速
    if (damageType === 'frost' && ab.slowOnHit > 0 && Math.random() < ab.slowOnHit) {
      this.applyStatusEffect(target, 'slow', attacker);
      logs.push('命中附加减速');
    }
    // 命中僵直
    if (damageType === 'lightning' && ab.stunOnHit > 0 && Math.random() < ab.stunOnHit) {
      this.applyStatusEffect(target, 'stun', attacker);
      logs.push('命中附加僵直');
    }
    // 减甲效果（物理命中）
    if (damageType === 'physical' && ab._reduceArmor && ab._reduceArmor > 0) {
      target.defense = Math.max(0, target.defense - Math.floor(target.defense * ab._reduceArmor));
      logs.push('护甲降低' + Math.floor(ab._reduceArmor * 100) + '%');
    }
    // 减速效果（冰霜命中）
    if (damageType === 'frost' && ab._reduceSpeed && ab._reduceSpeed > 0) {
      target.speed = Math.max(1, target.speed - Math.floor(target.speed * ab._reduceSpeed));
      logs.push('速度降低' + Math.floor(ab._reduceSpeed * 100) + '%');
    }
    // 灼烧减攻（目标有灼烧时，攻击者灼烧词条让目标攻击降低）
    if (target.statusEffects && target.statusEffects.burn && ab.burnReduceAtk > 0) {
      target.attack = Math.max(1, target.attack - Math.floor(target.attack * ab.burnReduceAtk));
      logs.push(target.name + ' 攻击力因灼烧降低' + Math.floor(ab.burnReduceAtk * 100) + '%');
    }
    return logs;
  }

  // ========== 生命窃取 / 法力窃取 ==========
  applyLifeManaSteal(attacker, damage) {
    var ab = attacker.affixBonuses || {};
    var logs = [];
    if (ab.lifeSteal > 0) {
      var heal = Math.max(1, Math.floor(damage * ab.lifeSteal));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      logs.push('吸血 ' + heal);
    }
    if (ab.manaSteal > 0) {
      var mp = Math.max(1, Math.floor(damage * ab.manaSteal));
      attacker.mp = Math.min(attacker.maxMp, attacker.mp + mp);
      logs.push('吸魔 ' + mp);
    }
    return logs;
  }

  // ========== 不可屈挠 ==========
  tryCheatDeath(unit) {
    var ab = unit.affixBonuses || {};
    if (ab.cheatDeathChance > 0 && Math.random() < ab.cheatDeathChance) {
      unit.hp = 1;
      unit.alive = true;
      var msg = unit.name + ' 发动不可屈挠，以1点生命存活！';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
      return true;
    }
    return false;
  }

  // ========== 击杀爆炸 AOE ==========
  tryAoeOnKill(attacker, killedTarget) {
    var ab = attacker.affixBonuses || {};
    if (ab.aoeOnKill <= 0) return;
    if (Math.random() >= ab.aoeOnKill) return;
    // 对其他敌方单位造成50%攻击力的火焰伤害
    var aoeDmg = Math.floor((attacker.attack || 10) * 0.5);
    var hitCount = 0;
    var enemies = this.getAliveEnemies();
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.id === killedTarget.id) continue;
      e.hp = Math.max(0, e.hp - aoeDmg);
      if (e.hp <= 0) { e.alive = false; }
      hitCount++;
    }
    if (hitCount > 0) {
      var msg = '火焰爆炸对 ' + hitCount + ' 个敌人造成 ' + aoeDmg + ' 点火焰伤害';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
    }
  }

  // ========== 链式攻击 ==========
  tryChainLightning(attacker, originalTarget, damage) {
    var ab = attacker.affixBonuses || {};
    if (ab.chainTarget <= 0) return;
    if (Math.random() >= 0.30) return; // 30%触发概率
    // 对另一个随机存活敌人造成50%伤害
    var enemies = this.getAliveEnemies().filter(function(e) { return e.id !== originalTarget.id; });
    if (enemies.length === 0) return;
    var chainTarget = enemies[Math.floor(Math.random() * enemies.length)];
    var chainDmg = Math.floor(damage * 0.5);
    chainTarget.hp = Math.max(0, chainTarget.hp - chainDmg);
    if (chainTarget.hp <= 0) { chainTarget.alive = false; }
    var msg = '连锁闪电对 ' + chainTarget.name + ' 造成 ' + chainDmg + ' 点伤害';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
  }

  // ========== 冰霜新星（全体冰冻） ==========
  tryFrostNova(attacker) {
    var ab = attacker.affixBonuses || {};
    if (ab.freezeAllChance <= 0) return;
    if (Math.random() >= ab.freezeAllChance) return;
    var enemies = this.getAliveEnemies();
    var frozenCount = 0;
    for (var i = 0; i < enemies.length; i++) {
      this.applyStatusEffect(enemies[i], 'slow', attacker, 2);
      frozenCount++;
    }
    if (frozenCount > 0) {
      var msg = '冰霜新星！所有 ' + frozenCount + ' 个敌人被减速！';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
    }
  }

  // ========== 净化（自动清除debuff） ==========
  tryDebuffCleanse(unit) {
    var ab = unit.affixBonuses || {};
    if (ab.debuffCleanse <= 0) return;
    var se = unit.statusEffects || {};
    var cleansed = [];
    if (se.bleed && se.bleed.duration > 0 && Math.random() < ab.debuffCleanse) {
      se.bleed.duration = 0;
      cleansed.push('流血');
    }
    if (se.burn && se.burn.duration > 0 && Math.random() < ab.debuffCleanse) {
      se.burn.duration = 0;
      se.burn.stacks = 0;
      cleansed.push('灼烧');
    }
    if (se.slow && se.slow.duration > 0 && Math.random() < ab.debuffCleanse) {
      se.slow.duration = 0;
      cleansed.push('减速');
    }
    if (se.stun && se.stun.duration > 0 && Math.random() < ab.debuffCleanse) {
      se.stun.duration = 0;
      cleansed.push('僵直');
    }
    if (cleansed.length > 0) {
      var msg = unit.name + ' 的净化清除了 ' + cleansed.join('、');
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
    }
  }

  // ========== 守护之约（替随从挡伤） ==========
  tryProtect(companion, damage, attacker) {
    if (!this.playerUnit || !this.playerUnit.alive || this.playerUnit.hp <= 0) return false;
    var ab = this.playerUnit.affixBonuses || {};
    if (ab.protectChance <= 0) return false;
    if (Math.random() >= ab.protectChance) return false;
    // 玩家替随从承受伤害
    var mitigatedDmg = Math.floor(damage * 0.5);
    this.playerUnit.hp = Math.max(1, this.playerUnit.hp - mitigatedDmg);
    var msg = this.playerUnit.name + ' 挡在 ' + companion.name + ' 面前，替其承受了 ' + mitigatedDmg + ' 点伤害！';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
    return true;
  }

  // ========== 龙之怒（5%概率3倍伤害） ==========
  tryDragonRage(attacker) {
    var ab = attacker.affixBonuses || {};
    if (!ab.dragonDmg) return 1.0;
    var dragonInfo = ab.dragonDmg;
    if (typeof dragonInfo === 'object' && dragonInfo.chance && Math.random() < dragonInfo.chance) {
      var msg = '龙之怒发动！伤害 x' + dragonInfo.mult + '！';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
      return dragonInfo.mult;
    }
    return 1.0;
  }

  // ========== 龙之息（命中附加80火焰伤害） ==========
  tryDragonFire(attacker, target) {
    var ab = attacker.affixBonuses || {};
    if (!ab.dragonFire || ab.dragonFire <= 0) return;
    if (Math.random() >= 0.30) return; // 30%触发
    var fireDmg = ab.dragonFire;
    target.hp = Math.max(0, target.hp - fireDmg);
    this.applyStatusEffect(target, 'burn', attacker);
    var msg = '龙之息！对 ' + target.name + ' 附加 ' + fireDmg + ' 点火焰伤害并灼烧';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
  }

  // ========== 天雷（5%概率1.5倍雷伤） ==========
  trySkyThunder(attacker) {
    var ab = attacker.affixBonuses || {};
    if (!ab.skyThunder) return 1.0;
    var thunderInfo = ab.skyThunder;
    if (typeof thunderInfo === 'object' && thunderInfo.chance && Math.random() < thunderInfo.chance) {
      var msg = '天雷降下！雷电伤害 x' + thunderInfo.dmg + '！';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
      return thunderInfo.dmg;
    }
    return 1.0;
  }

  // ========== 冰河（5%概率全体冰冻） ==========
  tryIceAge(attacker) {
    var ab = attacker.affixBonuses || {};
    if (!ab.iceAge) return false;
    var iceInfo = ab.iceAge;
    if (typeof iceInfo === 'object' && iceInfo.chance && Math.random() < iceInfo.chance) {
      var enemies = this.getAliveEnemies();
      for (var i = 0; i < enemies.length; i++) {
        enemies[i].speed = Math.max(1, Math.floor(enemies[i].speed * 0.5));
        this.applyStatusEffect(enemies[i], 'slow', attacker, 2);
      }
      var msg = '冰河时代！所有敌人被冰冻减速！';
      this.combatLog.push(msg);
      this.dispatchUpdate(msg);
      return true;
    }
    return false;
  }

  // ========== 龙之鳞（5%免疫伤害） ==========
  tryDragonImmune(unit) {
    var ab = unit.affixBonuses || {};
    if (!ab.dragonImmune || ab.dragonImmune <= 0) return false;
    if (Math.random() >= ab.dragonImmune) return false;
    var msg = unit.name + ' 龙之鳞发动，免疫了攻击！';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
    return true;
  }

  // ========== 龙之息：战斗开始时对全体敌人造成火焰伤害 ==========
  _applyDragonFireOnBattleStart() {
    if (this._dragonFireApplied) return;
    var ab = this.playerUnit && this.playerUnit.affixBonuses ? this.playerUnit.affixBonuses : {};
    if (!ab.dragonFire || ab.dragonFire <= 0) return;
    this._dragonFireApplied = true;
    var fireDmg = ab.dragonFire;
    var enemies = this.enemyUnits;
    var msg = '龙之息发动！对所有敌人造成 ' + fireDmg + ' 点火焰伤害！';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
    for (var i = 0; i < enemies.length; i++) {
      enemies[i].hp = Math.max(0, enemies[i].hp - fireDmg);
      this.applyStatusEffect(enemies[i], 'burn', this.playerUnit);
      if (enemies[i].hp <= 0) enemies[i].alive = false;
    }
    // 检查是否有人被龙息直接打死
    if (this.checkBattleEnd()) return;
  }

  // ========== 神速：每场战斗一次，额外行动一回合 ==========
  tryExtraTurn(unit) {
    var ab = unit.affixBonuses || {};
    if (!ab.extraTurn) return false;
    if (this._extraTurnUsed) return false;
    if (unit.side !== 'player' && unit.side !== 'ally') return false;
    // 30%概率触发
    if (Math.random() >= 0.30) return false;
    this._extraTurnUsed = true;
    var msg = unit.name + ' 神速发动！获得额外行动回合！';
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);
    return true;
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

    // 死亡流程处理（Boss战已自行处理则跳过）
    if (result === 'player_defeat' && !this._bossHandledDeath && window.gameApp && window.gameApp.state) {
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

      // 队友共享经验（与玩家等量，受玩家等级上限约束）
      var companionLevelUps = [];
      if (state.companions && state.companions.length > 0 && typeof CompanionSystem !== 'undefined' && CompanionSystem) {
        var self = this;
        state.companions.forEach(function(c) {
          if (!c) return;
          var r = CompanionSystem.addExp(c, totalExp, state);
          if (r && r.leveledUp) {
            companionLevelUps.push({ name: c.name, newLevel: r.newLevel, levelsGained: r.levelsGained });
            self.combatLog.push(c.name + ' 升到 ' + r.newLevel + ' 级！');
          }
        });
      }

      // 添加掉落物到背包
      var bagFullMsgs = [];
      drops.forEach(function(drop) {
        var item = {
          id: Utils.uuid(),
          name: drop.name,
          type: drop.type || 'material',
          rarity: drop.rarity || 'white',
          level: 1,
          stack: 1,
        };
        var addR = StateUtils.addToInventory(state, item);
        if (!addR || !addR.ok) {
          bagFullMsgs.push(item.name);
        }
      });

      // 装备掉落逻辑（概率已下调，避免背包快速爆满）
      this.enemyUnits.forEach(function(enemy) {
        // 根据敌人类型决定掉落概率
        var dropChance = 0.08; // 普通怪 8%
        if (enemy.type === 'elite') {
          dropChance = 0.25; // 精英怪 25%
        } else if (enemy.type === 'boss') {
          dropChance = 1.0;  // Boss 100%
        }
        // 概率判定是否掉落
        if (Math.random() < dropChance) {
          var enemyLevel = enemy.level || 1;
          // 使用 Utils.generateEquipment 生成装备
          var equip = Utils.generateEquipment(enemyLevel);
          var addR = StateUtils.addToInventory(state, equip);
          if (addR && addR.ok) {
            equipmentDrops.push(equip);
            var dropMsg = '获得装备：' + equip.name + '（' + Utils.getQualityName(equip.rarity) + '）';
            console.log('[战斗]', dropMsg);
          } else {
            bagFullMsgs.push(equip.name);
          }
        }
      }.bind(this));

      // 如果有装备掉落，汇总显示
      if (equipmentDrops.length > 0) {
        var equipDropNames = equipmentDrops.map(function(eq) { return eq.name; }).join('、');
        var equipSummaryMsg = '装备掉落：' + equipDropNames;
        this.combatLog.push(equipSummaryMsg);
      }

      // 宝石掉落判定（概率按敌人类型分档）
      if (GemSystem) {
        for (var gi = 0; gi < this.enemyUnits.length; gi++) {
          var eUnit = this.enemyUnits[gi];
          var gemDrop = GemSystem.generateGemDrop(eUnit.level || 1, eUnit.type);
          if (gemDrop) {
            var addR = StateUtils.addToInventory(state, gemDrop);
            if (addR && addR.ok) {
              drops.push({ name: gemDrop.name, type: 'gem', rarity: gemDrop.rarity });
            } else {
              bagFullMsgs.push(gemDrop.name);
            }
          }
        }
      }

      // 背包已满提示（避免静默丢失物品）
      if (bagFullMsgs.length > 0) {
        var fullMsg = '背包已满，未拾取：' + bagFullMsgs.join('、');
        this.combatLog.push(fullMsg);
      }

      return { exp: totalExp, gold: totalGold, drops: drops, equipmentDrops: equipmentDrops, expResult: expResult, companionLevelUps: companionLevelUps };
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

// ========== 守门员Boss战斗引擎 ==========
class BossCombatEngine extends CombatEngine {
  // 构造函数：接收守门员ID，初始化Boss战相关属性
  // 【Bug3修复】新增可选参数 gkData，便于子类 MultiWaveBossCombatEngine 通过 super(bossId, gkData)
  // 透传守门员配置；若未传入则按原逻辑从 DATA.gatekeepers 自行查找，保持向后兼容。
  constructor(bossId, gkData) {
    super();
    // 优先使用传入的 gkData；未传入时回退到 DATA 查找（兼容旧的 new BossCombatEngine(bossId) 调用）
    if (typeof gkData === 'undefined' || gkData === null) {
      gkData = DATA && DATA.gatekeepers && DATA.gatekeepers[bossId] ? DATA.gatekeepers[bossId] : null;
    }
    if (!gkData) {
      console.warn('[Boss战斗] 未找到守门员配置:', bossId);
      gkData = {};
    }
    this.bossId = bossId;
    this.gkData = gkData;
    this.isBossCombat = true;
    this.phase = 1;
    this.bossSkillCooldowns = {};
    this.isRetreatBlocked = true;
    this.defeatCallback = null;

    // 根据战斗风格计算最大阶段数
    var style = gkData.combat && gkData.combat.style ? gkData.combat.style : 'meleeBoss';
    if (style === 'tank') {
      this.maxPhase = 2;
      this.phaseThresholds = [100, 50, 0];
    } else if (style === 'glassCannon') {
      this.maxPhase = 3;
      this.phaseThresholds = [100, 60, 30, 0];
    } else {
      this.maxPhase = 1;
      this.phaseThresholds = [100, 0];
    }
  }

  // 重写 startCombat 方法：启动Boss战并设置特殊属性
  startCombat(player, allies, enemies) {
    // 调用父类启动战斗
    super.startCombat(player, allies, enemies);

    // Boss战禁止撤退
    this.isRetreatBlocked = true;

    // 初始化阶段系统
    this.phase = 1;
    this.bossSkillCooldowns = {};
    console.log('[Boss战斗] Boss战开始！阶段上限:', this.maxPhase);

    // 获取Boss战斗风格
    var style = this.gkData.combat && this.gkData.combat.style ? this.gkData.combat.style : 'meleeBoss';

    // 获取Boss单位引用（敌人阵营的第一个单位）
    var bossUnit = this.enemyUnits && this.enemyUnits.length > 0 ? this.enemyUnits[0] : null;

    if (style === 'tank') {
      // 村长风格：高防御、每回合自愈、2阶段
      console.log('[Boss战斗] 风格: tank（村长）');
      if (bossUnit) {
        bossUnit.defense = (bossUnit.defense || 5) * 2;
        bossUnit.bossRegen = true;
      }
    } else if (style === 'glassCannon') {
      // 守夜人风格：高暴击、3阶段、阶段转换强化
      console.log('[Boss战斗] 风格: glassCannon（守夜人）');
      if (bossUnit) {
        bossUnit.critRate = (bossUnit.critRate || 10) + 20;
        bossUnit.critMultiplier = (bossUnit.critMultiplier || 2) * 1.5;
      }
    } else if (style === 'meleeBoss') {
      // 机械守卫风格：近战Boss、每3回合使用技能
      console.log('[Boss战斗] 风格: meleeBoss（机械守卫）');
      if (bossUnit) {
        bossUnit.bossSkillInterval = 3;
        bossUnit.bossSkillTurnCount = 0;
      }
    }
  }

  // 检查Boss当前阶段是否需要转换
  checkPhaseTransition(bossUnit) {
    if (!bossUnit || !bossUnit.maxHp || bossUnit.maxHp <= 0) return false;
    var hpPercent = Math.floor((bossUnit.hp / bossUnit.maxHp) * 100);

    // 检查是否降到了下一阶段的阈值以下
    if (this.phase < this.maxPhase) {
      var nextThreshold = this.phaseThresholds[this.phase];
      if (hpPercent <= nextThreshold) {
        this.phase = this.phase + 1;
        this.onPhaseChange(this.phase, bossUnit);
        return true;
      }
    }
    return false;
  }

  // 阶段转换时的处理
  onPhaseChange(newPhase, bossUnit) {
    var style = this.gkData.combat && this.gkData.combat.style ? this.gkData.combat.style : 'meleeBoss';
    var msg = bossUnit.name + ' 进入阶段 ' + newPhase + '！';
    console.log('[Boss战斗]', msg);
    this.combatLog.push(msg);
    this.dispatchUpdate(msg);

    // 守夜人特殊阶段强化
    if (style === 'glassCannon') {
      if (newPhase === 2) {
        // 阶段2：暴击率+20%
        bossUnit.critRate = (bossUnit.critRate || 10) + 20;
        var critMsg = bossUnit.name + ' 的暴击率提升了！';
        this.combatLog.push(critMsg);
        this.dispatchUpdate(critMsg);
      } else if (newPhase === 3) {
        // 阶段3：攻击力+50%
        bossUnit.attack = Math.floor((bossUnit.attack || 10) * 1.5);
        var atkMsg = bossUnit.name + ' 的攻击力大幅提升！';
        this.combatLog.push(atkMsg);
        this.dispatchUpdate(atkMsg);
      }
    }
  }

  // 重写 processTurn：在处理回合时检查Boss阶段转换和自愈
  processTurn() {
    if (!this.battleActive) return;

    // 在每个回合开始前检查Boss阶段转换
    var bossUnit = this.enemyUnits && this.enemyUnits.length > 0 ? this.enemyUnits[0] : null;
    if (bossUnit && bossUnit.alive && bossUnit.hp > 0) {
      this.checkPhaseTransition(bossUnit);

      // 村长风格：每回合自愈
      var style = this.gkData.combat && this.gkData.combat.style ? this.gkData.combat.style : 'meleeBoss';
      if (style === 'tank' && bossUnit.bossRegen) {
        var regenAmount = Math.max(1, Math.floor(bossUnit.maxHp * 0.03));
        var beforeHp = bossUnit.hp;
        bossUnit.hp = Math.min(bossUnit.hp + regenAmount, bossUnit.maxHp);
        var actualRegen = bossUnit.hp - beforeHp;
        if (actualRegen > 0) {
          var regenMsg = bossUnit.name + ' 自愈恢复了 ' + actualRegen + ' 点HP！';
          this.combatLog.push(regenMsg);
          this.dispatchUpdate(regenMsg);
        }
      }
    }

    // 调用父类的回合处理
    super.processTurn();
  }

  // Boss特殊技能冷却检查
  canUseBossSkill(skillId) {
    var cd = this.bossSkillCooldowns && this.bossSkillCooldowns[skillId] ? this.bossSkillCooldowns[skillId] : 0;
    return cd <= 0;
  }

  // 设置Boss技能冷却
  setBossSkillCooldown(skillId, turns) {
    this.bossSkillCooldowns[skillId] = turns;
  }

  // 减少Boss技能冷却
  tickBossSkillCooldowns() {
    for (var skillId in this.bossSkillCooldowns) {
      if (this.bossSkillCooldowns[skillId] > 0) {
        this.bossSkillCooldowns[skillId] = this.bossSkillCooldowns[skillId] - 1;
      }
    }

    // 【Bug1修复】嘲讽debuff/defense buff的回合递减与恢复
    // 原问题：嘲讽技能给 targets 设置 _taunted=2 并降低 attack 20%，
    // 给 boss 设置 _tauntDefBuff=2 并增加 defense，但没有任何地方递减这些标记和恢复属性，
    // 导致攻击力降低和防御力提升永久存在。
    // 修复：每回合（在此处随 nextTurn 调用）递减标记，到0时恢复原始属性。

    // 1) 递减玩家和随从的 _taunted 标记，到0时恢复原始 attack
    var tauntTargets = [this.playerUnit].concat(this.allyUnits);
    for (var ti = 0; ti < tauntTargets.length; ti++) {
      var u = tauntTargets[ti];
      if (u && u._taunted && u._taunted > 0) {
        u._taunted = u._taunted - 1;
        if (u._taunted <= 0) {
          u._taunted = 0;
          // 恢复原始 attack（嘲讽期间可能因其他逻辑变动，这里以保存的 _originalAttack 为准）
          if (typeof u._originalAttack !== 'undefined') {
            u.attack = u._originalAttack;
            delete u._originalAttack;
          }
          var recoverMsg = (u.name || '单位') + ' 的嘲讽影响消散，攻击力恢复了。';
          this.combatLog.push(recoverMsg);
          this.dispatchUpdate(recoverMsg);
        }
      }
    }

    // 2) 递减 Boss 的 _tauntDefBuff 标记，到0时恢复原始 defense
    var bossUnit = this.enemyUnits && this.enemyUnits.length > 0 ? this.enemyUnits[0] : null;
    if (bossUnit && bossUnit._tauntDefBuff && bossUnit._tauntDefBuff > 0) {
      bossUnit._tauntDefBuff = bossUnit._tauntDefBuff - 1;
      if (bossUnit._tauntDefBuff <= 0) {
        bossUnit._tauntDefBuff = 0;
        // 恢复原始 defense
        if (typeof bossUnit._originalDefense !== 'undefined') {
          bossUnit.defense = bossUnit._originalDefense;
          delete bossUnit._originalDefense;
        }
        var defRecoverMsg = (bossUnit.name || 'Boss') + ' 的防御增益消退了。';
        this.combatLog.push(defRecoverMsg);
        this.dispatchUpdate(defRecoverMsg);
      }
    }
  }

  // 重写 nextTurn：额外处理Boss技能冷却递减
  nextTurn() {
    // 【Bug2修复】连斩技能需要连续两次同步攻击，但 executeAction 内部每次都会调用 nextTurn。
    // 通过 _skipNextTurn 标记让第一次攻击后的 nextTurn 被跳过，从而保证只在第二次攻击结束后
    // 才推进回合，避免双重推进导致的回合混乱。
    if (this._skipNextTurn) {
      this._skipNextTurn = false;
      return;
    }
    this.tickBossSkillCooldowns();
    super.nextTurn();
  }

  // ========== 重写敌人回合：Boss特殊技能AI ==========
  enemyTurn(unit) {
    if (!this.battleActive || !unit.alive) {
      this.nextTurn();
      return;
    }

    var style = this.gkData.combat && this.gkData.combat.style ? this.gkData.combat.style : 'meleeBoss';
    var targets = [this.playerUnit].concat(this.allyUnits).filter(function(u) { return u.alive && u.hp > 0; });
    if (targets.length === 0) {
      this.nextTurn();
      return;
    }

    // 选择目标
    var target = this.playerUnit.alive && this.playerUnit.hp > 0 ? this.playerUnit : targets[0];

    // ===== 村长AI（tank）：嘲讽/治疗/重击轮转 =====
    if (style === 'tank') {
      this._tankBossAI(unit, targets, target);
      return;
    }

    // ===== 守夜人AI（glassCannon）：暗袭/连斩/弱点打击 =====
    if (style === 'glassCannon') {
      this._glassCannonBossAI(unit, targets, target);
      return;
    }

    // ===== 机械守卫AI（meleeBoss）：蓄力重击/护盾/群体攻击 =====
    if (style === 'meleeBoss') {
      this._meleeBossAI(unit, targets, target);
      return;
    }

    // 默认：普通攻击
    this.executeAction(unit, 'attack', target);
  }

  // ===== 村长技能AI =====
  _tankBossAI(boss, targets, primaryTarget) {
    var self = this;
    var bossHpPct = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;

    // 技能1：嘲讽（CD 5回合）— 下2回合所有敌人强制攻击Boss
    if (this.canUseBossSkill('taunt') && Math.random() < 0.3) {
      this.setBossSkillCooldown('taunt', 5);
      var tauntMsg = boss.name + ' 发出挑衅的战吼！你的攻击会被吸引。';
      this.combatLog.push(tauntMsg);
      this.dispatchUpdate(tauntMsg);
      // 嘲讽标记：玩家和随从下2回合攻击力-20%（模拟被嘲讽后慌乱）
      for (var ti = 0; ti < targets.length; ti++) {
        targets[ti]._taunted = 2;
        if (targets[ti].attack) {
          // 【Bug1修复】保存原始attack到 _originalAttack，以便嘲讽结束后恢复
          // 仅在尚未保存时记录，避免重复嘲讽覆盖原始值
          if (typeof targets[ti]._originalAttack === 'undefined') {
            targets[ti]._originalAttack = targets[ti].attack;
          }
          targets[ti].attack = Math.max(1, Math.floor(targets[ti].attack * 0.8));
        }
      }
      // Boss防御+50%持续2回合
      boss._tauntDefBuff = 2;
      // 【Bug1修复】保存原始defense到 _originalDefense，以便嘲讽结束后恢复
      // 仅在尚未保存时记录，避免重复嘲讽覆盖原始值
      if (typeof boss._originalDefense === 'undefined') {
        boss._originalDefense = boss.defense || 5;
      }
      boss.defense = (boss.defense || 5) + Math.floor(boss.defense * 0.5);
      this.nextTurn();
      return;
    }

    // 技能2：强力治疗（CD 6回合）— 恢复15%最大HP
    if (this.canUseBossSkill('heal') && bossHpPct < 0.7 && Math.random() < 0.4) {
      this.setBossSkillCooldown('heal', 6);
      var healAmt = Math.max(1, Math.floor(boss.maxHp * 0.15));
      var before = boss.hp;
      boss.hp = Math.min(boss.maxHp, boss.hp + healAmt);
      var actual = boss.hp - before;
      var healMsg = boss.name + ' 使用了治疗术，恢复 ' + actual + ' 点HP！';
      this.combatLog.push(healMsg);
      this.dispatchUpdate(healMsg);
      this.nextTurn();
      return;
    }

    // 技能3：铁壁（CD 8回合）— 本回合防御翻倍
    if (this.canUseBossSkill('ironWall') && bossHpPct < 0.4) {
      this.setBossSkillCooldown('ironWall', 8);
      this.defenseBoosts[boss.id] = (this.defenseBoosts[boss.id] || 0) + Math.floor(boss.defense * 0.5);
      var wallMsg = boss.name + ' 举起重盾，进入铁壁防御姿态！';
      this.combatLog.push(wallMsg);
      this.dispatchUpdate(wallMsg);
      this.nextTurn();
      return;
    }

    // 阶段2特殊：重击（50%概率，1.5倍伤害）
    if (this.phase >= 2 && Math.random() < 0.5) {
      var origAtk = boss.attack;
      boss.attack = Math.floor(boss.attack * 1.5);
      var heavyMsg = boss.name + ' 蓄力后挥出重击！';
      this.combatLog.push(heavyMsg);
      this.dispatchUpdate(heavyMsg);
      this.executeAction(boss, 'attack', primaryTarget);
      boss.attack = origAtk;
      return;
    }

    // 默认攻击
    this.executeAction(boss, 'attack', primaryTarget);
  }

  // ===== 守夜人技能AI =====
  _glassCannonBossAI(boss, targets, primaryTarget) {
    // 技能1：暗袭（CD 4回合）— 对HP最低的目标造成1.8倍伤害
    if (this.canUseBossSkill('ambush') && Math.random() < 0.35) {
      this.setBossSkillCooldown('ambush', 4);
      var weakest = targets.reduce(function(min, u) { return u.hp < min.hp ? u : min; }, targets[0]);
      var origAtk = boss.attack;
      boss.attack = Math.floor(boss.attack * 1.8);
      var ambushMsg = boss.name + ' 从暗影中发动突袭，锁定 ' + weakest.name + '！';
      this.combatLog.push(ambushMsg);
      this.dispatchUpdate(ambushMsg);
      this.executeAction(boss, 'attack', weakest);
      boss.attack = origAtk;
      return;
    }

    // 技能2：连斩（CD 5回合）— 连续攻击2次
    if (this.canUseBossSkill('doubleStrike') && Math.random() < 0.25) {
      this.setBossSkillCooldown('doubleStrike', 5);
      var dsMsg = boss.name + ' 拔刀连斩！';
      this.combatLog.push(dsMsg);
      this.dispatchUpdate(dsMsg);
      // 【Bug2修复】原实现用 setTimeout 延迟第二次攻击，但第一次 executeAction 内部已经调用
      // 了 nextTurn()，会先推进回合；而第二次若在 setTimeout 中也调用 nextTurn，会导致双重推进，
      // 且 setTimeout 异步执行时回合/战斗状态可能已改变，造成逻辑混乱（例如连斩只打出一次、
      // 或回合计数错位）。
      // 修复方案：改为同一同步流程执行两次攻击。设置 _skipNextTurn = true，使第一次 executeAction
      // 内部调用的 nextTurn 被跳过（见本类重写的 nextTurn）；仅当第二次攻击确实执行后，由其内部
      // 的 nextTurn 正常推进回合。若第一次攻击后战斗已结束或目标已死亡，则恢复 _skipNextTurn
      // 并主动调用 nextTurn 推进。
      this._skipNextTurn = true;
      // 第一次攻击
      this.executeAction(boss, 'attack', primaryTarget);
      // 第一次攻击后若战斗已结束（executeAction 可能已调用 checkBattleEnd 触发 endCombat），
      // 直接返回，避免继续执行；同时清掉遗留标记。
      if (!this.battleActive) {
        this._skipNextTurn = false;
        return;
      }
      // 如果目标仍存活，发起第二次攻击（此时 _skipNextTurn 仍为 true，但第二次 executeAction
      // 内部调用的 nextTurn 会清掉标记并正常推进回合，符合"两次攻击共用一次回合推进"的预期）
      if (primaryTarget.alive && primaryTarget.hp > 0) {
        this.executeAction(boss, 'attack', primaryTarget);
      } else {
        // 目标已死：手动推进一次回合（吞掉第一次的标记）
        this._skipNextTurn = false;
        this.nextTurn();
      }
      return;
    }

    // 技能3：弱点打击（CD 6回合）— 降低目标防御30%
    if (this.canUseBossSkill('weaknessStrike') && Math.random() < 0.3) {
      this.setBossSkillCooldown('weaknessStrike', 6);
      var weakTarget = targets.reduce(function(min, u) { return u.hp < min.hp ? u : min; }, targets[0]);
      if (weakTarget.defense) {
        weakTarget.defense = Math.max(1, Math.floor(weakTarget.defense * 0.7));
      }
      var weakMsg = boss.name + ' 击中 ' + weakTarget.name + ' 的弱点，防御降低！';
      this.combatLog.push(weakMsg);
      this.dispatchUpdate(weakMsg);
      this.executeAction(boss, 'attack', weakTarget);
      return;
    }

    // 阶段2+特殊：暴风斩（CD 7回合）— AOE对所有目标造成0.6倍伤害
    if (this.phase >= 2 && this.canUseBossSkill('whirlwind') && Math.random() < 0.3) {
      this.setBossSkillCooldown('whirlwind', 7);
      var aoeDmg = Math.max(1, Math.floor((boss.attack || 10) * 0.6));
      var wwMsg = boss.name + ' 释放暴风斩！';
      this.combatLog.push(wwMsg);
      this.dispatchUpdate(wwMsg);
      for (var wi = 0; wi < targets.length; wi++) {
        if (targets[wi].alive && targets[wi].hp > 0) {
          targets[wi].hp = Math.max(0, targets[wi].hp - aoeDmg);
          var hitMsg = targets[wi].name + ' 受到 ' + aoeDmg + ' 点AOE伤害';
          this.combatLog.push(hitMsg);
          this.dispatchUpdate(hitMsg);
          if (targets[wi].hp <= 0) {
            targets[wi].alive = false;
            var killMsg = targets[wi].name + ' 倒下了';
            this.combatLog.push(killMsg);
            this.dispatchUpdate(killMsg);
          }
        }
      }
      if (this.checkBattleEnd()) return;
      this.nextTurn();
      return;
    }

    // 默认攻击（守夜人优先攻击HP最低的）
    var weakT = targets.reduce(function(min, u) { return u.hp < min.hp ? u : min; }, targets[0]);
    this.executeAction(boss, 'attack', weakT);
  }

  // ===== 机械守卫技能AI =====
  _meleeBossAI(boss, targets, primaryTarget) {
    // 递增回合计数
    boss.bossSkillTurnCount = (boss.bossSkillTurnCount || 0) + 1;

    // 技能1：蓄力重击（每3回合）— 2倍伤害
    if (boss.bossSkillTurnCount % 3 === 0) {
      var origAtk = boss.attack;
      boss.attack = Math.floor(boss.attack * 2);
      var chargeMsg = boss.name + ' 的机械臂蓄力完毕，发动重击！';
      this.combatLog.push(chargeMsg);
      this.dispatchUpdate(chargeMsg);
      this.executeAction(boss, 'attack', primaryTarget);
      boss.attack = origAtk;
      return;
    }

    // 技能2：护盾修复（HP<50%且CD就绪时）
    if (this.canUseBossSkill('shieldRepair') && boss.hp < boss.maxHp * 0.5) {
      this.setBossSkillCooldown('shieldRepair', 8);
      var repairAmt = Math.max(1, Math.floor(boss.maxHp * 0.1));
      var before = boss.hp;
      boss.hp = Math.min(boss.maxHp, boss.hp + repairAmt);
      var actual = boss.hp - before;
      var repairMsg = boss.name + ' 启动自我修复程序，恢复 ' + actual + ' 点HP！';
      this.combatLog.push(repairMsg);
      this.dispatchUpdate(repairMsg);
      this.nextTurn();
      return;
    }

    // 技能3：震地（CD 6回合）— 对所有目标造成0.8倍伤害+减速1回合
    if (this.canUseBossSkill('groundSlam') && Math.random() < 0.25) {
      this.setBossSkillCooldown('groundSlam', 6);
      var slamDmg = Math.max(1, Math.floor((boss.attack || 10) * 0.8));
      var slamMsg = boss.name + ' 重重踏地，大地震颤！';
      this.combatLog.push(slamMsg);
      this.dispatchUpdate(slamMsg);
      for (var si = 0; si < targets.length; si++) {
        if (targets[si].alive && targets[si].hp > 0) {
          targets[si].hp = Math.max(0, targets[si].hp - slamDmg);
          // 施加减速
          this.applyStatusEffect(targets[si], 'slow', boss, 1);
          var hitMsg = targets[si].name + ' 受到 ' + slamDmg + ' 点伤害并被减速';
          this.combatLog.push(hitMsg);
          this.dispatchUpdate(hitMsg);
          if (targets[si].hp <= 0) {
            targets[si].alive = false;
            var killMsg = targets[si].name + ' 倒下了';
            this.combatLog.push(killMsg);
            this.dispatchUpdate(killMsg);
          }
        }
      }
      if (this.checkBattleEnd()) return;
      this.nextTurn();
      return;
    }

    // 默认攻击
    this.executeAction(boss, 'attack', primaryTarget);
  }

  // 设置击败回调函数
  setDefeatCallback(callback) {
    this.defeatCallback = callback;
  }

  // 重写 endCombat：处理守门员击败逻辑
  endCombat(result) {
    // 增加挑战次数
    var state = window.gameApp && window.gameApp.state ? window.gameApp.state : null;
    if (state && state.world && state.world.gatekeepers && state.world.gatekeepers[this.bossId]) {
      state.world.gatekeepers[this.bossId].attempts++;
    }

    // Boss战失败特殊处理：送回酒馆（不消耗复活次数）
    if (result === 'player_defeat' && state) {
      state.player.hp = 1;
      state.player.mp = 0;
      state.player.location = '灰烟村·酒馆';
      var bossDefeatMsg = this.gkData && this.gkData.name ? this.gkData.name + ' 将你击倒，送回了酒馆。' : '你被Boss击败，送回了酒馆。';
      this.combatLog.push(bossDefeatMsg);
    }

    // Boss战平局特殊处理（GDD：退回安全帧，HP=1，MP=0，损失金币）
    if (result === 'timeout' && state) {
      state.player.hp = 1;
      state.player.mp = 0;
      var goldLoss = Math.floor(state.player.gold * 0.05);
      state.player.gold = Math.max(0, state.player.gold - goldLoss);
      var timeoutMsg = 'Boss战超时！你精疲力竭，被送回安全区域。损失 ' + goldLoss + ' 金币。';
      this.combatLog.push(timeoutMsg);
    }

    // Boss战胜利：调用击败回调，解锁区域，发放特殊奖励
    if (result === 'player_victory') {
      if (this.defeatCallback) {
        this.defeatCallback(this);
      }
    }

    // 标记跳过父类的handleDeath（Boss战已自行处理死亡逻辑）
    this._bossHandledDeath = (result === 'player_defeat' || result === 'timeout');

    // 调用父类的结束战斗逻辑（同步HP/MP、派发事件）
    super.endCombat(result);
  }

  // 重写 calculateRewards：Boss掉落100%装备 + 守门员经验
  calculateRewards() {
    // 调用父类计算基础奖励
    var rewards = super.calculateRewards ? super.calculateRewards() : { exp: 0, gold: 0, drops: [], equipmentDrops: [] };

    // Boss战额外经验加成（实际发放给玩家与队友）
    var bossLevel = this.gkData && this.gkData.level ? this.gkData.level : 20;
    var bonusExp = Math.floor(bossLevel * 50);
    if (bonusExp > 0 && window.gameApp && window.gameApp.state) {
      var bstate = window.gameApp.state;
      StateUtils.addExp(bstate, bonusExp);
      if (bstate.companions && bstate.companions.length > 0 && typeof CompanionSystem !== 'undefined' && CompanionSystem) {
        bstate.companions.forEach(function(c) {
          if (!c) return;
          CompanionSystem.addExp(c, bonusExp, bstate);
        });
      }
    }
    rewards.exp = (rewards.exp || 0) + bonusExp;

    // 守门员特殊奖励物品
    var rewardName = this.gkData && this.gkData.reward ? this.gkData.reward : null;
    if (rewardName && window.gameApp && window.gameApp.state) {
      var rewardItem = {
        id: Utils && Utils.uuid ? Utils.uuid() : ('reward_' + Date.now()),
        name: rewardName,
        type: 'quest',
        rarity: 'orange',
        level: bossLevel,
        stack: 1,
      };
      StateUtils.addToInventory(window.gameApp.state, rewardItem);
      rewards.gatekeeperReward = rewardItem;
      var rewardMsg = '获得守门员奖励：' + rewardName;
      this.combatLog.push(rewardMsg);
      console.log('[Boss战斗]', rewardMsg);
    }

    return rewards;
  }
}

// ============================================
// 多波次Boss战斗引擎
// ============================================
// 继承 BossCombatEngine，支持2-4波敌人独立回合
// 每波有自己的敌人列表，击败当前波后进入下一波
// 玩家HP/MP在波次间不恢复，但每波之间有短暂喘息
// ============================================
class MultiWaveBossCombatEngine extends BossCombatEngine {
  // 【Bug3修复】原构造函数为 constructor(bossId, waveConfigs) 且调用 super(bossId)，
  // 会丢失 gkData（虽然 BossCombatEngine 内部会自行从 DATA 查找，但为了与 triggerBossBattle
  // 传入的 gkData 保持一致，并确保子类能正确访问 this.gkData，改为接收 gkData 并透传给父类）。
  constructor(bossId, gkData, waveConfigs) {
    super(bossId, gkData);
    this.waveConfigs = waveConfigs || []; // [{enemies: [...], intro: '...', perWaveRounds: 30}]
    this.currentWave = 0;
    this.totalWaves = waveConfigs ? waveConfigs.length : 1;
    this.isMultiWave = this.totalWaves > 1;
    this.waveRewards = []; // 每波的奖励累积
  }

  // 重写 startCombat：启动第一波
  startCombat(player, allies, enemies) {
    // 如果是第一波，正常启动；否则忽略传入的enemies，使用波次配置
    if (this.currentWave === 0) {
      // 将波次配置存起来
      this._playerRef = player;
      this._alliesRef = allies;

      // 获取第一波敌人
      var waveEnemies = this.getWaveEnemies(0);
      super.startCombat(player, allies, waveEnemies);
      this.currentWave = 1;

      // 显示波次信息
      if (this.isMultiWave) {
        var waveMsg = '=== 第 1 波 / 共 ' + this.totalWaves + ' 波 ===';
        this.combatLog.push(waveMsg);
        this.dispatchUpdate(waveMsg);
      }
    }
  }

  // 获取指定波次的敌人数据
  getWaveEnemies(waveIndex) {
    var config = this.waveConfigs[waveIndex];
    if (!config || !config.enemies) {
      console.error('[多波Boss] 波次配置缺失:', waveIndex);
      return [];
    }
    return config.enemies;
  }

  // 重写 endCombat：拦截胜利，检查是否还有下一波
  endCombat(result) {
    if (result === 'player_victory' && this.isMultiWave && this.currentWave < this.totalWaves) {
      // 还有下一波：不结束战斗，启动下一波
      console.log('[多波Boss] 第 ' + this.currentWave + ' 波击败，准备第 ' + (this.currentWave + 1) + ' 波');
      this.startNextWave();
      return;
    }

    // 最后一波胜利或失败/超时：正常结束
    if (result === 'player_victory' && this.isMultiWave) {
      // 合并所有波次的奖励
      this.combatLog.push('=== 全部 ' + this.totalWaves + ' 波击败！ ===');
    }

    super.endCombat(result);
  }

  // 启动下一波
  startNextWave() {
    var self = this;
    this.currentWave++;

    // 波次间喘息：显示提示
    var waveIntro = this.waveConfigs[this.currentWave - 1] && this.waveConfigs[this.currentWave - 1].intro;
    if (waveIntro) {
      this.combatLog.push(waveIntro);
      this.dispatchUpdate(waveIntro);
    }

    var waveMsg = '=== 第 ' + this.currentWave + ' 波 / 共 ' + this.totalWaves + ' 波 ===';
    this.combatLog.push(waveMsg);
    this.dispatchUpdate(waveMsg);

    // 延迟启动下一波（给玩家看到波次提示）
    setTimeout(function() {
      // 获取下一波敌人
      var waveEnemies = self.getWaveEnemies(self.currentWave - 1);
      if (waveEnemies.length === 0) {
        console.error('[多波Boss] 下一波没有敌人，直接胜利');
        self.endCombat('player_victory');
        return;
      }

      // 重置战斗状态但保留HP/MP
      self.enemyUnits = waveEnemies.map(function(e) { return self.normalizeUnit(e, 'enemy'); });
      self.allUnits = [self.playerUnit].concat(self.allyUnits).concat(self.enemyUnits);
      self.round = 1;
      self.currentTurnIndex = 0;
      self.defenseBoosts = {};
      self.selectedTarget = null;
      // 注意：不重置cooldowns，技能冷却在波次间继续

      // 每波独立回合数限制
      var waveConfig = self.waveConfigs[self.currentWave - 1];
      if (waveConfig && waveConfig.perWaveRounds) {
        self.maxRounds = waveConfig.perWaveRounds;
      }

      // 重新计算行动顺序
      self.calculateTurnOrder();

      // Boss阶段重置（如果每波有不同Boss）
      var bossUnit = self.enemyUnits && self.enemyUnits.length > 0 ? self.enemyUnits[0] : null;
      if (bossUnit && bossUnit.type === 'boss') {
        self.phase = 1;
        self.bossSkillCooldowns = {};
      }

      // 派发更新事件让UI刷新
      var refreshEvent = new CustomEvent('combat-start', { detail: { combat: self } });
      document.dispatchEvent(refreshEvent);

      self.battleActive = true;
      self.processTurn();
    }, 1500);
  }

  // 重写 calculateRewards：合并所有波次奖励
  calculateRewards() {
    // 父类计算最后一波的奖励
    var rewards = super.calculateRewards();

    // 多波次额外经验加成
    if (this.isMultiWave) {
      var waveBonus = Math.floor((rewards.exp || 0) * (this.totalWaves - 1) * 0.5);
      rewards.exp = (rewards.exp || 0) + waveBonus;
      this.combatLog.push('多波次挑战加成经验 +' + waveBonus);
    }

    return rewards;
  }
}
