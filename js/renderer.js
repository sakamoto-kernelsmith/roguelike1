// =============================================================================
// Renderer - Canvas-based tile rendering
// =============================================================================

const Renderer = {
  canvas: null,
  ctx: null,
  minimapCanvas: null,
  minimapCtx: null,
  tileSize: 20,
  font: null,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.resize();
    this.font = `${this.tileSize}px "Courier New", "MS Gothic", monospace`;
  },

  resize() {
    const container = this.canvas.parentElement;
    const headerH = 32;
    const logH = 120;
    const sidebarW = 180;
    const totalW = 960;
    const totalH = 680;

    const canvasW = totalW - sidebarW - 2;
    const canvasH = totalH - headerH - logH - 2;

    this.canvas.width = canvasW;
    this.canvas.height = canvasH;

    this.viewCols = Math.floor(canvasW / this.tileSize);
    this.viewRows = Math.floor(canvasH / this.tileSize);
  },

  getViewOffset(player) {
    const offsetX = clamp(
      player.x - Math.floor(this.viewCols / 2),
      0,
      Math.max(0, MAP_WIDTH - this.viewCols)
    );
    const offsetY = clamp(
      player.y - Math.floor(this.viewRows / 2),
      0,
      Math.max(0, MAP_HEIGHT - this.viewRows)
    );
    return { offsetX, offsetY };
  },

  render(state) {
    const { map, player, enemies, items, visible, explored } = state;
    const ctx = this.ctx;
    const ts = this.tileSize;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = this.font;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    const { offsetX, offsetY } = this.getViewOffset(player);

    // Draw tiles
    for (let vy = 0; vy < this.viewRows; vy++) {
      for (let vx = 0; vx < this.viewCols; vx++) {
        const mx = vx + offsetX;
        const my = vy + offsetY;

        if (!inBounds(mx, my)) continue;

        const key = `${mx},${my}`;
        const isVisible = visible.has(key);
        const isExplored = explored[my][mx];

        if (!isVisible && !isExplored) continue;

        const tile = map[my][mx];
        const [ch, fg, bg] = TILE_DISPLAY[tile] || TILE_DISPLAY[TILE.VOID];

        const px = vx * ts;
        const py = vy * ts;

        // Background
        if (isVisible) {
          ctx.fillStyle = bg;
        } else {
          // Explored but not visible - darker
          ctx.fillStyle = this.darken(bg, 0.4);
        }
        ctx.fillRect(px, py, ts, ts);

        // Foreground character
        if (isVisible) {
          ctx.fillStyle = fg;
        } else {
          ctx.fillStyle = this.darken(fg, 0.4);
        }
        ctx.fillText(ch, px + ts / 2, py + 2);
      }
    }

    // Draw items (only visible ones)
    for (const item of items) {
      if (!visible.has(`${item.x},${item.y}`)) continue;
      const sx = (item.x - offsetX) * ts;
      const sy = (item.y - offsetY) * ts;
      if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;

      ctx.fillStyle = '#111';
      ctx.fillRect(sx, sy, ts, ts);
      ctx.fillStyle = item.color;
      ctx.fillText(item.ch, sx + ts / 2, sy + 2);
    }

    // Draw enemies (only visible ones)
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (!visible.has(`${enemy.x},${enemy.y}`)) continue;
      const sx = (enemy.x - offsetX) * ts;
      const sy = (enemy.y - offsetY) * ts;
      if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;

      ctx.fillStyle = '#111';
      ctx.fillRect(sx, sy, ts, ts);
      ctx.fillStyle = enemy.color;
      ctx.fillText(enemy.ch, sx + ts / 2, sy + 2);

      // HP bar for damaged enemies
      if (enemy.hp < enemy.maxHp) {
        const barW = ts - 2;
        const ratio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#400';
        ctx.fillRect(sx + 1, sy + ts - 3, barW, 2);
        ctx.fillStyle = ratio > 0.5 ? '#0a0' : (ratio > 0.25 ? '#aa0' : '#a00');
        ctx.fillRect(sx + 1, sy + ts - 3, barW * ratio, 2);
      }
    }

    // Draw player
    {
      const sx = (player.x - offsetX) * ts;
      const sy = (player.y - offsetY) * ts;
      ctx.fillStyle = '#222';
      ctx.fillRect(sx, sy, ts, ts);
      ctx.fillStyle = player.color;
      ctx.font = `bold ${this.font}`;
      ctx.fillText(player.ch, sx + ts / 2, sy + 2);
      ctx.font = this.font;
    }

    this.renderMinimap(state);
  },

  renderMinimap(state) {
    const { map, player, explored, visible } = state;
    const ctx = this.minimapCtx;
    const cw = this.minimapCanvas.width;
    const ch = this.minimapCanvas.height;
    const tileW = cw / MAP_WIDTH;
    const tileH = ch / MAP_HEIGHT;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (!explored[y][x]) continue;
        const tile = map[y][x];
        if (tile === TILE.WALL || tile === TILE.VOID) continue;

        const isVis = visible.has(`${x},${y}`);
        if (tile === TILE.STAIRS_DOWN) {
          ctx.fillStyle = isVis ? '#00ccff' : '#004466';
        } else {
          ctx.fillStyle = isVis ? '#334' : '#1a1a22';
        }
        ctx.fillRect(x * tileW, y * tileH, tileW + 0.5, tileH + 0.5);
      }
    }

    // Player dot
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x * tileW - 0.5, player.y * tileH - 0.5, tileW + 1, tileH + 1);
  },

  darken(color, factor) {
    // Parse hex color and darken
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
      r = Math.floor(r * factor);
      g = Math.floor(g * factor);
      b = Math.floor(b * factor);
      return `rgb(${r},${g},${b})`;
    }
    return color;
  },
};
