// core/data.js - 游戏数据定义
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

  // ========== 品质等级排序 ==========
  Q_ORDER: {
    white: 0,
    green: 1,
    blue: 2,
    purple: 3,
    orange: 4,
    red: 5,
    gold: 6,
  },

  // ========== 品质倍率 ==========
  Q_MULTI: {
    white: 1.0,
    green: 1.3,
    blue: 1.7,
    purple: 2.2,
    orange: 3.0,
    red: 4.0,
    gold: 2.0,
  },

  // ========== 装备承载上限 ==========
  equipLimits: [
    { levelRange: [1, 20],   maxRarity: "blue",   sameColorMax: 2 },
    { levelRange: [21, 40], maxRarity: "purple", sameColorMax: 2 },
    { levelRange: [41, 60], maxRarity: "orange", sameColorMax: 2 },
    { levelRange: [61, 80], maxRarity: "red",    sameColorMax: 2 },
    { levelRange: [81, 99], maxRarity: "red",    sameColorMax: 99 },
  ],

  // ========== 品质持有上限 ==========
  qualityLimits: {
    early:   { maxQuality: "blue",   sameLimit: 2 },
    mid:     { maxQuality: "purple", sameLimit: 2 },
    late:    { maxQuality: "orange", sameLimit: 2 },
    endgame: { maxQuality: "red",    sameLimit: 2 },
  },

  // ========== 装备槽位 ==========
  equipSlots: [
    "weapon", "offhand", "helmet", "chest", "legs",
    "boots", "gloves", "necklace", "ring1", "ring2",
  ],

  // ========== 槽位名称 ==========
  slots: {
    weapon: "武器", offhand: "副手", helmet: "头盔", chest: "胸甲",
    legs: "腿甲", boots: "靴子", gloves: "手套", necklace: "项链",
    ring1: "戒指1", ring2: "戒指2",
    sword: "单手剑", axe: "斧头", hammer: "锤子", shield: "盾牌",
    bow: "弓", crossbow: "弩", dagger: "匕首",
    staff: "法杖", wand: "魔杖",
    cloth: "布甲", leather: "皮甲", mail: "锁甲", plate: "板甲",
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
      name: "机械守卫",
      level: 60,
      knows: "组织的底层逻辑，但无法反抗指令。",
      stance: "…指令执行中。检测到未授权入侵者。",
      combat: { hp: 8000, atk: 500, armor: 400, crit: 0.1, style: "meleeBoss" },
      reward: "机械核心",
      onDefeat: "unlock_newWorld",
    },
    hermit: {
      name: "隐者",
      level: 80,
      knows: "组织高层秘密，知道父母真相。",
      stance: "你终于来了。坐吧，有些事是时候告诉你了。",
      combat: { hp: 12000, atk: 800, armor: 300, crit: 0.4, style: "spellSword" },
      reward: "父母的遗物",
      onDefeat: "unlock_skyTower",
    },
    finalBoss: {
      name: "主人",
      level: 99,
      knows: "一切真相。组织创始人。",
      stance: "你以为走到这里就算结束了吗？",
      combat: { hp: 20000, atk: 1500, armor: 500, crit: 0.5, style: "finalBoss" },
      reward: "真相碎片",
      onDefeat: "game_clear",
    },
  },

  // ========== NPC ==========
  npcs: {
    elin: {
      name: "艾琳",
      role: "青梅竹马·弓箭手",
      desc: "村里长大的弓箭手少女，与你情同手足。",
      location: "greyVillage",
      personality: "温柔但倔强",
    },
    blacksmith: {
      name: "铁匠老哈",
      role: "铁匠·装备商人",
      desc: "沉默寡言的老铁匠，手艺一绝。",
      location: "greyVillage",
      personality: "粗犷",
    },
    mira: {
      name: "米拉",
      role: "杂货店主·消耗品商人",
      desc: "笑盈盈的杂货铺老板娘，什么都有。",
      location: "greyVillage",
      personality: "热情",
    },
    auntie: {
      name: "三婶",
      role: "杂货铺三婶·村庄八卦",
      desc: "消息灵通的村里三婶，闲聊可得情报。",
      location: "greyVillage",
      personality: "健谈",
    },
  },

  // ========== 货币系统 ==========
  currency: {
    name: "金币",
    maxCarry: 99999,
    copperName: "铜",
    silverName: "银",
    goldName: "金",
  },

  // ========== 消耗品 ==========
  consumables: {
    potion_s: {
      name: "小型生命药水",
      type: "consumable",
      healHp: 40,
      healMp: 0,
      price: 30,
      desc: "恢复40点生命",
      stackable: true,
      maxStack: 99,
    },
    potion_m: {
      name: "中型生命药水",
      type: "consumable",
      healHp: 100,
      healMp: 0,
      price: 80,
      desc: "恢复100点生命",
      stackable: true,
      maxStack: 99,
    },
    ether_s: {
      name: "小型法力药水",
      type: "consumable",
      healHp: 0,
      healMp: 30,
      price: 40,
      desc: "恢复30点法力",
      stackable: true,
      maxStack: 99,
    },
    bread: {
      name: "面包",
      type: "consumable",
      healHp: 20,
      healMp: 0,
      price: 10,
      desc: "恢复20点生命",
      stackable: true,
      maxStack: 99,
    },
  },

  // ========== 背包系统 ==========
  inventory: {
    capacity: 30,
    perGatekeeperBonus: 5,
    stackLimits: {
      gold: 1,
      basic: 99,
      rare: 1,
    },
  },

  // ========== 经验锁提示 ==========
  expLockMessages: {
    20: "击败村长才能继续成长。他在村长家等你。",
    40: "守夜人挡住了前路。灰烬山脉深处见。",
    60: "机械守卫封锁了通道。灰烬矿场深处见。",
    80: "隐者在前方等待。新世界的深处。",
    99: "主人就在塔顶。一切答案在那里。",
  },

  // ========== 符文之语（3组）==========
  runewords: {
    flameStorm: {
      name: "烈焰风暴",
      c: ["fire", "fire", "lightning"],
      effects: [
        { stat: "fireDmg", value: 0.20 },
        { stat: "lightDmg", value: 0.10 },
        { stat: "burnOnHit", value: 0.30 },
      ],
      desc: "攻击附带烈焰与雷电之力，有概率灼烧目标",
    },
    frostGuard: {
      name: "冰霜守护",
      c: ["frost", "frost", "physical"],
      effects: [
        { stat: "frostRes", value: 0.30 },
        { stat: "physDef", value: 0.20 },
        { stat: "slowOnHit", value: 0.40 },
      ],
      desc: "大幅提升冰霜抗性与物理防御，攻击附带减速",
    },
    thunderBlade: {
      name: "雷霆之刃",
      c: ["lightning", "physical", "physical"],
      effects: [
        { stat: "lightDmg", value: 0.15 },
        { stat: "physDmg", value: 0.15 },
        { stat: "stunOnHit", value: 0.25 },
      ],
      desc: "物理与雷电双重增幅，有概率使目标僵直",
    },
  },

  // ========== 装备类型到槽位映射 ==========
  typeToSlot: {
    sword: "weapon", axe: "weapon", hammer: "weapon",
    bow: "weapon", crossbow: "weapon", dagger: "weapon",
    staff: "weapon", wand: "weapon",
    shield: "offhand",
    armor: "chest", helmet: "helmet", chest: "chest", legs: "legs",
    boots: "boots", gloves: "gloves",
    necklace: "necklace", ring: "ring1",
  },

  // ========== 技能系统 ==========
  skills: {
    // ---------- 新手技能（3个）----------
    warrior_heavyhit: {
      id: "warrior_heavyhit",
      name: "重击",
      desc: "蓄力一击，造成1.5倍物理伤害，附加流血效果",
      reqLevel: 1,
      reqClass: "warrior",
      reqBranch: null,
      mpCost: 10,
      cooldown: 2,
      baseDamage: 1.5,
      baseHeal: null,
      element: "physical",
      effects: [
        { type: "apply_status", status: "bleed", chance: 0.80, duration: 3 },
      ],
    },
    ranger_quickshot: {
      id: "ranger_quickshot",
      name: "快速射击",
      desc: "快速射出一箭，造成1.3倍物理伤害",
      reqLevel: 1,
      reqClass: "ranger",
      reqBranch: null,
      mpCost: 8,
      cooldown: 1,
      baseDamage: 1.3,
      baseHeal: null,
      element: "physical",
      effects: [],
    },
    mage_minorheal: {
      id: "mage_minorheal",
      name: "小治疗",
      desc: "恢复目标20%最大生命值",
      reqLevel: 1,
      reqClass: "mage",
      reqBranch: null,
      mpCost: 12,
      cooldown: 2,
      baseDamage: null,
      baseHeal: 0.2,
      element: "heal",
      effects: [],
    },

    // ---------- 原有技能（9个）----------
    shield_wall: {
      id: "shield_wall",
      name: "盾墙",
      desc: "举起盾牌，本回合受到的伤害减少50%",
      reqLevel: 20,
      reqClass: "warrior",
      reqBranch: null,
      mpCost: 15,
      cooldown: 3,
      baseDamage: null,
      baseHeal: null,
      element: null,
      effects: [
        { type: "buff_defense", value: 0.5, duration: 1 },
      ],
    },
    fierce_strike: {
      id: "fierce_strike",
      name: "猛击",
      desc: "全力一击，造成1.8倍物理伤害",
      reqLevel: 20,
      reqClass: "warrior",
      reqBranch: null,
      mpCost: 20,
      cooldown: 2,
      baseDamage: 1.8,
      baseHeal: null,
      element: "physical",
      effects: [],
    },
    double_shot: {
      id: "double_shot",
      name: "连射",
      desc: "连续射出两箭，对目标造成1.2倍物理伤害×2",
      reqLevel: 20,
      reqClass: "ranger",
      reqBranch: null,
      mpCost: 18,
      cooldown: 2,
      baseDamage: 1.2,
      baseHeal: null,
      element: "physical",
      effects: [
        { type: "multi_target", hits: 2 },
      ],
    },
    slow_arrow: {
      id: "slow_arrow",
      name: "减速箭",
      desc: "射出冰冷的箭矢，造成伤害并减速目标",
      reqLevel: 20,
      reqClass: "ranger",
      reqBranch: null,
      mpCost: 15,
      cooldown: 3,
      baseDamage: 1.0,
      baseHeal: null,
      element: "frost",
      effects: [
        { type: "apply_status", status: "slow", chance: 0.80, duration: 2 },
      ],
    },
    fireball: {
      id: "fireball",
      name: "火球",
      desc: "投掷火球，造成1.5倍火焰伤害，有概率灼烧目标",
      reqLevel: 20,
      reqClass: "mage",
      reqBranch: "fire",
      mpCost: 22,
      cooldown: 2,
      baseDamage: 1.5,
      baseHeal: null,
      element: "fire",
      effects: [
        { type: "apply_status", status: "burn", chance: 0.60, duration: 3 },
      ],
    },
    ice_arrow: {
      id: "ice_arrow",
      name: "冰箭",
      desc: "发射冰箭，造成1.3倍冰霜伤害，有概率减速目标",
      reqLevel: 20,
      reqClass: "mage",
      reqBranch: "frost",
      mpCost: 18,
      cooldown: 2,
      baseDamage: 1.3,
      baseHeal: null,
      element: "frost",
      effects: [
        { type: "apply_status", status: "slow", chance: 0.70, duration: 2 },
      ],
    },
    lightning_bolt: {
      id: "lightning_bolt",
      name: "雷击",
      desc: "召唤雷电，造成1.4倍雷电伤害，有概率使目标僵直",
      reqLevel: 20,
      reqClass: "mage",
      reqBranch: "lightning",
      mpCost: 20,
      cooldown: 2,
      baseDamage: 1.4,
      baseHeal: null,
      element: "lightning",
      effects: [
        { type: "apply_status", status: "stun", chance: 0.50, duration: 1 },
      ],
    },
    heal: {
      id: "heal",
      name: "治疗术",
      desc: "为友方目标恢复30%最大生命值",
      reqLevel: 20,
      reqClass: "mage",
      reqBranch: "heal",
      mpCost: 25,
      cooldown: 3,
      baseDamage: null,
      baseHeal: 0.3,
      element: "heal",
      effects: [],
    },
    war_cry: {
      id: "war_cry",
      name: "战吼",
      desc: "发出战吼，鼓舞自身，攻击力提升30%，持续3回合",
      reqLevel: 40,
      reqClass: "warrior",
      reqBranch: null,
      mpCost: 25,
      cooldown: 4,
      baseDamage: null,
      baseHeal: null,
      element: null,
      effects: [
        { type: "buff_attack", value: 0.3, duration: 3 },
      ],
    },
  },
};

try{module.exports=DATA;}catch(e){}
