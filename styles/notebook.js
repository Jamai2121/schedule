export default {
  id: 'notebook',
  name: 'Тетрадь',
  preview: ['#f7f3ea', '#211e17', '#b0892f'],
  light: {
    '--bg': '#f7f3ea',
    '--card': '#fffdf7',
    '--text': '#2a2620',
    '--muted': '#7a7263',
    '--hover': '#efe9db',
    '--chip-bg': '#e7ddc4',
    '--chip-text': '#6b5b2e',
    '--border-today': '#b0892f',
    '--modal-bg': 'rgba(42,38,32,0.45)'
  },
  dark: {
    '--bg': '#191712',
    '--card': '#211e17',
    '--text': '#ece5d8',
    '--muted': '#a09781',
    '--hover': '#2b271d',
    '--chip-bg': '#3a3423',
    '--chip-text': '#e0d3a8',
    '--border-today': '#d4b45a',
    '--modal-bg': 'rgba(10,9,6,0.6)'
  },
  extraCss: `
    body[data-style="notebook"] .day {
      background-image:
        linear-gradient(90deg, transparent 0 30px, rgba(214,69,69,0.35) 30px 32px, transparent 32px),
        repeating-linear-gradient(transparent 0 27px, rgba(90,130,190,0.18) 27px 28px);
    }
    body[data-style="notebook"] .pair { background: transparent; box-shadow: none; }
    body[data-style="notebook"] .pair:hover { background: var(--hover); }
    body[data-style="notebook"] .day-title { font-family: 'Segoe Print', 'Comic Sans MS', cursive; }
  `
};