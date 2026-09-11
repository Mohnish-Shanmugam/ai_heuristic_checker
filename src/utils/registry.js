import { tictactoeEngine } from '../engine/tictactoe/adapter.js';
import { checkersEngine } from '../engine/checkers/adapter.js';

export const GAME_REGISTRY = {
  tictactoe: {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Fork pressure, influence density, and opponent denial heuristics.',
    engine: tictactoeEngine,
    defaultDepth: 4,
    maxDepth: 6,
  },
  checkers: {
    id: 'checkers',
    name: '8x8 Checkers',
    description: 'Voronoi territory control & structural connectivity heuristics.',
    engine: checkersEngine,
    defaultDepth: 4,
    maxDepth: 6,
  },
};