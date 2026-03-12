// =============================================================================
// Status Effect System (with Chain Reactions)
// =============================================================================

const StatusManager = {
  apply(entity, type, duration) {
    if (!entity.statusEffects) entity.statusEffects = [];

    // Chain reaction: poison + poison_gas extends duration
    if (type === STATUS.POISON && this.has(entity, STATUS.POISON)) {
      const existing = entity.statusEffects.find(s => s.type === STATUS.POISON);
      if (existing) {
        existing.duration += Math.floor(duration / 2);
        return;
      }
    }

    // Chain reaction: poison + burn = weakness
    if (type === STATUS.BURN && this.has(entity, STATUS.POISON)) {
      this._applyCombo(entity, STATUS.WEAKNESS, 2, 'poison_burn');
    }
    if (type === STATUS.POISON && this.has(entity, STATUS.BURN)) {
      this._applyCombo(entity, STATUS.WEAKNESS, 2, 'poison_burn');
    }

    const existing = entity.statusEffects.find(s => s.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      return;
    }
    entity.statusEffects.push({ type, duration });

    // Tutorial status event
    if (typeof TutorialManager !== 'undefined' && typeof Game !== 'undefined' && Game.state) {
      const statusName = Object.keys(STATUS).find(k => STATUS[k] === type);
      if (statusName && entity.ch !== '@') {
        TutorialManager.handleEvent(Game.state, 'status_applied', { status: statusName.toLowerCase(), target: entity.id });
      }
    }
  },

  _applyCombo(entity, type, duration, comboName) {
    if (!entity.statusEffects) entity.statusEffects = [];
    const existing = entity.statusEffects.find(s => s.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      entity.statusEffects.push({ type, duration });
    }
  },

  remove(entity, type) {
    if (!entity.statusEffects) return;
    entity.statusEffects = entity.statusEffects.filter(s => s.type !== type);
  },

  has(entity, type) {
    return entity.statusEffects && entity.statusEffects.some(s => s.type === type);
  },

  clear(entity) {
    entity.statusEffects = [];
  },

  tick(entity, messages) {
    if (!entity.statusEffects || entity.statusEffects.length === 0) return;
    const isPlayer = entity.ch === '@';

    for (const effect of entity.statusEffects) {
      switch (effect.type) {
        case STATUS.POISON:
          entity.hp -= 2;
          if (isPlayer) {
            addMessage(messages, '毒のダメージ！(HP-2)', 'combat');
            Effects.flashScreen('#00ff0040');
          }
          Effects.spawnDamageNumber(entity.x, entity.y, 2, false, false);
          break;
        case STATUS.BURN:
          entity.hp -= 3;
          if (isPlayer) addMessage(messages, '火傷のダメージ！(HP-3)', 'combat');
          Effects.spawnDamageNumber(entity.x, entity.y, 3, false, false);
          break;
        case STATUS.WEAKNESS:
          // Halve healing received (checked elsewhere), show indicator
          if (isPlayer && effect.duration === 1) {
            addMessage(messages, '衰弱が治った。', 'info');
          }
          break;
      }
      effect.duration--;
    }
    entity.statusEffects = entity.statusEffects.filter(s => s.duration > 0);
  },

  getAtkMultiplier(entity) {
    return this.has(entity, STATUS.BURN) ? 0.5 : 1.0;
  },

  // Weakness halves healing
  getHealMultiplier(entity) {
    return this.has(entity, STATUS.WEAKNESS) ? 0.5 : 1.0;
  },

  canAct(entity) {
    if (this.has(entity, STATUS.STUN)) return false;
    if (this.has(entity, STATUS.SLOW)) {
      return (entity.turnCount || 0) % 2 === 0;
    }
    return true;
  },

  hasHaste(entity) {
    return this.has(entity, STATUS.HASTE);
  },

  // Chain: stun target = guaranteed crit on next melee hit
  isStunCrit(defender) {
    return this.has(defender, STATUS.STUN);
  },

  // Chain: slow reduces trap evasion and escape ability
  hasTrapPenalty(entity) {
    return this.has(entity, STATUS.SLOW);
  },

  getDisplayIcons(entity) {
    if (!entity.statusEffects) return [];
    return entity.statusEffects.map(s => {
      switch (s.type) {
        case STATUS.POISON:   return { ch: '毒', color: '#40dd40', dur: s.duration };
        case STATUS.STUN:     return { ch: '★', color: '#ffff40', dur: s.duration };
        case STATUS.BURN:     return { ch: '火', color: '#ff6633', dur: s.duration };
        case STATUS.HASTE:    return { ch: '速', color: '#40ddff', dur: s.duration };
        case STATUS.SLOW:     return { ch: '鈍', color: '#8888aa', dur: s.duration };
        case STATUS.WEAKNESS: return { ch: '弱', color: '#cc8844', dur: s.duration };
        default: return null;
      }
    }).filter(Boolean);
  },
};
