import { drawItemBase } from './base.js';

export const firerateItem = {
  id: 'firerate',
  name: 'Программа: Ускорение',
  apply: (player, floatStat, updateStatsUI) => {
    player.stats.fireRate = Math.max(0.1, player.stats.fireRate - 0.07);
    floatStat('firerate', '+Скорострельность');
    updateStatsUI();
  },
  draw: (ctx, item, sprites) => {
    drawItemBase(ctx, item, sprites.itemFirerate, 'rgba(251, 191, 36, 0.4)');
  }
};