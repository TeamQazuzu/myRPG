// systems/scene.js - 场景系统
class SceneManager {
    constructor() {
        this.currentScene = null;
        this.scenes = {
            '新手村': {
                type: 'safe',
                name: '新手村',
                npcs: ['村长', '商人', '铁匠'],
                exits: ['新手村荒地', '森林'],
                description: '宁静的新手村，是冒险的起点'
            },
            '新手村荒地': {
                type: 'wild',
                name: '新手村荒地',
                enemies: ['狼', '狼'],
                level: 1,
                description: '荒芜的野地，偶尔有野兽出没'
            },
            '森林': {
                type: 'wild',
                name: '森林',
                enemies: ['野猪', '蛇'],
                level: 2,
                description: '茂密的森林，隐藏着各种危险'
            }
        };
        this.enemyData = this.loadEnemyData();
    }

    // 加载敌人数据
    loadEnemyData() {
        return {
            '狼': {
                name: '狼',
                hp: 30,
                maxHp: 30,
                attack: 8,
                defense: 2,
                speed: 10,
                exp: 12,
                gold: 8,
                skills: ['撕咬', '嚎叫']
            },
            '野猪': {
                name: '野猪',
                hp: 50,
                maxHp: 50,
                attack: 12,
                defense: 5,
                speed: 6,
                exp: 20,
                gold: 15,
                skills: ['冲撞']
            },
            '蛇': {
                name: '蛇',
                hp: 25,
                maxHp: 25,
                attack: 10,
                defense: 1,
                speed: 14,
                exp: 15,
                gold: 10,
                skills: ['毒牙']
            }
        };
    }

    // 进入场景
    enterScene(sceneName) {
        console.log('[场景] 进入:', sceneName);
        
        const scene = this.scenes[sceneName];
        if (!scene) {
            console.error('[场景] 场景不存在:', sceneName);
            return;
        }
        
        this.currentScene = scene;
        
        // 更新UI显示场景信息
        const event = new CustomEvent('scene-change', {
            detail: { scene: scene }
        });
        document.dispatchEvent(event);
        
        // 如果是野外场景且有敌人，触发战斗
        if (scene.type === 'wild' && scene.enemies && scene.enemies.length > 0) {
            console.log('[场景] 野外场景，准备战斗，敌人:', scene.enemies.join(', '));
            this.triggerBattle(scene.enemies);
        }
    }

    // 触发战斗
    triggerBattle(enemyNames) {
        console.log('[战斗] 触发战斗，敌人名称列表:', enemyNames);
        
        // 获取玩家数据
        const player = this.getPlayerData();
        if (!player) {
            console.error('[战斗] 玩家数据不存在，创建默认玩家');
            // 创建默认玩家用于测试
            const defaultPlayer = {
                name: '勇者',
                hp: 100,
                maxHp: 100,
                attack: 15,
                defense: 5,
                speed: 12,
                level: 1,
                exp: 0,
                gold: 50
            };
            this.startCombat(defaultPlayer, enemyNames);
            return;
        }
        
        this.startCombat(player, enemyNames);
    }

    // 启动战斗
    startCombat(player, enemyNames) {
        // 创建敌人实例
        const enemies = enemyNames.map(name => {
            const data = this.enemyData[name];
            if (!data) {
                console.error('[战斗] 找不到敌人数据:', name);
                return null;
            }
            // 创建敌人副本（深拷贝）
            return {
                ...data,
                id: Date.now() + Math.random() * 1000,
                status: 'normal',
                // 确保所有属性都存在
                hp: data.hp || data.maxHp || 30,
                maxHp: data.maxHp || data.hp || 30,
                speed: data.speed || 5,
                attack: data.attack || 5,
                defense: data.defense || 2
            };
        }).filter(e => e !== null);
        
        if (enemies.length === 0) {
            console.error('[战斗] 没有有效的敌人');
            return;
        }
        
        console.log('[战斗] 创建敌人实例:', enemies.map(e => e.name).join(', '));
        console.log('[战斗] 玩家数据:', player.name, 'HP:', player.hp);
        
        // 创建战斗引擎并保存到全局
        const combat = new CombatEngine();
        window.currentCombat = combat;
        
        // 保存到场景管理器
        this.currentCombat = combat;
        
        // 启动战斗
        combat.startCombat(player, enemies);
    }

    // 获取玩家数据
    getPlayerData() {
        try {
            // 从全局游戏状态获取
            if (window.gameApp && window.gameApp.player) {
                return window.gameApp.player;
            }
            
            // 从localStorage获取
            const saved = localStorage.getItem('myRPG_player');
            if (saved) {
                const player = JSON.parse(saved);
                // 确保有必需属性
                player.maxHp = player.maxHp || player.hp || 100;
                player.hp = player.hp || player.maxHp;
                player.speed = player.speed || 10;
                player.attack = player.attack || 10;
                player.defense = player.defense || 5;
                return player;
            }
            
            return null;
        } catch (error) {
            console.error('[场景] 获取玩家数据失败:', error);
            return null;
        }
    }

    // 获取当前场景
    getCurrentScene() {
        return this.currentScene;
    }

    // 获取场景列表
    getScenes() {
        return this.scenes;
    }

    // 获取可用出口
    getExits() {
        return this.currentScene ? this.currentScene.exits || [] : [];
    }
}
