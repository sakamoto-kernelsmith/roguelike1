// =============================================================================
// Tutorial Data - Fixed maps, objectives, triggers for all tutorial chapters
// =============================================================================

const TUTORIAL_TILE = {
  '#': 'wall',
  '.': 'floor',
  '@': 'player_start',
  '>': 'stairs',
  'd': 'locked_door',
  's': 'trigger_floor',
  'e': 'enemy_spawn',
  'i': 'item_spawn',
  't': 'trap_spawn',
  ' ': 'void',
};

const TutorialData = {
  chapters: {

    // =========================================================================
    // INTRO 1: Movement & Vision
    // =========================================================================
    intro_movement: {
      id: 'intro_movement',
      title: '移動と視界',
      category: 'intro',
      unlock: 'default',
      allowSkip: true,
      nextChapterId: 'intro_combat',
      suppressSkills: true,

      map: [
        '####################',
        '#@....s......d....>#',
        '#.####.######.###..#',
        '#....#......#......#',
        '###..######.####...#',
        '#..................#',
        '####################',
      ],

      playerStart: { x: 1, y: 1 },
      stairs: [{ x: 18, y: 1, locked: true }],
      doors: [{ id: 'door_wait_1', x: 13, y: 1, locked: true }],
      enemies: [],
      items: [],
      traps: [],
      checkpoints: [],

      objectives: [
        {
          id: 'move_once',
          type: 'player_moved',
          target: 1,
          hint: '移動して視界を広げましょう。',
          helperText: '移動: WASD / 矢印キー / テンキー（斜めも可）',
          onComplete: [
            { type: 'show_hint', text: '見えない場所には敵や罠が潜んでいます。' },
          ]
        },
        {
          id: 'reach_wait_tile',
          type: 'entered_tile',
          positions: [{ x: 6, y: 1 }],
          hint: '光っている場所まで進みましょう。',
          helperText: '暗闇の向こうには何があるかわかりません。',
          onComplete: [
            { type: 'show_hint', text: 'その場で1ターン待つと敵を誘えることがあります。' },
            { type: 'play_effect', effect: 'ping', x: 6, y: 1 },
          ]
        },
        {
          id: 'wait_once',
          type: 'player_waited',
          target: 1,
          hint: 'その場で1ターン待ってみましょう。',
          helperText: '待機: Space または テンキー5',
          onComplete: [
            { type: 'open_door', id: 'door_wait_1' },
            { type: 'unlock_stairs' },
            { type: 'show_hint', text: '道が開きました。階段へ向かいましょう。' },
          ]
        },
        {
          id: 'use_stairs',
          type: 'used_stairs',
          target: 1,
          hint: '階段に乗って Enter で次へ進みましょう。',
          helperText: '階段は準備が整ってから使います。',
          onComplete: [
            { type: 'complete_chapter' }
          ]
        }
      ],

      triggers: [
        {
          id: 'start_message',
          type: 'on_start',
          actions: [
            { type: 'show_banner', text: 'Chapter 1: 移動と視界' },
            { type: 'show_hint', text: '周囲だけが見えます。まずは1歩動きましょう。' },
          ]
        },
      ],
    },

    // =========================================================================
    // INTRO 2: Basic Combat
    // =========================================================================
    intro_combat: {
      id: 'intro_combat',
      title: '基本戦闘',
      category: 'intro',
      unlock: 'after_movement',
      allowSkip: true,
      nextChapterId: 'intro_items',
      suppressSkills: true,

      map: [
        '########################',
        '#@.....#...............#',
        '#......#.....e.........#',
        '#......#...............#',
        '#..e...####.####.......#',
        '#..........d.....e..e..#',
        '#......####.####.......#',
        '#......#...............#',
        '#......#..........>....#',
        '########################',
      ],

      playerStart: { x: 1, y: 1 },
      stairs: [{ x: 18, y: 8, locked: true }],
      doors: [{ id: 'door_combat_2', x: 11, y: 5, locked: true }],
      enemies: [
        { id: 'combat_slime_1', x: 3, y: 4, template: 'slime', hpOverride: 8, atkOverride: 2, defOverride: 0 },
        { id: 'combat_slime_2', x: 13, y: 2, template: 'slime', hpOverride: 8, atkOverride: 2, defOverride: 0 },
        { id: 'combat_slime_3', x: 17, y: 5, template: 'slime', hpOverride: 7, atkOverride: 2, defOverride: 0 },
        { id: 'combat_slime_4', x: 19, y: 5, template: 'slime', hpOverride: 7, atkOverride: 2, defOverride: 0 },
      ],
      items: [],
      traps: [],
      checkpoints: [
        { id: 'cp_combat_start', x: 1, y: 1, activeOnObjective: 'kill_first' },
        { id: 'cp_combat_mid', x: 7, y: 5, activeOnObjective: 'lure_enemy' },
      ],
      playerOverrides: { hp: 30, maxHp: 30, baseAtk: 5, baseDef: 2 },

      objectives: [
        {
          id: 'kill_first',
          type: 'enemy_killed',
          target: 1,
          hint: '敵に踏み込んで攻撃しましょう。',
          helperText: '敵の方向に移動キーを押すと攻撃します。',
          onComplete: [
            { type: 'show_hint', text: '近づいてきた敵は通路で待ち構えましょう。' },
          ]
        },
        {
          id: 'lure_enemy',
          type: 'player_waited',
          target: 1,
          hint: '通路で待機して敵を誘いましょう。',
          helperText: '通路なら一度に1体だけ相手にできます。',
          onComplete: [
            { type: 'open_door', id: 'door_combat_2' },
            { type: 'show_hint', text: '部屋の敵も通路に誘いましょう。' },
          ]
        },
        {
          id: 'kill_all',
          type: 'enemy_killed',
          target: 4,
          countAll: true,
          hint: 'すべての敵を倒しましょう。',
          helperText: '部屋の中央では囲まれやすくなります。',
          onComplete: [
            { type: 'unlock_stairs' },
            { type: 'show_hint', text: '敵を全滅させました。階段へ進みましょう。' },
          ]
        },
        {
          id: 'combat_exit',
          type: 'used_stairs',
          target: 1,
          hint: '階段で次へ進みましょう。',
          helperText: '',
          onComplete: [
            { type: 'complete_chapter' }
          ]
        }
      ],

      triggers: [
        {
          id: 'start_combat',
          type: 'on_start',
          actions: [
            { type: 'show_banner', text: 'Chapter 2: 基本戦闘' },
            { type: 'show_hint', text: 'ターン制です。あなたが動くと敵も1歩動きます。' },
          ]
        },
      ],

      onDeath: {
        hint: '部屋の中央では囲まれやすい。通路に誘って戦おう。',
      },
    },

    // =========================================================================
    // INTRO 3: Items & Equipment
    // =========================================================================
    intro_items: {
      id: 'intro_items',
      title: 'アイテムと装備',
      category: 'intro',
      unlock: 'after_combat',
      allowSkip: true,
      nextChapterId: 'intro_progression',
      suppressSkills: true,

      map: [
        '######################',
        '#@....e....d..i......#',
        '#..........#.........#',
        '#..........#...i.....#',
        '#..........#.........#',
        '#..........d....e..>.#',
        '######################',
      ],

      playerStart: { x: 1, y: 1 },
      stairs: [{ x: 19, y: 5, locked: true }],
      doors: [
        { id: 'door_items_1', x: 11, y: 1, locked: true },
        { id: 'door_items_2', x: 11, y: 5, locked: true },
      ],
      enemies: [
        { id: 'items_slime_1', x: 6, y: 1, template: 'slime', hpOverride: 10, atkOverride: 4, defOverride: 0 },
        { id: 'items_enemy_2', x: 17, y: 5, template: 'slime', hpOverride: 12, atkOverride: 3, defOverride: 0, expOverride: 10 },
      ],
      items: [
        { id: 'tut_heal_potion', x: 13, y: 1, defId: 'heal_potion' },
        { id: 'tut_short_sword', x: 15, y: 3, defId: 'short_sword' },
      ],
      traps: [],
      checkpoints: [
        { id: 'cp_items_start', x: 1, y: 1, activeOnObjective: 'take_damage' },
      ],
      playerOverrides: { hp: 20, maxHp: 30, baseAtk: 3, baseDef: 1, exp: 0 },

      objectives: [
        {
          id: 'take_damage',
          type: 'enemy_killed',
          target: 1,
          hint: '敵を倒しましょう。',
          helperText: '被弾してもアイテムで回復できます。',
          onComplete: [
            { type: 'open_door', id: 'door_items_1' },
            { type: 'show_hint', text: '回復薬を拾って使いましょう。' },
          ]
        },
        {
          id: 'use_potion',
          type: 'used_item',
          target: 1,
          hint: '回復薬を使いましょう。(番号キー)',
          helperText: 'アイテムの上を歩くと拾えます。番号キー(1-5)で使用。',
          onComplete: [
            { type: 'show_hint', text: '武器も拾って装備しましょう。' },
          ]
        },
        {
          id: 'equip_weapon',
          type: 'equipped_item',
          target: 1,
          hint: '武器を拾って装備しましょう。(番号キー)',
          helperText: '武器・防具も番号キーで装備。ATKやDEFが上がります。',
          onComplete: [
            { type: 'open_door', id: 'door_items_2' },
            { type: 'show_hint', text: '強くなりました。最後の敵を倒しましょう。' },
          ]
        },
        {
          id: 'level_up',
          type: 'player_level_up',
          target: 1,
          hint: '敵を倒してレベルアップしましょう。',
          helperText: '敵を倒すと経験値(EXP)を獲得します。',
          onComplete: [
            { type: 'unlock_stairs' },
            { type: 'show_hint', text: 'レベルアップでステータスが上がります。階段へ。' },
          ]
        },
        {
          id: 'items_exit',
          type: 'used_stairs',
          target: 1,
          hint: '階段で次へ進みましょう。',
          helperText: '',
          onComplete: [
            { type: 'complete_chapter' }
          ]
        }
      ],

      triggers: [
        {
          id: 'start_items',
          type: 'on_start',
          actions: [
            { type: 'show_banner', text: 'Chapter 3: アイテムと装備' },
            { type: 'show_hint', text: 'アイテムの上を歩くと拾えます。番号キーで使用・装備します。' },
          ]
        },
      ],

      onDeath: {
        hint: '回復薬を早めに使おう。アイテムは温存しすぎないこと。',
      },
    },

    // =========================================================================
    // INTRO 4: Progression
    // =========================================================================
    intro_progression: {
      id: 'intro_progression',
      title: '階段とフロア進行',
      category: 'intro',
      unlock: 'after_items',
      allowSkip: true,
      nextChapterId: null,

      map: [
        '################',
        '#@.............#',
        '#..............#',
        '#..............#',
        '#............>.#',
        '################',
      ],

      playerStart: { x: 1, y: 1 },
      stairs: [{ x: 13, y: 4, locked: false }],
      doors: [],
      enemies: [],
      items: [],
      traps: [],
      checkpoints: [],

      objectives: [
        {
          id: 'final_descend',
          type: 'used_stairs',
          target: 1,
          hint: '階段で深淵へ踏み出しましょう。',
          helperText: '全10フロア。5Fと10Fにはボスが待ち構えています。',
          onComplete: [
            { type: 'complete_chapter' }
          ]
        }
      ],

      triggers: [
        {
          id: 'start_progression',
          type: 'on_start',
          actions: [
            { type: 'show_banner', text: 'Chapter 4: 階段とフロア進行' },
            { type: 'show_hint', text: 'フロアが深くなるほど敵が強くなり、良いアイテムも出現します。' },
          ]
        },
      ],
    },

    // =========================================================================
    // ADVANCED 1: Skills & Status Effects
    // =========================================================================
    advanced_skills: {
      id: 'advanced_skills',
      title: '状態異常とスキル',
      category: 'advanced',
      unlock: 'after_intro',
      allowSkip: true,
      nextChapterId: null,

      map: [
        '################################',
        '#@....d......d......d..........#',
        '######.######.######.########..#',
        '#....#.#....#.#....#.#......#..#',
        '#..e...#..e...#..e...#.........#',
        '#....#.#....#.#....#.#......#..#',
        '######.######.######.########..#',
        '#.................d...........>#',
        '################################',
      ],

      playerStart: { x: 1, y: 1 },
      stairs: [{ x: 30, y: 7, locked: true }],
      doors: [
        { id: 'door_trial_a', x: 6, y: 1, locked: false },
        { id: 'door_trial_b', x: 13, y: 1, locked: true },
        { id: 'door_trial_c', x: 20, y: 1, locked: true },
        { id: 'door_trial_d', x: 18, y: 7, locked: true },
      ],
      enemies: [
        { id: 'trial_a_enemy', x: 3, y: 4, template: 'orc', hpOverride: 18, atkOverride: 3, defOverride: 1 },
        { id: 'trial_b_enemy', x: 10, y: 4, template: 'skeleton', hpOverride: 14, atkOverride: 4, defOverride: 2 },
        { id: 'trial_c_enemy', x: 17, y: 4, template: 'troll', hpOverride: 24, atkOverride: 4, defOverride: 3 },
      ],
      items: [],
      traps: [],
      specialZones: [
        {
          id: 'trial_d_hazard',
          tiles: [{ x: 25, y: 4 }, { x: 26, y: 4 }, { x: 27, y: 4 }],
          behavior: 'danger_line',
        }
      ],
      checkpoints: [
        { id: 'cp_trial_a', x: 1, y: 1, activeOnObjective: 'skill_q' },
        { id: 'cp_trial_b', x: 8, y: 4, activeOnObjective: 'skill_e_stun' },
        { id: 'cp_trial_c', x: 15, y: 4, activeOnObjective: 'skill_r_poison' },
        { id: 'cp_trial_d', x: 23, y: 4, activeOnObjective: 'skill_f_blink' },
      ],
      playerOverrides: { hp: 30, maxHp: 30, baseAtk: 5, baseDef: 2 },
      grantSkills: true,

      objectives: [
        {
          id: 'skill_q',
          type: 'used_skill',
          skillKey: 'q',
          target: 1,
          hint: 'Qキーでパワースラッシュを使いましょう。',
          helperText: 'パワースラッシュ: ATKの2倍ダメージ。CD 5ターン。',
          onStart: [
            { type: 'set_skill_cooldown', key: 'q', value: 0 },
          ],
          onComplete: [
            { type: 'heal_player', amount: 8 },
            { type: 'open_door', id: 'door_trial_b' },
            { type: 'show_hint', text: '次は敵を止めるスキルを試します。' },
          ]
        },
        {
          id: 'skill_e_stun',
          type: 'status_applied',
          status: 'stun',
          target: 1,
          hint: 'Eキーでシールドバッシュを使いましょう。',
          helperText: 'シールドバッシュ: DEF値でダメージ＋スタン（1ターン行動不能）。',
          onStart: [
            { type: 'set_skill_cooldown', key: 'e', value: 0 },
            { type: 'teleport_player', x: 8, y: 4 },
            { type: 'set_checkpoint', x: 8, y: 4 },
          ],
          onComplete: [
            { type: 'heal_player', amount: 8 },
            { type: 'open_door', id: 'door_trial_c' },
            { type: 'show_hint', text: '次は長引く敵に毒を入れます。' },
          ]
        },
        {
          id: 'skill_r_poison',
          type: 'status_applied',
          status: 'poison',
          target: 1,
          hint: 'Rキーでポイズンストライクを使いましょう。',
          helperText: 'ポイズンストライク: 攻撃＋毒付与（毎ターンHP-2、5ターン）。',
          onStart: [
            { type: 'set_skill_cooldown', key: 'r', value: 0 },
            { type: 'teleport_player', x: 15, y: 4 },
            { type: 'set_checkpoint', x: 15, y: 4 },
          ],
          onComplete: [
            { type: 'heal_player', amount: 10 },
            { type: 'open_door', id: 'door_trial_d' },
            { type: 'show_hint', text: '最後は瞬歩で危険地帯を越えます。' },
          ]
        },
        {
          id: 'skill_f_blink',
          type: 'used_skill',
          skillKey: 'f',
          target: 1,
          hint: 'Fキーで瞬歩を使い、前方へテレポートしましょう。',
          helperText: '瞬歩: 向いている方向に3マステレポート。CD 8ターン。',
          onStart: [
            { type: 'set_skill_cooldown', key: 'f', value: 0 },
            { type: 'teleport_player', x: 23, y: 4 },
            { type: 'set_checkpoint', x: 23, y: 4 },
          ],
          onComplete: [
            { type: 'unlock_stairs' },
            { type: 'show_hint', text: '4つのスキルを試しました。出口へ進みましょう。' },
          ]
        },
        {
          id: 'skills_exit',
          type: 'used_stairs',
          target: 1,
          hint: '出口の階段で訓練を終えましょう。',
          helperText: '使いどころを覚えれば戦闘の幅が大きく広がります。',
          onComplete: [
            { type: 'complete_chapter' }
          ]
        }
      ],

      triggers: [
        {
          id: 'skills_start',
          type: 'on_start',
          actions: [
            { type: 'show_banner', text: 'Training: 状態異常とスキル' },
            { type: 'show_hint', text: '4つのスキルを試します。各スキルにはクールダウン(CD)があります。' },
          ]
        },
      ],

      onDeath: {
        hint: 'スキルを早めに使おう。温存しすぎず、切り札として活用すること。',
      },
    },
  },

  getChapter(id) {
    return this.chapters[id] || null;
  },

  getIntroChapterIds() {
    return ['intro_movement', 'intro_combat', 'intro_items', 'intro_progression'];
  },

  getAdvancedChapterIds() {
    return ['advanced_skills'];
  },

  getAllChapterIds() {
    return [...this.getIntroChapterIds(), ...this.getAdvancedChapterIds()];
  },
};
