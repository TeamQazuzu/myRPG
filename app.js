/**
 * 寻亲风云录 - 游戏主入口
 */
class GameApp {
  constructor() {
    this.state = null;
    this.sceneManager = null;
    this.uiRenderer = null;
    this.autoSaveTimer = null;
  }

  async init() {
    console.log('[游戏] 初始化开始...');

    // 尝试加载存档
    const saved = SaveManager.load();
    if (saved) {
      this.state = saved;
      console.log('[游戏] 存档已加载');
      this.startGame();
    } else {
      this.showCharacterCreation();
    }

    // 初始化自动保存
    this.setupAutoSave();
    console.log('[游戏] 初始化完成');
  }

  showCharacterCreation() {
    this.uiRenderer = new UIRenderer();
    this.uiRenderer.init('game-container');
    this.uiRenderer.showCharacterCreation((name, classKey, hardcore) => {
      this.createCharacter(name, classKey, hardcore);
    });
  }

  createCharacter(name, classKey, hardcore) {
    this.state = createDefaultState();
    this.state.player.name = name;
    this.state.player.class = DATA.classes[classKey]?.name || '见习战士';
    this.state.player.classPath = [classKey];
    this.state.player.hardcore = hardcore;

    // 根据职业调整初始属性
    const attrs = this.state.player.attributes;
    if (classKey === 'warrior') {
      attrs.str = 12; attrs.vit = 10; attrs.ten = 10;
      attrs.agi = 6; attrs.int = 5; attrs.spi = 5;
    } else if (classKey === 'ranger') {
      attrs.agi = 14; attrs.str = 10;
      attrs.int = 5; attrs.vit = 7; attrs.ten = 6; attrs.spi = 6;
    } else if (classKey === 'mage') {
      attrs.int = 14; attrs.spi = 12;
      attrs.str = 5; attrs.agi = 6; attrs.vit = 6; attrs.ten = 5;
    }
    this.recalcPlayerStats();

    SaveManager.save(this.state);
    this.startGame();
  }

  recalcPlayerStats() {
    const p = this.state.player;
    const attrs = p.attributes;
    p.maxHp = 100 + (attrs.vit - 8) * 10;
    p.hp = Math.min(p.hp, p.maxHp);
    p.maxMp = 30 + (attrs.spi - 8) * 5;
    p.mp = Math.min(p.mp, p.maxMp);
  }

  startGame() {
    // 初始化场景管理器
    this.sceneManager = new SceneManager();

    // 初始化 UI
    this.uiRenderer = new UIRenderer();
    this.uiRenderer.init('game-container');

    // 进入初始场景
    this.sceneManager.enterScene('灰烟村');

    // 监听场景事件
    document.addEventListener('scene-change', (e) => {
      this.state.world.currentZone = e.detail.scene.id || 'greyVillage';
      this.state.world.currentLocation = e.detail.scene.name || '酒馆';
    });

    // 监听战斗结束，处理死亡/奖励
    document.addEventListener('combat-end', (e) => {
      if (e.detail.result === 'player_defeat') {
        const deathResult = StateUtils.handleDeath(this.state, this.state.world.currentZone);
        this.uiRenderer.addGameLog(deathResult.message);
        if (deathResult.mode === 'epitaph' || deathResult.mode === 'retired') {
          setTimeout(() => {
            alert('游戏结束。刷新页面重新开始。');
            SaveManager.delete();
          }, 1000);
        }
      }
      SaveManager.save(this.state);
    });

    // 顶部状态栏
    this.renderTopBar();
  }

  renderTopBar() {
    let bar = document.getElementById('top-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'top-bar';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    const p = this.state.player;
    bar.innerHTML = `
      <span class="tb-name">${p.name}</span>
      <span class="tb-lv">Lv.${p.level}</span>
      <span class="tb-hp">HP: ${p.hp}/${p.maxHp}</span>
      <span class="tb-mp">MP: ${p.mp}/${p.maxMp}</span>
      <span class="tb-gold">💰 ${p.gold}金 ${p.silver}银 ${p.copper}铜</span>
      <span class="tb-location">📍 ${p.location}</span>
    `;
  }

  setupAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(() => {
      if (this.state && this.state.settings.autoSave) {
        SaveManager.save(this.state);
        console.log('[存档] 自动保存完成');
      }
    }, (this.state?.settings?.autoSaveInterval || 300) * 1000);
  }

  // 快捷操作：打开背包
  openInventory() {
    if (this.uiRenderer) this.uiRenderer.renderInventory(this.state);
  }

  // 快捷操作：保存
  manualSave() {
    if (this.state) {
      SaveManager.save(this.state);
      this.uiRenderer.addGameLog('💾 手动保存成功');
    }
  }

  // 快捷操作：导出存档
  exportSave() {
    if (this.state) SaveManager.export(this.state);
  }
}

// ========== 启动游戏 ==========
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
  window.gameApp.init();
});
