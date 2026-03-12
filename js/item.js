// =============================================================================
// Item System
// =============================================================================

function createItem(x, y, def) {
  return {
    x, y,
    type: def.type,
    name: def.name,
    ch: def.ch,
    color: def.color,
    atk: def.atk || 0,
    def: def.def || 0,
    value: def.value || 0,
  };
}

function spawnItems(map, rooms, floor, playerPos) {
  const items = [];
  const count = randInt(DUNGEON.ITEMS_PER_FLOOR_MIN, DUNGEON.ITEMS_PER_FLOOR_MAX);
  const floorTiles = getFloorTiles(map);
  const available = floorTiles.filter(t =>
    manhattanDist(t.x, t.y, playerPos.x, playerPos.y) > 3
  );

  const possibleDefs = ITEM_DEFS.filter(d => d.minFloor <= floor);

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = randInt(0, available.length - 1);
    const pos = available.splice(idx, 1)[0];
    const def = weightedPick(possibleDefs);
    items.push(createItem(pos.x, pos.y, def));
  }

  return items;
}

function pickupItem(player, items, messages) {
  const idx = items.findIndex(item => item.x === player.x && item.y === player.y);
  if (idx === -1) return;

  const item = items[idx];

  if (player.inventory.length >= MAX_INVENTORY) {
    addMessage(messages, `持ち物がいっぱいだ！`, 'item');
    return;
  }

  items.splice(idx, 1);
  player.inventory.push(item);
  addMessage(messages, `${item.name}を拾った。`, 'item');
}

function useItem(player, slotIndex, messages) {
  if (slotIndex < 0 || slotIndex >= player.inventory.length) return false;

  const item = player.inventory[slotIndex];

  switch (item.type) {
    case ITEM_TYPE.HEAL_POTION: {
      const healed = Math.min(item.value, player.maxHp - player.hp);
      player.hp += healed;
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, `${item.name}を使った。HPが${healed}回復した。`, 'heal');
      return true;
    }
    case ITEM_TYPE.BIG_HEAL_POTION: {
      const healed = Math.min(item.value, player.maxHp - player.hp);
      player.hp += healed;
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, `${item.name}を使った。HPが${healed}回復した。`, 'heal');
      return true;
    }
    case ITEM_TYPE.WEAPON: {
      // Swap with current weapon
      const oldWeapon = player.weapon;
      player.weapon = item;
      player.inventory.splice(slotIndex, 1);
      if (oldWeapon) {
        player.inventory.push(oldWeapon);
        addMessage(messages, `${oldWeapon.name}を外して${item.name}を装備した。(ATK+${item.atk})`, 'item');
      } else {
        addMessage(messages, `${item.name}を装備した。(ATK+${item.atk})`, 'item');
      }
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
      return true;
    }
    case ITEM_TYPE.SCROLL_MAP: {
      player.inventory.splice(slotIndex, 1);
      addMessage(messages, `地図の巻物を使った。フロアの全体が明らかになった！`, 'item');
      return 'reveal_map';
    }
  }

  return false;
}
