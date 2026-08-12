/* =========================================================
   Minesweeper — app.js
   Part 1: Board creation + mine placement
   ========================================================= */

const ROWS = 16;
const COLS = 10;
const MINE_COUNT = 32;

let board = [];

/*
 * Each cell looks like:
 *
 * {
 *     mine: false,
 *     adjacent: 0,
 *     state: "hidden"
 * }
 *
 * state will later become:
 * "hidden", "revealed", "flagged", or "question"
 */


/* =========================================================
   Create a new board
   ========================================================= */

function createBoard() {
    board = [];

    // Create empty cells.
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

    // Place mines randomly.
    let minesPlaced = 0;

    while (minesPlaced < MINE_COUNT) {
        const row = Math.floor(Math.random() * ROWS);
        const col = Math.floor(Math.random() * COLS);

        // Don't place two mines in the same cell.
        if (!board[row][col].mine) {
            board[row][col].mine = true;
            minesPlaced++;
        }
    }

    // Calculate numbers.
    calculateAdjacentMines();

    renderBoard();
}


/* =========================================================
   Calculate adjacent mine counts
   ========================================================= */

function calculateAdjacentMines() {

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {

            // Mines don't need a number.
            if (board[row][col].mine) {
                continue;
            }

            let count = 0;

            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                for (let colOffset = -1; colOffset <= 1; colOffset++) {

                    // Skip the cell itself.
                    if (rowOffset === 0 && colOffset === 0) {
                        continue;
                    }

                    const neighborRow = row + rowOffset;
                    const neighborCol = col + colOffset;

                    // Ignore cells outside the board.
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

            const cellElement = document.createElement("div");

            cellElement.className = "cell";

            /*
             * Temporary debug information.
             *
             * We'll remove this once the board logic
             * is working.
             */
            if (board[row][col].mine) {
                cellElement.textContent = "💣";
            } else if (board[row][col].adjacent > 0) {
                cellElement.textContent = board[row][col].adjacent;
                cellElement.classList.add(
                    `number-${board[row][col].adjacent}`
                );
            }

            boardElement.appendChild(cellElement);
        }
    }
}


/* =========================================================
   Start
   ========================================================= */

createBoard();