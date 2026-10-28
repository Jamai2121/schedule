import * as U from '../core/utils.js';
import { createBug, updateBug, drawBug } from './bug.js';
import { createBoss, updateBoss, drawBoss } from './boss.js';
import { createTurret, updateTurret, drawTurret } from './turret.js';
import { createHopper, updateHopper, drawHopper } from './hopper.js';
import { createBomber, updateBomber, drawBomber, onBomberHit } from './bomber.js';

const registry = {
    bug:    { create: createBug,    update: updateBug,    draw: drawBug },
    boss:   { create: createBoss,   update: updateBoss,   draw: drawBoss },
    turret: { create: createTurret, update: updateTurret, draw: drawTurret },
    hopper: { create: createHopper, update: updateHopper, draw: drawHopper },
    bomber: { create: createBomber, update: updateBomber, draw: drawBomber, onHit: onBomberHit },
};

// Фабрика через реестр: спавн идёт так же, как update/draw
export function createEnemy(type, x, y) {
    const handler = registry[type];
    if (handler && handler.create) return handler.create(x, y);
    return null;
}

// Хук получения урона (будит бомбера и т.п.) — вызывается оркестратором
export function notifyEnemyHit(e) {
    const handler = registry[e.type];
    if (handler && handler.onHit) handler.onHit(e);
}

export function updateAllEnemies(enemies, dt, player, areDoorsLocked) {
    enemies.forEach(e => {
        const handler = registry[e.type];
        if (handler && handler.update) {
            handler.update(e, dt, player, areDoorsLocked);
        }
    });
}

export function drawAllEnemies(ctx, enemies, sprites) {
    enemies.forEach(e => {
        const handler = registry[e.type];
        if (handler && handler.draw) {
            handler.draw(ctx, e, sprites);
        }
    });
}

// ==== РАЗДЕЛЕНИЕ ВРАГОВ ====
// Попарно расталкиваем пересекшиеся физические тела (moveSize), чтобы враги
// не входили друг в друга. Турель неподвижна: она служит «якорем»,
// сдвигается только второй участник пары.
export function separateEnemies(enemies, areDoorsLocked) {
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const a = enemies[i];
            const b = enemies[j];
            if (a.dead || b.dead) continue;
            const sa = a.moveSize || a.size;
            const sb = b.moveSize || b.size;
            const minDist = (sa + sb) / 2;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            if (dist >= minDist) continue;
            // Центры совпали почти точно — выбираем произвольное направление
            if (dist < 0.01) { dx = 1; dy = 0; dist = 1; }
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const aFixed = a.type === 'turret';
            const bFixed = b.type === 'turret';
            if (aFixed && bFixed) continue;
            let wa = 0.5, wb = 0.5;
            if (aFixed) { wa = 0; wb = 1; }
            else if (bFixed) { wa = 1; wb = 0; }

            if (wa > 0) {
                const pushX = -nx * overlap * wa;
                const pushY = -ny * overlap * wa;
                const tryX = a.x + pushX;
                const tryY = a.y + pushY;
                if (U.canStand(tryX, a.y, sa, areDoorsLocked)) a.x = tryX;
                if (U.canStand(a.x, tryY, sa, areDoorsLocked)) a.y = tryY;
            }
            if (wb > 0) {
                const pushX = nx * overlap * wb;
                const pushY = ny * overlap * wb;
                const tryX = b.x + pushX;
                const tryY = b.y + pushY;
                if (U.canStand(tryX, b.y, sb, areDoorsLocked)) b.x = tryX;
                if (U.canStand(b.x, tryY, sb, areDoorsLocked)) b.y = tryY;
            }
        }
    }
}