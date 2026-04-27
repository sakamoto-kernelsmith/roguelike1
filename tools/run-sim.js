const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CONSTANTS_PATH = path.join(ROOT, 'js', 'constants.js');
const REPORT_PATH = path.join(ROOT, 'SIM_REPORT.md');

function loadConstants() {
  const code = fs.readFileSync(CONSTANTS_PATH, 'utf8') + `
;({
  LEVEL_TABLE,
  ENEMY_DEFS,
  ITEM_DEFS,
  BOSS_DEFS,
  ITEM_TYPE,
  RARITY,
  DUNGEON,
  MERCHANT_CHANCE,
  HUNGER_MAX,
  HUNGER_DECAY,
  MAX_FLOOR
})`;
  return vm.runInNewContext(code, { Math, Object });
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight || 1;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function expectedBaseDamage(atk, def) {
  return Math.max(1, atk - Math.floor(def / 2));
}

function rarityMultiplier(rarity) {
  switch (rarity) {
    case 'uncommon': return 1.2;
    case 'rare': return 1.5;
    case 'legendary': return 1.8;
    default: return 1.0;
  }
}

function getRarityForFloor(floor) {
  const roll = Math.random();
  if (floor >= 7) {
    if (roll < 0.05) return 'legendary';
    if (roll < 0.20) return 'rare';
    if (roll < 0.50) return 'uncommon';
    return 'common';
  }
  if (floor >= 4) {
    if (roll < 0.02) return 'legendary';
    if (roll < 0.12) return 'rare';
    if (roll < 0.35) return 'uncommon';
    return 'common';
  }
  if (roll < 0.05) return 'rare';
  if (roll < 0.20) return 'uncommon';
  return 'common';
}

function getEnemyPool(data, floor) {
  return data.ENEMY_DEFS
    .filter((enemy) => enemy.minFloor <= floor)
    .map((enemy) => ({ ...enemy, weight: floor >= enemy.minFloor + 3 ? 5 : 15 }));
}

function createPlayer(data, policy) {
  const base = data.LEVEL_TABLE[0];
  return {
    hp: base.hp,
    maxHp: base.hp,
    baseAtk: base.atk,
    baseDef: base.def,
    level: 1,
    exp: 0,
    gold: 0,
    weapon: null,
    armor: null,
    potions: 0,
    bigPotions: 0,
    food: 0,
    hunger: data.HUNGER_MAX,
    floorTurns: 0,
    totalTurns: 0,
    policy,
    rewards: {
      leveledOnFloor1: false,
      firstSpecialFloor: null,
      firstMerchantFloor: null,
      firstUpgradeFloor: null,
    },
  };
}

function getPlayerAtk(player) {
  return player.baseAtk + (player.weapon ? player.weapon.atk : 0);
}

function getPlayerDef(player) {
  return player.baseDef + (player.armor ? player.armor.def : 0);
}

function gainExp(data, player, amount, floor) {
  player.exp += amount;
  while (player.level < data.LEVEL_TABLE.length) {
    const req = data.LEVEL_TABLE[player.level - 1].expReq;
    if (player.exp < req) break;
    player.exp -= req;
    player.level += 1;
    const stats = data.LEVEL_TABLE[player.level - 1];
    player.maxHp = stats.hp;
    player.hp = player.maxHp;
    player.baseAtk = stats.atk;
    player.baseDef = stats.def;
    if (floor === 1) player.rewards.leveledOnFloor1 = true;
  }
}

function maybeUseHealing(player) {
  const threshold = player.policy === 'aggressive' ? 0.35 : player.policy === 'careful' ? 0.6 : 0.5;
  if (player.hp / player.maxHp > threshold) return;
  if (player.bigPotions > 0 && player.hp <= player.maxHp * 0.4) {
    player.bigPotions -= 1;
    player.hp = Math.min(player.maxHp, player.hp + 25);
    return;
  }
  if (player.potions > 0) {
    player.potions -= 1;
    player.hp = Math.min(player.maxHp, player.hp + 10);
  }
}

function applyItem(player, item, floor) {
  if (item.type === 'heal_potion') {
    player.potions += 1;
    return;
  }
  if (item.type === 'big_heal_potion') {
    player.bigPotions += 1;
    return;
  }
  if (item.type === 'food') {
    player.food += 1;
    return;
  }
  if (item.type === 'weapon') {
    if (!player.weapon || item.atk > player.weapon.atk) {
      player.weapon = item;
      if (!player.rewards.firstUpgradeFloor) player.rewards.firstUpgradeFloor = floor;
      if (item.special && !player.rewards.firstSpecialFloor) player.rewards.firstSpecialFloor = floor;
    }
    return;
  }
  if (item.type === 'armor') {
    if (!player.armor || item.def > player.armor.def) {
      player.armor = item;
      if (!player.rewards.firstUpgradeFloor) player.rewards.firstUpgradeFloor = floor;
      if (item.special && !player.rewards.firstSpecialFloor) player.rewards.firstSpecialFloor = floor;
    }
  }
}

function generateItem(data, floor) {
  const defs = data.ITEM_DEFS.filter((item) => item.minFloor <= floor);
  const def = pickWeighted(defs);
  const rarity = (def.type === 'weapon' || def.type === 'armor') ? getRarityForFloor(floor) : def.rarity;
  const mult = rarityMultiplier(rarity);
  return {
    ...def,
    rarity,
    atk: Math.ceil((def.atk || 0) * mult),
    def: Math.ceil((def.def || 0) * mult),
  };
}

function buyFromMerchant(data, player, floor) {
  if (player.rewards.firstMerchantFloor === null) player.rewards.firstMerchantFloor = floor;
  const affordable = data.ITEM_DEFS
    .filter((item) => item.minFloor <= floor && (item.price || 0) <= player.gold)
    .sort((a, b) => (b.price || 0) - (a.price || 0));

  for (const item of affordable) {
    if (item.type === 'weapon' && (!player.weapon || item.atk > player.weapon.atk)) {
      player.gold -= item.price || 0;
      applyItem(player, { ...item, rarity: item.rarity || 'common' }, floor);
      return;
    }
    if (item.type === 'armor' && (!player.armor || item.def > player.armor.def)) {
      player.gold -= item.price || 0;
      applyItem(player, { ...item, rarity: item.rarity || 'common' }, floor);
      return;
    }
  }

  const heal = data.ITEM_DEFS.find((item) => item.type === 'heal_potion');
  if (heal && player.gold >= (heal.price || 0) && player.potions < 3) {
    player.gold -= heal.price || 0;
    player.potions += 1;
  }
}

function simulateFight(data, player, enemy, floor) {
  const playerAtk = getPlayerAtk(player);
  const playerDef = getPlayerDef(player);
  let enemyHp = enemy.hp;

  while (enemyHp > 0 && player.hp > 0) {
    player.totalTurns += 1;
    player.floorTurns += 1;

    maybeUseHealing(player);

    let playerDamage = expectedBaseDamage(playerAtk, enemy.def) + randInt(-1, 2);
    if (Math.random() < 0.1) playerDamage = Math.floor(playerDamage * 1.5);
    playerDamage = Math.max(1, playerDamage);
    enemyHp -= playerDamage;
    if (enemyHp <= 0) break;

    let enemyDamage = expectedBaseDamage(enemy.atk, playerDef) + randInt(-1, 2);
    if (enemy.evasion && Math.random() < enemy.evasion) {
      enemyDamage = 0;
    }
    if (enemy.breath && Math.random() < 0.25) {
      enemyDamage += 3;
    }
    if (Math.random() < 0.1) enemyDamage = Math.floor(enemyDamage * 1.5);
    enemyDamage = Math.max(0, enemyDamage);
    player.hp -= enemyDamage;
  }

  if (player.hp <= 0) return false;

  player.gold += enemy.gold || 0;
  gainExp(data, player, enemy.exp || 0, floor);
  return true;
}

function simulateFloor(data, player, floor) {
  player.floorTurns = 0;

  const enemyCount = data.BOSS_DEFS[floor]
    ? Math.max(2, randInt(data.DUNGEON.ENEMIES_PER_FLOOR_MIN, data.DUNGEON.ENEMIES_PER_FLOOR_MAX) - 2)
    : randInt(data.DUNGEON.ENEMIES_PER_FLOOR_MIN, data.DUNGEON.ENEMIES_PER_FLOOR_MAX) + Math.floor(floor / 2);

  const enemyPool = getEnemyPool(data, floor);
  for (let i = 0; i < enemyCount; i++) {
    const enemy = pickWeighted(enemyPool);
    if (!simulateFight(data, player, enemy, floor)) return false;
  }

  if (data.BOSS_DEFS[floor]) {
    const boss = data.BOSS_DEFS[floor];
    if (!simulateFight(data, player, boss, floor)) return false;
  }

  const itemCount = randInt(data.DUNGEON.ITEMS_PER_FLOOR_MIN, data.DUNGEON.ITEMS_PER_FLOOR_MAX) + data.DUNGEON.FOOD_PER_FLOOR;
  for (let i = 0; i < itemCount; i++) {
    applyItem(player, generateItem(data, floor), floor);
  }

  if (Math.random() < data.MERCHANT_CHANCE) {
    buyFromMerchant(data, player, floor);
  }

  const floorAttrition = Math.max(0, Math.floor(player.floorTurns / 6));
  player.hunger = Math.max(0, player.hunger - floorAttrition * data.HUNGER_DECAY * 5);
  if (player.hunger <= 0) {
    player.hp -= 3 + floor;
  } else if (player.food > 0 && player.hunger < data.HUNGER_MAX * 0.4) {
    player.food -= 1;
    player.hunger = Math.min(data.HUNGER_MAX, player.hunger + 30);
  }

  return player.hp > 0;
}

function simulateRun(data, policy) {
  const player = createPlayer(data, policy);
  for (let floor = 1; floor <= data.MAX_FLOOR; floor++) {
    const survived = simulateFloor(data, player, floor);
    if (!survived) {
      return {
        cleared: false,
        deathFloor: floor,
        finalLevel: player.level,
        rewards: player.rewards,
        totalTurns: player.totalTurns,
      };
    }
  }
  return {
    cleared: true,
    deathFloor: null,
    finalLevel: player.level,
    rewards: player.rewards,
    totalTurns: player.totalTurns,
  };
}

function aggregate(results, data) {
  const summary = {
    runs: results.length,
    clears: results.filter((r) => r.cleared).length,
    avgFinalLevel: 0,
    avgTurns: 0,
    deathFloors: {},
    reward: {
      floor1LevelUpRate: 0,
      firstSpecialAvgFloor: null,
      firstUpgradeAvgFloor: null,
      firstMerchantRateBy3: 0,
    },
  };

  let totalLevel = 0;
  let totalTurns = 0;
  let specialFloors = [];
  let upgradeFloors = [];
  let merchantBy3 = 0;
  let floor1LevelUps = 0;

  for (let floor = 1; floor <= data.MAX_FLOOR; floor++) summary.deathFloors[floor] = 0;

  for (const result of results) {
    totalLevel += result.finalLevel;
    totalTurns += result.totalTurns;
    if (result.deathFloor) summary.deathFloors[result.deathFloor] += 1;
    if (result.rewards.leveledOnFloor1) floor1LevelUps += 1;
    if (result.rewards.firstSpecialFloor) specialFloors.push(result.rewards.firstSpecialFloor);
    if (result.rewards.firstUpgradeFloor) upgradeFloors.push(result.rewards.firstUpgradeFloor);
    if (result.rewards.firstMerchantFloor && result.rewards.firstMerchantFloor <= 3) merchantBy3 += 1;
  }

  summary.avgFinalLevel = totalLevel / results.length;
  summary.avgTurns = totalTurns / results.length;
  summary.reward.floor1LevelUpRate = floor1LevelUps / results.length;
  summary.reward.firstSpecialAvgFloor = specialFloors.length ? specialFloors.reduce((a, b) => a + b, 0) / specialFloors.length : null;
  summary.reward.firstUpgradeAvgFloor = upgradeFloors.length ? upgradeFloors.reduce((a, b) => a + b, 0) / upgradeFloors.length : null;
  summary.reward.firstMerchantRateBy3 = merchantBy3 / results.length;

  return summary;
}

function toMarkdown(policyResults) {
  const lines = [];
  lines.push('# Rogue Depths Simulation Report');
  lines.push('');
  lines.push('This report is a policy-based run simulation. It is closer to play than the static balance report, but it is still an approximation.');
  lines.push('');
  for (const [policy, summary] of Object.entries(policyResults)) {
    lines.push(`## Policy: ${policy}`);
    lines.push('');
    lines.push(`- Runs: ${summary.runs}`);
    lines.push(`- Clear rate: ${(summary.clears / summary.runs * 100).toFixed(1)}%`);
    lines.push(`- Average final level: ${summary.avgFinalLevel.toFixed(2)}`);
    lines.push(`- Average turns: ${summary.avgTurns.toFixed(1)}`);
    lines.push(`- Floor 1 level-up rate: ${(summary.reward.floor1LevelUpRate * 100).toFixed(1)}%`);
    lines.push(`- Average first upgrade floor: ${summary.reward.firstUpgradeAvgFloor ? summary.reward.firstUpgradeAvgFloor.toFixed(2) : 'n/a'}`);
    lines.push(`- Average first special-reward floor: ${summary.reward.firstSpecialAvgFloor ? summary.reward.firstSpecialAvgFloor.toFixed(2) : 'n/a'}`);
    lines.push(`- Merchant seen by Floor 3: ${(summary.reward.firstMerchantRateBy3 * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('Death floors:');
    for (const [floor, count] of Object.entries(summary.deathFloors)) {
      if (count > 0) lines.push(`- Floor ${floor}: ${count}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const data = loadConstants();
  const runs = Number(process.argv[2] || 300);
  const policies = ['careful', 'steady', 'aggressive'];
  const policyResults = {};

  for (const policy of policies) {
    const results = [];
    for (let i = 0; i < runs; i++) {
      results.push(simulateRun(data, policy));
    }
    policyResults[policy] = aggregate(results, data);
  }

  for (const [policy, summary] of Object.entries(policyResults)) {
    console.log(`\n=== ${policy} ===`);
    console.log(`runs: ${summary.runs}`);
    console.log(`clear rate: ${(summary.clears / summary.runs * 100).toFixed(1)}%`);
    console.log(`avg final level: ${summary.avgFinalLevel.toFixed(2)}`);
    console.log(`avg turns: ${summary.avgTurns.toFixed(1)}`);
    console.log(`floor1 level-up rate: ${(summary.reward.floor1LevelUpRate * 100).toFixed(1)}%`);
    console.log(`avg first upgrade floor: ${summary.reward.firstUpgradeAvgFloor ? summary.reward.firstUpgradeAvgFloor.toFixed(2) : 'n/a'}`);
    console.log(`avg first special floor: ${summary.reward.firstSpecialAvgFloor ? summary.reward.firstSpecialAvgFloor.toFixed(2) : 'n/a'}`);
    console.log(`merchant by floor3: ${(summary.reward.firstMerchantRateBy3 * 100).toFixed(1)}%`);
  }

  fs.writeFileSync(REPORT_PATH, toMarkdown(policyResults), 'utf8');
  console.log(`\nMarkdown report written to ${path.basename(REPORT_PATH)}`);
}

main();
