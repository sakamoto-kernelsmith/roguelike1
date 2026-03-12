// =============================================================================
// Tutorial Manager - Chapter loading, objective tracking, event handling
// =============================================================================

const TUTORIAL_STORAGE_KEY = 'rogueDepths_tutorial';

const TutorialManager = {
  active: false,
  chapterId: null,
  chapter: null,
  objectiveIndex: 0,
  completedObjectives: {},
  killCount: 0,
  checkpoint: null,
  hintText: '',
  bannerText: '',
  bannerTimer: 0,
  stairsLocked: true,
  doorStates: {},
  objectiveStartRan: {},

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  saveProgress(chapterId) {
    const data = this.loadAllProgress();
    data[chapterId] = true;
    // Mark intro complete if all 4 done
    const introIds = TutorialData.getIntroChapterIds();
    if (introIds.every(id => data[id])) {
      data._introCompleted = true;
    }
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(data));
  },

  loadAllProgress() {
    try {
      return JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },

  isChapterCompleted(chapterId) {
    return !!this.loadAllProgress()[chapterId];
  },

  isIntroCompleted() {
    return !!this.loadAllProgress()._introCompleted;
  },

  // ---------------------------------------------------------------------------
  // Start / Load Chapter
  // ---------------------------------------------------------------------------
  startChapter(chapterId) {
    const chapter = TutorialData.getChapter(chapterId);
    if (!chapter) return false;

    this.active = true;
    this.chapterId = chapterId;
    this.chapter = chapter;
    this.objectiveIndex = 0;
    this.completedObjectives = {};
    this.killCount = 0;
    this.checkpoint = null;
    this.hintText = '';
    this.bannerText = '';
    this.bannerTimer = 0;
    this.stairsLocked = true;
    this.doorStates = {};
    this.objectiveStartRan = {};

    // Init door lock states
    if (chapter.doors) {
      for (const door of chapter.doors) {
        this.doorStates[door.id] = door.locked;
      }
    }

    // Init stairs lock
    if (chapter.stairs && chapter.stairs.length > 0) {
      this.stairsLocked = chapter.stairs[0].locked !== false;
    }

    return true;
  },

  // Build fixed map from ASCII data and place entities
  loadChapterMap(state) {
    const ch = this.chapter;
    if (!ch) return;

    const mapLines = ch.map;
    const height = mapLines.length;
    const width = mapLines[0].length;

    // Build tile map
    const map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      map[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (y < height && x < width) {
          const c = mapLines[y][x];
          switch (c) {
            case '#': map[y][x] = TILE.WALL; break;
            case '.': case '@': case 'e': case 'i': case 't':
            case 'Q': case 'E': case 'R': case 'F':
              map[y][x] = TILE.FLOOR; break;
            case 's': map[y][x] = TILE.FLOOR; break;
            case 'd': map[y][x] = TILE.WALL; break; // locked doors start as wall
            case '>': map[y][x] = TILE.FLOOR; break; // stairs placed separately
            case ' ': map[y][x] = TILE.VOID; break;
            default: map[y][x] = TILE.FLOOR; break;
          }
        } else {
          map[y][x] = TILE.VOID;
        }
      }
    }

    // Place unlocked doors as DOOR tiles
    if (ch.doors) {
      for (const door of ch.doors) {
        if (!this.doorStates[door.id]) {
          map[door.y][door.x] = TILE.DOOR;
        }
      }
    }

    // Place stairs
    if (ch.stairs) {
      for (const s of ch.stairs) {
        if (!this.stairsLocked) {
          map[s.y][s.x] = TILE.STAIRS_DOWN;
        }
      }
    }

    state.map = map;
    state.rooms = [{ x: 0, y: 0, w: width, h: height }];
    state.explored = createExplored();
    state.hiddenDoors = [];
    state.chests = [];
    state.merchant = null;
    state.roomEvents = [];
    state.poisonZones = [];
    state.mutation = MUTATION.NONE;
    state.isBossFloor = false;
    state.bossDefeated = false;

    // Player
    const ps = ch.playerStart;
    if (state.floor === 1 || !state.player) {
      state.player = createPlayer(ps.x, ps.y);
    } else {
      state.player.x = ps.x;
      state.player.y = ps.y;
    }

    // Apply player overrides
    if (ch.playerOverrides) {
      const p = state.player;
      const ov = ch.playerOverrides;
      if (ov.hp !== undefined) p.hp = ov.hp;
      if (ov.maxHp !== undefined) p.maxHp = ov.maxHp;
      if (ov.baseAtk !== undefined) p.baseAtk = ov.baseAtk;
      if (ov.baseDef !== undefined) p.baseDef = ov.baseDef;
      if (ov.exp !== undefined) p.exp = ov.exp;
    }

    // Enemies
    state.enemies = [];
    if (ch.enemies) {
      for (const eDef of ch.enemies) {
        const enemy = this._createTutorialEnemy(eDef);
        if (enemy) state.enemies.push(enemy);
      }
    }

    // Items
    state.items = [];
    if (ch.items) {
      for (const iDef of ch.items) {
        const item = this._createTutorialItem(iDef);
        if (item) state.items.push(item);
      }
    }

    // Traps
    state.traps = [];

    // Grant skills if needed
    if (ch.grantSkills) {
      SkillManager.init();
    }

    // Set initial checkpoint
    this.checkpoint = { x: ps.x, y: ps.y };

    // Run on_start triggers
    for (const trigger of (ch.triggers || [])) {
      if (trigger.type === 'on_start') {
        this.runActions(state, trigger.actions);
      }
    }

    // Run onStart of first objective
    const firstObj = this._getCurrentObjective();
    if (firstObj && firstObj.onStart && !this.objectiveStartRan[firstObj.id]) {
      this.objectiveStartRan[firstObj.id] = true;
      this.runActions(state, firstObj.onStart);
    }
  },

  _createTutorialEnemy(def) {
    // Template name mapping to ENEMY_DEFS
    const TEMPLATE_MAP = {
      'slime': 'スライム',
      'bat': 'コウモリ',
      'rat': 'ネズミ',
      'goblin': 'ゴブリン',
      'skeleton': 'スケルトン',
      'orc': 'オーク',
      'lizard': 'リザードマン',
      'ghost': 'ゴースト',
      'troll': 'トロル',
      'dragon': 'ドラゴン',
    };
    const jpName = TEMPLATE_MAP[def.template] || def.template;
    const templateDef = ENEMY_DEFS.find(d => d.name === jpName);
    if (!templateDef) {
      // Fallback: create basic enemy
      return {
        x: def.x, y: def.y,
        hp: def.hpOverride || 10, maxHp: def.hpOverride || 10,
        atk: def.atkOverride || 3, def: def.defOverride || 0,
        name: def.template, ch: 'E', color: '#e04040',
        state: 'idle', path: [], id: def.id,
        exp: def.expOverride || 5, gold: 0,
        statusEffects: [],
      };
    }
    const enemy = createEnemy(def.x, def.y, templateDef);
    enemy.id = def.id;
    if (def.hpOverride !== undefined) { enemy.hp = def.hpOverride; enemy.maxHp = def.hpOverride; }
    if (def.atkOverride !== undefined) enemy.atk = def.atkOverride;
    if (def.defOverride !== undefined) enemy.def = def.defOverride;
    if (def.expOverride !== undefined) enemy.exp = def.expOverride;
    return enemy;
  },

  _createTutorialItem(def) {
    // Map tutorial item IDs to ITEM_DEFS
    const ITEM_MAP = {
      'heal_potion': '回復薬',
      'big_heal_potion': '大回復薬',
      'short_sword': '短剣',
      'long_sword': '長剣',
      'leather_armor': '皮の鎧',
      'chain_mail': '鎖帷子',
      'scroll_map': '地図の巻物',
    };
    const jpName = ITEM_MAP[def.defId] || def.defId;
    const itemDef = ITEM_DEFS.find(d => d.name === jpName || d.type === def.defId);
    if (!itemDef) return null;
    return createItem(def.x, def.y, itemDef, RARITY.COMMON);
  },

  // ---------------------------------------------------------------------------
  // Objective Management
  // ---------------------------------------------------------------------------
  _getCurrentObjective() {
    if (!this.chapter) return null;
    return this.chapter.objectives[this.objectiveIndex] || null;
  },

  getCurrentObjective() {
    return this._getCurrentObjective();
  },

  getCurrentHint() {
    return this.hintText;
  },

  // ---------------------------------------------------------------------------
  // Event Handling - called from Game after actions
  // ---------------------------------------------------------------------------
  handleEvent(state, eventName, payload) {
    if (!this.active) return;

    const obj = this._getCurrentObjective();
    if (!obj) return;

    let matched = false;

    switch (obj.type) {
      case 'player_moved':
        if (eventName === 'player_moved') {
          matched = true;
        }
        break;

      case 'player_waited':
        if (eventName === 'player_waited') {
          matched = true;
        }
        break;

      case 'entered_tile':
        if (eventName === 'player_moved' && payload) {
          for (const pos of (obj.positions || [])) {
            if (payload.x === pos.x && payload.y === pos.y) {
              matched = true;
              break;
            }
          }
        }
        break;

      case 'enemy_killed':
        if (eventName === 'enemy_killed') {
          this.killCount++;
          const target = obj.countAll ? obj.target : (obj.target || 1);
          if (this.killCount >= target) {
            matched = true;
          }
        }
        break;

      case 'used_skill':
        if (eventName === 'used_skill' && payload && payload.key === obj.skillKey) {
          matched = true;
        }
        break;

      case 'status_applied':
        if (eventName === 'status_applied' && payload && payload.status === obj.status) {
          matched = true;
        }
        break;

      case 'used_stairs':
        if (eventName === 'used_stairs') {
          matched = true;
        }
        break;

      case 'used_item':
        if (eventName === 'used_item') {
          matched = true;
        }
        break;

      case 'equipped_item':
        if (eventName === 'equipped_item') {
          matched = true;
        }
        break;

      case 'player_level_up':
        if (eventName === 'player_level_up') {
          matched = true;
        }
        break;

      case 'searched_wall':
        if (eventName === 'searched_wall') {
          matched = true;
        }
        break;

      case 'found_secret':
        if (eventName === 'found_secret') {
          matched = true;
        }
        break;

      case 'purchased_item':
        if (eventName === 'purchased_item') {
          matched = true;
        }
        break;
    }

    if (matched) {
      this.completeObjective(state, obj.id);
    }

    // Check on_enter triggers
    if (eventName === 'player_moved' && payload) {
      for (const trigger of (this.chapter.triggers || [])) {
        if (trigger.type === 'on_enter' && trigger.x === payload.x && trigger.y === payload.y) {
          if (trigger.once && trigger._fired) continue;
          trigger._fired = true;
          this.runActions(state, trigger.actions);
        }
      }
    }
  },

  completeObjective(state, objectiveId) {
    const obj = this._getCurrentObjective();
    if (!obj || obj.id !== objectiveId) return;

    this.completedObjectives[objectiveId] = true;

    // Run onComplete actions
    if (obj.onComplete) {
      this.runActions(state, obj.onComplete);
    }

    // Advance to next objective
    this.objectiveIndex++;
    const nextObj = this._getCurrentObjective();
    if (nextObj) {
      // Run onStart of new objective
      if (nextObj.onStart && !this.objectiveStartRan[nextObj.id]) {
        this.objectiveStartRan[nextObj.id] = true;
        this.runActions(state, nextObj.onStart);
      }
      // Auto-complete if condition already met (e.g. leveled up before reaching this objective)
      this._checkRetroactiveCompletion(state, nextObj);
    }
  },

  // Check if a newly activated objective is already satisfied
  _checkRetroactiveCompletion(state, obj) {
    if (!obj || !state) return;
    let satisfied = false;
    switch (obj.type) {
      case 'player_level_up':
        // If player already leveled past initial level
        if (state.player && state.player.level >= 2) satisfied = true;
        break;
      case 'enemy_killed':
        if (obj.countAll && this.killCount >= obj.target) satisfied = true;
        break;
    }
    if (satisfied) {
      this.completeObjective(state, obj.id);
    }
  },

  // ---------------------------------------------------------------------------
  // Action Runner
  // ---------------------------------------------------------------------------
  runActions(state, actions) {
    if (!actions) return;
    for (const action of actions) {
      this._runAction(state, action);
    }
  },

  _runAction(state, action) {
    switch (action.type) {
      case 'show_hint':
        this.hintText = action.text;
        addMessage(state.messages, action.text, 'system');
        break;

      case 'show_banner':
        this.bannerText = action.text;
        this.bannerTimer = 180; // frames
        break;

      case 'open_door': {
        const door = this.chapter.doors.find(d => d.id === action.id);
        if (door) {
          this.doorStates[door.id] = false;
          state.map[door.y][door.x] = TILE.DOOR;
          if (typeof Effects !== 'undefined') {
            Effects.spawnParticles(door.x, door.y, '#a07030', 6);
          }
          if (typeof Sound !== 'undefined') {
            Sound.play('chest');
          }
        }
        break;
      }

      case 'unlock_stairs':
        this.stairsLocked = false;
        if (this.chapter.stairs) {
          for (const s of this.chapter.stairs) {
            state.map[s.y][s.x] = TILE.STAIRS_DOWN;
          }
        }
        break;

      case 'heal_player':
        if (state.player) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + (action.amount || 10));
          addMessage(state.messages, `HPが${action.amount || 10}回復した。`, 'heal');
        }
        break;

      case 'teleport_player':
        if (state.player) {
          state.player.x = action.x;
          state.player.y = action.y;
        }
        break;

      case 'set_checkpoint':
        this.checkpoint = { x: action.x, y: action.y };
        break;

      case 'set_skill_cooldown':
        if (typeof SkillManager !== 'undefined') {
          const skill = SkillManager.getSkillByKey(action.key);
          if (skill) skill.currentCd = action.value || 0;
        }
        break;

      case 'play_effect':
        if (typeof Effects !== 'undefined' && action.effect === 'ping') {
          Effects.spawnParticles(action.x || 0, action.y || 0, '#00ccff', 6);
        }
        break;

      case 'play_sound':
        if (typeof Sound !== 'undefined') {
          Sound.play(action.sound || 'hit');
        }
        break;

      case 'complete_chapter':
        this._completeChapter(state);
        break;

      case 'grant_all_skills':
        if (typeof SkillManager !== 'undefined') {
          SkillManager.init();
        }
        break;

      case 'spawn_enemy': {
        if (action.enemy) {
          const enemy = this._createTutorialEnemy(action.enemy);
          if (enemy) state.enemies.push(enemy);
        }
        break;
      }

      case 'spawn_item': {
        if (action.item) {
          const item = this._createTutorialItem(action.item);
          if (item) state.items.push(item);
        }
        break;
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Chapter Completion
  // ---------------------------------------------------------------------------
  _completeChapter(state) {
    this.saveProgress(this.chapterId);

    const nextId = this.chapter.nextChapterId;
    this.active = false;

    addMessage(state.messages, '章をクリアしました！', 'important');

    if (typeof Sound !== 'undefined') {
      Sound.play('levelup');
    }
    if (typeof Effects !== 'undefined') {
      Effects.spawnParticles(state.player.x, state.player.y, '#ffcc00', 15);
    }

    // Check if intro is now fully completed
    if (this.isIntroCompleted() && !this._announcedTraining) {
      this._announcedTraining = true;
      addMessage(state.messages, '訓練場が解放されました！', 'important');
    }

    // Show completion screen
    if (typeof UI !== 'undefined') {
      UI.showTutorialComplete(this.chapterId, nextId);
    }
  },

  // ---------------------------------------------------------------------------
  // Failure / Checkpoint
  // ---------------------------------------------------------------------------
  failToCheckpoint(state) {
    if (!this.active || !this.chapter) return false;

    // Find active checkpoint
    let cp = this.checkpoint;
    if (this.chapter.checkpoints) {
      const obj = this._getCurrentObjective();
      if (obj) {
        const matchingCp = this.chapter.checkpoints.find(c => c.activeOnObjective === obj.id);
        if (matchingCp) cp = matchingCp;
      }
    }

    if (!cp) return false;

    // Reset player
    state.player.hp = state.player.maxHp;
    state.player.x = cp.x;
    state.player.y = cp.y;
    state.player.statuses = [];
    state.gameOver = false;

    // Show death hint
    if (this.chapter.onDeath && this.chapter.onDeath.hint) {
      this.hintText = this.chapter.onDeath.hint;
      addMessage(state.messages, this.chapter.onDeath.hint, 'system');
    }

    addMessage(state.messages, 'チェックポイントから再開します。', 'important');

    // Re-spawn dead enemies for current objective
    if (this.chapter.enemies) {
      for (const eDef of this.chapter.enemies) {
        const existing = state.enemies.find(e => e.id === eDef.id);
        if (!existing || existing.hp <= 0) {
          // Only respawn enemies relevant to current/future objectives
          const enemy = this._createTutorialEnemy(eDef);
          if (enemy) {
            const idx = state.enemies.findIndex(e => e.id === eDef.id);
            if (idx !== -1) {
              state.enemies[idx] = enemy;
            } else {
              state.enemies.push(enemy);
            }
          }
        }
      }
    }

    // Reset kill count for current objective
    const obj = this._getCurrentObjective();
    if (obj && obj.type === 'enemy_killed') {
      this.killCount = 0;
    }

    return true;
  },

  // ---------------------------------------------------------------------------
  // Stair check - is descending allowed?
  // ---------------------------------------------------------------------------
  canDescend(state) {
    if (!this.active) return true;
    if (this.stairsLocked) {
      addMessage(state.messages, 'まだ階段は使えません。目標を達成しましょう。', 'system');
      return false;
    }
    return true;
  },

  // ---------------------------------------------------------------------------
  // Skill restriction check
  // ---------------------------------------------------------------------------
  isSkillAllowed(key) {
    if (!this.active) return true;
    if (this.chapter && this.chapter.suppressSkills) return false;
    return true;
  },

  getSkillBlockMessage() {
    return 'この章ではまだスキルを使いません。';
  },

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  getObjectiveText() {
    const obj = this._getCurrentObjective();
    return obj ? obj.hint : '';
  },

  getHelperText() {
    const obj = this._getCurrentObjective();
    return obj ? (obj.helperText || '') : '';
  },

  getBanner() {
    if (this.bannerTimer > 0) {
      this.bannerTimer--;
      return this.bannerText;
    }
    return null;
  },

  getChapterTitle() {
    return this.chapter ? this.chapter.title : '';
  },

  // Return positions to highlight with a pulsing indicator
  getHighlightPositions() {
    if (!this.active) return [];
    const obj = this._getCurrentObjective();
    if (!obj) return [];
    const positions = [];
    if (obj.type === 'entered_tile' && obj.positions) {
      positions.push(...obj.positions);
    }
    if (obj.type === 'used_stairs' && this.chapter && this.chapter.stairs && !this.stairsLocked) {
      for (const s of this.chapter.stairs) {
        positions.push({ x: s.x, y: s.y });
      }
    }
    return positions;
  },

  // Return danger zone tiles for visual rendering
  getDangerZoneTiles() {
    if (!this.active || !this.chapter || !this.chapter.specialZones) return [];
    const tiles = [];
    for (const zone of this.chapter.specialZones) {
      if (zone.behavior === 'danger_line' && zone.tiles) {
        tiles.push(...zone.tiles);
      }
    }
    return tiles;
  },

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  reset() {
    this.active = false;
    this.chapterId = null;
    this.chapter = null;
    this.objectiveIndex = 0;
    this.completedObjectives = {};
    this.killCount = 0;
    this.checkpoint = null;
    this.hintText = '';
    this.bannerText = '';
    this.bannerTimer = 0;
    this.stairsLocked = true;
    this.doorStates = {};
    this.objectiveStartRan = {};
  },
};
