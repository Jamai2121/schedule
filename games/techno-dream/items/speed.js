import { drawItemBase } from './base.js';

export const speedItem = {
  id: 'speed',
  name: 'Сапоги уборщика',
  apply: (player, floatStat, updateStatsUI) => {
    player.stats.speed += 0.6;
    floatStat('speed', '+0.6 Скорость');
    updateStatsUI();
  },
  draw: (ctx, item, sprites) => {
    drawItemBase(ctx, item, sprites.itemSpeed, 'rgba(34, 211, 238, 0.4)');
  }
};