// ============================================
// 《寻亲风云录》主入口 — 新手村测试版
// ============================================

const Game = {
  state: null,
  currentScreen: "main",
  combatInstance: null,
  autoSaveTimer: null,

  init() {
    const saved = SaveManager.load();
    if (saved) {
      this.state = saved;
      this.enterGame();
    } else {
      this.showCharacterCreation();
    }
    this.startAutoSave();
    this.bindGlobalEvents();
  },

  // ========== 角色创建 ==========

  showCharacterCreation() {
    Renderer.renderCharacterCreation();
    this.bindCreationEvents();
  },

  bindCreationEvents() {
    const container = Renderer.container;
    if (!container) return;

    let selectedClass = null;

    container.querySelectorAll(".class-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".class-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedClass = btn.dataset.class;
      });
    });

    const startBtn = container.querySelector("#start-game");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const nameInput = container.querySelector("#char-name");
        const name = nameInput?.value?.trim() || "酒馆少年";
        const hardcore = container.querySelector("#hardcore-mode")?.checked || false;
        
        if (!selectedClass) {
          Renderer.showMessage("请选择一个职业");
          return;
        }

        this.createCharacter(name, selectedClass, hardcore);
      });
    }
  },

  createCharacter(name, classKey, hardcore) {
    this.state = createDefaultState();
    this.state.player.name = name;
    this.state.player.classPath = [classKey];
    this.state.player.class = DATA.classes[classKey].tiers[0];
    this.state.player.hardcore = hardcore;
    this.state.player.revivesLeft = hardcore ? 0 : 5;
    this.state.settings.hardcoreMode = hardcore;

    // 职业属性调整
    const attrMods = {
      warrior: { str: 4, vit: 2, agi: -1, int: -2, spi: -1 },
      ranger:  { agi: 4, str: 1, int: -1, vit: -1, spi: -1 },
      mage:    { int: 4, spi: 2, str: -2, agi: -1, vit: -1 },
    };
    const mods = attrMods[classKey] || {};
    for (const [attr, val] of Object.entries(mods)) {
      this.state.player.attributes[attr] = Math.max(1, this.state.player.attributes[attr] + val);
    }

    EquipmentSystem.recalcPlayerStats(this.state);
    this.state.player.hp = this.state.player.maxHp;
    this.state.player.mp = this.state.player.maxMp;

    // 开场叙事
    this.state.narrative.dialogueHistory = [
      '"很美好的一天，朝阳升起，你徐徐醒来。"',
      '"你父亲叫埃德蒙，母亲叫莉娜。你六岁那年他们说"出一趟远门"，再也没有回来。"',
      '"这是西元720年。你十八岁了。"',
      '"艾琳背着父亲的旧弓，站在酒馆门口。"',
      '"我要去找我爹娘。你跟我走吗？"',
      '"你愣了一下。你从来没想过"可以去找"。"',
      '"你锁上了酒馆的门。不是为了找谁。是因为有人问了你一个你答不上来的问题。"',
    ];

    this.saveGame();
    this.enterGame();
  },

  // ========== 进入游戏 ==========

  enterGame() {
    this.currentScreen = "main";
    Renderer.renderMain(this.state);
    this.bindMainEvents();
  },

  // ========== 主画面事件 ==========

  bindMainEvents() {
    const container = Renderer.container;
    if (!container) return;

    // 小地图点击
    container.querySelectorAll(".map-cell[data-scene]").forEach(cell => {
      cell.addEventListener("click", () => {
        const sceneId = cell.dataset.scene;
        if (sceneId) this.handleMove(sceneId);
      });
    });

    // 场景交互按钮
    container.querySelectorAll(".action-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        this.handleSceneAction(action);
      });
    });

    // 主菜单
    container.querySelectorAll(".menu-btn[data-menu]").forEach(btn => {
      btn.addEventListener("click", () => {
        const menu = btn.dataset.menu;
        this.handleMenu(menu);
      });
    });
  },

  handleMove(sceneId) {
    const current = SceneSystem.getCurrentScene(this.state);
    if (current.id === sceneId) return; // 已经在该位置

    const result = SceneSystem.moveTo(this.state, sceneId);
    if (result.ok) {
      this.state.narrative.dialogueHistory.push(`你来到了${result.scene.name}。`);
    } else {
      this.state.narrative.dialogueHistory.push(result.reason);
    }
    Renderer.renderMain(this.state);
    this.bindMainEvents();
  },

  handleSceneAction(action) {
    const [type, target] = action.split(":");
    
    switch (type) {
      case "talk":
        const talkResult = SceneSystem.talkToNpc(this.state, target);
        if (talkResult.ok) {
          this.state.narrative.dialogueHistory.push(`${talkResult.npc}: ${talkResult.text}`);
        }
        Renderer.renderMain(this.state);
        this.bindMainEvents();
        break;

      case "object":
        const objResult = SceneSystem.interact(this.state, target);
        if (objResult.ok) {
          this.state.narrative.dialogueHistory.push(objResult.message);
        }
        Renderer.renderMain(this.state);
        this.bindMainEvents();
        break;

      case "move":
        this.handleMove(target);
        break;
    }
  },

  // ========== 菜单处理 ==========

  handleMenu(menu) {
    switch (menu) {
      case "inventory":
        this.currentScreen = "inventory";
        Renderer.renderInventory(this.state);
        this.bindInventoryEvents();
        break;
      case "equipment":
        this.currentScreen = "equipment";
        Renderer.renderEquipment(this.state);
        this.bindEquipmentEvents();
        break;
      case "companions":
        this.currentScreen = "companions";
        Renderer.renderCompanions(this.state);
        this.bindBackEvents();
        break;
      case "save":
        this.currentScreen = "save";
        Renderer.renderSaveMenu(this.state);
        this.bindSaveEvents();
        break;
    }
  },

  bindBackEvents() {
    const container = Renderer.container;
    if (!container) return;
    container.querySelectorAll("[data-action='back']").forEach(btn => {
      btn.addEventListener("click", () => this.enterGame());
    });
  },

  // ========== 背包 ==========

  bindInventoryEvents() {
    const container = Renderer.container;
    if (!container) return;

    container.querySelectorAll(".item-card").forEach(card => {
      card.addEventListener("click", () => {
        const itemId = card.dataset.item;
        const item = this.state.inventory.items.find(i => i.id === itemId);
        if (!item) return;

        const isEquip = ["sword","axe","hammer","bow","staff","dagger","shield","armor","helmet","legs","boots","gloves","necklace","ring"].includes(item.type);
        if (isEquip) {
          const result = InventorySystem.equipFromInventory(this.state, itemId);
          if (result.ok) {
            Renderer.showMessage(`装备了 ${item.name}`);
            if (result.warning) Renderer.showMessage(result.warning, "warning");
          } else {
            Renderer.showMessage(result.reason, "error");
          }
          Renderer.renderInventory(this.state);
          this.bindInventoryEvents();
        }
      });
    });

    this.bindBackEvents();
  },

  // ========== 装备 ==========

  bindEquipmentEvents() {
    const container = Renderer.container;
    if (!container) return;

    container.querySelectorAll(".equip-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        const slotName = slot.dataset.slot;
        const item = this.state.equipment[slotName];
        if (item) {
          const result = InventorySystem.unequipToInventory(this.state, slotName);
          if (result.ok) {
            Renderer.showMessage(`卸下了 ${result.item.name}`);
          } else {
            Renderer.showMessage(result.reason, "error");
          }
          Renderer.renderEquipment(this.state);
          this.bindEquipmentEvents();
        }
      });
    });

    this.bindBackEvents();
  },

  // ========== 存档 ==========

  bindSaveEvents() {
    const container = Renderer.container;
    if (!container) return;

    container.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        switch (action) {
          case "save":
            if (this.saveGame()) Renderer.showMessage("存档成功！");
            else Renderer.showMessage("存档失败", "error");
            break;
          case "export":
            SaveManager.export(this.state);
            Renderer.showMessage("存档已导出");
            break;
          case "delete":
            Renderer.showConfirm("确定删除存档？不可撤销！", () => {
              SaveManager.delete();
              location.reload();
            });
            break;
          case "back":
            this.enterGame();
            break;
        }
      });
    });
  },

  // ========== 存档管理 ==========

  saveGame() {
    this.state.player.playTime += Math.floor((Date.now() - new Date(this.state.world.lastSave).getTime()) / 1000);
    return SaveManager.save(this.state);
  },

  startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(() => {
      if (this.state && this.currentScreen !== "combat") {
        this.saveGame();
      }
    }, 300000);
  },

  bindGlobalEvents() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state) this.saveGame();
    });
  },
};

// 启动
document.addEventListener("DOMContentLoaded", () => {
  if (Renderer.init("game-container")) {
    Game.init();
  }
});

try { module.exports = Game; } catch(e) {}
