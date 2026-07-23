
const GAME_DATA = {
  version: '0.3.0',

  // ---------- 品质定义 ----------
  quality: {
    white:  { order: 0, name: '普通', color: '#cccccc', affixCount: 0, maxAffix: 0 },
    green:  { order: 1, name: '优秀', color: '#4ecdc4', affixCount: [1,2], maxAffix: 2 },
    blue:   { order: 2, name: '精良', color: '#54a0ff', affixCount: [2,3], maxAffix: 3 },
    purple: { order: 3, name: '史诗', color: '#a55eea', affixCount: [3,4], maxAffix: 4 },
    orange: { order: 4, name: '传说', color: '#fa8231', affixCount: [4,5], maxAffix: 5 },
    red:    { order: 5, name: '神话', color: '#eb3b5a', affixCount: 6, maxAffix: 6 }
  },

  Q_ORDER: { white: 0, green: 1, blue: 2, purple: 3, orange: 4, red: 5 },
  Q_COLOR: { white: '#cccccc', green: '#4ecdc4', blue: '#54a0ff', purple: '#a55eea', orange: '#fa8231', red: '#eb3b5a' },
  Q_NAME:  { white: '普通', green: '优秀', blue: '精良', purple: '史诗', orange: '传说', red: '神话' },
  Q_MULTI: { white: 1.0, green: 1.15, blue: 1.35, purple: 1.6, orange: 2.0, red: 2.5 },
  Q_WEIGHTS: { green: 40, blue: 30, purple: 20, orange: 8, red: 2 },

  // ---------- 装备槽位 ----------
  slots: {
    weapon:   '主手',
    offhand:  '副手',
    helmet:   '头盔',
    chest:    '胸甲',
    legs:     '护腿',
    boots:    '靴子',
    gloves:   '护手',
    necklace: '项链',
    ring1:    '戒指',
    ring2:    '戒指'
  },

  // ---------- 150条完整词条池 ----------
  affixes: [
    // === 攻击类 (30条) ===
    { n: '锋锐', e: '物理攻击+2%', q: 'green', type: 'attack', val: 0.02 },
    { n: '重击', e: '物理攻击+4%', q: 'blue', type: 'attack', val: 0.04 },
    { n: '碎甲', e: '物理攻击+6%', q: 'purple', type: 'attack', val: 0.06 },
    { n: '裂刃', e: '物理攻击+8%', q: 'orange', type: 'attack', val: 0.08 },
    { n: '断钢', e: '物理攻击+10%', q: 'red', type: 'attack', val: 0.10 },
    { n: '精准', e: '命中率+2%', q: 'green', type: 'attack', val: 0.02 },
    { n: '鹰眼', e: '命中率+4%', q: 'blue', type: 'attack', val: 0.04 },
    { n: '凝视', e: '命中率+6%', q: 'purple', type: 'attack', val: 0.06 },
    { n: '破绽', e: '暴击率+2%', q: 'blue', type: 'attack', val: 0.02 },
    { n: '致命', e: '暴击率+4%', q: 'purple', type: 'attack', val: 0.04 },
    { n: '一击', e: '暴击率+6%', q: 'orange', type: 'attack', val: 0.06 },
    { n: '狂暴', e: '暴击伤害+10%', q: 'purple', type: 'attack', val: 0.10 },
    { n: '毁灭', e: '暴击伤害+20%', q: 'orange', type: 'attack', val: 0.20 },
    { n: '法术之力', e: '法术攻击+2%', q: 'green', type: 'attack', val: 0.02 },
    { n: '法术涌动', e: '法术攻击+4%', q: 'blue', type: 'attack', val: 0.04 },
    { n: '法术专注', e: '法术攻击+6%', q: 'purple', type: 'attack', val: 0.06 },
    { n: '法术穿透', e: '法术攻击+8%', q: 'orange', type: 'attack', val: 0.08 },
    { n: '法术湮灭', e: '法术攻击+10%', q: 'red', type: 'attack', val: 0.10 },
    { n: '火焰亲和', e: '火焰伤害+5%', q: 'blue', type: 'attack', val: 0.05 },
    { n: '寒冰亲和', e: '冰霜伤害+5%', q: 'blue', type: 'attack', val: 0.05 },
    { n: '雷电亲和', e: '雷电伤害+5%', q: 'blue', type: 'attack', val: 0.05 },
    { n: '暗影亲和', e: '暗影伤害+5%', q: 'blue', type: 'attack', val: 0.05 },
    { n: '奥术亲和', e: '奥术伤害+5%', q: 'blue', type: 'attack', val: 0.05 },
    { n: '箭矢+1', e: '每次射击额外攻击1个目标', q: 'blue', type: 'attack', val: 1 },
    { n: '箭矢+2', e: '每次射击额外攻击2个目标', q: 'orange', type: 'attack', val: 2 },
    { n: '穿透射击', e: '无视目标15%护甲', q: 'purple', type: 'attack', val: 0.15 },
    { n: '猛力挥击', e: '近战攻击额外造成10%溅射伤害', q: 'blue', type: 'attack', val: 0.10 },
    { n: '连击', e: '普通攻击有15%概率触发第二次攻击', q: 'purple', type: 'attack', val: 0.15 },
    { n: '斩杀', e: '对生命低于30%的目标伤害+20%', q: 'orange', type: 'attack', val: 0.20 },
    { n: '破法', e: '对法术护甲高于自己的目标伤害+15%', q: 'purple', type: 'attack', val: 0.15 },

    // === 防御类 (30条) ===
    { n: '坚固', e: '物理护甲+5%', q: 'green', type: 'defense', val: 0.05 },
    { n: '铁壁', e: '物理护甲+10%', q: 'blue', type: 'defense', val: 0.10 },
    { n: '钢铸', e: '物理护甲+15%', q: 'purple', type: 'defense', val: 0.15 },
    { n: '堡垒', e: '物理护甲+20%', q: 'orange', type: 'defense', val: 0.20 },
    { n: '不朽', e: '物理护甲+25%', q: 'red', type: 'defense', val: 0.25 },
    { n: '抗魔', e: '法术护甲+5%', q: 'green', type: 'defense', val: 0.05 },
    { n: '魔障', e: '法术护甲+10%', q: 'blue', type: 'defense', val: 0.10 },
    { n: '镜面', e: '法术护甲+15%', q: 'purple', type: 'defense', val: 0.15 },
    { n: '虚无', e: '法术护甲+20%', q: 'orange', type: 'defense', val: 0.20 },
    { n: '冥思', e: '法术护甲+25%', q: 'red', type: 'defense', val: 0.25 },
    { n: '生命', e: '生命上限+5%', q: 'green', type: 'defense', val: 0.05 },
    { n: '生机', e: '生命上限+10%', q: 'blue', type: 'defense', val: 0.10 },
    { n: '蓬勃', e: '生命上限+15%', q: 'purple', type: 'defense', val: 0.15 },
    { n: '不息', e: '生命上限+20%', q: 'orange', type: 'defense', val: 0.20 },
    { n: '永恒', e: '生命上限+25%', q: 'red', type: 'defense', val: 0.25 },
    { n: '格挡', e: '格挡值+5', q: 'green', type: 'defense', val: 5 },
    { n: '盾墙', e: '格挡值+10', q: 'blue', type: 'defense', val: 10 },
    { n: '铁门', e: '格挡值+15', q: 'purple', type: 'defense', val: 15 },
    { n: '壁垒', e: '格挡值+20', q: 'orange', type: 'defense', val: 20 },
    { n: '护盾大师', e: '格挡时额外减免5%伤害', q: 'purple', type: 'defense', val: 0.05 },
    { n: '韧性', e: '暴击抵抗+5%', q: 'blue', type: 'defense', val: 0.05 },
    { n: '坚毅', e: '暴击抵抗+10%', q: 'purple', type: 'defense', val: 0.10 },
    { n: '不屈', e: '暴击抵抗+15%', q: 'orange', type: 'defense', val: 0.15 },
    { n: '回复', e: '生命恢复+2/回合', q: 'green', type: 'defense', val: 2 },
    { n: '再生', e: '生命恢复+5/回合', q: 'blue', type: 'defense', val: 5 },
    { n: '愈合', e: '生命恢复+10/回合', q: 'purple', type: 'defense', val: 10 },
    { n: '守护', e: '全护甲+5%', q: 'blue', type: 'defense', val: 0.05 },
    { n: '圣盾', e: '全护甲+10%', q: 'purple', type: 'defense', val: 0.10 },
    { n: '庇护', e: '受到攻击时有8%概率获得护盾', q: 'orange', type: 'defense', val: 0.08 },
    { n: '反伤', e: '受到攻击时反弹5%伤害', q: 'purple', type: 'defense', val: 0.05 },

    // === 功能类 (30条) ===
    { n: '经验', e: '经验获取+3%', q: 'green', type: 'utility', val: 0.03 },
    { n: '勤学', e: '经验获取+6%', q: 'blue', type: 'utility', val: 0.06 },
    { n: '博闻', e: '经验获取+10%', q: 'purple', type: 'utility', val: 0.10 },
    { n: '富足', e: '金币获取+5%', q: 'green', type: 'utility', val: 0.05 },
    { n: '贪婪', e: '金币获取+10%', q: 'blue', type: 'utility', val: 0.10 },
    { n: '聚财', e: '金币获取+20%', q: 'purple', type: 'utility', val: 0.20 },
    { n: '效率', e: '采集速度+10%', q: 'green', type: 'utility', val: 0.10 },
    { n: '疾行', e: '采集速度+20%', q: 'blue', type: 'utility', val: 0.20 },
    { n: '敏锐', e: '采集时高品质材料获取率+5%', q: 'purple', type: 'utility', val: 0.05 },
    { n: '锻造之魂', e: '锻造成功率+2%', q: 'blue', type: 'utility', val: 0.02 },
    { n: '锻造之心', e: '锻造成功率+5%', q: 'purple', type: 'utility', val: 0.05 },
    { n: '工匠', e: '锻造时稀有词条出现率+5%', q: 'orange', type: 'utility', val: 0.05 },
    { n: '附魔之触', e: '附魔品质+1档', q: 'purple', type: 'utility', val: 1 },
    { n: '附魔之眼', e: '附魔品质+1档', q: 'orange', type: 'utility', val: 1 },
    { n: '镶嵌之手', e: '镶嵌时宝石效果+10%', q: 'blue', type: 'utility', val: 0.10 },
    { n: '炼金之智', e: '药剂效果+10%', q: 'blue', type: 'utility', val: 0.10 },
    { n: '药草亲和', e: '采集草药时数量+20%', q: 'green', type: 'utility', val: 0.20 },
    { n: '矿物亲和', e: '采矿时数量+20%', q: 'green', type: 'utility', val: 0.20 },
    { n: '木材亲和', e: '伐木时数量+20%', q: 'green', type: 'utility', val: 0.20 },
    { n: '坚韧之魂', e: '死亡时经验损失-5%', q: 'purple', type: 'utility', val: 0.05 },
    { n: '顽强', e: '死亡时经验损失-10%', q: 'orange', type: 'utility', val: 0.10 },
    { n: '不灭', e: '硬核模式下死亡转为碑文（仅一次）', q: 'red', type: 'utility', val: 1 },
    { n: '复生', e: '战斗中首次生命归零时恢复20%生命', q: 'orange', type: 'utility', val: 0.20 },
    { n: '战友', e: '随从属性+5%', q: 'blue', type: 'utility', val: 0.05 },
    { n: '领袖', e: '随从属性+10%', q: 'purple', type: 'utility', val: 0.10 },
    { n: '统帅', e: '随从属性+15%', q: 'orange', type: 'utility', val: 0.15 },
    { n: '好感', e: '随从好感度获取+10%', q: 'green', type: 'utility', val: 0.10 },
    { n: '信赖', e: '随从好感度获取+20%', q: 'blue', type: 'utility', val: 0.20 },
    { n: '羁绊', e: '随从好感度获取+30%', q: 'purple', type: 'utility', val: 0.30 },
    { n: '守护之约', e: '随从触发保护行为的概率+10%', q: 'purple', type: 'utility', val: 0.10 },

    // === 特殊类 (30条) ===
    { n: '灼烧', e: '攻击时5%概率灼烧目标', q: 'blue', type: 'special', val: 0.05 },
    { n: '寒冰', e: '攻击时5%概率冰冻目标', q: 'blue', type: 'special', val: 0.05 },
    { n: '麻痹', e: '攻击时5%概率麻痹目标', q: 'blue', type: 'special', val: 0.05 },
    { n: '中毒', e: '攻击时5%概率中毒目标', q: 'blue', type: 'special', val: 0.05 },
    { n: '暗影蚀', e: '攻击时5%概率暗影腐蚀', q: 'purple', type: 'special', val: 0.05 },
    { n: '火焰爆炸', e: '攻击时8%概率触发火焰爆炸（AOE）', q: 'orange', type: 'special', val: 0.08 },
    { n: '冰霜新星', e: '被攻击时8%概率释放冰霜新星', q: 'orange', type: 'special', val: 0.08 },
    { n: '连锁闪电', e: '攻击时8%概率连锁闪电（3目标）', q: 'orange', type: 'special', val: 0.08 },
    { n: '召唤骷髅', e: '击杀时5%概率召唤骷髅', q: 'orange', type: 'special', val: 0.05 },
    { n: '生命偷取', e: '攻击时恢复伤害值5%的生命', q: 'purple', type: 'special', val: 0.05 },
    { n: '法力偷取', e: '攻击时恢复伤害值3%的法力', q: 'purple', type: 'special', val: 0.03 },
    { n: '护盾生成', e: '战斗开始时获得护盾（吸收30伤害）', q: 'orange', type: 'special', val: 30 },
    { n: '护盾强化', e: '护盾吸收量+50%', q: 'red', type: 'special', val: 0.50 },
    { n: '疾风步', e: '闪避后下回合伤害+20%', q: 'purple', type: 'special', val: 0.20 },
    { n: '破釜沉舟', e: '生命低于30%时伤害+25%', q: 'orange', type: 'special', val: 0.25 },
    { n: '绝境反击', e: '生命低于15%时伤害+50%', q: 'red', type: 'special', val: 0.50 },
    { n: '战吼', e: '每场战斗首次攻击伤害+30%', q: 'blue', type: 'special', val: 0.30 },
    { n: '嗜血', e: '击杀目标后恢复15%生命', q: 'purple', type: 'special', val: 0.15 },
    { n: '处刑人', e: '对生命低于20%目标必暴击', q: 'orange', type: 'special', val: 1 },
    { n: '无畏', e: '免疫恐惧效果', q: 'purple', type: 'special', val: 1 },
    { n: '专注', e: '免疫沉默效果', q: 'purple', type: 'special', val: 1 },
    { n: '净化', e: '每回合开始时30%概率移除一个负面状态', q: 'orange', type: 'special', val: 0.30 },
    { n: '回溯', e: '受到致命伤害时10%概率恢复至50%生命', q: 'red', type: 'special', val: 0.10 },
    { n: '镜像', e: '攻击时5%概率召唤一个镜像', q: 'red', type: 'special', val: 0.05 },
    { n: '时间缓流', e: '被攻击时5%概率使目标下回合延迟行动', q: 'orange', type: 'special', val: 0.05 },
    { n: '重力场', e: '攻击时5%概率使目标下回合无法闪避', q: 'purple', type: 'special', val: 0.05 },
    { n: '虚弱诅咒', e: '攻击时5%概率降低目标攻击20%', q: 'purple', type: 'special', val: 0.20 },
    { n: '迟缓诅咒', e: '攻击时5%概率降低目标命中20%', q: 'purple', type: 'special', val: 0.20 },
    { n: '破甲诅咒', e: '攻击时5%概率降低目标护甲20%', q: 'purple', type: 'special', val: 0.20 },
    { n: '暗影步', e: '闪避后立即对攻击者造成反击', q: 'orange', type: 'special', val: 1 },

    // === 稀有类 (30条) ===
    { n: '龙之怒', e: '攻击时3%概率造成300%伤害', q: 'orange', type: 'rare', val: 3.0 },
    { n: '龙之鳞', e: '受到攻击时3%概率免疫本次伤害', q: 'orange', type: 'rare', val: 0.03 },
    { n: '龙之息', e: '战斗开始时对所有敌人造成50伤害', q: 'orange', type: 'rare', val: 50 },
    { n: '先祖之力', e: '所有属性+3%', q: 'orange', type: 'rare', val: 0.03 },
    { n: '先祖之魂', e: '所有属性+5%', q: 'red', type: 'rare', val: 0.05 },
    { n: '传奇之力', e: '所有伤害+8%', q: 'red', type: 'rare', val: 0.08 },
    { n: '传奇之盾', e: '所有抗性+8%', q: 'red', type: 'rare', val: 0.08 },
    { n: '传奇之速', e: '所有行动优先+1', q: 'red', type: 'rare', val: 1 },
    { n: '神佑', e: '每场战斗有一次机会免疫致命伤害', q: 'red', type: 'rare', val: 1 },
    { n: '神罚', e: '每场战斗有一次机会必定暴击', q: 'red', type: 'rare', val: 1 },
    { n: '神速', e: '每场战斗有一次机会额外行动一回合', q: 'red', type: 'rare', val: 1 },
    { n: '堕落之血', e: '生命低于50%时全属性+10%', q: 'orange', type: 'rare', val: 0.10 },
    { n: '觉醒之魂', e: '生命高于80%时伤害+15%', q: 'orange', type: 'rare', val: 0.15 },
    { n: '寂静之刃', e: '对法术职业伤害+25%', q: 'orange', type: 'rare', val: 0.25 },
    { n: '破城之锤', e: '对坦克职业伤害+25%', q: 'orange', type: 'rare', val: 0.25 },
    { n: '猎杀者', e: '对野兽类型敌人伤害+30%', q: 'orange', type: 'rare', val: 0.30 },
    { n: '驱魔人', e: '对暗影类型敌人伤害+30%', q: 'orange', type: 'rare', val: 0.30 },
    { n: '焚火者', e: '对火焰系敌人伤害+30%', q: 'orange', type: 'rare', val: 0.30 },
    { n: '冰封之心', e: '攻击时5%概率冻结目标2回合', q: 'red', type: 'rare', val: 2 },
    { n: '暗影领域', e: '每回合对全体敌人造成5暗影伤害', q: 'red', type: 'rare', val: 5 },
    { n: '光之领域', e: '每回合为全体队友恢复5生命', q: 'red', type: 'rare', val: 5 },
    { n: '时间裂隙', e: '攻击时3%概率使目标跳过本回合', q: 'red', type: 'rare', val: 0.03 },
    { n: '空间撕裂', e: '攻击时3%概率造成真实伤害', q: 'red', type: 'rare', val: 0.03 },
    { n: '命运扭转', e: '死亡时10%概率完全恢复', q: 'red', type: 'rare', val: 0.10 },
    { n: '灵魂绑定', e: '与一名随从共享生命', q: 'red', type: 'rare', val: 1 },
    { n: '虚空行者', e: '闪避率+15%，生命上限-10%', q: 'orange', type: 'rare', val: 0.15 },
    { n: '血誓者', e: '伤害+20%，每回合失去5生命', q: 'orange', type: 'rare', val: 0.20 },
    { n: '沉默者', e: '攻击时5%概率沉默目标3回合', q: 'red', type: 'rare', val: 3 },
    { n: '混沌之刃', e: '伤害在80%-120%之间浮动', q: 'orange', type: 'rare', val: 1 }
  ],

  // ---------- 装备模板 ----------
  equipmentTemplates: {
    weapon: [
      { p: '生锈的', b: '短剑', min: 1, max: 10, patk: [8, 15], matk: [0, 2] },
      { p: '父亲的旧', b: '短剑', min: 5, max: 15, patk: [12, 20], matk: [0, 3] },
      { p: '精钢', b: '长剑', min: 10, max: 25, patk: [18, 30], matk: [0, 5] },
      { p: '猎人之', b: '弓', min: 8, max: 20, patk: [15, 25], matk: [0, 2] },
      { p: '学徒的', b: '法杖', min: 10, max: 25, patk: [3, 8], matk: [15, 28] },
      { p: '暗影', b: '匕首', min: 15, max: 30, patk: [20, 35], matk: [2, 8] }
    ],
    chest: [
      { p: '粗布', b: '背心', min: 1, max: 10, pdef: [3, 8], mdef: [1, 4] },
      { p: '皮制', b: '胸甲', min: 8, max: 20, pdef: [8, 15], mdef: [3, 8] },
      { p: '锁子', b: '甲', min: 20, max: 40, pdef: [18, 30], mdef: [5, 12] }
    ],
    helmet: [
      { p: '布质', b: '头巾', min: 1, max: 10, pdef: [1, 4], mdef: [1, 3] },
      { p: '皮制', b: '帽', min: 5, max: 20, pdef: [3, 8], mdef: [2, 6] },
      { p: '铁制', b: '头盔', min: 20, max: 45, pdef: [10, 20], mdef: [3, 10] }
    ],
    legs: [
      { p: '粗布', b: '裤子', min: 1, max: 10, pdef: [2, 5], mdef: [1, 3] },
      { p: '皮制', b: '护腿', min: 8, max: 25, pdef: [5, 12], mdef: [2, 6] }
    ],
    boots: [
      { p: '旧', b: '皮靴', min: 1, max: 10, pdef: [1, 4], mdef: [0, 2] },
      { p: '轻便', b: '皮靴', min: 10, max: 25, pdef: [4, 10], mdef: [2, 5] }
    ],
    gloves: [
      { p: '皮制', b: '手套', min: 1, max: 10, pdef: [1, 3], mdef: [0, 2] },
      { p: '铁制', b: '护手', min: 15, max: 35, pdef: [5, 12], mdef: [2, 6] }
    ],
    necklace: [
      { p: '铜制', b: '项链', min: 10, max: 30, pdef: [0, 3], mdef: [3, 10] },
      { p: '银制', b: '吊坠', min: 25, max: 50, pdef: [2, 6], mdef: [8, 18] }
    ],
    ring: [
      { p: '铁', b: '指环', min: 5, max: 20, pdef: [1, 3], mdef: [1, 3] },
      { p: '铜', b: '戒指', min: 20, max: 45, pdef: [3, 8], mdef: [3, 8] }
    ],
    offhand: [
      { p: '木制', b: '盾牌', min: 5, max: 20, pdef: [5, 12], mdef: [2, 6] },
      { p: '铁制', b: '圆盾', min: 20, max: 45, pdef: [15, 28], mdef: [5, 12] },
      { p: '法术', b: '卷轴', min: 15, max: 40, pdef: [0, 3], matk: [10, 20] }
    ]
  },

  // ---------- 符文之语 ----------
  runewords: {
    fury:     { n: '怒火',   c: ['red', 'red', 'fire'],     e: '攻击时10%触发火焰爆炸' },
    frost:    { n: '冰霜',   c: ['blue', 'blue', 'ice'],    e: '攻击时10%冰冻目标' },
    immortal: { n: '不朽',   c: ['amber', 'diamond', 'amber'], e: '生命<30%时获得护盾' },
    shadow:   { n: '暗影',   c: ['green', 'purple', 'shadow'], e: '暴击时恢复5%生命' },
    thunder:  { n: '雷霆',   c: ['blue', 'green', 'lightning'], e: '攻击时10%连锁闪电' },
    holyshield:{ n: '圣盾',  c: ['diamond', 'amber', 'amber'], e: '受暴击减免50%额外伤害' },
    berserk:  { n: '狂战',   c: ['red', 'red', 'green'],      e: '生命<50%时伤害+20%' },
    sage:     { n: '智者',   c: ['purple', 'blue', 'arcane'], e: '施法时15%不消耗法力' }
  },

  // ---------- 材料定义 ----------
  materials: {
    herb: [
      { n: '野草药', q: 'white', d: '普通草药', m: 99 },
      { n: '银叶草', q: 'green', d: '微光叶子', m: 99 },
      { n: '龙血草', q: 'blue', d: '龙血沾染', m: 50 }
    ],
    ore: [
      { n: '铜矿石', q: 'white', d: '普通铜矿', m: 99 },
      { n: '铁矿石', q: 'green', d: '好铁矿', m: 99 },
      { n: '秘银矿石', q: 'blue', d: '银白光芒', m: 50 }
    ],
    gem: [
      { n: '碎裂红宝石', q: 'white', d: '破碎碎片', m: 99, g: 'red' },
      { n: '红宝石', q: 'green', d: '温暖光芒', m: 99, g: 'red' },
      { n: '蓝宝石', q: 'green', d: '深邃如海', m: 99, g: 'blue' },
      { n: '绿宝石', q: 'green', d: '翠绿欲滴', m: 99, g: 'green' },
      { n: '紫水晶', q: 'blue', d: '神秘力量', m: 50, g: 'purple' },
      { n: '钻石', q: 'purple', d: '纯净无瑕', m: 50, g: 'diamond' },
      { n: '琥珀', q: 'blue', d: '远古昆虫', m: 50, g: 'amber' }
    ],
    rune: [
      { n: '火焰符文', q: 'blue', d: '火焰印记', m: 50, r: 'fire' },
      { n: '冰霜符文', q: 'blue', d: '冰霜印记', m: 50, r: 'ice' },
      { n: '雷电符文', q: 'blue', d: '雷电印记', m: 50, r: 'lightning' },
      { n: '暗影符文', q: 'purple', d: '暗影印记', m: 50, r: 'shadow' },
      { n: '奥术符文', q: 'purple', d: '奥术印记', m: 50, r: 'arcane' }
    ],
    essence: [
      { n: '魔法精华', q: 'green', d: '微弱魔力', m: 99 },
      { n: '奥术精华', q: 'blue', d: '浓缩奥术', m: 50 },
      { n: '灵魂精华', q: 'purple', d: '灵魂力量', m: 50 }
    ]
  },

  // ---------- 消耗品定义 ----------
  consumables: {
    potion_hp: [
      { n: '小型生命药水', q: 'white', hp: 30, d: '恢复30生命', m: 20 },
      { n: '生命药水', q: 'green', hp: 80, d: '恢复80生命', m: 20 },
      { n: '大型生命药水', q: 'blue', hp: 200, d: '恢复200生命', m: 20 }
    ],
    potion_mp: [
      { n: '小型法力药水', q: 'white', mp: 20, d: '恢复20法力', m: 20 },
      { n: '法力药水', q: 'green', mp: 50, d: '恢复50法力', m: 20 }
    ],
    buff: [
      { n: '力量药剂', q: 'green', b: { s: 'str', v: 0.1 }, d: '力量+10%', m: 10 },
      { n: '敏捷药剂', q: 'green', b: { s: 'agi', v: 0.1 }, d: '敏捷+10%', m: 10 }
    ]
  },

  // ---------- NPC定义 ----------
  npcs: {
    'ailin': { name: '艾琳', title: '邻家少女', desc: '父母双亡，背着父亲的旧弓，是你出发的理由', location: 'village-gate', recruitClass: 'ranger', recruitCondition: '开局自动入队' },
    'village_chief': { name: '村长', title: '村长', desc: '看着你长大，守着你父母托付的承诺', location: 'village-center' },
    'lao_kui': { name: '老奎', title: '退休矿工', desc: '每天上山采矿石，认识你父亲', location: 'village-mine', recruitClass: 'berserker', recruitCondition: '灰烟村·好感度' },
    'blacksmith_ha': { name: '铁匠老哈', title: '铁匠', desc: '全村唯一会打铁的人', location: 'village-forge' },
    'mila': { name: '杂货店米拉', title: '杂货店老板娘', desc: '你爹以前赊过账', location: 'village-shop' },
    'wood': { name: '老农夫伍德', title: '种田人', desc: '见过你父母最后一面', location: 'village-farm' },
    'martha': { name: '裁缝玛莎', title: '裁缝', desc: '做过你父母的御寒斗篷', location: 'village-tailor', recruitClass: 'priest', recruitCondition: '灰烟村·附魔斗篷' },
    'xiao_ke': { name: '裁缝学徒小柯', title: '小裁缝', desc: '从城里来的，知道"外面的衣服"', location: 'village-tailor', recruitClass: 'ranger', recruitCondition: '灰烟镇·找布匹' },
    'lao_mu': { name: '养羊人老穆', title: '猎人/养羊人', desc: '见过插着金属管的野猪', location: 'village-pasture' },
    'nuoen': { name: '皮匠诺恩', title: '皮匠', desc: '能辨认"非自然"的皮', location: 'village-tanner', recruitClass: 'guardian', recruitCondition: '灰烟村·带"非自然的皮"' },
    'leina': { name: '村医蕾娜', title: '村医', desc: '你父母走之前找她拿过止痛药', location: 'village-clinic', recruitClass: 'priest', recruitCondition: '灰烟村·珍稀药材' },
    'lao_huo': { name: '瞎眼老霍', title: '卖炭人', desc: '听脚步声认人', location: 'village-woods' },
    'xiao_nuo': { name: '孤儿小诺', title: '孤儿', desc: '"我长大了也要去打怪物"', location: 'village-orphanage', recruitClass: 'ranger', recruitCondition: '灰烟村·长大后支线' },
    'zeweier': { name: '流浪商人泽维尔', title: '流浪商人', desc: '卖过红宝石给你父亲', location: 'village-random' }
  },

  // ---------- 世界区域定义 ----------
  zones: {
    'village': {
      name: '灰烟村',
      levelRange: [1, 20],
      gatekeeper: 'village_chief',
      description: '你长大的地方。酒馆、铁匠铺、裁缝铺、皮匠铺、村医屋、墓地。',
      frames: {
        'village-tavern': { name: '酒馆', desc: '你家的酒馆。艾琳常来帮忙。', exits: ['village-center', 'village-gate'], type: 'safe' },
        'village-center': { name: '村中心广场', desc: '村长常在这里晒太阳。', exits: ['village-tavern', 'village-forge', 'village-shop', 'village-farm', 'village-gate'], type: 'safe' },
        'village-forge': { name: '铁匠铺', desc: '铁匠老哈的铺子，火星四溅。', exits: ['village-center'], type: 'safe', npc: 'blacksmith_ha' },
        'village-shop': { name: '杂货店', desc: '米拉老板娘的店，什么都卖一点。', exits: ['village-center'], type: 'safe', npc: 'mila' },
        'village-farm': { name: '农田', desc: '伍德老伯的田地，远处是灰烟山脉。', exits: ['village-center', 'village-pasture'], type: 'safe', npc: 'wood' },
        'village-pasture': { name: '牧场', desc: '老穆的羊群。山风里有股金属味。', exits: ['village-farm', 'village-woods'], type: 'wild', npc: 'lao_mu' },
        'village-woods': { name: '后山树林', desc: '老霍在这里砍柴。林子里有野猪。', exits: ['village-pasture', 'village-mine'], type: 'wild', npc: 'lao_huo' },
        'village-mine': { name: '村口矿洞', desc: '老奎常来采矿的地方，浅层已经采空了。', exits: ['village-woods', 'village-gate'], type: 'wild', npc: 'lao_kui' },
        'village-gate': { name: '村口', desc: '灰烟村的出口。艾琳在这里等你。', exits: ['village-center', 'village-mine', 'mountain-foot'], type: 'safe', npc: 'ailin' },
        'village-tailor': { name: '裁缝铺', desc: '玛莎和小柯的铺子。', exits: ['village-center'], type: 'safe' },
        'village-tanner': { name: '皮匠铺', desc: '诺恩在这里处理兽皮。', exits: ['village-center'], type: 'safe' },
        'village-clinic': { name: '村医屋', desc: '蕾娜的药草味。', exits: ['village-center'], type: 'safe' },
        'village-orphanage': { name: '孤儿院', desc: '小诺和其他孤儿住在这里。', exits: ['village-center'], type: 'safe' },
        'village-cemetery': { name: '墓地', desc: '你父母的墓碑在这里。', exits: ['village-center'], type: 'safe' }
      }
    },
    'mountain': {
      name: '灰烟山脉',
      levelRange: [21, 40],
      gatekeeper: 'night_watch',
      description: '灰烟村外的山脉。山脚洞、废弃仓库、河岸洞穴、路边坟、旧矿道。',
      locked: true,
      frames: {
        'mountain-foot': { name: '山脚', desc: '灰烟山脉的起点。风变冷了。', exits: ['village-gate', 'mountain-cave1'], type: 'wild' },
        'mountain-cave1': { name: '山脚洞', desc: '一个浅浅的洞穴，有野兽的爪印。', exits: ['mountain-foot', 'mountain-warehouse'], type: 'dungeon' },
        'mountain-warehouse': { name: '废弃仓库', desc: '旧时代的建筑，墙上有人画过符号。', exits: ['mountain-cave1', 'mountain-river'], type: 'dungeon' },
        'mountain-river': { name: '河岸', desc: '河水浑浊，对岸有光。', exits: ['mountain-warehouse', 'mountain-rivercave'], type: 'wild' },
        'mountain-rivercave': { name: '河岸洞穴', desc: '潮湿阴暗，水滴滴答。', exits: ['mountain-river', 'mountain-grave'], type: 'dungeon' },
        'mountain-grave': { name: '路边坟', desc: '无名墓碑，周围有脚印。', exits: ['mountain-rivercave', 'mountain-oldmine'], type: 'wild' },
        'mountain-oldmine': { name: '旧矿道', desc: '深不见底的矿道，有低语声。', exits: ['mountain-grave'], type: 'dungeon' }
      }
    }
  },

  // ---------- 敌人定义 ----------
  enemies: {
    'wild_boar': { name: '野猪', level: 1, hp: 30, patk: 8, pdef: 3, mdef: 1, agi: 5, exp: 15, gold: 5, loot: ['herb', 'ore'] },
    'forest_wolf': { name: '森林狼', level: 3, hp: 45, patk: 12, pdef: 4, mdef: 2, agi: 8, exp: 25, gold: 8, loot: ['herb', 'gem'] },
    'mine_rat': { name: '矿洞巨鼠', level: 5, hp: 60, patk: 15, pdef: 5, mdef: 3, agi: 10, exp: 35, gold: 12, loot: ['ore', 'gem'] },
    'bandit_scout': { name: '强盗斥候', level: 8, hp: 80, patk: 20, pdef: 8, mdef: 5, agi: 12, exp: 50, gold: 20, loot: ['equipment', 'gold'] },
    'cave_bear': { name: '洞穴熊', level: 12, hp: 150, patk: 30, pdef: 15, mdef: 8, agi: 6, exp: 80, gold: 35, loot: ['equipment', 'material'] }
  },

  // ---------- 守门员定义 ----------
  gatekeepers: {
    'village_chief': {
      name: '村长',
      level: 20,
      title: '灰烟村的守护者',
      description: '知道你父母的嘱托。不知道组织。"我答应过你爹娘，要让你活着。"',
      hp: 500, maxHp: 500, mp: 100, maxMp: 100,
      attributes: { str: 15, agi: 10, int: 12, vit: 20, ten: 18, spi: 10 },
      patk: 35, pdef: 30, mdef: 20,
      hit: 20, dodge: 8, crit: 5,
      skills: ['heal_self', 'shield_bash'],
      reward: { exp: 500, gold: 200, item: 'father_letter', unlockZone: 'mountain' },
      defeatText: '村长叹了口气："你长大了...去吧，但记住，村口以外，没人会护着你。"',
      failText: '村长摇了摇头："回去经营你的酒馆。这不是你该走的路。"'
    },
    'night_watch': {
      name: '守夜人',
      level: 40,
      title: '第三区·守夜人',
      description: '组织的中层执行者。知道你父母选择了离开。',
      hp: 1200, maxHp: 1200, mp: 200, maxMp: 200,
      attributes: { str: 25, agi: 20, int: 15, vit: 22, ten: 15, spi: 12 },
      patk: 80, pdef: 25, mdef: 20,
      hit: 35, dodge: 15, crit: 20,
      skills: ['shadow_strike', 'critical_slash'],
      reward: { exp: 1500, gold: 500, item: 'org_badge', unlockZone: 'mine' },
      defeatText: '守夜人倒下前，从怀里掏出一枚铭牌："第三区·守夜人"...',
      failText: '守夜人的刀停在你咽喉前一寸："你爹打赢了我，然后走了。你还不够格。"'
    }
  },

  // ---------- 经验曲线 ----------
  expCurve: {
    base: 100,
    multiplier: 1.15,
    maxLevel: 99,
    levelCaps: {
      1: 20,    // 击败村长解锁
      21: 40,   // 击败守夜人解锁
      41: 60,   // 击败机械之守解锁
      61: 80,   // 击败隐修者解锁
      81: 99    // 击败终局Boss解锁
    }
  },

  // ---------- 等级段持有上限 ----------
  qualityLimits: {
    '1-20':   { maxQuality: 'blue', sameLimit: 2 },
    '21-40':  { maxQuality: 'purple', sameLimit: 2 },
    '41-60':  { maxQuality: 'orange', sameLimit: 2 },
    '61-80':  { maxQuality: 'red', sameLimit: 2 },
    '81-99':  { maxQuality: 'red', sameLimit: 999 }
  },

  // ---------- 初始装备 ----------
  starterEquipment: [
    { slot: 'weapon', name: '父亲的旧短剑', quality: 'green', level: 5, basePatk: 15, baseMatk: 0, basePdef: 0, baseMdef: 0, affixes: [{ n: '锋锐', e: '物理攻击+2%', q: 'green' }], sockets: [] },
    { slot: 'chest', name: '粗布背心', quality: 'white', level: 1, basePatk: 0, baseMatk: 0, basePdef: 5, baseMdef: 2, affixes: [], sockets: [] },
    { slot: 'boots', name: '旧皮靴', quality: 'green', level: 3, basePatk: 0, baseMatk: 0, basePdef: 3, baseMdef: 1, affixes: [{ n: '精准', e: '命中率+2%', q: 'green' }], sockets: [] },
    { slot: 'helmet', name: '皮帽', quality: 'white', level: 2, basePatk: 0, baseMatk: 0, basePdef: 2, baseMdef: 1, affixes: [], sockets: [] },
    { slot: 'gloves', name: '皮手套', quality: 'blue', level: 8, basePatk: 0, baseMatk: 0, basePdef: 4, baseMdef: 2, affixes: [{ n: '重击', e: '物理攻击+4%', q: 'blue' }, { n: '鹰眼', e: '命中率+4%', q: 'blue' }], sockets: [] }
  ],

  // ---------- 初始背包物品 ----------
  starterInventory: {
    materials: { ore: 5, herb: 3, gem: 2, essence: 2 },
    consumables: { potion_hp: 3, potion_mp: 2, buff: 1 },
    testEquipment: [
      { slot: 'weapon', level: 10, quality: 'green' },
      { slot: 'chest', level: 10, quality: 'blue' },
      { slot: 'boots', level: 10, quality: 'green' }
    ]
  }
};
