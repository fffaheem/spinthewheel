// ============================================================
// MODES — Game mode logic: Classic, N Win, N to Win
// ============================================================

// ================================================================
//  SHARED INIT / RESET
// ================================================================

function resetModeScores() {
    nWinScores      = {};
    nWinRoundScores = {};
    nToWinScores    = {};
    nWinRemaining   = nWinTotal;
    nWinRound       = 1;

    // Seed score maps so UI shows 0 from the start
    var list = getActiveList();
    list.forEach(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        nWinScores[itemId]      = 0;
        nWinRoundScores[itemId] = 0;
        nToWinScores[itemId]    = 0;
    });

    updateScoreboard();
    updateSpinsRemaining();
}

// ---- Router: called by physics.js when the wheel stops ----
function handleSpinComplete(winnerItem) {
    switch (gameMode) {
        case 'nwin':   handleNWinSpin(winnerItem);   break;
        case 'ntowin': handleNToWinSpin(winnerItem); break;
        default:       handleClassicWin(winnerItem); break;
    }
}

// ================================================================
//  CLASSIC MODE
// ================================================================
function handleClassicWin(winnerItem) {
    var winnerName = (winnerItem && typeof winnerItem === 'object') ? winnerItem.name : winnerItem;
    if (knockoutEnabled) {
        _classicKnockoutRound(winnerItem);
    } else {
        resultDisplay.textContent = '🎉 ' + winnerName;
        playWinSound(false);
        startConfetti(2500);
        showCelebrationModal('Winner!', winnerName, '🎉');
        addHistory(winnerName);
        saveSettings();
    }
}

function _classicKnockoutRound(winnerItem) {
    var winnerName = (winnerItem && typeof winnerItem === 'object') ? winnerItem.name : winnerItem;
    if (activeItems.length <= 1) {
        resetKnockout();
        resultDisplay.textContent = 'Ready to spin!';
        return;
    }

    // Classic KO: the item the wheel lands on is ELIMINATED
    eliminateItem(winnerItem);
    playElimSound();
    showKnockoutToast(winnerName);
    addHistory('💀 Eliminated: ' + winnerName);
    updateKnockoutStatus();

    if (activeItems.length === 1) {
        var champion = activeItems[0];
        var championName = (champion && typeof champion === 'object') ? champion.name : champion;
        setTimeout(function() {
            resultDisplay.textContent = '🏆 ' + championName;
            canvas.classList.add('winner-glow');
            playWinSound(true);
            startConfetti(4500);
            showCelebrationModal('Ultimate Winner!', championName, '🏆');
            addHistory('🏆 Ultimate Winner: ' + championName);
            saveSettings();
            drawWheel();
            updateKnockoutStatus();
        }, 700);
    } else {
        resultDisplay.textContent = '💀 ' + winnerName + ' eliminated';
        saveSettings();
        drawWheel();
    }
}

// ================================================================
//  N WIN MODE
//
//  WITHOUT Knockout: run nWinTotal spins, item with most wins wins.
//
//  WITH Knockout (Task #6 — Round-based elimination):
//    • Run nWinTotal spins as one "round".
//    • The item with the MOST wins in that round is knocked out.
//    • Reset round scores, repeat with remaining items.
//    • Last item standing is the ultimate winner.
// ================================================================

function handleNWinSpin(winnerItem) {
    var winnerId   = (winnerItem && typeof winnerItem === 'object') ? winnerItem.id : winnerItem;
    var winnerName = (winnerItem && typeof winnerItem === 'object') ? winnerItem.name : winnerItem;

    // Track both round score and cumulative score
    if (nWinRoundScores[winnerId] === undefined) nWinRoundScores[winnerId] = 0;
    if (nWinScores[winnerId]      === undefined) nWinScores[winnerId]      = 0;
    nWinRoundScores[winnerId]++;
    nWinScores[winnerId]++;
    nWinRemaining--;

    resultDisplay.textContent = '⭐ ' + winnerName;
    playWinSound(false);
    showScoreToast(winnerName, nWinRoundScores[winnerId], nWinTotal);

    updateScoreboard();
    updateSpinsRemaining();
    updateKnockoutStatus();
    drawWheel();

    var spinNum = nWinTotal - nWinRemaining;
    addHistory('⭐ ' + winnerName + (knockoutEnabled
        ? ' (R' + nWinRound + ' spin ' + spinNum + '/' + nWinTotal + ')'
        : ' (spin ' + spinNum + '/' + nWinTotal + ')'));
    saveSettings();

    if (nWinRemaining <= 0) {
        if (knockoutEnabled) {
            setTimeout(_nWinKnockoutRoundEnd, 1000);
        } else {
            setTimeout(finalizeNWin, 1000);
        }
    }
}

// ---- Called when a knockout round of N spins is complete ----
function _nWinKnockoutRoundEnd() {
    // Find item(s) with the highest round score
    var maxRoundScore = 0;
    activeItems.forEach(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        var s = nWinRoundScores[itemId] || 0;
        if (s > maxRoundScore) maxRoundScore = s;
    });

    var roundLeaders = activeItems.filter(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        return (nWinRoundScores[itemId] || 0) === maxRoundScore;
    });

    // Pick one at random if tied
    var toEliminate = roundLeaders[Math.floor(Math.random() * roundLeaders.length)];

    eliminateItem(toEliminate);
    updateScoreboard(); // INSTANTLY update scoreboard so item drops to bottom
    
    var toEliminateName = (toEliminate && typeof toEliminate === 'object') ? toEliminate.name : toEliminate;
    playElimSound();
    showKnockoutToast(toEliminateName);
    addHistory('💀 Round ' + nWinRound + ' eliminated: ' + toEliminateName +
               ' (' + maxRoundScore + ' wins this round)');

    nWinRound++;
    updateKnockoutStatus();

    if (activeItems.length === 1) {
        // Last item standing → WINNER
        var champion = activeItems[0];
        var championName = (champion && typeof champion === 'object') ? champion.name : champion;
        setTimeout(function() {
            resultDisplay.textContent = '🏆 ' + championName;
            canvas.classList.add('winner-glow');
            playWinSound(true);
            startConfetti(4500);
            showCelebrationModal('Last Standing!', championName, '🏆');
            addHistory('🏆 N Win Champion: ' + championName);
            saveSettings();
        }, 700);
    } else if (activeItems.length === 0) {
        resetKnockout();
    } else {
        // Start next round
        setTimeout(_nWinStartNextRound, 800);
    }
}

function _nWinStartNextRound() {
    // Reset round scores for remaining active items
    nWinRoundScores = {};
    activeItems.forEach(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        nWinRoundScores[itemId] = 0;
    });
    nWinRemaining = nWinTotal;

    resultDisplay.textContent = 'Round ' + nWinRound + ' — Spin!';
    updateScoreboard();
    updateSpinsRemaining();
    drawWheel();
}

// ---- Finalize non-knockout N Win (highest score wins) ----
function finalizeNWin() {
    var pool = items.slice();
    var maxScore = 0;
    pool.forEach(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        maxScore = Math.max(maxScore, nWinScores[itemId] || 0);
    });
    var winners = pool.filter(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        return (nWinScores[itemId] || 0) === maxScore;
    });

    if (winners.length === 1) {
        var winner = winners[0];
        var winnerName = (winner && typeof winner === 'object') ? winner.name : winner;
        resultDisplay.textContent = '🏆 ' + winnerName;
        canvas.classList.add('winner-glow');
        playWinSound(true);
        startConfetti(4000);
        showCelebrationModal('Most wins (' + maxScore + ')!', winnerName, '🏆');
        addHistory('🏆 N Win Champion: ' + winnerName + ' (' + maxScore + ' wins)');
    } else {
        var tieNames = winners.map(function(w) {
            return (w && typeof w === 'object') ? w.name : w;
        });
        var tieText = tieNames.join(' & ');
        resultDisplay.textContent = '🤝 ' + tieText;
        playWinSound(false);
        startConfetti(3000);
        showCelebrationModal("It's a Tie! (" + maxScore + " wins each)", tieText, '🤝');
        addHistory('🤝 Tie: ' + tieText + ' (' + maxScore + ' wins each)');
    }
    saveSettings();
}

// ================================================================
//  N TO WIN MODE
//
//  WITHOUT Knockout: first item to reach nToWinTarget wins.
//
//  WITH Knockout (Task #7 — Hot Potato):
//    • Keep spinning normally.
//    • The first item to REACH nToWinTarget is KNOCKED OUT (not won!).
//    • Scores carry over for remaining items.
//    • Repeat until only 1 item is left → that item is the winner.
// ================================================================

function handleNToWinSpin(winnerItem) {
    var winnerId   = (winnerItem && typeof winnerItem === 'object') ? winnerItem.id : winnerItem;
    var winnerName = (winnerItem && typeof winnerItem === 'object') ? winnerItem.name : winnerItem;

    if (nToWinScores[winnerId] === undefined) nToWinScores[winnerId] = 0;
    nToWinScores[winnerId]++;
    var score = nToWinScores[winnerId];

    resultDisplay.textContent = '⭐ ' + winnerName + ' (' + score + '/' + nToWinTarget + ')';
    playWinSound(false);
    showScoreToast(winnerName, score, nToWinTarget);

    updateScoreboard();
    updateKnockoutStatus();
    drawWheel();
    addHistory('⭐ ' + winnerName + ' (' + score + '/' + nToWinTarget + ')');

    if (score >= nToWinTarget) {
        if (knockoutEnabled) {
            // HOT POTATO: this item has hit the target → it is ELIMINATED
            setTimeout(function() {
                eliminateItem(winnerItem);
                
                // Task 4: Reset all remaining active items' scores to 0
                activeItems.forEach(function(item) {
                    var itemId = (item && typeof item === 'object') ? item.id : item;
                    nToWinScores[itemId] = 0;
                });

                updateScoreboard();

                playElimSound();

                // Custom toast for "burnt" elimination
                var existing = document.querySelector('.knockout-toast');
                if (existing) { existing.classList.remove('show'); setTimeout(function() { if (existing.parentNode) existing.remove(); }, 350); }
                var toast = document.createElement('div');
                toast.className = 'knockout-toast';
                toast.innerHTML =
                    '<div class="toast-icon">🔥</div>' +
                    '<div class="toast-body">' +
                        '<div class="toast-title">Eliminated!</div>' +
                        '<div class="toast-desc"><strong>' + escHtml(winnerName) + '</strong> reached ' + nToWinTarget + ' — eliminated!</div>' +
                    '</div>';
                document.body.appendChild(toast);
                requestAnimationFrame(function() { requestAnimationFrame(function() { toast.classList.add('show'); }); });
                setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { if (toast.parentNode) toast.remove(); }, 420); }, 2800);

                addHistory('🔥 Eliminated (' + nToWinTarget + ' hits): ' + winnerName);
                updateKnockoutStatus();

                if (activeItems.length === 1) {
                    var survivor = activeItems[0];
                    var survivorName = (survivor && typeof survivor === 'object') ? survivor.name : survivor;
                    setTimeout(function() {
                        resultDisplay.textContent = '🏆 ' + survivorName;
                        canvas.classList.add('winner-glow');
                        playWinSound(true);
                        startConfetti(4500);
                        showCelebrationModal('Last Survivor!', survivorName, '🏆');
                        addHistory('🏆 N to Win Survivor: ' + survivorName);
                        saveSettings();
                    }, 700);
                } else if (activeItems.length === 0) {
                    resetKnockout();
                } else {
                    resultDisplay.textContent = winnerName + ' eliminated! Keep spinning!';
                    drawWheel();
                    saveSettings();
                }
            }, 400);
            return;
        } else {
            // No knockout: first to reach target WINS
            setTimeout(function() {
                resultDisplay.textContent = '🏆 ' + winnerName;
                canvas.classList.add('winner-glow');
                playWinSound(true);
                startConfetti(4500);
                showCelebrationModal('First to ' + nToWinTarget + '!', winnerName, '🏆');
                addHistory('🏆 N to Win Champion: ' + winnerName);
                saveSettings();
            }, 350);
            return;
        }
    }

    saveSettings();
}

// ================================================================
//  SHARED HELPERS
// ================================================================

function addHistory(text) {
    if (!historyToggle.checked) return;
    var li = document.createElement('li');
    li.textContent = text;
    historyList.prepend(li);
}

function updateScoreboard() {
    if (gameMode === 'classic') {
        scoreboardCard.style.display = 'none';
        return;
    }
    scoreboardCard.style.display = 'block';

    // Decide which score map to display
    var scores;
    var maxPossible;

    if (gameMode === 'nwin') {
        // In knockout mode, show the ROUND scores so user sees current-round progress
        scores      = knockoutEnabled ? nWinRoundScores : nWinScores;
        maxPossible = Math.max(nWinTotal, 1);
    } else {
        scores      = nToWinScores;
        maxPossible = Math.max(nToWinTarget, 1);
    }

    var allItems = items.slice();

    // Sort: active first sorted by score desc, eliminated last
    allItems.sort(function(a, b) {
        var aId = (a && typeof a === 'object') ? a.id : a;
        var bId = (b && typeof b === 'object') ? b.id : b;
        var elimA = eliminatedItems.has(aId) ? 1 : 0;
        var elimB = eliminatedItems.has(bId) ? 1 : 0;
        if (elimA !== elimB) return elimA - elimB;
        return (scores[bId] || 0) - (scores[aId] || 0);
    });

    var maxScore = 0;
    allItems.forEach(function(item) {
        var itemId = (item && typeof item === 'object') ? item.id : item;
        maxScore = Math.max(maxScore, scores[itemId] || 0);
    });

    // In KO modes the LEADER is "at risk" (about to be eliminated), not "winning"
    var leaderIsGood = !knockoutEnabled;

    scoreboardEl.innerHTML = '';
    allItems.forEach(function(item, idx) {
        var itemId   = (item && typeof item === 'object') ? item.id : item;
        var itemName = (item && typeof item === 'object') ? item.name : item;
        var score    = scores[itemId] || 0;
        var isElim   = eliminatedItems.has(itemId);
        var isLeader = !isElim && score === maxScore && score > 0;
        var barPct   = Math.round((score / maxPossible) * 100);

        var rowClass = 'score-row';
        if (isLeader)            rowClass += leaderIsGood ? ' leading' : ' at-risk';
        if (isElim)              rowClass += ' eliminated';

        var row = document.createElement('div');
        row.className = rowClass;
        row.innerHTML =
            '<div class="score-rank">' + (isElim ? '💀' : (idx + 1)) + '</div>' +
            '<div class="score-name" title="' + escHtml(itemName) + '">' + escHtml(itemName) + '</div>' +
            '<div class="score-bar-wrap">' +
                '<div class="score-bar" style="width:' + barPct + '%"></div>' +
            '</div>' +
            '<div class="score-count">' + score + '</div>';

        scoreboardEl.appendChild(row);
    });

    // Show/hide in-game N config rows
    var nwinRow   = document.getElementById('nwin-config-row');
    var ntowinRow = document.getElementById('ntowin-config-row');
    if (nwinRow)   nwinRow.style.display   = (gameMode === 'nwin')   ? 'flex' : 'none';
    if (ntowinRow) ntowinRow.style.display = (gameMode === 'ntowin') ? 'flex' : 'none';

    // Update displayed values
    var nwinDisp   = document.getElementById('nwin-display');
    var ntowinDisp = document.getElementById('ntowin-display');
    if (nwinDisp)   nwinDisp.textContent   = nWinTotal;
    if (ntowinDisp) ntowinDisp.textContent = nToWinTarget;

    // Update in-game configuration label based on knockoutEnabled
    var ntowinLabel = document.getElementById('ntowin-label');
    if (ntowinLabel) {
        ntowinLabel.textContent = knockoutEnabled ? 'Knocks to eliminate' : 'Wins to win';
    }

    // Update scoreboard title
    var sbTitle = document.getElementById('scoreboard-title');
    if (sbTitle) {
        if (gameMode === 'nwin' && knockoutEnabled) {
            sbTitle.textContent = 'Scoreboard — Round ' + nWinRound;
        } else {
            sbTitle.textContent = 'Scoreboard';
        }
    }
}

function updateSpinsRemaining() {
    if (gameMode !== 'nwin') {
        spinsRemainingDisplay.style.display = 'none';
        return;
    }
    spinsRemainingDisplay.style.display = 'block';
    var n = nWinRemaining;
    var roundInfo = knockoutEnabled ? ' (Round ' + nWinRound + ')' : '';
    spinsRemainingDisplay.innerHTML =
        '<strong>' + n + '</strong> spin' + (n !== 1 ? 's' : '') + ' remaining' + roundInfo;
}

function updateModeBadge() {
    var labels = {
        classic: '🎯 Classic',
        nwin:    '🏅 N Win · ' + nWinTotal + ' spins/round',
        ntowin:  '🎖️ N to Win · ' + (knockoutEnabled ? 'eliminate at ' + nToWinTarget + ' knocks' : 'win at ' + nToWinTarget),
    };
    modeBadge.textContent = labels[gameMode] || '🎯 Classic';
}

// ---- Called by "Start Playing" button ----
function startGameSession() {
    // Task #3: mark session as active so refresh skips the mode picker
    sessionActive = true;

    // Task #2: stop any in-progress spin
    stopWheel();

    resetKnockout();
    resetModeScores();
    canvas.classList.remove('winner-glow');
    resultDisplay.textContent = 'Ready to spin!';

    updateModeBadge();
    updateKnockoutStatus();
    updateScoreboard();
    updateSpinsRemaining();
    saveSettings();
    closeModePicker();
}
