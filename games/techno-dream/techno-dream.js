// ==== TECHNO_DREAM — каркас + комната ====
// Этап 2: генерация комнаты, пол, стены, двери

(function () {
  // ==== КОНСТАНТЫ ====
  const TILE = 32;
  const ROOM_COLS = 15;
  const ROOM_ROWS = 9;
  const WORLD_W = ROOM_COLS * TILE;
  const WORLD_H = ROOM_ROWS * TILE;
  const TARGET_FPS = 60;

  // Типы тайлов
  const TILE_FLOOR = 0;
  const TILE_WALL = 1;
  const TILE_DOOR_TOP = 2;
  const TILE_DOOR_BOTTOM = 3;
  const TILE_DOOR_LEFT = 4;
  const TILE_DOOR_RIGHT = 5;

  // Цвета (черновые)
  const COLORS = {
    floorA: '#10162a',
    floorB: '#0c1122',
    floorBorder: 'rgba(34, 211, 238, 0.04)',
    wall: '#1a2038',
    wallEdge: '#2a3455',
    wallTop: '#232b48',
    door: '#fbbf24',
    doorDark: '#b45309',
    doorGlow: 'rgba(251, 191, 36, 0.35)',
  };

  // ==== СОСТОЯНИЕ ====
  let canvas, ctx;
  let lastTime = 0;
  let accumulator = 0;
  const STEP = 1000 / TARGET_FPS;

  let paused = false;
  let gameTime = 0;

  // Карта комнаты: 2D-массив тайлов
  let room = [];

  // Двери (пока все 4 — заглушка)
  let doors = { top: true, bottom: true, left: true, right: true };

  // ==== ИНИЦИАЛИЗАЦИЯ ====
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    ctx.imageSmoothingEnabled = false;

    fitCanvas();

    window.addEventListener('resize', fitCanvas);
    document.addEventListener('keydown', onKeyDown);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('resume-btn').addEventListener('click', togglePause);

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Генерируем комнату
    generateRoom();

    requestAnimationFrame(loop);
  }

  // ==== ГЕНЕРАЦИЯ КОМНАТЫ ====
  function generateRoom() {
    // 1. Заполняем всё полом
    room = [];
    for (let r = 0; r < ROOM_ROWS; r++) {
      room[r] = [];
      for (let c = 0; c < ROOM_COLS; c++) {
        room[r][c] = TILE_FLOOR;
      }
    }

    // 2. Рамка стен по периметру
    for (let c = 0; c < ROOM_COLS; c++) {
      room[0][c] = TILE_WALL;
      room[ROOM_ROWS - 1][c] = TILE_WALL;
    }
    for (let r = 0; r < ROOM_ROWS; r++) {
      room[r][0] = TILE_WALL;
      room[r][ROOM_COLS - 1] = TILE_WALL;
    }

    // 3. Двери по центру стен (если есть)
    const midCol = Math.floor(ROOM_COLS / 2);
    const midRow = Math.floor(ROOM_ROWS / 2);

    if (doors.top)    room[0][midCol] = TILE_DOOR_TOP;
    if (doors.bottom) room[ROOM_ROWS - 1][midCol] = TILE_DOOR_BOTTOM;
    if (doors.left)   room[midRow][0] = TILE_DOOR_LEFT;
    if (doors.right)  room[midRow][ROOM_COLS - 1] = TILE_DOOR_RIGHT;
  }

  // ==== МАСШТАБИРОВАНИЕ ====
  function fitCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const wrapW = wrap.clientWidth - 20;
    const wrapH = wrap.clientHeight - 20;
    const scale = Math.min(wrapW / WORLD_W, wrapH / WORLD_H);
    const finalScale = Math.max(1, Math.floor(scale));
    canvas.style.width = (WORLD_W * finalScale) + 'px';
    canvas.style.height = (WORLD_H * finalScale) + 'px';
  }

  // ==== ИГРОВОЙ ЦИКЛ ====
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let delta = timestamp - lastTime;
    lastTime = timestamp;
    if (delta > 100) delta = 100;

    if (!paused) {
      accumulator += delta;
      while (accumulator >= STEP) {
        update(STEP / 1000);
        accumulator -= STEP;
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    gameTime += dt;
    // TODO: игрок, враги
  }

  // ==== ОТРИСОВКА ====
  function render() {
    // 1. Пол
    drawFloor();

    // 2. Стены (рисуем поверх пола по краям)
    drawWalls();

    // 3. Двери
    drawDoors();

    // 4. Отладка
    drawDebug();
  }

  function drawFloor() {
    // Проходим по всей карте, рисуем пол для каждой FLOOR-клетки
    // Шахматный узор
    for (let r = 1; r < ROOM_ROWS - 1; r++) {
      for (let c = 1; c < ROOM_COLS - 1; c++) {
        const isAlt = (r + c) % 2 === 0;
        ctx.fillStyle = isAlt ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
    // Внешняя область (под стенами) — тоже фон
    ctx.fillStyle = COLORS.floorB;
    ctx.fillRect(0, 0, WORLD_W, TILE);
    ctx.fillRect(0, WORLD_H - TILE, WORLD_W, TILE);
    ctx.fillRect(0, 0, TILE, WORLD_H);
    ctx.fillRect(WORLD_W - TILE, 0, TILE, WORLD_H);
  }

  function drawWalls() {
    for (let r = 0; r < ROOM_ROWS; r++) {
      for (let c = 0; c < ROOM_COLS; c++) {
        if (room[r][c] !== TILE_WALL) continue;
        drawWallTile(c * TILE, r * TILE, r, c);
      }
    }
  }

  function drawWallTile(x, y, r, c) {
    // Основной блок
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x, y, TILE, TILE);

    // Верхняя грань — светлее (иллюзия 3D)
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(x, y, TILE, 4);

    // Внутренняя светлая кромка (со стороны комнаты)
    ctx.fillStyle = COLORS.wallEdge;
    // Только если снизу от стены — пол (т.е. стена — верхняя граница)
    if (r + 1 < ROOM_ROWS && room[r + 1][c] === TILE_FLOOR) {
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
    }
    if (r - 1 >= 0 && room[r - 1][c] === TILE_FLOOR) {
      ctx.fillRect(x, y, TILE, 2);
    }
    if (c + 1 < ROOM_COLS && room[r][c + 1] === TILE_FLOOR) {
      ctx.fillRect(x + TILE - 2, y, 2, TILE);
    }
    if (c - 1 >= 0 && room[r][c - 1] === TILE_FLOOR) {
      ctx.fillRect(x, y, 2, TILE);
    }

    // Тонкая сетка «панелей» на стене
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + TILE / 2 - 1, y + 6, 2, TILE - 12);
  }

  function drawDoors() {
    for (let r = 0; r < ROOM_ROWS; r++) {
      for (let c = 0; c < ROOM_COLS; c++) {
        const t = room[r][c];
        if (t >= TILE_DOOR_TOP && t <= TILE_DOOR_RIGHT) {
          drawDoorTile(c * TILE, r * TILE, t);
        }
      }
    }
  }

  function drawDoorTile(x, y, type) {
    // Фон двери — тёмный
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(x, y, TILE, TILE);

    // Пульсирующее свечение
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 3);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.15 + 0.15 * pulse})`;
    ctx.fillRect(x, y, TILE, TILE);

    // Контур
    ctx.fillStyle = COLORS.door;
    const inset = 6;
    if (type === TILE_DOOR_TOP || type === TILE_DOOR_BOTTOM) {
      ctx.fillRect(x + inset, y + 2, TILE - inset * 2, 2);
      ctx.fillRect(x + inset, y + TILE - 4, TILE - inset * 2, 2);
    } else {
      ctx.fillRect(x + 2, y + inset, 2, TILE - inset * 2);
      ctx.fillRect(x + TILE - 4, y + inset, 2, TILE - inset * 2);
    }

    // Ядро двери
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(x + TILE / 2 - 4, y + TILE / 2 - 4, 8, 8);
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4);
  }

  function drawDebug() {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(138, 143, 168, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`v0.0.2 · ${ROOM_COLS}×${ROOM_ROWS} · t=${gameTime.toFixed(1)}s`, 6, 6);
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
    }
  }

  function togglePause() {
    paused = !paused;
    document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
  }

  // ==== ТЕМА ====
  function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
  }

  // ==== СТАРТ ====
  window.addEventListener('load', init);
})();
