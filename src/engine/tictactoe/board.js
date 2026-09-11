// ============================================================================
// Tic-Tac-Toe : Board State & Rules
// ============================================================================
// Board is represented as a flat array of length 9, indices 0-8:
//   0 1 2
//   3 4 5
//   6 7 8
// Cell values: null (empty), 'X', or 'O'.

export const EMPTY_BOARD = () => Array(9).fill(null);

// The 8 winning lines (3 rows, 3 cols, 2 diagonals).
export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

// Cell -> which lines pass through it (precomputed for fast heuristic lookups)
export const CELL_LINES = Array.from({ length: 9 }, (_, cell) =>
  LINES.filter((line) => line.includes(cell))
);

export function cloneBoard(board) {
  return board.slice();
}

export function getEmptyCells(board) {
  const cells = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) cells.push(i);
  return cells;
}

export function applyMove(board, cell, player) {
  const next = cloneBoard(board);
  next[cell] = player;
  return next;
}

export function opponentOf(player) {
  return player === 'X' ? 'O' : 'X';
}

// Returns 'X' | 'O' if there's a winner, 'draw' if the board is full with no
// winner, or null if the game is still in progress.
export function getGameStatus(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (getEmptyCells(board).length === 0) {
    return { winner: 'draw', line: null };
  }
  return null;
}

export function isTerminal(board) {
  return getGameStatus(board) !== null;
}

