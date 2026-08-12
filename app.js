/* =========================================================
   Minesweeper — app.js
   Part 2: Reveal cells + zero-cell cascade
   ========================================================= */

const ROWS = 16;
const COLS = 10;
const MINE_COUNT = 32;

let board = [];


/* =========================================================
   Create a new board
   ========================================================= */

function createBoard() {
    board = [];

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

            /*
             * Store the coordinates on the element.
             * We'll use these for interaction.
             */
            cellElement.dataset.row = row;
            cellElement.dataset.col = col;

            /*
             * Prevent browser context menus from appearing
             * during long presses.
             */
            cellElement.addEventListener("contextmenu", event => {
                event.preventDefault();
            });

            cellElement.addEventListener("pointerup", event => {
                /*
                 * Only respond to the primary pointer.
                 */
                if (event.button !== 0) {
                    return;
                }

                const clickedRow = Number(cellElement.dataset.row);
                const clickedCol = Number(cellElement.dataset.col);

                revealCell(clickedRow, clickedCol);
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

    if (cell.state !== "revealed") {
        return;
    }

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
     * Flags and question marks aren't implemented yet,
     * but this prevents future flagged cells from being
     * accidentally revealed.
     */
    if (cell.state !== "hidden") {
        return;
    }

    /*
     * Mine.
     *
     * For now we simply reveal it.
     * Game-over behavior comes later.
     */
    if (cell.mine) {
        cell.state = "revealed";
        renderBoard();
        return;
    }

    /*
     * Normal cell.
     */
    cell.state = "revealed";

    /*
     * Empty cell:
     * reveal all connected empty cells and their
     * bordering numbered cells.
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
         * Reveal this cell.
         */
        cell.state = "revealed";

        /*
         * Numbered cells stop the cascade.
         * They are revealed, but their neighbors aren't
         * added to the queue.
         */
        if (cell.adjacent > 0) {
            continue;
        }

        /*
         * This is a zero cell.
         * Add all neighboring cells.
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