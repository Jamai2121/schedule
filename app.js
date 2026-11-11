import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDBStXp_31wtJF_QoyJKKTlcXbhWVNJ3KI",
  authDomain: "schedule-am261.firebaseapp.com",
  projectId: "schedule-am261",
  storageBucket: "schedule-am261.firebasestorage.app",
  messagingSenderId: "734656477497",
  appId: "1:734656477497:web:5fd3ba0c049401574990e8"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

const ADMIN_UID = "g4WjPt0LYacG8f5Z0ClpzhRVtf82";
const isAdmin = () => currentUserProfile && currentUserProfile.uid === ADMIN_UID;

const LOG_NAMES = {
  hw_add: '➕ ДЗ добавлено',
  hw_update: '✏️ ДЗ изменено',
  hw_delete: '🗑 ДЗ удалено',
  pair_cancel: '⛔ Пара отменена',
  pair_uncancel: '✅ Пара возвращена',
  room_change: '🚪 Смена аудитории',
  room_reset: '↩️ Возврат аудитории',
  mute: '🚫 Мут пользователя',
  exam_set: '🏆 Помечено как контрольная',
  exam_unset: '🏆 Контрольная снята'
};

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
const START_OF_SEMESTER = { month: 7, day: 31 };
const PAIR_DURATION_MIN = 95;
const ONLINE_COURSE_URL = 'http://open.kemsu.ru/';

// ==== АВТОРИЗАЦИЯ ====
function translit(s) {
  const map = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya' };
  return s.toLowerCase().split('').map(ch => (map[ch] !== undefined ? map[ch] : ch)).join('')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
}
const emailFromFio = fio => translit(fio) + '@am261.app';

let currentUserProfile = null;
let authOverlay = null;

function buildAuthScreen() {
  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-card">
      <h2>Вход в расписание</h2>
      <input id="auth-fio" type="text" placeholder="ФИО полностью (Иванов Иван Иванович)" autocomplete="name">
      <input id="auth-pass" type="password" placeholder="Пароль (мин. 6 символов)">
      <div class="auth-row">
        <button id="auth-login" class="auth-btn">Войти</button>
        <button id="auth-register" class="auth-btn secondary">Регистрация</button>
      </div>
      <div id="auth-error" class="auth-error"></div>
    </div>`;
  document.body.appendChild(overlay);

  const fioEl = overlay.querySelector('#auth-fio');
  const passEl = overlay.querySelector('#auth-pass');
  const errEl = overlay.querySelector('#auth-error');

  const doAuth = async (mode) => {
    errEl.textContent = '';
    const fio = fioEl.value.trim();
    const pass = passEl.value;
    if (!fio || !pass) { errEl.textContent = 'Заполни оба поля'; return; }
    const email = emailFromFio(fio);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: fio });
        await setDoc(doc(db, 'users', cred.user.uid), { fio, email, createdAt: Date.now() });
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') errEl.textContent = 'Такой пользователь уже есть — нажми «Войти»';
      else if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(e.code)) errEl.textContent = 'Неверное ФИО или пароль';
      else if (e.code === 'auth/weak-password') errEl.textContent = 'Пароль слабый (мин. 6 символов)';
      else if (e.code === 'auth/too-many-requests') errEl.textContent = 'Слишком много попыток, подожди минуту';
      else errEl.textContent = 'Ошибка: ' + e.code;
    }
  };
  overlay.querySelector('#auth-login').addEventListener('click', () => doAuth('login'));
  overlay.querySelector('#auth-register').addEventListener('click', () => doAuth('register'));
  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doAuth('login'); });
  return overlay;
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUserProfile = { uid: user.uid, fio: user.displayName || '' };
    if (authOverlay) { authOverlay.remove(); authOverlay = null; }
    if (!document.getElementById('user-chip')) {
      const actions = document.querySelector('.header-actions');
      if (actions) {
        const chip = document.createElement('button');
        chip.id = 'user-chip';
        chip.className = 'icon-btn';
        chip.title = 'Выйти';
        chip.textContent = '👤';
        chip.addEventListener('click', () => signOut(auth));
        actions.appendChild(chip);
      }
    }
  } else {
    currentUserProfile = null;
    const chip = document.getElementById('user-chip');
    if (chip) chip.remove();
    if (!authOverlay) authOverlay = buildAuthScreen();
  }
});

// ==== СОСТОЯНИЕ ====
let DATA = {
  schedule: null,
  homework: {},
  books: {},
  info: { items: [] },
  overrides: {},
  variants: { items: [] },
};
let currentWeekOffset = 0;
let subgroupFilter = localStorage.getItem('subgroup') || 'all';

// ==== ЗАГРУЗКА ====
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path}`);
  return res.json();
}
async function loadAll() {
  const [schedule, homework, books, info, overrides, variants] = await Promise.all([
    loadJSON('./data/schedule.json'),
    loadJSON('./data/homework.json').catch(() => ({})),
    loadJSON('./data/books.json').catch(() => ({})),
    loadJSON('./data/info.json').catch(() => ({ items: [] })),
    loadJSON('./data/overrides.json').catch(() => ({})),
    loadJSON('./data/variants.json').catch(() => ({ items: [] })),
  ]);
  DATA = { schedule, homework, books, info, overrides, variants };
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

// ==== OVERRIDES (JSON + Firestore) ====
function applyOverrides(weekNumber, pairs, ovMap) {
  const list = DATA.overrides[String(weekNumber)] || [];
  const cancelIds = new Set();
  const notes = {};
  list.forEach(o => {
    if (o.action === 'cancel') cancelIds.add(o.id);
    if (o.action === 'note') notes[o.id] = o.note;
  });
  return pairs.map(p => {
    const fv = ovMap[p.id] || {};
    return {
      ...p,
      note: fv.note || notes[p.id] || null,
      cancelled: fv.cancelled !== undefined ? fv.cancelled : cancelIds.has(p.id),
      roomOverride: fv.room || null,
      exam: fv.exam || false,
    };
  });
}

// ==== ВРЕМЯ ====
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function formatTime(start) {
  if (!start) return '';
  const startMin = timeToMinutes(start);
  if (startMin === null) return start;
  const endMin = startMin + PAIR_DURATION_MIN;
  const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
  const endM = String(endMin % 60).padStart(2, '0');
  return `${start} – ${endH}:${endM}`;
}
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function getPairStatus(pair) {
  const start = timeToMinutes(pair.time);
  if (start === null) return { status: 'unknown', progress: 0 };
  const end = start + PAIR_DURATION_MIN;
  const now = nowMinutes();
  if (now >= end) return { status: 'past', progress: 100 };
  if (now >= start) {
    const progress = Math.round(((now - start) / PAIR_DURATION_MIN) * 100);
    return { status: 'current', progress };
  }
  return { status: 'future', progress: 0 };
}
function countUniqueSlots(pairs) {
  const slots = new Set();
  pairs.forEach(p => {
    slots.add(p.time || '');
  });
  return slots.size;
}

// ==== ЛОГИ ====
async function addLog(action, details, pair) {
  try {
    await addDoc(collection(db, 'logs'), {
      action,
      details: details || '',
      pairId: pair ? pair.id : null,
      weekNumber: getWeekNumber(currentWeekOffset),
      userFio: currentUserProfile ? currentUserProfile.fio : '',
      userUid: currentUserProfile ? currentUserProfile.uid : '',
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Ошибка лога:', e);
  }
}

// ==== РЕНДЕР ====
function renderHeader(weekNumber) {
  const parity = getParity(weekNumber);
  const el = document.getElementById('week-info');
  const parityText = parity === 'even' ? 'чётная' : 'нечётная';
  el.innerHTML = `Неделя №${weekNumber}<span class="parity ${parity}">· ${parityText}</span>`;
}

async function renderSchedule(weekNumber) {
  const parity = getParity(weekNumber);
  const container = document.getElementById('schedule');
  container.innerHTML = '';
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const isCurrentWeek = currentWeekOffset === 0;

  // ДЗ и overrides из Firestore
  const hw = {};
  const ov = {};
  try {
    const hwQuery = query(collection(db, 'homework'), where('weekNumber', '==', weekNumber));
    const hwSnap = await getDocs(hwQuery);
    hwSnap.forEach(d => { const data = d.data(); if (data.pairId) hw[data.pairId] = data.text; });
    const ovQuery = query(collection(db, 'overrides'), where('weekNumber', '==', weekNumber));
    const ovSnap = await getDocs(ovQuery);
    ovSnap.forEach(d => { const data = d.data(); if (data.pairId) ov[data.pairId] = data; });
  } catch (e) {
    console.error('Ошибка загрузки ДЗ/overrides:', e);
  }

  DAY_ORDER.forEach(dayKey => {
    const basePairs = (DATA.schedule[parity] && DATA.schedule[parity][dayKey]) || [];
    let pairs = applyOverrides(weekNumber, basePairs, ov);
    if (subgroupFilter !== 'all') {
      const sg = Number(subgroupFilter);
      pairs = pairs.filter(p => !p.subgroup || p.subgroup === sg);
    }
    const dayEl = document.createElement('div');
    dayEl.className = 'day' + (isCurrentWeek && dayKey === todayKey ? ' today' : '');
    dayEl.dataset.day = dayKey;
    const title = document.createElement('div');
    title.className = 'day-title';
    const displayCount = countUniqueSlots(pairs);
    const pairsWord = displayCount === 1
      ? 'пара'
      : (displayCount >= 2 && displayCount <= 4 ? 'пары' : 'пар');
    title.textContent = displayCount > 0
      ? `${DAY_NAMES[dayKey]} · ${displayCount} ${pairsWord}`
      : DAY_NAMES[dayKey];
    dayEl.appendChild(title);
    if (pairs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Пар нет';
      dayEl.appendChild(empty);
    } else {
      const isToday = isCurrentWeek && dayKey === todayKey;
      pairs.forEach(pair => {
        dayEl.appendChild(renderPair(pair, hw[pair.id] || '', isToday));
      });
    }
    container.appendChild(dayEl);
  });
  if (isCurrentWeek) {
    const todayEl = container.querySelector('.day.today');
    if (todayEl) {
      setTimeout(() => {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

function renderPair(pair, homework, isToday) {
  const el = document.createElement('div');
  el.className = 'pair';
  if (pair.cancelled) el.classList.add('cancelled');
  if (pair.exam) el.classList.add('exam');
  if (isToday) {
    const { status, progress } = getPairStatus(pair);
    if (status === 'past') el.classList.add('past');
    if (status === 'current') {
      el.classList.add('current');
      const bar = document.createElement('div');
      bar.className = 'pair-progress';
      bar.style.width = progress + '%';
      el.appendChild(bar);
    }
  }
  const time = document.createElement('div');
  time.className = 'pair-time';
  time.textContent = formatTime(pair.time) || '';
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
  if (homework) {
    const hwBadge = document.createElement('span');
    hwBadge.className = 'pair-hw';
    hwBadge.textContent = 'ДЗ';
    subject.appendChild(hwBadge);
  }
  if (pair.exam) {
    const exBadge = document.createElement('span');
    exBadge.className = 'pair-exam-badge';
    exBadge.textContent = '✦ Контрольная работа';
    subject.appendChild(exBadge);
  }
  if (pair.online) {
    const onlineBtn = document.createElement('a');
    onlineBtn.className = 'pair-online-btn';
    onlineBtn.href = ONLINE_COURSE_URL;
    onlineBtn.target = '_blank';
    onlineBtn.rel = 'noopener';
    onlineBtn.textContent = 'Пройти тест';
    onlineBtn.addEventListener('click', e => e.stopPropagation());
    subject.appendChild(onlineBtn);
  }
  info.appendChild(subject);
  if (pair.teacher) {
    const t = document.createElement('div');
    t.className = 'pair-teacher';
    t.textContent = pair.teacher;
    info.appendChild(t);
  }
  const room = pair.roomOverride || pair.room;
  if (room) {
    const r = document.createElement('div');
    r.className = 'pair-room';
    r.textContent = 'ауд. ' + room;
    info.appendChild(r);
  }
  el.appendChild(info);
  el.addEventListener('click', () => openPairModal(pair));
  return el;
}

// ==== МОДАЛКА ПАРЫ + ПАНЕЛЬ АДМИНА ====
async function openPairModal(pair) {
  document.getElementById('modal-title').textContent = pair.subject || 'Пара';
  const room = pair.roomOverride || pair.room;
  const meta = [
    formatTime(pair.time),
    room ? `ауд. ${room}` : null,
    pair.subgroup ? `Подгруппа ${pair.subgroup}` : null,
  ].filter(Boolean).join(' · ');
  document.getElementById('modal-meta').textContent = meta;

  const weekNumber = getWeekNumber(currentWeekOffset);
  const hwDocId = `${weekNumber}_${pair.id}`;
  const hwRef = doc(db, 'homework', hwDocId);
  const ovRef = doc(db, 'overrides', `${weekNumber}_${pair.id}`);

  const modalBody = document.getElementById('modal-homework');
  modalBody.innerHTML = '<div style="color:var(--muted)">Загрузка ДЗ...</div>';

  const oldPanel = document.getElementById('admin-panel');
  if (oldPanel) oldPanel.remove();

  try {
    const snap = await getDoc(hwRef);
    const hwData = snap.exists() ? snap.data() : null;
    const ovSnap = await getDoc(ovRef);
    const ovData = ovSnap.exists() ? ovSnap.data() : null;

    let html = '';
    if (hwData) {
      html += `<div style="background:var(--hover);border-left:4px solid var(--border-today);border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:8px;white-space:pre-wrap;font-size:14px;line-height:1.5;color:var(--text);">${hwData.text}</div>`;
      html += `<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Добавил: ${hwData.authorFio || 'неизвестно'} ${hwData.timestamp ? '(' + new Date(hwData.timestamp).toLocaleDateString('ru-RU') + ')' : ''}</div>`;
      if (isAdmin() && hwData.authorUid) {
        html += `<button id="mute-btn" style="font-size:12px;padding:4px 8px;background:#fee2e2;color:#991b1b;border:none;border-radius:6px;cursor:pointer;margin-bottom:12px;">🚫 Замутить ${hwData.authorFio}</button>`;
      }
    } else {
      html += `<p style="color:var(--muted);margin-bottom:12px;">Домашнее задание не указано.</p>`;
    }

    const canEdit = !hwData || isAdmin();
    if (canEdit) {
      html += `
        <textarea id="hw-input" placeholder="Введите домашнее задание..." style="width:100%;min-height:80px;padding:10px;border-radius:8px;border:1px solid var(--hover);background:var(--bg);color:var(--text);resize:vertical;margin-bottom:8px;">${hwData ? hwData.text : ''}</textarea>
        <button id="hw-save" class="auth-btn" style="width:100%;">${hwData ? 'Обновить ДЗ (Админ)' : 'Сохранить ДЗ'}</button>
      `;
    } else {
      html += `<div style="font-size:12px;color:var(--muted);font-style:italic;">Редактирование доступно только автору или админу.</div>`;
    }

    modalBody.innerHTML = html;

    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', async () => {
        if (confirm(`Замутить ${hwData.authorFio}? Он не сможет добавлять ДЗ.`)) {
          await updateDoc(doc(db, 'users', hwData.authorUid), { isMuted: true });
          await addLog('mute', hwData.authorFio, pair);
          alert('Пользователь замьючен.');
        }
      });
    }

    const saveBtn = document.getElementById('hw-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const text = document.getElementById('hw-input').value.trim();
        if (!text) return alert('Введите текст ДЗ');
        saveBtn.textContent = 'Сохранение...';
        saveBtn.disabled = true;
        try {
          const existingSnap = await getDoc(hwRef);
          const hwPayload = {
            text: text,
            authorFio: currentUserProfile.fio,
            authorUid: currentUserProfile.uid,
            pairId: pair.id,
            weekNumber: weekNumber,
            timestamp: Date.now()
          };
          if (existingSnap.exists()) {
            await updateDoc(hwRef, hwPayload);
            await addLog('hw_update', pair.subject, pair);
          } else {
            await setDoc(hwRef, hwPayload);
            await addLog('hw_add', pair.subject, pair);
          }
          openPairModal(pair);
          refresh();
        } catch (e) {
          console.error(e);
          alert('Ошибка: ' + (e.code === 'permission-denied' ? 'Нет прав' : e.message));
          saveBtn.textContent = 'Попробовать снова';
          saveBtn.disabled = false;
        }
      });
    }

    // ==== ПАНЕЛЬ АДМИНА ====
    if (isAdmin()) {
      const panel = document.createElement('div');
      panel.id = 'admin-panel';
      panel.className = 'admin-panel';
      panel.innerHTML = `
        <h3>🛠 Панель админа</h3>
        <button id="adm-cancel" class="admin-btn"></button>
        <input id="adm-room" class="admin-input" placeholder="Новая аудитория (напр. 8105)">
        <button id="adm-room-save" class="admin-btn">🚪 Поменять аудиторию</button>
        <button id="adm-room-reset" class="admin-btn">↩️ Вернуть аудиторию</button>
        <button id="adm-exam" class="admin-btn exam"></button>
        <button id="adm-hw-del" class="admin-btn danger" style="${hwData ? '' : 'display:none'}">🗑 Удалить ДЗ</button>
        <button id="adm-logs" class="admin-btn">📜 Логи изменений</button>
        <div id="adm-logs-box" class="admin-logs" style="display:none"></div>
      `;
      document.getElementById('modal').appendChild(panel);

      const cancelBtn = panel.querySelector('#adm-cancel');
      cancelBtn.textContent = (ovData && ovData.cancelled) ? '✅ Вернуть пару' : '⛔ Отменить пару';
      cancelBtn.addEventListener('click', async () => {
        const newVal = !(ovData && ovData.cancelled);
        await setDoc(ovRef, {
          weekNumber, pairId: pair.id,
          cancelled: newVal,
          note: (ovData && ovData.note) || null,
          room: (ovData && ovData.room) || null,
          updatedBy: currentUserProfile.uid,
          updatedByFio: currentUserProfile.fio,
          updatedAt: Date.now()
        }, { merge: true });
        await addLog(newVal ? 'pair_cancel' : 'pair_uncancel', pair.subject, pair);
        openPairModal(pair);
        refresh();
      });

      panel.querySelector('#adm-room-save').addEventListener('click', async () => {
        const newRoom = panel.querySelector('#adm-room').value.trim();
        if (!newRoom) return alert('Введи аудиторию');
        await setDoc(ovRef, {
          weekNumber, pairId: pair.id,
          cancelled: (ovData && ovData.cancelled) || false,
          room: newRoom,
          note: `Занятие перенесено в ауд. ${newRoom}`,
          updatedBy: currentUserProfile.uid,
          updatedByFio: currentUserProfile.fio,
          updatedAt: Date.now()
        }, { merge: true });
        await addLog('room_change', `${pair.subject} → ауд. ${newRoom}`, pair);
        openPairModal(pair);
        refresh();
      });

      panel.querySelector('#adm-room-reset').addEventListener('click', async () => {
        await setDoc(ovRef, {
          weekNumber, pairId: pair.id,
          cancelled: (ovData && ovData.cancelled) || false,
          room: null,
          note: null,
          updatedBy: currentUserProfile.uid,
          updatedByFio: currentUserProfile.fio,
          updatedAt: Date.now()
        }, { merge: true });
        await addLog('room_reset', pair.subject, pair);
        openPairModal(pair);
        refresh();
      });

      const examBtn = panel.querySelector('#adm-exam');
      examBtn.textContent = (ovData && ovData.exam) ? '🏆 Убрать контрольную' : '🏆 Контрольная работа';
      examBtn.addEventListener('click', async () => {
        const newVal = !(ovData && ovData.exam);
        await setDoc(ovRef, {
          weekNumber, pairId: pair.id,
          cancelled: (ovData && ovData.cancelled) || false,
          room: (ovData && ovData.room) || null,
          note: (ovData && ovData.note) || null,
          exam: newVal,
          updatedBy: currentUserProfile.uid,
          updatedByFio: currentUserProfile.fio,
          updatedAt: Date.now()
        }, { merge: true });
        await addLog(newVal ? 'exam_set' : 'exam_unset', pair.subject, pair);
        openPairModal(pair);
        refresh();
      });

      const hwDelBtn = panel.querySelector('#adm-hw-del');
      hwDelBtn.addEventListener('click', async () => {
        if (!confirm('Удалить ДЗ по этой паре?')) return;
        await deleteDoc(hwRef);
        await addLog('hw_delete', pair.subject, pair);
        openPairModal(pair);
        refresh();
      });

      panel.querySelector('#adm-logs').addEventListener('click', async () => {
        const box = panel.querySelector('#adm-logs-box');
        if (box.style.display !== 'none') { box.style.display = 'none'; return; }
        box.style.display = 'block';
        box.innerHTML = '<div class="admin-log-item">Загрузка...</div>';
        try {
          const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
          const lSnap = await getDocs(q);
          box.innerHTML = '';
          if (lSnap.empty) { box.innerHTML = '<div class="admin-log-item">Логи пусты</div>'; return; }
          lSnap.forEach(d => {
            const l = d.data();
            const div = document.createElement('div');
            div.className = 'admin-log-item';
            div.innerHTML = `<div class="log-time">${new Date(l.timestamp).toLocaleString('ru-RU')} · ${l.userFio || '—'}</div><div>${LOG_NAMES[l.action] || l.action}: ${l.details || ''} (нед. ${l.weekNumber})</div>`;
            box.appendChild(div);
          });
        } catch (e) {
          box.innerHTML = '<div class="admin-log-item">Ошибка загрузки логов</div>';
          console.error(e);
        }
      });
    }
  } catch (e) {
    console.error(e);
    modalBody.innerHTML = '<div style="color:#ef4444">Ошибка загрузки ДЗ</div>';
  }

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

// ==== МОДАЛКА ВАРИАНТОВ ====
function renderVariants() {
  const body = document.getElementById('variants-body');
  body.innerHTML = '';
  const items = (DATA.variants && DATA.variants.items) || [];
  if (items.length === 0) {
    body.textContent = 'Список пуст';
    return;
  }
  const table = document.createElement('table');
  table.className = 'variants-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>№</th><th>Фамилия</th><th>Имя</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="num">${it.n}</td><td>${it.last}</td><td>${it.first}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
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
document.getElementById('links-btn').addEventListener('click', () => {
  document.getElementById('links-modal').classList.remove('hidden');
});
document.getElementById('variants-btn').addEventListener('click', () => {
  renderVariants();
  document.getElementById('variants-modal').classList.remove('hidden');
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

// ==== ФИЛЬТР ПОДГРУППЫ ====
function initSubgroupFilter() {
  const btns = document.querySelectorAll('.sg-btn');
  btns.forEach(btn => {
    if (btn.dataset.sg === subgroupFilter) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.addEventListener('click', () => {
      subgroupFilter = btn.dataset.sg;
      localStorage.setItem('subgroup', subgroupFilter);
      btns.forEach(b => b.classList.toggle('active', b.dataset.sg === subgroupFilter));
      refresh();
    });
  });
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

// ==== ОБНОВЛЕНИЕ ====
async function refresh() {
  const weekNumber = getWeekNumber(currentWeekOffset);
  renderHeader(weekNumber);
  await renderSchedule(weekNumber);
}

// ==== СТАРТ ====
(async function init() {
  const status = document.getElementById('status');
  try {
    status.textContent = 'Загружаем расписание…';
    await loadAll();
    initSubgroupFilter();
    await refresh();
    status.textContent = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
    setInterval(refresh, 60000);
  } catch (err) {
    console.error(err);
    status.textContent = 'Ошибка загрузки: ' + err.message;
  }
})();
