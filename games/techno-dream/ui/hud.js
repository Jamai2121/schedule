import { PLAYER_START_MAX_HP, HP_PER_CONTAINER, PLAYER_HP_CAP, player } from '../core/state.js';

export function updateStatsUI() {
    const damageEl = document.getElementById('stat-damage-value');
    if (damageEl) damageEl.textContent = player.stats.damage.toFixed(1);
    
    const speedEl = document.getElementById('stat-speed-value');
    if (speedEl) speedEl.textContent = player.stats.speed.toFixed(1);
    
    const firerateEl = document.getElementById('stat-firerate-value');
    if (firerateEl) firerateEl.textContent = player.stats.fireRate.toFixed(2);
    
    const rangeEl = document.getElementById('stat-range-value');
    if (rangeEl) rangeEl.textContent = player.stats.range === Infinity ? '∞' : (player.stats.range / 10).toFixed(1);
}

export function floatStat(statName, text) {
    const icons = { damage: 'stat-damage', speed: 'stat-speed', firerate: 'stat-firerate', range: 'stat-range' };
    const el = document.getElementById(icons[statName]);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const float = document.createElement('div');
    float.className = 'stat-float';
    float.textContent = text;
    float.style.left = (rect.right + 70) + 'px';
    float.style.top = rect.top + 'px';
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1200);
}

export function rebuildHpHUD() {
    const wrap = document.getElementById('hud-hp');
    if (!wrap) return;
    const totalContainers = player.maxHp / HP_PER_CONTAINER;
    wrap.innerHTML = '';
    for (let i = 0; i < totalContainers; i++) {
        const img = document.createElement('img');
        img.className = 'hp-icon';
        img.alt = 'HP';
        img.src = './sprites/hp_nool.png';
        wrap.appendChild(img);
    }
}

export function updateHpHUD() {
    const icons = document.querySelectorAll('#hud-hp .hp-icon');
    const hp = player.hp;
    icons.forEach((img, i) => {
        const slotHp = Math.max(0, Math.min(HP_PER_CONTAINER, hp - i * HP_PER_CONTAINER));
        let src;
        if (slotHp >= 2) src = './sprites/hp_full.png';
        else if (slotHp === 1) src = './sprites/hp_pol.png';
        else src = './sprites/hp_nool.png';
        const wasDifferent = !img.src.endsWith(src.split('/').pop());
        img.src = src;
        if (wasDifferent) {
            img.classList.remove('hit');
            void img.offsetWidth;
            img.classList.add('hit');
        }
    });
}