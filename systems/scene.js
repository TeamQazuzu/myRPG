// systems/scene.js
class SceneManager {
    constructor() {
        this.currentScene = null;
        this.currentCombat = null;
        this.scenes = {
            '灰烟村': {
                id: 'greyVillage',
                type: 'safe',
                name: '灰烟村',
                description: '你长大的地方。炉火噼啪作响，艾琳坐在窗边擦拭她的弓。外面天快黑了。',
                exits: ['灰烟村_酒馆', '灰烟村_铁匠铺', '灰烟村_裁缝铺', '灰烟村_集市', '灰烟村_基地']
            },
            '灰烟村_酒馆': {
                id: 'greyVillage_tavern',
                type: 'safe',
                name: '酒馆',
                description: '温暖的酒馆，飘着麦酒和烤肉的香气。墙上挂着旧地图。',
                exits: ['灰烟村']
            },
            '灰烟村_铁匠铺': {
                id: 'greyVillage_blacksmith',
                type: 'safe',
                name: '铁匠铺',
                description: '叮叮当当的打铁声，老铁匠正在锻造一把长剑。',
                exits: ['灰烟村']
            },
            '灰烟村_裁缝铺': {
                id: 'greyVillage_tailor',
                type: 'safe',
                name: '裁缝铺',
                description: '各色布料堆满柜台，裁缝正在缝制一件皮甲。',
                exits: ['灰烟村']
            },
            '灰烟村_集市': {
                id: 'greyVillage_market',
                type: 'safe',
                name: '集市',
                description: '人来人往的集市，各种货物琳琅满目。',
                exits: ['灰烟村']
            },
            '灰烟村_基地': {
                id: 'greyVillage_base',
                type: 'safe',
                name: '基地',
                description: '你的小窝，虽然简陋但很安心。墙上挂着旧地图。',
                exits: ['灰烟村']
            },
            '灰烟村_荒地': {
                id: 'greyVillage_wasteland',
                type: 'wild',
                name: '荒地',
                description: '荒芜的野地，野狗在垃圾堆间游荡。',
                enemies: ['野狗', '野狗'],
                level: 1,
                exits: ['灰烟村']
            },
            '灰烟村_树林': {
                id: 'greyVillage_forest',
                type: 'wild',
                name: '树林',
                description: '稀疏的树林，偶尔有野兔窜过。',
                enemies: ['野兔', '野兔'],
                level: 1,
                exits: ['灰烟村']
            },
            '灰烟村_河边': {
                id: 'greyVillage_river',
                type: 'wild',
                name: '河边',
                description: '潺潺的河水，水边有野鸭栖息。',
                enemies: ['野鸭', '螃蟹'],
                level: 1,
                exits: ['灰烟村']
            }
        };
        this.enemyData = {
            '野狗': { name: '野狗', hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 10, exp: 12, gold: 5 },
            '野兔': { name: '野兔', hp: 15, maxHp: 15, attack: 3, defense: 1, speed: 15, exp: 8, gold: 2 },
            '野鸭': { name: '野鸭', hp: 20, maxHp: 20, attack: 5, defense: 1, speed: 12, exp: 10, gold: 3 },
            '螃蟹': { name: '螃蟹', hp: 25, maxHp: 25, attack: 6, defense: 5, speed: 5, exp: 12, gold: 4 }
        };
    }

    enterScene(sceneName) {
        console.log('[场景] 进入:', sceneName);
        const scene = this.scenes[sceneName];
        if (!scene) {
            console.error('[场景] 场景不存在:', sceneName);
            return;
        }
        this.currentScene = scene;
        const event = new CustomEvent('scene-change', { detail: { scene: scene } });
        document.dispatchEvent(event);
        if (scene.type === 'wild' && scene.enemies && scene.enemies.length > 0) {
            console.log('[场景] 野外场景，触发战斗，敌人:', scene.enemies.join(', '));
            this.triggerBattle(scene.enemies);
        }
    }

    triggerBattle(enemyNames) {
        console.log('[战斗] 触发战斗，敌人:', enemyNames.join(', '));
        const player = this.getPlayerData();
        if (!player) {
            console.error('[战斗] 没有玩家数据');
            return;
        }
        const enemies = enemyNames.map(name => {
            const data = this.enemyData[name];
            if (!data) {
                console.error('[战斗] 找不到敌人数据:', name);
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

        const combat = new CombatEngine();
        window.currentCombat = combat;
        this.currentCombat = combat;
        combat.startCombat(player, enemies);
    }

    getPlayerData() {
        try {
            if (window.gameApp && window.gameApp.state && window.gameApp.state.player) {
                const p = window.gameApp.state.player;
                const base = { ...p.attributes };
                const stats = {
                    maxHp: p.maxHp || p.hp || 100,
                    hp: p.hp || p.maxHp || 100,
                    speed: base.agi * 0.8,
                    attack: base.str * 2,
                    defense: base.str * 1 + base.ten * 3,
                    physAtk: base.str * 2,
                    physDef: base.str * 1 + base.ten * 3,
                    magAtk: base.int * 2,
                    magDef: base.int * 1 + base.spi * 2 + base.ten * 3,
                    hit: base.agi * 1.5,
                    dodge: base.agi * 1,
                    critRate: 0.05,
                    critDmg: 1.5,
                };
                if (typeof StateUtils !== 'undefined' && StateUtils.getCombatStats) {
                    const computed = StateUtils.getCombatStats(window.gameApp.state, 'player');
                    if (computed) {
                        stats.speed = computed.speed || stats.speed;
                        stats.physAtk = computed.physAtk || stats.physAtk;
                        stats.physDef = computed.physDef || stats.physDef;
                        stats.magAtk = computed.magAtk || stats.magAtk;
                        stats.magDef = computed.magDef || stats.magDef;
                        stats.attack = computed.physAtk || stats.attack;
                        stats.defense = computed.physDef || stats.defense;
                    }
                }
                return { ...p, ...stats };
            }
            return null;
        } catch (e) {
            console.error('[战斗] 获取玩家失败:', e);
            return null;
        }
    }

    getCurrentScene() { return this.currentScene; }
    getScenes() { return this.scenes; }
    getExits() { return this.currentScene ? this.currentScene.exits || [] : []; }
}
