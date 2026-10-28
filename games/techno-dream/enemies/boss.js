import * as U from '../core/utils.js';
import * as S from '../core/state.js';
import { BOSS_SIZE, BOSS_MOVE_SIZE, BOSS_HP, BOSS_SPEED_MULT, BOSS_DRAW_SIZE, ENEMY_HIT_FLASH, COLORS, TILE, PLAYER_SIZE } from '../core/state.js';
import { playSound } from '../core/audio.js';
import { createBug } from './bug.js';

export function createBoss(x, y) {
  return {
    x,
    y: y,
    size: BOSS_SIZE,
    moveSize: BOSS_MOVE_SIZE,
    // Вычисляем смещение: чтобы низы совпали, центр большого должен быть выше
    hitOffset: (BOSS_SIZE - BOSS_MOVE_SIZE) / 2,
    hp: BOSS_HP,
    maxHp: BOSS_HP,
    speed: 2 * TILE * BOSS_SPEED_MULT,
    damage: 2,
    flash: 0,
    isBoss: true,
    type: 'boss',
    // Свойства для рывка
    state: 'chase',
    stateTimer: 0,
    dashCooldown: 2.0,
    dashDirX: 0,
    dashDirY: 0,
    // Призыв подкрепления
    summonCooldown: 4, // первый призыв относительно быстро
  };
}

// ==== ПРИЗЫВ ПОДКРЕПЛЕНИЯ ====
function findSummonSpot(e, areDoorsLocked) {
  const cands = [];
  for (let r = 1; r < S.ROOM_ROWS - 1; r++) {
    for (let c = 1; c < S.ROOM_COLS - 1; c++) {
      if (S.gameState.room[r][c] !== S.TILE_FLOOR) continue;
      const x = c * S.TILE + S.TILE / 2;
      const y = r * S.TILE + S.TILE / 2;
      // Жуки материализуются рядом с боссом, но не вплотную к игроку
      if (Math.hypot(x - e.x, y - e.y) > S.TILE * 3) continue;
      if (Math.hypot(x - S.player.x, y - S.player.y) < S.TILE * 4) continue;
      if (!U.canStand(x, y, S.ENEMY_SIZE, areDoorsLocked)) continue;
      cands.push({ x, y });
    }
  }
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
}

function summonBugs(e, areDoorsLocked) {
  playSound('summon');
  S.effects.push({ x: e.x, y: e.y, t: 0, maxT: 0.4, radius: S.TILE * 1.5, color: '168, 85, 247' });
  const count = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const spot = findSummonSpot(e, areDoorsLocked);
    if (!spot) continue;
    S.enemies.push(createBug(spot.x, spot.y));
    S.effects.push({ x: spot.x, y: spot.y, t: 0, maxT: 0.35, radius: S.TILE * 0.8, color: '168, 85, 247' });
  }
}

export function updateBoss(e, dt, player, areDoorsLocked) {
  if (e.flash > 0) e.flash -= dt;
  const moveSize = e.moveSize || e.size;

  // ==== ЛОГИКА СОСТОЯНИЙ ====
  if (e.state === 'chase') {
    e.dashCooldown -= dt;
    if (e.dashCooldown <= 0) {
      e.state = 'windup';
      e.stateTimer = 0.4; // 0.4 сек подготовки
      return;
    }
    // Проверка на призыв подкрепления (не чаще раза в 5-8 сек, и только
    // если врагов в комнате меньше 6, чтобы не захлестнуть)
    e.summonCooldown -= dt;
    if (e.summonCooldown <= 0 && S.enemies.length < 6) {
      e.state = 'summoning';
      e.stateTimer = 0.5; // телеграф призыва
      return;
    }
    // Обычное преследование
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    dx /= len;
    dy /= len;
    const step = e.speed * dt;
    const newX = e.x + dx * step;
    const newY = e.y + dy * step;
    // Для физики используем e.y (нижний хитбокс)
    const hitPlayerX = U.checkCollision(newX, e.y, moveSize, player.x, player.y, PLAYER_SIZE);
    const hitPlayerY = U.checkCollision(e.x, newY, moveSize, player.x, player.y, PLAYER_SIZE);
    if (U.canStand(newX, e.y, moveSize, areDoorsLocked) && !hitPlayerX) {
      e.x = newX;
    }
    if (U.canStand(e.x, newY, moveSize, areDoorsLocked) && !hitPlayerY) {
      e.y = newY;
    }
  }
  else if (e.state === 'windup') {
    // Стоим на месте и "надуваемся" (телеграф)
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      // Направление рывка фиксируется в момент старта
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      e.dashDirX = dx / len;
      e.dashDirY = dy / len;
      e.state = 'dash';
      e.stateTimer = 0.35; // Длительность рывка
      playSound('boss_dash'); // Звук скрежета при рывке
    }
  }
  else if (e.state === 'summoning') {
    // Стоим и «колдуем»: по окончании материализуются жуки
    e.stateTimer -= dt;
    if (e.stateTimer <= 0) {
      summonBugs(e, areDoorsLocked);
      e.state = 'chase';
      e.summonCooldown = S.BOSS_SUMMON_MIN +
        Math.random() * (S.BOSS_SUMMON_MAX - S.BOSS_SUMMON_MIN);
    }
  }
  else if (e.state === 'dash') {
    // Сам рывок (очень быстрое движение)
    e.stateTimer -= dt;
    const dashSpeed = e.speed * 5; // В 5 раз быстрее обычного
    const step = dashSpeed * dt;
    const newX = e.x + e.dashDirX * step;
    const newY = e.y + e.dashDirY * step;
    const hitPlayerX = U.checkCollision(newX, e.y, moveSize, player.x, player.y, PLAYER_SIZE);
    const hitPlayerY = U.checkCollision(e.x, newY, moveSize, player.x, player.y, PLAYER_SIZE);
    if (U.canStand(newX, e.y, moveSize, areDoorsLocked) && !hitPlayerX) {
      e.x = newX;
    }
    if (U.canStand(e.x, newY, moveSize, areDoorsLocked) && !hitPlayerY) {
      e.y = newY;
    }
    if (e.stateTimer <= 0) {
      // Рывок закончился, уходим на кулдаун
      e.state = 'chase';
      e.dashCooldown = 2.5; // Отдых после рывка
    }
  }
}

export function drawBoss(ctx, e, sprites) {
  const img = sprites.boss;
  const hitSize = e.size;
  const drawSize = BOSS_DRAW_SIZE;

  // Тень (привязываем к нижнему хитбоксу)
  const shadowY = e.y + (hitSize / 3) + 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(e.x, shadowY, hitSize / 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Если босс готовится к рывку или призывает — делаем его красноватым/фиолетовым
  const isWindingUp = e.state === 'windup';
  const scale = isWindingUp ? 1.15 : 1;
  const currentDrawSize = drawSize * scale;
  const currentOffset = currentDrawSize / 2;

  // Вычисляем центр большого хитбокса
  const hitCenterY = e.y - e.hitOffset;
  // Вычисляем низ большого хитбокса
  const hitBottomY = hitCenterY + e.size / 2;
  // Позиция спрайта: низ спрайта (с учетом прозрачных пикселей) должен совпадать с низом хитбокса
  const spriteY = hitBottomY - currentDrawSize;

  if (img && img.complete) {
    if (isWindingUp || e.state === 'summoning') {
      ctx.save();
      // Рывок — красноватый оттенок, призыв — фиолетовый
      ctx.filter = e.state === 'summoning'
        ? 'brightness(1.4) sepia(1) hue-rotate(220deg) saturate(4)'
        : 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)';
      ctx.drawImage(img, e.x - currentOffset, spriteY, currentDrawSize, currentDrawSize);
      ctx.restore();
    } else {
      ctx.drawImage(img, e.x - currentOffset, spriteY, currentDrawSize, currentDrawSize);
    }
  }

  if (e.flash > 0) {
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    ctx.globalAlpha = e.flash / ENEMY_HIT_FLASH;
    if (img && img.complete) {
      ctx.drawImage(img, e.x - currentOffset, spriteY, currentDrawSize, currentDrawSize);
    }
    ctx.restore();
  }

  // Полоска здоровья босса
  const hpW = drawSize;
  const hpH = 4;
  const hpX = e.x - hpW / 2;
  const hpY = spriteY - 10;
  ctx.fillStyle = COLORS.hpEmpty;
  ctx.fillRect(hpX, hpY, hpW, hpH);
  ctx.fillStyle = COLORS.hpFull;
  ctx.fillRect(hpX, hpY, Math.max(0, (e.hp / e.maxHp) * hpW), hpH);
}