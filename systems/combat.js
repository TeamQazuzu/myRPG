// systems/combat.js - 战斗引擎
class CombatEngine {
    constructor() {
        this.turnOrder = [];
        this.currentTurn = 0;
        this.maxTurns = 30;
        this.combatLog = [];
        this.isPlayerTurn = false;
        this.battleActive = false;
        this.actionTimeout = null;
        this.playerUnit = null;
        this.enemyUnits = [];
    }

    // 启动战斗
    startCombat(player, enemies) {
        console.log('[战斗] 启动战斗，敌人数量:', enemies.length);
        
        // 保存引用
        this.playerUnit = player;
        this.enemyUnits = enemies;
        this.battleActive = true;
        this.combatLog = [];
        this.currentTurn = 0;
        
        // 确保敌人有必需属性
        enemies.forEach((enemy, index) => {
            enemy.maxHp = enemy.maxHp || enemy.hp || 30;
            enemy.hp = enemy.hp || enemy.maxHp;
            enemy.speed = enemy.speed || 5;
            enemy.attack = enemy.attack || 5;
            enemy.defense = enemy.defense || 2;
            enemy.status = 'normal';
            console.log(`[战斗] 敌人${index+1}:`, enemy.name, 'HP:', enemy.hp, '速度:', enemy.speed);
        });
        
        // 确保玩家有必需属性
        player.maxHp = player.maxHp || player.hp || 100;
        player.hp = player.hp || player.maxHp;
        player.speed = player.speed || 10;
        
        // 计算行动顺序
        this.calculateTurnOrder();
        
        // 触发战斗开始事件（通知UI）
        const event = new CustomEvent('combat-start', {
            detail: { combat: this }
        });
        document.dispatchEvent(event);
        
        // 开始第一个回合
        this.processTurn();
    }

    // 计算行动顺序
    calculateTurnOrder() {
        const allUnits = [
            { unit: this.playerUnit, type: 'player' },
            ...this.enemyUnits.map(enemy => ({ unit: enemy, type: 'enemy' }))
        ];
        
        // 按速度降序排序
        this.turnOrder = allUnits.sort((a, b) => (b.unit.speed || 0) - (a.unit.speed || 0));
        
        console.log('[战斗] 行动顺序:', this.turnOrder.map(u => `${u.unit.name}(${u.unit.speed})`).join(' -> '));
    }

    // 处理回合
    processTurn() {
        if (!this.battleActive) {
            console.log('[战斗] 战斗已结束');
            return;
        }
        
        // 检查战斗是否结束
        if (this.checkBattleEnd()) {
            return;
        }
        
        const currentUnit = this.turnOrder[this.currentTurn];
        if (!currentUnit) {
            console.error('[战斗] 当前单位不存在');
            return;
        }
        
        console.log('[战斗] 当前回合:', currentUnit.unit.name, '类型:', currentUnit.type);
        
        // 检查单位是否存活
        if (currentUnit.unit.hp <= 0) {
            console.log('[战斗] 单位已死亡，跳过回合');
            this.nextTurn();
            return;
        }
        
        if (currentUnit.type === 'player') {
            this.isPlayerTurn = true;
            this.waitForPlayerAction();
        } else {
            this.isPlayerTurn = false;
            // 延迟执行敌人行动，让玩家看到
            setTimeout(() => {
                this.enemyTurn(currentUnit.unit);
            }, 500);
        }
    }

    // 等待玩家操作
    waitForPlayerAction() {
        console.log('[战斗] 等待玩家操作...');
        
        // 触发玩家回合事件（通知UI启用按钮）
        const event = new CustomEvent('combat-player-turn', {
            detail: { combat: this }
        });
        document.dispatchEvent(event);
        
        // 超时保护：10秒后自动攻击
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
        }
        this.actionTimeout = setTimeout(() => {
            console.warn('[战斗] 玩家操作超时，自动攻击');
            if (this.isPlayerTurn && this.battleActive) {
                const target = this.enemyUnits.find(e => e.hp > 0);
                if (target) {
                    this.playerAction('attack', target);
                }
            }
        }, 10000);
    }

    // 玩家行动
    playerAction(action, target) {
        if (!this.isPlayerTurn) {
            console.warn('[战斗] 不是玩家回合');
            return;
        }
        
        if (!this.battleActive) {
            console.warn('[战斗] 战斗已结束');
            return;
        }
        
        // 清除超时
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        console.log('[战斗] 玩家行动:', action, '目标:', target ? target.name : '无');
        
        if (!target || target.hp <= 0) {
            console.warn('[战斗] 目标无效或已死亡');
            // 自动选择第一个存活的敌人
            const aliveTarget = this.enemyUnits.find(e => e.hp > 0);
            if (aliveTarget) {
                console.log('[战斗] 自动选择目标:', aliveTarget.name);
                this.executeAction(this.playerUnit, action, aliveTarget);
            } else {
                console.warn('[战斗] 没有存活的敌人');
                this.nextTurn();
            }
        } else {
            this.executeAction(this.playerUnit, action, target);
        }
    }

    // 敌人回合
    enemyTurn(enemy) {
        console.log('[战斗] 敌人回合:', enemy.name, 'HP:', enemy.hp);
        
        if (!this.battleActive) {
            return;
        }
        
        if (enemy.hp <= 0) {
            console.log('[战斗] 敌人已死亡');
            this.nextTurn();
            return;
        }
        
        // AI决策
        const action = this.enemyAI(enemy);
        console.log('[战斗] 敌人行动:', action);
        
        // 选择目标（攻击玩家）
        if (this.playerUnit.hp > 0) {
            this.executeAction(enemy, action, this.playerUnit);
        } else {
            console.warn('[战斗] 玩家已死亡');
            this.nextTurn();
        }
    }

    // 敌人AI
    enemyAI(enemy) {
        const hpRatio = enemy.hp / enemy.maxHp;
        
        // 根据血量比例决定行为
        if (hpRatio < 0.2) {
            // 濒死：30%概率使用技能，70%攻击
            return Math.random() < 0.3 ? 'skill' : 'attack';
        } else if (hpRatio < 0.5) {
            // 半血：50%概率使用技能，50%攻击
            return Math.random() < 0.5 ? 'skill' : 'attack';
        } else {
            // 健康：70%攻击，30%技能
            return Math.random() < 0.7 ? 'attack' : 'skill';
        }
    }

    // 执行行动
    executeAction(unit, action, target) {
        console.log('[战斗] 执行行动:', unit.name, action, '->', target ? target.name : '无');
        
        if (!target || target.hp <= 0) {
            console.warn('[战斗] 目标无效');
            this.nextTurn();
            return;
        }
        
        let damage = 0;
        let logMessage = '';
        
        switch(action) {
            case 'attack':
                damage = this.calculateDamage(unit, target);
                target.hp = Math.max(0, target.hp - damage);
                logMessage = `${unit.name} 攻击 ${target.name}，造成 ${damage} 点伤害`;
                break;
            case 'skill':
                damage = this.calculateDamage(unit, target) * 1.5;
                target.hp = Math.max(0, target.hp - damage);
                logMessage = `${unit.name} 使用技能攻击 ${target.name}，造成 ${damage} 点伤害`;
                break;
            default:
                damage = this.calculateDamage(unit, target);
                target.hp = Math.max(0, target.hp - damage);
                logMessage = `${unit.name} 攻击 ${target.name}，造成 ${damage} 点伤害`;
        }
        
        // 记录日志
        this.combatLog.push(logMessage);
        console.log('[战斗]', logMessage);
        
        // 触发战斗更新事件
        const event = new CustomEvent('combat-update', {
            detail: { combat: this, log: logMessage }
        });
        document.dispatchEvent(event);
        
        // 检查战斗是否结束
        if (this.checkBattleEnd()) {
            return;
        }
        
        // 进入下一回合
        this.nextTurn();
    }

    // 计算伤害
    calculateDamage(attacker, defender) {
        const baseAttack = attacker.attack || 5;
        const baseDefense = defender.defense || 2;
        
        // 基础伤害 = 攻击 - 防御 * 0.5
        let damage = Math.max(1, baseAttack - baseDefense * 0.5);
        
        // 随机波动 ±20%
        const variance = 0.8 + Math.random() * 0.4;
        damage = Math.floor(damage * variance);
        
        return Math.max(1, damage);
    }

    // 下一回合
    nextTurn() {
        this.currentTurn++;
        if (this.currentTurn >= this.turnOrder.length) {
            this.currentTurn = 0;
            this.maxTurns--;
            
            if (this.maxTurns <= 0) {
                this.endCombat('timeout');
                return;
            }
        }
        
        // 检查战斗是否结束
        if (this.checkBattleEnd()) {
            return;
        }
        
        this.processTurn();
    }

    // 检查战斗结束
    checkBattleEnd() {
        const playerAlive = this.playerUnit && this.playerUnit.hp > 0;
        const enemiesAlive = this.enemyUnits.some(e => e.hp > 0);
        
        if (!playerAlive) {
            this.endCombat('player_defeat');
            return true;
        }
        if (!enemiesAlive) {
            this.endCombat('player_victory');
            return true;
        }
        return false;
    }

    // 结束战斗
    endCombat(result) {
        if (!this.battleActive) return;
        
        this.battleActive = false;
        this.isPlayerTurn = false;
        
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        let message = '';
        switch(result) {
            case 'player_victory':
                message = '🎉 战斗胜利！';
                console.log('[战斗] 玩家胜利');
                break;
            case 'player_defeat':
                message = '💀 战斗失败...';
                console.log('[战斗] 玩家失败');
                break;
            case 'timeout':
                message = '⏰ 战斗超时，平局！';
                console.log('[战斗] 战斗超时');
                break;
            default:
                message = '战斗结束';
        }
        
        this.combatLog.push(message);
        
        // 触发战斗结束事件
        const event = new CustomEvent('combat-end', {
            detail: { combat: this, result: result }
        });
        document.dispatchEvent(event);
    }

    // 获取玩家单位
    getPlayerUnit() {
        return this.playerUnit;
    }

    // 获取敌人单位
    getEnemyUnits() {
        return this.enemyUnits;
    }
}
