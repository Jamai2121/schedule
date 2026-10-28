import { drawItemBase } from './base.js';

export const rangeItem = {
  id: 'range',
  name: 'Уплотняющий энергозапас',
  apply: (player, floatStat, updateStatsUI) => {
    player.stats.range += 100;
    floatStat('range', '+Дальность');
    updateStatsUI();
  },
  draw: (ctx, item, sprites) => {
    drawItemBase(ctx, item, sprites.itemRange, 'rgba(168, 85, 247, 0.4)');
  }
};