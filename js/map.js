// =============================================================================
// Dungeon Map Generation (with Mutations & Room Events)
// =============================================================================

function createMap() {
  const map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = new Array(MAP_WIDTH).fill(TILE.WALL);
  }
  return map;
}

function generateDungeon(floor, mutation) {
  const map = createMap();
  const rooms = [];
  const isBossFloor = BOSS_DEFS[floor] !== undefined;
  const mods = mutation ? MutationManager.getSpawnModifiers(mutation) : {};

  // Try to place rooms
  for (let attempt = 0; attempt < DUNGEON.ROOM_ATTEMPTS && rooms.length < DUNGEON.MAX_ROOMS; attempt++) {
    const w = randInt(DUNGEON.MIN_ROOM_SIZE, DUNGEON.MAX_ROOM_SIZE);
    const h = randInt(DUNGEON.MIN_ROOM_SIZE, DUNGEON.MAX_ROOM_SIZE);
    const x = randInt(1, MAP_WIDTH - w - 1);
    const y = randInt(1, MAP_HEIGHT - h - 1);

    const newRoom = { x, y, w, h };

    let overlaps = false;
    for (const room of rooms) {
      if (
        newRoom.x - 1 < room.x + room.w &&
        newRoom.x + newRoom.w + 1 > room.x &&
        newRoom.y - 1 < room.y + room.h &&
        newRoom.y + newRoom.h + 1 > room.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      carveRoom(map, newRoom);
      rooms.push(newRoom);
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);
    carveCorridor(map, a.x, a.y, b.x, b.y);
  }

  // Boss room
  let bossRoom = null;
  if (isBossFloor && rooms.length >= 2) {
    const bossDef = BOSS_DEFS[floor];
    const size = bossDef.roomSize || 11;
    for (let attempt = 0; attempt < 30; attempt++) {
      const bx = randInt(1, MAP_WIDTH - size - 1);
      const by = randInt(1, MAP_HEIGHT - size - 1);
      const candidate = { x: bx, y: by, w: size, h: size };
      let ok = true;
      for (let ri = 0; ri < rooms.length - 1; ri++) {
        const room = rooms[ri];
        if (candidate.x - 1 < room.x + room.w && candidate.x + candidate.w + 1 > room.x &&
            candidate.y - 1 < room.y + room.h && candidate.y + candidate.h + 1 > room.y) {
          ok = false; break;
        }
      }
      if (ok && bx + size < MAP_WIDTH - 1 && by + size < MAP_HEIGHT - 1) {
        bossRoom = candidate;
        carveRoom(map, bossRoom);
        rooms[rooms.length - 1] = bossRoom;
        const prevCenter = roomCenter(rooms[rooms.length - 2]);
        const bossCenter = roomCenter(bossRoom);
        carveCorridor(map, prevCenter.x, prevCenter.y, bossCenter.x, bossCenter.y);
        break;
      }
    }
  }

  // Place stairs
  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length - 1];
  const startPos = roomCenter(startRoom);
  const endPos = roomCenter(endRoom);

  if (floor < MAX_FLOOR && !isBossFloor) {
    map[endPos.y][endPos.x] = TILE.STAIRS_DOWN;
  }

  if (floor > 1) {
    map[startPos.y][startPos.x] = TILE.STAIRS_UP;
  }

  // Hidden rooms
  const hiddenDoors = [];
  if (Math.random() < 0.3 && rooms.length >= 3) {
    const hr = generateHiddenRoom(map, rooms);
    if (hr) {
      hiddenDoors.push(...hr.doors);
      rooms.push(hr.room);
    }
  }

  // Chests
  const chests = [];
  if (hiddenDoors.length > 0) {
    const hRoom = rooms[rooms.length - 1];
    const hCenter = roomCenter(hRoom);
    chests.push(createChest(hCenter.x, hCenter.y, floor));
  }
  // Chest rate - mutation bonus
  const chestChance = mutation === MUTATION.TRAP_FLOOR || mutation === MUTATION.TREASURE ? 0.3 : 0.15;
  for (let i = 1; i < rooms.length - (hiddenDoors.length > 0 ? 1 : 0); i++) {
    if (Math.random() < chestChance) {
      const rc = roomCenter(rooms[i]);
      if (map[rc.y][rc.x] === TILE.FLOOR) {
        chests.push(createChest(rc.x + randInt(-1, 1), rc.y + randInt(-1, 1), floor));
      }
    }
  }

  // Merchant (higher chance on floors 2-3 to guarantee early economy exposure)
  let merchant = null;
  const merchantChance = (floor >= 2 && floor <= 3) ? Math.max(MERCHANT_CHANCE, 0.5) : MERCHANT_CHANCE;
  if (!isBossFloor && Math.random() < merchantChance && rooms.length >= 3) {
    const mRoom = rooms[randInt(1, rooms.length - 2)];
    const mPos = roomCenter(mRoom);
    const mx = mPos.x + randInt(-1, 1);
    const my = mPos.y + randInt(-1, 1);
    if (inBounds(mx, my) && isWalkable(map[my][mx])) {
      merchant = createMerchant(mx, my, floor);
    }
  }

  // Room events
  const roomEvents = RoomEventManager.placeEvents(rooms, floor, isBossFloor);

  // Poison zones for POISON_FOG mutation
  const poisonZones = (mutation === MUTATION.POISON_FOG) ? MutationManager.createPoisonZones(rooms) : [];

  return { map, rooms, startPos, endPos, hiddenDoors, chests, merchant, isBossFloor, bossRoom, roomEvents, poisonZones };
}

function generateHiddenRoom(map, rooms) {
  const sourceIdx = randInt(1, rooms.length - 1);
  const source = rooms[sourceIdx];

  const size = randInt(3, 5);
  const sides = shuffle(['north', 'south', 'east', 'west']);

  for (const side of sides) {
    let hx, hy;
    switch (side) {
      case 'north': hx = source.x + randInt(0, Math.max(0, source.w - size)); hy = source.y - size - 1; break;
      case 'south': hx = source.x + randInt(0, Math.max(0, source.w - size)); hy = source.y + source.h + 1; break;
      case 'west':  hx = source.x - size - 1; hy = source.y + randInt(0, Math.max(0, source.h - size)); break;
      case 'east':  hx = source.x + source.w + 1; hy = source.y + randInt(0, Math.max(0, source.h - size)); break;
    }

    if (hx < 1 || hy < 1 || hx + size >= MAP_WIDTH - 1 || hy + size >= MAP_HEIGHT - 1) continue;

    const candidate = { x: hx, y: hy, w: size, h: size };
    let overlap = false;
    for (const room of rooms) {
      if (candidate.x - 1 < room.x + room.w && candidate.x + candidate.w + 1 > room.x &&
          candidate.y - 1 < room.y + room.h && candidate.y + candidate.h + 1 > room.y) {
        overlap = true; break;
      }
    }
    if (overlap) continue;

    carveRoom(map, candidate);

    const doors = [];
    let dx, dy;
    switch (side) {
      case 'north': dx = hx + Math.floor(size / 2); dy = source.y - 1; break;
      case 'south': dx = hx + Math.floor(size / 2); dy = source.y + source.h; break;
      case 'west':  dx = source.x - 1; dy = hy + Math.floor(size / 2); break;
      case 'east':  dx = source.x + source.w; dy = hy + Math.floor(size / 2); break;
    }

    if (inBounds(dx, dy)) {
      map[dy][dx] = TILE.WALL;
      doors.push({ x: dx, y: dy });
    }

    return { room: candidate, doors };
  }
  return null;
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y][x] = TILE.FLOOR;
    }
  }
}

function roomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveCorridor(map, x1, y1, x2, y2) {
  let x = x1;
  let y = y1;

  if (Math.random() < 0.5) {
    while (x !== x2) {
      if (inBounds(x, y)) map[y][x] = map[y][x] === TILE.FLOOR ? TILE.FLOOR : TILE.CORRIDOR;
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      if (inBounds(x, y)) map[y][x] = map[y][x] === TILE.FLOOR ? TILE.FLOOR : TILE.CORRIDOR;
      y += y < y2 ? 1 : -1;
    }
  } else {
    while (y !== y2) {
      if (inBounds(x, y)) map[y][x] = map[y][x] === TILE.FLOOR ? TILE.FLOOR : TILE.CORRIDOR;
      y += y < y2 ? 1 : -1;
    }
    while (x !== x2) {
      if (inBounds(x, y)) map[y][x] = map[y][x] === TILE.FLOOR ? TILE.FLOOR : TILE.CORRIDOR;
      x += x < x2 ? 1 : -1;
    }
  }
  if (inBounds(x, y)) map[y][x] = map[y][x] === TILE.FLOOR ? TILE.FLOOR : TILE.CORRIDOR;
}

function isWalkable(tile) {
  return tile === TILE.FLOOR || tile === TILE.CORRIDOR || tile === TILE.DOOR ||
         tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP;
}

function getFloorTiles(map) {
  const tiles = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (isWalkable(map[y][x])) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}
