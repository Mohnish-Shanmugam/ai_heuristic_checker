// ============================================================================
// Tic-Tac-Toe : NOVEL Heuristic Evaluation Function
// ============================================================================
//
// This deliberately avoids the textbook "count open lines / count pieces"
// heuristic. Instead it models the board as a small potential field, where
// every empty cell carries a "centrality weight" and every line still capable
// of being won ("live line") contributes non-linear pressure based on how
// developed it is.
//
// -------------------------------------------------------------------------
// TERM 1 — Fork Pressure Factor (FF)
// -------------------------------------------------------------------------
//   For a player P, and every empty cell c:
//     k(P, c) = number of "live" lines through c that contain >=1 mark of P
//               and zero marks of the opponent.
//   FF(P) = Σ_{c empty}  k(P, c)^2 * w(c)
//
//   Squaring k(P,c) is the crucial "novel" part: a cell that sits at the
//   intersection of TWO live lines for P (a fork square) contributes 4x
//   the weight of a cell that sits on only one live line — not 2x. This
//   mirrors the real tactical value of forks (double-threats), which is
//   super-linear, not additive, in the number of simultaneous threats.
//
//   w(c) = 1 + (1 - normalizedCenterDistance(c))   — centrality weight,
//   ranges from 1.0 (corners) to 2.0 (center), since central cells
//   participate in more winning lines (4 vs 2-3).
//
// -------------------------------------------------------------------------
// TERM 2 — Influence Density (ID)
// -------------------------------------------------------------------------
//   Rewards lines that are already partially developed toward a win.
//   For every live line L for player P:
//     ID contribution = (marksInLine(L, P) + 1)^2 * avgWeight(L)
//   ID(P) = Σ_{L live for P} (marksInLine(L,P)+1)^2 * avgWeight(L)
//
//   A line with 2/3 marks (one move from winning) contributes 9x the base
//   weight instead of linear 2x — modeling how close-to-completion threats
//   dominate the position non-linearly.
//
// -------------------------------------------------------------------------
// TERM 3 — Opponent Denial / Entropy Term (OD)
// -------------------------------------------------------------------------
//   Penalizes leaving the opponent's central mobility open. For every
//   empty cell c, the "opponent option mass" is:
//     m(O, c) = k(O, c) / (1 + dist(c, center))
//   OD = Σ_{c empty} m(O, c)
//
//   This is an entropy-inspired "disorder" measure: the more live threat
//   options the opponent retains, weighted toward central squares (where
//   disorder is most dangerous because central cells feed the most lines),
//   the higher the entropy of the position from our opponent's perspective.
//   We subtract this from our score because it represents unresolved risk.
//
// -------------------------------------------------------------------------
// FINAL SCORE
// -------------------------------------------------------------------------
//   raw(P) = W_FF * FF(P)  +  W_ID * ID(P)  -  W_OD * OD_against(P)
//   score  = raw(X) - raw(O)      [positive favors X, negative favors O]
//
//   The final value is passed through tanh-based normalization to produce
//   a bounded [-100, 100] evaluation for the UI evaluation bar, while an
//   unbounded raw value is used internally by minimax for finer move
//   ordering / comparison precision.
// ============================================================================

import { LINES, CELL_LINES, opponentOf, getGameStatus } from './board.js';

const W_FF = 1.0; // Fork Pressure Factor weight
const W_ID = 0.6; // Influence Density weight
const W_OD = 0.8; // Opponent Denial weight

const CENTER = { row: 1, col: 1 };
const MAX_DIST = Math.sqrt(2) * 1; // corner-to-center distance in a 3x3 grid

function cellRowCol(cell) {
  return { row: Math.floor(cell / 3), col: cell % 3 };
}

function centerDistance(cell) {
  const { row, col } = cellRowCol(cell);
  return Math.sqrt((row - CENTER.row) ** 2 + (col - CENTER.col) ** 2);
}

function centralityWeight(cell) {
  const normalized = centerDistance(cell) / MAX_DIST; // 0 (center) .. 1 (corner)
  return 1 + (1 - normalized); // range [1, 2]
}

// A line is "live" for player P if it contains no marks of the opponent.
function isLineLiveFor(board, line, player) {
  const opp = opponentOf(player);
  return !line.some((idx) => board[idx] === opp);
}

function marksInLine(board, line, player) {
  return line.reduce((acc, idx) => acc + (board[idx] === player ? 1 : 0), 0);
}

// k(P, c): number of live lines through empty cell c that already contain
// at least one mark of P (i.e. "reinforced" live lines through this cell).
function liveLineCountThrough(board, cell, player) {
  const lines = CELL_LINES[cell];
  let count = 0;
  for (const line of lines) {
    if (isLineLiveFor(board, line, player) && marksInLine(board, line, player) >= 0) {
      // A line counts toward fork potential if it's live for P.
      count += 1;
    }
  }
  return count;
}

function forkPressureFactor(board, player) {
  let total = 0;
  const empties = [];
  for (let c = 0; c < 9; c++) if (board[c] === null) empties.push(c);

  const perCell = {};
  for (const c of empties) {
    const k = liveLineCountThrough(board, c, player);
    const w = centralityWeight(c);
    const contribution = k * k * w;
    perCell[c] = { k, w, contribution };
    total += contribution;
  }
  return { total, perCell };
}

function influenceDensity(board, player) {
  let total = 0;
  const perLine = [];
  for (const line of LINES) {
    if (!isLineLiveFor(board, line, player)) continue;
    const marks = marksInLine(board, line, player);
    const emptyInLine = line.filter((idx) => board[idx] === null);
    const avgWeight =
      emptyInLine.length > 0
        ? emptyInLine.reduce((s, c) => s + centralityWeight(c), 0) / emptyInLine.length
        : 1;
    const contribution = (marks + 1) ** 2 * avgWeight;
    total += contribution;
    perLine.push({ line, marks, avgWeight, contribution });
  }
  return { total, perLine };
}

function opponentDenial(board, forPlayer) {
  const opp = opponentOf(forPlayer);
  let total = 0;
  const perCell = {};
  for (let c = 0; c < 9; c++) {
    if (board[c] !== null) continue;
    const k = liveLineCountThrough(board, c, opp);
    const dist = centerDistance(c);
    const mass = k / (1 + dist);
    perCell[c] = { k, dist, mass };
    total += mass;
  }
  return { total, perCell };
}

// Computes the raw, unbounded advantage for `player`.
function rawPlayerScore(board, player) {
  const ff = forkPressureFactor(board, player);
  const id = influenceDensity(board, player);
  const od = opponentDenial(board, player);
  const raw = W_FF * ff.total + W_ID * id.total - W_OD * od.total;
  return { raw, ff, id, od };
}

// Normalizes an unbounded raw differential into [-100, 100] via tanh scaling.
const TTT_SCALE = 6.5; // controls how quickly the bar saturates
export function normalize(rawDiff) {
  return Math.round(100 * Math.tanh(rawDiff / TTT_SCALE));
}

// Main entry point. Returns:
//   { score: number in [-100,100] (positive favors X),
//     raw:   unbounded score (positive favors X), used internally by minimax,
//     breakdown: { X: {...}, O: {...} } term-by-term data for telemetry }
export function evaluateTicTacToe(board) {
  const status = getGameStatus(board);
  if (status) {
    if (status.winner === 'X') return { score: 1000, raw: 100000, breakdown: null, terminal: 'X' };
    if (status.winner === 'O') return { score: -1000, raw: -100000, breakdown: null, terminal: 'O' };
    return { score: 0, raw: 0, breakdown: null, terminal: 'draw' };
  }

  const xScore = rawPlayerScore(board, 'X');
  const oScore = rawPlayerScore(board, 'O');
  const rawDiff = xScore.raw - oScore.raw;
  const score = normalize(rawDiff);

  return {
    score,
    raw: rawDiff,
    terminal: null,
    breakdown: {
      X: {
        forkPressureFactor: xScore.ff.total,
        influenceDensity: xScore.id.total,
        opponentDenial: xScore.od.total,
        raw: xScore.raw,
      },
      O: {
        forkPressureFactor: oScore.ff.total,
        influenceDensity: oScore.id.total,
        opponentDenial: oScore.od.total,
        raw: oScore.raw,
      },
      weights: { W_FF, W_ID, W_OD },
    },
  };
}