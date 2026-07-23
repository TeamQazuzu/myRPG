
const Utils = {
  // ---------- 随机数 ----------
  rand: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randFloat: function() {
    return Math.random();
  },

  clamp: function(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  // ---------- 加权随机选择 ----------
  weightedRandom: function(items, weights) {
    const total = weights.reduce(function(a, b) { return a + b; }, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },

  // ---------- 日志系统 ----------
  log: function(msg, type) {
    const entry = document.createElement('div');
    entry.className = 'log-entry log-' + (type || 'info') + ' fade-in';
    entry.innerHTML = msg;
    const logEl = document.getElementById('game-log');
    if (logEl) {
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
    }
  },

  // ---------- 品质相关工具 ----------
  getQualityColor: function(q) {
    return GAME_DATA.Q_COLOR[q] || '#ccc';
  },

  getQualityName: function(q) {
    return GAME_DATA.Q_NAME[q] || '';
  },

  getQualityClass: function(q) {
    return 'item-' + q;
  },

  getMaxQuality: function(level) {
    if (level <= 20) return 'blue';
    if (level <= 40) return 'purple';
    if (level <= 60) return 'orange';
    return 'red';
  },

  // ---------- 经验计算 ----------
  expForLevel: function(level) {
    return Math.floor(GAME_DATA.expCurve.base * Math.pow(GAME_DATA.expCurve.multiplier, level - 1));
  },

  // ---------- 等级段判断 ----------
  getLevelBracket: function(level) {
    if (level <= 20) return '1-20';
    if (level <= 40) return '21-40';
    if (level <= 60) return '41-60';
    if (level <= 80) return '61-80';
    return '81-99';
  },

  // ---------- 品质上限检查 ----------
  canHoldQuality: function(level, quality) {
    const bracket = this.getLevelBracket(level);
    const limit = GAME_DATA.qualityLimits[bracket];
    if (!limit) return false;
    return GAME_DATA.Q_ORDER[quality] <= GAME_DATA.Q_ORDER[limit.maxQuality];
  },

  // ---------- 唯一ID生成 ----------
  genId: function() {
    return Date.now() + this.rand(0, 99999);
  },

  // ---------- 深拷贝 ----------
  deepCopy: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // ---------- 格式化数字 ----------
  fmtNum: function(n) {
    return Math.floor(n).toLocaleString('zh-CN');
  },

  // ---------- 时间格式化 ----------
  fmtTime: function(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return h + '小时' + m + '分';
    if (m > 0) return m + '分' + s + '秒';
    return s + '秒';
  },

  // ---------- 防抖 ----------
  debounce: function(fn, delay) {
    let timer = null;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
  }
};

// 兼容旧代码的独立函数
function rand(min, max) { return Utils.rand(min, max); }
function randFloat() { return Utils.randFloat(); }
function clamp(v, min, max) { return Utils.clamp(v, min, max); }
function log(msg, type) { Utils.log(msg, type); }
function getQC(q) { return Utils.getQualityColor(q); }
function getQN(q) { return Utils.getQualityName(q); }
function getQualityClass(q) { return Utils.getQualityClass(q); }
function getMaxQ(lv) { return Utils.getMaxQuality(lv); }
function genId() { return Utils.genId(); }
