// ==== ЗМЕЙКА ====
(function () {
  const CELL = 20;       // размер клетки в px
  const COLS = 20;       // ширина поля
  const ROWS = 20;       // высота поля
  const START_SPEED = 150; // мс между шагами
  const MIN_SPEED = 70;

  let canvas, ctx;
  let snake, dir, nextDir, food, score, speed, timer, running;

  function mount(stage, onScore) {
    stage.innerHTML = '';

    // Очки
    const scoreEl = document.createElement('div');
    scoreEl.className = 'game-score';
    scoreEl.innerHTML = 'Очки: <strong id="snake-score">0</strong>';
    stage.appendChild(scoreEl);

    // Canvas
    canvas = document.createElement('canvas');
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    canvas.style.borderRadius = '10px';
    canvas.style.maxWidth = '100%';
    canvas.style.touchAction = 'none';
    stage.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Кнопка старта/рестарта
    const btn = document.createElement('button');
    btn.className = 'game-btn';
    btn.textContent = 'Начать';
    btn.addEventListener('click', () => start(onScore, btn));
    stage.appendChild(btn);

    // Управление клавиатурой
    document.addEventListener('keydown', onKey);
    // Управление свайпами
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    // Начальная отрисовка
    reset();
    draw();

    // Сохраняем ссылки для unmount
    window.__snakeHandlers = { onKey, onTouchStart, onTouchMove, onTouchEnd };
  }

  function unmount() {
    running = false;
    if (timer) clearInterval(timer);
    const h = window.__snakeHandlers;
    if (h) {
      document.removeEventListener('keydown', h.onKey);
      canvas.removeEventListener('touchstart', h.onTouchStart);
      canvas.removeEventListener('touchmove', h.onTouchMove);
      canvas.removeEventListener('touchend', h.onTouchEnd);
      window.__snakeHandlers = null;
    }
  }

  function reset() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = START_SPEED;
    running = false;
    placeFood();
  }

  function start(onScore, btn) {
    reset();
    running = true;
    btn.textContent = 'Рестарт';
    const scoreEl = document.getElementById('snake-score');
    if (scoreEl) scoreEl.textContent = '0';
    onScore(0);

    if (timer) clearInterval(timer);
    timer = setInterval(tick, speed);
  }

  function tick() {
    if (!running) return;

    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Стены
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      return gameOver();
    }
    // Себя
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return gameOver();
      }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      const scoreEl = document.getElementById('snake-score');
      if (scoreEl) scoreEl.textContent = score;
      if (window.__snakeOnScore) window.__snakeOnScore(score);
      placeFood();

      // Ускорение
      speed = Math.max(MIN_SPEED, speed - 4);
      clearInterval(timer);
      timer = setInterval(tick, speed);
    } else {
      snake.pop();
    }

    draw();
  }

  function gameOver() {
    running = false;
    if (timer) clearInterval(timer);
    draw();
    // Записать рекорд — onScore вызвался при каждом яблоке, но продублируем финальный
    if (window.__snakeOnScore) window.__snakeOnScore(score);
    // Показать надпись
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Очки: ' + score, canvas.width / 2, canvas.height / 2 + 20);
  }

  function placeFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function draw() {
    const dark = document.body.classList.contains('dark');
    const bgColor = dark ? '#3a3630' : '#cdc1b4';
    const headColor = dark ? '#86efac' : '#16a34a';
    const bodyColor = dark ? '#4ade80' : '#22c55e';
    const foodColor = dark ? '#f87171' : '#dc2626';

    // Фон
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Сетка
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
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

    // Еда
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Змейка
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? headColor : bodyColor;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKey(e) {
    if (!running) return;
    const map = {
      ArrowUp:    { x: 0, y: -1 },
      ArrowDown:  { x: 0, y: 1 },
      ArrowLeft:  { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const nd = map[e.key];
    if (!nd) return;
    e.preventDefault();
    // Нельзя развернуться на 180°
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  let touchStart = null;
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }
  function onTouchMove(e) {
    if (!touchStart || !running) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    touchStart = null;
  }
  function onTouchEnd() {
    touchStart = null;
  }

  // ==== РЕГИСТРАЦИЯ ====
  registerGame('snake', {
    name: 'Змейка',
    emoji: '🐍',
    desc: 'Собирай яблоки, расти и не врезайся в стены или в себя.',
    mount: (stage, onScore) => {
      window.__snakeOnScore = onScore;
      mount(stage, onScore);
    },
    unmount,
    formatBest: v => `${v} очков`,
  });
})();
