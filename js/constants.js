// =============================================================================
// Constants
// =============================================================================

const TILE_SIZE = 20;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 30;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

const VIEW_COLS = 38;
const VIEW_ROWS = 30;

// Tile types
const TILE = {
  VOID: 0,
  FLOOR: 1,
  WALL: 2,
  CORRIDOR: 3,
  DOOR: 4,
  STAIRS_DOWN: 5,
  STAIRS_UP: 6,
};

const TILE_DISPLAY = {
  [TILE.VOID]:        [' ',  '#000',    '#000'],
  [TILE.FLOOR]:       ['.',  '#444',    '#111'],
  [TILE.WALL]:        ['#',  '#666',    '#222'],
  [TILE.CORRIDOR]:    ['.',  '#3a3a3a', '#0d0d0d'],
  [TILE.DOOR]:        ['+',  '#a07030', '#111'],
  [TILE.STAIRS_DOWN]: ['>',  '#00ccff', '#111'],
  [TILE.STAIRS_UP]:   ['<',  '#00ccff', '#111'],
};

const DIR = {
  N:  { x:  0, y: -1 },
  S:  { x:  0, y:  1 },
  W:  { x: -1, y:  0 },
  E:  { x:  1, y:  0 },
  NW: { x: -1, y: -1 },
  NE: { x:  1, y: -1 },
  SW: { x: -1, y:  1 },
  SE: { x:  1, y:  1 },
};

const ALL_DIRS = Object.values(DIR);
const CARDINAL_DIRS = [DIR.N, DIR.S, DIR.W, DIR.E];

// --- Status Effects ---
const STATUS = {
  POISON: 'poison',
  STUN: 'stun',
  BURN: 'burn',
  HASTE: 'haste',
  SLOW: 'slow',
  WEAKNESS: 'weakness',
};

// --- Floor Mutations ---
const MUTATION = {
  NONE: 'none',
  POISON_FOG: 'poison_fog',
  HUNT: 'hunt',
  FAMINE: 'famine',
  TREASURE: 'treasure',
  SILENCE: 'silence',
  TRAP_FLOOR: 'trap_floor',
};

const MUTATION_DEFS = {
  [MUTATION.POISON_FOG]: { name: '毒霧階', desc: '一部の部屋に毒領域が漂う', color: '#40aa40' },
  [MUTATION.HUNT]:       { name: '狩猟階', desc: '敵の索敵範囲が上昇', color: '#dd6060' },
  [MUTATION.FAMINE]:     { name: '飢餓階', desc: '空腹が早く減るが食料も多い', color: '#cc9944' },
  [MUTATION.TREASURE]:   { name: '財宝階', desc: '宝箱とゴールドが多いが敵も強い', color: '#ffcc00' },
  [MUTATION.SILENCE]:    { name: '静寂階', desc: '敵が少ないが精鋭が出現', color: '#8888cc' },
  [MUTATION.TRAP_FLOOR]: { name: '罠階',   desc: '罠が多いがレア箱率上昇', color: '#aa6633' },
};

// --- Room Events ---
const ROOM_EVENT = {
  ALTAR: 'altar',
  FOUNTAIN: 'fountain',
  VAULT: 'vault',
  WOUNDED_MERCHANT: 'wounded_merchant',
  GHOST_REMAINS: 'ghost_remains',
};

const ROOM_EVENT_DEFS = {
  [ROOM_EVENT.ALTAR]:    { name: '呪われた祭壇', ch: '&', color: '#cc44ff', desc: 'HPを捧げて恒久バフ' },
  [ROOM_EVENT.FOUNTAIN]: { name: '回復の泉',     ch: '~', color: '#40ccff', desc: '回復か状態異常解除' },
  [ROOM_EVENT.VAULT]:    { name: '封印宝物庫',   ch: '#', color: '#ffcc00', desc: '罠多め、高報酬' },
  [ROOM_EVENT.WOUNDED_MERCHANT]: { name: '負傷商人', ch: '$', color: '#dd8844', desc: '回復すると割引' },
  [ROOM_EVENT.GHOST_REMAINS]:    { name: '亡者の遺品', ch: '?', color: '#8888cc', desc: '強い装備か呪いの二択' },
};

// --- Enemy Roles ---
const ENEMY_ROLE = {
  FRONTLINE: 'frontline',
  BACKLINE: 'backline',
  SUPPORT: 'support',
  DEBUFF: 'debuff',
};

// --- Enemy Prefixes ---
const ENEMY_PREFIX = {
  NONE: null,
  VENOMOUS: { name: '猛毒', color: '#40dd40', hpMult: 1.0, atkMult: 1.0, defMult: 1.0, onHit: STATUS.POISON },
  SWIFT:    { name: '俊足', color: '#40ddff', hpMult: 0.9, atkMult: 1.1, defMult: 1.0, hasHaste: true },
  ARMORED:  { name: '装甲', color: '#aaaacc', hpMult: 1.3, atkMult: 1.0, defMult: 1.8, onHit: null },
  BERSERK:  { name: '狂暴', color: '#ff4444', hpMult: 1.2, atkMult: 1.5, defMult: 0.8, onHit: null },
};

// --- Noise System ---
const NOISE = {
  MOVE: 1,
  ATTACK: 3,
  CRITICAL: 5,
  SKILL: 4,
  TRAP: 6,
  ALARM: 99,
  BOSS_ACTION: 8,
  CHEST: 4,
  WAKE_RADIUS_BASE: 5,
};

// --- Rarity ---
const RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  LEGENDARY: 'legendary',
};

const RARITY_COLORS = {
  [RARITY.COMMON]: '#cccccc',
  [RARITY.UNCOMMON]: '#40e040',
  [RARITY.RARE]: '#4080ff',
  [RARITY.LEGENDARY]: '#ffcc00',
};

// --- Trap Types ---
const TRAP_TYPE = {
  SPIKE: 'spike',
  POISON_GAS: 'poison_gas',
  TELEPORT: 'teleport',
  PIT: 'pit',
  ALARM: 'alarm',
};

const TRAP_DEFS = [
  { type: TRAP_TYPE.SPIKE,      name: 'スパイクトラップ', ch: '^', color: '#aa6633', damage: 8,  alwaysVisible: true,  weight: 30 },
  { type: TRAP_TYPE.POISON_GAS, name: '毒ガストラップ',   ch: '^', color: '#40aa40', damage: 0,  alwaysVisible: false, weight: 25 },
  { type: TRAP_TYPE.TELEPORT,   name: 'テレポートトラップ', ch: '^', color: '#6060dd', damage: 0,  alwaysVisible: false, weight: 20 },
  { type: TRAP_TYPE.PIT,        name: '落とし穴',         ch: '^', color: '#663300', damage: 15, alwaysVisible: false, weight: 15 },
  { type: TRAP_TYPE.ALARM,      name: '警報トラップ',     ch: '^', color: '#dd6060', damage: 0,  alwaysVisible: false, weight: 10 },
];

// --- Skill Definitions ---
const SKILL_DEFS = [
  { id: 'power_slash',   name: 'パワースラッシュ', key: 'q', cooldown: 5, desc: 'ATK×2ダメージ' },
  { id: 'shield_bash',   name: 'シールドバッシュ', key: 'e', cooldown: 7, desc: 'DEF値でダメージ+スタン' },
  { id: 'poison_strike', name: 'ポイズンストライク', key: 'r', cooldown: 6, desc: '攻撃+毒付与' },
  { id: 'blink',         name: '瞬歩',           key: 'f', cooldown: 8, desc: '3マス先にテレポート' },
];

// --- Boss Definitions ---
const BOSS_DEFS = {
  5:  { name: 'ミノタウロス', ch: 'M', color: '#ff6633', hp: 80,  atk: 12, def: 6, exp: 100, gold: 80,  bossType: 'minotaur', roomSize: 11 },
  10: { name: 'リッチ',       ch: 'R', color: '#cc44ff', hp: 140, atk: 18, def: 10, exp: 300, gold: 200, bossType: 'lich',     roomSize: 13 },
};

// --- Enemy Definitions (with abilities, gold, lore) ---
const ENEMY_DEFS = [
  { id: 'slime',     name: 'スライム',     ch: 's', color: '#40e040', hp: 8,  atk: 2,  def: 0, exp: 3,  minFloor: 1, gold: 3,  family: 'tainted_beast', tier: 'lesser',  faction: 'deep_taint',    role: ENEMY_ROLE.FRONTLINE },
  { id: 'bat',       name: 'コウモリ',     ch: 'b', color: '#a060c0', hp: 6,  atk: 3,  def: 0, exp: 3,  minFloor: 1, gold: 2,  family: 'tainted_beast', tier: 'lesser',  faction: 'deep_taint',    evasion: 0.3, role: ENEMY_ROLE.SUPPORT },
  { id: 'rat',       name: 'ネズミ',       ch: 'r', color: '#c09060', hp: 5,  atk: 2,  def: 1, exp: 2,  minFloor: 1, gold: 2,  family: 'tainted_beast', tier: 'lesser',  faction: 'deep_taint',    role: ENEMY_ROLE.DEBUFF },
  { id: 'goblin',    name: 'ゴブリン',     ch: 'g', color: '#60c040', hp: 12, atk: 4,  def: 1, exp: 6,  minFloor: 2, gold: 5,  family: 'fallen_delver', tier: 'common',  faction: 'fallen_delvers', role: ENEMY_ROLE.FRONTLINE },
  { id: 'skeleton',  name: 'スケルトン',   ch: 'S', color: '#cccccc', hp: 15, atk: 5,  def: 2, exp: 8,  minFloor: 3, gold: 8,  family: 'sealed_dead',   tier: 'common',  faction: 'sealed_dead',   role: ENEMY_ROLE.FRONTLINE },
  { id: 'orc',       name: 'オーク',       ch: 'O', color: '#408040', hp: 20, atk: 6,  def: 3, exp: 12, minFloor: 4, gold: 12, family: 'deep_denizen',  tier: 'elite',   faction: 'deep_denizens', role: ENEMY_ROLE.FRONTLINE },
  { id: 'lizardman', name: 'リザードマン', ch: 'l', color: '#40a060', hp: 22, atk: 7,  def: 3, exp: 14, minFloor: 5, gold: 15, family: 'deep_denizen',  tier: 'elite',   faction: 'deep_denizens', role: ENEMY_ROLE.FRONTLINE },
  { id: 'ghost',     name: 'ゴースト',     ch: 'G', color: '#8888cc', hp: 18, atk: 8,  def: 1, exp: 15, minFloor: 5, gold: 15, family: 'bound_spirit',  tier: 'elite',   faction: 'bound_spirits', passWalls: true, role: ENEMY_ROLE.BACKLINE },
  { id: 'troll',     name: 'トロル',       ch: 'T', color: '#609030', hp: 36, atk: 10, def: 6, exp: 22, minFloor: 7, gold: 22, family: 'deep_denizen',  tier: 'greater', faction: 'deep_denizens', role: ENEMY_ROLE.FRONTLINE },
  { id: 'dragon',    name: 'ドラゴン',     ch: 'D', color: '#e04040', hp: 60, atk: 15, def: 9, exp: 55, minFloor: 9, gold: 55, family: 'deep_denizen',  tier: 'greater', faction: 'deep_denizens', breath: true, role: ENEMY_ROLE.BACKLINE },
];

// --- Item Types ---
const ITEM_TYPE = {
  HEAL_POTION: 'heal_potion',
  BIG_HEAL_POTION: 'big_heal_potion',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  SCROLL_MAP: 'scroll_map',
  FOOD: 'food',
  POISON_SCROLL: 'poison_scroll',
};

// --- Item Definitions (with rarity & loreKey) ---
const ITEM_DEFS = [
  // Potions
  { type: ITEM_TYPE.HEAL_POTION,     name: '回復薬',       ch: '!', color: '#e04040', weight: 40, value: 10,  minFloor: 1, rarity: RARITY.COMMON, price: 20, loreKey: 'heal_potion' },
  { type: ITEM_TYPE.BIG_HEAL_POTION, name: '大回復薬',     ch: '!', color: '#ff6060', weight: 15, value: 25,  minFloor: 3, rarity: RARITY.UNCOMMON, price: 50, loreKey: 'big_heal_potion' },
  // Scrolls
  { type: ITEM_TYPE.SCROLL_MAP,      name: '地図の巻物',   ch: '?', color: '#e0e060', weight: 10, value: 0,   minFloor: 1, rarity: RARITY.UNCOMMON, price: 30, loreKey: 'scroll_map' },
  { type: ITEM_TYPE.POISON_SCROLL,   name: '毒の巻物',     ch: '?', color: '#60e060', weight: 8,  value: 0,   minFloor: 2, rarity: RARITY.UNCOMMON, price: 25, loreKey: 'poison_scroll' },
  // Weapons - Common
  { type: ITEM_TYPE.WEAPON, name: '短剣',     ch: '/', color: '#cccccc', weight: 8, atk: 2,  minFloor: 1, rarity: RARITY.COMMON, price: 30, loreKey: 'weapon_dagger' },
  { type: ITEM_TYPE.WEAPON, name: '長剣',     ch: '/', color: '#dddddd', weight: 5, atk: 4,  minFloor: 3, rarity: RARITY.COMMON, price: 60, loreKey: 'weapon_longsword' },
  { type: ITEM_TYPE.WEAPON, name: '大剣',     ch: '/', color: '#eeeeee', weight: 3, atk: 7,  minFloor: 5, rarity: RARITY.UNCOMMON, price: 100, loreKey: 'weapon_greatsword' },
  // Weapons - Rare+
  { type: ITEM_TYPE.WEAPON, name: '炎の剣',   ch: '/', color: '#ff6633', weight: 1, atk: 6,  minFloor: 4, rarity: RARITY.RARE, price: 150, special: 'burn', loreKey: 'weapon_flame' },
  { type: ITEM_TYPE.WEAPON, name: '吸血の剣', ch: '/', color: '#cc3366', weight: 1, atk: 8,  minFloor: 6, rarity: RARITY.RARE, price: 200, special: 'lifesteal', loreKey: 'weapon_vampiric' },
  { type: ITEM_TYPE.WEAPON, name: '魔剣',     ch: '/', color: '#c060e0', weight: 1, atk: 12, minFloor: 8, rarity: RARITY.LEGENDARY, price: 300, loreKey: 'weapon_magic' },
  // Armor - Common
  { type: ITEM_TYPE.ARMOR, name: '皮の鎧',       ch: '[', color: '#a08060', weight: 8, def: 2,  minFloor: 1, rarity: RARITY.COMMON, price: 30, loreKey: 'armor_leather' },
  { type: ITEM_TYPE.ARMOR, name: '鎖帷子',       ch: '[', color: '#aaaaaa', weight: 5, def: 4,  minFloor: 3, rarity: RARITY.COMMON, price: 60, loreKey: 'armor_chain' },
  { type: ITEM_TYPE.ARMOR, name: 'プレートメイル', ch: '[', color: '#cccccc', weight: 3, def: 7,  minFloor: 6, rarity: RARITY.UNCOMMON, price: 120, loreKey: 'armor_plate' },
  // Armor - Rare+
  { type: ITEM_TYPE.ARMOR, name: '回避の鎧',     ch: '[', color: '#40cc80', weight: 1, def: 5,  minFloor: 5, rarity: RARITY.RARE, price: 180, special: 'evasion', loreKey: 'armor_evasion' },
  { type: ITEM_TYPE.ARMOR, name: '反撃の盾',     ch: '[', color: '#dd6644', weight: 1, def: 6,  minFloor: 6, rarity: RARITY.RARE, price: 200, special: 'counter', loreKey: 'armor_counter' },
  { type: ITEM_TYPE.ARMOR, name: '忍び足の靴',   ch: '[', color: '#666699', weight: 1, def: 3,  minFloor: 4, rarity: RARITY.RARE, price: 160, special: 'stealth', loreKey: 'armor_stealth' },
  { type: ITEM_TYPE.ARMOR, name: '魔法の鎧',     ch: '[', color: '#6060e0', weight: 1, def: 11, minFloor: 8, rarity: RARITY.LEGENDARY, price: 300, loreKey: 'armor_magic' },
  // Food
  { type: ITEM_TYPE.FOOD, name: 'パン',       ch: '%', color: '#cc9944', weight: 30, hunger: 30,  minFloor: 1, rarity: RARITY.COMMON, price: 15, loreKey: 'food_bread' },
  { type: ITEM_TYPE.FOOD, name: '肉',         ch: '%', color: '#dd6644', weight: 15, hunger: 50,  minFloor: 2, rarity: RARITY.COMMON, price: 25, loreKey: 'food_meat' },
  { type: ITEM_TYPE.FOOD, name: '豪華な食事', ch: '%', color: '#ffcc44', weight: 5,  hunger: 100, minFloor: 5, rarity: RARITY.UNCOMMON, price: 50, loreKey: 'food_feast' },
];

// --- Rarity drop rates by floor depth ---
function getRarityForFloor(floor) {
  const roll = Math.random();
  if (floor >= 7) {
    if (roll < 0.05) return RARITY.LEGENDARY;
    if (roll < 0.20) return RARITY.RARE;
    if (roll < 0.50) return RARITY.UNCOMMON;
    return RARITY.COMMON;
  } else if (floor >= 4) {
    if (roll < 0.02) return RARITY.LEGENDARY;
    if (roll < 0.12) return RARITY.RARE;
    if (roll < 0.35) return RARITY.UNCOMMON;
    return RARITY.COMMON;
  } else {
    if (roll < 0.05) return RARITY.RARE;
    if (roll < 0.20) return RARITY.UNCOMMON;
    return RARITY.COMMON;
  }
}

// Player level-up table
const LEVEL_TABLE = [
  { level: 1,  expReq: 10,  hp: 30,  atk: 5,  def: 2 },
  { level: 2,  expReq: 25,  hp: 38,  atk: 6,  def: 3 },
  { level: 3,  expReq: 50,  hp: 46,  atk: 8,  def: 4 },
  { level: 4,  expReq: 85,  hp: 55,  atk: 10, def: 5 },
  { level: 5,  expReq: 130, hp: 65,  atk: 12, def: 6 },
  { level: 6,  expReq: 190, hp: 76,  atk: 14, def: 8 },
  { level: 7,  expReq: 280, hp: 88,  atk: 17, def: 10 },
  { level: 8,  expReq: 390, hp: 100, atk: 20, def: 12 },
  { level: 9,  expReq: 520, hp: 115, atk: 24, def: 14 },
  { level: 10, expReq: 999, hp: 130, atk: 28, def: 17 },
];

// Dungeon generation parameters
const DUNGEON = {
  MIN_ROOM_SIZE: 4,
  MAX_ROOM_SIZE: 9,
  MAX_ROOMS: 12,
  ROOM_ATTEMPTS: 60,
  ITEMS_PER_FLOOR_MIN: 2,
  ITEMS_PER_FLOOR_MAX: 5,
  ENEMIES_PER_FLOOR_MIN: 3,
  ENEMIES_PER_FLOOR_MAX: 7,
  TRAPS_PER_FLOOR_MIN: 2,
  TRAPS_PER_FLOOR_MAX: 5,
  FOOD_PER_FLOOR: 1,
};

const MAX_INVENTORY = 9;
const FOV_RADIUS = 8;
const MAX_FLOOR = 10;

// Hunger
const HUNGER_MAX = 100;
const HUNGER_DECAY = 0.2;

// Merchant
const MERCHANT_CHANCE = 0.3;
