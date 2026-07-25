// systems/skills.js - 技能系统基础框架
// 负责：技能可用性筛选、使用判定、伤害/治疗计算、冷却管理

/**
 * SkillSystem - 技能系统全局对象
 * 依赖：DATA（data.js）、DATA.skills
 * 被 combat.js 和 renderer.js 调用
 */
var SkillSystem = {

  /**
   * 获取玩家可用技能列表
   * @param {Object} state - 游戏状态对象（window.gameApp.state）
   * @returns {Array} 可用技能数组
   */
  getAvailableSkills: function(state) {
    if (!state || !state.player || !DATA || !DATA.skills) {
      return [];
    }

    var player = state.player;
    var available = [];

    // 遍历所有技能数据
    for (var skillId in DATA.skills) {
      if (!DATA.skills.hasOwnProperty(skillId)) continue;
      var skill = DATA.skills[skillId];

      // 确保技能有id字段（data.js中可能缺失）
      if (!skill.id) {
        skill.id = skillId;
      }

      // 检查职业：匹配玩家 classPath[0]
      var playerClass = (player.classPath && player.classPath.length > 0) ? player.classPath[0] : null;
      if (skill.reqClass !== playerClass) continue;

      // 检查等级：reqLevel <= 玩家等级
      if (skill.reqLevel > player.level) continue;

      // 检查分支：null 表示任何分支可用，否则精确匹配
      if (skill.reqBranch !== null && skill.reqBranch !== undefined && skill.reqBranch !== player.elementSpec) {
        continue;
      }

      available.push(skill);
    }

    return available;
  },

  /**
   * 检查技能是否可用（等级/职业/分支/MP/冷却）
   * @param {Object} state - 游戏状态对象
   * @param {string} skillId - 技能ID
   * @param {Object} combat - CombatEngine 实例
   * @returns {{ ok: boolean, reason: string }}
   */
  canUseSkill: function(state, skillId, combat) {
    // 参数安全检查
    if (!state || !skillId) {
      return { ok: false, reason: "参数不完整" };
    }

    // 查找技能数据
    var skill = DATA && DATA.skills && DATA.skills[skillId] ? DATA.skills[skillId] : null;
    if (!skill) {
      return { ok: false, reason: "技能不存在：" + skillId };
    }

    // 检查是否在可用列表中（等级/职业/分支）
    var available = this.getAvailableSkills(state);
    var found = false;
    for (var i = 0; i < available.length; i++) {
      if (available[i].id === skillId) {
        found = true;
        break;
      }
    }
    if (!found) {
      return { ok: false, reason: "技能尚未解锁：" + skill.name };
    }

    // 检查MP
    if (state.player.mp < skill.mpCost) {
      return { ok: false, reason: "法力不足（需要 " + skill.mpCost + "，当前 " + state.player.mp + "）" };
    }

    // 检查冷却
    if (combat && combat.cooldowns && combat.cooldowns[skillId] > 0) {
      return { ok: false, reason: "技能冷却中（剩余 " + combat.cooldowns[skillId] + " 回合）" };
    }

    return { ok: true, reason: "" };
  },

  /**
   * 使用技能（返回伤害/治疗结果）
   * @param {string} skillId - 技能ID
   * @param {Object} attacker - 攻击者单位对象（CombatEngine 中的标准化单位）
   * @param {Object} target - 目标单位对象
   * @param {Array} allUnits - 所有单位数组（用于AOE等场景）
   * @param {Object} combat - CombatEngine 实例
   * @returns {{ damage: number, healed: number, log: string, statusEffect: Object|null, aoeTargets: Array }}
   */
  useSkill: function(skillId, attacker, target, allUnits, combat) {
    // 获取技能数据
    var skill = DATA && DATA.skills && DATA.skills[skillId] ? DATA.skills[skillId] : null;
    if (!skill) {
      return { damage: 0, healed: 0, log: "技能不存在：" + skillId, statusEffect: null, aoeTargets: [] };
    }

    var result = {
      damage: 0,
      healed: 0,
      log: "",
      statusEffect: null,
      aoeTargets: [],
    };

    // 扣除MP
    attacker.mp = Math.max(0, attacker.mp - skill.mpCost);

    // 设置冷却
    if (combat && combat.cooldowns !== undefined) {
      combat.cooldowns[skillId] = skill.cooldown;
    }

    // —— 计算伤害（使用战斗引擎的四系伤害计算）——
    if (skill.baseDamage !== null && skill.baseDamage !== undefined) {
      var baseAtk = attacker.attack || 10;
      // 使用 combat.calculateDamage 计算基础伤害（含防御减伤）
      var dmgType = skill.element || 'physical';
      var baseDamage = 0;
      if (combat && combat.calculateDamage) {
        // 使用战斗引擎计算（含防御减伤和伤害类型）
        baseDamage = combat.calculateDamage(attacker, target, dmgType);
      } else {
        // 降级：简单计算
        var rawDmg = baseAtk - (target.defense || 0) * 0.4;
        baseDamage = Math.max(1, rawDmg);
      }
      // 乘以技能倍率
      var rawDamage = baseDamage * skill.baseDamage;
      // 加入随机浮动（0.85 ~ 1.15）
      var variance = 0.85 + Math.random() * 0.3;
      result.damage = Math.floor(rawDamage * variance);
      result.damage = Math.max(1, result.damage);

      // 扣减目标HP
      if (target && target.alive) {
        target.hp = Math.max(0, target.hp - result.damage);
        if (target.hp <= 0) {
          target.alive = false;
        }
      }

      var dmgTypeName = '';
      if (combat && combat.getDamageTypeName) {
        dmgTypeName = combat.getDamageTypeName(dmgType);
      }
      result.log = attacker.name + " 使用 " + skill.name + "，对 " + (target ? target.name : "目标") + " 造成 " + result.damage + " 点" + dmgTypeName + "伤害";

      // 元素伤害自动触发状态效果（即使技能没有显式 apply_status）
      // 火焰→灼烧、冰霜→减速、雷电→僵直，概率较低
      if (combat && combat.tryApplyStatusFromDamageType && target && target.alive) {
        if (dmgType === 'fire' || dmgType === 'frost' || dmgType === 'lightning') {
          // 检查技能是否已有显式的 apply_status（避免重复触发）
          var hasExplicitStatus = false;
          if (skill.effects) {
            for (var se = 0; se < skill.effects.length; se++) {
              if (skill.effects[se].type === 'apply_status') { hasExplicitStatus = true; break; }
            }
          }
          // 没有显式状态效果时，有较低概率自动触发
          if (!hasExplicitStatus) {
            combat.tryApplyStatusFromDamageType(target, dmgType, attacker, 0.10);
          }
        }
      }
    }

    // —— 计算治疗 ——
    if (skill.baseHeal !== null && skill.baseHeal !== undefined && skill.baseHeal > 0) {
      var maxHp = (target && target.maxHp) || 100;
      var healAmount = Math.floor(maxHp * skill.baseHeal);
      healAmount = Math.max(1, healAmount);
      result.healed = healAmount;

      // 恢复目标HP
      if (target && target.alive) {
        var beforeHp = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        result.healed = target.hp - beforeHp;
      }

      result.log = attacker.name + " 使用 " + skill.name + "，为 " + (target ? target.name : "目标") + " 恢复了 " + result.healed + " 点生命";
    }

    // —— 处理增益/减益效果 ——
    if (skill.effects && skill.effects.length > 0) {
      for (var i = 0; i < skill.effects.length; i++) {
        var eff = skill.effects[i];

        // 防御增益（如盾墙）
        if (eff.type === "buff_defense" && combat) {
          var boostValue = Math.floor((target && target.defense) || 0) * eff.value;
          combat.defenseBoosts = combat.defenseBoosts || {};
          combat.defenseBoosts[target.id] = (combat.defenseBoosts[target.id] || 0) + boostValue;
          result.log += "，防御力提升" + Math.floor(eff.value * 100) + "%持续" + eff.duration + "回合";
        }

        // 攻击增益（如战吼）
        if (eff.type === "buff_attack" && combat) {
          result.log += "，全体攻击力提升" + Math.floor(eff.value * 100) + "%持续" + eff.duration + "回合";
          // 记录AOE增益效果，由战斗系统后续处理
          result.statusEffect = {
            type: "buff_attack",
            value: eff.value,
            duration: eff.duration,
            aoe: eff.aoe || false,
          };
        }

        // 多目标攻击（如连射）
        if (eff.type === "multi_target" && allUnits && combat) {
          if (Math.random() < eff.chance) {
            // 寻找第二个敌方目标（排除当前目标）
            var enemies = allUnits.filter(function(u) {
              return u.side === "enemy" && u.alive && u.hp > 0 && u.id !== (target && target.id);
            });
            if (enemies.length > 0) {
              var secondTarget = enemies[Math.floor(Math.random() * enemies.length)];
              var secondDamage = Math.floor(result.damage * 0.5);
              secondDamage = Math.max(1, secondDamage);
              secondTarget.hp = Math.max(0, secondTarget.hp - secondDamage);
              if (secondTarget.hp <= 0) secondTarget.alive = false;
              result.aoeTargets.push({ target: secondTarget, damage: secondDamage });
              result.log += "，追加攻击 " + secondTarget.name + " 造成 " + secondDamage + " 点伤害";
            }
          }
        }

        // 附加状态效果（如减速箭、冰箭、雷击）
        if (eff.type === "apply_status") {
          var statusInfo = DATA.damageTypes && DATA.damageTypes[skill.element] ? DATA.damageTypes[skill.element] : null;
          var statusName = eff.status || "unknown";
          var statusDesc = "";
          if (statusInfo) {
            statusName = statusInfo.statusName || statusName;
            statusDesc = "（" + (statusInfo.statusDesc || statusName) + "）";
          }
          // 实际施加状态到目标
          var statusApplied = false;
          if (combat && combat.applyStatusEffect && target && target.alive) {
            statusApplied = combat.applyStatusEffect(target, eff.status, attacker, eff.duration);
          }
          if (statusApplied) {
            result.log += "，附加 " + statusName + statusDesc;
          } else {
            result.log += "，" + statusName + "状态未生效";
          }
          result.statusEffect = {
            type: "apply_status",
            status: eff.status,
            duration: eff.duration || 2,
            targetId: target && target.id,
            applied: statusApplied,
          };
        }
      }

      // 如果伤害为0且没有治疗内容也没有任何增益效果（纯增益技能），补充日志
      if (result.damage === 0 && result.healed === 0 && result.log.indexOf(skill.name) === -1) {
        result.log = attacker.name + " 使用了 " + skill.name;
      }
    }

    // 目标倒下提示
    if (target && !target.alive && target.hp <= 0) {
      result.log += "（" + target.name + " 倒下了）";
    }

    return result;
  },
};

// 导出
try { module.exports = SkillSystem; } catch(e) {}
