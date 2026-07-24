const DATA = {
  // ========== 版本 ==========
  version: "1.0.0",

  // ========== 六维属性定义 ==========
  attributes: {
    str: { name: "力量", desc: "物理伤害", perPoint: { physAtk: 2, physDef: 1 } },
    agi: { name: "敏捷", desc: "命中/闪避/速度", perPoint: { hit: 1.5, dodge: 1, speed: 0.8 } },
    int: { name: "智力", desc: "法术伤害/治疗", perPoint: { magAtk: 2, magDef: 1 } },
    vit: { name: "体质", desc: "总血量", perPoint: { hp: 10, hpRegen: 0.3 } },
    ten: { name: "坚韧", desc: "全防御", perPoint: { allDef: 3, tenacity: 1 } },
    spi: { name: "精神", desc: "法力", perPoint: { mp: 5, magDef: 2 } },
  },

  // ========== 职业系统 ==========
  classes: {
    warrior: {
      name: "战士",
      tiers: ["见习战士", "战士", "精锐战士", "战神"],
      coreAttr: ["str", "vit"],
      dmgType: "physical",
      armor: ["cloth", "leather", "mail", "plate"],
      weapons: ["sword", "axe", "hammer", "shield"],
      skills: {
        20: ["盾墙", "猛击"],
        40: ["战吼", "破甲斩"],
        60: ["铁壁", "处决"],
        80: ["战神降临"],
      },
    },
    ranger: {
      name: "游侠",
      tiers: ["见习游侠", "游侠", "精锐游侠", "风行者"],
      coreAttr: ["agi"],
      dmgType: "physical",
      armor: ["cloth", "leather", "mail"],
      weapons: ["bow", "crossbow", "dagger"],
      skills: {
        20: ["连射", "减速箭"],
        40: ["穿透箭", "连环射击"],
        60: ["狙击", "箭雨"],
        80: ["风行者"],
      },
    },
    mage: {
      name: "法师",
      tiers: ["见习法师", "法师", "大法师", "元素主宰"],
      coreAttr: ["int", "spi"],
      dmgType: "magic",
      armor: ["cloth"],
      weapons: ["staff", "wand"],
      branches: {
        fire: { name: "火焰", dmgType: "fire", skills: { 20: ["火球"], 40: ["火焰风暴"], 60: ["陨石"], 80: ["元素主宰·火"] } },
        frost: { name: "冰霜", dmgType: "frost", skills: { 20: ["冰箭"], 40: ["冰霜新星"], 60: ["暴风雪"], 80: ["元素主宰·冰"] } },
        lightning: { name: "雷电", dmgType: "lightning", skills: { 20: ["雷击"], 40: ["连锁闪电"], 60: ["天雷"], 80: ["元素主宰·雷"] } },
        heal: { name: "治疗", dmgType: null, skills: { 20: ["治疗术"], 40: ["群体治疗"], 60: ["净化", "护盾"], 80: ["元素主宰·愈"] } },
      },
    },
  },

  // ========== 伤害类型 ==========
  damageTypes: {
    physical: { name: "物理", status: "bleed", statusName: "流血", statusDesc: "每回合损失攻击力×0.3生命，持续3回合", duration: 3, stackable: false },
    fire: { name: "火焰", status: "burn", statusName: "灼烧", statusDesc: "每回合损失攻击力×0.4生命，持续3回合", duration: 3, stackable: true, maxStacks: 2 },
    frost: { name: "冰霜", status: "slow", statusName: "减速", statusDesc: "技能冷却+1回合，持续2回合", duration: 2, stackable: false },
    lightning: { name: "雷电", status: "stun", statusName: "僵直", statusDesc: "速度-30%，持续1回合", duration: 1, stackable: false },
  },

  // ========== 装备颜色定义 ==========
  rarity: {
    white:  { name: "白色", tier: 0, minAffixes: 0, maxAffixes: 0, color: "#cccccc" },
    green:  { name: "绿色", tier: 1, minAffixes: 1, maxAffixes: 2, color: "#4caf50" },
    blue:   { name: "蓝色", tier: 2, minAffixes: 2, maxAffixes: 3, color: "#2196f3" },
    purple: { name: "紫色", tier: 3, minAffixes: 3, maxAffixes: 4, color: "#9c27b0" },
    orange: { name: "橙色", tier: 4, minAffixes: 4, maxAffixes: 5, color: "#ff9800" },
    red:    { name: "红色", tier: 5, minAffixes: 6, maxAffixes: 6, color: "#f44336" },
    gold:   { name: "金色", tier: 6, minAffixes: 3, maxAffixes: 3, color: "#ffd700" }, // 传家宝专用
  },

  // ========== 装备承载上限 ==========
  equipLimits: [
    { levelRange: [1, 20],   maxRarity: "blue",   sameColorMax: 2 },
    { levelRange: [21, 40], maxRarity: "purple", sameColorMax: 2 },
    { levelRange: [41, 60], maxRarity: "orange", sameColorMax: 2 },
    { levelRange: [61, 80], maxRarity: "red",    sameColorMax: 2 },
    { levelRange: [81, 99], maxRarity: "red",    sameColorMax: 99 },
  ],

  // ========== 装备槽位 ==========
  equipSlots: [
    "weapon", "offhand", "helmet", "chest", "legs",
    "boots", "gloves", "necklace", "ring1", "ring2",
  ],

  // ========== 装备词条池（80条·四系重构版）==========
  affixPool: {
    // 攻击类（24条）
    sharp:      { name: "锋锐",    effect: "physDmg",    value: 0.03,  minRarity: "green",  type: "attack" },
    heavy:      { name: "重击",    effect: "physDmg",    value: 0.06,  minRarity: "blue",   type: "attack" },
    shatter:    { name: "碎甲",    effect: "physDmg",    value: 0.10,  minRarity: "purple", type: "attack" },
    rend:       { name: "裂刃",    effect: "physDmg",    value: 0.15,  minRarity: "orange", type: "attack" },
    breakSteel: { name: "断钢",    effect: "physDmg",    value: 0.20,  minRarity: "red",    type: "attack" },
    flame:      { name: "烈焰",    effect: "fireDmg",    value: 0.03,  minRarity: "green",  type: "attack" },
    blaze:      { name: "焚火",    effect: "fireDmg",    value: 0.06,  minRarity: "blue",   type: "attack" },
    inferno:    { name: "烈火",    effect: "fireDmg",    value: 0.10,  minRarity: "purple", type: "attack" },
    explosion:  { name: "炎爆",    effect: "fireDmg",    value: 0.15,  minRarity: "orange", type: "attack" },
    phoenix:    { name: "凤凰",    effect: "fireDmg",    value: 0.20,  minRarity: "red",    type: "attack" },
    frostbite:  { name: "霜寒",    effect: "frostDmg",   value: 0.03,  minRarity: "green",  type: "attack" },
    winter:     { name: "凛冬",    effect: "frostDmg",   value: 0.06,  minRarity: "blue",   type: "attack" },
    iceSeal:    { name: "冰封",    effect: "frostDmg",   value: 0.10,  minRarity: "purple", type: "attack" },
    extremeCold:{ name: "极寒",    effect: "frostDmg",   value: 0.15,  minRarity: "orange", type: "attack" },
    eternalIce: { name: "永冻",    effect: "frostDmg",   value: 0.20,  minRarity: "red",    type: "attack" },
    surge:      { name: "电涌",    effect: "lightDmg",   value: 0.03,  minRarity: "green",  type: "attack" },
    thunder:    { name: "霹雳",    effect: "lightDmg",   value: 0.06,  minRarity: "blue",   type: "attack" },
    storm:      { name: "雷霆",    effect: "lightDmg",   value: 0.10,  minRarity: "purple", type: "attack" },
    judgment:   { name: "天谴",    effect: "lightDmg",   value: 0.15,  minRarity: "orange", type: "attack" },
    apocalypse: { name: "灭世",    effect: "lightDmg",   value: 0.20,  minRarity: "red",    type: "attack" },
    critRate:   { name: "暴击率",  effect: "critRate",   value: 0.03,  minRarity: "blue",   type: "attack" },
    critDmg:    { name: "暴伤",    effect: "critDmg",    value: 0.15,  minRarity: "purple", type: "attack" },
    pierce:     { name: "穿透",    effect: "pierce",     value: 0.10,  minRarity: "purple", type: "attack" },
    antiMagic:  { name: "破法",    effect: "antiMagic",  value: 0.20,  minRarity: "orange", type: "attack" },

    // 异常状态（18条）
    lacerate:   { name: "割裂",    effect: "bleedOnCrit",    value: 0.70,  minRarity: "blue",   type: "status" },
    bloodBlade: { name: "血刃",    effect: "bleedDmg",       value: 0.50,  minRarity: "purple", type: "status" },
    ember:      { name: "燃烬",    effect: "burnOnHit",      value: 0.50,  minRarity: "blue",   type: "status" },
    bodyBurn:   { name: "焚身",    effect: "burnMaxStacks",  value: 3,     minRarity: "orange", type: "status" },
    iceThorn:   { name: "冰刺",    effect: "slowOnHit",      value: 0.50,  minRarity: "blue",   type: "status" },
    coldBone:   { name: "寒骨",    effect: "frostBonusOnSlow",value: 0.30, minRarity: "purple", type: "status" },
    thunderStrike:{name:"雷击",   effect: "stunOnHit",      value: 0.40,  minRarity: "blue",   type: "status" },
    paralysis:  { name: "麻痹",    effect: "lightBonusOnStun",value:0.30, minRarity: "purple", type: "status" },
    ignite:     { name: "点燃",    effect: "fireBonusOnBurn",value: 0.25,  minRarity: "orange", type: "status" },
    rupture:    { name: "裂伤",    effect: "physBonusOnBleed",value:0.25,  minRarity: "orange", type: "status" },
    chainFlash: { name: "连锁闪",  effect: "chainTarget",    value: 1,     minRarity: "purple", type: "status" },
    frostNova:  { name: "冰霜新星",effect: "freezeAllChance",value: 0.30,  minRarity: "orange", type: "status" },
    fireExplode:{ name: "火焰爆炸",effect: "aoeOnKill",      value: 0.30,  minRarity: "orange", type: "status" },
    armorBreak: { name: "破甲斩",  effect: "reduceArmor",    value: 0.15,  minRarity: "blue",   type: "status" },
    frostSpike: { name: "霜刺",    effect: "reduceSpeed",    value: 0.20,  minRarity: "blue",   type: "status" },
    thunderShock:{name: "雷震",    effect: "reduceHit",      value: 0.20,  minRarity: "blue",   type: "status" },
    scorchedSkin:{name: "灼肤",    effect: "burnReduceAtk",  value: 0.10,  minRarity: "purple", type: "status" },
    bleedOut:   { name: "流血不止",effect: "bleedNoHeal",    value: true,  minRarity: "orange", type: "status" },

    // 速度出手（8条）
    swift:      { name: "轻快",    effect: "speed",          value: 0.03,  minRarity: "green",  type: "speed" },
    gale:       { name: "疾风",    effect: "speed",          value: 0.06,  minRarity: "blue",   type: "speed" },
    lightningFast:{name:"电光",    effect: "speed",          value: 0.10,  minRarity: "purple", type: "speed" },
    blink:      { name: "瞬影",    effect: "speed",          value: 0.15,  minRarity: "orange", type: "speed" },
    godSpeed:   { name: "神速",    effect: "speed",          value: 0.20,  minRarity: "red",    type: "speed" },
    firstStrike:{ name: "先手",    effect: "firstTurnSpeed", value: 0.30,  minRarity: "purple", type: "speed" },
    nimble:     { name: "迅捷",    effect: "speedHpTrade",   value: {spd:0.08, hp:-0.05}, minRarity: "blue", type: "speed" },
    windSpirit: { name: "风灵",    effect: "dodgeSpeed",     value: 0.20,  minRarity: "orange", type: "speed" },

    // 防御类（12条）
    steelBody:  { name: "钢躯",    effect: "physDef",        value: 0.10,  minRarity: "green",  type: "defense" },
    ironWall:   { name: "铁壁",    effect: "physDef",        value: 0.20,  minRarity: "blue",   type: "defense" },
    fortress:   { name: "堡垒",    effect: "physDef",        value: 0.30,  minRarity: "purple", type: "defense" },
    immortal:   { name: "不朽",    effect: "physDef",        value: 0.40,  minRarity: "orange", type: "defense" },
    fireResist: { name: "耐火",    effect: "fireRes",        value: 0.15,  minRarity: "green",  type: "defense" },
    frostResist:{ name: "耐寒",    effect: "frostRes",       value: 0.15,  minRarity: "green",  type: "defense" },
    lightResist:{ name: "耐雷",    effect: "lightRes",       value: 0.15,  minRarity: "green",  type: "defense" },
    elemShield: { name: "元素盾",  effect: "allElemRes",     value: 0.10,  minRarity: "blue",   type: "defense" },
    elemBarrier:{ name: "元素壁垒",effect: "allElemRes",     value: 0.20,  minRarity: "purple", type: "defense" },
    vitality:   { name: "生命",    effect: "maxHp",          value: 0.10,  minRarity: "green",  type: "defense" },
    vigor:      { name: "生机",    effect: "maxHp",          value: 0.20,  minRarity: "blue",   type: "defense" },
    regen:      { name: "再生",    effect: "hpRegen",        value: 5,     minRarity: "blue",   type: "defense" },

    // 功能类（10条）
    bloodthirst:{ name: "嗜血",    effect: "lifeSteal",      value: 0.08,  minRarity: "purple", type: "utility" },
    energyDrain:{ name: "吸能",    effect: "manaSteal",      value: 0.05,  minRarity: "purple", type: "utility" },
    warCry:     { name: "战吼",    effect: "firstTurnDmg",   value: 0.25,  minRarity: "blue",   type: "utility" },
    executioner:{ name: "处刑人",  effect: "lowHpDmg",       value: 0.30,  minRarity: "orange", type: "utility" },
    desperate:  { name: "破釜",    effect: "lowHpDmg",       value: 0.30,  minRarity: "orange", type: "utility" },
    desperate2: { name: "绝境",    effect: "veryLowHpDmg",   value: 0.60,  minRarity: "red",    type: "utility" },
    unyielding: { name: "不屈",    effect: "cheatDeathChance", value: 0.10,  minRarity: "red",    type: "utility" },
    purify:     { name: "净化",    effect: "debuffCleanse",  value: 0.30,  minRarity: "orange", type: "utility" },
    guardian:   { name: "守护之约",effect: "protectChance",  value: 0.15,  minRarity: "purple", type: "utility" },
    comrade:    { name: "战友",    effect: "companionDmg",   value: 0.10,  minRarity: "blue",   type: "utility" },

    // 稀有类（8条）
    dragonRage: { name: "龙之怒",  effect: "dragonDmg",      value: {chance:0.05, mult:3.0}, minRarity: "orange", type: "rare" },
    dragonScale:{ name: "龙之鳞",  effect: "dragonImmune",    value: 0.05,  minRarity: "orange", type: "rare" },
    dragonBreath:{name: "龙之息",  effect: "dragonFire",     value: 80,    minRarity: "orange", type: "rare" },
    divineBless:{ name: "神佑",    effect: "divineImmune",   value: true,  minRarity: "red",    type: "rare" },
    divinePunish:{name: "神罚",    effect: "divineCrit",     value: true,  minRarity: "red",    type: "rare" },
    divineSpeed:{ name: "神速·战", effect: "extraTurn",      value: true,  minRarity: "red",    type: "rare" },
    skyThunder: { name: "天雷",    effect: "skyThunder",     value: {chance:0.05, dmg:1.5}, minRarity: "red", type: "rare" },
    iceAge:     { name: "冰河",    effect: "iceAge",         value: {chance:0.05, freeze:true}, minRarity: "red", type: "rare" },
  },

  // ========== 世界地图 ==========
  world: {
    zones: {
      greyVillage: {
        name: "灰烟村",
        levelRange: [1, 20],
        gatekeeper: "villageChief",
        locations: ["酒馆", "铁匠铺", "裁缝铺", "皮匠铺", "村医屋", "墓地"],
        desc: "牧场起点，资源产出。你长大的地方。",
      },
      ashMountains: {
        name: "灰烬山脉",
        levelRange: [21, 40],
        gatekeeper: "nightWatcher",
        locations: ["山脚洞", "废弃仓库", "河岸洞穴", "路边坟", "旧矿道"],
        desc: "资源初级加工。通往灰烬镇的路。",
      },
      ashMines: {
        name: "灰烬矿场",
        levelRange: [41, 60],
        gatekeeper: "mechanicalGuard",
        locations: ["无底洞矿场", "旧矿镇", "归童坊", "铁矿裂隙", "机械之守殿堂"],
        desc: "资源精炼、中转。机械守卫的领地。",
      },
      newWorld: {
        name: "新世界",
        levelRange: [61, 80],
        gatekeeper: "hermit",
        locations: ["资源平原", "寂静城镇", "空置殿堂", "幽影裂隙"],
        desc: "组织所在地。资源消耗终端。",
      },
      skyTower: {
        name: "浮空塔",
        levelRange: [81, 99],
        gatekeeper: "finalBoss",
        subZones: {
          outerCourt:  { name: "外庭",   levelRange: [81, 85], locations: ["81-85级野外帧"] },
          corridor:    { name: "回廊",   levelRange: [86, 90], locations: ["86-90级野外帧", "组织档案馆"] },
          innerCourt:  { name: "内庭",   levelRange: [91, 95], locations: ["91-95级野外帧", "组织演武场"] },
          throneHall:  { name: "至高殿", levelRange: [96, 99], locations: ["终局Boss房"] },
        },
        desc: "总部。主人的餐桌。",
      },
    },
  },

  // ========== 守门员 ==========
  gatekeepers: {
    villageChief: {
      name: "村长",
      level: 20,
      knows: "父母的嘱托。不知道组织。",
      stance: "我答应过你爹娘，要让你活着。",
      combat: { hp: 3000, armor: 200, regen: 50, style: "tank" },
      reward: "父亲的旧信",
      onDefeat: "unlock_ashMountains",
    },
    nightWatcher: {
      name: "守夜人",
      level: 40,
      knows: "组织存在，是中层的执行者。",
      stance: "你普普通通过日子自然无恙，露点野心出来我就得做点什么。",
      combat: { hp: 5000, atk: 300, armor: 50, crit: 0.3, style: "glassCannon" },
      reward: "组织铭牌",
      onDefeat: "unlock_ashMines",
      foreshadow: [37, 38], // 暗杀事件等级
    },
    mechanicalGuard: {
      name: "机械之守",
      level: 60,
      knows: "什么都不知道。是组织设置的防御机制。",
      stance: null,
      combat: { hp: 8000, armor: 400, style: "tank" },
      reward: "传送门激活",
      onDefeat: "unlock_newWorld",
    },
    hermit: {
      name: "隐修者",
      level: 80,
      knows: "组织全貌八成、父母离开的原因、12碎片存在。",
      stance: "你爹打赢了我，然后走了，可他又改变了什么？你现在也打赢了我，你又能怎么样？",
      combat: { hp: 10000, atk: 400, armor: 300, style: "balanced" },
      reward: "12碎片线索+正邪转职",
      onDefeat: "unlock_fragments",
    },
    finalBoss: {
      name: "终局Boss",
      level: 99,
      variants: {
        benevolent: { name: "白手套夫妻", desc: "组织秩序的执行者" },
        ruthless:   { name: "绥靖派师徒", desc: "组织秩序的修补者" },
      },
      combat: { hp: 20000, atk: 600, armor: 500, style: "final" },
      onDefeat: "ending",
    },
  },

  // ========== 十二碎片 ==========
  fragments: [
    { id: 1,  zone: "newWorld", location: "资源平原·废弃哨塔",      type: "explore" },
    { id: 2,  zone: "newWorld", location: "资源平原·地下暗河",      type: "puzzle" },
    { id: 3,  zone: "newWorld", location: "资源平原·旧组织哨站",    type: "boss" },
    { id: 4,  zone: "newWorld", location: "寂静城镇·镇长宅邸",    type: "explore" },
    { id: 5,  zone: "newWorld", location: "寂静城镇·地下档案室",  type: "boss" },
    { id: 6,  zone: "newWorld", location: "寂静城镇·旧教堂",      type: "puzzle" },
    { id: 7,  zone: "newWorld", location: "空置殿堂·前厅",        type: "explore" },
    { id: 8,  zone: "newWorld", location: "空置殿堂·试炼之间",    type: "boss" },
    { id: 9,  zone: "newWorld", location: "空置殿堂·顶层观星台",  type: "puzzle" },
    { id: 10, zone: "newWorld", location: "幽影裂隙·外围",        type: "explore" },
    { id: 11, zone: "newWorld", location: "幽影裂隙·深处",        type: "boss" },
    { id: 12, zone: "newWorld", location: "幽影裂隙·尽头裂缝",  type: "explore" },
  ],

  // ========== NPC（灰烟村）==========
  npcs: {
    ailin:      { name: "艾琳",      role: "邻家少女",    desc: "父母双亡，背着父亲的旧弓，是你出发的理由", recruit: "auto", class: "ranger" },
    chief:      { name: "村长",      role: "村长",        desc: "看着你长大，守着你父母托付的承诺" },
    laokui:     { name: "老奎",      role: "退休矿工",    desc: "每天上山采矿石，认识你父亲", recruit: "好感度", class: "warrior" },
    smith:      { name: "铁匠老哈",  role: "铁匠",        desc: "全村唯一会打铁的人" },
    mira:       { name: "杂货店米拉",role: "杂货店老板娘",desc: "你爹以前赊过账" },
    wood:       { name: "老农夫伍德",role: "种田人",      desc: "见过你父母最后一面" },
    martha:     { name: "裁缝玛莎",  role: "裁缝",        desc: "做过你父母的御寒斗篷", recruit: "附魔斗篷", class: "mage_heal" },
    xiaoke:     { name: "裁缝学徒小柯",role: "小裁缝",    desc: "从城里来的，知道外面的衣服", recruit: "找布匹", class: "ranger" },
    laomu:      { name: "养羊人老穆",role: "猎人/养羊人", desc: "见过插着金属管的野猪" },
    nuoen:      { name: "皮匠诺恩",  role: "皮匠",        desc: "能辨认非自然的皮", recruit: "带非自然的皮", class: "warrior" },
    leina:      { name: "村医蕾娜",  role: "村医",        desc: "你父母走之前找她拿过止痛药", recruit: "珍稀药材", class: "mage_heal" },
    blindHuo:   { name: "瞎眼老霍",  role: "卖炭人",      desc: "听脚步声认人" },
    xiaonuo:    { name: "孤儿小诺",  role: "孤儿",        desc: "我长大了也要打怪物", recruit: "长大后支线", class: "ranger" },
    zavier:     { name: "流浪商人泽维尔", role: "流浪商人", desc: "卖过红宝石给你父亲" },
    bulong:     { name: "布隆",      role: "战士",        desc: "灰烬镇铁匠", recruit: "铁匠委托", class: "warrior" },
    arthur:     { name: "阿瑟",      role: "法师·火焰",   desc: "灰烬山脉矿道救出", recruit: "矿道救出", class: "mage_fire" },
    kate:       { name: "凯特",      role: "法师·雷电",   desc: "灰烬镇旅人对话", recruit: "旅人对话", class: "mage_lightning" },
    luen:       { name: "鲁恩",      role: "战士",        desc: "灰烟矿场护送", recruit: "护送", class: "warrior" },
  },

  // ========== 生活技能 ==========
  lifeSkills: {
    mining:     { name: "采矿",     unlock: "初始",     idle: true,  source: null,         output: "矿石、宝石" },
    smelting:   { name: "冶炼",     unlock: "初始",     idle: true,  source: "采矿产出",   output: "金属锭" },
    weaving:    { name: "种植织布", unlock: "初始",     idle: true,  source: null,         output: "亚麻布、棉布" },
    cooking:    { name: "种植烹饪", unlock: "初始",     idle: true,  source: null,         output: "基础食材" },
    skinning:   { name: "剥皮",     unlock: "打野兽",   idle: true,  source: "野兽掉落",   output: "皮革、兽骨" },
    tailoring:  { name: "裁缝",     unlock: "玛莎传授", idle: true,  source: "种植织布",   output: "布甲" },
    leatherwork:{ name: "制皮",     unlock: "诺恩传授", idle: true,  source: "剥皮产出",   output: "皮甲" },
    chef:       { name: "烹饪",     unlock: "米拉传授", idle: true,  source: "种植烹饪",   output: "食物增益" },
    alchemy:    { name: "炼金",     unlock: "蕾娜传授", idle: true,  source: "采药",       output: "药水、药剂" },
  },

  // ========== 经验锁定提示 ==========
  expLockMessages: {
    20: "你感觉到一股无形的阻力。仿佛这片土地在告诉你：你已准备好了，但还差一个开始。",
    40: "你已走遍了这里的每一条路。但有些门，需要有人打开。",
    60: "你的技艺已经足够锋利。但黑暗中有什么东西在注视着你。",
    80: "你已走到这个世界允许你走到的尽头。再往前，是另一段故事。",
    99: "你已经站在了最高处。剩下的，只有那扇门。",
  },

  // ========== 死亡机制 ==========
  death: {
    normal: {
      revives: 5,
      greyVillage: "free",      // 不消耗复活
      other: "consume",         // 消耗1次
      zeroRevives: "epitaph",   // 碑文模式
    },
    hardcore: {
      revives: 0,
      all: "retire",            // 角色退役，碑文模式
    },
  },

  // ========== 传家宝 ==========
  heirloom: {
    slot1: { name: "父亲的旧短剑", holder: "player", rarity: "blue", level: 10, affixes: 3, desc: "开局自带" },
    slot2: { name: "艾琳的旧弓",   holder: "ailin",  rarity: "blue", level: 10, affixes: 3, desc: "艾琳入队时自动装备" },
    slot3: { name: null, holder: null, rarity: null, level: null, affixes: null, desc: "终局Boss内购解锁" },
    rules: {
      newGamePlus: true,
      maxKeep: 3,               // 最多保留3条机制类词条
      compressLevel: 10,        // 等级锁定为10级
      color: "gold",            // 固定金色
      prefix: "遗赠之",
    },
  },

  // ========== 挂机系统 ==========
  idle: {
    maxDuration: 8,             // 小时
    allowAutoTransition: false,   // 不允许自动转场
    allowAutoSwitch: false,       // 不允许自动切换动作
    actions: [
      "mining", "woodcutting", "herbalism",
      "hunting_beast", "hunting_humanoid", "hunting_mechanical",
      "forging", "smelting", "tailoring", "leatherwork", "cooking", "alchemy",
      "training",
    ],
  },

  // ========== 战斗常量 ==========
  combat: {
    maxUnitsAlly: 3,
    maxUnitsEnemy: 6,
    maxTurns: 30,
    multiWave: { min: 2, max: 4 },
    drawPenalty: { hp: 1, mp: 0, goldLoss: 0.05, materialLoss: 0.10 },
  },

  // ========== 背包常量 ==========
  inventory: {
    baseCapacity: 20,
    perGatekeeperBonus: 20,
    stackLimits: { gold: 9999, basic: 99, rare: 50 },
    storageBase: 50,
    storageMax: 250,
  },

  // ========== 货币 ==========
  currency: {
    copper: 1,
    silver: 10,   // 10铜=1银
    gold: 100,    // 100银=1金 (文档: 100银=1金)
    maxCarry: 99999,
  },
};
