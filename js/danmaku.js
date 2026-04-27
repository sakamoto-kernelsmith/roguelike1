// =============================================================================
// Danmaku System - Niconico-style flowing comments over game canvas
// =============================================================================

const DanmakuManager = {
  container: null,
  active: [],
  queue: [],             // queued comments waiting to be displayed
  lastTriggers: {},      // cooldown tracking per category
  seenEnemies: new Set(),
  seenItems: new Set(),
  _seenMerchant: false,
  _seenStairs: false,
  _seenRoomEvents: new Set(),
  lastRoomIdx: -1,
  lastFloor: 0,
  idleTimer: 0,
  enabled: true,
  _queueTimer: null,     // queue processing timer
  _lastSpawnTime: 0,     // when the last comment was actually spawned

  // Tuning
  MAX_ACTIVE: 15,
  MAX_QUEUE: 20,
  COOLDOWN: 2000,
  IDLE_INTERVAL: 12000,
  COMMENT_DURATION: 4500,
  LOW_HP_THRESHOLD: 0.3,
  QUEUE_MIN_DELAY: 800,        // minimum ms between queued comments
  QUEUE_HALF_SCREEN_MS: 2200,  // ~half the screen crossing time

  init() {
    this.container = document.getElementById('danmaku-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'danmaku-container';
      const canvas = document.getElementById('game-canvas');
      if (canvas && canvas.parentElement) {
        canvas.parentElement.appendChild(this.container);
      }
    }
    this.active = [];
    this.queue = [];
    this.lastTriggers = {};
    this.seenEnemies = new Set();
    this.seenItems = new Set();
    this.lastRoomIdx = -1;
    this.lastFloor = 0;
    this.idleTimer = 0;
    this._lastSpawnTime = 0;
    if (this._queueTimer) clearInterval(this._queueTimer);
    this._queueTimer = setInterval(() => this._processQueue(), 200);
  },

  resetFloor() {
    this.seenEnemies = new Set();
    this.seenItems = new Set();
    this._seenMerchant = false;
    this._seenStairs = false;
    this._seenRoomEvents = new Set();
    this.lastRoomIdx = -1;
    this.lastTriggers = {};
    this.queue = [];
  },

  // --- Queue system ---
  // Enqueue a comment instead of spawning immediately.
  // priority: 'high' bypasses queue and spawns now, 'normal' (default) goes to queue.
  _enqueue(text, options = {}, priority) {
    if (!this.enabled || !this.container || !text) return;
    if (priority === 'high') {
      this._spawnNow(text, options);
      return;
    }
    if (this.queue.length >= this.MAX_QUEUE) return;
    this.queue.push({ text, options });
    // Kick off processing if not already running
    this._processQueue();
  },

  // Process the queue: spawn next comment only if enough time has passed
  _processQueue() {
    if (this.queue.length === 0) return;
    const now = Date.now();
    const elapsed = now - this._lastSpawnTime;
    // Wait until previous comment has reached ~mid-screen
    if (elapsed < this.QUEUE_HALF_SCREEN_MS) return;
    // Also enforce minimum delay
    if (elapsed < this.QUEUE_MIN_DELAY) return;

    const next = this.queue.shift();
    if (next) {
      this._spawnNow(next.text, next.options);
    }
  },

  // --- Core: spawn a flowing comment immediately ---
  _spawnNow(text, options = {}) {
    if (!this.enabled || !this.container) return;
    if (this.active.length >= this.MAX_ACTIVE) return;

    const el = document.createElement('div');
    el.className = 'danmaku-comment';
    el.textContent = text;

    const color = options.color || '#eeeeee';
    const size = options.size || 14;
    const opacity = options.opacity || 0.9;
    const speed = options.speed || this.COMMENT_DURATION;
    const lane = options.lane !== undefined ? options.lane : this._pickLane();

    el.style.color = color;
    el.style.fontSize = size + 'px';
    el.style.opacity = opacity;
    el.style.top = lane + 'px';
    el.style.animationDuration = speed + 'ms';
    el.style.textShadow = `1px 1px 2px #000, -1px -1px 2px #000, 0 0 6px ${color}60`;

    this.container.appendChild(el);
    this.active.push({ el, spawnTime: Date.now(), duration: speed });
    this._lastSpawnTime = Date.now();

    setTimeout(() => {
      if (el.parentElement) el.parentElement.removeChild(el);
      this.active = this.active.filter(a => a.el !== el);
    }, speed + 100);
  },

  // Backward-compatible: spawn() now enqueues by default
  spawn(text, options = {}) {
    this._enqueue(text, options, 'normal');
  },

  // Spawn immediately (for high-priority events like crits, boss, level-up)
  spawnImmediate(text, options = {}) {
    this._enqueue(text, options, 'high');
  },

  _pickLane() {
    const containerHeight = this.container ? this.container.offsetHeight : 500;
    const margin = 6;
    const lineHeight = 22;
    const maxLanes = Math.floor((containerHeight - 40) / lineHeight);
    const usedLanes = new Set();

    for (const a of this.active) {
      const top = parseInt(a.el.style.top) || 0;
      const laneIdx = Math.floor(top / lineHeight);
      usedLanes.add(laneIdx);
    }

    const candidates = [];
    for (let i = 0; i < maxLanes; i++) {
      if (!usedLanes.has(i)) candidates.push(i);
    }

    const laneIdx = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : Math.floor(Math.random() * maxLanes);

    return margin + laneIdx * lineHeight;
  },

  _canTrigger(category) {
    const now = Date.now();
    const last = this.lastTriggers[category] || 0;
    if (now - last < this.COOLDOWN) return false;
    this.lastTriggers[category] = now;
    return true;
  },

  _pick(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // =========================================================================
  // Trigger methods - called from game code
  // All use _enqueue() for staggered display
  // =========================================================================

  onEnterFloor(floor) {
    if (!this._canTrigger('floor')) return;
    this.resetFloor();
    this.lastFloor = floor;

    const texts = DANMAKU.floor[floor];
    if (!texts) return;

    const count = 2 + Math.floor(Math.random() * 2);
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let text;
      let attempts = 0;
      do {
        text = this._pick(texts);
        attempts++;
      } while (used.has(text) && attempts < 10);
      if (!text) continue;
      used.add(text);
      this._enqueue(text, {
        color: '#bbddff',
        size: 15,
        speed: 5000 + Math.random() * 1500,
      });
    }

    if (floor > 1 && Math.random() < 0.5) {
      this._enqueue(this._pick(DANMAKU.descend), {
        color: '#99ccee',
        size: 14,
        speed: 5500,
      });
    }
  },

  onEnterRoom(roomIndex, state) {
    if (roomIndex === this.lastRoomIdx) return;
    this.lastRoomIdx = roomIndex;
    if (!this._canTrigger('room')) return;

    const room = state.rooms[roomIndex];
    if (!room) return;

    const visibleEnemies = state.enemies.filter(e =>
      e.hp > 0 &&
      state.visible.has(`${e.x},${e.y}`) &&
      e.x >= room.x && e.x < room.x + room.w &&
      e.y >= room.y && e.y < room.y + room.h
    );

    const visibleItems = state.items.filter(i =>
      state.visible.has(`${i.x},${i.y}`) &&
      i.x >= room.x && i.x < room.x + room.w &&
      i.y >= room.y && i.y < room.y + room.h
    );

    // Room atmosphere comment
    if (Math.random() < 0.7) {
      this._enqueue(this._pick(DANMAKU.room_general), {
        color: '#bbbbcc',
        size: 14,
        speed: 5000,
      });
    }

    // Comment on visible enemies in the room
    for (const enemy of visibleEnemies) {
      if (this.seenEnemies.has(enemy)) continue;
      this.seenEnemies.add(enemy);
      const enemyTexts = DANMAKU.see_enemy[enemy.id];
      if (enemyTexts) {
        this._enqueue(this._pick(enemyTexts), {
          color: enemy.isBoss ? '#ff8866' : '#ffaa77',
          size: enemy.isBoss ? 18 : 15,
          speed: 4500,
        });
      }
    }

    // Comment on visible items (food, potions, equipment)
    for (const item of visibleItems) {
      if (this.seenItems.has(item)) continue;
      this.seenItems.add(item);

      let texts = null;
      if (item.type === ITEM_TYPE.FOOD) {
        texts = DANMAKU.see_item.food;
      } else if (item.type === ITEM_TYPE.HEAL_POTION) {
        texts = DANMAKU.see_item.heal_potion;
      } else if (item.type === ITEM_TYPE.BIG_HEAL_POTION) {
        texts = DANMAKU.see_item.big_heal_potion;
      } else if (item.type === ITEM_TYPE.WEAPON) {
        texts = DANMAKU.see_item.weapon;
      } else if (item.type === ITEM_TYPE.ARMOR) {
        texts = DANMAKU.see_item.armor;
      } else if (item.type === ITEM_TYPE.SCROLL_MAP || item.type === ITEM_TYPE.POISON_SCROLL) {
        texts = DANMAKU.see_item.scroll;
      }

      if (texts && Math.random() < 0.7) {
        this._enqueue(this._pick(texts), {
          color: '#ffe066',
          size: 14,
          speed: 4500,
        });
      }
    }
  },

  // Item becomes visible (food, potions, equipment)
  onSeeItem(item) {
    if (this.seenItems.has(item)) return;
    this.seenItems.add(item);
    if (!this._canTrigger('see_item')) return;

    let texts = null;
    if (item.type === ITEM_TYPE.FOOD) {
      texts = DANMAKU.see_item.food;
    } else if (item.type === ITEM_TYPE.HEAL_POTION) {
      texts = DANMAKU.see_item.heal_potion;
    } else if (item.type === ITEM_TYPE.BIG_HEAL_POTION) {
      texts = DANMAKU.see_item.big_heal_potion;
    } else if (item.type === ITEM_TYPE.WEAPON) {
      texts = DANMAKU.see_item.weapon;
    } else if (item.type === ITEM_TYPE.ARMOR) {
      texts = DANMAKU.see_item.armor;
    } else if (item.type === ITEM_TYPE.SCROLL_MAP || item.type === ITEM_TYPE.POISON_SCROLL) {
      texts = DANMAKU.see_item.scroll;
    }

    if (texts) {
      this._enqueue(this._pick(texts), {
        color: '#ffe066',
        size: 14,
        speed: 4500,
      });
    }
  },

  onSeeEnemy(enemy) {
    if (this.seenEnemies.has(enemy)) return;
    this.seenEnemies.add(enemy);
    if (!this._canTrigger('see_' + (enemy.id || 'unknown'))) return;

    const texts = DANMAKU.see_enemy[enemy.id];
    if (!texts) return;

    const isBoss = enemy.isBoss;
    this._enqueue(this._pick(texts), {
      color: isBoss ? '#ff8866' : '#ffaa77',
      size: isBoss ? 18 : 15,
      speed: isBoss ? 5500 : 4500,
    });

    // Boss gets extra comments
    if (isBoss) {
      const bossKey = enemy.bossType ? enemy.bossType + '_appear' : null;
      if (bossKey && DANMAKU.boss[bossKey]) {
        this._enqueue(this._pick(DANMAKU.boss[bossKey]), {
          color: '#ff6666',
          size: 17,
          speed: 5000,
        });
        this._enqueue(this._pick(DANMAKU.boss[bossKey]), {
          color: '#ff8877',
          size: 16,
          speed: 5200,
        });
      }
    }

    // Prefix enemy extra comment
    if (enemy.prefix && Math.random() < 0.6) {
      const baseName = enemy.name.replace(enemy.prefix.name, '');
      const ch = enemy.ch;
      const prefixComments = {
        '猛毒': `猛毒${baseName}(${ch})だ！毒を持っている...触れるな！`,
        '俊足': `俊足${baseName}(${ch})...速い！気をつけろ`,
        '装甲': `装甲${baseName}(${ch})か。硬そうだ...防御が厚い`,
        '狂暴': `狂暴${baseName}(${ch})！目が血走っている...！`,
      };
      const text = prefixComments[enemy.prefix.name];
      if (text) {
        this._enqueue(text, { color: enemy.prefix.color, size: 15, speed: 4500 });
      }
    }
  },

  onPlayerAttack(result, enemy) {
    if (!this._canTrigger('attack')) return;

    if (result.missed) {
      this._enqueue(this._pick(DANMAKU.miss_attack), {
        color: '#ccbbbb',
        size: 14,
        speed: 3500,
      });
      return;
    }

    if (result.isCrit) {
      // Crits are high-priority - show immediately
      this.spawnImmediate(this._pick(DANMAKU.attack_crit), {
        color: '#ffdd44',
        size: 18,
        speed: 4000,
      });
    } else if (result.damage > 15) {
      this._enqueue(this._pick(DANMAKU.attack_strong), {
        color: '#ffaa55',
        size: 16,
        speed: 4000,
      });
    } else if (Math.random() < 0.5) {
      this._enqueue(this._pick(DANMAKU.attack_hit), {
        color: '#eebb88',
        size: 14,
        speed: 4000,
      });
    }

    // Weapon special effect comment
    if (typeof Game !== 'undefined' && Game.state) {
      const weapon = Game.state.player.weapon;
      if (weapon && weapon.special && DANMAKU.weapon_special[weapon.special]) {
        if (Math.random() < 0.4) {
          this._enqueue(this._pick(DANMAKU.weapon_special[weapon.special]), {
            color: weapon.special === 'burn' ? '#ff8844' : '#ee5588',
            size: 15,
            speed: 4000,
          });
        }
      }
    }
  },

  onPlayerDamaged(result, attackerEnemy) {
    if (!this._canTrigger('damaged')) return;

    const enemyId = attackerEnemy ? attackerEnemy.id : null;
    const texts = (enemyId && DANMAKU.take_damage[enemyId])
      ? DANMAKU.take_damage[enemyId]
      : DANMAKU.take_damage._default;

    if (result.isCrit) {
      this.spawnImmediate(this._pick(texts), {
        color: '#ff5555',
        size: 17,
        speed: 4000,
      });
    } else {
      this._enqueue(this._pick(texts), {
        color: '#ff8888',
        size: 15,
        speed: 4000,
      });
    }

    // Low HP warning
    if (typeof Game !== 'undefined' && Game.state) {
      const player = Game.state.player;
      if (player.hp > 0 && player.hp / player.maxHp <= this.LOW_HP_THRESHOLD) {
        if (this._canTrigger('low_hp')) {
          this._enqueue(this._pick(DANMAKU.low_hp), {
            color: '#ff6666',
            size: 16,
            speed: 5000,
          });
        }
      }
    }
  },

  onEnemyKilled(enemy, player) {
    if (!this._canTrigger('kill')) return;

    const specificTexts = DANMAKU.kill[enemy.id];
    if (specificTexts && Math.random() < 0.6) {
      this._enqueue(this._pick(specificTexts), {
        color: '#88ffaa',
        size: 15,
        speed: 4000,
      });
    }

    // General kill comment based on difficulty
    const hpRatio = player.hp / player.maxHp;
    let killTexts;
    if (hpRatio > 0.8 && enemy.exp <= 8) {
      killTexts = DANMAKU.kill._weak;
    } else if (hpRatio < 0.4 || enemy.exp >= 20) {
      killTexts = DANMAKU.kill._tough;
    } else {
      killTexts = DANMAKU.kill._normal;
    }
    if (Math.random() < 0.5) {
      this._enqueue(this._pick(killTexts), {
        color: '#aaffbb',
        size: 14,
        speed: 4500,
      });
    }

    // Kill streak
    if (player.killStreak >= 3) {
      this._enqueue(this._pick(DANMAKU.kill_streak), {
        color: '#ffaa33',
        size: 17,
        speed: 4000,
      });
    }
  },

  onPickupItem(item) {
    if (!this._canTrigger('pickup')) return;

    let texts;
    if (item.type === ITEM_TYPE.WEAPON) {
      if (item.rarity === RARITY.LEGENDARY) texts = DANMAKU.pickup.weapon_legendary;
      else if (item.rarity === RARITY.RARE) texts = DANMAKU.pickup.weapon_good;
      else texts = DANMAKU.pickup.weapon;
    } else if (item.type === ITEM_TYPE.ARMOR) {
      if (item.rarity === RARITY.LEGENDARY) texts = DANMAKU.pickup.armor_legendary;
      else if (item.rarity === RARITY.RARE) texts = DANMAKU.pickup.armor_good;
      else texts = DANMAKU.pickup.armor;
    } else if (item.type === ITEM_TYPE.HEAL_POTION) {
      texts = DANMAKU.pickup.heal_potion;
    } else if (item.type === ITEM_TYPE.BIG_HEAL_POTION) {
      texts = DANMAKU.pickup.big_heal_potion;
    } else if (item.type === ITEM_TYPE.SCROLL_MAP) {
      texts = DANMAKU.pickup.scroll_map;
    } else if (item.type === ITEM_TYPE.POISON_SCROLL) {
      texts = DANMAKU.pickup.poison_scroll;
    } else if (item.type === ITEM_TYPE.FOOD) {
      texts = DANMAKU.pickup.food;
    }

    if (texts) {
      this._enqueue(this._pick(texts), {
        color: RARITY_COLORS[item.rarity] || '#ffe066',
        size: item.rarity === RARITY.LEGENDARY ? 17 : (item.rarity === RARITY.RARE ? 16 : 14),
        speed: 4500,
      });
    }
  },

  onEquip(item) {
    if (!this._canTrigger('equip')) return;
    const texts = item.type === ITEM_TYPE.WEAPON
      ? DANMAKU.equip.weapon
      : DANMAKU.equip.armor;
    if (!texts) return;

    this._enqueue(this._pick(texts), {
      color: RARITY_COLORS[item.rarity] || '#ffe066',
      size: item.rarity === RARITY.LEGENDARY ? 18 : 15,
      speed: 4500,
    });

    // Rarity-specific extra comment
    if (item.rarity === RARITY.LEGENDARY) {
      const extra = item.type === ITEM_TYPE.WEAPON
        ? DANMAKU.equip.weapon_legendary
        : DANMAKU.equip.armor_legendary;
      if (extra) {
        this._enqueue(this._pick(extra), {
          color: '#ffdd44',
          size: 17,
          speed: 5000,
        });
      }
    } else if (item.rarity === RARITY.RARE) {
      const extra = item.type === ITEM_TYPE.WEAPON
        ? DANMAKU.equip.weapon_rare
        : DANMAKU.equip.armor_rare;
      if (extra) {
        this._enqueue(this._pick(extra), {
          color: '#66aaff',
          size: 16,
          speed: 5000,
        });
      }
    }

    // Special effect comment
    if (item.special && DANMAKU.equip.special) {
      const specTexts = DANMAKU.equip.special[item.special];
      if (specTexts) {
        this._enqueue(this._pick(specTexts), {
          color: '#eedd88',
          size: 15,
          speed: 4800,
        });
      }
    }
  },

  onLevelUp(level) {
    if (!this._canTrigger('levelup')) return;
    // Level up is high-priority - show immediately
    this.spawnImmediate(this._pick(DANMAKU.level_up), {
      color: '#dd99ff',
      size: 18,
      speed: 5000,
    });
    // Extra level-specific comment goes to queue
    if (DANMAKU.level_up_extra) {
      const extraTexts = DANMAKU.level_up_extra[level];
      if (extraTexts) {
        this._enqueue(this._pick(extraTexts), {
          color: '#cc88ee',
          size: 16,
          speed: 5200,
        });
      }
    }
  },

  onTrap(trapType) {
    if (!this._canTrigger('trap')) return;
    const texts = DANMAKU.trap[trapType];
    if (!texts) return;
    this.spawnImmediate(this._pick(texts), {
      color: '#ff8844',
      size: 16,
      speed: 4000,
    });
  },

  onChest(isMimic) {
    if (!this._canTrigger('chest')) return;
    const texts = isMimic ? DANMAKU.chest.mimic : DANMAKU.chest.open;
    this.spawnImmediate(this._pick(texts), {
      color: isMimic ? '#ff6666' : '#ffdd55',
      size: isMimic ? 17 : 15,
      speed: 4000,
    });
  },

  onEvade() {
    if (!this._canTrigger('evade')) return;
    this._enqueue(this._pick(DANMAKU.evade), {
      color: '#66ddff',
      size: 16,
      speed: 3500,
    });
  },

  onBossPhase(bossType, phase) {
    const key = bossType + '_phase' + phase;
    if (!DANMAKU.boss[key]) return;
    this.lastTriggers['boss_phase'] = 0;

    const texts = DANMAKU.boss[key];
    this.spawnImmediate(this._pick(texts), {
      color: '#ff6666',
      size: 17,
      speed: 5000,
    });
    this._enqueue(this._pick(texts), {
      color: '#ff8877',
      size: 16,
      speed: 5500,
    });
  },

  onHunger() {
    if (!this._canTrigger('hunger')) return;
    this._enqueue(this._pick(DANMAKU.hunger), {
      color: '#eebb55',
      size: 14,
      speed: 5000,
    });
  },

  onSeeStairs() {
    if (this._seenStairs) return;
    this._seenStairs = true;
    this._enqueue(this._pick(DANMAKU.stairs), {
      color: '#44ddff',
      size: 15,
      speed: 4500,
    });
  },

  onSeeMerchant() {
    if (this._seenMerchant) return;
    this._seenMerchant = true;
    this._enqueue(this._pick(DANMAKU.merchant), {
      color: '#ffee66',
      size: 15,
      speed: 4500,
    });
  },

  onSeeRoomEvent(eventType) {
    const key = 'room_event_' + eventType;
    if (this._seenRoomEvents.has(key)) return;
    this._seenRoomEvents.add(key);
    const texts = DANMAKU.room_event[eventType];
    if (!texts) return;
    this._enqueue(this._pick(texts), {
      color: '#dd99ff',
      size: 15,
      speed: 4500,
    });
  },

  onMutation(mutationType) {
    if (!this._canTrigger('mutation')) return;
    const texts = DANMAKU.mutation[mutationType];
    if (!texts) return;

    this._enqueue(this._pick(texts), {
      color: MUTATION_DEFS[mutationType] ? MUTATION_DEFS[mutationType].color : '#cccccc',
      size: 16,
      speed: 5000,
    });
    this._enqueue(this._pick(texts), {
      color: MUTATION_DEFS[mutationType] ? MUTATION_DEFS[mutationType].color : '#cccccc',
      size: 16,
      speed: 5000,
    });
  },

  tickIdle(dt) {
    if (!this.enabled) return;
    this.idleTimer += dt;
    if (this.idleTimer >= this.IDLE_INTERVAL) {
      this.idleTimer = 0;
      if (this.active.length <= 2 && this.queue.length === 0 && Math.random() < 0.4) {
        this._enqueue(this._pick(DANMAKU.idle), {
          color: '#99aabb',
          size: 13,
          speed: 6000,
          opacity: 0.75,
        });
      }
    }
  },
};
