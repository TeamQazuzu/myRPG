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
    gold:   { name: "金色", tier: 6, minAffixes: 3, maxAffixes: 3, color: "#ffd700" },
  },

  // 品质顺序辅助（用于 equipment.js）
  Q_ORDER: { white: 0, green: 1, blue: 2, purple: 3, orange: 4, red: 5, gold: 6 },

  // 品质属性倍率（用于锻造升级时计算新属性）
  Q_MULTI: { white: 1.0, green: 1.2, blue: 1.5, purple: 2.0, orange: 2.8, red: 4.0, gold: 3.0 },

  // ========== 装备承载上限 ==========
  equipLimits: [
    { levelRange: [1, 20],   maxRarity: "blue",   sameColorMax: 2 },
    { levelRange: [21, 40], maxRarity: "purple", sameColorMax: 2 },
    { levelRange: [41, 60], maxRarity: "orange", sameColorMax: 2 },
    { levelRange: [61, 80], maxRarity: "red",    sameColorMax: 2 },
    { levelRange: [81, 99], maxRarity: "red",    sameColorMax: 99 },
  ],

  // 按等级段限制的最高品质（equipment.js 辅助）
  qualityLimits: {
    bracket1: { maxQuality: "blue", sameLimit: 2 },
    bracket2: { maxQuality: "purple", sameLimit: 2 },
    bracket3: { maxQuality: "orange", sameLimit: 2 },
    bracket4: { maxQuality: "red", sameLimit: 2 },
    bracket5: { maxQuality: "red", sameLimit: 99 },
  },

  // ========== 装备槽位 ==========
  equipSlots: [
    "weapon", "offhand", "helmet", "chest", "legs",
    "boots", "gloves", "necklace", "ring1", "ring2",
  ],

  // 槽位中文名
  slots: {
    weapon: "武器", offhand: "副手", helmet: "头盔", chest: "胸甲", legs: "腿甲",
    boots: "靴子", gloves: "手套", necklace: "项链", ring1: "戒指", ring2: "戒指"
  },

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
        gatekeeper
