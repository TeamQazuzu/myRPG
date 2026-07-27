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
                        const exitName = sc ? (sc.name || exit) : exit;
                        return `<button class="exit-btn${isWild ? ' wild-exit' : ''}" data-scene="${exit}">${exitName}</button>`;
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
        // 创建遮罩层
        let overlay = document.getElementById('dynamic-panel-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dynamic-panel-overlay';
            document.body.appendChild(overlay);
        }
        panel.innerHTML = `
            <h3>${title}</h3>
            <div class="panel-body">${html}</div>
            <button class="panel-close-btn" id="panel-close">关闭</button>
        `;
        panel.style.transition = 'none';
        panel.style.transform = 'translateY(0)';
        panel.style.display = 'block';
        overlay.style.display = 'block';
        // 关闭按钮
        const closeBtn = document.getElementById('panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }
        // 点击遮罩关闭
        overlay.onclick = () => this.closePanel();
        // 滑动关闭（向下滑动超过80px关闭面板）
        this._bindSwipeToClose(panel);
        return panel;
    }

    _bindSwipeToClose(panel) {
        let startY = 0;
        let currentY = 0;
        const onTouchStart = (e) => {
            startY = e.touches[0].clientY;
            panel.style.transition = 'none';
        };
        const onTouchMove = (e) => {
            currentY = e.touches[0].clientY;
            const delta = currentY - startY;
            if (delta > 0) {
                panel.style.transform = `translateY(${delta}px)`;
            }
        };
        const onTouchEnd = () => {
            const delta = currentY - startY;
            panel.style.transition = 'transform 0.2s ease';
            if (delta > 80) {
                this.closePanel();
            } else {
                panel.style.transform = 'translateY(0)';
            }
            startY = 0;
            currentY = 0;
        };
        panel.addEventListener('touchstart', onTouchStart, { passive: true });
        panel.addEventListener('touchmove', onTouchMove, { passive: true });
        panel.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    closePanel() {
        const panel = document.getElementById('dynamic-panel');
        const overlay = document.getElementById('dynamic-panel-overlay');
        if (panel) {
            panel.style.transform = 'translateY(100%)';
            setTimeout(() => {
                panel.style.display = 'none';
                panel.style.transform = 'translateY(0)';
            }, 200);
        }
        if (overlay) overlay.style.display = 'none';
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
                            const scene = window.gameApp.sceneManager.currentScene;
                            const enemies = scene && scene.enemies ? scene.enemies : ['village_chief_boss'];
                            window.gameApp.sceneManager.triggerBattle(enemies);
                        }
                        return;
                    }
                    if (res.type === 'forge_menu') {
                        this.closePanel();
                        setTimeout(() => this.showForgeMenu(state), 250);
                        return;
                    }
                    if (res.type === 'alchemist_menu') {
                        this.closePanel();
                        setTimeout(() => this.showAlchemistMenu(state), 250);
                        return;
                    }
                    if (res.type === 'shop') {
                        this.closePanel();
                        setTimeout(() => this.showShop(state, res.shopType || 'grocery'), 250);
                        return;
                    }
                    if (res.type === 'recruit') {
                        const dia = panel.querySelector('.npc-dialogue');
                        if (dia) dia.textContent = res.msg;
                        if (res.ok) {
                            btn.disabled = true;
                            btn.textContent = '已招募';
                        }
                        if (window.gameApp) window.gameApp.renderTopBar();
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
            companionHtml = '<div class="char-section"><strong class="char-section-title">随从（点击查看详情）</strong>';
            state.companions.forEach((c, idx) => {
                const hpPct = c.maxHp > 0 ? Math.max(0, (c.hp / c.maxHp) * 100) : 0;
                companionHtml += `
                    <div class="companion-card" data-companion-idx="${idx}">
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

        // 绑定随从点击事件
        setTimeout(() => {
            const panel = document.getElementById('character-panel');
            if (!panel) return;
            panel.querySelectorAll('.companion-card').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = parseInt(card.dataset.companionIdx);
                    if (!isNaN(idx)) {
                        this.renderCompanionDetail(state, idx);
                    }
                });
            });
        }, 0);
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
            this.showSkillMenu(combat);
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
            this.showCombatItemMenu(combat);
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
                const isUsable = item.type === 'consumable' || item.type === 'potion' || item.subtype === 'heal' || item.subtype === 'mana' || item.subtype === 'exp';
                html += `
                    <div class="item-card ${isUsable ? 'usable' : ''}" style="border-color:${rarityColor}" data-item-id="${item.id}" data-usable="${isUsable ? '1' : '0'}">
                        <div class="item-rarity" style="color:${rarityColor}">${DATA.rarity[item.rarity]?.name || item.rarity || ''}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-level">Lv.${item.level || 1}${item.stack > 1 ? ' x' + item.stack : ''}</div>
                        ${isUsable ? '<div class="item-use-hint">点击使用</div>' : ''}
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

        // 绑定关闭按钮和物品点击事件
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
            // 绑定可使用物品点击事件
            const panel = document.getElementById('inventory-panel');
            if (panel) {
                panel.querySelectorAll('.item-card[data-usable="1"]').forEach(card => {
                    card.addEventListener('click', () => {
                        const itemId = card.dataset.itemId;
                        this.showItemUseTarget(state, itemId);
                    });
                });
            }
        }, 0);
    }

    // ========== 战斗道具菜单（选择目标） ==========
    showCombatItemMenu(combat) {
        const state = window.gameApp ? window.gameApp.state : null;
        if (!state) return;
        const consumables = state.inventory.items.filter(i =>
            i.type === 'potion' || i.type === 'consumable' || i.subtype === 'heal' || i.subtype === 'mana'
        );
        if (consumables.length === 0) {
            if (combat.combatLog) combat.combatLog.push('背包中没有可用的消耗品');
            this.updateCombat(combat);
            return;
        }
        let html = '<div class="combat-item-menu"><h4>选择要使用的物品</h4>';
        consumables.forEach(item => {
            html += `<button class="item-select-btn" data-item-id="${item.id}">${item.name} ${item.stack > 1 ? 'x' + item.stack : ''}</button>`;
        });
        html += '<button class="item-cancel-btn" id="item-cancel">取消</button></div>';
        this.showPanel('🎒 使用物品', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.item-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.dataset.itemId;
                    this.closePanel();
                    this.showCombatItemTarget(combat, itemId);
                });
            });
            document.getElementById('item-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    showCombatItemTarget(combat, itemId) {
        const state = window.gameApp ? window.gameApp.state : null;
        const item = state.inventory.items.find(i => i.id === itemId);
        if (!item) return;
        let html = '<div class="combat-target-menu"><h4>选择目标</h4>';
        const player = combat.getPlayerUnit();
        html += `<button class="target-select-btn" data-target="player">👤 ${player.name} (自己)</button>`;
        combat.companions.forEach((comp, idx) => {
            if (comp.hp > 0) {
                html += `<button class="target-select-btn" data-target="${comp.id}">🏹 ${comp.name}</button>`;
            }
        });
        html += '<button class="item-cancel-btn" id="target-cancel">取消</button></div>';
        this.showPanel(`🎯 对谁使用 ${item.name}？`, html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.target-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    const targetUnit = targetId === 'player' ? player : combat.companions.find(c => c.id === targetId);
                    this.closePanel();
                    if (targetUnit) {
                        document.getElementById('btn-item').disabled = true;
                        combat.playerAction('item', { itemId, target: targetUnit });
                    }
                });
            });
            document.getElementById('target-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    // ========== 技能选择面板 ==========
    showSkillMenu(combat) {
        const player = combat.getPlayerUnit();
        if (!player || !player.skills) return;
        let html = '<div class="skill-menu"><h4>选择技能</h4>';
        player.skills.forEach(skillId => {
            const skill = DATA.skills[skillId];
            if (!skill) return;
            const onCd = combat.cooldowns[skillId] > 0;
            const noMp = player.mp < (skill.cost?.mp || 0);
            const disabled = onCd || noMp;
            html += `<button class="skill-select-btn ${disabled ? 'disabled' : ''}" data-skill="${skillId}" ${disabled ? 'disabled' : ''}>
                <span class="skill-name">${skill.name}</span>
                <span class="skill-cost">${skill.cost?.mp || 0}MP</span>
                <span class="skill-desc">${skill.description || ''}</span>
                ${onCd ? `<span class="skill-cd">CD:${combat.cooldowns[skillId]}</span>` : ''}
            </button>`;
        });
        html += '<button class="item-cancel-btn" id="skill-cancel">取消</button></div>';
        this.showPanel('✨ 技能', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.skill-select-btn:not(.disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    const skillId = btn.dataset.skill;
                    combat.selectSkill(skillId);
                    this.closePanel();
                    // 根据技能目标类型选择目标
                    const skill = DATA.skills[skillId];
                    if (skill && (skill.target === 'ally' || skill.target === 'self')) {
                        this.showSkillTarget(combat, skillId, 'ally');
                    } else {
                        this.showSkillTarget(combat, skillId, 'enemy');
                    }
                });
            });
            document.getElementById('skill-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    showSkillTarget(combat, skillId, targetType) {
        const skill = DATA.skills[skillId];
        let html = '<div class="combat-target-menu"><h4>选择目标</h4>';
        if (targetType === 'ally') {
            const player = combat.getPlayerUnit();
            html += `<button class="target-select-btn" data-target="player">👤 ${player.name}</button>`;
            combat.companions.forEach(comp => {
                if (comp.hp > 0) html += `<button class="target-select-btn" data-target="${comp.id}">🏹 ${comp.name}</button>`;
            });
        } else {
            combat.enemies.forEach((enemy, idx) => {
                if (enemy.hp > 0) html += `<button class="target-select-btn" data-target-index="${idx}">🐺 ${enemy.name}</button>`;
            });
        }
        html += '<button class="item-cancel-btn" id="target-cancel">取消</button></div>';
        this.showPanel(`🎯 ${skill.name} - 选择目标`, html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.target-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closePanel();
                    let target = null;
                    if (targetType === 'ally') {
                        const tid = btn.dataset.target;
                        target = tid === 'player' ? combat.getPlayerUnit() : combat.companions.find(c => c.id === tid);
                    } else {
                        const idx = parseInt(btn.dataset.targetIndex);
                        target = combat.enemies[idx];
                    }
                    if (target) {
                        document.getElementById('btn-skill').disabled = true;
                        combat.playerAction('skill', target);
                    }
                });
            });
            document.getElementById('target-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    // ========== 商店UI ==========
    showShop(state, shopType) {
        const shopData = DATA.shops[shopType];
        const items = NPCSystem.getShopItems(shopType);
        let html = '<div class="shop-container">';
        html += `<h4>${shopData?.name || '商店'}</h4>`;
        html += '<div class="shop-section"><strong>购买</strong><div class="shop-grid">';
        items.forEach(item => {
            const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
            html += `<div class="shop-item-card" style="border-color:${rarityColor}">
                <div class="shop-item-name" style="color:${rarityColor}">${item.name}</div>
                <div class="shop-item-desc">${item.description || ''}</div>
                <div class="shop-item-price">💰 ${item.price} 金币</div>
                <button class="shop-buy-btn" data-item-id="${item.id}">购买</button>
            </div>`;
        });
        html += '</div></div>';
        // 出售部分
        html += '<div class="shop-section"><strong>出售</strong><div class="shop-grid">';
        const sellables = state.inventory.items.filter(i => i.type !== 'quest' && i.type !== 'treasure');
        if (sellables.length === 0) {
            html += '<p style="color:var(--text-dim)">没有可出售的物品</p>';
        } else {
            sellables.forEach(item => {
                const tpl = DATA.items[item.id] || Object.values(DATA.items).find(t => t.name === item.name);
                const basePrice = item.price || (tpl ? tpl.price : 0);
                const sellPrice = Math.max(1, Math.floor(basePrice * 0.5));
                html += `<div class="shop-item-card">
                    <div class="shop-item-name">${item.name} ${item.stack > 1 ? 'x' + item.stack : ''}</div>
                    <div class="shop-item-price">💰 ${sellPrice} 金币</div>
                    <button class="shop-sell-btn" data-instance-id="${item.id}">出售</button>
                </div>`;
            });
        }
        html += '</div></div></div>';
        this.showPanel('🏪 商店', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.shop-buy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.dataset.itemId;
                    const res = NPCSystem.buyItem(state, shopType, itemId, 1);
                    const msgEl = document.createElement('div');
                    msgEl.style.cssText = `color:${res.ok ? '#a5d6a7' : '#ef9a9a'};font-size:13px;margin-top:4px;`;
                    msgEl.textContent = res.msg;
                    btn.parentNode.appendChild(msgEl);
                    setTimeout(() => msgEl.remove(), 2000);
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
            panel.querySelectorAll('.shop-sell-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const instanceId = btn.dataset.instanceId;
                    const res = NPCSystem.sellItem(state, instanceId, 1);
                    const msgEl = document.createElement('div');
                    msgEl.style.cssText = `color:${res.ok ? '#a5d6a7' : '#ef9a9a'};font-size:13px;margin-top:4px;`;
                    msgEl.textContent = res.msg;
                    btn.parentNode.appendChild(msgEl);
                    setTimeout(() => msgEl.remove(), 2000);
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }

    // ========== 炼金铺UI（附魔/镶嵌） ==========
    showAlchemistMenu(state) {
        let html = '<div class="alchemist-container"><h4>🔮 炼金铺</h4>';
        html += '<div class="alchemist-section"><strong>附魔装备</strong><div class="forge-list">';
        let hasEquip = false;
        for (const slot in state.equipment) {
            const item = state.equipment[slot];
            if (!item) continue;
            hasEquip = true;
            const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
            html += `<div class="forge-item">
                <span style="color:${rarityColor}">${item.name}</span>
                <button class="enchant-btn" data-slot="${slot}" data-type="enchant">✨ 附魔 (15金)</button>
            </div>`;
        }
        if (!hasEquip) html += '<p style="color:var(--text-dim)">没有可附魔的装备</p>';
        html += '</div></div>';
        html += '<div class="alchemist-section"><strong>镶嵌宝石</strong><div class="forge-list">';
        const gems = state.inventory.items.filter(i => i.type === 'gem');
        if (gems.length === 0) {
            html += '<p style="color:var(--text-dim)">背包中没有宝石</p>';
        }
        html += '</div></div></div>';
        this.showPanel('🔮 炼金铺', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.enchant-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const slot = btn.dataset.slot;
                    const res = NPCSystem.enchantEquipment(state, slot);
                    const msgEl = document.createElement('p');
                    msgEl.style.color = res.ok ? '#a5d6a7' : '#ef9a9a';
                    msgEl.textContent = res.msg;
                    btn.parentNode.appendChild(msgEl);
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }

    // ========== 随从详细面板 ==========
    renderCompanionDetail(state, companionIndex) {
        const comp = state.companions[companionIndex];
        if (!comp) return;
        const container = this.container;
        if (!container) return;
        const attrs = comp.attributes || {};
        const attrNames = { str: '力量', agi: '敏捷', int: '智力', vit: '体质', ten: '坚韧', spi: '精神' };
        const attrIcons = { str: '💪', agi: '💨', int: '🧠', vit: '❤️', ten: '🛡️', spi: '✨' };
        let attrsHtml = '';
        for (const key in attrs) {
            attrsHtml += `<div class="char-stat-card"><div class="char-stat-label">${attrIcons[key] || ''} ${attrNames[key] || key}</div><div class="char-stat-value">${attrs[key]}</div></div>`;
        }
        const slotNames = { weapon: '武器', offhand: '副手', helmet: '头盔', chest: '胸甲', legs: '腿甲', boots: '靴子', gloves: '手套', necklace: '项链', ring1: '戒指1', ring2: '戒指2' };
        let equipHtml = '';
        const eq = comp.equipment || {};
        for (const slot in slotNames) {
            const item = eq[slot];
            if (item) {
                const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
                equipHtml += `<div class="equip-slot-card" style="border-left:3px solid ${rarityColor}"><span class="equip-slot-name">${slotNames[slot]}</span><span class="equip-item-name" style="color:${rarityColor}">${item.name}</span></div>`;
            } else {
                equipHtml += `<div class="equip-slot-card empty"><span class="equip-slot-name">${slotNames[slot]}</span><span class="equip-item-name" style="color:var(--text-dim)">空</span></div>`;
            }
        }
        const skillsHtml = (comp.skills || []).map(sid => {
            const skill = DATA.skills[sid];
            return skill ? `<span class="comp-skill-tag">${skill.name}</span>` : '';
        }).join('');
        const hpPct = comp.maxHp > 0 ? (comp.hp / comp.maxHp) * 100 : 0;
        const html = `
            <div class="companion-detail-panel" id="companion-panel">
                <div class="char-card char-basic-card">
                    <div class="char-name-row"><span class="char-name">${comp.name}</span><span class="char-class">${comp.class === 'warrior' ? '战士' : comp.class === 'ranger' ? '游侠' : '法师'}</span></div>
                    <div class="char-level-row"><span>Lv.${comp.level}</span></div>
                    <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%;background:#9c27b0"></div></div>
                    <div>HP: ${comp.hp}/${comp.maxHp} | MP: ${comp.mp}/${comp.maxMp}</div>
                </div>
                <div class="char-section"><strong class="char-section-title">六维属性</strong><div class="char-stats-grid">${attrsHtml}</div></div>
                <div class="char-section"><strong class="char-section-title">装备</strong><div class="equip-grid">${equipHtml}</div></div>
                <div class="char-section"><strong class="char-section-title">技能</strong><div class="comp-skills">${skillsHtml || '无'}</div></div>
                <button class="menu-btn" id="comp-close-btn">关闭</button>
            </div>
        `;
        const existing = document.getElementById('companion-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);
        setTimeout(() => {
            document.getElementById('comp-close-btn')?.addEventListener('click', () => {
                document.getElementById('companion-panel')?.remove();
            });
        }, 0);
    }

    // ========== 背包物品使用目标选择 ==========
    showItemUseTarget(state, itemId) {
        const item = state.inventory.items.find(i => i.id === itemId);
        if (!item) return;
        let html = '<div class="item-target-menu"><h4>选择使用目标</h4>';
        html += `<button class="target-select-btn" data-target="player">👤 ${state.player.name} (自己)</button>`;
        state.companions.forEach(comp => {
            if (comp.alive) {
                html += `<button class="target-select-btn" data-target="${comp.id}">🏹 ${comp.name}</button>`;
            }
        });
        html += '<button class="item-cancel-btn" id="item-use-cancel">取消</button></div>';
        this.showPanel(`🎯 对谁使用 ${item.name}？`, html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.target-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    this.closePanel();
                    const res = NPCSystem.useItem(state, itemId, targetId);
                    this.showToast(res.msg);
                    if (res.ok) {
                        // 刷新背包显示
                        this.renderInventory(state);
                        if (window.gameApp) window.gameApp.renderTopBar();
                    }
                });
            });
            document.getElementById('item-use-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    // ========== 修改锻造菜单以支持强化 ==========
    showForgeMenu(state) {
        const eq = state.equipment;
        let html = '<div class="forge-container"><h4>🔨 铁匠铺</h4>';
        html += '<div class="forge-section"><strong>锻造/强化</strong><div class="forge-list">';
        let hasItem = false;
        for (const slot in eq) {
            const item = eq[slot];
            if (!item) continue;
            hasItem = true;
            const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
            html += `<div class="forge-item">
                <span style="color:${rarityColor}">${item.name} (Lv.${item.level})</span>
                <div class="forge-actions">
                    <button class="forge-btn" data-slot="${slot}" data-type="forge">🔨 锻造 (10金)</button>
                    <button class="forge-btn" data-slot="${slot}" data-type="enhance">⬆️ 强化 (20金)</button>
                </div>
            </div>`;
        }
        if (!hasItem) html += '<p style="color:var(--text-dim)">当前没有可锻造的装备。</p>';
        html += '</div></div></div>';
        this.showPanel('🔨 锻造铺', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.forge-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const slot = btn.dataset.slot;
                    const type = btn.dataset.type;
                    const res = type === 'forge' ? NPCSystem.forgeEquipment(state, slot) : NPCSystem.enhanceEquipment(state, slot);
                    const msgEl = document.createElement('p');
                    msgEl.style.color = res.ok ? '#a5d6a7' : '#ef9a9a';
                    msgEl.textContent = res.msg;
                    btn.parentNode.appendChild(msgEl);
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }
}