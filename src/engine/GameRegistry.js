import { EMPTY_BOARD, getGameStatus as tttStatus, opponentOf as tttOpponent } from './tictactoe/board.js';
import { normalize as tttNormalize } from './tictactoe/heuristic.js';
import { ticTacToeAdapter } from './tictactoe/adapter.js';

import {
  initialBoard,
  getLegalMoves as checkersLegalMoves,
  getGameStatus as checkersStatus,
  opponentOf as checkersOpponent,
} from './checkers/board.js';
import { normalize as checkersNormalize } from './checkers/heuristic.js';
import { checkersAdapter } from './checkers/adapter.js';

const CELL_LABEL = ['a1','b1','c1','a2','b2','c2','a3','b3','c3'];

function colLetter(col) {
  return String.fromCharCode(97 + col);
}

export const GAMES = {
  tictactoe: {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    tagline: '3x3 grid Fork-Pressure heuristic engine',
    sides: { first: 'X', second: 'O' },
    sideLabel: { X: 'X', O: 'O' },
    sideColor: { X: '#38bdf8', O: '#fb7185' },
    createInitialState: () => EMPTY_BOARD(),
    getLegalMoves: (board, player) => ticTacToeAdapter.getLegalMoves(board, player),
    applyMove: (board, move, player) => ticTacToeAdapter.applyMove(board, move, player),
    nextPlayer: (player) => tttOpponent(player),
    getStatus: (board) => {
      const s = tttStatus(board);
      if (!s) return null;
      return { winner: s.winner, reason: s.winner === 'draw' ? 'draw' : 'three-in-a-row', line: s.line };
    },
    evaluate: (board, maximizingPlayer) => ticTacToeAdapter.evaluate(board, maximizingPlayer),
    normalize: tttNormalize,
    adapter: ticTacToeAdapter,
    defaultDepth: 9,
    depthOptions: [
      { label: 'Easy (depth 1)', value: 1 },
      { label: 'Medium (depth 3)', value: 3 },
      { label: 'Hard (depth 5)', value: 5 },
      { label: 'Perfect (depth 9)', value: 9 },
    ],
    formatMove: (move) => CELL_LABEL[move],
    moveKey: (move) => String(move),
    analysisDepthCap: 9,
    blunderThreshold: 22, // normalized-score points
    telemetryFields: [
      { key: 'forkPressureFactor', label: 'Fork Pressure Factor', hint: 'Σ k(cell)² × centrality — rewards fork-creating squares super-linearly.' },
      { key: 'influenceDensity', label: 'Influence Density', hint: 'Σ (marksInLine+1)² × weight — rewards nearly-complete lines.' },
      { key: 'opponentDenial', label: 'Opponent Denial (subtracted)', hint: 'Σ k(opponent,cell) / (1+dist to center) — unresolved opponent threat mass.' },
      { key: 'raw', label: 'Player Raw Score', hint: 'W_FF·FF + W_ID·ID − W_OD·OD' },
    ],
  },

  checkers: {
    id: 'checkers',
    name: 'Checkers',
    tagline: 'Voronoi territory + structural rigidity engine',
    sides: { first: 'B', second: 'W' },
    sideLabel: { B: 'Black', W: 'White' },
    sideColor: { B: '#1f2937', W: '#f8fafc' },
    createInitialState: () => initialBoard(),
    getLegalMoves: (board, player) => checkersAdapter.getLegalMoves(board, player),
    applyMove: (board, move, player) => checkersAdapter.applyMove(board, move, player),
    nextPlayer: (player) => checkersOpponent(player),
    getStatus: (board, currentPlayer) => {
      const s = checkersStatus(board, currentPlayer);
      if (!s) return null;
      return { winner: s.winner, reason: s.reason };
    },
    evaluate: (board, maximizingPlayer) => checkersAdapter.evaluate(board, maximizingPlayer),
    normalize: checkersNormalize,
    adapter: checkersAdapter,
    defaultDepth: 5,
    depthOptions: [
      { label: 'Easy (depth 2)', value: 2 },
      { label: 'Medium (depth 4)', value: 4 },
      { label: 'Hard (depth 6)', value: 6 },
      { label: 'Expert (depth 8)', value: 8 },
    ],
    formatMove: (move) => {
      const from = `${colLetter(move.from.col)}${8 - move.from.row}`;
      const to = `${colLetter(move.to.col)}${8 - move.to.row}`;
      return `${from}${move.isJump ? 'x' : '-'}${to}`;
    },
    moveKey: (move) => `${move.from.row},${move.from.col}->${move.to.row},${move.to.col}|${JSON.stringify(move.captures)}`,
    analysisDepthCap: 5,
    blunderThreshold: 16,
    telemetryFields: [
      { key: 'voronoiTerritory', label: 'Voronoi Territory', hint: 'Squares this side controls under direction-aware effective-distance metric.' },
      { key: 'phalanxSupport', label: 'Phalanx Support', hint: 'Pieces with a friendly diagonal neighbor.' },
      { key: 'backlineCohesion', label: 'Backline Cohesion', hint: 'Fraction of home row still occupied.' },
      { key: 'vulnerablePieces', label: 'Vulnerable Pieces (subtracted)', hint: 'Pieces currently hanging to an immediate capture.' },
      { key: 'doubleJumpExposure', label: 'Double-Jump Exposure (subtracted)', hint: 'Pieces inside an available multi-capture chain.' },
      { key: 'structuralTotal', label: 'Structural Total', hint: 'Weighted combination of the above four terms.' },
    ],
  },
};

export function getGame(id) {
  return GAMES[id];
}