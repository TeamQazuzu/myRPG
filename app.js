// app.js - 主应用入口
class GameApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.uiRenderer = new UIRenderer();
        this.combatEngine = null;
        this.player = null;
        
        // 保存到全局供其他模块访问
        window.gameApp = this;
        
        this.init();
    }

    init() {
        console.log('[应用] 初始化游戏');
        
        // 初始化渲染器
        this.uiRenderer.init('game-container');
        
        // 加载或创建玩家
        this.player = this.loadPlayer();
        if (!this.player) {
            console.log('[应用] 没有找到存档，显示角色创建');
            this.showCharacterCreation();
        } else {
            console.log('[应用] 加载玩家:', this.player.name);
            this.startGame();
        }
    }

    // 开始游戏
    startGame() {
        console.log('[应用] 开始游戏');
        this.updatePlayerInfo();
        this.sceneManager.enterScene('新手村');
    }

    // 更新玩家信息
    updatePlayerInfo() {
        const container = document.getElementById('player-info');
        if (!container || !this.player) return;
        
        container.innerHTML = `
            <strong>${this.player.name}</strong> 
            LV.${this.player.level || 1} 
            HP: ${this.player.hp}/${this.player.maxHp} 
            ⚔️${this.player.attack} 🛡️${this.player.defense} 
            💰${this.player.gold || 0}
        `;
    }

    // 加载玩家
    loadPlayer() {
        try {
            const saved = localStorage.getItem('myRPG_player');
            if (saved) {
                const player = JSON.parse(saved);
                // 确保必需属性
                player.maxHp = player.maxHp || player.hp || 100;
                player.hp = player.hp || player.maxHp;
                player.speed = player.speed || 10;
                player.attack = player.attack || 10;
                player.defense = player.defense || 5;
                player.level = player.level || 1;
                player.gold = player.gold || 0;
                player.exp = player.exp || 0;
                return player;
            }
            return null;
        } catch (error) {
            console.error('[应用] 加载玩家失败:', error);
            return null;
        }
    }

    // 保存玩家
    savePlayer() {
        try {
            localStorage.setItem('myRPG_player', JSON.stringify(this.player));
            console.log('[应用] 玩家已保存');
        } catch (error) {
            console.error('[应用] 保存玩家失败:', error);
        }
    }

    // 显示角色创建
    showCharacterCreation() {
        const container = document.getElementById('scene-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="character-creation">
                <h2>创建角色</h2>
                <input type="text" id="player-name" placeholder="输入名字" value="勇者">
                <button id="create-btn">开始冒险</button>
            </div>
        `;
        
        document.getElementById('create-btn').addEventListener('click', () => {
            const name = document.getElementById('player-name').value || '勇者';
            this.player = {
                name: name,
                hp: 100,
                maxHp: 100,
                attack: 12,
                defense: 5,
                speed: 10,
                level: 1,
                exp: 0,
                gold: 50,
                status: 'normal'
            };
            this.savePlayer();
            this.startGame();
        });
    }
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
});
