// =============================================================================
// UI Management
// =============================================================================

const MAX_MESSAGES = 50;

function addMessage(messages, text, type = 'info') {
  messages.push({ text, type });
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
}

const UI = {
  elements: {},

  init() {
    this.elements = {
      hpBar: document.getElementById('hp-bar'),
      hpText: document.getElementById('hp-text'),
      atkText: document.getElementById('atk-text'),
      defText: document.getElementById('def-text'),
      lvText: document.getElementById('lv-text'),
      expBar: document.getElementById('exp-bar'),
      expText: document.getElementById('exp-text'),
      floorInfo: document.getElementById('floor-info'),
      inventoryList: document.getElementById('inventory-list'),
      messagesDiv: document.getElementById('messages'),
      gameContainer: document.getElementById('game-container'),
      titleScreen: document.getElementById('title-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      gameoverMessage: document.getElementById('gameover-message'),
      gameoverStats: document.getElementById('gameover-stats'),
    };
  },

  update(state) {
    const { player, floor, messages } = state;

    // HP
    const hpRatio = player.hp / player.maxHp;
    this.elements.hpBar.style.width = `${hpRatio * 100}%`;
    this.elements.hpText.textContent = `${player.hp}/${player.maxHp}`;

    // Stats
    this.elements.atkText.textContent = getPlayerAtk(player);
    this.elements.defText.textContent = getPlayerDef(player);
    this.elements.lvText.textContent = player.level;

    // EXP
    const levelData = LEVEL_TABLE[player.level - 1];
    if (levelData) {
      const expRatio = player.exp / levelData.expReq;
      this.elements.expBar.style.width = `${expRatio * 100}%`;
      this.elements.expText.textContent = `${player.exp}/${levelData.expReq}`;
    }

    // Floor
    this.elements.floorInfo.textContent = `Floor: ${floor}`;

    // Inventory
    this.elements.inventoryList.innerHTML = '';
    player.inventory.forEach((item, i) => {
      const li = document.createElement('li');
      const key = document.createElement('span');
      key.className = 'item-key';
      key.textContent = `[${i + 1}]`;
      li.appendChild(key);
      li.appendChild(document.createTextNode(` ${item.name}`));
      this.elements.inventoryList.appendChild(li);
    });

    // Equipped items info
    if (player.weapon) {
      const li = document.createElement('li');
      li.style.color = '#cc8';
      li.textContent = `武器: ${player.weapon.name}`;
      this.elements.inventoryList.appendChild(li);
    }
    if (player.armor) {
      const li = document.createElement('li');
      li.style.color = '#8ac';
      li.textContent = `防具: ${player.armor.name}`;
      this.elements.inventoryList.appendChild(li);
    }

    // Messages
    this.renderMessages(messages);
  },

  renderMessages(messages) {
    const div = this.elements.messagesDiv;
    div.innerHTML = '';
    const recent = messages.slice(-8);
    for (const msg of recent) {
      const p = document.createElement('div');
      p.className = `msg ${msg.type}`;
      p.textContent = msg.text;
      div.appendChild(p);
    }
    div.parentElement.scrollTop = div.parentElement.scrollHeight;
  },

  showTitle() {
    this.elements.titleScreen.style.display = 'flex';
    this.elements.gameContainer.classList.remove('active');
    this.elements.gameoverScreen.classList.add('hidden');
  },

  showGame() {
    this.elements.titleScreen.style.display = 'none';
    this.elements.gameContainer.classList.add('active');
    this.elements.gameoverScreen.classList.add('hidden');
  },

  showGameOver(player, floor) {
    this.elements.gameoverScreen.classList.remove('hidden');
    this.elements.gameoverMessage.textContent =
      `Floor ${floor} で力尽きた...`;
    this.elements.gameoverStats.textContent =
      `Lv.${player.level} | ${player.killCount}体撃破 | ${player.turnCount}ターン`;
  },

  showVictory(player) {
    this.elements.gameoverScreen.classList.remove('hidden');
    this.elements.gameoverScreen.querySelector('h1').textContent = 'Victory!';
    this.elements.gameoverScreen.querySelector('h1').style.color = '#e0a040';
    this.elements.gameoverMessage.textContent =
      `最深部に到達し、ダンジョンを制覇した！`;
    this.elements.gameoverStats.textContent =
      `Lv.${player.level} | ${player.killCount}体撃破 | ${player.turnCount}ターン`;
  },
};
