// =============================================================================
// Item System
// =============================================================================

function createItem(x, y, def, rarity) {
  const item = {
    x, y,
    type: def.type,
    name: def.name,
    ch: def.ch,
    color: rarity ? (RARITY_COLORS[rarity] || def.color) : def.color,
    baseColor: def.color,
    atk: def.atk || 0,
    def: def.def || 0,
    value: def.value || 0,
    hunger: def.hunger || 0,
    rarity: rarity || def.rarity || RARITY.COMMON,
    special: def.special || null,
    price: def.price || 0,
  };

  // Rarity bonus
  if (rarity === RARITY.UNCOMMON) {
    item.atk = Math.ceil(item.atk * 1.2);
    item.def = Math.ceil(item.def * 1.2);
    item.value = Math.ceil(item.value * 1.3);
  } else if (rarity === RARITY.RARE) {
    item.atk = Math.ceil(item.atk * 1.5);
    item.def = Math.ceil(item.def * 1.5);
    item.value = Math.ceil(item.value * 1.5);
  } else if (rarity === RARITY.LEGENDARY) {
    item.atk = Math.ceil(item.atk * 1.8);
    item.def = Math.ceil(item.def * 1.8);
    item.value = Math.ceil(item.value * 2);
  }

  // Add special name prefix for non-common
  if (rarity === RARITY.UNCOMMON && !def.special) {
    item.name = '良質な' + item.name;
  }

  return item;
}

function spawnItems(map, rooms, floor, playerPos) {
  const items = [];
  const count = randInt(DUNGEON.ITEMS_PER_FLOOR_MIN, DUNGEON.ITEMS_PER_FLOOR_MAX);
  const floorTiles = getFloorTiles(map);
  const available = floorTiles.filter(t =>
    manhattanDist(t.x, t.y, playerPos.x, playerPos.y) > 3
  );

  const possibleDefs = ITEM_DEFS.filter(d => d.minFloor <= floor && d.type !== ITEM_TYPE.FOOD);

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randInt(0, available.length - 1);
    const pos = available.splice(idx, 1)[0];
    const def = weightedPick(possibleDefs);
    const rarity = getRarityForFloor(floor);
    // Only apply rarity to equipment
    const finalRarity = (def.type === ITEM_TYPE.WEAPON || def.type === ITEM_TYPE.ARMOR) ? rarity : def.rarity;
    items.push(createItem(pos.x, pos.y, def, finalRarity));
  }

  // Spawn food items
  for (let i = 0; i < DUNGEON.FOOD_PER_FLOOR && available.length > 0; i++) {
    const idx = randInt(0, available.length - 1);
    const pos = available.splice(idx, 1)[0];
    const foodDefs = ITEM_DEFS.filter(d => d.type === ITEM_TYPE.FOOD && d.minFloor <= floor);
    if (foodDefs.length > 0) {
      const def = weightedPick(foodDefs);
      items.push(createItem(pos.x, pos.y, def, RARITY.COMMON));
    }
  }

  return items;
}

// --- Treasure Chests ---
function createChest(x, y, floor) {
  return {
    x, y,
    ch: 'C',
    color: '#ffcc44',
    name: '宝箱',
    isChest: true,
    floor,
  };
}

function openChest(chest, player, state) {
  const { messages, enemies } = state;
  Sound.play('chest');

  // 20% mimic chance
  if (Math.random() < 0.2) {
    addMessage(messages, 'ミミックだ！宝箱が襲いかかってきた！', 'important');
    const mimic = createEnemy(chest.x, chest.y, {
      name: 'ミミック', ch: 'C', color: '#dd8800',
      hp: 20 + chest.floor * 3, atk: 6 + chest.floor, def: 3 + Math.floor(chest.floor / 2),
      exp: 15 + chest.floor * 2, gold: 20 + chest.floor * 5,
    });
    mimic.state = 'chase';
    mimic.lastSeenX = player.x;
    mimic.lastSeenY = player.y;
    enemies.push(mimic);
    Effects.screenShake(3);
    return false;
  }

  // Good loot
  addMessage(messages, '宝箱を開けた！', 'item');
  Effects.spawnParticles(chest.x, chest.y, '#ffcc44', 10);

  // Generate a nice item (higher rarity)
  const possibleDefs = ITEM_DEFS.filter(d => d.minFloor <= chest.floor + 2);
  if (possibleDefs.length > 0) {
    const def = weightedPick(possibleDefs);
    const roll = Math.random();
    const rarity = roll < 0.3 ? RARITY.LEGENDARY : (roll < 0.7 ? RARITY.RARE : RARITY.UNCOMMON);
    const item = createItem(player.x, player.y, def, rarity);

    if (player.inventory.length >= MAX_INVENTORY) {
      // Drop on ground
      state.items.push(item);
      addMessage(messages, `${item.name}が足元に落ちた。(持ち物いっぱい)`, 'item');
    } else {
      player.inventory.push(item);
      addMessage(messages, `${item.name}を手に入れた！`, 'item');
    }
  }

  // Bonus gold
  const gold = randInt(10, 30) + chest.floor * 5;
  player.gold += gold;
  addMessage(messages, `${gold}Gを見つけた！`, 'item');

  return true;
}

function pickupItem(player, items, messages) {
  const idx = items.findIndex(item => item.x === player.x && item.y === player.y);
  if (idx === -1) return;

  const item = items[idx];

  if (player.inventory.length >= MAX_INVENTORY) {
    addMessage(messages, '持ち物がいっぱいだ！', 'item');
    return;
  }

  items.splice(idx, 1);
  player.inventory.push(item);
  addMessage(messages, `${item.name}を拾った。`, 'item');
  Sound.play('pickup');
}

function useItem(player, slotIndex, messages) {
  if (slotIndex < 0 || slotIndex >= player.inventory.length) return false;

  const item = player.inventory[slotIndex];

  switch (item.type) {
    case ITEM_TYPE.HEAL_POTION:
    case ITEM_TYPE.BIG_HEAL_POTION: {
      const healed = Math.min(item.value, player.maxHp - player.hp);
      player.hp += healed;
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, `${item.name}を使った。HPが${healed}回復した。`, 'heal');
      Effects.spawnDamageNumber(player.x, player.y, healed, true, false);
      Sound.play('pickup');
      return true;
    }
    case ITEM_TYPE.WEAPON: {
      const oldWeapon = player.weapon;
      player.weapon = item;
      player.inventory.splice(slotIndex, 1);
      if (oldWeapon) {
        player.inventory.push(oldWeapon);
        addMessage(messages, `${oldWeapon.name}を外して${item.name}を装備した。(ATK+${item.atk})`, 'item');
      } else {
        addMessage(messages, `${item.name}を装備した。(ATK+${item.atk})`, 'item');
      }
      if (item.special) addMessage(messages, `特殊効果: ${getSpecialDesc(item.special)}`, 'item');
      return true;
    }
    case ITEM_TYPE.ARMOR: {
      const oldArmor = player.armor;
      player.armor = item;
      player.inventory.splice(slotIndex, 1);
      if (oldArmor) {
        player.inventory.push(oldArmor);
        addMessage(messages, `${oldArmor.name}を外して${item.name}を装備した。(DEF+${item.def})`, 'item');
      } else {
        addMessage(messages, `${item.name}を装備した。(DEF+${item.def})`, 'item');
      }
      if (item.special) addMessage(messages, `特殊効果: ${getSpecialDesc(item.special)}`, 'item');
      return true;
    }
    case ITEM_TYPE.SCROLL_MAP: {
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, '地図の巻物を使った。フロアの全体が明らかになった！', 'item');
      return 'reveal_map';
    }
    case ITEM_TYPE.POISON_SCROLL: {
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, '毒の巻物を使った。周囲の敵に毒を付与した！', 'item');
      return 'poison_scroll';
    }
    case ITEM_TYPE.FOOD: {
      const restored = Math.min(item.hunger, HUNGER_MAX - player.hunger);
      player.hunger = Math.min(HUNGER_MAX, player.hunger + item.hunger);
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, `${item.name}を食べた。満腹度が${restored}回復した。`, 'heal');
      return true;
    }
  }

  return false;
}

function getSpecialDesc(special) {
  switch (special) {
    case 'burn': return '炎属性: 攻撃時に火傷付与。火傷中の敵に周囲火花';
    case 'lifesteal': return '吸血: ダメージ20%HP回復。毒敵に1.5倍吸収';
    case 'evasion': return '回避: 15%攻撃回避。瞬歩後1T回避率上昇';
    case 'counter': return '反撃: 被ダメ時にDEF50%を敵に反射';
    case 'stealth': return '忍び足: 騒音60%減少';
    default: return '';
  }
}

function getItemDisplayName(item) {
  if (!item) return '';
  const rarityMark = item.rarity === RARITY.LEGENDARY ? '★' :
                     item.rarity === RARITY.RARE ? '◆' :
                     item.rarity === RARITY.UNCOMMON ? '◇' : '';
  return rarityMark + item.name;
}
