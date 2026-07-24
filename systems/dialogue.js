// ============================================
// 《寻亲风云录》NPC对话系统
// 管理对话树数据、UI渲染、选项分支和动作执行
// ============================================

var DialogueSystem = {

  // ========== NPC对话树数据库 ==========
  // 每个NPC对应一棵对话树，key为NPC标识符
  dialogues: {

    // ----- 艾琳 -----
    'ailin': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '艾琳',
          text: '你还在犹豫什么？我说了，我要去找我爹娘。你跟不跟？',
          choices: [
            { text: '我跟你走。', next: 'accept', action: null },
            { text: '再想想...', next: 'hesitate', action: null },
          ],
        },
        'accept': {
          id: 'accept',
          speaker: '艾琳',
          text: '那就走吧。你锁上酒馆的门吧。',
          choices: [],
        },
        'hesitate': {
          id: 'hesitate',
          speaker: '艾琳',
          text: '行吧。你想好了就来找我。我会在村口等你。',
          choices: [],
        },
      },
    },

    // ----- 铁匠老哈 -----
    'blacksmith': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '老哈',
          text: '又要出去闯荡了？你爹以前也是这样，整天往外跑。',
          choices: [
            { text: '我爹以前经常来你这里吗？', next: 'father', action: null },
            { text: '能帮我看看这把剑吗？', next: 'inspect', action: null },
            { text: '没什么，打扰了。', next: null, action: null },
          ],
        },
        'father': {
          id: 'father',
          speaker: '老哈',
          text: '来过。他走之前最后打造的东西就是那把短剑。那时候他让我别问了。现在想想...他大概是知道些什么。',
          choices: [
            { text: '（沉默）', next: null, action: null },
          ],
        },
        'inspect': {
          id: 'inspect',
          speaker: '老哈',
          text: '嗯...这把剑保养得不错。但你身上的装备还是太简陋了。你去村边打几只野狗，也许能摸到点什么好东西。',
          choices: [
            { text: '谢了。', next: null, action: null },
          ],
        },
      },
    },

    // ----- 杂货店米拉 -----
    'mira': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '米拉',
          text: '哟，小老板来了！要买点什么？还是来还你爹欠的账？哈哈，开玩笑的。',
          choices: [
            { text: '看看你卖什么。', next: null, action: 'shop:greyVillage_general' },
            { text: '我爹以前在你这里赊过账？', next: 'debt', action: null },
            { text: '告辞。', next: null, action: null },
          ],
        },
        'debt': {
          id: 'debt',
          speaker: '米拉',
          text: '就一两次。不过他每次来都会给我带些矿石当抵偿。你爹是个守信的人。',
          choices: [
            { text: '（点头）', next: null, action: null },
          ],
        },
      },
    },

    // ----- 村长（老奎）-----
    'chief_kui': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '村长',
          text: '又来了？你这孩子，跟你爹一个样，闲不住。',
          choices: [
            { text: '村长，你知道我爹去了哪里吗？', next: 'about_father', action: null },
            { text: '我想看看村子的家谱。', next: 'genealogy', action: null },
            { text: '告辞。', next: null, action: null },
          ],
        },
        'about_father': {
          id: 'about_father',
          speaker: '村长',
          text: '你爹……他说要去做一件必须做的事。他让我告诉你——等你准备好了再来问我。',
          choices: [
            { text: '（沉默）', next: null, action: null },
          ],
        },
        'genealogy': {
          id: 'genealogy',
          speaker: '村长',
          text: '家谱？哼，这村子的家谱只记了几十年。你爹和你娘的名字在上面，别的……没什么好说的。',
          choices: [
            { text: '（点头离开）', next: null, action: null },
          ],
        },
      },
    },

    // ----- 杂货铺三婶 -----
    'grocery_sanshen': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '三婶',
          text: '哎哟！小老板来了！要买点什么？家里缺什么我都能凑合。',
          choices: [
            { text: '看看你卖什么。', next: null, action: 'shop:greyVillage_general' },
            { text: '村子最近有什么新鲜事吗？', next: 'gossip', action: null },
            { text: '下次再来。', next: null, action: null },
          ],
        },
        'gossip': {
          id: 'gossip',
          speaker: '三婶',
          text: '新鲜事？后山最近不太平，有人说看见山贼了。老穆的羊也被叼走了一只。你出门小心点。',
          choices: [
            { text: '知道了，谢了。', next: null, action: null },
          ],
        },
      },
    },
  },

  // ========== 当前对话状态 ==========
  _currentNpcId: null,   // 当前对话的NPC标识
  _currentNodeId: null, // 当前节点ID

  // ========== 开始一段对话 ==========
  // npcId: NPC标识符（如 'ailin'、'blacksmith'、'mira'）
  startDialogue: function(npcId) {
    var dialogue = this.dialogues[npcId];
    if (!dialogue) {
      console.warn('[对话] 找不到NPC对话数据:', npcId);
      return;
    }

    this._currentNpcId = npcId;
    this._currentNodeId = dialogue.startNodeId;

    console.log('[对话] 开始与 ' + npcId + ' 对话，起始节点:', this._currentNodeId);

    // 渲染对话UI
    this._renderDialogue();
  },

  // ========== 渲染对话框UI ==========
  _renderDialogue: function() {
    var dialogue = this.dialogues[this._currentNpcId];
    if (!dialogue) return;

    var node = dialogue.nodes[this._currentNodeId];
    if (!node) {
      console.warn('[对话] 找不到节点:', this._currentNpcId, this._currentNodeId);
      this.closeDialogue();
      return;
    }

    // 先移除已有的对话框（防止重复）
    this._removeDialogueUI();

    // 创建遮罩层
    var overlay = document.createElement('div');
    overlay.id = 'dialogue-overlay';
    overlay.className = 'dialogue-overlay';

    // 构建选项按钮HTML
    var choicesHtml = '';
    if (node.choices && node.choices.length > 0) {
      choicesHtml = '<div class="dialogue-choices">';
      for (var i = 0; i < node.choices.length; i++) {
        var num = i + 1;
        choicesHtml += '<button class="dialogue-choice-btn" data-choice-idx="' + i + '">'
          + '<span class="choice-number">' + num + '.</span>'
          + node.choices[i].text
          + '</button>';
      }
      choicesHtml += '</div>';
    }

    // 构建对话框
    var boxHtml = '<div class="dialogue-box">'
      + '<div class="dialogue-speaker">' + node.speaker + '</div>'
      + '<div class="dialogue-text">' + node.text + '</div>'
      + choicesHtml
      + '</div>';

    overlay.innerHTML = boxHtml;
    document.body.appendChild(overlay);

    // 如果没有选项，显示"继续"按钮并自动延迟显示
    if (!node.choices || node.choices.length === 0) {
      var continueBtn = document.createElement('button');
      continueBtn.className = 'dialogue-choice-btn dialogue-continue';
      continueBtn.textContent = '[ 继续 ]';
      var choicesArea = overlay.querySelector('.dialogue-choices');
      if (!choicesArea) {
        choicesArea = document.createElement('div');
        choicesArea.className = 'dialogue-choices';
        overlay.querySelector('.dialogue-box').appendChild(choicesArea);
      }
      choicesArea.appendChild(continueBtn);

      // 点击继续按钮 -> 关闭对话
      continueBtn.addEventListener('click', function() {
        DialogueSystem.closeDialogue();
      });
    } else {
      // 绑定选项按钮点击事件
      var buttons = overlay.querySelectorAll('.dialogue-choice-btn:not(.dialogue-continue)');
      var self = this;
      for (var j = 0; j < buttons.length; j++) {
        (function(btn, idx) {
          btn.addEventListener('click', function() {
            self._onChoiceSelected(idx);
          });
        })(buttons[j], j);
      }
    }

    // 点击遮罩空白区域不关闭（防止误操作），只在无选项时可关闭
    // 这里不绑定遮罩点击关闭
  },

  // ========== 选中某个选项 ==========
  _onChoiceSelected: function(choiceIdx) {
    var dialogue = this.dialogues[this._currentNpcId];
    if (!dialogue) return;

    var node = dialogue.nodes[this._currentNodeId];
    if (!node || !node.choices || choiceIdx >= node.choices.length) return;

    var choice = node.choices[choiceIdx];

    // 执行选项动作（如果有）
    if (choice.action) {
      this._executeAction(choice.action);
    }

    // 判断是否有下一个节点
    if (choice.next) {
      this._currentNodeId = choice.next;
      this._renderDialogue();
    } else {
      // 对话结束
      this.closeDialogue();
    }
  },

  // ========== 执行动作 ==========
  _executeAction: function(actionStr) {
    if (!actionStr) return;

    console.log('[对话] 执行动作:', actionStr);

    // 解析动作格式 "type:value"
    var parts = actionStr.split(':');
    var actionType = parts[0];
    var actionValue = parts[1] || '';

    switch (actionType) {
      case 'shop':
        // 打开商店，先关闭对话，再打开商店
        this.closeDialogue();
        if (window.gameApp && window.gameApp.uiRenderer) {
          this._openShop(actionValue);
        }
        break;

      case 'rest':
        // 休息恢复
        if (window.gameApp && window.gameApp.sceneManager) {
          window.gameApp.sceneManager.rest();
        }
        break;

      case 'give_item':
        // 给物品
        if (window.gameApp && window.gameApp.state) {
          var item = { id: Utils.uuid(), name: actionValue, type: 'material', rarity: 'white', stack: 1 };
          var result = StateUtils.addToInventory(window.gameApp.state, item);
          if (result.ok) {
            window.gameApp.uiRenderer.addGameLog('获得了 ' + actionValue);
          }
        }
        break;

      case 'flag':
        // 设置flag
        if (window.gameApp && window.gameApp.state && window.gameApp.state.narrative) {
          window.gameApp.state.narrative.flags[actionValue] = true;
          console.log('[对话] 设置flag:', actionValue);
        }
        break;

      default:
        console.warn('[对话] 未知动作类型:', actionType);
    }
  },

  // ========== 打开商店UI ==========
  _openShop: function(shopId) {
    var shop = ShopSystem.getShopInfo(shopId);
    if (!shop) {
      console.warn('[对话] 商店不存在:', shopId);
      return;
    }

    var items = ShopSystem.getShopItems(shopId);
    if (!window.gameApp || !window.gameApp.uiRenderer) return;

    // 构建商店HTML
    var html = '<div class="shop-owner">' + shop.owner + '的' + shop.name + '</div>';
    html += '<div class="shop-desc">' + (shop.desc || '') + '</div>';
    html += '<div class="shop-items">';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<div class="shop-item" data-item-idx="' + i + '">'
        + '<div class="shop-item-name">' + item.name + '</div>'
        + '<div class="shop-item-desc">' + (item.desc || '') + '</div>'
        + '<div class="shop-item-price">' + (item.price || 0) + ' 金</div>'
        + '<button class="shop-buy-btn" data-buy-idx="' + i + '">购买</button>'
        + '</div>';
    }

    html += '</div>';

    window.gameApp.uiRenderer.showPanel(shop.name, html);

    // 绑定购买按钮
    var buyBtns = document.querySelectorAll('.shop-buy-btn');
    var self = this;
    for (var j = 0; j < buyBtns.length; j++) {
      (function(btn, idx) {
        btn.addEventListener('click', function() {
          if (!window.gameApp || !window.gameApp.state) return;
          var result = ShopSystem.buy(window.gameApp.state, shopId, idx);
          if (result.ok) {
            window.gameApp.uiRenderer.addGameLog(result.message);
            window.gameApp.uiRenderer.updatePlayerInfo(window.gameApp.state.player);
            // 关闭面板并重新打开以刷新
            window.gameApp.uiRenderer.closePanel();
            self._openShop(shopId);
          } else {
            window.gameApp.uiRenderer.addGameLog(result.message);
          }
        });
      })(buyBtns[j], j);
    }
  },

  // ========== 关闭对话框 ==========
  closeDialogue: function() {
    this._removeDialogueUI();
    this._currentNpcId = null;
    this._currentNodeId = null;
    console.log('[对话] 对话结束');
  },

  // ========== 移除对话框DOM ==========
  _removeDialogueUI: function() {
    var overlay = document.getElementById('dialogue-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  // ========== 获取当前对话状态 ==========
  isActive: function() {
    return this._currentNpcId !== null;
  },

  // ========== 获取当前NPC标识 ==========
  getCurrentNpcId: function() {
    return this._currentNpcId;
  },
};

// 导出
try { module.exports = DialogueSystem; } catch(e) {}
