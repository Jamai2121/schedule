// ==== TECHNO_DREAM — Модульный оркестратор ====
import { initAudio, resumeAudio, playSound } from './core/audio.js';
import * as S from './core/state.js';
import * as U from './core/utils.js';
import { initInput } from './core/input.js';
import { SeededRandom, generateSeed } from './core/rng.js';
import { buildMap, getRoomData, rebuildRoomIndex } from './map/build.js';
import { loadRoom } from './map/room.js';
import { createEnemy, updateAllEnemies, drawAllEnemies, notifyEnemyHit, separateEnemies } from './enemies/index.js';
import { updateEffects, drawEffects } from './render/effects.js';
import { updateAllItems, drawAllItems } from './items/index.js';
import { drawRoomCached } from './render/floor.js';
import { drawDoors } from './render/doors.js';
import { drawPlayer } from './render/player-draw.js';
import { drawBulletsBeforePlayer, drawBulletsAfterPlayer } from './render/bullets.js';
import { updateStatsUI, rebuildHpHUD, updateHpHUD, floatStat } from './ui/hud.js';
import { drawMinimap, drawFullMap } from './ui/minimap.js';
import { initDebug, drawHitboxes } from './core/debug.js';

const VERSION = 'v0.2.0';
// true после первого нажатия «Играть»: до этого Esc не открывает паузу
let gameStarted = false;

// ==== ЗАГРУЗКА СПРАЙТОВ ====
// Каждый спрайт регистрируется в общем списке промисов: когда все загрузятся,
// включится кэш статики комнаты (gameState.spritesReady)
let spritePromises = [];

function loadSprite(name) {
    const img = new Image();
    spritePromises.push(new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // отсутствующий спрайт не должен блокировать игру
    }));
    img.src = `./sprites/${name}.png`;
    return img;
}

function loadAllSprites() {
    spritePromises = [];
    S.SPRITES.droid = loadSprite('droid-idle');
    S.SPRITES.bullet = loadSprite('bullet');
    S.SPRITES.bug = loadSprite('bag_0');
    S.SPRITES.boss = loadSprite('boss-idle');
    S.SPRITES.chestClosed = loadSprite('chest_close');
    S.SPRITES.chestOpen = loadSprite('chest_open');
    S.SPRITES.miniFrame = loadSprite('mini-frame');
    S.SPRITES.miniChest = loadSprite('mini-chest');
    S.SPRITES.miniBoss = loadSprite('mini-boss');
    S.SPRITES.itemDamage = loadSprite('item-damage');
    S.SPRITES.itemSpeed = loadSprite('item-speed');
    S.SPRITES.itemFirerate = loadSprite('item-firerate');
    S.SPRITES.itemHp = loadSprite('item-hp');
    S.SPRITES.itemRange = loadSprite('item-range');
    S.SPRITES.itemLens = loadSprite('item-lens');
    S.SPRITES.itemRailgun = loadSprite('item-railgun');
    S.SPRITES.bodyIdle = loadSprite('droid-body-idle');
    ['down', 'up', 'left', 'right'].forEach(dir => {
        S.SPRITES[`bodyWalk1_${dir}`] = loadSprite(`droid-body-walk-1-${dir}`);
        S.SPRITES[`bodyWalk2_${dir}`] = loadSprite(`droid-body-walk-2-${dir}`);
        S.SPRITES[`bodyWalk3_${dir}`] = loadSprite(`droid-body-walk-3-${dir}`);
    });
    S.SPRITES.headIdle = loadSprite('droid-head-idle');
    S.SPRITES.headUp = loadSprite('droid-head-up');
    S.SPRITES.headDown = loadSprite('droid-head-down');
    S.SPRITES.headLeft = loadSprite('droid-head-left');
    S.SPRITES.headRight = loadSprite('droid-head-right');

    // Пол (все тайлы в один объект для удобного доступа)
    S.SPRITES.floorTiles = {
        'floor_1': loadSprite('floor_1'),
        'floor_2': loadSprite('floor_2'),
        'floor_1_1': loadSprite('floor_1_1'), 'floor_1_2': loadSprite('floor_1_2'), 'floor_1_3': loadSprite('floor_1_3'),
        'floor_1_4': loadSprite('floor_1_4'), 'floor_1_5': loadSprite('floor_1_5'), 'floor_1_6': loadSprite('floor_1_6'), 'floor_1_7': loadSprite('floor_1_7'),
        'floor_1_8': loadSprite('floor_1_8'), 'floor_1_9': loadSprite('floor_1_9'),
        'floor_2_1': loadSprite('floor_2_1'), 'floor_2_2': loadSprite('floor_2_2'), 'floor_2_3': loadSprite('floor_2_3'),
        'floor_2_4': loadSprite('floor_2_4'), 'floor_2_5': loadSprite('floor_2_5'), 'floor_2_6': loadSprite('floor_2_6'), 'floor_2_7': loadSprite('floor_2_7')
    };

    // Стены и двери
    S.SPRITES.wallBlock = loadSprite('wall_block');
    S.SPRITES.wallCorner = loadSprite('wall_corner');
    S.SPRITES.doorNormal = loadSprite('door_normal');
    S.SPRITES.doorBoss = loadSprite('door_boss');
    S.SPRITES.doorChest = loadSprite('door_chest');
    S.SPRITES.doorExit = loadSprite('door_exit');
    S.SPRITES.doorClose = loadSprite('door_close');

    // Новые враги (без файлов спрайтов работают цветовые фоллбэки)
    S.SPRITES.turretBase = loadSprite('turret-base');
    S.SPRITES.turretHead = {
        up: loadSprite('turret-head-up'),
        down: loadSprite('turret-head-down'),
        left: loadSprite('turret-head-left'),
        right: loadSprite('turret-head-right'),
    };
    S.SPRITES.hopperIdle = loadSprite('hopper-idle');
    S.SPRITES.hopperSquash = loadSprite('hopper-squash');
    S.SPRITES.hopperAir = loadSprite('hopper-air');
    S.SPRITES.bomberWalk = [loadSprite('bomber-walk-1'), loadSprite('bomber-walk-2')];
    S.SPRITES.bomberRun = [loadSprite('bomber-run-1'), loadSprite('bomber-run-2')];

    // Кэш комнаты собирается только из полностью загруженных спрайтов
    Promise.all(spritePromises).then(() => { S.gameState.spritesReady = true; });
}

// ==== СПАВН ВРАГОВ ====
function findFreeSpot(minDist, moveSize, edgeOnly = false) {
    const cands = [];
    for (let r = 1; r < S.ROOM_ROWS - 1; r++) {
        for (let c = 1; c < S.ROOM_COLS - 1; c++) {
            if (S.gameState.room[r][c] !== S.TILE_FLOOR) continue;
            // Турель ставим у стен — так читаемее и она не мешает в центре
            if (edgeOnly && !(r === 1 || r === S.ROOM_ROWS - 2 || c === 1 || c === S.ROOM_COLS - 2)) continue;
            const ex = c * S.TILE + S.TILE / 2;
            const ey = r * S.TILE + S.TILE / 2;
            if (Math.hypot(ex - S.player.x, ey - S.player.y) < minDist) continue;
            if (!U.canStand(ex, ey, moveSize, areDoorsLocked)) continue;
            // Не спавним вплотную к уже созданным врагам
            let tooClose = false;
            for (const en of S.enemies) {
                if (Math.hypot(en.x - ex, en.y - ey) < S.TILE * 2) { tooClose = true; break; }
            }
            if (tooClose) continue;
            cands.push({ x: ex, y: ey });
        }
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
}

// Композиции комнат этажа 1 (w — вес вероятности). Правила:
// - врагов не меньше 1 и не больше 7;
// - турели и прыгуны приходят минимум парами;
// - жуки: либо >= 3, либо ровно 2 и только в связке с бомбером.
const ROOM_COMPOSITIONS = [
    { w: 20, mob: ['bug', 'bug', 'bug'] },
    { w: 15, mob: ['bug', 'bug', 'bomber'] },
    { w: 15, mob: ['hopper', 'hopper'] },
    { w: 12, mob: ['turret', 'turret'] },
    { w: 10, mob: ['hopper', 'hopper', 'turret', 'turret'] },
    { w: 8,  mob: ['bug', 'bug', 'bug', 'bug'] },
    { w: 8,  mob: ['hopper', 'hopper', 'bomber'] },
    { w: 6,  mob: ['bug', 'bug', 'bug', 'hopper', 'hopper'] },
    { w: 6,  mob: ['bug', 'bug', 'bomber', 'hopper', 'hopper'] },
    { w: 6,  mob: ['bug', 'bug', 'bomber', 'turret', 'turret'] },
    { w: 5,  mob: ['turret', 'turret', 'bomber', 'bomber'] },
    { w: 3,  mob: ['bug', 'bug', 'bug', 'hopper', 'hopper', 'turret', 'turret'] }, // 7 — джекпот
];

function spawnEnemy() {
    let total = 0;
    for (const c of ROOM_COMPOSITIONS) total += c.w;
    let roll = Math.random() * total;
    let comp = ROOM_COMPOSITIONS[0].mob;
    for (const c of ROOM_COMPOSITIONS) {
        roll -= c.w;
        if (roll <= 0) { comp = c.mob; break; }
    }
    for (const type of comp) {
        const size = type === 'turret' ? S.TURRET_SIZE
            : type === 'hopper' ? S.HOPPER_SIZE
            : type === 'bomber' ? S.BOMBER_SIZE
            : S.ENEMY_SIZE;
        const spot = findFreeSpot(S.TILE * 4, size, type === 'turret');
        if (spot) S.enemies.push(createEnemy(type, spot.x, spot.y));
    }
    // Страховка: в комнате всегда должен быть хотя бы один враг
    if (S.enemies.length === 0) {
        const spot = findFreeSpot(S.TILE * 3, S.ENEMY_SIZE);
        if (spot) S.enemies.push(createEnemy('bug', spot.x, spot.y));
    }
}

function spawnBoss() {
    const spot = findFreeSpot(S.TILE * 5, S.BOSS_MOVE_SIZE) || { x: S.WORLD_W / 2, y: S.TILE * 2.5 };
    S.enemies.push(createEnemy('boss', spot.x, spot.y));
}

// ==== СЕКРЕТНАЯ КОМНАТА ====
// Команда: W W S S D D, выстрел вправо, выстрел вправо (работает и на вход, и на выход)
const SECRET_CODE = ['w', 'w', 's', 's', 'd', 'd', 'shootR', 'shootR'];
let secretBuffer = [];
let secretSnapshot = null;

function secretTokenFromKey(e) {
    if (e.repeat) return null; // автоповтор зажатой клавиши не считаем
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') return 'w';
    if (k === 's' || k === 'ы') return 's';
    if (k === 'd' || k === 'в') return 'd';
    if (e.key === 'ArrowRight') return 'shootR';
    return null;
}

function pushSecretToken(token) {
    secretBuffer.push(token);
    if (secretBuffer.length > SECRET_CODE.length) secretBuffer.shift();
    if (secretBuffer.length === SECRET_CODE.length &&
        secretBuffer.every((t, i) => t === SECRET_CODE[i])) {
        secretBuffer = [];
        toggleSecretRoom();
    }
}

function toggleSecretRoom() {
    const gs = S.gameState;
    // Не телепортируем посреди переходов/паузы/конца игры
    if (gs.transition.phase !== null || gs.paused || gs.gameOver || gs.gameWon) return;
    if (gs.secretRoom) leaveSecretRoom();
    else enterSecretRoom();
}

function enterSecretRoom() {
    const gs = S.gameState;
    // Снапшот текущего мира, чтобы выход вернул всё точь-в-точь
    secretSnapshot = {
        room: gs.room.map(r => r.slice()),
        floorDecor: gs.floorDecor,
        doors: { ...gs.doors },
        enemies: S.enemies.slice(),
        bullets: S.bullets.slice(),
        chests: S.chests.slice(),
        items: S.items.slice(),
        playerX: S.player.x,
        playerY: S.player.y,
    };
    // Комната: стены по периметру, без дверей
    gs.room.length = 0;
    for (let r = 0; r < S.ROOM_ROWS; r++) {
        gs.room[r] = [];
        for (let c = 0; c < S.ROOM_COLS; c++) {
            const edge = r === 0 || c === 0 || r === S.ROOM_ROWS - 1 || c === S.ROOM_COLS - 1;
            gs.room[r][c] = edge ? S.TILE_WALL : S.TILE_FLOOR;
        }
    }
    gs.floorDecor = [];
    gs.doors = { top: false, bottom: false, left: false, right: false };
    S.enemies.length = 0;
    S.bullets.length = 0;
    S.chests.length = 0;
    S.items.length = 0;
    // Все предметы игры в ряд (шаг 2 тайла — не собираются все сразу)
    const types = ['damage', 'speed', 'firerate', 'hp', 'range', 'lens', 'railgun'];
    const midRow = Math.floor(S.ROOM_ROWS / 2);
    types.forEach((type, i) => {
        const c = 1 + i * 2; // колонны 1..13: семь предметов с шагом 2 тайла
        S.items.push({ x: c * S.TILE + S.TILE / 2, y: midRow * S.TILE + S.TILE / 2, type, bobbing: i * 0.7 });
    });
    S.player.x = Math.floor(S.ROOM_COLS / 2) * S.TILE + S.TILE / 2;
    S.player.y = (S.ROOM_ROWS - 2) * S.TILE; // спавн снизу, идём к предметам
    gs.secretRoom = true;
    gs.roomVersion++; // инвалидация кэша статики
    playSound('door');
    S.effects.push({ x: S.player.x, y: S.player.y, t: 0, maxT: 0.4, radius: S.TILE * 1.5, color: '168, 85, 247' });
}

function leaveSecretRoom() {
    const gs = S.gameState;
    if (!secretSnapshot) return;
    gs.room.length = 0;
    secretSnapshot.room.forEach((row, r) => { gs.room[r] = row.slice(); });
    gs.floorDecor = secretSnapshot.floorDecor;
    gs.doors = secretSnapshot.doors;
    S.enemies.length = 0;
    secretSnapshot.enemies.forEach(e => S.enemies.push(e));
    S.bullets.length = 0;
    secretSnapshot.bullets.forEach(b => S.bullets.push(b));
    S.chests.length = 0;
    secretSnapshot.chests.forEach(c => S.chests.push(c));
    S.items.length = 0;
    secretSnapshot.items.forEach(it => S.items.push(it));
    S.player.x = secretSnapshot.playerX;
    S.player.y = secretSnapshot.playerY;
    secretSnapshot = null;
    gs.secretRoom = false;
    gs.roomVersion++;
    playSound('door');
    S.effects.push({ x: S.player.x, y: S.player.y, t: 0, maxT: 0.4, radius: S.TILE * 1.5, color: '168, 85, 247' });
}

// ==== ПРОВЕРКИ ====
function areDoorsLocked() {
    if (S.gameState.inPreStart) return false;
    if (S.gameState.secretRoom) return false;
    const roomData = getRoomData(S.gameState.mapRooms, S.gameState.currentRoom.x, S.gameState.currentRoom.y);
    if (!roomData) return false;
    if (roomData.cleared) return false;
    return S.enemies.length > 0;
}

// ==== ПЕРЕХОДЫ ====
function getDoorUnderPlayer() {
    if (S.gameState.inPreStart) {
        const midCol = Math.floor(S.ROOM_COLS / 2);
        const pc = Math.floor(S.player.x / S.TILE);
        const pr = Math.floor(S.player.y / S.TILE);
        if (pr === S.ROOM_ROWS - 1 && pc === midCol) return 'exit';
        return null;
    }
    if (areDoorsLocked()) return null;
    const midCol = Math.floor(S.ROOM_COLS / 2);
    const midRow = Math.floor(S.ROOM_ROWS / 2);
    const pc = Math.floor(S.player.x / S.TILE);
    const pr = Math.floor(S.player.y / S.TILE);
    if (pr === 0 && pc === midCol && S.gameState.room[0][midCol] === S.TILE_EXIT_DOOR) return 'exit';
    if (pr === S.ROOM_ROWS - 1 && pc === midCol && S.gameState.room[S.ROOM_ROWS - 1][midCol] === S.TILE_EXIT_DOOR) return 'exit';
    if (pc === 0 && pr === midRow && S.gameState.room[midRow][0] === S.TILE_EXIT_DOOR) return 'exit';
    if (pc === S.ROOM_COLS - 1 && pr === midRow && S.gameState.room[midRow][S.ROOM_COLS - 1] === S.TILE_EXIT_DOOR) return 'exit';
    if (pr === 0 && pc === midCol && S.gameState.room[0][midCol] === S.TILE_DOOR_TOP) return 'top';
    if (pr === S.ROOM_ROWS - 1 && pc === midCol && S.gameState.room[S.ROOM_ROWS - 1][midCol] === S.TILE_DOOR_BOTTOM) return 'bottom';
    if (pc === 0 && pr === midRow && S.gameState.room[midRow][0] === S.TILE_DOOR_LEFT) return 'left';
    if (pc === S.ROOM_COLS - 1 && pr === midRow && S.gameState.room[midRow][S.ROOM_COLS - 1] === S.TILE_DOOR_RIGHT) return 'right';
    return null;
}

function beginSuck(dir) {
    playSound('door');
    S.gameState.transition.phase = 'suck';
    S.gameState.transition.timer = 0;
    S.gameState.transition.targetDir = dir;
    const midCol = Math.floor(S.ROOM_COLS / 2);
    const midRow = Math.floor(S.ROOM_ROWS / 2);
    let tx = 0, ty = 0;
    if (dir === 'exit') {
        if (S.gameState.inPreStart) { tx = midCol * S.TILE + S.TILE / 2; ty = (S.ROOM_ROWS - 1) * S.TILE + S.TILE / 2; }
        else if (S.gameState.room[0][midCol] === S.TILE_EXIT_DOOR) { tx = midCol * S.TILE + S.TILE / 2; ty = S.TILE / 2; }
        else if (S.gameState.room[S.ROOM_ROWS - 1][midCol] === S.TILE_EXIT_DOOR) { tx = midCol * S.TILE + S.TILE / 2; ty = (S.ROOM_ROWS - 1) * S.TILE + S.TILE / 2; }
        else if (S.gameState.room[midRow][0] === S.TILE_EXIT_DOOR) { tx = S.TILE / 2; ty = midRow * S.TILE + S.TILE / 2; }
        else { tx = (S.ROOM_COLS - 1) * S.TILE + S.TILE / 2; ty = midRow * S.TILE + S.TILE / 2; }
    }
    if (dir === 'top') { tx = midCol * S.TILE + S.TILE / 2; ty = S.TILE / 2; }
    if (dir === 'bottom') { tx = midCol * S.TILE + S.TILE / 2; ty = (S.ROOM_ROWS - 1) * S.TILE + S.TILE / 2; }
    if (dir === 'left') { tx = S.TILE / 2; ty = midRow * S.TILE + S.TILE / 2; }
    if (dir === 'right') { tx = (S.ROOM_COLS - 1) * S.TILE + S.TILE / 2; ty = midRow * S.TILE + S.TILE / 2; }
    S.player.suckStartX = S.player.x;
    S.player.suckStartY = S.player.y;
    S.player.suckX = tx;
    S.player.suckY = ty;
    S.player.suckProgress = 0;
}

function completeTransition() {
    const dirOut = S.gameState.transition.targetDir;
    if (dirOut === 'exit') {
        if (S.gameState.inPreStart) {
            S.gameState.inPreStart = false;
            S.gameState.currentRoom.x = Math.floor(S.MAP_COLS / 2);
            S.gameState.currentRoom.y = Math.floor(S.MAP_ROWS / 2);
            const rng = new SeededRandom(S.gameState.seed);
            S.gameState.rng = rng; // наполнение комнат (сундук/выход) — тоже из сида
            buildMap(S.gameState, rng);
            loadRoom(S.gameState);
            S.player.x = (S.ROOM_COLS / 2) * S.TILE + S.TILE / 2;
            S.player.y = (S.ROOM_ROWS / 2) * S.TILE + S.TILE / 2;
            S.bullets.length = 0;
            S.enemies.length = 0;
            const rd = getRoomData(S.gameState.mapRooms, S.gameState.currentRoom.x, S.gameState.currentRoom.y);
            if (rd && !rd.cleared) {
                if (rd.type === 'boss') spawnBoss();
                else if (rd.type === 'enemy') spawnEnemy();
            }
            resetTransition();
            return;
        }
        triggerVictory();
        return;
    }
    const dx = dirOut === 'left' ? -1 : dirOut === 'right' ? 1 : 0;
    const dy = dirOut === 'top' ? -1 : dirOut === 'bottom' ? 1 : 0;
    const nx = S.gameState.currentRoom.x + dx;
    const ny = S.gameState.currentRoom.y + dy;
    if (nx < 0 || nx >= S.MAP_COLS || ny < 0 || ny >= S.MAP_ROWS) { resetTransition(); return; }
    S.gameState.currentRoom.x = nx;
    S.gameState.currentRoom.y = ny;
    const rd = getRoomData(S.gameState.mapRooms, nx, ny);
    if (rd) rd.visited = true;
    loadRoom(S.gameState);
    const midCol = Math.floor(S.ROOM_COLS / 2);
    const midRow = Math.floor(S.ROOM_ROWS / 2);
    let sx = midCol * S.TILE + S.TILE / 2;
    let sy = midRow * S.TILE + S.TILE / 2;
    if (dirOut === 'top') sy = (S.ROOM_ROWS - 1) * S.TILE - S.TILE * 0.7;
    if (dirOut === 'bottom') sy = S.TILE + S.TILE * 0.7;
    if (dirOut === 'left') sx = (S.ROOM_COLS - 1) * S.TILE - S.TILE * 0.7;
    if (dirOut === 'right') sx = S.TILE + S.TILE * 0.7;
    S.player.x = sx;
    S.player.y = sy;
    S.player.suckProgress = 0;
    S.bullets.length = 0;
    S.enemies.length = 0;
    const roomData = getRoomData(S.gameState.mapRooms, S.gameState.currentRoom.x, S.gameState.currentRoom.y);
    if (roomData && !roomData.cleared) {
        if (roomData.type === 'boss') spawnBoss();
        else if (roomData.type === 'enemy') spawnEnemy();
    }
    resetTransition();
}

function resetTransition() {
    S.gameState.transition.phase = null;
    S.gameState.transition.timer = 0;
    S.gameState.transition.targetDir = null;
    S.gameState.transition.returnDir = null;
}

function updateTransition(dt) {
    const doorDir = getDoorUnderPlayer();
    if (S.gameState.transition.phase === null) {
        if (doorDir) {
            if (S.gameState.transition.targetDir !== doorDir) {
                S.gameState.transition.targetDir = doorDir;
                S.gameState.transition.timer = 0;
            }
            S.gameState.transition.timer += dt;
            if (S.gameState.transition.timer >= S.DOOR_DWELL_TIME) beginSuck(doorDir);
        } else {
            S.gameState.transition.targetDir = null;
            S.gameState.transition.timer = 0;
        }
        return;
    }
    if (S.gameState.transition.phase === 'suck') {
        S.gameState.transition.timer += dt;
        S.player.suckProgress = Math.min(1, S.gameState.transition.timer / S.TRANSITION_SUCK);
        const t = S.player.suckProgress;
        S.player.x = S.player.suckStartX + (S.player.suckX - S.player.suckStartX) * (t * t);
        S.player.y = S.player.suckStartY + (S.player.suckY - S.player.suckStartY) * (t * t);
        if (S.gameState.transition.timer >= S.TRANSITION_SUCK) {
            S.gameState.transition.phase = 'fade';
            S.gameState.transition.timer = 0;
        }
        return;
    }
    if (S.gameState.transition.phase === 'fade') {
        S.gameState.transition.timer += dt;
        if (S.gameState.transition.timer >= S.TRANSITION_FADE) completeTransition();
    }
}

// ==== ОБНОВЛЕНИЕ ИГРОКА ====
function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (S.keys.w) { dy -= 1; S.player.facing = 1; }
    if (S.keys.s) { dy += 1; S.player.facing = 0; }
    if (S.keys.a) { dx -= 1; S.player.facing = 2; }
    if (S.keys.d) { dx += 1; S.player.facing = 3; }
    const isMoving = dx !== 0 || dy !== 0;
    const targetSpeed = S.player.stats.speed * S.TILE;
    if (isMoving) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
        S.player.vel.x += dx * targetSpeed * 10 * dt;
        S.player.vel.y += dy * targetSpeed * 10 * dt;
    } else {
        S.player.vel.x -= S.player.vel.x * 12 * dt;
        S.player.vel.y -= S.player.vel.y * 12 * dt;
        if (Math.abs(S.player.vel.x) < 10) S.player.vel.x = 0;
        if (Math.abs(S.player.vel.y) < 10) S.player.vel.y = 0;
    }
    const cs = Math.hypot(S.player.vel.x, S.player.vel.y);
    if (cs > targetSpeed) {
        S.player.vel.x = (S.player.vel.x / cs) * targetSpeed;
        S.player.vel.y = (S.player.vel.y / cs) * targetSpeed;
    }
    const nx = S.player.x + S.player.vel.x * dt;
    const ny = S.player.y + S.player.vel.y * dt;

    if (U.canStand(nx, S.player.y, S.PLAYER_SIZE, areDoorsLocked)) {
        S.player.x = nx;
    } else {
        S.player.vel.x = 0;
    }

    if (U.canStand(S.player.x, ny, S.PLAYER_SIZE, areDoorsLocked)) {
        S.player.y = ny;
    } else {
        S.player.vel.y = 0;
    }

    for (const e of S.enemies) {
        // Физическое тело врага: у босса moveSize (30) меньше зоны поражения size (48)
        const eSize = e.moveSize || e.size;
        if (U.checkCollision(S.player.x, S.player.y, S.PLAYER_SIZE, e.x, e.y, eSize)) {
            const dx = S.player.x - e.x;
            const dy = S.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.1) continue;
            const overlap = (S.PLAYER_SIZE + eSize) / 2 - dist;
            if (overlap > 0) {
                const pushX = (dx / dist) * overlap;
                const pushY = (dy / dist) * overlap;
                const tryX = S.player.x + pushX;
                const tryY = S.player.y + pushY;
                if (U.canStand(tryX, S.player.y, S.PLAYER_SIZE, areDoorsLocked)) S.player.x = tryX;
                if (U.canStand(S.player.x, tryY, S.PLAYER_SIZE, areDoorsLocked)) S.player.y = tryY;
            }
        }
    }

    if (isMoving || cs > 50) {
        const oldFrame = Math.floor(S.player.animTime);
        S.player.animTime += dt * 4 * Math.max(0.2, cs / targetSpeed);
        const newFrame = Math.floor(S.player.animTime);

        // Если кадр сменился (шаг)
        if (newFrame !== oldFrame && newFrame % 2 === 0) {
            playSound('step');
        }
        S.player.idleTimer = 0;
    } else S.player.idleTimer += dt;
    if (S.player.shootCooldown > 0) S.player.shootCooldown -= dt;
    let sx = 0, sy = 0;
    if (S.shootKeys.up) sy -= 1;
    if (S.shootKeys.down) sy += 1;
    if (S.shootKeys.left) sx -= 1;
    if (S.shootKeys.right) sx += 1;
    const holding = sx !== 0 || sy !== 0;
    if (S.player.headRecoil > 0) {
        S.player.headRecoil -= dt * (5 / S.player.stats.fireRate);
        if (S.player.headRecoil < 0) S.player.headRecoil = 0;
    }
    if (S.player.weapon.charge) {
        // Заряжаемое оружие (рельсатрон и его синергии): выстрел на отпуске с полной шкалой
        updateRailgunCharge(dt, sx, sy, holding);
    } else if (holding && S.player.shootCooldown <= 0) {
        executeShot(sx, sy);
        S.player.shootCooldown = S.player.stats.fireRate;
        S.player.isShooting = true;
        S.player.headAngle = Math.atan2(sy, sx);
    } else if (!holding && S.player.headRecoil <= 0) {
        S.player.isShooting = false;
    }
}

// ==== КОНВЕЙЕР ВЫСТРЕЛА ====
// План выстрела: список траекторий из направления ввода.
// spread добавляет боковые траектории (веер), beam меняет тип снаряда.
// Любая комбинация модификаторов получается автоматически.
function buildShotPlan(dirX, dirY) {
    const w = S.player.weapon;
    const total = 1 + w.spread;
    const plan = [];
    for (let i = 0; i < total; i++) {
        const a = (i - (total - 1) / 2) * w.spreadStep;
        plan.push({
            dirX: dirX * Math.cos(a) - dirY * Math.sin(a),
            dirY: dirX * Math.sin(a) + dirY * Math.cos(a),
        });
    }
    return plan;
}

function fire(sx, sy) {
// Нормализуем направление: иначе диагональный выстрел летит в √2 раза
// быстрее и спавнится дальше на √2
const len = Math.hypot(sx, sy) || 1;
const dirX = sx / len;
const dirY = sy / len;
const offset = S.PLAYER_SIZE / 2 + S.BULLET_SIZE / 2 - 2;
const bx = S.player.x + dirX * offset;
const by = S.player.y + dirY * offset - 10;
const speed = 5 * S.TILE;
S.bullets.push({
x: bx, y: by,
vx: dirX * speed, vy: dirY * speed,
life: S.player.stats.range / speed,
maxLife: S.player.stats.range / speed,
damage: S.player.stats.damage
});
}

// Единая точка выстрела: план траекторий × тип снаряда × звук/отдача
// Одна пуля игрока; будущие модификаторы пуль (pierce/explosive/...)
// штампуются сюда полями объекта пули
function spawnPlayerBullet(dirX, dirY) {
    const w = S.player.weapon;
    const offset = S.PLAYER_SIZE / 2 + S.BULLET_SIZE / 2 - 2;
    const bx = S.player.x + dirX * offset;
    const by = S.player.y + dirY * offset - 10;
    const speed = 5 * S.TILE;
    S.bullets.push({
        x: bx, y: by,
        vx: dirX * speed, vy: dirY * speed,
        life: S.player.stats.range / speed,
        maxLife: S.player.stats.range / speed,
        damage: S.player.stats.damage,
        pierce: w.pierce || false,     // задел на будущее
        explosive: w.explosive || false,
    });
}

// Луч рельсатрона: марш до стены, сквозное поражение всех на линии
function fireBeam(dirX, dirY) {
    const ox = S.player.x + dirX * (S.PLAYER_SIZE / 2);
    const oy = S.player.y + dirY * (S.PLAYER_SIZE / 2) - 10;
    let x = ox, y = oy;
    const stepPx = 4;
    let guard = 0;
    while (guard++ < 400) {
        x += dirX * stepPx;
        y += dirY * stepPx;
        if (U.tileAt(x, y) !== S.TILE_FLOOR) break;
    }
    for (const e of S.enemies) {
        if (e.dead) continue;
        const hitY = e.y - (e.hitOffset || 0);
        const d = distToSegment(e.x, hitY, ox, oy, x, y);
        if (d <= e.size / 2 + S.BULLET_SIZE / 2 - 2) {
            e.hp -= S.player.stats.damage;
            e.flash = S.ENEMY_HIT_FLASH;
            notifyEnemyHit(e);
            if (e.hp <= 0) {
                playSound('enemy_die');
                e.dead = true; // sweepDeadEnemies уберёт из массива
            }
        }
    }
    S.effects.push({ type: 'beam', x1: ox, y1: oy, x2: x, y2: y, t: 0, maxT: 0.22, color: '34, 211, 238' });
    S.effects.push({ x: ox, y: oy, t: 0, maxT: 0.15, radius: S.TILE * 0.5, color: '34, 211, 238' });
}

function executeShot(dirX, dirY) {
    // Нормализуем направление ввода ОДИН РАЗ на входе в конвейер:
    // иначе диагональ (sx=1, sy=1) даёт модуль скорости √2·speed,
    // и весь веер траекторий наследует разгон
    const len = Math.hypot(dirX, dirY) || 1;
    dirX /= len;
    dirY /= len;
    const w = S.player.weapon;
    const plan = buildShotPlan(dirX, dirY);
    for (const p of plan) {
        if (w.beam) fireBeam(p.dirX, p.dirY);
        else spawnPlayerBullet(p.dirX, p.dirY);
    }
    playSound(w.beam ? 'rail_shot' : 'shoot');
    S.player.headRecoil = 1.0;
}

// ==== ЗАРЯД АТАКИ (рельсатрон и его синергии) ====
// Окно «переключения»: если игрок мгновенно сменил направление атаки
// (отпустил одну клавишу и тут же зажал другую), заряд НЕ сбрасывается
// и выстрел НЕ происходит — шкала продолжает заполняться.
const RAIL_SWITCH_GRACE = 0.12;

function updateRailgunCharge(dt, sx, sy, holding) {
    const p = S.player;
    if (holding) {
        const len = Math.hypot(sx, sy) || 1;
        p.chargeDirX = sx / len;
        p.chargeDirY = sy / len;
        p.headAngle = Math.atan2(sy, sx);
        p.isShooting = true;
        p.releaseTimer = 0;
        const wasFull = p.charge >= 1;
        // Скорость заполнения шкалы = текущая скорострельность (кулдаун)
        p.charge = Math.min(1, p.charge + dt / p.stats.fireRate);
        if (!wasFull && p.charge >= 1) playSound('rail_full');
    } else {
        p.releaseTimer += dt;
        if (p.releaseTimer >= RAIL_SWITCH_GRACE) {
            // Клавиши отпущены по-настоящему: выстрел, если шкала была полна
            if (p.charge >= 1) executeShot(p.chargeDirX, p.chargeDirY);
            p.charge = 0;
            p.releaseTimer = 0;
            if (p.headRecoil <= 0) p.isShooting = false;
        }
        // Внутри грейс-периода ничего не делаем: заряд сохраняется
    }
}

// Расстояние от точки до отрезка (для сквозного поражения лучом)
function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Шкала заряда справа от головы
function drawChargeGauge(ctx) {
    const p = S.player;
    if (!p.weapon.charge || p.charge <= 0) return;
    const gx = p.x + 14;
    const gy = p.y - 20;
    const gw = 20, gh = 5;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(gx - 1, gy - 1, gw + 2, gh + 2);
    const full = p.charge >= 1;
    const pulse = full ? 0.7 + Math.sin(S.gameState.gameTime * 20) * 0.3 : 1;
    ctx.fillStyle = `rgba(34, 211, 238, ${0.85 * pulse})`;
    ctx.fillRect(gx, gy, gw * Math.min(1, p.charge), gh);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - 1, gy - 1, gw + 2, gh + 2);
}

function updateBullets(dt) {
    for (let i = S.bullets.length - 1; i >= 0; i--) {
        const b = S.bullets[i];
        // Схлопывание: пуля замирает в точке конца дальности и доигрывает анимацию
        if (b.popping) {
            b.popT += dt;
            if (b.popT >= S.BULLET_POP_TIME) S.bullets.splice(i, 1);
            continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.hostile) {
            // Пули турелей: бесконечная дальность — летят до стены или попадания
            if (U.bulletHitsWall(b.x, b.y, areDoorsLocked)) S.bullets.splice(i, 1);
            continue;
        }
        b.life -= dt;
        if (b.life <= 0) {
            // Дошли до предела дальности: запускаем схлопывание на месте
            b.popping = true;
            b.popT = 0;
            continue;
        }
        if (U.bulletHitsWall(b.x, b.y, areDoorsLocked)) S.bullets.splice(i, 1);
    }
}

function checkBulletEnemyCollisions() {
    for (let i = S.bullets.length - 1; i >= 0; i--) {
        const b = S.bullets[i];
        if (b.hostile) continue; // вражеские пули по врагам не попадают
        if (b.popping) continue; // схлопывающаяся пуля уже не наносит урон
        let used = false;
        for (let j = S.enemies.length - 1; j >= 0; j--) {
            const e = S.enemies[j];
            // Зона поражения по пулям — намеренно щедрая (e.size, у босса 48),
            // физика тела — moveSize (см. updatePlayer / checkPlayerEnemyCollisions)
            const h = e.size / 2;
            // Если у врага есть смещение (hitOffset), сдвигаем проверку вверх
            const hitY = e.y - (e.hitOffset || 0);

            if (b.x > e.x - h && b.x < e.x + h && b.y > hitY - h && b.y < hitY + h) {
                e.hp -= b.damage;
                e.flash = S.ENEMY_HIT_FLASH;
                playSound('hit');
                notifyEnemyHit(e); // будит бомбера и т.п.
                used = true;
                if (e.hp <= 0) {
                    playSound('enemy_die');
                    S.enemies.splice(j, 1);
                    if (e.isBoss) {
                        // Комнату НЕ помечаем cleared: флаг выставится ниже,
                        // где проверяется S.enemies.length === 0 — то есть только
                        // когда добиты и призванные миньоны. Иначе портал и двери
                        // открывались бы, пока миньоны ещё живы.
                        loadRoom(S.gameState);
                    }
                }
                break;
            }
        }
        if (used) S.bullets.splice(i, 1);
    }
    // В секретной комнате врагов нет по определению — не помечаем ничего зачищенным
    if (S.enemies.length === 0 && !S.gameState.secretRoom) {
        const rd = getRoomData(S.gameState.mapRooms, S.gameState.currentRoom.x, S.gameState.currentRoom.y);
        if (rd && (rd.type === 'enemy' || rd.type === 'boss')) rd.cleared = true;
    }
}

// Трупы, помеченные взрывом/цепью, убираем здесь (нельзя сплайсить во время forEach)
function sweepDeadEnemies() {
    for (let i = S.enemies.length - 1; i >= 0; i--) {
        if (S.enemies[i].dead) S.enemies.splice(i, 1);
    }
}

// Вражеские пули по игроку (с уважением к неуязвимости)
function checkEnemyBulletPlayerCollisions() {
    if (S.player.invuln > 0) return;
    for (let i = S.bullets.length - 1; i >= 0; i--) {
        const b = S.bullets[i];
        if (!b.hostile) continue;
        if (U.checkCollision(S.player.x, S.player.y, S.PLAYER_SIZE, b.x, b.y, S.BULLET_SIZE)) {
            S.bullets.splice(i, 1);
            damagePlayer(b.damage);
            return;
        }
    }
}

function checkPlayerEnemyCollisions() {
    if (S.player.invuln > 0) return;
    for (const e of S.enemies) {
        // Небольшой буфер (4 px), чтобы урон срабатывал при легком касании краев.
        // Размер — физическое тело врага (moveSize), а не зона поражения по пулям
        const hitBuffer = 4;
        const eSize = e.moveSize || e.size;
        if (U.checkCollision(
            S.player.x, S.player.y, S.PLAYER_SIZE + hitBuffer,
            e.x, e.y, eSize + hitBuffer
        )) {
            damagePlayer(e.damage);
            return;
        }
    }
}

function updatePlayerInvuln(dt) {
    if (S.player.invuln > 0) {
        S.player.invuln -= dt;
        S.player.blinkTimer += dt;
        if (S.player.blinkTimer >= S.BLINK_INTERVAL) {
            S.player.blinkTimer = 0;
            S.player.visible = !S.player.visible;
        }
        if (S.player.invuln <= 0) {
            S.player.visible = true;
            S.player.invuln = 0;
        }
    }
    if (S.player.hitFlash > 0) {
        S.player.hitFlash -= dt;
        if (S.player.hitFlash < 0) S.player.hitFlash = 0;
    }
}

function damagePlayer(amount) {
    playSound('hit'); // Игрок тоже получает звук удара
    S.player.hp -= amount;
    S.player.invuln = S.INVULN_TIME;
    S.player.hitFlash = S.HIT_FLASH_TIME;
    S.player.blinkTimer = 0;
    S.player.visible = false;
    updateHpHUD();
    if (S.player.hp <= 0) {
        S.player.hp = 0;
        triggerGameOver();
    }
}

// ==== КОНЕЦ ИГРЫ ====
// Отдельные оверлеи (#gameover-overlay / #victory-overlay в index.html).
// Раньше innerHTML перезаписывал #pause-overlay, из-за чего меню паузы
// необратимо ломалось после первой смерти/победы (resume-btn уничтожался).
function triggerGameOver() {
    S.gameState.gameOver = true;
    S.gameState.paused = true;
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.remove('hidden');
}

function triggerVictory() {
    if (S.gameState.gameWon) return;
    S.gameState.gameWon = true;
    S.gameState.paused = true;
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('victory-overlay').classList.remove('hidden');
}

// ==== ОБНОВЛЕНИЕ ====
function update(dt) {
    S.gameState.gameTime += dt;
    updateTransition(dt);
    if (S.gameState.transition.phase !== null) {
        updatePlayerInvuln(dt);
        return;
    }
    updatePlayer(dt);
    updateBullets(dt);
    updateAllEnemies(S.enemies, dt, S.player, areDoorsLocked);
    sweepDeadEnemies();
    separateEnemies(S.enemies, areDoorsLocked); // враги не входят друг в друга
    updateEffects(dt);
    checkBulletEnemyCollisions();
    checkEnemyBulletPlayerCollisions();
    checkPlayerEnemyCollisions();
    updatePlayerInvuln(dt);
    updateAllItems(S.items, S.player, {
        floatStat,
        updateStatsUI,
        rebuildHpHUD,
        updateHpHUD,
        onPickup: () => {
            if (S.gameState.secretRoom) return; // подбор в секретке не трогает текущую комнату
            const rd = getRoomData(S.gameState.mapRooms, S.gameState.currentRoom.x, S.gameState.currentRoom.y);
            if (rd && rd.type === 'chest') rd.cleared = true;
            // Сундук визуально открывается в момент подбора предмета
            S.chests.forEach(ch => { ch.opened = true; });
        }
    });
}

// ==== КАМЕРА ====
// Видимая область в мировых координатах: при VIEW_ZOOM > 1 она меньше комнаты.
// Камера центрируется на дроиде и не выходит за границы комнаты.
function getCamera() {
    const viewW = S.WORLD_W / S.VIEW_ZOOM;
    const viewH = S.WORLD_H / S.VIEW_ZOOM;
    let cx = S.player.x - viewW / 2;
    let cy = S.player.y - viewH / 2;
    cx = Math.max(0, Math.min(S.WORLD_W - viewW, cx));
    cy = Math.max(0, Math.min(S.WORLD_H - viewH, cy));
    return { x: cx, y: cy };
}

// ==== ОТРИСОВКА ====
function render() {
    const cam = getCamera();
    const Z = S.VIEW_ZOOM;

    // --- Фон в экранных координатах на ВЕСЬ canvas ---
    // Защита от незакрашенных областей: если внутреннее разрешение canvas
    // когда-либо не совпадёт с размером мира, прозрачных «полосатых» зон не будет
    S.ctx.setTransform(1, 0, 0, 1, 0, 0);
    S.ctx.fillStyle = S.COLORS.floorB;
    S.ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
    // --- Мировой слой: увеличен в Z раз и сдвинут на камеру ---
    S.ctx.setTransform(Z, 0, 0, Z, -cam.x * Z, -cam.y * Z);
    S.ctx.imageSmoothingEnabled = false;
    drawRoomCached(S.ctx, S.gameState.room);
    drawDoors(S.ctx, S.gameState.room, areDoorsLocked);
    S.chests.forEach(c => {
        const spr = c.opened ? S.SPRITES.chestOpen : S.SPRITES.chestClosed;
        if (spr && spr.complete) S.ctx.drawImage(spr, c.x - 16, c.y - 16, 32, 32);
    });
    drawAllItems(S.ctx, S.items, S.SPRITES);
    drawBulletsBeforePlayer(S.ctx);
    drawAllEnemies(S.ctx, S.enemies, S.SPRITES);
    drawPlayer(S.ctx);
    drawChargeGauge(S.ctx); // шкала заряда рельсатрона — поверх игрока
    drawBulletsAfterPlayer(S.ctx);
    drawEffects(S.ctx); // взрывы, луч и прочие эффекты — поверх мирового слоя
    // Отрисовка хитбоксов (отладка) — в мировых координатах
    drawHitboxes(S.ctx);

    // --- Экрранный слой: UI без зума, от размеров canvas ---
    S.ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (S.gameState.transition.phase === 'fade') {
        const a = Math.min(1, S.gameState.transition.timer / S.TRANSITION_FADE);
        S.ctx.fillStyle = `rgba(0,0,0,${a})`;
        S.ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
    }
    if (S.gameState.showFullMap) {
        drawFullMap(S.ctx);
    } else if (!S.gameState.inPreStart && !S.gameState.secretRoom) {
        drawMinimap(S.ctx);
    }

    S.ctx.font = `${Math.round(10 * Z)}px "VT323", monospace`;
    S.ctx.fillStyle = 'rgba(138,143,168,0.5)';
    S.ctx.textAlign = 'left';
    S.ctx.textBaseline = 'top';
    let info = `${VERSION} · HP: ${S.player.hp}/${S.player.maxHp} · room: [${S.gameState.currentRoom.x},${S.gameState.currentRoom.y}] · enemies: ${S.enemies.length}`;
    if (S.gameState.secretRoom) info += ' · SECRET';
    if (areDoorsLocked()) info += ' · 🔒';
    S.ctx.fillText(info, 6 * Z, 6 * Z);
}

// ==== ИГРОВОЙ ЦИКЛ ====
function loop(timestamp) {
    if (!S.gameState.lastTime) S.gameState.lastTime = timestamp;
    let delta = timestamp - S.gameState.lastTime;
    S.gameState.lastTime = timestamp;
    if (delta > 100) delta = 100;
    if (!S.gameState.paused && !S.gameState.gameOver && !S.gameState.gameWon) {
        S.gameState.accumulator += delta;
        while (S.gameState.accumulator >= S.STEP) {
            update(S.STEP / 1000);
            S.gameState.accumulator -= S.STEP;
        }
    }
    render();
    requestAnimationFrame(loop);
}

// ==== СТАРТ ====
function startGame() {
    S.gameState.gameOver = false;
    S.gameState.gameWon = false;
    S.gameState.paused = false;
    S.gameState.transition = { phase: null, timer: 0, targetDir: null, returnDir: null };
    S.gameState.inPreStart = true;
    S.gameState.seed = generateSeed();
    S.gameState.rng = null; // создаётся при выходе из стартовой комнаты
    S.gameState.showFullMap = false;
    S.gameState.gameTime = 0;
    // Старая карта не должна попадать в pre-start комнату (индекс комнат тоже чистим)
    S.gameState.mapRooms.length = 0;
    rebuildRoomIndex(S.gameState.mapRooms);
    S.gameState.currentRoom.x = Math.floor(S.MAP_COLS / 2);
    S.gameState.currentRoom.y = Math.floor(S.MAP_ROWS / 2);
    S.player.hp = S.PLAYER_START_MAX_HP;
    S.player.maxHp = S.PLAYER_START_MAX_HP;
    S.player.invuln = 0;
    S.player.hitFlash = 0;
    S.player.visible = true;
    S.player.shootCooldown = 0;
    S.player.suckProgress = 0;
    S.player.stats = { damage: 1, speed: 4.5, fireRate: 0.4, range: 150 };
    S.player.vel = { x: 0, y: 0 };
    S.player.facing = 0;
    S.player.animTime = 0;
    S.player.headRecoil = 0;
    S.player.isShooting = false;
    S.player.idleTimer = 0;
    S.player.weapon = { spread: 0, spreadStep: Math.PI / 4, beam: false, charge: false };
    S.player.charge = 0;
    S.player.releaseTimer = 0;
    S.player.x = (S.ROOM_COLS / 2) * S.TILE + S.TILE / 2;
    S.player.y = (S.ROOM_ROWS / 2) * S.TILE + S.TILE / 2;
    S.bullets.length = 0;
    S.enemies.length = 0;
    S.effects.length = 0;
    S.chests.length = 0;
    S.items.length = 0;
    loadRoom(S.gameState);
    updateStatsUI();
    rebuildHpHUD();
    updateHpHUD();
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
    document.getElementById('victory-overlay').classList.add('hidden');
}

function togglePause() {
    if (!gameStarted) return; // до нажатия «Играть» Esc ничего не делает
    if (S.gameState.gameOver || S.gameState.gameWon) return;
    S.gameState.paused = !S.gameState.paused;
    document.getElementById('pause-overlay').classList.toggle('hidden', !S.gameState.paused);
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ==== ИНИЦИАЛИЗАЦИЯ ====
function init() {
    S.setCanvas(document.getElementById('game-canvas'), document.getElementById('game-canvas').getContext('2d'));
        // Физическое разрешение canvas = мир × VIEW_ZOOM (зум камеры)
    S.canvas.width = S.VIEW_W;
    S.canvas.height = S.VIEW_H;
    S.ctx.imageSmoothingEnabled = false;
    function fitCanvas() {
        const wrap = document.getElementById('canvas-wrap');
        const cs = window.getComputedStyle(wrap);
        // Честно вычитаем паддинги (110px сверху / 36px снизу): раньше canvas
        // выходил за пределы области, и браузер нецелочисленно сжимал его (мыло)
        const availW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 20;
        const availH = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 20;
        const scale = Math.min(availW / S.VIEW_W, availH / S.VIEW_H);
        // Масштаб с шагом 0.5: раньше Math.floor() выбрасывал до 2x полезной
        // площади окна (scale 2.6 -> fs 1), из-за чего игра выглядела маленькой.
        // Целые и половинные значения дают ровную пиксельную сетку;
        // дробный < 1 — только когда окно приходится уменьшать.
        const fs = scale >= 1 ? Math.max(0.5, Math.floor(scale * 2) / 2) : Math.max(0.25, scale);
        S.canvas.style.width = Math.max(1, Math.round(S.VIEW_W * fs)) + 'px';
        S.canvas.style.height = Math.max(1, Math.round(S.VIEW_H * fs)) + 'px';
    }
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    initInput();
    initAudio(); // Создаём аудио-контекст (разбужен будет по клику «Играть»)
    initDebug(); // Инициализация отладочных клавиш
    S.setOnPlayerDamaged(damagePlayer); // взрывы врагов бьют игрока через этот хук
    document.addEventListener('togglePause', togglePause);

    // Безопасная обвязка: отсутствие элемента не должно ломать остальную
    // инициализацию (раньше TypeError на отсутствующем #restart-btn обрывал
    // init() ещё до навешивания обработчика кнопки «Играть»)
    const on = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
        else console.warn(`[init] не найден элемент #${id} — проверьте index.html`);
    };

    on('theme-toggle', 'click', toggleTheme);
    // Восстанавливаем сохранённую тему (раньше localStorage только писался)
    applyTheme(localStorage.getItem('theme') || 'dark');
    on('resume-btn', 'click', togglePause);
    on('restart-btn', 'click', () => {
        const ov = document.getElementById('gameover-overlay');
        if (ov) ov.classList.add('hidden');
        startGame();
    });
    on('restart-v-btn', 'click', () => {
        const ov = document.getElementById('victory-overlay');
        if (ov) ov.classList.add('hidden');
        startGame();
    });
    loadAllSprites();
    const hudTop = document.getElementById('hud-top');
    const hudBottom = document.getElementById('hud-bottom');
    hudTop.style.display = 'none';
    hudBottom.style.display = 'none';

    on('start-btn', 'click', () => {
        resumeAudio(); // первый пользовательский жест — будим AudioContext (иначе в Chrome нет звука)
        document.getElementById('main-menu').classList.add('hidden');
        hudTop.style.display = 'flex';
        hudBottom.style.display = 'flex';
        gameStarted = true;
        startGame();
        requestAnimationFrame(loop);
    });

    // Секретная комната: слушаем токены команды W W S S D D → выстрел вправо ×2
    document.addEventListener('keydown', (e) => {
        const token = secretTokenFromKey(e);
        if (token) pushSecretToken(token);
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu && !mainMenu.classList.contains('hidden')) {
                e.preventDefault();
                document.getElementById('start-btn').click();
                return;
            }
            // Space подтверждает главную кнопку любого видимого оверлея
            const overlayIds = ['pause-overlay', 'gameover-overlay', 'victory-overlay'];
            for (const id of overlayIds) {
                const ov = document.getElementById(id);
                if (ov && !ov.classList.contains('hidden')) {
                    e.preventDefault();
                    const btn = ov.querySelector('#restart-btn, #restart-v-btn, #resume-btn');
                    if (btn) btn.click();
                    break;
                }
            }
        }
    });
}

window.addEventListener('load', init);