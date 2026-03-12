// =============================================================================
// Room Event System
// =============================================================================

const RoomEventManager = {
  // Place room events during dungeon generation
  placeEvents(rooms, floor, isBossFloor) {
    const events = [];
    if (isBossFloor || rooms.length < 3) return events;

    // 40% chance for 1 event per floor, 15% for 2
    let count = 0;
    const roll = Math.random();
    if (roll < 0.15) count = 2;
    else if (roll < 0.55) count = 1;
    if (count === 0) return events;

    const candidates = Object.keys(ROOM_EVENT_DEFS);
    const usedRooms = new Set();

    for (let i = 0; i < count; i++) {
      // Pick a room (not first or last)
      let roomIdx;
      let attempts = 0;
      do {
        roomIdx = randInt(1, rooms.length - 2);
        attempts++;
      } while (usedRooms.has(roomIdx) && attempts < 10);
      if (usedRooms.has(roomIdx)) continue;
      usedRooms.add(roomIdx);

      const room = rooms[roomIdx];
      const center = roomCenter(room);
      const eventType = randPick(candidates);
      const def = ROOM_EVENT_DEFS[eventType];

      events.push({
        type: eventType,
        x: center.x,
        y: center.y,
        name: def.name,
        ch: def.ch,
        color: def.color,
        used: false,
        roomIdx,
      });
    }
    return events;
  },

  // Interact with a room event
  interact(event, player, state) {
    if (event.used) return false;
    const { messages } = state;

    switch (event.type) {
      case ROOM_EVENT.ALTAR:
        return this._altar(event, player, state);
      case ROOM_EVENT.FOUNTAIN:
        return this._fountain(event, player, state);
      case ROOM_EVENT.VAULT:
        return this._vault(event, player, state);
      case ROOM_EVENT.WOUNDED_MERCHANT:
        return this._woundedMerchant(event, player, state);
      case ROOM_EVENT.GHOST_REMAINS:
        return this._ghostRemains(event, player, state);
    }
    return false;
  },

  _altar(event, player, state) {
    const cost = Math.floor(player.maxHp * 0.3);
    if (player.hp <= cost) {
      addMessage(state.messages, '祭壇に力を捧げるにはHPが足りない...', 'system');
      return false;
    }
    event.used = true;
    player.hp -= cost;
    // Permanent buff: +2 ATK or +2 DEF (random)
    if (Math.random() < 0.5) {
      player.baseAtk += 2;
      addMessage(state.messages, `呪われた祭壇にHP${cost}を捧げた。攻撃力が恒久的に+2！`, 'important');
    } else {
      player.baseDef += 2;
      addMessage(state.messages, `呪われた祭壇にHP${cost}を捧げた。防御力が恒久的に+2！`, 'important');
    }
    Effects.spawnParticles(event.x, event.y, '#cc44ff', 15);
    Effects.flashScreen('#cc44ff40');
    Effects.spawnDamageNumber(player.x, player.y, cost, false, false);
    return true;
  },

  _fountain(event, player, state) {
    event.used = true;
    const hasStatus = player.statusEffects && player.statusEffects.length > 0;
    if (hasStatus && Math.random() < 0.5) {
      // Cure all status effects
      StatusManager.clear(player);
      addMessage(state.messages, '回復の泉で状態異常が全て治った！', 'heal');
    } else {
      // Heal 40% HP
      const heal = Math.floor(player.maxHp * 0.4);
      const actual = Math.min(heal, player.maxHp - player.hp);
      player.hp += actual;
      addMessage(state.messages, `回復の泉でHPが${actual}回復した！`, 'heal');
      Effects.spawnDamageNumber(player.x, player.y, actual, true, false);
    }
    Effects.spawnParticles(event.x, event.y, '#40ccff', 12);
    return true;
  },

  _vault(event, player, state) {
    event.used = true;
    addMessage(state.messages, '封印宝物庫を開けた！罠に注意！', 'important');
    // Spawn 2-3 traps around
    const trapPositions = CARDINAL_DIRS.map(d => ({ x: event.x + d.x, y: event.y + d.y }))
      .filter(p => inBounds(p.x, p.y) && isWalkable(state.map[p.y][p.x]));
    for (const pos of trapPositions) {
      if (Math.random() < 0.6) {
        const def = weightedPick(TRAP_DEFS);
        state.traps.push(TrapManager.createTrap(pos.x, pos.y, def));
      }
    }
    // High rarity loot
    const possibleDefs = ITEM_DEFS.filter(d => (d.type === ITEM_TYPE.WEAPON || d.type === ITEM_TYPE.ARMOR) && d.minFloor <= state.floor + 3);
    if (possibleDefs.length > 0) {
      const def = randPick(possibleDefs);
      const rarity = Math.random() < 0.4 ? RARITY.LEGENDARY : RARITY.RARE;
      const item = createItem(event.x, event.y, def, rarity);
      if (player.inventory.length < MAX_INVENTORY) {
        player.inventory.push(item);
        addMessage(state.messages, `${item.name}を手に入れた！`, 'item');
      } else {
        state.items.push(item);
        addMessage(state.messages, `${item.name}が足元に落ちた。`, 'item');
      }
    }
    const gold = randInt(30, 80) + state.floor * 10;
    player.gold += gold;
    addMessage(state.messages, `${gold}Gを見つけた！`, 'item');
    Effects.spawnParticles(event.x, event.y, '#ffcc00', 15);
    return true;
  },

  _woundedMerchant(event, player, state) {
    event.used = true;
    // Use a heal potion to help, or just interact
    const healIdx = player.inventory.findIndex(i => i.type === ITEM_TYPE.HEAL_POTION || i.type === ITEM_TYPE.BIG_HEAL_POTION);
    if (healIdx !== -1) {
      player.inventory.splice(healIdx, 1);
      addMessage(state.messages, '負傷商人に回復薬を渡した。感謝され割引価格で商品を買える！', 'important');
      // Create a cheap merchant
      const merchant = createMerchant(event.x, event.y + 1, state.floor);
      // Discount
      for (const si of merchant.shopItems) {
        si.price = Math.floor(si.price * 0.5);
      }
      state.merchant = merchant;
    } else {
      addMessage(state.messages, '負傷商人がいるが回復薬がない...通常価格で取引できる。', 'info');
      state.merchant = createMerchant(event.x, event.y + 1, state.floor);
    }
    Effects.spawnParticles(event.x, event.y, '#dd8844', 8);
    return true;
  },

  _ghostRemains(event, player, state) {
    event.used = true;
    if (Math.random() < 0.6) {
      // Good: strong item
      const possibleDefs = ITEM_DEFS.filter(d => (d.type === ITEM_TYPE.WEAPON || d.type === ITEM_TYPE.ARMOR) && d.minFloor <= state.floor + 2);
      if (possibleDefs.length > 0) {
        const def = randPick(possibleDefs);
        const item = createItem(event.x, event.y, def, RARITY.RARE);
        if (player.inventory.length < MAX_INVENTORY) {
          player.inventory.push(item);
          addMessage(state.messages, `亡者の遺品から${item.name}を見つけた！`, 'item');
        } else {
          state.items.push(item);
          addMessage(state.messages, `亡者の遺品から${item.name}が落ちた。`, 'item');
        }
      }
    } else {
      // Bad: curse (poison + lose some gold)
      StatusManager.apply(player, STATUS.POISON, 5);
      StatusManager.apply(player, STATUS.WEAKNESS, 3);
      const lostGold = Math.min(player.gold, randInt(10, 30));
      player.gold -= lostGold;
      addMessage(state.messages, `亡者の遺品に呪いがかかっていた！毒+衰弱！${lostGold}G失った！`, 'important');
      Effects.flashScreen('#8888cc60');
    }
    Effects.spawnParticles(event.x, event.y, '#8888cc', 10);
    return true;
  },
};
