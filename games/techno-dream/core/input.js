import { keys, shootKeys, gameState } from './state.js';

export function initInput() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  // При потере фокуса окна «отпускаем» все клавиши,
  // чтобы дроид не продолжал бежать/стрелять после альт-таба
  window.addEventListener('blur', resetAllInput);
}

function resetAllInput() {
  keys.w = false; keys.a = false; keys.s = false; keys.d = false;
  shootKeys.up = false; shootKeys.down = false;
  shootKeys.left = false; shootKeys.right = false;
  gameState.showFullMap = false;
}

function onKeyDown(e) {
  if (e.key === 'Tab') {
    e.preventDefault(); // Запрещаем переключение фокуса
    if (gameState) gameState.showFullMap = true;
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('togglePause'));
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
  if (e.key === 'Tab') {
    e.preventDefault();
    if (gameState) gameState.showFullMap = false;
    return;
  }
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