// ==== НАСТРОЙКИ ====
const DAY_NAMES = {
  sunday: 'Воскресенье',
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота'
};
const JS_DAY_TO_KEY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const START_OF_SEMESTER = { month: 8, day: 1 }; // 8 = сентябрь

// ==== СОСТОЯНИЕ ====
let DATA = {
  schedule: null,
  homework: {},
  books: {},
  info: { items: [] },
  overrides: {},
};
let currentWeekOffset = 0;

// ==== ЗАГРУЗКА ====
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path}`);
  return res.json();
}

async function loadAll() {
  const [schedule, homework, books, info, overrides] = await Promise.all([
    loadJSON('./data/schedule.json'),
    loadJSON('./data/homework.json').catch(() => ({})),
    loadJSON('./data/books.json').catch(() => ({})),
    loadJSON('./data/info.json').catch(() => ({ items: [] })),
    loadJSON('./data/overrides.json').catch(() => ({})),
  ]);
  DATA = { schedule, homework, books, info, overrides };
}

// ==== НЕДЕЛИ ====
function getWeekNumber(offset = 0) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(now.getFullYear(), START_OF_SEMESTER.month, START_OF_SEMESTER.day);
  start.setHours(0, 0, 0, 0);
  if (now < start) start.setFullYear(start.getFullYear() - 1);

  const base = Math.floor((now - start) / (7 * 86400000)) + 1;
  return base + offset;
}

function getParity(weekNumber) {
  return weekNumber % 2 === 1 ? 'odd' : 'even';
}

// ==== OVERRIDES ====
function applyOverrides(weekNumber, pairs) {
  const list = DATA.overrides[String(weekNumber)] || [];
  const cancelIds = new Set();
  const notes = {};
  list.forEach(o => {
    if (o.action === 'cancel') cancelIds.add(o.id);
    if (o.action === 'note') notes[o.id] = o.note;
  });
  return pairs
    .filter(p => !cancelIds.has(p.id))
    .map(p => ({ ...p, note: notes[p.id] || null }));
}

// ==== РЕНДЕР ====
function renderHeader(weekNumber) {
  const parity = getParity(weekNumber);
  const el = document.getElementById('week-info');
  const parityText = parity === 'even' ? 'чётная' : 'нечётная';
  el.innerHTML = `Неделя №${weekNumber}<span class="parity ${parity}">· ${parityText}</span>`;
}

function renderSchedule(weekNumber) {
  const parity = getParity(weekNumber);
  const container = document.getElementById('schedule');
  container.innerHTML = '';

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const isCurrentWeek = currentWeekOffset === 0;
  const hw = DATA.homework[String(weekNumber)] || {};

  DAY_ORDER.forEach(dayKey => {
    const basePairs = (DATA.schedule[parity] && DATA.schedule[parity][dayKey]) || [];
    const pairs = applyOverrides(weekNumber, basePairs);

    const dayEl = document.createElement('div');
    dayEl.className = 'day' + (isCurrentWeek && dayKey === todayKey ? ' today' : '');

    const title = document.createElement('div');
    title.className = 'day-title';
    title.textContent = DAY_NAMES[dayKey];
    dayEl.appendChild(title);

    if (pairs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Пар нет';
      dayEl.appendChild(empty);
    } else {
      pairs.forEach(pair => {
        dayEl.appendChild(renderPair(pair, hw[pair.id] || ''));
      });
    }

    container.appendChild(dayEl);
  });
}

function renderPair(pair, homework) {
  const el = document.createElement('div');
  el.className = 'pair';

  const time = document.createElement('div');
  time.className = 'pair-time';
  time.textContent = pair.time || '';
  el.appendChild(time);

  const info = document.createElement('div');
  info.className = 'pair-info';

  const subject = document.createElement('div');
  subject.className = 'pair-subject';
  subject.textContent = pair.subject || 'Без названия';

  if (pair.subgroup === 1 || pair.subgroup === 2) {
    const sg = document.createElement('span');
    sg.className = 'pair-subgroup';
    sg.textContent = `Подгруппа ${pair.subgroup}`;
    subject.appendChild(sg);
  }
  if (pair.note) {
    const note = document.createElement('span');
    note.className = 'pair-note';
    note.textContent = pair.note;
    subject.appendChild(note);
  }
  info.appendChild(subject);

  if (pair.teacher) {
    const t = document.createElement('div');
    t.className = 'pair-teacher';
    t.textContent = pair.teacher;
    info.appendChild(t);
  }
  if (pair.room) {
    const r = document.createElement('div');
    r.className = 'pair-room';
    r.textContent = 'ауд. ' + pair.room;
    info.appendChild(r);
  }

  el.appendChild(info);
  el.addEventListener('click', () => openPairModal(pair, homework));
  return el;
}

// ==== МОДАЛКА ПАРЫ ====
function openPairModal(pair, homework) {
  document.getElementById('modal-title').textContent = pair.subject || 'Пара';
  const meta = [
    pair.time,
    pair.room ? `ауд. ${pair.room}` : null,
    pair.subgroup ? `Подгруппа ${pair.subgroup}` : null,
  ].filter(Boolean).join(' · ');
  document.getElementById('modal-meta').textContent = meta;
  document.getElementById('modal-homework').textContent =
    homework || 'Домашнее задание не указано';
  document.getElementById('modal').classList.remove('hidden');
}

// ==== МОДАЛКА КНИГ ====
function renderBooks() {
  const body = document.getElementById('books-body');
  body.innerHTML = '';
  const subjects = Object.keys(DATA.books || {});
  if (subjects.length === 0) {
    body.textContent = 'Список учебников пуст';
    return;
  }
  subjects.forEach(subject => {
    const group = document.createElement('div');
    group.className = 'book-group';
    const h = document.createElement('h3');
    h.textContent = subject;
    group.appendChild(h);
    DATA.books[subject].forEach(b => {
      const a = document.createElement('a');
      a.className = 'book-link';
      a.href = b.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = b.title || 'Скачать';
      group.appendChild(a);
    });
    body.appendChild(group);
  });
}

// ==== МОДАЛКА ИНФО ====
function renderInfo() {
  const body = document.getElementById('info-body');
  body.innerHTML = '';
  const items = (DATA.info && DATA.info.items) || [];
  if (items.length === 0) {
    body.textContent = 'Пока ничего важного';
    return;
  }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'info-item';
    if (item.date) {
      const d = document.createElement('div');
      d.className = 'info-date';
      d.textContent = item.date;
      el.appendChild(d);
    }
    const t = document.createElement('div');
    t.className = 'info-text';
    t.textContent = item.text;
    el.appendChild(t);
    body.appendChild(el);
  });
}

// ==== ЗАКРЫТИЕ МОДАЛОК ====
function closeModalById(id) {
  document.getElementById(id).classList.add('hidden');
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModalById(btn.dataset.close));
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }
});

// ==== КНОПКИ ====
document.getElementById('books-btn').addEventListener('click', () => {
  renderBooks();
  document.getElementById('books-modal').classList.remove('hidden');
});

document.getElementById('info-btn').addEventListener('click', () => {
  renderInfo();
  document.getElementById('info-modal').classList.remove('hidden');
});

document.getElementById('prev-week').addEventListener('click', () => {
  currentWeekOffset -= 1;
  refresh();
});

document.getElementById('next-week').addEventListener('click', () => {
  currentWeekOffset += 1;
  refresh();
});

document.getElementById('today-week').addEventListener('click', () => {
  currentWeekOffset = 0;
  refresh();
});

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

// ==== ОБНОВЛЕНИЕ ====
function refresh() {
  const weekNumber = getWeekNumber(currentWeekOffset);
  renderHeader(weekNumber);
  renderSchedule(weekNumber);
}

// ==== СТАРТ ====
(async function init() {
  const status = document.getElementById('status');
  try {
    status.textContent = 'Загружаем расписание…';
    await loadAll();
    refresh();
    status.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
  } catch (err) {
    console.error(err);
    status.textContent = 'Ошибка загрузки: ' + err.message;
  }
})();
