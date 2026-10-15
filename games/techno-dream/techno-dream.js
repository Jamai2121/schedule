// ==== TECHNO_DREAM — Этап 3 ====
// Комната + игрок (дроид-уборщик) с движением WASD и коллизиями

(function () {
  // ==== КОНСТАНТЫ ====
  const TILE = 32;
  const ROOM_COLS = 15;
  const ROOM_ROWS = 9;
  const WORLD_W = ROOM_COLS * TILE;
  const WORLD_H = ROOM_ROWS * TILE;
  const TARGET_FPS = 60;

  const PLAYER_SIZE = 24;       // размер хитбокса (спрайт 32, но хитбокс меньше)
  const PLAYER_SPEED = 4.5 * TILE; // px/сек

  const TILE_FLOOR = 0;
  const TILE_WALL = 1;
  const TILE_DOOR_TOP = 2;
  const TILE_DOOR_BOTTOM = 3;
  const TILE_DOOR_LEFT = 4;
  const TILE_DOOR_RIGHT = 5;

  const COLORS = {
    floorA: '#10162a',
    floorB: '#0c1122',
    wall: '#1a2038',
    wallEdge: '#2a3455',
    wallTop: '#232b48',
    door: '#fbbf24',
    doorDark: '#b45309',
  };

  // ==== СОСТОЯНИЕ ====
  let canvas, ctx;
  let lastTime = 0;
  let accumulator = 0;
  const STEP = 1000 / TARGET_FPS;

  let paused = false;
  let gameTime = 0;

  let room = [];
  let doors = { top: true, bottom: true, left: true, right: true };

  // Игрок
  const player = {
    x: 0,         // центр игрока в мировых координатах
    y: 0,
    speed: PLAYER_SPEED,
    dir: { x: 0, y: 1 },   // направление взгляда (вниз по умолчанию)
    moving: false,
  };

  // Спрайт
  const droidImg = new Image();
  let droidReady = false;

  // Ввод
  const keys = { w: false, a: false, s: false, d: false };

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
    document.addEventListener('keyup', onKeyUp);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('resume-btn').addEventListener('click', togglePause);

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Загрузка спрайта
    droidImg.onload = () => { droidReady = true; };
    droidImg.onerror = () => { console.warn('Не удалось загрузить droid-idle.png'); };
    droidImg.src = './sprites/droid-idle.png';

    generateRoom();

    // Ставим игрока в центр
    const midCol = Math.floor(ROOM_COLS / 2);
    const midRow = Math.floor(ROOM_ROWS / 2);
    player.x = midCol * TILE + TILE / 2;
    player.y = midRow * TILE + TILE / 2;

    requestAnimationFrame(loop);
  }

  // ==== ГЕНЕРАЦИЯ КОМНАТЫ ====
  function generateRoom() {
    room = [];
    for (let r = 0; r < ROOM_ROWS; r++) {
      room[r] = [];
      for (let c = 0; c < ROOM_COLS; c++) {
        room[r][c] = TILE_FLOOR;
      }
    }
    for (let c = 0; c < ROOM_COLS; c++) {
      room[0][c] = TILE_WALL;
      room[ROOM_ROWS - 1][c] = TILE_WALL;
    }
    for (let r = 0; r < ROOM_ROWS; r++) {
      room[r][0] = TILE_WALL;
      room[r][ROOM_COLS - 1] = TILE_WALL;
    }
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

  // ==== КОЛЛИЗИИ ====
  // Тайл, в который попадает точка (x, y) в мировых координатах
  function tileAt(worldX, worldY) {
    const c = Math.floor(worldX / TILE);
    const r = Math.floor(worldY / TILE);
    if (r < 0 || r >= ROOM_ROWS || c < 0 || c >= ROOM_COLS) return TILE_WALL;
    return room[r][c];
  }

  function isWalkable(worldX, worldY) {
    // Двери — пока непроходимы (этап 7)
    const t = tileAt(worldX, worldY);
    return t === TILE_FLOOR;
  }

  // Проверка: может ли игрок стоять в позиции (cx, cy) — центр
  function canStand(cx, cy) {
    const half = PLAYER_SIZE / 2;
    // Углы хитбокса
    return isWalkable(cx - half, cy - half) &&
           isWalkable(cx + half, cy - half) &&
           isWalkable(cx - half, cy + half) &&
           isWalkable(cx + half, cy + half);
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

    // Направление движения
    let dx = 0, dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    player.moving = dx !== 0 || dy !== 0;

    if (player.moving) {
      // Нормализация по диагонали
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      const step = player.speed * dt;
      const newX = player.x + dx * step;
      const newY = player.y + dy * step;

      // Раздельные проверки по осям — можно «скользить» вдоль стен
      if (canStand(newX, player.y)) player.x = newX;
      if (canStand(player.x, newY)) player.y = newY;

      // Запоминаем направление взгляда
      player.dir.x = dx;
      player.dir.y = dy;
    }
  }

  // ==== ОТРИСОВКА ====
  function render() {
    drawFloor();
    drawWalls();
    drawDoors();
    drawPlayer();
    drawDebug();
  }

  function drawFloor() {
    for (let r = 1; r < ROOM_ROWS - 1; r++) {
      for (let c = 1; c < ROOM_COLS - 1; c++) {
        const isAlt = (r + c) % 2 === 0;
        ctx.fillStyle = isAlt ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
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
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(x, y, TILE, 4);
    ctx.fillStyle = COLORS.wallEdge;
    if (r + 1 < ROOM_ROWS && room[r + 1][c] === TILE_FLOOR) ctx.fillRect(x, y + TILE - 2, TILE, 2);
    if (r - 1 >= 0 && room[r - 1][c] === TILE_FLOOR)      ctx.fillRect(x, y, TILE, 2);
    if (c + 1 < ROOM_COLS && room[r][c + 1] === TILE_FLOOR) ctx.fillRect(x + TILE - 2, y, 2, TILE);
    if (c - 1 >= 0 && room[r][c - 1] === TILE_FLOOR)        ctx.fillRect(x, y, 2, TILE);
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
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(x, y, TILE, TILE);
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 3);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.15 + 0.15 * pulse})`;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.door;
    const inset = 6;
    if (type === TILE_DOOR_TOP || type === TILE_DOOR_BOTTOM) {
      ctx.fillRect(x + inset, y + 2, TILE - inset * 2, 2);
      ctx.fillRect(x + inset, y + TILE - 4, TILE - inset * 2, 2);
    } else {
      ctx.fillRect(x + 2, y + inset, 2, TILE - inset * 2);
      ctx.fillRect(x + TILE - 4, y + inset, 2, TILE - inset * 2);
    }
    ctx.fillStyle = COLORS.doorDark;
    ctx.fillRect(x + TILE / 2 - 4, y + TILE / 2 - 4, 8, 8);
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4);
  }

  function drawPlayer() {
    // Тень (эллипс под ногами) — чтобы дроид «стоял» на полу
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (droidReady) {
      // Спрайт 32×32 рисуем так, чтобы центр спрайта совпал с центром игрока
      const dw = 32, dh = 32;
      ctx.drawImage(droidImg, player.x - dw / 2, player.y - dh / 2, dw, dh);
    } else {
      // Фолбэк — простой квадрат, пока спрайт не загрузился
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(player.x - PLAYER_SIZE / 2, player.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    }
  }

  function drawDebug() {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(138, 143, 168, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`v0.0.3 · ${ROOM_COLS}×${ROOM_ROWS} · t=${gameTime.toFixed(1)}s`, 6, 6);
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = true;
    if (k === 'a' || k === 'ф') keys.a = true;
    if (k === 's' || k === 'ы') keys.s = true;
    if (k === 'd' || k === 'в') keys.d = true;
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = false;
    if (k === 'a' || k === 'ф') keys.a = false;
    if (k === 's' || k === 'ы') keys.s = false;
    if (k === 'd' || k === 'в') keys.d = false;
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
