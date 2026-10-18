// ==== TECHNO_DREAM — Этап 6 (v3) ====
// HP игрока, урон, неуязвимость, поражение + свечение пуль
// + вспышка по силуэту (ctx.filter) + сдвиг спрайтов вверх

(function () {
  // ==== КОНСТАНТЫ ====
  const TILE = 32;
  const ROOM_COLS = 15;
  const ROOM_ROWS = 9;
  const WORLD_W = ROOM_COLS * TILE;
  const WORLD_H = ROOM_ROWS * TILE;
  const TARGET_FPS = 60;

  const PLAYER_SIZE = 24;
  const PLAYER_SPEED = 4.5 * TILE;
  const PLAYER_MAX_HP = 6;
  const INVULN_TIME = 1.0;
  const HIT_FLASH_TIME = 0.15;
  const BLINK_INTERVAL = 0.08;

  const SPRITE_Y_OFFSET = -3;   // сдвиг спрайта вверх (было -16, стало -19)

  const BULLET_SIZE = 16;
  const BULLET_SPEED = 5 * TILE;
  const BULLET_COOLDOWN = 0.4;
  const BULLET_LIFETIME = 3;
  const BULLET_GLOW = '34, 211, 238';

  const ENEMY_SIZE = 24;
  const ENEMY_SPEED = 2 * TILE;
  const ENEMY_HP = 3;
  const ENEMY_HIT_FLASH = 0.12;
  const ENEMY_DAMAGE = 1;

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
    hpFull: '#ef4444',
    hpEmpty: 'rgba(0,0,0,0.5)',
  };

  // ==== СОСТОЯНИЕ ====
  let canvas, ctx;
  let lastTime = 0;
  let accumulator = 0;
  const STEP = 1000 / TARGET_FPS;

  let paused = false;
  let gameTime = 0;
  let gameOver = false;

  let room = [];
  let doors = { top: true, bottom: true, left: true, right: true };

  const player = {
    x: 0,
    y: 0,
    speed: PLAYER_SPEED,
    dir: { x: 0, y: 1 },
    moving: false,
    shootCooldown: 0,
    hp: PLAYER_MAX_HP,
    invuln: 0,
    hitFlash: 0,
    blinkTimer: 0,
    visible: true,
  };

  const bullets = [];
  const enemies = [];

  // Спрайты
  const droidImg = new Image();
  droidImg.src = './sprites/droid-idle.png';

  const bulletImg = new Image();
  bulletImg.src = './sprites/bullet.png';

  const bugImg = new Image();
  bugImg.src = './sprites/bag_0.png';

  // Ввод
  const keys = { w: false, a: false, s: false, d: false };
  const shootKeys = { up: false, down: false, left: false, right: false };

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

    startGame();

    requestAnimationFrame(loop);
  }

  function startGame() {
    gameOver = false;
    paused = false;

    generateRoom();

    const midCol = Math.floor(ROOM_COLS / 2);
    const midRow = Math.floor(ROOM_ROWS / 2);
    player.x = midCol * TILE + TILE / 2;
    player.y = midRow * TILE + TILE / 2;
    player.hp = PLAYER_MAX_HP;
    player.invuln = 0;
    player.hitFlash = 0;
    player.blinkTimer = 0;
    player.visible = true;
    player.shootCooldown = 0;
    player.dir = { x: 0, y: 1 };

    bullets.length = 0;
    enemies.length = 0;

    spawnEnemy();

    updateHpHUD();

    document.getElementById('pause-overlay').classList.add('hidden');
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

  // ==== СПАВН ВРАГА ====
  function spawnEnemy() {
    const candidates = [];
    for (let r = 1; r < ROOM_ROWS - 1; r++) {
      for (let c = 1; c < ROOM_COLS - 1; c++) {
        if (room[r][c] !== TILE_FLOOR) continue;
        const ex = c * TILE + TILE / 2;
        const ey = r * TILE + TILE / 2;
        const dist = Math.hypot(ex - player.x, ey - player.y);
        if (dist > TILE * 4) candidates.push({ x: ex, y: ey });
      }
    }
    if (candidates.length === 0) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    enemies.push({
      x: spot.x,
      y: spot.y,
      hp: ENEMY_HP,
      maxHp: ENEMY_HP,
      speed: ENEMY_SPEED,
      flash: 0,
    });
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
  function tileAt(worldX, worldY) {
    const c = Math.floor(worldX / TILE);
    const r = Math.floor(worldY / TILE);
    if (r < 0 || r >= ROOM_ROWS || c < 0 || c >= ROOM_COLS) return TILE_WALL;
    return room[r][c];
  }

  function isWalkable(worldX, worldY) {
    return tileAt(worldX, worldY) === TILE_FLOOR;
  }

  function canStand(cx, cy, size) {
    const half = size / 2;
    return isWalkable(cx - half, cy - half) &&
           isWalkable(cx + half, cy - half) &&
           isWalkable(cx - half, cy + half) &&
           isWalkable(cx + half, cy + half);
  }

  function bulletHitsWall(cx, cy) {
    return !isWalkable(cx, cy);
  }

  // ==== ИГРОВОЙ ЦИКЛ ====
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let delta = timestamp - lastTime;
    lastTime = timestamp;
    if (delta > 100) delta = 100;

    if (!paused && !gameOver) {
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
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    checkBulletEnemyCollisions();
    checkPlayerEnemyCollisions();
    updatePlayerInvuln(dt);
  }

  function updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    player.moving = dx !== 0 || dy !== 0;

    if (player.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      const step = player.speed * dt;
      const newX = player.x + dx * step;
      const newY = player.y + dy * step;

      if (canStand(newX, player.y, PLAYER_SIZE)) player.x = newX;
      if (canStand(player.x, newY, PLAYER_SIZE)) player.y = newY;

      player.dir.x = dx;
      player.dir.y = dy;
    }

    if (player.shootCooldown > 0) {
      player.shootCooldown -= dt;
    }

    if (player.shootCooldown <= 0) {
      let sx = 0, sy = 0;
      if (shootKeys.up) sy -= 1;
      if (shootKeys.down) sy += 1;
      if (shootKeys.left) sx -= 1;
      if (shootKeys.right) sx += 1;

      if (sx !== 0 || sy !== 0) {
        fire(sx, sy);
        player.shootCooldown = BULLET_COOLDOWN;
      }
    }
  }

  function updatePlayerInvuln(dt) {
    if (player.invuln > 0) {
      player.invuln -= dt;
      player.blinkTimer += dt;
      if (player.blinkTimer >= BLINK_INTERVAL) {
        player.blinkTimer = 0;
        player.visible = !player.visible;
      }
      if (player.invuln <= 0) {
        player.visible = true;
        player.invuln = 0;
      }
    }
    if (player.hitFlash > 0) {
      player.hitFlash -= dt;
      if (player.hitFlash < 0) player.hitFlash = 0;
    }
  }

  function fire(sx, sy) {
    const offset = PLAYER_SIZE / 2 + BULLET_SIZE / 2 - 2;
    const bx = player.x + sx * offset;
    const by = player.y + sy * offset;
    bullets.push({
      x: bx,
      y: by,
      vx: sx * BULLET_SPEED,
      vy: sy * BULLET_SPEED,
      life: BULLET_LIFETIME,
    });
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || bulletHitsWall(b.x, b.y)) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    enemies.forEach(e => {
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      dx /= len;
      dy /= len;

      const step = e.speed * dt;
      const newX = e.x + dx * step;
      const newY = e.y + dy * step;

      if (canStand(newX, e.y, ENEMY_SIZE)) e.x = newX;
      if (canStand(e.x, newY, ENEMY_SIZE)) e.y = newY;

      if (e.flash > 0) e.flash -= dt;
    });
  }

  function checkBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let bulletUsed = false;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const half = ENEMY_SIZE / 2;
        if (b.x > e.x - half && b.x < e.x + half &&
            b.y > e.y - half && b.y < e.y + half) {
          e.hp -= 1;
          e.flash = ENEMY_HIT_FLASH;
          bulletUsed = true;
          if (e.hp <= 0) {
            enemies.splice(j, 1);
          }
          break;
        }
      }

      if (bulletUsed) bullets.splice(i, 1);
    }
  }

  function checkPlayerEnemyCollisions() {
    if (player.invuln > 0) return;

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const halfE = ENEMY_SIZE / 2;
      const halfP = PLAYER_SIZE / 2;
      if (player.x + halfP > e.x - halfE &&
          player.x - halfP < e.x + halfE &&
          player.y + halfP > e.y - halfE &&
          player.y - halfP < e.y + halfE) {
        damagePlayer(ENEMY_DAMAGE);
        return;
      }
    }
  }

  function damagePlayer(amount) {
    player.hp -= amount;
    player.invuln = INVULN_TIME;
    player.hitFlash = HIT_FLASH_TIME;
    player.blinkTimer = 0;
    player.visible = false;

    updateHpHUD();

    if (player.hp <= 0) {
      player.hp = 0;
      triggerGameOver();
    }
  }

  function updateHpHUD() {
    const icons = document.querySelectorAll('#hud-hp .hp-icon');
    let hp = player.hp;
    icons.forEach((img, i) => {
      const slotHp = Math.max(0, Math.min(2, hp - i * 2));
      let src;
      if (slotHp >= 2) src = './sprites/hp_full.png';
      else if (slotHp === 1) src = './sprites/hp_pol.png';
      else src = './sprites/hp_nool.png';

      const wasDifferent = !img.src.endsWith(src.split('/').pop());
      img.src = src;

      if (wasDifferent) {
        img.classList.remove('hit');
        void img.offsetWidth;
        img.classList.add('hit');
      }
    });
  }

  function triggerGameOver() {
    gameOver = true;
    paused = true;

    const overlay = document.getElementById('pause-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="overlay-content">
        <h2 class="defeat">Поражение</h2>
        <button class="game-btn" id="restart-btn">Заново</button>
        <a href="../../games/" class="game-btn secondary">Выйти</a>
      </div>
    `;
    document.getElementById('restart-btn').addEventListener('click', () => {
      overlay.innerHTML = `
        <div class="overlay-content">
          <h2>Пауза</h2>
          <button class="game-btn" id="resume-btn">Продолжить</button>
          <a href="../../games/" class="game-btn secondary">Выйти</a>
        </div>
      `;
      overlay.classList.add('hidden');
      document.getElementById('resume-btn').addEventListener('click', togglePause);
      startGame();
    });
  }

  // ==== ОТРИСОВКА ====
  function render() {
    drawFloor();
    drawWalls();
    drawDoors();
    drawBullets();
    drawEnemies();
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

  function drawBullets() {
    bullets.forEach(b => {
      const glowR = BULLET_SIZE * 1.1;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
      grad.addColorStop(0, `rgba(${BULLET_GLOW}, 0.55)`);
      grad.addColorStop(0.6, `rgba(${BULLET_GLOW}, 0.2)`);
      grad.addColorStop(1, `rgba(${BULLET_GLOW}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(
        bulletImg,
        b.x - BULLET_SIZE / 2,
        b.y - BULLET_SIZE / 2,
        BULLET_SIZE,
        BULLET_SIZE
      );
    });
  }

  function drawEnemies() {
    enemies.forEach(e => {
      // Тень
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 7, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Спрайт (со сдвигом вверх)
      ctx.drawImage(bugImg, e.x - 16, e.y - 16 + SPRITE_Y_OFFSET, 32, 32);

      // Вспышка по силуэту
      if (e.flash > 0) {
        ctx.save();
        ctx.filter = 'brightness(0) invert(1)';
        ctx.globalAlpha = e.flash / ENEMY_HIT_FLASH;
        ctx.drawImage(bugImg, e.x - 16, e.y - 16 + SPRITE_Y_OFFSET, 32, 32);
        ctx.restore();
      }

      // HP-полоска
      const hpW = 28;
      const hpH = 4;
      const hpX = e.x - hpW / 2;
      const hpY = e.y - 22;
      ctx.fillStyle = COLORS.hpEmpty;
      ctx.fillRect(hpX, hpY, hpW, hpH);
      ctx.fillStyle = COLORS.hpFull;
      const hpFillW = Math.max(0, (e.hp / e.maxHp) * hpW);
      ctx.fillRect(hpX, hpY, hpFillW, hpH);
    });
  }

  function drawPlayer() {
    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Мерцание — пропускаем кадр, если невидим
    if (player.invuln > 0 && !player.visible) return;

    // Спрайт (со сдвигом вверх)
    ctx.drawImage(droidImg, player.x - 16, player.y - 16 + SPRITE_Y_OFFSET, 32, 32);

    // Вспышка по силуэту
    if (player.hitFlash > 0) {
      ctx.save();
      ctx.filter = 'brightness(0) invert(1)';
      ctx.globalAlpha = player.hitFlash / HIT_FLASH_TIME;
      ctx.drawImage(droidImg, player.x - 16, player.y - 16 + SPRITE_Y_OFFSET, 32, 32);
      ctx.restore();
    }
  }

  function drawDebug() {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(138, 143, 168, 0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `v0.0.6 · HP: ${player.hp}/${PLAYER_MAX_HP} · invuln: ${player.invuln.toFixed(1)}`,
      6, 6
    );
  }

  // ==== УПРАВЛЕНИЕ ====
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!gameOver) togglePause();
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = true;
    if (k === 'a' || k === 'ф') keys.a = true;
    if (k === 's' || k === 'ы') keys.s = true;
    if (k === 'd' || k === 'в') keys.d = true;

    if (e.key === 'ArrowUp')    { e.preventDefault(); shootKeys.up = true; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); shootKeys.down = true; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); shootKeys.left = true; }
    if (e.key === 'ArrowRight') { e.preventDefault(); shootKeys.right = true; }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = false;
    if (k === 'a' || k === 'ф') keys.a = false;
    if (k === 's' || k === 'ы') keys.s = false;
    if (k === 'd' || k === 'в') keys.d = false;

    if (e.key === 'ArrowUp')    shootKeys.up = false;
    if (e.key === 'ArrowDown')  shootKeys.down = false;
    if (e.key === 'ArrowLeft')  shootKeys.left = false;
    if (e.key === 'ArrowRight') shootKeys.right = false;
  }

  function togglePause() {
    if (gameOver) return;
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
