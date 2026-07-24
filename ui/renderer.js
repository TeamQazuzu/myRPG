// ui/renderer.js - 改为类
class UIRenderer {
    constructor() {
        this.container = null;
        this.combatEngine = null;
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
        // 创建必要的UI容器
        const ids = ['scene-container', 'combat-container', 'action-buttons', 'combat-log', 'combat-result'];
        ids.forEach(id => {
            if (!document.getElementById(id)) {
                const div = document.createElement('div');
                div.id = id;
                if (id === 'combat-log') {
                    div.innerHTML = '<h4>战斗日志</h4><div class="log-container"></div>';
                }
                if (id === 'combat-result') {
                    div.style.cssText = 'display:none;padding:15px;text-align:center;font-size:24px;border-radius:10px;margin:10px 0;';
                }
                this.container.appendChild(div);
            }
        });
    }

    bindEvents() {
        document.addEventListener('combat-start', (e) => {
            this.combatEngine = e.detail.combat;
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
            }, 3000);
        });

        document.addEventListener('combat-player-turn', (e) => {
            this.enableButtons(true);
        });

        document.addEventListener('scene-change', (e) => {
            this.renderScene(e.detail.scene);
        });
    }

    showCombatUI(show) {
        const container = document.getElementById('combat-container');
        const buttons = document.getElementById('action-buttons');
        if (container) container.style.display = show ? 'block' : 'none';
        if (buttons) buttons.style.display = show ? 'flex' : 'none';
    }

    // ========== 主游戏画面 ==========

    renderMain(state) {
        if (!this.container) return;
        // 这里调用 SceneSystem 需要确保存在
        // 临时使用简单渲染
        this.container.innerHTML = `
            <div class="game-frame">
                <div class="header-bar">
                    <span>🧙 ${state.player.name} Lv.${state.player.level}</span>
                    <span>❤️ ${state.player.hp}/${state.player.maxHp}</span>
                </div>
                <div id="scene-container"></div>
                <div id="combat-container"></div>
                <div id="action-buttons"></div>
                <div id="combat-log"></div>
                <div id="combat-result"></div>
            </div>
        `;
    }

    // ========== 战斗UI ==========

    renderCombat(combat) {
        const container = document.getElementById('combat-container');
        if (!container) return;
        
        container.style.display = 'block';
        container.innerHTML = '<h3>⚔️ 战斗中 ⚔️</h3>';
        
        // 获取敌人
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        if (enemies.length > 0) {
            const eDiv = document.createElement('div');
            eDiv.className = 'enemy-container';
            eDiv.innerHTML = '<h4>🐺 敌人</h4>';
            enemies.forEach((enemy, i) => {
                const el = document.createElement('div');
                el.className = 'enemy-unit';
                el.dataset.index = i;
                const hpPct = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
                el.innerHTML = `
                    <div><strong>${enemy.name}</strong> ${enemy.hp <= 0 ? '💀' : ''}</div>
                    <div>HP: ${Math.max(0, enemy.hp)}/${enemy.maxHp}</div>
                    <div class="hp-bar"><div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:${hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336'}"></div></div>
                `;
                el.addEventListener('click', () => {
                    document.querySelectorAll('.enemy-unit').forEach(e => e.classList.remove('selected'));
                    if (enemy.hp > 0) el.classList.add('selected');
                });
                if (enemy.hp <= 0) el.classList.add('dead');
                eDiv.appendChild(el);
            });
            container.appendChild(eDiv);
        }
        
        // 获取玩家
        const player = combat.getPlayerUnit ? combat.getPlayerUnit() : null;
        if (player) {
            const pDiv = document.createElement('div');
            pDiv.className = 'player-container';
            const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
            pDiv.innerHTML = `
                <h4>🧙 ${player.name}</h4>
                <div>HP: ${Math.max(0, player.hp)}/${player.maxHp}</div>
                <div class="hp-bar"><div class="hp-fill" style="width:${Math.max(0, hpPct)}%;background:#2196F3"></div></div>
                <div style="font-size:12px;color:#aaa;margin-top:5px;">
                    ⚔️${player.attack || 0} 🛡️${player.defense || 0} 💨${player.speed || 0}
                </div>
            `;
            container.appendChild(pDiv);
        }
        
        // 渲染按钮
        this.renderButtons(combat);
    }

    renderButtons(combat) {
        const container = document.getElementById('action-buttons');
        if (!container) return;
        
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.flexWrap = 'wrap';
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
                player.defense = (player.defense || 0) + 5;
                document.getElementById('btn-defend').disabled = true;
                combat.playerAction('defend', null);
                setTimeout(() => { if (player) player.defense -= 5; }, 100);
            }
        });
        
        document.getElementById('btn-item').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            const player = combat.getPlayerUnit();
            if (player) {
                const heal = 20;
                player.hp = Math.min(player.maxHp, player.hp + heal);
                document.getElementById('btn-item').disabled = true;
                combat.playerAction('item', null);
                if (combat.combatLog) {
                    combat.combatLog.push(`${player.name} 使用道具，回复 ${heal} HP`);
                }
            }
        });
        
        this.enableButtons(combat.isPlayerTurn);
    }

    getTarget(combat) {
        const selected = document.querySelector('.enemy-unit.selected');
        if (selected) {
            const idx = parseInt(selected.dataset.index);
            const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
            if (enemies[idx] && enemies[idx].hp > 0) return enemies[idx];
        }
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        return enemies.find(e => e.hp > 0);
    }

    enableButtons(enabled) {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    updateCombat(combat, log) {
        // 更新敌人HP
        const enemies = combat.getEnemyUnits ? combat.getEnemyUnits() : [];
        const enemyEls = document.querySelectorAll('.enemy-unit');
        enemies.forEach((enemy, i) => {
            if (enemyEls[i]) {
                const hpPct = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
                const fill = enemyEls[i].querySelector('.hp-fill');
                const hpText = enemyEls[i].querySelector('div:nth-child(2)');
                if (fill) {
                    fill.style.width = Math.max(0, hpPct) + '%';
                    fill.style.background = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#f44336';
                }
                if (hpText) hpText.textContent = `HP: ${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
                if (enemy.hp <= 0) enemyEls[i].classList.add('dead');
            }
        });
        
        // 更新玩家HP
        const player = combat.getPlayerUnit ? combat.getPlayerUnit() : null;
        if (player) {
            const playerEl = document.querySelector('.player-container');
            if (playerEl) {
                const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
                const fill = playerEl.querySelector('.hp-fill');
                const hpText = playerEl.querySelector('div:nth-child(2)');
                if (fill) fill.style.width = Math.max(0, hpPct) + '%';
                if (hpText) hpText.textContent = `HP: ${Math.max(0, player.hp)}/${player.maxHp}`;
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

    renderScene(scene) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="scene-info">
                <h2>${scene.name || '未知'}</h2>
                <p>${scene.desc || scene.description || ''}</p>
                <span class="scene-type ${scene.type || 'safe'}">${scene.type === 'wild' ? '⚔️ 野外' : '🛡️ 安全区'}</span>
            </div>
        `;
        
        if (scene.exits && scene.exits.length > 0) {
            const exitDiv = document.createElement('div');
            exitDiv.className = 'scene-exits';
            exitDiv.innerHTML = '<strong>可前往:</strong> ';
            scene.exits.forEach(exit => {
                const btn = document.createElement('button');
                btn.className = 'exit-btn';
                btn.textContent = '→ ' + exit;
                btn.addEventListener('click', () => {
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.enterScene(exit);
                    }
                });
                exitDiv.appendChild(btn);
            });
            container.appendChild(exitDiv);
        }
    }

    // ========== 其他UI方法 ==========

    renderInventory(state) {
        // 简化版
        const container = this.container;
        if (!container) return;
        container.innerHTML = `
            <div class="inventory-frame">
                <h3>🎒 背包</h3>
                <p>背包功能开发中...</p>
                <button class="menu-btn" data-action="back">↩️ 返回</button>
            </div>
        `;
    }

    renderEquipment(state) {
        const container = this.container;
        if (!container) return;
        container.innerHTML = `
            <div class="equipment-frame">
                <h3>⚔️ 装备</h3>
                <p>装备功能开发中...</p>
                <button class="menu-btn" data-action="back">↩️ 返回</button>
            </div>
        `;
    }

    renderCompanions(state) {
        const container = this.container;
        if (!container) return;
        container.innerHTML = `
            <div class="companions-frame">
                <h3>👥 随从</h3>
                <p>随从功能开发中...</p>
                <button class="menu-btn" data-action="back">↩️ 返回</button>
            </div>
        `;
    }

    renderSaveMenu(state) {
        const container = this.container;
        if (!container) return;
        container.innerHTML = `
            <div class="save-frame">
                <h3>💾 存档</h3>
                <p>存档功能开发中...</p>
                <button class="menu-btn" data-action="back">↩️ 返回</button>
            </div>
        `;
    }

    renderCharacterCreation() {
        const container = this.container;
        if (!container) return;
        container.innerHTML = `
            <div class="creation-frame">
                <h1>🎭 创建角色</h1>
                <div class="creation-narrative">
                    <p>"很美好的一天，朝阳升起，你徐徐醒来。"</p>
                    <p>"你叫什么名字来着？"</p>
                </div>
                <div class="creation-form">
                    <input type="text" id="char-name" placeholder="输入你的名字" maxlength="12" value="勇者" />
                    <button class="start-btn" id="start-game">开始旅程</button>
                </div>
            </div>
        `;
    }

    showMessage(text, type = "info") {
        const popup = document.createElement("div");
        popup.className = `popup popup-${type}`;
        popup.innerHTML = `<p>${this.escapeHtml(text)}</p><button onclick="this.parentElement.remove()">确定</button>`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 4000);
    }

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
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出（如果需要）
try { module.exports = UIRenderer; } catch(e) {}
