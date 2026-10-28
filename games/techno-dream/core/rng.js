// FNV-1a: хешируем строковый сид в uint32.
// Раньше буквы отбрасывались через replace(/\D/g,''), и разные сиды
// («K7XM2Q» и «AB72Q») схлопывались в одно число — энтропия терялась.
function hashSeedString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class SeededRandom {
  constructor(seed) {
    // Принудительно делаем seed числом (строку — через хеш, а не отбрасывание букв)
    if (typeof seed === 'string') {
      this.seed = hashSeedString(seed) || 12345;
    } else {
      this.seed = (seed >>> 0) || 12345;
    }
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

export function generateSeed() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}