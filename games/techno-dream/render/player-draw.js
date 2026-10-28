import { SPRITES, player, SPRITE_Y_OFFSET, HIT_FLASH_TIME, gameState } from '../core/state.js';

export function drawPlayer(ctx) {
  // Тень
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.invuln > 0 && !player.visible) return;

  let scale = 1, alpha = 1;
  if (gameState.transition.phase === 'suck') {
    scale = 1 - player.suckProgress * 0.85;
    alpha = 1 - player.suckProgress * 0.5;
  }

  const drawSize = 32 * scale;

  // ==== ОПРЕДЕЛЯЕМ СПРАЙТЫ ====
  const facingNames = ['down', 'up', 'left', 'right'];
  const dirName = facingNames[player.facing];
  
  const isWalking = Math.hypot(player.vel.x, player.vel.y) > 20;
  // Тело считается "в движении", если мы реально двигаемся или только что остановились (инерция)
  const bodyIsMoving = isWalking || player.idleTimer < 0.15;

  // 1. Тело
  let bodyImg = SPRITES.bodyIdle || SPRITES.droid; 
  
  if (bodyIsMoving) {
    const frame = Math.floor(player.animTime) % 4;
    const frameMap = [1, 2, 1, 3];
    const actualFrame = frameMap[frame];
    const walkSprite = SPRITES[`bodyWalk${actualFrame}_${dirName}`];
    if (walkSprite && walkSprite.complete) bodyImg = walkSprite;
  }
  // Если bodyIsMoving === false, bodyImg остается bodyIdle (смотрит вниз).

  // 2. Голова
  let headImg = SPRITES.headIdle || SPRITES.droid; 
  let isShootingUpOrSide = false;
  
  if (player.isShooting) {
    // Если стреляем — смотрим на выстрел
    if (player.headAngle > -Math.PI/4 && player.headAngle <= Math.PI/4) {
      headImg = SPRITES.headRight;
      isShootingUpOrSide = true;
    } else if (player.headAngle > Math.PI/4 && player.headAngle <= 3*Math.PI/4) {
      headImg = SPRITES.headDown;
      isShootingUpOrSide = false;
    } else if (player.headAngle > -3*Math.PI/4 && player.headAngle <= -Math.PI/4) {
      headImg = SPRITES.headUp;
      isShootingUpOrSide = true;
    } else {
      headImg = SPRITES.headLeft;
      isShootingUpOrSide = true;
    }
  } else if (bodyIsMoving) {
    // Если не стреляем, но двигаемся — смотрим по направлению движения
    if (dirName === 'down') headImg = SPRITES.headDown;
    if (dirName === 'up') { headImg = SPRITES.headUp; isShootingUpOrSide = true; }
    if (dirName === 'left') { headImg = SPRITES.headLeft; isShootingUpOrSide = true; }
    if (dirName === 'right') { headImg = SPRITES.headRight; isShootingUpOrSide = true; }
  } else {
    // Если просто стоим — смотрим вниз (idle)
    headImg = SPRITES.headDown;
  }
  
  if (!headImg || !headImg.complete) headImg = SPRITES.droid;

  // ==== ОТРИСОВКА ====
  ctx.save();
  ctx.globalAlpha = alpha;

  const recoilX = -Math.cos(player.headAngle) * (player.headRecoil * 5);
  const recoilY = -Math.sin(player.headAngle) * (player.headRecoil * 5);
  const headX = player.x + recoilX;
  const headY = player.y + recoilY;

  // Если стреляем вверх/вбок, голова должна быть ПОД телом (позади)
  if (isShootingUpOrSide) {
    if (headImg && headImg.complete) {
      ctx.drawImage(headImg, headX - drawSize / 2, headY - drawSize / 2 + SPRITE_Y_OFFSET, drawSize, drawSize);
    }
    if (bodyImg && bodyImg.complete) {
      ctx.drawImage(bodyImg, player.x - drawSize / 2, player.y - drawSize / 2 + SPRITE_Y_OFFSET, drawSize, drawSize);
    }
  } else {
    // Иначе — тело под головой
    if (bodyImg && bodyImg.complete) {
      ctx.drawImage(bodyImg, player.x - drawSize / 2, player.y - drawSize / 2 + SPRITE_Y_OFFSET, drawSize, drawSize);
    }
    if (headImg && headImg.complete) {
      ctx.drawImage(headImg, headX - drawSize / 2, headY - drawSize / 2 + SPRITE_Y_OFFSET, drawSize, drawSize);
    }
  }

  // Вспышка
  if (player.hitFlash > 0) {
    ctx.filter = 'brightness(0) invert(1)';
    ctx.globalAlpha = alpha * (player.hitFlash / HIT_FLASH_TIME);
    if (bodyImg && bodyImg.complete) {
      ctx.drawImage(bodyImg, player.x - drawSize / 2, player.y - drawSize / 2 + SPRITE_Y_OFFSET, drawSize, drawSize);
    }
  }

  ctx.restore();
}