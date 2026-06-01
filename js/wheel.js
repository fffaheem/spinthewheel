// ============================================================
// WHEEL — Canvas drawing, item management, segment colours
// ============================================================

// Returns the live list the wheel should display
function getActiveList() {
    return knockoutEnabled ? activeItems : items;
}

function getSegmentColor(index, list, palette) {
    // Prevent two adjacent identical colours on the last segment
    if (list.length % palette.length === 1 && index === list.length - 1) {
        return palette[1 % palette.length];
    }
    return palette[index % palette.length];
}

function drawWheel() {
    var size   = canvas.width;
    var cx     = size / 2;
    var cy     = size / 2;
    var r      = size / 2;
    var list   = getActiveList();
    var n      = list.length;
    var arcLen = (2 * Math.PI) / n;
    var palette = THEMES[colorThemeSelect.value] || THEMES.classic;
    var isLight = LIGHT_THEMES.includes(colorThemeSelect.value);
    var surfaceColor = getComputedStyle(document.documentElement)
                           .getPropertyValue('--surface').trim();

    ctx.clearRect(0, 0, size, size);
    currentAngle = currentAngle % (2 * Math.PI);

    // ---- Draw segments ----
    for (var i = 0; i < n; i++) {
        var startA = currentAngle + i * arcLen;
        var endA   = startA + arcLen;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startA, endA);
        ctx.fillStyle = getSegmentColor(i, list, palette);
        ctx.fill();

        // Segment divider
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = surfaceColor;
        ctx.stroke();
    }

    // ---- Draw labels ----
    var fontSize = n <= 8 ? 30 : n <= 13 ? 23 : n <= 20 ? 17 : 13;
    var maxChars = n <= 6 ? 17 : n <= 10 ? 13 : n <= 16 ? 9 : 7;

    for (var i = 0; i < n; i++) {
        var midA = currentAngle + i * arcLen + arcLen / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midA);
        ctx.textAlign = 'right';

        ctx.fillStyle   = isLight ? '#1a1a1a' : '#ffffff';
        ctx.shadowColor = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.65)';
        ctx.shadowBlur  = 4;
        ctx.font        = 'bold ' + fontSize + 'px -apple-system, BlinkMacSystemFont, sans-serif';

        var text = list[i];
        if (text.length > maxChars) text = text.substring(0, maxChars - 1) + '…';
        ctx.fillText(text, r - 22, fontSize * 0.36);
        ctx.restore();
    }

    // ---- Centre hub ----
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fillStyle   = surfaceColor;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.shadowBlur  = 0;
}

// ---- Called whenever the textarea changes ----
function updateItems() {
    items = itemsInput.value.split('\n').filter(function(t) { return t.trim() !== ''; });
    if (items.length === 0) items = ['Add Items'];

    // Reset active list and eliminated set
    activeItems = items.slice();
    eliminatedItems.clear();

    var minSpins = items.length + 1;
    if (nWinTotal < minSpins) {
        var diff = minSpins - nWinTotal;
        nWinTotal = minSpins;
        nWinRemaining += diff; 
        var nwinDisplay = document.getElementById('nwin-display');
        if (nwinDisplay) nwinDisplay.textContent = nWinTotal;
    }
    var nwinHint = document.getElementById('nwin-hint');
    if (nwinHint) nwinHint.textContent = 'min ' + minSpins;

    if (nToWinTarget < 2) {
        nToWinTarget = 2;
        var ntowinDisplay = document.getElementById('ntowin-display');
        if (ntowinDisplay) ntowinDisplay.textContent = nToWinTarget;
    }
    var ntowinHint = document.getElementById('ntowin-hint');
    if (ntowinHint) ntowinHint.textContent = 'min 2';

    canvas.classList.remove('winner-glow');
    updateKnockoutStatus();
    drawWheel();
    
    // Restart the mode scores so editing items resets the game
    if (typeof resetModeScores === 'function') resetModeScores();
    
    // Ensure scoreboard updates when items change
    updateScoreboard();
    updateSpinsRemaining();
    
    saveSettings();
}
