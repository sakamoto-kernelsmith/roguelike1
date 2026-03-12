// =============================================================================
// Event Manager
// =============================================================================

const EventManager = {
  state: null,

  init() {
    this.state = {
      seen: new Set(),
      activeLines: new Set(),
      completed: new Set(),
      flags: {},
      history: [],
    };
  },

  reset() {
    this.init();
  },

  ensureState() {
    if (!this.state) this.init();
  },

  markSeen(eventId) {
    this.ensureState();
    this.state.seen.add(eventId);
  },

  markCompleted(eventId) {
    this.ensureState();
    this.state.completed.add(eventId);
  },

  hasSeen(eventId) {
    this.ensureState();
    return this.state.seen.has(eventId);
  },

  hasCompleted(eventId) {
    this.ensureState();
    return this.state.completed.has(eventId);
  },

  setFlag(flag, value = true) {
    this.ensureState();
    this.state.flags[flag] = value;
  },

  getFlag(flag) {
    this.ensureState();
    return this.state.flags[flag];
  },

  getEventsForTrigger(floor, trigger) {
    this.ensureState();
    return EventData.getForFloor(floor).filter((eventDef) => (
      eventDef.trigger === trigger && this.canTrigger(eventDef)
    ));
  },

  canTrigger(eventDef) {
    if (this.hasCompleted(eventDef.id)) return false;

    // If this event depends on a previous event in the same line, require one follow-up source to be seen.
    const hasPrereq = EventData.EVENT_DEFS.some((candidate) =>
      Array.isArray(candidate.followUp) && candidate.followUp.includes(eventDef.id)
    );

    if (!hasPrereq) return true;

    return EventData.EVENT_DEFS.some((candidate) =>
      Array.isArray(candidate.followUp) &&
      candidate.followUp.includes(eventDef.id) &&
      this.hasSeen(candidate.id)
    );
  },

  pickEvent(floor, trigger) {
    const candidates = this.getEventsForTrigger(floor, trigger);
    if (candidates.length === 0) return null;

    // Prefer unseen lines, then unseen events.
    const sorted = candidates.slice().sort((a, b) => {
      const aSeenLine = this.state.activeLines.has(a.line) ? 1 : 0;
      const bSeenLine = this.state.activeLines.has(b.line) ? 1 : 0;
      if (aSeenLine !== bSeenLine) return aSeenLine - bSeenLine;
      const aSeen = this.hasSeen(a.id) ? 1 : 0;
      const bSeen = this.hasSeen(b.id) ? 1 : 0;
      return aSeen - bSeen;
    });

    return sorted[0];
  },

  trigger(trigger, payload, gameState) {
    this.ensureState();
    const floor = gameState && gameState.floor ? gameState.floor : 1;
    const eventDef = this.pickEvent(floor, trigger);
    if (!eventDef) return null;

    this.state.activeLines.add(eventDef.line);
    this.markSeen(eventDef.id);
    this.state.history.push({
      id: eventDef.id,
      floor,
      trigger,
      turn: gameState && gameState.player ? gameState.player.turnCount : 0,
    });

    this.emitMessages(eventDef, gameState);
    this.applyRewards(eventDef, gameState, payload);
    this.markCompleted(eventDef.id);
    return eventDef;
  },

  emitMessages(eventDef, gameState) {
    if (!gameState || !gameState.messages || !Array.isArray(eventDef.messages)) return;
    addMessage(gameState.messages, `--- ${eventDef.title} ---`, 'system');
    for (const message of eventDef.messages) {
      addMessage(gameState.messages, message, 'important');
    }
    if (typeof Effects !== 'undefined' && gameState.player) {
      Effects.spawnParticles(gameState.player.x, gameState.player.y, '#aaccff', 6);
    }
    if (typeof Sound !== 'undefined') {
      Sound.play('chest');
    }
  },

  applyRewards(eventDef, gameState, payload) {
    if (!gameState || !Array.isArray(eventDef.reward)) return;

    for (const reward of eventDef.reward) {
      switch (reward.type) {
        case EventData.EVENT_REWARD_TYPE.FLAG:
          this.setFlag(reward.value, true);
          break;
        case EventData.EVENT_REWARD_TYPE.GOLD:
          if (gameState.player) {
            gameState.player.gold = (gameState.player.gold || 0) + (reward.amount || 0);
          }
          break;
        case EventData.EVENT_REWARD_TYPE.HINT:
          this.setFlag(`hint:${reward.value}`, true);
          break;
        case EventData.EVENT_REWARD_TYPE.DISCOUNT:
          this.setFlag(`discount:${reward.value}`, true);
          break;
        case EventData.EVENT_REWARD_TYPE.SECRET_REVEAL:
          this.setFlag(`secret:${reward.value}`, true);
          break;
        case EventData.EVENT_REWARD_TYPE.BUFF:
          if (gameState.player && reward.value === 'minor_seal_blessing') {
            StatusManager.apply(gameState.player, STATUS.HASTE, 10);
            addMessage(gameState.messages, '封印柱の祝福を受けた。力が湧く。', 'heal');
          }
          this.setFlag(`buff:${reward.value}`, true);
          break;
        case EventData.EVENT_REWARD_TYPE.ITEM: {
          if (reward.chance && Math.random() > reward.chance) break;
          const item = this._resolveItemReward(reward, gameState);
          if (item && gameState.player) {
            if (gameState.player.inventory.length < MAX_INVENTORY) {
              gameState.player.inventory.push(item);
              addMessage(gameState.messages, `${item.name}を見つけた！`, 'item');
            } else {
              gameState.items.push(item);
              addMessage(gameState.messages, `足元に${item.name}が落ちた。`, 'item');
            }
          }
          break;
        }
      }
    }
  },

  _resolveItemReward(reward, gameState) {
    const floor = gameState.floor || 1;
    const px = gameState.player ? gameState.player.x : 0;
    const py = gameState.player ? gameState.player.y : 0;
    const type = reward.itemType;

    const typeMap = {
      'heal_potion': ITEM_TYPE.HEAL_POTION,
      'big_heal_potion': ITEM_TYPE.BIG_HEAL_POTION,
      'scroll_map': ITEM_TYPE.SCROLL_MAP,
      'food': ITEM_TYPE.FOOD,
      'weapon': ITEM_TYPE.WEAPON,
      'armor': ITEM_TYPE.ARMOR,
    };
    const itemType = typeMap[type];
    if (!itemType && type !== 'special_drop') return null;

    // For weapon/armor, pick a floor-appropriate item
    if (itemType === ITEM_TYPE.WEAPON || itemType === ITEM_TYPE.ARMOR) {
      const candidates = ITEM_DEFS.filter(d => d.type === itemType && d.minFloor <= floor);
      if (candidates.length === 0) return null;
      const def = randPick(candidates);
      const rarity = reward.rarityMin === 'uncommon' ? RARITY.UNCOMMON :
                     reward.rarityMin === 'rare' ? RARITY.RARE : getRarityForFloor(floor);
      return createItem(px, py, def, rarity);
    }

    // For food, pick random food
    if (itemType === ITEM_TYPE.FOOD) {
      const foods = ITEM_DEFS.filter(d => d.type === ITEM_TYPE.FOOD && d.minFloor <= floor);
      if (foods.length === 0) return null;
      return createItem(px, py, randPick(foods), RARITY.COMMON);
    }

    // For specific types (potions, scrolls)
    const def = ITEM_DEFS.find(d => d.type === itemType);
    if (!def) return null;
    return createItem(px, py, def, RARITY.COMMON);
  },

  getHistory() {
    this.ensureState();
    return this.state.history.slice();
  },
};
