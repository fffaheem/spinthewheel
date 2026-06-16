// ============================================================
// PHYSICS — Animation loop, winner detection, spin trigger
// ============================================================

// ---- Stop the wheel immediately (called on restart / menu) ----
function stopWheel() {
    cancelAnimationFrame(animationFrame);
    angularVelocity = 0;
    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.style.opacity = '1';
    if (typeof centerSpinBtn !== 'undefined' && centerSpinBtn) {
        centerSpinBtn.disabled = false;
    }
}

function getWinnerIndex() {
    var list = getActiveList();
    if (!list || list.length === 0) return 0;
    var arcLen = (2 * Math.PI) / list.length;
    var pAngle = (3 * Math.PI / 2) - currentAngle;
    pAngle = ((pAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(pAngle / arcLen) % list.length;
}

function animate() {
    if (angularVelocity > 0) {
        currentAngle += angularVelocity;

        // Friction: maps slider 1-100 → factor 0.980..0.998
        var frictionFactor = 0.980 + (parseInt(frictionSlider.value) / 100) * 0.018;
        angularVelocity *= frictionFactor;

        // Tick sound when crossing a new segment
        var seg = getWinnerIndex();
        if (seg !== lastTickSegment) {
            playTick();
            lastTickSegment = seg;
        }

        if (angularVelocity < 0.0012) {
            // ---- Wheel stopped ----
            angularVelocity = 0;
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.style.opacity = '1';
            if (typeof centerSpinBtn !== 'undefined' && centerSpinBtn) {
                centerSpinBtn.disabled = false;
            }

            var list = getActiveList();
            var idx = getWinnerIndex();
            var winner = list[idx];
            if (winner) handleSpinComplete(winner);
        } else {
            animationFrame = requestAnimationFrame(animate);
        }
    }
    drawWheel();
}

function spin() {
    if (isSpinning) return;

    var list = getActiveList();

    if (!list || list.length < MIN_ITEMS_TO_SPIN) {
        if (knockoutEnabled && activeItems.length <= 1) {
            resetKnockout();
            resultDisplay.textContent = 'Knockout reset — ready!';
            return;
        }
        alert('Please add at least 2 items to spin!');
        return;
    }

    // N Win: guard after all spins consumed
    if (gameMode === 'nwin' && nWinRemaining <= 0) {
        return;
    }

    canvas.classList.remove('winner-glow');
    initAudio();

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.style.opacity = '0.5';
    if (typeof centerSpinBtn !== 'undefined' && centerSpinBtn) {
        centerSpinBtn.disabled = true;
    }
    resultDisplay.textContent = 'Spinning…';

    var power = parseInt(powerSlider.value);
    var baseVel = power / 100;
    var rndBoost = Math.random() * 0.12;
    angularVelocity = baseVel + rndBoost;

    lastTickSegment = getWinnerIndex();
    cancelAnimationFrame(animationFrame);
    animate();
}

// ---- Tab Switching / Visibility Support ----
// Fast-forwards the physics to the end if the user switches tabs, ensuring the spin finishes cleanly in the background.
document.addEventListener('visibilitychange', function () {
    if (document.hidden && isSpinning && angularVelocity > 0) {
        cancelAnimationFrame(animationFrame);

        var frictionFactor = 0.980 + (parseInt(frictionSlider.value) / 100) * 0.018;
        while (angularVelocity >= 0.0012) {
            currentAngle += angularVelocity;
            angularVelocity *= frictionFactor;
        }

        angularVelocity = 0;
        isSpinning = false;
        spinBtn.disabled = false;
        spinBtn.style.opacity = '1';
        if (typeof centerSpinBtn !== 'undefined' && centerSpinBtn) {
            centerSpinBtn.disabled = false;
        }

        var list = getActiveList();
        var idx = getWinnerIndex();
        var winner = list[idx];

        drawWheel();

        if (winner) {
            handleSpinComplete(winner);
        }
    }
});
