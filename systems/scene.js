const SceneSystem = {

  // ========== 灰烟村场景定义 ==========
  scenes: {
    "greyVillage_tavern": {
      id: "greyVillage_tavern",
      name: "酒馆",
      fullName: "灰烟村·酒馆",
      zone: "greyVillage",
      type: "safe",
      desc: "你长大的地方。炉火噼啪作响。艾琳坐在窗边，擦拭她的弓。外面天快黑了。",
      npcs: ["ailin"],
      exits: ["greyVillage_smith", "greyVillage_tailor", "greyVillage_market", "greyVillage_graveyard"],
      objects: [
        { name: "炉火", desc: "温暖的火光", interact: "rest" },
      ],
      mapPos: { x: 2, y: 2 },
    },
    "greyVillage_smith": {
      id: "greyVillage_smith",
      name: "铁匠铺",
      fullName: "灰烟村·铁匠铺",
      zone: "greyVillage",
      type: "safe",
      desc: "铁匠老哈正在打铁。火星四溅。他抬头看了你一眼，没有说话。",
      npcs: ["smith"],
      exits: ["greyVillage_tavern", "greyVillage_market"],
      mapPos: { x: 1, y: 2 },
    },
    "greyVillage_tailor": {
      id: "greyVillage_tailor",
      name: "裁缝铺",
      fullName: "灰烟村·裁缝铺",
      zone: "greyVillage",
      type: "safe",
      desc: "玛莎在做斗篷。学徒小柯在一旁打下手。\"这料子……是从城里带来的。\"",
      npcs: ["martha", "xiaoke"],
      exits: ["greyVillage_tavern", "greyVillage_market"],
      mapPos: { x: 3, y: 2 },
    },
    "greyVillage_market": {
      id: "greyVillage_market",
      name: "集市",
      fullName: "灰烟村·集市",
      zone: "greyVillage",
      type: "safe",
      desc: "杂货店米拉在叫卖。老农夫伍德在卖菜。瞎眼老霍坐在角落里。",
      npcs: ["mira", "wood", "blindHuo"],
      exits: ["greyVillage_smith", "greyVillage_tailor", "greyVillage_leather", "greyVillage_doctor", "greyVillage_gate"],
      mapPos: { x: 2, y: 1 },
    },
    "greyVillage_leather": {
      id: "greyVillage_leather",
      name: "皮匠铺",
      fullName: "灰烟村·皮匠铺",
      zone: "greyVillage",
      type: "safe",
      desc: "皮匠诺恩在鞣制皮革。\"这皮……不是普通的皮。\"",
      npcs: ["nuoen"],
      exits: ["greyVillage_market"],
      mapPos: { x: 1, y: 1 },
    },
    "greyVillage_doctor": {
      id: "greyVillage_doctor",
      name: "村医屋",
      fullName: "灰烟村·村医屋",
      zone: "greyVillage",
      type: "safe",
      desc: "蕾娜在整理药材。\"你父母走之前，来我这儿拿了些止痛药。\"",
      npcs: ["leina"],
      exits: ["greyVillage_market"],
      mapPos: { x: 3, y: 1 },
    },
    "greyVillage_graveyard": {
      id: "greyVillage_graveyard",
      name: "墓地",
      fullName: "灰烟村·墓地",
      zone: "greyVillage",
      type: "safe",
      desc: "父母的墓碑在这里。\"埃德蒙 & 莉娜\"。风吹过，带来远处的松涛声。",
      npcs: [],
      exits: ["greyVillage_tavern"],
      objects: [
        { name: "墓碑", desc: "埃德蒙 & 莉娜", interact: "mourn" },
      ],
      mapPos: { x: 2, y: 3 },
    },
    "greyVillage_gate": {
      id: "greyVillage_gate",
      name: "村口",
      fullName: "灰烟村·村口",
      zone: "greyVillage",
      type: "transition",
      desc: "通往灰烬山脉的路。村长站在门口，背着手，像在等你。",
      npcs: ["chief"],
      exits: ["greyVillage_market"],
      condition: { type: "gatekeeper", id: "villageChief", defeated: true, message: "村长拦住了你：\"你还不够强。\"" },
      mapPos: { x: 2, y: 0 },
    },
  },

  // ========== 小地图网格配置 ==========
  mapGrid: {
    width: 5,
    height: 5,
    cells: [
      [null, null, "greyVillage_gate", null, null],
      ["greyVillage_leather", "greyVillage_smith", "greyVillage_market", "greyVillage_doctor", "greyVillage_tailor"],
      [null, null, "greyVillage_tavern", null, null],
      [null, null, "greyVillage_graveyard", null, null],
      [null, null, null, null, null],
    ],
  },

  // ========== 场景操作 ==========

  getCurrentScene(state) {
    return this.scenes[state.player.location] || this.scenes["greyVillage_tavern"];
  },

  moveTo(state, sceneId) {
    const current = this.getCurrentScene(state);
    const target = this.scenes[sceneId];
    if (!target) return { ok: false, reason: "场景不存在" };
    if (!current.exits.includes(sceneId)) return { ok: false, reason: "无法到达" };

    if (target.condition) {
      const check = this.checkCondition(state, target.condition);
      if (!check.ok) return { ok: false, reason: check.message };
    }

    state.player.location = sceneId;
    state.player.zone = target.zone;
    state.world.currentZone = target.zone;
    state.world.currentLocation = target.name;

    if (target.type === "safe") {
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
      for (const comp of state.companions) {
        if (comp.alive) { comp.hp = comp.maxHp; comp.mp = comp.maxMp; }
      }
    }

    return { ok: true, scene: target };
  },

  checkCondition(state, condition) {
    if (condition.type === "gatekeeper") {
      const gk = state.world.gatekeepers[condition.id];
      if (!gk || !gk.defeated) {
        return { ok: false, message: condition.message };
      }
    }
    return { ok: true };
  },

  interact(state, objectName) {
    const scene = this.getCurrentScene(state);
    const obj = scene.objects?.find(o => o.name === objectName);
    if (!obj) return { ok: false, reason: "该物品不存在" };

    switch (obj.interact) {
      case "rest":
        state.player.hp = state.player.maxHp;
        state.player.mp = state.player.maxMp;
        return { ok: true, message: "你在炉火旁休息，恢复了全部生命和法力。" };
      case "mourn":
        return { ok: true, message: "你在墓碑前默哀。\"我会找到真相的。\"" };
      default:
        return { ok: true, message: `你检查了${obj.name}。` };
    }
  },

  talkToNpc(state, npcId) {
    const npc = DATA.npcs[npcId];
    if (!npc) return { ok: false, reason: "NPC不存在" };

    const dialogues = {
      ailin: [
        "\"我要去找我爹娘。你跟我走吗？\"",
        "\"这把弓是我爹留下的。我会用它保护你。\"",
        "\"你锁上酒馆的门了吗？那我们就出发吧。\"",
      ],
      chief: [
        "\"你长得真像你爹。\"",
        "\"答应我，活着回来。\"",
        "\"外面的世界……比你想象的复杂。\"",
        "\"你还不够强。再练练吧。\"",
      ],
      smith: [
        "\"打把好剑需要时间，也需要好矿石。\"",
        "\"你爹以前常来我这儿修剑。\"",
      ],
      martha: [
        "\"你父母的斗篷是我做的。很暖和。\"",
        "\"小柯是从城里来的，他知道很多外面的事。\"",
      ],
      xiaoke: [
        "\"城里的衣服……和这里不一样。\"",
        "\"你想看看外面的衣服吗？\"",
      ],
      leina: [
        "\"你父母走之前，来我这儿拿了些止痛药。\"",
        "\"他们……看起来像是知道要去很远的地方。\"",
      ],
      mira: [
        "\"你爹以前赊过账。不过不用还了。\"",
        "\"要点什么？我这儿什么都有。\"",
      ],
      wood: [
        "\"我见过你父母最后一面。\"",
        "\"他们走得很……安静。不像是要去死的人。\"",
      ],
      blindHuo: [
        "\"听脚步声……是你啊，酒馆小子。\"",
        "\"你爹的脚步声……我到现在还记得。\"",
      ],
      nuoen: [
        "\"这皮……不是普通的皮。\"",
        "\"你见过插着金属管的野猪吗？\"",
      ],
    };

    const lines = dialogues[npcId] || [`\"${npc.name}看着你，没有说话。\"`];
    const line = lines[Utils.randInt(0, lines.length - 1)];

    return { ok: true, npc: npc.name, text: line };
  },

  // ========== 小地图数据 ==========

  getMapData(state) {
    const current = this.getCurrentScene(state);
    const data = [];
    
    for (let y = 0; y < this.mapGrid.height; y++) {
      const row = [];
      for (let x = 0; x < this.mapGrid.width; x++) {
        const sceneId = this.mapGrid.cells[y]?.[x];
        if (!sceneId) {
          row.push({ type: "empty" });
          continue;
        }
        const scene = this.scenes[sceneId];
        const isCurrent = sceneId === state.player.location;
        const isExit = current.exits.includes(sceneId);
        row.push({
          type: isCurrent ? "current" : (isExit ? "exit" : "known"),
          sceneId,
          name: scene.name,
          fullName: scene.fullName,
        });
      }
      data.push(row);
    }
    return data;
  },

  // ========== 野外战斗（灰烟村没有，预留接口）==========

  spawnEnemies(scene, playerLevel) {
    if (scene.zone !== "greyVillage") {
      // 灰烟村没有野外敌人
      const enemies = [];
      for (let i = 0; i < Utils.randInt(1, 3); i++) {
        enemies.push(Utils.generateMonster(playerLevel, "normal"));
      }
      return enemies.slice(0, DATA.combat.maxUnitsEnemy);
    }
    return [];
  },
};

try { module.exports = SceneSystem; } catch(e) {}
