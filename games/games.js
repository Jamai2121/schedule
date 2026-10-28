// ==== РЕЕСТР ИГР ====
window.GAMES = {};

function registerGame(id, config) {
  window.GAMES[id] = config;
  renderCards();
}

// ==== LOCAL STORAGE ====
const STORAGE_KEY = 'games-best-v1';

function getBestAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function getBest(id) {
  return getBestAll()[id] || null;
}

function setBest(id, value) {
  const all = getBestAll();
  const current = all[id];
  if (!current || value > current.value) {
    all[id] = { value, date: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  }
  return false;
}

function formatBest(id) {
  const best = getBest(id);
  if (!best) return null;
  const game = window.GAMES[id];
  if (game && typeof game.formatBest === 'function') {
    return game.formatBest(best.value);
  }
  return String(best.value);
}

// ==== ТЕМА ====
(function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  btn.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    btn.textContent = isDark ? '☀️' : '🌙';
  }
})();

// ==== КАРТОЧКИ ИГР ====
function renderCards() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const ids = Object.keys(window.GAMES);
  if (ids.length === 0) {
    grid.innerHTML = '<div class="game-soon">Игры загружаются…</div>';
    return;
  }

  ids.forEach(id => {
    const game = window.GAMES[id];
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.game = id;

    const best = formatBest(id);
    const bestBlock = game.external
      ? ''
      : `<div class="game-card-best">${best ? `Рекорд: <strong>${best}</strong>` : 'Рекорда пока нет'}</div>`;

    card.innerHTML = `
      <div class="game-card-emoji">${game.emoji || '🎮'}</div>
      <div class="game-card-title">${game.name || id}</div>
      <div class="game-card-desc">${game.desc || ''}</div>
      ${bestBlock}
    `;

    card.addEventListener('click', () => openGame(id));
    grid.appendChild(card);
  });
}

// ==== МОДАЛКА ИГРЫ ====
let currentGameId = null;

function openGame(id) {
  const game = window.GAMES[id];
  if (!game) return;

  // Внешняя игра — открываем отдельной страницей
  if (game.external) {
    window.location.href = game.url;
    return;
  }

  currentGameId = id;
  document.getElementById('game-title').textContent = game.name || id;

  const best = formatBest(id);
  document.getElementById('game-best').innerHTML = best
    ? `Лучший результат: <strong>${best}</strong>`
    : 'Рекорда пока нет — сыграй и установи!';

  const stage = document.getElementById('game-stage');
  stage.innerHTML = '';

  const onScore = (score) => {
    const isNew = setBest(id, score);
    if (isNew) {
      const newBest = formatBest(id);
      document.getElementById('game-best').innerHTML = `Лучший результат: <strong>${newBest}</strong> 🎉`;
      renderCards();
    }
  };

  game.mount(stage, onScore);
  document.getElementById('game-modal').classList.remove('hidden');
}

function closeGame() {
  if (currentGameId && window.GAMES[currentGameId]) {
    const g = window.GAMES[currentGameId];
    if (typeof g.unmount === 'function') g.unmount();
  }
  currentGameId = null;
  document.getElementById('game-modal').classList.add('hidden');
  renderCards();
}

// ==== ЗАКРЫТИЕ МОДАЛОК ====
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.close === 'game-modal') closeGame();
  });
});

document.getElementById('game-modal').addEventListener('click', e => {
  if (e.target.id === 'game-modal') closeGame();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeGame();
});

// ==== СТАРТ ====
window.addEventListener('load', () => {
  renderCards();

  // Регистрация внешней игры Techno_Dream
  registerGame('techno-dream', {
    name: 'Techno_Dream',
    emoji: '🚀',
    desc: 'Рогалик. Дроид-уборщик чистит ошибки системы на бесконечном корабле.',
    external: true,
    url: './techno-dream/',
  });
});
