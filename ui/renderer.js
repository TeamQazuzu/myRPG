// ui/renderer.js
class UIRenderer {
    constructor() {
        this.container = null;
        this.combatEngine = null;
        this.isCombatActive = false;
        this.sceneRef = null;
    }
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`容器 #${containerId} 不存在`);
            return false;
        }
        this.setupUI();
        this.bindEvents();
        return true;
    }
    setupUI() {
        const containers = {
            'scene-container': '<div class="scene-placeholder">选择场景</div>',
            'combat-container': '',
            'action-buttons': '',
            'combat-log': '<h4>📜 战斗日志</h4><div class="log-container"></div>',
            'combat-result': ''
        };
        Object.keys(containers).forEach(id => {
            if (!document.getElementById(id)) {
                const div = document.createElement('div');
                div.id = id;
                if (containers[id]) div.innerHTML = containers[id];
                this.container.appendChild(div);
            }
        });
        document.getElementById('combat-container').style.display = 'none';
        document.getElementById('action-buttons').style.display = 'none';
        document.getElementById('combat-log').style.display = 'none';
        document.getElementById('combat-result').style.display = 'none';
    }
    bindEvents() {
        document.addEventListener('combat-start', (e) => {
            this.isCombatActive = true;
            this.combatEngine = e.detail.combat;
            document.getElementById('scene-container').style.display = 'none';
            this.renderCombat(this.combatEngine);
            this.showCombatUI(true);
        });
        document.addEventListener('combat-update', (e) => {
            this.updateCombat(e.detail.combat, e.detail.log);
        });
        document.addEventListener('combat-end', (e) => {
            const player = this.combatEngine && this.combatEngine.getPlayerUnit ? this.combatEngine.getPlayerUnit() : null;
            if (player) {
                if (player._defenseBuff !== undefined) {
                    player.defense = player._baseDefense || 0;
                    delete player._defenseBuff;
                    delete player._baseDefense;
                }
                delete player.defending;
            }
            this.showCombatResult(e.detail.result);
            setTimeout(() => {
                this.showCombatUI(false);
                this.isCombatActive = false;
                document.getElementById('scene-container').style.display = 'block';
            }, 3000);
        });
        document.addEventListener('combat-player-turn', () => {
            this.enableButtons(true);
        });
        document.addEventListener('scene-change', (e) => {
            if (!this.isCombatActive) {
                this.renderScene(e.detail.scene);
            }
        });
    }
    showCombatUI(show) {
        const container = document.getElementById('combat-container');
        const buttons = document.getElementById('action-buttons');
        const log = document.getElementById('combat-log');
        if (container) {
            container.style.display = show ? 'block' : 'none';
            if (!show) container.innerHTML = '';
        }
        if (buttons) buttons.style.display = show ? 'flex' : 'none';
        if (log) log.style.display = show ? 'block' : 'none';
    }
    renderScene(scene) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        container.style.display = 'block';
        const isSafe = scene.type === 'safe';
        const typeLabel = isSafe ? '安全' : '危险';
        const typeClass = isSafe ? 'safe' : 'wild';
        let html = `
            <div class="scene-card">
                <div class="scene-card-header">
                    <h2>${scene.name || '未知'}</h2>
                    <span class="scene-type ${typeClass}">${typeLabel}</span>
                </div>
                <p class="scene-desc">${scene.desc || scene.description || ''}</p>
            </div>
        `;

        // NPC 列表
        let npcs = [];
        if (typeof NPCSystem !== 'undefined' && NPCSystem.getNPCsForScene) {
            npcs = NPCSystem.getNPCsForScene(scene.name);
        }
        if (npcs.length > 0) {
            html += `<div class="scene-npcs"><strong>附近的人</strong><div class="npc-list">`;
            npcs.forEach((npc, idx) => {
                html += `<button class="npc-btn" data-npc-index="${idx}">🗣️ ${npc.name}</button>`;
            });
            html += `</div></div>`;
        }

        if (scene.exits && scene.exits.length > 0) {
            html += `
                <div class="scene-exits">
                    <strong>可前往</strong>
                    <div class="exit-grid">
                    ${scene.exits.map(exit => {
                        const sc = this.sceneRef ? this.sceneRef[exit] : null;
                        const isWild = sc && sc.type === 'wild';
                        return `<button class="exit-btn${isWild ? ' wild-exit' : ''}" data-scene="${exit}">${exit.replace(/^[^_]+_/, '')}</button>`;
                    }).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        container.querySelectorAll('.exit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sceneName = btn.dataset.scene;
                if (window.gameApp && window.gameApp.sceneManager) {
                    window.gameApp.sceneManager.enterScene(sceneName);
                }
            });
        });
        container.querySelectorAll('.npc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.npcIndex);
                this.openNPCDialog(npcs[idx]);
            });
        });
    }

    setSceneRef(scenes) {
        this.sceneRef = scenes;
    }

    // ========== 底部弹窗面板（统一入口） ==========
    showPanel(title, html) {
        let panel = document.getElementById('dynamic-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'dynamic-panel';
            document.body.appendChild(panel);
        }
        panel.innerHTML = `
            <h3>${title}</h3>
            <div class="panel-body">${html}</div>
            <button class="panel-close-btn" id="panel-close">关闭</button>
        `;
        panel.style.display = 'block';
        // 关闭按钮
        document.getElementById('panel-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });
        // 点击遮罩关闭（可选）
        return panel;
    }

    closePanel() {
        const panel = document.getElementById('dynamic-panel');
        if (panel) panel.style.display = 'none';
    }

    openNPCDialog(npc) {
        const state = window.gameApp ? window.gameApp.state : null;
        if (!state) return;
        let result = { msg: '...' };
        if (typeof NPCSystem !== 'undefined' && NPCSystem.handleAction) {
            result = NPCSystem.handleAction(npc, 0, state);
        }
        let actionHtml = '';
        if (npc.actions && npc.actions.length > 0) {
            actionHtml = `<div class="npc-actions">` +
                npc.actions.map((a, i) => `<button class="npc-action-btn" data-idx="${i}">${a.label}</button>`).join('') +
                `</div>`;
        }
        this.showPanel(`🗣️ ${npc.name}`, `
            <div class="npc-dialogue">${result.msg}</div>
            ${actionHtml}
        `);
        // 绑定按钮事件
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.npc-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    if (typeof NPCSystem === 'undefined') return;
                    const res = NPCSystem.handleAction(npc, idx, state);
                    if (res.type === 'gatekeeper') {
                        this.closePanel();
                        if (window.gameApp && window.gameApp.sceneManager) {
                            window.gameApp.sceneManager.triggerBattle(['野狗', '野狗']);
                        }
                        return;
                    }
                    if (res.type === 'forge_menu') {
                        this.closePanel();
                        this.showForgeMenu(state);
                        return;
                    }
                    const dia = panel.querySelector('.npc-dialogue');
                    if (dia) dia.textContent = res.msg;
                    if (res.ok && window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }

    showForgeMenu(state) {
        const eq = state.equipment;
        let html = '<div class="forge-list">';
        let hasItem = false;
        for (const slot in eq) {
            const item = eq[slot];
            if (!item) continue;
            hasItem = true;
            const rarityName = DATA.rarity[item.rarity]?.name || item.rarity;
            html += `<div class="forge-item">
                <span>${item.name} (${rarityName})</span>
                <button class="forge-btn" data-slot="${slot}">🔨 锻造</button>
            </div>`;
        }
        if (!hasItem) html += '<p style="color:var(--text-dim);">当前没有可锻造的装备。</p>';
        html += '</div>';
        this.showPanel('🔨 锻造铺', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.forge-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const slot = btn.dataset.slot;
                    const item = eq[slot];
                    if (!item) return;
                    const res = EquipmentSystem.forge(state, item);
                    const msgEl = panel.querySelector('.forge-list');
                    if (msgEl) {
                        const p = document.createElement('p');
                        p.style.color = res.ok ? '#a5d6a7' : '#ef9a9a';
                        p.textContent = res.msg || res.reason;
                        msgEl.prepend(p);
                    }
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }

    // ========== 角色面板 ==========
    renderCharacter(state) {
        const container = this.container;
        if (!container) return;
        const p = state.player;
        const attrs = p.attributes;
        const attrDefs = DATA.attributes || {};

        const attrNames = { str: '力量', agi: '敏捷', int: '智力', vit: '体质', ten: '坚韧', spi: '精神' };
        const attrIcons = { str: '💪', agi: '💨', int: '🧠', vit: '❤️', ten: '🛡️', spi: '✨' };

        let attrsHtml = '';
        for (const key in attrs) {
            const val = attrs[key];
            attrsHtml += `
                <div class="char-stat-card">
                    <div class="char-stat-label">${attrIcons[key] || ''} ${attrNames[key] || key}</div>
                    <div class="char-stat-value">${val}</div>
                </div>
            `;
        }

        // 装备列表
        const slotNames = {
            weapon: '武器', offhand: '副手', helmet: '头盔', chest: '胸甲',
            legs: '腿甲', boots: '靴子', gloves: '手套', necklace: '项链',
            ring1: '戒指1', ring2: '戒指2'
        };
        let equipHtml = '';
        for (const slot in state.equipment) {
            const item = state.equipment[slot];
            const label = slotNames[slot] || slot;
            if (item) {
                const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
                equipHtml += `<div class="equip-slot-card" style="border-left:3px solid ${rarityColor}">
                    <span class="equip-slot-name">${label}</span>
                    <span class="equip-item-name" style="color:${rarityColor}">${item.name}</span>
                </div>`;
            } else {
                equipHtml += `<div class="equip-slot-card empty">
                    <span class="equip-slot-name">${label}</span>
                    <span class="equip-item-name" style="color:var(--text-dim)">空</span>
                </div>`;
            }
        }

        // 随从
        let companionHtml = '';
        if (state.companions && state.companions.length > 0) {
            companionHtml = '<div class="char-section"><strong class="char-section-title">随从</strong>';
            state.companions.forEach(c => {
                const hpPct = c.maxHp > 0 ? Math.max(0, (c.hp / c.maxHp) * 100) : 0;
                companionHtml += `
                    <div class="companion-card">
                        <div class="companion-header">
                            <span class="companion-name">${c.name}</span>
                            <span class="companion-lv">Lv.${c.level}</span>
                        </div>
                        <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%;background:#9c27b0"></div></div>
                        <div class="companion-hp-text">HP: ${c.hp}/${c.maxHp}</div>
                    </div>
                `;
            });
            companionHtml += '</div>';
        }

        const expPct = p.expToNext > 0 ? (p.exp / p.expToNext) * 100 : 0;
        const html = `
            <div class="char-panel" id="character-panel">
                <div class="char-card char-basic-card">
                    <div class="char-name-row">
                        <span class="char-name">${p.name}</span>
                        <span class="char-class">${p.class}</span>
                    </div>
                    <div class="char-level-row">
                        <span>Lv.${p.level}</span>
                        <span class="char-exp-text">EXP: ${p.exp}/${p.expToNext}</span>
                    </div>
                    <div class="hp-bar"><div class="hp-fill" style="width:${expPct}%;background:var(--accent)"></div></div>
                    ${p.hardcore ? '<span class="char-hardcore">💀 硬核模式</span>' : ''}
                </div>

                <div class="char-section">
                    <strong class="char-section-title">六维属性</strong>
                    <div class="char-stats-grid">
                        ${attrsHtml}
                    </div>
                    ${p.attributePoints > 0 ? `<div class="char-points-hint">可分配点数: ${p.attributePoints}</div>` : ''}
                </div>

                <div class="char-section">
                    <strong class="char-section-title">装备</strong>
                    <div class="equip-grid">
                        ${equipHtml}
                    </div>
                </div>

                ${companionHtml}
            </div>
        `;

        const existing = document.getElementById('character-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);
    }

    // ========== 设置面板 ==========
    renderSettings(state) {
        const container = this.container;
        if (!container) return;
        const s = state.settings || {};
        const html = `
            <div class="settings-panel" id="settings-panel">
                <div class="settings-card">
                    <div class="settings-title">⚙️ 游戏设置</div>

                    <div class="settings-row">
                        <span>自动保存</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-autosave" ${s.autoSave !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="settings-row">
                        <span>战斗模式</span>
                        <span class="settings-val">${state.player.combatMode === 'auto' ? '自动' : '手动'}</span>
                    </div>

                    <div class="settings-buttons">
                        <button class="settings-btn" id="set-save">💾 手动保存</button>
                        <button class="settings-btn" id="set-export">📤 导出存档</button>
                        <button class="settings-btn danger" id="set-delete">🗑️ 删除存档</button>
                    </div>

                    <div class="settings-info">
                        <p>版本: ${state.version || '1.0.0'}</p>
                        <p>上次保存: ${this.formatDate(state.world.lastSave)}</p>
                        <p>游玩时间: ${this.formatPlayTime(state.player.playTime || 0)}</p>
                    </div>
                </div>
            </div>
        `;
        const existing = document.getElementById('settings-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);

        // 绑定事件
        setTimeout(() => {
            const autoSaveCb = document.getElementById('set-autosave');
            if (autoSaveCb) {
                autoSaveCb.addEventListener('change', () => {
                    if (!state.settings) state.settings = {};
                    state.settings.autoSave = autoSaveCb.checked;
                });
            }
            const saveBtn = document.getElementById('set-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    SaveManager.save(state);
                    this.showToast('保存成功');
                });
            }
            const exportBtn = document.getElementById('set-export');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    if (typeof SaveManager !== 'undefined' && SaveManager.export) {
                        SaveManager.export(state);
                    }
                });
            }
            const deleteBtn = document.getElementById('set-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('确定要删除存档吗？此操作不可恢复。')) {
                        if (typeof SaveManager !== 'undefined' && SaveManager.delete) {
                            SaveManager.delete();
                        }
                        location.reload();
                    }
                });
            }
        }, 0);
    }

    formatDate(isoStr) {
        if (!isoStr) return '无';
        try {
            const d = new Date(isoStr);
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const h = d.getHours().toString().padStart(2, '0');
            const min = d.getMinutes().toString().padStart(2, '0');
            return `${m}-${day} ${h}:${min}`;
        } catch (e) { return isoStr; }
    }

    formatPlayTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}小时${m}分钟`;
        return `${m}分钟`;
    }

    showToast(msg) {
        let toast = document.getElementById('toast-msg');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-msg';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = 'toast-show';
        setTimeout(() => { toast.className = ''; }, 2000);
    }

    // ========== 战斗渲染 ==========
    renderCombat(combat) {
        const container = document.getElementById('combat-container');
        if (!container) return;
        container.style.display = 'block';
        container.innerHTML = `
            <div class="combat-header">
                <span class="combat-title">⚔️ 战斗</span>
                <span class="combat-turn">回合 ${combat.currentTurn + 1}/${combat.maxTurns}</span>
            </div>
        `;
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        if (enemies.length > 0) {
            const eDiv = document.createElement('div');
            eDiv.className = 'enemy-container';
            eDiv.innerHTML = '<div class="combat-section-label">🐺 敌方</div>';
            enemies.forEach((enemy, i) => {
                const el = document.createElement('div');
                el.className = 'enemy-unit';
                el.dataset.index = i;
                const maxHp = enemy.maxHp || enemy.hp || 30;
                const hp = Math.max(0, enemy.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                el.innerHTML = `
                    <div class="enemy-name">${enemy.name} ${hp <= 0 ? '💀' : ''}</div>
                    <div class="enemy-hp">
                        <span>HP: ${hp}/${maxHp}</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:${hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336'}"></div>
                        </div>
                    </div>
                `;
                el.addEventListener('click', () => {
                    document.querySelectorAll('.enemy-unit').forEach(e => e.classList.remove('selected'));
                    if (hp > 0) el.classList.add('selected');
                });
                if (hp <= 0) el.classList.add('dead');
                eDiv.appendChild(el);
            });
            container.appendChild(eDiv);
        }
        // 渲染玩家与随从
        const allies = [combat.getPlayerUnit ? combat.getPlayerUnit() : null,
                        ...(combat.getCompanionUnits ? combat.getCompanionUnits() : [])].filter(Boolean);
        if (allies.length > 0) {
            const aDiv = document.createElement('div');
            aDiv.className = 'player-container';
            aDiv.innerHTML = '<div class="combat-section-label">🧙 我方</div>';
            allies.forEach((ally, i) => {
                const isCompanion = ally.isCompanion;
                const el = document.createElement('div');
                el.className = isCompanion ? 'companion-unit' : 'player-unit';
                if (isCompanion) el.dataset.companionIndex = i - 1;
                const maxHp = ally.maxHp || ally.hp || 100;
                const hp = Math.max(0, ally.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const barColor = isCompanion ? '#9c27b0' : '#2196F3';
                el.innerHTML = `
                    <div class="player-name">${ally.name} ${isCompanion ? '🏹' : ''} ${hp <= 0 ? '💀' : ''}</div>
                    <div class="player-hp">
                        <span>HP: ${hp}/${maxHp}</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:${barColor}"></div>
                        </div>
                    </div>
                    <div class="player-stats">
                        ⚔️${ally.attack || 0} 🛡️${ally.defense || 0} 💨${ally.speed || 0}
                    </div>
                `;
                if (hp <= 0) el.classList.add('dead');
                aDiv.appendChild(el);
            });
            container.appendChild(aDiv);
        }
        this.renderLog(combat.combatLog || []);
        this.renderButtons(combat);
    }
    renderLog(logs) {
        const container = document.getElementById('combat-log');
        if (!container) return;
        container.style.display = 'block';
        const logContainer = container.querySelector('.log-container');
        if (logContainer) {
            logContainer.innerHTML = '';
            const recent = logs.slice(-8);
            recent.forEach(msg => {
                const p = document.createElement('p');
                p.textContent = msg;
                logContainer.appendChild(p);
            });
        }
    }
    renderButtons(combat) {
        const container = document.getElementById('action-buttons');
        if (!container) return;
        container.style.display = 'flex';
        container.innerHTML = `
            <button class="action-btn" id="btn-attack" data-label="攻击">⚔️</button>
            <button class="action-btn" id="btn-skill" data-label="技能">✨</button>
            <button class="action-btn" id="btn-defend" data-label="防御">🛡️</button>
            <button class="action-btn" id="btn-item" data-label="道具">🎒</button>
        `;
        document.getElementById('btn-attack').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const target = this.getTarget(combat);
            if (target) {
                document.getElementById('btn-attack').disabled = true;
                combat.playerAction('attack', target);
            }
        });
        document.getElementById('btn-skill').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const target = this.getTarget(combat);
            if (target) {
                document.getElementById('btn-skill').disabled = true;
                combat.playerAction('skill', target);
            }
        });
        document.getElementById('btn-defend').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const player = combat.getPlayerUnit();
            if (player) {
                player.defending = true;
                if (!player._defenseBuff) {
                    player._baseDefense = player.defense || 0;
                    player._defenseBuff = player._baseDefense + 10;
                    player.defense = player._defenseBuff;
                }
                document.getElementById('btn-defend').disabled = true;
                combat.playerAction('defend', null);
            }
        });
        document.getElementById('btn-item').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const player = combat.getPlayerUnit();
            if (player && window.gameApp && window.gameApp.state) {
                const state = window.gameApp.state;
                const consumable = state.inventory.items.find(i => i.type === 'potion' || i.type === 'consumable');
                if (!consumable) {
                    if (combat.combatLog) combat.combatLog.push('背包中没有可用的消耗品');
                    this.updateCombat(combat);
                    return;
                }
                const heal = consumable.heal || 20;
                const maxHp = player.maxHp || 100;
                player.hp = Math.min(maxHp, (player.hp || 0) + heal);
                if (typeof InventorySystem !== 'undefined') {
                    InventorySystem.removeFromInventory(state, consumable.id, 1);
                }
                document.getElementById('btn-item').disabled = true;
                combat.playerAction('item', null);
                if (combat.combatLog) {
                    combat.combatLog.push(`${player.name} 使用 ${consumable.name}，回复 ${heal} HP`);
                }
                this.updateCombat(combat);
            }
        });
        this.enableButtons(combat.isPlayerTurn);
    }
    getTarget(combat) {
        const selected = document.querySelector('.enemy-unit.selected');
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        if (selected) {
            const idx = parseInt(selected.dataset.index);
            if (enemies[idx] && enemies[idx].hp > 0) return enemies[idx];
        }
        return enemies.find(e => e.hp > 0);
    }
    enableButtons(enabled) {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }
    updateCombat(combat, log) {
        if (!combat) return;
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        const enemyEls = document.querySelectorAll('.enemy-unit');
        enemies.forEach((enemy, i) => {
            if (enemyEls[i]) {
                const maxHp = enemy.maxHp || enemy.hp || 30;
                const hp = Math.max(0, enemy.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const nameEl = enemyEls[i].querySelector('.enemy-name');
                const hpText = enemyEls[i].querySelector('.enemy-hp span');
                const hpFill = enemyEls[i].querySelector('.hp-fill');
                if (nameEl) nameEl.innerHTML = `${enemy.name} ${hp <= 0 ? '💀' : ''}`;
                if (hpText) hpText.textContent = `HP: ${hp}/${maxHp}`;
                if (hpFill) {
                    hpFill.style.width = Math.max(0, hpPct) + '%';
                    hpFill.style.background = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336';
                }
                if (hp <= 0) enemyEls[i].classList.add('dead');
            }
        });
        // 同步玩家与随从血条
        const allies = [combat.getPlayerUnit ? combat.getPlayerUnit() : null,
                        ...(combat.getCompanionUnits ? combat.getCompanionUnits() : [])].filter(Boolean);
        const allyEls = document.querySelectorAll('.player-unit, .companion-unit');
        allies.forEach((ally, i) => {
            if (allyEls[i]) {
                const maxHp = ally.maxHp || ally.hp || 100;
                const hp = Math.max(0, ally.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const nameEl = allyEls[i].querySelector('.player-name');
                const hpText = allyEls[i].querySelector('.player-hp span');
                const hpFill = allyEls[i].querySelector('.hp-fill');
                if (nameEl) {
                    const icon = ally.isCompanion ? '🏹' : '';
                    nameEl.innerHTML = `${ally.name} ${icon} ${hp <= 0 ? '💀' : ''}`;
                }
                if (hpText) hpText.textContent = `HP: ${hp}/${maxHp}`;
                if (hpFill) hpFill.style.width = Math.max(0, hpPct) + '%';
                if (hp <= 0) allyEls[i].classList.add('dead');
            }
        });
        if (log) {
            const logContainer = document.querySelector('.log-container');
            if (logContainer) {
                const p = document.createElement('p');
                p.textContent = log;
                logContainer.appendChild(p);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
        this.enableButtons(combat.isPlayerTurn);
        const turnEl = document.querySelector('.combat-turn');
        if (turnEl) {
            turnEl.textContent = `回合 ${combat.currentTurn + 1}/${combat.maxTurns}`;
        }
    }
    showCombatResult(result) {
        const el = document.getElementById('combat-result');
        if (!el) return;
        const messages = {
            'player_victory': '🎉 战斗胜利！',
            'player_defeat': '💀 战斗失败...',
            'timeout': '⏰ 战斗超时！'
        };
        el.textContent = messages[result] || '战斗结束';
        el.className = 'combat-result ' + result;
        el.style.display = 'block';
        el.style.background = result === 'player_victory' ? '#1b5e20' : result === 'player_defeat' ? '#b71c1c' : '#e65100';
        el.style.color = result === 'player_victory' ? '#a5d6a7' : result === 'player_defeat' ? '#ef9a9a' : '#ffcc80';
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
    updatePlayerInfo(player) {
        console.log('[UI] 更新玩家信息:', player ? player.name : '无');
    }
    showCharacterCreation(onCreate) {
        const container = this.container;
        if (!container) return;
        let html = `
            <div class="creation-frame" id="creation-frame">
                <h1>寻亲风云录</h1>
                <div class="creation-narrative">
                    你站在灰烟村的酒馆门口，风吹过你稚嫩的脸庞。<br>
                    远方传来马蹄声，似乎有什么在召唤着你...
                </div>
                <div class="creation-form">
                    <input type="text" id="char-name" placeholder="输入你的名字" maxlength="12">
                    <div class="class-select">
                        <p>选择职业</p>
                        <div class="class-select-grid">
                            <button class="class-btn" data-class="warrior">⚔️ 战士</button>
                            <button class="class-btn" data-class="ranger">🏹 游侠</button>
                            <button class="class-btn" data-class="mage">🔮 法师</button>
                        </div>
                    </div>
                    <div class="mode-select">
                        <label><input type="checkbox" id="hardcore-mode"> 硬核模式（死亡即删档）</label>
                    </div>
                    <button class="start-btn" id="start-btn">开始旅程</button>
                </div>
            </div>
        `;
        container.innerHTML = html;
        let selectedClass = null;
        container.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedClass = btn.dataset.class;
            });
        });
        document.getElementById('start-btn').addEventListener('click', () => {
            const name = document.getElementById('char-name').value.trim();
            const hardcore = document.getElementById('hardcore-mode').checked;
            if (!name) {
                alert('请输入名字');
                return;
            }
            if (!selectedClass) {
                alert('请选择职业');
                return;
            }
            if (onCreate) onCreate(name, selectedClass, hardcore);
        });
    }
    addGameLog(msg) {
        const container = document.getElementById('combat-log');
        if (!container) return;
        const logContainer = container.querySelector('.log-container') || container;
        const p = document.createElement('p');
        p.textContent = msg;
        logContainer.appendChild(p);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    renderInventory(state) {
        const container = this.container;
        if (!container) return;
        const sceneContainer = document.getElementById('scene-container');
        if (sceneContainer) sceneContainer.style.display = 'none';
        let summary = { total: 0, capacity: state.inventory.maxCapacity || 100 };
        if (typeof InventorySystem !== 'undefined' && InventorySystem.getInventorySummary) {
            summary = InventorySystem.getInventorySummary(state);
        } else {
            summary.total = state.inventory.items.length;
        }
        let html = `
            <div class="inventory-frame" id="inventory-panel">
                <div class="inv-header">
                    <h3>🎒 背包 (${summary.total}/${summary.capacity})</h3>
                </div>
                <div class="inv-grid">
        `;
        if (state.inventory.items.length === 0) {
            html += `<p style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:32px 0;">背包空空如也</p>`;
        } else {
            for (const item of state.inventory.items) {
                const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
                html += `
                    <div class="item-card" style="border-color:${rarityColor}">
                        <div class="item-rarity" style="color:${rarityColor}">${DATA.rarity[item.rarity]?.name || item.rarity || ''}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-level">Lv.${item.level || 1}${item.stack > 1 ? ' x' + item.stack : ''}</div>
                    </div>
                `;
            }
        }
        html += `
                </div>
                <div class="inv-footer">
                    <button class="menu-btn" id="inv-close-btn">返回场景</button>
                </div>
            </div>
        `;
        const existing = document.getElementById('inventory-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);

        // 绑定关闭按钮（不用inline onclick）
        setTimeout(() => {
            const closeBtn = document.getElementById('inv-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    const panel = document.getElementById('inventory-panel');
                    if (panel) panel.remove();
                    const sc = document.getElementById('scene-container');
                    if (sc) sc.style.display = 'block';
                    // 切回场景tab
                    if (window.gameApp) {
                        window.gameApp.currentTab = 'scene';
                        const navBtn = document.querySelector('.nav-item[data-action="scene"]');
                        if (navBtn) {
                            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                            navBtn.classList.add('active');
                        }
                    }
                });
            }
        }, 0);
    }
}