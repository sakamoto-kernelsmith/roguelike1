// =============================================================================
// Trap System
// =============================================================================

const TrapManager = {
  createTrap(x, y, def) {
    return {
      x, y,
      type: def.type,
      name: def.name,
      ch: def.ch,
      color: def.color,
      damage: def.damage || 0,
      detected: def.alwaysVisible || false,
      triggered: false,
    };
  },

  spawnTraps(map, rooms, floor, playerPos) {
    const traps = [];
    const count = randInt(DUNGEON.TRAPS_PER_FLOOR_MIN, DUNGEON.TRAPS_PER_FLOOR_MAX) + Math.floor(floor / 3);
    const floorTiles = getFloorTiles(map);
    const available = floorTiles.filter(t =>
      manhattanDist(t.x, t.y, playerPos.x, playerPos.y) > 4 &&
      map[t.y][t.x] === TILE.FLOOR
    );

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = randInt(0, available.length - 1);
      const pos = available.splice(idx, 1)[0];
      const def = weightedPick(TRAP_DEFS);
      traps.push(this.createTrap(pos.x, pos.y, def));
    }
    return traps;
  },

  // Check if player steps on trap, returns true if trap triggered
  trigger(trap, player, state) {
    if (trap.triggered) return false;
    if (trap.x !== player.x || trap.y !== player.y) return false;

    trap.triggered = true;
    trap.detected = true;
    const { messages, enemies, map, rooms } = state;

    Sound.play('trap');
    DanmakuManager.onTrap(trap.type);

    switch (trap.type) {
      case TRAP_TYPE.SPIKE:
        player.hp -= trap.damage;
        addMessage(messages, `スパイクトラップを踏んだ！(HP-${trap.damage})`, 'combat');
        Effects.spawnDamageNumber(player.x, player.y, trap.damage, false, false);
        Effects.screenShake(2);
        break;

      case TRAP_TYPE.POISON_GAS:
        addMessage(messages, '毒ガスが噴き出した！', 'combat');
        StatusManager.apply(player, STATUS.POISON, 5);
        Effects.flashScreen('#00ff0060');
        Effects.spawnParticles(player.x, player.y, '#40aa40', 12);
        break;

      case TRAP_TYPE.TELEPORT:
        addMessage(messages, 'テレポートトラップ！別の場所に飛ばされた！', 'combat');
        const floorTiles = getFloorTiles(map);
        const safe = floorTiles.filter(t =>
          !enemies.some(e => e.hp > 0 && e.x === t.x && e.y === t.y) &&
          manhattanDist(t.x, t.y, player.x, player.y) > 8
        );
        if (safe.length > 0) {
          const dest = randPick(safe);
          Effects.spawnParticles(player.x, player.y, '#6060dd', 8);
          player.x = dest.x;
          player.y = dest.y;
          Effects.spawnParticles(player.x, player.y, '#6060dd', 8);
        }
        break;

      case TRAP_TYPE.PIT:
        player.hp -= trap.damage;
        addMessage(messages, `落とし穴に落ちた！(HP-${trap.damage})`, 'combat');
        Effects.spawnDamageNumber(player.x, player.y, trap.damage, false, false);
        Effects.screenShake(4);
        // Fall to next floor if not max
        if (state.floor < MAX_FLOOR) {
          addMessage(messages, '下の階に落下した！', 'important');
          return 'pit_fall';
        }
        break;

      case TRAP_TYPE.ALARM:
        addMessage(messages, '警報が鳴り響いた！全ての敵が目覚めた！', 'important');
        Effects.flashScreen('#dd606060');
        for (const enemy of enemies) {
          if (enemy.hp > 0) {
            enemy.state = 'chase';
            enemy.lastSeenX = player.x;
            enemy.lastSeenY = player.y;
          }
        }
        break;
    }
    return true;
  },

};
