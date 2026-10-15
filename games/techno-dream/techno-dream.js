// ==== TECHNO_DREAM — каркас ====
// Этап 1: пустой canvas + игровой цикл
// Дальше: комнаты, игрок, враги, предметы

(function () {
  // ==== КОНСТАНТЫ ====
  const TILE = 32;           // размер тайла в пикселях
  const ROOM_COLS = 15;      // ширина комнаты в тайлах
  const ROOM_ROWS = 9;       // высота комнаты в тайлах
  const WORLD_W = ROOM_COLS * TILE;  // 480
  const WORLD_H = ROOM_ROWS * TILE;  // 288
  const TARGET_FPS = 60;

  // ==== СОСТОЯНИЕ ====
  let canvas, ctx;
  let lastTime = 0;
  let accumulator = 0;
  const STEP = 1000 / TARGET_FPS;

  let paused = false;
  let gameTime = 0;

  // ==== ИНИЦИАЛИЗАЦИЯ ====
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Внутреннее разрешение — фиксированное (мир игры)
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;

    // Отключаем сглаживание для пиксель-арта
    ctx.imageSmoothingEnabled = false;

    // Масштабируем через CSS, чтобы влезало в экран
    fitCanvas();

    // Регистрируем обработчики
    window.addEventListener('resize', fitCanvas);
    document.addEventListener('keydown', onKeyDown);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('resume-btn').addEventListener('click', togglePause);

    // Тема из localStorage (общая с основным сайтом)
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    // Запуск игрового цикла
    requestAnimationFrame(loop);
  }

  // ==== МАСШТАБИРОВАНИЕ ====
  function fitCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const wrapW = wrap.clientWidth - 20;
    const wrapH = wrap.clientHeight - 20;
    const scale = Math.min(wrapW / WORLD_W, wrapH / WORLD_H);
    // Округляем вниз до целого, чтобы пиксели не мылились
    const finalScale = Math.max(1, Math.floor(scale));
    canvas.style.width = (WORLD_W * finalScale) + 'px';
    canvas.style.height = (WORLD_H * finalScale) + 'px';
  }

  // ==== ИГРОВОЙ ЦИКЛ ====
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let delta = timestamp - lastTime;
    lastTime = timestamp;

    // Ограничиваем delta, чтобы при лагах игра не «прыгала»
    if (delta > 100) delta = 100;

    if (!paused) {
      accumulator += delta;
      while (accumulator >= STEP) {
        update(STEP / 1000); // delta в секундах
        accumulator -= STEP;
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  // ==== ОБНОВЛЕНИЕ ЛОГИКИ ====
  function update(dt) {
    gameTime += dt;
    // TODO: движение игрока, врагов, коллизии, стрельба
  }

  // ==== ОТРИСОВКА ====
  function render() {
    // Фон (пока просто тёмный)
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Пока — заглушка: комната как сетка
    drawPlaceholderRoom();

    // FPS и время — для отладки
    drawDebug();
  }

  function drawPlaceholderRoom() {
    // Границы комнаты
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);

    // Сетка тайлов (полупрозрачная)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= ROOM_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROOM_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(WORLD_W, y * TILE);
      ctx.stroke();
    }

    // Надпись по центру
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TECHNO_DREAM', WORLD_W / 2, WORLD_H / 2 - 10);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(138, 143, 168, 0.6)';
    ctx.fillText('каркас · этап 1', WORLD_W / 2, WORLD_H / 2 + 12);
  }

  function drawDebug() {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(138, 143, 168, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`v0.0.1 · t=${gameTime.toFixed(1)}s`, 6, 6);
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
    const overlay = document.getElementById('pause-overlay');
    overlay.classList.toggle('hidden', !paused);
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
