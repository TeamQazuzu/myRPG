const DATA = {
  version: "1.1.0",

  // ========== 六维属性 ==========
  attributes: {
    str: { name: "力量", desc: "物理伤害", perPoint: { physAtk: 2, physDef: 1 } },
    agi: { name: "敏捷", desc: "命中/闪避/速度", perPoint: { hit: 1.5, dodge: 1, speed: 0.8 } },
    int: { name: "智力", desc: "法术伤害/治疗", perPoint: { magAtk: 2, magDef: 1 } },
    vit: { name: "体质", desc: "总血量", perPoint: { hp: 10, hpRegen: 0.3 } },
    ten: { name: "坚韧", desc: "全防御", perPoint: { allDef: 3, tenacity: 1 } },
    spi: { name: "精神", desc: "法力", perPoint: { mp: 5, magDef: 2 } },
  },

  // ========== 技能定义（全部技能带MP消耗和CD）==========
  skills: {
    // --- 战士 ---
    shieldWall:  { id: "shieldWall",  name: "盾墙",   mpCost: 10, cooldown: 3, dmgType: "physical", power: 0.0, target: "self",   effect: "defense_buff", desc: "防御+50%，持续2回合" },
    heavyStrike: { id: "heavyStrike", name: "猛击",   mpCost: 8,  cooldown: 2, dmgType: "physical", power: 1.5, target: "enemy",  desc: "造成150%物理伤害" },
    warCry:      { id: "warCry",      name: "战吼",   mpCost: 15, cooldown: 5, dmgType: "physical", power: 0.0, target: "allies", effect: "attack_buff", desc: "队友攻击力+30%，3回合" },
    armorBreak:  { id: "armorBreak",  name: "破甲斩", mpCost: 12, cooldown: 3, dmgType: "physical", power: 1.2, target: "enemy",  effect: "armor_down",  desc: "造成120%伤害，降低目标30%防御2回合" },
    ironWall:    { id: "ironWall",    name: "铁壁",   mpCost: 20, cooldown: 6, dmgType: "physical", power: 0.0, target: "self",   effect: "invincible",  desc: "下回合免疫所有伤害" },
    execute:     { id: "execute",     name: "处决",   mpCost: 18, cooldown: 5, dmgType: "physical", power: 2.5, target: "enemy",  desc: "造成250%伤害，对低血量目标额外50%" },
    warGod:      { id: "warGod",      name: "战神降临", mpCost: 40, cooldown: 10, dmgType: "physical", power: 4.0, target: "enemy", effect: "aoe", desc: "对所有敌人造成200%伤害" },

    // --- 游侠 ---
    quickShot:    { id: "quickShot",    name: "连射",   mpCost: 6,  cooldown: 1, dmgType: "physical", power: 0.8, target: "enemy",  hits: 2, desc: "射出2箭，每箭80%伤害" },
    slowArrow:    { id: "slowArrow",    name: "减速箭", mpCost: 8,  cooldown: 2, dmgType: "frost",    power: 0.7, target: "enemy",  effect: "slow", desc: "造成70%伤害，减速目标" },
    pierceShot:   { id: "pierceShot",   name: "穿透箭", mpCost: 12, cooldown: 3, dmgType: "physical", power: 1.8, target: "enemy",  desc: "造成180%伤害，无视50%防御" },
    chainShot:    { id: "chainShot",    name: "连环射击", mpCost: 15, cooldown: 4, dmgType: "physical", power: 1.2, target: "enemy",  hits: 3, desc: "连射3箭，每箭120%伤害" },
    snipe:        { id: "snipe",        name: "狙击",   mpCost: 20, cooldown: 5, dmgType: "physical", power: 3.0, target: "enemy",  desc: "造成300%伤害，必定暴击" },
    arrowRain:    { id: "arrowRain",    name: "箭雨",   mpCost: 25, cooldown: 7, dmgType: "physical", power: 1.0, target: "all",    desc: "对所有敌人造成100%伤害" },
    windWalker:   { id: "windWalker",   name: "风行者", mpCost: 35, cooldown: 10, dmgType: "physical", power: 2.5, target: "enemy",  effect: "multi", hits: 5, desc: "5箭齐发，每箭250%伤害" },

    // --- 法师·火焰 ---
    fireball:     { id: "fireball",     name: "火球",   mpCost: 10, cooldown: 2, dmgType: "fire",     power: 1.3, target: "enemy",  desc: "造成130%火焰伤害" },
    fireStorm:    { id: "fireStorm",    name: "火焰风暴", mpCost: 20, cooldown: 5, dmgType: "fire",  power: 1.2, target: "all",    desc: "对所有敌人造成120%火焰伤害" },
    meteor:       { id: "meteor",       name: "陨石",   mpCost: 35, cooldown: 8, dmgType: "fire",     power: 4.0, target: "enemy",  effect: "aoe", desc: "陨石轰击，400%伤害+AOE" },
    fireMaster:   { id: "fireMaster",   name: "元素主宰·火", mpCost: 50, cooldown: 12, dmgType: "fire", power: 5.0, target: "all", desc: "全屏烈焰，500%伤害" },

    // --- 法师·冰霜 ---
    iceArrow:     { id: "iceArrow",     name: "冰箭",   mpCost: 8,  cooldown: 1, dmgType: "frost",    power: 1.1, target: "enemy",  effect: "slow", desc: "造成110%冰霜伤害+减速" },
    frostNova:    { id: "frostNova",    name: "冰霜新星", mpCost: 15, cooldown: 3, dmgType: "frost", power: 0.9, target: "all",    effect: "freeze", desc: "对所有敌人造成90%伤害+冻结" },
    blizzard:     { id: "blizzard",     name: "暴风雪", mpCost: 30, cooldown: 7, dmgType: "frost",    power: 2.0, target: "all",    desc: "200%冰霜伤害+减速" },
    iceAge:       { id: "iceAge",       name: "冰河",   mpCost: 50, cooldown: 12, dmgType: "frost",   power: 3.5, target: "all",    effect: "freeze", desc: "350%冰霜伤害+冻结2回合" },

    // --- 法师·雷电 ---
    thunderBolt:  { id: "thunderBolt",  name: "雷击",   mpCost: 10, cooldown: 2, dmgType: "lightning", power: 1.4, target: "enemy", effect: "stun", desc: "140%雷电伤害+僵直" },
    chainLightning:{id: "chainLightning",name: "连锁闪电",mpCost: 18, cooldown: 4, dmgType: "lightning", power: 1.2, target: "enemy", effect: "chain", desc: "120%雷电伤害，跳跃3次" },
    heavenlyThunder:{id:"heavenlyThunder",name:"天雷",  mpCost: 30, cooldown: 7, dmgType: "lightning", power: 3.0, target: "enemy", effect: "aoe", desc: "300%雷电伤害+AOE" },
    thunderGod:   { id: "thunderGod",   name: "元素主宰·雷", mpCost: 50, cooldown: 12, dmgType: "lightning", power: 5.0, target: "all", desc: "500%雷电伤害" },

    // --- 法师·治疗 ---
    heal:         { id: "heal",         name: "治疗术", mpCost: 8,  cooldown: 1, dmgType: null,        power: 0.5, target: "ally",   effect: "heal", desc: "恢复目标50%最大生命" },
    massHeal:     { id: "massHeal",     name: "群体治疗", mpCost: 20, cooldown: 4, dmgType: null,      power: 0.3, target: "allies", effect: "heal", desc: "全体恢复30%最大生命" },
    purify:       { id: "purify",       name: "净化",   mpCost: 12, cooldown: 3, dmgType: null,        power: 0.0, target: "ally",   effect: "cleanse", desc: "清除目标所有负面状态" },
    divineShield: { id: "divineShield", name: "护盾",   mpCost: 15, cooldown: 4, dmgType: null,        power: 0.0, target: "ally",   effect: "shield", desc: "给目标加护盾，吸收30%生命伤害" },
    healMaster:   { id: "healMaster",  name: "元素主宰·愈", mpCost: 50, cooldown: 12, dmgType: null, power: 1.0, target: "allies", effect: "heal", desc: "全体回满生命+清除负面" },

    // --- 通用 ---
    normalAttack: { id: "normalAttack", name: "普通攻击", mpCost: 0, cooldown: 0, dmgType: "physical", power: 1.0, target: "enemy", desc: "普通攻击，100%伤害" },
  },

  // ========== 职业技能映射 ==========
  classSkills: {
    warrior: {
      20: ["heavyStrike", "shieldWall"],
      40: ["warCry", "armorBreak"],
      60: ["ironWall", "execute"],
      80: ["warGod"],
    },
    ranger: {
      20: ["quickShot", "slowArrow"],
      40: ["pierceShot", "chainShot"],
      60: ["snipe", "arrowRain"],
      80: ["windWalker"],
    },
    mage_fire: {
      20: ["fireball"],
      40: ["fireStorm"],
      60: ["meteor"],
      80: ["fireMaster"],
    },
    mage_frost: {
      20: ["iceArrow"],
      40: ["frostNova"],
      60: ["blizzard"],
      80: ["iceAge"],
    },
    mage_lightning: {
      20: ["thunderBolt"],
      40: ["chainLightning"],
      60: ["heavenlyThunder"],
      80: ["thunderGod"],
    },
    mage_heal: {
      20: ["heal"],
      40: ["massHeal"],
      60: ["purify", "divineShield"],
      80: ["healMaster"],
    },
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
      getSkills: function(level) {
        const map = DATA.classSkills.warrior;
        const tiers = Object.keys(map).map(Number).sort((a,b) => a-b);
        for (let i = tiers.length - 1; i >= 0; i--) {
          if (level >= tiers[i]) return map[tiers[i]];
        }
        return [];
      }
    },
    ranger: {
      name: "游侠",
      tiers: ["见习游侠", "游侠", "精锐游侠", "风行者"],
      coreAttr: ["agi"],
      dmgType: "physical",
      armor: ["cloth", "leather", "mail"],
      weapons: ["bow", "crossbow", "dagger"],
      getSkills: function(level) {
        const map = DATA.classSkills.ranger;
        const tiers = Object.keys(map).map(Number).sort((a,b) => a-b);
        for (let i = tiers.length - 1; i >= 0; i--) {
          if (level >= tiers[i]) return map[tiers[i]];
        }
        return [];
      }
    },
    mage: {
      name: "法师",
      tiers: ["见习法师", "法师", "大法师", "元素主宰"],
      coreAttr: ["int", "spi"],
      dmgType: "magic",
      armor: ["cloth"],
      weapons: ["staff", "wand"],
      getSkills: function(level, branch) {
        const branchKey = branch ? "mage_" + branch : "mage_fire";
        const map = DATA.classSkills[branchKey] || DATA.classSkills.mage_fire;
        const tiers = Object.keys(map).map(Number).sort((a,b) => a-b);
        for (let i = tiers.length - 1; i >= 0; i--) {
          if (level >= tiers[i]) return map[tiers[i]];
        }
        return [];
      },
      branches: {
        fire:     { name: "火焰", dmgType: "fire" },
        frost:    { name: "冰霜", dmgType: "frost" },
        lightning:{ name: "雷电", dmgType: "lightning" },
        heal:     { name: "治疗", dmgType: null },
      }
    },
  },

  // ========== 伤害类型 ==========
  damageTypes: {
    physical: { name: "物理", status: "bleed", statusName: "流血", duration: 3, stackable: false },
    fire:     { name: "火焰", status: "burn",  statusName: "灼烧", duration: 3, stackable: true, maxStacks: 2 },
    frost:    { name: "冰霜", status: "slow",  statusName: "减速", duration: 2, stackable: false },
    lightning:{ name: "雷电", status: "stun",  statusName: "僵直", duration: 1, stackable: false },
  },

  // ========== 装备品质 ==========
  rarity: {
    white:  { name: "白色", tier: 0, minAffixes: 0, maxAffixes: 0, color: "#cccccc", statMult: 1.0 },
    green:  { name: "绿色", tier: 1, minAffixes: 1, maxAffixes: 2, color: "#4caf50", statMult: 1.2 },
    blue:   { name: "蓝色", tier: 2, minAffixes: 2, maxAffixes: 3, color: "#2196f3", statMult: 1.5 },
    purple: { name: "紫色", tier: 3, minAffixes: 3, maxAffixes: 4, color: "#9c27b0", statMult: 2.0 },
    orange: { name: "橙色", tier: 4, minAffixes: 4, maxAffixes: 5, color: "#ff9800", statMult: 2.8 },
    red:    { name: "红色", tier: 5, minAffixes: 6, maxAffixes: 6, color: "#f44336", statMult: 4.0 },
    gold:   { name: "金色", tier: 6, minAffixes: 3, maxAffixes: 3, color: "#ffd700", statMult: 5.0 },
  },

  // ========== 品质顺序（数组索引=品质等级）==========
  rarityOrder: ["white", "green", "blue", "purple", "orange", "red", "gold"],

  // ========== 装备承载上限 ==========
  equipLimits: [
    { levelRange: [1, 20],   maxRarity: "blue",   sameColorMax: 2 },
    { levelRange: [21, 40], maxRarity: "purple", sameColorMax: 2 },
    { levelRange: [41, 60], maxRarity: "orange", sameColorMax: 2 },
    { levelRange: [61, 80], maxRarity: "red",    sameColorMax: 2 },
    { levelRange: [81, 99], maxRarity: "red",    sameColorMax: 99 },
  ],

  // ========== 装备槽位 ==========
  equipSlots: {
    weapon:   { name: "武器",   icon: "⚔️" },
    offhand:  { name: "副手",   icon: "🛡️" },
    helmet:   { name: "头盔",   icon: "⛑️" },
    chest:    { name: "铠甲",   icon: "👕" },
    legs:     { name: "护腿",   icon: "👖" },
    boots:    { name: "战靴",   icon: "👢" },
    gloves:   { name: "手套",   icon: "🧤" },
    necklace: { name: "项链",   icon: "📿" },
    ring1:    { name: "戒指1",  icon: "💍" },
    ring2:    { name: "戒指2",  icon: "💍" },
  },

  // ========== 品质索引（给 equipment.js 用）==========
  Q_ORDER: { white: 0, green: 1, blue: 2, purple: 3, orange: 4, red: 5, gold: 6 },
  Q_MULTI: { white: 1.0, green: 1.2, blue: 1.5, purple: 2.0, orange: 2.8, red: 4.0, gold: 5.0 },

  // ========== 物品类型 → 槽位映射 ==========
  typeToSlot: {
    sword: "weapon", axe: "weapon", hammer: "weapon", bow: "weapon",
    staff: "weapon", wand: "weapon", dagger: "weapon",
    shield: "offhand", offhand: "offhand",
    helmet: "helmet", armor: "chest", chest: "chest",
    legs: "legs", boots: "boots", gloves: "gloves",
    necklace: "necklace", ring: "ring1",
  },

  // ========== 装备词条池 ==========
  affixPool: {
    // 攻击类
    sharp:      { name: "锋锐",    effect: "physDmg",    value: 0.03,  minRarity: "green" },
    heavy:      { name: "重击",    effect: "physDmg",    value: 0.06,  minRarity: "blue" },
    shatter:    { name: "碎甲",    effect: "physDmg",    value: 0.10,  minRarity: "purple" },
    rend:       { name: "裂刃",    effect: "physDmg",    value: 0.15,  minRarity: "orange" },
    breakSteel: { name: "断钢",    effect: "physDmg",    value: 0.20,  minRarity: "red" },
    flame:      { name: "烈焰",    effect: "fireDmg",    value: 0.03,  minRarity: "green" },
    blaze:      { name: "焚火",    effect: "fireDmg",    value: 0.06,  minRarity: "blue" },
    inferno:    { name: "烈火",    effect: "fireDmg",    value: 0.10,  minRarity: "purple" },
    explosion:  { name: "炎爆",    effect: "fireDmg",    value: 0.15,  minRarity: "orange" },
    phoenix:    { name: "凤凰",    effect: "fireDmg",    value: 0.20,  minRarity: "red" },
    frostbite:  { name: "霜寒",    effect: "frostDmg",   value: 0.03,  minRarity: "green" },
    winter:     { name: "凛冬",    effect: "frostDmg",   value: 0.06,  minRarity: "blue" },
    iceSeal:    { name: "冰封",    effect: "frostDmg",   value: 0.10,  minRarity: "purple" },
    extremeCold:{ name: "极寒",    effect: "frostDmg",   value: 0.15,  minRarity: "orange" },
    eternalIce: { name: "永冻",    effect: "frostDmg",   value: 0.20,  minRarity: "red" },
    surge:      { name: "电涌",    effect: "lightDmg",   value: 0.03,  minRarity: "green" },
    thunder:    { name: "霹雳",    effect: "lightDmg",   value: 0.06,  minRarity: "blue" },
    storm:      { name: "雷霆",    effect: "lightDmg",   value: 0.10,  minRarity: "purple" },
    judgment:   { name: "天谴",    effect: "lightDmg",   value: 0.15,  minRarity: "orange" },
    apocalypse: { name: "灭世",    effect: "lightDmg",   value: 0.20,  minRarity: "red" },
    critRate:   { name: "暴击率",  effect: "critRate",   value: 0.03,  minRarity: "blue" },
    critDmg:    { name: "暴伤",    effect: "critDmg",    value: 0.15,  minRarity: "purple" },
    pierce:     { name: "穿透",    effect: "pierce",     value: 0.10,  minRarity: "purple" },
    antiMagic:  { name: "破法",    effect: "antiMagic",  value: 0.20,  minRarity: "orange" },
    // 状态类
    lacerate:   { name: "割裂",    effect: "bleedOnCrit",    value: 0.70,  minRarity: "blue" },
    bloodBlade: { name: "血刃",    effect: "bleedDmg",       value: 0.50,  minRarity: "purple" },
    ember:      { name: "燃烬",    effect: "burnOnHit",      value: 0.50,  minRarity: "blue" },
    bodyBurn:   { name: "焚身",    effect: "burnMaxStacks",  value: 3,     minRarity: "orange" },
    iceThorn:   { name: "冰刺",    effect: "slowOnHit",      value: 0.50,  minRarity: "blue" },
    coldBone:   { name: "寒骨",    effect: "frostBonusOnSlow",value: 0.30, minRarity: "purple" },
    thunderStrike:{name:"雷击",   effect: "stunOnHit",      value: 0.40,  minRarity: "blue" },
    paralysis:  { name: "麻痹",    effect: "lightBonusOnStun",value:0.30, minRarity: "purple" },
    ignite:     { name: "点燃",    effect: "fireBonusOnBurn",value: 0.25,  minRarity: "orange" },
    rupture:    { name: "裂伤",    effect: "physBonusOnBleed",value:0.25,  minRarity: "orange" },
    chainFlash: { name: "连锁闪",  effect: "chainTarget",    value: 1,     minRarity: "purple" },
    frostNova:  { name: "冰霜新星",effect: "freezeAllChance",value: 0.30,  minRarity: "orange" },
    fireExplode:{ name: "火焰爆炸",effect: "aoeOnKill",      value: 0.30,  minRarity: "orange" },
    armorBreakAffix:{name:"破甲", effect: "reduceArmor",    value: 0.15,  minRarity: "blue" },
    frostSpike: { name: "霜刺",    effect: "reduceSpeed",    value: 0.20,  minRarity: "blue" },
    thunderShock:{name: "雷震",    effect: "reduceHit",      value: 0.20,  minRarity: "blue" },
    scorchedSkin:{name: "灼肤",    effect: "burnReduceAtk",  value: 0.10,  minRarity: "purple" },
    bleedOut:   { name: "流血不止",effect: "bleedNoHeal",    value: true,  minRarity: "orange" },
    // 速度类
    swift:      { name: "轻快",    effect: "speed",          value: 0.03,  minRarity: "green" },
    gale:       { name: "疾风",    effect: "speed",          value: 0.06,  minRarity: "blue" },
    lightningFast:{name:"电光",    effect: "speed",          value: 0.10,  minRarity: "purple" },
    blink:      { name: "瞬影",    effect: "speed",          value: 0.15,  minRarity: "orange" },
    godSpeed:   { name: "神速",    effect: "speed",          value: 0.20,  minRarity: "red" },
    firstStrike:{ name: "先手",    effect: "firstTurnSpeed", value: 0.30,  minRarity: "purple" },
    nimble:     { name: "迅捷",    effect: "speedHpTrade",   value: {spd:0.08, hp:-0.05}, minRarity: "blue" },
    windSpirit: { name: "风灵",    effect: "dodgeSpeed",     value: 0.20,  minRarity: "orange" },
    // 防御类
    steelBody:  { name: "钢躯",    effect: "physDef",        value: 0.10,  minRarity: "green" },
    ironWall:   { name: "铁壁",    effect: "physDef",        value: 0.20,  minRarity: "blue" },
    fortress:   { name: "堡垒",    effect: "physDef",        value: 0.30,  minRarity: "purple" },
    immortal:   { name: "不朽",    effect: "physDef",        value: 0.40,  minRarity: "orange" },
    fireResist: { name: "耐火",    effect: "fireRes",        value: 0.15,  minRarity: "green" },
    frostResist:{ name: "耐寒",    effect: "frostRes",       value: 0.15,  minRarity: "green" },
    lightResist:{ name: "耐雷",    effect: "lightRes",       value: 0.15,  minRarity: "green" },
    elemShield: { name: "元素盾",  effect: "allElemRes",     value: 0.10,  minRarity: "blue" },
    elemBarrier:{ name: "元素壁垒",effect: "allElemRes",     value: 0.20,  minRarity: "purple" },
    vitality:   { name: "生命",    effect: "maxHp",          value: 0.10,  minRarity: "green" },
    vigor:      { name: "生机",    effect: "maxHp",          value: 0.20,  minRarity: "blue" },
    regen:      { name: "再生",    effect: "hpRegen",        value: 5,     minRarity: "blue" },
    // 功能类
    bloodthirst:{ name: "嗜血",    effect: "lifeSteal",      value: 0.08,  minRarity: "purple" },
    energyDrain:{ name: "吸能",    effect: "manaSteal",      value: 0.05,  minRarity: "purple" },
    warCry:     { name: "战吼",    effect: "firstTurnDmg",   value: 0.25,  minRarity: "blue" },
    executioner:{ name: "处刑人",  effect: "lowHpDmg",       value: 0.30,  minRarity: "orange" },
    desperate:  { name: "破釜",    effect: "lowHpDmg",       value: 0.30,  minRarity: "orange" },
    desperate2: { name: "绝境",    effect: "veryLowHpDmg",   value: 0.60,  minRarity: "red" },
    unyielding: { name: "不屈",    effect: "cheatDeathChance", value: 0.10,  minRarity: "red" },
    purify:     { name: "净化",    effect: "debuffCleanse",  value: 0.30,  minRarity: "orange" },
    guardian:   { name: "守护之约",effect: "protectChance",  value: 0.15,  minRarity: "purple" },
    comrade:    { name: "战友",    effect: "companionDmg",   value: 0.10,  minRarity: "blue" },
    // 稀有类
    dragonRage: { name: "龙之怒",  effect: "dragonDmg",      value: {chance:0.05, mult:3.0}, minRarity: "orange" },
    dragonScale:{ name: "龙之鳞",  effect: "dragonImmune",   value: 0.05,  minRarity: "orange" },
    dragonBreath:{name: "龙之息",  effect: "dragonFire",     value: 80,    minRarity: "orange" },
    divineBless:{ name: "神佑",    effect: "divineImmune",   value: true,  minRarity: "red" },
    divinePunish:{name: "神罚",    effect: "divineCrit",     value: true,  minRarity: "red" },
    divineSpeed:{ name: "神速·战", effect: "extraTurn",      value: true,  minRarity: "red" },
    skyThunder: { name: "天雷",    effect: "skyThunder",     value: {chance:0.05, dmg:1.5}, minRarity: "red" },
    iceAge:     { name: "冰河",    effect: "iceAge",         value: {chance:0.05, freeze:true}, minRarity: "red" },
  },

  // ========== 符文之语 ==========
  runewords: {
    "fire_stone_fire": {
      name: "烈焰之心",
      gems: ["fire", "stone", "fire"],
      bonus: { physAtk: 30, fireAtk: 50, critRate: 0.1 }
    },
    "frost_frost_diamond": {
      name: "冰霜之魂",
      gems: ["frost", "frost", "diamond"],
      bonus: { physAtk: 20, frostAtk: 40, speed: 10 }
    },
    "light_light_light": {
      name: "雷霆之怒",
      gems: ["light", "light", "light"],
      bonus: { physAtk: 25, lightAtk: 60, critDmg: 0.3 }
    },
    "ruby_ruby_ruby": {
      name: "血色狂怒",
      gems: ["ruby", "ruby", "ruby"],
      bonus: { physAtk: 40, maxHp: 200, lifeSteal: 0.05 }
    },
  },

  // ========== 世界地图 ==========
  world: {
    zones: {
      greyVillage: {
        name: "灰烟村", levelRange: [1, 20], gatekeeper: "villageChief",
        locations: ["酒馆", "铁匠铺", "裁缝铺", "皮匠铺", "村医屋", "墓地"],
        desc: "牧场起点，资源产出。你长大的地方。",
      },
      ashMountains: {
        name: "灰烬山脉", levelRange: [21, 40], gatekeeper: "nightWatcher",
        locations: ["山脚洞", "废弃仓库", "河岸洞穴", "路边坟", "旧矿道"],
        desc: "资源初级加工。通往灰烬镇的路。",
      },
      ashMines: {
        name: "灰烬矿场", levelRange: [41, 60], gatekeeper: "mechanicalGuard",
        locations: ["无底洞矿场", "旧矿镇", "归童坊", "铁矿裂隙", "机械之守殿堂"],
        desc: "资源精炼、中转。机械守卫的领地。",
      },
      newWorld: {
        name: "新世界", levelRange: [61, 80], gatekeeper: "hermit",
        locations: ["资源平原", "寂静城镇", "空置殿堂", "幽影裂隙"],
        desc: "组织所在地。资源消耗终端。",
      },
      skyTower: {
        name: "浮空塔", levelRange: [81, 99], gatekeeper: "finalBoss",
        locations: ["外庭", "回廊", "内庭", "至高殿"],
        desc: "总部。主人的餐桌。",
      },
    },
  },

  // ========== 守门员 ==========
  gatekeepers: {
    villageChief: {
      name: "村长", level: 20, knows: "父母的嘱托。不知道组织。",
      stance: "我答应过你爹娘，要让你活着。",
      combat: { hp: 3000, armor: 200, regen: 50, style: "tank" },
      reward: "父亲的旧信", onDefeat: "unlock_ashMountains",
    },
    nightWatcher: {
      name: "守夜人", level: 40, knows: "组织存在，是中层的执行者。",
      stance: "你普普通通过日子自然无恙，露点野心出来我就得做点什么。",
      combat: { hp: 5000, atk: 300, armor: 50, crit: 0.3, style: "glassCannon" },
      reward: "组织铭牌", onDefeat: "unlock_ashMines",
    },
    mechanicalGuard: {
      name: "机械守卫", level: 60, knows: "机械设计图。",
      stance: "入侵者…清除…",
      combat: { hp: 12000, atk: 500, armor: 200, crit: 0.2, style: "balanced" },
      reward: "机械核心", onDefeat: "unlock_newWorld",
    },
    hermit: {
      name: "隐修者", level: 80, knows: "十二碎片秘密。",
      stance: "你来得正好，我等了很久。",
      combat: { hp: 25000, atk: 800, armor: 300, crit: 0.35, style: "boss" },
      reward: "碎片之钥", onDefeat: "unlock_skyTower",
    },
    finalBoss: {
      name: "最终Boss", level: 99, knows: "一切。",
      stance: "你终于来了...",
      combat: { hp: 80000, atk: 1500, armor: 500, crit: 0.4, style: "finalBoss" },
      reward: "终章", onDefeat: "game_clear",
    },
  },

  // ========== NPC（可招募同伴）==========
  npcs: {
    ailin: {
      id: "ailin", name: "艾琳", class: "ranger",
      classPath: ["ranger"], elementSpec: null,
      level: 1,
      attributes: { str: 6, agi: 12, int: 6, vit: 7, ten: 6, spi: 5 },
      equipment: {
        weapon: { name: "父亲的旧弓", type: "bow", rarity: "blue", level: 10, baseStats: { physAtk: 12 }, affixes: [] },
      },
      skills: ["quickShot", "slowArrow"],
      skillPreset: ["quickShot", "slowArrow"],
      recruit: true,
      dialogue: "从小一起长大的伙伴，擅长弓箭。",
    },
    blacksmithApprentice: {
      id: "blacksmithApprentice", name: "铁匠学徒", class: "warrior",
      classPath: ["warrior"], elementSpec: null,
      level: 5,
      attributes: { str: 14, agi: 6, int: 4, vit: 12, ten: 12, spi: 4 },
      equipment: {
        weapon: { name: "铁锤", type: "hammer", rarity: "white", level: 5, baseStats: { physAtk: 8 }, affixes: [] },
      },
      skills: ["heavyStrike", "shieldWall"],
      skillPreset: ["heavyStrike", "shieldWall"],
      recruit: true,
      dialogue: "铁匠铺的学徒，力气大，擅长用锤。",
    },
    villageMage: {
      id: "villageMage", name: "村法师", class: "mage",
      classPath: ["mage"], elementSpec: "fire",
      level: 8,
      attributes: { str: 4, agi: 6, int: 14, vit: 6, ten: 5, spi: 12 },
      equipment: {
        weapon: { name: "旧法杖", type: "staff", rarity: "green", level: 8, baseStats: { magAtk: 10 }, affixes: [] },
      },
      skills: ["fireball"],
      skillPreset: ["fireball"],
      recruit: true,
      dialogue: "村中唯一的法师，掌握基础火焰魔法。",
    },
    hunter: {
      id: "hunter", name: "猎人", class: "ranger",
      classPath: ["ranger"], elementSpec: null,
      level: 10,
      attributes: { str: 8, agi: 16, int: 5, vit: 8, ten: 6, spi: 4 },
      equipment: {
        weapon: { name: "猎弓", type: "bow", rarity: "green", level: 10, baseStats: { physAtk: 14 }, affixes: [] },
      },
      skills: ["quickShot", "pierceShot"],
      skillPreset: ["pierceShot", "quickShot"],
      recruit: true,
      dialogue: "经验丰富的猎人，百步穿杨。",
    },
    herbalist: {
      id: "herbalist", name: "草药师", class: "mage",
      classPath: ["mage"], elementSpec: "heal",
      level: 6,
      attributes: { str: 3, agi: 7, int: 12, vit: 7, ten: 6, spi: 14 },
      equipment: {
        weapon: { name: "草药杖", type: "staff", rarity: "green", level: 6, baseStats: { magAtk: 8 }, affixes: [] },
      },
      skills: ["heal", "purify"],
      skillPreset: ["heal", "purify"],
      recruit: true,
      dialogue: "擅长治疗的草药师，可以照顾队友。",
    },
    nightWatchman: {
      id: "nightWatchman", name: "守夜人学徒", class: "warrior",
      classPath: ["warrior"], elementSpec: null,
      level: 15,
      attributes: { str: 16, agi: 8, int: 6, vit: 14, ten: 14, spi: 6 },
      equipment: {
        weapon: { name: "钢剑", type: "sword", rarity: "blue", level: 15, baseStats: { physAtk: 20 }, affixes: [] },
      },
      skills: ["heavyStrike", "armorBreak", "ironWall"],
      skillPreset: ["armorBreak", "ironWall", "heavyStrike"],
      recruit: true,
      dialogue: "守夜人的得力助手，体格强健。",
    },
  },

  // ========== 等级上限解锁消息 ==========
  expLockMessages: {
    20: "灰烟村的守护者已认可你，但外面的世界更加危险。",
    40: "你已至当前区域的极限，需击败更强的守门员。",
    60: "你已突破自身极限，但真正的挑战才刚开始。",
    80: "传说中的力量在等待着你。",
    99: "你已站在世界之巅。",
  },

  // ========== 商店数据 ==========
  shops: {
    blacksmith: {
      name: "铁匠铺",
      items: [
        { id: "iron_sword", name: "铁剑", type: "sword", rarity: "white", level: 5, price: 50 },
        { id: "steel_sword", name: "钢剑", type: "sword", rarity: "green", level: 15, price: 200 },
        { id: "iron_armor", name: "铁甲", type: "armor", rarity: "white", level: 5, price: 40 },
        { id: "steel_armor", name: "钢甲", type: "armor", rarity: "green", level: 15, price: 180 },
      ],
    },
    tailor: {
      name: "裁缝铺",
      items: [
        { id: "cloth_armor", name: "布衣", type: "armor", rarity: "white", level: 1, price: 20 },
        { id: "leather_armor", name: "皮甲", type: "armor", rarity: "white", level: 5, price: 35 },
        { id: "mage_robe", name: "法师袍", type: "armor", rarity: "green", level: 10, price: 120 },
      ],
    },
  },

  // ========== 物品类型映射 ==========
  itemTypes: {
    consumable: { name: "消耗品" },
    material:   { name: "材料" },
    equipment:  { name: "装备" },
  },

  // ========== 物品定义 ==========
  items: {
    expPillS:  { id: "expPillS",  name: "经验丹",   type: "consumable", rarity: "orange", level: 1, stackable: true, maxStack: 99, desc: "使用获得1000000经验", use: "exp", value: 1000000 },
    expPillM:  { id: "expPillM",  name: "经验丹(中)", type: "consumable", rarity: "purple", level: 10, stackable: true, maxStack: 99, desc: "使用获得5000000经验", use: "exp", value: 5000000 },
    expPillL:  { id: "expPillL",  name: "经验丹(大)", type: "consumable", rarity: "red", level: 30, stackable: true, maxStack: 99, desc: "使用获得20000000经验", use: "exp", value: 20000000 },
    // --- 掉落材料 ---
    wolfFang:    { id: "wolfFang",    name: "狗牙",     type: "material", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "野狼的獠牙" },
    hareFur:     { id: "hareFur",     name: "兔毛",     type: "material", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "柔软的兔毛" },
    duckFeather: { id: "duckFeather", name: "鸭羽",     type: "material", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "野鸭的羽毛" },
    crabShell:   { id: "crabShell",   name: "蟹壳",     type: "material", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "坚硬的蟹壳" },
    banditToken: { id: "banditToken", name: "盗贼令牌", type: "material", rarity: "green",  level: 5, stackable: true, maxStack: 99, desc: "山贼的身份令牌" },
    skeletonBone:{ id: "skeletonBone",name: "骷髅碎片", type: "material", rarity: "green",  level: 8, stackable: true, maxStack: 99, desc: "骷髅兵的残骨" },
    shadowCloak: { id: "shadowCloak", name: "暗影披风", type: "material", rarity: "blue",   level: 15, stackable: true, maxStack: 99, desc: "暗影刺客的披风碎片" },
    fireCore:    { id: "fireCore",    name: "火焰核心", type: "material", rarity: "purple", level: 20, stackable: true, maxStack: 99, desc: "火焰元素的核心" },
    // --- 功能消耗品 ---
    hpPotion:    { id: "hpPotion",    name: "生命药水", type: "consumable", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "恢复50%生命", use: "heal", value: 0.5 },
    mpPotion:    { id: "mpPotion",    name: "法力药水", type: "consumable", rarity: "white",  level: 1, stackable: true, maxStack: 99, desc: "恢复50%法力", use: "mana", value: 0.5 },
    teleportScroll:{id:"teleportScroll",name:"传送卷轴",type:"consumable", rarity:"blue",    level: 1, stackable: true, maxStack: 9, desc: "传送回灰烟村", use: "teleport" },
  },

  // ========== 怪物数据 ==========
  monsters: {
    wolf:       { name: "野狼", level: 1, hp: 30, atk: 8, def: 2, speed: 10, exp: 12, gold: 5,
      drops: [{ item: "wolfFang", chance: 0.7, min: 1, max: 2 }, { item: "hpPotion", chance: 0.05, min: 1, max: 1 }] },
    hare:       { name: "野兔", level: 1, hp: 15, atk: 3, def: 1, speed: 15, exp: 8, gold: 2,
      drops: [{ item: "hareFur", chance: 0.8, min: 1, max: 3 }] },
    duck:       { name: "野鸭", level: 1, hp: 20, atk: 5, def: 1, speed: 12, exp: 10, gold: 3,
      drops: [{ item: "duckFeather", chance: 0.6, min: 1, max: 2 }] },
    crab:       { name: "螃蟹", level: 1, hp: 25, atk: 6, def: 5, speed: 5, exp: 12, gold: 4,
      drops: [{ item: "crabShell", chance: 0.65, min: 1, max: 2 }] },
    bandit:     { name: "山贼", level: 5, hp: 60, atk: 15, def: 5, speed: 8, exp: 30, gold: 15,
      drops: [{ item: "banditToken", chance: 0.5, min: 1, max: 1 }, { item: "hpPotion", chance: 0.15, min: 1, max: 2 }] },
    skeleton:   { name: "骷髅兵", level: 8, hp: 80, atk: 20, def: 8, speed: 7, exp: 45, gold: 20,
      drops: [{ item: "skeletonBone", chance: 0.6, min: 1, max: 3 }, { item: "mpPotion", chance: 0.1, min: 1, max: 1 }] },
    darkAssassin:{name: "暗影刺客", level: 15, hp: 120, atk: 40, def: 15, speed: 18, exp: 100, gold: 50,
      drops: [{ item: "shadowCloak", chance: 0.4, min: 1, max: 1 }, { item: "banditToken", chance: 0.3, min: 1, max: 2 }] },
    fireElement: { name: "火焰元素", level: 20, hp: 200, atk: 60, def: 25, speed: 12, exp: 200, gold: 100,
      drops: [{ item: "fireCore", chance: 0.5, min: 1, max: 1 }, { item: "mpPotion", chance: 0.2, min: 1, max: 2 }] },
  },
};
