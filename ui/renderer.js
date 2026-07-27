// ui/renderer.js
class UIRenderer {
    constructor() {
        this.container = null;
        this.combatEngine = null;
        this.isCombatActive = false;
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
        const typeLabel = isSafe ? '🛡️ 安全区' : '⚔️ 野外';
        const typeClass = isSafe ? 'safe' : 'wild';
        let html = `
            <div class="scene-info">
                <h2>🏠 ${scene.name || '未知'}</h2>
                <p>${scene.desc || scene.description || ''}</p>
                <span class="scene-type ${typeClass}">${typeLabel}</span>
            </div>
        `;
        if (scene.exits && scene.exits.length > 0) {
            html += `
                <div class="scene-exits">
                    <strong>🚪 可前往:</strong>
                    ${scene.exits.map(exit =>
                        `<button class="exit-btn" data-scene="${exit}">→ ${exit}</button>`
                    ).join('')}
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
    }
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
            eDiv.innerHTML = '<h4>🐺 敌方</h4>';
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
        const player = combat.getPlayerUnit ? combat.getPlayerUnit() : null;
        if (player) {
            const pDiv = document.createElement('div');
            pDiv.className = 'player-container';
            const maxHp = player.maxHp || player.hp || 100;
            const hp = Math.max(0, player.hp || 0);
            const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
            pDiv.innerHTML = `
                <h4>🧙 我方</h4>
                <div class="player-unit">
                    <div class="player-name">${player.name}</div>
                    <div class="player-hp">
                        <span>HP: ${hp}/${maxHp}</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:#2196F3"></div>
                        </div>
                    </div>
                    <div class="player-stats">
                        ⚔️${player.attack || 0} 🛡️${player.defense || 0} 💨${player.speed || 0}
                    </div>
                </div>
            `;
            container.appendChild(pDiv);
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
            <button class="action-btn" id="btn-attack">⚔️ 攻击</button>
            <button class="action-btn" id="btn-skill">✨ 技能</button>
            <button class="action-btn" id="btn-defend">🛡️ 防御</button>
            <button class="action-btn" id="btn-item">🎒 道具</button>
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
                InventorySystem.removeFromInventory(state, consumable.id, 1);
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
        const player = combat.getPlayerUnit ? combat.getPlayerUnit() : null;
        if (player) {
            const playerEl = document.querySelector('.player-unit');
            if (playerEl) {
                const maxHp = player.maxHp || player.hp || 100;
                const hp = Math.max(0, player.hp || 0);
                const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
                const hpText = playerEl.querySelector('.player-hp span');
                const hpFill = playerEl.querySelector('.hp-fill');
                if (hpText) hpText.textContent = `HP: ${hp}/${maxHp}`;
                if (hpFill) hpFill.style.width = Math.max(0, hpPct) + '%';
            }
        }
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
        // 更新顶部状态栏等（如有需要可扩展）
        console.log('[UI] 更新玩家信息:', player ? player.name : '无');
    }
    showPanel(title, html) {
        // 简易弹窗实现
        let panel = document.getElementById('dynamic-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'dynamic-panel';
            panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:1px solid #2a2a4a;border-radius:8px;padding:20px;max-width:400px;width:90%;z-index:1000;color:#e8e8e8;';
            document.body.appendChild(panel);
        }
        panel.innerHTML = `<h3 style="margin-bottom:12px;color:#c9a96e;">${title}</h3>${html}<div style="text-align:center;margin-top:16px;"><button onclick="document.getElementById('dynamic-panel').style.display='none'" style="padding:6px 16px;background:#c9a96e;color:#1a1a2e;border:none;border-radius:4px;cursor:pointer;">关闭</button></div>`;
        panel.style.display = 'block';
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
                        <button class="class-btn" data-class="warrior">⚔️ 战士</button>
                        <button class="class-btn" data-class="ranger">🏹 游侠</button>
                        <button class="class-btn" data-class="mage">🔮 法师</button>
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
        const summary = InventorySystem.getInventorySummary(state);
        let html = `
            <div class="inventory-frame" id="inventory-panel">
                <div class="inv-header">
                    <h3>🎒 背包 (${summary.total}/${summary.capacity})</h3>
                </div>
                <div class="inv-grid">
        `;
        if (state.inventory.items.length === 0) {
            html += `<p style="grid-column:1/-1;text-align:center;color:#666680;">背包空空如也</p>`;
        } else {
            for (const item of state.inventory.items) {
                const rarityColor = DATA.rarity[item.rarity]?.color || '#ccc';
                html += `
                    <div class="item-card" style="border-color:${rarityColor}">
                        <div class="item-rarity" style="color:${rarityColor}">${DATA.rarity[item.rarity]?.name || item.rarity}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-level">Lv.${item.level || 1}${item.stack > 1 ? ' x' + item.stack : ''}</div>
                    </div>
                `;
            }
        }
        html += `
                </div>
                <div class="inv-footer">
                    <button class="menu-btn" onclick="document.getElementById('inventory-panel').remove();document.getElementById('scene-container').style.display='block'">关闭</button>
                </div>
            </div>
        `;
        const existing = document.getElementById('inventory-panel');
        if (existing) existing.remove();
        container.insertAdjacentHTML('beforeend', html);
    }
}
