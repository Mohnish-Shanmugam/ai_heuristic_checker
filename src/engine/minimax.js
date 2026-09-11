// ============================================================================
// Generic Minimax Engine with Alpha-Beta Pruning
// ============================================================================
// Game-agnostic. Consumers supply a `GameAdapter`:
//   {
//     getLegalMoves(state, player) -> Move[]
//     applyMove(state, move, player) -> newState
//     isTerminal(state) -> boolean
//     evaluate(state, maximizingPlayer) -> { score, raw, breakdown }
//        // `raw` should be positive-favors-"maximizingSide" on a consistent
//        // absolute scale (e.g. +favors X/Player1, -favors O/Player2).
//     nextPlayer(player) -> otherPlayer
//   }
//
// The engine always searches from the perspective of `raw` being positive
// when the *first* named side (X / Player 1 / light pieces) is ahead, and
// negative when the second side is ahead. `maximizingPlayer` tells the
// search which side is trying to maximize `raw` at the root.

export function minimax(adapter, state, depth, alpha, beta, currentPlayer, maximizingPlayer, stats) {
  stats.nodes += 1;

  if (depth === 0 || adapter.isTerminal(state)) {
    const evalResult = adapter.evaluate(state, maximizingPlayer);
    return { value: evalResult.raw, evalResult };
  }

  const isMaximizing = currentPlayer === maximizingPlayer;
  const moves = adapter.getLegalMoves(state, currentPlayer);

  if (moves.length === 0) {
    // The side to move has no legal moves: standard convention is that this
    // side loses (applies to checkers stalemate/no-moves; for tic-tac-toe
    // this branch is unreachable since isTerminal() already catches it).
    const evalResult = adapter.evaluate(state, maximizingPlayer);
    const forcedValue = isMaximizing ? -100000 : 100000;
    return { value: forcedValue, evalResult: { ...evalResult, raw: forcedValue, terminal: 'no-moves' } };
  }

  let bestValue = isMaximizing ? -Infinity : Infinity;
  let bestMove = null;
  let bestEval = null;

  for (const move of moves) {
    const nextState = adapter.applyMove(state, move, currentPlayer);
    const nextPlayer = adapter.nextPlayer(currentPlayer, move, nextState);
    const { value, evalResult } = minimax(
      adapter,
      nextState,
      depth - 1,
      alpha,
      beta,
      nextPlayer,
      maximizingPlayer,
      stats
    );

    if (isMaximizing) {
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
        bestEval = evalResult;
      }
      alpha = Math.max(alpha, bestValue);
    } else {
      if (value < bestValue) {
        bestValue = value;
        bestMove = move;
        bestEval = evalResult;
      }
      beta = Math.min(beta, bestValue);
    }

    if (beta <= alpha) {
      stats.prunes += 1;
      break; // alpha-beta cutoff
    }
  }

  return { value: bestValue, move: bestMove, evalResult: bestEval };
}

// Finds the best move for `player` at the given state, searching to `depth`.
// Returns { move, value, evalResult, nodes, prunes, elapsedMs }.
export function findBestMove(adapter, state, player, depth) {
  const start = performance.now();
  const stats = { nodes: 0, prunes: 0 };
  const moves = adapter.getLegalMoves(state, player);

  if (moves.length === 0) return null;

  let alpha = -Infinity;
  let beta = Infinity;
  const isMaximizing = true; // we always evaluate from `player`'s maximizing perspective
  let bestValue = -Infinity;
  let bestMove = moves[0];
  let bestEval = null;
  const moveScores = [];

  for (const move of moves) {
    const nextState = adapter.applyMove(state, move, player);
    const nextPlayer = adapter.nextPlayer(player, move, nextState);
    const { value, evalResult } = minimax(
      adapter,
      nextState,
      depth - 1,
      alpha,
      beta,
      nextPlayer,
      player,
      stats
    );
    moveScores.push({ move, value, evalResult });

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
      bestEval = evalResult;
    }
    alpha = Math.max(alpha, bestValue);
  }

  moveScores.sort((a, b) => b.value - a.value);

  return {
    move: bestMove,
    value: bestValue,
    evalResult: bestEval,
    nodes: stats.nodes,
    prunes: stats.prunes,
    elapsedMs: performance.now() - start,
    ranked: moveScores,
  };
}