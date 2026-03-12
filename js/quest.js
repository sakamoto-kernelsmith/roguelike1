// =============================================================================
// Merchant Mini-Quest System
// =============================================================================

const QuestManager = {
  activeQuest: null,

  // Generate a quest when meeting a merchant
  generate(merchant, floor, state) {
    const types = ['fetch_item', 'kill_mimic', 'explore'];
    const type = randPick(types);
    let quest = null;

    switch (type) {
      case 'fetch_item':
        quest = {
          type: 'fetch_item',
          desc: '回復薬を持ってきてほしい',
          targetType: ITEM_TYPE.HEAL_POTION,
          reward: { gold: 30 + floor * 10, buff: null },
          completed: false,
        };
        break;
      case 'kill_mimic':
        quest = {
          type: 'kill_mimic',
          desc: 'ミミックを1体倒してほしい',
          killTarget: 'ミミック',
          killCount: 0,
          killRequired: 1,
          reward: { gold: 50 + floor * 10, buff: 'haste' },
          completed: false,
        };
        break;
      case 'explore':
        quest = {
          type: 'explore',
          desc: 'フロアの部屋を全て探索してほしい',
          roomsExplored: 0,
          roomsRequired: Math.min(state.rooms ? state.rooms.length : 5, 6),
          reward: { gold: 40 + floor * 8, buff: null },
          completed: false,
        };
        break;
    }
    this.activeQuest = quest;
    return quest;
  },

  // Check quest progress
  checkProgress(state) {
    if (!this.activeQuest || this.activeQuest.completed) return false;
    const quest = this.activeQuest;

    switch (quest.type) {
      case 'fetch_item':
        // Check if player has the item
        return state.player.inventory.some(i => i.type === quest.targetType);
      case 'kill_mimic':
        return quest.killCount >= quest.killRequired;
      case 'explore': {
        // Count explored rooms
        let explored = 0;
        if (state.rooms && state.explored) {
          for (const room of state.rooms) {
            const cx = Math.floor(room.x + room.w / 2);
            const cy = Math.floor(room.y + room.h / 2);
            if (state.explored[cy] && state.explored[cy][cx]) explored++;
          }
        }
        quest.roomsExplored = explored;
        return explored >= quest.roomsRequired;
      }
    }
    return false;
  },

  // Notify kill (for kill quests)
  notifyKill(enemyName) {
    if (!this.activeQuest || this.activeQuest.completed) return;
    if (this.activeQuest.type === 'kill_mimic' && enemyName === this.activeQuest.killTarget) {
      this.activeQuest.killCount++;
    }
  },

  // Complete quest and give rewards
  complete(player, messages) {
    if (!this.activeQuest || this.activeQuest.completed) return false;
    const quest = this.activeQuest;
    quest.completed = true;

    // Take fetch item if needed
    if (quest.type === 'fetch_item') {
      const idx = player.inventory.findIndex(i => i.type === quest.targetType);
      if (idx !== -1) player.inventory.splice(idx, 1);
    }

    // Give rewards
    player.gold += quest.reward.gold;
    addMessage(messages, `クエスト完了！${quest.reward.gold}Gを受け取った！`, 'important');

    if (quest.reward.buff === 'haste') {
      StatusManager.apply(player, STATUS.HASTE, 10);
      addMessage(messages, '報酬として加速のバフを受けた！', 'heal');
    }

    Effects.spawnParticles(player.x, player.y, '#ffcc00', 12);
    this.activeQuest = null;
    return true;
  },

  // Get quest display info
  getDisplay() {
    if (!this.activeQuest || this.activeQuest.completed) return null;
    const q = this.activeQuest;
    let progress = '';
    switch (q.type) {
      case 'fetch_item': progress = '回復薬を渡す'; break;
      case 'kill_mimic': progress = `${q.killCount}/${q.killRequired}体`; break;
      case 'explore': progress = `${q.roomsExplored}/${q.roomsRequired}部屋`; break;
    }
    return { desc: q.desc, progress, reward: `${q.reward.gold}G` };
  },

  // Reset on new floor
  reset() {
    this.activeQuest = null;
  },
};
