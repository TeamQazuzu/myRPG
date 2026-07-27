// systems/scene.js - 场景管理器（重构版）
// 依赖：DATA（core/data.js）、CombatEngine、StateUtils、Utils、InventorySystem
class SceneManager {
    constructor() {
        this.currentScene = null;
        this.currentCombat = null;
        this.combatContext = null; // { type, sceneId, stageIndex }
        this._boundCombatEnd = this._onCombatEnd.bind(this);
        document.addEventListener('combat-end', this._boundCombatEnd);
    }

    // ========== 场景查询 ==========
    _getScenes() {
        return (typeof DATA !== 'undefined' && DATA.scenes) ? DATA.scenes : {};
    }

    _getScene(key) {
        const scenes = this._getScenes();
        if (scenes[key]) return scenes[key];
        // 支持通过中文名称查找（兼容旧入口）
        for (const id in scenes) {
            if (scenes[id].name === key) return scenes[id];
        }
        return null;
    }

    // ========== 进入场景 ==========
    enterScene(sceneIdOrName) {
        console.log('[场景] 进入:', sceneIdOrName);
        const scene = this._getScene(sceneIdOrName);
        if (!scene) {
            console.error('[场景] 场景不存在:', sceneIdOrName);
            return;
        }
        this.currentScene = scene;

        // 清除之前可能残留的动态按钮
        this._clearDynamicUI();

        const event = new CustomEvent('scene-change', { detail: { scene: scene } });
        document.dispatchEvent(event);

        // 根据场景类型处理交互
        if (scene.type === 'wild' && scene.enemies && scene.enemies.length > 0) {
            if (scene.autoCombat) {
                console.log('[场景] 野外场景，自动触发战斗，敌人:', scene.enemies.join(', '));
                this.triggerBattle(scene.enemies, { type: scene.type, sceneId: scene.id });
            } else if (scene.allowExplore) {
                this._showEncounterButton('迎战', () => {
                    this.triggerBattle(scene.enemies, { type: scene.type, sceneId: scene.id });
                });
            }
        } else if (scene.type === 'boss' && scene.enemies && scene.enemies.length > 0) {
            this._showEncounterButton('挑战', () => {
                this.triggerBattle(scene.enemies, { type: scene.type, sceneId: scene.id });
            });
        } else if (scene.type === 'dungeon') {
            this._handleDungeonEntry(scene);
        }
    }

    // ========== 动态 UI 辅助 ==========
    _clearDynamicUI() {
        const container = document.getElementById('scene-container');
        if (!container) return;
        container.querySelectorAll('.scene-action-btn, .dungeon-panel').forEach(el => el.remove());
    }

    _showEncounterButton(label, onClick) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        const btn = document.createElement('button');
        btn.className = 'scene-action-btn';
        btn.textContent = label;
        btn.style.cssText = 'margin-top:12px;padding:10px 20px;font-size:16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;width:100%;';
        btn.addEventListener('click', () => {
            btn.remove();
            onClick();
        });
        container.appendChild(btn);
    }

    // ========== 地下城逻辑 ==========
    _handleDungeonEntry(scene) {
        const state = window.gameApp ? window.gameApp.state : null;
        const progress = state && state.world && state.world.dungeonProgress
            ? state.world.dungeonProgress[scene.id]
            : null;
        let currentStage = 0;
        if (progress) currentStage = progress.currentStage || 0;

        const stages = DATA.dungeonStages && DATA.dungeonStages[scene.id]
            ? DATA.dungeonStages[scene.id]
            : [];

        if (currentStage >= stages.length) {
            this._showDungeonPanel(scene, '已通关', '该地下城所有层数均已攻略完毕。', true);
            return;
        }

        const stage = stages[currentStage];
        const desc = stage.desc || `第 ${currentStage + 1} 层`;
        this._showDungeonPanel(
            scene,
            `第 ${currentStage + 1}/${stages.length} 层`,
            desc,
            false,
            () => {
                this.triggerBattle(stage.enemies, { type: scene.type, sceneId: scene.id, stageIndex: currentStage });
            }
        );
    }

    _showDungeonPanel(scene, title, desc, completed, onFight) {
        const container = document.getElementById('scene-container');
        if (!container) return;
        container.querySelectorAll('.dungeon-panel').forEach(el => el.remove());
        const panel = document.createElement('div');
        panel.className = 'dungeon-panel';
        panel.style.cssText = 'margin-top:12px;padding:12px;background:rgba(0,0,0,0.25);border-radius:8px;border:1px solid rgba(255,255,255,0.1);';
        let html = `<div style="font-weight:bold;margin-bottom:6px;color:var(--accent);">${title}</div>`;
        html += `<div style="margin-bottom:10px;color:var(--text-secondary);font-size:14px;">${desc}</div>`;
        if (!completed && onFight) {
            html += `<button class="scene-action-btn" style="padding:8px 16px;background:#ff9800;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;">进入战斗</button>`;
        } else if (completed) {
            html += `<div style="color:#a5d6a7;font-size:14px;">地下城已通关</div>`;
        }
        panel.innerHTML = html;
        container.appendChild(panel);
        const fightBtn = panel.querySelector('.scene-action-btn');
        if (fightBtn) {
            fightBtn.addEventListener('click', () => {
                panel.remove();
                onFight();
            });
        }
    }

    // ========== 战斗结束监听（推进地下城） ==========
    _onCombatEnd(e) {
        const result = e.detail.result;
        const ctx = this.combatContext;
        if (result !== 'player_victory' || !ctx || ctx.type !== 'dungeon') {
            this.combatContext = null;
            return;
        }

        const state = window.gameApp ? window.gameApp.state : null;
        if (!state || !state.world || !state.world.dungeonProgress) {
            this.combatContext = null;
            return;
        }

        const progress = state.world.dungeonProgress[ctx.sceneId];
        if (!progress) {
            this.combatContext = null;
            return;
        }

        progress.currentStage = (progress.currentStage || 0) + 1;
        const stages = DATA.dungeonStages && DATA.dungeonStages[ctx.sceneId]
            ? DATA.dungeonStages[ctx.sceneId]
            : [];

        if (progress.currentStage >= stages.length) {
            progress.completed = true;
            console.log('[场景] 地下城完成:', ctx.sceneId);
            setTimeout(() => {
                const scene = this._getScene(ctx.sceneId);
                if (scene && scene.exits && scene.exits.length > 0) {
                    // 优先返回非地下城内部出口
                    const exit = scene.exits.find(id => !id.startsWith(ctx.sceneId + '_')) || scene.exits[0];
                    this.enterScene(exit);
                }
            }, 1500);
        } else {
            // 短暂延迟后刷新当前场景，显示下一层
            setTimeout(() => this.enterScene(ctx.sceneId), 1200);
        }
        this.combatContext = null;
    }

    // ========== 触发战斗 ==========
    triggerBattle(enemyIds, context) {
        if (context) this.combatContext = context;
        console.log('[战斗] 触发战斗，敌人:', enemyIds.join(', '));
        const player = this.getPlayerData();
        if (!player) {
            console.error('[战斗] 没有玩家数据');
            return;
        }
        const enemies = enemyIds.map(id => {
            const data = DATA.enemies[id];
            if (!data) {
                console.error('[战斗] 找不到敌人数据:', id);
                return null;
            }
            return {
                ...data,
                id: Utils.uuid(),
                status: 'normal',
                hp: data.hp || 30,
                maxHp: data.maxHp || 30,
                speed: data.speed || 5
            };
        }).filter(e => e !== null);

        if (enemies.length === 0) {
            console.error('[战斗] 没有有效敌人');
            return;
        }

        const companions = this.getCompanionData();
        const combat = new CombatEngine();
        window.currentCombat = combat;
        this.currentCombat = combat;
        combat.startCombat(player, enemies, companions);
    }

    // ========== 获取参战随从（带战斗属性计算） ==========
    getCompanionData() {
        try {
            const state = window.gameApp ? window.gameApp.state : null;
            if (!state || !state.companions) return [];
            return state.companions
                .filter(c => c.alive !== false)
                .map(c => {
                    const stats = (typeof StateUtils !== 'undefined' && StateUtils.getCombatStats)
                        ? StateUtils.getCombatStats(state, c.id) || {}
                        : {};
                    const base = c.attributes || {};
                    return {
                        ...c,
                        speed: stats.speed || base.agi * 0.8 || 5,
                        attack: stats.physAtk || base.str * 2 || 10,
                        defense: stats.physDef || (base.str * 1 + base.ten * 3) || 0,
                        physAtk: stats.physAtk || base.str * 2 || 10,
                        physDef: stats.physDef || (base.str * 1 + base.ten * 3) || 0,
                        magAtk: stats.magAtk || base.int * 2 || 10,
                        magDef: stats.magDef || (base.int * 1 + base.spi * 2 + base.ten * 3) || 0,
                        hit: stats.hit || base.agi * 1.5 || 80,
                        dodge: stats.dodge || base.agi * 1 || 20,
                        critRate: stats.critRate || 0.05,
                        critDmg: stats.critDmg || 1.5,
                    };
                });
        } catch (e) {
            console.error('[战斗] 获取随从失败:', e);
            return [];
        }
    }

    // ========== 获取玩家数据（带战斗属性计算） ==========
    getPlayerData() {
        try {
            const state = window.gameApp ? window.gameApp.state : null;
            if (!state || !state.player) return null;
            const p = state.player;
            const stats = (typeof StateUtils !== 'undefined' && StateUtils.getCombatStats)
                ? StateUtils.getCombatStats(state, 'player') || {}
                : {};
            const base = p.attributes || {};
            return {
                ...p,
                speed: stats.speed || base.agi * 0.8 || 5,
                attack: stats.physAtk || base.str * 2 || 10,
                defense: stats.physDef || (base.str * 1 + base.ten * 3) || 0,
                physAtk: stats.physAtk || base.str * 2 || 10,
                physDef: stats.physDef || (base.str * 1 + base.ten * 3) || 0,
                magAtk: stats.magAtk || base.int * 2 || 10,
                magDef: stats.magDef || (base.int * 1 + base.spi * 2 + base.ten * 3) || 0,
                hit: stats.hit || base.agi * 1.5 || 80,
                dodge: stats.dodge || base.agi * 1 || 20,
                critRate: stats.critRate || 0.05,
                critDmg: stats.critDmg || 1.5,
            };
        } catch (e) {
            console.error('[战斗] 获取玩家失败:', e);
            return null;
        }
    }

    getCurrentScene() { return this.currentScene; }
    getScenes() { return this._getScenes(); }
    getExits() { return this.currentScene ? this.currentScene.exits || [] : []; }
}

try { module.exports = SceneManager; } catch(e) {}
