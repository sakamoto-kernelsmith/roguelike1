// =============================================================================
// Floor Mutation System
// =============================================================================

const MutationManager = {
  // Pick a mutation for this floor (boss floors get NONE)
  roll(floor, isBossFloor) {
    if (isBossFloor) return MUTATION.NONE;
    if (floor <= 1) return MUTATION.NONE; // Floor 1 is always normal
    const candidates = Object.keys(MUTATION_DEFS);
    return Math.random() < 0.6 ? randPick(candidates) : MUTATION.NONE;
  },

  // Apply mutation effects to dungeon generation params
  getSpawnModifiers(mutation) {
    const mods = { enemyCountMult: 1, enemyStatMult: 1, trapCountMult: 1, itemCountMult: 1, foodCountMult: 1, chestRarityBonus: 0, hungerDecayMult: 1, detectionRangeMult: 1, noiseMult: 1 };
    switch (mutation) {
      case MUTATION.POISON_FOG:
        break; // Handled in renderer overlay + room poison zones
      case MUTATION.HUNT:
        mods.detectionRangeMult = 1.5;
        break;
      case MUTATION.FAMINE:
        mods.hungerDecayMult = 2.0;
        mods.foodCountMult = 2;
        break;
      case MUTATION.TREASURE:
        mods.itemCountMult = 1.5;
        mods.chestRarityBonus = 1;
        mods.enemyStatMult = 1.3;
        break;
      case MUTATION.SILENCE:
        mods.enemyCountMult = 0.5;
        mods.enemyStatMult = 1.6;
        break;
      case MUTATION.TRAP_FLOOR:
        mods.trapCountMult = 2.0;
        mods.chestRarityBonus = 1;
        break;
    }
    return mods;
  },

  // Create poison fog zones for POISON_FOG mutation (room indices)
  createPoisonZones(rooms) {
    const zones = [];
    for (let i = 1; i < rooms.length; i++) {
      if (Math.random() < 0.4) {
        zones.push(i);
      }
    }
    return zones;
  },

  // Check if a tile is in a poison zone
  isInPoisonZone(x, y, rooms, poisonZones) {
    if (!poisonZones || poisonZones.length === 0) return false;
    for (const ri of poisonZones) {
      const room = rooms[ri];
      if (!room) continue;
      if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
        return true;
      }
    }
    return false;
  },

  // Get display text for floor start
  getAnnouncement(mutation) {
    const def = MUTATION_DEFS[mutation];
    if (!def) return null;
    return { name: def.name, desc: def.desc, color: def.color };
  },
};
