// app.js - 主应用
class GameApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.uiRenderer = new UIRenderer();
        this.player = null;
        window.gameApp = this;
        this.init();
    }

    init() {
        console.log('[应用] 初始化');
        
        // 创建UI容器
        this.createContainers();
        
        // 加载玩家
        this.player = this.loadPlayer();
        if (!this.player) {
            this.showCharacterCreation();
        } else {
            this.startGame();
        }
    }

    createContainers() {
        const containers = ['combat-container', 'action-buttons'];
        containers.forEach(id => {
            if (!document.getElementById(id)) {
                const div = document.createElement('div');
                div.id = id;
                document.getElementById('game-container').appendChild(div);
            }
        });
    }

    startGame() {
        console.log('[应用] 开始游戏');
        this.updatePlayerInfo();
        this.sceneManager.enterScene('新手村');
    }

    updatePlayerInfo() {
        const el = document.getElementById('player-info');
        if (!el || !this.player) return;
        el.innerHTML = `
            <strong>${this.player.name}</strong> 
            LV.${this.player.level || 1} 
            HP: ${this.player.hp}/${this.player.maxHp} 
            ⚔️${this.player.attack} 🛡️${this.player.defense} 
            💰${this.player.gold || 0}
        `;
    }

    loadPlayer() {
        try {
            const saved = localStorage.getItem('myRPG_player');
            if (saved) {
                const p = JSON.parse(saved);
                p.maxHp = p.maxHp || p.hp || 100;
                p.hp = p.hp || p.maxHp;
                p.speed = p.speed || 10;
                p.attack = p.attack || 10;
                p.defense = p.defense || 5;
                return p;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    savePlayer() {
        try {
            localStorage.setItem('myRPG_player', JSON.stringify(this.player));
        } catch (e) {}
    }

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
                gold: 50
            };
            this.savePlayer();
            this.startGame();
        });
    }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
});
