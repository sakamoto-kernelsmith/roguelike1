// =============================================================================
// Constants
// =============================================================================

const TILE_SIZE = 20;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 30;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;  // not used for pixel size, computed dynamically
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// Viewport (tiles visible on screen)
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

// Tile display config: [char, fg color, bg color]
const TILE_DISPLAY = {
  [TILE.VOID]:        [' ',  '#000',    '#000'],
  [TILE.FLOOR]:       ['.',  '#444',    '#111'],
  [TILE.WALL]:        ['#',  '#666',    '#222'],
  [TILE.CORRIDOR]:    ['.',  '#3a3a3a', '#0d0d0d'],
  [TILE.DOOR]:        ['+',  '#a07030', '#111'],
  [TILE.STAIRS_DOWN]: ['>',  '#00ccff', '#111'],
  [TILE.STAIRS_UP]:   ['<',  '#00ccff', '#111'],
};

// Directions (including diagonals for 8-way movement)
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

// Enemy definitions per floor range
const ENEMY_DEFS = [
  { name: 'スライム',     ch: 's', color: '#40e040', hp: 8,  atk: 2, def: 0, exp: 3,  minFloor: 1 },
  { name: 'コウモリ',     ch: 'b', color: '#a060c0', hp: 6,  atk: 3, def: 0, exp: 3,  minFloor: 1 },
  { name: 'ネズミ',       ch: 'r', color: '#c09060', hp: 5,  atk: 2, def: 1, exp: 2,  minFloor: 1 },
  { name: 'ゴブリン',     ch: 'g', color: '#60c040', hp: 12, atk: 4, def: 1, exp: 6,  minFloor: 2 },
  { name: 'スケルトン',   ch: 'S', color: '#cccccc', hp: 15, atk: 5, def: 2, exp: 8,  minFloor: 3 },
  { name: 'オーク',       ch: 'O', color: '#408040', hp: 20, atk: 6, def: 3, exp: 12, minFloor: 4 },
  { name: 'リザードマン', ch: 'L', color: '#40a060', hp: 22, atk: 7, def: 3, exp: 14, minFloor: 5 },
  { name: 'ゴースト',     ch: 'G', color: '#8888cc', hp: 18, atk: 8, def: 1, exp: 15, minFloor: 5 },
  { name: 'トロル',       ch: 'T', color: '#609030', hp: 30, atk: 9, def: 5, exp: 20, minFloor: 7 },
  { name: 'ドラゴン',     ch: 'D', color: '#e04040', hp: 50, atk: 14, def: 8, exp: 50, minFloor: 9 },
];

// Item definitions
const ITEM_TYPE = {
  HEAL_POTION: 'heal_potion',
  BIG_HEAL_POTION: 'big_heal_potion',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  SCROLL_MAP: 'scroll_map',
};

const ITEM_DEFS = [
  { type: ITEM_TYPE.HEAL_POTION,     name: '回復薬',       ch: '!', color: '#e04040', weight: 40, value: 10,  minFloor: 1 },
  { type: ITEM_TYPE.BIG_HEAL_POTION, name: '大回復薬',     ch: '!', color: '#ff6060', weight: 15, value: 25,  minFloor: 3 },
  { type: ITEM_TYPE.SCROLL_MAP,      name: '地図の巻物',   ch: '?', color: '#e0e060', weight: 10, value: 0,   minFloor: 1 },
  { type: ITEM_TYPE.WEAPON,          name: '短剣',         ch: '/', color: '#cccccc', weight: 8,  atk: 2,     minFloor: 1 },
  { type: ITEM_TYPE.WEAPON,          name: '長剣',         ch: '/', color: '#dddddd', weight: 5,  atk: 4,     minFloor: 3 },
  { type: ITEM_TYPE.WEAPON,          name: '大剣',         ch: '/', color: '#eeeeee', weight: 3,  atk: 7,     minFloor: 5 },
  { type: ITEM_TYPE.WEAPON,          name: '魔剣',         ch: '/', color: '#c060e0', weight: 1,  atk: 12,    minFloor: 8 },
  { type: ITEM_TYPE.ARMOR,           name: '皮の鎧',       ch: '[', color: '#a08060', weight: 8,  def: 2,     minFloor: 1 },
  { type: ITEM_TYPE.ARMOR,           name: '鎖帷子',       ch: '[', color: '#aaaaaa', weight: 5,  def: 4,     minFloor: 3 },
  { type: ITEM_TYPE.ARMOR,           name: 'プレートメイル', ch: '[', color: '#cccccc', weight: 3,  def: 7,     minFloor: 6 },
  { type: ITEM_TYPE.ARMOR,           name: '魔法の鎧',     ch: '[', color: '#6060e0', weight: 1,  def: 11,    minFloor: 8 },
];

// Player level-up table
const LEVEL_TABLE = [
  { level: 1,  expReq: 10,  hp: 30, atk: 5,  def: 2 },
  { level: 2,  expReq: 25,  hp: 38, atk: 6,  def: 3 },
  { level: 3,  expReq: 50,  hp: 46, atk: 8,  def: 4 },
  { level: 4,  expReq: 85,  hp: 55, atk: 10, def: 5 },
  { level: 5,  expReq: 130, hp: 65, atk: 12, def: 6 },
  { level: 6,  expReq: 190, hp: 76, atk: 14, def: 8 },
  { level: 7,  expReq: 260, hp: 88, atk: 17, def: 10 },
  { level: 8,  expReq: 350, hp: 100, atk: 20, def: 12 },
  { level: 9,  expReq: 460, hp: 115, atk: 24, def: 14 },
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
};

const MAX_INVENTORY = 9;
const FOV_RADIUS = 8;
const MAX_FLOOR = 10;
