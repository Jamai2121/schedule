// ==== ТЕТРИС ====
(function () {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 24; // размер клетки в px

  // Фигуры (по 4 поворота каждая)
  const SHAPES = {
    I: [
      [[1,1,1,1]],
      [[1],[1],[1],[1]],
    ],
    O: [
      [[1,1],[1,1]],
    ],
    T: [
      [[0,1,0],[1,1,1]],
      [[1,0],[1,1],[1,0]],
      [[1,1,1],[0,1,0]],
      [[0,1],[1,1],[0,1]],
    ],
    S: [
      [[0,1,1],[1,1,0]],
      [[1,0],[1,1],[0,1]],
    ],
    Z: [
      [[1,1,0],[0,1,1]],
      [[0,1],[1,1],[1,0]],
    ],
    J: [
      [[1,0,0],[1,1,1]],
      [[1,1],[1,0],[1,0]],
      [[1,1,1],[0,0,1]],
      [[0,1],[0,1],[1,1]],
    ],
    L: [
      [[0,0,1],[1,1,1]],
      [[1,0],[1,0],[1,1]],
      [[1,1,1],[1,0,0]],
      [[1,1],[0,1],[0,1]],
    ],
  };
  const COLORS = {
    I: '#22d3ee',
    O: '#fbbf24',
    T: '#a855f7',
    S: '#22c55e',
    Z: '#ef4444',
    J: '#3b82f6',
    L: '#f97316',
  };

  let canvas, ctx, nextCanvas, nextCtx;
  let board;       // матрица ROWS×COLS: null или { type }
  let current;     // { type, rot, x, y }
  let nextType;
  let score, lines, level;
  let dropTimer, dropInterval;
  let running;
  let onScoreCb;

  function mount(stage, onScore) {
    onScoreCb = onScore;
    stage.innerHTML = '';

    // Очки
    const info = document.createElement('div');
    info.className = 'game-score';
    info.innerHTML = `
      <span>Очки: <strong id="tt-score">0</strong></span>
      <span>Линии: <strong id="tt-lines">0</strong></span>
      <span>Уровень: <strong id="tt-level">1</strong></span>
    `;
    stage.appendChild(info);

    // Контейнер: поле + превью
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '12px';
    wrap.style.alignItems = 'flex-start';

    canvas = document.createElement('canvas');
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    canvas.style.background = 'var(--board-bg)';
    canvas.style.borderRadius = '8px';
    canvas.style.maxWidth = '100%';
    canvas.style.touchAction = 'none';
    wrap.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Превью следующей
    const previewBox = document.createElement('div');
    previewBox.style.background = 'var(--board-bg)';
    previewBox.style.borderRadius = '8px';
    previewBox.style.padding = '8px';
    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Следующая';
    previewLabel.style.fontSize = '11px';
    previewLabel.style.color = 'var(--muted)';
    previewLabel.style.marginBottom = '4px';
    previewLabel.style.textAlign = 'center';
    previewBox.appendChild(previewLabel);

    nextCanvas = document.createElement('canvas');
    nextCanvas.width = 4 * CELL;
    nextCanvas.height = 4 * CELL;
    nextCanvas.style.background = 'transparent';
    previewBox.appendChild(nextCanvas);
    nextCtx = nextCanvas.getContext('2d');

    wrap.appendChild(previewBox);
    stage.appendChild(wrap);

    // Кнопка старта/рестарта
    const btn = document.createElement('button');
    btn.className = 'game-btn';
    btn.textContent = 'Начать';
    btn.addEventListener('click', () => {
      start();
      btn.textContent = 'Заново';
    });
    stage.appendChild(btn);

    // Управление
    document.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    window.__tetrisHandlers = { onKey, onTouchStart, onTouchEnd };

    // Начальная отрисовка пустого поля
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    draw();
    drawNext();
  }

  function unmount() {
    running = false;
    if (dropTimer) clearInterval(dropTimer);
    const h = window.__tetrisHandlers;
    if (h) {
      document.removeEventListener('keydown', h.onKey);
      canvas.removeEventListener('touchstart', h.onTouchStart);
      canvas.removeEventListener('touchend', h.onTouchEnd);
      window.__tetrisHandlers = null;
    }
  }

  function start() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 800;
    running = true;

    updateUI();
    nextType = randomType();
    spawn();

    if (dropTimer) clearInterval(dropTimer);
    dropTimer = setInterval(tick, dropInterval);

    onScoreCb(0);
    draw();
    drawNext();
  }

  function randomType() {
    const keys = Object.keys(SHAPES);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function spawn() {
    const type = nextType;
    nextType = randomType();
    const shape = SHAPES[type][0];
    current = {
      type,
      rot: 0,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };
    drawNext();

    if (collide(current.x, current.y, current.rot)) {
      gameOver();
    }
  }

  function getShape(type, rot) {
    const arr = SHAPES[type];
    return arr[rot % arr.length];
  }

  function collide(nx, ny, nrot) {
    const shape = getShape(current.type, nrot);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = nx + c;
        const y = ny + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function tick() {
    if (!running || !current) return;
    if (!collide(current.x, current.y + 1, current.rot)) {
      current.y++;
    } else {
      lock();
    }
    draw();
  }

  function lock() {
    const shape = getShape(current.type, current.rot);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const y = current.y + r;
        const x = current.x + c;
        if (y >= 0) board[y][x] = { type: current.type };
      }
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // перепроверить эту же строку
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] * level;
      score += points;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 800 - (level - 1) * 70);
      if (dropTimer) {
        clearInterval(dropTimer);
        dropTimer = setInterval(tick, dropInterval);
      }
      updateUI();
      onScoreCb(score);
    }
  }

  function updateUI() {
    const s = document.getElementById('tt-score');
    const l = document.getElementById('tt-lines');
    const lv = document.getElementById('tt-level');
    if (s) s.textContent = score;
    if (l) l.textContent = lines;
    if (lv) lv.textContent = level;
  }

  function gameOver() {
    running = false;
    if (dropTimer) clearInterval(dropTimer);
    draw();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Очки: ' + score, canvas.width / 2, canvas.height / 2 + 20);
  }

  // ==== ОТРИСОВКА ====
  function draw() {
    const dark = document.body.classList.contains('dark');
    ctx.fillStyle = dark ? '#3a3630' : '#cdc1b4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Сетка
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }

    // Доска
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawBlock(c * CELL, r * CELL, COLORS[board[r][c].type]);
        }
      }
    }

    // Текущая фигура
    if (current && running) {
      const shape = getShape(current.type, current.rot);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawBlock((current.x + c) * CELL, (current.y + r) * CELL, COLORS[current.type]);
          }
        }
      }
    }
  }

  function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextType) return;
    const shape = SHAPES[nextType][0];
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          nextCtx.fillStyle = COLORS[nextType];
          nextCtx.fillRect((offsetX + c) * CELL + 1, (offsetY + r) * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKey(e) {
    if (!running || !current) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ф') {
      e.preventDefault();
      if (!collide(current.x - 1, current.y, current.rot)) current.x--;
      draw();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'в') {
      e.preventDefault();
      if (!collide(current.x + 1, current.y, current.rot)) current.x++;
      draw();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'ы') {
      e.preventDefault();
      if (!collide(current.x, current.y + 1, current.rot)) current.y++;
      else lock();
      draw();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'ц') {
      e.preventDefault();
      rotate();
    } else if (e.key === ' ') {
      e.preventDefault();
      // Hard drop
      while (!collide(current.x, current.y + 1, current.rot)) current.y++;
      lock();
      draw();
    }
  }

  function rotate() {
    const newRot = (current.rot + 1) % SHAPES[current.type].length;
    // Простая попытка сдвига при столкновении (wall kick)
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collide(current.x + dx, current.y, newRot)) {
        current.x += dx;
        current.rot = newRot;
        return;
      }
    }
  }

  // ==== СВАЙПЫ ====
  let touchStart = null;
  let touchMoved = false;
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchMoved = false;
  }
  function onTouchEnd(e) {
    if (!touchStart || !running) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const dt = Date.now() - touchStart.time;

    // Короткое касание — поворот
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 200) {
      rotate();
      draw();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // Горизонтальный свайп
      const steps = Math.round(Math.abs(dx) / 30);
      for (let i = 0; i < steps; i++) {
        const nx = dx > 0 ? current.x + 1 : current.x - 1;
        if (!collide(nx, current.y, current.rot)) current.x = nx;
      }
      draw();
    } else if (dy > 40) {
      // Свайп вниз — быстрый сброс
      while (!collide(current.x, current.y + 1, current.rot)) current.y++;
      lock();
      draw();
    }
    touchStart = null;
  }

  // ==== РЕГИСТРАЦИЯ ====
  registerGame('tetris', {
    name: 'Тетрис',
    emoji: '🧱',
    desc: 'Складывай линии, убирай ряды, не дай стакану переполниться.',
    mount,
    unmount,
    formatBest: v => `${v} очков`,
  });
})();
