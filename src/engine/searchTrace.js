// ============================================================================
// Passive search tracer for minimax.js
// ============================================================================
// Pass the object returned by createSearchTrace() as the optional last
// argument of findBestMove(). minimax.js calls the hooks below at the points
// where it already enters a child, evaluates a leaf, updates its best move,
// or performs an alpha-beta cutoff. The tracer only stores the values it is
// handed — it never returns anything to the search — so the search behaves
// identically with or without it.
//
// Recorded node (one per real minimax() call, plus the findBestMove root):
//   id            execution order (0 = root)
//   parent        parent node id (null for root)
//   depth         ply from the root
//   remaining     depth argument the search passed to this node
//   move          move that produced this node (null for root)
//   state         reference to the immutable board the search created
//   player        side to move at this node
//   maximizing    whether this node maximizes (player === root player)
//   alpha, beta   window the parent passed into this node
//   kind          'root' | 'internal' | 'leaf'
//   leafReason    'depth-limit' | 'terminal' | 'no-moves' (leaves only)
//   value         value this node returned to its parent
//   evalScore     evaluator's display score (leaves only)
//   generated     number of legal moves generated (internal nodes)
//   children      ids of recorded children, in search order
//   bestChild     child the search kept as its best move (null if none)
//   cutoff        { alpha, beta } if an alpha-beta cutoff happened here
//   skippedMoves  generated moves never searched because of that cutoff
//   unrecorded    children searched but not stored (node cap reached)
//   onChosenPath  node lies on the root → best-child chain
//
// Large searches are capped at `maxNodes` stored nodes; the rest are still
// counted (`droppedNodes`) so the UI can say the trace is partial.

export const DEFAULT_MAX_NODES = 40000;

export function createSearchTrace({ maxNodes = DEFAULT_MAX_NODES } = {}) {
  const nodes = [];
  const stack = [];
  let rootPlayer = null;
  let droppedNodes = 0;
  let error = null;

  const top = () => (stack.length ? stack[stack.length - 1] : null);

  // Any tracer failure is swallowed so it can never interrupt the search.
  const safe = (fn) => (...args) => {
    try {
      fn(...args);
    } catch (e) {
      if (!error) error = e;
    }
  };

  function makeNode(fields) {
    const node = {
      id: nodes.length,
      parent: null,
      depth: 0,
      remaining: 0,
      move: null,
      state: null,
      player: null,
      maximizing: true,
      alpha: -Infinity,
      beta: Infinity,
      kind: 'internal',
      leafReason: null,
      value: null,
      evalScore: null,
      evalTerminal: null,
      breakdown: null,
      generated: 0,
      children: [],
      bestChild: null,
      bestUnrecorded: false,
      cutoff: null,
      skippedMoves: [],
      unrecorded: 0,
      onChosenPath: false,
      _moves: null,
      _searched: 0,
      _lastChild: null,
      ...fields,
    };
    nodes.push(node);
    return node;
  }

  return {
    root: safe((state, player, depth, moves) => {
      rootPlayer = player;
      const node = makeNode({
        kind: 'root',
        state,
        player,
        remaining: depth,
        generated: moves.length,
        _moves: moves,
      });
      stack.push(node);
    }),

    enter: safe((move, state, player, remaining, alpha, beta) => {
      const parent = top();
      if (parent) parent._searched += 1;
      if (!parent || nodes.length >= maxNodes) {
        droppedNodes += 1;
        if (parent) parent.unrecorded += 1;
        stack.push(null);
        return;
      }
      const node = makeNode({
        parent: parent.id,
        depth: parent.depth + 1,
        remaining,
        move,
        state,
        player,
        maximizing: player === rootPlayer,
        alpha,
        beta,
      });
      parent.children.push(node.id);
      stack.push(node);
    }),

    exit: safe((value) => {
      const node = stack.pop();
      if (node) node.value = value;
      const parent = top();
      if (parent) parent._lastChild = node ? node.id : null;
    }),

    leaf: safe((value, evalResult, reason) => {
      const node = top();
      if (!node) return;
      node.kind = 'leaf';
      node.leafReason = reason;
      node.value = value;
      node.evalScore = evalResult?.score ?? null;
      node.evalTerminal = evalResult?.terminal ?? null;
      node.breakdown = evalResult?.breakdown ?? null;
    }),

    expand: safe((moves) => {
      const node = top();
      if (!node) return;
      node.generated = moves.length;
      node._moves = moves;
    }),

    best: safe(() => {
      const node = top();
      if (!node) return;
      node.bestChild = node._lastChild;
      node.bestUnrecorded = node._lastChild === null;
    }),

    cutoff: safe((alpha, beta) => {
      const node = top();
      if (!node) return;
      node.cutoff = { alpha, beta };
      node.skippedMoves = node._moves ? node._moves.slice(node._searched) : [];
    }),

    value: safe((value) => {
      const node = top();
      if (node) node.value = value;
    }),

    // Finalizes and returns the recorded trace. Safe to call once the
    // search has returned.
    result() {
      for (const n of nodes) {
        delete n._moves;
        delete n._searched;
        delete n._lastChild;
      }
      let cur = nodes[0];
      while (cur) {
        cur.onChosenPath = true;
        cur = cur.bestChild !== null ? nodes[cur.bestChild] : null;
      }
      return {
        nodes,
        rootPlayer,
        droppedNodes,
        truncated: droppedNodes > 0,
        maxNodes,
        error: error ? String(error) : null,
      };
    },
  };
}
