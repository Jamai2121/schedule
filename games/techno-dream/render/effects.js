import { effects } from '../core/state.js';

export function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const f = effects[i];
        f.t += dt;
        if (f.t >= f.maxT) effects.splice(i, 1);
    }
}

export function drawEffects(ctx) {
    for (const f of effects) {
        const p = f.t / f.maxT;
        // ==== НЕОНОВЫЙ ЛУЧ РЕЛЬСАТРОНА ====
        if (f.type === 'beam') {
            const alpha = 1 - p;
            const flick = 0.85 + Math.sin(f.t * 80) * 0.15; // лёгкое мерцание плазмы
            ctx.save();
            ctx.lineCap = 'round';
            // Внешнее свечение: суммарная ширина сопоставима с диаметром пули (16 px)
            ctx.strokeStyle = `rgba(${f.color}, ${0.25 * alpha})`;
            ctx.lineWidth = 16;
            ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
            // Тело луча
            ctx.strokeStyle = `rgba(${f.color}, ${0.8 * alpha * flick})`;
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
            // Белое ядро
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * flick})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
            ctx.restore();
            continue;
        }
        // ==== Кольцевые эффекты (взрывы, призыв, вспышки) ====
        const r = f.radius * (0.3 + 0.7 * p);
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(${f.color}, ${alpha})`;
        ctx.lineWidth = 3 * (1 - p) + 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${f.color}, ${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
}