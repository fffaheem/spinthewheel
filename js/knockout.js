// ============================================================
// KNOCKOUT — Elimination helpers
// ============================================================

function resetKnockout() {
    // Task #2: stop the wheel before resetting so it doesn't keep spinning
    stopWheel();

    activeItems = items.slice();
    eliminatedItems.clear();
    canvas.classList.remove('winner-glow');
    updateKnockoutStatus();
    drawWheel();
}

function updateKnockoutStatus() {
    var wrapper = document.getElementById('knockout-count-wrapper');
    if (!knockoutEnabled) {
        if (wrapper) wrapper.style.display = 'none';
        knockoutStatusEl.style.display = 'flex';
        return;
    }
    if (wrapper) wrapper.style.display = 'inline';
    knockoutStatusEl.style.display = 'flex';
    knockoutCount.textContent = activeItems.length + '/' + items.length;
}

// Remove an item from the active pool
function eliminateItem(item) {
    var idx = activeItems.indexOf(item);
    if (idx === -1 && typeof item === 'string') {
        idx = activeItems.findIndex(function(x) { return x.name === item || x === item; });
    }
    if (idx !== -1) {
        var actualItem = activeItems[idx];
        activeItems.splice(idx, 1);
        if (actualItem && typeof actualItem === 'object') {
            eliminatedItems.add(actualItem.id);
        } else {
            eliminatedItems.add(actualItem);
        }
    }
}
