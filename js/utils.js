// =============================================================================
// Utility Functions
// =============================================================================

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= (item.weight || 1);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function manhattanDist(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function inBounds(x, y) {
  return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Simple A* pathfinding
function findPath(sx, sy, tx, ty, map, maxSteps = 30) {
  if (sx === tx && sy === ty) return [];

  const key = (x, y) => `${x},${y}`;
  const open = [{ x: sx, y: sy, g: 0, h: manhattanDist(sx, sy, tx, ty), parent: null }];
  const closed = new Set();
  const gMap = new Map();
  gMap.set(key(sx, sy), 0);

  while (open.length > 0) {
    open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
    const current = open.shift();

    if (current.x === tx && current.y === ty) {
      const path = [];
      let node = current;
      while (node.parent) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    const ck = key(current.x, current.y);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (closed.size > maxSteps * 4) return [];

    for (const dir of CARDINAL_DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nk = key(nx, ny);

      if (!inBounds(nx, ny) || closed.has(nk)) continue;
      const tile = map[ny][nx];
      if (tile === TILE.WALL || tile === TILE.VOID) continue;

      const ng = current.g + 1;
      if (gMap.has(nk) && gMap.get(nk) <= ng) continue;

      gMap.set(nk, ng);
      open.push({ x: nx, y: ny, g: ng, h: manhattanDist(nx, ny, tx, ty), parent: current });
    }
  }

  return [];
}
