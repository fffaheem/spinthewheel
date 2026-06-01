// ============================================================
// NOTIFICATIONS — Modals, Toasts, Mode Picker UI helpers
// ============================================================

// ---- Confirmation callback storage ----
var _confirmCallback = null;

// ---- Celebration modal ----
function showCelebrationModal(subtitle, title, emoji) {
    modalSubtitle.textContent = subtitle;
    modalTitle.textContent    = title;
    modalEmoji.textContent    = emoji;
    celebrationModal.style.display = 'flex';
}

function hideCelebrationModal() {
    celebrationModal.style.display = 'none';
}

// ---- Confirm modal (replaces browser confirm()) ----
function showConfirmModal(message, onConfirm) {
    confirmMessageEl.textContent = message;
    confirmModal.style.display   = 'flex';
    _confirmCallback = onConfirm;
    // Focus the "Keep Playing" (safe/cancel) button by default
    setTimeout(function() {
        if (typeof confirmNoBtnEl !== 'undefined') confirmNoBtnEl.focus();
    }, 60);
}

function hideConfirmModal() {
    confirmModal.style.display = 'none';
    _confirmCallback = null;
}

// ---- Knockout elimination toast ----
function showKnockoutToast(item) {
    var existing = document.querySelector('.knockout-toast');
    if (existing) {
        existing.classList.remove('show');
        setTimeout(function() { if (existing.parentNode) existing.remove(); }, 350);
    }

    var toast = document.createElement('div');
    toast.className = 'knockout-toast';
    toast.innerHTML =
        '<div class="toast-icon">💀</div>' +
        '<div class="toast-body">' +
            '<div class="toast-title">Eliminated!</div>' +
            '<div class="toast-desc"><strong>' + escHtml(item) + '</strong> is out of the game</div>' +
        '</div>';
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
        requestAnimationFrame(function() { toast.classList.add('show'); });
    });

    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 420);
    }, 2600);
}

// ---- Score progress toast (N modes) ----
function showScoreToast(item, score, target) {
    var existing = document.querySelector('.score-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'score-toast';
    var targetTxt = target ? ' / ' + target : '';
    var label = knockoutEnabled ? (score === 1 ? ' knock' : ' knocks') : (score === 1 ? ' win' : ' wins');
    toast.innerHTML = '⭐ <strong>' + escHtml(item) + '</strong> — ' + score + targetTxt + label;
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
        requestAnimationFrame(function() { toast.classList.add('show'); });
    });

    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 380);
    }, 1800);
}

// ---- Mode picker open / close ----
function openModePicker() {
    // Task #2: stop any in-progress spin before going to menu
    stopWheel();
    
    // Clear session so refresh stays on menu
    sessionActive = false;
    saveSettings();

    modePickerOverlay.style.display = 'flex';
    appContainer.style.display      = 'none';
    syncModePickerToState();
}

function closeModePicker() {
    modePickerOverlay.style.display = 'none';
    appContainer.style.display      = 'block';
}

function syncModePickerToState() {
    document.querySelectorAll('.mode-card').forEach(function(card) {
        card.classList.toggle('selected', card.dataset.mode === gameMode);
    });
    knockoutToggle.checked = knockoutEnabled;
    updateModeDescriptions();
}

function updateModeDescriptions() {
    var nwinDesc = document.getElementById('desc-nwin');
    var ntowinDesc = document.getElementById('desc-ntowin');
    if (!nwinDesc || !ntowinDesc) return;
    
    if (knockoutEnabled) {
        nwinDesc.textContent = 'most win get elimated, last one standing win the game';
        ntowinDesc.textContent = 'first to N get eliminated last one standing win the game';
    } else {
        nwinDesc.textContent = 'Most wins win the game';
        ntowinDesc.textContent = 'First to N wins';
    }
}

// ---- Tiny HTML escape ----
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
