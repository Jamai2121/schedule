import { getRoomData, getDoorsForRoom } from './build.js';
import { itemTypes } from '../items/index.js';
import * as S from '../core/state.js';

// Случайность наполнения комнат берём из сидового rng игры (если он уже есть),
// иначе Math.random (pre-start комната — она вне карты)
function rand01(gameState) {
    return gameState.rng ? gameState.rng.next() : Math.random();
}

function pickFrom(gameState, arr) {
    return arr[Math.floor(rand01(gameState) * arr.length)];
}

export function generateRoom(gameState) {
    const { ROOM_COLS, ROOM_ROWS, TILE_FLOOR, TILE_WALL, TILE_DOOR_TOP, TILE_DOOR_BOTTOM, TILE_DOOR_LEFT, TILE_DOOR_RIGHT, TILE_EXIT_DOOR } = S;
    const roomData = getRoomData(gameState.mapRooms, gameState.currentRoom.x, gameState.currentRoom.y);
    if (roomData) {
        gameState.floorDecor = roomData.floorData;
    } else {
        gameState.floorDecor = [];
    }
    gameState.room.length = 0;
    for (let r = 0; r < ROOM_ROWS; r++) {
        gameState.room[r] = [];
        for (let c = 0; c < ROOM_COLS; c++) gameState.room[r][c] = TILE_FLOOR;
    }
    for (let c = 0; c < ROOM_COLS; c++) { gameState.room[0][c] = TILE_WALL; gameState.room[ROOM_ROWS - 1][c] = TILE_WALL; }
    for (let r = 0; r < ROOM_ROWS; r++) { gameState.room[r][0] = TILE_WALL; gameState.room[r][ROOM_COLS - 1] = TILE_WALL; }

    const midCol = Math.floor(ROOM_COLS / 2);
    const midRow = Math.floor(ROOM_ROWS / 2);

    if (gameState.doors.top)    gameState.room[0][midCol] = TILE_DOOR_TOP;
    if (gameState.doors.bottom) gameState.room[ROOM_ROWS - 1][midCol] = TILE_DOOR_BOTTOM;
    if (gameState.doors.left)   gameState.room[midRow][0] = TILE_DOOR_LEFT;
    if (gameState.doors.right)  gameState.room[midRow][ROOM_COLS - 1] = TILE_DOOR_RIGHT;

    if (roomData && roomData.type === 'boss') {
        const exitSides = [];
        if (!gameState.doors.top)    exitSides.push('top');
        if (!gameState.doors.bottom) exitSides.push('bottom');
        if (!gameState.doors.left)   exitSides.push('left');
        if (!gameState.doors.right)  exitSides.push('right');
        if (exitSides.length > 0) {
            // Сторона выхода фиксируется один раз и сидово (раньше — Math.random)
            if (!roomData.exitSide || !exitSides.includes(roomData.exitSide)) {
                roomData.exitSide = pickFrom(gameState, exitSides);
            }
            const side = roomData.exitSide;
            if (side === 'top')    gameState.room[0][midCol] = TILE_EXIT_DOOR;
            if (side === 'bottom') gameState.room[ROOM_ROWS - 1][midCol] = TILE_EXIT_DOOR;
            if (side === 'left')   gameState.room[midRow][0] = TILE_EXIT_DOOR;
            if (side === 'right')  gameState.room[midRow][ROOM_COLS - 1] = TILE_EXIT_DOOR;
        }
    }
}

export function loadRoom(gameState) {
    // Любая загрузка комнаты инвалидирует кэш статики (render/floor.js)
    gameState.roomVersion++;

    if (gameState.inPreStart) {
        gameState.doors = { top: false, bottom: false, left: false, right: false };
        generateRoom(gameState);
        const midCol = Math.floor(S.ROOM_COLS / 2);
        gameState.room[S.ROOM_ROWS - 1][midCol] = S.TILE_EXIT_DOOR;
        S.chests.length = 0;
        S.items.length = 0;
        return;
    }

    const d = getDoorsForRoom(gameState.mapRooms, gameState.currentRoom.x, gameState.currentRoom.y);
    gameState.doors = d;

    const current = getRoomData(gameState.mapRooms, gameState.currentRoom.x, gameState.currentRoom.y);
    if (current) current.seen = true;
    const neighbors = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];
    neighbors.forEach(n => {
        const neighbor = getRoomData(gameState.mapRooms, gameState.currentRoom.x + n.dx, gameState.currentRoom.y + n.dy);
        if (neighbor) neighbor.seen = true;
    });

    generateRoom(gameState);

    S.chests.length = 0;
    S.items.length = 0;

    const roomData = getRoomData(gameState.mapRooms, gameState.currentRoom.x, gameState.currentRoom.y);
    if (roomData && roomData.type === 'chest' && !roomData.cleared) {
        const midCol = Math.floor(S.ROOM_COLS / 2);
        const midRow = Math.floor(S.ROOM_ROWS / 2);
        const chestX = midCol * S.TILE + S.TILE / 2;
        const chestY = midRow * S.TILE + S.TILE / 2;
        // Сундук закрыт: открывается в момент подбора предмета (onPickup в оркестраторе)
        S.chests.push({ x: chestX, y: chestY, opened: false });
        if (!roomData.itemType) {
            // Тип предмета — из сидового rng и сохраняется за комнатой
            roomData.itemType = pickFrom(gameState, itemTypes);
        }
        S.items.push({
            x: chestX,
            y: chestY - 32,
            type: roomData.itemType,
            bobbing: rand01(gameState) * Math.PI * 2,
        });
    }
}