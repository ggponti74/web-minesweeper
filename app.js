/* =========================================================
   Minesweeper — app.js
   Stable touch version
   ========================================================= */

const ROWS = 16;
const COLS = 10;
const MINE_COUNT = 32;

const LONG_PRESS_MS = 500;

let board = [];
let flagsUsed = 0;

let gameState = "ready";
// ready → playing → won/lost

let elapsedSeconds = 0;
let timerInterval = null;

let gamePaused = false;
let timerStartedAt = null;
let suppressNextClick = false;

let audioContext = null;
let soundEnabled = true;

/* =========================================================
   Create board
   ========================================================= */

function createBoard() {

    stopTimer();

    board = [];
    flagsUsed = 0;

    gameState = "ready";
    elapsedSeconds = 0;

    updateTimer();
    updateMineCounter();

    for (let row = 0; row < ROWS; row++) {

        board[row] = [];

        for (let col = 0; col < COLS; col++) {

            board[row][col] = {
                mine: false,
                adjacent: 0,
                state: "hidden"
            };
        }
    }

    let minesPlaced = 0;

    while (minesPlaced < MINE_COUNT) {

        const row =
            Math.floor(Math.random() * ROWS);

        const col =
            Math.floor(Math.random() * COLS);

        if (!board[row][col].mine) {

            board[row][col].mine = true;
            minesPlaced++;
        }
    }
cheatAlmostWin();
    calculateAdjacentMines();
    renderBoard();
}


/* =========================================================
   Calculate adjacent mines
   ========================================================= */

function calculateAdjacentMines() {

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            if (board[row][col].mine) {
                continue;
            }

            let count = 0;

            for (let dr = -1; dr <= 1; dr++) {

                for (let dc = -1; dc <= 1; dc++) {

                    if (dr === 0 && dc === 0) {
                        continue;
                    }

                    const r = row + dr;
                    const c = col + dc;

                    if (
                        r < 0 ||
                        r >= ROWS ||
                        c < 0 ||
                        c >= COLS
                    ) {
                        continue;
                    }

                    if (board[r][c].mine) {
                        count++;
                    }
                }
            }

            board[row][col].adjacent = count;
        }
    }
}


/* =========================================================
   Render board
   ========================================================= */

function renderBoard() {



    const boardElement =
        document.getElementById("board");

    boardElement.innerHTML = "";

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            boardElement.appendChild(
                createCellElement(row, col)
            );
        }
    }

}


/* =========================================================
   Create one cell
   ========================================================= */

function createCellElement(row, col) {

    const element =
        document.createElement("div");

    element.className = "cell";

    element.dataset.row = row;
    element.dataset.col = col;

    /*
     * Prevent browser context menus.
     */
    element.addEventListener(
        "contextmenu",
        event => event.preventDefault()
    );

    let pressTimer = null;
    let pressStartTime = 0;

    /*
     * Finger down.
     */
    element.addEventListener(
        "pointerdown",
        event => {

            if (event.button !== 0) {
                return;
            }

initAudio();

            if (
                gameState === "won" ||
                gameState === "lost"
            ) {
                return;
            }

            pressStartTime = Date.now();

            /*
             * Capture pointer so the cell receives
             * the eventual pointerup.
             */
            element.setPointerCapture(
                event.pointerId
            );

            /*
             * Timer is only used to provide subtle
             * long-press timing. It does NOT perform
             * the action.
             */
            pressTimer = setTimeout(() => {

                pressTimer = null;

            }, LONG_PRESS_MS);

        }


    );


    /*
     * Finger movement cancels the gesture.
     */
    element.addEventListener(
        "pointermove",
        event => {

            if (pressStartTime === 0) {
                return;
            }

            const dx =
                event.clientX -
                element._startX;

            const dy =
                event.clientY -
                element._startY;

            /*
             * We don't actually need movement
             * detection for the normal case.
             */
        }
    );


    /*
     * Finger released.
     *
     * THIS is the only place where we decide whether
     * the gesture is a tap or long press.
     */
    element.addEventListener(
        "pointerup",
        event => {

            if (event.button !== 0) {
                return;
            }

            if (pressTimer !== null) {

                clearTimeout(
                    pressTimer
                );

                pressTimer = null;
            }

            const duration =
                Date.now() - pressStartTime;

            pressStartTime = 0;

            /*
             * Long press.
             */
            if (duration >= LONG_PRESS_MS) {

                cycleMark(
                    row,
                    col,
                    element
                );

                return;
            }

            /*
             * Short tap.
             */
            revealCell(
                row,
                col
            );
        }
    );


    /*
     * Cancelled pointer.
     */
    element.addEventListener(
        "pointercancel",
        () => {

            if (pressTimer !== null) {

                clearTimeout(
                    pressTimer
                );

                pressTimer = null;
            }

            pressStartTime = 0;
        }
    );


    updateCellElement(
        element,
        board[row][col]
    );

    return element;
}

document.addEventListener(
    "click",
    event => {

        if (!suppressNextClick) {
            return;
        }

        suppressNextClick = false;

        event.preventDefault();
        event.stopPropagation();

    },
    true
);
/* =========================================================
   Update cell display
   ========================================================= */

function updateCellElement(
    element,
    cell
) {

    element.className = "cell";
    element.textContent = "";

    if (cell.state === "hidden") {
        return;
    }

    if (cell.state === "flagged") {

        element.classList.add("flagged");
        element.textContent = "🚩";

        return;
    }

    if (cell.state === "question") {

        element.classList.add("question");
        element.textContent = "❓";

        return;
    }

if (cell.state === "wrong-flag") {

    element.classList.add("wrong-flag");
    element.textContent = "❌";

    return;
}

    if (cell.state === "revealed") {

        element.classList.add("revealed");

        if (cell.mine) {

            element.textContent = "💣";
            element.classList.add("mine");

            return;
        }

        if (cell.adjacent > 0) {

            element.textContent =
                cell.adjacent;

            element.classList.add(
                `number-${cell.adjacent}`
            );
        }
    }
}


/* =========================================================
   Mark cycle
   ========================================================= */

function cycleMark(row, col, element) {

    if (
        gameState === "won" ||
        gameState === "lost"
    ) {
        return;
    }

    const cell =
        board[row][col];

    if (cell.state === "revealed") {
        return;
    }

    if (cell.state === "hidden") {

        cell.state = "flagged";
        flagsUsed++;

    } else if (cell.state === "flagged") {

        cell.state = "question";
        flagsUsed--;

    } else if (cell.state === "question") {

        cell.state = "hidden";
    }

    /*
     * Update ONLY this cell.
     */
    updateCellElement(
        element,
        cell
    );

    updateMineCounter();
}


/* =========================================================
   Mine counter
   ========================================================= */

function updateMineCounter() {

    document.getElementById(
        "mine-count"
    ).textContent =
        MINE_COUNT - flagsUsed;
}


/* =========================================================
   Reveal
   ========================================================= */

function revealCell(row, col) {

    if (
        gameState === "won" ||
        gameState === "lost" ||
        gamePaused
    ) {
        return;
    }

    const cell =
        board[row][col];

    /*
     * Flags and question marks cannot be revealed.
     */
    if (cell.state !== "hidden") {
        return;
    }

    /*
     * First reveal starts timer.
     */
    if (gameState === "ready") {

        gameState = "playing";

        startTimer();
    }

    /*
     * BOOM!
     */
    if (cell.mine) {
    suppressNextClick = true;

    playMineSound();

    gameOver = true;
    gameState = "lost";

    stopTimer();

    playSound(440, 0.08);
    loseGame();

    setTimeout(() => {
        showResultOverlay(false);
    }, 2000);

    return;
}

    /*
     * Normal cell.
     */
    cell.state = "revealed";

    /*
     * Zero-cell cascade.
     */
    if (cell.adjacent === 0) {

        revealEmptyArea(
            row,
            col
        );
    }

    renderBoard();

    checkWin();
} 


function loseGame() {

    gameState = "lost";

    stopTimer();

    /*
     * Reveal every mine.
     */
    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            const cell =
                board[row][col];

            if (cell.mine) {

                /*
                 * Correctly flagged mines stay flagged.
                 */
                if (cell.state !== "flagged") {

                    cell.state = "revealed";
                }

            } else {

                /*
                 * Incorrect flags become X.
                 */
                if (cell.state === "flagged") {

                    cell.state = "wrong-flag";
                }
            }
        }
    }

    renderBoard();

}


/* =========================================================
   Zero-cell cascade
   ========================================================= */

function revealEmptyArea(
    startRow,
    startCol
) {

    const queue = [
        [startRow, startCol]
    ];

    const visited = new Set();

    while (queue.length > 0) {

        const [
            row,
            col
        ] = queue.shift();

        const key =
            `${row},${col}`;

        if (visited.has(key)) {
            continue;
        }

        visited.add(key);

        const cell =
            board[row][col];

        if (cell.mine) {
            continue;
        }

        if (
            cell.state === "flagged" ||
            cell.state === "question"
        ) {
            continue;
        }

        cell.state = "revealed";

        if (cell.adjacent > 0) {
            continue;
        }

        for (let dr = -1; dr <= 1; dr++) {

            for (let dc = -1; dc <= 1; dc++) {

                if (dr === 0 && dc === 0) {
                    continue;
                }

                const r = row + dr;
                const c = col + dc;

                if (
                    r < 0 ||
                    r >= ROWS ||
                    c < 0 ||
                    c >= COLS
                ) {
                    continue;
                }

                const neighbor =
                    board[r][c];

                if (
                    !neighbor.mine &&
                    neighbor.state === "hidden"
                ) {

                    queue.push([
                        r,
                        c
                    ]);
                }
            }
        }
    }
}


/* =========================================================
   Win check
   ========================================================= */

function checkWin() {

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            const cell =
                board[row][col];

            if (
                !cell.mine &&
                cell.state !== "revealed"
            ) {
                return;
            }
        }
    }

    gameState = "won";

    stopTimer();

    showResultOverlay(true);
}


/* =========================================================
   Sound
   ========================================================= */

const soundToggle = document.getElementById("sound-toggle");

function initAudio() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    saveSettings();
    updateSoundButton();

    if (soundEnabled) {
        playSound(600, 0.12);
    }
});

function updateSoundButton() {
    soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
    soundToggle.setAttribute(
        "aria-label",
        soundEnabled ? "Sound on" : "Sound off"
    );
}

function playSound(frequency, duration, type = "sine", volume = 0.20) {

    if (!soundEnabled) return;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function playMineSound() {

    if (!soundEnabled) {
        return;
    }

    playSound(180, 0.25, "sawtooth", 0.20);

    setTimeout(() => {
        playSound(100, 0.35, "sawtooth", 0.20);
    }, 100);
}
  

/* =========================================================
   Timer
   ========================================================= */

function startTimer() {

    if (
        timerInterval !== null ||
        gamePaused ||
        gameState === "won" ||
        gameState === "lost"
    ) {
        return;
    }

    timerStartedAt = Date.now();

    timerInterval = setInterval(() => {

        if (gamePaused) {
            return;
        }

        elapsedSeconds++;

        updateTimer();

    }, 1000);
}

function stopTimer() {

    if (timerInterval !== null) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;
    }
}


function updateTimer() {

    const minutes =
        Math.floor(
            elapsedSeconds / 60
        );

    const seconds =
        elapsedSeconds % 60;

    document.getElementById(
        "timer"
    ).textContent =
        `${minutes}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================================
   App visibility / pause
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            /*
             * Don't pause a game that hasn't started.
             */
            if (gameState === "playing") {

                gamePaused = true;

                stopTimer();
            }

        } else {

            /*
             * Resume only if the game was actually paused.
             */
            if (
                gamePaused &&
                gameState === "playing"
            ) {

                gamePaused = false;

                startTimer();
            }
        }
    }
);


/* =========================================================
   Page lifecycle
   ========================================================= */

window.addEventListener(
    "pagehide",
    () => {

        if (gameState === "playing") {

            gamePaused = true;

            stopTimer();
        }
    }
);


window.addEventListener(
    "pageshow",
    () => {

        if (
            gamePaused &&
            gameState === "playing"
        ) {

            gamePaused = false;

            startTimer();
        }
    }
);


/* =========================================================
   New Game
   ========================================================= */

function newGame() {
            resultOverlay.classList.add("hidden");
    createBoard();
}

function cheatAlmostWin() {

    let safeCells = [];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {

            const cell = board[row][col];

            if (!cell.mine) {
                safeCells.push(cell);
            }
        }
    }

    // Reveal all but two safe cells
    for (let i = 0; i < safeCells.length - 1; i++) {
        safeCells[i].state = "revealed";
    }

    renderBoard();
}

document
    .getElementById("new-game")
    .addEventListener(
        "click",
        newGame
    );

const resultButton = document.getElementById("result-new-game");

resultButton.addEventListener("click", newGame);

/* =========================================================
   Settings
   ========================================================= */

function loadSettings() {
const savedSound = localStorage.getItem("minesweeper-sound");

if (savedSound !== null) {
    soundEnabled = savedSound === "true";
}
} 

function saveSettings() {
localStorage.setItem("minesweeper-sound", soundEnabled);
} 

/*
*/

const resultOverlay = document.getElementById("result-overlay");
const resultIcon = document.getElementById("result-icon");
const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");

function showResultOverlay(won) {
    stopTimer();

    if (won) {
        resultIcon.textContent = "🏆";
        resultTitle.textContent = "You Win!";
        resultMessage.textContent = "Congratulations!";
    } else {
        resultIcon.textContent = "💣";
        resultTitle.textContent = "Game Over";
        resultMessage.textContent = "You hit a mine!";
    }

    resultOverlay.classList.remove("hidden");
} 
/* =========================================================
   Start
   ========================================================= */

loadSettings();

updateSoundButton();

createBoard();
