import { gameState, TILE, ROOM_ROWS, ROOM_COLS, TILE_WALL, TILE_FLOOR, TILE_EXIT_DOOR, TILE_DOOR_TOP, TILE_DOOR_BOTTOM, TILE_DOOR_LEFT, TILE_DOOR_RIGHT } from './state.js';

export function tileAt(worldX, worldY) {
  const c = Math.floor(worldX / TILE);
  const r = Math.floor(worldY / TILE);
  if (r < 0 || r >= ROOM_ROWS || c < 0 || c >= ROOM_COLS) return TILE_WALL;
  return gameState.room[r][c];
}

export function isWalkable(worldX, worldY, areDoorsLockedFn) {
  const t = tileAt(worldX, worldY);
  if (t === TILE_FLOOR) return true;
  if (t === TILE_DOOR_TOP || t === TILE_DOOR_BOTTOM || t === TILE_DOOR_LEFT || t === TILE_DOOR_RIGHT) {
    return !areDoorsLockedFn();
  }
  if (t === TILE_EXIT_DOOR) return true;
  return false;
}

export function canStand(cx, cy, size, areDoorsLockedFn) {
  const half = size / 2;
  return isWalkable(cx - half, cy - half, areDoorsLockedFn) &&
         isWalkable(cx + half, cy - half, areDoorsLockedFn) &&
         isWalkable(cx - half, cy + half, areDoorsLockedFn) &&
         isWalkable(cx + half, cy + half, areDoorsLockedFn);
}

// Пуля «залипает» в обычной двери только пока двери заперты;
// в открытые двери можно стрелять (выходная дверь пули не блокировала и раньше)
export function bulletHitsWall(cx, cy, areDoorsLockedFn) {
  const t = tileAt(cx, cy);
  if (t === TILE_WALL) return true;
  if (t === TILE_DOOR_TOP || t === TILE_DOOR_BOTTOM || t === TILE_DOOR_LEFT || t === TILE_DOOR_RIGHT) {
    return areDoorsLockedFn ? areDoorsLockedFn() : true;
  }
  return false;
}

export function oppositeDir(dir) {
  if (dir === 'top') return 'bottom';
  if (dir === 'bottom') return 'top';
  if (dir === 'left') return 'right';
  if (dir === 'right') return 'left';
  return null;
}

export function deltaForDir(dir) {
  if (dir === 'top') return { dx: 0, dy: -1 };
  if (dir === 'bottom') return { dx: 0, dy: 1 };
  if (dir === 'left') return { dx: -1, dy: 0 };
  if (dir === 'right') return { dx: 1, dy: 0 };
  return { dx: 0, dy: 0 };
}

export function checkCollision(x1, y1, size1, x2, y2, size2) {
  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return false;
  const half1 = size1 / 2;
  const half2 = size2 / 2;
  return (x1 + half1 > x2 - half2 &&
          x1 - half1 < x2 + half2 &&
          y1 + half1 > y2 - half2 &&
          y1 - half1 < y2 + half2);
}