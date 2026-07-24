// systems/scene.js - 帧式场景管理（重写版）
class SceneManager {
  constructor() {
    this.currentScene = null;
    this.currentCombat = null;
    this.scenes = this.buildScenes();
    this.enemyData = this.buildEnemyData();
  }

  // ========== 场景数据 ==========
  buildScenes() {
    return {
      // ===== 灰烟村·村口（中心枢纽）=====
      '灰烟村': {
        id: 'greyVillage_hub',
        type: 'safe',
        name: '灰烟村',
        desc: '你长大的地方。炉火噼啪作响，艾琳坐在窗边擦拭她的弓。外面天快黑了。',
        actions: [
          { label: '与艾琳对话', type: 'talk', target: 'ailin' },
        ],
        exits: ['灰烟村_酒馆', '灰烟村_铁匠铺', '灰烟村_荒地', '灰烟村_矿脉'],
      },
      // ===== 灰烟村·酒馆 =====
      '灰烟村_酒馆': {
        id: 'greyVillage_tavern',
        type: 'safe',
        name: '酒馆',
        desc: '温暖的酒馆，飘着麦酒和烤肉的香气。墙上挂着一张旧地图，边角已经泛黄。',
        actions: [
          { label: '休息（恢复HP/MP）', type: 'rest' },
          { label: '查看旧地图', type: 'inspect', target: 'old_map' },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·铁匠铺 =====
      '灰烟村_铁匠铺': {
        id: 'greyVillage_blacksmith',
        type: 'safe',
        name: '铁匠铺',
        desc: '叮叮当当的打铁声不绝于耳。铁匠老哈正在炉前锻造，火花四溅。',
        actions: [
          { label: '与铁匠老哈交谈', type: 'talk', target: 'blacksmith' },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·村边荒地（战斗帧·6只野狗）=====
      '灰烟村_荒地': {
        id: 'greyVillage_wasteland',
        type: 'wild',
        name: '村边荒地',
        desc: '酒馆后面的荒地。杂草丛生，几块散落的石头露在地表。远处传来野狗低沉的咆哮声——一群野狗正在垃圾堆间游荡，数量不少。',
        actions: [
          { label: '迎战野狗群', type: 'battle', enemies: ['野狗','野狗','野狗','野狗','野狗','野狗'] },
        ],
        exits: ['灰烟村'],
      },
      // ===== 灰烟村·石头矿脉（采集帧）=====
      '灰烟村_矿脉': {
        id: 'greyVillage_mine',
        type: 'wild',
        name: '村边矿脉',
        desc: '一小块裸露的岩石层，能看到一些石头矿脉。老奎说这里以前出产过铁矿石，现在只剩些普通石头了。',
        actions: [
          { label: '采集石头', type: 'gather', target: '石头', amount: 3 },
          { label: '挂机采集', type: 'idle_gather', target: '石头' },
        ],
        exits: ['灰烟村'],
      },
    };
  }

  // ========== 敌人数据 ==========
  buildEnemyData() {
    return {
      '野狗': { name: '野狗', level: 2, hp: 30, maxHp: 30, attack: 5, defense: 2, speed: 10, exp: 30, gold: 6, drop: { name: '狗牙', type: 'material', rarity: 'white' } },
      '野兔': { name: '野兔', level: 1, hp: 15, maxHp: 15, attack: 3, defense: 1, speed: 15, exp: 8, gold: 2 },
      '野鸭': { name: '野鸭', level: 1, hp: 20, maxHp: 20, attack: 5, defense: 1, speed: 12, exp: 10, gold: 3 },
      '螃蟹': { name: '螃蟹', level: 1, hp: 25, maxHp: 25, attack: 6, defense: 5, speed: 5, exp: 12, gold: 4 },
    };
  }

  // ========== 进入场景 ==========
  enterScene(sceneName) {
    console.log('[场景] 进入:', sceneName);
    const scene = this.scenes[sceneName];
    if (!scene) {
      console.error('[场景] 场景不存在:', sceneName);
      return;
    }
    this.currentScene = scene;

    // 更新玩家位置
    if (window.gameApp && window.gameApp.state) {
      window.gameApp.state.player.location = scene.name;
    }

    const event = new CustomEvent('scene-change', { detail: { scene: scene } });
    document.dispatchEvent(event);
  }

  // ========== 触发战斗（手动）==========
  triggerBattle(enemyNames) {
    console.log('[战斗] 触发战斗，敌人:', enemyNames.join(', '));
    const player = this.getPlayerData();
    if (!player) {
      console.error('[战斗] 没有玩家数据');
      return;
    }

    // 构建敌人单位
    const enemies = enemyNames.map((name, i) => {
      const data = this.enemyData[name];
      if (!data) {
        console.error('[战斗] 找不到敌人数据:', name);
        return null;
      }
      return {
        ...data,
        id: 'enemy_' + Date.now() + '_' + i,
        status: 'normal',
        hp: data.hp,
        maxHp: data.maxHp,
      };
    }).filter(e => e !== null);

    if (enemies.length === 0) {
      console.error('[战斗] 没有有效敌人');
      return;
    }

    // 构建己方队伍（主角 + 随从）
    const allies = this.getAllyUnits();

    const combat = new CombatEngine();
    window.currentCombat = combat;
    this.currentCombat = combat;
    combat.startCombat(player, allies, enemies);
  }

  // ========== 获取玩家战斗数据 ==========
  getPlayerData() {
    try {
      if (window.gameApp && window.gameApp.state && window.gameApp.state.player) {
        const p = window.gameApp.state.player;
        // 确保战斗属性存在
        p.maxHp = p.maxHp || 100;
        p.hp = p.hp || p.maxHp;
        p.maxMp = p.maxMp || 30;
        p.mp = p.mp || p.maxMp;
        p.speed = p.speed || 10;
        p.attack = p.attack || 10;
        p.defense = p.defense || 5;
        return p;
      }
      return null;
    } catch (e) {
      console.error('[战斗] 获取玩家失败:', e);
      return null;
    }
  }

  // ========== 获取随从战斗数据 ==========
  getAllyUnits() {
    try {
      if (window.gameApp && window.gameApp.state && window.gameApp.state.companions) {
        return window.gameApp.state.companions.filter(c => c.alive !== false).map(c => {
          return {
            id: c.id,
            name: c.name,
            level: c.level || 1,
            hp: c.hp || 80,
            maxHp: c.maxHp || 80,
            mp: c.mp || 20,
            maxMp: c.maxMp || 20,
            attack: c.attack || 8,
            defense: c.defense || 3,
            speed: c.speed || 8,
            isCompanion: true,
            status: 'normal',
          };
        });
      }
      return [];
    } catch (e) {
      console.error('[随从] 获取随从失败:', e);
      return [];
    }
  }

  // ========== 采集资源 ==========
  gather(target, amount) {
    console.log('[采集] 采集:', target, 'x' + amount);
    const item = {
      id: Utils.uuid(),
      name: target,
      type: 'material',
      rarity: 'white',
      level: 1,
      stack: amount,
    };
    if (window.gameApp && window.gameApp.state) {
      const result = StateUtils.addToInventory(window.gameApp.state, item);
      if (result.ok) {
        const msg = `采集获得 ${target} x${amount}`;
        this.showLog(msg);
      } else {
        this.showLog(result.reason || '背包已满');
      }
    }
  }

  // ========== 休息恢复 ==========
  rest() {
    if (window.gameApp && window.gameApp.state) {
      const p = window.gameApp.state.player;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.showLog('你好好休息了一觉，HP和MP已完全恢复。');
      window.gameApp.updatePlayerInfo();
    }
  }

  // ========== 显示日志 ==========
  showLog(message) {
    const event = new CustomEvent('game-log', { detail: { message } });
    document.dispatchEvent(event);
  }

  // ========== Getters ==========
  getCurrentScene() { return this.currentScene; }
  getScenes() { return this.scenes; }
  getExits() { return this.currentScene ? this.currentScene.exits || [] : []; }
}
