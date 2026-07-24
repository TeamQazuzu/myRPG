// app.js - 主应用入口（使用完整状态管理）
class GameApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.uiRenderer = new UIRenderer();
        this.combatEngine = null;
        this.state = null;
        window.gameApp = this;
        this.init();
    }

    init() {
        console.log('[应用] 初始化游戏');
        this.uiRenderer.init('game-container');
        // 尝试加载完整存档
        this.state = SaveManager.load();
        if (!this.state) {
            console.log('[应用] 没有找到存档，显示角色创建');
            this.showCharacterCreation();
        } else {
            console.log('[应用] 加载玩家:', this.state.player.name);
            this.startGame();
        }
    }

    startGame() {
        console.log('[应用] 开始游戏');
        this.syncPlayerToCombatData();
        this.uiRenderer.updatePlayerInfo(this.state.player);
        this.sceneManager.enterScene('灰烟村');
        this.startAutoSave();
    }

    // 将六维属性同步到战斗用的 attack/defense/speed
    syncPlayerToCombatData() {
        const p = this.state.player;
        const attrs = p.attributes;
        // 基于六维属性计算战斗属性（与 StateUtils.getCombatStats 保持一致）
        p.attack = (attrs.str * 2) + (p.equipment && p.equipment.weapon ? (p.equipment.weapon.baseStats?.physAtk || 0) : 0);
        p.defense = (attrs.str * 1 + attrs.ten * 3);
        p.speed = attrs.agi * 0.8;
        p.maxHp = 100 + attrs.vit * 10;
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        // 叠加装备基础属性
        if (this.state.equipment) {
            for (const slot of Object.keys(this.state.equipment)) {
                const item = this.state.equipment[slot];
                if (!item || !item.baseStats) continue;
                if (item.baseStats.physAtk) p.attack += item.baseStats.physAtk;
                if (item.baseStats.physDef) p.defense += item.baseStats.physDef;
                if (item.baseStats.maxHp) p.maxHp += item.baseStats.maxHp;
            }
        }
    }

    updatePlayerInfo() {
        if (this.state) {
            this.syncPlayerToCombatData();
            this.uiRenderer.updatePlayerInfo(this.state.player);
        }
    }

    saveGame() {
        if (this.state) {
            SaveManager.save(this.state);
        }
    }

    startAutoSave() {
        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        const interval = (this.state?.settings?.autoSaveInterval || 300) * 1000;
        if (this.state?.settings?.autoSave !== false) {
            this.autoSaveTimer = setInterval(() => {
                console.log('[应用] 自动存档...');
                this.saveGame();
            }, interval);
        }
    }

    showCharacterCreation() {
        const container = document.getElementById('scene-container');
        if (!container) return;
        container.innerHTML = `
            <div class="character-creation">
                <h2>创建角色</h2>
                <input type="text" id="player-name" placeholder="输入名字" value="勇者">
                <select id="player-class">
                    <option value="warrior">战士（力量/体质）</option>
                    <option value="ranger">游侠（敏捷）</option>
                    <option value="mage">法师（智力/精神）</option>
                </select>
                <label><input type="checkbox" id="hardcore-mode"> 硬核模式（死亡即删档）</label>
                <button id="create-btn">开始冒险</button>
            </div>
        `;
        document.getElementById('create-btn').addEventListener('click', () => {
            const name = document.getElementById('player-name').value || '勇者';
            const classKey = document.getElementById('player-class').value;
            const hardcore = document.getElementById('hardcore-mode').checked;
            this.createNewPlayer(name, classKey, hardcore);
        });
    }

    createNewPlayer(name, classKey, hardcore = false) {
        this.state = createDefaultState();
        const p = this.state.player;
        p.name = name;
        p.hardcore = hardcore;
        p.classPath = [classKey];
        // 根据职业调整初始属性
        if (classKey === 'warrior') {
            p.class = '见习战士';
            p.attributes = { str: 12, agi: 8, int: 5, vit: 10, ten: 10, spi: 5 };
        } else if (classKey === 'ranger') {
            p.class = '见习游侠';
            p.attributes = { str: 8, agi: 14, int: 6, vit: 7, ten: 6, spi: 5 };
        } else if (classKey === 'mage') {
            p.class = '见习法师';
            p.attributes = { str: 5, agi: 7, int: 14, vit: 6, ten: 5, spi: 12 };
        }
        // 重新计算基础生命
        p.maxHp = 100 + p.attributes.vit * 10;
        p.hp = p.maxHp;
        p.maxMp = 30 + p.attributes.spi * 5;
        p.mp = p.maxMp;
        // 初始化装备
        this.state.equipment.weapon = {
            name: classKey === 'ranger' ? "父亲的旧弓" : "父亲的旧短剑",
            type: classKey === 'ranger' ? "bow" : "sword",
            rarity: "blue",
            level: 10,
            affixes: [],
            baseStats: Utils.calcBaseStats(classKey === 'ranger' ? "bow" : "sword", 10)
        };
        SaveManager.save(this.state);
        this.startGame();
    }
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
});
