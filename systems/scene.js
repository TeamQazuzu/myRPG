const SceneSystem = {
  // ---------- 移动到指定帧 ----------
  moveTo: function(frameId) {
    const zone = GAME_DATA.zones[GameState.data.world.currentZone];
    const frame = zone.frames[frameId];
    if (!frame) {
      log('无法到达该地点', 'system');
      return false;
    }

    // 检查是否相邻
    const currentFrame = zone.frames[GameState.data.world.currentFrame];
    if (!currentFrame.exits.includes(frameId)) {
      log('该地点无法直接到达', 'system');
      return false;
    }

    // 检查区域锁定
    if (frameId.startsWith('mountain-')) {
      const mountain = GAME_DATA.zones['mountain'];
      if (mountain.locked) {
        log('灰烟山脉被封锁了。需要击败村长才能通过。', 'system');
        return false;
      }
    }

    // 移动
    GameState.data.world.currentFrame = frameId;
    if (!GameState.data.world.exploredFrames.includes(frameId)) {
      GameState.data.world.exploredFrames.push(frameId);
    }

    log('你来到了' + frame.name, 'info');

    // 遇到敌人检查
    if (frame.type === 'wild') {
      if (Math.random() < 0.4) {
        CombatSystem.startEncounter();
      }
    } else if (frame.type === 'dungeon') {
      if (Math.random() < 0.6) {
        CombatSystem.startEncounter();
      }
    }

    UIRenderer.renderAll();
    GameState.save();
    return true;
  },

  // ---------- 获取当前帧 ----------
  getCurrentFrame: function() {
    const zone = GAME_DATA.zones[GameState.data.world.currentZone];
    return zone.frames[GameState.data.world.currentFrame];
  },

  // ---------- 解锁区域 ----------
  unlockZone: function(zoneId) {
    const zone = GAME_DATA.zones[zoneId];
    if (zone) {
      zone.locked = false;
      log(zone.name + ' 已解锁！', 'system');
    }
  }
};
