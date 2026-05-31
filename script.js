// --- Premium Color Palettes (10 Total) ---
const THEMES = {
    classic: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'],
    pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff'],
    neon: ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0055', '#5500ff'],
    gold: ['#bf953f', '#fcf6ba', '#b38728', '#fbf5b7', '#aa771c'],
    ocean: ['#0284c7', '#0369a1', '#075985', '#0c4a6e', '#38bdf8', '#7dd3fc'],
    retro: ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93'],
    sunset: ['#ff7e5f', '#feb47b', '#ff99ac', '#ff6a88', '#d9a7c7'],
    crimson: ['#1A1A1D', '#4E4E50', '#6F2232', '#950740', '#C3073F'],
    lavender: ['#c8b6ff', '#e7c6ff', '#ffd6ff', '#b8c0ff', '#bbd0ff'],
    matcha: ['#dde5b6', '#adc178', '#a98467', '#6c584c', '#f0ead2']
};

const LIGHT_THEMES = ['pastel', 'gold', 'lavender', 'matcha'];
const DEFAULT_ITEMS = "Prize 1\nPrize 2\nTry Again\nJackpot!\nBonus Spin\nLose Turn";

// --- State & DOM Elements ---
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const itemsInput = document.getElementById('items-input');
const resultDisplay = document.getElementById('result-display');
const powerSlider = document.getElementById('power-slider');
const frictionSlider = document.getElementById('friction-slider');
const powerVal = document.getElementById('power-val');
const frictionVal = document.getElementById('friction-val');
const soundToggle = document.getElementById('sound-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const clearHistoryBtn = document.getElementById('clear-history');
const resetBtn = document.getElementById('reset-btn');
const colorThemeSelect = document.getElementById('color-theme-select');

let items = [];
let currentAngle = 0;
let angularVelocity = 0;
let isSpinning = false;
let lastTickSegment = -1;
let animationFrame;

// --- Local Storage Management ---
function saveSettings() {
    const settings = {
        items: itemsInput.value,
        power: powerSlider.value,
        friction: frictionSlider.value,
        sound: soundToggle.checked,
        historyEnabled: historyToggle.checked,
        theme: document.documentElement.getAttribute('data-theme'),
        colorTheme: colorThemeSelect.value,
        history: historyList.innerHTML
    };
    localStorage.setItem('spinWheelSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('spinWheelSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        itemsInput.value = settings.items !== undefined ? settings.items : DEFAULT_ITEMS;
        
        let p = settings.power !== undefined ? settings.power : 50;
        let f = settings.friction !== undefined ? settings.friction : 65;
        if(p < 1) p = 50; 
        if(f < 1) f = 65;

        powerSlider.value = p;
        frictionSlider.value = f;
        if (settings.sound !== undefined) soundToggle.checked = settings.sound;
        if (settings.historyEnabled !== undefined) historyToggle.checked = settings.historyEnabled;
        if (settings.theme !== undefined) document.documentElement.setAttribute('data-theme', settings.theme);
        if (settings.colorTheme !== undefined) colorThemeSelect.value = settings.colorTheme;
        if (settings.history !== undefined) historyList.innerHTML = settings.history;
    } else {
        itemsInput.value = DEFAULT_ITEMS;
    }
    updateBadgeValues();
}

function resetToDefaults() {
    if(confirm("Are you sure you want to reset all settings and history?")) {
        localStorage.removeItem('spinWheelSettings');
        itemsInput.value = DEFAULT_ITEMS;
        powerSlider.value = 50;
        frictionSlider.value = 65;
        soundToggle.checked = true;
        historyToggle.checked = true;
        colorThemeSelect.value = 'classic';
        historyList.innerHTML = '';
        document.documentElement.setAttribute('data-theme', 'dark');
        resultDisplay.innerText = "Ready to spin!";
        updateBadgeValues();
        updateItems();
    }
}

function updateBadgeValues() {
    powerVal.innerText = powerSlider.value;
    frictionVal.innerText = frictionSlider.value;
}

// --- Audio Context Synthesis ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx && soundToggle.checked) {
        audioCtx = new AudioContext();
    }
}

function playTick() {
    if (!soundToggle.checked) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.03);
    
    let vol = Math.min(0.5, angularVelocity * 2);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
}

function playWinSound() {
    if (!soundToggle.checked) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}

// --- Drawing the Wheel ---
function updateItems() {
    items = itemsInput.value.split('\n').filter(i => i.trim() !== '');
    if(items.length === 0) items = ['Add Items'];
    drawWheel();
    saveSettings();
}

function getSegmentColor(index) {
    const palette = THEMES[colorThemeSelect.value] || THEMES.classic;
    if (items.length % palette.length === 1 && index === items.length - 1) {
          return palette[1 % palette.length]; 
    }
    return palette[index % palette.length];
}

function drawWheel() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2;
    const arcLength = (2 * Math.PI) / items.length;

    ctx.clearRect(0, 0, width, height);
    currentAngle = currentAngle % (2 * Math.PI);

    for (let i = 0; i < items.length; i++) {
        const startAngle = currentAngle + i * arcLength;
        const endAngle = startAngle + arcLength;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fillStyle = getSegmentColor(i);
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arcLength / 2);
        ctx.textAlign = "right";
        
        if(LIGHT_THEMES.includes(colorThemeSelect.value)) {
            ctx.fillStyle = "#1a1a1a";
            ctx.shadowColor = "rgba(255,255,255,0.6)";
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0,0,0,0.6)";
        }
        
        ctx.font = "bold 32px sans-serif";
        ctx.shadowBlur = 5;
        
        let text = items[i];
        if(text.length > 15) text = text.substring(0, 15) + '...';
        ctx.fillText(text, radius - 30, 10);
        ctx.restore();
    }
}

// --- Physics & Animation ---
function getWinnerIndex() {
    const arcLength = (2 * Math.PI) / items.length;
    let pointerAngle = (3 * Math.PI / 2) - currentAngle;
    pointerAngle = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const index = Math.floor(pointerAngle / arcLength);
    return index;
}

function animate() {
    if (angularVelocity > 0) {
        currentAngle += angularVelocity;
        
        let frictionValue = parseInt(frictionSlider.value);
        let friction = 0.980 + (frictionValue / 100) * 0.018; 
        angularVelocity *= friction;

        const currentSegment = getWinnerIndex();
        if (currentSegment !== lastTickSegment) {
            playTick();
            lastTickSegment = currentSegment;
        }

        if (angularVelocity < 0.001) {
            angularVelocity = 0;
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.style.opacity = "1";
            declareWinner();
        } else {
            animationFrame = requestAnimationFrame(animate);
        }
    }
    drawWheel();
}

function declareWinner() {
    const winnerIndex = getWinnerIndex();
    const winnerText = items[winnerIndex];
    resultDisplay.innerText = `🎉 ${winnerText} 🎉`;
    playWinSound();

    if (historyToggle.checked) {
        const li = document.createElement('li');
        li.innerText = winnerText;
        historyList.prepend(li);
        saveSettings(); 
    }
}

function spin() {
    if (isSpinning) return;
    if (items.length <= 1) {
        alert("Please add at least 2 items to spin!");
        return;
    }

    initAudio();
    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.style.opacity = "0.5";
    resultDisplay.innerText = "Spinning...";

    const powerValue = parseInt(powerSlider.value);
    const basePower = powerValue / 100;
    const randomBoost = Math.random() * 0.1;
    angularVelocity = basePower + randomBoost;

    lastTickSegment = getWinnerIndex();
    cancelAnimationFrame(animationFrame);
    animate();
}

// --- Event Listeners ---
spinBtn.addEventListener('click', spin);
itemsInput.addEventListener('input', updateItems);
resetBtn.addEventListener('click', resetToDefaults);

const handleSliderInput = () => { updateBadgeValues(); saveSettings(); };
powerSlider.addEventListener('input', handleSliderInput);
frictionSlider.addEventListener('input', handleSliderInput);

colorThemeSelect.addEventListener('change', () => {
    drawWheel();
    saveSettings();
});

soundToggle.addEventListener('change', saveSettings);
historyToggle.addEventListener('change', saveSettings);

themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    drawWheel();
    saveSettings();
});

clearHistoryBtn.addEventListener('click', () => {
    historyList.innerHTML = '';
    saveSettings();
});

// Initialize
loadSettings();
updateItems();
