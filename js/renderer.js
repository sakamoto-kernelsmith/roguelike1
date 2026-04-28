// =============================================================================
// Renderer - Canvas-based tile rendering (with Mutations, Events, Prefixes)
// =============================================================================

const SPRITE_COLS = 8;
const SPRITE_ROWS = 7;

// [col, row] positions in sprites.png
const SPRITE_MAP = {
  // Terrain (row 0)
  tile_floor:        [0, 0],
  tile_wall:         [1, 0],
  tile_corridor:     [2, 0],
  tile_door:         [3, 0],
  tile_stairs_down:  [4, 0],
  tile_stairs_up:    [5, 0],
  // Player (row 1)
  player:            [0, 1],
  // Enemies (rows 2-3)
  slime:             [0, 2],
  bat:               [1, 2],
  rat:               [2, 2],
  goblin:            [3, 2],
  skeleton:          [4, 2],
  orc:               [5, 2],
  lizardman:         [6, 2],
  ghost:             [7, 2],
  troll:             [0, 3],
  dragon:            [1, 3],
  minotaur:          [2, 3],
  lich:              [3, 3],
  // Items by loreKey (rows 4-5)
  heal_potion:       [0, 4],
  big_heal_potion:   [1, 4],
  scroll_map:        [2, 4],
  poison_scroll:     [3, 4],
  weapon_dagger:     [4, 4],
  weapon_longsword:  [5, 4],
  weapon_greatsword: [6, 4],
  weapon_flame:      [7, 4],
  weapon_vampiric:   [0, 5],
  weapon_magic:      [1, 5],
  armor_leather:     [2, 5],
  armor_chain:       [2, 5],
  armor_plate:       [2, 5],
  armor_evasion:     [2, 5],
  armor_counter:     [2, 5],
  armor_stealth:     [2, 5],
  armor_magic:       [2, 5],
  food_bread:        [3, 5],
  food_meat:         [3, 5],
  food_feast:        [3, 5],
  magic_stone:       [4, 5],
  magic_crystal:     [4, 5],
  // Objects (row 6)
  chest:             [1, 6],
  trap_spike:        [2, 6],
  trap_poison_gas:   [3, 6],
  trap_teleport:     [4, 6],
  trap_pit:          [4, 6],
  trap_alarm:        [4, 6],
  altar:             [5, 6],
  fountain:          [6, 6],
  merchant:          [7, 6],
  wounded_merchant:  [7, 6],
};

const TILE_SPRITE_KEY = {
  [1]: 'tile_floor',
  [2]: 'tile_wall',
  [3]: 'tile_corridor',
  [4]: 'tile_door',
  [5]: 'tile_stairs_down',
  [6]: 'tile_stairs_up',
};

const Renderer = {
  canvas: null,
  ctx: null,
  minimapCanvas: null,
  minimapCtx: null,
  tileSize: 40,
  font: null,
  viewCols: 0,
  viewRows: 0,
  spriteSheet: null,
  spriteSheet2: null,
  spriteLoaded: false,
  spriteLoaded2: false,
  spriteSW: 0,
  spriteSH: 0,
  animTime: 0,
  animFPS: 4,
  _lastState: null,
  _prevTimestamp: 0,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.resize();
    this.font = `${this.tileSize}px "Courier New", "MS Gothic", monospace`;
    this.loadSprites();
    this.startAnimLoop();
  },

  setGameState(state) {
    this._lastState = state;
  },

  startAnimLoop() {
    const loop = (timestamp) => {
      requestAnimationFrame(loop);
      if (!this._lastState) {
        this._prevTimestamp = timestamp;
        return;
      }
      const delta = Math.min(timestamp - this._prevTimestamp, 50);
      this._prevTimestamp = timestamp;
      this.animTime += delta / 1000;
      this.render(this._lastState);
    };
    requestAnimationFrame(loop);
  },

  loadSprites() {
    const img = new Image();
    img.onload = () => {
      this.spriteSheet = img;
      this.spriteSW = img.width / SPRITE_COLS;
      this.spriteSH = img.height / SPRITE_ROWS;
      this.spriteLoaded = true;
    };
    img.src = 'sprites.png';

    const img2 = new Image();
    img2.onload = () => {
      this.spriteSheet2 = img2;
      this.spriteLoaded2 = true;
    };
    img2.src = 'sprites2.png';
  },

  resize() {
    const totalW = 960;
    const totalH = 680;
    const sidebarW = 180;
    const headerH = 32;
    const logH = 120;

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

  drawSprite(ctx, col, row, px, py, alpha, dy = 0, animPhase = -1) {
    if (!this.spriteLoaded) return false;
    let sheet = this.spriteSheet;
    if (animPhase >= 0 && this.spriteLoaded2) {
      const frame = Math.floor(this.animTime * this.animFPS + animPhase) % 2;
      if (frame === 1) sheet = this.spriteSheet2;
    }
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(
      sheet,
      col * this.spriteSW, row * this.spriteSH, this.spriteSW, this.spriteSH,
      px, py + dy, this.tileSize, this.tileSize
    );
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = 1;
    return true;
  },

  drawSpriteByKey(ctx, key, px, py, alpha, dy = 0, animPhase = -1) {
    const pos = SPRITE_MAP[key];
    if (!pos) return false;
    return this.drawSprite(ctx, pos[0], pos[1], px, py, alpha, dy, animPhase);
  },

  render(state) {
    const { map, player, enemies, items, visible, explored, traps, chests, merchant, roomEvents, mutation, poisonZones, rooms } = state;
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
        if (tile === 0) continue; // VOID stays black

        const px = vx * ts;
        const py = vy * ts;
        const alpha = isVisible ? 1 : 0.3;
        const spriteKey = TILE_SPRITE_KEY[tile];

        if (spriteKey && this.spriteLoaded) {
          this.drawSpriteByKey(ctx, spriteKey, px, py, alpha);
        } else {
          const [ch, fg, bg] = TILE_DISPLAY[tile] || TILE_DISPLAY[0];
          ctx.fillStyle = isVisible ? bg : this.darken(bg, 0.4);
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = isVisible ? fg : this.darken(fg, 0.4);
          ctx.fillText(ch, px + ts / 2, py + 2);
        }

        // Poison fog overlay
        if (isVisible && mutation === MUTATION.POISON_FOG && poisonZones && rooms) {
          if (MutationManager.isInPoisonZone(mx, my, rooms, poisonZones)) {
            ctx.fillStyle = 'rgba(64, 170, 64, 0.15)';
            ctx.fillRect(px, py, ts, ts);
          }
        }
      }
    }

    // Tutorial highlights
    if (typeof TutorialManager !== 'undefined' && TutorialManager.active) {
      const pulse = 0.25 + 0.2 * Math.sin(Date.now() / 300);
      const highlights = TutorialManager.getHighlightPositions();
      for (const pos of highlights) {
        const sx = (pos.x - offsetX) * ts;
        const sy = (pos.y - offsetY) * ts;
        if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
        ctx.fillStyle = `rgba(0, 200, 255, ${pulse})`;
        ctx.fillRect(sx, sy, ts, ts);
      }
      const dangerTiles = TutorialManager.getDangerZoneTiles();
      for (const pos of dangerTiles) {
        if (!visible.has(`${pos.x},${pos.y}`)) continue;
        const sx = (pos.x - offsetX) * ts;
        const sy = (pos.y - offsetY) * ts;
        if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
        const dPulse = 0.15 + 0.1 * Math.sin(Date.now() / 400);
        ctx.fillStyle = `rgba(220, 40, 40, ${dPulse})`;
        ctx.fillRect(sx, sy, ts, ts);
      }
    }

    // Draw traps
    if (traps) {
      for (const trap of traps) {
        if (trap.triggered) continue;
        if (!trap.detected) continue;
        if (!visible.has(`${trap.x},${trap.y}`)) continue;
        const sx = (trap.x - offsetX) * ts;
        const sy = (trap.y - offsetY) * ts;
        if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
        if (!this.drawSpriteByKey(ctx, `trap_${trap.type}`, sx, sy)) {
          ctx.fillStyle = '#111';
          ctx.fillRect(sx, sy, ts, ts);
          ctx.fillStyle = trap.color;
          ctx.fillText(trap.ch, sx + ts / 2, sy + 2);
        }
      }
    }

    // Draw room events
    if (roomEvents) {
      for (const evt of roomEvents) {
        if (evt.used) continue;
        if (!visible.has(`${evt.x},${evt.y}`)) continue;
        const sx = (evt.x - offsetX) * ts;
        const sy = (evt.y - offsetY) * ts;
        if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
        if (!this.drawSpriteByKey(ctx, evt.type, sx, sy)) {
          ctx.fillStyle = '#111';
          ctx.fillRect(sx, sy, ts, ts);
          ctx.fillStyle = evt.color;
          ctx.fillText(evt.ch, sx + ts / 2, sy + 2);
        }
      }
    }

    // Draw chests
    if (chests) {
      for (const chest of chests) {
        if (!visible.has(`${chest.x},${chest.y}`)) continue;
        const sx = (chest.x - offsetX) * ts;
        const sy = (chest.y - offsetY) * ts;
        if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
        if (!this.drawSpriteByKey(ctx, 'chest', sx, sy)) {
          ctx.fillStyle = '#111';
          ctx.fillRect(sx, sy, ts, ts);
          ctx.fillStyle = chest.color;
          ctx.fillText(chest.ch, sx + ts / 2, sy + 2);
        }
      }
    }

    // Draw items
    for (const item of items) {
      if (!visible.has(`${item.x},${item.y}`)) continue;
      const sx = (item.x - offsetX) * ts;
      const sy = (item.y - offsetY) * ts;
      if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;
      if (!this.drawSpriteByKey(ctx, item.loreKey, sx, sy) &&
          !this.drawSpriteByKey(ctx, item.type, sx, sy)) {
        ctx.fillStyle = '#111';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = RARITY_COLORS[item.rarity] || item.color;
        ctx.fillText(item.ch, sx + ts / 2, sy + 2);
      }
    }

    // Draw merchant
    if (merchant && visible.has(`${merchant.x},${merchant.y}`)) {
      const sx = (merchant.x - offsetX) * ts;
      const sy = (merchant.y - offsetY) * ts;
      if (!this.drawSpriteByKey(ctx, 'merchant', sx, sy)) {
        ctx.fillStyle = '#111';
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = merchant.color;
        ctx.fillText(merchant.ch, sx + ts / 2, sy + 2);
      }
    }

    // Draw enemies
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (!visible.has(`${enemy.x},${enemy.y}`)) continue;
      const sx = (enemy.x - offsetX) * ts;
      const sy = (enemy.y - offsetY) * ts;
      if (sx < 0 || sy < 0 || sx >= this.canvas.width || sy >= this.canvas.height) continue;

      const phase = enemy.x * 1.3 + enemy.y * 0.7;
      const bobAmp = enemy.isBoss ? 3 : 2;
      const bobDy = Math.round(Math.sin(this.animTime * 2.0 + phase) * bobAmp);
      const isGhost = enemy.id === 'ghost';
      const drawAlpha = isGhost ? 0.45 + 0.45 * Math.abs(Math.sin(this.animTime * 2.5 + phase)) : 1;

      if (drawAlpha !== 1) ctx.globalAlpha = drawAlpha;
      const enemyKey = enemy.bossType || enemy.id;
      if (!this.drawSpriteByKey(ctx, enemyKey, sx, sy, undefined, bobDy, phase)) {
        ctx.fillStyle = '#111';
        ctx.fillRect(sx, sy + bobDy, ts, ts);
        ctx.fillStyle = enemy.color;
        ctx.fillText(enemy.ch, sx + ts / 2, sy + bobDy + 2);
      }
      if (drawAlpha !== 1) ctx.globalAlpha = 1;

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const barW = ts - 2;
        const ratio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#400';
        ctx.fillRect(sx + 1, sy + ts - 3, barW, 2);
        ctx.fillStyle = ratio > 0.5 ? '#0a0' : (ratio > 0.25 ? '#aa0' : '#a00');
        ctx.fillRect(sx + 1, sy + ts - 3, barW * ratio, 2);
      }

      // Status effect icons
      const icons = StatusManager.getDisplayIcons(enemy);
      if (icons.length > 0) {
        ctx.font = '8px monospace';
        for (let i = 0; i < icons.length; i++) {
          ctx.fillStyle = icons[i].color;
          ctx.fillText(icons[i].ch, sx + 4 + i * 8, sy - 2);
        }
        ctx.font = this.font;
      }

      // Prefix indicator
      if (enemy.prefix) {
        ctx.font = '7px monospace';
        ctx.fillStyle = enemy.prefix.color;
        ctx.fillText(enemy.prefix.name[0], sx + ts - 4, sy - 2);
        ctx.font = this.font;
      }

      if (enemy.isBoss) {
        this.renderBossBar(ctx, enemy);
      }
    }

    // Draw player
    {
      const sx = (player.x - offsetX) * ts;
      const sy = (player.y - offsetY) * ts;
      const playerBobDy = Math.round(Math.sin(this.animTime * 1.5) * 2);
      if (!this.drawSpriteByKey(ctx, 'player', sx, sy, undefined, playerBobDy, 0)) {
        ctx.fillStyle = '#222';
        ctx.fillRect(sx, sy + playerBobDy, ts, ts);
        ctx.fillStyle = player.color;
        ctx.font = `bold ${this.font}`;
        ctx.fillText(player.ch, sx + ts / 2, sy + playerBobDy + 2);
        ctx.font = this.font;
      }

      const pIcons = StatusManager.getDisplayIcons(player);
      if (pIcons.length > 0) {
        ctx.font = '9px monospace';
        for (let i = 0; i < pIcons.length; i++) {
          ctx.fillStyle = pIcons[i].color;
          ctx.fillText(pIcons[i].ch, sx + 4 + i * 10, sy - 4);
        }
        ctx.font = this.font;
      }
    }

    this.renderMinimap(state);
  },

  renderBossBar(ctx, boss) {
    const barW = 300;
    const barH = 12;
    const bx = (this.canvas.width - barW) / 2;
    const by = 8;
    const ratio = Math.max(0, boss.hp / boss.maxHp);

    ctx.fillStyle = '#000a';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 20);

    ctx.fillStyle = '#400';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#c03030' : (ratio > 0.25 ? '#cc6600' : '#cc0000');
    ctx.fillRect(bx, by, barW * ratio, barH);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(bx, by, barW, barH);

    const phase = boss.bossPhase || 1;
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}  ${boss.hp}/${boss.maxHp}  Phase ${phase}`, bx + barW / 2, by + barH + 10);
    ctx.font = this.font;
    ctx.textBaseline = 'top';
  },

  renderMinimap(state) {
    const { map, player, explored, visible, enemies, merchant, roomEvents } = state;
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
        if (tile === 0 || tile === 2) continue; // VOID or WALL
        const isVis = visible.has(`${x},${y}`);
        if (tile === 5) {
          ctx.fillStyle = isVis ? '#00ccff' : '#004466';
        } else {
          ctx.fillStyle = isVis ? '#334' : '#1a1a22';
        }
        ctx.fillRect(x * tileW, y * tileH, tileW + 0.5, tileH + 0.5);
      }
    }

    for (const enemy of enemies) {
      if (enemy.hp <= 0 || !visible.has(`${enemy.x},${enemy.y}`)) continue;
      ctx.fillStyle = enemy.isBoss ? '#ff4444' : (enemy.prefix ? enemy.prefix.color : '#e04040');
      ctx.fillRect(enemy.x * tileW, enemy.y * tileH, tileW + 1, tileH + 1);
    }

    if (merchant && visible.has(`${merchant.x},${merchant.y}`)) {
      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(merchant.x * tileW, merchant.y * tileH, tileW + 1, tileH + 1);
    }

    if (roomEvents) {
      for (const evt of roomEvents) {
        if (evt.used) continue;
        if (!visible.has(`${evt.x},${evt.y}`)) continue;
        ctx.fillStyle = evt.color;
        ctx.fillRect(evt.x * tileW, evt.y * tileH, tileW + 1, tileH + 1);
      }
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x * tileW - 0.5, player.y * tileH - 0.5, tileW + 1, tileH + 1);
  },

  darken(color, factor) {
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
