export default {
  id: 'pixels',
  name: 'Pixels',
  preview: ['#5d4037', '#757575', '#4caf50'],
  light: {
    '--bg': 'transparent',
    '--card': 'rgba(139, 119, 101, 0.95)', // Цвет земли/дерева
    '--text': '#ffffff',
    '--muted': '#d7ccc8',
    '--hover': 'rgba(93, 64, 55, 1)',
    '--chip-bg': '#4caf50', // Трава
    '--chip-text': '#1b5e20',
    '--border-today': '#ffeb3b', // Золото
    '--modal-bg': 'rgba(0, 0, 0, 0.7)'
  },
  dark: {
    '--bg': 'transparent',
    '--card': 'rgba(66, 66, 66, 0.95)', // Камень
    '--text': '#ffffff',
    '--muted': '#bdbdbd',
    '--hover': 'rgba(33, 33, 33, 1)',
    '--chip-bg': '#00bcd4', // Алмаз
    '--chip-text': '#006064',
    '--border-today': '#ff5722', // Редстоун
    '--modal-bg': 'rgba(0, 0, 0, 0.8)'
  },
  extraCss: `
    /* === ФОН: ДЕНЬ === */
    body[data-style="pixels"]:not(.dark) {
      background-image: url('./icons/pixels-bg.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      
      /* Магия четких пикселей */
      image-rendering: pixelated; 
      image-rendering: crisp-edges;
      
      min-height: 100vh;
      font-family: 'Courier New', Courier, monospace; 
      font-weight: bold;
    }

    /* === ФОН: НОЧЬ === */
    body[data-style="pixels"].dark {
      background-image: url('./icons/pixels-ng.jpg');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      
      image-rendering: pixelated; 
      image-rendering: crisp-edges;
      
      min-height: 100vh;
      font-family: 'Courier New', Courier, monospace; 
      font-weight: bold;
    }

    /* === ИНТЕРФЕЙС: MINECRAFT GUI === */
    
    /* Карточки и окна - деревянные блоки */
    body[data-style="pixels"] .day,
    body[data-style="pixels"] .modal-content,
    body[data-style="pixels"] .auth-card,
    body[data-style="pixels"] .drawer {
      border-radius: 0 !important;
      border: 4px solid #000;
      box-shadow: 8px 8px 0px rgba(0,0,0,0.5);
      backdrop-filter: none;
    }

    /* Пары - слоты инвентаря */
    body[data-style="pixels"] .pair {
      border-radius: 0 !important;
      border: 2px solid rgba(0,0,0,0.5);
      margin-bottom: 4px;
      box-shadow: inset 2px 2px 0px rgba(255,255,255,0.1), inset -2px -2px 0px rgba(0,0,0,0.2);
      transition: transform 0.1s;
    }
    
    body[data-style="pixels"] .pair:hover {
      transform: translate(-2px, -2px);
      box-shadow: 4px 4px 0px rgba(0,0,0,0.5);
      border-color: var(--border-today);
    }

    /* Кнопки - квадратные, вдавливаются при клике */
    body[data-style="pixels"] .icon-btn,
    body[data-style="pixels"] .sg-btn,
    body[data-style="pixels"] .auth-btn {
      border-radius: 0 !important;
      border: 2px solid #000;
      box-shadow: 4px 4px 0px #000;
      text-transform: uppercase;
    }
    
    body[data-style="pixels"] .icon-btn:active,
    body[data-style="pixels"] .auth-btn:active {
      transform: translate(4px, 4px);
      box-shadow: 0px 0px 0px #000;
    }

    /* Заголовки дней - стиль Minecraft (белый текст, черная тень) */
    body[data-style="pixels"] .day-title {
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #ffffff !important; /* Принудительно белый текст */
      border-bottom: 4px solid var(--border-today);
      display: inline-block;
      padding-bottom: 4px;
      margin-bottom: 12px;
      /* Жирная пиксельная обводка вокруг букв */
      text-shadow: 
        -2px -2px 0 #000,  
         2px -2px 0 #000,
        -2px  2px 0 #000,
         2px  2px 0 #000,
         3px  3px 0 rgba(0,0,0,0.5); /* И небольшая тень для объема */
    }

    /* Текущая пара - пульсация (золото днем, редстоун ночью) */
    body[data-style="pixels"] .pair.current {
      border: 2px solid var(--border-today);
      box-shadow: 0 0 10px var(--border-today);
      animation: pulse-pixel 1s infinite alternate;
    }

    @keyframes pulse-pixel {
      from { box-shadow: 0 0 5px var(--border-today); }
      to { box-shadow: 0 0 15px var(--border-today); }
    }

    /* Бейдж ДЗ */
    body[data-style="pixels"] .pair-hw {
      border-radius: 0;
      border: 2px solid #000;
      background: var(--chip-bg);
      color: #000;
      font-size: 10px;
      padding: 2px 4px;
      box-shadow: 2px 2px 0 #000;
    }
    
    body[data-style="pixels"] .pair-progress {
      border-radius: 0;
      background: var(--border-today);
      height: 4px;
      bottom: 0;
    }
  `
};