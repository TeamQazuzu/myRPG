// ============================================
// 《寻亲风云录》任务系统
// 接受/追踪/完成流程
// ============================================

var QuestSystem = {

  // ========== 任务数据库 ==========
  // type: 'main'(主线) | 'side'(支线) | 'companion'(随从)
  // stages: [{type, target, count, current, desc}] — 全部完成即任务完成
  // rewards: {exp, gold, items, buffs, unlockCompanion}
  quests: {
    // ===== 主线任务 =====
    'q_main_01': {
      id: 'q_main_01', name: '启程', type: 'main',
      desc: '和艾琳一起离开灰烟村。但村长说你还不够强。',
      stages: [
        { type: 'defeat', target: '村长', count: 1, current: 0, desc: '击败村长证明实力' },
      ],
      rewards: { exp: 100, gold: 50, items: ['父亲的旧信'], buffs: [], unlockZone: 'ashMountains' },
      nextQuest: 'q_main_02',
    },
    'q_main_02': {
      id: 'q_main_02', name: '灰烬山脉的秘密', type: 'main',
      desc: '穿过灰烬山脉，寻找关于组织的线索。',
      stages: [
        { type: 'explore', target: '灰烬山脉_旧矿道', count: 1, current: 0, desc: '探索旧矿道深处' },
        { type: 'defeat', target: '守夜人', count: 1, current: 0, desc: '击败守夜人' },
      ],
      rewards: { exp: 500, gold: 200, items: [], buffs: [] },
      nextQuest: 'q_main_03',
    },
    // ===== 支线任务 =====
    'q_side_mira_herb': {
      id: 'q_side_mira_herb', name: '三婶的药材', type: 'side',
      desc: '三婶需要5份草药来补充库存。',
      stages: [
        { type: 'gather', target: '草药', count: 5, current: 0, desc: '采集5份草药' },
      ],
      rewards: { exp: 30, gold: 20, items: [], buffs: ['herb_master'] },
    },
    'q_side_nuen_leather': {
      id: 'q_side_nuen_leather', name: '诺恩的要求', type: 'side',
      desc: '诺恩想要一张野猪皮。不是被刀切的——是被猎弓射杀的。',
      stages: [
        { type: 'defeat', target: '野猪', count: 1, current: 0, desc: '猎杀一头野猪' },
      ],
      rewards: { exp: 40, gold: 30, items: [], buffs: [] },
    },
    'q_side_leina_medicine': {
      id: 'q_side_leina_medicine', name: '蕾娜的珍稀药材', type: 'side',
      desc: '蕾娜需要几样稀有的药材来制作特别药水。',
      stages: [
        { type: 'gather', target: '灰烬水草', count: 3, current: 0, desc: '采集3份灰烬水草' },
        { type: 'defeat', target: '山洞蝙蝠', count: 5, current: 0, desc: '收集5份蝙蝠翼膜' },
      ],
      rewards: { exp: 150, gold: 80, items: ['珍稀药材'], buffs: [], unlockCompanion: 'leina' },
    },
    // ===== 随从招募任务 =====
    'brong_recruit': {
      id: 'brong_recruit', name: '铁匠的委托', type: 'companion',
      desc: '灰烬镇铁匠有一批货需要护送。完成委托后，布隆可能愿意加入你。',
      stages: [
        { type: 'kill_count', target: 'any', count: 20, current: 0, desc: '在灰烬山脉击败20个敌人' },
      ],
      rewards: { exp: 200, gold: 150, items: [], buffs: [], unlockCompanion: 'brong' },
    },
    'xiaoke_recruit': {
      id: 'xiaoke_recruit', name: '小柯的布匹', type: 'companion',
      desc: '小柯想要几匹好布料来完成他的作品。',
      stages: [
        { type: 'gather', target: '旧木材', count: 5, current: 0, desc: '收集5份旧木材' },
      ],
      rewards: { exp: 100, gold: 50, items: [], buffs: [], unlockCompanion: 'xiaoke' },
    },
    'arthur_rescue': {
      id: 'arthur_rescue', name: '矿道中的求救', type: 'companion',
      desc: '旧矿道深处传来微弱的呼救声......',
      stages: [
        { type: 'defeat', target: '废弃傀儡', count: 3, current: 0, desc: '击败3个废弃傀儡' },
        { type: 'explore', target: '灰烬山脉_旧矿道', count: 1, current: 0, desc: '探索矿道最深处' },
      ],
      rewards: { exp: 300, gold: 150, items: [], buffs: [], unlockCompanion: 'arthur' },
    },
  },

  // ========== 接受任务 ==========
  acceptQuest(questId, state) {
    var tpl = this.quests[questId];
    if (!tpl) return { ok: false, reason: '任务不存在' };
    if (!state.quests) state.quests = { active: [], completed: [] };
    // 已接受
    if (state.quests.active.find(function(q) { return q.id === questId; })) {
      return { ok: false, reason: '已接受该任务' };
    }
    // 已完成
    if (state.quests.completed.indexOf(questId) !== -1) {
      return { ok: false, reason: '任务已完成' };
    }
    // 复制模板
    var quest = JSON.parse(JSON.stringify(tpl));
    // 重置进度
    for (var i = 0; i < quest.stages.length; i++) { quest.stages[i].current = 0; }
    state.quests.active.push(quest);
    console.log('[任务] 接受任务:', quest.name);
    return { ok: true, message: '接受任务：' + quest.name };
  },

  // ========== 推进任务进度 ==========
  // eventType: 'defeat' | 'gather' | 'explore' | 'kill_count'
  // target: 匹配的目标名
  // count: 本次进度增量
  advanceQuest(eventType, target, count, state) {
    if (!state.quests || !state.quests.active) return [];
    var changed = [];
    for (var i = state.quests.active.length - 1; i >= 0; i--) {
      var q = state.quests.active[i];
      for (var j = 0; j < q.stages.length; j++) {
        var s = q.stages[j];
        if (s.current >= s.count) continue; // 已完成
        var match = false;
        if (s.type === eventType && s.target === target) match = true;
        if (s.type === 'kill_count' && eventType === 'defeat') match = true;
        if (match) {
          s.current = Math.min(s.count, s.current + (count || 1));
          changed.push({ questId: q.id, questName: q.name, stageIdx: j, stageDesc: s.desc, current: s.current, total: s.count });
        }
      }
    }
    return changed;
  },

  // ========== 检查并完成任务 ==========
  checkAndCompleteQuests(state) {
    if (!state.quests || !state.quests.active) return [];
    var completed = [];
    for (var i = state.quests.active.length - 1; i >= 0; i--) {
      var q = state.quests.active[i];
      var allDone = true;
      for (var j = 0; j < q.stages.length; j++) {
        if (q.stages[j].current < q.stages[j].count) { allDone = false; break; }
      }
      if (!allDone) continue;
      // 完成任务
      this._completeQuest(q, state);
      state.quests.active.splice(i, 1);
      state.quests.completed.push(q.id);
      completed.push(q);
    }
    return completed;
  },

  // ========== 发放任务奖励 ==========
  _completeQuest(quest, state) {
    var r = quest.rewards;
    console.log('[任务] 完成:', quest.name);
    // 经验
    if (r.exp) {
      StateUtils.addExp(state, r.exp);
      console.log('  +经验:', r.exp);
      // 队友共享任务经验
      if (state.companions && state.companions.length > 0 && typeof CompanionSystem !== 'undefined' && CompanionSystem) {
        state.companions.forEach(function(c) {
          if (!c) return;
          CompanionSystem.addExp(c, r.exp, state);
        });
      }
    }
    // 金币
    if (r.gold) {
      StateUtils.addGold(state, r.gold);
      console.log('  +金币:', r.gold);
    }
    // 物品
    if (r.items && r.items.length > 0) {
      for (var i = 0; i < r.items.length; i++) {
        var item = { id: Utils.uuid(), name: r.items[i], type: 'quest', rarity: 'green', level: 1, stack: 1 };
        StateUtils.addToInventory(state, item);
        console.log('  +物品:', r.items[i]);
      }
    }
    // Buff
    if (r.buffs && r.buffs.length > 0 && BuffSystem) {
      for (var i = 0; i < r.buffs.length; i++) {
        BuffSystem.addBuff(r.buffs[i], state, 1);
      }
    }
    // 解锁区域
    if (r.unlockZone && state.world && state.world.zones) {
      if (state.world.zones[r.unlockZone] !== undefined) {
        state.world.zones[r.unlockZone].unlocked = true;
      }
    }
    // 解锁随从
    if (r.unlockCompanion && CompanionSystem) {
      CompanionSystem.recruitCompanion(r.unlockCompanion, state);
    }
  },

  // ========== 获取活跃任务列表 ==========
  getActiveQuests(state) {
    if (!state.quests || !state.quests.active) return [];
    return state.quests.active;
  },

  // ========== 获取可接任务列表 ==========
  getAvailableQuests(state) {
    var available = [];
    var active = (state.quests && state.quests.active || []).map(function(q) { return q.id; });
    var completed = state.quests && state.quests.completed || [];
    for (var key in this.quests) {
      if (!this.quests.hasOwnProperty(key)) continue;
      if (active.indexOf(key) !== -1) continue;
      if (completed.indexOf(key) !== -1) continue;
      available.push(this.quests[key]);
    }
    return available;
  },
};

try { module.exports = QuestSystem; } catch(e) {}
