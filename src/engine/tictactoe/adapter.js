import { getEmptyCells, applyMove, opponentOf, isTerminal } from './board.js';
import { evaluateTicTacToe } from './heuristic.js';

// `maximizingPlayer` is always 'X' or 'O' — the raw score from
// evaluateTicTacToe() is already signed with +favors X / -favors O, so we
// flip sign when the maximizing player is 'O'.
export const ticTacToeAdapter = {
  getLegalMoves(board) {
    return getEmptyCells(board);
  },
  applyMove(board, cell, player) {
    return applyMove(board, cell, player);
  },
  isTerminal(board) {
    return isTerminal(board);
  },
  nextPlayer(player) {
    return opponentOf(player);
  },
  evaluate(board, maximizingPlayer) {
    const result = evaluateTicTacToe(board);
    if (maximizingPlayer === 'O') {
      return {
        ...result,
        raw: -result.raw,
        score: result.score, // score is displayed in absolute X-favors-positive terms in UI
      };
    }
    return result;
  },
};