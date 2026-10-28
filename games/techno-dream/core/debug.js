import * as S from './state.js';

// Флаг для отладки (включается/выключается клавишей)
export const debug = {
  showHitboxes: false
};

export function initDebug() {
  document.addEventListener('keydown', (e) => {
    // Левый Alt (e.code === 'AltLeft')
    if (e.code === 'AltLeft') {
      e.preventDefault(); // Чтобы не фокусировалось меню браузера
      debug.showHitboxes = !debug.showHitboxes; // Переключаем состояние
    }
  });
}

export function drawHitboxes(ctx) {
  if (!debug.showHitboxes) return;

  // 1. Хитбокс игрока (Зеленый)
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    S.player.x - S.PLAYER_SIZE / 2,
    S.player.y - S.PLAYER_SIZE / 2,
    S.PLAYER_SIZE,
    S.PLAYER_SIZE
  );
  // Точка центра
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(S.player.x - 1, S.player.y - 1, 2, 2);

  // 2. Хитбоксы врагов (Красный)
  ctx.strokeStyle = '#ff0000';
  for (const e of S.enemies) {
    const hitY = e.y - (e.hitOffset || 0);
    ctx.strokeRect(
      e.x - e.size / 2,
      hitY - e.size / 2,
      e.size,
      e.size
    );
    // Точка центра
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(e.x - 1, e.y - 1, 2, 2);
    
    // Дополнительно: хитбокс для движения (если отличается от обычного)
    if (e.moveSize && e.moveSize !== e.size) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.strokeRect(
        e.x - e.moveSize / 2,
        e.y - e.moveSize / 2,
        e.moveSize,
        e.moveSize
      );
      ctx.strokeStyle = '#ff0000'; // Возвращаем цвет
    }
  }

  // 3. Хитбоксы пуль (Желтый)
  ctx.strokeStyle = '#ffff00';
  for (const b of S.bullets) {
    const size = S.BULLET_SIZE;
    ctx.strokeRect(
      b.x - size / 2,
      b.y - size / 2,
      size,
      size
    );
  }
}