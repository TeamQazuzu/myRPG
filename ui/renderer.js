const UIRenderer = {
  // ---------- 角色状态面板 ----------
  renderCharacter: function() {
    const p = GameState.data.player;
    if (!p) return;

    document.getElementById('char-name').textContent = p.name;
    document.getElementById('char-lvl').textContent = p.level;
    document.getElementById('hp-val').textContent = Math.floor(p.hp);
    document.getElementById('max-hp-val').textContent = p.maxHp;
    document.getElementById('mp-val').textContent = Math.floor(p.mp);
    document.getElementById('max-mp-val').textContent = p.maxMp;
    document.getElementById('hp-bar').style.width = (p.hp / p.maxHp * 100) + '%';
    document.getElementById('mp-bar').style.width = (p.mp / p.maxMp * 100) + '%';

    document.getElementById('attr-str').textContent = p.attributes.str;
    document.getElementById('attr-agi').textContent = p.attributes.agi;
    document.getElementById('attr-int').textContent = p.attributes.int;
    document.getElementById('attr-vit').textContent = p.attributes.vit;
    document.getElementById('attr-ten').textContent = p.attributes.ten;
    document.getElementById('attr-spi').textContent = p.attributes.spi;

    if (p.stats) {
      document.getElementById('stat-patk').textContent = Math.floor(p.stats.patk);
      document.getElementById('stat-matk').textContent = Math.floor(p.stats.matk);
      document.getElementById('stat-pdef').textContent = Math.floor(p.stats.pdef);
      document.getElementById('stat-mdef').textContent = Math.floor(p.stats.mdef);
      document.getElementById('stat-hit').textContent = Math.floor(p.stats.hit);
      document.getElementById('stat-dodge').textContent = Math.floor(p.stats.dodge);
      document.getElementById('stat-crit').textContent = p.stats.crit.toFixed(1);
    }

    document.getElementById('inv-gold').textContent = p.gold;
  },

  // ---------- 装备列表 ----------
  renderEquipment: function() {
    const eq = GameState.data.equipment;
    let html = '';
    for (let slot in GAME_DATA.slots) {
      const item = eq[slot];
      html += '<div class="equip-slot">';
      html += '<span class="slot-name">' + GAME_DATA.slots[slot] + '</span>';
      if (item) {
        html += '<span class="slot-item" style="color:' + Utils.getQualityColor(item.quality) + '" onclick="InventorySystem.unequipItem(\\'' + slot + '\\')">' + item.name + '</span>';
      } else {
        html += '<span class="slot-empty">（空）</span>';
      }
      html += '</div>';
    }
    document.getElementById('equipment-list').innerHTML = html;
  },

  // ---------- 背包网格 ----------
  renderInventory: function() {
    const grid = document.getElementById('item-grid');
    const detail = document.getElementById('item-detail');
    const items = InventorySystem.getItems();

    const qualityFilter = document.getElementById('filter-quality').value;
    const typeFilter = document.getElementById('filter-type').value;
    const sortMode = document.getElementById('sort-mode').value;

    let displayItems = items.slice();
    if (qualityFilter) displayItems = displayItems.filter(function(i) { return i.quality === qualityFilter; });
    if (typeFilter) displayItems = displayItems.filter(function(i) { return i.type === typeFilter; });

    if (sortMode === 'quality') {
      displayItems.sort(function(a, b) { return GAME_DATA.Q_ORDER[b.quality] - GAME_DATA.Q_ORDER[a.quality]; });
    } else if (sortMode === 'name') {
      displayItems.sort(function(a, b) { return a.name.localeCompare(b.name); });
    } else if (sortMode === 'level') {
      displayItems.sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
    }

    if (displayItems.length === 0) {
      grid.innerHTML = '<div class="small" style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3);">背包空空如也...</div>';
    } else {
      grid.innerHTML = displayItems.map(function(item) {
        const isSelected = InventorySystem.selectedItem && InventorySystem.selectedItem.id === item.id;
        const borderColor = isSelected ? 'var(--accent)' : Utils.getQualityColor(item.quality);
        const stackText = item.stackable && item.stackCount > 1 ? ' x' + item.stackCount : '';
        const icon = item.type === 'equipment' ? '⚔️' : item.type === 'material' ? '📦' : '🧪';
        return '<div class="item ' + Utils.getQualityClass(item.quality) + '" style="border-color:' + borderColor + ';' + (isSelected ? 'box-shadow:0 0 8px ' + borderColor : '') + '" onclick="InventorySystem.selectedItem = InventorySystem.findItem(' + item.id + '); UIRenderer.renderInventory();">' +
          '<span>' + icon + '</span><span>' + item.name + stackText + '</span>' +
          (item.level ? '<span class="small">Lv.' + item.level + '</span>' : '') +
          '</div>';
      }).join('');
    }

    document.getElementById('inv-count').textContent = items.length;
    document.getElementById('inv-cap').textContent = InventorySystem.getCapacity();

    if (InventorySystem.selectedItem) {
      detail.innerHTML = this.renderItemDetail(InventorySystem.selectedItem, 'inventory');
      detail.classList.remove('hidden');
    } else {
      detail.classList.add('hidden');
    }
  },

  // ---------- 仓库网格 ----------
  renderStorage: function() {
    const grid = document.getElementById('storage-grid');
    const detail = document.getElementById('storage-detail');
    const items = StorageSystem.getItems();

    document.getElementById('storage-count').textContent = items.length;

    if (items.length === 0) {
      grid.innerHTML = '<div class="small" style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3);">仓库空空如也...</div>';
    } else {
      grid.innerHTML = items.map(function(item) {
        const isSelected = StorageSystem.selectedItem && StorageSystem.selectedItem.id === item.id;
        const borderColor = isSelected ? 'var(--accent)' : Utils.getQualityColor(item.quality);
        const stackText = item.stackable && item.stackCount > 1 ? ' x' + item.stackCount : '';
        const icon = item.type === 'equipment' ? '⚔️' : item.type === 'material' ? '📦' : '🧪';
        return '<div class="item ' + Utils.getQualityClass(item.quality) + '" style="border-color:' + borderColor + ';' + (isSelected ? 'box-shadow:0 0 8px ' + borderColor : '') + '" onclick="StorageSystem.selectedItem = StorageSystem.findItem(' + item.id + '); UIRenderer.renderStorage();">' +
          '<span>' + icon + '</span><span>' + item.name + stackText + '</span>' +
          (item.level ? '<span class="small">Lv.' + item.level + '</span>' : '') +
          '</div>';
      }).join('');
    }

    if (StorageSystem.selectedItem) {
      detail.innerHTML = this.renderItemDetail(StorageSystem.selectedItem, 'storage');
      detail.classList.remove('hidden');
    } else {
      detail.classList.add('hidden');
    }
  },

  // ---------- 物品详情 ----------
  renderItemDetail: function(item, context) {
    let html = '';
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
    html += '<div><div style="font-size:1.15rem;font-weight:bold;color:' + Utils.getQualityColor(item.quality) + '">' + item.name + '</div>';
    html += '<div class="small">' + (item.desc || '') + '</div></div>';
    html += '<div style="text-align:right;"><span class="small" style="color:' + Utils.getQualityColor(item.quality) + '">' + Utils.getQualityName(item.quality) + '</span>';
    if (item.level) html += '<div class="small">Lv.' + item.level + '</div>';
    html += '</div></div>';

    if (item.type === 'equipment') {
      html += '<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.85rem;">';
      if (item.basePatk) html += '<div>⚔️ 物理攻击: <span style="color:var(--accent)">+' + item.basePatk + '</span></div>';
      if (item.baseMatk) html += '<div>🔮 法术攻击: <span style="color:var(--purple)">+' + item.baseMatk + '</span></div>';
      if (item.basePdef) html += '<div>🛡️ 物理护甲: <span style="color:var(--green)">+' + item.basePdef + '</span></div>';
      if (item.baseMdef) html += '<div>✨ 法术护甲: <span style="color:var(--green)">+' + item.baseMdef + '</span></div>';
      html += '</div>';

      if (item.affixes && item.affixes.length > 0) {
        html += '<div style="margin-top:8px;"><b style="font-size:0.85rem;">词条 (' + item.affixes.length + '条):</b></div>';
        html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">';
        item.affixes.forEach(function(aff) {
          html += '<div class="affix-line" style="color:' + Utils.getQualityColor(aff.q) + '">• ' + aff.n + ': ' + aff.e + '</div>';
        });
        html += '</div>';
      }

      if (item.sockets && item.sockets.length > 0) {
        html += '<div style="margin-top:8px;"><b style="font-size:0.85rem;">镶嵌孔:</b></div>';
        html += '<div style="display:flex;gap:6px;margin-top:4px;">';
        item.sockets.forEach(function(socket) {
          if (socket.gem) {
            html += '<div style="padding:4px 8px;background:var(--bg2);border-radius:4px;border:1px solid ' + Utils.getQualityColor(socket.gem.quality) + ';font-size:0.75rem;">💎 ' + socket.gem.name + '</div>';
          } else {
            html += '<div style="padding:4px 8px;background:var(--bg2);border-radius:4px;border:1px dashed var(--text3);font-size:0.75rem;color:var(--text3);">○ 空孔</div>';
          }
        });
        html += '</div>';

        const rw = EquipmentSystem.checkRuneword(item);
        if (rw) {
          html += '<div class="runeword-box"><div style="color:var(--orange);font-weight:bold;font-size:0.85rem;">✦ 符文之语: ' + rw.n + '</div><div class="small">' + rw.e + '</div></div>';
        }
      }

      if (item.enchant) {
        html += '<div style="margin-top:8px;padding:6px;background:var(--bg2);border-radius:6px;border:1px solid var(--purple);"><div style="color:var(--purple);font-weight:bold;font-size:0.85rem;">✨ 附魔: ' + item.enchant.desc + '</div></div>';
      }

      // 装备对比
      if (item.slot) {
        let equipped = GameState.data.equipment[item.slot];
        if (!equipped && item.slot === 'ring') equipped = GameState.data.equipment.ring1 || GameState.data.equipment.ring2;
        if (equipped && equipped.id !== item.id) {
          const cmp = EquipmentSystem.compare(equipped, item);
          html += '<div class="compare-box"><div style="font-size:0.8rem;font-weight:bold;margin-bottom:4px;">📊 与当前装备对比:</div>';
          html += '<div style="font-size:0.75rem;color:var(--text3);">已装备: ' + equipped.name + '</div>';
          if (cmp.diffs.length > 0) {
            html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">';
            cmp.diffs.forEach(function(d) {
              const color = d.b ? 'var(--green)' : 'var(--red)';
              const sign = d.d > 0 ? '+' : '';
              html += '<div style="font-size:0.75rem;color:' + color + '">' + d.n + ': ' + sign + d.d + '</div>';
            });
            html += '</div>';
          }
          html += '</div>';
        }
      }
    }

    if (item.type === 'consumable' && item.effect) {
      html += '<div style="margin-top:8px;font-size:0.85rem;">';
      if (item.effect.healHp) html += '<div>❤️ 恢复生命: <span style="color:var(--green)">+' + item.effect.healHp + '</span></div>';
      if (item.effect.healMp) html += '<div>💧 恢复法力: <span style="color:var(--purple)">+' + item.effect.healMp + '</span></div>';
      if (item.effect.buff) html += '<div>⚡ 增益: ' + item.effect.buff.s + ' +' + (item.effect.buff.v * 100).toFixed(0) + '%</div>';
      html += '</div>';
    }

    // 操作按钮
    html += '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">';
    if (item.type === 'equipment' && item.slot) {
      if (InventorySystem.isEquipped(item.id)) {
        html += '<button class="btn" onclick="InventorySystem.unequipItem(\\'' + InventorySystem.getEquippedSlot(item.id) + '\\'); UIRenderer.renderAll();">卸下</button>';
      } else {
        html += '<button class="btn btn-success" onclick="InventorySystem.equipItem(' + item.id + '); UIRenderer.renderAll();">装备</button>';
      }
    }
    if (item.type === 'consumable') {
      html += '<button class="btn btn-success" onclick="InventorySystem.useConsumable(' + item.id + '); UIRenderer.renderAll();">使用</button>';
    }
    if (item.stackable && item.stackCount > 1) {
      html += '<button class="btn" onclick="InventorySystem.splitStack(' + item.id + '); UIRenderer.renderInventory();">拆分</button>';
    }
    if (context === 'inventory') {
      html += '<button class="btn" onclick="InventorySystem.moveToStorage(' + item.id + '); UIRenderer.renderAll();">存入仓库</button>';
    } else if (context === 'storage') {
      html += '<button class="btn" onclick="StorageSystem.moveToInventory(' + item.id + '); UIRenderer.renderAll();">取回背包</button>';
    }
    html += '<button class="btn btn-danger" onclick="InventorySystem.discardItem(' + item.id + '); UIRenderer.renderAll();">丢弃</button>';
    html += '</div>';

    return html;
  },

  // ---------- 锻造面板 ----------
  renderForge: function() {
    const list = document.getElementById('forge-list');
    const detail = document.getElementById('forge-detail');
    const equips = InventorySystem.getItems().filter(function(i) { return i.type === 'equipment' && i.quality !== 'red'; });

    if (equips.length === 0) {
      list.innerHTML = '<div class="small">没有可锻造的装备</div>';
    } else {
      list.innerHTML = equips.map(function(item) {
        return '<div class="item ' + Utils.getQualityClass(item.quality) + '" style="margin:2px 0;cursor:pointer;" onclick="UIRenderer.selectedForgeItem = ' + item.id + '; UIRenderer.renderForge();">' +
          '⚔️ ' + item.name + ' <span class="small">[' + item.quality.toUpperCase() + ']</span></div>';
      }).join('');
    }

    if (this.selectedForgeItem) {
      const item = InventorySystem.findItem(this.selectedForgeItem);
      if (item) {
        const qo = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
        const nq = qo[qo.indexOf(item.quality) + 1];
        let html = '<div style="padding:10px;background:var(--bg);border-radius:8px;">';
        html += '<div style="font-weight:bold;color:' + Utils.getQualityColor(item.quality) + '">' + item.name + '</div>';
        html += '<div class="small">当前品质: ' + Utils.getQualityName(item.quality) + '</div>';
        if (nq) {
          html += '<div style="margin-top:8px;">';
          html += '<div>→ 升级为 <span style="color:' + Utils.getQualityColor(nq) + ';font-weight:bold;">' + Utils.getQualityName(nq) + '</span></div>';
          html += '<div class="small" style="margin-top:4px;color:var(--yellow)">⚠️ 锻造后词条将重随机！</div>';
          html += '<button class="btn btn-success" style="margin-top:10px;" onclick="var r=EquipmentSystem.forge(InventorySystem.findItem(' + item.id + ')); log(r.msg, r.ok?\'system\':\'system\'); UIRenderer.renderAll();">🔨 开始锻造</button>';
          html += '</div>';
        } else {
          html += '<div style="color:var(--text3);">已达最高品质</div>';
        }
        html += '</div>';
        detail.innerHTML = html;
      }
    } else {
      detail.innerHTML = '<div class="small" style="color:var(--text3);">选择一件装备查看锻造详情</div>';
    }
  },

  // ---------- 附魔面板 ----------
  renderEnchant: function() {
    const list = document.getElementById('enchant-list');
    const detail = document.getElementById('enchant-detail');
    const equips = InventorySystem.getItems().filter(function(i) { return i.type === 'equipment'; });

    if (equips.length === 0) {
      list.innerHTML = '<div class="small">没有可附魔的装备</div>';
    } else {
      list.innerHTML = equips.map(function(item) {
        return '<div class="item ' + Utils.getQualityClass(item.quality) + '" style="margin:2px 0;cursor:pointer;" onclick="UIRenderer.selectedEnchantItem = ' + item.id + '; UIRenderer.renderEnchant();">' +
          '⚔️ ' + item.name + (item.enchant ? ' ✨' : '') + '</div>';
      }).join('');
    }

    if (this.selectedEnchantItem) {
      const item = InventorySystem.findItem(this.selectedEnchantItem);
      if (item) {
        let html = '<div style="padding:10px;background:var(--bg);border-radius:8px;">';
        html += '<div style="font-weight:bold;color:' + Utils.getQualityColor(item.quality) + '">' + item.name + '</div>';
        if (item.enchant) {
          html += '<div style="margin-top:6px;padding:6px;background:var(--bg2);border-radius:4px;">';
          html += '<div style="color:var(--purple);font-size:0.85rem;">✨ 当前附魔: ' + item.enchant.desc + '</div>';
          html += '</div>';
          html += '<button class="btn btn-danger" style="margin-top:8px;" onclick="EquipmentSystem.clearEnchant(InventorySystem.findItem(' + item.id + ')); UIRenderer.renderAll();">清除附魔</button>';
        } else {
          html += '<div style="margin-top:8px;">';
          html += '<div class="small">消耗: 魔法精华 x5</div>';
          html += '<div class="small" style="color:var(--text3);">随机附加一条属性</div>';
          html += '<button class="btn btn-success" style="margin-top:8px;" onclick="var r=EquipmentSystem.enchant(InventorySystem.findItem(' + item.id + ')); log(r.msg, r.ok?\'system\':\'system\'); UIRenderer.renderAll();">✨ 开始附魔</button>';
          html += '</div>';
        }
        html += '</div>';
        detail.innerHTML = html;
      }
    } else {
      detail.innerHTML = '<div class="small" style="color:var(--text3);">选择一件装备查看附魔详情</div>';
    }
  },

  // ---------- 镶嵌面板 ----------
  renderSocket: function() {
    const equipList = document.getElementById('socket-equip-list');
    const gemList = document.getElementById('socket-gem-list');
    const detail = document.getElementById('socket-detail');

    const equips = InventorySystem.getItems().filter(function(i) { return i.type === 'equipment' && i.sockets && i.sockets.length > 0; });
    if (equips.length === 0) {
      equipList.innerHTML = '<div class="small">没有带孔装备</div>';
    } else {
      equipList.innerHTML = equips.map(function(item) {
        return '<div class="item ' + Utils.getQualityClass(item.quality) + '" style="margin:2px 0;cursor:pointer;" onclick="UIRenderer.selectedSocketEquip = ' + item.id + '; UIRenderer.selectedSocketIdx = null; UIRenderer.renderSocket();">' +
          '⚔️ ' + item.name + ' [' + item.sockets.length + '孔]</div>';
      }).join('');
    }

    const gems = InventorySystem.getItems().filter(function(i) { return i.gemType || i.runeType; });
    if (gems.length === 0) {
      gemList.innerHTML = '<div class="small">没有宝石/符文</div>';
    } else {
      gemList.innerHTML = gems.map(function(gem) {
        return '<div class="item ' + Utils.getQualityClass(gem.quality) + '" style="margin:2px 0;cursor:pointer;font-size:0.75rem;" onclick="UIRenderer.selectedSocketGem = ' + gem.id + '; UIRenderer.renderSocket();">' +
          '💎 ' + gem.name + '</div>';
      }).join('');
    }

    if (this.selectedSocketEquip) {
      const item = InventorySystem.findItem(this.selectedSocketEquip);
      if (item) {
        let html = '<div style="padding:10px;background:var(--bg);border-radius:8px;">';
        html += '<div style="font-weight:bold;color:' + Utils.getQualityColor(item.quality) + '">' + item.name + '</div>';
        html += '<div style="margin-top:8px;">';
        item.sockets.forEach(function(socket, idx) {
          const isSelected = UIRenderer.selectedSocketIdx === idx;
          if (socket.gem) {
            html += '<div style="padding:6px;margin:2px 0;background:var(--bg2);border-radius:4px;border:1px solid ' + Utils.getQualityColor(socket.gem.quality) + ';cursor:pointer;' + (isSelected ? 'border-color:var(--accent);' : '') + '" onclick="UIRenderer.selectedSocketIdx = ' + idx + '; UIRenderer.renderSocket();">' +
              '💎 ' + socket.gem.name +
              (isSelected ? ' <button class="btn btn-danger" style="float:right;padding:2px 6px;font-size:0.7rem;" onclick="event.stopPropagation(); var r=EquipmentSystem.unsocket(InventorySystem.findItem(' + item.id + '), ' + idx + '); if(r.ok){InventorySystem.addItem({id:Utils.genId(),name:r.gem.name,quality:r.gem.quality,type:\'material\',gemType:r.gem.gemType,stackable:true,stackCount:1,stackMax:50,desc:\'宝石\'});} log(r.msg, r.ok?\'info\':\'system\'); UIRenderer.renderAll();">取出</button>' : '') +
              '</div>';
          } else {
            html += '<div style="padding:6px;margin:2px 0;background:var(--bg2);border-radius:4px;border:1px dashed var(--text3);cursor:pointer;' + (isSelected ? 'border-color:var(--accent);' : '') + '" onclick="UIRenderer.selectedSocketIdx = ' + idx + '; UIRenderer.renderSocket();">' +
              '○ 空孔位 #' + (idx + 1) +
              (isSelected && UIRenderer.selectedSocketGem ? ' <button class="btn btn-success" style="float:right;padding:2px 6px;font-size:0.7rem;" onclick="event.stopPropagation(); var gem=InventorySystem.findItem(' + UIRenderer.selectedSocketGem + '); var r=EquipmentSystem.socket(InventorySystem.findItem(' + item.id + '), ' + idx + ', gem); if(r.ok){var gi=InventorySystem.getItems().findIndex(function(i){return i.id===' + UIRenderer.selectedSocketGem + '}); if(gi>=0){if(InventorySystem.getItems()[gi].stackCount>1){InventorySystem.getItems()[gi].stackCount--;}else{InventorySystem.getItems().splice(gi,1);}} if(r.old){InventorySystem.addItem({id:Utils.genId(),name:r.old.name,quality:r.old.quality,type:\'material\',gemType:r.old.gemType,stackable:true,stackCount:1,stackMax:50,desc:\'宝石\'});}} log(r.msg, r.ok?\'system\':\'system\'); UIRenderer.selectedSocketGem=null; UIRenderer.renderAll();">镶嵌</button>' : '') +
              '</div>';
          }
        });
        html += '</div>';

        const rw = EquipmentSystem.checkRuneword(item);
        if (rw) {
          html += '<div class="runeword-box"><div style="color:var(--orange);font-weight:bold;font-size:0.85rem;">✦ 符文之语已激活: ' + rw.n + '</div><div class="small">' + rw.e + '</div></div>';
        } else if (item.sockets.length >= 3) {
          html += '<div style="margin-top:6px;font-size:0.75rem;color:var(--text3);">💡 提示: 怒火=红+红+火 冰霜=蓝+蓝+冰 不朽=琥珀+钻石+琥珀</div>';
        }
        html += '</div>';
        detail.innerHTML = html;
      }
    } else {
      detail.innerHTML = '<div class="small" style="color:var(--text3);">选择一件有孔装备</div>';
    }
  },

  // ---------- 场景/地图面板 ----------
  renderScene: function() {
    const frameId = GameState.data.world.currentFrame;
    const zone = GAME_DATA.zones[GameState.data.world.currentZone];
    if (!zone) return;

    const frame = zone.frames[frameId];
    if (!frame) return;

    document.getElementById('scene-name').textContent = frame.name;
    document.getElementById('scene-desc').textContent = frame.desc;

    // 渲染出口
    const exitsEl = document.getElementById('scene-exits');
    let html = '';
    frame.exits.forEach(function(exitId) {
      const exitZone = GAME_DATA.zones[GameState.data.world.currentZone];
      const exitFrame = exitZone.frames[exitId];
      if (!exitFrame) return;

      const isExplored = GameState.data.world.exploredFrames.includes(exitId);
      const name = isExplored ? exitFrame.name : '[未知空间]';
      const typeIcon = exitFrame.type === 'safe' ? '🏠' : exitFrame.type === 'wild' ? '🌲' : '⚔️';

      html += '<button class="btn" onclick="SceneSystem.moveTo(\\'' + exitId + '\\')">' + typeIcon + ' ' + name + '</button>';
    });
    exitsEl.innerHTML = html;

    // 渲染NPC
    const npcEl = document.getElementById('scene-npcs');
    if (frame.npc) {
      const npc = GAME_DATA.npcs[frame.npc];
      if (npc) {
        npcEl.innerHTML = '<div class="panel" style="margin-top:10px;"><h2>👤 ' + npc.name + '</h2><p class="small">' + npc.desc + '</p></div>';
      }
    } else {
      npcEl.innerHTML = '';
    }

    // 渲染交互
    const interactEl = document.getElementById('scene-interact');
    if (frame.type === 'wild' || frame.type === 'dungeon') {
      interactEl.innerHTML = '<button class="btn btn-danger" onclick="CombatSystem.startEncounter()">⚔️ 探索周围</button>';
    } else {
      interactEl.innerHTML = '';
    }
  },

  // ---------- 标签切换 ----------
  switchTab: function(tab) {
    const btns = document.querySelectorAll('.tab-btn');
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    document.getElementById('tab-' + tab).classList.add('active');

    const contents = document.querySelectorAll('.tab-content');
    for (let i = 0; i < contents.length; i++) contents[i].classList.add('hidden');
    document.getElementById('content-' + tab).classList.remove('hidden');

    if (tab === 'inventory') this.renderInventory();
    if (tab === 'storage') this.renderStorage();
    if (tab === 'forge') this.renderForge();
    if (tab === 'enchant') this.renderEnchant();
    if (tab === 'socket') this.renderSocket();
  },

  // ---------- 全部刷新 ----------
  renderAll: function() {
    this.renderCharacter();
    this.renderEquipment();
    this.renderInventory();
    this.renderStorage();
    this.renderScene();

    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      const tab = activeTab.id.replace('tab-', '');
      if (tab === 'forge') this.renderForge();
      if (tab === 'enchant') this.renderEnchant();
      if (tab === 'socket') this.renderSocket();
    }
  }
};
