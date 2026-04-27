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
      goldText: document.getElementById('gold-text'),
      hungerBar: document.getElementById('hunger-bar'),
      hungerText: document.getElementById('hunger-text'),
      skillBar: document.getElementById('skill-bar'),
      statusIcons: document.getElementById('status-icons'),
      magicText: document.getElementById('magic-text'),
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

    // Floor + subtitle + mutation
    const mutation = state.mutation || MUTATION.NONE;
    const mutDef = MUTATION_DEFS[mutation];
    const floorLore = typeof FLOOR_LORE !== 'undefined' ? FLOOR_LORE[floor] : null;
    const floorName = floorLore ? `Floor ${floor}: ${floorLore.name}` : `Floor: ${floor}`;
    if (mutDef) {
      this.elements.floorInfo.innerHTML = `${floorName} <span style="color:${mutDef.color};font-size:11px">[${mutDef.name}]</span>`;
    } else {
      this.elements.floorInfo.textContent = floorName;
    }

    // Gold
    if (this.elements.goldText) {
      this.elements.goldText.textContent = `${player.gold || 0}G`;
    }

    // Magic
    if (this.elements.magicText) {
      const magicDef = MAGIC_LEVEL_TABLE[player.magicLevel - 1];
      this.elements.magicText.textContent = `Lv.${player.magicLevel} [${magicDef.name}] 石:${player.magicStones}`;
    }

    // Hunger
    if (this.elements.hungerBar && this.elements.hungerText) {
      const hungerRatio = player.hunger / HUNGER_MAX;
      this.elements.hungerBar.style.width = `${hungerRatio * 100}%`;
      if (hungerRatio <= 0.2) {
        this.elements.hungerBar.style.background = 'linear-gradient(to bottom, #e04040, #a02020)';
      } else if (hungerRatio <= 0.4) {
        this.elements.hungerBar.style.background = 'linear-gradient(to bottom, #e0a040, #a07020)';
      } else {
        this.elements.hungerBar.style.background = 'linear-gradient(to bottom, #40a040, #207020)';
      }
      this.elements.hungerText.textContent = `${Math.floor(player.hunger)}/${HUNGER_MAX}`;
    }

    // Status icons
    if (this.elements.statusIcons) {
      const icons = StatusManager.getDisplayIcons(player);
      this.elements.statusIcons.innerHTML = '';
      for (const icon of icons) {
        const span = document.createElement('span');
        span.className = 'status-icon';
        span.style.color = icon.color;
        span.textContent = `${icon.ch}${icon.dur}`;
        this.elements.statusIcons.appendChild(span);
      }
    }

    // Skills
    if (this.elements.skillBar && SkillManager.skills) {
      this.elements.skillBar.innerHTML = '';
      for (const skill of SkillManager.skills) {
        const div = document.createElement('div');
        div.className = 'skill-slot' + (skill.currentCd > 0 ? ' on-cd' : ' ready');
        const keySpan = document.createElement('span');
        keySpan.className = 'skill-key';
        keySpan.textContent = skill.key.toUpperCase();
        div.appendChild(keySpan);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skill-name';
        nameSpan.textContent = skill.name;
        div.appendChild(nameSpan);
        if (skill.currentCd > 0) {
          const cdSpan = document.createElement('span');
          cdSpan.className = 'skill-cd';
          cdSpan.textContent = skill.currentCd;
          div.appendChild(cdSpan);
        }
        this.elements.skillBar.appendChild(div);
      }
    }

    // Quest display
    const questInfo = QuestManager.getDisplay();
    if (questInfo) {
      const qDiv = document.getElementById('quest-display');
      if (qDiv) {
        qDiv.style.display = 'block';
        qDiv.innerHTML = `<span style="color:#ffcc00">Quest:</span> <span style="color:#aaa">${questInfo.desc}</span><br><span style="color:#888">${questInfo.progress} (${questInfo.reward})</span>`;
      }
    } else {
      const qDiv = document.getElementById('quest-display');
      if (qDiv) qDiv.style.display = 'none';
    }

    // Kill streak
    if (player.killStreak >= 3) {
      const ksDiv = document.getElementById('killstreak-display');
      if (ksDiv) {
        ksDiv.style.display = 'block';
        ksDiv.textContent = `${player.killStreak}連撃！`;
      }
    } else {
      const ksDiv = document.getElementById('killstreak-display');
      if (ksDiv) ksDiv.style.display = 'none';
    }

    // Inventory
    this.elements.inventoryList.innerHTML = '';
    player.inventory.forEach((item, i) => {
      const li = document.createElement('li');
      const key = document.createElement('span');
      key.className = 'item-key';
      key.textContent = `[${i + 1}]`;
      li.appendChild(key);
      const nameText = document.createTextNode(` ${getItemDisplayName(item)}`);
      li.appendChild(nameText);
      li.style.color = RARITY_COLORS[item.rarity] || '#aaa';
      this.elements.inventoryList.appendChild(li);
    });

    // Equipped items
    if (player.weapon) {
      const li = document.createElement('li');
      li.style.color = RARITY_COLORS[player.weapon.rarity] || '#cc8';
      li.textContent = `武器: ${getItemDisplayName(player.weapon)}`;
      this.elements.inventoryList.appendChild(li);
    }
    if (player.armor) {
      const li = document.createElement('li');
      li.style.color = RARITY_COLORS[player.armor.rarity] || '#8ac';
      li.textContent = `防具: ${getItemDisplayName(player.armor)}`;
      this.elements.inventoryList.appendChild(li);
    }

    // Messages
    this.renderMessages(messages);

    // Tutorial overlay
    this.updateTutorialOverlay();

    // Floor info override for tutorial
    if (TutorialManager.active) {
      this.elements.floorInfo.textContent = TutorialManager.getChapterTitle();
    }
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

  showShopUI(merchant, player, messages) {
    const mName = merchant.loreName || '商人';
    const mTitle = merchant.loreTitle || '';
    const header = mTitle ? `--- ${mName}（${mTitle}）の店 ---` : `--- ${mName}の店 ---`;
    addMessage(messages, header, 'system');
    // Show intro line on first visit
    if (!merchant._introduced && merchant.introLines && merchant.introLines.length > 0) {
      merchant._introduced = true;
      addMessage(messages, `「${randPick(merchant.introLines)}」`, 'info');
    }
    addMessage(messages, `所持金: ${player.gold}G`, 'item');
    merchant.shopItems.forEach((si, i) => {
      addMessage(messages, `[${i + 1}] ${si.item.name} - ${si.price}G`, 'item');
    });
    addMessage(messages, '番号キーで購入 / Qで所持品を売却 / 他のキーで退出', 'system');
  },

  showTitle() {
    this.elements.titleScreen.style.display = 'flex';
    this.elements.gameContainer.classList.remove('active');
    this.elements.gameoverScreen.classList.add('hidden');
    this.hideTutorialOverlay();
    this._hideScreen('training-select-screen');
    this._hideScreen('tutorial-complete-screen');

    // Populate title screen lore
    const loreDiv = document.getElementById('title-lore');
    if (loreDiv && typeof WORLD_INTRO !== 'undefined') {
      loreDiv.innerHTML = '';
      for (const line of WORLD_INTRO.titleLong) {
        const p = document.createElement('p');
        p.textContent = line;
        loreDiv.appendChild(p);
      }
    }
    const tagline = document.getElementById('title-tagline');
    if (tagline && typeof WORLD_INTRO !== 'undefined') {
      tagline.textContent = WORLD_INTRO.titleTagline;
    }

    // Show/hide training button based on intro completion
    const trainingBtn = document.getElementById('training-btn');
    if (trainingBtn) {
      trainingBtn.style.display = TutorialManager.isIntroCompleted() ? 'block' : 'none';
    }
  },

  showGame() {
    this.elements.titleScreen.style.display = 'none';
    this.elements.gameContainer.classList.add('active');
    this.elements.gameoverScreen.classList.add('hidden');
    this._hideScreen('training-select-screen');
    this._hideScreen('tutorial-complete-screen');
  },

  showGameOver(player, floor) {
    this.elements.gameoverScreen.classList.remove('hidden');
    this.elements.gameoverScreen.querySelector('h1').textContent = 'Game Over';
    this.elements.gameoverScreen.querySelector('h1').style.color = '#e04040';
    const floorLore = typeof FLOOR_LORE !== 'undefined' ? FLOOR_LORE[floor] : null;
    const floorLabel = floorLore ? `Floor ${floor}: ${floorLore.name}` : `Floor ${floor}`;
    this.elements.gameoverMessage.innerHTML =
      `${floorLabel} で力尽きた...<br><span style="color:#888;font-size:12px">${typeof GAMEOVER_TEXT !== 'undefined' ? GAMEOVER_TEXT[0] : ''}</span>`;
    this.elements.gameoverStats.textContent =
      `Lv.${player.level} | ${player.killCount}体撃破 | ${player.turnCount}ターン | ${player.gold}G`;
  },

  showVictory(player) {
    this.elements.gameoverScreen.classList.remove('hidden');
    this.elements.gameoverScreen.querySelector('h1').textContent = 'Victory!';
    this.elements.gameoverScreen.querySelector('h1').style.color = '#e0a040';
    const endingLines = typeof ENDING_TEXT !== 'undefined' ? ENDING_TEXT.short : ['ダンジョンを制覇した！'];
    this.elements.gameoverMessage.innerHTML = endingLines.map(l => `<span>${l}</span>`).join('<br>');
    this.elements.gameoverStats.textContent =
      `Lv.${player.level} | ${player.killCount}体撃破 | ${player.turnCount}ターン | ${player.gold}G`;
  },

  // ---- Tutorial UI ----

  updateTutorialOverlay() {
    if (!TutorialManager.active) {
      this.hideTutorialOverlay();
      return;
    }

    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    overlay.style.display = 'block';

    // Banner
    const bannerEl = document.getElementById('tutorial-banner');
    const bannerText = TutorialManager.getBanner();
    if (bannerText) {
      bannerEl.textContent = bannerText;
      bannerEl.style.opacity = '1';
    } else {
      bannerEl.style.opacity = '0';
    }

    // Objective
    const objEl = document.getElementById('tutorial-objective');
    const objText = TutorialManager.getObjectiveText();
    objEl.textContent = objText;
    objEl.style.display = objText ? 'block' : 'none';

    // Helper
    const helperEl = document.getElementById('tutorial-helper');
    const helperText = TutorialManager.getHelperText();
    helperEl.textContent = helperText;
    helperEl.style.display = helperText ? 'block' : 'none';

    // Hint box
    const hintEl = document.getElementById('tutorial-hint-box');
    const hintText = TutorialManager.getCurrentHint();
    hintEl.textContent = hintText;
    hintEl.style.display = hintText ? 'block' : 'none';
  },

  hideTutorialOverlay() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  showTrainingSelect() {
    this.elements.titleScreen.style.display = 'none';
    this.elements.gameContainer.classList.remove('active');

    const screen = document.getElementById('training-select-screen');
    screen.classList.remove('hidden');

    const list = document.getElementById('training-list');
    list.innerHTML = '';

    const allChapters = TutorialData.getAllChapterIds();
    const progress = TutorialManager.loadAllProgress();
    const introComplete = !!progress._introCompleted;

    for (const id of allChapters) {
      const ch = TutorialData.getChapter(id);
      if (!ch) continue;

      const btn = document.createElement('button');
      btn.className = 'training-item';

      const isCompleted = !!progress[id];
      const isLocked = ch.category === 'advanced' && !introComplete;

      if (isCompleted) btn.classList.add('completed');
      if (isLocked) btn.classList.add('locked');

      const statusSpan = document.createElement('span');
      statusSpan.className = 'training-status ' + (isCompleted ? 'done' : 'new');
      statusSpan.textContent = isCompleted ? 'Clear' : (isLocked ? 'Locked' : '');

      btn.textContent = `${ch.category === 'intro' ? '必修' : '応用'}: ${ch.title}`;
      btn.appendChild(statusSpan);

      if (!isLocked) {
        btn.addEventListener('click', () => {
          this._hideScreen('training-select-screen');
          if (typeof Game !== 'undefined') {
            Game.startTutorial(id);
          }
        });
      }

      list.appendChild(btn);
    }
  },

  showTutorialComplete(chapterId, nextChapterId) {
    const screen = document.getElementById('tutorial-complete-screen');
    screen.classList.remove('hidden');

    const ch = TutorialData.getChapter(chapterId);
    document.getElementById('tutorial-complete-title').textContent =
      `${ch ? ch.title : chapterId} クリア！`;
    document.getElementById('tutorial-complete-msg').textContent =
      '訓練を完了しました。';

    const nextBtn = document.getElementById('tutorial-next-btn');
    if (nextChapterId && TutorialData.getChapter(nextChapterId)) {
      nextBtn.style.display = 'inline-block';
      nextBtn.textContent = '次の章へ';
      nextBtn.onclick = () => {
        this._hideScreen('tutorial-complete-screen');
        Game.startTutorial(nextChapterId);
      };
    } else {
      nextBtn.style.display = 'none';
    }

    document.getElementById('tutorial-title-btn').onclick = () => {
      this._hideScreen('tutorial-complete-screen');
      Game.backToTitle();
    };

    document.getElementById('tutorial-start-game-btn').onclick = () => {
      this._hideScreen('tutorial-complete-screen');
      Game.start();
    };
  },

  _hideScreen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  },
};
