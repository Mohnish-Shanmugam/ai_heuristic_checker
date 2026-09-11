import { findBestMove } from './minimax.js';

// Given a completed game's move history, re-analyzes every move made by
// `humanSide` by running a fresh minimax search from the position BEFORE
// that move, at a (possibly capped, for performance) depth. Because
// findBestMove() already ranks EVERY legal move by search value, we get
// both "what was optimal" and "how good was what was actually played" from
// a single search per human move.
//
// moveHistory entries are expected to look like:
//   { index, player, move, boardBefore, boardAfter, evalScore }
//
// Returns a new array of entries augmented with `.analysis` for human moves:
//   {
//     bestMove, bestMoveFormatted, bestValue, bestBreakdown,
//     playedValue, playedBreakdown,
//     deltaNormalized,      // how many bar-points were left on the table
//     isBlunder,
//   }
export function analyzeHumanMoves(game, moveHistory, humanSide) {
  const depth = Math.min(game.defaultDepthOverride ?? game.analysisDepthCap, game.analysisDepthCap);

  return moveHistory.map((entry) => {
    if (entry.player !== humanSide) return entry;

    const legalMoves = game.getLegalMoves(entry.boardBefore, humanSide);
    if (legalMoves.length <= 1) {
      // No real choice existed — not eligible to be a blunder.
      return { ...entry, analysis: null };
    }

    const result = findBestMove(game.adapter, entry.boardBefore, humanSide, depth);
    if (!result) return { ...entry, analysis: null };

    const playedKey = game.moveKey(entry.move);
    const playedEntry = result.ranked.find((r) => game.moveKey(r.move) === playedKey);
    const bestEntry = result.ranked[0];

    if (!playedEntry || !bestEntry) return { ...entry, analysis: null };

    const bestNorm = game.normalize(bestEntry.value);
    const playedNorm = game.normalize(playedEntry.value);
    const deltaNormalized = Math.max(0, bestNorm - playedNorm);

    return {
      ...entry,
      analysis: {
        depth,
        bestMove: bestEntry.move,
        bestMoveFormatted: game.formatMove(bestEntry.move),
        bestValue: bestEntry.value,
        bestNormalized: bestNorm,
        bestBreakdown: bestEntry.evalResult?.breakdown ?? null,
        playedMove: entry.move,
        playedMoveFormatted: game.formatMove(entry.move),
        playedValue: playedEntry.value,
        playedNormalized: playedNorm,
        playedBreakdown: playedEntry.evalResult?.breakdown ?? null,
        deltaNormalized,
        isBlunder: deltaNormalized >= game.blunderThreshold,
        wasOptimal: playedKey === game.moveKey(bestEntry.move),
      },
    };
  });
}