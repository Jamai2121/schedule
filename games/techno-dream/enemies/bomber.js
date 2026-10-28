import * as U from '../core/utils.js';
import * as S from '../core/state.js';
import { playSound } from '../core/audio.js';

export function createBomber(x, y) {
    return {
        x, y,
        size: S.BOMBER_SIZE,
        moveSize: S.BOMBER_SIZE,
        hp: S.BOMBER_HP,
        maxHp: S.BOMBER_HP,
        damage: S.BOMBER_DAMAGE,
        flash: 0,
        isBoss: false,
        type: 'bomber',
        state: 'wander',
        wanderX: 0,
        wanderY: 0,
        wanderTimer: 0,
        fuse: 0,
        beepTimer: 0,
        animTime: 0,
        dead: false,
    };
}

function moveAlong(e, dx, dy, speed, dt, areDoorsLocked) {
    const moveSize = e.moveSize || e.size;
    const step = speed * dt;
    const newX = e.x + dx * step;
    const newY = e.y + dy * step;
    let moved = false;
    if (U.canStand(newX, e.y, moveSize, areDoorsLocked)) { e.x = newX; moved = true; }
    if (U.canStand(e.x, newY, moveSize, areDoorsLocked)) { e.y = newY; moved = true; }
    return moved;
}

export function updateBomber(e, dt, player, areDoorsLocked) {
    if (e.flash > 0) e.flash -= dt;
    e.animTime += dt * (e.state === 'armed' ? 8 : 4);

    if (e.state === 'wander') {
        // Свободно гуляет, пока его не тронули
        e.wanderTimer -= dt;
        if (e.wanderTimer <= 0) {
            const a = Math.random() * Math.PI * 2;
            e.wanderX = Math.cos(a);
            e.wanderY = Math.sin(a);
            e.wanderTimer = 1 + Math.random();
        }
        const moved = moveAlong(e, e.wanderX, e.wanderY, S.BOMBER_WANDER_SPEED, dt, areDoorsLocked);
        if (!moved) e.wanderTimer = 0; // упёрся — новое направление
    }
    else if (e.state === 'armed') {
        e.fuse -= dt;
        e.beepTimer -= dt;
        if (e.beepTimer <= 0) {
            playSound('fuse');
            e.beepTimer = Math.max(0.12, e.fuse * 0.25); // бипы учащаются к концу
        }
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        moveAlong(e, dx / len, dy / len, S.BOMBER_CHASE_SPEED, dt, areDoorsLocked);
        const touched = U.checkCollision(e.x, e.y, e.moveSize, player.x, player.y, S.PLAYER_SIZE);
        if (e.fuse <= 0 || touched) explode(e, player);
    }
}

function explode(e, player) {
    if (e.dead) return;
    e.dead = true;
    playSound('explosion');
    S.effects.push({
        x: e.x, y: e.y, t: 0, maxT: 0.35,
        radius: S.BOMBER_BLAST_RADIUS, color: '251, 146, 60',
    });
    // Игрок — только если в радиусе и не в неуязвимости
    const pd = Math.hypot(player.x - e.x, player.y - e.y);
    if (pd <= S.BOMBER_BLAST_RADIUS + S.PLAYER_SIZE / 2 && player.invuln <= 0 && S.onPlayerDamaged) {
        S.onPlayerDamaged(e.damage);
    }
    // Цепной урон по врагам: бомберы от цепи ГИБНУТ, а не взрываются
    for (const other of S.enemies) {
        if (other === e || other.dead) continue;
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        if (d <= S.BOMBER_BLAST_RADIUS + other.size / 2) {
            other.hp -= S.BOMBER_BLAST_DAMAGE_ENEMIES;
            other.flash = S.ENEMY_HIT_FLASH;
            if (other.hp <= 0) {
                other.dead = true;
                playSound('enemy_die');
            }
        }
    }
}

// Хук реестра: первый же урон будит бомбера
export function onBomberHit(e) {
    if (e.state === 'wander' && !e.dead) {
        e.state = 'armed';
        e.fuse = S.BOMBER_FUSE;
        e.beepTimer = 0;
        playSound('fuse');
    }
}

export function drawBomber(ctx, e, sprites) {
    const armed = e.state === 'armed';
    const frames = armed ? sprites.bomberRun : sprites.bomberWalk;
    const img = frames && frames.length ? frames[Math.floor(e.animTime) % frames.length] : null;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.size / 3, e.size / 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const off = S.ENEMY_DRAW_SIZE / 2;
    const blink = armed && Math.floor(e.fuse * 8) % 2 === 0;
    ctx.save();
    if (blink) ctx.filter = 'brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(4)';
    if (e.flash > 0) {
        ctx.filter = 'brightness(0) invert(1)';
        ctx.globalAlpha = e.flash / S.ENEMY_HIT_FLASH;
    }
    if (img && img.complete) {
        ctx.drawImage(img, e.x - off, e.y - off + S.SPRITE_Y_OFFSET, S.ENEMY_DRAW_SIZE, S.ENEMY_DRAW_SIZE);
    } else {
        ctx.fillStyle = armed ? '#ef4444' : '#fb923c';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}