// =============================================================================
// Entity System (Player & Enemies)
// =============================================================================

function createPlayer(x, y) {
  const stats = LEVEL_TABLE[0];
  return {
    x, y,
    ch: '@',
    color: '#fff',
    name: 'プレイヤー',
    hp: stats.hp,
    maxHp: stats.hp,
    baseAtk: stats.atk,
    baseDef: stats.def,
    level: 1,
    exp: 0,
    weapon: null,
    armor: null,
    inventory: [],
    turnCount: 0,
    killCount: 0,
  };
}

function getPlayerAtk(player) {
  return player.baseAtk + (player.weapon ? player.weapon.atk : 0);
}

function getPlayerDef(player) {
  return player.baseDef + (player.armor ? player.armor.def : 0);
}

function addExp(player, amount) {
  player.exp += amount;
  const nextLevel = LEVEL_TABLE[player.level]; // level is 1-based, index is level itself for next
  if (nextLevel && player.exp >= LEVEL_TABLE[player.level - 1].expReq) {
    player.exp -= LEVEL_TABLE[player.level - 1].expReq;
    player.level++;
    if (player.level <= LEVEL_TABLE.length) {
      const newStats = LEVEL_TABLE[player.level - 1];
      player.maxHp = newStats.hp;
      player.hp = player.maxHp;
      player.baseAtk = newStats.atk;
      player.baseDef = newStats.def;
    }
    return true; // leveled up
  }
  return false;
}

function createEnemy(x, y, def) {
  return {
    x, y,
    ch: def.ch,
    color: def.color,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    def: def.def,
    exp: def.exp,
    state: 'idle', // idle, chase
    lastSeenX: -1,
    lastSeenY: -1,
  };
}

function spawnEnemies(map, rooms, floor, playerPos) {
  const enemies = [];
  const count = randInt(DUNGEON.ENEMIES_PER_FLOOR_MIN, DUNGEON.ENEMIES_PER_FLOOR_MAX) + Math.floor(floor / 2);
  const floorTiles = getFloorTiles(map);
  const available = floorTiles.filter(t =>
    manhattanDist(t.x, t.y, playerPos.x, playerPos.y) > 5
  );

  const possibleDefs = ENEMY_DEFS.filter(d => d.minFloor <= floor);

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randInt(0, available.length - 1);
    const pos = available.splice(idx, 1)[0];
    const def = weightedPick(possibleDefs.map(d => ({
      ...d,
      weight: floor >= d.minFloor + 3 ? 5 : (floor >= d.minFloor ? 15 : 1),
    })));
    enemies.push(createEnemy(pos.x, pos.y, def));
  }

  return enemies;
}

// Enemy AI
function updateEnemy(enemy, player, map, enemies, visible) {
  const canSee = visible.has(`${enemy.x},${enemy.y}`);
  const distToPlayer = manhattanDist(enemy.x, enemy.y, player.x, player.y);

  // Detection
  if (canSee && distToPlayer <= FOV_RADIUS) {
    enemy.state = 'chase';
    enemy.lastSeenX = player.x;
    enemy.lastSeenY = player.y;
  }

  if (enemy.state === 'idle') {
    // Random movement
    if (Math.random() < 0.3) {
      const dir = randPick(CARDINAL_DIRS);
      tryMoveEnemy(enemy, enemy.x + dir.x, enemy.y + dir.y, map, enemies, player);
    }
    return null;
  }

  if (enemy.state === 'chase') {
    // Adjacent to player? Attack
    if (distToPlayer === 1) {
      return performAttack(enemy, player);
    }

    // Chase using pathfinding
    const path = findPath(enemy.x, enemy.y, player.x, player.y, map, 20);
    if (path.length > 0) {
      const next = path[0];
      // Don't walk onto other enemies
      if (!enemies.some(e => e !== enemy && e.hp > 0 && e.x === next.x && e.y === next.y) &&
          !(next.x === player.x && next.y === player.y)) {
        enemy.x = next.x;
        enemy.y = next.y;
      }
    } else {
      // Can't find path, random move
      const dir = randPick(CARDINAL_DIRS);
      tryMoveEnemy(enemy, enemy.x + dir.x, enemy.y + dir.y, map, enemies, player);
    }
  }

  return null;
}

function tryMoveEnemy(enemy, nx, ny, map, enemies, player) {
  if (!inBounds(nx, ny)) return false;
  if (!isWalkable(map[ny][nx])) return false;
  if (nx === player.x && ny === player.y) return false;
  if (enemies.some(e => e !== enemy && e.hp > 0 && e.x === nx && e.y === ny)) return false;
  enemy.x = nx;
  enemy.y = ny;
  return true;
}
