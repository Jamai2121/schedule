import { TILE, ROOM_COLS, ROOM_ROWS, WORLD_W, WORLD_H, COLORS, gameState, SPRITES } from '../core/state.js';
import { drawWalls } from './walls.js';

// ==== КЭШ СТАТИКИ КОМНАТЫ ====
// Пол и стены не меняются, пока мы в комнате — незачем каждый кадр рисовать
// ~180 тайлов (стены ещё и с save/translate/rotate на каждый тайл).
// Рисуем статику в offscreen-canvas один раз при входе в комнату и дальше
// просто вставляем готовый кадр. Ключ кэша: комната + версия + готовность спрайтов.
let cacheCanvas = null;
let cacheKey = '';

function currentCacheKey() {
  const pos = gameState.inPreStart
    ? 'prestart'
    : gameState.currentRoom.x + ':' + gameState.currentRoom.y;
  return pos + '|v' + gameState.roomVersion + '|' + (gameState.spritesReady ? 1 : 0);
}

export function drawRoomCached(ctx, room) {
  if (!gameState.spritesReady) {
    // Спрайты ещё грузятся — рисуем напрямую (с цветовыми фоллбэками)
    drawFloor(ctx);
    drawWalls(ctx, room);
    return;
  }
  const key = currentCacheKey();
  if (!cacheCanvas) {
    cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = WORLD_W;
    cacheCanvas.height = WORLD_H;
  }
  if (key !== cacheKey) {
    const cctx = cacheCanvas.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawFloor(cctx);
    drawWalls(cctx, room);
    cacheKey = key;
  }
  ctx.drawImage(cacheCanvas, 0, 0);
}

export function drawFloor(ctx) {
  for (let r = 1; r < ROOM_ROWS - 1; r++) {
    for (let c = 1; c < ROOM_COLS - 1; c++) {
      const x = c * TILE;
      const y = r * TILE;

      const tileId = gameState.floorDecor[r] && gameState.floorDecor[r][c];

      // Берем нужную картинку по имени
      const baseImg = tileId ? SPRITES.floorTiles[tileId] : ( (r + c) % 2 === 0 ? SPRITES.floorTiles['floor_1'] : SPRITES.floorTiles['floor_2'] );

      if (baseImg && baseImg.complete) {
        ctx.drawImage(baseImg, x, y, TILE, TILE);
      } else {
        // Фоллбэк, если картинка не загрузилась
        ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }

  // Заливка пустых краев (за пределами комнаты)
  ctx.fillStyle = COLORS.floorB;
  ctx.fillRect(0, 0, WORLD_W, TILE); ctx.fillRect(0, WORLD_H - TILE, WORLD_W, TILE);
  ctx.fillRect(0, 0, TILE, WORLD_H); ctx.fillRect(WORLD_W - TILE, 0, TILE, WORLD_H);
}