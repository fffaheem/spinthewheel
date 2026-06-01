// ============================================================
// AUDIO — Web Audio API synthesis for ticks and win sounds
// ============================================================
// DOM refs (soundToggle) are declared in main.js (loaded last).
// These functions are only CALLED at runtime — refs will exist by then.

var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx;

function initAudio() {
    if (!audioCtx && soundToggle.checked) {
        audioCtx = new AudioContextClass();
    }
}

function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

// ---- Wheel tick (called per segment crossing) ----
function playTick() {
    if (document.hidden) return;
    if (!soundToggle.checked) return;
    initAudio();
    if (!audioCtx) return;
    resumeAudio();

    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var vol  = Math.min(0.38, angularVelocity * 2.2);
    var t    = audioCtx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.035);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + 0.035);
}

// ---- Win jingle ----
function playWinSound(isUltimate) {
    if (document.hidden) return;
    if (!soundToggle.checked) return;
    initAudio();
    if (!audioCtx) return;
    resumeAudio();

    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var t    = audioCtx.currentTime;
    var dur  = isUltimate ? 1.6 : 1.0;

    osc.type = 'sine';
    if (isUltimate) {
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(554, t + 0.12);
        osc.frequency.setValueAtTime(659, t + 0.24);
        osc.frequency.setValueAtTime(880, t + 0.40);
    } else {
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.setValueAtTime(600, t + 0.10);
        osc.frequency.setValueAtTime(800, t + 0.20);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.46, t + 0.10);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + dur);
}

// ---- Elimination sound (descending buzz) ----
function playElimSound() {
    if (document.hidden) return;
    if (!soundToggle.checked) return;
    initAudio();
    if (!audioCtx) return;
    resumeAudio();

    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var t    = audioCtx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.45);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + 0.45);
}
