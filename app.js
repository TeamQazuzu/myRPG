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

    // ===== 离线挂机采集结算 =====
    this.processOfflineGather();

    // ===== 离线经验结算 =====
    this.processOfflineExp();

    // ===== 经验锁引导检查 =====
    this.checkExpLockGuidance();

    // 更新存档时间
    this.state.world.lastSave = new Date().toISOString();

    this.sceneManager.enterScene('灰烟村');
    this.startAutoSave();
  }

  // ========== 经验锁升级引导 ==========
  // 当玩家首次达到等级上限时，显示引导提示
  checkExpLockGuidance() {
    var state = this.state;
    if (!state || !StateUtils) return;

    var isLocked = StateUtils.isExpLocked(state);
    if (!isLocked) return;

    var cap = StateUtils.getLevelCap(state);
    var flagKey = 'exp_lock_guided_' + cap;

    // 初始化 flags
    if (!state.world.flags) state.world.flags = {};

    // 如果已经提示过这个上限，不再重复
    if (state.world.flags[flagKey]) return;

    // 标记已提示
    state.world.flags[flagKey] = true;

    // 获取引导消息
    var lockMsg = StateUtils.getLockMessage(state) || '你已至当前极限。';

    // 添加到游戏日志（单条合并消息，因为日志显示会覆盖前一条）
    if (this.uiRenderer && this.uiRenderer.addGameLog) {
      this.uiRenderer.addGameLog('🔒 等级已达上限 Lv.' + cap + ' — ' + lockMsg);
    }

    // 保存状态
    this.saveGame();
  }

  // ========== 离线挂机采集结算 ==========
  processOfflineGather() {
    var state = this.state;
    if (!state || !state.world || !state.world.lastSave) return;
    var lastSave = new Date(state.world.lastSave);
    var now = new Date();
    var offlineMs = now.getTime() - lastSave.getTime();

    // 少于5分钟不结算
    if (offlineMs < 5 * 60 * 1000) return;

    // 最多计算24小时
    var offlineHours = Math.min(24, offlineMs / (1000 * 60 * 60));
    // 每小时2轮采集
    var totalCycles = Math.floor(offlineHours * 2);
    if (totalCycles < 1) return;

    // 检查是否有挂机采集状态
    var idleGather = state.world.idleGather;
    if (!idleGather || !idleGather.target) return;

    console.log('[离线结算] 离线' + offlineHours.toFixed(1) + '小时，采集' + totalCycles + '轮，目标：' + idleGather.target);

    // 执行离线采集（简化版：不触发战斗）
    var target = idleGather.target;
    var results = {
      target: target,
      cycles: totalCycles,
      itemsGathered: 0,
      goldFound: 0,
      rareFinds: [],
      log: [],
    };

    for (var i = 1; i <= totalCycles; i++) {
      var roll = Math.random();
      if (roll < 0.75) {
        // 75%：采集成功（离线效率略高）
        var amount = 1 + Math.floor(Math.random() * 3);
        var item = {
          id: Utils.uuid(),
          name: target,
          type: 'material',
          rarity: 'white',
          level: 1,
          stack: amount,
        };
        var addResult = StateUtils.addToInventory(state, item);
        if (addResult.ok) {
          results.itemsGathered += amount;
        } else {
          results.log.push('第' + i + '轮：背包已满，采集中断');
          break;
        }
      } else if (roll < 0.88) {
        // 13%：发现金币（离线不战斗，金币概率提高）
        var gold = 2 + Math.floor(Math.random() * 8);
        StateUtils.addGold(state, gold);
        results.goldFound += gold;
      } else {
        // 12%：发现稀有物品
        var rareItem = {
          id: Utils.uuid(),
          name: '精炼' + target,
          type: 'material',
          rarity: 'green',
          level: 1,
          stack: 1,
        };
        var rareResult = StateUtils.addToInventory(state, rareItem);
        if (rareResult.ok) {
          results.rareFinds.push(rareItem.name);
        }
      }
    }

    // 清除挂机状态
    state.world.idleGather = null;

    // 显示离线结算结果
    if (results.itemsGathered > 0 || results.goldFound > 0 || results.rareFinds.length > 0) {
      this.showOfflineGatherResults(results, offlineHours);
    }
  }

  // ========== 离线采集结算UI ==========
  showOfflineGatherResults(results, offlineHours) {
    var html = '<div class="offline-gather-results">';
    html += '<div class="offline-title">你离开了一段时间...</div>';
    html += '<div class="offline-duration">离线约 ' + offlineHours.toFixed(1) + ' 小时</div>';
    html += '<div class="offline-summary">';
    html += '<div>挂机采集 ' + results.target + ' 完成 ' + results.cycles + ' 轮</div>';
    if (results.itemsGathered > 0) {
      html += '<div class="stat-success">材料 +' + results.itemsGathered + '</div>';
    }
    if (results.goldFound > 0) {
      html += '<div class="stat-gold">金币 +' + results.goldFound + '</div>';
    }
    if (results.rareFinds.length > 0) {
      html += '<div class="stat-rare">稀有发现：' + results.rareFinds.join('、') + '</div>';
    }
    html += '</div></div>';

    this.uiRenderer.showPanel('离线结算', html);
  }

  // ========== 离线经验结算 ==========
  processOfflineExp() {
    var state = this.state;
    if (!state || !state.world || !state.world.lastSave) return;

    var lastSave = new Date(state.world.lastSave);
    var now = new Date();
    var offlineMs = now.getTime() - lastSave.getTime();

    // 少于1小时不结算
    if (offlineMs < 60 * 60 * 1000) return;

    // 最多计算24小时，每小时给少量经验（相当于缓慢修炼）
    var offlineHours = Math.min(24, offlineMs / (1000 * 60 * 60));
    var playerLevel = state.player.level || 1;
    var offlineExp = Math.floor(offlineHours * (5 + playerLevel * 2));

    if (offlineExp > 0) {
      var expResult = StateUtils.addExp(state, offlineExp);
      if (expResult.locked) {
        // 经验被锁定，显示锁定提示
        this.uiRenderer.addGameLog('离线修炼：经验已达当前等级上限，无法继续提升');
      } else if (expResult.gained > 0) {
        var msg = '离线修炼获得经验 +' + expResult.gained;
        if (expResult.leveled) {
          msg += '（升级了！）';
        }
        this.uiRenderer.addGameLog(msg);
      }
    }
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

    // 叠加装备基础属性和词条属性
    if (this.state.equipment) {
      for (var slotKey in this.state.equipment) {
        var item = this.state.equipment[slotKey];
        if (!item) continue;
        // 叠加基础属性
        if (item.baseStats) {
          if (item.baseStats.physAtk) p.attack += item.baseStats.physAtk;
          if (item.baseStats.physDef) p.defense += item.baseStats.physDef;
          if (item.baseStats.maxHp) p.maxHp += item.baseStats.maxHp;
        }
        // 叠加词条属性
        if (item.affixes && item.affixes.length > 0) {
          // 初始化临时stats对象用于词条计算
          var affixStats = { physAtk: 0, physDef: 0, maxHp: 0, speed: 0, critRate: 0, critDmg: 0 };
          for (var ai = 0; ai < item.affixes.length; ai++) {
            StateUtils.applyAffix(affixStats, item.affixes[ai]);
          }
          // 将词条计算结果叠加到主角属性上
          if (affixStats.physAtk > 0) p.attack += Math.floor(affixStats.physAtk);
          if (affixStats.physDef > 0) p.defense += Math.floor(affixStats.physDef);
          if (affixStats.maxHp > 0) p.maxHp += Math.floor(affixStats.maxHp);
          if (affixStats.speed > 0) p.speed += affixStats.speed;
        }
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
