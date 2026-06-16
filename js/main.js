// ============================================================
// MAIN — DOM References, Event Listeners, App Initialisation
// ============================================================

// ============================================================
// DOM REFERENCES
// ============================================================

// Wheel
var canvas        = document.getElementById('wheel');
var ctx           = canvas.getContext('2d');
var spinBtn       = document.getElementById('spin-btn');
var centerSpinBtn = document.getElementById('center-spin-btn');
var resultDisplay = document.getElementById('result-display');

// Items
var itemsInput = document.getElementById('items-input');

// Settings
var powerSlider       = document.getElementById('power-slider');
var frictionSlider    = document.getElementById('friction-slider');
var powerVal          = document.getElementById('power-val');
var frictionVal       = document.getElementById('friction-val');
var soundToggle       = document.getElementById('sound-toggle');
var historyToggle     = document.getElementById('history-toggle');
var colorThemeSelect  = document.getElementById('color-theme-select');
var resetBtn          = document.getElementById('reset-btn');

// Knockout status
var knockoutStatusEl   = document.getElementById('knockout-status');
var knockoutCount      = document.getElementById('knockout-count');
var knockoutResetBtnEl = document.getElementById('knockout-reset-btn');

// Mode status bar
var modeBadge     = document.getElementById('mode-badge');
var changeModeBtn = document.getElementById('change-mode-btn');
var themeToggle   = document.getElementById('theme-toggle');

// History
var historyList    = document.getElementById('history-list');
var clearHistoryBtn = document.getElementById('clear-history');

// Scoreboard
var scoreboardCard        = document.getElementById('scoreboard-card');
var scoreboardEl          = document.getElementById('scoreboard');
var spinsRemainingDisplay = document.getElementById('spins-remaining');

// In-game N Win config
var nwinMinusBtn  = document.getElementById('nwin-minus');
var nwinPlusBtn   = document.getElementById('nwin-plus');
var nwinDisplay   = document.getElementById('nwin-display');

// In-game N to Win config
var ntowinMinusBtn = document.getElementById('ntowin-minus');
var ntowinPlusBtn  = document.getElementById('ntowin-plus');
var ntowinDisplay  = document.getElementById('ntowin-display');

// Mode picker overlay
var modePickerOverlay = document.getElementById('mode-picker');
var appContainer      = document.getElementById('app');
var startGameBtn      = document.getElementById('start-game-btn');
var knockoutToggle    = document.getElementById('knockout-toggle');

// Celebration modal
var celebrationModal = document.getElementById('celebration-modal');
var modalSubtitle    = document.getElementById('modal-subtitle');
var modalTitle       = document.getElementById('modal-title');
var modalEmoji       = document.querySelector('.modal-emoji');
var modalCloseBtn    = document.getElementById('modal-close-btn');
var modalMenuBtn     = document.getElementById('modal-menu-btn');

// Confirm modal (replaces browser confirm())
var confirmModal     = document.getElementById('confirm-modal');
var confirmMessageEl = document.getElementById('confirm-message');
var confirmYesBtnEl  = document.getElementById('confirm-yes-btn');
var confirmNoBtnEl   = document.getElementById('confirm-no-btn');


// ============================================================
// HELPERS — mid-game detection
// ============================================================

function isMidGame() {
    if (gameMode === 'nwin')   return nWinRemaining > 0 && nWinRemaining < nWinTotal;
    if (gameMode === 'ntowin') return Object.values(nToWinScores).some(function(s) { return s > 0; });
    if (gameMode === 'classic' && knockoutEnabled) return activeItems.length < items.length;
    return false;
}


// ============================================================
// EVENT LISTENERS
// ============================================================

// ---- Mode Picker: card selection ----
document.querySelectorAll('.mode-card').forEach(function(card) {
    card.addEventListener('click', function() {
        gameMode = card.dataset.mode;
        document.querySelectorAll('.mode-card').forEach(function(c) {
            c.classList.toggle('selected', c.dataset.mode === gameMode);
        });
    });
    card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
});

// ---- Mode Picker: Knockout toggle ----
knockoutToggle.addEventListener('change', function() {
    knockoutEnabled = knockoutToggle.checked;
    updateModeDescriptions();
});

// ---- Mode Picker: Start Playing ----
startGameBtn.addEventListener('click', startGameSession);

// ---- App: Back to Menu button ----
changeModeBtn.addEventListener('click', function() {
    if (isMidGame()) {
        // Task #1: use in-page confirm modal instead of browser confirm()
        showConfirmModal(
            'Return to the main menu? Your current game progress will be lost.',
            function() { openModePicker(); }
        );
    } else {
        openModePicker();
    }
});

// ---- Wheel spin ----
spinBtn.addEventListener('click', spin);
if (centerSpinBtn) centerSpinBtn.addEventListener('click', spin);

// ---- Items textarea ----
itemsInput.addEventListener('input', updateItems);

// ---- Sliders ----
powerSlider.addEventListener('input',   function() { updateBadgeValues(); saveSettings(); });
frictionSlider.addEventListener('input', function() { updateBadgeValues(); saveSettings(); });

// ---- Color theme ----
colorThemeSelect.addEventListener('change', function() { drawWheel(); saveSettings(); });

// ---- Toggles ----
soundToggle.addEventListener('change',   saveSettings);
historyToggle.addEventListener('change', saveSettings);

// ---- Knockout Reset (inline restart) ----
knockoutResetBtnEl.addEventListener('click', function(e) {
    e.preventDefault();
    // Task #2: stopWheel called inside resetKnockout
    resetKnockout();
    resetModeScores();
    canvas.classList.remove('winner-glow');
    resultDisplay.textContent = 'Ready to spin!';
    updateScoreboard();
    updateSpinsRemaining();
    saveSettings();
});

// ---- Theme toggle ----
themeToggle.addEventListener('click', function() {
    var html     = document.documentElement;
    var newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    drawWheel();
    saveSettings();
});

// ---- Clear history ----
clearHistoryBtn.addEventListener('click', function() {
    historyList.innerHTML = '';
    saveSettings();
});

// ---- Reset to defaults ----
resetBtn.addEventListener('click', resetToDefaults);

// ---- Celebration modal: Restart (Task #8) ----
modalCloseBtn.addEventListener('click', function() {
    hideCelebrationModal();
    startGameSession();  // restart same mode immediately
});

// ---- Celebration modal: Back to Menu ----
modalMenuBtn.addEventListener('click', function() {
    hideCelebrationModal();
    openModePicker();
});

// Backdrop tap closes celebration modal
celebrationModal.addEventListener('click', function(e) {
    if (e.target === celebrationModal) hideCelebrationModal();
});

// ---- Confirm modal events ----
confirmYesBtnEl.addEventListener('click', function() {
    var cb = _confirmCallback;
    hideConfirmModal();
    if (cb) cb();
});
confirmNoBtnEl.addEventListener('click', hideConfirmModal);
confirmModal.addEventListener('click', function(e) {
    if (e.target === confirmModal) hideConfirmModal();
});

// ---- In-game N Win config (Task #4) ----
nwinMinusBtn.addEventListener('click', function() {
    var minSpins = items.length + 1;
    var oldTotal = nWinTotal;
    nWinTotal = Math.max(minSpins, nWinTotal - 1);
    if (nwinDisplay) nwinDisplay.textContent = nWinTotal;
    nWinRemaining = Math.max(0, nWinRemaining - (oldTotal - nWinTotal));
    updateModeBadge();
    updateSpinsRemaining();
    updateScoreboard();
    saveSettings();
});
nwinPlusBtn.addEventListener('click', function() {
    var oldTotal = nWinTotal;
    nWinTotal = Math.min(999, nWinTotal + 1);
    if (nwinDisplay) nwinDisplay.textContent = nWinTotal;
    nWinRemaining = nWinRemaining + (nWinTotal - oldTotal);
    updateModeBadge();
    updateSpinsRemaining();
    updateScoreboard();
    saveSettings();
});

// ---- In-game N to Win config (Task #5) ----
ntowinMinusBtn.addEventListener('click', function() {
    nToWinTarget = Math.max(2, nToWinTarget - 1);
    if (ntowinDisplay) ntowinDisplay.textContent = nToWinTarget;
    updateModeBadge();
    updateScoreboard();
    saveSettings();
});
ntowinPlusBtn.addEventListener('click', function() {
    nToWinTarget = Math.min(99, nToWinTarget + 1);
    if (ntowinDisplay) ntowinDisplay.textContent = nToWinTarget;
    updateModeBadge();
    updateScoreboard();
    saveSettings();
});


// ============================================================
// INITIALISATION
// ============================================================

(function init() {
    loadSettings();   // restore saved values → sets sessionActive if stored

    updateItems();    // parse textarea → draw wheel

    // Task #3: skip mode picker if user has an active session (e.g., refresh)
    if (sessionActive) {
        closeModePicker();
        updateModeBadge();
        updateKnockoutStatus();
        updateScoreboard();
        updateSpinsRemaining();
    } else {
        // First visit → show mode picker
        openModePicker();
    }
})();
