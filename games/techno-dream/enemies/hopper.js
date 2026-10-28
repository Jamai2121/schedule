import * as U from '../core/utils.js';
import * as S from '../core/state.js';
import { playSound } from '../core/audio.js';

export function createHopper(x, y) {
    return {
        x, y,
        size: S.HOPPER_SIZE,
        moveSize: S.HOPPER_SIZE,
        hp: S.HOPPER_HP,
        maxHp: S.HOPPER_HP,
        damage: S.HOPPER_DAMAGE,
        flash: 0,
        isBoss: false,
        type: 'hopper',
        state: 'pause',
        stateTimer: 0.6,
        targetX: x,
        targetY: y,
        hopT: 0, // фаза прыжка 0..1 — только для визуальной дуги
    };
}

export function updateHopper(e, dt, player, areDoorsLocked) {
    if (e.flash > 0) e.flash -= dt;
    const moveSize = e.moveSize || e.size;

    if (e.state === 'pause') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
            e.state = 'windup';
            e.stateTimer = S.HOPPER_WINDUP;
        }
    }
    else if (e.state === 'windup') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
            // Запоминаем позицию игрока В МОМЕНТ прыжка — в полёте не следим
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const len = Math.hypot(dx, dy) || 1;
            const dist = Math.min(len, S.HOPPER_LEAP_RANGE);
            e.targetX = e.x + (dx / len) * dist;
            e.targetY = e.y + (dy / len) * dist;
            e.state = 'leap';
            e.stateTimer = S.HOPPER_LEAP_TIME;
            e.hopT = 0;
            playSound('hop');
        }
    }
    else if (e.state === 'leap') {
        e.stateTimer -= dt;
        e.hopT = 1 - Math.max(0, e.stateTimer) / S.HOPPER_LEAP_TIME;
        const step = (S.HOPPER_LEAP_RANGE / S.HOPPER_LEAP_TIME) * dt;
        let dx = e.targetX - e.x;
        let dy = e.targetY - e.y;
        const len = Math.hypot(dx, dy);
        let arrived = false;
        if (len <= step) {
            e.x = e.targetX;
            e.y = e.targetY;
            arrived = true;
        } else {
            dx /= len; dy /= len;
            const newX = e.x + dx * step;
            const newY = e.y + dy * step;
            let blocked = true;
            if (U.canStand(newX, e.y, moveSize, areDoorsLocked)) { e.x = newX; blocked = false; }
            if (U.canStand(e.x, newY, moveSize, areDoorsLocked)) { e.y = newY; blocked = false; }
            if (blocked) arrived = true; // упёрся в стену — приземляемся рано
        }
        if (arrived || e.stateTimer <= 0) {
            e.state = 'pause';
            e.stateTimer = S.HOPPER_PAUSE_MIN +
                Math.random() * (S.HOPPER_PAUSE_MAX - S.HOPPER_PAUSE_MIN);
            e.hopT = 0;
        }
    }
}

export function drawHopper(ctx, e, sprites) {
    // Тень на земле, у «ног» спрайта (чуть ниже прежнего), размер пропорционален новому спрайту
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + S.HOPPER_DRAW_SIZE / 2 - 4, S.HOPPER_DRAW_SIZE / 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const hop = e.state === 'leap' ? Math.sin(Math.PI * e.hopT) * S.HOPPER_HOP_HEIGHT : 0;
    let img = sprites.hopperIdle;
    if (e.state === 'windup') img = sprites.hopperSquash || img;
    if (e.state === 'leap') img = sprites.hopperAir || img;

    const ds = S.HOPPER_DRAW_SIZE * (e.state === 'windup' ? 0.9 : 1);
    const dh = ds * (e.state === 'windup' ? 0.8 : 1);

    ctx.save();
    if (e.flash > 0) {
        ctx.filter = 'brightness(0) invert(1)';
        ctx.globalAlpha = e.flash / S.ENEMY_HIT_FLASH;
    }
    if (img && img.complete) {
        ctx.drawImage(img, e.x - ds / 2, e.y - dh / 2 + S.SPRITE_Y_OFFSET - hop, ds, dh);
    } else {
        ctx.fillStyle = '#a3e635';
        ctx.beginPath();
        ctx.arc(e.x, e.y - hop, S.HOPPER_DRAW_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}