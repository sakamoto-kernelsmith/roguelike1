// =============================================================================
// Legacy / Relic System (localStorage persistence across runs)
// =============================================================================

const LegacyManager = {
  STORAGE_KEY: 'rogueDepths_legacy',
  MAX_RELICS: 5,

  // Save death data
  saveDeath(player, floor) {
    const legacies = this.load();
    const relic = {
      floor,
      level: player.level,
      gold: Math.floor((player.gold || 0) * 0.3),
      weapon: player.weapon ? { name: player.weapon.name, atk: player.weapon.atk, rarity: player.weapon.rarity, special: player.weapon.special } : null,
      armor: player.armor ? { name: player.armor.name, def: player.armor.def, rarity: player.armor.rarity, special: player.armor.special } : null,
      killCount: player.killCount,
      timestamp: Date.now(),
    };
    legacies.push(relic);
    // Keep only recent relics
    while (legacies.length > this.MAX_RELICS) {
      legacies.shift();
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(legacies));
    } catch (e) { /* localStorage might be full or disabled */ }
  },

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // Try to spawn a ghost with previous run's equipment on a floor
  trySpawnGhost(floor, map, enemies, playerPos) {
    const legacies = this.load();
    if (legacies.length === 0) return null;

    // 20% chance per floor
    if (Math.random() > 0.2) return null;

    // Pick a legacy that died on a nearby floor
    const candidates = legacies.filter(l => Math.abs(l.floor - floor) <= 2);
    if (candidates.length === 0) return null;

    const legacy = randPick(candidates);
    const floorTiles = getFloorTiles(map);
    const available = floorTiles.filter(t =>
      manhattanDist(t.x, t.y, playerPos.x, playerPos.y) > 6 &&
      !enemies.some(e => e.x === t.x && e.y === t.y)
    );
    if (available.length === 0) return null;

    const pos = randPick(available);
    const ghost = createEnemy(pos.x, pos.y, {
      name: '亡者の影',
      ch: '@',
      color: '#6666aa',
      hp: 15 + legacy.level * 3,
      atk: 4 + legacy.level,
      def: 2 + Math.floor(legacy.level / 2),
      exp: 10 + legacy.level * 2,
      gold: legacy.gold,
    });
    ghost.state = 'idle';
    ghost.isLegacyGhost = true;
    ghost.legacyData = legacy;

    return ghost;
  },

  // Get loot from defeated legacy ghost
  getLoot(ghost) {
    if (!ghost.legacyData) return null;
    const legacy = ghost.legacyData;
    // Return weapon or armor if they had one
    if (legacy.weapon && Math.random() < 0.5) {
      return { type: 'weapon', data: legacy.weapon };
    }
    if (legacy.armor && Math.random() < 0.5) {
      return { type: 'armor', data: legacy.armor };
    }
    return null;
  },
};
