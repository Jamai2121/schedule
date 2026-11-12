export default {
  id: 'samurai',
  name: 'Путь Самурая',
  preview: ['#fce4ec', '#1b5e20', '#d32f2f'], // Сакура, Бамбук, Киноварь
  light: {
    '--bg': 'transparent',
    '--card': 'rgba(255, 255, 255, 0.85)',
    '--text': '#3e2723', // Темно-коричневый (цвет дерева)
    '--muted': '#795548',
    '--hover': 'rgba(252, 228, 236, 0.95)', // Розоватый при наведении
    '--chip-bg': '#f8bbd0',
    '--chip-text': '#880e4f',
    '--border-today': '#d81b60', // Яркий розово-красный (сакура)
    '--modal-bg': 'rgba(255, 255, 255, 0.9)'
  },
  dark: {
    '--bg': 'transparent',
    '--card': 'rgba(15, 25, 20, 0.85)', // Темно-зеленый оттенок
    '--text': '#e0f2f1', // Лунный свет
    '--muted': '#80cbc4',
    '--hover': 'rgba(27, 94, 32, 0.6)', // Бамбуковый при наведении
    '--chip-bg': '#004d40',
    '--chip-text': '#a7ffeb',
    '--border-today': '#00e676', // Неоновый бамбук/луна
    '--modal-bg': 'rgba(10, 20, 15, 0.95)'
  },
  extraCss: `
    /* === ФОН === */
    body[data-style="samurai"]:not(.dark) {
      background-image: url('./icons/samurai-day.jpg'); 
      background-size: cover; background-position: center; background-attachment: fixed;
      min-height: 100vh;
    }
    body[data-style="samurai"].dark {
      background-image: url('./icons/samurai-night.jpg');
      background-size: cover; background-position: center; background-attachment: fixed;
      min-height: 100vh;
    }

    /* === ШРИФТЫ === */
    body[data-style="samurai"] {
      font-family: 'Georgia', 'Yu Mincho', serif;
    }

    /* === ДЕНЬ: КНОПКИ-САКУРА === */
    body[data-style="samurai"]:not(.dark) .icon-btn,
    body[data-style="samurai"]:not(.dark) .sg-btn,
    body[data-style="samurai"]:not(.dark) .auth-btn,
    body[data-style="samurai"]:not(.dark) .drawer-item {
      background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(252,228,236,0.8) 100%);
      border: 1px solid #f48fb1; /* Розовая рамка */
      border-radius: 2px;
      box-shadow: 2px 2px 8px rgba(216, 27, 96, 0.15);
      color: #880e4f;
      backdrop-filter: blur(4px);
      transition: all 0.2s;
    }
    
    body[data-style="samurai"]:not(.dark) .icon-btn:hover,
    body[data-style="samurai"]:not(.dark) .sg-btn:hover {
      background: linear-gradient(135deg, rgba(252,228,236,0.9) 0%, rgba(248,187,208,1) 100%);
      transform: translateY(-2px);
      box-shadow: 3px 3px 12px rgba(216, 27, 96, 0.25);
      border-color: #d81b60;
    }

    /* Вертикальная веточка сакуры слева на кнопке */
    body[data-style="samurai"]:not(.dark) .icon-btn::before {
      content: ''; position: absolute; top: 15%; bottom: 15%; left: 3px; width: 2px;
      background: #d81b60; opacity: 0.6; border-radius: 2px;
    }

    /* === НОЧЬ: КНОПКИ-БАМБУК === */
    body[data-style="samurai"].dark .icon-btn,
    body[data-style="samurai"].dark .sg-btn,
    body[data-style="samurai"].dark .auth-btn,
    body[data-style="samurai"].dark .drawer-item {
      background: linear-gradient(135deg, rgba(20,40,30,0.8) 0%, rgba(10,25,20,0.9) 100%);
      border: 1px solid #2e7d32; /* Темно-зеленая рамка */
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(0, 230, 118, 0.1), inset 0 0 5px rgba(0,0,0,0.5);
      color: #a7ffeb;
      backdrop-filter: blur(4px);
      transition: all 0.2s;
    }

    body[data-style="samurai"].dark .icon-btn:hover,
    body[data-style="samurai"].dark .sg-btn:hover {
      border-color: #00e676;
      box-shadow: 0 0 15px rgba(0, 230, 118, 0.3), inset 0 0 8px rgba(0, 230, 118, 0.1);
      transform: translateY(-2px);
    }

    /* Светящаяся бамбуковая полоска слева */
    body[data-style="samurai"].dark .icon-btn::before {
      content: ''; position: absolute; top: 15%; bottom: 15%; left: 3px; width: 2px;
      background: #00e676; opacity: 0.8; box-shadow: 0 0 5px #00e676; border-radius: 2px;
    }

    /* === ОБЩИЕ СТИЛИ (Стекло и Карточки) === */
    body[data-style="samurai"] .day,
    body[data-style="samurai"] .modal-content,
    body[data-style="samurai"] .auth-card,
    body[data-style="samurai"] .drawer {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 4px;
    }
    
    body[data-style="samurai"]:not(.dark) .day,
    body[data-style="samurai"]:not(.dark) .modal-content {
      border: 1px solid rgba(244, 143, 177, 0.4);
      box-shadow: 0 10px 30px rgba(216, 27, 96, 0.1);
    }

    body[data-style="samurai"].dark .day,
    body[data-style="samurai"].dark .modal-content {
      border: 1px solid rgba(46, 125, 50, 0.3);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    body[data-style="samurai"] .pair {
      backdrop-filter: blur(8px);
      border-left: 3px solid transparent;
    }

    /* Заголовки дней */
    body[data-style="samurai"] .day-title {
      letter-spacing: 1px;
      display: inline-block;
      padding-bottom: 4px;
      margin-bottom: 15px;
      text-transform: uppercase;
      font-size: 13px;
    }
    body[data-style="samurai"]:not(.dark) .day-title {
      border-bottom: 2px solid #d81b60;
      color: #880e4f;
    }
    body[data-style="samurai"].dark .day-title {
      border-bottom: 2px solid #00e676;
      color: #a7ffeb;
      text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
    }

    /* Текущая пара */
    body[data-style="samurai"] .pair.current {
      border-left: 3px solid var(--border-today);
    }
    body[data-style="samurai"]:not(.dark) .pair.current {
      background: linear-gradient(90deg, rgba(252, 228, 236, 0.4) 0%, transparent 100%);
    }
    body[data-style="samurai"].dark .pair.current {
      background: linear-gradient(90deg, rgba(0, 230, 118, 0.1) 0%, transparent 100%);
    }

    /* Бейдж ДЗ - Печать */
    body[data-style="samurai"] .pair-hw {
      background: var(--border-today);
      color: white;
      border-radius: 2px;
      font-family: sans-serif;
      font-size: 10px;
      padding: 2px 5px;
      writing-mode: vertical-rl; /* Вертикальный текст */
      text-orientation: upright;
      height: 28px;
      line-height: 10px;
      box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
      margin-left: 8px;
    }
    body[data-style="samurai"].dark .pair-hw {
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
    }
  `
};