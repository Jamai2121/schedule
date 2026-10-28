import { MAP_COLS, MAP_ROWS, SPRITES, gameState, VIEW_ZOOM } from '../core/state.js';
import { getRoomData } from '../map/build.js';

export function drawMinimap(ctx) {
  // UI рисуется в физических пикселях canvas: canvas теперь в VIEW_ZOOM раз
  // крупнее мира, поэтому все размеры умножаем на Z — экранный размер миникарта
  // остаётся прежним. Масштаб 1/1.5 (сетка влезает в рамку) сохранён.
  const Z = VIEW_ZOOM;
  const CW = ctx.canvas.width;
  const scale = (1 / 1.5) * Z;
  const cellSize = 18 * scale;
  const gap = 3 * scale;
  const padding = 5 * scale;
  const viewCols = 5;
  const viewRows = 5;
  const mapW = viewCols * cellSize + (viewCols - 1) * gap + padding * 2;
  const mapH = viewRows * cellSize + (viewRows - 1) * gap + padding * 2;
  // Позиция как у прежней рамки — правый верхний угол
  const x0 = Math.round(CW - mapW - 21 * Z);
  const y0 = Math.round(21 * Z);

  ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
  ctx.fillRect(x0, y0, mapW, mapH);

  const centerCol = Math.floor(viewCols / 2);
  const centerRow = Math.floor(viewRows / 2);
  const offsetX = gameState.currentRoom.x - centerCol;
  const offsetY = gameState.currentRoom.y - centerRow;
  const iconSize = 14 * scale;

  // Один проход: клетка + иконка
  for (let vy = 0; vy < viewRows; vy++) {
    for (let vx = 0; vx < viewCols; vx++) {
      const mapX = offsetX + vx;
      const mapY = offsetY + vy;
      const data = getRoomData(gameState.mapRooms, mapX, mapY);
      if (!data || (!data.seen && !data.visited)) continue;

      const cx = x0 + padding + vx * (cellSize + gap);
      const cy = y0 + padding + vy * (cellSize + gap);
      const isCurrent = (mapX === gameState.currentRoom.x && mapY === gameState.currentRoom.y);

      let color = 'rgba(100, 110, 140, 0.5)';
      if (data.visited) color = 'rgba(150, 170, 200, 0.6)';
      if (isCurrent) color = 'rgba(34, 211, 238, 0.8)';
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, cellSize, cellSize);

      if (isCurrent) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2 * Z;
        ctx.strokeRect(cx, cy, cellSize, cellSize);
      }

      const iconX = cx + (cellSize - iconSize) / 2;
      const iconY = cy + (cellSize - iconSize) / 2;
      if (data.type === 'chest' && !data.cleared && SPRITES.miniChest && SPRITES.miniChest.complete) {
        ctx.drawImage(SPRITES.miniChest, iconX, iconY, iconSize, iconSize);
      } else if (data.type === 'boss' && !data.cleared && SPRITES.miniBoss && SPRITES.miniBoss.complete) {
        ctx.drawImage(SPRITES.miniBoss, iconX, iconY, iconSize, iconSize);
      }
    }
  }

  if (SPRITES.miniFrame && SPRITES.miniFrame.complete) {
    ctx.drawImage(SPRITES.miniFrame, x0, y0, mapW, mapH);
  }
}

export function drawFullMap(ctx) {
  const Z = VIEW_ZOOM;
  const CW = ctx.canvas.width;
  const CH = ctx.canvas.height;
  // Размеры и позиция «окна» карты
  const mapWindowW = (CW * 0.65) / 1.5;
  const mapWindowH = mapWindowW; // квадрат
  const mapX = CW - mapWindowW - 40 * Z;
  const mapY = (CH - mapWindowH) / 2;

  // Фон подложки (полупрозрачный темный, как монитор)
  ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
  ctx.fillRect(mapX, mapY, mapWindowW, mapWindowH);

  // Неоновая рамка вокруг окна
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2 * Z;
  ctx.strokeRect(mapX, mapY, mapWindowW, mapWindowH);

  // Заголовок
  ctx.fillStyle = '#22d3ee';
  ctx.font = `${Math.round(16 * Z)}px "Tiny5", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('КАРТА КОРАБЛЯ', mapX + mapWindowW / 2, mapY + 20 * Z);

  // Сетка карты
  const cellSize = 16 * Z;
  const gap = 4 * Z;
  const gridW = MAP_COLS * cellSize + (MAP_COLS - 1) * gap;
  const gridH = MAP_ROWS * cellSize + (MAP_ROWS - 1) * gap;

  // Центрируем сетку внутри окна
  const startX = mapX + (mapWindowW - gridW) / 2;
  const startY = mapY + (mapWindowH - gridH) / 2 + 10 * Z; // Чуть смещаем вниз от заголовка

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const data = getRoomData(gameState.mapRooms, x, y);
      if (!data) continue;
      const cx = startX + x * (cellSize + gap);
      const cy = startY + y * (cellSize + gap);
      const isCurrent = (x === gameState.currentRoom.x && y === gameState.currentRoom.y);
      if (!data.seen && !data.visited) {
        continue; // Не рисуем неисследованные комнаты
      }
      let color = 'rgba(100, 110, 140, 0.5)';
      if (data.visited) color = 'rgba(150, 170, 200, 0.8)';
      if (isCurrent) color = 'rgba(34, 211, 238, 0.9)';
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, cellSize, cellSize);
      if (isCurrent) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2 * Z;
        ctx.strokeRect(cx, cy, cellSize, cellSize);
      }
      const iconSize = 18 * Z;
      const iconX = cx + (cellSize - iconSize) / 2;
      const iconY = cy + (cellSize - iconSize) / 2;
      if (data.type === 'boss' && !data.cleared && SPRITES.miniBoss && SPRITES.miniBoss.complete) {
        ctx.drawImage(SPRITES.miniBoss, iconX, iconY, iconSize, iconSize);
      } else if (data.type === 'chest' && !data.cleared && SPRITES.miniChest && SPRITES.miniChest.complete) {
        ctx.drawImage(SPRITES.miniChest, iconX, iconY, iconSize, iconSize);
      }
    }
  }
}