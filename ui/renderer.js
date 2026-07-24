// ui/renderer.js - UI渲染器
// 两种视图：冒险视图（帧）和战斗视图，互斥切换
class UIRenderer {
    constructor() {
        this.container = null;
        this.combatEngine = null;
        this.isCombatActive = false;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[UI] 容器 #' + containerId + ' 不存在');
            return false;
        }
        this.bindEvents();
        return true;
    }

    bindEvents() {
     }   // 场景变化 → 渲染冒险视图
        document.addEventListener('scene-change', (e) => {
            if (!this.isCombatActive) {
                this.renderAdventureView(e.detail.scene);
            }
        });

        // 场景内消息（采集结果、对话等）
        document.addEventListener('scene-message', (e) => {
            this.showSceneMessage(e.detail.message);
        });

        // 战斗开始
        document.addEventListener('combat-start', (e) => {
            this.isCombatActive = true;
            this.combatEngine = e.detail.combat;
            this.hideAdventureView();
            this.renderCombatView(this.combatEngine);
        });

        // 战斗更新
        document.addEventListener('combat-update', (e) => {
            this.updateCombatView(e.detail.combat, e.detail.log);
        });

        // 玩家回合
        document.addEventListener('combat-player-turn', () => {
            this.enableCombatButtons(true);
        });

        // 战斗结束
        document.addEventListener('combat-end', (e) => {
            this.showCombatResult(e.detail.result);
        });
    }

    // ================================================================
    //  冒险视图
    // ================================================================

    hideAdventureView() {
        const el = document.getElementById('scene-container');
        if (el) el.style.display = 'none';
    }

    showAdventureView() {
        const el = document.getElementById('scene-container');
        if (el) el.style.display = 'flex';
    }

    renderAdventureView(scene) {
        const el = document.getElementById('scene-container');
        if (!el) return;

        el.style.display = 'flex';
        el.innerHTML = '';

        // --- 1. 帧标题 ---
        const header = document.createElement('div');
        header.className = 'frame-header';
        header.innerHTML = `<span class="frame-name">${scene.name}</span>`;
        if (scene.type === 'safe') header.innerHTML += '<span class="frame-tag safe-tag">安全</span>';
        else if (scene.type === 'battle') header.innerHTML += '<span class="frame-tag danger-tag">危险</span>';
        else if (scene.type === 'gather') header.innerHTML += '<span class="frame-tag gather-tag">资源</span>';
        el.appendChild(header);

        // --- 2. 文字描述 ---
        const desc = document.createElement('div');
        desc.className = 'frame-desc';
        desc.textContent = scene.desc;
        el.appendChild(desc);

        // --- 3. 帧内行动 ---
        const actions = document.createElement('div');
        actions.className = 'frame-actions';

        // 战斗帧：显示"迎战"按钮
        if (scene.type === 'battle' && scene.enemies && scene.enemies.length > 0) {
            const cleared = scene.lastCleared &&
                (Date.now() - scene.lastCleared < (scene.respawnTime || 120000));
            if (cleared) {
                const remaining = Math.ceil(((scene.respawnTime || 120000) - (Date.now() - scene.lastCleared)) / 1000);
                actions.innerHTML = `<div class="action-hint">敌人已清空，${remaining}秒后刷新</div>`;
            } else {
                // 显示敌人概览
                const enemyCounts = {};
                scene.enemies.forEach(n => { enemyCounts[n] = (enemyCounts[n] || 0) + 1; });
                const overview = Object.entries(enemyCounts).map(([name, count]) => `${name}×${count}`).join('、');
                const btn = document.createElement('button');
                btn.className = 'frame-action-btn fight-btn';
                btn.textContent = `⚔️ 迎战（${overview}）`;
                btn.addEventListener('click', () => {
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.doAction('fight');
                    }
                });
                actions.appendChild(btn);
            }
        }

        // 采集帧：显示采集点
        if (scene.type === 'gather' && scene.gatherSpots) {
            scene.gatherSpots.forEach(spot => {
                const btn = document.createElement('button');
                btn.className = 'frame-action-btn gather-btn';
                btn.textContent = `${spot.icon} ${spot.name}`;
                btn.title = spot.desc;
                btn.addEventListener('click', () => {
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.doAction('gather', spot.id);
                    }
                });
                actions.appendChild(btn);
            });
        }

        // NPC对话
        if (scene.npcs && scene.npcs.length > 0) {
            scene.npcs.forEach(npcName => {
                const btn = document.createElement('button');
                btn.className = 'frame-action-btn talk-btn';
                btn.textContent = `💬 ${npcName}`;
                btn.addEventListener('click', () => {
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.doAction('talk', npcName);
                    }
                });
                actions.appendChild(btn);
            });
        }

        el.appendChild(actions);

        // --- 4. 场景内消息区（采集结果、对话等临时消息）---
        const msgArea = document.createElement('div');
        msgArea.className = 'frame-message';
        msgArea.id = 'frame-message';
        el.appendChild(msgArea);

        // --- 5. 出口（方向移动）---
        if (scene.exits && scene.exits.length > 0) {
            const exits = document.createElement('div');
            exits.className = 'frame-exits';
            const label = document.createElement('span');
            label.className = 'exits-label';
            label.textContent = '前往';
            exits.appendChild(label);

            scene.exits.forEach(exitName => {
                const btn = document.createElement('button');
                btn.className = 'exit-btn';
                btn.textContent = `→ ${exitName}`;
                btn.addEventListener('click', () => {
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.enterScene(exitName);
                    }
                });
                exits.appendChild(btn);
            });
            el.appendChild(exits);
        }
    }

    /** 在帧内显示临时消息（采集结果、对话等） */
    showSceneMessage(message) {
        const msgArea = document.getElementById('frame-message');
        if (!msgArea) return;
        msgArea.textContent = message;
        msgArea.style.opacity = '1';
        // 3秒后淡出
        setTimeout(() => { msgArea.style.opacity = '0'; }, 3000);
    }

    // ================================================================
    //  战斗视图
    // ================================================================

    renderCombatView(combat) {
        // 隐藏冒险视图
        this.hideAdventureView();

        const container = document.getElementById('combat-container');
        if (!container) return;
        container.style.display = 'flex';
        container.innerHTML = '';

        // 回合标题
        const header = document.createElement('div');
        header.className = 'combat-header';
        header.innerHTML = `
            <span class="combat-title">⚔️ 战斗</span>
            <span class="combat-turn" id="turn-display">第 ${combat.roundNumber} 轮 / ${combat.maxRounds}</span>
        `;
        container.appendChild(header);

        // 敌方
        const enemySection = document.createElement('div');
        enemySection.className = 'combat-section enemy-section';
        enemySection.innerHTML = '<div class="section-label enemy-label">敌方</div>';
        const enemyGrid = document.createElement('div');
        enemyGrid.className = 'unit-grid enemy-grid';

        combat.getEnemyUnits().forEach((enemy, i) => {
            const card = this.createUnitCard(enemy, 'enemy', i);
            enemyGrid.appendChild(card);
        });
        enemySection.appendChild(enemyGrid);
        container.appendChild(enemySection);

        // 分隔
        const vs = document.createElement('div');
        vs.className = 'vs-divider';
        vs.textContent = 'VS';
        container.appendChild(vs);

        // 己方（主角+随从）
        const allySection = document.createElement('div');
        allySection.className = 'combat-section ally-section';
        allySection.innerHTML = '<div class="section-label ally-label">我方</div>';
        const allyGrid = document.createElement('div');
        allyGrid.className = 'unit-grid ally-grid';

        combat.getAllyUnits().forEach((ally, i) => {
            const card = this.createUnitCard(ally, 'ally', i);
            allyGrid.appendChild(card);
        });
        allySection.appendChild(allyGrid);
        container.appendChild(allySection);

        // 战斗日志
        const logEl = document.getElementById('combat-log');
        if (logEl) {
            logEl.style.display = 'block';
            logEl.innerHTML = '<div class="log-container" id="log-container"></div>';
            this.renderCombatLog(combat.combatLog);
        }

        // 行动按钮
        this.renderCombatButtons(combat);
    }

    createUnitCard(unit, side, index) {
        const card = document.createElement('div');
        const isAlly = side === 'ally';
        card.className = `unit-card ${isAlly ? 'ally-card' : 'enemy-card'}`;
        if (side === 'enemy') card.dataset.index = index;

        const hp = Math.max(0, unit.hp || 0);
        const maxHp = unit.maxHp || 100;
        const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
        const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FF9800' : '#f44336';
        const isDead = hp <= 0;

        if (isDead) card.classList.add('dead');

        card.innerHTML = `
            <div class="unit-header">
                <span class="unit-side-dot ${isAlly ? 'dot-ally' : 'dot-enemy'}"></span>
                <span class="unit-name">${unit.name}</span>
                ${isDead ? '<span class="unit-dead">💀</span>' : ''}
            </div>
            <div class="unit-hp-bar">
                <div class="hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>
            </div>
            <div class="unit-hp-text">${hp} / ${maxHp}</div>
        `;

        // 敌方卡片点击选中
        if (side === 'enemy' && !isDead) {
            card.addEventListener('click', () => {
                document.querySelectorAll('.enemy-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                if (this.combatEngine) {
                    this.combatEngine.setSelectedEnemy(index);
                }
            });
        }

        return card;
    }

    renderCombatButtons(combat) {
        const btnContainer = document.getElementById('action-buttons');
        if (!btnContainer) return;
        btnContainer.style.display = 'flex';
        btnContainer.innerHTML = `
            <button class="combat-btn" id="btn-attack">⚔️ 攻击</button>
            <button class="combat-btn" id="btn-skill">✨ 技能</button>
            <button class="combat-btn" id="btn-defend">🛡️ 防御</button>
            <button class="combat-btn" id="btn-item">🎒 道具</button>
            <button class="combat-btn" id="btn-flee">🏃 撤退</button>
        `;

        document.getElementById('btn-attack').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            this.enableCombatButtons(false);
            combat.playerAction('attack', combat.getSelectedTarget());
        });
        document.getElementById('btn-skill').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            this.enableCombatButtons(false);
            combat.playerAction('skill', combat.getSelectedTarget());
        });
        document.getElementById('btn-defend').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            this.enableCombatButtons(false);
            combat.playerAction('defend', null);
        });
        document.getElementById('btn-item').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            this.enableCombatButtons(false);
            // 简单版：回复20HP
            const player = combat.getPlayerUnit();
            if (player) {
                player.hp = Math.min(player.maxHp, player.hp + 20);
            }
            combat.playerAction('item', null);
        });
        document.getElementById('btn-flee').addEventListener('click', () => {
            if (!combat.isPlayerTurn) return;
            this.enableCombatButtons(false);
            combat.playerAction('flee', null);
        });

        this.enableCombatButtons(combat.isPlayerTurn);
    }

    enableCombatButtons(enabled) {
        document.querySelectorAll('.combat-btn').forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    updateCombatView(combat, newLog) {
        if (!combat) return;

        // 更新轮次显示
        const turnEl = document.getElementById('turn-display');
        if (turnEl) turnEl.textContent = `第 ${combat.roundNumber} 轮 / ${combat.maxRounds}`;

        // 更新敌方单位卡
        const enemyCards = document.querySelectorAll('.enemy-card');
        combat.getEnemyUnits().forEach((enemy, i) => {
            if (!enemyCards[i]) return;
            const hp = Math.max(0, enemy.hp || 0);
            const maxHp = enemy.maxHp || 100;
            const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
            const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FF9800' : '#f44336';

            const fill = enemyCards[i].querySelector('.hp-fill');
            const text = enemyCards[i].querySelector('.unit-hp-text');
            const dead = enemyCards[i].querySelector('.unit-dead');

            if (fill) { fill.style.width = hpPct + '%'; fill.style.background = hpColor; }
            if (text) text.textContent = `${hp} / ${maxHp}`;
            if (hp <= 0) {
                enemyCards[i].classList.add('dead');
                if (!dead) {
                    const nameEl = enemyCards[i].querySelector('.unit-header');
                    if (nameEl) nameEl.innerHTML += '<span class="unit-dead">💀</span>';
                }
            }
        });

        // 更新己方单位卡
        const allyCards = document.querySelectorAll('.ally-card');
        combat.getAllyUnits().forEach((ally, i) => {
            if (!allyCards[i]) return;
            const hp = Math.max(0, ally.hp || 0);
            const maxHp = ally.maxHp || 100;
            const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
            const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FF9800' : '#f44336';

            const fill = allyCards[i].querySelector('.hp-fill');
            const text = allyCards[i].querySelector('.unit-hp-text');

            if (fill) { fill.style.width = hpPct + '%'; fill.style.background = hpColor; }
            if (text) text.textContent = `${hp} / ${maxHp}`;
            if (hp <= 0) {
                allyCards[i].classList.add('dead');
            }
        });

        // 追加日志
        if (newLog) {
            this.appendLog(newLog);
        }

        this.enableCombatButtons(combat.isPlayerTurn);
    }

    renderCombatLog(logs) {
        const container = document.getElementById('log-container');
        if (!container) return;
        container.innerHTML = '';
        // 只显示最近6条
        const recent = logs.slice(-6);
        recent.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            container.appendChild(p);
        });
        container.scrollTop = container.scrollHeight;
    }

    appendLog(msg) {
        const container = document.getElementById('log-container');
        if (!container) return;
        const p = document.createElement('p');
        p.textContent = msg;
        container.appendChild(p);
        // 保持最多8条
        while (container.children.length > 8) {
            container.removeChild(container.firstChild);
        }
        container.scrollTop = container.scrollHeight;
    }

    showCombatResult(result) {
        const resultEl = document.getElementById('combat-result');
        if (!resultEl) return;

        const config = {
            player_victory: { text: '战斗胜利！', bg: '#1b5e20', color: '#a5d6a7' },
            player_defeat:  { text: '战斗失败...', bg: '#b71c1c', color: '#ef9a9a' },
            timeout:        { text: '回合耗尽，平局。', bg: '#e65100', color: '#ffcc80' },
            flee:           { text: '成功撤退。', bg: '#1a237e', color: '#90caf9' },
        };
        const c = config[result] || { text: '战斗结束', bg: '#333', color: '#ccc' };
        resultEl.textContent = c.text;
        resultEl.style.display = 'block';
        resultEl.style.background = c.bg;
        resultEl.style.color = c.color;

        // 延迟后返回冒险视图
        setTimeout(() => {
            resultEl.style.display = 'none';
            this.hideCombatView();
            this.isCombatActive = false;
            this.showAdventureView();
            // 重新渲染当前场景（可能敌人已清空）
            if (window.gameApp && window.gameApp.sceneManager) {
                const scene = window.gameApp.sceneManager.getCurrentScene();
                if (scene) this.renderAdventureView(scene);
            }
        }, result === 'player_victory' ? 2500 : 2000);
    }

    hideCombatView() {
        const c = document.getElementById('combat-container');
        const l = document.getElementById('combat-log');
        const b = document.getElementById('action-buttons');
        if (c) { c.style.display = 'none'; c.innerHTML = ''; }
        if (l) { l.style.display = 'none'; l.innerHTML = ''; }
        if (b) { b.style.display = 'none'; b.innerHTML = ''; }
    }

    // ================================================================
    //  顶部玩家信息栏
    // ================================================================

    updatePlayerInfo(player) {
        const el = document.getElementById('player-info');
        if (!el || !player) return;

        const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
        const mpPct = player.maxMp > 0 ? Math.round((player.mp / player.maxMp) * 100) : 0;
        const hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FF9800' : '#f44336';

        el.innerHTML = `
            <div class="info-bar">
                <div class="info-left">
                    <span class="info-name">${player.name}</span>
                    <span class="info-level">Lv.${player.level}</span>
                    <span class="info-class">${player.class || ''}</span>
                </div>
                <div class="info-right">
                    <span class="info-gold">💰${player.gold}</span>
                </div>
            </div>
            <div class="info-bars">
                <div class="info-bar-row">
                    <span class="bar-label">HP</span>
                    <div class="info-hp-bar"><div class="hp-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
                    <span class="bar-value">${player.hp}/${player.maxHp}</span>
                </div>
                <div class="info-bar-row">
                    <span class="bar-label">MP</span>
                    <div class="info-mp-bar"><div class="mp-fill" style="width:${mpPct}%"></div></div>
                    <span class="bar-value">${player.mp}/${player.maxMp}</span>
                </div>
            </div>
        `;
    }

    // ================================================================
    //  底部管理栏
    // ================================================================

    renderBottomBar() {
        const el = document.getElementById('bottom-bar');
        if (!el) return;
        el.innerHTML = `
            <button class="bottom-btn" id="btn-inventory">🎒 背包</button>
            <button class="bottom-btn" id="btn-equipment">⚔️ 装备</button>
            <button class="bottom-btn" id="btn-party">👥 队伍</button>
            <button class="bottom-btn" id="btn-save">💾 存档</button>
            <button class="bottom-btn" id="btn-settings">⚙️ 设置</button>
        `;

        document.getElementById('btn-save').addEventListener('click', () => {
            if (window.gameApp) {
                window.gameApp.saveGame();
                this.showFrameMessage('💾 存档成功。');
            }
        });
        document.getElementById('btn-inventory').addEventListener('click', () => {
            this.showFrameMessage('🎒 背包系统开发中...');
        });
        document.getElementById('btn-equipment').addEventListener('click', () => {
            this.showFrameMessage('⚔️ 装备系统开发中...');
        });
        document.getElementById('btn-party').addEventListener('click', () => {
            this.showFrameMessage('👥 队伍管理开发中...');
        });
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.showFrameMessage('⚙️ 设置系统开发中...');
        });
    }

    showFrameMessage(msg) {
        const evt = new CustomEvent('scene-message', { detail: { message: msg } });
        document.dispatchEvent(evt);
    }
}

// 导出
try { module.exports = UIRenderer; } catch(e) {}