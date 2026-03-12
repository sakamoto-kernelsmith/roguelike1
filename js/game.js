// =============================================================================
// Game - Main Game Loop & State Management
// =============================================================================

const Game = {
  state: null,
  running: false,

  init() {
    UI.init();
    Renderer.init();
    UI.showTitle();

    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('retry-btn').addEventListener('click', () => this.start());

    Input.init((action) => this.handleAction(action));
  },

  start() {
    this.state = {
      floor: 1,
      map: null,
      rooms: null,
      player: null,
      enemies: [],
      items: [],
      visible: new Set(),
      explored: null,
      messages: [],
      gameOver: false,
    };

    this.generateFloor(1);
    UI.showGame();
    this.running = true;

    addMessage(this.state.messages, 'ダンジョンの入り口に立っている。深淵へと進め。', 'important');
    this.updateView();
  },

  generateFloor(floor) {
    const { map, rooms, startPos } = generateDungeon(floor);

    this.state.floor = floor;
    this.state.map = map;
    this.state.rooms = rooms;
    this.state.explored = createExplored();

    if (floor === 1) {
      this.state.player = createPlayer(startPos.x, startPos.y);
    } else {
      this.state.player.x = startPos.x;
      this.state.player.y = startPos.y;
    }

    this.state.enemies = spawnEnemies(map, rooms, floor, startPos);
    this.state.items = spawnItems(map, rooms, floor, startPos);

    addMessage(this.state.messages, `--- Floor ${floor} ---`, 'system');
  },

  updateView() {
    const { player, map, explored } = this.state;

    // Compute FOV
    this.state.visible = computeFOV(player.x, player.y, FOV_RADIUS, map);

    // Mark explored tiles
    for (const key of this.state.visible) {
      const [x, y] = key.split(',').map(Number);
      if (inBounds(x, y)) explored[y][x] = true;
    }

    Renderer.render(this.state);
    UI.update(this.state);
  },

  handleAction(action) {
    if (!this.running || this.state.gameOver) return;

    let playerActed = false;

    switch (action.type) {
      case 'move':
        playerActed = this.handleMove(action.dx, action.dy);
        break;
      case 'wait':
        playerActed = true;
        this.state.player.turnCount++;
        break;
      case 'use_item':
        playerActed = this.handleUseItem(action.slot);
        break;
      case 'descend':
        playerActed = this.handleDescend();
        break;
    }

    if (playerActed) {
      // Pick up items on the ground
      pickupItem(this.state.player, this.state.items, this.state.messages);

      // Enemy turns
      this.processEnemyTurns();

      // Check player death
      if (this.state.player.hp <= 0) {
        this.gameOver();
        return;
      }

      this.updateView();
    }
  },

  handleMove(dx, dy) {
    const { player, map, enemies, messages } = this.state;
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!inBounds(nx, ny)) return false;

    // Attack enemy if present
    const enemy = enemies.find(e => e.hp > 0 && e.x === nx && e.y === ny);
    if (enemy) {
      processPlayerAttack(player, enemy, messages);
      player.turnCount++;
      return true;
    }

    // Move if walkable
    if (isWalkable(map[ny][nx])) {
      player.x = nx;
      player.y = ny;
      player.turnCount++;
      return true;
    }

    return false;
  },

  handleUseItem(slot) {
    const { player, messages, explored } = this.state;
    const result = useItem(player, slot, messages);
    if (result === 'reveal_map') {
      // Reveal entire map
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          explored[y][x] = true;
        }
      }
      player.turnCount++;
      return true;
    }
    if (result) {
      player.turnCount++;
      return true;
    }
    return false;
  },

  handleDescend() {
    const { player, map, floor, messages } = this.state;
    const tile = map[player.y][player.x];

    if (tile === TILE.STAIRS_DOWN) {
      if (floor >= MAX_FLOOR) {
        // Victory!
        this.victory();
        return false;
      }
      addMessage(messages, `階段を降りた。`, 'info');
      this.generateFloor(floor + 1);
      this.updateView();
      return false; // Don't process enemy turns
    }

    addMessage(messages, `ここに階段はない。`, 'system');
    return false;
  },

  processEnemyTurns() {
    const { enemies, player, map, visible, messages } = this.state;
    const aliveEnemies = enemies.filter(e => e.hp > 0);

    for (const enemy of aliveEnemies) {
      const result = updateEnemy(enemy, player, map, aliveEnemies, visible);
      if (result) {
        processEnemyAttack(result, messages);
        if (player.hp <= 0) return;
      }
    }
  },

  gameOver() {
    this.state.gameOver = true;
    this.running = false;
    addMessage(this.state.messages, '力尽きた...', 'important');
    this.updateView();
    UI.showGameOver(this.state.player, this.state.floor);
  },

  victory() {
    this.state.gameOver = true;
    this.running = false;
    addMessage(this.state.messages, 'ダンジョンを制覇した！', 'important');
    this.updateView();
    UI.showVictory(this.state.player);
  },
};

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
