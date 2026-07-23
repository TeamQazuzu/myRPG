# ============================================
# app.js - 主应用控制器
# ============================================

app_js = '''// ==================== 纪年·守望者 - 主应用控制器 ====================

const GameApp = {
  // ---------- 初始化 ----------
  init: function() {
    // 检查是否有存档
    if (GameState.hasSave()) {
      document.getElementById('btn-continue').style.display = 'inline-block';
    }
  },

  // ---------- 新游戏 ----------
  newGame: function() {
    if (GameState.hasSave()) {
      if (!confirm('已有存档，开始新游戏将覆盖旧存档。确定吗？')) return;
      GameState.deleteSave();
    }
    document.getElementById('save-panel').classList.add('hidden');
    document.getElementById('create-panel').classList.remove('hidden');
  },

  // ---------- 创建角色 ----------
  createCharacter: function() {
    const name = document.getElementById('player-name').value.trim() || '酒馆少年';
    GameState.initNew(name);

    document.getElementById('create-panel').classList.add('hidden');
    document.getElementById('game-panel').classList.remove('hidden');

    log('<b>' + name + '</b> 锁上酒馆的门，背起父亲的旧短剑，踏上了旅程。', 'narrative');
    log('第五纪元·守望之年。你十九岁了。', 'narrative');

    UIRenderer.renderAll();
    GameState.startAutoSave();
  },

  // ---------- 继续游戏 ----------
  continueGame: function() {
    const data = GameState.load();
    if (!data) {
      log('读档失败', 'system');
      return;
    }

    if (data.player.dead) {
      alert('该角色已死亡（硬核模式）或复活次数耗尽。请开始新游戏。');
      return;
    }

    document.getElementById('save-panel').classList.add('hidden');
    document.getElementById('game-panel').classList.remove('hidden');

    log('欢迎回来，' + data.player.name, 'narrative');

    UIRenderer.renderAll();
    GameState.startAutoSave();
  },

  // ---------- 导出存档 ----------
  exportSave: function() {
    if (!GameState.data) {
      log('没有可导出的存档', 'system');
      return;
    }
    GameState.exportSave();
  },

  // ---------- 导入存档提示 ----------
  importSavePrompt: function() {
    document.getElementById('import-file').click();
  },

  // ---------- 导入存档文件 ----------
  importSaveFile: function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      if (GameState.importSave(e.target.result)) {
        document.getElementById('save-panel').classList.add('hidden');
        document.getElementById('game-panel').classList.remove('hidden');
        UIRenderer.renderAll();
        GameState.startAutoSave();
      }
    };
    reader.readAsText(file);
  },

  // ---------- 删除存档提示 ----------
  deleteSavePrompt: function() {
    if (!GameState.hasSave()) {
      log('没有存档可删除', 'system');
      return;
    }
    if (!confirm('确定要删除存档吗？此操作不可恢复！')) return;
    GameState.deleteSave();
    document.getElementById('btn-continue').style.display = 'none';
    log('存档已删除', 'system');
  }
};

// ---------- 页面加载完成后初始化 ----------
document.addEventListener('DOMContentLoaded', function() {
  GameApp.init();
});
