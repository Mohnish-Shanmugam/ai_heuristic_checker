// import { getLegalMoves, applyMove, opponentOf } from './board.js';
// import { evaluateCheckers } from './heuristic.js';

// export const checkersAdapter = {
//   getLegalMoves(board, player) {
//     return getLegalMoves(board, player);
//   },
//   applyMove(board, move, player) {
//     return applyMove(board, move, player);
//   },
//   isTerminal(board) {
//     let bTotal = 0;
//     let wTotal = 0;
//     for (const row of board) {
//       for (const cell of row) {
//         if (cell === 'B' || cell === 'BK') bTotal++;
//         else if (cell === 'W' || cell === 'WK') wTotal++;
//       }
//     }
//     return bTotal === 0 || wTotal === 0;
//   },
//   nextPlayer(player) {
//     return opponentOf(player);
//   },
//   evaluate(board, maximizingPlayer) {
//     const result = evaluateCheckers(board);
//     if (maximizingPlayer === 'W') {
//       return { ...result, raw: -result.raw, score: -result.score };
//     }
//     return result;
//   },
// };
import { getLegalMoves, applyMove, opponentOf } from './board.js';
import { evaluateCheckers } from './heuristic.js';

// Checkers "state" for the minimax engine is just the board (8x8 array).
// evaluateCheckers() returns raw scores signed positive-favors-Black; we
// flip sign when the maximizing player is White, matching the pattern used
// by the tic-tac-toe adapter.
export const checkersAdapter = {
  getLegalMoves(board, player) {
    return getLegalMoves(board, player);
  },
  applyMove(board, move, player) {
    return applyMove(board, move, player);
  },
  isTerminal(board) {
    // A cheap, direction-agnostic terminal check: elimination of one side.
    // The "no legal moves" case is handled generically inside minimax().
    let bTotal = 0, wTotal = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell === 'B' || cell === 'BK') bTotal++;
        else if (cell === 'W' || cell === 'WK') wTotal++;
      }
    }
    return bTotal === 0 || wTotal === 0;
  },
  nextPlayer(player) {
    return opponentOf(player);
  },
  evaluate(board, maximizingPlayer) {
    const result = evaluateCheckers(board);
    if (maximizingPlayer === 'W') {
      return { ...result, raw: -result.raw };
    }
    return result;
  },
};