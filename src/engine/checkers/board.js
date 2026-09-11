// ============================================================================
// Checkers (American / English Draughts rules) : Board State & Move Rules
// ============================================================================
// 8x8 board, pieces only live on dark squares where (row + col) is odd.
// Piece codes: 'B' (black man), 'BK' (black king), 'W' (white man), 'WK' (white king)
// Black starts on rows 0-2 and moves DOWN the board (+row direction).
// White starts on rows 5-7 and moves UP the board (-row direction).
//
// Board representation: 8x8 array of arrays, board[row][col].

export const SIZE = 8;

export function isDark(row, col) {
  return (row + col) % 2 === 1;
}

export function inBounds(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

export function initialBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!isDark(row, col)) continue;
      if (row < 3) board[row][col] = 'B';
      else if (row > 4) board[row][col] = 'W';
    }
  }
  return board;
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function opponentOf(player) {
  return player === 'B' ? 'W' : 'B';
}

export function pieceOwner(piece) {
  if (!piece) return null;
  return piece[0]; // 'B' or 'W'
}

export function isKing(piece) {
  return piece != null && piece.length === 2;
}

// Forward directions for a man of a given color.
function manDirections(player) {
  return player === 'B' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
}

const KING_DIRECTIONS = [[1, -1], [1, 1], [-1, -1], [-1, 1]];

function directionsFor(piece) {
  const player = pieceOwner(piece);
  return isKing(piece) ? KING_DIRECTIONS : manDirections(player);
}

function maybePromote(piece, row) {
  const player = pieceOwner(piece);
  if (isKing(piece)) return piece;
  if (player === 'B' && row === SIZE - 1) return 'BK';
  if (player === 'W' && row === 0) return 'WK';
  return piece;
}

// --- Move generation -------------------------------------------------------
// A move is represented as:
//   { from: {row,col}, to: {row,col}, isJump: bool,
//     captures: [{row,col}, ...]  (squares of captured pieces, empty if not a jump),
//     path: [{row,col}, ...]      (full sequence of landing squares, for multi-jumps) }

function findJumpsFrom(board, row, col, piece, visitedCaptures = []) {
  const results = [];
  const dirs = directionsFor(piece);
  for (const [dr, dc] of dirs) {
    const midRow = row + dr;
    const midCol = col + dc;
    const landRow = row + dr * 2;
    const landCol = col + dc * 2;
    if (!inBounds(landRow, landCol)) continue;
    const midPiece = board[midRow][midCol];
    if (!midPiece || pieceOwner(midPiece) === pieceOwner(piece)) continue;
    if (board[landRow][landCol] !== null) continue;
    const alreadyCaptured = visitedCaptures.some((c) => c.row === midRow && c.col === midCol);
    if (alreadyCaptured) continue;

    // Simulate the jump to look for further chained jumps.
    const nextBoard = cloneBoard(board);
    nextBoard[row][col] = null;
    nextBoard[midRow][midCol] = null;
    const promoted = maybePromote(piece, landRow);
    nextBoard[landRow][landCol] = promoted;

    const newVisited = [...visitedCaptures, { row: midRow, col: midCol }];
    const further = findJumpsFrom(nextBoard, landRow, landCol, promoted, newVisited);

    if (further.length === 0) {
      results.push({
        from: { row, col },
        to: { row: landRow, col: landCol },
        isJump: true,
        captures: newVisited,
        path: [{ row: landRow, col: landCol }],
        promotedDuringChain: promoted !== piece,
      });
    } else {
      for (const f of further) {
        results.push({
          from: { row, col },
          to: f.to,
          isJump: true,
          captures: f.captures,
          path: [{ row: landRow, col: landCol }, ...f.path],
          promotedDuringChain: f.promotedDuringChain || promoted !== piece,
        });
      }
    }
  }
  return results;
}

function findSimpleMovesFrom(board, row, col, piece) {
  const results = [];
  const dirs = directionsFor(piece);
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    if (board[r][c] === null) {
      results.push({
        from: { row, col },
        to: { row: r, col: c },
        isJump: false,
        captures: [],
        path: [{ row: r, col: c }],
      });
    }
  }
  return results;
}

// Returns all LEGAL moves for `player`, enforcing the mandatory-capture rule:
// if any jump is available anywhere on the board, only jump moves are legal.
export function getLegalMoves(board, player) {
  const jumpMoves = [];
  const simpleMoves = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = board[row][col];
      if (!piece || pieceOwner(piece) !== player) continue;
      const jumps = findJumpsFrom(board, row, col, piece);
      if (jumps.length > 0) jumpMoves.push(...jumps);
      else simpleMoves.push(...findSimpleMovesFrom(board, row, col, piece));
    }
  }

  return jumpMoves.length > 0 ? jumpMoves : simpleMoves;
}

export function applyMove(board, move, player) {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  next[move.from.row][move.from.col] = null;
  for (const cap of move.captures) {
    next[cap.row][cap.col] = null;
  }
  const promoted = maybePromote(piece, move.to.row);
  next[move.to.row][move.to.col] = promoted;
  return next;
}

export function countPieces(board) {
  let bMen = 0, bKings = 0, wMen = 0, wKings = 0;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (p === 'B') bMen++;
      else if (p === 'BK') bKings++;
      else if (p === 'W') wMen++;
      else if (p === 'WK') wKings++;
    }
  }
  return { bMen, bKings, wMen, wKings, bTotal: bMen + bKings, wTotal: wMen + wKings };
}

// Returns { winner: 'B'|'W'|'draw', reason } or null if the game continues.
export function getGameStatus(board, currentPlayer, moveHistoryLength = 0, noCaptureStreak = 0) {
  const counts = countPieces(board);
  if (counts.bTotal === 0) return { winner: 'W', reason: 'no-pieces' };
  if (counts.wTotal === 0) return { winner: 'B', reason: 'no-pieces' };

  const legal = getLegalMoves(board, currentPlayer);
  if (legal.length === 0) return { winner: opponentOf(currentPlayer), reason: 'no-moves' };

  if (noCaptureStreak >= 40) return { winner: 'draw', reason: 'fifty-move-rule' };

  return null;
}

export function isTerminalState(board, currentPlayer, noCaptureStreak = 0) {
  return getGameStatus(board, currentPlayer, 0, noCaptureStreak) !== null;
}