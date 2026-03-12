// =============================================================================
// Field of View - Recursive Shadowcasting
// =============================================================================

function computeFOV(cx, cy, radius, map) {
  const visible = new Set();
  visible.add(`${cx},${cy}`);

  for (let octant = 0; octant < 8; octant++) {
    castLight(cx, cy, radius, 1, 1.0, 0.0, octant, map, visible);
  }

  return visible;
}

function castLight(cx, cy, radius, row, startSlope, endSlope, octant, map, visible) {
  if (startSlope < endSlope) return;

  let nextStart = startSlope;

  for (let j = row; j <= radius; j++) {
    let blocked = false;

    for (let dx = -j; dx <= 0; dx++) {
      const dy = -j;

      const leftSlope = (dx - 0.5) / (dy + 0.5);
      const rightSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) break;

      const { x: mx, y: my } = transformOctant(cx, cy, dx, dy, octant);

      if (!inBounds(mx, my)) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq <= radius * radius) {
        visible.add(`${mx},${my}`);
      }

      if (blocked) {
        if (map[my][mx] === TILE.WALL || map[my][mx] === TILE.VOID) {
          nextStart = rightSlope;
          continue;
        } else {
          blocked = false;
          startSlope = nextStart;
        }
      } else {
        if (map[my][mx] === TILE.WALL || map[my][mx] === TILE.VOID) {
          if (distSq <= radius * radius) {
            blocked = true;
            castLight(cx, cy, radius, j + 1, startSlope, leftSlope, octant, map, visible);
            nextStart = rightSlope;
          }
        }
      }
    }

    if (blocked) break;
  }
}

function transformOctant(cx, cy, dx, dy, octant) {
  switch (octant) {
    case 0: return { x: cx + dx, y: cy + dy };
    case 1: return { x: cx + dy, y: cy + dx };
    case 2: return { x: cx - dy, y: cy + dx };
    case 3: return { x: cx - dx, y: cy + dy };
    case 4: return { x: cx - dx, y: cy - dy };
    case 5: return { x: cx - dy, y: cy - dx };
    case 6: return { x: cx + dy, y: cy - dx };
    case 7: return { x: cx + dx, y: cy - dy };
  }
}

// Create explored map (remembers tiles player has seen)
function createExplored() {
  const explored = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    explored[y] = new Array(MAP_WIDTH).fill(false);
  }
  return explored;
}
