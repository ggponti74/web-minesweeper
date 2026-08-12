/* =========================================================
   Minesweeper — app.js
   Part 3: Reveal + long-press flags/question marks
   ========================================================= */

const ROWS = 16;
const COLS = 10;
const MINE_COUNT = 32;

const LONG_PRESS_MS = 500;

let board = [];
let flagsUsed = 0;


/* =========================================================
   Create a new board
   ========================================================= */

function createBoard() {
    board = [];
    flagsUsed = 0;

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
        const row = Math.floor(Math.random() * ROWS);
        const col = Math.floor(Math.random() * COLS);

        if (!board[row][col].mine) {
            board[row][col].mine = true;
            minesPlaced++;
        }
    }

    calculateAdjacentMines();
    updateMineCounter();
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

            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                for (let colOffset = -1; colOffset <= 1; colOffset++) {

                    if (rowOffset === 0 && colOffset === 0) {
                        continue;
                    }

                    const neighborRow = row + rowOffset;
                    const neighborCol = col + colOffset;

                    if (
                        neighborRow < 0 ||
                        neighborRow >= ROWS ||
                        neighborCol < 0 ||
                        neighborCol >= COLS
                    ) {
                        continue;
                    }

                    if (board[neighborRow][neighborCol].mine) {
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

    const boardElement = document.getElementById("board");

    boardElement.innerHTML = "";

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {

            const cell = board[row][col];

            const cellElement = document.createElement("div");

            cellElement.className = "cell";

            cellElement.dataset.row = row;
            cellElement.dataset.col = col;

            /*
             * Prevent browser context menus.
             */
            cellElement.addEventListener("contextmenu", event => {
                event.preventDefault();
            });

            /*
             * Track whether this interaction became
             * a long press.
             */
            let longPressTimer = null;
            let longPressTriggered = false;

            /*
             * Start long-press timer.
             */
            cellElement.addEventListener("pointerdown", event => {

                if (event.button !== 0) {
                    return;
                }

                longPressTriggered = false;

                longPressTimer = setTimeout(() => {

                    longPressTriggered = true;

                    cycleMark(row, col);

                }, LONG_PRESS_MS);
            });

            /*
             * Cancel the long press if the pointer moves.
             */
            cellElement.addEventListener("pointermove", () => {

                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });

            /*
             * Short tap = reveal.
             *
             * Long press has already performed the marking
             * operation, so it must not also reveal.
             */
            cellElement.addEventListener("pointerup", event => {

                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }

                if (event.button !== 0) {
                    return;
                }

                if (longPressTriggered) {
                    return;
                }

                revealCell(row, col);
            });

            /*
             * Cancel interaction if the pointer leaves the cell.
             */
            cellElement.addEventListener("pointerleave", () => {

                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });

            updateCellElement(cellElement, cell);

            boardElement.appendChild(cellElement);
        }
    }
}


/* =========================================================
   Update one cell's appearance
   ========================================================= */

function updateCellElement(element, cell) {

    element.className = "cell";
    element.textContent = "";

    /*
     * Hidden cell.
     */
    if (cell.state === "hidden") {
        return;
    }

    /*
     * Flagged cell.
     */
    if (cell.state === "flagged") {
        element.classList.add("flagged");
        element.textContent = "🚩";
        return;
    }

    /*
     * Question-mark cell.
     */
    if (cell.state === "question") {
        element.classList.add("question");
        element.textContent = "❓";
        return;
    }

    /*
     * Revealed cell.
     */
    if (cell.state === "revealed") {

        element.classList.add("revealed");

        if (cell.mine) {
            element.textContent = "💣";
            element.classList.add("mine");
            return;
        }

        if (cell.adjacent > 0) {
            element.textContent = cell.adjacent;

            element.classList.add(
                `number-${cell.adjacent}`
            );
        }
    }
}


/* =========================================================
   Cycle hidden → flagged → question → hidden
   ========================================================= */

function cycleMark(row, col) {

    const cell = board[row][col];

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

    updateMineCounter();
    renderBoard();
}


/* =========================================================
   Update mine counter
   ========================================================= */

function updateMineCounter() {

    const remaining = MINE_COUNT - flagsUsed;

    document.getElementById("mine-count").textContent =
        remaining;
}


/* =========================================================
   Reveal a cell
   ========================================================= */

function revealCell(row, col) {

    const cell = board[row][col];

    /*
     * Don't reveal an already revealed cell.
     */
    if (cell.state === "revealed") {
        return;
    }

    /*
     * Flags and question marks cannot be revealed
     * directly.
     */
    if (cell.state !== "hidden") {
        return;
    }

    /*
     * Mine.
     *
     * Game-over handling comes later.
     */
    if (cell.mine) {
        cell.state = "revealed";
        renderBoard();
        return;
    }

    cell.state = "revealed";

    /*
     * Empty cell:
     * reveal the connected empty area.
     */
    if (cell.adjacent === 0) {
        revealEmptyArea(row, col);
    }

    renderBoard();
}


/* =========================================================
   Reveal connected zero area
   ========================================================= */

function revealEmptyArea(startRow, startCol) {

    const queue = [
        [startRow, startCol]
    ];

    const visited = new Set();

    while (queue.length > 0) {

        const [row, col] = queue.shift();

        const key = `${row},${col}`;

        if (visited.has(key)) {
            continue;
        }

        visited.add(key);

        const cell = board[row][col];

        if (cell.mine) {
            continue;
        }

        /*
         * Never overwrite a flag/question mark.
         */
        if (cell.state === "flagged" ||
            cell.state === "question") {
            continue;
        }

        cell.state = "revealed";

        /*
         * Numbered cells stop the cascade.
         */
        if (cell.adjacent > 0) {
            continue;
        }

        /*
         * Zero cell — add its neighbors.
         */
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            for (let colOffset = -1; colOffset <= 1; colOffset++) {

                if (
                    rowOffset === 0 &&
                    colOffset === 0
                ) {
                    continue;
                }

                const neighborRow = row + rowOffset;
                const neighborCol = col + colOffset;

                if (
                    neighborRow < 0 ||
                    neighborRow >= ROWS ||
                    neighborCol < 0 ||
                    neighborCol >= COLS
                ) {
                    continue;
                }

                const neighbor =
                    board[neighborRow][neighborCol];

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
   Start
   ========================================================= */

createBoard();