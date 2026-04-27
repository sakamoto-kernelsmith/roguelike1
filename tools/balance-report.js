const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CONSTANTS_PATH = path.join(ROOT, 'js', 'constants.js');
const REPORT_PATH = path.join(ROOT, 'BALANCE_REPORT.md');

function loadConstants() {
  const code = fs.readFileSync(CONSTANTS_PATH, 'utf8') + `
;({
  LEVEL_TABLE,
  ENEMY_DEFS,
  ITEM_DEFS,
  BOSS_DEFS,
  ITEM_TYPE,
  RARITY
})`;

  return vm.runInNewContext(code, { Math, Object });
}

function mean(min, max) {
  return (min + max) / 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function expectedDamage(atk, def, critRate = 0.1, critMult = 1.5) {
  const base = Math.max(1, atk - Math.floor(def / 2));
  const avgVariance = 0.5;
  const avgHit = Math.max(1, base + avgVariance);
  return avgHit * (1 + critRate * (critMult - 1));
}

function turnsToKill(hp, damagePerTurn) {
  return Math.ceil(hp / Math.max(0.01, damagePerTurn));
}

function cumulativeExpToReachLevel(levelTable, targetLevel) {
  let total = 0;
  for (let level = 1; level < targetLevel; level++) {
    total += levelTable[level - 1].expReq;
  }
  return total;
}

function getWeaponOptions(data, floor) {
  return data.ITEM_DEFS.filter((item) => item.type === data.ITEM_TYPE.WEAPON && item.minFloor <= floor);
}

function getArmorOptions(data, floor) {
  return data.ITEM_DEFS.filter((item) => item.type === data.ITEM_TYPE.ARMOR && item.minFloor <= floor);
}

function pickScenarioGear(data, floor, scenario) {
  const weapons = getWeaponOptions(data, floor).slice().sort((a, b) => a.atk - b.atk);
  const armors = getArmorOptions(data, floor).slice().sort((a, b) => a.def - b.def);

  const pick = (items, statKey) => {
    if (items.length === 0) return null;
    if (scenario === 'sparse') return items.find((item) => item.rarity === data.RARITY.COMMON) || items[0];
    if (scenario === 'expected') {
      const allowed = items.filter((item) => {
        if (floor <= 3) return item.rarity === data.RARITY.COMMON;
        if (floor <= 6) return item.rarity !== data.RARITY.LEGENDARY;
        return true;
      });
      return (allowed.length ? allowed : items).sort((a, b) => a[statKey] - b[statKey]).at(-1);
    }
    return items.at(-1);
  };

  return {
    weapon: pick(weapons, 'atk'),
    armor: pick(armors, 'def'),
  };
}

function buildPlayerState(data, floor, scenario) {
  const targetLevel = clamp(
    scenario === 'sparse' ? Math.max(1, floor - 1)
      : scenario === 'expected' ? Math.max(1, Math.ceil(floor * 0.8))
      : Math.max(1, Math.ceil(floor * 0.9)),
    1,
    data.LEVEL_TABLE.length
  );
  const base = data.LEVEL_TABLE[targetLevel - 1];
  const gear = pickScenarioGear(data, floor, scenario);

  return {
    floor,
    scenario,
    level: targetLevel,
    hp: base.hp,
    atk: base.atk + (gear.weapon ? gear.weapon.atk : 0),
    def: base.def + (gear.armor ? gear.armor.def : 0),
    weapon: gear.weapon,
    armor: gear.armor,
  };
}

function weightForEnemy(enemy, floor) {
  if (floor >= enemy.minFloor + 3) return 5;
  if (floor >= enemy.minFloor) return 15;
  return 1;
}

function weightedEnemyPool(data, floor) {
  return data.ENEMY_DEFS
    .filter((enemy) => enemy.minFloor <= floor)
    .map((enemy) => ({ ...enemy, weight: weightForEnemy(enemy, floor) }));
}

function weightedAverage(items, valueFn) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return items.reduce((sum, item) => sum + valueFn(item) * item.weight, 0) / totalWeight;
}

function floorExpEstimate(data, floor) {
  const isBossFloor = !!data.BOSS_DEFS[floor];
  const pool = weightedEnemyPool(data, floor);
  const regularCount = isBossFloor ? Math.max(2, mean(3, 7) - 2) : mean(3, 7) + Math.floor(floor / 2);
  const avgEnemyExp = weightedAverage(pool, (enemy) => enemy.exp);
  const avgEnemyGold = weightedAverage(pool, (enemy) => enemy.gold || 0);
  const bossExp = isBossFloor ? data.BOSS_DEFS[floor].exp : 0;
  const bossGold = isBossFloor ? data.BOSS_DEFS[floor].gold : 0;

  return {
    floor,
    enemyCount: regularCount + (isBossFloor ? 1 : 0),
    exp: regularCount * avgEnemyExp + bossExp,
    gold: regularCount * avgEnemyGold + bossGold,
  };
}

function comparePlayerVsEnemy(player, enemy) {
  const playerDpt = expectedDamage(player.atk, enemy.def);
  const enemyDpt = expectedDamage(enemy.atk, player.def, 0.1);
  const playerTtk = turnsToKill(enemy.hp, playerDpt);
  const enemyTtk = turnsToKill(player.hp, enemyDpt);
  const safetyRatio = enemyTtk / Math.max(1, playerTtk);

  return { playerDpt, enemyDpt, playerTtk, enemyTtk, safetyRatio };
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function printHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function rewardMilestones(data) {
  const firstSpecialWeapon = data.ITEM_DEFS
    .filter((item) => item.type === data.ITEM_TYPE.WEAPON && item.special)
    .sort((a, b) => a.minFloor - b.minFloor)[0];
  const firstSpecialArmor = data.ITEM_DEFS
    .filter((item) => item.type === data.ITEM_TYPE.ARMOR && item.special)
    .sort((a, b) => a.minFloor - b.minFloor)[0];
  const firstBigPotion = data.ITEM_DEFS
    .filter((item) => item.type === data.ITEM_TYPE.BIG_HEAL_POTION)
    .sort((a, b) => a.minFloor - b.minFloor)[0];

  return { firstSpecialWeapon, firstSpecialArmor, firstBigPotion };
}

function earlyGameAssessment(data, expRows) {
  const expectedF1 = buildPlayerState(data, 1, 'expected');
  const expectedF2 = buildPlayerState(data, 2, 'expected');
  const expectedF3 = buildPlayerState(data, 3, 'expected');
  const f1Safety = weightedAverage(weightedEnemyPool(data, 1), (enemy) => comparePlayerVsEnemy(expectedF1, enemy).safetyRatio);
  const f2Safety = weightedAverage(weightedEnemyPool(data, 2), (enemy) => comparePlayerVsEnemy(expectedF2, enemy).safetyRatio);
  const f3Safety = weightedAverage(weightedEnemyPool(data, 3), (enemy) => comparePlayerVsEnemy(expectedF3, enemy).safetyRatio);
  const milestones = rewardMilestones(data);
  const firstLevelUpFloor = expRows.find((row) => row.reachableLevel >= 2)?.floor ?? null;
  const firstLv3Floor = expRows.find((row) => row.reachableLevel >= 3)?.floor ?? null;

  const scoreParts = [];
  scoreParts.push(firstLevelUpFloor && firstLevelUpFloor <= 1 ? 2 : firstLevelUpFloor && firstLevelUpFloor <= 2 ? 1 : 0);
  scoreParts.push(firstLv3Floor && firstLv3Floor <= 3 ? 2 : firstLv3Floor && firstLv3Floor <= 4 ? 1 : 0);
  scoreParts.push(milestones.firstSpecialWeapon && milestones.firstSpecialWeapon.minFloor <= 4 ? 2 : milestones.firstSpecialArmor && milestones.firstSpecialArmor.minFloor <= 4 ? 1 : 0);
  scoreParts.push(f1Safety >= 6 && f2Safety >= 6 ? 2 : f1Safety >= 4 && f2Safety >= 4 ? 1 : 0);

  const score = scoreParts.reduce((a, b) => a + b, 0);
  const verdict = score <= 3 ? 'weak' : score <= 6 ? 'mixed' : 'strong';

  return {
    firstLevelUpFloor,
    firstLv3Floor,
    earlySafety: { f1Safety, f2Safety, f3Safety },
    milestones,
    score,
    verdict,
  };
}

function lateGameAssessment(data) {
  const rows = [];
  for (let floor = 8; floor <= 10; floor++) {
    const player = buildPlayerState(data, floor, 'expected');
    const pool = weightedEnemyPool(data, floor);
    const avgSafety = weightedAverage(pool, (enemy) => comparePlayerVsEnemy(player, enemy).safetyRatio);
    rows.push({ floor, avgSafety });
  }
  const verdict = rows.every((row) => row.avgSafety > 8) ? 'too_easy'
    : rows.some((row) => row.avgSafety < 1.5) ? 'too_hard'
    : 'acceptable';
  return { rows, verdict };
}

function recommendations(early, late, expRows) {
  const recs = [];
  if (early.firstLevelUpFloor > 1) {
    recs.push('Floor 1 の敵経験値か敵数を少し増やし、最初のレベルアップを遅くとも Floor 1 終了時に起こす。');
  } else {
    recs.push('最初のレベルアップは Floor 1 で起きており良好。維持してよい。');
  }

  if (!early.milestones.firstSpecialWeapon || early.milestones.firstSpecialWeapon.minFloor > 4) {
    recs.push('Floor 2?4 のどこかで、特殊効果付き装備か明確なシナジー装備を1回見せる。最初の「ご褒美」が遅い。');
  } else {
    recs.push(`特殊効果付き武器の初出は Floor ${early.milestones.firstSpecialWeapon.minFloor}。初回の驚きとしては十分早い。`);
  }

  if (late.verdict === 'too_easy') {
    recs.push('Floor 8?10 は通常敵の圧が弱い。終盤敵のHP/防御を少し上げるか、終盤装備の伸びを抑える。後半は厳しめでよい。');
  }

  const levelAt10 = expRows.find((row) => row.floor === 10)?.reachableLevel ?? 0;
  recs.push(levelAt10 < 8
    ? 'Floor 10 到達時の期待レベルが低い。中盤後半の経験値量を見直す。'
    : `Floor 10 到達時の期待レベルは Lv${levelAt10} 前後で、2?3時間クリア想定としては妥当。`);
  recs.push('最初の30分のご褒美は「レベルアップ」「装備更新」「特殊効果の発見」を最低1回ずつ保証する設計に寄せる。');
  recs.push('後半は通常戦を厳しめにしてよいが、ボスは対策で越えられる接戦を維持する。');
  recs.push('商人は序盤 1 回保証を検討する。Floor 2?3 で補給体験がないと経済要素の魅力が立ちにくい。');
  return recs;
}

function buildMarkdownReport(expRows, early, late, recs) {
  const lines = [];
  lines.push('# Rogue Depths Balance Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Early game reward pacing: \`${early.verdict}\` (score ${early.score}/8)`);
  lines.push(`- Late game pressure: \`${late.verdict}\``);
  lines.push(`- Expected level at Floor 10: \`Lv${expRows.find((row) => row.floor === 10)?.reachableLevel ?? 'n/a'}\``);
  lines.push('');
  lines.push('## Early Game');
  lines.push('');
  lines.push(`- First level-up reaches by: Floor ${early.firstLevelUpFloor ?? 'n/a'}`);
  lines.push(`- First Lv3 reaches by: Floor ${early.firstLv3Floor ?? 'n/a'}`);
  lines.push(`- First special weapon floor: ${early.milestones.firstSpecialWeapon ? early.milestones.firstSpecialWeapon.minFloor : 'none'}`);
  lines.push(`- First special armor floor: ${early.milestones.firstSpecialArmor ? early.milestones.firstSpecialArmor.minFloor : 'none'}`);
  lines.push(`- Early safety ratios: F1 ${formatNumber(early.earlySafety.f1Safety, 2)}, F2 ${formatNumber(early.earlySafety.f2Safety, 2)}, F3 ${formatNumber(early.earlySafety.f3Safety, 2)}`);
  lines.push('');
  lines.push('Interpretation: the player should see a reward quickly. The current build already levels up on Floor 1, but the first truly distinctive build reward should be deliberately surfaced, not left entirely to random drops.');
  lines.push('');
  lines.push('## Level Pace');
  lines.push('');
  for (const row of expRows) {
    lines.push(`- Floor ${row.floor}: exp +${formatNumber(row.expGain)} | total ${formatNumber(row.cumulativeExp)} | approx Lv ${row.reachableLevel}`);
  }
  lines.push('');
  lines.push('## Late Game');
  lines.push('');
  for (const row of late.rows) {
    lines.push(`- Floor ${row.floor}: average safety ratio ${formatNumber(row.avgSafety, 2)}`);
  }
  lines.push('');
  lines.push('Interpretation: late floors can be stricter than early floors. Current coarse estimates suggest the late game may be too forgiving for a well-equipped run, so difficulty budget can be shifted later without harming first-run onboarding.');
  lines.push('');
  lines.push('## Recommendations For Implementation');
  lines.push('');
  for (const rec of recs) {
    lines.push(`- ${rec}`);
  }
  lines.push('');
  lines.push('## Immediate Tooling Use');
  lines.push('');
  lines.push('- Run `node tools/balance-report.js` after changing `LEVEL_TABLE`, `ENEMY_DEFS`, `ITEM_DEFS`, or boss stats.');
  lines.push('- Treat this as a coarse balance gate, then verify with playtests.');
  lines.push('- Use the early-game section to protect onboarding fun, and the late-game section to tune pressure.');
  lines.push('');
  return lines.join('\n') + '\n';
}

function run() {
  const data = loadConstants();
  const scenarios = ['sparse', 'expected', 'rich'];

  printHeader('Balance Targets');
  console.log('Expected clear time: 2-3 hours for 10 floors');
  console.log('Check sparse/expected/rich scenarios for progression spread');

  printHeader('Level Pace');
  const expRows = [];
  let cumulativeExp = 0;
  for (let floor = 1; floor <= 10; floor++) {
    const estimate = floorExpEstimate(data, floor);
    cumulativeExp += estimate.exp;
    const reachableLevel = data.LEVEL_TABLE.findLastIndex((_, idx) => cumulativeExp >= cumulativeExpToReachLevel(data.LEVEL_TABLE, idx + 1)) + 1;
    expRows.push({ floor, expGain: estimate.exp, cumulativeExp, reachableLevel });
  }
  for (const row of expRows) {
    console.log(`F${row.floor}: exp +${formatNumber(row.expGain)} | total ${formatNumber(row.cumulativeExp)} | approx Lv ${row.reachableLevel}`);
  }

  const early = earlyGameAssessment(data, expRows);
  const late = lateGameAssessment(data);
  const recs = recommendations(early, late, expRows);

  printHeader('Early Game Rewards');
  console.log(`First level-up by Floor ${early.firstLevelUpFloor}`);
  console.log(`First Lv3 by Floor ${early.firstLv3Floor}`);
  console.log(`First special weapon: ${early.milestones.firstSpecialWeapon ? `${early.milestones.firstSpecialWeapon.name} (F${early.milestones.firstSpecialWeapon.minFloor})` : 'none'}`);
  console.log(`First special armor: ${early.milestones.firstSpecialArmor ? `${early.milestones.firstSpecialArmor.name} (F${early.milestones.firstSpecialArmor.minFloor})` : 'none'}`);
  console.log(`Safety ratios F1/F2/F3: ${formatNumber(early.earlySafety.f1Safety, 2)} / ${formatNumber(early.earlySafety.f2Safety, 2)} / ${formatNumber(early.earlySafety.f3Safety, 2)}`);
  console.log(`Early reward verdict: ${early.verdict} (${early.score}/8)`);

  printHeader('Scenario Gear');
  for (const scenario of scenarios) {
    console.log(`\n[${scenario}]`);
    for (let floor = 1; floor <= 10; floor++) {
      const player = buildPlayerState(data, floor, scenario);
      console.log(`F${floor}: Lv${player.level} HP ${player.hp} ATK ${player.atk} DEF ${player.def} | W:${player.weapon ? player.weapon.name : '-'} A:${player.armor ? player.armor.name : '-'}`);
    }
  }

  printHeader('Expected Scenario Floor Pressure');
  for (let floor = 1; floor <= 10; floor++) {
    const player = buildPlayerState(data, floor, 'expected');
    const pool = weightedEnemyPool(data, floor);
    const avgSafety = weightedAverage(pool, (enemy) => comparePlayerVsEnemy(player, enemy).safetyRatio);
    const worst = pool.map((enemy) => ({ enemy, match: comparePlayerVsEnemy(player, enemy) })).sort((a, b) => a.match.safetyRatio - b.match.safetyRatio)[0];
    console.log(`F${floor}: avg safety ${formatNumber(avgSafety, 2)} | worst ${worst.enemy.name} ttk ${worst.match.playerTtk}/${worst.match.enemyTtk} ratio ${formatNumber(worst.match.safetyRatio, 2)}`);
  }

  printHeader('Boss Checks');
  for (const [floorKey, boss] of Object.entries(data.BOSS_DEFS)) {
    const floor = Number(floorKey);
    const player = buildPlayerState(data, floor, 'expected');
    const match = comparePlayerVsEnemy(player, boss);
    console.log(`F${floor} ${boss.name}: player ttk ${match.playerTtk} | boss ttk ${match.enemyTtk} | ratio ${formatNumber(match.safetyRatio, 2)}`);
  }

  printHeader('Quick Flags');
  const flags = [];
  for (const row of expRows) {
    if (row.floor === 3 && row.reachableLevel > 4) flags.push('Floor 3 progression may be too fast.');
    if (row.floor === 6 && row.reachableLevel < 4) flags.push('Floor 6 progression may be too slow.');
    if (row.floor === 10 && row.reachableLevel < 8) flags.push('Floor 10 expected level may be too low.');
  }
  for (let floor = 1; floor <= 10; floor++) {
    const player = buildPlayerState(data, floor, 'expected');
    const pool = weightedEnemyPool(data, floor);
    const worst = pool.map((enemy) => comparePlayerVsEnemy(player, enemy)).sort((a, b) => a.safetyRatio - b.safetyRatio)[0];
    if (floor <= 3 && worst.safetyRatio < 1.5) flags.push(`Early floor ${floor} may be too punishing.`);
    if (floor >= 8 && worst.safetyRatio > 3.5) flags.push(`Late floor ${floor} may be too easy.`);
  }
  if (flags.length === 0) {
    console.log('No major red flags from the coarse model.');
  } else {
    for (const flag of flags) console.log(`- ${flag}`);
  }

  printHeader('Implementation Recommendations');
  for (const rec of recs) {
    console.log(`- ${rec}`);
  }

  const markdown = buildMarkdownReport(expRows, early, late, recs);
  fs.writeFileSync(REPORT_PATH, markdown, 'utf8');
  console.log(`\nMarkdown report written to ${path.basename(REPORT_PATH)}`);
}

run();
