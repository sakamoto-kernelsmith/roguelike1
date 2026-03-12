// =============================================================================
// Dungeon Map Generation (BSP-inspired rooms + corridors)
// =============================================================================

function createMap() {
  const map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = new Array(MAP_WIDTH).fill(TILE.WALL);
  }
  return map;
}

function generateDungeon(floor) {
  const map = createMap();
  const rooms = [];

  // Try to place rooms
  for (let attempt = 0; attempt < DUNGEON.ROOM_ATTEMPTS && rooms.length < DUNGEON.MAX_ROOMS; attempt++) {
    const w = randInt(DUNGEON.MIN_ROOM_SIZE, DUNGEON.MAX_ROOM_SIZE);
    const h = randInt(DUNGEON.MIN_ROOM_SIZE, DUNGEON.MAX_ROOM_SIZE);
    const x = randInt(1, MAP_WIDTH - w - 1);
    const y = randInt(1, MAP_HEIGHT - h - 1);

    const newRoom = { x, y, w, h };

    // Check overlap with existing rooms (with 1-tile padding)
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

  // Place stairs
  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length - 1];
  const startPos = roomCenter(startRoom);
  const endPos = roomCenter(endRoom);

  // Stairs down (always present unless max floor)
  if (floor < MAX_FLOOR) {
    map[endPos.y][endPos.x] = TILE.STAIRS_DOWN;
  }

  // Stairs up (for returning, shown from floor 2)
  if (floor > 1) {
    map[startPos.y][startPos.x] = TILE.STAIRS_UP;
  }

  return { map, rooms, startPos, endPos };
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

  // Randomly choose horizontal-first or vertical-first
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
