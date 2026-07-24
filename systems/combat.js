// ============================================
// 《寻亲风云录》战斗引擎
// 核心规则：4系伤害 / 异常状态 / 速度排序 / 3v6 / 30回合上限
// ============================================

const CombatEngine = {
  
  // 初始化一场战斗
  initBattle(state, enemies, options = {}) {
    const allies = this.buildAllies(state);
    const allUnits = [...allies, ...enemies.map(e => ({ ...e, side: "enemy" }))];
    
    return {
      turn: 1,
      maxTurns: DATA.combat.maxTurns,
      phase: "battle", // "battle" | "victory" | "defeat" | "draw"
      wave: options.wave || 1,
      totalWaves: options.totalWaves || 1,
      allies: allies.map(a => a.id),
      enemies: enemies.map(e => e.id),
      units: allUnits,
      order: [], // 当前回合行动顺序
      statusEffects: [], // 全局状态效果
      log: [], // 战斗日志（最多4行滚动）
      sceneObjects: options.sceneObjects || [], // 场景可交互物品
      rewards: { exp: 0, gold: 0, items: [] },
    };
  },

  // 构建友方单位
  buildAllies(state) {
    const allies = [];
    // 主角
    const playerStats = StateUtils.getCombatStats(state, "player");
    allies.push({
      id: "player",
      name: state.player.name,
      side: "ally",
      ...playerStats,
      hp: state.player.hp,
      mp: state.player.mp,
      skills: this.getAvailableSkills(state),
      ai: false,
    });
    // 随从
    for (const comp of state.companions) {
      if (!comp.alive) continue;
      const stats = StateUtils.getCombatStats(state, comp.id);
      allies.push({
        id: comp.id,
        name: comp.name,
        side: "ally",
        ...stats,
        hp: comp.hp,
        mp: comp.mp,
        skills: this.getCompanionSkills(comp),
        ai: true,
        strategy: comp.aiStrategy,
      });
    }
    return allies;
  },

  // 获取可用技能
  getAvailableSkills(state) {
    const skills = [];
    const cls = state.player.classPath[0];
    const level = state.player.level;
    // 基础攻击
    skills.push({ name: "普通攻击", cost: 0, type: "active", target: "single", dmgType: "physical", power: 1.0 });
    // 职业技能
    const classSkills = DATA.classes[cls]?.skills || {};
    for (const [reqLevel, skillList] of Object.entries(classSkills)) {
      if (level >= parseInt(reqLevel)) {
        for (const skillName of skillList) {
          skills.push(this.getSkillData(skillName, cls));
        }
      }
    }
    // 法师分支技能
    if (cls === "mage" && state.player.elementSpec) {
      const branch = DATA.classes.mage.branches[state.player.elementSpec];
      if (branch) {
        for (const [reqLevel, skillList] of Object.entries(branch.skills)) {
          if (level >= parseInt(reqLevel)) {
            for (const skillName of skillList) {
              skills.push(this.getSkillData(skillName, "mage", state.player.elementSpec));
            }
          }
        }
      }
    }
    return skills;
  },

  getCompanionSkills(companion) {
    const skills = [{ name: "普通攻击", cost: 0, type: "active", target: "single", dmgType: "physical", power: 1.0 }];
    // 简化：随从只有普通攻击+一个职业特色技能
    const classKey = companion.class;
    if (classKey.includes("warrior")) {
      skills.push({ name: "猛击", cost: 15, type: "active", target: "single", dmgType: "physical", power: 1.8, cd: 3 });
    } else if (classKey.includes("ranger")) {
      skills.push({ name: "连射", cost: 12, type: "active", target: "single", dmgType: "physical", power: 1.5, hits: 2, cd: 3 });
    } else if (classKey.includes("mage_fire")) {
      skills.push({ name: "火球", cost: 20, type: "active", target: "single", dmgType: "fire", power: 2.0, cd: 3 });
    } else if (classKey.includes("mage_frost")) {
      skills.push({ name: "冰箭", cost: 18, type: "active", target: "single", dmgType: "frost", power: 1.6, cd: 3 });
    } else if (classKey.includes("mage_lightning")) {
      skills.push({ name: "雷击", cost: 20, type: "active", target: "single", dmgType: "lightning", power: 2.2, cd: 3 });
    } else if (classKey.includes("mage_heal")) {
      skills.push({ name: "治疗术", cost: 15, type: "active", target: "ally", heal: 1.5, cd: 3 });
    }
    return skills;
  },

  getSkillData(name, cls, branch = null) {
    const skillDB = {
      "盾墙": { name: "盾墙", cost: 20, type: "active", target: "self", effect: "buff", buff: { physDef: 0.5 }, duration: 3, cd: 5 },
      "猛击": { name: "猛击", cost: 15, type: "active", target: "single", dmgType: "physical", power: 1.8, cd: 3 },
      "战吼": { name: "战吼", cost: 25, type: "active", target: "all_allies", effect: "buff", buff: { atk: 0.2 }, duration: 3, cd: 6 },
      "破甲斩": { name: "破甲斩", cost: 20, type: "active", target: "single", dmgType: "physical", power: 1.5, effect: "reduceArmor", value: 0.15, duration: 2, cd: 4 },
      "铁壁": { name: "铁壁", cost: 30, type: "active", target: "self", effect: "buff", buff: { allDef: 0.3 }, duration: 3, cd: 6 },
      "处决": { name: "处决", cost: 25, type: "active", target: "single", dmgType: "physical", power: 2.5, condition: "hp<30%", cd: 4 },
      "战神降临": { name: "战神降临", cost: 50, type: "active", target: "self", effect: "transform", buff: { atk: 0.5, speed: 0.3 }, duration: 5, cd: 10 },
      
      "连射": { name: "连射", cost: 12, type: "active", target: "single", dmgType: "physical", power: 1.5, hits: 2, cd: 3 },
      "减速箭": { name: "减速箭", cost: 15, type: "active", target: "single", dmgType: "frost", power: 1.2, effect: "slow", duration: 2, cd: 3 },
      "穿透箭": { name: "穿透箭", cost: 20, type: "active", target: "single", dmgType: "physical", power: 2.0, pierce: 0.3, cd: 4 },
      "连环射击": { name: "连环射击", cost: 25, type: "active", target: "all_enemies", dmgType: "physical", power: 1.2, cd: 5 },
      "狙击": { name: "狙击", cost: 30, type: "active", target: "single", dmgType: "physical", power: 3.0, critBonus: 0.3, cd: 5 },
      "箭雨": { name: "箭雨", cost: 35, type: "active", target: "all_enemies", dmgType: "physical", power: 1.5, cd: 6 },
      "风行者": { name: "风行者", cost: 40, type: "active", target: "self", effect: "buff", buff: { speed: 0.5, dodge: 0.2 }, duration: 4, cd: 8 },
      
      "火球": { name: "火球", cost: 20, type: "active", target: "single", dmgType: "fire", power: 2.0, cd: 3 },
      "火焰风暴": { name: "火焰风暴", cost: 35, type: "active", target: "all_enemies", dmgType: "fire", power: 1.8, cd: 5 },
      "陨石": { name: "陨石", cost: 50, type: "active", target: "all_enemies", dmgType: "fire", power: 3.0, cd: 7 },
      
      "冰箭": { name: "冰箭", cost: 18, type: "active", target: "single", dmgType: "frost", power: 1.6, effect: "slow", duration: 2, cd: 3 },
      "冰霜新星": { name: "冰霜新星", cost: 30, type: "active", target: "all_enemies", dmgType: "frost", power: 1.4, effect: "slow", duration: 2, cd: 5 },
      "暴风雪": { name: "暴风雪", cost: 45, type: "active", target: "all_enemies", dmgType: "frost", power: 2.2, effect: "slow", duration: 3, cd: 7 },
      
      "雷击": { name: "雷击", cost: 20, type: "active", target: "single", dmgType: "lightning", power: 2.2, cd: 3 },
      "连锁闪电": { name: "连锁闪电", cost: 35, type: "active", target: "all_enemies", dmgType: "lightning", power: 1.6, cd: 5 },
      "天雷": { name: "天雷", cost: 50, type: "active", target: "all_enemies", dmgType: "lightning", power: 2.8, cd: 7 },
      
      "治疗术": { name: "治疗术", cost: 15, type: "active", target: "ally", heal: 1.5, cd: 3 },
      "群体治疗": { name: "群体治疗", cost: 30, type: "active", target: "all_allies", heal: 1.0, cd: 5 },
      "净化": { name: "净化", cost: 20, type: "active", target: "ally", effect: "cleanse", cd: 4 },
      "护盾": { name: "护盾", cost: 25, type: "active", target: "ally", effect: "shield", value: 0.3, duration: 3, cd: 5 },
    };
    return skillDB[name] || { name, cost: 0, type: "active", target: "single", dmgType: "physical", power: 1.0 };
  },

  // ========== 回合核心 ==========

  // 开始新回合：按速度排序
  startTurn(combat) {
    if (combat.turn > combat.maxTurns) {
      return this.resolveDraw(combat);
    }

    // 应用持续状态效果
    this.applyStatusEffects(combat);

    // 计算行动顺序
    const alive = combat.units.filter(u => u.hp > 0);
    combat.order = alive
      .map(u => ({
        ...u,
        effectiveSpeed: u.speed * (u.stun ? 0.7 : 1), // 僵直-30%速度
      }))
      .sort((a, b) => b.effectiveSpeed - a.effectiveSpeed)
      .map(u => u.id);

    combat.currentActorIndex = 0;
    return { type: "turn_start", turn: combat.turn, order: combat.order };
  },

  // 获取当前行动单位
  getCurrentActor(combat) {
    const id = combat.order[combat.currentActorIndex];
    return combat.units.find(u => u.id === id);
  },

  // 执行行动
  executeAction(combat, actorId, action, targetId) {
    const actor = combat.units.find(u => u.id === actorId);
    const target = combat.units.find(u => u.id === targetId);
    if (!actor || actor.hp <= 0) return null;

    const results = [];

    if (action.type === "skill") {
      const skill = actor.skills.find(s => s.name === action.skillName);
      if (!skill) return null;

      // 检查MP
      if (actor.mp < skill.cost) {
        return { type: "no_mp", actor: actor.name, skill: skill.name };
      }
      actor.mp -= skill.cost;

      if (skill.heal) {
        // 治疗
        const healAmount = Math.floor(skill.heal * (actor.magAtk || actor.physAtk));
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        results.push({ actor: actor.name, target: target.name, action: skill.name, healed: healAmount });
      } else if (skill.effect === "buff") {
        // Buff
        this.addStatus(combat, target, { type: "buff", stat: skill.buff, duration: skill.duration });
        results.push({ actor: actor.name, target: target.name, action: skill.name, buff: true });
      } else if (skill.effect === "cleanse") {
        // 净化
        target.statusEffects = target.statusEffects.filter(s => s.type !== "debuff");
        results.push({ actor: actor.name, target: target.name, action: skill.name, cleanse: true });
      } else if (skill.effect === "shield") {
        // 护盾
        const shieldAmount = Math.floor(skill.value * target.maxHp);
        this.addStatus(combat, target, { type: "shield", value: shieldAmount, duration: skill.duration });
        results.push({ actor: actor.name, target: target.name, action: skill.name, shield: shieldAmount });
      } else {
        // 伤害技能
        const targets = this.resolveTargets(combat, actor, skill);
        for (const t of targets) {
          if (t.hp <= 0) continue;
          const dmgResult = this.calcDamage(actor, t, skill);
          t.hp -= dmgResult.damage;
          if (t.hp < 0) t.hp = 0;
          
          // 应用异常状态
          if (skill.effect && DATA.damageTypes[skill.dmgType]) {
            const statusType = DATA.damageTypes[skill.dmgType].status;
            this.applyDamageStatus(combat, actor, t, skill, statusType, dmgResult.crit);
          }

          results.push({
            actor: actor.name,
            target: t.name,
            action: skill.name,
            damage: dmgResult.damage,
            crit: dmgResult.crit,
            status: dmgResult.status,
          });
        }
      }
    } else if (action.type === "item") {
      // 使用物品
      results.push({ actor: actor.name, action: `使用${action.itemName}` });
    } else if (action.type === "defend") {
      // 防御
      this.addStatus(combat, actor, { type: "buff", stat: { physDef: 0.5 }, duration: 1 });
      results.push({ actor: actor.name, action: "防御", buff: true });
    } else if (action.type === "flee") {
      // 逃跑
      const fleeChance = 0.3 + (actor.speed - 20) * 0.01;
      if (Utils.chance(Math.max(0.1, Math.min(0.8, fleeChance)))) {
        combat.phase = "fled";
        results.push({ actor: actor.name, action: "逃跑", fled: true });
      } else {
        results.push({ actor: actor.name, action: "逃跑失败" });
      }
    }

    // 添加到日志（最多保留4行）
    for (const r of results) {
      combat.log.push(Utils.formatCombatLog(r));
      if (combat.log.length > 4) combat.log.shift();
    }

    // 检查战斗结束
    const endCheck = this.checkBattleEnd(combat);
    if (endCheck.ended) {
      combat.phase = endCheck.result;
      return { type: "battle_end", result: endCheck.result, rewards: combat.rewards, log: combat.log };
    }

    // 下一个行动者
    combat.currentActorIndex++;
    if (combat.currentActorIndex >= combat.order.length) {
      combat.turn++;
      return this.startTurn(combat);
    }

    return { type: "action", results, nextActor: this.getCurrentActor(combat)?.id };
  },

  // 解析目标
  resolveTargets(combat, actor, skill) {
    const enemies = combat.units.filter(u => u.side !== actor.side && u.hp > 0);
    const allies = combat.units.filter(u => u.side === actor.side && u.hp > 0);
    
    switch (skill.target) {
      case "single": return [enemies[0]]; // 默认第一个敌人
      case "all_enemies": return enemies;
      case "ally": return [allies.find(a => a.hp < a.maxHp) || allies[0]];
      case "all_allies": return allies;
      case "self": return [actor];
      default: return [enemies[0]];
    }
  },

  // 计算伤害
  calcDamage(attacker, defender, skill) {
    const dmgType = skill.dmgType || "physical";
    let baseDmg = 0;

    if (dmgType === "physical") {
      baseDmg = (attacker.physAtk || 10) * (skill.power || 1.0);
    } else {
      baseDmg = (attacker.magAtk || 10) * (skill.power || 1.0);
    }

    // 防御减免
    let defense = 0;
    if (dmgType === "physical") {
      defense = defender.physDef || 0;
    } else {
      // 元素抗性
      const resMap = { fire: "fireRes", frost: "frostRes", lightning: "lightRes" };
      defense = (defender.magDef || 0) * (1 - (defender[resMap[dmgType]] || 0));
    }

    // 穿透
    const pierce = skill.pierce || 0;
    defense = defense * (1 - pierce);

    let damage = Math.max(1, baseDmg - defense);

    // 暴击
    const critRoll = Utils.critRoll(attacker.critRate || 0.05, attacker.critDmg || 1.5);
    if (critRoll.crit) {
      damage *= critRoll.multiplier;
    }

    // 伤害浮动
    damage = Utils.damageRoll(damage);

    return { damage: Math.floor(damage), crit: critRoll.crit };
  },

  // 应用伤害触发的异常状态
  applyDamageStatus(combat, attacker, target, skill, statusType, isCrit) {
    const dt = DATA.damageTypes[skill.dmgType];
    if (!dt) return;

    // 检查词条触发的异常
    let applyChance = 0;
    if (statusType === "bleed" && isCrit) applyChance = this.getAffixChance(attacker, "bleedOnCrit");
    else if (statusType === "burn") applyChance = this.getAffixChance(attacker, "burnOnHit");
    else if (statusType === "slow") applyChance = this.getAffixChance(attacker, "slowOnHit");
    else if (statusType === "stun") applyChance = this.getAffixChance(attacker, "stunOnHit");

    // 基础命中概率
    if (skill.effect === statusType || Utils.chance(applyChance)) {
      this.addStatus(combat, target, {
        type: statusType,
        source: attacker.id,
        duration: dt.duration,
        stacks: dt.stackable ? 1 : undefined,
      });
    }
  },

  getAffixChance(unit, effect) {
    // 从装备词条中获取触发概率
    // 简化实现
    return 0;
  },

  // 添加状态效果
  addStatus(combat, target, status) {
    // 检查是否可叠加
    const existing = target.statusEffects?.find(s => s.type === status.type);
    const dt = Object.values(DATA.damageTypes).find(d => d.status === status.type);

    if (existing && dt?.stackable) {
      existing.stacks = Math.min((existing.stacks || 1) + 1, dt.maxStacks || 1);
      existing.duration = Math.max(existing.duration, status.duration);
    } else if (!existing) {
      if (!target.statusEffects) target.statusEffects = [];
      target.statusEffects.push(status);
    }
  },

  // 应用持续状态效果（回合开始时）
  applyStatusEffects(combat) {
    for (const unit of combat.units) {
      if (!unit.statusEffects) continue;
      
      for (const status of unit.statusEffects) {
        // DOT伤害
        if (status.type === "bleed") {
          const dmg = Math.floor((unit.maxHp || 100) * 0.1); // 简化：基于最大生命
          unit.hp -= dmg;
          combat.log.push(`${unit.name} 流血 -${dmg}`);
        } else if (status.type === "burn") {
          const stacks = status.stacks || 1;
          const dmg = Math.floor((unit.maxHp || 100) * 0.08 * stacks);
          unit.hp -= dmg;
          combat.log.push(`${unit.name} 灼烧 -${dmg}`);
        }
        
        // 减少持续时间
        status.duration--;
      }

      // 移除过期状态
      unit.statusEffects = unit.statusEffects.filter(s => s.duration > 0);
    }

    // 清理日志
    while (combat.log.length > 4) combat.log.shift();
  },

  // 检查战斗结束
  checkBattleEnd(combat) {
    const aliveAllies = combat.units.filter(u => u.side === "ally" && u.hp > 0);
    const aliveEnemies = combat.units.filter(u => u.side === "enemy" && u.hp > 0);

    if (aliveEnemies.length === 0) {
      // 胜利
      combat.rewards = this.calcRewards(combat);
      return { ended: true, result: "victory" };
    }
    if (aliveAllies.length === 0) {
      return { ended: true, result: "defeat" };
    }
    return { ended: false };
  },

  // 平局处理
  resolveDraw(combat) {
    combat.phase = "draw";
    return {
      type: "battle_end",
      result: "draw",
      message: "30回合已到，双方僵持不下。",
      log: combat.log,
    };
  },

  // 计算奖励
  calcRewards(combat) {
    let totalExp = 0;
    let totalGold = 0;
    const items = [];

    for (const unit of combat.units) {
      if (unit.side === "enemy" && unit.hp <= 0) {
        totalExp += unit.exp || 0;
        totalGold += unit.gold || 0;
        // 掉落
        if (Utils.chance(0.3)) {
          items.push(Utils.generateEquipment(unit.level));
        }
      }
    }

    return { exp: totalExp, gold: totalGold, items };
  },

  // AI行动决策
  decideAIAction(combat, actor) {
    const enemies = combat.units.filter(u => u.side !== actor.side && u.hp > 0);
    const allies = combat.units.filter(u => u.side === actor.side && u.hp > 0);
    const skills = actor.skills || [];

    // 治疗优先
    const healSkill = skills.find(s => s.heal && actor.mp >= s.cost);
    const woundedAlly = allies.find(a => a.hp < a.maxHp * 0.5);
    if (healSkill && woundedAlly) {
      return { type: "skill", skillName: healSkill.name, targetId: woundedAlly.id };
    }

    // 选择最强可用技能
    const availableSkills = skills.filter(s => 
      s.type === "active" && 
      actor.mp >= (s.cost || 0) &&
      (!s.condition || this.checkCondition(combat, actor, s.condition))
    );

    if (availableSkills.length > 0) {
      // 优先AOE如果敌人>2
      const aoeSkill = availableSkills.find(s => s.target === "all_enemies");
      if (aoeSkill && enemies.length > 2) {
        return { type: "skill", skillName: aoeSkill.name, targetId: enemies[0].id };
      }
      // 否则用最强单体
      const bestSkill = availableSkills.sort((a, b) => (b.power || 1) - (a.power || 1))[0];
      return { type: "skill", skillName: bestSkill.name, targetId: enemies[0].id };
    }

    // 普通攻击
    return { type: "skill", skillName: "普通攻击", targetId: enemies[0]?.id };
  },

  checkCondition(combat, actor, condition) {
    if (condition === "hp<30%") return actor.hp / actor.maxHp < 0.3;
    return true;
  },

  // ========== 多波次战斗 ==========

  // 检查是否还有下一波
  hasNextWave(combat) {
    return combat.wave < combat.totalWaves;
  },

  // 开始下一波
  nextWave(combat, state, newEnemies) {
    combat.wave++;
    combat.turn = 1;
    combat.phase = "battle";
    // 保留友方状态，重置敌人
    const allies = combat.units.filter(u => u.side === "ally");
    combat.units = [...allies, ...newEnemies.map(e => ({ ...e, side: "enemy" }))];
    combat.log = [];
    combat.order = [];
    combat.statusEffects = [];
    return this.startTurn(combat);
  },

  // ========== 场景交互 ==========

  useSceneObject(combat, actorId, objectName) {
    const obj = combat.sceneObjects.find(o => o.name === objectName);
    if (!obj || obj.used) return { ok: false, reason: "不可用" };
    
    obj.used = true;
    const results = [];

    if (obj.effect === "fire_aoe") {
      const enemies = combat.units.filter(u => u.side === "enemy" && u.hp > 0);
      for (const e of enemies) {
        const dmg = Math.floor(obj.power || 50);
        e.hp -= dmg;
        results.push({ actor: actorId, target: e.name, action: obj.name, damage: dmg, status: "灼烧" });
      }
    }

    combat.log.push(...results.map(r => Utils.formatCombatLog(r)));
    while (combat.log.length > 4) combat.log.shift();

    return { ok: true, results };
  },
};

// 导出
try { module.exports = CombatEngine; } catch(e) {}
