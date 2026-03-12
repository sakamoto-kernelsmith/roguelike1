// =============================================================================
// Combat System
// =============================================================================

function performAttack(attacker, defender) {
  const atkStat = attacker.baseAtk !== undefined
    ? getPlayerAtk(attacker) : attacker.atk;
  const defStat = defender.baseAtk !== undefined
    ? getPlayerDef(defender) : defender.def;

  // Damage formula: atk - def/2 + random variance
  const baseDmg = Math.max(1, atkStat - Math.floor(defStat / 2));
  const variance = randInt(-1, 2);
  const damage = Math.max(1, baseDmg + variance);

  // Critical hit (10% chance)
  const isCrit = Math.random() < 0.1;
  const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;

  defender.hp -= finalDamage;

  return {
    attacker: attacker.name,
    defender: defender.name,
    damage: finalDamage,
    isCrit,
    killed: defender.hp <= 0,
  };
}

function processPlayerAttack(player, enemy, messages) {
  const result = performAttack(player, enemy);
  let msg = `${enemy.name}に${result.damage}のダメージを与えた。`;
  if (result.isCrit) msg = `会心の一撃！ ` + msg;
  addMessage(messages, msg, 'combat');

  if (result.killed) {
    addMessage(messages, `${enemy.name}を倒した！ (EXP+${enemy.exp})`, 'combat');
    player.killCount++;
    const leveledUp = addExp(player, enemy.exp);
    if (leveledUp) {
      addMessage(messages, `レベルアップ！ Lv.${player.level} になった！ HPが全回復した。`, 'level');
    }
  }

  return result;
}

function processEnemyAttack(result, messages) {
  let msg = `${result.attacker}から${result.damage}のダメージを受けた。`;
  if (result.isCrit) msg = `痛恨の一撃！ ` + msg;
  addMessage(messages, msg, 'combat');
}
