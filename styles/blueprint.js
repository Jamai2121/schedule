export default {
  id: 'blueprint',
  name: 'Чертёж',
  preview: ['#0a1626', '#0f2138', '#4da3ff'],
  light: {
    '--bg': '#eef4fb',
    '--card': '#fbfdff',
    '--text': '#10243c',
    '--muted': '#5a7189',
    '--hover': '#dce8f5',
    '--chip-bg': '#cfe3f7',
    '--chip-text': '#0b5cab',
    '--border-today': '#0b5cab',
    '--modal-bg': 'rgba(16,36,60,0.45)'
  },
  dark: {
    '--bg': '#0a1626',
    '--card': '#0f2138',
    '--text': '#dce8f5',
    '--muted': '#7d94ad',
    '--hover': '#16324e',
    '--chip-bg': '#143a5e',
    '--chip-text': '#9ecbff',
    '--border-today': '#4da3ff',
    '--modal-bg': 'rgba(4,10,20,0.65)'
  },
  extraCss: `
    body[data-style="blueprint"] { background-image: linear-gradient(rgba(120,170,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.07) 1px, transparent 1px); background-size: 24px 24px; }
    body[data-style="blueprint"]:not(.dark) { background-image: linear-gradient(rgba(11,92,171,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11,92,171,0.08) 1px, transparent 1px); background-size: 24px 24px; }
    body[data-style="blueprint"] .day, body[data-style="blueprint"] .pair { border: 1px solid rgba(120,170,255,0.22); border-radius: 6px; }
    body[data-style="blueprint"]:not(.dark) .day, body[data-style="blueprint"]:not(.dark) .pair { border-color: rgba(11,92,171,0.25); }
    body[data-style="blueprint"] .pair-time { font-family: 'Courier New', monospace; letter-spacing: 0.5px; }
  `
};