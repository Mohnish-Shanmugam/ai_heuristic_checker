// Pure presentation helpers for the search-tree view. Everything here reads
// a finished trace (see engine/searchTrace.js); nothing is fed back into the
// engine.

export const NODE_W = 138;
export const NODE_H = 44;
export const COL_W = 196;
export const ROW_H = 54;

// Visible items a node contributes when expanded: recorded children, plus
// (optionally) the generated-but-never-searched moves of a cutoff, plus one
// marker if some searched children were not stored.
function childSlots(node, showPruned) {
  return node.children.length + (showPruned ? node.skippedMoves.length : 0) + (node.unrecorded > 0 ? 1 : 0);
}

export function isExpandable(node, showPruned) {
  return childSlots(node, showPruned) > 0;
}

// Default expansion: the root plus every node on the chosen (best-child) path.
export function chosenPathExpansion(nodes) {
  const set = new Set();
  for (const n of nodes) if (n.onChosenPath) set.add(n.id);
  return set;
}

// Breadth-first expansion until roughly `budget` items would be visible.
export function expandWithinBudget(nodes, showPruned, budget = 1200) {
  const set = new Set();
  if (!nodes.length) return set;
  let count = 1;
  const queue = [nodes[0]];
  while (queue.length) {
    const n = queue.shift();
    const k = childSlots(n, showPruned);
    if (k === 0) continue;
    if (count + k > budget) break;
    set.add(n.id);
    count += k;
    for (const c of n.children) queue.push(nodes[c]);
  }
  return set;
}

// Left-to-right tidy layout: every visible leaf gets its own row and a
// parent is centred on its first and last visible child.
export function layoutTree(nodes, expanded, showPruned) {
  const items = [];
  const edges = [];
  let row = 0;
  let maxDepth = 0;

  function place(nodeId, parentItem) {
    const node = nodes[nodeId];
    const item = { key: `n${nodeId}`, type: 'node', node, depth: node.depth, x: node.depth * COL_W, y: 0 };
    maxDepth = Math.max(maxDepth, node.depth);
    items.push(item);
    if (parentItem) {
      const isBest = nodes[parentItem.node.id].bestChild === nodeId;
      edges.push({ from: parentItem, to: item, kind: node.onChosenPath && parentItem.node.onChosenPath ? 'chosen' : isBest ? 'best' : 'normal' });
    }

    item.slots = childSlots(node, showPruned);
    item.expandable = item.slots > 0;
    const open = expanded.has(nodeId) && item.expandable;
    item.open = open;
    if (!open) {
      item.y = row++ * ROW_H;
      return item;
    }

    const kids = node.children.map((c) => place(c, item));

    if (showPruned) {
      node.skippedMoves.forEach((move, i) => {
        const ghost = {
          key: `p${nodeId}-${i}`,
          type: 'pruned',
          parent: node,
          move,
          index: node.children.length + node.unrecorded + i,
          depth: node.depth + 1,
          x: (node.depth + 1) * COL_W,
          y: row++ * ROW_H,
        };
        maxDepth = Math.max(maxDepth, ghost.depth);
        items.push(ghost);
        edges.push({ from: item, to: ghost, kind: 'pruned' });
        kids.push(ghost);
      });
    }

    if (node.unrecorded > 0) {
      const marker = {
        key: `u${nodeId}`,
        type: 'unrecorded',
        parent: node,
        count: node.unrecorded,
        depth: node.depth + 1,
        x: (node.depth + 1) * COL_W,
        y: row++ * ROW_H,
      };
      items.push(marker);
      edges.push({ from: item, to: marker, kind: 'unrecorded' });
      kids.push(marker);
    }

    item.y = (kids[0].y + kids[kids.length - 1].y) / 2;
    return item;
  }

  if (nodes.length) place(0, null);

  return {
    items,
    edges,
    width: maxDepth * COL_W + NODE_W,
    height: Math.max(row, 1) * ROW_H - (ROW_H - NODE_H),
  };
}

export function formatValue(v) {
  if (v === null || v === undefined) return '—';
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '−∞';
  if (Object.is(v, -0)) v = 0;
  if (Math.abs(v) >= 1000) return `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) / 1000)}k`;
  const s = Number.isInteger(v) ? String(Math.abs(v)) : Math.abs(v).toFixed(2);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s}`;
}

export function formatExact(v) {
  if (v === null || v === undefined) return '—';
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '−∞';
  if (Object.is(v, -0)) return '0';
  return String(Number.isInteger(v) ? v : Number(v.toFixed(6)));
}

export function pathToNode(nodes, id) {
  const path = [];
  let cur = nodes[id];
  while (cur) {
    path.unshift(cur);
    cur = cur.parent !== null ? nodes[cur.parent] : null;
  }
  return path;
}
