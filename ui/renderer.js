// ui/renderer.js - 修复版
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
            'player-info': '<div class="player-info-placeholder">等待角色创建...</div>',
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
            this.showCombatResult(e.detail.result);
            setTimeout(() => {
                this.showCombatUI(false);
                this.isCombatActive = false;
                document.getElementById('scene-container').style.display = 'block';
            }, 3000);
        });
        document.addEventListener('combat-player-turn', (e) => {
            this.enableButtons(true);
        });
        document.addEventListener('scene-change', (e) => {
            if (!this.isCombatActive) this.renderScene(e.detail.scene);
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
    // ========== 场景渲染 ==========
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
        // 敌人
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
        // 我方
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
        if (logContainer) logContainer.innerHTML = '';
        const recent = logs.slice(-8);
        recent.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            if (logContainer) logContainer.appendChild(p);
            else container.appendChild(p);
        });
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
            document.getElementById('btn-defend').disabled = true;
            combat.playerAction('defend', null);
        });
        document.getElementById('btn-item').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const player = combat.getPlayerUnit();
            if (player) {
                const heal = 20;
                const maxHp = player.maxHp || 100;
                player.hp = Math.min(maxHp, (player.hp || 0) + heal);
                document.getElementById('btn-item').disabled = true;
                combat.playerAction('item', null);
                if (combat.combatLog) {
                    combat.combatLog.push(`${player.name} 使用道具，回复 ${heal} HP`);
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
        // 更新敌人
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
        // 更新玩家
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
        // 更新日志
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
        if (turnEl) turnEl.textContent = `回合 ${combat.currentTurn + 1}/${combat.maxTurns}`;
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
    // ========== 玩家信息面板 ==========
    updatePlayerInfo(player) {
        const container = document.getElementById('player-info');
        if (!container || !player) return;
        container.innerHTML = `
            <div class="player-info-bar">
                <strong>${player.name}</strong>
                <span>LV.${player.level || 1}</span>
                <span>HP: ${player.hp}/${player.maxHp}</span>
                <span>⚔️${player.attack || 0} 🛡️${player.defense || 0}</span>
                <span>💰${player.gold || 0}</span>
            </div>
        `;
    }
    // ========== 其他UI ==========
    renderInventory(state) {
        const container = this.container;
        if (!container) return;
        const scene = document.getElementById('scene-container');
        if (scene) scene.style.display = 'none';
        const existing = container.querySelector('.inventory-frame');
        if (existing) existing.remove();
        const summary = InventorySystem.getInventorySummary(state);
        container.innerHTML += `
            <div class="inventory-frame">
                <h3>🎒 背包 (${summary.total}/${summary.capacity})</h3>
                <div class="inventory-grid">
                    ${state.inventory.items.map(item => `
                        <div class="inventory-item" data-id="${item.id}">
                            <span class="item-name ${item.rarity}">${item.name}</span>
                            <span class="item-level">Lv.${item.level || 1}</span>
                            ${item.stack > 1 ? `<span class="item-stack">x${item.stack}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
                <button class="menu-btn" onclick="this.closest('.inventory-frame').remove(); document.getElementById('scene-container').style.display='block';">返回</button>
            </div>
        `;
    }
}
