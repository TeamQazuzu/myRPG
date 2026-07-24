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
        // 确保所有容器都存在
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
                if (containers[id]) {
                    div.innerHTML = containers[id];
                }
                this.container.appendChild(div);
            }
        });
        
        // 初始隐藏战斗相关容器
        document.getElementById('combat-container').style.display = 'none';
        document.getElementById('action-buttons').style.display = 'none';
        document.getElementById('combat-result').style.display = 'none';
    }

    bindEvents() {
        document.addEventListener('combat-start', (e) => {
            this.isCombatActive = true;
            this.combatEngine = e.detail.combat;
            // 隐藏场景，显示战斗
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
                // 战斗结束后显示场景
                document.getElementById('scene-container').style.display = 'block';
            }, 3000);
        });

        document.addEventListener('combat-player-turn', (e) => {
            this.enableButtons(true);
        });

        document.addEventListener('scene-change', (e) => {
            // 如果战斗没有进行，才渲染场景
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

    // ========== 场景渲染 ==========

    renderScene(scene) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        
        // 显示场景容器
        container.style.display = 'block';
        
        // 判断场景类型
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
        
        // 显示出口（可前往的地方）
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
        
        // 绑定出口按钮事件
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
        
        // ---- 敌人 ----
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
                
                // 点击选中
                el.addEventListener('click', () => {
                    document.querySelectorAll('.enemy-unit').forEach(e => e.classList.remove('selected'));
                    if (hp > 0) el.classList.add('selected');
                });
                
                if (hp <= 0) el.classList.add('dead');
                eDiv.appendChild(el);
            });
            container.appendChild(eDiv);
        }
        
        // ---- 我方 ----
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
        
        // ---- 战斗日志 ----
        this.renderLog(combat.combatLog || []);
        
        // ---- 行动按钮 ----
        this.renderButtons(combat);
    }

    renderLog(logs) {
        const container = document.getElementById('combat-log');
        if (!container) return;
        
        container.style.display = 'block';
        const logContainer = container.querySelector('.log-container') || container;
        
        // 清空旧日志，保留标题
        if (logContainer.tagName === 'DIV') {
            logContainer.innerHTML = '';
        }
        
        const recent = logs.slice(-8);
        recent.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            logContainer.appendChild(p);
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
            const player = combat.getPlayerUnit();
            if (player) {
                player.defense = (player.defense || 0) + 5;
                document.getElementById('btn-defend').disabled = true;
                combat.playerAction('defend', null);
                setTimeout(() => { if (player) player.defense = Math.max(0, (player.defense || 0) - 5); }, 100);
            }
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
                if (hpFill) {
                    hpFill.style.width = Math.max(0, hpPct) + '%';
                }
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
        
        // 更新按钮状态
        this.enableButtons(combat.isPlayerTurn);
        
        // 更新回合数
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
        
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }

    // ========== 其他UI ==========

    renderInventory(state) {
        const container = this.container;
        if (!container) return;
        document.getElementById('scene-container').style.display = 'none';
        container.innerHTML += `
            <div class="inventory-frame">
                <h3>🎒 背包</h3>
                <p>背包功能开发中...</p>
                <button class="menu-btn" onclick="document.querySelector('.inventory-frame').remove();document.getElementById('scene-container').style.display='block'">↩️ 返回</button>
            </div>
        `;
    }

    renderEquipment(state) {
        const container = this.container;
        if (!container) return;
        document.getElementById('scene-container').style.display = 'none';
        container.innerHTML += `
            <div class="equipment-frame">
                <h3>⚔️ 装备</h3>
                <p>装备功能开发中...</p>
                <button class="menu-btn" onclick="document.querySelector('.equipment-frame').remove();document.getElementById('scene-container').style.display='block'">↩️ 返回</button>
            </div>
        `;
    }

    renderCompanions(state) {
        const container = this.container;
        if (!container) return;
        document.getElementById('scene-container').style.display = 'none';
        container.innerHTML += `
            <div class="companions-frame">
                <h3>👥 随从</h3>
                <p>随从功能开发中...</p>
                <button class="menu-btn" onclick="document.querySelector('.companions-frame').remove();document.getElementById('scene-container').style.display='block'">↩️ 返回</button>
            </div>
        `;
    }

    renderSaveMenu(state) {
        const container = this.container;
        if (!container) return;
        document.getElementById('scene-container').style.display = 'none';
        container.innerHTML += `
            <div class="save-frame">
                <h3>💾 存档</h3>
                <p>存档功能开发中...</p>
                <button class="menu-btn" onclick="document.querySelector('.save-frame').remove();document.getElementById('scene-container').style.display='block'">↩️ 返回</button>
            </div>
        `;
    }

    renderCharacterCreation() {
        const container = document.getElementById('scene-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="character-creation">
                <h2>🎭 创建角色</h2>
                <div class="creation-narrative">
                    <p>"很美好的一天，朝阳升起，你徐徐醒来。"</p>
                    <p>"你叫什么名字来着？"</p>
                </div>
                <div class="creation-form">
                    <input type="text" id="char-name" placeholder="输入你的名字" maxlength="12" value="勇者" />
                    <button class="start-btn" id="start-game">开始冒险</button>
                </div>
            </div>
        `;
        
        document.getElementById('start-game').addEventListener('click', () => {
            const name = document.getElementById('char-name').value || '勇者';
            if (window.gameApp) {
                window.gameApp.player = {
                    name: name,
                    hp: 100,
                    maxHp: 100,
                    attack: 12,
                    defense: 5,
                    speed: 10,
                    level: 1,
                    exp: 0,
                    gold: 50
                };
                window.gameApp.savePlayer();
                window.gameApp.startGame();
            }
        });
    }

    showMessage(text, type = "info") {
        const popup = document.createElement("div");
        popup.className = `popup popup-${type}`;
        popup.innerHTML = `<p>${text}</p><button onclick="this.parentElement.remove()">确定</button>`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 4000);
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出
try { module.exports = UIRenderer; } catch(e) {}
