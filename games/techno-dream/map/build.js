import { MAP_COLS, MAP_ROWS } from '../core/state.js';
import { oppositeDir, deltaForDir } from '../core/utils.js';

// Индекс комнат для O(1)-поиска вместо линейного mapRooms.find():
// getRoomData дёргается каждый кадр из рендера дверей, миникарта и полной карты
const roomIndex = new Map();

function roomKey(x, y) {
    return x + ',' + y;
}

export function rebuildRoomIndex(mapRooms) {
    roomIndex.clear();
    for (const r of mapRooms) roomIndex.set(roomKey(r.x, r.y), r);
}

function addRoom(gameState, room) {
    gameState.mapRooms.push(room);
    roomIndex.set(roomKey(room.x, room.y), room);
    return room;
}

export function buildMap(gameState, rng) {
    gameState.mapRooms.length = 0;
    rebuildRoomIndex(gameState.mapRooms);

    const grid = [];
    for (let y = 0; y < MAP_ROWS; y++) {
        grid[y] = [];
        for (let x = 0; x < MAP_COLS; x++) grid[y][x] = null;
    }

    const startX = Math.floor(MAP_COLS / 2);
    const startY = Math.floor(MAP_ROWS / 2);
    const startRoom = createRoom(startX, startY, 'start', rng);
    startRoom.visited = true;
    startRoom.seen = true;
    startRoom.cleared = true;
    grid[startY][startX] = startRoom;
    addRoom(gameState, startRoom);

    // ==== ВЫБОР ПОЗИЦИИ ДЛЯ БОССА ====
    const corners = [
        { x: 1, y: 1 },
        { x: MAP_COLS - 2, y: 1 },
        { x: 1, y: MAP_ROWS - 2 },
        { x: MAP_COLS - 2, y: MAP_ROWS - 2 }
    ];
    const bossSpot = rng.pick(corners);
    const bossRoom = createRoom(bossSpot.x, bossSpot.y, 'boss', rng);
    grid[bossSpot.y][bossSpot.x] = bossRoom;
    addRoom(gameState, bossRoom);
    gameState.bossRoom = bossRoom;

// ==== ВЫБОР ПОЗИЦИИ ДЛЯ СУНДУКА ====
    // Дистанция Чебышева >= 2 от старта и босса: вокруг сундука должно быть
    // свободное кольцо клеток («ров»), где нельзя ставить другие комнаты
    let chestSpot = null;
    let attempts = 0;
    while (!chestSpot && attempts < 200) {
        attempts++;
        const rx = rng.nextInt(1, MAP_COLS - 2);
        const ry = rng.nextInt(1, MAP_ROWS - 2);
        if (rx === startX && ry === startY) continue;
        if (Math.max(Math.abs(rx - bossSpot.x), Math.abs(ry - bossSpot.y)) < 2) continue;
        if (Math.max(Math.abs(rx - startX), Math.abs(ry - startY)) < 2) continue;
        chestSpot = { x: rx, y: ry };
    }
    if (!chestSpot) {
        // Фоллбэк: первая пустая клетка с дистанцией >= 2 от старта и босса
        outer:
        for (let y = 1; y < MAP_ROWS - 1; y++) {
            for (let x = 1; x < MAP_COLS - 1; x++) {
                if (grid[y][x]) continue;
                if (Math.max(Math.abs(x - bossSpot.x), Math.abs(y - bossSpot.y)) < 2) continue;
                if (Math.max(Math.abs(x - startX), Math.abs(y - startY)) < 2) continue;
                chestSpot = { x, y };
                break outer;
            }
        }
    }
    if (!chestSpot) chestSpot = { x: 1, y: MAP_ROWS - 2 };
    const chestRoom = createRoom(chestSpot.x, chestSpot.y, 'chest', rng);
    grid[chestSpot.y][chestSpot.x] = chestRoom;
    addRoom(gameState, chestRoom);

    // «Ров» вокруг сундука: все касающиеся его клетки (включая диагонали).
    // Занять разрешено ровно одну — соседа, через который идёт единственный проход.
    // Путь к сундуку прокладывается ПЕРВЫМ и резервирует этого соседа;
    // вся остальная генерация рва не касается.
    const chestMoat = { x: chestSpot.x, y: chestSpot.y, slotUsed: false };

    carvePath(grid, gameState, startX, startY, chestSpot.x, chestSpot.y, rng, chestMoat, bossSpot);
    carvePath(grid, gameState, startX, startY, bossSpot.x, bossSpot.y, rng, chestMoat, chestSpot);

    // Страховка: если путь к спец-комнате всё же уткнулся в препятствие и
    // прохода не получилось — прорываем тоннель принудительно
    ensureConnected(grid, gameState, chestSpot, rng, chestMoat, bossSpot);
    ensureConnected(grid, gameState, bossSpot, rng, chestMoat, chestSpot);

    let extraRooms = rng.nextInt(8, 16);
    attempts = 0;
    while (extraRooms > 0 && attempts < 150) {
        attempts++;
        const emptySpots = [];
        for (let y = 1; y < MAP_ROWS - 1; y++) {
            for (let x = 1; x < MAP_COLS - 1; x++) {
                if (!grid[y][x]) {
                    const nearUnique = (Math.abs(x - startX) + Math.abs(y - startY) < 2) ||
                                       (Math.abs(x - bossSpot.x) + Math.abs(y - bossSpot.y) < 2) ||
                                       (Math.abs(x - chestSpot.x) + Math.abs(y - chestSpot.y) < 2);
                    // Сундук: запрещаем и диагональные клетки («ров»), чтобы
                    // extra-комнаты не вставали вплотную к сундуку
                    const nearChest = Math.max(Math.abs(x - chestSpot.x), Math.abs(y - chestSpot.y)) <= 1;
                    if (!nearUnique && !nearChest) emptySpots.push({ x, y });
                }
            }
        }
        if (emptySpots.length === 0) break;
        const spot = rng.pick(emptySpots);
        const neighbors = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ].filter(n => {
            const nx = spot.x + n.dx;
            const ny = spot.y + n.dy;
            return nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS && grid[ny][nx];
        });
        if (neighbors.length > 0) {
            const newRoom = createRoom(spot.x, spot.y, 'enemy', rng);
            grid[spot.y][spot.x] = newRoom;
            addRoom(gameState, newRoom);
            const n = rng.pick(neighbors);
            const neighbor = grid[spot.y + n.dy][spot.x + n.dx];
            connectRooms(newRoom, neighbor);
            extraRooms--;
        }
    }

    connectAdjacentRooms(grid);
    forceUniqueDoors(bossRoom, grid);
    forceUniqueDoors(chestRoom, grid);
}

function createRoom(x, y, type, rng) {
    const room = {
        x, y, type, visited: false, seen: false, cleared: false,
        doors: { top: false, bottom: false, left: false, right: false },
        floorData: []
    };
    // Весь рандом декораций — из сидового rng: карта полностью воспроизводима по сиду
    const rand = rng ? () => rng.next() : Math.random;
    const pickFrom = list => list[Math.floor(rand() * list.length)];
    // Генерация пола
    for (let r = 0; r < 9; r++) {
        room.floorData[r] = [];
        for (let c = 0; c < 15; c++) {
            const isEven = (r + c) % 2 === 0;
            // Жестко задаем базовую плитку
            let tileId = isEven ? 'floor_1' : 'floor_2';
            // Декор строго в рамках своей базы!
            if (r > 0 && r < 8 && c > 0 && c < 14) {
                const roll = rand();
                if (roll < 0.15) {
                    // Умеренный
                    tileId = isEven
                        ? pickFrom(['floor_1_1', 'floor_1_2', 'floor_1_3'])
                        : pickFrom(['floor_2_1', 'floor_2_2', 'floor_2_3']);
                } else if (roll < 0.19) {
                    // Редкий
                    tileId = isEven
                        ? pickFrom(['floor_1_4', 'floor_1_5', 'floor_1_6', 'floor_1_7'])
                        : pickFrom(['floor_2_4', 'floor_2_5', 'floor_2_6']);
                } else if (roll < 0.20) {
                    // Супер-редкий (есть только для 1-й базы)
                    if (isEven) tileId = 'floor_1_8';
                } else if (roll < 0.201) {
                    // Ультра-редкий
                    tileId = isEven ? 'floor_1_9' : 'floor_2_7';
                }
            }
            room.floorData[r][c] = tileId;
        }
    }
    return room;
}

function connectAdjacentRooms(grid) {
    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            const room = grid[y][x];
            if (!room) continue;
            if (room.type === 'boss' || room.type === 'chest') continue;
            if (x + 1 < MAP_COLS && grid[y][x + 1]) {
                const neighbor = grid[y][x + 1];
                if (neighbor.type !== 'boss' && neighbor.type !== 'chest') {
                    room.doors.right = true;
                    neighbor.doors.left = true;
                }
            }
            if (y + 1 < MAP_ROWS && grid[y + 1][x]) {
                const neighbor = grid[y + 1][x];
                if (neighbor.type !== 'boss' && neighbor.type !== 'chest') {
                    room.doors.bottom = true;
                    neighbor.doors.top = true;
                }
            }
        }
    }
}

function carvePath(grid, gameState, startX, startY, endX, endY, rng, moat, forbiddenSpot) {
    let cx = startX;
    let cy = startY;
    let safety = 0;

    // Можно ли занять клетку (nx, ny): создать в ней комнату или пройти через неё
    function cellAllowed(nx, ny) {
        if (nx === endX && ny === endY) return true; // цель разрешена всегда
        // Не проходим сквозь чужую спец-комнату (босс при пути к сундуку и наоборот)
        if (forbiddenSpot && nx === forbiddenSpot.x && ny === forbiddenSpot.y) return false;
        // Клетки, касающиеся сундука (включая диагонали): разрешена только
        // одна зарезервированная — единственный будущий сосед сундука
        if (Math.max(Math.abs(nx - moat.x), Math.abs(ny - moat.y)) <= 1) {
            if (grid[ny][nx]) return true; // комната уже стоит (это и есть резерв)
            if (moat.slotUsed) return false;
            moat.slotUsed = true; // резервируем клетку как единственного соседа
            return true;
        }
        return true;
    }

    while ((cx !== endX || cy !== endY) && safety < 100) {
        safety++;
        const dx = Math.sign(endX - cx);
        const dy = Math.sign(endY - cy);
        // Кандидаты шага: монотонные (случайный порядок), затем обходные вбок —
        // чтобы «ров» и запретные клетки можно было обойти, а не упираться
        const candidates = [];
        if (dx !== 0 && dy !== 0) {
            if (rng.next() > 0.5) candidates.push([cx + dx, cy], [cx, cy + dy]);
            else candidates.push([cx, cy + dy], [cx + dx, cy]);
        } else if (dx !== 0) {
            candidates.push([cx + dx, cy], [cx, cy + 1], [cx, cy - 1]);
        } else {
            candidates.push([cx, cy + dy], [cx + 1, cy], [cx - 1, cy]);
        }
        let moved = false;
        for (const cand of candidates) {
            const nx = cand[0];
            const ny = cand[1];
            if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) continue;
            if (!cellAllowed(nx, ny)) continue;
            if (!grid[ny][nx]) {
                const room = createRoom(nx, ny, 'enemy', rng);
                grid[ny][nx] = room;
                addRoom(gameState, room);
            }
            const r1 = grid[cy][cx];
            const r2 = grid[ny][nx];
            if (r1.type !== 'boss' && r1.type !== 'chest' && r2.type !== 'boss' && r2.type !== 'chest') {
                connectRooms(r1, r2);
            } else if (r1.type === 'boss' || r1.type === 'chest') {
                if (!r1.doors.top && !r1.doors.bottom && !r1.doors.left && !r1.doors.right) {
                    connectRooms(r1, r2);
                }
            } else if (r2.type === 'boss' || r2.type === 'chest') {
                if (!r2.doors.top && !r2.doors.bottom && !r2.doors.left && !r2.doors.right) {
                    connectRooms(r1, r2);
                }
            }
            cx = nx;
            cy = ny;
            moved = true;
            break;
        }
        if (!moved) break; // совсем тупик (практически недостижимо из-за обходов)
    }
}

// Если спец-комната (босс/сундук) осталась без единой двери — создаём соседа
// в её «рве» (это и будет единственный сосед) и прокапываем от него тоннель к старту
function ensureConnected(grid, gameState, spot, rng, moat, forbiddenSpot) {
    const room = grid[spot.y][spot.x];
    if (room.doors.top || room.doors.bottom || room.doors.left || room.doors.right) return;
    const dirs = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];
    for (const d of dirs) {
        const nx = spot.x + d.dx;
        const ny = spot.y + d.dy;
        if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
        if (forbiddenSpot && nx === forbiddenSpot.x && ny === forbiddenSpot.y) continue;
        if (!grid[ny][nx]) {
            const r = createRoom(nx, ny, 'enemy', rng);
            grid[ny][nx] = r;
            addRoom(gameState, r);
        }
        connectRooms(room, grid[ny][nx]);
        // Тоннель от нового соседа к стартовой комнате, чтобы не остался островом
        carvePath(grid, gameState, nx, ny, Math.floor(MAP_COLS / 2), Math.floor(MAP_ROWS / 2), rng, moat, forbiddenSpot);
        return;
    }
}

function connectRooms(r1, r2) {
    if (r2.x === r1.x && r2.y === r1.y + 1) { r1.doors.bottom = true; r2.doors.top = true; }
    if (r2.x === r1.x && r2.y === r1.y - 1) { r1.doors.top = true; r2.doors.bottom = true; }
    if (r2.x === r1.x + 1 && r2.y === r1.y) { r1.doors.right = true; r2.doors.left = true; }
    if (r2.x === r1.x - 1 && r2.y === r1.y) { r1.doors.left = true; r2.doors.right = true; }
}

function forceUniqueDoors(room, grid) {
    const dirs = ['top', 'bottom', 'left', 'right'].filter(d => room.doors[d]);
    if (dirs.length > 1) {
        const keep = dirs[0];
        dirs.forEach(d => {
            if (d !== keep) {
                room.doors[d] = false;
                const delta = deltaForDir(d);
                const nx = room.x + delta.dx;
                const ny = room.y + delta.dy;
                if (nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS) {
                    const neighbor = grid[ny][nx];
                    if (neighbor) neighbor.doors[oppositeDir(d)] = false;
                }
            }
        });
    }
}

export function getRoomData(mapRooms, x, y) {
    const hit = roomIndex.get(roomKey(x, y));
    if (hit) return hit;
    // Фоллбэк на линейный поиск (например, до построения индекса)
    return mapRooms.find(r => r.x === x && r.y === y);
}

export function getDoorsForRoom(mapRooms, x, y) {
    const room = getRoomData(mapRooms, x, y);
    if (room && room.doors) return room.doors;
    return { top: false, bottom: false, left: false, right: false };
}