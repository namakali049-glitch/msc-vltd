// ==========================================
// HỆ THỐNG ÂM THANH (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
let audioCtx = null;
let isBgmPlaying = false;

function getAudioContext() {
    try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioClass) return null;
        if (!audioCtx) audioCtx = new AudioClass();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
    } catch(e) { return null; }
}

window.getAudioContext = getAudioContext;

window.playClickSound = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.setValueAtTime(350, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.06);
    } catch(e) {}
};

window.playCorrectSound = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + (idx * 0.06);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.linearRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(start); osc.stop(start + 0.28);
        });
    } catch(e) {}
};

window.playWrongSound = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(45, now + 0.28);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.28);
    } catch(e) {}
};

window.playLootSound = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [880, 1174, 1567, 2093].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + (idx * 0.05);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.18, start);
            gain.gain.linearRampToValueAtTime(0.001, start + 0.2);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(start); osc.stop(start + 0.22);
        });
    } catch(e) {}
};

window.toggleBGM = async function() {
    window.playClickSound();
    const bgm = document.getElementById('bgmAudio');
    const btn = document.getElementById('audioToggleBtn');
    if (!bgm) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => {});

    if (bgm.paused) {
        try {
            bgm.volume = 0.35;
            await bgm.play();
            isBgmPlaying = true;
            if (btn) {
                btn.innerText = "🎵 Nhạc: Bật";
                btn.classList.remove('muted');
            }
        } catch(err) {
            if (btn) btn.innerText = "🔇 Chưa có nhạc";
        }
    } else {
        bgm.pause();
        isBgmPlaying = false;
        if (btn) {
            btn.innerText = "🔇 Nhạc: Tắt";
            btn.classList.add('muted');
        }
    }
};

function unlockAudioOnInteraction() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    document.removeEventListener('click', unlockAudioOnInteraction);
    document.removeEventListener('keydown', unlockAudioOnInteraction);
}
document.addEventListener('click', unlockAudioOnInteraction);
document.addEventListener('keydown', unlockAudioOnInteraction);
