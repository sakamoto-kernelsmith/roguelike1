// =============================================================================
// Noise System
// =============================================================================

const NoiseManager = {
  // Propagate noise from a source, waking nearby enemies
  propagate(sourceX, sourceY, noiseLevel, enemies, player, messages) {
    if (noiseLevel <= 0) return;
    const radius = NOISE.WAKE_RADIUS_BASE + noiseLevel;
    let woken = 0;

    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.state === 'chase') continue;
      const d = manhattanDist(sourceX, sourceY, enemy.x, enemy.y);
      if (d <= radius) {
        // Chance to wake decreases with distance
        const chance = Math.min(1, noiseLevel / (d + 1));
        if (Math.random() < chance) {
          enemy.state = 'chase';
          enemy.lastSeenX = sourceX;
          enemy.lastSeenY = sourceY;
          woken++;
        }
      }
    }

    if (woken > 0 && noiseLevel >= NOISE.SKILL) {
      addMessage(messages, `物音で${woken}体の敵が目覚めた！`, 'combat');
    }
  },

  // Get noise level for player actions
  getActionNoise(actionType, player) {
    let base = 0;
    switch (actionType) {
      case 'move': base = NOISE.MOVE; break;
      case 'attack': base = NOISE.ATTACK; break;
      case 'critical': base = NOISE.CRITICAL; break;
      case 'skill': base = NOISE.SKILL; break;
      case 'trap': base = NOISE.TRAP; break;
      case 'alarm': base = NOISE.ALARM; break;
      case 'boss': base = NOISE.BOSS_ACTION; break;
      case 'chest': base = NOISE.CHEST; break;
      default: base = 1;
    }
    // Stealth boots reduce noise
    if (player && player.armor && player.armor.special === 'stealth') {
      base = Math.max(0, Math.floor(base * 0.4));
    }
    return base;
  },
};
