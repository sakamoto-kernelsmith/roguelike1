// =============================================================================
// Player Skill System
// =============================================================================

const SkillManager = {
  skills: null,

  init() {
    // Skills disabled for now
    this.skills = [];
  },

  getSkill(id) {
    return this.skills.find(s => s.id === id);
  },

  getSkillByKey(key) {
    return this.skills.find(s => s.key === key.toLowerCase());
  },

  isReady(id) {
    const skill = this.getSkill(id);
    return skill && skill.currentCd <= 0;
  },

  tickCooldowns(player) {
    for (const skill of this.skills) {
      if (skill.currentCd > 0) {
        skill.currentCd--;
        // Haste bonus: extra CD reduction
        if (player && StatusManager.hasHaste(player) && skill.currentCd > 0) {
          skill.currentCd--;
        }
      }
    }
  },

  // Returns true if action was taken
  execute(skillId, player, state) {
    const skill = this.getSkill(skillId);
    if (!skill) return false;
    if (skill.currentCd > 0) {
      addMessage(state.messages, `${skill.name}はクールダウン中！(残り${skill.currentCd}ターン)`, 'system');
      return false;
    }

    switch (skillId) {
      case 'power_slash':   return this._powerSlash(skill, player, state);
      case 'shield_bash':   return this._shieldBash(skill, player, state);
      case 'poison_strike': return this._poisonStrike(skill, player, state);
      case 'blink':         return this._blink(skill, player, state);
    }
    return false;
  },

  _findAdjacentEnemy(player, enemies) {
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const d = manhattanDist(player.x, player.y, e.x, e.y);
      if (d === 1 && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  },

  _handleKill(enemy, player, messages) {
    addMessage(messages, `${enemy.name}を倒した！(EXP+${enemy.exp})`, 'combat');
    player.killCount++;
    player.gold = (player.gold || 0) + (enemy.gold || 0);
    if (enemy.gold) addMessage(messages, `${enemy.gold}Gを手に入れた。`, 'item');
    Effects.spawnParticles(enemy.x, enemy.y, enemy.color, 10);
    Sound.play('hit');
    const leveledUp = addExp(player, enemy.exp);
    if (leveledUp) {
      addMessage(messages, `--- レベルアップ！ Lv.${player.level} ---`, 'level');
      const flavorLines = LEVELUP_LORE[player.level];
      if (flavorLines) {
        addMessage(messages, randPick(flavorLines), 'level');
      }
      const statKey = randPick(['atk', 'def', 'hp']);
      const statLine = LEVELUP_LORE.statLines[statKey];
      if (statLine) {
        addMessage(messages, randPick(statLine), 'info');
      }
      addMessage(messages, 'HPが全回復した。', 'info');
      DanmakuManager.onLevelUp(player.level);
      Effects.spawnParticles(player.x, player.y, '#c080e0', 15);
      Sound.play('levelup');
    }
  },

  _powerSlash(skill, player, state) {
    const target = this._findAdjacentEnemy(player, state.enemies);
    if (!target) {
      addMessage(state.messages, '隣接する敵がいない！', 'system');
      return false;
    }
    const atk = getPlayerAtk(player) * StatusManager.getAtkMultiplier(player);
    const damage = Math.max(1, Math.floor(atk * 2) - Math.floor(target.def / 2));
    target.hp -= damage;
    addMessage(state.messages, `パワースラッシュ！${target.name}に${damage}ダメージ！`, 'combat');
    Effects.spawnDamageNumber(target.x, target.y, damage, false, true);
    Effects.screenShake(3);
    Effects.spawnParticles(target.x, target.y, '#ffcc00', 6);
    Sound.play('skill');
    if (target.hp <= 0) this._handleKill(target, player, state.messages);
    skill.currentCd = skill.cooldown;
    return true;
  },

  _shieldBash(skill, player, state) {
    const target = this._findAdjacentEnemy(player, state.enemies);
    if (!target) {
      addMessage(state.messages, '隣接する敵がいない！', 'system');
      return false;
    }
    const damage = Math.max(1, getPlayerDef(player));
    target.hp -= damage;
    StatusManager.apply(target, STATUS.STUN, 2);
    addMessage(state.messages, `シールドバッシュ！${target.name}に${damage}ダメージ+スタン！`, 'combat');
    Effects.spawnDamageNumber(target.x, target.y, damage, false, false);
    Effects.spawnParticles(target.x, target.y, '#ffff40', 6);
    Sound.play('skill');
    if (target.hp <= 0) this._handleKill(target, player, state.messages);
    skill.currentCd = skill.cooldown;
    return true;
  },

  _poisonStrike(skill, player, state) {
    const target = this._findAdjacentEnemy(player, state.enemies);
    if (!target) {
      addMessage(state.messages, '隣接する敵がいない！', 'system');
      return false;
    }
    const atk = getPlayerAtk(player) * StatusManager.getAtkMultiplier(player);
    const damage = Math.max(1, Math.floor(atk) - Math.floor(target.def / 2));
    target.hp -= damage;
    StatusManager.apply(target, STATUS.POISON, 5);
    addMessage(state.messages, `ポイズンストライク！${target.name}に${damage}ダメージ+毒！`, 'combat');
    Effects.spawnDamageNumber(target.x, target.y, damage, false, false);
    Effects.spawnParticles(target.x, target.y, '#40dd40', 6);
    Sound.play('skill');
    if (target.hp <= 0) this._handleKill(target, player, state.messages);
    skill.currentCd = skill.cooldown;
    return true;
  },

  _blink(skill, player, state) {
    const { map, enemies, messages } = state;
    // Teleport up to 3 tiles in last movement direction, or farthest open tile
    const dx = player.lastDx || 0;
    const dy = player.lastDy || 0;

    let bestX = player.x, bestY = player.y;
    let moved = false;

    if (dx !== 0 || dy !== 0) {
      // Try to blink in the facing direction
      for (let step = 3; step >= 1; step--) {
        const nx = player.x + dx * step;
        const ny = player.y + dy * step;
        if (inBounds(nx, ny) && isWalkable(map[ny][nx]) &&
            !enemies.some(e => e.hp > 0 && e.x === nx && e.y === ny)) {
          bestX = nx;
          bestY = ny;
          moved = true;
          break;
        }
      }
    }

    if (!moved) {
      // Random blink within 3 tiles
      const candidates = [];
      for (let dy2 = -3; dy2 <= 3; dy2++) {
        for (let dx2 = -3; dx2 <= 3; dx2++) {
          if (dx2 === 0 && dy2 === 0) continue;
          if (Math.abs(dx2) + Math.abs(dy2) > 3) continue;
          const nx = player.x + dx2;
          const ny = player.y + dy2;
          if (inBounds(nx, ny) && isWalkable(map[ny][nx]) &&
              !enemies.some(e => e.hp > 0 && e.x === nx && e.y === ny)) {
            candidates.push({ x: nx, y: ny });
          }
        }
      }
      if (candidates.length > 0) {
        const dest = randPick(candidates);
        bestX = dest.x;
        bestY = dest.y;
        moved = true;
      }
    }

    if (!moved) {
      addMessage(messages, '瞬歩できる場所がない！', 'system');
      return false;
    }

    Effects.spawnParticles(player.x, player.y, '#40ddff', 8);
    player.x = bestX;
    player.y = bestY;
    Effects.spawnParticles(player.x, player.y, '#40ddff', 8);
    addMessage(messages, '瞬歩！瞬時に移動した。', 'info');
    Sound.play('blink');
    // Synergy: evasion armor + blink = temporary evasion boost
    if (player.armor && player.armor.special === 'evasion') {
      player._blinkEvasionTurns = 2;
      addMessage(messages, '回避の鎧が輝く！回避率一時上昇！', 'info');
    }
    skill.currentCd = skill.cooldown;
    return true;
  },
};
