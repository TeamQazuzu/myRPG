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
            { text: '我要离开这个村子。', next: 'challenge', action: null, condition: 'gatekeeper_not_defeated', conditionArg: 'villageChief' },
            { text: '村长，我打赢了。', next: 'after_defeat', action: null, condition: 'gatekeeper_defeated', conditionArg: 'villageChief' },
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
        'challenge': {
          id: 'challenge',
          speaker: '村长',
          text: '离开？你爹走的时候也是这么说的。我答应过他——不让你在不准备好之前离开。你要走，先过我这一关。',
          choices: [
            { text: '那就来吧。', next: null, action: 'boss_battle:villageChief' },
            { text: '我还没准备好。', next: 'not_ready', action: null },
          ],
        },
        'not_ready': {
          id: 'not_ready',
          speaker: '村长',
          text: '不急。去外面多历练历练，等你觉得可以了再来找我。',
          choices: [
            { text: '（点头）', next: null, action: null },
          ],
        },
        'after_defeat': {
          id: 'after_defeat',
          speaker: '村长',
          text: '......你确实比你爹年轻时候强。他当年打赢我也花了很大力气。拿着这个，这是他走之前留给你的。',
          choices: [
            { text: '（接过旧信）谢谢。', next: null, action: 'give_item:父亲的旧信' },
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

    // ----- 裁缝玛莎 -----
    'tailor_masha': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '玛莎',
          text: '哦，是你啊。你长这么大了，站在这儿我都快认不出了。',
          choices: [
            { text: '听说你以前给我父母做过斗篷？', next: 'cloak', action: null },
            { text: '你这里有什么布料？', next: 'fabric', action: null },
            { text: '告辞。', next: null, action: null },
          ],
        },
        'cloak': {
          id: 'cloak',
          speaker: '玛莎',
          text: '那件斗篷...他们走之前特意来定的，说是要翻山越岭。我用了最好的棉布，里子是兔绒。你爹接过斗篷的时候手在发抖。',
          choices: [
            { text: '那件斗篷还在吗？', next: 'cloak_gone', action: null },
            { text: '（沉默）', next: null, action: null },
          ],
        },
        'cloak_gone': {
          id: 'cloak_gone',
          speaker: '玛莎',
          text: '他们带走了。不过...我留了一小块布头，上面有我绣的花纹。你要是想要，改天来拿。',
          choices: [
            { text: '谢谢玛莎婶。', next: null, action: null },
          ],
        },
        'fabric': {
          id: 'fabric',
          speaker: '玛莎',
          text: '亚麻、棉布、粗呢，都是些普通料子。要是能弄到好一点的丝线和染料，我就能做出像样的东西来。',
          choices: [
            { text: '以后我给你带。', next: null, action: null },
          ],
        },
      },
    },

    // ----- 裁缝学徒小柯 -----
    'tailor_ke': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '小柯',
          text: '嘿！你就是村里那个要出去闯的人？我从城里来这儿学手艺，外面的世界可大得很。',
          choices: [
            { text: '城里是什么样的？', next: 'city', action: null },
            { text: '你怎么跑到这小村子来了？', next: 'why_here', action: null },
            { text: '好好学吧。', next: null, action: null },
          ],
        },
        'city': {
          id: 'city',
          speaker: '小柯',
          text: '城里的人穿的衣服可花哨了，丝绸、锦缎，还有人穿带金属扣的皮甲——不是咱们这种猎户皮，是专门做的。听说灰烬镇有个大裁缝铺，做出来的东西能卖好几块金。',
          choices: [
            { text: '灰烬镇...我记住了。', next: null, action: null },
          ],
        },
        'why_here': {
          id: 'why_here',
          speaker: '小柯',
          text: '玛莎婶的手艺其实在城里都算好的，就是太偏了。我来偷师学艺。而且这地方安静，适合做活儿。',
          choices: [
            { text: '确实挺安静的。', next: null, action: null },
          ],
        },
      },
    },

    // ----- 皮匠诺恩 -----
    'leather_nuen': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '诺恩',
          text: '......',
          choices: [
            { text: '（递过一块兽皮）能帮我看看这皮子怎么样？', next: 'inspect_leather', action: null },
            { text: '诺恩大叔，你见过什么特别的皮吗？', next: 'special_leather', action: null },
            { text: '打扰了。', next: null, action: null },
          ],
        },
        'inspect_leather': {
          id: 'inspect_leather',
          speaker: '诺恩',
          text: '......狗皮，硝得还行。你这皮子太薄，做不了什么像样的东西。给我弄张野猪皮来，我给你做双好靴子。',
          choices: [
            { text: '好的。', next: null, action: null },
          ],
        },
        'special_leather': {
          id: 'special_leather',
          speaker: '诺恩',
          text: '......有一回，老穆拖了头野猪来。那野猪皮上有道口子，不是野兽咬的——是刀。很锋利的刀，切面光滑得不正常。那不是猎人的刀。',
          choices: [
            { text: '那是什么刀？', next: 'strange_blade', action: null },
            { text: '（点头离开）', next: null, action: null },
          ],
        },
        'strange_blade': {
          id: 'strange_blade',
          speaker: '诺恩',
          text: '......不知道。但那种切口，我只在城里的军械匠那儿见过。不是咱村里任何人能做到的。',
          choices: [
            { text: '（若有所思）', next: null, action: null },
          ],
        },
      },
    },

    // ----- 村医蕾娜 -----
    'doctor_leina': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '蕾娜',
          text: '别乱碰架子上的东西，有些药弄混了会出事。说吧，什么事？',
          choices: [
            { text: '听说我父母走之前来找过你？', next: 'parents_visit', action: null },
            { text: '能给我看看这伤口吗？', next: 'heal_advice', action: null },
            { text: '没什么，告辞。', next: null, action: null },
          ],
        },
        'parents_visit': {
          id: 'parents_visit',
          speaker: '蕾娜',
          text: '......你爹来拿了一瓶止痛药和两瓶金疮药。他说是给路上备用。我问他要去哪儿，他只说"很远的路"。',
          choices: [
            { text: '......', next: null, action: null },
          ],
        },
        'heal_advice': {
          id: 'heal_advice',
          speaker: '蕾娜',
          text: '这种小伤不碍事，抹点金疮药就行。要是受了重伤，来找我就是了。不过药草有限，别拿去浪费。',
          choices: [
            { text: '谢了。', next: null, action: null },
          ],
        },
      },
    },

    // ----- 守墓人老格 -----
    'gravekeeper_ge': {
      startNodeId: 'start',
      nodes: {
        'start': {
          id: 'start',
          speaker: '老格',
          text: '......你又来了。',
          choices: [
            { text: '老格爷爷，这些墓里埋的是谁？', next: 'who_buried', action: null },
            { text: '你每天都在这里吗？', next: 'daily_life', action: null },
            { text: '我到处走走。', next: null, action: null },
          ],
        },
        'who_buried': {
          id: 'who_buried',
          speaker: '老格',
          text: '村里人。有老死的，有病死的。你爹娘的坟不在这里——他们没有死，至少...没有人看到过他们的尸体。',
          choices: [
            { text: '那你在这里守的是谁的墓？', next: 'my_duty', action: null },
            { text: '......我知道了。', next: null, action: null },
          ],
        },
        'my_duty': {
          id: 'my_duty',
          speaker: '老格',
          text: '这村里每一座坟我都认识。最远的那座，是二十年前一个外来女人的。她来的时候带着两个孩子，后来不知去了哪里。她走的时候留了一样东西给我保管。',
          choices: [
            { text: '什么东西？', next: 'the_item', action: null },
          ],
        },
        'the_item': {
          id: 'the_item',
          speaker: '老格',
          text: '一个小铜盒。她说等她的孩子长大了来找我拿。......你长得挺像她的。',
          choices: [
            { text: '......那个铜盒能给我看看吗？', next: 'wait_longer', action: null },
          ],
        },
        'wait_longer': {
          id: 'wait_longer',
          speaker: '老格',
          text: '她说了，等你够强了再来。现在还不是时候。......多去打几只野狗吧，孩子。',
          choices: [
            { text: '（沉默点头）', next: null, action: null },
          ],
        },
        'daily_life': {
          id: 'daily_life',
          speaker: '老格',
          text: '总得有人守着。不然野狗把坟刨了，死者不安。',
          choices: [
            { text: '辛苦了。', next: null, action: null },
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

    // 构建选项按钮HTML（支持条件过滤）
    var choicesHtml = '';
    var visibleChoices = [];
    if (node.choices && node.choices.length > 0) {
      choicesHtml = '<div class="dialogue-choices">';
      var visibleIdx = 0;
      for (var i = 0; i < node.choices.length; i++) {
        var choice = node.choices[i];
        var visible = true;
        // 条件判断：condition 字段
        if (choice.condition === 'gatekeeper_not_defeated') {
          var condGkId = choice.conditionArg || 'villageChief';
          var gkState = window.gameApp && window.gameApp.state && window.gameApp.state.world && window.gameApp.state.world.gatekeepers && window.gameApp.state.world.gatekeepers[condGkId] ? window.gameApp.state.world.gatekeepers[condGkId] : null;
          visible = !gkState || !gkState.defeated;
        } else if (choice.condition === 'gatekeeper_defeated') {
          var condGkId2 = choice.conditionArg || 'villageChief';
          var gkState2 = window.gameApp && window.gameApp.state && window.gameApp.state.world && window.gameApp.state.world.gatekeepers && window.gameApp.state.world.gatekeepers[condGkId2] ? window.gameApp.state.world.gatekeepers[condGkId2] : null;
          visible = gkState2 && gkState2.defeated;
        } else if (choice.condition === 'exp_locked') {
          visible = window.gameApp && window.gameApp.state && StateUtils && StateUtils.isExpLocked && StateUtils.isExpLocked(window.gameApp.state);
        }
        if (visible) {
          var num = visibleIdx + 1;
          choicesHtml += '<button class="dialogue-choice-btn" data-choice-idx="' + i + '">'
            + '<span class="choice-number">' + num + '.</span>'
            + choice.text
            + '</button>';
          visibleChoices.push(i);
          visibleIdx++;
        }
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

      case 'boss_battle':
        // 触发守门员Boss战
        this.closeDialogue();
        if (window.gameApp && window.gameApp.sceneManager && window.gameApp.sceneManager.triggerBossBattle) {
          window.gameApp.sceneManager.triggerBossBattle(actionValue);
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
