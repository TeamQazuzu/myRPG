/**
 * 寻亲风云录 - 游戏主入口
 */
class GameApp {
  constructor() {
    this.state = null;
    this.sceneManager = null;
    this.uiRenderer = null;
    this.autoSaveTimer = null;
    this.currentTab = 'scene'; // 当前激活的底部导航tab
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

    // 清空容器（移除创建界面等）
    const gc = document.getElementById('game-container');
    if (gc) gc.innerHTML = '';

    // 初始化 UI
    this.uiRenderer = new UIRenderer();
    this.uiRenderer.init('game-container');
    this.uiRenderer.setSceneRef(this.sceneManager.getScenes());

    // 添加底部导航
    this.addBottomNavigation();

    // 进入初始场景
    this.sceneManager.enterScene('灰烟村');

    // 监听场景事件
    document.addEventListener('scene-change', (e) => {
      this.state.world.currentZone = e.detail.scene.id || 'greyVillage';
      this.state.world.currentLocation = e.detail.scene.name || '酒馆';
      this.renderTopBar();
    });

    // 监听战斗结束，处理死亡/奖励
    document.addEventListener('combat-end', (e) => {
      if (e.detail.result === 'player_defeat') {
        const deathResult = StateUtils.handleDeath(this.state, this.state.world.currentZone);
        this.uiRenderer.addGameLog(deathResult.message);
        if (deathResult.mode === 'epitaph' || deathResult.mode === 'retired') {
          setTimeout(() => {
            this.uiRenderer.showPanel('游戏结束', `<p>${deathResult.message}</p><p style="margin-top:12px;color:var(--text-secondary);">刷新页面重新开始。</p>`);
            SaveManager.delete();
          }, 1000);
        }
      }
      SaveManager.save(this.state);
      this.renderTopBar();
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
    const hpPct = p.maxHp > 0 ? Math.max(0, (p.hp / p.maxHp) * 100) : 0;
    const mpPct = p.maxMp > 0 ? Math.max(0, (p.mp / p.maxMp) * 100) : 0;
    bar.innerHTML = `
      <div class="tb-row-1">
        <span class="tb-name">${p.name}</span>
        <span class="tb-lv">Lv.${p.level}</span>
        <span class="tb-location">📍 ${p.location || '灰烟村'}</span>
      </div>
      <div class="tb-row-2">
        <span class="tb-hp-bar">
          <span class="tb-bar-label">HP</span>
          <span class="tb-bar-track"><span class="tb-bar-fill hp" style="width:${hpPct}%"></span></span>
          <span class="tb-bar-val">${p.hp}/${p.maxHp}</span>
        </span>
        <span class="tb-mp-bar">
          <span class="tb-bar-label">MP</span>
          <span class="tb-bar-track"><span class="tb-bar-fill mp" style="width:${mpPct}%"></span></span>
          <span class="tb-bar-val">${p.mp}/${p.maxMp}</span>
        </span>
      </div>
      <div class="tb-row-3">
        <span class="tb-gold">💰 ${this.formatMoney(p)}</span>
      </div>
    `;
  }

  formatMoney(p) {
    const parts = [];
    if (p.gold) parts.push(p.gold + '金');
    if (p.silver) parts.push(p.silver + '银');
    if (p.copper) parts.push(p.copper + '铜');
    return parts.length > 0 ? parts.join(' ') : '0铜';
  }

  addBottomNavigation() {
    // 防止重复添加
    if (document.getElementById('bottom-nav')) return;

    const nav = document.createElement('div');
    nav.id = 'bottom-nav';
    nav.innerHTML = `
      <button class="nav-item active" data-action="scene">
        <span class="nav-icon">🏠</span>
        <span>场景</span>
      </button>
      <button class="nav-item" data-action="inventory">
        <span class="nav-icon">🎒</span>
        <span>背包</span>
      </button>
      <button class="nav-item" data-action="character">
        <span class="nav-icon">👤</span>
        <span>角色</span>
      </button>
      <button class="nav-item" data-action="companions">
        <span class="nav-icon">🏹</span>
        <span>随从</span>
      </button>
      <button class="nav-item" data-action="settings">
        <span class="nav-icon">⚙️</span>
        <span>设置</span>
      </button>
    `;
    document.body.appendChild(nav);

    nav.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        // 战斗中只允许场景tab
        if (this.uiRenderer && this.uiRenderer.isCombatActive) {
          const action = btn.dataset.action;
          if (action !== 'scene') return;
        }

        nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.action;
        this.switchTab(btn.dataset.action);
      });
    });
  }

  switchTab(action) {
    // 隐藏所有面板
    const sceneEl = document.getElementById('scene-container');
    const invPanel = document.getElementById('inventory-panel');
    const charPanel = document.getElementById('character-panel');
    const compPanel = document.getElementById('companion-panel');
    const settingsPanel = document.getElementById('settings-panel');
    const combatContainer = document.getElementById('combat-container');
    const combatLog = document.getElementById('combat-log');

    if (invPanel) invPanel.remove();
    if (charPanel) charPanel.remove();
    if (compPanel) compPanel.remove();
    if (settingsPanel) settingsPanel.remove();

    // 关闭NPC弹窗
    const dynPanel = document.getElementById('dynamic-panel');
    if (dynPanel) dynPanel.style.display = 'none';

    switch (action) {
      case 'scene':
        if (sceneEl) sceneEl.style.display = 'block';
        // 如果战斗中，也显示战斗UI
        if (this.uiRenderer && this.uiRenderer.isCombatActive) {
          if (combatContainer) combatContainer.style.display = 'block';
          if (combatLog) combatLog.style.display = 'block';
          const actionBtns = document.getElementById('action-buttons');
          if (actionBtns) actionBtns.style.display = 'flex';
        } else {
          // 重新渲染当前场景
          const cur = this.sceneManager.getCurrentScene();
          if (cur) this.uiRenderer.renderScene(cur);
        }
        break;
      case 'inventory':
        if (sceneEl) sceneEl.style.display = 'none';
        this.openInventory();
        break;
      case 'character':
        if (sceneEl) sceneEl.style.display = 'none';
        this.uiRenderer.renderCharacter(this.state);
        break;
      case 'companions':
        if (sceneEl) sceneEl.style.display = 'none';
        this.uiRenderer.renderCompanionList(this.state);
        break;
      case 'settings':
        if (sceneEl) sceneEl.style.display = 'none';
        this.uiRenderer.renderSettings(this.state);
        break;
    }
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
