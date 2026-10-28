import { drawItemBase } from './base.js';

export const damageItem = {
  id: 'damage',
  name: 'Стабильная сингулярность',
  apply: (player, floatStat, updateStatsUI) => {
    player.stats.damage += 0.5;
    floatStat('damage', '+0.5 Урон');
    updateStatsUI();
  },
  draw: (ctx, item, sprites) => {
    drawItemBase(ctx, item, sprites.itemDamage, 'rgba(239, 68, 68, 0.4)');
  }
};