class UIRenderer {
  constructor() {
    this.container = null;
    this.combatEngine = null;
    this.isCombatActive = false;
    this._currentView = "scene";
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) { console.error('容器不存在'); return false; }
    this._buildLayout();
    this._bindEvents();
    return true;
  }

  _buildLayout() {
    this.container.innerHTML = `
      <div class="app-header">
        <div class="header-left">
          <span class="loc-name" id="loc-name">灰烟村</span>
          <span class="loc-detail" id="loc-detail"></span>
        </div>
        <div class="header-right">
          <span>Lv.<span id="player-level">1</span></span>
          <span class="gold-display" id="gold-display">50金</span>
        </div>
      </div>
      <div class="app-body" id="app-body">
        <div class="scene-view" id="scene-view"></div>
        <div class="combat-view" id="combat-view" style="display:none"></div>
        <div class="panel-view" id="panel-view" style="display:none"></div>
      </div>
      <div class="app-footer">
        <div class="action-bar" id="action-bar"></div>
        <div class="menu-bar" id="menu-bar">
          <button class="menu-btn" data-panel="inventory">🎒 背包</button>
          <button class="menu-btn" data-panel="equipment">⚔️ 装备</button>
          <button class="menu-btn" data-panel="companions">👥 同伴</button>
          <button class="menu-btn" data-panel="skills">✨ 技能</button>
          <button class="menu-btn" data-panel="settings">⚙️ 设置</button>
          <button class="menu-btn" data-panel="save">💾 存档</button>
        </div>
      </div>
      <div class="log-window" id="log-window" style="display:none"></div>
    `;
  }

  _bindEvents() {
    document.addEventListener('combat-start', (e) => {
      this.isCombatActive = true;
      this.combatEngine = e.detail.combat;
      this._showCombat();
      this._renderCombat();
    });
    document.addEventListener('combat-update', (e) => {
      this._updateCombat(e.detail.log);
    });
    document.addEventListener('combat-end', (e) => {
      this._showCombatResult(e.detail.result);
      setTimeout(() => {
        this._hideCombat();
        this.isCombatActive = false;
        const app = window.gameApp;
        if (app) app._onCombatEnd(e.detail.result);
      }, 3000);
    });
    document.addEventListener('combat-player-turn', (e) => {
      this._enableCombatButtons(true);
    });
    document.addEventListener('scene-change', (e) => {
      if (!this.isCombatActive) this._renderScene(e.detail.scene);
    });
    document.getElementById('menu-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('.menu-btn');
      if (btn) this._showPanel(btn.dataset.panel);
    });
  }

  _renderScene(scene) {
    const view = document.getElementById('scene-view');
    const typeLabel = scene.type === 'safe' ? '🛡️ 安全区' : '⚔️ 野外';
    let html = `
      <div class="scene-info">
        <h2>${scene.name}</h2>
        <p class="scene-desc">${scene.desc}</p>
        <span class="scene-type ${scene.type}">${typeLabel}</span>
      </div>`;
    if (scene.exits && scene.exits.length > 0) {
      html += `<div class="scene-section"><strong>🚪 可前往:</strong>`;
      html += scene.exits.map(e => `<button class="exit-btn" data-exit="${e}">→ ${e}</button>`).join('');
      html += `</div>`;
    }
    if (scene.npcs && scene.npcs.length > 0) {
      html += `<div class="scene-section"><strong>👤 人物:</strong>`;
      html += scene.npcs.map(npcId => {
        const npc = DATA.npcs[npcId];
        if (!npc) return '';
        return `<button class="npc-btn" data-npc="${npcId}">💬 ${npc.name}</button>`;
      }).join('');
      html += `</div>`;
    }
    view.innerHTML = html;
    this._updateHeader();
    view.querySelectorAll('.exit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.gameApp.sceneManager.enterScene(btn.dataset.exit);
      });
    });
    view.querySelectorAll('.npc-btn').forEach(btn => {
      btn.addEventListener('click', () => this._showNPCDialog(btn.dataset.npc));
    });
    this._renderActions(scene);
  }

  _renderActions(scene) {
    const bar = document.getElementById('action-bar');
    let html = '';
    if (scene.type === 'wild') {
      html += `<button class="action-btn" id="btn-combat">⚔️ 战斗</button>`;
      html += `<button class="action-btn" id="btn-flee">🏃 逃跑</button>`;
    } else if (scene.type === 'safe') {
      html += `<button class="action-btn" id="btn-rest">💤 休息</button>`;
      if (scene.npcs && scene.npcs.length > 0) {
        html += `<button class="action-btn" id="btn-recruit">🤝 招募</button>`;
      }
    }
    bar.innerHTML = html;
    const btnCombat = document.getElementById('btn-combat');
    if (btnCombat) btnCombat.onclick = () => {
      if (scene.enemies) window.gameApp.sceneManager.triggerBattle(scene.enemies);
    };
    const btnFlee = document.getElementById('btn-flee');
    if (btnFlee) btnFlee.onclick = () => {
      this.addGameLog('你成功逃离了战斗');
      window.gameApp.sceneManager.enterScene('灰烟村');
    };
    const btnRest = document.getElementById('btn-rest');
    if (btnRest) btnRest.onclick = () => {
      const state = window.gameApp.state;
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
      state.companions.forEach(c => { c.hp = c.maxHp; c.mp = c.maxMp; });
      this.addGameLog('💤 休息完毕，生命法力已满');
      window.gameApp.saveGame();
      this._updateHeader();
    };
    const btnRecruit = document.getElementById('btn-recruit');
    if (btnRecruit && scene.npcs) {
      btnRecruit.onclick = () => {
        const recruitables = scene.npcs.filter(id => DATA.npcs[id] && DATA.npcs[id].recruit);
        if (recruitables.length === 0) {
          this.addGameLog('此处无可招募的同伴');
          return;
        }
        let msg = '可招募的同伴:\n';
        recruitables.forEach(id => {
          const npc = DATA.npcs[id];
          msg += `• ${npc.name} - ${npc.class} Lv.${npc.level}\n  ${npc.dialogue}\n`;
        });
        if (window.confirm(msg + '\n招募需要花费金币。是否招募第一个?')) {
          const result = CompanionSystem.recruit(window.gameApp.state, recruitables[0]);
          if (result.ok) {
            this.addGameLog(`🎉 ${result.companion.name} 加入了队伍！`);
            this._showPanel('companions');
          } else {
            this.addGameLog('❌ ' + result.reason);
          }
        }
      };
    }
  }

  _showNPCDialog(npcId) {
    const npc = DATA.npcs[npcId];
    if (!npc) return;
    const state = window.gameApp.state;
    const recruited = state.companions.find(c => c.id === npcId);
    let html = `<div class="npc-dialog"><h3>${npc.name}</h3><p>${npc.dialogue}</p>`;
    html += `<p>职业: ${DATA.classes[npc.class].name} | 等级: ${npc.level}</p>`;
    if (npc.recruit && !recruited) {
      if (state.companions.length >= 2) {
        html += `<p class="warn">队伍已满（最多2人）</p>`;
      } else {
        html += `<button class="menu-btn" id="btn-recruit-confirm">🤝 招募 (免费)</button>`;
      }
    } else if (recruited) {
      html += `<p>已在队伍中</p>`;
    }
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    this._showPopup(html);
    const btnR = document.getElementById('btn-recruit-confirm');
    if (btnR) {
      btnR.onclick = () => {
        const r = CompanionSystem.recruit(state, npcId);
        if (r.ok) {
          this.addGameLog(`🎉 ${r.companion.name} 加入了队伍！`);
          this._showPanel('companions');
          this._closePopup();
        } else {
          this.addGameLog('❌ ' + r.reason);
        }
      };
    }
  }

  _renderCombat() {
    const view = document.getElementById('combat-view');
    const c = this.combatEngine;
    if (!c) return;
    let html = `
      <div class="combat-top">
        <span class="combat-title">⚔️ 战斗中</span>
        <span class="combat-round">回合 ${c.round + 1}/${c.maxRounds}</span>
        <span class="combat-mode" id="combat-mode"></span>
      </div>
      <div class="combat-field">
        <div class="ally-side">
          <h4>🧙 我方</h4>
          <div class="unit-list">`;
    html += this._renderUnitCard(c.playerUnit, true);
    c.allyUnits.forEach(u => { html += this._renderUnitCard(u, false); });
    html += `</div></div>
        <div class="vs-divider">⚔️ VS ⚔️</div>
        <div class="enemy-side">
          <h4>🐺 敌方</h4>
          <div class="unit-list">`;
    c.enemyUnits.forEach((u, i) => { html += this._renderUnitCard(u, false, i); });
    html += `</div></div></div>
      <div class="combat-log-box" id="combat-log-box"></div>
      <div class="combat-actions" id="combat-actions"></div>`;
    view.innerHTML = html;
    this._updateCombatModeDisplay();
    this._renderCombatLog();
    this._renderCombatButtons();
  }

  _renderUnitCard(unit, isPlayer, idx) {
    const hpPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
    const mpPct = unit.maxMp > 0 ? (unit.mp / unit.maxMp) * 100 : 0;
    const classes = ['unit-card'];
    if (isPlayer) classes.push('player-unit');
    if (unit.side === 'enemy') classes.push('enemy-unit');
    if (unit.hp <= 0) classes.push('dead');
    const selId = isPlayer ? '' : `data-idx="${idx}"`;
    const skills = (unit.skills || []).map(s => DATA.skills[s]).filter(Boolean);
    const cdStr = skills.map(s => {
      const cd = (unit.cooldowns && unit.cooldowns[s.id]) || 0;
      return cd > 0 ? `${s.name}(${cd}回合)` : s.name;
    }).join(', ');
    return `
      <div class="${classes.join(' ')}" ${selId}>
        <div class="unit-name">${unit.name} ${unit.hp <= 0 ? '💀' : ''}</div>
        <div class="unit-bar">
          <span class="bar-label">HP</span>
          <div class="bar hp-bar"><div class="bar-fill" style="width:${hpPct}%;background:${hpPct>50?'#4CAF50':hpPct>25?'#FF9800':'#f44336'}"></div></div>
          <span class="bar-text">${unit.hp}/${unit.maxHp}</span>
        </div>
        <div class="unit-bar">
          <span class="bar-label">MP</span>
          <div class="bar-fill mp-bar" style="width:${mpPct}%"></div>
          <span class="bar-text">${unit.mp}/${unit.maxMp}</span>
        </div>
        ${cdStr ? `<div class="unit-skills" title="${cdStr}">✨ ${cdStr}</div>` : ''}
        ${unit.statuses && unit.statuses.length > 0 ? `<div class="unit-statuses">${unit.statuses.map(s => `<span class="status-${s.type}">${s.type}</span>`).join(' ')}</div>` : ''}
      </div>`;
  }

  _updateCombatModeDisplay() {
    const c = this.combatEngine;
    const el = document.getElementById('combat-mode');
    if (!el || !c) return;
    const mode = c.state ? c.state.player.autoMode : "manual";
    const labels = { skillFirst: '技能优先', allAttack: '全平A', defend: '防御', healFirst: '治疗优先', manual: '手动' };
    el.textContent = labels[mode] || '技能优先';
  }

  _renderCombatLog() {
    const box = document.getElementById('combat-log-box');
    if (!box) return;
    const logs = this.combatEngine.combatLog.slice(-8);
    box.innerHTML = logs.map(l => `<p>${l}</p>`).join('');
    box.scrollTop = box.scrollHeight;
  }

  _renderCombatButtons() {
    const bar = document.getElementById('combat-actions');
    if (!bar) return;
    const c = this.combatEngine;
    if (c.state && c.state.player.combatMode === "auto") {
      bar.innerHTML = `
        <button class="combat-btn" id="btn-auto-skill">技能优先</button>
        <button class="combat-btn" id="btn-auto-atk">全平A</button>
        <button class="combat-btn" id="btn-auto-heal">治疗优先</button>
        <button class="combat-btn" id="btn-manual">切手动</button>
      `;
      document.getElementById('btn-auto-skill').onclick = () => { c.state.player.autoMode = "skillFirst"; this._updateCombatModeDisplay(); this.addGameLog('⚙️ 切换到：技能优先'); };
      document.getElementById('btn-auto-atk').onclick = () => { c.state.player.autoMode = "allAttack"; this._updateCombatModeDisplay(); this.addGameLog('⚙️ 切换到：全平A'); };
      document.getElementById('btn-auto-heal').onclick = () => { c.state.player.autoMode = "healFirst"; this._updateCombatModeDisplay(); this.addGameLog('⚙️ 切换到：治疗优先'); };
      document.getElementById('btn-manual').onclick = () => { c.state.player.combatMode = "manual"; this.addGameLog('⚙️ 切换到：手动'); };
      return;
    }
    bar.innerHTML = `
      <button class="combat-btn" id="btn-attack">⚔️ 攻击</button>
      <button class="combat-btn" id="btn-defend">🛡️ 防御</button>
      <button class="combat-btn" id="btn-auto">🤖 自动</button>
    `;
    document.getElementById('btn-attack').onclick = () => {
      const target = this._getSelectedEnemy();
      if (target) c._executePlayerAction("attack", c._getUnitId(target));
    };
    document.getElementById('btn-defend').onclick = () => {
      c._executePlayerAction("defend");
    };
    document.getElementById('btn-auto').onclick = () => {
      c.state.player.combatMode = "auto";
      c.state.player.autoMode = "skillFirst";
      this._renderCombatButtons();
    };
    this._enableCombatButtons(true);
    this._bindEnemyClick();
  }

  _bindEnemyClick() {
    document.querySelectorAll('.enemy-unit').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => {
        document.querySelectorAll('.enemy-unit').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
      };
    });
  }

  _getSelectedEnemy() {
    const idx = document.querySelector('.enemy-unit.selected');
    if (!idx) return this.combatEngine.enemyUnits.find(e => e.hp > 0);
    return this.combatEngine.enemyUnits[parseInt(idx.dataset.idx)];
  }

  _updateCombat(log) {
    this._renderCombat();
  }

  _enableCombatButtons(enabled) {
    document.querySelectorAll('.combat-btn').forEach(b => { b.disabled = !enabled; b.style.opacity = enabled ? 1 : 0.5; });
  }

  _showCombatResult(result) {
    const view = document.getElementById('combat-view');
    const colors = { player_victory: '#1b5e20', player_defeat: '#b71c1c', timeout: '#e65100' };
    const msgs = { player_victory: '🎉 战斗胜利！', player_defeat: '💀 战斗失败...', timeout: '⏰ 战斗平局' };
    const resultDiv = document.createElement('div');
    resultDiv.className = 'combat-result-overlay';
    resultDiv.style.background = colors[result] || '#333';
    resultDiv.innerHTML = `<h2>${msgs[result] || '战斗结束'}</h2>`;
    view.appendChild(resultDiv);
  }

  _showCombat() { document.getElementById('combat-view').style.display = 'block'; document.getElementById('scene-view').style.display = 'none'; document.getElementById('panel-view').style.display = 'none'; }
  _hideCombat() { document.getElementById('combat-view').style.display = 'none'; document.getElementById('scene-view').style.display = 'block'; this._updateHeader(); }

  _showPanel(panelName) {
    this._showPopup(this._renderPanel(panelName));
  }

  _renderPanel(name) {
    const state = window.gameApp.state;
    switch (name) {
      case "inventory": return this._renderInventory(state);
      case "equipment": return this._renderEquipment(state);
      case "companions": return this._renderCompanions(state);
      case "skills": return this._renderSkills(state);
      case "settings": return this._renderSettings(state);
      case "save": return this._renderSave(state);
      default: return '<div class="panel"><h3>功能开发中...</h3></div>';
    }
  }

  _renderInventory(state) {
    const items = state.inventory.items;
    const companions = state.companions.filter(c => c.alive);
    let html = `<div class="panel"><h3>🎒 背包 (${items.length}/${state.inventory.capacity})</h3><div class="item-grid">`;
    if (items.length === 0) html += '<p>背包空空如也</p>';
    for (const item of items) {
      const color = DATA.rarity[item.rarity]?.color || '#ccc';
      const canUse = item.use;
      const typeLabel = DATA.itemTypes?.[item.type]?.name || item.type;
      html += `<div class="item-card" style="border-color:${color}" data-id="${item.id}">
        <div class="item-name" style="color:${color}">${item.name}</div>
        <div class="item-type">${typeLabel}${item.level ? ` Lv.${item.level}` : ''}</div>
        <div class="item-desc">${item.desc || ''}</div>
        <div class="item-stack">${item.stack > 1 ? `×${item.stack}` : ''}</div>
        ${canUse ? `<button class="menu-btn use-btn" data-use="${item.id}">使用</button>` : ''}
      </div>`;
    }
    html += '</div>';
    html += `<div class="target-selector" id="target-selector" style="display:none"></div>`;
    html += '<button class="menu-btn close-btn">关闭</button></div>';
    
    setTimeout(() => {
      const showTargetSelector = (itemId) => {
        const selector = document.getElementById('target-selector');
        if (!selector) return;
        let targetHtml = '<div class="target-panel"><div class="target-title">选择目标</div><div class="target-list">';
        targetHtml += `<button class="target-btn" data-target="player">
          <span class="target-icon">🧙</span>
          <span class="target-name">${state.player.name}</span>
          <span class="target-sub">主角 Lv.${state.player.level}</span>
        </button>`;
        for (const c of companions) {
          targetHtml += `<button class="target-btn" data-target="${c.id}">
            <span class="target-icon">👤</span>
            <span class="target-name">${c.name}</span>
            <span class="target-sub">同伴 Lv.${c.level}</span>
          </button>`;
        }
        targetHtml += '</div><button class="menu-btn cancel-btn" id="target-cancel">取消</button></div>';
        selector.innerHTML = targetHtml;
        selector.style.display = 'block';
        
        selector.querySelectorAll('.target-btn').forEach(btn => {
          btn.onclick = () => {
            const target = btn.dataset.target;
            const result = InventorySystem.useItem(state, itemId, target);
            selector.style.display = 'none';
            if (result.ok) {
              const effectText = result.type === 'exp' 
                ? `经验+${result.gained}给 ${result.targetName}` 
                : result.type === 'heal' 
                  ? `生命+${result.value}给 ${result.targetName}` 
                  : result.type === 'mana' 
                    ? `法力+${result.value}给 ${result.targetName}` 
                    : '传送完成';
              this.addGameLog(`✨ 使用了物品，效果: ${effectText}`);
              if (result.leveled) {
                if (result.targetLevel) {
                  this.addGameLog(`⭐ ${result.targetName} 升级到 Lv.${result.targetLevel}！`);
                } else {
                  this.addGameLog(`⭐ 升级到 Lv.${state.player.level}！`);
                }
              }
              SaveManager.save(state);
              this._closePopup();
              this._showPanel('inventory');
              this._updateHeader();
            } else {
              this.addGameLog('❌ ' + (result.reason || '使用失败'));
            }
          };
        });
        
        const cancelBtn = document.getElementById('target-cancel');
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            selector.style.display = 'none';
          };
        }
      };
      
      document.querySelectorAll('.use-btn').forEach(btn => {
        btn.onclick = () => showTargetSelector(btn.dataset.use);
      });
    }, 50);
    return html;
  }

  _renderEquipment(state) {
    let html = `<div class="panel"><h3>⚔️ 装备</h3><div class="equip-grid">`;
    for (const slot in DATA.equipSlots) {
      const item = state.equipment[slot];
      const slotInfo = DATA.equipSlots[slot];
      if (item) {
        const color = DATA.rarity[item.rarity]?.color || '#ccc';
        html += `<div class="equip-slot filled" data-slot="${slot}">
          <div class="slot-icon">${slotInfo.icon}</div>
          <div class="slot-name">${slotInfo.name}</div>
          <div class="slot-item" style="color:${color}">${item.name}</div>
          <div class="slot-level">Lv.${item.level}</div>
          ${item.baseStats ? `<div class="slot-stats">${Object.entries(item.baseStats).map(([k,v]) => `${k}:${v}`).join(' ')}</div>` : ''}
        </div>`;
      } else {
        html += `<div class="equip-slot empty" data-slot="${slot}">
          <div class="slot-icon">${slotInfo.icon}</div>
          <div class="slot-name">${slotInfo.name}</div>
          <div class="slot-empty">空</div>
        </div>`;
      }
    }
    html += '</div><button class="menu-btn close-btn">关闭</button></div>';
    return html;
  }

  _renderCompanions(state) {
    let html = `<div class="panel"><h3>👥 同伴 (${state.companions.length}/2)</h3>`;
    for (const c of state.companions) {
      const stats = StateUtils.getCompanionCombatStats(state, c.id);
      const hpPct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
      html += `<div class="companion-card ${c.alive ? '' : 'dead'}">
        <div class="comp-header">
          <strong>${c.name}</strong> (${DATA.classes[c.class].name} Lv.${c.level})
          <span class="comp-status">${c.alive ? '存活' : '阵亡'}</span>
        </div>
        <div class="comp-hp"><span>HP: ${c.hp}/${c.maxHp}</span><div class="bar hp-bar"><div class="bar-fill" style="width:${hpPct}%"></div></div></div>
        <div class="comp-stats">⚔️${stats.physAtk} 🛡️${stats.physDef} 💨${stats.speed}</div>
        <div class="comp-skills">✨ 技能: ${(c.skills||[]).map(s => DATA.skills[s]?.name).filter(Boolean).join(', ') || '无'}</div>
        <div class="comp-preset">🎯 预设: ${(c.skillPreset||[]).map(s => DATA.skills[s]?.name).filter(Boolean).join(' → ') || '无'}</div>
        <div class="comp-actions">
          <button class="menu-btn" data-comp="${c.id}" data-act="automode">🤖 自动</button>
          <button class="menu-btn" data-comp="${c.id}" data-act="preset">⚙️ 技能预设</button>
          <button class="menu-btn" data-comp="${c.id}" data-act="equip">⚔️ 装备</button>
          <button class="menu-btn" data-comp="${c.id}" data-act="attr">📊 属性</button>
          ${c.alive ? '<button class="menu-btn danger" data-comp="'+c.id+'" data-act="dismiss">解雇</button>' : '<button class="menu-btn" data-comp="'+c.id+'" data-act="revive">复活</button>'}
        </div>
      </div>`;
    }
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    setTimeout(() => this._bindCompanionActions(), 50);
    return html;
  }

  _bindCompanionActions() {
    document.querySelectorAll('[data-comp]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.comp;
        const act = btn.dataset.act;
        const state = window.gameApp.state;
        if (act === "automode") this._showAutoModeDialog(id);
        else if (act === "preset") this._showSkillPresetDialog(id);
        else if (act === "equip") this._showCompanionEquipDialog(id);
        else if (act === "attr") this._showCompanionAttrDialog(id);
        else if (act === "dismiss") {
          if (confirm('确定解雇该同伴？')) {
            CompanionSystem.remove(state, id);
            this._closePopup();
            this._showPanel('companions');
          }
        } else if (act === "revive") {
          CompanionSystem.revive(state, id);
          this._closePopup();
          this._showPanel('companions');
        }
      };
    });
  }

  _showAutoModeDialog(compId) {
    const c = window.gameApp.state.companions.find(c => c.id === compId);
    if (!c) return;
    const modes = [
      { key: "skillFirst", label: "技能优先", desc: "按预设顺序放技能，CD或无蓝时自动平A" },
      { key: "allAttack", label: "全平A", desc: "只使用普通攻击，不使用技能" },
      { key: "healFirst", label: "治疗优先", desc: "先治疗受伤队友，否则攻击" },
      { key: "defend", label: "防御", desc: "全程防御姿态，减少伤害" },
    ];
    let html = `<div class="panel"><h3>🤖 ${c.name} - 自动战斗模式</h3>`;
    modes.forEach(m => {
      const selected = (c.autoMode === m.key) ? ' selected' : '';
      html += `<button class="menu-btn" data-mode="${m.key}" style="width:100%;margin:6px 0;padding:12px;text-align:left;${selected ? 'background:linear-gradient(135deg,#f39c12,#e67e22)' : ''}">
        <strong>${m.label}</strong> <span style="font-size:12px;opacity:0.7">${m.desc}</span>
      </button>`;
    });
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    this._showPopup(html);
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => {
        CompanionSystem.setAutoMode(window.gameApp.state, compId, btn.dataset.mode);
        this.addGameLog(`${c.name} 切换到 ${btn.textContent.trim()} 模式`);
        this._closePopup();
        this._showAutoModeDialog(compId);
      };
    });
  }

  _showSkillPresetDialog(compId) {
    const c = window.gameApp.state.companions.find(c => c.id === compId);
    if (!c) return;
    let html = `<div class="panel"><h3>⚙️ ${c.name} - 技能预设</h3>`;
    html += `<p>可用技能:</p><div class="skill-list">`;
    c.skills.forEach(sId => {
      const skill = DATA.skills[sId];
      if (!skill) return;
      const inPreset = c.skillPreset.includes(sId);
      html += `<label class="skill-check"><input type="checkbox" data-skill="${sId}" ${inPreset ? 'checked' : ''}> ${skill.name} (MP:${skill.mpCost} CD:${skill.cooldown}) - ${skill.desc}</label>`;
    });
    html += `</div><p>选择技能后按顺序释放。</p>`;
    html += `<button class="menu-btn" id="save-preset">保存</button><button class="menu-btn close-btn">关闭</button></div>`;
    this._showPopup(html);
    document.getElementById('save-preset').onclick = () => {
      const checks = document.querySelectorAll('[data-skill]');
      const newPreset = [];
      checks.forEach(chk => { if (chk.checked) newPreset.push(chk.dataset.skill); });
      CompanionSystem.setSkillPreset(window.gameApp.state, compId, newPreset);
      this.addGameLog(`${c.name} 的技能预设已更新`);
      this._closePopup();
      this._showPanel('companions');
    };
  }

  _showCompanionEquipDialog(compId) {
    const c = window.gameApp.state.companions.find(c => c.id === compId);
    if (!c) return;
    let html = `<div class="panel"><h3>⚔️ ${c.name} - 装备管理</h3>`;
    html += `<div class="equip-grid">`;
    for (const slot in DATA.equipSlots) {
      const item = c.equipment[slot];
      const info = DATA.equipSlots[slot];
      if (item) {
        const color = DATA.rarity[item.rarity]?.color || '#ccc';
        html += `<div class="equip-slot filled">
          <div class="slot-icon">${info.icon}</div>
          <div class="slot-name">${info.name}</div>
          <div class="slot-item" style="color:${color}">${item.name}</div>
          <button class="menu-btn" data-unequip="${slot}">卸下</button>
        </div>`;
      } else {
        html += `<div class="equip-slot empty">
          <div class="slot-icon">${info.icon}</div>
          <div class="slot-name">${info.name}</div>
          <div class="slot-empty">空</div>
        </div>`;
      }
    }
    html += `</div>`;
    html += `<p>从背包中选择装备给 ${c.name}:</p><div class="item-grid">`;
    window.gameApp.state.inventory.items.forEach(item => {
      if (EquipmentSystem.typeToSlot(item.type)) {
        const color = DATA.rarity[item.rarity]?.color || '#ccc';
        html += `<div class="item-card" style="border-color:${color}" data-equip="${item.id}" data-target-slot="${EquipmentSystem.typeToSlot(item.type)}">
          <div class="item-name" style="color:${color}">${item.name}</div>
          <div class="item-type">${item.type}</div>
        </div>`;
      }
    });
    html += `</div><button class="menu-btn close-btn">关闭</button></div>`;
    this._showPopup(html);
    document.querySelectorAll('[data-unequip]').forEach(btn => {
      btn.onclick = () => {
        CompanionSystem.unequipItem(window.gameApp.state, compId, btn.dataset.unequip);
        this.addGameLog('卸下装备');
        this._closePopup();
        this._showCompanionEquipDialog(compId);
      };
    });
    document.querySelectorAll('[data-equip]').forEach(card => {
      card.onclick = () => {
        const state = window.gameApp.state;
        const idx = state.inventory.items.findIndex(i => i.id === card.dataset.equip);
        if (idx === -1) return;
        const item = state.inventory.items[idx];
        CompanionSystem.equipItem(state, compId, item, card.dataset.targetSlot);
        state.inventory.items.splice(idx, 1);
        this.addGameLog(`给 ${c.name} 装备了 ${item.name}`);
        this._closePopup();
        this._showCompanionEquipDialog(compId);
      };
    });
  }

  _showCompanionAttrDialog(compId) {
    const c = window.gameApp.state.companions.find(c => c.id === compId);
    if (!c) return;
    let html = `<div class="panel"><h3>📊 ${c.name} - 属性</h3>`;
    const points = Math.floor(c.level / 5);
    html += `<p>可用属性点: <strong>${points}</strong> (每5级1点)</p>`;
    for (const attr of ['str','agi','int','vit','ten','spi']) {
      html += `<div class="attr-row">
        <span class="attr-name">${DATA.attributes[attr].name}</span>
        <span class="attr-val">${c.attributes[attr]}</span>
        <button class="menu-btn small" data-attr="${attr}" data-comp="${compId}">+</button>
      </div>`;
    }
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    this._showPopup(html);
    document.querySelectorAll('[data-attr]').forEach(btn => {
      btn.onclick = () => {
        const state = window.gameApp.state;
        const c = state.companions.find(c => c.id === compId);
        if (!c) return;
        const availablePoints = Math.floor(c.level / 5);
        const spent = Object.values(c._spentPoints || {}).reduce((a,b)=>a+b, 0);
        if (spent >= availablePoints) {
          this.addGameLog('属性点不足');
          return;
        }
        if (!c._spentPoints) c._spentPoints = {};
        const attr = btn.dataset.attr;
        c._spentPoints[attr] = (c._spentPoints[attr] || 0) + 1;
        c.attributes[attr]++;
        if (attr === 'vit') { c.maxHp += 10; c.hp += 10; }
        if (attr === 'spi') { c.maxMp += 5; c.mp += 5; }
        this.addGameLog(`${c.name} 的 ${DATA.attributes[attr].name} 提升了`);
        this._closePopup();
        this._showCompanionAttrDialog(compId);
      };
    });
  }

  _renderSkills(state) {
    const classData = DATA.classes[state.player.classPath[0]];
    if (!classData) return '<div class="panel"><h3>✨ 技能</h3><p>职业未定义</p></div>';
    const branch = state.player.classPath[0] === 'mage' ? state.player.elementSpec : null;
    const skills = classData.getSkills(state.player.level, branch);
    let html = `<div class="panel"><h3>✨ 技能 (${state.player.class})</h3><div class="skill-grid">`;
    skills.forEach(sId => {
      const skill = DATA.skills[sId];
      if (!skill) return;
      const learned = state.player.skills.includes(sId);
      const inPreset = state.player.skillPreset.includes(sId);
      html += `<div class="skill-card ${learned ? 'learned' : 'locked'}">
        <div class="skill-name">${skill.name} ${learned ? '✅' : '🔒'}</div>
        <div class="skill-desc">${skill.desc}</div>
        <div class="skill-info">MP: ${skill.mpCost} | CD: ${skill.cooldown}回合 | 威力: ${skill.power}x</div>
        ${learned ? `<div class="skill-preset">${inPreset ? '🎯 已选入预设' : ''}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
    html += `<p>自动战斗模式: 
      <button class="menu-btn" data-auto="skillFirst">技能优先</button>
      <button class="menu-btn" data-auto="allAttack">全平A</button>
      <button class="menu-btn" data-auto="healFirst">治疗优先</button>
    </p>`;
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    setTimeout(() => {
      document.querySelectorAll('[data-auto]').forEach(btn => {
        btn.onclick = () => {
          state.player.combatMode = "auto";
          state.player.autoMode = btn.dataset.auto;
          this.addGameLog(`⚙️ 自动战斗模式: ${btn.textContent.trim()}`);
          this._closePopup();
          this._showPanel('skills');
        };
      });
    }, 50);
    return html;
  }

  _renderSettings(state) {
    let html = `<div class="panel"><h3>⚙️ 设置</h3>`;
    html += `<p>战斗模式:</p>`;
    html += `<button class="menu-btn" data-cmode="manual">手动</button>`;
    html += `<button class="menu-btn" data-cmode="auto">自动</button>`;
    html += `<p>自动模式:</p>`;
    html += `<button class="menu-btn" data-amode="skillFirst">技能优先</button>`;
    html += `<button class="menu-btn" data-amode="allAttack">全平A</button>`;
    html += `<button class="menu-btn" data-amode="healFirst">治疗优先</button>`;
    html += `<button class="menu-btn" data-amode="defend">防御</button>`;
    html += `<p>硬核模式: ${state.player.hardcore ? '开启' : '关闭'}</p>`;
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    setTimeout(() => {
      document.querySelectorAll('[data-cmode]').forEach(btn => {
        btn.onclick = () => { state.player.combatMode = btn.dataset.cmode; this._closePopup(); this._showPanel('settings'); };
      });
      document.querySelectorAll('[data-amode]').forEach(btn => {
        btn.onclick = () => { state.player.autoMode = btn.dataset.amode; this._closePopup(); this._showPanel('settings'); };
      });
    }, 50);
    return html;
  }

  _renderSave(state) {
    let html = `<div class="panel"><h3>💾 存档</h3>`;
    html += `<p>玩家: ${state.player.name} | 等级: ${state.player.level}</p>`;
    html += `<p>金币: ${state.player.gold}金${state.player.silver}银${state.player.copper}铜</p>`;
    html += `<p>死亡次数: ${state.player.deaths} | 复活剩余: ${state.player.revivesLeft}</p>`;
    html += `<button class="menu-btn" id="btn-save">💾 手动保存</button>`;
    html += `<button class="menu-btn" id="btn-export">📤 导出存档</button>`;
    html += `<button class="menu-btn" id="btn-import">📥 导入存档</button>`;
    html += `<button class="menu-btn danger" id="btn-delete">🗑️ 删除存档</button>`;
    html += `<button class="menu-btn close-btn">关闭</button></div>`;
    setTimeout(() => {
      document.getElementById('btn-save').onclick = () => { window.gameApp.saveGame(); this.addGameLog('💾 存档已保存'); };
      document.getElementById('btn-export').onclick = () => { SaveManager.export(state); };
      document.getElementById('btn-import').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            SaveManager.import(file).then(newState => {
              window.gameApp.state = newState;
              SaveManager.save(newState);
              this.addGameLog('📥 存档已导入');
              location.reload();
            }).catch(err => this.addGameLog('❌ 导入失败: ' + err.message));
          }
        };
        input.click();
      };
      document.getElementById('btn-delete').onclick = () => {
        if (confirm('确定删除存档？此操作不可恢复！')) {
          SaveManager.delete();
          location.reload();
        }
      };
    }, 50);
    return html;
  }

  _updateHeader() {
    const app = window.gameApp;
    if (!app || !app.state) return;
    document.getElementById('player-level').textContent = app.state.player.level;
    document.getElementById('loc-name').textContent = app.state.world.currentLocation || '灰烟村';
    document.getElementById('gold-display').textContent = `${app.state.player.gold}金`;
  }

  _showPopup(html) {
    let popup = document.getElementById('ui-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'ui-popup';
      popup.className = 'popup-overlay';
      popup.onclick = (e) => { if (e.target === popup) this._closePopup(); };
      document.body.appendChild(popup);
    }
    popup.innerHTML = `<div class="popup-content">${html}</div>`;
    const closeBtn = popup.querySelector('.close-btn');
    if (closeBtn) closeBtn.onclick = () => this._closePopup();
  }

  _closePopup() {
    const popup = document.getElementById('ui-popup');
    if (popup) popup.remove();
  }

  _showPanel(name) {
    this._showPopup(this._renderPanel(name));
  }

  showPanel(title, html) {
    this._showPopup(`<div class="panel"><h3>${title}</h3>${html}<button class="menu-btn close-btn">关闭</button></div>`);
  }

  updatePlayerInfo(player) {
    this._updateHeader();
  }

  addGameLog(msg) {
    const logEl = document.getElementById('log-window');
    if (!logEl) return;
    logEl.style.display = 'block';
    const p = document.createElement('p');
    p.textContent = msg;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
    setTimeout(() => { p.style.opacity = '0.5'; }, 3000);
    setTimeout(() => { p.remove(); }, 15000);
  }
}
