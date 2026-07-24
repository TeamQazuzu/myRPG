// ============================================
// 《寻亲风云录》主入口 — 荒地测试版
// ============================================

const Game = {
  state: null,
  currentScreen: "main",
  combatInstance: null,
  autoSaveTimer: null,
  idleTimer: null, // 挂机计时器

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
    this.stopIdle(); // 停止挂机
    Renderer.renderMain(this.state);
    this.bindMainEvents();
  },

  // ========== 主画面事件 ==========

  bindMainEvents() {
    const container = Renderer.container;
    if (!container) return;

    // 小地图点击移动
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
        if (action === "none") return;
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
    if (current.id === sceneId) return;

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
        } else {
          this.state.narrative.dialogueHistory.push(objResult.reason);
        }
        Renderer.renderMain(this.state);
        this.bindMainEvents();
        break;

      case "rest":
        this.state.player.hp = this.state.player.maxHp;
        this.state.player.mp = this.state.player.maxMp;
        for (const comp of this.state.companions) {
          if (comp.alive) { comp.hp = comp.maxHp; comp.mp = comp.maxMp; }
        }
        this.state.narrative.dialogueHistory.push("你在安全的地方休息了一会儿，恢复了全部生命和法力。");
        Renderer.renderMain(this.state);
        this.bindMainEvents();
        break;

      // ===== 荒地特殊操作 =====
      case "wasteland_combat":
        this.startWastelandCombat();
        break;

      case "idle_mine":
        this.startIdleMining();
        break;
    }
  },

  // ========== 荒地战斗 ==========

  startWastelandCombat() {
    const enemyStatus = SceneSystem.getWastelandEnemies(this.state);
    if (!enemyStatus.canSpawn) {
      Renderer.showMessage(enemyStatus.message);
      return;
    }

    const enemies = enemyStatus.enemies;
    if (enemies.length === 0) {
      Renderer.showMessage("这里没有敌人。");
      return;
    }

    this.combatInstance = CombatEngine.initBattle(this.state, enemies, {
      wave: 1,
      totalWaves: 1,
    });

    this.currentScreen = "combat";
    this.combatLoop();
  },

  // ========== 挂机采集石头 ==========

  startIdleMining() {
    if (this.idleTimer) {
      this.stopIdle();
      return;
    }

    const scene = SceneSystem.getCurrentScene(this.state);
    if (scene.id !== "greyVillage_wasteland") {
      Renderer.showMessage("只有荒地可以采集石头。");
      return;
    }

    this.state.narrative.dialogueHistory.push("你开始挂机采集石头……（点击停止）");
    Renderer.renderMain(this.state);
    this.bindMainEvents();

    // 每3秒采集一次
    let count = 0;
    this.idleTimer = setInterval(() => {
      const stone = {
        id: Utils.uuid(),
        name: "石头",
        type: "stone",
        rarity: "white",
        level: 1,
        stackable: true,
        stack: Utils.randInt(1, 2),
      };
      const result = InventorySystem.addToInventory(this.state, stone);
      if (result.ok) {
        count++;
        // 每10次显示一次提示
        if (count % 10 === 0) {
          this.state.narrative.dialogueHistory.push(`已采集 ${count} 批石头……`);
          Renderer.renderMain(this.state);
          this.bindMainEvents();
        }
      } else {
        this.state.narrative.dialogueHistory.push("背包已满，挂机停止。");
        this.stopIdle();
        Renderer.renderMain(this.state);
        this.bindMainEvents();
      }
    }, 3000);

    // 更新按钮为"停止挂机"
    const btn = document.querySelector('[data-action="idle_mine"]');
    if (btn) btn.textContent = "⏹️ 停止挂机";
  },

  stopIdle() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  },

  // ========== 战斗系统 ==========

  combatLoop() {
    if (!this.combatInstance) return;
    const combat = this.combatInstance;

    if (combat.phase !== "battle") {
      this.resolveCombatEnd();
      return;
    }

    if (combat.order.length === 0 || combat.currentActorIndex >= combat.order.length) {
      CombatEngine.startTurn(combat);
    }

    Renderer.renderCombat(this.state, combat);
    this.bindCombatEvents();

    const actor = CombatEngine.getCurrentActor(combat);
    if (actor && actor.ai) {
      setTimeout(() => {
        const action = CombatEngine.decideAIAction(combat, actor);
        this.executeCombatAction(actor.id, action);
      }, 800);
    }
  },

  executeCombatAction(actorId, action) {
    if (!this.combatInstance) return;
    const combat = this.combatInstance;
    
    let targetId = action.targetId;
    if (!targetId) {
      const enemies = combat.units.filter(u => u.side !== combat.units.find(a => a.id === actorId)?.side && u.hp > 0);
      targetId = enemies[0]?.id;
    }

    const result = CombatEngine.executeAction(combat, actorId, action, targetId);
    
    if (result && result.type === "battle_end") {
      this.resolveCombatEnd();
      return;
    }

    setTimeout(() => this.combatLoop(), 500);
  },

  bindCombatEvents() {
    const container = Renderer.container;
    if (!container) return;

    container.querySelectorAll(".skill-btn:not(.disabled)").forEach(btn => {
      btn.addEventListener("click", () => {
        const skillName = btn.dataset.skill;
        const enemies = this.combatInstance.units.filter(u => u.side === "enemy" && u.hp > 0);
        const targetId = enemies[0]?.id;
        this.executeCombatAction("player", { type: "skill", skillName }, targetId);
      });
    });

    container.querySelectorAll(".combat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const enemies = this.combatInstance.units.filter(u => u.side === "enemy" && u.hp > 0);
        const targetId = enemies[0]?.id;
        this.executeCombatAction("player", { type: action }, targetId);
      });
    });

    // 撤退
    container.querySelectorAll("[data-action='flee-combat']").forEach(btn => {
      btn.addEventListener("click", () => {
        const enemies = this.combatInstance.units.filter(u => u.side === "enemy" && u.hp > 0);
        const targetId = enemies[0]?.id;
        this.executeCombatAction("player", { type: "flee" }, targetId);
      });
    });
  },

  resolveCombatEnd() {
    const combat = this.combatInstance;
    if (!combat) return;

    switch (combat.phase) {
      case "victory":
        // 分配经验
        const expResult = StateUtils.addExp(this.state, combat.rewards.exp);
        if (expResult.locked) {
          Renderer.showExpLock(expResult.message);
        }
        // 金币
        StateUtils.addGold(this.state, combat.rewards.gold);
        // 物品
        for (const item of combat.rewards.items) {
          InventorySystem.addToInventory(this.state, item);
        }
        // 野狗掉落
        for (const unit of combat.units) {
          if (unit.side === "enemy" && unit.hp <= 0 && unit.drops) {
            for (const drop of unit.drops) {
              if (Utils.chance(drop.chance)) {
                const dropItem = {
                  id: Utils.uuid(),
                  name: drop.name,
                  type: drop.type,
                  rarity: "white",
                  level: 1,
                  stackable: true,
                  stack: 1,
                };
                InventorySystem.addToInventory(this.state, dropItem);
                this.state.narrative.dialogueHistory.push(`获得: ${drop.name}`);
              }
            }
          }
        }

        this.state.narrative.dialogueHistory.push(
          `战斗胜利！获得 ${combat.rewards.exp} 经验，${combat.rewards.gold} 金币。`
        );

        // 记录击败时间（触发刷新冷却）
        SceneSystem.recordDefeat(this.state);
        break;

      case "defeat":
        const deathResult = StateUtils.handleDeath(this.state, this.state.player.zone);
        this.state.narrative.dialogueHistory.push(deathResult.message);
        if (deathResult.mode === "epitaph" || deathResult.mode === "retired") {
          this.showEpitaph();
          return;
        }
        break;

      case "draw":
        this.state.player.hp = 1;
        this.state.player.mp = 0;
        const goldLoss = Math.floor(this.state.player.gold * 0.05);
        StateUtils.spendGold(this.state, goldLoss);
        this.state.narrative.dialogueHistory.push(
          `双方僵持不下，你狼狈撤退。损失 ${goldLoss} 金币。`
        );
        break;

      case "fled":
        this.state.narrative.dialogueHistory.push("你成功逃脱了！");
        break;
    }

    // 保存随从状态
    for (const comp of this.state.companions) {
      const combatUnit = combat.units.find(u => u.id === comp.id);
      if (combatUnit) {
        comp.hp = Math.max(1, combatUnit.hp);
        comp.mp = combatUnit.mp;
        if (combatUnit.hp <= 0) {
          if (this.state.player.hardcore) {
            comp.alive = false;
            this.state.narrative.dialogueHistory.push(`${comp.name} 在战斗中牺牲了...`);
          } else {
            comp.hp = 1;
            this.state.narrative.dialogueHistory.push(`${comp.name} 被救醒了。`);
          }
        }
      }
    }

    this.combatInstance = null;
    this.saveGame();
    this.enterGame();
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

  // ========== 碑文 ==========

  equipItemById(itemId) {
    if (!this.state) return;
    const item = this.state.inventory.items.find(i => i.id === itemId);
    if (!item) {
      Renderer.showMessage("物品不存在", "error");
      return;
    }
    const result = InventorySystem.equipFromInventory(this.state, itemId);
    if (result.ok) {
      Renderer.showMessage(`装备了 ${item.name}`);
      this.closeItemDetail();
      Renderer.renderInventory(this.state);
      this.bindInventoryEvents();
    } else {
      Renderer.showMessage(result.reason || "装备失败", "error");
    }
  },

  closeItemDetail() {
    const panel = document.querySelector("#item-detail-panel");
    if (panel) panel.classList.add("hidden");
  },

  showEpitaph() {
    const p = this.state.player;
    const html = `
      <div class="epitaph-frame">
        <h1>🪦 碑文</h1>
        <div class="epitaph-content">
          <p>这里长眠着</p>
          <h2>${p.name}</h2>
          <p>等级 ${p.level} · ${p.class}</p>
          <p>存活时间: ${Utils.formatDuration(p.playTime)}</p>
          <p>击败守门员: ${Object.entries(this.state.world.gatekeepers).filter(([_, v]) => v.defeated).length}/5</p>
          <p>死亡次数: ${p.deaths}</p>
          <p class="epitaph-quote">"${p.hardcore ? '硬核之路，无悔之选。' : '故事尚未结束。'}"</p>
        </div>
        <div class="epitaph-actions">
          <button class="menu-btn" onclick="SaveManager.export(Game.state)">📤 导出角色卡</button>
          <button class="menu-btn" onclick="location.reload()">🔄 重新开始</button>
        </div>
      </div>
    `;
    Renderer.container.innerHTML = html;
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
