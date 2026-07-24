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
    };
  }

  // ========== 计算行动顺序（按速度排序）==========
  calculateTurnOrder() {
    const aliveUnits = this.allUnits.filter(u => u.alive && u.hp > 0);
    this.turnOrder = aliveUnits.sort((a, b) => b.speed - a.speed);
    console.log('[战斗] 行动顺序:', this.turnOrder.map(u => `${u.name}(${u.speed})`).join(' -> '));
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
        if (!target || !target.alive) {
          target = this.enemyUnits.find(e => e.alive && e.hp > 0);
        }
        if (target) this.executeAction(unit, 'skill', target);
        else this.nextTurn();
        break;

      case 'defend':
        this.defenseBoosts[unit.id] = 5;
        const defendMsg = `${unit.name} 进入防御姿态，防御力+5`;
        this.combatLog.push(defendMsg);
        this.dispatchUpdate(defendMsg);
        this.nextTurn();
        break;

      case 'item':
        const heal = 30;
        const beforeHp = unit.hp;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        const actualHeal = unit.hp - beforeHp;
        const itemMsg = `${unit.name} 使用药水，回复 ${actualHeal} HP`;
        this.combatLog.push(itemMsg);
        this.dispatchUpdate(itemMsg);
        this.nextTurn();
        break;

      case 'retreat':
        this.endCombat('retreat');
        break;

      default:
        this.nextTurn();
    }
  }

  // ========== 随从回合 ==========
  allyTurn(unit) {
    if (!this.battleActive || !unit.alive) {
      this.nextTurn();
      return;
    }
    const target = this.enemyUnits.find(e => e.alive && e.hp > 0);
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

  // ========== 执行行动 ==========
  executeAction(attacker, action, target) {
    if (!target || !target.alive || target.hp <= 0) {
      this.nextTurn();
      return;
    }

    let damage = 0;
    let logMessage = '';

    switch (action) {
      case 'attack':
        damage = this.calculateDamage(attacker, target);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = `${attacker.name} 攻击 ${target.name}，造成 ${damage} 点伤害`;
        break;

      case 'skill':
        damage = Math.floor(this.calculateDamage(attacker, target) * 1.5);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = `${attacker.name} 使用技能攻击 ${target.name}，造成 ${damage} 点伤害`;
        break;

      default:
        damage = this.calculateDamage(attacker, target);
        target.hp = Math.max(0, target.hp - damage);
        logMessage = `${attacker.name} 攻击 ${target.name}，造成 ${damage} 点伤害`;
    }

    // 检查目标是否死亡
    if (target.hp <= 0) {
      target.alive = false;
      logMessage += `（${target.name} 倒下了）`;
    }

    this.combatLog.push(logMessage);
    console.log('[战斗]', logMessage);
    this.dispatchUpdate(logMessage);

    if (this.checkBattleEnd()) return;
    this.nextTurn();
  }

  // ========== 计算伤害 ==========
  calculateDamage(attacker, defender) {
    const baseAttack = attacker.attack || 5;
    let baseDefense = defender.defense || 2;

    // 应用防御加成
    if (this.defenseBoosts[defender.id]) {
      baseDefense += this.defenseBoosts[defender.id];
    }

    let damage = Math.max(1, baseAttack - baseDefense * 0.5);
    const variance = 0.8 + Math.random() * 0.4;
    damage = Math.floor(damage * variance);
    return Math.max(1, damage);
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
      // 重新计算行动顺序（活着的单位）
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

    const event = new CustomEvent('combat-end', {
      detail: { combat: this, result: result, message: message, rewards: rewards }
    });
    document.dispatchEvent(event);
  }

  // ========== 计算奖励 ==========
  calculateRewards() {
    let totalExp = 0;
    let totalGold = 0;
    const drops = [];

    this.enemyUnits.forEach(e => {
      totalExp += e.exp || 0;
      totalGold += e.gold || 0;
      if (e.drop) drops.push(e.drop);
    });

    // 发放经验
    if (window.gameApp && window.gameApp.state) {
      const state = window.gameApp.state;
      const expResult = StateUtils.addExp(state, totalExp);
      StateUtils.addGold(state, totalGold);

      // 添加掉落物到背包
      drops.forEach(drop => {
        const item = {
          id: Utils.uuid(),
          name: drop.name,
          type: drop.type || 'material',
          rarity: drop.rarity || 'white',
          level: 1,
          stack: 1,
        };
        StateUtils.addToInventory(state, item);
      });

      return { exp: totalExp, gold: totalGold, drops: drops, expResult: expResult };
    }
    return { exp: totalExp, gold: totalGold, drops: drops };
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
