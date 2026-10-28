import * as S from '../core/state.js';
import { playSound } from '../core/audio.js';

export function createTurret(x, y) {
    return {
        x, y,
        size: S.TURRET_SIZE,
        moveSize: S.TURRET_SIZE,
        hp: S.TURRET_HP,
        maxHp: S.TURRET_HP,
        damage: S.TURRET_DAMAGE,
        flash: 0,
        isBoss: false,
        type: 'turret',
        state: 'cooldown',
        stateTimer: 1.2, // фора после спавна
        aimDirX: 0,
        aimDirY: 1,
        shotsLeft: 0,
        shotTimer: 0,
    };
}

function fireTurretShot(e) {
    // Диагональный вектор нормализуем, осевой — как раньше
    const len = Math.hypot(e.aimDirX, e.aimDirY) || 1;
    const speed = S.TURRET_BULLET_SPEED;
    S.bullets.push({
        x: e.x + (e.aimDirX / len) * (S.TURRET_SIZE / 2 + 4),
        y: e.y + (e.aimDirY / len) * (S.TURRET_SIZE / 2 + 4),
        vx: (e.aimDirX / len) * speed,
        vy: (e.aimDirY / len) * speed,
        life: Infinity,   // бесконечная дальность: смерть только от стены/попадания
        maxLife: Infinity,
        damage: e.damage,
        hostile: true,
    });
    playSound('turret_shot');
}

export function updateTurret(e, dt, player, areDoorsLocked) {
    if (e.flash > 0) e.flash -= dt;
    e.stateTimer -= dt;

    if (e.state === 'cooldown') {
        if (e.stateTimer <= 0) {
            // Прицел: 8 направлений (4 оси + 4 диагонали)
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);
            if (adx > ady * 2) { e.aimDirX = Math.sign(dx) || 1; e.aimDirY = 0; }
            else if (ady > adx * 2) { e.aimDirX = 0; e.aimDirY = Math.sign(dy) || 1; }
            else { e.aimDirX = Math.sign(dx) || 1; e.aimDirY = Math.sign(dy) || 1; }
            e.state = 'aim';
            e.stateTimer = S.TURRET_AIM_TIME;
        }
    }
    else if (e.state === 'aim') {
        if (e.stateTimer <= 0) {
            // Линии наводки больше нет — телеграфом служит сама пауза прицела
            e.state = 'burst';
            e.shotsLeft = 2;   // заряд из двух пуль
            e.shotTimer = 0;   // первая уходит сразу
        }
    }
    else if (e.state === 'burst') {
        e.shotTimer -= dt;
        if (e.shotTimer <= 0) {
            fireTurretShot(e);
            e.shotsLeft -= 1;
            if (e.shotsLeft > 0) {
                e.shotTimer = S.TURRET_BURST_DELAY;
            } else {
                e.state = 'cooldown';
                e.stateTimer = S.TURRET_COOLDOWN_MIN +
                    Math.random() * (S.TURRET_COOLDOWN_MAX - S.TURRET_COOLDOWN_MIN);
            }
        }
    }
}

export function drawTurret(ctx, e, sprites) {
    // Для диагоналей head-спрайт берём с ближайшей оси (новых спрайтов нет)
    let dirName;
    if (e.aimDirX !== 0 && e.aimDirY !== 0) {
        dirName = Math.abs(e.aimDirX) >= Math.abs(e.aimDirY)
            ? (e.aimDirX < 0 ? 'left' : 'right')
            : (e.aimDirY < 0 ? 'up' : 'down');
    } else {
        dirName = e.aimDirY < 0 ? 'up' : e.aimDirY > 0 ? 'down' : e.aimDirX < 0 ? 'left' : 'right';
    }

    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.size / 3, e.size / 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const baseImg = sprites.turretBase;
    const headImg = sprites.turretHead && sprites.turretHead[dirName];
    const ds = S.ENEMY_DRAW_SIZE;
    const off = ds / 2;

    ctx.save();
    if (e.flash > 0) {
        ctx.filter = 'brightness(0) invert(1)';
        ctx.globalAlpha = e.flash / S.ENEMY_HIT_FLASH;
    }
    if (baseImg && baseImg.complete) {
        ctx.drawImage(baseImg, e.x - off, e.y - off + S.SPRITE_Y_OFFSET, ds, ds);
    } else {
        ctx.fillStyle = '#3b4256';
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    if (headImg && headImg.complete) {
        ctx.drawImage(headImg, e.x - off, e.y - off + S.SPRITE_Y_OFFSET, ds, ds);
    } else {
        // Фоллбэк-дуло: краснеет в прицеле и во время очереди
        ctx.fillStyle = (e.state === 'aim' || e.state === 'burst') ? '#ef4444' : '#8a8fa8';
        ctx.fillRect(e.x - 3 + e.aimDirX * 7, e.y - 3 + e.aimDirY * 7, 6, 6);
    }
    ctx.restore();
}