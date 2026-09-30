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

// ==== ЗАГРУЗКА JSON ====
async function fetchSchedule() {
  const res = await fetch('./schedule.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить schedule.json');
  return res.json();
}

// ==== ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ НЕДЕЛИ (от 1 сентября) ====
function detectCurrentWeek(data) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(now.getFullYear(), 8, 1); // 8 = сентябрь
  start.setHours(0, 0, 0, 0);

  if (now < start) {
    start.setFullYear(start.getFullYear() - 1);
  }

  const weekNumber = Math.floor((now - start) / (7 * 86400000)) + 1;

  return data.weeks.find(w => w.number === weekNumber) || data.weeks[0];
}

// ==== РЕНДЕР ====
function renderWeekInfo(week) {
  const el = document.getElementById('week-info');
  const parityText = week.parity === 'even' ? 'чётная' : 'нечётная';
  const parityClass = week.parity === 'even' ? 'even' : 'odd';
  el.innerHTML = `Неделя №${week.number}<span class="parity ${parityClass}">· ${parityText}</span>`;
}

function renderSchedule(week) {
  const container = document.getElementById('schedule');
  container.innerHTML = '';

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  DAY_ORDER.forEach(dayKey => {
    const pairs = week.days[dayKey] || [];

    const dayEl = document.createElement('div');
    dayEl.className = 'day' + (dayKey === todayKey ? ' today' : '');

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
        dayEl.appendChild(renderPair(pair));
      });
    }

    container.appendChild(dayEl);
  });
}

function renderPair(pair) {
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

  info.appendChild(subject);
  el.appendChild(info);

  el.addEventListener('click', () => openModal(pair));

  return el;
}

// ==== МОДАЛКА ====
function openModal(pair) {
  document.getElementById('modal-title').textContent = pair.subject || 'Пара';
  document.getElementById('modal-meta').textContent =
    [pair.time, pair.subgroup ? `Подгруппа ${pair.subgroup}` : null]
      .filter(Boolean).join(' · ');
  document.getElementById('modal-homework').textContent =
    pair.homework || 'Домашнее задание не указано';
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
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

// ==== СТАРТ ====
(async function init() {
  const status = document.getElementById('status');
  try {
    status.textContent = 'Загружаем расписание…';
    const data = await fetchSchedule();
    const week = detectCurrentWeek(data);
    renderWeekInfo(week);
    renderSchedule(week);
    status.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
  } catch (err) {
    console.error(err);
    status.textContent = 'Ошибка загрузки: ' + err.message;
  }
})();
