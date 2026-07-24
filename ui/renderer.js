// ============================================
// 《寻亲风云录》UI渲染 — 荒地测试帧版
// ============================================

const Renderer = {
  container: null,

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`容器 #${containerId} 不存在`);
      return false;
    }
    return true;
  },

  // ========== 主游戏画面 ==========

  renderMain(state) {
    if (!this.container) return;
    const scene = SceneSystem.getCurrentScene(state);
    const html = `
      <div class="game-frame">
        ${this.renderHeader(state)}
        ${this.renderMiniMap(state)}
        ${this.renderNarrative(state, scene)}
        ${this.renderSceneActions(state, scene)}
        ${this.renderMainMenu(state)}
      </div>
    `;
    this.container.innerHTML = html;
  },

  // 顶部状态栏
  renderHeader(state) {
    const p = state.player;
    const hpPct = Math.floor((p.hp / p.maxHp) * 100);
    const mpPct = Math.floor((p.mp / p.maxMp) * 100);
    return `
      <div class="header-bar">
        <div class="header-left">
          <span class="location">🏠 ${p.location.split("·")[1] || p.location}</span>
        </div>
        <div class="header-right">
          <span class="hp-bar" title="生命">❤️ ${p.hp}/${p.maxHp}</span>
          <span class="mp-bar" title="法力">💙 ${p.mp}/${p.maxMp}</span>
          <span class="level">Lv.${p.level}</span>
          <span class="gold">${Utils.formatGold(p.gold, p.silver, p.copper)}</span>
        </div>
      </div>
    `;
  },

  // 小地图
  renderMiniMap(state) {
    const mapData = SceneSystem.getMapData(state);
    
    let rows = "";
    for (const row of mapData) {
      let cells = "";
      for (const cell of row) {
        if (cell.type === "empty") {
          cells += `<div class="map-cell map-empty"></div>`;
        } else {
          const cls = `map-${cell.type}`;
          const label = cell.type === "current" ? "●" : (cell.type === "exit" ? "○" : "·");
          cells += `<div class="map-cell ${cls}" title="${cell.fullName}" data-scene="${cell.sceneId}">${label}</div>`;
        }
      }
      rows += `<div class="map-row">${cells}</div>`;
    }

    return `
      <div class="mini-map">
        <div class="map-title">🗺️ 灰烟村</div>
        <div class="map-grid">${rows}</div>
        <div class="map-legend">
          <span><span class="legend-dot current">●</span> 当前</span>
          <span><span class="legend-dot exit">○</span> 可前往</span>
          <span><span class="legend-dot known">·</span> 已知</span>
        </div>
      </div>
    `;
  },

  // 叙事窗口
  renderNarrative(state, scene) {
    const narrative = state.narrative;
    let historyHtml = "";
    if (narrative.dialogueHistory && narrative.dialogueHistory.length > 0) {
      const recent = narrative.dialogueHistory.slice(-8);
      historyHtml = recent.map(h => `<p class="history-line">${this.escapeHtml(h)}</p>`).join("");
    }

    return `
      <div class="narrative-window">
        <div class="narrative-history">${historyHtml}</div>
        <div class="narrative-current">
          <p class="scene-desc">${this.escapeHtml(scene.desc)}</p>
        </div>
      </div>
    `;
  },

  // 场景交互按钮 — 根据场景类型动态生成
  renderSceneActions(state, scene) {
    let actions = [];

    // ===== 荒地特殊处理 =====
    if (scene.id === "greyVillage_wasteland") {
      // 检查野狗状态
      const enemyStatus = SceneSystem.getWastelandEnemies(state);
      
      if (enemyStatus.canSpawn) {
        actions.push({ type: "combat", text: "⚔️ 迎战野狗", action: "wasteland_combat" });
      } else {
        actions.push({ type: "info", text: `⏳ 野狗刷新中 (${Math.ceil(enemyStatus.remaining / 60)}分)`, action: "none", disabled: true });
      }

      // 采集石头
      actions.push({ type: "gather", text: "🔨 采集石头", action: "object:石头矿" });
      
      // 挂机按钮
      actions.push({ type: "idle", text: "⏱️ 挂机采集", action: "idle_mine" });
      
      return `
        <div class="scene-actions">
          ${actions.map(a => `<button class="action-btn action-${a.type}" data-action="${a.action}" ${a.disabled ? 'disabled' : ''}>${a.text}</button>`).join("")}
        </div>
      `;
    }

    // ===== 普通场景 =====
    // NPC对话
    if (scene.npcs) {
      for (const npcId of scene.npcs) {
        const npc = DATA.npcs[npcId];
        if (npc) {
          actions.push({ type: "talk", text: `💬 ${npc.name}`, action: `talk:${npcId}` });
        }
      }
    }

    // 场景物品交互
    if (scene.objects) {
      for (const obj of scene.objects) {
        actions.push({ type: "object", text: `👁️ ${obj.name}`, action: `object:${obj.name}` });
      }
    }

    // 安全区域：休息
    if (scene.type === "safe") {
      actions.push({ type: "rest", text: "🛏️ 休息", action: "rest" });
    }

    return `
      <div class="scene-actions">
        ${actions.map(a => `<button class="action-btn action-${a.type}" data-action="${a.action}">${a.text}</button>`).join("")}
      </div>
    `;
  },

  // 底部主菜单
  renderMainMenu(state) {
    return `
      <div class="main-menu">
        <button class="menu-btn" data-menu="inventory">🎒背包</button>
        <button class="menu-btn" data-menu="equipment">⚔️装备</button>
        <button class="menu-btn" data-menu="companions">👥随从</button>
        <button class="menu-btn" data-menu="save">💾存档</button>
      </div>
    `;
  },

  // ========== 战斗UI ==========

  renderCombat(state, combat) {
    if (!this.container) return;
    const currentActor = CombatEngine.getCurrentActor(combat);
    const isPlayerTurn = currentActor && currentActor.id === "player";

    let html = `
      <div class="combat-frame">
        ${this.renderCombatHeader(combat)}
        ${this.renderCombatField(combat)}
        ${this.renderCombatLog(combat)}
        ${isPlayerTurn ? this.renderCombatActions(state, combat, currentActor) : this.renderCombatWaiting(combat)}
        <div class="combat-menu">
          <button class="menu-btn" data-action="flee-combat">🏃撤退</button>
        </div>
      </div>
    `;
    this.container.innerHTML = html;
  },

  renderCombatHeader(combat) {
    return `
      <div class="combat-header">
        <span class="combat-title">⚔️ 战斗</span>
        <span class="combat-turn">回合 ${combat.turn}/${combat.maxTurns}</span>
      </div>
    `;
  },

  renderCombatField(combat) {
    const enemies = combat.units.filter(u => u.side === "enemy" && u.hp > 0);
    const allies = combat.units.filter(u => u.side === "ally" && u.hp > 0);

    const renderUnit = (u, isEnemy) => {
      const hpPct = Math.floor((u.hp / u.maxHp) * 100);
      const statusIcons = (u.statusEffects || []).map(s => {
        const icons = { bleed: "🩸", burn: "🔥", slow: "❄️", stun: "⚡", buff: "✨", shield: "🛡️" };
        return icons[s.type] || "";
      }).join("");
      
      return `
        <div class="unit ${isEnemy ? 'enemy' : 'ally'}" data-unit="${u.id}">
          <div class="unit-name">${isEnemy ? "🔴" : "🟢"} ${u.name}</div>
          <div class="unit-hp-bar"><div class="hp-fill" style="width:${hpPct}%"></div></div>
          <div class="unit-hp-text">${u.hp}/${u.maxHp} ${statusIcons}</div>
        </div>
      `;
    };

    return `
      <div class="combat-field">
        <div class="combat-side">
          <div class="side-label">敌方</div>
          <div class="unit-row enemy-row">
            ${enemies.map(e => renderUnit(e, true)).join("")}
          </div>
        </div>
        <div class="combat-divider">VS</div>
        <div class="combat-side">
          <div class="side-label">我方</div>
          <div class="unit-row ally-row">
            ${allies.map(a => renderUnit(a, false)).join("")}
          </div>
        </div>
      </div>
    `;
  },

  renderCombatLog(combat) {
    return `
      <div class="combat-log">
        ${combat.log.slice(-4).map(line => `<p>${this.escapeHtml(line)}</p>`).join("")}
      </div>
    `;
  },

  renderCombatActions(state, combat, actor) {
    const skills = actor.skills || [];

    // 如果正在选择目标，显示目标选择提示
    if (combat.pendingAction) {
      const actionName = combat.pendingAction.skillName || combat.pendingAction.type;
      return `
        <div class="combat-actions">
          <div class="target-select-hint">🎯 选择目标发动「${actionName}」</div>
          <div class="combat-controls">
            <button class="combat-btn" data-action="cancel-target">❌ 取消</button>
          </div>
        </div>
      `;
    }

    const skillBtns = skills.map(s => {
      const canUse = actor.mp >= (s.cost || 0);
      return `<button class="skill-btn ${canUse ? '' : 'disabled'}" data-skill="${s.name}" ${!canUse ? 'disabled' : ''}>
        ${s.name}${s.cost ? ` ${s.cost}MP` : ''}
      </button>`;
    }).join("");

    return `
      <div class="combat-actions">
        <div class="skill-list">${skillBtns}</div>
        <div class="combat-controls">
          <button class="combat-btn" data-action="defend">🛡️防御</button>
          <button class="combat-btn" data-action="item">💊物品</button>
        </div>
      </div>
    `;
  },

  renderCombatWaiting(combat) {
    const actor = CombatEngine.getCurrentActor(combat);
    return `
      <div class="combat-waiting">
        <p>${actor ? `${actor.name} 行动中...` : "..."}</p>
      </div>
    `;
  },

  // ========== 背包UI ==========

  renderInventory(state) {
    const items = state.inventory.items;
    let html = `
      <div class="inventory-frame">
        <div class="inv-header">
          <h3>🎒 背包 (${items.length}/${state.inventory.capacity})</h3>
        </div>
        <div class="inv-grid" id="inv-grid">
          ${items.map(item => this.renderItemCard(item)).join("")}
        </div>
        <div id="item-detail-panel" class="item-detail-panel hidden"></div>
        <div class="inv-footer">
          <button class="menu-btn" data-action="back">↩️ 返回</button>
        </div>
      </div>
    `;
    this.container.innerHTML = html;

    // 绑定点击事件
    const grid = this.container.querySelector("#inv-grid");
    if (grid) {
      grid.querySelectorAll(".item-card").forEach(card => {
        card.addEventListener("click", () => {
          const itemId = card.dataset.item;
          const item = items.find(i => i.id === itemId);
          if (item) this.showItemDetail(item, state);
        });
      });
    }
  },

  showItemDetail(item, state) {
    const panel = this.container.querySelector("#item-detail-panel");
    if (!panel) return;

    const rarityData = DATA.rarity[item.rarity] || DATA.rarity.white;
    let statsHtml = "";
    if (item.baseStats) {
      for (const [stat, val] of Object.entries(item.baseStats)) {
        if (val) statsHtml += `<div>${stat}: +${val}</div>`;
      }
    }

    let affixesHtml = "";
    if (item.affixes && item.affixes.length > 0) {
      affixesHtml = `<div class="item-affixes"><b>词条:</b> ${item.affixes.map(a => a.name).join(", ")}</div>`;
    }

    const isEquip = ["sword","axe","hammer","bow","staff","dagger","shield","armor","helmet","legs","boots","gloves","necklace","ring"].includes(item.type);
    const equipBtn = isEquip ? `<button class="menu-btn" id="equip-btn">⚔️ 装备</button>` : "";

    panel.innerHTML = `
      <div class="detail-content">
        <h4 style="color:${rarityData.color}">${item.name}</h4>
        <div class="item-meta">${rarityData.name} · Lv.${item.level || 1}</div>
        ${statsHtml ? `<div class="item-stats">${statsHtml}</div>` : ""}
        ${affixesHtml}
        <div class="detail-actions">
          ${equipBtn}
          <button class="menu-btn" id="close-detail">关闭</button>
        </div>
      </div>
    `;
    panel.classList.remove("hidden");

    // 绑定装备按钮
    if (isEquip) {
      panel.querySelector("#equip-btn")?.addEventListener("click", () => {
        const result = InventorySystem.equipFromInventory(state, item.id);
        if (result.ok) {
          this.showMessage(`装备了 ${item.name}`);
          panel.classList.add("hidden");
          this.renderInventory(state);
        } else {
          this.showMessage(result.reason || "装备失败", "error");
        }
      });
    }

    panel.querySelector("#close-detail")?.addEventListener("click", () => {
      panel.classList.add("hidden");
    });
  },

  renderItemCard(item) {
    const rarityData = DATA.rarity[item.rarity] || DATA.rarity.white;
    const stackText = item.stack > 1 ? ` x${item.stack}` : "";
    return `
      <div class="item-card" data-item="${item.id}" style="border-color:${rarityData.color}">
        <div class="item-rarity" style="color:${rarityData.color}">${rarityData.name}</div>
        <div class="item-name">${item.name}${stackText}</div>
        <div class="item-level">Lv.${item.level || "?"}</div>
      </div>
    `;
  },

  // ========== 装备UI ==========

  renderEquipment(state) {
    const slots = DATA.equipSlots;
    const slotNames = {
      weapon: "主手", offhand: "副手", helmet: "头盔", chest: "胸甲",
      legs: "护腿", boots: "靴子", gloves: "护手", necklace: "项链",
      ring1: "戒指1", ring2: "戒指2",
    };

    let html = `
      <div class="equipment-frame">
        <h3>⚔️ 装备</h3>
        <div class="equip-grid">
    `;
    
    for (const slot of slots) {
      const item = state.equipment[slot];
      if (item) {
        const rd = DATA.rarity[item.rarity];
        html += `
          <div class="equip-slot" data-slot="${slot}">
            <div class="slot-name">${slotNames[slot]}</div>
            <div class="slot-item" style="color:${rd.color}">${item.name}</div>
            <div class="slot-level">Lv.${item.level}</div>
          </div>
        `;
      } else {
        html += `
          <div class="equip-slot empty" data-slot="${slot}">
            <div class="slot-name">${slotNames[slot]}</div>
            <div class="slot-empty">[ 空 ]</div>
          </div>
        `;
      }
    }

    html += `
        </div>
        <button class="menu-btn" data-action="back">↩️ 返回</button>
      </div>
    `;
    this.container.innerHTML = html;
  },

  // ========== 随从UI ==========

  renderCompanions(state) {
    let html = `
      <div class="companions-frame">
        <h3>👥 随从</h3>
        <div class="companion-list">
    `;

    for (const comp of state.companions) {
      const status = comp.alive ? "🟢" : "💀";
      html += `
        <div class="companion-card ${comp.alive ? '' : 'dead'}">
          <div class="companion-header">
            <span>${status} ${comp.name}</span>
            <span class="companion-class">${comp.class}</span>
            <span>Lv.${comp.level}</span>
          </div>
          <div class="companion-hp">
            ❤️ ${comp.hp}/${comp.maxHp}
            <div class="hp-bar-small"><div class="hp-fill" style="width:${Math.floor((comp.hp/comp.maxHp)*100)}%"></div></div>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <button class="menu-btn" data-action="back">↩️ 返回</button>
      </div>
    `;
    this.container.innerHTML = html;
  },

  // ========== 存档UI ==========

  renderSaveMenu(state) {
    const lastSave = state.world.lastSave ? Utils.formatDate(state.world.lastSave) : "未保存";
    let html = `
      <div class="save-frame">
        <h3>💾 存档</h3>
        <div class="save-info">
          <p>角色: ${state.player.name}</p>
          <p>等级: ${state.player.level} · ${state.player.class}</p>
          <p>最后保存: ${lastSave}</p>
        </div>
        <div class="save-actions">
          <button class="menu-btn" data-action="save">💾 保存</button>
          <button class="menu-btn" data-action="export">📤 导出</button>
          <button class="menu-btn danger" data-action="delete">🗑️ 删除</button>
        </div>
        <button class="menu-btn" data-action="back">↩️ 返回</button>
      </div>
    `;
    this.container.innerHTML = html;
  },

  // ========== 角色创建UI ==========

  renderCharacterCreation() {
    let html = `
      <div class="creation-frame">
        <h1>🎭 创建角色</h1>
        <div class="creation-narrative">
          <p>"很美好的一天，朝阳升起，你徐徐醒来。"</p>
          <p>"你叫什么名字来着？"</p>
        </div>
        <div class="creation-form">
          <input type="text" id="char-name" placeholder="输入你的名字" maxlength="12" />
          <div class="class-select">
            <p>选择道路：</p>
            <button class="class-btn" data-class="warrior">⚔️ 战士</button>
            <button class="class-btn" data-class="ranger">🏹 游侠</button>
            <button class="class-btn" data-class="mage">🔮 法师</button>
          </div>
          <div class="mode-select">
            <label><input type="checkbox" id="hardcore-mode" /> 硬核模式</label>
          </div>
          <button class="start-btn" id="start-game">开始旅程</button>
        </div>
      </div>
    `;
    this.container.innerHTML = html;
  },

  // ========== 弹窗 ==========

  showMessage(text, type = "info") {
    const popup = document.createElement("div");
    popup.className = `popup popup-${type}`;
    popup.innerHTML = `<p>${this.escapeHtml(text)}</p><button onclick="this.parentElement.remove()">确定</button>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
  },

  showConfirm(text, onConfirm, onCancel) {
    const popup = document.createElement("div");
    popup.className = "popup popup-confirm";
    popup.innerHTML = `
      <p>${this.escapeHtml(text)}</p>
      <div class="popup-buttons">
        <button id="confirm-yes">确定</button>
        <button id="confirm-no">取消</button>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector("#confirm-yes").onclick = () => { popup.remove(); if (onConfirm) onConfirm(); };
    popup.querySelector("#confirm-no").onclick = () => { popup.remove(); if (onCancel) onCancel(); };
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};

try { module.exports = Renderer; } catch(e) {}
