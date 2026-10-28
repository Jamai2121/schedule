import { drawItemBase } from './base.js';

export const railgunItem = {
    id: 'railgun',
    name: 'Рельсатрон',
    apply: (player, floatStat, updateStatsUI) => {
        player.stats.damage += 0.5;          // урон +0.5
        player.stats.range = Infinity;       // дальность не ограничена
        player.stats.fireRate *= 2;          // скорострельность -50% => заряд вдвое дольше
        player.weapon.beam = true;           // снаряды заменяются лучом
        player.weapon.charge = true;         // механика заряда атаки
        floatStat('damage', '+0.5 Урон');
        floatStat('firerate', '-50% Темп · заряд');
        floatStat('range', '∞ Дальность');
        updateStatsUI();
    },
    draw: (ctx, item, sprites) => {
        drawItemBase(ctx, item, sprites.itemRailgun, 'rgba(34, 211, 238, 0.5)');
    }
};