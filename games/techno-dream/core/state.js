export const TILE = 32;
export const ROOM_COLS = 15;
export const ROOM_ROWS = 9;
export const WORLD_W = ROOM_COLS * TILE;
export const WORLD_H = ROOM_ROWS * TILE;

// Зум камеры: во столько раз крупнее выглядят комната/персонаж/враги.
// Физическое разрешение canvas = мир × VIEW_ZOOM.
// СЕЙЧАС = 1: комнаты маленькие, камера ФИКСИРОВАННАЯ (вся комната в кадре,
// getCamera() при Z=1 всегда даёт (0,0)). Фича зума сохранена для будущих
// больших комнат: повысите VIEW_ZOOM или сделаете комнату больше вьюпорта —
// камера снова начнёт следовать за игроком.
export const VIEW_ZOOM = 1;
export const VIEW_W = Math.round(WORLD_W * VIEW_ZOOM);
export const VIEW_H = Math.round(WORLD_H * VIEW_ZOOM);

export const TARGET_FPS = 60;
export const STEP = 1000 / TARGET_FPS;

export const PLAYER_SIZE = 24;
export const PLAYER_START_MAX_HP = 6;
export const PLAYER_HP_CAP = 20;
export const HP_PER_CONTAINER = 2;

export const INVULN_TIME = 1.0;
export const HIT_FLASH_TIME = 0.15;
export const BLINK_INTERVAL = 0.08;
export const SPRITE_Y_OFFSET = -3;

export const BULLET_SIZE = 16;
export const BULLET_GLOW = '34, 211, 238';
export const ENEMY_BULLET_GLOW = '239, 68, 68';
export const BULLET_POP_TIME = 0.18; // анимация схлопывания пули в конце дальности

export const ENEMY_SIZE = 24;
export const ENEMY_DRAW_SIZE = 32;
export const ENEMY_HP = 3;
export const ENEMY_HIT_FLASH = 0.12;
export const ENEMY_DAMAGE = 1;

export const BOSS_SIZE = 48;
export const BOSS_MOVE_SIZE = 30;
export const BOSS_DRAW_SIZE = 64;
export const BOSS_HP = 15;
export const BOSS_SPEED_MULT = 1.0;
export const BOSS_SUMMON_MIN = 5;
export const BOSS_SUMMON_MAX = 8;

// ==== ТУРЕЛЬ (стоит на месте, стреляет очередями с телеграфом) ====
export const TURRET_SIZE = 24;
export const TURRET_HP = 4;
export const TURRET_DAMAGE = 1;
export const TURRET_AIM_TIME = 0.35;
export const TURRET_COOLDOWN_MIN = 1.0;
export const TURRET_COOLDOWN_MAX = 1.6;
export const TURRET_BURST_DELAY = 0.5;
export const TURRET_BULLET_SPEED = 3 * TILE;

// ==== ПРЫГУН (бьёт в точку, где игрок БЫЛ на момент прыжка) ====
export const HOPPER_SIZE = 32;
export const HOPPER_HP = 2;
export const HOPPER_DAMAGE = 1;
export const HOPPER_PAUSE_MIN = 0.5;
export const HOPPER_PAUSE_MAX = 0.8;
export const HOPPER_WINDUP = 0.3;
export const HOPPER_LEAP_TIME = 0.22;
export const HOPPER_LEAP_RANGE = 3.5 * TILE;
export const HOPPER_HOP_HEIGHT = 14;
export const HOPPER_DRAW_SIZE = 42;           // 64 / 1.5 — визуально в 1.5 раза меньше прежнего

// ==== БОМБЕР (спит, пока не тронут; после урона — фитиль и взрыв) ====
export const BOMBER_SIZE = 32; // хитбокс равен размеру спрайта (ENEMY_DRAW_SIZE)
export const BOMBER_HP = 4;
export const BOMBER_DAMAGE = 2;
export const BOMBER_WANDER_SPEED = 1.5 * TILE;
export const BOMBER_CHASE_SPEED = 4 * TILE;
export const BOMBER_FUSE = 1.4;
export const BOMBER_BLAST_RADIUS = 1.2 * TILE;
export const BOMBER_BLAST_DAMAGE_ENEMIES = 3;

export const DOOR_DWELL_TIME = 0.3;
export const TRANSITION_SUCK = 0.35;
export const TRANSITION_FADE = 0.2;

export const MAP_COLS = 7;
export const MAP_ROWS = 7;

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_DOOR_TOP = 2;
export const TILE_DOOR_BOTTOM = 3;
export const TILE_DOOR_LEFT = 4;
export const TILE_DOOR_RIGHT = 5;
export const TILE_EXIT_DOOR = 6;

export const COLORS = {
  floorA: '#10162a', floorB: '#0c1122',
  wall: '#1a2038', wallEdge: '#2a3455', wallTop: '#232b48',
  door: '#fbbf24', doorDark: '#b45309',
  exitDoor: '#22d3ee', exitDoorDark: '#0891b2',
  hpFull: '#ef4444', hpEmpty: 'rgba(0,0,0,0.5)',
};

export let canvas, ctx;
export function setCanvas(c, context) {
  canvas = c;
  ctx = context;
}

// Хук урона по игроку для врагов (взрыв бомбера и т.п.).
// Оркестратор подписывает сюда damagePlayer, чтобы не плодить циклические импорты.
export let onPlayerDamaged = null;
export function setOnPlayerDamaged(fn) {
  onPlayerDamaged = fn;
}

export const gameState = {
  lastTime: 0,
  accumulator: 0,
  paused: false,
  showFullMap: false,
  gameTime: 0,
  gameOver: false,
  gameWon: false,
  seed: "",
  inPreStart: true,
  // Игрок в секретной комнате (вне карты; обычный мир заснапшотен)
  secretRoom: false,
  // Все спрайты загружены (включает кэш статики комнаты); версия комнаты инвалидирует кэш
  spritesReady: false,
  roomVersion: 0,
  // SeededRandom текущей игры: создаётся при выходе из стартовой комнаты,
  // используется и генерацией карты, и наполнением комнат (сид воспроизводит всё)
  rng: null,
  room: [],
  floorDecor: [],
  doors: { top: false, bottom: false, left: false, right: false },
  currentRoom: { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) },
  mapRooms: [],
  bossRoom: null,
  transition: { phase: null, timer: 0, targetDir: null, returnDir: null }
};

export const player = {
  x: 0, y: 0, size: PLAYER_SIZE,
  vel: { x: 0, y: 0 },
  facing: 0,
  animTime: 0,
  moving: false,
  hp: PLAYER_START_MAX_HP, maxHp: PLAYER_START_MAX_HP,
  invuln: 0, hitFlash: 0, blinkTimer: 0, visible: true,
  suckProgress: 0, suckX: 0, suckY: 0, suckStartX: 0, suckStartY: 0,
  stats: { damage: 1, speed: 4.5, fireRate: 0.4, range: 150 },
  shootCooldown: 0,
  headRecoil: 0,
  headAngle: 0,
  isShooting: false,
  idleTimer: 0,
  // ==== МОДИФИКАТОРЫ ОРУЖИЯ ====
  // Предметы НЕ переписывают стрельбу, а выставляют сюда декларативные флаги;
  // конвейер выстрела (buildShotPlan/executeShot в оркестраторе) читает их все
  // сразу — поэтому модификаторы синергируют в любом порядке и количестве:
  // spread (линза) + beam/charge (рельсатрон) = тройной рельсатрон.
  // Будущие предметы добавляют свои поля: pierce, bounce, explosive, homing...
  weapon: {
    spread: 0,               // доп. боковые траектории (линза: +2)
    spreadStep: Math.PI / 4, // угол между траекториями веера
    beam: false,             // снаряды заменяются лучом (рельсатрон)
    charge: false,           // механика заряда вместо авто-огня (рельсатрон)
  },
  charge: 0,         // заряд атаки 0..1
  chargeDirX: 1,
  chargeDirY: 0,
  releaseTimer: 0,
};
export const bullets = [];
export const enemies = [];
export const chests = [];
export const items = [];
// Короткоживущие визуальные эффекты (взрывы и т.п.): { x, y, t, maxT, radius, color }
export const effects = [];
export const SPRITES = {};
export const keys = { w: false, a: false, s: false, d: false };
export const shootKeys = { up: false, down: false, left: false, right: false };