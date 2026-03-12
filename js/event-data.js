// =============================================================================
// Event Data
// =============================================================================

const EVENT_LINE = {
  EXPEDITION: 'expedition',
  SEALERS: 'sealers',
  MERCHANTS: 'merchants',
  SPIRITS: 'spirits',
  CIVILIANS: 'civilians',
  BLOODLINE: 'bloodline',
};

const EVENT_TRIGGER = {
  FLOOR_START: 'on_floor_start',
  ENTER_ROOM: 'on_enter_room',
  SEARCH_WALL: 'on_search_wall',
  OPEN_CHEST: 'on_open_chest',
  MEET_MERCHANT: 'on_meet_merchant',
  BOSS_WARNING_FLOOR: 'on_boss_warning_floor',
  INTERACT_REMAINS: 'on_interact_remains',
};

const EVENT_REWARD_TYPE = {
  ITEM: 'item',
  GOLD: 'gold',
  FLAG: 'flag',
  DISCOUNT: 'discount',
  HINT: 'hint',
  SECRET_REVEAL: 'secret_reveal',
  BUFF: 'buff',
};

const EVENT_DEFS = [
  {
    id: 'expedition_campfire',
    line: EVENT_LINE.EXPEDITION,
    title: '消えた焚き火',
    floorRange: [1, 2],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      'まだ新しい灰だ。おまえ以外にも、ここへ入った者がいる。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'food', amount: 1 },
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'heal_potion', amount: 1, chance: 0.35 },
    ],
    followUp: ['expedition_scout_body'],
    notes: '序盤の探索導線。補給の痕跡として使う。',
  },
  {
    id: 'expedition_scout_body',
    line: EVENT_LINE.EXPEDITION,
    title: '斥候の死体',
    floorRange: [2, 3],
    trigger: EVENT_TRIGGER.INTERACT_REMAINS,
    messages: [
      '壁際に、同盟の斥候が倒れている。',
      '「三階より下、罠の造りが変わる。誰かがまだ守っている」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'scroll_map', amount: 1, chance: 0.5 },
      { type: EVENT_REWARD_TYPE.HINT, value: 'trap_floor_warning' },
    ],
    followUp: ['expedition_order_board'],
    notes: '調査隊ラインの認知イベント。',
  },
  {
    id: 'expedition_order_board',
    line: EVENT_LINE.EXPEDITION,
    title: '隊長の命令板',
    floorRange: [4, 5],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '急いで残された木板がある。',
      '「門を抜けるな。角のあるものが巡回している」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'minotaur_warning_seen' },
    ],
    followUp: ['expedition_broken_supply'],
    notes: 'Floor 5 ボス前の予兆。',
  },
  {
    id: 'expedition_broken_supply',
    line: EVENT_LINE.EXPEDITION,
    title: '壊れた補給箱',
    floorRange: [5, 6],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      'ここで撤退が破綻したのだろう。物資だけが残されている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'heal_potion', amount: 2, chance: 0.6 },
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'armor', amount: 1, rarityMin: 'common', chance: 0.5 },
    ],
    followUp: ['expedition_captain_relic'],
    notes: 'ミノタウロス撃破後に出やすくしてもよい。',
  },
  {
    id: 'expedition_captain_relic',
    line: EVENT_LINE.EXPEDITION,
    title: '隊長の遺品',
    floorRange: [7, 8],
    trigger: EVENT_TRIGGER.INTERACT_REMAINS,
    messages: [
      '同盟隊長の遺品が残されている。',
      '「司はまだ下にいる。あれを倒せば終わるわけではない」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'weapon', amount: 1, rarityMin: 'uncommon' },
      { type: EVENT_REWARD_TYPE.GOLD, amount: 40 },
    ],
    followUp: ['expedition_final_record'],
    notes: '終盤へ向けた意味反転の前振り。',
  },
  {
    id: 'expedition_final_record',
    line: EVENT_LINE.EXPEDITION,
    title: '最後の記録',
    floorRange: [9, 9],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '紙片に、最後の一文だけが残っている。',
      '「もしここへ至る者がいるなら、核を壊すな。繋ぎ直せ」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'seal_core_truth_known' },
    ],
    followUp: ['sealer_late_confession'],
    notes: '最重要テキストのひとつ。',
  },
  {
    id: 'sealer_burned_archive',
    line: EVENT_LINE.SEALERS,
    title: '焼けた書庫',
    floorRange: [4, 5],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '王朝の記録が焼かれている。隠したかったのは敗北ではなく、真実かもしれない。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'scroll_map', amount: 1, chance: 0.4 },
    ],
    followUp: ['sealer_diagram_fragment'],
    notes: '王朝 lore の入口。',
  },
  {
    id: 'sealer_diagram_fragment',
    line: EVENT_LINE.SEALERS,
    title: '封印図の破片',
    floorRange: [6, 7],
    trigger: EVENT_TRIGGER.INTERACT_REMAINS,
    messages: [
      '淵火を囲む図が描かれている。',
      '「淵火は討てぬ。囲い、縫い止め、眠らせよ」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'seal_method_known' },
    ],
    followUp: ['sealer_echo'],
    notes: '「壊すな」の意味を準備する。',
  },
  {
    id: 'sealer_echo',
    line: EVENT_LINE.SEALERS,
    title: '封印司の残響',
    floorRange: [7, 8],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '一瞬だけ、声が残る。',
      '「門は落ちたか。ならば、まだ誰かが来たのだな」',
    ],
    reward: [],
    followUp: ['sealer_prayer_rewritten'],
    notes: '敵でない霊的接触の初例。',
  },
  {
    id: 'sealer_prayer_rewritten',
    line: EVENT_LINE.SEALERS,
    title: '書き換えられた祈り',
    floorRange: [8, 9],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '祈祷文が途中から命令文に変わっている。',
      '「鎮めよ」ではなく「持ちこたえよ」に変わっている。',
    ],
    reward: [],
    followUp: ['sealer_late_confession'],
    notes: 'リッチの役割反転の直前。',
  },
  {
    id: 'sealer_late_confession',
    line: EVENT_LINE.SEALERS,
    title: '司の告白',
    floorRange: [10, 10],
    trigger: EVENT_TRIGGER.BOSS_WARNING_FLOOR,
    messages: [
      'おまえもまた、繋ぐために来たのか。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'lich_truth_revealed' },
    ],
    followUp: [],
    notes: 'Floor 10 ボス前の短い演出。',
  },
  {
    id: 'merchant_lost_cargo',
    line: EVENT_LINE.MERCHANTS,
    title: '失われた荷',
    floorRange: [2, 4],
    trigger: EVENT_TRIGGER.MEET_MERCHANT,
    messages: [
      '商人が失くした荷を探している。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.DISCOUNT, value: 'merchant_discount_small' },
      { type: EVENT_REWARD_TYPE.GOLD, amount: 20, branch: 'keep_cargo' },
    ],
    followUp: ['merchant_seris_secret'],
    notes: '分岐型イベント。',
  },
  {
    id: 'merchant_seris_secret',
    line: EVENT_LINE.MERCHANTS,
    title: 'セリスの偽り',
    floorRange: [5, 7],
    trigger: EVENT_TRIGGER.MEET_MERCHANT,
    messages: [
      'あの女は、封を恐れているんじゃない。封が解ける時の値を見ている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'seris_secret_known' },
    ],
    followUp: ['merchant_halven_ledger'],
    notes: '商人の裏事情。',
  },
  {
    id: 'merchant_drum_past',
    line: EVENT_LINE.MERCHANTS,
    title: 'ドラムの過去',
    floorRange: [4, 6],
    trigger: EVENT_TRIGGER.MEET_MERCHANT,
    messages: [
      '「俺も昔は下を目指した。片脚を置いてきて、それでやめた」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.HINT, value: 'boss_movement_hint' },
      { type: EVENT_REWARD_TYPE.DISCOUNT, value: 'drum_practical_discount' },
    ],
    followUp: [],
    notes: 'ドラム個別イベント。',
  },
  {
    id: 'merchant_halven_ledger',
    line: EVENT_LINE.MERCHANTS,
    title: 'ハルヴェンの帳簿',
    floorRange: [6, 8],
    trigger: EVENT_TRIGGER.MEET_MERCHANT,
    messages: [
      '帳簿に、誰が何を買って下へ降りたか記されている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'expedition_ledger_seen' },
    ],
    followUp: ['expedition_captain_relic'],
    notes: '調査隊と商人ラインを接続。',
  },
  {
    id: 'spirit_harmless_shadow',
    line: EVENT_LINE.SPIRITS,
    title: '無害な影',
    floorRange: [5, 6],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '影が一度だけこちらを見て、攻撃もせずに消えた。',
    ],
    reward: [],
    followUp: ['spirit_pointing_wall'],
    notes: '亡霊イベントの導入。',
  },
  {
    id: 'spirit_pointing_wall',
    line: EVENT_LINE.SPIRITS,
    title: '壁を指す亡霊',
    floorRange: [6, 7],
    trigger: EVENT_TRIGGER.SEARCH_WALL,
    messages: [
      '影が壁の前で止まり、消えた。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.SECRET_REVEAL, value: 'nearby_hidden_room' },
    ],
    followUp: ['spirit_false_warning'],
    notes: '隠し部屋と結びつけやすい。',
  },
  {
    id: 'spirit_false_warning',
    line: EVENT_LINE.SPIRITS,
    title: '誤った警告',
    floorRange: [7, 8],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      'かすれた声が残る。',
      '「壊すな」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'spirit_warning_started' },
    ],
    followUp: ['spirit_warning_resolved'],
    notes: '意味が分からないまま残す。',
  },
  {
    id: 'spirit_warning_resolved',
    line: EVENT_LINE.SPIRITS,
    title: '警告の回収',
    floorRange: [9, 10],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '亡霊の言葉の続きが、ようやく分かる。',
      '「核を壊すな。繋ぎ直せ」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'spirit_warning_resolved' },
    ],
    followUp: [],
    notes: '調査隊ラインの最後と重ねてもよい。',
  },
  {
    id: 'civilian_fleeing_miner',
    line: EVENT_LINE.CIVILIANS,
    title: '逃亡坑夫',
    floorRange: [2, 4],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '坑夫がこちらを見て怯えている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.HINT, value: 'safe_route_hint', branch: 'help' },
    ],
    followUp: ['civilian_family_letter'],
    notes: '初期の人間味イベント。',
  },
  {
    id: 'civilian_mad_pilgrim',
    line: EVENT_LINE.CIVILIANS,
    title: '狂った巡礼者',
    floorRange: [5, 7],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '燈火教会の巡礼者だったものが、淵火に呑まれている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.ITEM, itemType: 'special_drop', amount: 1, chance: 0.5 },
    ],
    followUp: [],
    notes: '汚染人型導入に向く。',
  },
  {
    id: 'civilian_family_letter',
    line: EVENT_LINE.CIVILIANS,
    title: '家族への手紙',
    floorRange: [6, 8],
    trigger: EVENT_TRIGGER.INTERACT_REMAINS,
    messages: [
      '「春までには帰る、と書いた。たぶん届かない」',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.GOLD, amount: 10 },
    ],
    followUp: [],
    notes: '報酬は薄くてよい。',
  },
  {
    id: 'bloodline_old_seal',
    line: EVENT_LINE.BLOODLINE,
    title: '古い印章',
    floorRange: [3, 5],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      'おまえの持つ紋と同じ刻印が、石に残っている。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'bloodline_mark_seen' },
    ],
    followUp: ['bloodline_pillar_reaction'],
    notes: '主人公の特別性の最初の提示。',
  },
  {
    id: 'bloodline_pillar_reaction',
    line: EVENT_LINE.BLOODLINE,
    title: '封印柱の反応',
    floorRange: [6, 8],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '封印柱が、おまえの前でだけわずかに光る。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.BUFF, value: 'minor_seal_blessing' },
    ],
    followUp: ['bloodline_true_name'],
    notes: '主人公の役目を匂わせる。',
  },
  {
    id: 'bloodline_true_name',
    line: EVENT_LINE.BLOODLINE,
    title: '残響の呼称',
    floorRange: [9, 10],
    trigger: EVENT_TRIGGER.ENTER_ROOM,
    messages: [
      '残響が、おまえを「辺境守」と呼ぶ。',
    ],
    reward: [
      { type: EVENT_REWARD_TYPE.FLAG, value: 'warden_identity_confirmed' },
    ],
    followUp: [],
    notes: '主人公の役目を確定させる。',
  },
];

const EventData = {
  EVENT_LINE,
  EVENT_TRIGGER,
  EVENT_REWARD_TYPE,
  EVENT_DEFS,

  getById(id) {
    return EVENT_DEFS.find((eventDef) => eventDef.id === id) || null;
  },

  getForFloor(floor) {
    return EVENT_DEFS.filter((eventDef) => (
      floor >= eventDef.floorRange[0] && floor <= eventDef.floorRange[1]
    ));
  },

  getByLine(line) {
    return EVENT_DEFS.filter((eventDef) => eventDef.line === line);
  },
};
