import * as U from '../core/utils.js';
import { ENEMY_SIZE, ENEMY_HP, ENEMY_DAMAGE, ENEMY_DRAW_SIZE, ENEMY_HIT_FLASH, SPRITE_Y_OFFSET, COLORS, PLAYER_SIZE, TILE } from '../core/state.js';

export function createBug(x, y) {
  return {
    x, y,
    size: ENEMY_SIZE,
    moveSize: ENEMY_SIZE,
    hp: ENEMY_HP, 
    maxHp: ENEMY_HP,
    speed: 2 * TILE,
    damage: ENEMY_DAMAGE,
    flash: 0,
    isBoss: false,
    type: 'bug'
  };
}

export function updateBug(e, dt, player, areDoorsLocked) {
  let dx = player.x - e.x;
  let dy = player.y - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  dx /= len;
  dy /= len;

  const step = e.speed * dt;
  const newX = e.x + dx * step;
  const newY = e.y + dy * step;

  const moveSize = e.moveSize || e.size;
  
  // Проверка на столкновение с игроком
  const hitPlayerX = U.checkCollision(newX, e.y, moveSize, player.x, player.y, PLAYER_SIZE);
  const hitPlayerY = U.checkCollision(e.x, newY, moveSize, player.x, player.y, PLAYER_SIZE);

  if (U.canStand(newX, e.y, moveSize, areDoorsLocked) && !hitPlayerX) {
    e.x = newX;
  }

  if (U.canStand(e.x, newY, moveSize, areDoorsLocked) && !hitPlayerY) {
    e.y = newY;
  }

  if (e.flash > 0) e.flash -= dt;
}

export function drawBug(ctx, e, sprites) {
  const img = sprites.bug;
  const hitSize = e.size;
  const drawSize = ENEMY_DRAW_SIZE;
  const offset = drawSize / 2;

  // Тень (опущена на 1 пиксель вниз)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + (hitSize / 3) + 1, hitSize / 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Спрайт (поднят на 1 пиксель вверх)
  if (img && img.complete) {
    ctx.drawImage(img, e.x - offset, e.y - offset + SPRITE_Y_OFFSET - 1, drawSize, drawSize);
  }

  // Вспышка при получении урона
  if (e.flash > 0) {
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    ctx.globalAlpha = e.flash / ENEMY_HIT_FLASH;
    if (img && img.complete) {
      ctx.drawImage(img, e.x - offset, e.y - offset + SPRITE_Y_OFFSET - 1, drawSize, drawSize);
    }
    ctx.restore();
  }
}