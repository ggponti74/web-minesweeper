/* =========================================================
   Minesweeper — app.js
   Part 4: Game state + timer + reliable touch marking
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


/* =========================================================
   Create a new board
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

    calculateAdjacentMines();
    renderBoard();
}


/* =========================================================
   Calculate adjacent mine counts
   ========================================================= */

function calculateAdjacentMines() {

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            if (board[row][col].mine) {
                continue;
            }

            let count = 0;

            for (
                let rowOffset = -1;
                rowOffset <= 1;
                rowOffset++
            ) {

                for (
                    let colOffset = -1;
                    colOffset <= 1;
                    colOffset++
                ) {

                    if (
                        rowOffset === 0 &&
                        colOffset === 0
                    ) {
                        continue;
                    }

                    const neighborRow =
                        row + rowOffset;

                    const neighborCol =
                        col + colOffset;

                    if (
                        neighborRow < 0 ||
                        neighborRow >= ROWS ||
                        neighborCol < 0 ||
                        neighborCol >= COLS
                    ) {
                        continue;
                    }

                    if (
                        board[
                            neighborRow
                        ][
                            neighborCol
                        ].mine
                    ) {
                        count++;
                    }
                }
            }

            board[row][col].adjacent = count;
        }
    }
}


/* =========================================================
   Render entire board
   ========================================================= */

function renderBoard() {

    const boardElement =
        document.getElementById("board");

    boardElement.innerHTML = "";

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            const cellElement =
                createCellElement(row, col);

            boardElement.appendChild(
                cellElement
            );
        }
    }
}


/* =========================================================
   Create one cell element
   ========================================================= */

function createCellElement(row, col) {

    const cell =
        board[row][col];

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
        event => {
            event.preventDefault();
        }
    );

    /*
     * Touch / pointer state.
     */
    let longPressTimer = null;
    let longPressTriggered = false;
    let pointerStartX = 0;
    let pointerStartY = 0;

    /*
     * Pointer down.
     */
    element.addEventListener(
        "pointerdown",
        event => {

            if (event.button !== 0) {
                return;
            }

            if (
                gameState === "won" ||
                gameState === "lost"
            ) {
                return;
            }

            longPressTriggered = false;

            pointerStartX = event.clientX;
            pointerStartY = event.clientY;

            /*
             * Capture the pointer so we continue receiving
             * events even if the finger moves slightly.
             */
            element.setPointerCapture(
                event.pointerId
            );

            longPressTimer = setTimeout(() => {

                longPressTriggered = true;

                cycleMark(
                    row,
                    col,
                    element
                );

            }, LONG_PRESS_MS);
        }
    );

    /*
     * Movement.
     *
     * A small amount of finger movement is tolerated.
     * Larger movement cancels the long press.
     */
    element.addEventListener(
        "pointermove",
        event => {

            if (longPressTimer === null) {
                return;
            }

            const dx =
                event.clientX - pointerStartX;

            const dy =
                event.clientY - pointerStartY;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (distance > 12) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer = null;
            }
        }
    );

    /*
     * Pointer up.
     */
    element.addEventListener(
        "pointerup",
        event => {

            if (longPressTimer !== null) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer = null;
            }

            if (event.button !== 0) {
                return;
            }

            /*
             * A long press has already performed
             * the marking action.
             */
            if (longPressTriggered) {
                return;
            }

            /*
             * Otherwise this was a normal tap.
             */
            revealCell(row, col);
        }
    );

    /*
     * Pointer cancellation.
     */
    element.addEventListener(
        "pointercancel",
        () => {

            if (longPressTimer !== null) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer = null;
            }
        }
    );

    updateCellElement(
        element,
        cell
    );

    return element;
}


/* =========================================================
   Update one cell's DOM
   ========================================================= */

function updateCellElement(
    element,
    cell
) {

    element.className = "cell";
    element.textContent = "";

    /*
     * Hidden.
     */
    if (cell.state === "hidden") {
        return;
    }

    /*
     * Flag.
     */
    if (cell.state === "flagged") {

        element.classList.add(
            "flagged"
        );

        element.textContent = "🚩";

        return;
    }

    /*
     * Question mark.
     */
    if (cell.state === "question") {

        element.classList.add(
            "question"
        );

        element.textContent = "❓";

        return;
    }

    /*
     * Revealed.
     */
    if (cell.state === "revealed") {

        element.classList.add(
            "revealed"
        );

        if (cell.mine) {

            element.textContent = "💣";

            element.classList.add(
                "mine"
            );

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
   Find a cell's DOM element
   ========================================================= */

function getCellElement(row, col) {

    return document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
}


/* =========================================================
   Cycle:
   hidden → flagged → question → hidden
   ========================================================= */

function cycleMark(
    row,
    col,
    element
) {

    if (
        gameState === "won" ||
        gameState === "lost"
    ) {
        return;
    }

    const cell =
        board[row][col];

    /*
     * Revealed cells cannot be marked.
     */
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
     * IMPORTANT:
     * Only update this cell.
     * Do NOT rebuild the board here.
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

    const remaining =
        MINE_COUNT - flagsUsed;

    document.getElementById(
        "mine-count"
    ).textContent = remaining;
}


/* =========================================================
   Reveal a cell
   ========================================================= */

function revealCell(row, col) {

    if (
        gameState === "won" ||
        gameState === "lost"
    ) {
        return;
    }

    const cell =
        board[row][col];

    /*
     * Only a completely hidden cell can be revealed.
     *
     * This is what prevents:
     * flag → question → accidental reveal
     */
    if (cell.state !== "hidden") {
        return;
    }

    /*
     * First reveal starts the timer.
     */
    if (gameState === "ready") {

        gameState = "playing";

        startTimer();
    }

    /*
     * Mine.
     */
    if (cell.mine) {

        cell.state = "revealed";

        gameState = "lost";

        stopTimer();

        renderBoard();

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


/* =========================================================
   Reveal connected zero area
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

        /*
         * Never overwrite flags/questions.
         */
        if (
            cell.state === "flagged" ||
            cell.state === "question"
        ) {
            continue;
        }

        cell.state = "revealed";

        /*
         * Numbered cells stop this branch.
         */
        if (cell.adjacent > 0) {
            continue;
        }

        /*
         * Zero cell — examine neighbors.
         */
        for (
            let rowOffset = -1;
            rowOffset <= 1;
            rowOffset++
        ) {

            for (
                let colOffset = -1;
                colOffset <= 1;
                colOffset++
            ) {

                if (
                    rowOffset === 0 &&
                    colOffset === 0
                ) {
                    continue;
                }

                const neighborRow =
                    row + rowOffset;

                const neighborCol =
                    col + colOffset;

                if (
                    neighborRow < 0 ||
                    neighborRow >= ROWS ||
                    neighborCol < 0 ||
                    neighborCol >= COLS
                ) {
                    continue;
                }

                const neighbor =
                    board[
                        neighborRow
                    ][
                        neighborCol
                    ];

                if (
                    !neighbor.mine &&
                    neighbor.state === "hidden"
                ) {

                    queue.push([
                        neighborRow,
                        neighborCol
                    ]);
                }
            }
        }
    }
}


/* =========================================================
   Check victory
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
}


/* =========================================================
   Timer
   ========================================================= */

function startTimer() {

    if (timerInterval !== null) {
        return;
    }

    timerInterval = setInterval(
        () => {

            elapsedSeconds++;

            updateTimer();

        },
        1000
    );
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

    const formatted =
        `${minutes}:${String(seconds).padStart(2, "0")}`;

    document.getElementById(
        "timer"
    ).textContent = formatted;
}


/* =========================================================
   New Game
   ========================================================= */

function newGame() {
    createBoard();
}


/* =========================================================
   New Game button
   ========================================================= */

document
    .getElementById("new-game")
    .addEventListener(
        "click",
        newGame
    );


/* =========================================================
   Start
   ========================================================= */

createBoard();