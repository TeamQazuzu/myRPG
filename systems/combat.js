
const CombatSystem = {
  inCombat: false,
  enemies: [],
  turn: 0,
  combatLog: [],

  // ---------- 开始遭遇战 ----------
  startEncounter: function() {
    if (this.inCombat) return;

    const p = GameState.data.player;
    const zone = GAME_DATA.zones[GameState.data.world.currentZone];
    const levelRange = zone.levelRange;

    // 根据玩家等级选择敌人
    const enemyKeys = Object.keys(GAME_DATA.enemies);
    const validEnemies = enemyKeys.filter(function(k) {
      const e = GAME_DATA.enemies[k];
      return e.level >= levelRange[0] && e.level <= Math.min(p.level + 3, levelRange[1]);
    });

    if (validEnemies.length === 0) return;

    const enemyKey = validEnemies[Utils.rand(0, validEnemies.length - 1)];
    const enemyTemplate = GAME_DATA.enemies[enemyKey];

    // 生成敌人实例
    const enemy = {
      id: Utils.genId(),
      key: enemyKey,
      name: enemyTemplate.name,
      level: enemyTemplate.level,
      hp: enemyTemplate.hp,
      maxHp: enemyTemplate.hp,
      mp: 0,
      maxMp: 0,
      patk: enemyTemplate.patk,
      pdef: enemyTemplate.pdef,
      mdef: enemyTemplate.mdef,
      agi: enemyTemplate.agi,
      exp: enemyTemplate.exp,
      gold: enemyTemplate.gold,
      loot: enemyTemplate.loot
    };

    this.enemies = [enemy];
    this.inCombat = true;
    this.turn = 0;
    this.combatLog = [];

    log('⚔️ 遭遇 ' + enemy.name + '！', 'damage');
    this.renderCombatPanel();
    document.getElementById('combat-panel').classList.remove('hidden');
  },

  // ---------- 开始守门员战 ----------
  startGatekeeper: function(gkKey) {
    if (this.inCombat) return;

    const gk = GAME_DATA.gatekeepers[gkKey];
    if (!gk) return;

    const enemy = {
      id: Utils.genId(),
      key: gkKey,
      name: gk.name,
      title: gk.title,
      level: gk.level,
      hp: gk.hp,
      maxHp: gk.maxHp,
      mp: gk.mp,
      maxMp: gk.maxMp,
      patk: gk.patk,
      pdef: gk.pdef,
      mdef: gk.mdef,
      hit: gk.hit,
      dodge: gk.dodge,
      crit: gk.crit,
      isGatekeeper: true,
      reward: gk.reward,
      defeatText: gk.defeatText,
      failText: gk.failText
    };

    this.enemies = [enemy];
    this.inCombat = true;
    this.turn = 0;
    this.combatLog = [];

    log('🔥 守门员战：' + gk.name + ' — ' + gk.title, 'damage');
    log(gk.description, 'narrative');
    this.renderCombatPanel();
    document.getElementById('combat-panel').classList.remove('hidden');
  },

  // ---------- 玩家攻击 ----------
  playerAttack: function(skillName) {
    if (!this.inCombat || this.enemies.length === 0) return;

    const p = GameState.data.player;
    const enemy = this.enemies[0];

    // 计算命中
    const hitChance = Math.min(0.95, Math.max(0.2, 0.8 + (p.stats.hit - enemy.agi) * 0.02));
    if (Math.random() > hitChance) {
      log('你的攻击被' + enemy.name + '闪避了！', 'info');
      this.enemyTurn();
      return;
    }

    // 计算伤害
    let damage = p.stats.patk;
    damage = damage * (100 / (100 + enemy.pdef));

    // 暴击
    const critChance = p.stats.crit / 100;
    let isCrit = false;
    if (Math.random() < critChance) {
      damage *= p.stats.critDmg;
      isCrit = true;
    }

    damage = Math.floor(damage);
    enemy.hp -= damage;

    if (isCrit) {
      log('💥 暴击！你对' + enemy.name + '造成 ' + damage + ' 点伤害！', 'damage');
    } else {
      log('你对' + enemy.name + '造成 ' + damage + ' 点伤害', 'damage');
    }

    // 检查击杀
    if (enemy.hp <= 0) {
      this.onEnemyDefeated(enemy);
      return;
    }

    this.renderCombatPanel();
    this.enemyTurn();
  },

  // ---------- 敌人回合 ----------
  enemyTurn: function() {
    if (!this.inCombat || this.enemies.length === 0) return;

    const p = GameState.data.player;
    const enemy = this.enemies[0];

    // 敌人攻击
    const hitChance = Math.min(0.95, Math.max(0.2, 0.8 + (enemy.hit || enemy.agi) - p.stats.dodge) * 0.02);
    if (Math.random() > hitChance) {
      log(enemy.name + '的攻击被你闪避了！', 'info');
      this.renderCombatPanel();
      return;
    }

    let damage = enemy.patk;
    damage = damage * (100 / (100 + p.stats.pdef));
    damage = Math.floor(damage);
    p.hp -= damage;

    log(enemy.name + '对你造成 ' + damage + ' 点伤害', 'damage');

    // 检查玩家死亡
    if (p.hp <= 0) {
      this.onPlayerDefeated(enemy);
      return;
    }

    this.turn++;
    this.renderCombatPanel();
    UIRenderer.renderCharacter();
  },

  // ---------- 敌人被击败 ----------
  onEnemyDefeated: function(enemy) {
    log('✨ ' + enemy.name + ' 被击败了！', 'loot');

    const p = GameState.data.player;
    p.gold += enemy.gold;
    GameState.addExp(enemy.exp);

    // 掉落
    if (enemy.loot) {
      enemy.loot.forEach(function(cat) {
        if (cat === 'equipment') {
          const slots = ['weapon', 'chest', 'boots', 'helmet', 'gloves'];
          const slot = slots[Utils.rand(0, slots.length - 1)];
          const item = GameState.genEquipment(slot, enemy.level);
          if (item) {
            InventorySystem.addItem(item);
            log('掉落: ' + item.name, 'loot');
          }
        } else if (cat === 'material') {
          const mats = ['herb', 'ore', 'gem'];
          const mat = GameState.genMaterial(mats[Utils.rand(0, mats.length - 1)]);
          InventorySystem.addItem(mat);
          log('掉落: ' + mat.name, 'loot');
        }
      });
    }

    // 守门员特殊处理
    if (enemy.isGatekeeper) {
      log(enemy.defeatText, 'narrative');
      if (enemy.reward) {
        if (enemy.reward.exp) GameState.addExp(enemy.reward.exp);
        if (enemy.reward.gold) p.gold += enemy.reward.gold;
        if (enemy.reward.unlockZone) {
          SceneSystem.unlockZone(enemy.reward.unlockZone);
          GameState.data.world.gatekeepersDefeated[enemy.key] = true;

          // 解锁经验上限
          const caps = GAME_DATA.expCurve.levelCaps;
          for (let cap in caps) {
            if (p.level >= parseInt(cap) && p.expCap < caps[cap]) {
              p.expCap = caps[cap];
              log('等级上限提升至 ' + caps[cap] + ' 级！', 'system');
            }
          }
        }
      }
    }

    GameState.data.stats.totalKills++;
    this.endCombat();
  },

  // ---------- 玩家被击败 ----------
  onPlayerDefeated: function(enemy) {
    p = GameState.data.player;
    p.hp = 0;

    if (enemy.isGatekeeper) {
      log(enemy.failText, 'narrative');
      // 守门员战败不死亡，送回安全区
      p.hp = 1;
      GameState.data.world.currentFrame = 'village-tavern';
      log('你被送回了酒馆...', 'system');
    } else {
      log('💀 你被击败了...', 'damage');
      p.deaths++;
      p.revivesLeft--;

      if (p.hardcore) {
        p.dead = true;
        p.canPlay = false;
        log('硬核模式：角色已进入碑文模式。', 'system');
      } else {
        if (p.revivesLeft <= 0) {
          log('复活次数已耗尽...', 'system');
          p.dead = true;
          p.canPlay = false;
        } else {
          // 普通模式复活
          p.hp = Math.floor(p.maxHp * 0.3);
          p.exp = Math.floor(p.exp * 0.9); // 损失10%经验
          GameState.data.world.currentFrame = 'village-tavern';
          log('你在酒馆中醒来...失去了一些经验。剩余复活次数: ' + p.revivesLeft, 'system');
        }
      }
    }

    this.endCombat();
    UIRenderer.renderAll();
  },

  // ---------- 逃跑 ----------
  tryEscape: function() {
    if (!this.inCombat) return;
    const enemy = this.enemies[0];
    const p = GameState.data.player;

    const escapeChance = Math.min(0.95, Math.max(0.2, 0.6 + (p.stats.dodge - enemy.agi) * 0.02));
    if (Math.random() < escapeChance) {
      log('你成功逃脱了！', 'info');
      this.endCombat();
    } else {
      log('逃跑失败！', 'system');
      this.enemyTurn();
    }
  },

  // ---------- 结束战斗 ----------
  endCombat: function() {
    this.inCombat = false;
    this.enemies = [];
    this.turn = 0;
    document.getElementById('combat-panel').classList.add('hidden');
    UIRenderer.renderAll();
    GameState.save();
  },

  // ---------- 渲染战斗面板 ----------
  renderCombatPanel: function() {
    if (!this.inCombat || this.enemies.length === 0) return;

    const enemy = this.enemies[0];
    const panel = document.getElementById('combat-panel');

    let html = '<div class="panel" style="border:2px solid var(--red);">';
    html += '<h2>⚔️ 战斗中</h2>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    html += '<div><div style="font-weight:bold;color:var(--red);">' + enemy.name + (enemy.title ? ' — ' + enemy.title : '') + '</div>';
    html += '<div class="small">Lv.' + enemy.level + '</div></div>';
    html += '<div style="text-align:right;"><div>HP: ' + Math.max(0, enemy.hp) + '/' + enemy.maxHp + '</div>';
    html += '<div class="hp-bar" style="width:120px;"><div class="hp-fill" style="width:' + (enemy.hp / enemy.maxHp * 100) + '%"></div></div></div>';
    html += '</div>';

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-danger" onclick="CombatSystem.playerAttack()">⚔️ 攻击</button>';
    html += '<button class="btn" onclick="CombatSystem.tryEscape()">🏃 逃跑</button>';
    html += '</div>';
    html += '</div>';

    panel.innerHTML = html;
  }
};
