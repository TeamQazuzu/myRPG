// app.js - 主应用入口（重写版）
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

    // 尝试加载存档
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
    p.attack = (attrs.str * 2) + (p.equipment && p.equipment.weapon && p.equipment.weapon.baseStats ? (p.equipment.weapon.baseStats.physAtk || 0) : 0);
    p.defense = (attrs.str * 1 + attrs.ten * 3);
    p.speed = attrs.agi * 0.8;
    p.maxHp = 100 + attrs.vit * 10;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    p.maxMp = 30 + attrs.spi * 5;
    if (p.mp > p.maxMp) p.mp = p.maxMp;

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

    // 同步随从战斗属性
    if (this.state.companions) {
      this.state.companions.forEach(c => {
        if (c.alive === false) return;
        const cAttr = c.attributes || { str: 8, agi: 8, int: 8, vit: 8, ten: 8, spi: 8 };
        c.attack = cAttr.str * 2;
        c.defense = cAttr.str * 1 + cAttr.ten * 3;
        c.speed = cAttr.agi * 0.8;
        c.maxHp = c.maxHp || (80 + cAttr.vit * 10);
        if (c.hp > c.maxHp) c.hp = c.maxHp;
      });
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
    var settings = this.state && this.state.settings ? this.state.settings : {};
    const interval = (settings.autoSaveInterval || 300) * 1000;
    if (settings.autoSave !== false) {
      this.autoSaveTimer = setInterval(() => {
        console.log('[应用] 自动存档...');
        this.saveGame();
      }, interval);
    }
  }

  showCharacterCreation() {
    this.uiRenderer.showCharacterCreation((name, classKey, hardcore) => {
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

    // 重新计算基础生命/法力
    p.maxHp = 100 + p.attributes.vit * 10;
    p.hp = p.maxHp;
    p.maxMp = 30 + p.attributes.spi * 5;
    p.mp = p.maxMp;

    // 初始化装备
    const weaponType = classKey === 'ranger' ? 'bow' : (classKey === 'mage' ? 'staff' : 'sword');
    const weaponName = classKey === 'ranger' ? '父亲的旧弓' : (classKey === 'mage' ? '父亲的旧法杖' : '父亲的旧短剑');
    this.state.equipment.weapon = {
      name: weaponName,
      type: weaponType,
      rarity: 'blue',
      level: 10,
      affixes: [],
      baseStats: Utils.calcBaseStats(weaponType, 10),
    };

    // 同步艾琳的属性
    if (this.state.companions && this.state.companions[0]) {
      const ailin = this.state.companions[0];
      var aAttrs = ailin.attributes || {};
      ailin.maxHp = 80 + (aAttrs.vit || 7) * 10;
      ailin.hp = ailin.maxHp;
      ailin.maxMp = 20 + (aAttrs.spi || 5) * 5;
      ailin.mp = ailin.maxMp;
    }

    SaveManager.save(this.state);
    this.startGame();
  }
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
});
