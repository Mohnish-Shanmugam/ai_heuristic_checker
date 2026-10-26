import { Eye, Scissors, Info } from 'lucide-react';
import MiniBoard from './MiniBoard.jsx';
import TelemetryPanel from '../TelemetryPanel.jsx';
import { formatExact, formatValue, pathToNode } from './treeLayout.js';
import { SideDot } from '../ui.jsx';

function Field({ label, children, hint }) {
  return (
    <div className="min-w-0 rounded-md px-2.5 py-1.5" style={{ background: 'var(--panel-raised)' }} title={hint}>
      <div className="truncate text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="font-mono-data truncate text-[12.5px]">{children}</div>
    </div>
  );
}

function leafReasonText(n) {
  if (n.leafReason === 'no-moves') return 'side to move had no legal moves (forced ±100000)';
  if (n.leafReason === 'terminal') return 'terminal position (game over)';
  if (n.leafReason === 'depth-limit') return n.evalTerminal ? 'depth limit reached (position is also terminal)' : 'depth limit reached';
  return null;
}

// Shows the recorded fields of the selected item. Purely a read-out: nothing
// here calls the engine except the existing `normalize` display helper.
export default function NodeDetails({ game, trace, selectedKey, onSelectNode }) {
  const nodes = trace.nodes;

  if (!selectedKey) {
    return (
      <div className="flex items-start gap-2 p-4 text-sm" style={{ color: 'var(--dim)' }}>
        <Info size={15} className="mt-0.5 shrink-0" />
        Select a node to see what the search recorded for it. Double-click a node, or use its +/− badge, to expand or
        collapse it. Arrow keys move the selection.
      </div>
    );
  }

  if (selectedKey.startsWith('p')) {
    const [pid, idx] = selectedKey.slice(1).split('-').map(Number);
    const parent = nodes[pid];
    const move = parent?.skippedMoves[idx];
    if (!parent || move === undefined) return null;
    const searched = parent.children.length + parent.unrecorded;
    return (
      <div className="space-y-3 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-data text-base font-semibold">{game.formatMove(move)}</span>
          <span className="chip" style={{ color: 'var(--violet)', borderColor: 'rgba(167,139,250,0.4)' }}><Scissors size={11} /> pruned</span>
        </div>
        <p style={{ color: 'var(--dim)' }}>
          This move was generated at node{' '}
          <button className="font-mono-data underline decoration-dotted" style={{ color: 'var(--ink)' }} onClick={() => onSelectNode(parent.id)}>#{parent.id}</button>{' '}
          but never searched: after {searched} of {parent.generated} moves the window closed
          (α = {formatExact(parent.cutoff?.alpha)}, β = {formatExact(parent.cutoff?.beta)}, β ≤ α), so the loop stopped.
          No value exists for it.
        </p>
      </div>
    );
  }

  if (selectedKey.startsWith('u')) {
    const parent = nodes[Number(selectedKey.slice(1))];
    return (
      <div className="p-4 text-sm" style={{ color: 'var(--dim)' }}>
        Node #{parent.id} searched {parent.unrecorded} more child node(s) that were counted but not stored, because
        this trace reached its cap of {trace.maxNodes.toLocaleString()} recorded nodes. Their values are not shown
        because they were not recorded.
      </div>
    );
  }

  const n = nodes[Number(selectedKey.slice(1))];
  if (!n) return null;
  const path = pathToNode(nodes, n.id).slice(1);
  const best = n.bestChild !== null ? nodes[n.bestChild] : null;
  const isRoot = n.kind === 'root';
  const role = isRoot ? 'Root (MAX)' : n.maximizing ? 'MAX' : 'MIN';

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono-data text-base font-semibold">{isRoot ? 'Root' : game.formatMove(n.move)}</span>
        <span className="chip font-mono-data">#{n.id}</span>
        <span className="chip" style={{ color: isRoot ? 'var(--signal)' : n.maximizing ? 'var(--sky)' : 'var(--rose)' }}>{role}</span>
        {n.kind === 'leaf' && <span className="chip" style={{ color: 'var(--good)' }}>leaf</span>}
        {n.onChosenPath && <span className="chip" style={{ color: 'var(--signal)', borderColor: 'rgba(245,166,35,0.4)' }}>chosen path</span>}
        {n.cutoff && <span className="chip" style={{ color: 'var(--violet)', borderColor: 'rgba(167,139,250,0.4)' }}><Scissors size={11} /> cutoff here</span>}
      </div>

      <div>
        <div className="eyebrow mb-1.5 text-[9.5px]">Path from root</div>
        <div className="flex flex-wrap items-center gap-1">
          <button className="chip font-mono-data hover:text-white" onClick={() => onSelectNode(0)}>root</button>
          {path.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <span style={{ color: 'var(--faint)' }}>›</span>
              <button
                className="chip font-mono-data hover:text-white"
                style={{ color: p.id === n.id ? 'var(--ink)' : undefined }}
                onClick={() => onSelectNode(p.id)}
              >
                <SideDot color={game.sideColor[nodes[p.parent].player]} size={7} />
                {game.formatMove(p.move)}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Field label="Returned value" hint="Value this node returned to its parent (root-player perspective; higher is better for the bot).">
          <span style={{ color: n.onChosenPath ? 'var(--signal)' : undefined }}>{formatExact(n.value)}</span>
        </Field>
        <Field label="Normalized" hint="The returned value passed through the game's existing normalize() display function.">
          {n.value === null ? '—' : formatValue(game.normalize(n.value))}
        </Field>
        <Field label="Parent">{n.parent === null ? '—' : `#${n.parent}`}</Field>
        <Field label="Ply / remaining" hint="Ply below the root / depth argument passed to this call">{n.depth} / {n.remaining}</Field>
        <Field label="To move">
          <span className="inline-flex items-center gap-1.5"><SideDot color={game.sideColor[n.player]} size={8} />{game.sideLabel[n.player]}</span>
        </Field>
        <Field label="α / β in" hint="Window the parent passed into this call">
          {isRoot ? '—' : `${formatExact(n.alpha)} / ${formatExact(n.beta)}`}
        </Field>
        {n.kind !== 'leaf' && (
          <>
            <Field label="Generated" hint="Legal moves generated at this node">{n.generated}</Field>
            <Field label="Searched" hint="Children actually searched (recorded + unrecorded)">{n.children.length + n.unrecorded}</Field>
            <Field label="Pruned" hint="Generated moves skipped by an alpha-beta cutoff">{n.skippedMoves.length}</Field>
          </>
        )}
        {n.kind === 'leaf' && (
          <Field label="Evaluator score" hint="`score` returned by the evaluator (display scale, absolute: + favors the first side)">
            {formatExact(n.evalScore)}
          </Field>
        )}
        {best && (
          <Field label="Best child" hint="Child the search kept as its best move at this node">
            <button className="underline decoration-dotted" onClick={() => onSelectNode(best.id)}>
              {game.formatMove(best.move)} #{best.id}
            </button>
          </Field>
        )}
        {n.cutoff && (
          <Field label="Cutoff at α / β">{formatExact(n.cutoff.alpha)} / {formatExact(n.cutoff.beta)}</Field>
        )}
      </div>

      {n.kind === 'leaf' && (
        <p className="text-xs" style={{ color: 'var(--dim)' }}>Leaf reason: {leafReasonText(n)}</p>
      )}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--sky)' }}>
          <Eye size={13} /> PREVIEW of the search state — not the live game
        </div>
        <div className="flex items-start gap-4">
          <MiniBoard game={game} state={n.state} move={n.move} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
            Board the search created at this node{n.move !== null ? ' (highlighted: the move that led here)' : ''}.
            Viewing it does not change the game or start a new search.
          </p>
        </div>
      </div>

      {n.kind === 'leaf' && n.breakdown && (
        <TelemetryPanel game={game} breakdown={n.breakdown} title="Leaf evaluation terms" compact />
      )}
    </div>
  );
}
