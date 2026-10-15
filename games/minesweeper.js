// ==== САПЁР ====
(function () {
  // Пресеты сложностей
  const PRESETS = {
    easy:   { name: 'Лёгкая',  rows: 9,  cols: 9,  bombs: 10 },
    medium: { name: 'Средняя', rows: 12, cols: 12, bombs: 25 },
    hard:   { name: 'Сложная', rows: 16, cols: 16, bombs: 50 },
  };

  let rows, cols, bombs;
  let grid;          // { bomb, revealed, flagged, count }
  let revealed, flagged;
  let firstClick;
  let startTime, timer;
  let finished;
  let boardEl;
  let onScoreCb;
  let currentPreset = 'easy';
  let customMode = false;
  let customConfig = { rows: 10, cols: 10, bombs: 15 };
  let resultEl = null;   // плашка победа/проигрыш
  let resultText = '';   // сохраняем текст, если нужно

  function mount(stage, onScore) {
    onScoreCb = onScore;
    stage.innerHTML = '';

    // ==== Выбор сложности ====
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexWrap = 'wrap';
    controls.style.gap = '6px';
    controls.style.justifyContent = 'center';
    controls.style.marginBottom = '12px';

    ['easy', 'medium', 'hard'].forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'sg-btn';
      btn.textContent = PRESETS[key].name;
      btn.dataset.preset = key;
      btn.addEventListener('click', () => {
        currentPreset = key;
        customMode = false;
        applyPreset(key);
        startGame();
        updateActive(controls);
      });
      controls.appendChild(btn);
    });

    const customBtn = document.createElement('button');
    customBtn.className = 'sg-btn';
    customBtn.textContent = 'Кастом';
    customBtn.dataset.preset = 'custom';
    customBtn.addEventListener('click', () => {
      customMode = true;
      openCustomDialog(controls);
      updateActive(controls);
    });
    controls.appendChild(customBtn);

    stage.appendChild(controls);

    // ==== Инфо-строка ====
    const info = document.createElement('div');
    info.className = 'game-score';
    info.innerHTML = `
      <span>Мины: <strong id="ms-mines">0</strong></span>
      <span>Время: <strong id="ms-time">0</strong> с</span>
    `;
    stage.appendChild(info);

    // ==== Поле ====
    boardEl = document.createElement('div');
    boardEl.style.display = 'grid';
    boardEl.style.gap = '2px';
    boardEl.style.padding = '6px';
    boardEl.style.background = 'var(--board-bg)';
    boardEl.style.borderRadius = '10px';
    boardEl.style.touchAction = 'manipulation';
    boardEl.style.userSelect = 'none';
    boardEl.style.maxWidth = '95vw';
    boardEl.style.overflow = 'auto';
    stage.appendChild(boardEl);

    // ==== Кнопка «Заново» ====
    const restart = document.createElement('button');
    restart.className = 'game-btn secondary';
    restart.textContent = 'Заново';
    restart.style.marginTop = '10px';
    restart.addEventListener('click', () => startGame());
    stage.appendChild(restart);

    // Правая кнопка мыши — флаг
    boardEl.addEventListener('contextmenu', e => e.preventDefault());
    // Долгое нажатие на телефоне — флаг
    boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    boardEl.addEventListener('touchend', onTouchEnd);

    // Стартуем с выбранного пресета
    applyPreset(currentPreset);
    startGame();
    updateActive(controls);
  }

  function unmount() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (p) {
      rows = p.rows; cols = p.cols; bombs = p.bombs;
    } else {
      rows = customConfig.rows;
      cols = customConfig.cols;
      bombs = customConfig.bombs;
    }
  }

  function updateActive(container) {
    const target = customMode ? 'custom' : currentPreset;
    container.querySelectorAll('.sg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === target);
    });
  }

  function startGame() {
    // Удаляем старую плашку
    if (resultEl) {
      resultEl.remove();
      resultEl = null;
    }

    // Инициализация
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = { bomb: false, revealed: false, flagged: false, count: 0 };
      }
    }
    revealed = 0;
    flagged = 0;
    firstClick = true;
    finished = false;

    if (timer) clearInterval(timer);
    startTime = null;

    document.getElementById('ms-mines').textContent = bombs;
    document.getElementById('ms-time').textContent = '0';

    renderBoard();
  }

  function placeBombs(safeR, safeC) {
    let placed = 0;
    while (placed < bombs) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      // Не ставим мину в первую клетку и её соседей
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (grid[r][c].bomb) continue;
      grid[r][c].bomb = true;
      placed++;
    }
    // Считаем соседей
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].bomb) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].bomb) count++;
          }
        }
        grid[r][c].count = count;
      }
    }
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const cellSize = Math.min(
      Math.floor((Math.min(window.innerWidth * 0.9, 500) - 20) / cols) - 2,
      40
    );
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontWeight = '700';
        cell.style.fontSize = Math.max(12, cellSize * 0.55) + 'px';
        cell.style.borderRadius = '4px';
        cell.style.cursor = 'pointer';
        cell.style.userSelect = 'none';
        cell.style.background = 'var(--board-cell)';
        cell.style.color = 'var(--text)';

        cell.addEventListener('click', () => onCellClick(r, c));
        cell.addEventListener('contextmenu', e => {
          e.preventDefault();
          onCellRightClick(r, c);
        });

        boardEl.appendChild(cell);
      }
    }
  }

  function cellAt(r, c) {
    return boardEl.children[r * cols + c];
  }

  function onCellClick(r, c) {
    if (finished) return;
    const cell = grid[r][c];
    if (cell.flagged || cell.revealed) return;

    if (firstClick) {
      placeBombs(r, c);
      firstClick = false;
      startTimer();
    }

    if (cell.bomb) {
      cell.revealed = true;
      endGame(false);
      return;
    }

    reveal(r, c);
    checkWin();
  }

  function onCellRightClick(r, c) {
    if (finished) return;
    const cell = grid[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flagged += cell.flagged ? 1 : -1;
    updateCellUI(r, c);
    document.getElementById('ms-mines').textContent = bombs - flagged;
  }

  function reveal(r, c) {
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    revealed++;
    updateCellUI(r, c);

    // Если пустая — раскрываем соседей
    if (cell.count === 0 && !cell.bomb) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            reveal(nr, nc);
          }
        }
      }
    }
  }

  const NUM_COLORS = ['', '#1e40af', '#166534', '#b91c1c', '#7c2d12', '#7f1d1d', '#0e7490', '#1e293b', '#6b7280'];

  function updateCellUI(r, c) {
    const cell = grid[r][c];
    const el = cellAt(r, c);
    if (!el) return;

    if (cell.revealed) {
      el.style.background = 'var(--hover)';
      if (cell.bomb) {
        el.textContent = '💥';
      } else if (cell.count > 0) {
        el.textContent = cell.count;
        el.style.color = NUM_COLORS[cell.count] || 'var(--text)';
      } else {
        el.textContent = '';
      }
    } else if (cell.flagged) {
      el.textContent = '🚩';
      el.style.color = '';
    } else {
      el.textContent = '';
      el.style.color = 'var(--text)';
    }
  }

  function startTimer() {
    startTime = Date.now();
    timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      const el = document.getElementById('ms-time');
      if (el) el.textContent = sec;
    }, 500);
  }

  function checkWin() {
    const totalSafe = rows * cols - bombs;
    if (revealed >= totalSafe) {
      endGame(true);
    }
  }

  function endGame(won) {
    finished = true;
    if (timer) clearInterval(timer);

    const sec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    if (won) {
      // Показать все флаги правильные
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c].bomb && !grid[r][c].flagged) {
            grid[r][c].flagged = true;
            updateCellUI(r, c);
          }
        }
      }
      // Рекорд = время в секундах, но чем меньше — тем лучше.
      // Храним как "отрицательное" время, чтобы работала логика max().
      const record = Math.max(1, 1000000 - sec);
      if (onScoreCb) onScoreCb(record);
    } else {
      // Показать все мины
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c].bomb) {
            grid[r][c].revealed = true;
            updateCellUI(r, c);
          }
        }
      }
    }

       // Плашка
    resultEl = document.createElement('div');
    resultEl.style.marginTop = '12px';
    resultEl.style.padding = '14px';
    resultEl.style.borderRadius = '10px';
    resultEl.style.textAlign = 'center';
    resultEl.style.background = won ? '#166534' : '#991b1b';
    resultEl.style.color = '#fff';
    resultEl.style.fontWeight = '700';

    // Показываем размер поля и количество мин
    const sizeInfo = `${rows}×${cols}, ${bombs} мин`;

    if (won) {
      // Находим лучший рекорд для этой конфигурации в localStorage
      const bestKey = `minesweeper:${rows}x${cols}:${bombs}`;
      const prev = JSON.parse(localStorage.getItem('minesweeper-best') || '{}');
      const prevTime = prev[bestKey];
      const isRecord = !prevTime || sec < prevTime;
      if (isRecord) {
        prev[bestKey] = sec;
        localStorage.setItem('minesweeper-best', JSON.stringify(prev));
      }
      resultEl.innerHTML = `🏆 Победа!<br>${sizeInfo}<br>Время: ${sec} с${isRecord ? ' · 🎉 новый рекорд' : ''}`;
    } else {
      resultEl.innerHTML = `💥 Проигрыш. Попробуй ещё!<br>${sizeInfo}`;
    }

    boardEl.parentElement.appendChild(resultEl);
  }

  // ==== ДОЛГОЕ НАЖАТИЕ ДЛЯ ФЛАГА ====
  let touchTimer = null;
  let touchCell = null;

  function onTouchStart(e) {
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el || !el.dataset.r) return;
    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);
    touchCell = { r, c };
    touchTimer = setTimeout(() => {
      onCellRightClick(r, c);
      touchCell = null;
    }, 500);
  }

  function onTouchEnd(e) {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    if (touchCell) {
      // Было короткое нажатие — обычный клик
      // (click событие тоже сработает, но не дадим двойного срабатывания)
    }
    touchCell = null;
  }

  // ==== ДИАЛОГ КАСТОМА ====
  function openCustomDialog(controls) {
    const rowsIn = prompt('Строк (5–20):', customConfig.rows);
    if (rowsIn === null) return;
    const colsIn = prompt('Столбцов (5–20):', customConfig.cols);
    if (colsIn === null) return;
    const bombsIn = prompt('Бомб:', customConfig.bombs);
    if (bombsIn === null) return;

    const r = Math.max(5, Math.min(20, parseInt(rowsIn) || 10));
    const c = Math.max(5, Math.min(20, parseInt(colsIn) || 10));
    const maxBombs = r * c - 9;
    const b = Math.max(1, Math.min(maxBombs, parseInt(bombsIn) || 15));

    customConfig = { rows: r, cols: c, bombs: b };
    applyPreset('custom');
    startGame();
  }

  // ==== РЕГИСТРАЦИЯ ====
  registerGame('minesweeper', {
    name: 'Сапёр',
    emoji: '💣',
    desc: 'Открывай клетки, не попадай на мины, ставь флажки.',
    mount,
    unmount,
    formatBest: () => {
      // Читаем лучший результат среди всех конфигураций
      const prev = JSON.parse(localStorage.getItem('minesweeper-best') || '{}');
      const times = Object.values(prev);
      if (times.length === 0) return null;
      const best = Math.min(...times);
      if (best < 60) return `${best} с`;
      const m = Math.floor(best / 60);
      const s = best % 60;
      return `${m} мин ${s} с`;
    },
    hasBest: () => {
      const prev = JSON.parse(localStorage.getItem('minesweeper-best') || '{}');
      return Object.keys(prev).length > 0;
    },
  });
})();
