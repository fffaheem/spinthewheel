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
const knockoutToggle = document.getElementById('knockout-toggle');
const knockoutStatus = document.getElementById('knockout-status');
const knockoutCount = document.getElementById('knockout-count');
const knockoutResetBtn = document.getElementById('knockout-reset-btn');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const clearHistoryBtn = document.getElementById('clear-history');
const resetBtn = document.getElementById('reset-btn');
const colorThemeSelect = document.getElementById('color-theme-select');

// Celebration Modal DOM
const celebrationModal = document.getElementById('celebration-modal');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalTitle = document.getElementById('modal-title');
const modalEmoji = document.querySelector('.modal-emoji');
const modalCloseBtn = document.getElementById('modal-close-btn');

let items = [];
let activeItems = [];
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
        knockoutMode: knockoutToggle.checked,
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
        if (p < 1) p = 50;
        if (f < 1) f = 65;

        powerSlider.value = p;
        frictionSlider.value = f;
        if (settings.sound !== undefined) soundToggle.checked = settings.sound;
        if (settings.historyEnabled !== undefined) historyToggle.checked = settings.historyEnabled;
        if (settings.knockoutMode !== undefined) knockoutToggle.checked = settings.knockoutMode;
        if (settings.theme !== undefined) document.documentElement.setAttribute('data-theme', settings.theme);
        if (settings.colorTheme !== undefined) colorThemeSelect.value = settings.colorTheme;
        if (settings.history !== undefined) historyList.innerHTML = settings.history;
    } else {
        itemsInput.value = DEFAULT_ITEMS;
        knockoutToggle.checked = false;
    }
    updateBadgeValues();
}

function resetToDefaults() {
    if (confirm("Are you sure you want to reset all settings and history?")) {
        localStorage.removeItem('spinWheelSettings');
        itemsInput.value = DEFAULT_ITEMS;
        powerSlider.value = 50;
        frictionSlider.value = 65;
        soundToggle.checked = true;
        historyToggle.checked = true;
        knockoutToggle.checked = false;
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

// --- Knockout Mode Helpers ---
function resetKnockout() {
    activeItems = [...items];
    canvas.classList.remove('winner-glow');
    updateKnockoutStatus();
    drawWheel();
}

function updateKnockoutStatus() {
    if (knockoutToggle.checked) {
        knockoutStatus.style.display = 'block';
        knockoutCount.innerText = `${activeItems.length}/${items.length}`;
    } else {
        knockoutStatus.style.display = 'none';
    }
}

// --- Drawing the Wheel ---
function updateItems() {
    items = itemsInput.value.split('\n').filter(i => i.trim() !== '');
    if (items.length === 0) items = ['Add Items'];
    activeItems = [...items];
    canvas.classList.remove('winner-glow');
    updateKnockoutStatus();
    drawWheel();
    saveSettings();
}

function getSegmentColor(index) {
    const palette = THEMES[colorThemeSelect.value] || THEMES.classic;
    const currentList = knockoutToggle.checked ? activeItems : items;
    if (currentList.length % palette.length === 1 && index === currentList.length - 1) {
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

    const currentList = knockoutToggle.checked ? activeItems : items;
    const arcLength = (2 * Math.PI) / currentList.length;

    ctx.clearRect(0, 0, width, height);
    currentAngle = currentAngle % (2 * Math.PI);

    for (let i = 0; i < currentList.length; i++) {
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

        if (LIGHT_THEMES.includes(colorThemeSelect.value)) {
            ctx.fillStyle = "#1a1a1a";
            ctx.shadowColor = "rgba(255,255,255,0.6)";
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0,0,0,0.6)";
        }

        ctx.font = "bold 32px sans-serif";
        ctx.shadowBlur = 5;

        let text = currentList[i];
        if (text.length > 15) text = text.substring(0, 15) + '...';
        ctx.fillText(text, radius - 30, 10);
        ctx.restore();
    }
}

// --- Physics & Animation ---
function getWinnerIndex() {
    const currentList = knockoutToggle.checked ? activeItems : items;
    const arcLength = (2 * Math.PI) / currentList.length;
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

    if (knockoutToggle.checked) {
        const landedItem = activeItems[winnerIndex];

        if (activeItems.length > 2) {
            activeItems.splice(winnerIndex, 1);
            resultDisplay.innerText = `❌ Eliminated: ${landedItem}`;
            playWinSound();

            // Present a gorgeous sliding toast notification
            showKnockoutToast(landedItem);

            if (historyToggle.checked) {
                const li = document.createElement('li');
                li.innerText = `❌ Knocked Out: ${landedItem}`;
                historyList.prepend(li);
                saveSettings();
            }

            updateKnockoutStatus();
            drawWheel();
        } else if (activeItems.length === 2) {
            activeItems.splice(winnerIndex, 1);
            const ultimateWinner = activeItems[0];
            resultDisplay.innerText = `🏆 Ultimate Winner: ${ultimateWinner}! 🏆`;
            playWinSound();

            // Premium winning animations & modal
            canvas.classList.add('winner-glow');
            startConfetti(4000);
            showCelebrationModal('Ultimate Winner', ultimateWinner, '🏆');

            if (historyToggle.checked) {
                const li1 = document.createElement('li');
                li1.innerText = `❌ Knocked Out: ${landedItem}`;
                historyList.prepend(li1);

                const li2 = document.createElement('li');
                li2.innerText = `🏆 Ultimate Winner: ${ultimateWinner}!`;
                li2.style.fontWeight = 'bold';
                li2.style.color = 'var(--primary)';
                historyList.prepend(li2);

                saveSettings();
            }

            updateKnockoutStatus();
            drawWheel();
        }
    } else {
        const winnerText = items[winnerIndex];
        resultDisplay.innerText = `🎉 ${winnerText} 🎉`;
        playWinSound();

        // Trigger non-knockout celebration modal & confetti
        startConfetti(2500);
        showCelebrationModal('Congratulations!', winnerText, '🎉');

        if (historyToggle.checked) {
            const li = document.createElement('li');
            li.innerText = winnerText;
            historyList.prepend(li);
            saveSettings();
        }
    }
}

function spin() {
    if (isSpinning) return;

    if (knockoutToggle.checked) {
        if (activeItems.length <= 1) {
            resetKnockout();
        }
    }

    const currentList = knockoutToggle.checked ? activeItems : items;
    if (currentList.length <= 1) {
        alert("Please add at least 2 items to spin!");
        return;
    }

    canvas.classList.remove('winner-glow');
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

// --- Confetti Celebration System ---
function startConfetti(durationMs = 2500) {
    const existing = document.getElementById('confetti-canvas');
    if (existing) existing.remove();

    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.width = '100vw';
    confettiCanvas.style.height = '100vh';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '9999';
    document.body.appendChild(confettiCanvas);

    const cCtx = confettiCanvas.getContext('2d');
    let width = confettiCanvas.width = window.innerWidth;
    let height = confettiCanvas.height = window.innerHeight;

    const handleResize = () => {
        width = confettiCanvas.width = window.innerWidth;
        height = confettiCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    const particles = [];

    const shapes = ['circle', 'triangle', 'rect'];
    function createParticle(side) {
        return {
            x: side === 'left' ? 0 : width,
            y: height,
            r: Math.random() * 8 + 6,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.08 + 0.04,
            tiltAngle: Math.random() * Math.PI,
            speedY: -(Math.random() * 14 + 11),
            speedX: side === 'left' ? (Math.random() * 9 + 4) : -(Math.random() * 9 + 4),
            gravity: 0.32
        };
    }

    let animationActive = true;
    const startTime = Date.now();

    const burstCount = durationMs > 2500 ? 120 : 60;
    for (let i = 0; i < burstCount; i++) {
        particles.push(createParticle(i % 2 === 0 ? 'left' : 'right'));
    }

    function draw() {
        if (!animationActive) return;
        cCtx.clearRect(0, 0, width, height);

        let activeParticles = 0;

        particles.forEach((p) => {
            p.speedY += p.gravity;
            p.y += p.speedY;
            p.x += p.speedX;
            p.tiltAngle += p.tiltAngleIncremental;
            p.tilt = Math.sin(p.tiltAngle) * 5;

            if (p.y <= height + 20 && p.x >= -20 && p.x <= width + 20) {
                activeParticles++;
            }

            if ((p.y > height + 20 || p.x < -20 || p.x > width + 20) && Date.now() - startTime < durationMs) {
                Object.assign(p, createParticle(Math.random() > 0.5 ? 'left' : 'right'));
            }

            cCtx.save();
            cCtx.translate(p.x + p.tilt, p.y);
            cCtx.rotate(p.tiltAngle);
            cCtx.fillStyle = p.color;
            cCtx.beginPath();
            if (p.shape === 'circle') {
                cCtx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
            } else if (p.shape === 'triangle') {
                cCtx.moveTo(0, -p.r / 2);
                cCtx.lineTo(p.r / 2, p.r / 2);
                cCtx.lineTo(-p.r / 2, p.r / 2);
                cCtx.closePath();
            } else {
                cCtx.rect(-p.r / 2, -p.r / 2, p.r, p.r / 1.5);
            }
            cCtx.fill();
            cCtx.restore();
        });

        if (activeParticles === 0 && Date.now() - startTime >= durationMs) {
            animationActive = false;
            window.removeEventListener('resize', handleResize);
            confettiCanvas.remove();
        } else {
            requestAnimationFrame(draw);
        }
    }

    draw();
}

// --- Dynamic Notification Helpers ---
function showKnockoutToast(item) {
    const existing = document.querySelector('.knockout-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'knockout-toast';
    toast.innerHTML = `
        <div class="toast-icon">❌</div>
        <div class="toast-body">
            <div class="toast-title">Knocked Out</div>
            <div class="toast-desc"><strong>${item}</strong> has been eliminated!</div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

function showCelebrationModal(subtitle, titleText, emoji) {
    modalSubtitle.innerText = subtitle;
    modalTitle.innerText = titleText;
    modalEmoji.innerText = emoji;
    celebrationModal.style.display = 'flex';
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

knockoutToggle.addEventListener('change', () => {
    resetKnockout();
    saveSettings();
});

knockoutResetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetKnockout();
    resultDisplay.innerText = "Ready to spin!";
});

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

modalCloseBtn.addEventListener('click', () => {
    celebrationModal.style.display = 'none';
});

celebrationModal.addEventListener('click', (e) => {
    if (e.target === celebrationModal) {
        celebrationModal.style.display = 'none';
    }
});

// Initialize
loadSettings();
updateItems();
