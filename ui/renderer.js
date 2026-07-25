// ui/renderer.js - UI渲染器（重写版）
// 布局：顶部信息栏 → 中间场景/战斗 → 底部管理栏
class UIRenderer {
  constructor() {
    this.container = null;
    this.combatEngine = null;
    this.isCombatActive = false;
    this.gameLog = [];
  }

  // ========== 初始化 ==========
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`容器 #${containerId} 不存在`);
      return false;
    }
    this.bindEvents();
    this.renderBottomBar();
    return true;
  }

  // ========== 事件绑定 ==========
  bindEvents() {
    // 场景切换
    document.addEventListener('scene-change', (e) => {
      if (!this.isCombatActive) this.renderScene(e.detail.scene);
    });

    // 战斗开始
    document.addEventListener('combat-start', (e) => {
      this.isCombatActive = true;
      this.combatEngine = e.detail.combat;
      this.showAdventureView(false);
      this.renderCombat(this.combatEngine);
    });

    // 战斗更新
    document.addEventListener('combat-update', (e) => {
      this.updateCombat(e.detail.combat, e.detail.log);
    });

    // 战斗结束
    document.addEventListener('combat-end', (e) => {
      this.showCombatResult(e.detail);
      setTimeout(() => {
        this.showAdventureView(true);
        this.isCombatActive = false;
        // 恢复场景显示
        if (window.gameApp && window.gameApp.sceneManager) {
          const scene = window.gameApp.sceneManager.getCurrentScene();
          if (scene) this.renderScene(scene);
        }
        // 更新玩家信息
        if (window.gameApp) window.gameApp.updatePlayerInfo();
      }, 2500);
    });

    // 玩家回合
    document.addEventListener('combat-player-turn', (e) => {
      this.enableButtons(true);
      this.updateTurnIndicator(e.detail.unit);
    });

    // 技能选择面板请求（combat.js发出）
    document.addEventListener('combat-select-skill', (e) => {
      this.showSkillPanel(e.detail.combat);
    });

    // 游戏日志
    document.addEventListener('game-log', (e) => {
      this.addGameLog(e.detail.message);
    });
  }

  // ========== 冒险画面 ==========
  renderScene(scene) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    container.style.display = 'flex';

    const isSafe = scene.type === 'safe';
    const typeLabel = isSafe ? '安全区' : '野外';
    const typeClass = isSafe ? 'safe' : 'wild';

    let html = `
      <div class="scene-header">
        <h2 class="scene-name">${scene.name}</h2>
        <span class="scene-type ${typeClass}">${typeLabel}</span>
      </div>
      <div class="scene-desc">${scene.desc}</div>
    `;

    // 行动按钮
    if (scene.actions && scene.actions.length > 0) {
      html += '<div class="scene-actions">';
      scene.actions.forEach((action, i) => {
        html += `<button class="action-btn scene-action" data-action-idx="${i}">${action.label}</button>`;
      });
      html += '</div>';
    }

    // 出口
    if (scene.exits && scene.exits.length > 0) {
      html += '<div class="scene-exits">';
      html += '<span class="exits-label">前往：</span>';
      scene.exits.forEach(exit => {
        const exitScene = window.gameApp && window.gameApp.sceneManager && window.gameApp.sceneManager.scenes && window.gameApp.sceneManager.scenes[exit];
        const exitName = exitScene ? exitScene.name : exit;
        const exitType = exitScene ? exitScene.type : 'safe';
        const icon = exitType === 'wild' ? '⚔' : '→';
        html += `<button class="exit-btn" data-scene="${exit}">${icon} ${exitName}</button>`;
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // 绑定行动按钮
    container.querySelectorAll('.scene-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.actionIdx);
        this.handleSceneAction(scene.actions[idx]);
      });
    });

    // 绑定出口按钮
    container.querySelectorAll('.exit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sceneName = btn.dataset.scene;
        if (window.gameApp && window.gameApp.sceneManager) {
          window.gameApp.sceneManager.enterScene(sceneName);
        }
      });
    });
  }

  // ========== 处理场景行动 ==========
  handleSceneAction(action) {
    console.log('[UI] 场景行动:', action.type, action.label);
    const sm = window.gameApp && window.gameApp.sceneManager;
    if (!sm) return;

    switch (action.type) {
      case 'battle':
        sm.triggerBattle(action.enemies);
        break;
      case 'gather':
        sm.gather(action.target, action.amount);
        break;
      case 'rest':
        sm.rest();
        break;
      case 'talk':
        if (DialogueSystem) {
          DialogueSystem.startDialogue(action.target);
        } else {
          this.addGameLog('你与' + action.target + '交谈...（对话系统不可用）');
        }
        break;
      case 'inspect':
        this.addGameLog('你仔细查看了一番...（inspect系统开发中）');
        break;
      case 'idle_gather':
        this.startIdleGather(action.target);
        break;
      case 'heal_partial':
        sm.healPartial();
        break;
      case 'boss_battle':
        if (sm.triggerBossBattle) {
          sm.triggerBossBattle(action.target);
        } else {
          this.addGameLog('Boss战斗系统不可用');
        }
        break;
      default:
        console.warn('[UI] 未知行动类型:', action.type);
    }
  }

  // ========== 挂机采集 ==========
  startIdleGather(target) {
    var sm = window.gameApp && window.gameApp.sceneManager ? window.gameApp.sceneManager : null;
    if (!sm) {
      this.addGameLog('场景管理器不可用');
      return;
    }

    // 执行挂机采集
    var results = sm.idleGather(target, 8);

    // 构建结算面板HTML
    var html = '<div class="idle-gather-results">';
    html += '<div class="idle-gather-title">📦 挂机采集结算</div>';
    html += '<div class="idle-gather-summary">';

    // 汇总数据
    html += '<div class="idle-gather-stat">采集目标：<span>' + results.target + '</span></div>';
    html += '<div class="idle-gather-stat">采集轮数：<span>' + results.cycles + ' 轮</span></div>';
    html += '<div class="idle-gather-stat">材料获得：<span class="stat-success">' + results.itemsGathered + ' 个</span></div>';
    html += '<div class="idle-gather-stat">金币获得：<span class="stat-gold">' + results.goldFound + ' 金</span></div>';
    html += '<div class="idle-gather-stat">遭遇敌人：<span class="stat-danger">' + results.enemiesEncountered + ' 次（全部击败）</span></div>';

    if (results.rareFinds.length > 0) {
      html += '<div class="idle-gather-stat">稀有发现：<span class="stat-rare">' + results.rareFinds.join('、') + '</span></div>';
    }

    html += '</div>';

    // 详细日志
    html += '<div class="idle-gather-log-title">📜 采集日志</div>';
    html += '<div class="idle-gather-log">';
    for (var i = 0; i < results.log.length; i++) {
      html += '<p>' + results.log[i] + '</p>';
    }
    html += '</div>';

    html += '</div>';

    // 显示结算面板
    this.showPanel('挂机采集结算', html);

    // 同时在游戏日志中添加简报
    this.addGameLog('挂机采集完成：获得' + results.target + ' x' + results.itemsGathered + '，金币 +' + results.goldFound);
  }

  // ========== 战斗画面 ==========
  renderCombat(combat) {
    const container = document.getElementById('combat-container');
    if (!container) return;
    container.style.display = 'flex';

    // Boss战阶段指示器
    var bossPhaseHtml = '';
    if (combat.isBossCombat && combat.maxPhase > 1) {
      var phaseName = combat.gkData && combat.gkData.name ? combat.gkData.name : 'Boss';
      var phaseDots = '';
      for (var p = 1; p <= combat.maxPhase; p++) {
        phaseDots += p === combat.phase ? '🔴' : '⚪';
      }
      bossPhaseHtml = '<div class="boss-phase-bar"><span class="boss-name">' + phaseName + '</span><span class="boss-phases">' + phaseDots + '</span></div>';
    } else if (combat.isBossCombat) {
      var phaseName2 = combat.gkData && combat.gkData.name ? combat.gkData.name : 'Boss';
      bossPhaseHtml = '<div class="boss-phase-bar"><span class="boss-name">' + phaseName2 + '</span></div>';
    }

    var retreatHint = combat.isRetreatBlocked ? '<span class="no-retreat-hint">禁止撤退</span>' : '';

    let html = `
      <div class="combat-header">
        <span class="combat-title">${combat.isBossCombat ? '👑 Boss战' : '⚔ 战斗'}</span>
        <span class="combat-round">回合 ${combat.round}/${combat.maxRounds}</span>
        ${retreatHint}
      </div>
      ${bossPhaseHtml}
    `;

    // 敌方区域
    html += '<div class="combat-enemy-area">';
    html += '<div class="combat-side-label">敌方</div>';
    html += '<div class="combat-units" id="enemy-units">';
    combat.getEnemyUnits().forEach((enemy, i) => {
      html += this.renderUnitCard(enemy, 'enemy', i);
    });
    html += '</div></div>';

    // 分隔
    html += '<div class="combat-vs">VS</div>';

    // 我方区域
    html += '<div class="combat-ally-area">';
    html += '<div class="combat-side-label">我方</div>';
    html += '<div class="combat-units" id="ally-units">';
    html += this.renderUnitCard(combat.getPlayerUnit(), 'player', 0);
    combat.getAllyUnits().forEach((ally, i) => {
      html += this.renderUnitCard(ally, 'ally', i + 1);
    });
    html += '</div></div>';

    container.innerHTML = html;

    // 渲染日志区
    this.renderCombatLog();

    // 渲染行动按钮
    this.renderCombatButtons(combat);

    // 绑定敌人选择
    container.querySelectorAll('.unit-card.enemy').forEach(el => {
      el.addEventListener('click', () => {
        if (!combat.isPlayerTurn) return;
        const idx = parseInt(el.dataset.idx);
        const enemy = combat.getEnemyUnits()[idx];
        if (enemy && enemy.alive && enemy.hp > 0) {
          container.querySelectorAll('.unit-card').forEach(c => c.classList.remove('selected'));
          el.classList.add('selected');
          combat.setSelectedTarget(enemy);
          // 如果已选中技能，点击敌方目标直接释放技能
          if (combat.selectedSkill) {
            this.disableButtons();
            combat.playerAction('skill', enemy);
          }
        }
      });
    });

    // 绑定己方单位选择（治疗技能需要选己方目标）
    container.querySelectorAll('.unit-card.player, .unit-card.ally').forEach(el => {
      el.addEventListener('click', () => {
        if (!combat.isPlayerTurn) return;
        if (!combat.selectedSkill) return; // 没有选中技能时不响应
        // 检查选中技能是否为治疗型
        var skill = DATA && DATA.skills && DATA.skills[combat.selectedSkill] ? DATA.skills[combat.selectedSkill] : null;
        if (!skill) return;
        var isHeal = skill.element === 'heal' || (skill.baseHeal !== null && skill.baseHeal !== undefined);
        if (!isHeal) return; // 非治疗技能不能选己方

        // 获取点击的己方单位
        var idx = parseInt(el.dataset.idx);
        var targetUnit = null;
        if (idx === 0) {
          targetUnit = combat.getPlayerUnit();
        } else {
          var allies = combat.getAllyUnits();
          if (idx - 1 < allies.length) targetUnit = allies[idx - 1];
        }
        if (!targetUnit || !targetUnit.alive || targetUnit.hp <= 0) return;

        container.querySelectorAll('.unit-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        el.classList.add('heal-target');
        combat.setSelectedTarget(targetUnit);
        this.disableButtons();
        combat.playerAction('skill', targetUnit);
      });
    });
  }

  // ========== 渲染单位卡片 ==========
  renderUnitCard(unit, side, idx) {
    const maxHp = unit.maxHp || 100;
    const hp = Math.max(0, unit.hp || 0);
    const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    const hpColor = hpPct > 50 ? '#5a9e5a' : hpPct > 25 ? '#d4a040' : '#c05050';
    const dead = !unit.alive || hp <= 0;
    const sideIcon = side === 'enemy' ? '🔴' : '🟢';
    const statusIcons = this.renderStatusIcons(unit);

    return `
      <div class="unit-card ${side} ${dead ? 'dead' : ''}" data-idx="${idx}" data-unit-id="${unit.id}">
        <div class="unit-name">${sideIcon} ${unit.name} ${dead ? '💀' : ''}</div>
        <div class="unit-hp-text">HP: ${hp}/${maxHp}</div>
        <div class="hp-bar">
          <div class="hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>
        </div>
        <div class="unit-stats">⚔${Math.round(unit.attack || 0)} 🛡${Math.round(unit.defense || 0)} 💨${(unit.speed || 0).toFixed(1)}</div>
        ${statusIcons}
      </div>
    `;
  }

  // ========== 渲染异常状态图标 ==========
  renderStatusIcons(unit) {
    if (!unit || !unit.statusEffects) return '';
    var icons = [];
    var se = unit.statusEffects;

    // 流血 🩸
    if (se.bleed && se.bleed.duration > 0) {
      icons.push('<span class="status-icon status-bleed" title="流血（每回合受到伤害，剩' + se.bleed.duration + '回合）">🩸' + se.bleed.duration + '</span>');
    }
    // 灼烧 🔥
    if (se.burn && se.burn.duration > 0) {
      icons.push('<span class="status-icon status-burn" title="灼烧（' + se.burn.stacks + '层，每回合受到伤害，剩' + se.burn.duration + '回合）">🔥' + se.burn.stacks + '</span>');
    }
    // 减速 ❄
    if (se.slow && se.slow.duration > 0) {
      icons.push('<span class="status-icon status-slow" title="减速（速度-30%，剩' + se.slow.duration + '回合）">❄' + se.slow.duration + '</span>');
    }
    // 僵直 ⚡
    if (se.stun && se.stun.duration > 0) {
      icons.push('<span class="status-icon status-stun" title="僵直（无法行动，剩' + se.stun.duration + '回合）">⚡' + se.stun.duration + '</span>');
    }

    if (icons.length === 0) return '';
    return '<div class="unit-status-icons">' + icons.join('') + '</div>';
  }

  // ========== 渲染战斗日志 ==========
  renderCombatLog() {
    const container = document.getElementById('combat-log');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '<div class="log-title">战斗日志</div><div class="log-list" id="log-list"></div>';

    const logList = container.querySelector('#log-list');
    const recent = this.combatEngine.combatLog.slice(-6);
    recent.forEach(msg => {
      const p = document.createElement('p');
      p.textContent = msg;
      logList.appendChild(p);
    });
    logList.scrollTop = logList.scrollHeight;
  }

  // ========== 渲染战斗按钮 ==========
  renderCombatButtons(combat) {
    const container = document.getElementById('action-buttons');
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = `
      <button class="action-btn combat-btn" id="btn-attack">⚔ 攻击</button>
      <button class="action-btn combat-btn" id="btn-skill">✨ 技能</button>
      <button class="action-btn combat-btn" id="btn-defend">🛡 防御</button>
      <button class="action-btn combat-btn" id="btn-item">🎒 道具</button>
      ${combat.isRetreatBlocked ? '' : '<button class="action-btn combat-btn retreat-btn" id="btn-retreat">🏃 撤退</button>'}
    `;

    document.getElementById('btn-attack').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      // 攻击时取消已选择的技能
      combat.selectedSkill = null;
      this.updateSkillButtonHint(combat);
      const target = this.getSelectedTarget(combat);
      if (target) {
        this.disableButtons();
        combat.playerAction('attack', target);
      }
    });

    document.getElementById('btn-skill').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      // 点击技能按钮，触发 combat-select-skill 事件让 combat.js 处理
      // 如果已选中技能且有目标，直接执行
      if (combat.selectedSkill) {
        var target = this.getSelectedTarget(combat);
        if (target) {
          this.disableButtons();
          combat.playerAction('skill', target);
          return;
        }
      }
      // 否则通知combat显示技能选择面板
      this.disableButtons();
      combat.playerAction('skill', null);
    });

    document.getElementById('btn-defend').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      this.disableButtons();
      combat.playerAction('defend', null);
    });

    document.getElementById('btn-item').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      this.disableButtons();
      combat.playerAction('item', null);
    });

    var retreatBtn = document.getElementById('btn-retreat');
    if (retreatBtn) {
      retreatBtn.addEventListener('click', () => {
        if (!combat.isPlayerTurn) return;
        if (confirm('确定要撤退吗？')) {
          combat.playerAction('retreat', null);
        }
      });
    }

    this.enableButtons(combat.isPlayerTurn);
  }

  // ========== 获取选中目标 ==========
  getSelectedTarget(combat) {
    if (combat.selectedTarget && combat.selectedTarget.alive && combat.selectedTarget.hp > 0) {
      return combat.selectedTarget;
    }
    // 自动选第一个活着的敌人
    const target = combat.getEnemyUnits().find(e => e.alive && e.hp > 0);
    if (target) {
      combat.setSelectedTarget(target);
    }
    return target;
  }

  // ========== 更新战斗画面 ==========
  updateCombat(combat, log) {
    if (!combat) return;

    // 更新敌人卡片
    combat.getEnemyUnits().forEach((enemy, i) => {
      this.updateUnitCard(enemy, 'enemy', i);
    });

    // 更新玩家卡片
    this.updateUnitCard(combat.getPlayerUnit(), 'player', 0);
    combat.getAllyUnits().forEach((ally, i) => {
      this.updateUnitCard(ally, 'ally', i + 1);
    });

    // 更新回合数
    const roundEl = document.querySelector('.combat-round');
    if (roundEl) roundEl.textContent = `回合 ${combat.round}/${combat.maxRounds}`;

    // 更新日志
    if (log) {
      const logList = document.getElementById('log-list');
      if (logList) {
        const p = document.createElement('p');
        p.textContent = log;
        logList.appendChild(p);
        // 只保留最后6条
        while (logList.children.length > 6) {
          logList.removeChild(logList.firstChild);
        }
        logList.scrollTop = logList.scrollHeight;
      }
    }

    this.enableButtons(combat.isPlayerTurn);
  }

  // ========== 更新单个单位卡片 ==========
  updateUnitCard(unit, side, idx) {
    const container = document.getElementById('combat-container');
    if (!container) return;
    const card = container.querySelector(`.unit-card[data-idx="${idx}"][data-unit-id="${unit.id}"]`);
    if (!card) return;

    const maxHp = unit.maxHp || 100;
    const hp = Math.max(0, unit.hp || 0);
    const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    const hpColor = hpPct > 50 ? '#5a9e5a' : hpPct > 25 ? '#d4a040' : '#c05050';
    const dead = !unit.alive || hp <= 0;

    const nameEl = card.querySelector('.unit-name');
    const hpTextEl = card.querySelector('.unit-hp-text');
    const hpFillEl = card.querySelector('.hp-fill');
    const statsEl = card.querySelector('.unit-stats');

    if (nameEl) nameEl.innerHTML = `${side === 'enemy' ? '🔴' : '🟢'} ${unit.name} ${dead ? '💀' : ''}`;
    if (hpTextEl) hpTextEl.textContent = `HP: ${hp}/${maxHp}`;
    if (hpFillEl) {
      hpFillEl.style.width = hpPct + '%';
      hpFillEl.style.background = hpColor;
    }
    if (statsEl) statsEl.textContent = `⚔${Math.round(unit.attack || 0)} 🛡${Math.round(unit.defense || 0)} 💨${(this.combatEngine ? this.combatEngine.getEffectiveSpeed(unit).toFixed(1) : (unit.speed || 0).toFixed(1))}`;

    // 更新状态图标
    var oldStatusEl = card.querySelector('.unit-status-icons');
    if (oldStatusEl) oldStatusEl.remove();
    var statusHtml = this.renderStatusIcons(unit);
    if (statusHtml) {
      card.insertAdjacentHTML('beforeend', statusHtml);
    }

    if (dead) card.classList.add('dead');
  }

  // ========== 更新回合提示 ==========
  updateTurnIndicator(unit) {
    const logList = document.getElementById('log-list');
    if (logList && unit) {
      const p = document.createElement('p');
      // 如果当前有选中的技能，在回合提示中显示
      var hint = unit.name + ' 的回合';
      if (this.combatEngine && this.combatEngine.selectedSkill && DATA && DATA.skills && DATA.skills[this.combatEngine.selectedSkill]) {
        var selectedSkillName = DATA.skills[this.combatEngine.selectedSkill].name;
        hint += '（已选技能：' + selectedSkillName + '，请点击敌方目标释放）';
      }
      p.textContent = '-- ' + hint + ' --';
      p.style.color = 'var(--accent)';
      p.style.textAlign = 'center';
      logList.appendChild(p);
      while (logList.children.length > 6) {
        logList.removeChild(logList.firstChild);
      }
      logList.scrollTop = logList.scrollHeight;
    }
  }

  // ========== 技能选择面板 ==========
  showSkillPanel(combat) {
    if (!window.gameApp || !window.gameApp.state) {
      this.enableButtons(true);
      return;
    }
    var state = window.gameApp.state;
    // 获取可用技能列表
    var available = SkillSystem && SkillSystem.getAvailableSkills ? SkillSystem.getAvailableSkills(state) : [];
    if (available.length === 0) {
      this.addGameLog('当前没有可用的技能');
      this.enableButtons(true);
      return;
    }

    // 构建技能列表HTML
    var skillListHtml = '<div class="skill-list">';
    for (var i = 0; i < available.length; i++) {
      var skill = available[i];
      // 检查冷却状态
      var cdRemaining = (combat.cooldowns && combat.cooldowns[skill.id]) || 0;
      var canUse = state.player.mp >= skill.mpCost && cdRemaining <= 0;
      var cdText = cdRemaining > 0 ? ' [冷却中 ' + cdRemaining + '回合]' : '';
      var disabledClass = canUse ? '' : ' disabled';
      var mpColor = state.player.mp >= skill.mpCost ? '#66bbff' : '#ff6666';
      skillListHtml += '<button class="skill-item' + disabledClass + '" data-skill-id="' + skill.id + '"' + (canUse ? '' : ' disabled') + '>';
      skillListHtml += '<div class="skill-item-name">' + skill.name + '</div>';
      skillListHtml += '<div class="skill-item-info">';
      skillListHtml += '<span class="skill-mp" style="color:' + mpColor + '">MP ' + skill.mpCost + '</span>';
      skillListHtml += '<span class="skill-cd">' + cdText + '</span>';
      skillListHtml += '</div>';
      skillListHtml += '<div class="skill-item-desc">' + skill.desc + '</div>';
      skillListHtml += '</button>';
    }
    skillListHtml += '</div>';

    // 使用通用面板显示技能列表
    this.showPanel('选择技能', skillListHtml);

    // 绑定技能点击事件
    var self = this;
    var panelOverlay = document.getElementById('panel-overlay');
    if (panelOverlay) {
      var skillBtns = panelOverlay.querySelectorAll('.skill-item:not(.disabled)');
      for (var j = 0; j < skillBtns.length; j++) {
        (function(btn) {
          btn.addEventListener('click', function() {
            var skillId = btn.getAttribute('data-skill-id');
            // 设置选中的技能
            combat.selectedSkill = skillId;
            // 关闭面板
            self.closePanel();
            // 更新按钮文字提示
            self.updateSkillButtonHint(combat);
            // 更新回合提示
            self.updateTurnIndicator(combat.playerUnit);
            // 重新启用按钮，让玩家选择目标
            self.enableButtons(true);
          });
        })(skillBtns[j]);
      }
    }

    // 面板关闭时重新启用按钮
    this._skillPanelClosed = false;
  }

  // ========== 更新技能按钮提示文字 ==========
  updateSkillButtonHint(combat) {
    var skillBtn = document.getElementById('btn-skill');
    if (!skillBtn) return;
    if (combat.selectedSkill && DATA && DATA.skills && DATA.skills[combat.selectedSkill]) {
      var skillName = DATA.skills[combat.selectedSkill].name;
      skillBtn.textContent = '>> ' + skillName + ' <<';
      skillBtn.classList.add('skill-selected');
    } else {
      skillBtn.textContent = '>> 技能 <<';
      skillBtn.classList.remove('skill-selected');
    }
  }

  // ========== 按钮控制 ==========
  enableButtons(enabled) {
    document.querySelectorAll('.combat-btn').forEach(btn => {
      btn.disabled = !enabled;
    });
  }

  disableButtons() {
    document.querySelectorAll('.combat-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  // ========== 显示战斗结果 ==========
  showCombatResult(detail) {
    const el = document.getElementById('combat-result');
    if (!el) return;

    const { result, message, rewards } = detail;
    let html = `<div class="result-message">${message}</div>`;

    if (rewards) {
      html += '<div class="result-rewards">';
      html += `<span>经验 +${rewards.exp}</span>`;
      html += `<span>金币 +${rewards.gold}</span>`;
      if (rewards.drops && rewards.drops.length > 0) {
        html += `<span>掉落: ${rewards.drops.map(d => d.name).join(', ')}</span>`;
      }
      if (rewards.expResult && rewards.expResult.leveled) {
        html += '<span class="level-up">升级了！</span>';
      }
      html += '</div>';
    }

    el.innerHTML = html;
    el.className = 'combat-result ' + result;
    el.style.display = 'block';

    setTimeout(() => { el.style.display = 'none'; }, 2500);
  }

  // ========== 视图切换 ==========
  showAdventureView(show) {
    const scene = document.getElementById('scene-container');
    const combat = document.getElementById('combat-container');
    const log = document.getElementById('combat-log');
    const buttons = document.getElementById('action-buttons');

    if (show) {
      if (scene) scene.style.display = 'flex';
      if (combat) { combat.style.display = 'none'; combat.innerHTML = ''; }
      if (log) { log.style.display = 'none'; log.innerHTML = ''; }
      if (buttons) { buttons.style.display = 'none'; buttons.innerHTML = ''; }
    } else {
      if (scene) scene.style.display = 'none';
      if (combat) combat.style.display = 'flex';
      if (log) log.style.display = 'block';
      if (buttons) buttons.style.display = 'flex';
    }
  }

  // ========== 玩家信息栏 ==========
  updatePlayerInfo(player) {
    const container = document.getElementById('player-info');
    if (!container || !player) return;

    const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
    const mpPct = player.maxMp > 0 ? (player.mp / player.maxMp) * 100 : 0;

    container.innerHTML = `
      <div class="player-bar">
        <span class="player-name">${player.name}</span>
        <span class="player-level">Lv.${player.level || 1}</span>
        <div class="player-resource">
          <span class="resource-label">HP</span>
          <div class="resource-bar"><div class="resource-fill hp" style="width:${hpPct}%"></div></div>
          <span class="resource-text">${player.hp}/${player.maxHp}</span>
        </div>
        <div class="player-resource">
          <span class="resource-label">MP</span>
          <div class="resource-bar"><div class="resource-fill mp" style="width:${mpPct}%"></div></div>
          <span class="resource-text">${player.mp}/${player.maxMp}</span>
        </div>
        <span class="player-gold">💰${player.gold || 0}</span>
      </div>
    `;
  }

  // ========== 底部管理栏 ==========
  renderBottomBar() {
    const bar = document.getElementById('bottom-bar');
    if (!bar) return;
    bar.innerHTML = `
      <button class="bottom-btn" id="btn-inventory">🎒 背包</button>
      <button class="bottom-btn" id="btn-equipment">⚔ 装备</button>
      <button class="bottom-btn" id="btn-team">👥 队伍</button>
      <button class="bottom-btn" id="btn-save">💾 存档</button>
      <button class="bottom-btn" id="btn-settings">⚙ 设置</button>
    `;

    document.getElementById('btn-inventory').addEventListener('click', () => this.showInventory());
    document.getElementById('btn-equipment').addEventListener('click', () => this.showEquipment());
    document.getElementById('btn-team').addEventListener('click', () => this.showTeam());
    document.getElementById('btn-save').addEventListener('click', () => this.showSaveMenu());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
  }

  // ========== 背包面板（增强版） ==========
  showInventory() {
    if (!window.gameApp || !window.gameApp.state) return;
    var state = window.gameApp.state;
    var self = this;

    // 记录当前筛选和搜索状态
    this._invFilter = this._invFilter || 'all';
    this._invSearch = this._invSearch || '';

    // 获取显示的物品列表
    var items = state.inventory.items;
    if (this._invSearch && InventorySystem && InventorySystem.searchInventory) {
      items = InventorySystem.searchInventory(state, this._invSearch);
    }
    if (this._invFilter !== 'all') {
      items = items.filter(function(i) { return i.rarity === self._invFilter; });
    }

    // 构建品质筛选按钮
    var rarityOptions = [
      { key: 'all', label: '全部' },
      { key: 'white', label: '白色' },
      { key: 'green', label: '绿色' },
      { key: 'blue', label: '蓝色' },
      { key: 'purple', label: '紫色' },
      { key: 'orange', label: '橙色' },
      { key: 'red', label: '红色' }
    ];
    var filterHtml = '<div class="filter-bar">';
    for (var f = 0; f < rarityOptions.length; f++) {
      var opt = rarityOptions[f];
      var activeClass = this._invFilter === opt.key ? ' active' : '';
      filterHtml += '<button class="filter-btn' + activeClass + '" data-filter="' + opt.key + '">' + opt.label + '</button>';
    }
    filterHtml += '</div>';

    // 构建物品列表HTML
    var itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = '<p class="empty-hint">背包空空如也</p>';
    } else {
      itemsHtml = '<div class="inventory-grid">';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        itemsHtml += '<div class="inv-item" data-item-id="' + item.id + '">';
        itemsHtml += '<span class="item-name ' + (item.rarity || 'white') + '">' + item.name + '</span>';
        if (item.stack > 1) {
          itemsHtml += '<span class="item-stack">x' + item.stack + '</span>';
        }
        if (item.level) {
          itemsHtml += '<span class="inv-item-level">Lv.' + item.level + '</span>';
        }
        itemsHtml += '</div>';
      }
      itemsHtml += '</div>';
    }

    // 搜索框
    var searchHtml = '<div class="search-bar"><input type="text" class="search-input" placeholder="搜索物品..." value="' + this._invSearch + '"></div>';

    // 组合内容
    var content = searchHtml + filterHtml + '<div class="panel-info">容量: ' + state.inventory.items.length + '/' + state.inventory.capacity + '</div>' + itemsHtml;

    this.showPanel('背包', content);

    // 绑定搜索事件
    var searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        self._invSearch = searchInput.value;
        self.showInventory();
      });
      // 自动聚焦搜索框
      searchInput.focus();
    }

    // 绑定筛选按钮事件
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var b = 0; b < filterBtns.length; b++) {
      filterBtns[b].addEventListener('click', function() {
        self._invFilter = this.getAttribute('data-filter');
        self.showInventory();
      });
    }

    // 绑定物品点击事件 —— 显示详情子面板
    var invItems = document.querySelectorAll('.inv-item[data-item-id]');
    for (var j = 0; j < invItems.length; j++) {
      invItems[j].addEventListener('click', function() {
        var itemId = this.getAttribute('data-item-id');
        var targetItem = null;
        // 在完整物品列表中查找（不仅限于筛选后的）
        for (var k = 0; k < state.inventory.items.length; k++) {
          if (state.inventory.items[k].id === itemId) {
            targetItem = state.inventory.items[k];
            break;
          }
        }
        if (targetItem) {
          self.showItemDetail(targetItem, false, null);
        }
      });
    }
  }

  // ========== 装备面板（增强版） ==========
  showEquipment() {
    if (!window.gameApp || !window.gameApp.state) return;
    var state = window.gameApp.state;
    var self = this;
    var slots = DATA.equipSlots;
    var slotNames = DATA.slots;

    // 装备属性总和
    var totalStats = { physAtk: 0, magAtk: 0, physDef: 0, magDef: 0 };
    if (EquipmentSystem && EquipmentSystem.getTotalStats) {
      totalStats = EquipmentSystem.getTotalStats(state);
    }
    var totalHtml = '<div class="eq-total-stats">';
    totalHtml += '<span>装备总属性：</span>';
    if (totalStats.physAtk > 0) totalHtml += '<span class="stat-atk">物攻+' + totalStats.physAtk + '</span>';
    if (totalStats.magAtk > 0) totalHtml += '<span class="stat-matk">法攻+' + totalStats.magAtk + '</span>';
    if (totalStats.physDef > 0) totalHtml += '<span class="stat-def">物防+' + totalStats.physDef + '</span>';
    if (totalStats.magDef > 0) totalHtml += '<span class="stat-mdef">法防+' + totalStats.magDef + '</span>';
    if (totalStats.physAtk === 0 && totalStats.magAtk === 0 && totalStats.physDef === 0 && totalStats.magDef === 0) {
      totalHtml += '<span>无装备</span>';
    }
    totalHtml += '</div>';

    // 构建装备槽位HTML
    var eqHtml = '<div class="equipment-grid">';
    for (var s = 0; s < slots.length; s++) {
      var slot = slots[s];
      var item = state.equipment[slot];
      eqHtml += '<div class="eq-slot" data-eq-slot="' + slot + '">';
      eqHtml += '<span class="eq-slot-name">' + slotNames[slot] + '</span>';
      if (item) {
        // 显示装备名称和简要属性
        eqHtml += '<div class="eq-slot-info">';
        eqHtml += '<span class="item-name ' + (item.rarity || 'white') + '">' + item.name + '</span>';
        eqHtml += '<span class="eq-slot-level">Lv.' + (item.level || 1) + '</span>';
        // 基础属性摘要
        if (item.baseStats) {
          var statParts = [];
          if (item.baseStats.physAtk) statParts.push('攻' + item.baseStats.physAtk);
          if (item.baseStats.magAtk) statParts.push('法' + item.baseStats.magAtk);
          if (item.baseStats.physDef) statParts.push('防' + item.baseStats.physDef);
          if (item.baseStats.magDef) statParts.push('魔防' + item.baseStats.magDef);
          if (statParts.length > 0) {
            eqHtml += '<span class="eq-slot-stats">' + statParts.join(' ') + '</span>';
          }
        }
        eqHtml += '</div>';
      } else {
        eqHtml += '<span class="eq-empty">空</span>';
      }
      eqHtml += '</div>';
    }
    eqHtml += '</div>';

    var content = totalHtml + eqHtml;
    this.showPanel('装备', content);

    // 绑定已装备物品的点击事件
    var eqSlots = document.querySelectorAll('.eq-slot[data-eq-slot]');
    for (var j = 0; j < eqSlots.length; j++) {
      eqSlots[j].addEventListener('click', function() {
        var slotKey = this.getAttribute('data-eq-slot');
        var eqItem = state.equipment[slotKey];
        if (eqItem) {
          self.showItemDetail(eqItem, true, slotKey);
        }
      });
    }
  }

  // ========== 物品详情子面板 ==========
  // isEquipped: 是否已装备的物品（true=装备面板点击，false=背包点击）
  // slotKey: 如果已装备，传入槽位名称
  showItemDetail(item, isEquipped, slotKey) {
    var self = this;
    var state = window.gameApp && window.gameApp.state;

    // 物品名称（带品质颜色）
    var detailHtml = '<div class="item-detail">';
    detailHtml += '<div class="item-detail-name ' + (item.rarity || 'white') + '">' + item.name + '</div>';

    // 物品描述
    if (item.desc) {
      detailHtml += '<div class="item-detail-desc">' + item.desc + '</div>';
    }

    // 等级和类型信息
    detailHtml += '<div class="item-detail-meta">';
    if (item.level) detailHtml += '<span>Lv.' + item.level + '</span>';
    if (item.type) {
      // 获取类型中文名
      var typeName = item.type;
      if (DATA && DATA.slots && DATA.slots[item.type]) {
        typeName = DATA.slots[item.type];
      }
      detailHtml += '<span>类型：' + typeName + '</span>';
    }
    // 品质名称
    if (item.rarity && DATA && DATA.rarity && DATA.rarity[item.rarity]) {
      detailHtml += '<span>品质：' + DATA.rarity[item.rarity].name + '</span>';
    }
    detailHtml += '</div>';

    // 基础属性
    if (item.baseStats) {
      detailHtml += '<div class="item-detail-stats">';
      detailHtml += '<div class="stats-label">基础属性</div>';
      if (item.baseStats.physAtk) detailHtml += '<span>物攻 +' + item.baseStats.physAtk + '</span>';
      if (item.baseStats.magAtk) detailHtml += '<span>法攻 +' + item.baseStats.magAtk + '</span>';
      if (item.baseStats.physDef) detailHtml += '<span>物防 +' + item.baseStats.physDef + '</span>';
      if (item.baseStats.magDef) detailHtml += '<span>法防 +' + item.baseStats.magDef + '</span>';
      detailHtml += '</div>';
    }

    // 词条列表
    if (item.affixes && item.affixes.length > 0) {
      detailHtml += '<div class="item-detail-affixes">';
      detailHtml += '<div class="affixes-label">词条</div>';
      for (var a = 0; a < item.affixes.length; a++) {
        var affix = item.affixes[a];
        var affixColor = '';
        // 词条颜色根据品质
        if (DATA && DATA.affixPool && DATA.affixPool[affix.id] && DATA.affixPool[affix.id].minRarity) {
          affixColor = DATA.affixPool[affix.id].minRarity;
        }
        detailHtml += '<div class="affix-item ' + affixColor + '">' + affix.name + '</div>';
      }
      detailHtml += '</div>';
    }

    // 附魔信息
    if (item.enchant) {
      detailHtml += '<div class="item-detail-enchant">';
      detailHtml += '<span>附魔：' + (item.enchant.desc || '未知') + '</span>';
      detailHtml += '</div>';
    }

    // 操作按钮
    detailHtml += '<div class="item-actions">';
    if (isEquipped) {
      // 已装备的物品 —— 卸下、锻造、附魔
      detailHtml += '<button class="item-action-btn btn-unequip" data-action="unequip" data-slot="' + slotKey + '">卸下</button>';
      detailHtml += '<button class="item-action-btn btn-forge" data-action="forge" data-slot="' + slotKey + '">锻造</button>';
      detailHtml += '<button class="item-action-btn btn-enchant" data-action="enchant" data-slot="' + slotKey + '">附魔</button>';
    } else {
      // 背包中的物品 —— 判断类型
      var equipTypes = ['sword','axe','hammer','bow','staff','wand','dagger','shield','armor','helmet','legs','boots','gloves','necklace','ring'];
      var isEquip = equipTypes.indexOf(item.type) !== -1;
      var isConsumable = item.type === 'consumable' || (item.healHp || item.healMp || (item.name && item.name.indexOf('药水') !== -1));

      if (isEquip) {
        detailHtml += '<button class="item-action-btn btn-equip" data-action="equip" data-item-id="' + item.id + '">穿戴</button>';
      }
      if (isConsumable) {
        detailHtml += '<button class="item-action-btn btn-use" data-action="use" data-item-id="' + item.id + '">使用</button>';
      }
      // 所有物品都可以丢弃
      detailHtml += '<button class="item-action-btn btn-discard" data-action="discard" data-item-id="' + item.id + '">丢弃</button>';
    }
    detailHtml += '</div>';
    detailHtml += '</div>';

    // 使用 showPanel 显示详情
    this.showPanel('物品详情', detailHtml);

    // 绑定操作按钮事件
    var actionBtns = document.querySelectorAll('.item-action-btn');
    for (var b = 0; b < actionBtns.length; b++) {
      actionBtns[b].addEventListener('click', function(e) {
        e.stopPropagation();
        var action = this.getAttribute('data-action');

        if (action === 'equip') {
          // 穿戴装备
          var itemId = this.getAttribute('data-item-id');
          if (state && InventorySystem && InventorySystem.equipFromInventory) {
            var result = InventorySystem.equipFromInventory(state, itemId);
            if (result.ok) {
              self.addGameLog(result.equipped ? '装备了 ' + result.equipped.name : '装备成功');
              if (result.replaced) {
                self.addGameLog('旧装备 ' + result.replaced.name + ' 已放入背包');
              }
            } else {
              self.addGameLog(result.msg || result.reason || '装备失败');
              return;
            }
          }
          self.closePanel();
          self.showInventory();
          self.refreshPlayerInfo();
        }

        else if (action === 'use') {
          // 使用消耗品
          var useItemId = this.getAttribute('data-item-id');
          var useItem = null;
          for (var ui = 0; ui < state.inventory.items.length; ui++) {
            if (state.inventory.items[ui].id === useItemId) {
              useItem = state.inventory.items[ui];
              break;
            }
          }
          if (!useItem) return;

          // 恢复HP逻辑
          if (useItem.healHp || (useItem.name && useItem.name.indexOf('药水') !== -1)) {
            var healHp = useItem.healHp || 20;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + healHp);
            self.addGameLog('恢复了 ' + healHp + ' 点生命');
          }
          // 恢复MP逻辑
          if (useItem.healMp) {
            state.player.mp = Math.min(state.player.maxMp, state.player.mp + useItem.healMp);
            self.addGameLog('恢复了 ' + useItem.healMp + ' 点法力');
          }

          // 从背包移除
          if (InventorySystem && InventorySystem.removeFromInventory) {
            InventorySystem.removeFromInventory(state, useItemId, 1);
          }

          self.closePanel();
          self.showInventory();
          self.refreshPlayerInfo();
        }

        else if (action === 'discard') {
          // 丢弃物品
          var discardItemId = this.getAttribute('data-item-id');
          if (confirm('确定要丢弃该物品吗？')) {
            if (state && InventorySystem && InventorySystem.discard) {
              var discardResult = InventorySystem.discard(state, discardItemId);
              if (discardResult.ok) {
                self.addGameLog('物品已丢弃');
              } else {
                self.addGameLog(discardResult.reason || '丢弃失败');
                return;
              }
            }
            self.closePanel();
            self.showInventory();
            self.refreshPlayerInfo();
          }
        }

        else if (action === 'unequip') {
          // 卸下装备
          var unequipSlot = this.getAttribute('data-slot');
          if (state && InventorySystem && InventorySystem.unequipToInventory) {
            var unequipResult = InventorySystem.unequipToInventory(state, unequipSlot);
            if (unequipResult.ok) {
              self.addGameLog('卸下了 ' + unequipResult.item.name);
            } else {
              self.addGameLog(unequipResult.msg || unequipResult.reason || '卸下失败');
              return;
            }
          }
          self.closePanel();
          self.showEquipment();
          self.refreshPlayerInfo();
        }

        else if (action === 'forge') {
          // 锻造装备
          var forgeSlot = this.getAttribute('data-slot');
          var forgeItem = state && state.equipment[forgeSlot];
          if (forgeItem && EquipmentSystem && EquipmentSystem.forge) {
            var forgeResult = EquipmentSystem.forge(forgeItem);
            self.addGameLog(forgeResult.msg || (forgeResult.ok ? '锻造成功' : '锻造失败'));
          }
          self.closePanel();
          self.showEquipment();
          self.refreshPlayerInfo();
        }

        else if (action === 'enchant') {
          // 附魔装备
          var enchantSlot = this.getAttribute('data-slot');
          var enchantItem = state && state.equipment[enchantSlot];
          if (enchantItem && EquipmentSystem && EquipmentSystem.enchant) {
            var enchantResult = EquipmentSystem.enchant(enchantItem);
            self.addGameLog(enchantResult.msg || (enchantResult.ok ? '附魔成功' : '附魔失败'));
          }
          self.closePanel();
          self.showEquipment();
          self.refreshPlayerInfo();
        }
      });
    }
  }

  // ========== 刷新玩家信息栏 ==========
  refreshPlayerInfo() {
    if (window.gameApp && window.gameApp.state && window.gameApp.state.player) {
      this.updatePlayerInfo(window.gameApp.state.player);
    }
  }

  // ========== 队伍面板 ==========
  showTeam() {
    if (!window.gameApp || !window.gameApp.state) return;
    const state = window.gameApp.state;
    const members = [state.player, ...state.companions];
    this.showPanel('队伍', `
      <div class="team-list">
        ${members.map(m => `
          <div class="team-member">
            <span class="member-name">${m.name}</span>
            <span class="member-class">${m.class || ''}</span>
            <span class="member-level">Lv.${m.level}</span>
            <span class="member-hp">HP ${m.hp}/${m.maxHp}</span>
          </div>
        `).join('')}
      </div>
    `);
  }

  // ========== 存档菜单 ==========
  showSaveMenu() {
    this.showPanel('存档', `
      <div class="save-menu">
        <button class="panel-btn" id="save-now">💾 立即保存</button>
        <button class="panel-btn" id="save-export">📤 导出存档</button>
        <button class="panel-btn danger" id="save-delete">🗑 删除存档</button>
      </div>
    `);

    var btn;
    btn = document.getElementById('save-now');
    if (btn) btn.addEventListener('click', () => {
      window.gameApp.saveGame();
      this.addGameLog('存档成功');
      this.closePanel();
    });
    btn = document.getElementById('save-export');
    if (btn) btn.addEventListener('click', () => {
      if (window.gameApp && window.gameApp.state) SaveManager.export(window.gameApp.state);
    });
    btn = document.getElementById('save-delete');
    if (btn) btn.addEventListener('click', () => {
      if (confirm('确定删除存档？此操作不可撤销！')) {
        SaveManager.delete();
        location.reload();
      }
    });
  }

  // ========== 设置面板 ==========
  showSettings() {
    if (!window.gameApp || !window.gameApp.state) return;
    const s = window.gameApp.state.settings;
    this.showPanel('设置', `
      <div class="settings-list">
        <label><input type="checkbox" id="set-autosave" ${s.autoSave ? 'checked' : ''}> 自动存档</label>
        <label><input type="checkbox" id="set-sound" ${s.sound ? 'checked' : ''}> 音效</label>
        <label><input type="checkbox" id="set-music" ${s.music ? 'checked' : ''}> 音乐</label>
      </div>
      <button class="panel-btn" id="settings-save">保存设置</button>
    `);

    var sBtn = document.getElementById('settings-save');
    if (sBtn) sBtn.addEventListener('click', () => {
      s.autoSave = document.getElementById('set-autosave').checked;
      s.sound = document.getElementById('set-sound').checked;
      s.music = document.getElementById('set-music').checked;
      window.gameApp.saveGame();
      this.closePanel();
    });
  }

  // ========== 通用面板 ==========
  showPanel(title, content) {
    this.closePanel();
    const overlay = document.createElement('div');
    overlay.id = 'panel-overlay';
    overlay.className = 'panel-overlay';
    overlay.innerHTML = `
      <div class="panel-box">
        <div class="panel-header">
          <span class="panel-title">${title}</span>
          <button class="panel-close" id="panel-close">✕</button>
        </div>
        <div class="panel-content">${content}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('panel-close').addEventListener('click', () => this.closePanel());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closePanel();
    });
  }

  closePanel() {
    const overlay = document.getElementById('panel-overlay');
    if (overlay) overlay.remove();
  }

  // ========== 游戏日志 ==========
  addGameLog(message) {
    this.gameLog.push(message);
    if (this.gameLog.length > 20) this.gameLog.shift();
    // 在场景描述下方临时显示
    const container = document.getElementById('scene-container');
    if (container && !this.isCombatActive) {
      let logEl = container.querySelector('.game-log-line');
      if (!logEl) {
        logEl = document.createElement('div');
        logEl.className = 'game-log-line';
        container.appendChild(logEl);
      }
      logEl.textContent = message;
      logEl.style.display = 'block';
      // 3秒后淡出
      clearTimeout(this._logTimer);
      this._logTimer = setTimeout(() => {
        if (logEl) logEl.style.display = 'none';
      }, 3000);
    }
  }

  // ========== 角色创建 ==========
  showCharacterCreation(onCreate) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = `
      <div class="character-creation">
        <h2>寻亲风云录</h2>
        <p class="cc-intro">西元720年。你十八岁，是灰烟村酒馆的老板。<br>六岁那年，父母说"出一趟远门"，再也没有回来。</p>
        <div class="cc-form">
          <input type="text" id="player-name" placeholder="你的名字" value="" maxlength="8">
          <select id="player-class">
            <option value="warrior">战士 — 力量/体质，前排坦克</option>
            <option value="ranger">游侠 — 敏捷，远程物理输出</option>
            <option value="mage">法师 — 智力/精神，法术输出</option>
          </select>
          <label class="cc-hardcore"><input type="checkbox" id="hardcore-mode"> 硬核模式（死亡即删档）</label>
          <button id="create-btn">开始冒险</button>
        </div>
      </div>
    `;
    document.getElementById('create-btn').addEventListener('click', () => {
      const name = document.getElementById('player-name').value.trim() || '勇者';
      const classKey = document.getElementById('player-class').value;
      const hardcore = document.getElementById('hardcore-mode').checked;
      onCreate(name, classKey, hardcore);
    });
  }
}
