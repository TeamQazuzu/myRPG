/**
 * 寻亲风云录 - 回合制战斗引擎
 */
class CombatEngine {
  constructor() {
    this.player = null;
    this.companions = [];
    this.enemies = [];
    this.combatLog = [];
    this.currentTurn = 0;
    this.maxTurns = 50;
    this.isPlayerTurn = false;
    this.turnQueue = [];
    this.active = false;
    this.statusEffects = new Map(); // unitId -> [{type, duration, value}]
  }

  startCombat(player, enemies, companions = []) {
    this.player = { ...player, id: 'player', isPlayer: true };
    this.companions = companions
      .filter(c => c.alive !== false)
      .map((c, i) => ({ ...c, id: c.id || `companion_${i}`, isCompanion: true, _origId: c.id }));
    this.enemies = enemies.map((e, i) => ({ ...e, id: e.id || `enemy_${i}`, isEnemy: true }));
    this.combatLog = [];
    this.currentTurn = 0;
    this.maxTurns = 50;
    this.active = true;
    this.statusEffects = new Map();

    const allyNames = [this.player.name, ...this.companions.map(c => c.name)].join('、');
    this.log(`⚔️ 战斗开始！${allyNames} VS ${this.enemies.map(e => e.name).join('、')}`);

    const event = new CustomEvent('combat-start', { detail: { combat: this } });
    document.dispatchEvent(event);

    this.nextTurn();
  }

  nextTurn() {
    if (!this.active) return;
    if (this.currentTurn >= this.maxTurns) {
      this.endCombat('timeout');
      return;
    }

    // 检查胜负
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
      this.endCombat('player_victory');
      return;
    }
    if (this.player.hp <= 0) {
      this.endCombat('player_defeat');
      return;
    }

    this.currentTurn++;

    // 按速度排序决定行动顺序（玩家、随从、敌人）
    const aliveCompanions = this.companions.filter(c => c.hp > 0);
    const allUnits = [this.player, ...aliveCompanions, ...aliveEnemies];
    allUnits.sort((a, b) => (b.speed || 5) - (a.speed || 5));

    for (const unit of allUnits) {
      if (!this.active) break;
      if (unit.hp <= 0) continue;

      this.processStatusEffects(unit);
      if (unit.hp <= 0) continue;

      if (unit.isPlayer) {
        this.isPlayerTurn = true;
        const event = new CustomEvent('combat-player-turn', { detail: { combat: this } });
        document.dispatchEvent(event);
        // 等待玩家输入，不自动继续
        return;
      } else if (unit.isCompanion) {
        this.isPlayerTurn = false;
        this.companionAction(unit);
      } else {
        this.isPlayerTurn = false;
        this.aiAction(unit);
      }
    }

    // 所有单位行动完毕，进入下一回合
    setTimeout(() => this.nextTurn(), 300);
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
        this.log(`${this.player.name} 举起武器防御！`);
        break;
      case 'item':
        this.log(`${this.player.name} 使用了道具。`);
        break;
      default:
        this.performAttack(this.player, this.getFirstAliveEnemy());
    }

    const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
    document.dispatchEvent(event);

    // 敌人回合
    setTimeout(() => this.nextTurn(), 400);
  }

  aiAction(enemy) {
    // 敌人随机选择玩家或存活的随从作为目标
    const aliveAllies = [this.player, ...this.companions.filter(c => c.hp > 0)];
    const target = aliveAllies[Utils.randInt(0, aliveAllies.length - 1)];
    const roll = Math.random();
    if (roll < 0.15 && enemy.skills && enemy.skills.length > 0) {
      this.performSkill(enemy, target);
    } else {
      this.performAttack(enemy, target);
    }
    const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
    document.dispatchEvent(event);
  }

  companionAction(companion) {
    const target = this.getFirstAliveEnemy();
    if (!target) return;
    // 随从简单AI：普通攻击，低概率治疗玩家
    if (companion.class === 'mage' && this.player.hp < this.player.maxHp * 0.4 && Math.random() < 0.3) {
      const heal = Math.floor((companion.magAtk || companion.int * 2 || 10) * 0.8);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.log(`💚 ${companion.name} 治疗 ${this.player.name}，回复 ${heal} HP`);
    } else {
      this.performAttack(companion, target);
    }
    const event = new CustomEvent('combat-update', { detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] } });
    document.dispatchEvent(event);
  }

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

    // 暴击判定
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

  performSkill(attacker, defender) {
    if (!defender || defender.hp <= 0) defender = attacker.isPlayer ? this.getFirstAliveEnemy() : this.player;
    if (!defender) return;

    const skillMultiplier = 1.5;
    let damage = Math.floor(this.calculateDamage(attacker, defender, 'physical') * skillMultiplier);
    this.log(`✨ ${attacker.name} 释放技能，对 ${defender.name} 造成 ${damage} 点伤害！`);
    defender.hp -= damage;
    if (defender.hp <= 0) {
      defender.hp = 0;
      this.log(`${defender.name} 倒下了！`);
    }
  }

  calculateDamage(attacker, defender, type) {
    const atk = attacker.attack || attacker.physAtk || 10;
    const def = defender.defense || defender.physDef || 0;
    let base = Math.max(1, atk - def * 0.5);
    const variance = Utils.randFloat(0.9, 1.1);
    return Math.max(1, Math.floor(base * variance));
  }

  calculateHitChance(attacker, defender) {
    const hit = attacker.hit || attacker.agi * 1.5 || 80;
    const dodge = defender.dodge || defender.agi || 20;
    const baseChance = 0.9;
    return Utils.clamp(baseChance + (hit - dodge) * 0.005, 0.3, 1.0);
  }

  processStatusEffects(unit) {
    const effects = this.statusEffects.get(unit.id);
    if (!effects) return;
    for (let i = effects.length - 1; i >= 0; i--) {
      const eff = effects[i];
      if (eff.type === 'bleed') {
        const dmg = Math.floor(eff.value);
        unit.hp -= dmg;
        this.log(`🩸 ${unit.name} 因流血损失 ${dmg} HP`);
      } else if (eff.type === 'burn') {
        const dmg = Math.floor(eff.value);
        unit.hp -= dmg;
        this.log(`🔥 ${unit.name} 因灼烧损失 ${dmg} HP`);
      }
      eff.duration--;
      if (eff.duration <= 0) {
        effects.splice(i, 1);
        this.log(`${unit.name} 的 ${eff.name} 效果消失了。`);
      }
    }
    if (effects.length === 0) this.statusEffects.delete(unit.id);
    if (unit.hp <= 0) unit.hp = 0;
  }

  addStatusEffect(unitId, effect) {
    if (!this.statusEffects.has(unitId)) this.statusEffects.set(unitId, []);
    this.statusEffects.get(unitId).push(effect);
  }

  getFirstAliveEnemy() {
    return this.enemies.find(e => e.hp > 0);
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

  endCombat(result) {
    this.active = false;
    this.isPlayerTurn = false;
    this.log(`🏁 战斗结束：${result === 'player_victory' ? '胜利' : result === 'player_defeat' ? '失败' : '超时'}`);

    // 同步随从状态
    const state = window.gameApp ? window.gameApp.state : null;
    if (state) this.syncCompanionsToState(state);

    // 掉落处理（胜利时）
    if (result === 'player_victory') {
      this.processLoot();
    }

    const event = new CustomEvent('combat-end', { detail: { result, combat: this } });
    document.dispatchEvent(event);
  }

  processLoot() {
    const state = window.gameApp ? window.gameApp.state : null;
    if (!state) return;
    for (const enemy of this.enemies) {
      if (enemy.gold > 0) {
        StateUtils.addGold(state, enemy.gold);
        this.log(`💰 获得 ${enemy.gold} 金币`);
      }
      if (enemy.exp > 0) {
        const expResult = StateUtils.addExp(state, enemy.exp);
        this.log(expResult.leveled ? `🆙 升级了！当前等级 ${state.player.level}` : `⭐ 获得 ${enemy.exp} 经验`);
      }
      // 概率掉落装备
      if (Math.random() < 0.3) {
        const types = ['sword', 'armor', 'helmet', 'boots', 'gloves', 'necklace', 'ring'];
        const drop = Utils.generateItem(Utils.pickOne(types), state.player.level);
        const addResult = InventorySystem.addToInventory(state, drop);
        if (addResult.ok) {
          this.log(`🎁 掉落：${drop.name} (${DATA.rarity[drop.rarity]?.name || drop.rarity})`);
        }
      }
    }
  }

  log(msg) {
    this.combatLog.push(msg);
    console.log('[战斗]', msg);
  }
}

try { module.exports = CombatEngine; } catch(e) {}
