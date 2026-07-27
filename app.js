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
    this.state = SaveManager.load();
    if (!this.state) {
      console.log('[应用] 没有存档，显示角色创建');
      this._showCharacterCreation();
    } else {
      console.log('[应用] 加载玩家:', this.state.player.name);
      this.startGame();
    }
  }

  startGame() {
    console.log('[应用] 开始游戏');
    this._initPlayerSkills();
    this.uiRenderer.updatePlayerInfo(this.state.player);
    this._processOfflineGather();
    this._processOfflineExp();
    this._checkExpLockGuidance();
    this.state.world.lastSave = new Date().toISOString();
    this.sceneManager.enterScene(this.state.player.location || '灰烟村');
    this._startAutoSave();
  }

  _initPlayerSkills() {
    const p = this.state.player;
    if (!p.skills || p.skills.length === 0) {
      const classData = DATA.classes[p.classPath[0]];
      if (classData) {
        const branch = p.classPath[0] === 'mage' ? p.elementSpec : null;
        const skills = classData.getSkills(p.level, branch);
        p.skills = skills;
        if (!p.skillPreset || p.skillPreset.length === 0) {
          p.skillPreset = skills;
        }
      }
    }
    if (!p.skillPreset || p.skillPreset.length === 0) {
      p.skillPreset = p.skills.slice(0, 2);
    }
    if (!p.cooldowns) p.cooldowns = {};
  }

  _showCharacterCreation() {
    const classes = Object.keys(DATA.classes).filter(k => !['mage_fire', 'mage_frost', 'mage_lightning', 'mage_heal'].includes(k));
    let html = `<div class="creation-frame">
      <h1>《寻亲风云录》</h1>
      <p class="creation-narrative">
        你从小在灰烟村长大。<br>
        父母留下的信件指引你踏上旅途。<br>
        前方等待你的是什么？
      </p>
      <div class="creation-form">
        <input type="text" id="char-name" placeholder="输入名字" maxlength="10" value="酒馆少年">
        <div class="class-select">
          <p>选择职业:</p>`;
    classes.forEach(cls => {
      const cd = DATA.classes[cls];
      html += `<button class="class-btn" data-class="${cls}">${cd.name}</button>`;
    });
    html += `</div>
        <div class="mode-select">
          <input type="checkbox" id="hardcore-mode"> 硬核模式（死亡即删档）
        </div>
        <button class="start-btn" id="start-btn">开始旅程</button>
      </div>
    </div>`;
    this.uiRenderer._showPopup(html);
    let selectedClass = 'warrior';
    document.querySelectorAll('.class-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedClass = btn.dataset.class;
      };
    });
    const firstBtn = document.querySelector('.class-btn');
    if (firstBtn) firstBtn.classList.add('selected');
    document.getElementById('start-btn').onclick = () => {
      const name = document.getElementById('char-name').value.trim() || '酒馆少年';
      const hardcore = document.getElementById('hardcore-mode').checked;
      this._createNewPlayer(name, selectedClass, hardcore);
    };
  }

  _createNewPlayer(name, classKey, hardcore) {
    this.state = createDefaultState();
    const p = this.state.player;
    p.name = name;
    p.hardcore = hardcore;
    p.combatMode = 'auto';
    p.autoMode = 'skillFirst';
    p.classPath = [classKey];
    const cd = DATA.classes[classKey];
    p.class = cd.name;
    if (classKey === 'warrior') {
      p.attributes = { str: 12, agi: 8, int: 5, vit: 10, ten: 10, spi: 5 };
    } else if (classKey === 'ranger') {
      p.attributes = { str: 8, agi: 14, int: 6, vit: 7, ten: 6, spi: 5 };
    } else if (classKey === 'mage') {
      p.attributes = { str: 5, agi: 7, int: 14, vit: 6, ten: 5, spi: 12 };
      p.elementSpec = 'fire';
    }
    p.maxHp = 100 + p.attributes.vit * 10;
    p.hp = p.maxHp;
    p.maxMp = 30 + p.attributes.spi * 5;
    p.mp = p.maxMp;
    const weaponType = classKey === 'ranger' ? 'bow' : classKey === 'mage' ? 'staff' : 'sword';
    const weaponName = classKey === 'ranger' ? '父亲的旧弓' : classKey === 'mage' ? '父亲的旧法杖' : '父亲的旧短剑';
    this.state.equipment.weapon = {
      name: weaponName, type: weaponType, rarity: 'blue', level: 10,
      baseStats: Utils.calcBaseStats(weaponType, 10), affixes: [],
    };
    this.state.player.location = '酒馆';
    SaveManager.save(this.state);
    this.uiRenderer._closePopup();
    this.startGame();
  }

  _checkExpLockGuidance() {
    const state = this.state;
    if (!StateUtils.isExpLocked(state)) return;
    const cap = StateUtils.getLevelCap(state);
    const flagKey = 'exp_lock_guided_' + cap;
    if (!state.world.flags) state.world.flags = {};
    if (state.world.flags[flagKey]) return;
    state.world.flags[flagKey] = true;
    this.uiRenderer.addGameLog(`🔒 等级已达上限 Lv.${cap} — ${StateUtils.getLockMessage(state)}`);
    SaveManager.save(state);
  }

  _processOfflineGather() {
    const state = this.state;
    if (!state.world.lastSave) return;
    const lastSave = new Date(state.world.lastSave);
    const now = new Date();
    const offlineMs = now.getTime() - lastSave.getTime();
    if (offlineMs < 5 * 60 * 1000) return;
    const offlineHours = Math.min(24, offlineMs / (1000 * 60 * 60));
    const idleGather = state.world.idleGather;
    if (!idleGather || !idleGather.target) return;
    const totalCycles = Math.floor(offlineHours * 2);
    if (totalCycles < 1) return;
    const target = idleGather.target;
    let itemsGathered = 0;
    let goldFound = 0;
    for (let i = 0; i < totalCycles; i++) {
      const roll = Math.random();
      if (roll < 0.75) {
        const amount = 1 + Math.floor(Math.random() * 3);
        StateUtils.addToInventory(state, { name: target, type: 'material', rarity: 'white', level: 1, stack: amount, stackable: true });
        itemsGathered += amount;
      } else if (roll < 0.88) {
        goldFound += 2 + Math.floor(Math.random() * 8);
      }
    }
    if (goldFound > 0) StateUtils.addGold(state, goldFound);
    state.world.idleGather = null;
    if (itemsGathered > 0 || goldFound > 0) {
      this.uiRenderer.addGameLog(`⏰ 离线${offlineHours.toFixed(1)}小时，采集${target}×${itemsGathered}，金币+${goldFound}`);
    }
  }

  _processOfflineExp() {
    const state = this.state;
    if (!state.world.lastSave) return;
    const lastSave = new Date(state.world.lastSave);
    const now = new Date();
    const offlineMs = now.getTime() - lastSave.getTime();
    if (offlineMs < 60 * 60 * 1000) return;
    const offlineHours = Math.min(24, offlineMs / (1000 * 60 * 60));
    const offlineExp = Math.floor(offlineHours * (5 + state.player.level * 2));
    if (offlineExp <= 0) return;
    const result = StateUtils.addExp(state, offlineExp);
    if (result.gained > 0) {
      this.uiRenderer.addGameLog(`⏰ 离线修炼获得经验 +${result.gained}${result.leveled ? '（升级了！）' : ''}`);
    }
  }

  _startAutoSave() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    const interval = (this.state.settings.autoSaveInterval || 300) * 1000;
    if (this.state.settings.autoSave !== false) {
      this._autoSaveTimer = setInterval(() => this.saveGame(), interval);
    }
  }

  saveGame() {
    if (this.state) SaveManager.save(this.state);
  }

  _onCombatEnd(result) {
    const state = this.state;
    const c = this.combatEngine;
    if (!c) return;
    if (result === 'player_victory') {
      const aliveEnemies = c.enemyUnits.filter(e => e.hp <= 0);
      let totalExp = 0, totalGold = 0;
      const lootItems = [];
      aliveEnemies.forEach(e => {
        const monsterData = DATA.monsters[e.monsterKey];
        if (monsterData) {
          totalExp += monsterData.exp;
          totalGold += monsterData.gold;
          if (monsterData.drops) {
            monsterData.drops.forEach(drop => {
              if (Math.random() < drop.chance) {
                const count = Utils.randInt(drop.min, drop.max);
                const itemDef = DATA.items[drop.item];
                if (itemDef) {
                  lootItems.push({ ...itemDef, id: itemDef.id + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,4), stack: count });
                }
              }
            });
          }
        } else {
          totalExp += e.level * 10;
          totalGold += e.level * 3;
        }
      });
      const expResult = StateUtils.addExp(state, totalExp);
      StateUtils.addGold(state, totalGold);
      this.uiRenderer.addGameLog(`🏆 胜利！获得经验+${expResult.gained}，金币+${totalGold}`);
      lootItems.forEach(item => {
        const r = InventorySystem.addItem(state, item);
        if (r.ok) {
          this.uiRenderer.addGameLog(`📦 获得 ${item.name} ×${item.stack}`);
        } else {
          this.uiRenderer.addGameLog(`📦 ${item.name} 因背包已满无法拾取`);
        }
      });
      if (expResult.leveled) this.uiRenderer.addGameLog(`⭐ 升级到 Lv.${state.player.level}！`);
      if (c.enemyUnits.length === 1 && DATA.gatekeepers[c.enemyUnits[0].monsterKey]) {
        const gkId = c.enemyUnits[0].monsterKey;
        if (gkId) {
          StateUtils.defeatGatekeeper(state, gkId);
          this.uiRenderer.addGameLog(`🎖️ 击败了 ${DATA.gatekeepers[gkId].name}！`);
        }
      }
    } else if (result === 'player_defeat') {
      const zone = state.world.currentZone;
      const deathResult = StateUtils.handleDeath(state, zone);
      this.uiRenderer.addGameLog(deathResult.message);
      if (deathResult.mode === 'epitaph' || deathResult.mode === 'retired') {
        this.uiRenderer.showPanel('碑文模式', '<p>存档已锁定，进入碑文模式。</p>');
      }
    }
    if (c.allyUnits) {
      c.allyUnits.forEach(au => {
        if (au.hp <= 0) {
          const comp = state.companions.find(c => c.id === au.unitId);
          if (comp) comp.alive = false;
        }
      });
    }
    state.player.hp = c.playerUnit ? c.playerUnit.hp : state.player.hp;
    state.player.mp = c.playerUnit ? c.playerUnit.mp : state.player.mp;
    this.combatEngine = null;
    this.saveGame();
    this.uiRenderer.updatePlayerInfo(state.player);
    this.sceneManager.enterScene(state.world.currentLocation || '灰烟村');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
