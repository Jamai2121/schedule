import { drawItemBase } from './base.js';
import { PLAYER_HP_CAP, HP_PER_CONTAINER } from '../core/state.js';

export const hpItem = {
  id: 'hp',
  name: 'Дополнительный контейнер',
  apply: (player, floatStat, updateStatsUI, rebuildHpHUD, updateHpHUD) => {
    if (player.maxHp < PLAYER_HP_CAP) {
      player.maxHp = Math.min(PLAYER_HP_CAP, player.maxHp + HP_PER_CONTAINER);
      player.hp = Math.min(player.maxHp, player.hp + HP_PER_CONTAINER);
      rebuildHpHUD();
    } else {
      player.hp = Math.min(player.maxHp, player.hp + HP_PER_CONTAINER);
    }
    updateHpHUD();
  },
  draw: (ctx, item, sprites) => {
    drawItemBase(ctx, item, sprites.itemHp, 'rgba(239, 68, 68, 0.4)');
  }
};