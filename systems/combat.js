/**
 * 寻亲风云录 - 回合制战斗引擎（重构版）
 * 支持：速度排序、多动机制、技能目标判定、战场药水、30回合上限、经验共享
 */
class CombatEngine {
  constructor() {
    this.player = null;
    this.companions = [];
    this.enemies = [];
    this.combatLog = [];
    this.currentTurn = 0;
    this.maxTurns = 30;
    this.isPlayerTurn = false;
    this.turnQueue = [];
    this.active = false;
    this.statusEffects = new Map(); // unitId -> [{type, duration, value, name}]
    this.cooldowns = {}; // skillId -> remaining turns
    this.defenseBoosts = {}; // unitId -> {base, boost}
    this.selectedSkill = null;
  }

  // ========== 战斗启动 ==========
  startCombat(player, enemies, companions = []) {
    this.player = { ...player, id: 'player', isPlayer: true };
    this.companions = companions
      .filter(c => c.alive !== false)
      .map((c, i) => ({ ...c, id: c.id || `companion_${i}`, isCompanion: true, _origId: c.id }));
    this.enemies = enemies.map((e, i) => ({ ...e, id: e.id || `enemy_${i}`, isEnemy: true }));
    this.combatLog = [];
    this.currentTurn = 0;
    this.maxTurns = 30;
    this.active = true;
    this.statusEffects = new Map();
    this.cooldowns = {};
    this.defenseBoosts = {};
    this.selectedSkill = null;
    this.turnQueue = [];

    const allyNames = [this.player.name, ...this.companions.map(c => c.name)].join('、');
    this.log(`⚔️ 战斗开始！${allyNames} VS ${this.enemies.map(e => e.name).join('、')}`);

    const event = new CustomEvent('combat-start', { detail: { combat: this } });
    document.dispatchEvent(event);

    this.nextTurn();
  }

  // ========== 回合推进（含多动队列） ==========
  nextTurn() {
    if (!this.active) return;

    // 胜负判定
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
      this.endCombat('player_victory');
      return;
    }
    if (this.player.hp <= 0) {
      this.endCombat('player_defeat');
      return;
    }

    // 队列耗尽则开启新回合
    if (!this.turnQueue || this.turnQueue.length === 0) {
      if (this.currentTurn >= this.maxTurns) {
        this.endCombat('timeout');
        return;
      }
      this.log(`—— 第 ${this.currentTurn + 1} 回合 ——`);
      this.turnQueue = this._buildTurnQueue();
      this._tickCooldowns();
      this.currentTurn++;
    }

    // 依次处理队列中的单位
    while (this.turnQueue.length > 0) {
      const unit = this.turnQueue.shift();
      if (!this.active) return;
      if (!unit || unit.hp <= 0) continue;

      this.processStatusEffects(unit);
      if (unit.hp <= 0) continue;

      if (unit.isPlayer) {
        this.isPlayerTurn = true;
        const event = new CustomEvent('combat-player-turn', { detail: { combat: this } });
        document.dispatchEvent(event);
        return; // 等待玩家输入
      } else if (unit.isCompanion) {
        this.isPlayerTurn = false;
        const logBefore = this.combatLog.length;
        this.companionAction(unit);
        if (this.combatLog.length > logBefore) {
          const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
          document.dispatchEvent(event);
        }
      } else {
        this.isPlayerTurn = false;
        const logBefore = this.combatLog.length;
        this.aiAction(unit);
        if (this.combatLog.length > logBefore) {
          const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
          document.dispatchEvent(event);
        }
      }
    }

    // 本回合所有单位行动完毕
    this._endOfRound();
    setTimeout(() => this.nextTurn(), 300);
  }

  // ========== 多动队列构建 ==========
  _buildTurnQueue() {
    const aliveCompanions = this.companions.filter(c => c.hp > 0);
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const allUnits = [this.player, ...aliveCompanions, ...aliveEnemies].filter(u => u && u.hp > 0);
    if (allUnits.length === 0) return [];

    const slowestSpeed = Math.min(...allUnits.map(u => u.speed || 5));
    const safeSlowest = slowestSpeed > 0 ? slowestSpeed : 1;

    const unitActions = allUnits.map(u => {
      const actions = Math.max(1, Math.floor((u.speed || 5) / safeSlowest));
      return { unit: u, actions };
    });

    const maxActions = Math.max(...unitActions.map(ua => ua.actions), 1);
    const queue = [];
    for (let slot = 1; slot <= maxActions; slot++) {
      const slotUnits = unitActions
        .filter(ua => ua.actions >= slot)
        .map(ua => ua.unit)
        .sort((a, b) => (b.speed || 5) - (a.speed || 5));
      queue.push(...slotUnits);
    }
    return queue;
  }

  _tickCooldowns() {
    for (const skillId in this.cooldowns) {
      if (this.cooldowns[skillId] > 0) {
        this.cooldowns[skillId]--;
      }
    }
  }

  _endOfRound() {
    // 清除防御姿态（仅持续一回合）
    if (this.player && this.player.defending) {
      delete this.player.defending;
      if (this.player._baseDefense !== undefined) {
        this.player.defense = this.player._baseDefense;
        delete this.player._baseDefense;
        delete this.player._defenseBuff;
      }
    }
    for (const comp of this.companions) {
      if (comp.defending) {
        delete comp.defending;
        if (comp._baseDefense !== undefined) {
          comp.defense = comp._baseDefense;
          delete comp._baseDefense;
          delete comp._defenseBuff;
        }
      }
    }
  }

  // ========== 玩家行动入口 ==========
  selectSkill(skillId) {
    this.selectedSkill = skillId;
  }

  playerAction(action, target) {
    if (!this.isPlayerTurn || !this.active) return;
    this.isPlayerTurn = false;

    switch (action) {
      case 'attack':
        this.performAttack(this.player, target);
        break;
      case 'skill':
        this.performSkill(this.player, target);
        break;
      case 'defend':
        this.performDefend(this.player);
        break;
      case 'item':
        this.performItem(this.player, target);
        break;
      default:
        this.performAttack(this.player, this.getFirstAliveEnemy());
    }

    const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
    document.dispatchEvent(event);

    setTimeout(() => this.nextTurn(), 400);
  }

  // ========== 普通攻击 ==========
  performAttack(attacker, defender) {
    if (!defender || defender.hp <= 0) {
      defender = attacker.isPlayer ? this.getFirstAliveEnemy() : this.player;
      if (!defender) return;
    }

    const hitChance = this.calculateHitChance(attacker, defender);
    if (Math.random() > hitChance) {
      this.log(`${attacker.name} 的攻击被 ${defender.name} 闪避了！`);
      return;
    }

    let damage = this.calculateDamage(attacker, defender, 'physical');

    const critRate = attacker.critRate || 0.05;
    if (Math.random() < critRate) {
      const critDmg = attacker.critDmg || 1.5;
      damage = Math.floor(damage * critDmg);
      this.log(`💥 ${attacker.name} 对 ${defender.name} 造成暴击 ${damage} 点伤害！`);
    } else {
      this.log(`${attacker.name} 对 ${defender.name} 造成 ${damage} 点伤害。`);
    }

    defender.hp -= damage;
    if (defender.hp <= 0) {
      defender.hp = 0;
      this.log(`${defender.name} 倒下了！`);
    }
  }

  // ========== 技能释放 ==========
  performSkill(attacker, target) {
    // 确定使用哪个技能
    let skillId = this.selectedSkill;
    let skill = null;
    if (skillId && DATA.skills && DATA.skills[skillId]) {
      skill = DATA.skills[skillId];
    } else if (attacker.skills && attacker.skills.length > 0) {
      for (const sid of attacker.skills) {
        let s = null;
        let sidStr = null;
        if (typeof sid === 'string') {
          s = DATA.skills[sid];
          sidStr = sid;
        } else if (sid && typeof sid === 'object') {
          s = DATA.skills[sid.id] || sid;
          sidStr = sid.id;
        }
        if (s && s.type === 'active' && (attacker.mp >= (s.cost && s.cost.mp ? s.cost.mp : 0)) && (!this.cooldowns[sidStr] || this.cooldowns[sidStr] <= 0)) {
          skill = s;
          skillId = sidStr;
          break;
        }
      }
    }
    if (!skill) {
      skill = DATA.skills.normal_attack;
      skillId = 'normal_attack';
    }
    this.selectedSkill = null; // 消耗选择

    // 目标校验
    target = this._validateSkillTarget(skill, attacker, target);
    if (!target) {
      this.log(`${attacker.name} 找不到有效的目标`);
      return;
    }

    // 扣除 MP
    const mpCost = skill.cost && skill.cost.mp ? skill.cost.mp : 0;
    if (attacker.mp < mpCost) {
      this.log(`${attacker.name} 法力不足，无法使用 ${skill.name}`);
      return;
    }
    attacker.mp -= mpCost;

    // 设置冷却
    const cooldown = skill.cooldown || 0;
    if (cooldown > 0 && skillId) {
      this.cooldowns[skillId] = cooldown;
    }

    const effect = skill.effect || {};

    // 伤害类技能
    if (effect.dmgMultiplier && effect.dmgMultiplier > 0) {
      const dmgType = effect.dmgType || 'physical';
      let damage = this.calculateDamage(attacker, target, dmgType);
      damage = Math.floor(damage * effect.dmgMultiplier);
      damage = Math.max(1, damage);

      const critRate = attacker.critRate || 0.05;
      if (Math.random() < critRate) {
        const critDmg = attacker.critDmg || 1.5;
        damage = Math.floor(damage * critDmg);
        this.log(`💥 ${attacker.name} 对 ${target.name} 释放 ${skill.name}，造成暴击 ${damage} 点${DATA.damageTypes && DATA.damageTypes[dmgType] ? DATA.damageTypes[dmgType].name : ''}伤害！`);
      } else {
        this.log(`✨ ${attacker.name} 对 ${target.name} 释放 ${skill.name}，造成 ${damage} 点${DATA.damageTypes && DATA.damageTypes[dmgType] ? DATA.damageTypes[dmgType].name : ''}伤害！`);
      }

      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        this.log(`${target.name} 倒下了！`);
      }

      // 附加异常状态
      if (effect.applyStatus && target.hp > 0) {
        this.addStatusEffect(target.id, {
          type: effect.applyStatus,
          duration: effect.statusDuration || 2,
          value: attacker.attack || attacker.physAtk || 10,
          name: DATA.damageTypes && DATA.damageTypes[dmgType] ? DATA.damageTypes[dmgType].statusName : effect.applyStatus
        });
      }
      return;
    }

    // 治疗类技能
    if (effect.healMultiplier && effect.healMultiplier > 0) {
      const healBase = attacker.magAtk || (attacker.int ? attacker.int * 2 : 10);
      const healAmount = Math.floor(healBase * effect.healMultiplier);
      const beforeHp = target.hp || 0;
      target.hp = Math.min(target.maxHp || target.hp, beforeHp + healAmount);
      const actualHeal = (target.hp || 0) - beforeHp;
      this.log(`💚 ${attacker.name} 使用 ${skill.name}，为 ${target.name} 恢复 ${actualHeal} HP`);
      return;
    }

    // 防御增益
    if (effect.physDefBoost && effect.physDefBoost > 0) {
      if (!attacker._baseDefense) attacker._baseDefense = attacker.defense || 0;
      const boost = Math.floor(attacker._baseDefense * effect.physDefBoost);
      attacker.defense = (attacker.defense || 0) + boost;
      this.log(`🛡️ ${attacker.name} 使用 ${skill.name}，防御力提升 ${Math.floor(effect.physDefBoost * 100)}%`);
      return;
    }

    this.log(`${attacker.name} 使用 ${skill.name}`);
  }

  _validateSkillTarget(skill, attacker, target) {
    if (!target || target.hp <= 0) target = null;
    const skillTarget = skill.target || 'enemy';

    if (skillTarget === 'enemy') {
      if (!target || !target.isEnemy) {
        return this.getFirstAliveEnemy();
      }
      return target;
    }
    if (skillTarget === 'self') {
      return attacker;
    }
    if (skillTarget === 'ally') {
      if (!target || target.isEnemy) {
        return attacker;
      }
      return target;
    }
    return target || this.getFirstAliveEnemy();
  }

  // ========== 防御 ==========
  performDefend(attacker) {
    this.log(`${attacker.name} 举起武器防御！`);
    attacker.defending = true;
    if (!attacker._baseDefense) {
      attacker._baseDefense = attacker.defense || 0;
    }
    attacker._defenseBuff = Math.floor(attacker._baseDefense * 0.3);
    attacker.defense = attacker._baseDefense + attacker._defenseBuff;
  }

  // ========== 道具使用（战场药水） ==========
  performItem(user, targetOrItem) {
    let itemId = null;
    let targetUnit = null;

    if (typeof targetOrItem === 'string') {
      itemId = targetOrItem;
    } else if (targetOrItem && typeof targetOrItem === 'object') {
      if (targetOrItem.itemId) itemId = targetOrItem.itemId;
      if (targetOrItem.target) targetUnit = targetOrItem.target;
    }

    const state = window.gameApp ? window.gameApp.state : null;
    if (!state) {
      this.log(`${user.name} 无法使用物品`);
      return;
    }

    const items = state.inventory.items || [];

    // 辅助：按模板ID或subtype查找药水（库存物品id通常是UUID）
    const findPotion = (tplId, subtype) => {
      return items.find(i => i.id === tplId || i.subtype === subtype || (i.id && i.id.includes && i.id.includes(tplId)));
    };

    // 自动查找药水
    let inventoryItem = null;
    if (!itemId) {
      const healPot = findPotion('healing_potion', 'heal');
      const manaPot = findPotion('mana_potion', 'mana');
      if (user.hp < (user.maxHp || user.hp) && healPot) {
        inventoryItem = healPot;
      } else if ((user.mp || 0) < (user.maxMp || user.mp || 0) && manaPot) {
        inventoryItem = manaPot;
      } else if (healPot) {
        inventoryItem = healPot;
      } else if (manaPot) {
        inventoryItem = manaPot;
      }
    } else {
      // itemId可能是UUID或模板ID
      inventoryItem = items.find(i => i.id === itemId);
      if (!inventoryItem) {
        // 按模板ID或subtype回退查找
        if (itemId === 'healing_potion' || itemId === 'advanced_healing_potion') {
          inventoryItem = findPotion('healing_potion', 'heal');
        } else if (itemId === 'mana_potion' || itemId === 'advanced_mana_potion') {
          inventoryItem = findPotion('mana_potion', 'mana');
        }
      }
    }

    if (!inventoryItem) {
      this.log(`${user.name} 背包中没有可用的药水`);
      return;
    }

    if (!targetUnit) targetUnit = user;
    if (targetUnit.isEnemy) targetUnit = user;

    if (inventoryItem.subtype === 'heal' || inventoryItem.healHp) {
      const beforeHp = targetUnit.hp || 0;
      targetUnit.hp = Math.min(targetUnit.maxHp || targetUnit.hp, beforeHp + (inventoryItem.healHp || 0));
      const healed = (targetUnit.hp || 0) - beforeHp;
      this.log(`💚 ${user.name} 使用 ${inventoryItem.name}，${targetUnit.name} 恢复 ${healed} HP`);
    } else if (inventoryItem.subtype === 'mana' || inventoryItem.healMp) {
      const beforeMp = targetUnit.mp || 0;
      const maxMp = targetUnit.maxMp || beforeMp;
      targetUnit.mp = Math.min(maxMp, beforeMp + (inventoryItem.healMp || 0));
      const restored = (targetUnit.mp || 0) - beforeMp;
      this.log(`💙 ${user.name} 使用 ${inventoryItem.name}，${targetUnit.name} 恢复 ${restored} MP`);
    } else {
      this.log(`${user.name} 使用了 ${inventoryItem.name}`);
    }

    if (typeof InventorySystem !== 'undefined' && InventorySystem.removeFromInventory) {
      InventorySystem.removeFromInventory(state, inventoryItem.id, 1);
    } else if (typeof StateUtils !== 'undefined' && StateUtils.removeFromInventory) {
      StateUtils.removeFromInventory(state, inventoryItem.id, 1);
    }
  }

  // ========== AI 行动 ==========
  aiAction(enemy) {
    const aliveAllies = [this.player, ...this.companions.filter(c => c.hp > 0)];
    const target = aliveAllies[Utils.randInt(0, aliveAllies.length - 1)];
    const roll = Math.random();
    if (roll < 0.15 && enemy.skills && enemy.skills.length > 0) {
      const skillId = enemy.skills[0];
      const skill = DATA.skills[skillId];
      if (skill) {
        this.selectedSkill = skillId;
        this.performSkill(enemy, target);
        this.selectedSkill = null;
      } else {
        this.performAttack(enemy, target);
      }
    } else {
      this.performAttack(enemy, target);
    }
  }

  // ========== 随从行动 ==========
  companionAction(companion) {
    if (typeof CompanionSystem !== 'undefined' && CompanionSystem.decideAction) {
      const decision = CompanionSystem.decideAction(companion, this);
      if (decision) {
        if (decision.action === 'skill' && decision.skill) {
          const skillId = decision.skill.id || decision.skill;
          this.selectedSkill = skillId;
          this.performSkill(companion, decision.target);
          this.selectedSkill = null;
        } else {
          this.performAttack(companion, decision.target || this.getFirstAliveEnemy());
        }
        return;
      }
    }

    const target = this.getFirstAliveEnemy();
    if (!target) return;
    if (companion.class === 'mage' && this.player.hp < this.player.maxHp * 0.4 && Math.random() < 0.3) {
      const heal = Math.floor((companion.magAtk || (companion.int ? companion.int * 2 : 10)) * 0.8);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.log(`💚 ${companion.name} 治疗 ${this.player.name}，回复 ${heal} HP`);
    } else {
      this.performAttack(companion, target);
    }
  }

  // ========== 伤害计算 ==========
  calculateDamage(attacker, defender, type = 'physical') {
    let atk, def;
    if (type === 'magic' || type === 'fire' || type === 'frost' || type === 'lightning') {
      atk = attacker.magAtk || (attacker.int ? attacker.int * 2 : 10);
      def = defender.magDef || (defender.int ? defender.int * 1 : 0) + (defender.spi ? defender.spi * 2 : 0) + (defender.ten ? defender.ten * 3 : 0);
    } else {
      atk = attacker.physAtk || attacker.attack || (attacker.str ? attacker.str * 2 : 10);
      def = defender.physDef || defender.defense || (defender.str ? defender.str * 1 : 0) + (defender.ten ? defender.ten * 3 : 0);
    }
    let base = Math.max(1, atk - def * 0.5);
    const variance = Utils.randFloat(0.9, 1.1);
    return Math.max(1, Math.floor(base * variance));
  }

  calculateHitChance(attacker, defender) {
    const hit = attacker.hit || (attacker.agi ? attacker.agi * 1.5 : 80);
    const dodge = defender.dodge || (defender.agi ? defender.agi * 1 : 20);
    const baseChance = 0.9;
    return Utils.clamp(baseChance + (hit - dodge) * 0.005, 0.3, 1.0);
  }

  // ========== 状态效果 ==========
  processStatusEffects(unit) {
    const effects = this.statusEffects.get(unit.id);
    if (!effects) return;
    for (let i = effects.length - 1; i >= 0; i--) {
      const eff = effects[i];
      if (eff.type === 'bleed') {
        const dmg = Math.floor((eff.value || 10) * 0.3);
        unit.hp -= dmg;
        this.log(`🩸 ${unit.name} 因流血损失 ${dmg} HP`);
      } else if (eff.type === 'burn') {
        const dmg = Math.floor((eff.value || 10) * 0.4);
        unit.hp -= dmg;
        this.log(`🔥 ${unit.name} 因灼烧损失 ${dmg} HP`);
      } else if (eff.type === 'slow') {
        // 减速已在效果添加时处理（如降低 speed），此处仅维持日志
        this.log(`❄️ ${unit.name} 受减速影响`);
      } else if (eff.type === 'stun') {
        this.log(`⚡ ${unit.name} 处于僵直状态`);
      }
      eff.duration--;
      if (eff.duration <= 0) {
        effects.splice(i, 1);
        this.log(`${unit.name} 的 ${eff.name || eff.type} 效果消失了。`);
      }
    }
    if (effects.length === 0) this.statusEffects.delete(unit.id);
    if (unit.hp <= 0) unit.hp = 0;
  }

  addStatusEffect(unitId, effect) {
    if (!this.statusEffects.has(unitId)) this.statusEffects.set(unitId, []);
    this.statusEffects.get(unitId).push(effect);
  }

  // ========== 单位获取 ==========
  getFirstAliveEnemy() {
    return this.enemies.find(e => e.hp > 0);
  }

  getAliveEnemies() {
    return this.enemies.filter(e => e.hp > 0);
  }

  getEnemyUnits() {
    return this.enemies;
  }

  getPlayerUnit() {
    return this.player;
  }

  getCompanionUnits() {
    return this.companions;
  }

  /** 将战斗后的随从状态同步回游戏 state */
  syncCompanionsToState(state) {
    if (!state || !state.companions) return;
    for (const battleComp of this.companions) {
      const orig = state.companions.find(c => c.id === battleComp._origId);
      if (orig) {
        orig.hp = battleComp.hp;
        orig.maxHp = battleComp.maxHp;
        orig.alive = battleComp.hp > 0;
      }
    }
  }

  // ========== 战斗结束 ==========
  endCombat(result) {
    this.active = false;
    this.isPlayerTurn = false;
    this.log(`🏁 战斗结束：${result === 'player_victory' ? '胜利' : result === 'player_defeat' ? '失败' : '超时'}`);

    const state = window.gameApp ? window.gameApp.state : null;
    if (state) this.syncCompanionsToState(state);

    if (result === 'player_victory') {
      this.processLoot();
    }

    const event = new CustomEvent('combat-end', { detail: { result, combat: this } });
    document.dispatchEvent(event);
  }

  // ========== 掉落与奖励 ==========
  processLoot() {
    const state = window.gameApp ? window.gameApp.state : null;
    if (!state) return;

    let totalExp = 0;
    let totalGold = 0;

    for (const enemy of this.enemies) {
      if (enemy.gold > 0) totalGold += enemy.gold;
      if (enemy.exp > 0) totalExp += enemy.exp;

      // 处理敌人配置掉落表
      if (enemy.drops && enemy.drops.length > 0) {
        for (const drop of enemy.drops) {
          if (Math.random() < (drop.chance || 0)) {
            const itemTemplate = DATA.items[drop.item];
            if (itemTemplate) {
              const dropItem = { ...itemTemplate, id: Utils.uuid(), stack: 1 };
              const addResult = InventorySystem.addToInventory(state, dropItem);
              if (addResult.ok) {
                this.log(`🎁 掉落：${itemTemplate.name}`);
              }
            }
          }
        }
      } else if (Math.random() < 0.3) {
        // 默认随机装备掉落
        const types = ['sword', 'armor', 'helmet', 'boots', 'gloves', 'necklace', 'ring'];
        // 根据怪物等级限制掉落品质
        const enemyLevel = enemy.level || 1;
        const maxRarity = Utils.getDropMaxRarity(enemyLevel);
        const pool = Utils.getDropRarityPool(maxRarity);
        const dropRarity = Utils.weightedRandom(pool.rarities, pool.weights);
        // 装备等级为怪物等级+-5随机，最高99
        const itemLevel = Utils.clamp(enemyLevel + Utils.randInt(-5, 5), 1, 99);
        const drop = Utils.generateItem(Utils.pickOne(types), itemLevel, dropRarity);
        const addResult = InventorySystem.addToInventory(state, drop);
        if (addResult.ok) {
          this.log(`🎁 掉落：${drop.name} (Lv.${drop.level} ${DATA.rarity[drop.rarity]?.name || drop.rarity})`);
        }
      }
    }

    if (totalGold > 0) {
      StateUtils.addGold(state, totalGold);
      this.log(`💰 获得 ${totalGold} 金币`);
    }
    if (totalExp > 0) {
      const expResult = StateUtils.addExp(state, totalExp);
      this.log(expResult.leveled ? `🆙 升级了！当前等级 ${state.player.level}` : `⭐ 获得 ${totalExp} 经验`);
    }
  }

  log(msg) {
    this.combatLog.push(msg);
    console.log('[战斗]', msg);
  }
}

try { module.exports = CombatEngine; } catch(e) {}
