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
        exits: ['灰烟村_酒馆', '灰烟村_铁匠铺', '灰烟村_荒地', '灰烟村_矿脉', '灰烟村_药草园', '灰烟村_村长家', '灰烟村_鱼塘', '灰烟村_杂货铺', '灰烟村_练功场', '灰烟村_后山小径'],
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

      // ===== 灰烟村·药草园（采集帧）=====
      '灰烟村_药草园': {
        id: 'greyVillage_herbGarden',
        type: 'wild',
        name: '药草园',
        desc: '村西头一片用篱笆围起来的小园子，里面种着各种药草。空气中弥漫着苦涩的草药味，几株不知名的野花在角落里顽强地开着。偶尔能看到毒蛇在草丛中穿梭。',
        actions: [
          { label: '采集草药', type: 'gather', target: '草药', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '草药' },
          { label: '驱赶毒蛇', type: 'battle', enemies: ['毒蛇', '毒蛇'] },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·村长家（对话帧）=====
      '灰烟村_村长家': {
        id: 'greyVillage_chiefHouse',
        type: 'safe',
        name: '村长家',
        desc: '村中心一栋比其他房屋都宽敞的砖房。门口挂着褪色的匾额，上面依稀写着"济世堂"三个字。村长老奎正坐在堂前的太师椅上，手里捻着一串旧念珠，眉头紧锁。',
        actions: [
          { label: '与村长老奎对话', type: 'talk', target: 'chief_kui' },
          { label: '查看墙上的家谱', type: 'inspect', target: 'family_tree' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·村东鱼塘（采集帧）=====
      '灰烟村_鱼塘': {
        id: 'greyVillage_fishPond',
        type: 'wild',
        name: '村东鱼塘',
        desc: '村子东边的一口天然鱼塘，水面碧绿，倒映着远处灰蒙蒙的山脊。塘边水草丰茂，几只野鸭在水面悠闲地游荡。偶尔能看到螃蟹在浅滩处吐泡泡。',
        actions: [
          { label: '抓螃蟹', type: 'battle', enemies: ['螃蟹', '螃蟹', '螃蟹'] },
          { label: '采集水草', type: 'gather', target: '水草', amount: 2 },
          { label: '挂机采集', type: 'idle_gather', target: '水草' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·杂货铺（对话帧·可触发商店）=====
      '灰烟村_杂货铺': {
        id: 'greyVillage_grocery',
        type: 'safe',
        name: '杂货铺',
        desc: '一间拥挤但收拾得井井有条的小铺子。货架上摆满了日用品、干粮和一些廉价的药水。掌柜是个精明的中年女人，人称"三婶"，据说什么都有货。',
        actions: [
          { label: '与三婶攀谈', type: 'talk', target: 'grocery_sanshen' },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·练功场（战斗帧·切磋）=====
      '灰烟村_练功场': {
        id: 'greyVillage_trainingGround',
        type: 'wild',
        name: '练功场',
        desc: '村子北面一块平整的沙地，几根木桩上插着磨损的草靶。几个村中练兵正在这里操练，旁边立着一块木牌，上面写着"擅入切磋，自负伤损"。',
        actions: [
          { label: '向练兵切磋', type: 'battle', enemies: ['练兵'] },
          { label: '挑战全场练兵', type: 'battle', enemies: ['练兵', '练兵', '练兵'] },
        ],
        exits: ['灰烟村'],
      },

      // ===== 灰烟村·后山小径（战斗帧·山贼）=====
      '灰烟村_后山小径': {
        id: 'greyVillage_mountainTrail',
        type: 'wild',
        name: '后山小径',
        desc: '一条通往后山的狭窄土路，两侧灌木丛生，视线受阻。地上散落着几个被丢弃的包袱和碎布条——看来山贼经常在此出没，劫路过往的行人。',
        actions: [
          { label: '清剿山贼', type: 'battle', enemies: ['山贼', '山贼'] },
          { label: '查看丢弃的包袱', type: 'inspect', target: 'abandoned_bag' },
          { label: '采集灌木果子', type: 'gather', target: '野果', amount: 1 },
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
      // ===== 灰烟村扩展敌人 =====
      '毒蛇': { name: '毒蛇', level: 2, hp: 22, maxHp: 22, attack: 8, defense: 2, speed: 13, exp: 25, gold: 5, drop: { name: '蛇皮', type: 'material', rarity: 'white' } },
      '练兵': { name: '村练兵', level: 3, hp: 50, maxHp: 50, attack: 9, defense: 6, speed: 8, exp: 40, gold: 12, drop: { name: '练功牌', type: 'material', rarity: 'green' } },
      '山贼': { name: '山贼', level: 3, hp: 45, maxHp: 45, attack: 11, defense: 4, speed: 9, exp: 45, gold: 18, drop: { name: '山贼令牌', type: 'material', rarity: 'green' } },
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
          // 根据职业分配AI策略
          var aiStrategy = c.aiStrategy || 'balanced';
          if (!c.aiStrategy && c.class) {
            if (c.class === 'warrior') aiStrategy = 'aggressive';
            else if (c.class === 'mage') aiStrategy = 'healer';
            else aiStrategy = 'balanced';
          }
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
            aiStrategy: aiStrategy,
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

  // ========== 挂机采集系统 ==========
  // 模拟多次采集循环，有概率遇到敌人或发现稀有物品
  idleGather(target, cycles) {
    var totalCycles = cycles || 8;
    var results = {
      target: target,
      cycles: totalCycles,
      itemsGathered: 0,
      goldFound: 0,
      enemiesEncountered: 0,
      enemyDefeated: 0,
      rareFinds: [],
      log: [],
    };

    console.log('[挂机采集] 开始，目标:', target, '循环数:', totalCycles);

    for (var i = 1; i <= totalCycles; i++) {
      var roll = Math.random();
      var cycleLog = '第' + i + '轮：';

      if (roll < 0.70) {
        // 70%：采集成功
        var amount = 1 + Math.floor(Math.random() * 3); // 1-3个
        var item = {
          id: Utils.uuid(),
          name: target,
          type: 'material',
          rarity: 'white',
          level: 1,
          stack: amount,
        };
        if (window.gameApp && window.gameApp.state) {
          var addResult = StateUtils.addToInventory(window.gameApp.state, item);
          if (addResult.ok) {
            results.itemsGathered += amount;
            cycleLog += '采集获得 ' + target + ' x' + amount;
          } else {
            cycleLog += '背包已满，采集中断';
            results.log.push(cycleLog);
            break;
          }
        } else {
          results.itemsGathered += amount;
          cycleLog += '采集获得 ' + target + ' x' + amount;
        }
      } else if (roll < 0.85) {
        // 15%：遇到敌人（自动战斗，简化处理）
        results.enemiesEncountered++;
        var enemyAtk = 5 + Math.floor(Math.random() * 5);
        var enemyHp = 20 + Math.floor(Math.random() * 20);
        var playerAtk = 10;
        if (window.gameApp && window.gameApp.state) {
          playerAtk = window.gameApp.state.player.attack || 10;
        }
        // 简化自动战斗
        var rounds = Math.ceil(enemyHp / Math.max(1, playerAtk));
        var playerDmg = Math.floor(enemyAtk * rounds * 0.6);
        if (window.gameApp && window.gameApp.state) {
          window.gameApp.state.player.hp = Math.max(1, window.gameApp.state.player.hp - playerDmg);
        }
        var goldReward = 3 + Math.floor(Math.random() * 8);
        if (window.gameApp && window.gameApp.state) {
          StateUtils.addGold(window.gameApp.state, goldReward);
        }
        results.goldFound += goldReward;
        results.enemyDefeated++;
        cycleLog += '遇到敌人！战斗胜利，获得 ' + goldReward + ' 金币，损失 ' + playerDmg + ' HP';
      } else if (roll < 0.95) {
        // 10%：发现金币
        var gold = 2 + Math.floor(Math.random() * 6);
        if (window.gameApp && window.gameApp.state) {
          StateUtils.addGold(window.gameApp.state, gold);
        }
        results.goldFound += gold;
        cycleLog += '发现 ' + gold + ' 金币';
      } else {
        // 5%：发现稀有物品
        var rareItem = {
          id: Utils.uuid(),
          name: '精炼' + target,
          type: 'material',
          rarity: 'green',
          level: 1,
          stack: 1,
        };
        if (window.gameApp && window.gameApp.state) {
          var rareResult = StateUtils.addToInventory(window.gameApp.state, rareItem);
          if (rareResult.ok) {
            results.rareFinds.push(rareItem.name);
            cycleLog += '✨ 发现稀有物品：' + rareItem.name;
          } else {
            cycleLog += '背包已满，无法拾取稀有物品';
          }
        } else {
          results.rareFinds.push(rareItem.name);
          cycleLog += '✨ 发现稀有物品：' + rareItem.name;
        }
      }

      results.log.push(cycleLog);
    }

    // 更新玩家信息
    if (window.gameApp && window.gameApp.updatePlayerInfo) {
      window.gameApp.updatePlayerInfo();
    }

    console.log('[挂机采集] 完成', results);
    return results;
  }

  // ========== 与NPC对话（委托给DialogueSystem）==========
  talkTo(npcId) {
    if (DialogueSystem) {
      DialogueSystem.startDialogue(npcId);
    } else {
      console.warn('[场景] DialogueSystem 未加载，无法与NPC对话:', npcId);
      this.showLog('对话系统不可用。');
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
