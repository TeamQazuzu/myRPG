class SceneManager {
  constructor() {
    this.scenes = {};
    this.currentScene = null;
    this._initScenes();
  }

  _initScenes() {
    this.scenes = {
      '灰烟村': {
        id: 'greyVillage', type: 'safe', name: '灰烟村',
        desc: '你长大的地方。炉火噼啪作响，艾琳坐在窗边擦拭她的弓。外面天快黑了。',
        exits: ['酒馆', '铁匠铺', '裁缝铺', '集市', '基地', '墓地', '荒地', '树林', '河边'],
        npcs: ['ailin', 'blacksmithApprentice', 'herbalist'],
      },
      '酒馆': {
        id: 'greyVillage_tavern', type: 'safe', name: '酒馆',
        desc: '温暖的酒馆，飘着麦酒和烤肉的香气。墙上挂着旧地图。',
        exits: ['灰烟村'],
        npcs: ['ailin'],
      },
      '铁匠铺': {
        id: 'greyVillage_blacksmith', type: 'safe', name: '铁匠铺',
        desc: '叮叮当当的打铁声，老铁匠正在锻造一把长剑。',
        exits: ['灰烟村'],
        npcs: ['blacksmithApprentice'],
      },
      '裁缝铺': {
        id: 'greyVillage_tailor', type: 'safe', name: '裁缝铺',
        desc: '各色布料堆满柜台，裁缝正在缝制一件皮甲。',
        exits: ['灰烟村'],
      },
      '集市': {
        id: 'greyVillage_market', type: 'safe', name: '集市',
        desc: '人来人往的集市，各种货物琳琅满目。',
        exits: ['灰烟村'],
        npcs: ['hunter'],
      },
      '基地': {
        id: 'greyVillage_base', type: 'safe', name: '基地',
        desc: '你的小窝，虽然简陋但很安心。墙上挂着旧地图。',
        exits: ['灰烟村'],
      },
      '墓地': {
        id: 'greyVillage_graveyard', type: 'safe', name: '墓地',
        desc: '村外的小墓地，安静而肃穆。',
        exits: ['灰烟村'],
      },
      '荒地': {
        id: 'greyVillage_wasteland', type: 'wild', name: '荒地',
        desc: '荒芜的野地，野狗在垃圾堆间游荡。',
        enemies: ['wolf', 'wolf', 'hare'],
        level: 1,
        exits: ['灰烟村'],
      },
      '树林': {
        id: 'greyVillage_forest', type: 'wild', name: '树林',
        desc: '稀疏的树林，偶尔有野兔窜过。',
        enemies: ['hare', 'hare', 'wolf'],
        level: 1,
        exits: ['灰烟村'],
      },
      '河边': {
        id: 'greyVillage_river', type: 'wild', name: '河边',
        desc: '潺潺的河水，水边有野鸭栖息。',
        enemies: ['duck', 'crab'],
        level: 1,
        exits: ['灰烟村'],
      },
      '山脚洞': {
        id: 'ashMountains_cave', type: 'wild', name: '山脚洞',
        desc: '山脚下的洞穴，回荡着诡异的声响。',
        enemies: ['bandit', 'skeleton', 'wolf'],
        level: 20,
        exits: ['灰烟村'],
      },
    };
  }

  enterScene(sceneName) {
    let scene = this.scenes[sceneName];
    if (!scene && sceneName.includes('·')) {
      const parts = sceneName.split('·');
      scene = this.scenes[parts[parts.length - 1]];
    }
    if (!scene) {
      console.error('[场景] 场景不存在:', sceneName);
      return;
    }
    const actualName = Object.keys(this.scenes).find(k => this.scenes[k] === scene);
    this.currentScene = scene;
    const app = window.gameApp;
    if (app && app.state) {
      app.state.player.location = actualName;
    }
    document.dispatchEvent(new CustomEvent('scene-change', { detail: { scene } }));
    if (scene.type === 'wild' && scene.enemies && scene.enemies.length > 0) {
      setTimeout(() => this.triggerBattle(scene.enemies), 500);
    }
  }

  triggerBattle(enemyKeys) {
    const app = window.gameApp;
    if (!app || !app.state) return;
    const state = app.state;

    const playerUnit = this._getPlayerBattleUnit(state);
    const allyUnits = CompanionSystem.getCompanionsForBattle(state).map(c => CompanionSystem.syncToBattleUnit(state, c.id));
    const enemyUnits = enemyKeys.map(key => this._createEnemyUnit(key));
    if (enemyUnits.length === 0) return;

    const combat = new CombatEngine();
    window.currentCombat = combat;
    app.combatEngine = combat;
    combat.start(state, playerUnit, allyUnits, enemyUnits);
  }

  _getPlayerBattleUnit(state) {
    const stats = StateUtils.getPlayerCombatStats(state);
    const classData = DATA.classes[state.player.classPath[0]];
    const skills = classData ? classData.getSkills(state.player.level, state.player.elementSpec) : [];
    return {
      unitId: "player",
      name: state.player.name,
      side: "player",
      class: state.player.class,
      classPath: state.player.classPath,
      level: state.player.level,
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      mp: state.player.mp,
      maxMp: state.player.maxMp,
      physAtk: stats.physAtk,
      physDef: stats.physDef,
      magAtk: stats.magAtk,
      speed: stats.speed,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      hit: stats.hit,
      dodge: stats.dodge,
      skills: skills,
      skillPreset: state.player.skillPreset,
      alive: true,
      cooldowns: {},
      combatMode: state.player.combatMode,
      autoMode: state.player.autoMode,
    };
  }

  _createEnemyUnit(key) {
    let data = DATA.monsters[key];
    const isGatekeeper = !data && DATA.gatekeepers[key];
    if (isGatekeeper) {
      const gk = DATA.gatekeepers[key];
      const combat = gk.combat || {};
      data = {
        name: gk.name,
        level: gk.level,
        hp: combat.hp || 100,
        atk: combat.atk || combat.armor || 10,
        def: combat.armor || 5,
        speed: 8,
        exp: gk.level * 20,
        gold: gk.level * 10,
      };
    }
    if (!data) {
      return {
        unitId: 'e_' + Math.random().toString(36).substr(2, 6),
        monsterKey: key,
        name: key, side: "enemy", level: 1,
        hp: 30, maxHp: 30, atk: 5, def: 2, speed: 5,
        physAtk: 5, physDef: 2, skills: [], skillPreset: [],
      };
    }
    const id = 'e_' + Math.random().toString(36).substr(2, 6);
    return {
      unitId: id,
      monsterKey: key,
      name: data.name,
      side: "enemy",
      level: data.level,
      hp: data.hp, maxHp: data.hp,
      mp: 30, maxMp: 30,
      physAtk: data.atk,
      physDef: data.def,
      speed: data.speed,
      critRate: 0.05,
      critDmg: 1.5,
      hit: data.level * 5,
      dodge: data.level * 2,
      skills: [],
      skillPreset: [],
    };
  }

  getScene(sceneName) {
    return this.scenes[sceneName];
  }

  getCurrentScene() {
    return this.currentScene;
  }

  getScenes() {
    return this.scenes;
  }
}
