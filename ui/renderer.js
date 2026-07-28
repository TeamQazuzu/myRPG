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
            const combat = this.combatEngine;
            if (combat && combat.autoMode) {
                this.enableButtons(false);
                const autoBtn = document.getElementById('auto-toggle-btn');
                if (autoBtn) {
                    autoBtn.textContent = '🤖 自动';
                    autoBtn.classList.add('on');
                }
            } else {
                this.enableButtons(true);
            }
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
        // 只获取对话文本，不触发任何动作（修复：原来会自动执行action[0]导致自动招募）
        let dialogueText = '...';
        if (typeof NPCSystem !== 'undefined' && NPCSystem.getDialogue) {
            dialogueText = NPCSystem.getDialogue(npc);
        }
        // 构建操作按钮，根据招募状态显示不同状态
        let actionHtml = '';
        if (npc.actions && npc.actions.length > 0) {
            actionHtml = `<div class="npc-actions">` +
                npc.actions.map((a, i) => {
                    if (a.type === 'recruit') {
                        const recruitId = npc.recruitId || npc.id;
                        const alreadyRecruited = state.companions.some(c => c.id === recruitId);
                        if (alreadyRecruited) {
                            return `<button class="npc-action-btn" disabled>已招募</button>`;
                        }
                        if (state.companions.length >= 2) {
                            return `<button class="npc-action-btn" disabled>队伍已满</button>`;
                        }
                    }
                    return `<button class="npc-action-btn" data-idx="${i}">${a.label}</button>`;
                }).join('') +
                `</div>`;
        }
        this.showPanel(`🗣️ ${npc.name}`, `
            <div class="npc-dialogue">${dialogueText}</div>
            ${actionHtml}
        `);
        // 绑定按钮事件
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.npc-action-btn').forEach(btn => {
                if (btn.disabled) return;
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
        const hasPoints = (p.attributePoints || 0) > 0;
        for (const key in attrs) {
            const val = attrs[key];
            attrsHtml += `
                <div class="char-stat-card ${hasPoints ? 'allocatable' : ''}">
                    <div class="char-stat-label">${attrIcons[key] || ''} ${attrNames[key] || key}</div>
                    <div class="char-stat-row">
                        ${hasPoints ? `<button class="attr-btn attr-minus" data-attr="${key}">−</button>` : ''}
                        <div class="char-stat-value" id="attr-val-${key}">${val}</div>
                        ${hasPoints ? `<button class="attr-btn attr-plus" data-attr="${key}">+</button>` : ''}
                    </div>
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
        for (const slot in slotNames) {
            const item = p.equipment ? p.equipment[slot] : state.equipment ? state.equipment[slot] : null;
            const label = slotNames[slot] || slot;
            if (item) {
                const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
                equipHtml += `<div class="equip-slot-card clickable" style="border-left:3px solid ${rarityColor}" data-eq-slot="${slot}" data-eq-target="player">
                    <span class="equip-slot-name">${label}</span>
                    <span class="equip-item-name" style="color:${rarityColor}">${item.name}</span>
                </div>`;
            } else {
                equipHtml += `<div class="equip-slot-card empty" data-eq-slot="${slot}" data-eq-target="player">
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

                <div class="char-section" id="char-derived-section">
                    <strong class="char-section-title">战斗属性</strong>
                    <div class="derived-stats-grid" id="derived-stats-grid">
                    </div>
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

        // 填充派生战斗属性
        const updateDerivedStats = () => {
            const stats = StateUtils.getCombatStats(state, 'player');
            if (!stats) return;
            const grid = document.getElementById('derived-stats-grid');
            if (!grid) return;
            const rows = [
                ['⚔️ 物理攻击', stats.physAtk, 'var(--danger)'],
                ['🔮 法术攻击', stats.magAtk, 'var(--accent-blue)'],
                ['🛡️ 物理防御', stats.physDef, 'var(--text-secondary)'],
                ['🔷 法术防御', stats.magDef, 'var(--accent-purple)'],
                ['🎯 命中', stats.hit, 'var(--gold-dim)'],
                ['💨 闪避', stats.dodge, 'var(--accent)'],
                ['⚡ 速度', (Math.round(stats.speed * 10) / 10), 'var(--gold)'],
                ['💥 暴击率', (stats.critRate * 100).toFixed(1) + '%', 'var(--danger)'],
                ['💥 暴伤', (stats.critDmg * 100).toFixed(0) + '%', 'var(--danger)'],
                ['❤️ 生命', stats.hp, 'var(--danger)'],
                ['✨ 法力', stats.mp, 'var(--accent-blue)'],
            ];
            grid.innerHTML = rows.map(([label, val, color]) =>
                `<div class="derived-stat-row"><span class="ds-label">${label}</span><span class="ds-value" style="color:${color}">${val}</span></div>`
            ).join('');
        };

        // 绑定随从点击事件和属性点分配
        setTimeout(() => {
            const panel = document.getElementById('character-panel');
            if (!panel) return;
            // 填充派生属性
            updateDerivedStats();
            // 装备槽点击：查看详情/卸下
            panel.querySelectorAll('.equip-slot-card[data-eq-slot]').forEach(card => {
                card.addEventListener('click', () => {
                    const slot = card.dataset.eqSlot;
                    const target = card.dataset.eqTarget;
                    const item = state.equipment[slot];
                    if (item) {
                        this.showEquipmentDetail(state, slot, target);
                    }
                });
            });
            // 随从点击
            panel.querySelectorAll('.companion-card').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = parseInt(card.dataset.companionIdx);
                    if (!isNaN(idx)) {
                        this.renderCompanionDetail(state, idx);
                    }
                });
            });
            // 属性点分配（+/-按钮）
            if (state.player.attributePoints > 0) {
                const attrNames = { str: '力量', agi: '敏捷', int: '智力', vit: '体质', ten: '坚韧', spi: '精神' };
                // 记录已分配的点数（用于回退）
                const allocated = {};
                panel.querySelectorAll('.attr-plus').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const attr = btn.dataset.attr;
                        if (state.player.attributePoints <= 0) return;
                        state.player.attributes[attr]++;
                        state.player.attributePoints--;
                        allocated[attr] = (allocated[attr] || 0) + 1;
                        const valEl = document.getElementById('attr-val-' + attr);
                        if (valEl) valEl.textContent = state.player.attributes[attr];
                        const hintEl = panel.querySelector('.char-points-hint');
                        if (hintEl) hintEl.textContent = '可分配点数: ' + state.player.attributePoints;
                        // 重算HP/MP并更新顶栏
                        if (window.gameApp) window.gameApp.recalcPlayerStats();
                        if (window.gameApp) window.gameApp.renderTopBar();
                        // 更新派生战斗属性
                        updateDerivedStats();
                        // 没有点了就刷新面板去掉按钮
                        if (state.player.attributePoints <= 0) {
                            this.renderCharacter(state);
                            this.showToast('属性点已全部分配');
                        }
                    });
                });
                panel.querySelectorAll('.attr-minus').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const attr = btn.dataset.attr;
                        if (!allocated[attr] || allocated[attr] <= 0) return;
                        state.player.attributes[attr]--;
                        state.player.attributePoints++;
                        allocated[attr]--;
                        const valEl = document.getElementById('attr-val-' + attr);
                        if (valEl) valEl.textContent = state.player.attributes[attr];
                        const hintEl = panel.querySelector('.char-points-hint');
                        if (hintEl) hintEl.textContent = '可分配点数: ' + state.player.attributePoints;
                        if (window.gameApp) window.gameApp.recalcPlayerStats();
                        if (window.gameApp) window.gameApp.renderTopBar();
                        updateDerivedStats();
                    });
                });
            }
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
                <div class="combat-header-right">
                    <button class="auto-toggle ${combat.autoMode ? 'on' : ''}" id="auto-toggle-btn">${combat.autoMode ? '🤖 自动' : '✋ 手动'}</button>
                    <span class="combat-turn">回合 ${combat.currentTurn + 1}/${combat.maxTurns}</span>
                </div>
            </div>
        `;
        // 绑定自动战斗切换
        const autoBtn = document.getElementById('auto-toggle-btn');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                const isAuto = combat.toggleAutoMode();
                autoBtn.textContent = isAuto ? '🤖 自动' : '✋ 手动';
                autoBtn.classList.toggle('on', isAuto);
                // 如果刚开启自动模式且当前是玩家回合，立即触发自动攻击
                if (isAuto && combat.isPlayerTurn && combat.active) {
                    setTimeout(() => {
                        if (combat.active && combat.isPlayerTurn) {
                            const target = combat.getFirstAliveEnemy();
                            if (target) combat.playerAction('attack', target);
                        }
                    }, 300);
                }
                this.enableButtons(!isAuto && combat.isPlayerTurn);
            });
        }
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        if (enemies.length > 0) {
            // 统计同名敌人数量，用于编号
            const nameCount = {};
            const nameIndex = {};
            enemies.forEach(e => {
                const n = e.name || '敌人';
                nameCount[n] = (nameCount[n] || 0) + 1;
            });
            const eDiv = document.createElement('div');
            eDiv.className = 'enemy-container';
            eDiv.innerHTML = '<div class="combat-section-label">🐺 敌方</div>';
            const tileGrid = document.createElement('div');
            tileGrid.className = 'enemy-tile-grid';
            enemies.forEach((enemy, i) => {
                const el = document.createElement('div');
                el.className = 'enemy-tile';
                el.dataset.index = i;
                const maxHp = enemy.maxHp || enemy.hp || 30;
                const hp = Math.max(0, enemy.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const hpColor = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336';
                // 同名敌人添加编号
                const baseName = enemy.name || '敌人';
                let displayName = baseName;
                if (nameCount[baseName] > 1) {
                    nameIndex[baseName] = (nameIndex[baseName] || 0) + 1;
                    displayName = `${baseName}${nameIndex[baseName]}`;
                }
                el.innerHTML = `
                    <div class="enemy-tile-name">${displayName} ${hp <= 0 ? '💀' : ''}</div>
                    <div class="enemy-tile-hp-bar"><div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:${hpColor}"></div></div>
                    <div class="enemy-tile-hp-text">${hp}/${maxHp}</div>
                `;
                el.addEventListener('click', () => {
                    document.querySelectorAll('.enemy-tile').forEach(e => e.classList.remove('selected'));
                    if (hp > 0) el.classList.add('selected');
                });
                if (hp <= 0) el.classList.add('dead');
                tileGrid.appendChild(el);
            });
            eDiv.appendChild(tileGrid);
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
                const maxMp = ally.maxMp || ally.mp || 0;
                const mp = Math.max(0, ally.mp || 0);
                const mpPct = maxMp > 0 ? (mp / maxMp) * 100 : 0;
                const hpColor = isCompanion ? '#9c27b0' : '#2196F3';
                const mpColor = '#00b8d4';
                el.innerHTML = `
                    <div class="player-name">${ally.name} ${isCompanion ? '🏹' : ''} ${hp <= 0 ? '💀' : ''}</div>
                    <div class="player-hp">
                        <span>HP</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:${hpColor}"></div>
                        </div>
                        <span class="hp-num">${hp}/${maxHp}</span>
                    </div>
                    ${maxMp > 0 ? `<div class="player-mp">
                        <span>MP</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width:${Math.max(0, mpPct)}%;background:${mpColor}"></div>
                        </div>
                        <span class="hp-num">${mp}/${maxMp}</span>
                    </div>` : ''}
                    <div class="player-stats">
                        ⚔️${ally.attack || 0} 🛡️${ally.defense || 0} 💨${Math.round((ally.speed || 0) * 10) / 10}
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
        const selected = document.querySelector('.enemy-tile.selected');
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
        // 统计同名敌人用于编号
        const nameCount = {};
        const nameIndex = {};
        enemies.forEach(e => {
            const n = e.name || '敌人';
            nameCount[n] = (nameCount[n] || 0) + 1;
        });
        const enemyEls = document.querySelectorAll('.enemy-tile');
        enemies.forEach((enemy, i) => {
            if (enemyEls[i]) {
                const maxHp = enemy.maxHp || enemy.hp || 30;
                const hp = Math.max(0, enemy.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const nameEl = enemyEls[i].querySelector('.enemy-tile-name');
                const hpText = enemyEls[i].querySelector('.enemy-tile-hp-text');
                const hpFill = enemyEls[i].querySelector('.hp-fill');
                // 保持编号显示
                const baseName = enemy.name || '敌人';
                let displayName = baseName;
                if (nameCount[baseName] > 1) {
                    nameIndex[baseName] = (nameIndex[baseName] || 0) + 1;
                    displayName = `${baseName}${nameIndex[baseName]}`;
                }
                if (nameEl) nameEl.innerHTML = `${displayName} ${hp <= 0 ? '💀' : ''}`;
                if (hpText) hpText.textContent = `${hp}/${maxHp}`;
                if (hpFill) {
                    hpFill.style.width = Math.max(0, hpPct) + '%';
                    hpFill.style.background = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336';
                }
                if (hp <= 0) enemyEls[i].classList.add('dead');
            }
        });
        // 同步玩家与随从血条和蓝条
        const allies = [combat.getPlayerUnit ? combat.getPlayerUnit() : null,
                        ...(combat.getCompanionUnits ? combat.getCompanionUnits() : [])].filter(Boolean);
        const allyEls = document.querySelectorAll('.player-unit, .companion-unit');
        allies.forEach((ally, i) => {
            if (allyEls[i]) {
                const maxHp = ally.maxHp || ally.hp || 100;
                const hp = Math.max(0, ally.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const maxMp = ally.maxMp || ally.mp || 0;
                const mp = Math.max(0, ally.mp || 0);
                const mpPct = maxMp > 0 ? (mp / maxMp) * 100 : 0;
                const nameEl = allyEls[i].querySelector('.player-name');
                if (nameEl) {
                    const icon = ally.isCompanion ? '🏹' : '';
                    nameEl.innerHTML = `${ally.name} ${icon} ${hp <= 0 ? '💀' : ''}`;
                }
                // 更新HP数值和血条
                const hpNums = allyEls[i].querySelectorAll('.hp-num');
                const hpFills = allyEls[i].querySelectorAll('.hp-fill');
                if (hpNums[0]) hpNums[0].textContent = `${hp}/${maxHp}`;
                if (hpFills[0]) hpFills[0].style.width = Math.max(0, hpPct) + '%';
                // 更新MP数值和蓝条
                if (hpNums[1]) hpNums[1].textContent = `${mp}/${maxMp}`;
                if (hpFills[1]) hpFills[1].style.width = Math.max(0, mpPct) + '%';
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
        this.enableButtons(!combat.autoMode && combat.isPlayerTurn);
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
                const isUsable = item.type === 'consumable' || item.type === 'potion' || item.subtype === 'heal' || item.subtype === 'mana' || item.subtype === 'exp' || (item.type === 'consumable' && (item.heal || item.healHp || item.healMp || item.expValue));
                const isEquipment = this._isEquipment(item);
                const isViewable = !isUsable && !isEquipment && (item.description || item.type === 'treasure' || item.type === 'quest');
                html += `
                    <div class="item-card ${isUsable ? 'usable' : ''} ${isViewable ? 'viewable' : ''} ${isEquipment ? 'equippable' : ''}" style="border-color:${rarityColor}" data-item-id="${item.id}" data-usable="${isUsable ? '1' : '0'}" data-equipment="${isEquipment ? '1' : '0'}">
                        <div class="item-rarity" style="color:${rarityColor}">${DATA.rarity[item.rarity]?.name || item.rarity || ''}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-level">Lv.${item.level || 1}${item.stack > 1 ? ' x' + item.stack : ''}</div>
                        ${isUsable ? '<div class="item-use-hint">点击使用</div>' : ''}
                        ${isEquipment ? '<div class="item-equip-hint">点击装备</div>' : ''}
                        ${isViewable ? '<div class="item-view-hint">点击查看</div>' : ''}
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
            // 绑定物品点击事件
            const panel = document.getElementById('inventory-panel');
            if (panel) {
                // 可使用物品：弹出目标选择
                panel.querySelectorAll('.item-card[data-usable="1"]').forEach(card => {
                    card.addEventListener('click', () => {
                        const itemId = card.dataset.itemId;
                        this.showItemUseTarget(state, itemId);
                    });
                });
                // 装备类物品：弹出装备目标选择
                panel.querySelectorAll('.item-card[data-equipment="1"]').forEach(card => {
                    card.addEventListener('click', () => {
                        const itemId = card.dataset.itemId;
                        this.showEquipTarget(state, itemId);
                    });
                });
                // 非使用非装备物品但有描述/宝箱类型：点击查看详情
                panel.querySelectorAll('.item-card[data-usable="0"][data-equipment="0"]').forEach(card => {
                    const itemId = card.dataset.itemId;
                    const item = state.inventory.items.find(i => i.id === itemId);
                    if (item && (item.description || item.type === 'treasure' || item.type === 'quest')) {
                        card.style.cursor = 'pointer';
                        card.addEventListener('click', () => {
                            this.showItemDetail(state, item);
                        });
                    }
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

    // ========== 随从列表视图 ==========
    renderCompanionList(state) {
        const container = this.container;
        if (!container) return;
        const sceneEl = document.getElementById('scene-container');
        if (sceneEl) sceneEl.style.display = 'none';
        let html = `
            <div class="companion-list-panel" id="companion-panel">
                <h3>🏹 随从队伍 (${state.companions.length}/2)</h3>
        `;
        if (state.companions.length === 0) {
            html += '<p style="color:var(--text-dim);text-align:center;padding:32px 0;">还没有随从。<br>去酒馆、铁匠铺、炼金铺寻找可以招募的伙伴吧。</p>';
        } else {
            html += '<div class="companion-list-grid">';
            state.companions.forEach((comp, idx) => {
                const hpPct = comp.maxHp > 0 ? Math.max(0, (comp.hp / comp.maxHp) * 100) : 0;
                const className = comp.class === 'warrior' ? '战士' : comp.class === 'ranger' ? '游侠' : '法师';
                const classIcon = comp.class === 'warrior' ? '⚔️' : comp.class === 'ranger' ? '🏹' : '🔮';
                html += `
                    <div class="companion-list-card">
                        <div class="companion-list-header">
                            <span class="companion-name">${classIcon} ${comp.name}</span>
                            <span class="companion-class">${className}</span>
                        </div>
                        <div class="companion-lv">Lv.${comp.level}</div>
                        <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%;background:#9c27b0"></div></div>
                        <div class="companion-hp-text">HP: ${comp.hp}/${comp.maxHp} | MP: ${comp.mp}/${comp.maxMp}</div>
                        <div class="companion-list-actions">
                            <button class="menu-btn companion-view-btn" data-idx="${idx}">查看详情</button>
                            <button class="menu-btn danger companion-dismiss-btn" data-idx="${idx}">解雇</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        html += '<button class="menu-btn" id="comp-list-close" style="margin-top:12px;">关闭</button>';
        html += '</div>';

        const existing = document.getElementById('companion-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);

        setTimeout(() => {
            document.getElementById('comp-list-close')?.addEventListener('click', () => {
                document.getElementById('companion-panel')?.remove();
                if (sceneEl) sceneEl.style.display = 'block';
            });
            container.querySelectorAll('.companion-view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.idx);
                    this.renderCompanionDetail(state, idx);
                });
            });
            container.querySelectorAll('.companion-dismiss-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.idx);
                    const comp = state.companions[idx];
                    if (!comp) return;
                    if (confirm(`确定要解雇 ${comp.name} 吗？\n解雇后该随从的装备和经验将丢失。`)) {
                        const res = NPCSystem.dismissCompanion(state, comp.id);
                        this.showToast(res.msg);
                        this.renderCompanionList(state);
                        if (window.gameApp) window.gameApp.renderTopBar();
                    }
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
                equipHtml += `<div class="equip-slot-card clickable" style="border-left:3px solid ${rarityColor}" data-eq-slot="${slot}" data-eq-target="${comp.id}"><span class="equip-slot-name">${slotNames[slot]}</span><span class="equip-item-name" style="color:${rarityColor}">${item.name}</span></div>`;
            } else {
                equipHtml += `<div class="equip-slot-card empty" data-eq-slot="${slot}" data-eq-target="${comp.id}"><span class="equip-slot-name">${slotNames[slot]}</span><span class="equip-item-name" style="color:var(--text-dim)">空</span></div>`;
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
                <div class="char-section"><strong class="char-section-title">战斗属性</strong><div class="derived-stats-grid" id="comp-derived-stats"></div></div>
                <div class="char-section"><strong class="char-section-title">装备</strong><div class="equip-grid">${equipHtml}</div></div>
                <div class="char-section"><strong class="char-section-title">技能</strong><div class="comp-skills">${skillsHtml || '无'}</div></div>
                <div class="comp-detail-actions">
                    <button class="menu-btn danger" id="comp-dismiss-btn">解雇此随从</button>
                    <button class="menu-btn" id="comp-back-btn">返回列表</button>
                    <button class="menu-btn" id="comp-close-btn">关闭</button>
                </div>
            </div>
        `;
        const existing = document.getElementById('companion-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);
        setTimeout(() => {
            // 填充随从战斗属性
            const compStats = StateUtils.getCombatStats(state, comp.id);
            if (compStats) {
                const grid = document.getElementById('comp-derived-stats');
                if (grid) {
                    const rows = [
                        ['⚔️ 物理攻击', compStats.physAtk, 'var(--danger)'],
                        ['🔮 法术攻击', compStats.magAtk, 'var(--accent-blue)'],
                        ['🛡️ 物理防御', compStats.physDef, 'var(--text-secondary)'],
                        ['🔷 法术防御', compStats.magDef, 'var(--accent-purple)'],
                        ['⚡ 速度', (Math.round(compStats.speed * 10) / 10), 'var(--gold)'],
                        ['💥 暴击率', (compStats.critRate * 100).toFixed(1) + '%', 'var(--danger)'],
                        ['💥 暴伤', (compStats.critDmg * 100).toFixed(0) + '%', 'var(--danger)'],
                    ];
                    grid.innerHTML = rows.map(([label, val, color]) =>
                        `<div class="derived-stat-row"><span class="ds-label">${label}</span><span class="ds-value" style="color:${color}">${val}</span></div>`
                    ).join('');
                }
            }
            // 装备槽点击：查看详情/卸下
            const compPanel = document.getElementById('companion-panel');
            if (compPanel) {
                compPanel.querySelectorAll('.equip-slot-card[data-eq-slot]').forEach(card => {
                    card.addEventListener('click', () => {
                        const slot = card.dataset.eqSlot;
                        const target = card.dataset.eqTarget;
                        const item = comp.equipment && comp.equipment[slot];
                        if (item) {
                            this.showEquipmentDetail(state, slot, target);
                        }
                    });
                });
            }
            document.getElementById('comp-close-btn')?.addEventListener('click', () => {
                document.getElementById('companion-panel')?.remove();
            });
            document.getElementById('comp-back-btn')?.addEventListener('click', () => {
                this.renderCompanionList(state);
            });
            document.getElementById('comp-dismiss-btn')?.addEventListener('click', () => {
                if (confirm(`确定要解雇 ${comp.name} 吗？\n解雇后该随从的装备和经验将丢失。`)) {
                    const res = NPCSystem.dismissCompanion(state, comp.id);
                    this.showToast(res.msg);
                    this.renderCompanionList(state);
                    if (window.gameApp) window.gameApp.renderTopBar();
                }
            });
        }, 0);
    }

    // ========== 物品详情查看 ==========
    showItemDetail(state, item) {
        const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
        const rarityName = DATA.rarity[item.rarity]?.name || '';
        let detailHtml = `<div style="color:${rarityColor};font-weight:bold;font-size:15px;margin-bottom:8px;">${item.name} ${rarityName ? '(' + rarityName + ')' : ''}</div>`;
        detailHtml += `<div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">等级: ${item.level || 1}</div>`;
        if (item.description) {
            detailHtml += `<div style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin:8px 0;font-size:13px;line-height:1.7;color:var(--text-primary);">${item.description}</div>`;
        }
        if (item.type === 'treasure') {
            detailHtml += `<div style="margin-top:12px;"><button class="npc-action-btn" id="treasure-open-btn" style="width:100%;">📦 打开宝箱</button></div>`;
        }
        this.showPanel('📋 物品详情', detailHtml);
        setTimeout(() => {
            const openBtn = document.getElementById('treasure-open-btn');
            if (openBtn) {
                openBtn.addEventListener('click', () => {
                    // 打开宝箱：生成一件同等级的随机装备
                    const itemLevel = item.level || state.player.level;
                    const maxRarity = Utils.getDropMaxRarity(itemLevel);
                    const pool = Utils.getDropRarityPool(maxRarity);
                    const dropRarity = Utils.weightedRandom(pool.rarities, pool.weights);
                    const types = ['sword', 'armor', 'helmet', 'boots', 'gloves', 'necklace', 'ring'];
                    const reward = Utils.generateItem(Utils.pickOne(types), itemLevel, dropRarity);
                    const addResult = InventorySystem.addToInventory(state, reward);
                    if (addResult.ok) {
                        // 从背包移除宝箱
                        StateUtils.removeFromInventory(state, item.id);
                        this.closePanel();
                        this.renderInventory(state);
                        this.showToast(`获得了 ${reward.name}（${DATA.rarity[reward.rarity]?.name}）`);
                        if (window.gameApp) window.gameApp.renderTopBar();
                    } else {
                        this.showToast('背包已满，无法打开宝箱');
                    }
                });
            }
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

    // ========== 判断是否为装备 ==========
    _isEquipment(item) {
        if (!item) return false;
        if (item.type === 'consumable' || item.type === 'potion' || item.type === 'gem' ||
            item.type === 'quest' || item.type === 'treasure' || item.type === 'material') return false;
        if (DATA.equipTypeToSlot && DATA.equipTypeToSlot[item.type]) return true;
        if (item.baseStats && item.type) return true;
        return false;
    }

    // ========== 获取装备槽位 ==========
    _getEquipSlot(item) {
        if (DATA.equipTypeToSlot && DATA.equipTypeToSlot[item.type]) {
            return DATA.equipTypeToSlot[item.type];
        }
        return null;
    }

    // ========== 格式化装备属性文本 ==========
    _formatEquipStats(item) {
        let html = '';
        // 基础属性
        if (item.baseStats) {
            const statNames = {
                physAtk: '物理攻击', magAtk: '法术攻击', physDef: '物理防御',
                magDef: '法术防御', hp: '生命值', mp: '法力值',
                speed: '速度', critRate: '暴击率', critDmg: '暴击伤害'
            };
            html += '<div class="eq-detail-section"><strong>基础属性</strong><div class="eq-detail-stats">';
            for (const [key, val] of Object.entries(item.baseStats)) {
                const name = statNames[key] || key;
                const display = (key === 'critRate' || key === 'critDmg') ? (val * 100).toFixed(1) + '%' : val;
                html += `<span class="eq-stat">+${display} ${name}</span>`;
            }
            html += '</div></div>';
        }
        // 词条
        if (item.affixes && item.affixes.length > 0) {
            html += '<div class="eq-detail-section"><strong>词条</strong><div class="eq-detail-stats">';
            item.affixes.forEach(a => {
                html += `<span class="eq-stat affix">${a.name || a.id || '词条'}</span>`;
            });
            html += '</div></div>';
        }
        // 附魔
        if (item.enchant && item.enchant.v) {
            html += `<div class="eq-detail-section"><strong>附魔</strong><div class="eq-detail-stats">`;
            html += `<span class="eq-stat enchant">✨ ${item.enchant.desc || item.enchant.t + '+' + item.enchant.v}</span>`;
            html += '</div></div>';
        }
        // 镶嵌宝石
        if (item.sockets && item.sockets.length > 0) {
            html += '<div class="eq-detail-section"><strong>镶嵌</strong><div class="eq-detail-stats">';
            item.sockets.forEach((s, i) => {
                if (typeof s === 'string' && typeof GemSystem !== 'undefined' && GemSystem.gems[s]) {
                    const g = GemSystem.gems[s];
                    html += `<span class="eq-stat gem">${g.icon || '💎'} ${g.name}</span>`;
                } else if (s && s.gem && s.gem.name) {
                    html += `<span class="eq-stat gem">💎 ${s.gem.name}</span>`;
                } else {
                    html += `<span class="eq-stat empty-socket">⚪ 空孔</span>`;
                }
            });
            html += '</div></div>';
        }
        return html || '<div style="color:var(--text-dim);font-size:12px;">无附加属性</div>';
    }

    // ========== 背包装备：选择装备目标（主角/随从） ==========
    showEquipTarget(state, itemId) {
        const item = state.inventory.items.find(i => i.id === itemId);
        if (!item) return;
        const slot = this._getEquipSlot(item);
        if (!slot) {
            this.showToast('无法识别装备类型');
            return;
        }
        const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
        const rarityName = DATA.rarity[item.rarity]?.name || '';
        // 显示装备详情和目标选择
        let html = `<div style="color:${rarityColor};font-weight:bold;font-size:15px;margin-bottom:4px;">${item.name}</div>`;
        html += `<div style="color:var(--text-secondary);font-size:11px;margin-bottom:8px;">${rarityName} | Lv.${item.level || 1}</div>`;
        html += this._formatEquipStats(item);
        html += '<div style="margin-top:14px;"><strong style="color:var(--gold-dim);font-size:13px;">选择装备目标</strong></div>';
        html += '<div class="equip-target-list" style="margin-top:8px;">';
        // 主角
        const playerSlotItem = state.equipment[slot];
        // 戒指特殊处理：如果ring1已占用，检查ring2
        let actualSlot = slot;
        let currentName = playerSlotItem ? playerSlotItem.name : '空';
        if (item.type === 'ring') {
            if (!state.equipment.ring1) {
                actualSlot = 'ring1';
                currentName = '空';
            } else if (!state.equipment.ring2) {
                actualSlot = 'ring2';
                currentName = '空';
            } else {
                actualSlot = 'ring1';
                currentName = state.equipment.ring1.name;
            }
        }
        html += `<button class="target-select-btn equip-target-btn" data-target="player" data-slot="${actualSlot}">
            👤 ${state.player.name} (当前: ${currentName})
        </button>`;
        // 随从
        state.companions.forEach(comp => {
            if (!comp.alive) return;
            const compEq = comp.equipment || {};
            let compSlot = slot;
            let compCurrent = compEq[slot] ? compEq[slot].name : '空';
            if (item.type === 'ring') {
                if (!compEq.ring1) { compSlot = 'ring1'; compCurrent = '空'; }
                else if (!compEq.ring2) { compSlot = 'ring2'; compCurrent = '空'; }
                else { compSlot = 'ring1'; compCurrent = compEq.ring1.name; }
            }
            const classIcon = comp.class === 'warrior' ? '⚔️' : comp.class === 'ranger' ? '🏹' : '🔮';
            html += `<button class="target-select-btn equip-target-btn" data-target="${comp.id}" data-slot="${compSlot}">
                ${classIcon} ${comp.name} (当前: ${compCurrent})
            </button>`;
        });
        html += '<button class="item-cancel-btn" id="equip-cancel">取消</button>';
        html += '</div>';
        this.showPanel('⚔️ 装备', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.equip-target-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    const targetSlot = btn.dataset.slot;
                    this._performEquip(state, itemId, targetId, targetSlot);
                });
            });
            document.getElementById('equip-cancel')?.addEventListener('click', () => this.closePanel());
        }, 0);
    }

    // ========== 执行装备操作 ==========
    _performEquip(state, itemId, targetId, slot) {
        const item = state.inventory.items.find(i => i.id === itemId);
        if (!item) { this.showToast('物品不存在'); return; }
        let oldItem = null;
        if (targetId === 'player') {
            // 装备到主角
            const check = StateUtils.checkEquipLimit(state, item);
            if (!check.ok) {
                this.showToast(check.reason);
                return;
            }
            oldItem = state.equipment[slot];
            state.equipment[slot] = item;
            // 从背包移除
            StateUtils.removeFromInventory(state, itemId, 1);
            // 旧装备放回背包
            if (oldItem) {
                StateUtils.addToInventory(state, oldItem);
            }
            // 重算属性
            if (window.gameApp) {
                window.gameApp.recalcPlayerStats();
                window.gameApp.renderTopBar();
            }
        } else {
            // 装备到随从
            const comp = state.companions.find(c => c.id === targetId);
            if (!comp) { this.showToast('随从不存在'); return; }
            if (!comp.equipment) {
                comp.equipment = { weapon: null, offhand: null, helmet: null, chest: null, legs: null, boots: null, gloves: null, necklace: null, ring1: null, ring2: null };
            }
            oldItem = comp.equipment[slot];
            comp.equipment[slot] = item;
            StateUtils.removeFromInventory(state, itemId, 1);
            if (oldItem) {
                StateUtils.addToInventory(state, oldItem);
            }
        }
        this.closePanel();
        this.showToast(oldItem ? `装备了 ${item.name}，${oldItem.name} 已放回背包` : `装备了 ${item.name}`);
        // 刷新背包
        this.renderInventory(state);
    }

    // ========== 装备详情查看（角色面板用） ==========
    showEquipmentDetail(state, slot, targetId) {
        const isPlayer = targetId === 'player';
        const eq = isPlayer ? state.equipment : (state.companions.find(c => c.id === targetId)?.equipment || {});
        const item = eq[slot];
        if (!item) return;
        const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
        const rarityName = DATA.rarity[item.rarity]?.name || '';
        const slotNames = {
            weapon: '武器', offhand: '副手', helmet: '头盔', chest: '胸甲',
            legs: '腿甲', boots: '靴子', gloves: '手套', necklace: '项链',
            ring1: '戒指1', ring2: '戒指2'
        };
        let html = `<div style="color:${rarityColor};font-weight:bold;font-size:15px;margin-bottom:4px;">${item.name}</div>`;
        html += `<div style="color:var(--text-secondary);font-size:11px;margin-bottom:8px;">${rarityName} | ${slotNames[slot] || slot} | Lv.${item.level || 1}</div>`;
        html += this._formatEquipStats(item);
        html += `<div style="margin-top:14px;">
            <button class="menu-btn danger" id="unequip-btn" style="width:100%;">卸下装备</button>
        </div>`;
        this.showPanel('📋 装备详情', html);
        setTimeout(() => {
            const btn = document.getElementById('unequip-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    // 检查背包空间
                    if (state.inventory.items.length >= state.inventory.capacity) {
                        this.showToast('背包已满，无法卸下');
                        return;
                    }
                    if (isPlayer) {
                        state.equipment[slot] = null;
                        StateUtils.addToInventory(state, item);
                        if (window.gameApp) {
                            window.gameApp.recalcPlayerStats();
                            window.gameApp.renderTopBar();
                        }
                    } else {
                        const comp = state.companions.find(c => c.id === targetId);
                        if (comp && comp.equipment) {
                            comp.equipment[slot] = null;
                            StateUtils.addToInventory(state, item);
                        }
                    }
                    this.closePanel();
                    this.showToast(`已卸下 ${item.name}`);
                    // 刷新面板
                    if (isPlayer) {
                        this.renderCharacter(state);
                    } else {
                        const idx = state.companions.findIndex(c => c.id === targetId);
                        if (idx >= 0) this.renderCompanionDetail(state, idx);
                    }
                });
            }
        }, 0);
    }

    // ========== 铁匠铺菜单：锻造（品质提升） ==========
    showForgeMenu(state) {
        const eq = state.equipment;
        let html = '<div class="forge-container"><h4>🔨 铁匠铺</h4>';
        html += '<div class="forge-section"><strong>品质锻造</strong><div class="forge-list">';
        let hasItem = false;
        for (const slot in eq) {
            const item = eq[slot];
            if (!item) continue;
            const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
            const maxForge = NPCSystem._getMaxForgeCount ? NPCSystem._getMaxForgeCount(item) : '?';
            const forgeCount = item.forgeCount || 0;
            const cost = 10 + forgeCount * 10;
            const canForge = forgeCount < maxForge;
            html += `<div class="forge-item">
                <span style="color:${rarityColor}">${item.name} (Lv.${item.level})</span>
                <div class="forge-sub">锻造 ${forgeCount}/${maxForge} | 费用 ${cost}金</div>
                <div class="forge-actions">
                    <button class="forge-btn" data-slot="${slot}" data-type="forge" ${!canForge ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>🔨 锻造 (${cost}金)</button>
                </div>
            </div>`;
            hasItem = true;
        }
        if (!hasItem) html += '<p style="color:var(--text-dim)">当前没有可锻造的装备。</p>';
        html += '</div></div></div>';
        this.showPanel('🔨 铁匠铺', html);
        setTimeout(() => {
            const panel = document.getElementById('dynamic-panel');
            if (!panel) return;
            panel.querySelectorAll('.forge-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const slot = btn.dataset.slot;
                    const res = NPCSystem.forgeEquipment(state, slot);
                    const msgEl = document.createElement('p');
                    msgEl.style.color = res.ok ? '#a5d6a7' : '#ef9a9a';
                    msgEl.textContent = res.msg;
                    btn.parentNode.appendChild(msgEl);
                    if (res.ok) {
                        // 刷新锻造面板以更新次数和费用
                        setTimeout(() => this.showForgeMenu(state), 300);
                    }
                    if (window.gameApp) window.gameApp.renderTopBar();
                });
            });
        }, 0);
    }
}