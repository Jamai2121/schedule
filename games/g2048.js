// ==== 2048 ====
(function () {
  const SIZE = 4;
  let board;       // массив SIZE×SIZE, 0 = пусто
  let score;
  let onScore;
  let gameOverFlag;
  let boardEl;
  let scoreEl;
  let bestEl;

  // Кэш DOM-плиток
  let cells = [];

  function mount(stage, onScoreCb) {
    onScore = onScoreCb;
    stage.innerHTML = '';

    // Верхняя строка: очки
    const top = document.createElement('div');
    top.className = 'game-score';
    top.innerHTML = 'Очки: <strong id="g2048-score">0</strong>';
    stage.appendChild(top);

    // Игровое поле
    boardEl = document.createElement('div');
    boardEl.className = 'g2048-board';
    boardEl.style.width = 'min(400px, 90vw)';
    boardEl.style.height = 'min(400px, 90vw)';
    boardEl.style.position = 'relative';
    boardEl.style.background = 'var(--board-bg)';
    boardEl.style.borderRadius = '10px';
    boardEl.style.padding = '8px';
    boardEl.style.touchAction = 'none';
    boardEl.style.userSelect = 'none';

    // Создаём сетку ячеек
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${SIZE}, 1fr)`;
    grid.style.gap = '8px';
    grid.style.width = '100%';
    grid.style.height = '100%';

    cells = [];
    for (let r = 0; r < SIZE; r++) {
      cells[r] = [];
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.style.borderRadius = '6px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontWeight = '700';
        cell.style.fontSize = 'clamp(18px, 5vw, 32px)';
        cell.style.color = '#776e65';
        cell.style.background = 'var(--board-cell)';
        cell.style.transition = 'background 0.1s';
        grid.appendChild(cell);
        cells[r][c] = cell;
      }
    }
    boardEl.appendChild(grid);
    stage.appendChild(boardEl);

    // Кнопка рестарта
    const btn = document.createElement('button');
    btn.className = 'game-btn';
    btn.textContent = 'Новая игра';
    btn.addEventListener('click', () => start());
    stage.appendChild(btn);

    // Управление
    document.addEventListener('keydown', onKey);
    boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    boardEl.addEventListener('touchmove', onTouchMove, { passive: true });
    boardEl.addEventListener('touchend', onTouchEnd, { passive: true });

    window.__g2048Handlers = { onKey, onTouchStart, onTouchMove, onTouchEnd };

    start();
  }

  function unmount() {
    const h = window.__g2048Handlers;
    if (h) {
      document.removeEventListener('keydown', h.onKey);
      boardEl.removeEventListener('touchstart', h.onTouchStart);
      boardEl.removeEventListener('touchmove', h.onTouchMove);
      boardEl.removeEventListener('touchend', h.onTouchEnd);
      window.__g2048Handlers = null;
    }
  }

  function start() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    gameOverFlag = false;
    addRandom();
    addRandom();
    updateScoreUI();
    render();
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    board[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
  }

  function updateScoreUI() {
    const s = document.getElementById('g2048-score');
    if (s) s.textContent = score;
    if (onScore) onScore(score);
  }

  // ==== ИГРОВАЯ ЛОГИКА ====
  function move(direction) {
    if (gameOverFlag) return;

    const before = JSON.stringify(board);

    // 0 = влево, 1 = вверх, 2 = вправо, 3 = вниз
    for (let i = 0; i < SIZE; i++) {
      const line = getLine(direction, i);
      const merged = mergeLine(line);
      setLine(direction, i, merged);
    }

    const after = JSON.stringify(board);
    if (before !== after) {
      addRandom();
      updateScoreUI();
      render();
      if (!canMove()) {
        gameOverFlag = true;
        showGameOver();
      }
    }
  }

  function getLine(direction, index) {
    const line = [];
    for (let i = 0; i < SIZE; i++) {
      if (direction === 0) line.push(board[index][i]);        // влево
      else if (direction === 1) line.push(board[i][index]);   // вверх
      else if (direction === 2) line.push(board[index][SIZE - 1 - i]); // вправо
      else line.push(board[SIZE - 1 - i][index]);             // вниз
    }
    return line;
  }

  function setLine(direction, index, line) {
    for (let i = 0; i < SIZE; i++) {
      if (direction === 0) board[index][i] = line[i];
      else if (direction === 1) board[i][index] = line[i];
      else if (direction === 2) board[index][SIZE - 1 - i] = line[i];
      else board[SIZE - 1 - i][index] = line[i];
    }
  }

  function mergeLine(line) {
    // Убираем нули
    const clean = line.filter(v => v !== 0);
    // Складываем соседей
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] === clean[i + 1]) {
        clean[i] *= 2;
        score += clean[i];
        clean[i + 1] = 0;
        i++;
      }
    }
    // Убираем нули после сложения
    const merged = clean.filter(v => v !== 0);
    // Добиваем нулями до SIZE
    while (merged.length < SIZE) merged.push(0);
    return merged;
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      }
    }
    return false;
  }

  function showGameOver() {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.borderRadius = '10px';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = '#fff';
    overlay.style.fontWeight = '700';
    overlay.style.fontSize = '22px';
    overlay.style.gap = '8px';
    overlay.innerHTML = `<div>Игра окончена</div><div style="font-size:16px;font-weight:400">Очки: ${score}</div>`;
    boardEl.appendChild(overlay);
  }

  // ==== ОТРИСОВКА ====
  const COLORS = {
    0:    { bg: null,                     color: null },
    2:    { bg: '#eee4da',               color: '#776e65' },
    4:    { bg: '#ede0c8',               color: '#776e65' },
    8:    { bg: '#f2b179',               color: '#f9f6f2' },
    16:   { bg: '#f59563',               color: '#f9f6f2' },
    32:   { bg: '#f67c5f',               color: '#f9f6f2' },
    64:   { bg: '#f65e3b',               color: '#f9f6f2' },
    128:  { bg: '#edcf72',               color: '#f9f6f2' },
    256:  { bg: '#edcc61',               color: '#f9f6f2' },
    512:  { bg: '#edc850',               color: '#f9f6f2' },
    1024: { bg: '#edc53f',               color: '#f9f6f2' },
    2048: { bg: '#edc22e',               color: '#f9f6f2' },
  };
  const DARK_COLORS = {
    2:    { bg: '#3a3530', color: '#e6e8f0' },
    4:    { bg: '#4a443c', color: '#e6e8f0' },
    8:    { bg: '#c07040', color: '#fff' },
    16:   { bg: '#c06030', color: '#fff' },
    32:   { bg: '#b05028', color: '#fff' },
    64:   { bg: '#a04020', color: '#fff' },
  };

  function render() {
    const dark = document.body.classList.contains('dark');
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = board[r][c];
        const cell = cells[r][c];
        if (val === 0) {
          cell.textContent = '';
          cell.style.background = 'var(--board-cell)';
        } else {
          cell.textContent = val;
          let style;
          if (dark && DARK_COLORS[val]) {
            style = DARK_COLORS[val];
          } else {
            style = COLORS[val] || COLORS[2048];
          }
          cell.style.background = style.bg;
          cell.style.color = style.color || '#776e65';
        }
      }
    }
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKey(e) {
    let dir = null;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ф') dir = 0;
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'ц') dir = 1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'в') dir = 2;
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'ы') dir = 3;
    if (dir !== null) {
      e.preventDefault();
      move(dir);
    }
  }

  let touchStart = null;
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }
  function onTouchMove(e) {
    if (!touchStart) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 2 : 0;
    } else {
      dir = dy > 0 ? 3 : 1;
    }
    move(dir);
    touchStart = null;
  }
  function onTouchEnd() {
    touchStart = null;
  }

  // ==== РЕГИСТРАЦИЯ ====
  registerGame('g2048', {
    name: '2048',
    emoji: '🔢',
    desc: 'Сдвигай плитки, складывай одинаковые, доберись до 2048.',
    mount,
    unmount,
    formatBest: v => `${v} очков`,
  });
})();
