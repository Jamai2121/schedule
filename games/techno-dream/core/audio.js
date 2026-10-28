let ctx = null;

export function initAudio() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Обязательно вызывать из первого пользовательского жеста (клик по «Играть»):
// до жеста Chrome/Safari держат контекст в состоянии suspended и звуков не будет
export function resumeAudio() {
    if (ctx && ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
    }
}

// endFreq/ramp — необязательная развертка частоты (раньше shoot/enemy_die/
// boss_dash дублировали осциллятор вручную)
function createOscillator(type, freq, duration, volume, startTime, endFreq, ramp) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined && endFreq !== null) {
        if (ramp === 'linear') {
            osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
        } else {
            osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
        }
    }
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return { osc, gain };
}

// Вспомогательная функция для генерации шума.
// endFilterFreq — развертка фильтра (всасывание в дверь)
function createNoise(duration, volume, filterType, filterFreq, startTime, endFilterFreq) {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startTime);
    if (endFilterFreq !== undefined && endFilterFreq !== null) {
        filter.frequency.exponentialRampToValueAtTime(endFilterFreq, startTime + duration);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(startTime);
    noise.stop(startTime + duration);
}

export function playSound(name) {
    if (!ctx) return;
    // Контекст ещё не разбужен — пробуем разбудить и не бросаем ошибку
    if (ctx.state !== 'running') { resumeAudio(); return; }
    const now = ctx.currentTime;

    if (name === 'shoot') {
        createOscillator('sawtooth', 880, 0.15, 0.15, now, 110);
        createNoise(0.1, 0.05, 'highpass', 2000, now);
    }
    else if (name === 'hit') {
        // Ржавый металлический удар: низкий глухой + ржавый скрип
        createOscillator('square', 120, 0.1, 0.2, now);
        createOscillator('triangle', 80, 0.15, 0.3, now);
        createNoise(0.1, 0.08, 'bandpass', 1500, now);
        createOscillator('sawtooth', 1800, 0.05, 0.05, now);
    }
    else if (name === 'pickup') {
        createOscillator('sine', 440, 0.1, 0.1, now);
        createOscillator('sine', 554, 0.1, 0.1, now + 0.05);
        createOscillator('sine', 659, 0.15, 0.1, now + 0.1);
    }
    else if (name === 'step') {
        // Выбираем один из 3 вариантов шага для вариативности
        const stepType = Math.floor(Math.random() * 3);
        if (stepType === 0) {
            createOscillator('sine', 60, 0.1, 0.2, now);
            createNoise(0.05, 0.05, 'highpass', 2000, now);
        } else if (stepType === 1) {
            createOscillator('sine', 80, 0.08, 0.15, now);
            createOscillator('square', 1200, 0.02, 0.02, now);
            createNoise(0.03, 0.03, 'highpass', 3000, now);
        } else {
            createOscillator('sine', 50, 0.12, 0.2, now);
            createNoise(0.06, 0.04, 'lowpass', 500, now);
        }
    }
    else if (name === 'enemy_die') {
        createOscillator('sawtooth', 300, 0.3, 0.1, now, 50);
    }
    else if (name === 'door') {
        // Всасывание в дверь: восходящий шум с раскрывающимся фильтром
        createNoise(0.4, 0.1, 'lowpass', 200, now, 3000);
    }
    else if (name === 'boss_dash') {
        // Скрежет металла: пила 100->300->100 + шум
        createOscillator('sawtooth', 100, 0.1, 0.15, now, 300, 'linear');
        createOscillator('sawtooth', 300, 0.1, 0.12, now + 0.1, 100, 'linear');
        createNoise(0.2, 0.1, 'highpass', 1000, now);
    }
    else if (name === 'turret_shot') {
        // Сухой энергетический выстрел турели
        createOscillator('square', 1200, 0.12, 0.12, now, 200);
        createNoise(0.06, 0.05, 'highpass', 2500, now);
    }
    else if (name === 'hop') {
        // Пружинный «вьюп» прыжка
        createOscillator('sine', 300, 0.09, 0.09, now, 620);
    }
    else if (name === 'fuse') {
        // Одиночный бип фитиля (бомбер); учащение задаёт таймер врага
        createOscillator('square', 1000, 0.07, 0.1, now);
    }
    else if (name === 'explosion') {
        // Взрыв: низкий суб-тон + шумовой удар с захлопывающимся фильтром
        createOscillator('sine', 90, 0.4, 0.35, now, 30);
        createNoise(0.5, 0.3, 'lowpass', 800, now, 60);
    }
    else if (name === 'summon') {
        // Призыв: восходящая пила + резонансный шум
        createOscillator('sawtooth', 150, 0.35, 0.08, now, 420);
        createNoise(0.3, 0.05, 'bandpass', 900, now);
    }
    else if (name === 'rail_shot') {
        // Рельсатрон: мощный нисходящий зап + шумовой разряд
        createOscillator('sawtooth', 1600, 0.3, 0.16, now, 120);
        createOscillator('square', 90, 0.25, 0.22, now, 40);
        createNoise(0.25, 0.12, 'highpass', 1200, now);
    }
    else if (name === 'rail_full') {
        // Заряд готов: короткий высокий бип
        createOscillator('sine', 880, 0.09, 0.09, now, 1320);
    }
}