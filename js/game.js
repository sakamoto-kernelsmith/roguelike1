// =============================================================================
// Game - Main Game Loop & State Management (Full Integration)
// =============================================================================

const Game = {
  state: null,
  running: false,

  init() {
    UI.init();
    Renderer.init();
    Effects.init();
    Sound.init();
    SkillManager.init();
    DanmakuManager.init();
    UI.showTitle();

    document.getElementById('start-btn').addEventListener('click', () => { Sound.resume(); this.start(); });
    document.getElementById('retry-btn').addEventListener('click', () => { Sound.resume(); this.start(); });

    // Tutorial buttons
    document.getElementById('tutorial-btn').addEventListener('click', () => {
      Sound.resume();
      // If intro not completed, start from first incomplete intro chapter
      if (!TutorialManager.isIntroCompleted()) {
        const introIds = TutorialData.getIntroChapterIds();
        const progress = TutorialManager.loadAllProgress();
        const nextId = introIds.find(id => !progress[id]) || introIds[0];
        this.startTutorial(nextId);
      } else {
        UI.showTrainingSelect();
      }
    });

    document.getElementById('training-btn').addEventListener('click', () => {
      Sound.resume();
      UI.showTrainingSelect();
    });

    document.getElementById('training-back-btn').addEventListener('click', () => {
      document.getElementById('training-select-screen').classList.add('hidden');
      UI.showTitle();
    });

    Input.init((action) => this.handleAction(action));
  },

  start() {
    Sound.stopBGM();
    Music.start();
    SkillManager.init();
    QuestManager.reset();
    TutorialManager.reset();
    EventManager.reset();
    DanmakuManager.init();

    this.state = {
      floor: 1,
      map: null,
      rooms: null,
      player: null,
      enemies: [],
      items: [],
      traps: [],
      chests: [],
      merchant: null,
      hiddenDoors: [],
      visible: new Set(),
      explored: null,
      messages: [],
      gameOver: false,
      mode: 'play',
      isBossFloor: false,
      bossDefeated: false,
      transitioning: false,
      mutation: MUTATION.NONE,
      roomEvents: [],
      poisonZones: [],
    };

    this.generateFloor(1);
    UI.showGame();
    this.running = true;

    // World lore opening messages
    for (const line of WORLD_INTRO.openingLog) {
      addMessage(this.state.messages, line, 'important');
    }
    this.updateView();
  },

  startTutorial(chapterId) {
    Sound.stopBGM();
    Music.stop();
    TutorialManager.reset();

    if (!TutorialManager.startChapter(chapterId)) {
      addMessage([], 'チュートリアルの読み込みに失敗しました。', 'system');
      UI.showTitle();
      return;
    }

    // Suppress skills in intro chapters
    const chapter = TutorialManager.chapter;
    if (chapter.suppressSkills) {
      SkillManager.skills = [];
    } else {
      SkillManager.init();
    }

    QuestManager.reset();

    this.state = {
      floor: 1,
      map: null,
      rooms: null,
      player: null,
      enemies: [],
      items: [],
      traps: [],
      chests: [],
      merchant: null,
      hiddenDoors: [],
      visible: new Set(),
      explored: null,
      messages: [],
      gameOver: false,
      mode: 'play',
      isBossFloor: false,
      bossDefeated: false,
      transitioning: false,
      mutation: MUTATION.NONE,
      roomEvents: [],
      poisonZones: [],
    };

    // Load fixed map
    TutorialManager.loadChapterMap(this.state);

    UI.showGame();
    this.running = true;
    this.updateView();
  },

  backToTitle() {
    this.running = false;
    TutorialManager.reset();
    Sound.stopBGM();
    Music.stop();
    UI.showTitle();
  },

  generateFloor(floor) {
    // Roll mutation
    const isBossFloor = BOSS_DEFS[floor] !== undefined;
    const mutation = MutationManager.roll(floor, isBossFloor);
    const mods = MutationManager.getSpawnModifiers(mutation);

    const result = generateDungeon(floor, mutation);
    const { map, rooms, startPos, endPos, hiddenDoors, chests, merchant, bossRoom, roomEvents, poisonZones } = result;

    this.state.floor = floor;
    this.state.map = map;
    this.state.rooms = rooms;
    this.state.explored = createExplored();
    this.state.hiddenDoors = hiddenDoors || [];
    this.state._discoveredTypes = {};
    this.state.chests = chests || [];
    this.state.merchant = merchant;
    this.state.isBossFloor = isBossFloor;
    this.state.bossDefeated = false;
    this.state.mode = 'play';
    this.state.mutation = mutation;
    this.state.roomEvents = roomEvents || [];
    this.state.poisonZones = poisonZones || [];

    // Reset per-floor player hints
    if (this.state.player) {
      this.state.player._noStairsCount = 0;
      this.state.player._lastRoomIdx = -1;
    }

    if (floor === 1) {
      this.state.player = createPlayer(startPos.x, startPos.y);
    } else {
      this.state.player.x = startPos.x;
      this.state.player.y = startPos.y;
    }

    this.state.enemies = spawnEnemies(map, rooms, floor, startPos, isBossFloor, mutation);

    // Spawn items (with mutation multiplier)
    this.state.items = spawnItems(map, rooms, floor, startPos);
    if (mods.itemCountMult && mods.itemCountMult > 1) {
      const extra = spawnItems(map, rooms, floor, startPos);
      const extraCount = Math.floor(extra.length * (mods.itemCountMult - 1));
      for (let i = 0; i < extraCount && i < extra.length; i++) {
        this.state.items.push(extra[i]);
      }
    }

    // Extra food for famine mutation
    if (mods.foodCountMult && mods.foodCountMult > 1) {
      const foodDefs = ITEM_DEFS.filter(d => d.type === ITEM_TYPE.FOOD && d.minFloor <= floor);
      const floorTiles = getFloorTiles(map);
      for (let i = 0; i < DUNGEON.FOOD_PER_FLOOR; i++) {
        if (floorTiles.length > 0 && foodDefs.length > 0) {
          const pos = randPick(floorTiles);
          this.state.items.push(createItem(pos.x, pos.y, randPick(foodDefs), RARITY.COMMON));
        }
      }
    }

    // Traps (with mutation multiplier)
    this.state.traps = TrapManager.spawnTraps(map, rooms, floor, startPos);
    if (mods.trapCountMult && mods.trapCountMult > 1) {
      const extraTraps = TrapManager.spawnTraps(map, rooms, floor, startPos);
      const extraCount = Math.floor(extraTraps.length * (mods.trapCountMult - 1));
      for (let i = 0; i < extraCount && i < extraTraps.length; i++) {
        this.state.traps.push(extraTraps[i]);
      }
    }

    // Spawn boss
    if (isBossFloor) {
      const bossCenter = roomCenter(bossRoom || rooms[rooms.length - 1]);
      const boss = createBoss(bossCenter.x, bossCenter.y, floor);
      if (boss) {
        this.state.enemies.push(boss);
      }
    }

    // Legacy ghost
    const ghost = LegacyManager.trySpawnGhost(floor, map, this.state.enemies, startPos);
    if (ghost) {
      this.state.enemies.push(ghost);
    }

    // Quest reset on new floor
    QuestManager.reset();

    // Floor name and flavor
    const floorLore = FLOOR_LORE[floor];
    if (floorLore) {
      addMessage(this.state.messages, `--- Floor ${floor}: ${floorLore.name} ---`, 'system');
      addMessage(this.state.messages, floorLore.flavor, 'info');
    } else {
      addMessage(this.state.messages, `--- Floor ${floor} ---`, 'system');
    }

    // Mutation announcement
    const announcement = MutationManager.getAnnouncement(mutation);
    if (announcement) {
      addMessage(this.state.messages, `[${announcement.name}] ${announcement.desc}`, 'important');
    }

    if (isBossFloor) {
      const bossDef = BOSS_DEFS[floor];
      const bossLore = bossDef && BOSS_LORE[bossDef.bossType];
      if (bossLore) {
        for (const line of bossLore.intro) {
          addMessage(this.state.messages, line, 'important');
        }
      } else {
        addMessage(this.state.messages, '強大な気配を感じる...', 'important');
      }
    }
    if (merchant) {
      const encounterLine = randPick(MERCHANT_ENCOUNTER_LOG);
      addMessage(this.state.messages, encounterLine, 'info');
    }
    if (roomEvents && roomEvents.length > 0) {
      addMessage(this.state.messages, '特別な場所の気配がする...', 'info');
    }
    if (ghost) {
      addMessage(this.state.messages, '過去の冒険者の影がさまよっている...', 'info');
    }

    // Danmaku: floor entry + mutation
    DanmakuManager.onEnterFloor(floor);
    if (mutation !== MUTATION.NONE) {
      setTimeout(() => DanmakuManager.onMutation(mutation), 2000);
    }

    // Narrative events
    EventManager.trigger('on_floor_start', {}, this.state);
    if (isBossFloor) {
      EventManager.trigger('on_boss_warning_floor', {}, this.state);
    }
  },

  updateView() {
    const { player, map, explored } = this.state;

    this.state.visible = computeFOV(player.x, player.y, FOV_RADIUS, map);

    for (const key of this.state.visible) {
      const [x, y] = key.split(',').map(Number);
      if (inBounds(x, y)) explored[y][x] = true;
    }

    // Check if enemy first seen (discovery lines)
    for (const enemy of this.state.enemies) {
      if (enemy.hp > 0 && this.state.visible.has(`${enemy.x},${enemy.y}`)) {
        if (!enemy._announced) {
          enemy._announced = true;
          if (enemy.isBoss) {
            const lore = ENEMY_LORE[enemy.bossType || enemy.id];
            if (lore && lore.discoverLines) {
              addMessage(this.state.messages, randPick(lore.discoverLines), 'important');
            } else {
              addMessage(this.state.messages, `${enemy.name}が現れた！`, 'important');
            }
            Effects.screenShake(5);
            Music.fadeToVolume(0, 1.5);
            Sound.startBossBGM();
          } else {
            // Only show discover message for the first of each enemy type per floor
            if (!this.state._discoveredTypes) this.state._discoveredTypes = {};
            if (!this.state._discoveredTypes[enemy.id]) {
              this.state._discoveredTypes[enemy.id] = true;
              const lore = ENEMY_LORE[enemy.id];
              if (lore && lore.discoverLines) {
                addMessage(this.state.messages, randPick(lore.discoverLines), 'info');
              }
            }
          }
        }
      }
    }

    // Danmaku: check visible enemies, stairs, merchant, room events
    for (const enemy of this.state.enemies) {
      if (enemy.hp > 0 && this.state.visible.has(`${enemy.x},${enemy.y}`)) {
        DanmakuManager.onSeeEnemy(enemy);
      }
    }
    // Check stairs visibility
    for (const key of this.state.visible) {
      const [sx, sy] = key.split(',').map(Number);
      if (inBounds(sx, sy) && this.state.map[sy][sx] === TILE.STAIRS_DOWN) {
        DanmakuManager.onSeeStairs();
        break;
      }
    }
    // Check merchant visibility
    if (this.state.merchant && this.state.visible.has(`${this.state.merchant.x},${this.state.merchant.y}`)) {
      DanmakuManager.onSeeMerchant();
    }
    // Check room events visibility
    if (this.state.roomEvents) {
      for (const evt of this.state.roomEvents) {
        if (!evt.used && this.state.visible.has(`${evt.x},${evt.y}`)) {
          DanmakuManager.onSeeRoomEvent(evt.type);
        }
      }
    }
    // Check item visibility (food, potions, etc.)
    for (const item of this.state.items) {
      if (this.state.visible.has(`${item.x},${item.y}`)) {
        DanmakuManager.onSeeItem(item);
      }
    }

    Renderer.render(this.state);
    UI.update(this.state);
  },

  handleAction(action) {
    if (!this.running || this.state.gameOver || this.state.transitioning) return;

    if (this.state.mode === 'shop') {
      this.handleShopAction(action);
      return;
    }

    // Drop mode: Q was pressed, waiting for number key
    if (this.state.mode === 'drop_select') {
      if (action.type === 'use_item') {
        this.handleDropItem(action.slot);
      } else {
        this.state.mode = 'play';
        addMessage(this.state.messages, 'キャンセル。', 'system');
        this.updateView();
      }
      return;
    }

    let playerActed = false;

    switch (action.type) {
      case 'move':
        playerActed = this.handleMove(action.dx, action.dy);
        break;
      case 'wait':
        playerActed = true;
        this.state.player.turnCount++;
        TutorialManager.handleEvent(this.state, 'player_waited', {});
        break;
      case 'use_item':
        playerActed = this.handleUseItem(action.slot);
        break;
      case 'drop_mode':
        this.state.mode = 'drop_select';
        addMessage(this.state.messages, 'どのアイテムを捨てる？(1-9で選択、他キーでキャンセル)', 'system');
        this.updateView();
        return;
      case 'descend':
        playerActed = this.handleDescend();
        break;
      case 'skill':
        // Check tutorial skill restriction
        if (TutorialManager.active && !TutorialManager.isSkillAllowed(action.key)) {
          addMessage(this.state.messages, TutorialManager.getSkillBlockMessage(), 'system');
          this.updateView();
          return;
        }
        playerActed = this.handleSkill(action.key);
        if (playerActed) {
          TutorialManager.handleEvent(this.state, 'used_skill', { key: action.key });
        }
        break;
      case 'search':
        playerActed = this.handleSearch();
        break;
      case 'cast_magic':
        playerActed = this.handleCastMagic();
        break;
      case 'hint':
        // Re-display tutorial hint
        if (TutorialManager.active) {
          const hint = TutorialManager.getCurrentHint();
          const obj = TutorialManager.getObjectiveText();
          if (hint) addMessage(this.state.messages, hint, 'system');
          if (obj) addMessage(this.state.messages, `目標: ${obj}`, 'system');
          this.updateView();
        }
        return;
      case 'escape':
        break;
    }

    if (playerActed) {
      this.postPlayerAction();
    }
  },

  postPlayerAction() {
    const { player, items, messages, traps, chests, enemies } = this.state;
    const isTutorial = TutorialManager.active;

    // Pick up items (tutorial: also notify equip)
    const weaponBefore = player.weapon;
    const armorBefore = player.armor;
    pickupItem(player, items, messages);
    if (isTutorial && (player.weapon !== weaponBefore || player.armor !== armorBefore)) {
      TutorialManager.handleEvent(this.state, 'equipped_item', {});
    }

    if (!isTutorial) {
      // Check chests
      const chestIdx = chests.findIndex(c => c.x === player.x && c.y === player.y);
      if (chestIdx !== -1) {
        openChest(chests[chestIdx], player, this.state);
        chests.splice(chestIdx, 1);
        NoiseManager.propagate(player.x, player.y, NoiseManager.getActionNoise('chest', player), enemies, player, messages);
        EventManager.trigger('on_open_chest', {}, this.state);
      }

      // Check room events
      for (const evt of this.state.roomEvents) {
        if (!evt.used && evt.x === player.x && evt.y === player.y) {
          const result = RoomEventManager.interact(evt, player, this.state);
          if (result && evt.type === ROOM_EVENT.GHOST_REMAINS) {
            EventManager.trigger('on_interact_remains', {}, this.state);
          }
        }
      }

      // Narrative event: room entry
      const roomIdx = this._getPlayerRoomIndex();
      if (roomIdx !== -1 && roomIdx !== player._lastRoomIdx) {
        player._lastRoomIdx = roomIdx;
        DanmakuManager.onEnterRoom(roomIdx, this.state);
        EventManager.trigger('on_enter_room', { roomIndex: roomIdx }, this.state);

        // "No stairs here" hint on shallow floors
        if (this.state.floor <= 3) {
          const room = this.state.rooms[roomIdx];
          const noStairsCount = player._noStairsCount || 0;
          if (room && noStairsCount < 3) {
            let hasStairs = false;
            for (let ry = room.y; ry < room.y + room.h; ry++) {
              for (let rx = room.x; rx < room.x + room.w; rx++) {
                if (this.state.map[ry][rx] === TILE.STAIRS_DOWN) hasStairs = true;
              }
            }
            if (!hasStairs) {
              const noStairsLines = [
                'この部屋にも階段は見当たらない。先へ進もう。',
                '階段はない。別の部屋を探すしかない。',
                'ここにも降り口はない...もっと奥か。',
              ];
              addMessage(messages, noStairsLines[noStairsCount] || noStairsLines[0], 'info');
              player._noStairsCount = noStairsCount + 1;
            }
          }
        }
      }

      // Long corridor detection
      if (this.state.map[player.y][player.x] === TILE.CORRIDOR && !player._inCorridor) {
        const len = this._measureCorridor(player.x, player.y);
        if (len >= 6) {
          player._inCorridor = true;
          // Check if enemies are in this corridor
          const hasEnemy = enemies.some(e =>
            e.hp > 0 && this.state.map[e.y] && this.state.map[e.y][e.x] === TILE.CORRIDOR &&
            manhattanDist(player.x, player.y, e.x, e.y) <= len
          );
          const lines = hasEnemy
            ? [
              '長い回廊だ。こんな狭い場所で敵に出くわしたら逃げ場がない。',
              '細い通路が続いている。ここで囲まれたら避けようがない。',
              '見通しの悪い長い廊下。背後にも気を配れ。',
            ]
            : [
              '長い回廊が続いている。足音が反響する。',
              '狭い通路が暗闇の奥へ伸びている。',
              '天井が低い長い廊下だ。壁に松明の焦げ跡が残っている。',
            ];
          addMessage(messages, randPick(lines), 'info');
        }
      } else if (this.state.map[player.y][player.x] !== TILE.CORRIDOR) {
        player._inCorridor = false;
      }

      // Check traps
      for (const trap of traps) {
        if (!trap.triggered && trap.x === player.x && trap.y === player.y) {
          const result = TrapManager.trigger(trap, player, this.state);
          NoiseManager.propagate(player.x, player.y, NoiseManager.getActionNoise(trap.type === TRAP_TYPE.ALARM ? 'alarm' : 'trap', player), enemies, player, messages);
          if (result === 'pit_fall' && this.state.floor < MAX_FLOOR) {
            this.descendFloor();
            return;
          }
        }
      }

      // Poison fog: damage if in poison zone
      if (this.state.mutation === MUTATION.POISON_FOG && this.state.poisonZones.length > 0) {
        if (MutationManager.isInPoisonZone(player.x, player.y, this.state.rooms, this.state.poisonZones)) {
          if (!StatusManager.has(player, STATUS.POISON)) {
            StatusManager.apply(player, STATUS.POISON, 3);
            addMessage(messages, '毒霧を吸い込んだ！', 'combat');
            Effects.flashScreen('#40aa4040');
          }
        }
      }

      // Check merchant adjacency
      if (this.state.merchant) {
        const m = this.state.merchant;
        if (manhattanDist(player.x, player.y, m.x, m.y) <= 1 &&
            this.state.mode !== 'shop') {
          // Don't auto-enter shop
        }
      }
    }

    // Early guidance: show objective after ~10 steps on floor 1
    if (!isTutorial && this.state.floor === 1 && player.turnCount === 10 && !player._objectiveShown) {
      player._objectiveShown = true;
      addMessage(messages, '目標: 階段を見つけて下の階へ降りること。まずは部屋を探索しよう。', 'system');
      addMessage(messages, '通路の先に新しい部屋がある。階段は「>」の印だ。', 'system');
    }

    // Enemy turns
    this.processEnemyTurns();

    if (player.hp <= 0) {
      this.gameOver();
      return;
    }

    // Status effect ticks
    StatusManager.tick(player, messages);
    if (player.hp <= 0) {
      this.gameOver();
      return;
    }

    // Hunger (with mutation multiplier) - skip in tutorial
    if (!isTutorial) {
      const hungerMult = this.state.mutation === MUTATION.FAMINE ? 2.0 : 1.0;
      tickHunger(player, messages, hungerMult);
      if (player.hp <= 0) {
        this.gameOver();
        return;
      }
    }

    // Skill cooldowns (with haste bonus)
    SkillManager.tickCooldowns(player);

    if (!isTutorial) {
      // Blink evasion boost decay
      if (player._blinkEvasionTurns) {
        player._blinkEvasionTurns--;
        if (player._blinkEvasionTurns <= 0) {
          delete player._blinkEvasionTurns;
        }
      }

      // Kill streak reset (if no kill this turn)
      if (player.lastKillTurn !== player.turnCount) {
        player.killStreak = 0;
      }

      // Check quest progress
      if (QuestManager.checkProgress(this.state)) {
        addMessage(messages, 'クエスト達成条件を満たした！商人に話しかけよう。', 'important');
      }

      // Check boss death
      this.checkBossDeath();
    }

    this.updateView();
  },

  handleMove(dx, dy) {
    const { player, map, enemies, messages } = this.state;
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!inBounds(nx, ny)) return false;

    player.lastDx = dx;
    player.lastDy = dy;

    // Bump into merchant = enter shop
    if (this.state.merchant && this.state.merchant.x === nx && this.state.merchant.y === ny) {
      this.state.mode = 'shop';
      // Generate quest if none active
      if (!QuestManager.activeQuest) {
        const quest = QuestManager.generate(this.state.merchant, this.state.floor, this.state);
        if (quest) {
          addMessage(messages, `商人のクエスト: ${quest.desc} (報酬: ${quest.reward.gold}G)`, 'important');
        }
      } else if (QuestManager.activeQuest && !QuestManager.activeQuest.completed) {
        // Check if quest can be completed when talking to merchant
        // Reset notified flag so checkProgress works
        QuestManager.activeQuest.notified = false;
        if (QuestManager.checkProgress(this.state)) {
          QuestManager.complete(player, messages);
        }
      }
      EventManager.trigger('on_meet_merchant', { merchant: this.state.merchant }, this.state);
      UI.showShopUI(this.state.merchant, player, messages);
      this.updateView();
      return false;
    }

    // Attack enemy if present
    const enemy = enemies.find(e => e.hp > 0 && e.x === nx && e.y === ny);
    if (enemy) {
      processPlayerAttack(player, enemy, messages);
      player.turnCount++;
      if (enemy.hp <= 0) {
        player.lastKillTurn = player.turnCount;
        TutorialManager.handleEvent(this.state, 'enemy_killed', { id: enemy.id });
      }
      return true;
    }

    // Move if walkable
    if (isWalkable(map[ny][nx])) {
      // Record adjacent enemies before moving (for opportunity attacks)
      const adjacentBefore = enemies.filter(e =>
        e.hp > 0 && manhattanDist(player.x, player.y, e.x, e.y) === 1
      );

      player.x = nx;
      player.y = ny;
      player.turnCount++;

      // Opportunity attacks from enemies we moved away from
      for (const e of adjacentBefore) {
        if (e.hp <= 0) continue;
        const newDist = manhattanDist(player.x, player.y, e.x, e.y);
        if (newDist <= 1) continue; // Didn't move away from this enemy
        const pursuitChance = e.pursuit || 0;
        if (pursuitChance <= 0 || Math.random() >= pursuitChance) continue;

        // Reduced damage opportunity attack
        const mult = e.pursuitMult || 0.5;
        const rawDmg = Math.max(1, e.atk - Math.floor(getPlayerDef(player) / 2));
        const dmg = Math.max(1, Math.floor(rawDmg * mult));
        player.hp -= dmg;

        // Pursuit-specific message
        const lore = ENEMY_LORE[e.bossType || e.id];
        if (lore && lore.pursuitLines) {
          addMessage(messages, `${randPick(lore.pursuitLines)} ${dmg}のダメージ！`, 'combat');
        } else {
          addMessage(messages, `${e.name}が背後から攻撃した！ ${dmg}のダメージ！`, 'combat');
        }
        Effects.spawnDamageNumber(player.x, player.y, dmg, false, false);
        Effects.screenShake(1);
        Sound.play('hit');

        if (player.hp <= 0) break;
      }

      // Small noise on move
      NoiseManager.propagate(player.x, player.y, NoiseManager.getActionNoise('move', player), enemies, player, messages);
      TutorialManager.handleEvent(this.state, 'player_moved', { x: nx, y: ny });
      return true;
    }

    return false;
  },

  handleUseItem(slot) {
    const { player, messages, explored, enemies, visible } = this.state;

    // Track what item is being used for tutorial events
    const itemBefore = player.inventory[slot];
    const weaponBefore = player.weapon;
    const armorBefore = player.armor;
    const levelBefore = player.level;

    const result = useItem(player, slot, messages);
    if (result === 'reveal_map') {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          explored[y][x] = true;
        }
      }
      for (const trap of this.state.traps) {
        trap.detected = true;
      }
      player.turnCount++;
      TutorialManager.handleEvent(this.state, 'used_item', { item: itemBefore });
      return true;
    }
    if (result === 'poison_scroll') {
      for (const enemy of enemies) {
        if (enemy.hp > 0 && visible.has(`${enemy.x},${enemy.y}`)) {
          StatusManager.apply(enemy, STATUS.POISON, 5);
          Effects.spawnParticles(enemy.x, enemy.y, '#40dd40', 4);
        }
      }
      player.turnCount++;
      TutorialManager.handleEvent(this.state, 'used_item', { item: itemBefore });
      return true;
    }
    if (result) {
      player.turnCount++;
      // Check if equipment changed
      if (player.weapon !== weaponBefore || player.armor !== armorBefore) {
        TutorialManager.handleEvent(this.state, 'equipped_item', {});
      }
      TutorialManager.handleEvent(this.state, 'used_item', { item: itemBefore });
      // Check level up
      if (player.level > levelBefore) {
        TutorialManager.handleEvent(this.state, 'player_level_up', {});
      }
      return true;
    }
    return false;
  },

  handleDropItem(slot) {
    const { player, messages } = this.state;
    this.state.mode = 'play';
    if (slot < 0 || slot >= player.inventory.length) {
      addMessage(messages, 'そのスロットにはアイテムがない。', 'system');
      this.updateView();
      return;
    }
    const item = player.inventory[slot];
    const name = getItemDisplayName ? getItemDisplayName(item) : item.name;
    player.inventory.splice(slot, 1);
    addMessage(messages, `${name}を捨てた。`, 'item');
    this.updateView();
  },

  handleSkill(key) {
    const skill = SkillManager.getSkillByKey(key);
    if (!skill) return false;
    const acted = SkillManager.execute(skill.id, this.state.player, this.state);
    if (acted) {
      this.state.player.turnCount++;
      NoiseManager.propagate(this.state.player.x, this.state.player.y, NoiseManager.getActionNoise('skill', this.state.player), this.state.enemies, this.state.player, this.state.messages);
    }
    return acted;
  },

  handleCastMagic() {
    const { player, map, enemies, messages } = this.state;
    const magicDef = MAGIC_LEVEL_TABLE[player.magicLevel - 1];

    if (player.magicStones < magicDef.cost) {
      addMessage(messages, `魔法石が足りない！(必要: ${magicDef.cost}個, 所持: ${player.magicStones}個)`, 'system');
      this.updateView();
      return false;
    }

    player.magicStones -= magicDef.cost;

    // Trace path in last move direction
    const path = [];
    let hitEnemy = null;
    for (let i = 1; i <= magicDef.range; i++) {
      const tx = player.x + player.lastDx * i;
      const ty = player.y + player.lastDy * i;
      if (!inBounds(tx, ty) || map[ty][tx] === TILE.WALL) break;
      path.push({ x: tx, y: ty });
      const enemy = enemies.find(e => e.hp > 0 && e.x === tx && e.y === ty);
      if (enemy) { hitEnemy = enemy; break; }
    }

    Effects.spawnProjectile(path, '#ff8833');
    Effects.flashScreen('#ff440030');
    Sound.play('skill');

    if (hitEnemy) {
      const dmg = magicDef.damage;
      hitEnemy.hp -= dmg;
      addMessage(messages, `${magicDef.name}が${hitEnemy.name}に命中！(${dmg}ダメージ)`, 'combat');
      Effects.spawnDamageNumber(hitEnemy.x, hitEnemy.y, dmg, false, false);
      Effects.screenShake(2);

      if (hitEnemy.hp <= 0) {
        addMessage(messages, `${hitEnemy.name}を倒した！ (EXP+${hitEnemy.exp})`, 'combat');
        player.killCount++;
        player.gold += (hitEnemy.gold || 0);
        if (hitEnemy.gold) addMessage(messages, `${hitEnemy.gold}Gを手に入れた。`, 'item');
        player.killStreak = (player.killStreak || 0) + 1;
        QuestManager.notifyKill(hitEnemy.name);
        TutorialManager.handleEvent(this.state, 'enemy_killed', { id: hitEnemy.id });
        const leveledUp = addExp(player, hitEnemy.exp);
        if (leveledUp) {
          addMessage(messages, `--- レベルアップ！ Lv.${player.level} ---`, 'level');
          Sound.play('levelup');
        }
      }
    } else {
      const dest = path.length > 0 ? '' : '（壁に阻まれた）';
      addMessage(messages, `${magicDef.name}！${dest}(石${magicDef.cost}消費)`, 'combat');
    }

    player.turnCount++;
    return true;
  },

  handleSearch() {
    const { player, map, messages, hiddenDoors } = this.state;
    addMessage(messages, '周囲を調べた...', 'system');
    let found = false;

    // Check hidden doors
    for (const dir of ALL_DIRS) {
      const nx = player.x + dir.x;
      const ny = player.y + dir.y;
      if (!inBounds(nx, ny)) continue;

      const doorIdx = hiddenDoors.findIndex(d => d.x === nx && d.y === ny);
      if (doorIdx !== -1) {
        map[ny][nx] = TILE.DOOR;
        hiddenDoors.splice(doorIdx, 1);
        addMessage(messages, '隠し通路を発見した！', 'important');
        Effects.spawnParticles(nx, ny, '#ffcc44', 8);
        Sound.play('chest');
        found = true;
      }
    }

    // Detect adjacent traps
    for (const trap of this.state.traps) {
      if (trap.detected || trap.triggered) continue;
      if (manhattanDist(player.x, player.y, trap.x, trap.y) <= 5) {
        trap.detected = true;
        addMessage(messages, `${trap.name}を発見した！`, 'info');
        found = true;
      }
    }

    // Check room events nearby
    for (const evt of this.state.roomEvents) {
      if (!evt.used && manhattanDist(player.x, player.y, evt.x, evt.y) <= 2) {
        addMessage(messages, `近くに${evt.name}がある！(踏むと発動)`, 'info');
        found = true;
      }
    }

    if (!found) {
      addMessage(messages, '何も見つからなかった。', 'system');
    }

    EventManager.trigger('on_search_wall', { found }, this.state);

    this.state.player.turnCount++;
    return true;
  },

  handleDescend() {
    const { player, map, floor, messages } = this.state;
    const tile = map[player.y][player.x];

    if (tile === TILE.STAIRS_DOWN) {
      // Tutorial stair check
      if (!TutorialManager.canDescend(this.state)) {
        this.updateView();
        return false;
      }

      // Tutorial stairs event
      const wasTutorialActive = TutorialManager.active;
      TutorialManager.handleEvent(this.state, 'used_stairs', { x: player.x, y: player.y });

      // If tutorial was handling stairs (chapter complete or still in tutorial), don't descend normally
      if (wasTutorialActive) {
        this.updateView();
        return false;
      }

      if (floor >= MAX_FLOOR) {
        this.victory();
        return false;
      }
      this.descendFloor();
      return false;
    }

    addMessage(messages, 'ここに階段はない。', 'system');
    return false;
  },

  descendFloor() {
    const nextFloor = this.state.floor + 1;
    this.state.transitioning = true;
    Sound.play('stairs');
    Sound.stopBGM();
    Music.regenerate();

    Effects.startFloorTransition(nextFloor, () => {
      this.generateFloor(nextFloor);
      this.updateView();
      setTimeout(() => {
        this.state.transitioning = false;
      }, 600);
    });
  },

  handleShopAction(action) {
    const { player, messages, merchant } = this.state;
    if (!merchant) { this.state.mode = 'play'; return; }

    // Sell mode: Q pressed in shop, waiting for number
    if (this.state._shopSellMode) {
      this.state._shopSellMode = false;
      if (action.type === 'use_item') {
        const slot = action.slot;
        if (slot >= 0 && slot < player.inventory.length) {
          const item = player.inventory[slot];
          const sellPrice = Math.floor((item.price || 10) / 2);
          const name = getItemDisplayName ? getItemDisplayName(item) : item.name;
          player.inventory.splice(slot, 1);
          player.gold += sellPrice;
          addMessage(messages, `${name}を売った。(+${sellPrice}G)`, 'item');
          Sound.play('buy');
        } else {
          addMessage(messages, 'そのスロットにはアイテムがない。', 'system');
        }
      } else {
        addMessage(messages, 'キャンセル。', 'system');
      }
      UI.showShopUI(merchant, player, messages);
      this.updateView();
      return;
    }

    // Enter sell mode
    if (action.type === 'drop_mode') {
      if (player.inventory.length === 0) {
        addMessage(messages, '売るアイテムがない。', 'system');
      } else {
        this.state._shopSellMode = true;
        addMessage(messages, '--- 売却 ---', 'system');
        player.inventory.forEach((item, i) => {
          const name = getItemDisplayName ? getItemDisplayName(item) : item.name;
          const sellPrice = Math.floor((item.price || 10) / 2);
          addMessage(messages, `[${i + 1}] ${name} → ${sellPrice}G`, 'item');
        });
        addMessage(messages, '番号キーで売却、他のキーでキャンセル', 'system');
      }
      this.updateView();
      return;
    }

    // Buy items
    if (action.type === 'use_item') {
      const shopIdx = action.slot;
      if (shopIdx >= 0 && shopIdx < merchant.shopItems.length) {
        const si = merchant.shopItems[shopIdx];
        if (player.gold >= si.price) {
          if (player.inventory.length >= MAX_INVENTORY) {
            addMessage(messages, '持ち物がいっぱいだ！', 'item');
          } else {
            player.gold -= si.price;
            const boughtItem = createItem(player.x, player.y, si.item, si.item.rarity);
            player.inventory.push(boughtItem);
            addMessage(messages, `${si.item.name}を購入した。(-${si.price}G)`, 'item');
            if (merchant.buyLines && merchant.buyLines.length > 0) {
              addMessage(messages, `「${randPick(merchant.buyLines)}」`, 'info');
            }
            Sound.play('buy');
          }
        } else {
          addMessage(messages, 'ゴールドが足りない！', 'system');
        }
      }
      UI.showShopUI(merchant, player, messages);
      this.updateView();
      return;
    }

    this.state.mode = 'play';
    addMessage(messages, '店を出た。', 'system');
    this.updateView();
  },

  checkBossDeath() {
    if (!this.state.isBossFloor || this.state.bossDefeated) return;

    const boss = this.state.enemies.find(e => e.isBoss);
    if (boss && boss.hp <= 0) {
      this.state.bossDefeated = true;
      Sound.stopBGM();
      Music.fadeToVolume(1, 3);

      this.state.map[boss.y][boss.x] = TILE.STAIRS_DOWN;

      // Boss defeat lore
      const bossLore = boss.bossType ? BOSS_LORE[boss.bossType] : null;
      if (bossLore && bossLore.defeat) {
        for (const line of bossLore.defeat) {
          addMessage(this.state.messages, line, 'important');
        }
      } else {
        addMessage(this.state.messages, `${boss.name}を討伐した！階段が現れた！`, 'important');
      }
      Effects.spawnParticles(boss.x, boss.y, '#ffcc00', 20);
      Effects.screenShake(6);

      const possibleDefs = ITEM_DEFS.filter(d =>
        (d.type === ITEM_TYPE.WEAPON || d.type === ITEM_TYPE.ARMOR) && d.minFloor <= this.state.floor + 2
      );
      if (possibleDefs.length > 0) {
        const def = randPick(possibleDefs);
        const item = createItem(boss.x, boss.y + 1, def, RARITY.LEGENDARY);
        this.state.items.push(item);
        addMessage(this.state.messages, `${boss.name}が${item.name}を落とした！`, 'item');
      }
    }
  },

  processEnemyTurns() {
    const { enemies, player, map, visible, messages } = this.state;
    const aliveEnemies = enemies.filter(e => e.hp > 0);

    for (const enemy of aliveEnemies) {
      if (!StatusManager.canAct(enemy)) {
        StatusManager.tick(enemy, messages);
        continue;
      }

      const result = updateEnemy(enemy, player, map, aliveEnemies, visible, this.state);
      if (result) {
        processEnemyAttack(result, messages);
        if (player.hp <= 0) return;
      }
    }
  },

  gameOver() {
    // Tutorial checkpoint respawn
    if (TutorialManager.active) {
      if (TutorialManager.failToCheckpoint(this.state)) {
        this.running = true;
        this.updateView();
        return;
      }
    }

    this.state.gameOver = true;
    this.running = false;
    Sound.stopBGM();
    Music.stop();
    Sound.play('death');
    // Game over lore
    for (const line of GAMEOVER_TEXT) {
      addMessage(this.state.messages, line, 'important');
    }

    // Save legacy data
    LegacyManager.saveDeath(this.state.player, this.state.floor);

    this.updateView();
    UI.showGameOver(this.state.player, this.state.floor);
  },

  _getPlayerRoomIndex() {
    const { player, rooms } = this.state;
    if (!rooms) return -1;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (player.x >= r.x && player.x < r.x + r.w &&
          player.y >= r.y && player.y < r.y + r.h) return i;
    }
    return -1;
  },

  // Measure corridor length from a point by flood-filling connected corridor tiles
  _measureCorridor(sx, sy) {
    const map = this.state.map;
    const visited = new Set();
    const queue = [{ x: sx, y: sy }];
    visited.add(`${sx},${sy}`);
    while (queue.length > 0) {
      const { x, y } = queue.shift();
      for (const dir of CARDINAL_DIRS) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        const key = `${nx},${ny}`;
        if (!visited.has(key) && inBounds(nx, ny) && map[ny][nx] === TILE.CORRIDOR) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return visited.size;
  },

  victory() {
    this.state.gameOver = true;
    this.running = false;
    Sound.stopBGM();
    Music.stop();
    Sound.play('levelup');
    // Victory lore
    for (const line of ENDING_TEXT.long) {
      addMessage(this.state.messages, line, 'important');
    }
    this.updateView();
    UI.showVictory(this.state.player);
  },
};

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
