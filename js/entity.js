// =============================================================================
// Entity System (Player, Enemies, NPCs) - with Prefixes, Roles, Boss Phases
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
    gold: 0,
    hunger: HUNGER_MAX,
    statusEffects: [],
    lastDx: 0,
    lastDy: 1,
    killStreak: 0,
    lastKillTurn: -1,
    magicLevel: 1,
    magicStones: 0,
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
  const nextLevel = LEVEL_TABLE[player.level];
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
    return true;
  }
  return false;
}

// --- Hunger ---
function tickHunger(player, messages, hungerDecayMult) {
  const decay = HUNGER_DECAY * (hungerDecayMult || 1);
  player.hunger = Math.max(0, player.hunger - decay);
  if (player.hunger <= 0) {
    player.hp -= 1;
    if (player.turnCount % 5 === 0) {
      addMessage(messages, '空腹でHPが減っている！(HP-1)', 'combat');
    }
  } else if (player.hunger <= 20 && player.turnCount % 10 === 0) {
    addMessage(messages, 'お腹が減ってきた...', 'system');
    DanmakuManager.onHunger();
  }
}

// --- Enemy Creation ---
function createEnemy(x, y, def) {
  return {
    x, y,
    id: def.id || null,
    ch: def.ch,
    color: def.color,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    def: def.def,
    exp: def.exp,
    gold: def.gold || 0,
    state: 'idle',
    lastSeenX: -1,
    lastSeenY: -1,
    evasion: def.evasion || 0,
    passWalls: def.passWalls || false,
    breath: def.breath || false,
    isBoss: def.isBoss || false,
    bossType: def.bossType || null,
    role: def.role || ENEMY_ROLE.FRONTLINE,
    prefix: null,
    statusEffects: [],
    turnCount: 0,
  };
}

// Apply a random prefix to an enemy
function applyEnemyPrefix(enemy, floor) {
  if (enemy.isBoss) return;
  // Prefix chance increases with depth
  const chance = 0.05 + floor * 0.03;
  if (Math.random() > chance) return;

  const prefixes = [ENEMY_PREFIX.VENOMOUS, ENEMY_PREFIX.SWIFT, ENEMY_PREFIX.ARMORED, ENEMY_PREFIX.BERSERK];
  const prefix = randPick(prefixes);
  enemy.prefix = prefix;
  enemy.name = prefix.name + enemy.name;
  enemy.color = prefix.color;
  enemy.hp = Math.floor(enemy.hp * prefix.hpMult);
  enemy.maxHp = enemy.hp;
  enemy.atk = Math.floor(enemy.atk * prefix.atkMult);
  enemy.def = Math.floor(enemy.def * prefix.defMult);
  enemy.exp = Math.floor(enemy.exp * 1.5);
  enemy.gold = Math.floor(enemy.gold * 1.5);
  if (prefix.hasHaste) {
    StatusManager.apply(enemy, STATUS.HASTE, 999);
  }
}

function createBoss(x, y, floor) {
  const def = BOSS_DEFS[floor];
  if (!def) return null;
  const boss = createEnemy(x, y, { ...def, isBoss: true });
  boss.maxHp = def.hp;
  boss.hp = def.hp;
  boss.bossPhase = 1; // Track current phase
  return boss;
}

function spawnEnemies(map, rooms, floor, playerPos, isBossFloor, mutation) {
  const enemies = [];
  const mods = mutation ? MutationManager.getSpawnModifiers(mutation) : { enemyCountMult: 1, enemyStatMult: 1 };

  let count = isBossFloor
    ? Math.max(2, randInt(DUNGEON.ENEMIES_PER_FLOOR_MIN, DUNGEON.ENEMIES_PER_FLOOR_MAX) - 2)
    : randInt(DUNGEON.ENEMIES_PER_FLOOR_MIN, DUNGEON.ENEMIES_PER_FLOOR_MAX) + Math.floor(floor / 2);
  count = Math.floor(count * mods.enemyCountMult);

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
    const enemy = createEnemy(pos.x, pos.y, def);

    // Apply mutation stat scaling
    if (mods.enemyStatMult !== 1) {
      enemy.hp = Math.floor(enemy.hp * mods.enemyStatMult);
      enemy.maxHp = enemy.hp;
      enemy.atk = Math.floor(enemy.atk * mods.enemyStatMult);
      enemy.def = Math.floor(enemy.def * mods.enemyStatMult);
    }

    // Late-floor depth scaling (floors 7+): increase enemy pressure
    if (floor >= 7) {
      const depthBonus = 1 + (floor - 6) * 0.08; // +8%/+16%/+24%/+32% at floors 7/8/9/10
      enemy.hp = Math.floor(enemy.hp * depthBonus);
      enemy.maxHp = enemy.hp;
      enemy.atk = Math.floor(enemy.atk * depthBonus);
      enemy.def = Math.floor(enemy.def * depthBonus);
    }

    // Apply random prefix
    applyEnemyPrefix(enemy, floor);

    enemies.push(enemy);
  }

  return enemies;
}

// --- Merchant NPC ---
function createMerchant(x, y, floor) {
  const shopItems = [];
  shopItems.push({ item: ITEM_DEFS.find(d => d.type === ITEM_TYPE.HEAL_POTION), price: 20 });
  if (floor >= 3) {
    shopItems.push({ item: ITEM_DEFS.find(d => d.type === ITEM_TYPE.BIG_HEAL_POTION), price: 50 });
  }
  const foods = ITEM_DEFS.filter(d => d.type === ITEM_TYPE.FOOD && d.minFloor <= floor);
  if (foods.length > 0) {
    shopItems.push({ item: randPick(foods), price: foods[0].price });
  }
  const equips = ITEM_DEFS.filter(d =>
    (d.type === ITEM_TYPE.WEAPON || d.type === ITEM_TYPE.ARMOR) && d.minFloor <= floor
  );
  if (equips.length > 0) {
    const eq = randPick(equips);
    shopItems.push({ item: eq, price: eq.price || 50 });
  }

  // Pick a random merchant personality from lore
  const lore = typeof MERCHANT_LORE !== 'undefined' && MERCHANT_LORE.length > 0
    ? randPick(MERCHANT_LORE) : null;

  return {
    x, y,
    ch: '$',
    color: '#ffdd44',
    name: lore ? lore.name : '商人',
    loreName: lore ? lore.name : '商人',
    loreTitle: lore ? lore.title : '',
    introLines: lore ? lore.introLines : [],
    buyLines: lore ? lore.buyLines : [],
    emptyLines: lore ? lore.emptyLines : [],
    isMerchant: true,
    shopItems,
  };
}

// --- Enemy AI ---
function updateEnemy(enemy, player, map, enemies, visible, state) {
  if (enemy.hp <= 0) return null;

  enemy.turnCount++;

  const canSee = visible.has(`${enemy.x},${enemy.y}`);
  const distToPlayer = manhattanDist(enemy.x, enemy.y, player.x, player.y);
  const mutation = state.mutation || MUTATION.NONE;

  // Detection range (affected by mutation)
  const mods = MutationManager.getSpawnModifiers(mutation);
  const detectRange = Math.floor(FOV_RADIUS * mods.detectionRangeMult);

  if (canSee && distToPlayer <= detectRange) {
    enemy.state = 'chase';
    enemy.lastSeenX = player.x;
    enemy.lastSeenY = player.y;
  }

  // Give up chase if too far and out of sight
  if (enemy.state === 'chase' && !enemy.isBoss) {
    const limit = enemy.chaseLimit || 0;
    if (limit > 0 && !canSee && distToPlayer > limit) {
      enemy.state = 'idle';
      if (visible.has(`${enemy.x},${enemy.y}`)) {
        // Player can still see the enemy giving up
        addMessage(state.messages, `${enemy.name}は追うのをやめたようだ。`, 'info');
      }
      StatusManager.tick(enemy, state.messages);
      return null;
    }
  }

  // Boss special abilities (with phase system)
  if (enemy.isBoss) {
    const result = updateBossAI(enemy, player, map, enemies, visible, state);
    if (result) return result;
  }

  // Group tactics: support role behavior
  if (enemy.role === ENEMY_ROLE.SUPPORT && enemy.state === 'chase') {
    const supported = _supportAlly(enemy, enemies);
    if (supported) {
      StatusManager.tick(enemy, state.messages);
      return null;
    }
  }

  if (enemy.state === 'idle') {
    if (Math.random() < 0.3) {
      const dir = randPick(CARDINAL_DIRS);
      tryMoveEnemy(enemy, enemy.x + dir.x, enemy.y + dir.y, map, enemies, player);
    }
    StatusManager.tick(enemy, state.messages);
    return null;
  }

  if (enemy.state === 'chase') {
    // Dragon breath attack
    if (enemy.breath && distToPlayer <= 3 && distToPlayer > 1) {
      const breathResult = tryBreathAttack(enemy, player, map, state);
      if (breathResult) {
        StatusManager.tick(enemy, state.messages);
        return breathResult;
      }
    }

    // Adjacent: attack
    if (distToPlayer === 1) {
      StatusManager.tick(enemy, state.messages);
      return performAttack(enemy, player);
    }

    // Backline role: try to keep distance if allies are closer
    if (enemy.role === ENEMY_ROLE.BACKLINE && distToPlayer <= 2) {
      const flee = _tryFlee(enemy, player, map, enemies);
      if (flee) {
        StatusManager.tick(enemy, state.messages);
        return null;
      }
    }

    // Chase with pathfinding
    const allowWalls = enemy.passWalls;
    const path = allowWalls
      ? findPathGhost(enemy.x, enemy.y, player.x, player.y, map, 20)
      : findPath(enemy.x, enemy.y, player.x, player.y, map, 20);

    if (path.length > 0) {
      const next = path[0];
      if (!enemies.some(e => e !== enemy && e.hp > 0 && e.x === next.x && e.y === next.y) &&
          !(next.x === player.x && next.y === player.y)) {
        enemy.x = next.x;
        enemy.y = next.y;
      }
    } else {
      const dir = randPick(CARDINAL_DIRS);
      tryMoveEnemy(enemy, enemy.x + dir.x, enemy.y + dir.y, map, enemies, player);
    }
  }

  StatusManager.tick(enemy, state.messages);
  return null;
}

// Support: boost adjacent ally evasion (bat behavior)
function _supportAlly(enemy, enemies) {
  const allies = enemies.filter(e =>
    e !== enemy && e.hp > 0 && manhattanDist(e.x, e.y, enemy.x, enemy.y) <= 1
  );
  if (allies.length > 0) {
    // Give temporary evasion boost to allies
    for (const ally of allies) {
      if (!ally._supportBoost) {
        ally._supportBoost = true;
        ally.evasion = (ally.evasion || 0) + 0.1;
      }
    }
    return true;
  }
  return false;
}

// Backline: flee from player
function _tryFlee(enemy, player, map, enemies) {
  const dx = Math.sign(enemy.x - player.x);
  const dy = Math.sign(enemy.y - player.y);
  const dirs = [{ x: dx, y: dy }, { x: dx, y: 0 }, { x: 0, y: dy }].filter(d => d.x !== 0 || d.y !== 0);
  for (const d of dirs) {
    const nx = enemy.x + d.x;
    const ny = enemy.y + d.y;
    if (tryMoveEnemy(enemy, nx, ny, map, enemies, player)) return true;
  }
  return false;
}

// Ghost pathfinding (ignores walls)
function findPathGhost(sx, sy, tx, ty, map, maxSteps) {
  const dx = Math.sign(tx - sx);
  const dy = Math.sign(ty - sy);
  const path = [];
  let x = sx, y = sy;
  for (let i = 0; i < maxSteps; i++) {
    if (x === tx && y === ty) break;
    if (x !== tx) x += dx;
    else if (y !== ty) y += dy;
    if (!inBounds(x, y)) break;
    path.push({ x, y });
  }
  return path;
}

// Dragon breath (3-tile line)
function tryBreathAttack(enemy, player, map, state) {
  const dx = Math.sign(player.x - enemy.x);
  const dy = Math.sign(player.y - enemy.y);
  if (dx !== 0 && dy !== 0) return null;
  if (dx === 0 && dy === 0) return null;

  let blocked = false;
  for (let i = 1; i <= 3; i++) {
    const tx = enemy.x + dx * i;
    const ty = enemy.y + dy * i;
    if (!inBounds(tx, ty) || map[ty][tx] === TILE.WALL) { blocked = true; break; }
  }
  if (blocked) return null;
  if (Math.random() > 0.4) return null;

  addMessage(state.messages, `${enemy.name}がブレスを吐いた！`, 'important');
  Effects.screenShake(3);
  DanmakuManager.onPlayerDamaged({ isCrit: false, damage: enemy.atk }, enemy);

  let hitPlayer = false;
  for (let i = 1; i <= 3; i++) {
    const tx = enemy.x + dx * i;
    const ty = enemy.y + dy * i;
    Effects.spawnParticles(tx, ty, '#ff4400', 4);
    if (tx === player.x && ty === player.y) {
      const damage = Math.max(1, enemy.atk - Math.floor(getPlayerDef(player) / 2));
      player.hp -= damage;
      StatusManager.apply(player, STATUS.BURN, 3);
      addMessage(state.messages, `ブレスで${damage}のダメージ＋火傷！`, 'combat');
      Effects.spawnDamageNumber(player.x, player.y, damage, false, false);
      hitPlayer = true;
    }
  }
  return hitPlayer ? { attacker: enemy.name, damage: 0, isCrit: false, killed: player.hp <= 0, missed: false, isBreath: true } : null;
}

// Boss AI (with HP-threshold phase changes)
function updateBossAI(enemy, player, map, enemies, visible, state) {
  if (enemy.state !== 'chase') return null;
  const distToPlayer = manhattanDist(enemy.x, enemy.y, player.x, player.y);

  // Update boss phase based on HP thresholds
  const hpRatio = enemy.hp / enemy.maxHp;
  const oldPhase = enemy.bossPhase || 1;
  if (hpRatio <= 0.3) enemy.bossPhase = 3;
  else if (hpRatio <= 0.6) enemy.bossPhase = 2;
  else enemy.bossPhase = 1;

  // Announce phase change with lore
  if (enemy.bossPhase !== oldPhase) {
    DanmakuManager.onBossPhase(enemy.bossType, enemy.bossPhase);
    const bossLore = typeof BOSS_LORE !== 'undefined' && enemy.bossType ? BOSS_LORE[enemy.bossType] : null;
    if (bossLore && bossLore.phase && bossLore.phase.length > 0) {
      for (const line of bossLore.phase) {
        addMessage(state.messages, line, 'important');
      }
    } else {
      addMessage(state.messages, `${enemy.name}の動きが変わった！（フェーズ${enemy.bossPhase}）`, 'important');
    }
    Effects.screenShake(4);
    Effects.spawnParticles(enemy.x, enemy.y, enemy.color, 12);
  }

  if (enemy.bossType === 'minotaur') {
    return minotaurAI(enemy, player, map, state, distToPlayer);
  }

  if (enemy.bossType === 'lich') {
    return lichAI(enemy, player, map, enemies, state, distToPlayer);
  }

  return null;
}

// Minotaur: 3 phases
function minotaurAI(enemy, player, map, state, distToPlayer) {
  const phase = enemy.bossPhase || 1;

  if (phase === 1) {
    // Phase 1: charge every 3 turns
    if (enemy.turnCount % 3 === 0 && distToPlayer <= 4 && distToPlayer > 1) {
      return minotaurCharge(enemy, player, map, state);
    }
  } else if (phase === 2) {
    // Phase 2: charge every 2 turns + wall-breaking charge
    if (enemy.turnCount % 2 === 0 && distToPlayer <= 5 && distToPlayer > 1) {
      return minotaurCharge(enemy, player, map, state, true);
    }
  } else {
    // Phase 3: range stun + charge
    if (enemy.turnCount % 3 === 0 && distToPlayer <= 3) {
      // Area stun
      addMessage(state.messages, 'ミノタウロスが地面を叩いた！範囲スタン！', 'important');
      Effects.screenShake(6);
      Effects.flashScreen('#ffff4040');
      if (distToPlayer <= 2) {
        StatusManager.apply(player, STATUS.STUN, 1);
        addMessage(state.messages, 'スタンした！', 'combat');
      }
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
    if (enemy.turnCount % 2 === 0 && distToPlayer <= 5 && distToPlayer > 1) {
      return minotaurCharge(enemy, player, map, state, true);
    }
  }
  return null;
}

function minotaurCharge(enemy, player, map, state, breakWalls) {
  const dx = Math.sign(player.x - enemy.x);
  const dy = Math.sign(player.y - enemy.y);
  if (dx !== 0 && dy !== 0) return null;

  addMessage(state.messages, 'ミノタウロスが突進してきた！', 'important');
  Effects.screenShake(5);

  let charged = false;
  for (let i = 0; i < 4; i++) {
    const nx = enemy.x + dx;
    const ny = enemy.y + dy;
    if (!inBounds(nx, ny)) break;

    // Phase 2+: break walls
    if (breakWalls && map[ny][nx] === TILE.WALL) {
      map[ny][nx] = TILE.FLOOR;
      Effects.spawnParticles(nx, ny, '#666', 6);
      addMessage(state.messages, '壁が破壊された！', 'combat');
    }

    if (!isWalkable(map[ny][nx])) break;

    if (nx === player.x && ny === player.y) {
      const damage = Math.max(1, enemy.atk * 2 - Math.floor(getPlayerDef(player) / 2));
      player.hp -= damage;
      addMessage(state.messages, `突進攻撃！${damage}のダメージ！`, 'combat');
      Effects.spawnDamageNumber(player.x, player.y, damage, false, true);
      StatusManager.apply(player, STATUS.STUN, 1);
      addMessage(state.messages, 'スタンした！', 'combat');
      charged = true;
      break;
    }
    enemy.x = nx;
    enemy.y = ny;
  }

  if (charged) {
    return { attacker: enemy.name, damage: 0, isCrit: false, killed: player.hp <= 0, missed: false, isCharge: true };
  }
  return null;
}

// Lich: 3 phases
function lichAI(enemy, player, map, enemies, state, distToPlayer) {
  const phase = enemy.bossPhase || 1;

  if (phase === 1) {
    if (enemy.turnCount % 5 === 0 && distToPlayer <= 3) {
      return lichPoisonMist(enemy, player, state);
    }
    if (enemy.turnCount % 4 === 0) {
      lichSummon(enemy, map, enemies, state);
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
  } else if (phase === 2) {
    // Phase 2: teleport + poison more frequently, summon faster
    if (enemy.turnCount % 3 === 0 && distToPlayer <= 4) {
      return lichPoisonMist(enemy, player, state);
    }
    if (enemy.turnCount % 6 === 0) {
      lichTeleport(enemy, map, enemies, state);
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
    if (enemy.turnCount % 3 === 0) {
      lichSummon(enemy, map, enemies, state);
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
  } else {
    // Phase 3: room debuff + all abilities faster
    if (enemy.turnCount % 8 === 0) {
      // Room-wide debuff
      addMessage(state.messages, 'リッチが闇の力を解放した！全体衰弱！', 'important');
      StatusManager.apply(player, STATUS.WEAKNESS, 3);
      StatusManager.apply(player, STATUS.SLOW, 2);
      Effects.flashScreen('#cc44ff60');
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
    if (enemy.turnCount % 3 === 0 && distToPlayer <= 5) {
      return lichPoisonMist(enemy, player, state);
    }
    if (enemy.turnCount % 4 === 0) {
      lichTeleport(enemy, map, enemies, state);
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
    if (enemy.turnCount % 2 === 0) {
      lichSummon(enemy, map, enemies, state);
      return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
    }
  }

  return null;
}

function lichSummon(enemy, map, enemies, state) {
  const floorTiles = getFloorTiles(map);
  const near = floorTiles.filter(t =>
    manhattanDist(t.x, t.y, enemy.x, enemy.y) <= 3 &&
    !enemies.some(e => e.hp > 0 && e.x === t.x && e.y === t.y) &&
    !(t.x === state.player.x && t.y === state.player.y)
  );
  if (near.length === 0) return;
  const pos = randPick(near);
  const skeletonDef = ENEMY_DEFS.find(d => d.name === 'スケルトン');
  if (!skeletonDef) return;
  const skeleton = createEnemy(pos.x, pos.y, skeletonDef);
  skeleton.state = 'chase';
  skeleton.lastSeenX = state.player.x;
  skeleton.lastSeenY = state.player.y;
  enemies.push(skeleton);
  addMessage(state.messages, 'リッチがスケルトンを召喚した！', 'important');
  Effects.spawnParticles(pos.x, pos.y, '#cc44ff', 8);
}

function lichPoisonMist(enemy, player, state) {
  addMessage(state.messages, 'リッチが毒霧を放った！', 'important');
  StatusManager.apply(player, STATUS.POISON, 5);
  Effects.flashScreen('#40aa4060');
  Effects.spawnParticles(enemy.x, enemy.y, '#40aa40', 12);
  return { attacker: enemy.name, damage: 0, isCrit: false, killed: false, missed: false, isBreath: true };
}

function lichTeleport(enemy, map, enemies, state) {
  const floorTiles = getFloorTiles(map);
  const safe = floorTiles.filter(t =>
    !enemies.some(e => e.hp > 0 && e.x === t.x && e.y === t.y) &&
    !(t.x === state.player.x && t.y === state.player.y) &&
    manhattanDist(t.x, t.y, enemy.x, enemy.y) > 5
  );
  if (safe.length === 0) return;
  Effects.spawnParticles(enemy.x, enemy.y, '#cc44ff', 8);
  const dest = randPick(safe);
  enemy.x = dest.x;
  enemy.y = dest.y;
  Effects.spawnParticles(enemy.x, enemy.y, '#cc44ff', 8);
  addMessage(state.messages, 'リッチがテレポートした！', 'info');
}

function tryMoveEnemy(enemy, nx, ny, map, enemies, player) {
  if (!inBounds(nx, ny)) return false;
  if (enemy.passWalls) {
    if (map[ny][nx] === TILE.VOID) return false;
  } else {
    if (!isWalkable(map[ny][nx])) return false;
  }
  if (nx === player.x && ny === player.y) return false;
  if (enemies.some(e => e !== enemy && e.hp > 0 && e.x === nx && e.y === ny)) return false;
  enemy.x = nx;
  enemy.y = ny;
  return true;
}
