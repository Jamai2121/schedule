import { TILE, ROOM_COLS, ROOM_ROWS, TILE_WALL, TILE_FLOOR, SPRITES, COLORS } from '../core/state.js';

export function drawWalls(ctx, room) {
  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      if (room[r][c] !== TILE_WALL) continue;
      
      const x = c * TILE;
      const y = r * TILE;

      // Определяем, является ли тайл углом
      const isTop = r === 0;
      const isBottom = r === ROOM_ROWS - 1;
      const isLeft = c === 0;
      const isRight = c === ROOM_COLS - 1;

      let img = SPRITES.wallBlock;
      let angle = 0;

      // Углы
      if ((isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight)) {
        img = SPRITES.wallCorner;
        if (isTop && isLeft) angle = 0; // Верхний левый
        if (isTop && isRight) angle = Math.PI / 2; // Верхний правый
        if (isBottom && isRight) angle = Math.PI; // Нижний правый
        if (isBottom && isLeft) angle = -Math.PI / 2; // Нижний левый
      } 
      // Блоки
      else if (isTop) angle = 0;
      else if (isBottom) angle = Math.PI;
      else if (isLeft) angle = -Math.PI / 2;
      else if (isRight) angle = Math.PI / 2;

      if (img && img.complete) {
        ctx.save();
        // Смещаем начало координат в центр тайла для вращения
        ctx.translate(x + TILE / 2, y + TILE / 2);
        ctx.rotate(angle);
        ctx.drawImage(img, -TILE / 2, -TILE / 2, TILE, TILE);
        ctx.restore();
      } else {
        // Фоллбэк, если спрайт не загрузился
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}