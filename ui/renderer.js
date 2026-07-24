// ui/renderer.js - UI渲染系统
class UIRenderer {
    constructor() {
        this.combatEngine = null;
        this.isRendering = false;
        this.bindEvents();
    }

    // 绑定全局事件
    bindEvents() {
        // 战斗开始
        document.addEventListener('combat-start', (e) => {
            console.log('[UI] 战斗开始事件触发');
            this.combatEngine = e.detail.combat;
            this.renderCombat(this.combatEngine);
            this.showCombatUI(true);
        });

        // 战斗更新
        document.addEventListener('combat-update', (e) => {
            console.log('[UI] 战斗更新事件触发');
            this.updateCombat(e.detail.combat, e.detail.log);
        });

        // 战斗结束
        document.addEventListener('combat-end', (e) => {
            console.log('[UI] 战斗结束事件触发');
            this.showCombatResult(e.detail.result);
            setTimeout(() => {
                this.showCombatUI(false);
            }, 3000);
        });

        // 玩家回合
        document.addEventListener('combat-player-turn', (e) => {
            console.log('[UI] 玩家回合事件触发');
            this.enableActionButtons(true);
        });

        // 场景变化
        document.addEventListener('scene-change', (e) => {
            console.log('[UI] 场景变化事件触发');
            this.renderScene(e.detail.scene);
        });
    }

    // 渲染场景
    renderScene(scene) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="scene-info">
                <h2>${scene.name || '未知区域'}</h2>
                <p>${scene.description || ''}</p>
                <div class="scene-type">${scene.type === 'safe' ? '🛡️ 安全区' : '⚔️ 野外'}</div>
            </div>
        `;
        
        // 显示出口
        if (scene.exits && scene.exits.length > 0) {
            const exitsHtml = scene.exits.map(exit => 
                `<button class="exit-btn" data-scene="${exit}">→ ${exit}</button>`
            ).join('');
            container.innerHTML += `
                <div class="scene-exits">
                    <h3>可前往:</h3>
                    ${exitsHtml}
                </div>
            `;
            
            // 绑定出口事件
            container.querySelectorAll('.exit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sceneName = btn.dataset.scene;
                    if (window.gameApp && window.gameApp.sceneManager) {
                        window.gameApp.sceneManager.enterScene(sceneName);
                    }
                });
            });
        }
    }

    // 显示/隐藏战斗UI
    showCombatUI(show) {
        const container = document.getElementById('combat-container');
        const buttonContainer = document.getElementById('action-buttons');
        
        if (container) {
            container.style.display = show ? 'block' : 'none';
        }
        if (buttonContainer) {
            buttonContainer.style.display = show ? 'block' : 'none';
        }
    }

    // 渲染战斗界面
    renderCombat(combatEngine) {
        console.log('[UI] 渲染战斗界面');
        
        if (!combatEngine) {
            console.error('[UI] 战斗引擎为空');
            return;
        }

        const container = document.getElementById('combat-container');
        if (!container) {
            console.error('[UI] 找不到战斗容器');
            return;
        }

        // 清空容器
        container.innerHTML = '';
        
        // 获取敌人
        const enemies = combatEngine.getEnemyUnits() || [];
        console.log('[UI] 渲染敌人数量:', enemies.length);
        
        // 渲染敌人
        if (enemies.length > 0) {
            const enemyContainer = document.createElement('div');
            enemyContainer.className = 'enemy-container';
            enemyContainer.innerHTML = '<h3>敌人</h3>';
            
            enemies.forEach((enemy, index) => {
                const enemyEl = this.createEnemyElement(enemy, index);
                enemyContainer.appendChild(enemyEl);
            });
            
            container.appendChild(enemyContainer);
        }

        // 渲染玩家
        const player = combatEngine.getPlayerUnit();
        if (player) {
            const playerContainer = document.createElement('div');
            playerContainer.className = 'player-container';
            playerContainer.innerHTML = '<h3>玩家</h3>';
            const playerEl = this.createPlayerElement(player);
            playerContainer.appendChild(playerEl);
            container.appendChild(playerContainer);
        }

        // 渲染战斗日志
        this.renderCombatLog(combatEngine.combatLog || []);
        
        // 渲染行动按钮
        this.renderActionButtons(combatEngine);
    }

    // 创建敌人元素
    createEnemyElement(enemy, index) {
        const div = document.createElement('div');
        div.className = 'enemy-unit';
        div.dataset.index = index;
        
        const hpPercent = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
        const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#FF9800' : '#f44336';
        
        div.innerHTML = `
            <div class="enemy-name">🐺 ${enemy.name || '未知敌人'}</div>
            <div class="enemy-hp">
                <span class="hp-text">HP: ${Math.max(0, enemy.hp || 0)}/${enemy.maxHp || 0}</span>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${Math.max(0, hpPercent)}%; background: ${hpColor};"></div>
                </div>
            </div>
            <div class="enemy-status">状态: ${enemy.status || '正常'}</div>
        `;
        
        // 点击选中
        div.addEventListener('click', () => {
            document.querySelectorAll('.enemy-unit').forEach(el => {
                el.classList.remove('selected');
            });
            div.classList.add('selected');
            console.log('[UI] 选中敌人:', enemy.name);
        });
        
        // 如果敌人已死亡，添加样式
        if (enemy.hp <= 0) {
            div.classList.add('dead');
            div.innerHTML += '<div class="dead-label">💀 已死亡</div>';
        }
        
        return div;
    }

    // 创建玩家元素
    createPlayerElement(player) {
        const div = document.createElement('div');
        div.className = 'player-unit';
        
        const hpPercent = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
        
        div.innerHTML = `
            <div class="player-name">🧙 ${player.name || '勇者'}</div>
            <div class="player-hp">
                <span class="hp-text">HP: ${Math.max(0, player.hp || 0)}/${player.maxHp || 0}</span>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${Math.max(0, hpPercent)}%; background: #2196F3;"></div>
                </div>
            </div>
            <div class="player-stats">
                <span>攻击: ${player.attack || 0}</span>
                <span>防御: ${player.defense || 0}</span>
                <span>速度: ${player.speed || 0}</span>
            </div>
        `;
        
        return div;
    }

    // 渲染战斗日志
    renderCombatLog(logs) {
        const container = document.getElementById('combat-log');
        if (!container) return;
        
        container.innerHTML = '<h4>战斗日志</h4>';
        const logContainer = document.createElement('div');
        logContainer.className = 'log-container';
        
        // 显示最近10条日志
        const recentLogs = logs.slice(-10);
        recentLogs.forEach(log => {
            const p = document.createElement('p');
            p.textContent = log;
            logContainer.appendChild(p);
        });
        
        container.appendChild(logContainer);
        
        // 滚动到底部
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // 更新战斗
    updateCombat(combatEngine, log) {
        console.log('[UI] 更新战斗界面');
        
        if (!combatEngine) return;
        
        // 更新敌人
        const enemies = combatEngine.getEnemyUnits() || [];
        const enemyElements = document.querySelectorAll('.enemy-unit');
        enemies.forEach((enemy, index) => {
            if (enemyElements[index]) {
                const hpPercent = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
                const hpFill = enemyElements[index].querySelector('.hp-fill');
                const hpText = enemyElements[index].querySelector('.hp-text');
                
                if (hpFill) {
                    hpFill.style.width = Math.max(0, hpPercent) + '%';
                    hpFill.style.background = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#FF9800' : '#f44336';
                }
                if (hpText) {
                    hpText.textContent = `HP: ${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
                }
                
                if (enemy.hp <= 0) {
                    enemyElements[index].classList.add('dead');
                }
            }
        });
        
        // 更新玩家
        const player = combatEngine.getPlayerUnit();
        if (player) {
            const playerElement = document.querySelector('.player-unit');
            if (playerElement) {
                const hpFill = playerElement.querySelector('.hp-fill');
                const hpText = playerElement.querySelector('.hp-text');
                const hpPercent = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
                
                if (hpFill) {
                    hpFill.style.width = Math.max(0, hpPercent) + '%';
                }
                if (hpText) {
                    hpText.textContent = `HP: ${Math.max(0, player.hp)}/${player.maxHp}`;
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
        this.enableActionButtons(combatEngine.isPlayerTurn);
    }

    // 渲染行动按钮
    renderActionButtons(combatEngine) {
        const container = document.getElementById('action-buttons');
        if (!container) return;
        
        container.innerHTML = `
            <button id="attack-btn" class="action-btn" disabled>⚔️ 攻击</button>
            <button id="skill-btn" class="action-btn" disabled>✨ 技能</button>
            <button id="defend-btn" class="action-btn" disabled>🛡️ 防御</button>
            <button id="item-btn" class="action-btn" disabled>🎒 道具</button>
        `;

        // 攻击按钮
        const attackBtn = document.getElementById('attack-btn');
        if (attackBtn) {
            attackBtn.addEventListener('click', () => {
                if (!combatEngine.isPlayerTurn) {
                    console.warn('[UI] 不是玩家回合');
                    return;
                }
                
                // 获取选中的敌人
                const selected = document.querySelector('.enemy-unit.selected');
                let target = null;
                
                if (selected) {
                    const index = parseInt(selected.dataset.index);
                    const enemies = combatEngine.getEnemyUnits();
                    if (enemies[index] && enemies[index].hp > 0) {
                        target = enemies[index];
                    }
                }
                
                // 如果没有选中，自动选择第一个存活的敌人
                if (!target) {
                    const enemies = combatEngine.getEnemyUnits();
                    target = enemies.find(e => e.hp > 0);
                    if (target) {
                        // 高亮第一个敌人
                        const firstEl = document.querySelector('.enemy-unit');
                        if (firstEl) {
                            document.querySelectorAll('.enemy-unit').forEach(el => el.classList.remove('selected'));
                            firstEl.classList.add('selected');
                        }
                    }
                }
                
                if (target) {
                    attackBtn.disabled = true;
                    combatEngine.playerAction('attack', target);
                } else {
                    console.warn('[UI] 没有可攻击的敌人');
                }
            });
        }

        // 技能按钮（简单实现）
        const skillBtn = document.getElementById('skill-btn');
        if (skillBtn) {
            skillBtn.addEventListener('click', () => {
                if (!combatEngine.isPlayerTurn) return;
                
                const target = this.getTargetEnemy(combatEngine);
                if (target) {
                    skillBtn.disabled = true;
                    combatEngine.playerAction('skill', target);
                }
            });
        }

        // 防御按钮
        const defendBtn = document.getElementById('defend-btn');
        if (defendBtn) {
            defendBtn.addEventListener('click', () => {
                if (!combatEngine.isPlayerTurn) return;
                defendBtn.disabled = true;
                // 防御：增加防御力一回合
                const player = combatEngine.getPlayerUnit();
                if (player) {
                    player.defense = (player.defense || 0) + 5;
                    combatEngine.playerAction('defend', null);
                    // 下回合恢复
                    setTimeout(() => {
                        if (player) {
                            player.defense = (player.defense || 0) - 5;
                        }
                    }, 100);
                }
            });
        }

        // 道具按钮
        const itemBtn = document.getElementById('item-btn');
        if (itemBtn) {
            itemBtn.addEventListener('click', () => {
                if (!combatEngine.isPlayerTurn) return;
                itemBtn.disabled = true;
                // 简单回复
                const player = combatEngine.getPlayerUnit();
                if (player) {
                    const heal = 20;
                    player.hp = Math.min(player.maxHp, player.hp + heal);
                    combatEngine.playerAction('item', null);
                    combatEngine.combatLog.push(`${player.name} 使用道具，回复 ${heal} HP`);
                }
            });
        }
    }

    // 获取目标敌人
    getTargetEnemy(combatEngine) {
        const selected = document.querySelector('.enemy-unit.selected');
        if (selected) {
            const index = parseInt(selected.dataset.index);
            const enemies = combatEngine.getEnemyUnits();
            if (enemies[index] && enemies[index].hp > 0) {
                return enemies[index];
            }
        }
        const enemies = combatEngine.getEnemyUnits();
        return enemies.find(e => e.hp > 0);
    }

    // 启用/禁用行动按钮
    enableActionButtons(enabled) {
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    // 显示战斗结果
    showCombatResult(result) {
        const container = document.getElementById('combat-result');
        if (!container) return;
        
        let message = '';
        let className = '';
        
        switch(result) {
            case 'player_victory':
                message = '🎉 战斗胜利！';
                className = 'victory';
                break;
            case 'player_defeat':
                message = '💀 战斗失败...';
                className = 'defeat';
                break;
            case 'timeout':
                message = '⏰ 战斗超时，平局！';
                className = 'timeout';
                break;
            default:
                message = '战斗结束';
                className = 'normal';
        }
        
        container.textContent = message;
        container.className = 'combat-result ' + className;
        container.style.display = 'block';
        
        setTimeout(() => {
            container.style.display = 'none';
        }, 3000);
    }
}
