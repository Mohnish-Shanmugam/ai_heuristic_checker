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
//
// `trace` (optional) is a passive observer (see searchTrace.js). Every
// `trace?.…` call below only records values the search has already
// computed; it never feeds anything back, so with or without a tracer the
// search visits the same nodes and returns the same result.

export function minimax(adapter, state, depth, alpha, beta, currentPlayer, maximizingPlayer, stats, trace) {
  stats.nodes += 1;

  if (depth === 0 || adapter.isTerminal(state)) {
    const evalResult = adapter.evaluate(state, maximizingPlayer);
    trace?.leaf(evalResult.raw, evalResult, depth === 0 ? 'depth-limit' : 'terminal');
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
    trace?.leaf(forcedValue, evalResult, 'no-moves');
    return { value: forcedValue, evalResult: { ...evalResult, raw: forcedValue, terminal: 'no-moves' } };
  }

  let bestValue = isMaximizing ? -Infinity : Infinity;
  let bestMove = null;
  let bestEval = null;
  trace?.expand(moves);

  for (const move of moves) {
    const nextState = adapter.applyMove(state, move, currentPlayer);
    const nextPlayer = adapter.nextPlayer(currentPlayer, move, nextState);
    trace?.enter(move, nextState, nextPlayer, depth - 1, alpha, beta);
    const { value, evalResult } = minimax(
      adapter,
      nextState,
      depth - 1,
      alpha,
      beta,
      nextPlayer,
      maximizingPlayer,
      stats,
      trace
    );
    trace?.exit(value);

    if (isMaximizing) {
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
        bestEval = evalResult;
        trace?.best();
      }
      alpha = Math.max(alpha, bestValue);
    } else {
      if (value < bestValue) {
        bestValue = value;
        bestMove = move;
        bestEval = evalResult;
        trace?.best();
      }
      beta = Math.min(beta, bestValue);
    }

    if (beta <= alpha) {
      stats.prunes += 1;
      trace?.cutoff(alpha, beta);
      break; // alpha-beta cutoff
    }
  }

  trace?.value(bestValue);
  return { value: bestValue, move: bestMove, evalResult: bestEval };
}

// Finds the best move for `player` at the given state, searching to `depth`.
// Returns { move, value, evalResult, nodes, prunes, elapsedMs }.
// `trace` is the optional passive observer described above.
export function findBestMove(adapter, state, player, depth, trace) {
  const start = performance.now();
  const stats = { nodes: 0, prunes: 0 };
  const moves = adapter.getLegalMoves(state, player);

  if (moves.length === 0) return null;
  trace?.root(state, player, depth, moves);

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
    trace?.enter(move, nextState, nextPlayer, depth - 1, alpha, beta);
    const { value, evalResult } = minimax(
      adapter,
      nextState,
      depth - 1,
      alpha,
      beta,
      nextPlayer,
      player,
      stats,
      trace
    );
    trace?.exit(value);
    moveScores.push({ move, value, evalResult });

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
      bestEval = evalResult;
      trace?.best();
    }
    alpha = Math.max(alpha, bestValue);
  }
  trace?.value(bestValue);

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