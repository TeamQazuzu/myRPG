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
        this.addGameLog(`你与${action.target}交谈...（对话系统开发中）`);
        break;
      case 'inspect':
        this.addGameLog('你仔细查看了一番...（inspect系统开发中）');
        break;
      case 'idle_gather':
        this.addGameLog('挂机采集功能开发中...');
        break;
      default:
        console.warn('[UI] 未知行动类型:', action.type);
    }
  }

  // ========== 战斗画面 ==========
  renderCombat(combat) {
    const container = document.getElementById('combat-container');
    if (!container) return;
    container.style.display = 'flex';

    let html = `
      <div class="combat-header">
        <span class="combat-title">⚔ 战斗</span>
        <span class="combat-round">回合 ${combat.round}/${combat.maxRounds}</span>
      </div>
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
        }
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

    return `
      <div class="unit-card ${side} ${dead ? 'dead' : ''}" data-idx="${idx}" data-unit-id="${unit.id}">
        <div class="unit-name">${sideIcon} ${unit.name} ${dead ? '💀' : ''}</div>
        <div class="unit-hp-text">HP: ${hp}/${maxHp}</div>
        <div class="hp-bar">
          <div class="hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>
        </div>
        <div class="unit-stats">⚔${unit.attack || 0} 🛡${unit.defense || 0} 💨${unit.speed || 0}</div>
      </div>
    `;
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
      <button class="action-btn combat-btn retreat-btn" id="btn-retreat">🏃 撤退</button>
    `;

    document.getElementById('btn-attack').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      const target = this.getSelectedTarget(combat);
      if (target) {
        this.disableButtons();
        combat.playerAction('attack', target);
      }
    });

    document.getElementById('btn-skill').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      const target = this.getSelectedTarget(combat);
      if (target) {
        this.disableButtons();
        combat.playerAction('skill', target);
      }
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

    document.getElementById('btn-retreat').addEventListener('click', () => {
      if (!combat.isPlayerTurn) return;
      if (confirm('确定要撤退吗？')) {
        combat.playerAction('retreat', null);
      }
    });

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

    if (nameEl) nameEl.innerHTML = `${side === 'enemy' ? '🔴' : '🟢'} ${unit.name} ${dead ? '💀' : ''}`;
    if (hpTextEl) hpTextEl.textContent = `HP: ${hp}/${maxHp}`;
    if (hpFillEl) {
      hpFillEl.style.width = hpPct + '%';
      hpFillEl.style.background = hpColor;
    }

    if (dead) card.classList.add('dead');
  }

  // ========== 更新回合提示 ==========
  updateTurnIndicator(unit) {
    const logList = document.getElementById('log-list');
    if (logList && unit) {
      const p = document.createElement('p');
      p.textContent = `— ${unit.name} 的回合 —`;
      p.style.color = 'var(--accent)';
      p.style.textAlign = 'center';
      logList.appendChild(p);
      while (logList.children.length > 6) {
        logList.removeChild(logList.firstChild);
      }
      logList.scrollTop = logList.scrollHeight;
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

  // ========== 背包面板 ==========
  showInventory() {
    if (!window.gameApp || !window.gameApp.state) return;
    const state = window.gameApp.state;
    this.showPanel('背包', `
      <div class="panel-info">容量: ${state.inventory.items.length}/${state.inventory.capacity}</div>
      <div class="inventory-grid">
        ${state.inventory.items.length === 0 ? '<p class="empty-hint">背包空空如也</p>' :
          state.inventory.items.map(item => `
            <div class="inv-item">
              <span class="item-name ${item.rarity || 'white'}">${item.name}</span>
              ${item.stack > 1 ? `<span class="item-stack">x${item.stack}</span>` : ''}
            </div>
          `).join('')
        }
      </div>
    `);
  }

  // ========== 装备面板 ==========
  showEquipment() {
    if (!window.gameApp || !window.gameApp.state) return;
    const state = window.gameApp.state;
    const slots = DATA.equipSlots;
    const slotNames = DATA.slots;
    this.showPanel('装备', `
      <div class="equipment-grid">
        ${slots.map(slot => {
          const item = state.equipment[slot];
          return `
            <div class="eq-slot">
              <span class="eq-slot-name">${slotNames[slot]}</span>
              ${item ? `<span class="item-name ${item.rarity}">${item.name}</span>` : '<span class="eq-empty">空</span>'}
            </div>
          `;
        }).join('')}
      </div>
    `);
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
