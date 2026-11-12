export default {
  id: 'neon',
  name: 'Неон',
  preview: ['#05010a', '#0f0518', '#ff00ea'],
  light: {
    '--bg': '#f2f4ff',
    '--card': '#ffffff',
    '--text': '#17193a',
    '--muted': '#6a6f92',
    '--hover': '#e6e9ff',
    '--chip-bg': '#dcd9ff',
    '--chip-text': '#5b21b6',
    '--border-today': '#7c3aed',
    '--modal-bg': 'rgba(20,20,50,0.45)'
  },
  dark: {
    '--bg': '#05010a',
    '--card': '#0f0518',
    '--text': '#f0f8ff',
    '--muted': '#9d7bb0',
    '--hover': '#1f0b2e',
    '--chip-bg': '#2a0f40',
    '--chip-text': '#ff77ff',
    '--border-today': '#ff00ea',
    '--modal-bg': 'rgba(5,0,10,0.85)'
  },
  extraCss: `
    /* Лазерная сетка на фоне */
    body[data-style="neon"].dark {
      background-image: 
        linear-gradient(rgba(255, 0, 234, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.07) 1px, transparent 1px);
      background-size: 40px 40px;
      background-position: center center;
    }

    /* Неоновые рамки и свечение для кнопок */
    body[data-style="neon"].dark .icon-btn, 
    body[data-style="neon"].dark .auth-btn, 
    body[data-style="neon"].dark .sg-btn,
    body[data-style="neon"].dark .admin-btn {
      border: 1px solid rgba(255, 0, 234, 0.5);
      box-shadow: 0 0 8px rgba(255, 0, 234, 0.3), inset 0 0 5px rgba(255, 0, 234, 0.2);
      text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
      transition: all 0.2s ease;
    }
    body[data-style="neon"].dark .icon-btn:hover,
    body[data-style="neon"].dark .auth-btn:hover {
      box-shadow: 0 0 15px rgba(255, 0, 234, 0.6), inset 0 0 10px rgba(255, 0, 234, 0.4);
      border-color: #ff00ea;
    }

    /* Карточки пар: тёмное стекло с неоновой окантовкой */
    body[data-style="neon"].dark .pair {
      border: 1px solid rgba(0, 240, 255, 0.2);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
    }
    body[data-style="neon"].dark .pair:hover {
      border-color: rgba(0, 240, 255, 0.6);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
    }

    /* Заголовки дней: градиентный текст */
    body[data-style="neon"].dark .day-title {
      background: linear-gradient(90deg, #00f0ff, #ff00ea);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 20px rgba(255, 0, 234, 0.3);
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    /* Текущая пара: пульсация */
    @keyframes neonPulse {
      0% { box-shadow: 0 0 5px #ff00ea, inset 0 0 5px #ff00ea; border-color: #ff00ea; }
      50% { box-shadow: 0 0 20px #ff00ea, inset 0 0 10px #ff00ea; border-color: #ff77ff; }
      100% { box-shadow: 0 0 5px #ff00ea, inset 0 0 5px #ff00ea; border-color: #ff00ea; }
    }
    body[data-style="neon"].dark .pair.current {
      animation: neonPulse 2s infinite;
      border: 1px solid #ff00ea;
      background: linear-gradient(135deg, rgba(255,0,234,0.1), rgba(15,5,24,1));
    }
    
    /* Прогресс-бар текущей пары — яркий градиент */
    body[data-style="neon"].dark .pair-progress {
      background: linear-gradient(90deg, #00f0ff, #ff00ea);
      box-shadow: 0 0 10px #ff00ea;
    }

    /* Бейджи (ДЗ, подгруппа) — кислотные */
    body[data-style="neon"].dark .pair-hw {
      background: #ff00ea;
      color: #fff;
      box-shadow: 0 0 8px #ff00ea;
      border: none;
    }
    body[data-style="neon"].dark .pair-subgroup {
      background: rgba(0, 240, 255, 0.2);
      color: #00f0ff;
      border: 1px solid #00f0ff;
      box-shadow: 0 0 5px rgba(0, 240, 255, 0.3);
    }

    /* Светлая версия неона (чуть спокойнее, но с фиолетовым акцентом) */
    body[data-style="neon"]:not(.dark) .icon-btn { 
      border: 1px solid rgba(124,58,237,0.4); 
      box-shadow: 0 2px 8px rgba(124,58,237,0.2); 
    }
    body[data-style="neon"]:not(.dark) .day-title {
      color: #5b21b6;
    }
  `
};