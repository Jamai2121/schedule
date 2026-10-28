import { damageItem } from './damage.js';
import { speedItem } from './speed.js';
import { firerateItem } from './firerate.js';
import { hpItem } from './hp.js';
import { rangeItem } from './range.js';
import { lensItem } from './lens.js';
import { railgunItem } from './railgun.js';
import { playSound } from '../core/audio.js';
export const itemRegistry = {
damage: damageItem,
speed: speedItem,
firerate: firerateItem,
hp: hpItem,
range: rangeItem,
lens: lensItem,
railgun: railgunItem
};

export const itemTypes = Object.keys(itemRegistry);

export function showItemToast(text) {
  const toast = document.createElement('div');
  toast.className = 'item-pickup-toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function updateAllItems(items, player, handlers) {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.bobbing += 0.05;
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist < 32) {
      const handler = itemRegistry[item.type];
      if (handler) {
        handler.apply(player, handlers.floatStat, handlers.updateStatsUI, handlers.rebuildHpHUD, handlers.updateHpHUD);
        showItemToast(handler.name);
        playSound('pickup');
      }
      items.splice(i, 1);
      handlers.onPickup();
    }
  }
}

export function drawAllItems(ctx, items, sprites) {
  items.forEach(item => {
    const handler = itemRegistry[item.type];
    if (handler && handler.draw) {
      handler.draw(ctx, item, sprites);
    }
  });
}