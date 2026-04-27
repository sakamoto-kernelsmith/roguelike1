// =============================================================================
// Combat System (with Chain Reactions & Equipment Synergies)
// =============================================================================

function performAttack(attacker, defender) {
  // Evasion check
  const evasionRate = defender.evasion || 0;
  const playerEvasion = (defender.ch === '@' && defender.armor && defender.armor.special === 'evasion') ? 0.15 : 0;
  // Slow reduces evasion
  const slowPenalty = StatusManager.has(defender, STATUS.SLOW) ? 0.1 : 0;
  const finalEvasion = Math.max(0, evasionRate + playerEvasion - slowPenalty);

  if (Math.random() < finalEvasion) {
    return {
      attacker: attacker.name,
      defender: defender.name,
      damage: 0,
      isCrit: false,
      killed: false,
      missed: true,
    };
  }

  const isPlayerAttacker = attacker.ch === '@';
  const atkStat = isPlayerAttacker ? getPlayerAtk(attacker) : attacker.atk;
  const defStat = defender.ch === '@' ? getPlayerDef(defender) : defender.def;

  // ATK modifier from status effects
  const atkMult = StatusManager.getAtkMultiplier(attacker);

  const baseDmg = Math.max(1, Math.floor(atkStat * atkMult) - Math.floor(defStat / 2));
  const variance = randInt(-1, 2);
  const damage = Math.max(1, baseDmg + variance);

  // Critical hit: 10% base, guaranteed if target is stunned (chain reaction)
  const stunCrit = StatusManager.isStunCrit(defender);
  const isCrit = stunCrit || Math.random() < 0.1;
  const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;

  defender.hp -= finalDamage;

  // Weapon special effects on hit (player attacking)
  if (isPlayerAttacker && attacker.weapon) {
    const special = attacker.weapon.special;
    if (special === 'burn') {
      StatusManager.apply(defender, STATUS.BURN, 3);
      // Synergy: fire sword + already burning = splash damage to adjacent
      if (StatusManager.has(defender, STATUS.BURN)) {
        _fireSplash(defender, attacker);
      }
    }
    if (special === 'lifesteal') {
      let heal = Math.max(1, Math.floor(finalDamage * 0.2));
      // Synergy: lifesteal + poisoned target = extra drain
      if (StatusManager.has(defender, STATUS.POISON)) {
        heal = Math.floor(heal * 1.5);
      }
      const healMult = StatusManager.getHealMultiplier(attacker);
      heal = Math.floor(heal * healMult);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }
  }

  // Enemy prefix on-hit effect
  if (!isPlayerAttacker && attacker.prefix && attacker.prefix.onHit) {
    StatusManager.apply(defender, attacker.prefix.onHit, 3);
  }

  return {
    attacker: attacker.name,
    defender: defender.name,
    damage: finalDamage,
    isCrit,
    killed: defender.hp <= 0,
    missed: false,
    stunCrit,
  };
}

// Fire splash: damage enemies adjacent to target (1 tile radius)
function _fireSplash(target, attacker) {
  if (typeof Game === 'undefined' || !Game.state) return;
  const { enemies } = Game.state;
  for (const e of enemies) {
    if (e === target || e.hp <= 0) continue;
    if (manhattanDist(e.x, e.y, target.x, target.y) <= 1) {
      const splash = Math.max(1, Math.floor(attacker.weapon.atk * 0.3));
      e.hp -= splash;
      Effects.spawnParticles(e.x, e.y, '#ff4400', 3);
      Effects.spawnDamageNumber(e.x, e.y, splash, false, false);
    }
  }
}

function processPlayerAttack(player, enemy, messages) {
  const result = performAttack(player, enemy);

  if (result.missed) {
    addMessage(messages, `${enemy.name}は攻撃をかわした！`, 'combat');
    Sound.play('miss');
    DanmakuManager.onPlayerAttack(result, enemy);
    return result;
  }

  let msg = `${enemy.name}に${result.damage}のダメージを与えた。`;
  if (result.stunCrit) msg = 'スタン確定クリティカル！ ' + msg;
  else if (result.isCrit) msg = '会心の一撃！ ' + msg;
  addMessage(messages, msg, 'combat');

  // Effects
  Effects.spawnDamageNumber(enemy.x, enemy.y, result.damage, false, result.isCrit);
  DanmakuManager.onPlayerAttack(result, enemy);
  if (result.isCrit) {
    Effects.screenShake(2);
    Sound.play('crit');
  } else {
    Sound.play('hit');
  }

  // Noise
  const noiseType = result.isCrit ? 'critical' : 'attack';
  NoiseManager.propagate(player.x, player.y, NoiseManager.getActionNoise(noiseType, player), Game.state.enemies, player, messages);

  // Lifesteal message
  if (player.weapon && player.weapon.special === 'lifesteal' && !result.killed) {
    let heal = Math.max(1, Math.floor(result.damage * 0.2));
    if (StatusManager.has(enemy, STATUS.POISON)) heal = Math.floor(heal * 1.5);
    Effects.spawnDamageNumber(player.x, player.y, heal, true, false);
  }

  // Burn message
  if (player.weapon && player.weapon.special === 'burn') {
    addMessage(messages, `${enemy.name}に火傷を与えた！`, 'combat');
  }

  if (result.killed) {
    addMessage(messages, `${enemy.name}を倒した！ (EXP+${enemy.exp})`, 'combat');
    DanmakuManager.onEnemyKilled(enemy, player);
    player.killCount++;
    player.gold += (enemy.gold || 0);
    if (enemy.gold) addMessage(messages, `${enemy.gold}Gを手に入れた。`, 'item');
    Effects.spawnParticles(enemy.x, enemy.y, enemy.color, 10);

    // Kill streak tracking
    player.killStreak = (player.killStreak || 0) + 1;
    if (player.killStreak >= 3) {
      const bonus = player.killStreak * 2;
      player.gold += bonus;
      addMessage(messages, `${player.killStreak}連撃ボーナス！+${bonus}G`, 'item');
    }

    // Quest notification
    QuestManager.notifyKill(enemy.name);

    // Legacy ghost loot
    if (enemy.isLegacyGhost) {
      const loot = LegacyManager.getLoot(enemy);
      if (loot) {
        addMessage(messages, `亡者の影が${loot.data.name}を残した！`, 'important');
      }
    }

    const leveledUp = addExp(player, enemy.exp);
    if (leveledUp) {
      addMessage(messages, `--- レベルアップ！ Lv.${player.level} ---`, 'level');
      // Flavor line
      const flavorLines = LEVELUP_LORE[player.level];
      if (flavorLines) {
        addMessage(messages, randPick(flavorLines), 'level');
      }
      // Stat line
      const statKeys = ['atk', 'def', 'hp'];
      const statKey = randPick(statKeys);
      const statLine = LEVELUP_LORE.statLines[statKey];
      if (statLine) {
        addMessage(messages, randPick(statLine), 'info');
      }
      addMessage(messages, 'HPが全回復した。', 'info');
      DanmakuManager.onLevelUp(player.level);
      Effects.spawnParticles(player.x, player.y, '#c080e0', 15);
      Sound.play('levelup');
      // Tutorial level-up event
      if (typeof TutorialManager !== 'undefined') {
        TutorialManager.handleEvent(Game.state, 'player_level_up', {});
      }
    }
  } else {
    // Reset kill streak on non-consecutive turns (tracked in game.js)
  }

  return result;
}

function processEnemyAttack(result, messages) {
  if (result.missed) {
    addMessage(messages, `${result.attacker}の攻撃をかわした！`, 'combat');
    DanmakuManager.onEvade();
    Sound.play('miss');
    return;
  }
  if (result.isBreath || result.isCharge) return; // Already handled

  // Use enemy-specific attack line if available
  let attackLine = '';
  if (typeof Game !== 'undefined' && Game.state) {
    const attackerEnemy = Game.state.enemies.find(e => e.name === result.attacker && e.hp > 0);
    if (attackerEnemy) {
      const lore = ENEMY_LORE[attackerEnemy.bossType || attackerEnemy.id];
      if (lore && lore.attackLines) {
        attackLine = randPick(lore.attackLines);
      }
    }
  }
  let msg = attackLine
    ? `${attackLine} ${result.damage}のダメージ！`
    : `${result.attacker}から${result.damage}のダメージを受けた。`;
  if (result.isCrit) msg = '痛恨の一撃！ ' + msg;
  addMessage(messages, msg, 'combat');

  // Danmaku: find the attacking enemy for specific comments
  if (typeof Game !== 'undefined' && Game.state) {
    const attackerEnemy = Game.state.enemies.find(e => e.name === result.attacker && e.hp > 0);
    DanmakuManager.onPlayerDamaged(result, attackerEnemy);
  }

  if (typeof Game !== 'undefined' && Game.state) {
    const player = Game.state.player;
    Effects.spawnDamageNumber(player.x, player.y, result.damage, false, result.isCrit);

    // Counter shield: reflect damage on stun
    if (player.armor && player.armor.special === 'counter' && result.damage > 0) {
      const counterDmg = Math.max(1, Math.floor(getPlayerDef(player) * 0.5));
      // Find the attacking enemy
      const attacker = Game.state.enemies.find(e => e.name === result.attacker && e.hp > 0);
      if (attacker) {
        attacker.hp -= counterDmg;
        addMessage(messages, `反撃の盾！${attacker.name}に${counterDmg}ダメージ！`, 'combat');
        Effects.spawnDamageNumber(attacker.x, attacker.y, counterDmg, false, false);
        Effects.spawnParticles(attacker.x, attacker.y, '#dd6644', 4);
      }
    }
  }

  if (result.isCrit) {
    Effects.screenShake(3);
    Sound.play('crit');
  } else {
    Effects.screenShake(1);
    Sound.play('hit');
  }
}
