class CombatEngine {
  constructor() {
    this.state = null;
    this.playerUnit = null;
    this.allyUnits = [];
    this.enemyUnits = [];
    this.turnOrder = [];
    this.currentTurnIdx = 0;
    this.round = 0;
    this.maxRounds = 30;
    this.combatLog = [];
    this.isActive = false;
    this.actionTimer = null;
    this.pendingAction = null;
    this.battleResult = null;
    this._autoExecuting = false;
  }

  start(state, player, companions, enemies) {
    this.state = state;
    this.isActive = true;
    this.combatLog = [];
    this.round = 0;
    this.maxRounds = 30;
    this.battleResult = null;
    this.currentTurnIdx = 0;

    this.playerUnit = player;
    this.allyUnits = companions || [];
    this.enemyUnits = enemies.map(e => ({ ...e, side: "enemy", statuses: [] }));

    this._initUnit(this.playerUnit, "player");
    this.allyUnits.forEach(u => this._initUnit(u, "ally"));
    this.enemyUnits.forEach(u => this._initUnit(u, "enemy"));

    this._recalcTurnOrder();
    this._log("⚔️ 战斗开始！");
    document.dispatchEvent(new CustomEvent('combat-start', { detail: { combat: this } }));
    this._processCurrentTurn();
  }

  _initUnit(unit, side) {
    unit.side = unit.side || side;
    unit.statuses = unit.statuses || [];
    unit.cooldowns = {};
    unit.hp = unit.hp || unit.maxHp || 100;
    unit.maxHp = unit.maxHp || unit.hp || 100;
    unit.mp = unit.mp || unit.maxMp || 30;
    unit.maxMp = unit.maxMp || unit.mp || 30;
    unit.physAtk = unit.physAtk || unit.attack || 10;
    unit.physDef = unit.physDef || unit.defense || 5;
    unit.magAtk = unit.magAtk || 0;
    unit.speed = unit.speed || 10;
    unit.critRate = unit.critRate || 0.05;
    unit.critDmg = unit.critDmg || 1.5;
  }

  _recalcTurnOrder() {
    const all = [this.playerUnit, ...this.allyUnits, ...this.enemyUnits];
    this.turnOrder = all
      .filter(u => u && u.hp > 0)
      .map(u => ({
        unit: u,
        side: u.side,
        isPlayer: u === this.playerUnit,
      }))
      .sort((a, b) => (b.unit.speed || 0) - (a.unit.speed || 0));
  }

  _processCurrentTurn() {
    if (!this.isActive) return;
    if (this._checkBattleEnd()) return;

    this._recalcTurnOrder();
    if (this.turnOrder.length === 0) {
      this._endBattle("timeout");
      return;
    }

    if (this.currentTurnIdx >= this.turnOrder.length) {
      this.currentTurnIdx = 0;
      this.round++;
      if (this.round >= this.maxRounds) {
        this._endBattle("timeout");
        return;
      }
      this._tickCooldowns();
      this._tickStatuses();
    }

    const entry = this.turnOrder[this.currentTurnIdx];
    if (!entry || !entry.unit || entry.unit.hp <= 0) {
      this.currentTurnIdx++;
      setTimeout(() => this._processCurrentTurn(), 50);
      return;
    }

    if (entry.isPlayer) {
      this._playerTurn(entry);
    } else if (entry.side === "ally") {
      this._allyAutoTurn(entry);
    } else {
      this._enemyTurn(entry);
    }
  }

  _playerTurn(entry) {
    const unit = entry.unit;
    const state = this.state;

    if (state.player.combatMode === "auto") {
      this._autoDecideAction(unit, "player").then(action => {
        this._executePlayerAction(action.type, action.targetId, action.skillId);
      });
    } else {
      document.dispatchEvent(new CustomEvent('combat-player-turn', {
        detail: { combat: this, unit }
      }));
      if (this.actionTimer) clearTimeout(this.actionTimer);
      this.actionTimer = setTimeout(() => {
        const firstEnemy = this.enemyUnits.find(e => e.hp > 0);
        if (firstEnemy) {
          this._executePlayerAction("attack", firstEnemy.unitId || this._getUnitId(firstEnemy));
        }
      }, 10000);
    }
  }

  _executePlayerAction(type, targetId, skillId) {
    if (!this.isActive) return;
    if (this.actionTimer) { clearTimeout(this.actionTimer); this.actionTimer = null; }
    const unit = this.playerUnit;
    let target = null;
    if (targetId) {
      target = this.enemyUnits.find(e => (e.unitId || this._getUnitId(e)) === targetId);
    }
    if (!target || target.hp <= 0) {
      target = this.enemyUnits.find(e => e.hp > 0);
    }

    if (type === "skill" && skillId) {
      const skill = DATA.skills[skillId];
      if (skill && this._canUseSkill(unit, skill)) {
        this._executeSkill(unit, skill, target, this.enemyUnits, this.playerUnit, this.allyUnits);
        unit.mp -= skill.mpCost;
        unit.cooldowns[skillId] = skill.cooldown;
      } else {
        this._executeAttack(unit, target);
      }
    } else if (type === "defend") {
      unit._defending = true;
      this._log(`${unit.name} 进入防御姿态`);
    } else {
      this._executeAttack(unit, target);
    }

    this._afterAction();
  }

  _allyAutoTurn(entry) {
    const unit = entry.unit;
    this._autoDecideAction(unit, "ally").then(action => {
      this._executeUnitAction(unit, action.type, action.targetId, action.skillId);
      this._afterAction();
    });
  }

  _enemyTurn(entry) {
    const unit = entry.unit;
    const action = this._enemyAI(unit);
    this._executeUnitAction(unit, action.type, action.targetId, action.skillId);
    this._afterAction();
  }

  _enemyAI(unit) {
    const hpRatio = unit.hp / unit.maxHp;
    if (hpRatio < 0.2) {
      if (Math.random() < 0.3 && unit.skills && unit.skills.length > 0) {
        return this._autoDecideActionSync(unit);
      }
      return { type: "attack", targetId: this._getUnitId(this._findNearestAlly()) };
    }
    if (Math.random() < 0.25 && unit.skills && unit.skills.length > 0) {
      return this._autoDecideActionSync(unit);
    }
    const target = this._findNearestAlly();
    return { type: "attack", targetId: this._getUnitId(target) };
  }

  _autoDecideAction(unit, caller) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this._autoDecideActionSync(unit));
      }, 300);
    });
  }

  _autoDecideActionSync(unit) {
    const state = this.state;
    const side = unit.side;
    const isPlayer = (unit === this.playerUnit);

    let autoMode, skillPreset, availableSkills;
    if (isPlayer) {
      autoMode = state.player.autoMode || "skillFirst";
      skillPreset = state.player.skillPreset || [];
      availableSkills = state.player.skills || [];
    } else if (side === "ally") {
      autoMode = unit.autoMode || "skillFirst";
      skillPreset = unit.skillPreset || [];
      availableSkills = unit.skills || [];
    } else {
      const hpRatio = unit.hp / unit.maxHp;
      if (hpRatio < 0.3 && Math.random() < 0.5) {
        return { type: "attack", targetId: this._getUnitId(this._findNearestAlly()) };
      }
      return { type: "attack", targetId: this._getUnitId(this._findNearestAlly()) };
    }

    if (autoMode === "allAttack") {
      const target = side === "ally" ? this._findLowestEnemy() : this._findLowestAlly();
      return { type: "attack", targetId: this._getUnitId(target) };
    }

    if (autoMode === "defend") {
      return { type: "defend" };
    }

    if (autoMode === "healFirst") {
      const woundedAlly = this._findWoundedAlly(unit);
      if (woundedAlly) {
        const healSkill = this._findHealSkill(unit, skillPreset, availableSkills);
        if (healSkill && this._canUseSkill(unit, healSkill)) {
          return { type: "skill", skillId: healSkill.id, targetId: this._getUnitId(woundedAlly) };
        }
      }
      const target = side === "ally" ? this._findLowestEnemy() : this._findLowestAlly();
      return { type: "attack", targetId: this._getUnitId(target) };
    }

    // skillFirst mode
    if (autoMode === "skillFirst" || !autoMode) {
      for (const skillId of skillPreset) {
        if (!availableSkills.includes(skillId)) continue;
        const skill = DATA.skills[skillId];
        if (!skill) continue;
        if (!this._canUseSkill(unit, skill)) continue;

        let target = null;
        if (skill.target === "self" || skill.target === "all" || skill.target === "allies") {
          target = null;
        } else if (skill.target === "ally") {
          target = this._findWoundedAlly(unit) || this._findNearestAlly(unit);
        } else {
          target = side === "ally" ? this._findLowestEnemy() : this._findLowestAlly();
        }

        if (target || skill.target === "self" || skill.target === "all" || skill.target === "allies") {
          return { type: "skill", skillId: skill.id, targetId: target ? this._getUnitId(target) : null };
        }
      }

      // Fallback to normal attack
      const target = side === "ally" ? this._findLowestEnemy() : this._findLowestAlly();
      return { type: "attack", targetId: this._getUnitId(target) };
    }

    return { type: "attack", targetId: this._getUnitId(this._findNearestEnemy()) };
  }

  _findHealSkill(unit, preset, available) {
    for (const skillId of preset) {
      if (!available.includes(skillId)) continue;
      const skill = DATA.skills[skillId];
      if (!skill) continue;
      if (skill.effect === "heal" && this._canUseSkill(unit, skill)) {
        return skill;
      }
    }
    for (const skillId of available) {
      const skill = DATA.skills[skillId];
      if (skill && skill.effect === "heal" && this._canUseSkill(unit, skill)) {
        return skill;
      }
    }
    return null;
  }

  _findWoundedAlly(unit) {
    const allies = unit.side === "enemy" ? [this.playerUnit, ...this.allyUnits] : 
                  (unit.side === "ally" ? this.allyUnits.filter(a => a.hp > 0) : [this.playerUnit, ...this.allyUnits]);
    if (unit.side === "ally") {
      allies.push(this.playerUnit);
    }
    const wounded = allies.filter(a => a && a.hp > 0 && a.hp / a.maxHp < 0.7);
    if (wounded.length === 0) return null;
    wounded.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
    return wounded[0];
  }

  _findLowestEnemy() {
    const alive = this.enemyUnits.filter(e => e.hp > 0);
    if (alive.length === 0) return null;
    alive.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
    return alive[0];
  }

  _findLowestAlly() {
    const allies = [this.playerUnit, ...this.allyUnits].filter(a => a && a.hp > 0);
    if (allies.length === 0) return null;
    allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
    return allies[0];
  }

  _findNearestAlly() {
    const allies = [this.playerUnit, ...this.allyUnits].filter(a => a && a.hp > 0);
    return allies[0] || null;
  }

  _findNearestEnemy() {
    const enemies = this.enemyUnits.filter(e => e.hp > 0);
    return enemies[0] || null;
  }

  _getUnitId(unit) {
    if (!unit) return null;
    if (unit.unitId) return unit.unitId;
    if (unit === this.playerUnit) return "player";
    const idx = this.allyUnits.indexOf(unit);
    if (idx >= 0) return "ally_" + idx;
    const eIdx = this.enemyUnits.indexOf(unit);
    if (eIdx >= 0) return "enemy_" + eIdx;
    return null;
  }

  _findUnitById(id) {
    if (id === "player") return this.playerUnit;
    const allyIdx = id && id.startsWith("ally_") ? parseInt(id.substring(5)) : -1;
    if (allyIdx >= 0) return this.allyUnits[allyIdx];
    const enemyIdx = id && id.startsWith("enemy_") ? parseInt(id.substring(6)) : -1;
    if (enemyIdx >= 0) return this.enemyUnits[enemyIdx];
    return null;
  }

  _canUseSkill(unit, skill) {
    if (!skill) return false;
    if (!DATA.skills[skill.id]) return false;
    if (unit.mp < skill.mpCost) return false;
    if (unit.cooldowns && unit.cooldowns[skill.id] > 0) return false;
    return true;
  }

  _executeUnitAction(unit, type, targetId, skillId) {
    if (!this.isActive || !unit || unit.hp <= 0) return;
    if (type === "skill" && skillId) {
      const skill = DATA.skills[skillId];
      if (skill && this._canUseSkill(unit, skill)) {
        let target = null;
        if (targetId) target = this._findUnitById(targetId);
        this._executeSkill(unit, skill, target, this.enemyUnits, this.playerUnit, this.allyUnits);
        unit.mp -= skill.mpCost;
        unit.cooldowns[skillId] = skill.cooldown;
      } else {
        const tgt = targetId ? this._findUnitById(targetId) : this._findLowestEnemy();
        this._executeAttack(unit, tgt);
      }
    } else if (type === "defend") {
      unit._defending = true;
      this._log(`${unit.name} 进入防御姿态`);
    } else {
      const tgt = targetId ? this._findUnitById(targetId) : 
                  (unit.side === "ally" ? this._findLowestEnemy() : this._findLowestAlly());
      this._executeAttack(unit, tgt);
    }
  }

  _executeAttack(attacker, target) {
    if (!target || target.hp <= 0) return;
    const dmg = this._calcDamage(attacker, target, 1.0, "physical");
    target.hp = Math.max(0, target.hp - dmg);
    this._log(`${attacker.name} → ${target.name} 造成 ${dmg} 点伤害`);
    this._applyDamageEffects(attacker, target, dmg, "physical");
  }

  _executeSkill(attacker, skill, target, enemies, playerUnit, allies) {
    const dmgType = skill.dmgType || "physical";
    const power = skill.power || 1.0;

    if (skill.effect === "heal") {
      if (skill.target === "allies") {
        const allAllies = [playerUnit, ...allies.filter(a => a.hp > 0)];
        for (const a of allAllies) {
          const healAmt = Math.floor(a.maxHp * power);
          a.hp = Math.min(a.maxHp, a.hp + healAmt);
          this._log(`${attacker.name} → ${a.name} 回复 ${healAmt} 生命`);
        }
      } else if (target) {
        const healAmt = Math.floor(target.maxHp * power);
        target.hp = Math.min(target.maxHp, target.hp + healAmt);
        this._log(`${attacker.name} → ${target.name} 回复 ${healAmt} 生命`);
      }
      return;
    }

    if (skill.effect === "cleanse" && target) {
      target.statuses = target.statuses.filter(s => s.type === "buff");
      this._log(`${attacker.name} 净化了 ${target.name} 的负面状态`);
      return;
    }

    if (skill.effect === "shield" && target) {
      target._shield = Math.floor(target.maxHp * 0.3);
      this._log(`${attacker.name} 给 ${target.name} 加了护盾`);
      return;
    }

    if (skill.target === "all" || skill.effect === "aoe") {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dmg = this._calcDamage(attacker, e, power, dmgType);
        e.hp = Math.max(0, e.hp - dmg);
        this._log(`${attacker.name} [${skill.name}] → ${e.name} 造成 ${dmg} 点${DATA.damageTypes[dmgType]?.name || ''}伤害`);
        this._applyDamageEffects(attacker, e, dmg, dmgType, skill);
      }
    } else if (skill.hits && skill.hits > 1) {
      for (let i = 0; i < skill.hits; i++) {
        if (!target || target.hp <= 0) break;
        const dmg = this._calcDamage(attacker, target, power / skill.hits, dmgType);
        target.hp = Math.max(0, target.hp - dmg);
        this._log(`${attacker.name} [${skill.name}] → ${target.name} 第${i+1}击 ${dmg} 点伤害`);
        this._applyDamageEffects(attacker, target, dmg, dmgType, skill);
      }
    } else if (target) {
      const dmg = this._calcDamage(attacker, target, power, dmgType);
      target.hp = Math.max(0, target.hp - dmg);
      this._log(`${attacker.name} [${skill.name}] → ${target.name} 造成 ${dmg} 点${DATA.damageTypes[dmgType]?.name || ''}伤害`);
      this._applyDamageEffects(attacker, target, dmg, dmgType, skill);
    } else {
      const dmg = this._calcDamage(attacker, target, power, dmgType);
      this._log(`${attacker.name} [${skill.name}] 施放`);
    }
  }

  _calcDamage(attacker, defender, power, dmgType) {
    let atk = dmgType === "physical" || dmgType === "fire" || dmgType === "frost" || dmgType === "lightning"
      ? (attacker.physAtk || attacker.attack || 5)
      : (attacker.magAtk || 5);
    if (dmgType === "fire" || dmgType === "frost" || dmgType === "lightning") {
      const bonusKey = dmgType + "Atk";
      if (attacker[bonusKey]) atk += attacker[bonusKey];
    }
    let def = defender.physDef || defender.defense || 2;
    if (defender._defending) def *= 2;
    let dmg = Math.max(1, Math.floor(atk * power - def * 0.5));
    const variance = 0.85 + Math.random() * 0.3;
    dmg = Math.max(1, Math.floor(dmg * variance));
    const isCrit = Math.random() < (attacker.critRate || 0.05);
    if (isCrit) {
      dmg = Math.floor(dmg * (attacker.critDmg || 1.5));
      this._log(`💥 暴击！`);
    }
    if (defender._shield && defender._shield > 0) {
      const absorbed = Math.min(defender._shield, dmg);
      defender._shield -= absorbed;
      dmg -= absorbed;
    }
    return Math.max(1, dmg);
  }

  _applyDamageEffects(attacker, target, dmg, dmgType, skill) {
    const effects = [];
    if (skill) {
      if (skill.effect === "slow" && dmgType === "frost") {
        effects.push({ type: "slow", duration: 2 });
      }
      if (skill.effect === "stun" && dmgType === "lightning") {
        effects.push({ type: "stun", duration: 1 });
      }
      if (skill.effect === "freeze") {
        effects.push({ type: "freeze", duration: 1 });
      }
      if (skill.effect === "armor_down") {
        target._armorDown = 2;
      }
    }
    const dmgData = DATA.damageTypes[dmgType];
    if (dmgData && Math.random() < 0.3) {
      effects.push({ type: dmgData.status, duration: dmgData.duration });
      this._log(`[${dmgData.statusName}]`);
    }
    for (const eff of effects) {
      target.statuses = target.statuses || [];
      const existing = target.statuses.find(s => s.type === eff.type);
      if (existing) {
        existing.duration = Math.max(existing.duration, eff.duration);
      } else {
        target.statuses.push({ type: eff.type, duration: eff.duration });
      }
    }
    if (attacker.physAtk > 0 && Math.random() < 0.08) {
      const steal = Math.floor(dmg * 0.08);
      if (steal > 0 && attacker.hp < attacker.maxHp) {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + steal);
      }
    }
  }

  _tickCooldowns() {
    const all = [this.playerUnit, ...this.allyUnits, ...this.enemyUnits];
    all.forEach(u => {
      if (!u || !u.cooldowns) return;
      for (const k in u.cooldowns) {
        if (u.cooldowns[k] > 0) u.cooldowns[k]--;
      }
    });
  }

  _tickStatuses() {
    const all = [this.playerUnit, ...this.allyUnits, ...this.enemyUnits];
    all.forEach(u => {
      if (!u || !u.statuses || u.hp <= 0) return;
      for (let i = u.statuses.length - 1; i >= 0; i--) {
        const s = u.statuses[i];
        if (s.type === "bleed" || s.type === "burn") {
          const dmg = Math.floor((u.physAtk || u.attack || 5) * 0.3);
          u.hp = Math.max(0, u.hp - dmg);
        }
        if (s.type === "slow") {
          u.speed = Math.max(1, (u.speed || 10) - 2);
        }
        s.duration--;
        if (s.duration <= 0) u.statuses.splice(i, 1);
      }
      if (u._defending) u._defending = false;
      if (u._armorDown && u._armorDown > 0) u._armorDown--;
    });
  }

  _afterAction() {
    this.currentTurnIdx++;
    this._logUpdate();
    setTimeout(() => this._processCurrentTurn(), 400);
  }

  _log(msg) {
    this.combatLog.push(msg);
    if (this.combatLog.length > 50) this.combatLog.shift();
  }

  _logUpdate() {
    document.dispatchEvent(new CustomEvent('combat-update', {
      detail: { combat: this, log: this.combatLog[this.combatLog.length - 1] }
    }));
  }

  _checkBattleEnd() {
    const playerAlive = this.playerUnit && this.playerUnit.hp > 0;
    const enemiesAlive = this.enemyUnits.some(e => e.hp > 0);
    const alliesAlive = this.allyUnits.some(a => a.hp > 0);
    if (!playerAlive) { this._endBattle("player_defeat"); return true; }
    if (!enemiesAlive) { this._endBattle("player_victory"); return true; }
    if (!alliesAlive && !playerAlive) { this._endBattle("player_defeat"); return true; }
    return false;
  }

  _endBattle(result) {
    this.isActive = false;
    this.battleResult = result;
    if (this.actionTimer) { clearTimeout(this.actionTimer); this.actionTimer = null; }
    const msgs = {
      player_victory: "🎉 战斗胜利！",
      player_defeat: "💀 战斗失败...",
      timeout: "⏰ 战斗超时，平局！"
    };
    this._log(msgs[result] || "战斗结束");
    document.dispatchEvent(new CustomEvent('combat-end', {
      detail: { combat: this, result }
    }));
  }

  setAutoMode(mode) {
    if (this.state) {
      this.state.player.combatMode = mode === "manual" ? "manual" : "auto";
      this.state.player.autoMode = mode;
    }
  }
}
