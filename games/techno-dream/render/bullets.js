import { SPRITES, bullets, BULLET_SIZE, BULLET_GLOW, ENEMY_BULLET_GLOW, BULLET_POP_TIME } from '../core/state.js';

function drawBullet(ctx, b) {
    // Никакого плавного затухания: пуля видна полностью весь полёт.
    // В конце дальности — код-анимация: короткий рост, затем резкое схлопывание.
    let scale = 1;
    if (b.popping) {
        const p = Math.min(1, b.popT / BULLET_POP_TIME);
        if (p < 0.45) {
            // Фаза 1: немного увеличиваемся (вспух)
            scale = 1 + (p / 0.45) * 0.35;
        } else {
            // Фаза 2: резко схлопываемся в точку
            const q = (p - 0.45) / 0.55;
            scale = 1.35 * (1 - q);
        }
        if (scale < 0) scale = 0;
    }
    const size = BULLET_SIZE * scale;
    const glow = b.hostile ? ENEMY_BULLET_GLOW : BULLET_GLOW;
    const glowR = size * 1.1;
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
    grad.addColorStop(0, `rgba(${glow}, ${0.55 * scale})`);
    grad.addColorStop(0.6, `rgba(${glow}, ${0.2 * scale})`);
    grad.addColorStop(1, `rgba(${glow}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    if (SPRITES.bullet && SPRITES.bullet.complete && size > 0.5) {
        ctx.save();
        if (b.hostile) ctx.filter = 'hue-rotate(160deg) saturate(3) brightness(1.2)';
        ctx.drawImage(SPRITES.bullet, b.x - size / 2, b.y - size / 2, size, size);
        ctx.restore();
    }
}

export function drawBulletsBeforePlayer(ctx) {
    bullets.forEach(b => {
        if (b.vy <= 0) drawBullet(ctx, b); // Летят вверх/вбок
    });
}

export function drawBulletsAfterPlayer(ctx) {
    bullets.forEach(b => {
        if (b.vy > 0) drawBullet(ctx, b); // Летят вниз
    });
}