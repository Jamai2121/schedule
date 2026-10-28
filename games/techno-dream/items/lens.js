import { drawItemBase } from './base.js';

export const lensItem = {
    id: 'lens',
    name: 'Разбитая линза',
    apply: (player, floatStat, updateStatsUI) => {
        // Урон -20%
        player.stats.damage = Math.max(0.1, player.stats.damage * 0.8);
        // Скорострельность +30% => кулдаун между выстрелами короче в 1.3 раза
        player.stats.fireRate = Math.max(0.05, player.stats.fireRate / 1.3);
        // Дальность -10%
        player.stats.range = Math.max(32, player.stats.range * 0.9);
        // Модификатор оружия: +2 боковые траектории (конвейер сам скомбинирует
        // с чем угодно, включая луч)
        player.weapon.spread += 2;
        floatStat('damage', '-20% Урон');
        floatStat('firerate', '+30% Темп');
        floatStat('range', '-10% Дальность');
        updateStatsUI();
    },
    draw: (ctx, item, sprites) => {
        drawItemBase(ctx, item, sprites.itemLens, 'rgba(147, 197, 253, 0.45)');
    }
};