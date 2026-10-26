import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Scan,
  Maximize2,
  Minimize2,
  Trash2,
  Route,
  ListTree,
  Scissors,
  AlertTriangle,
  Circle,
  Locate,
} from 'lucide-react';
import TreeCanvas from './TreeCanvas.jsx';
import NodeDetails from './NodeDetails.jsx';
import { layoutTree, chosenPathExpansion, expandWithinBudget, formatExact } from './treeLayout.js';
import { SideDot, Stat, ThinkingDots } from '../ui.jsx';

// Side panel that visualizes the searches the bot actually ran. It receives
// finished trace records from PlayView and never calls the engine.
export default function SearchTreePanel({
  game,
  traces,
  selectedRunId,
  onSelectRun,
  isSearching,
  searchingInfo,
  recording,
  onToggleRecording,
  onClear,
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const run = traces.find((t) => t.runId === selectedRunId) ?? null;

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  return (
    <section
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col p-3 sm:p-5'
          : 'card flex h-[720px] flex-col overflow-hidden xl:h-[calc(100vh-6.5rem)] xl:min-h-[640px]'
      }
      style={fullscreen ? { background: 'var(--void)' } : undefined}
      aria-label="Search tree visualization"
    >
      <div className={fullscreen ? 'card flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex min-h-0 flex-1 flex-col'}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3" style={{ borderColor: 'var(--hairline)' }}>
          <div className="mr-auto min-w-0">
            <div className="card-title">
              <GitBranch size={15} style={{ color: 'var(--signal)' }} />
              Search tree <span style={{ color: 'var(--dim)', fontWeight: 500 }}>· Minimax with α-β pruning</span>
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--dim)' }}>
              Recorded from the engine's real execution — each node is one actual minimax call.
            </div>
          </div>
          {traces.length > 0 && (
            <select
              className="select font-mono-data"
              value={selectedRunId ?? ''}
              onChange={(e) => onSelectRun(Number(e.target.value))}
              aria-label="Choose a recorded search"
            >
              {[...traces].reverse().map((t) => (
                <option key={t.runId} value={t.runId}>
                  Search #{t.runId} · move {t.ply + 1} · {game.sideLabel[t.player]} {t.moveFormatted}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-0.5">
            <button
              className={`icon-btn ${recording ? 'active' : ''}`}
              onClick={onToggleRecording}
              data-tip={recording ? 'Recording bot searches (click to pause)' : 'Recording paused (click to resume)'}
              aria-pressed={recording}
              aria-label="Toggle search recording"
            >
              <Circle size={13} fill={recording ? 'currentColor' : 'none'} />
            </button>
            <button className="icon-btn" onClick={onClear} disabled={!traces.length} data-tip="Clear recorded trees (view only)" aria-label="Clear recorded trees">
              <Trash2 size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setFullscreen((f) => !f)}
              data-tip={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
              aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {run ? (
          <TraceView key={run.runId} game={game} run={run} isSearching={isSearching} fullscreen={fullscreen} />
        ) : (
          <EmptyState isSearching={isSearching} searchingInfo={searchingInfo} recording={recording} game={game} />
        )}
      </div>
    </section>
  );
}

function EmptyState({ isSearching, searchingInfo, recording, game }) {
  return (
    <div className="tree-canvas flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl"
          style={{ background: 'var(--panel-raised)', border: '1px solid var(--hairline)', color: isSearching ? 'var(--signal)' : 'var(--dim)' }}
        >
          {isSearching ? <ThinkingDots /> : <ListTree size={22} />}
        </div>
        {isSearching ? (
          <>
            <div className="font-semibold">Bot is searching…</div>
            <p className="mt-1 text-sm" style={{ color: 'var(--dim)' }}>
              {searchingInfo && <>{game.sideLabel[searchingInfo.player]} · depth {searchingInfo.depth}. </>}
              The search runs in one synchronous step, so the tree appears as soon as it completes.
            </p>
          </>
        ) : (
          <>
            <div className="font-semibold">No search recorded yet</div>
            <p className="mt-1 text-sm" style={{ color: 'var(--dim)' }}>
              {recording
                ? "Each time the bot moves, the search it actually ran will appear here. Make your move to begin."
                : 'Recording is paused. Turn it back on with the record button to capture the next bot search.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function TraceView({ game, run, isSearching, fullscreen }) {
  const { trace } = run;
  const nodes = trace.nodes;
  const canvasRef = useRef(null);
  const [showPruned, setShowPruned] = useState(true);
  const [expanded, setExpanded] = useState(() => chosenPathExpansion(nodes));
  const [selectedKey, setSelectedKey] = useState(() => {
    const first = nodes[0]?.bestChild;
    return first !== null && first !== undefined ? `n${first}` : 'n0';
  });
  const [legendOpen, setLegendOpen] = useState(false);

  const layout = useMemo(() => layoutTree(nodes, expanded, showPruned), [nodes, expanded, showPruned]);

  const summary = useMemo(() => {
    let leaves = 0;
    let cutoffs = 0;
    let skipped = 0;
    let maxDepth = 0;
    for (const n of nodes) {
      if (n.kind === 'leaf') leaves += 1;
      if (n.cutoff) cutoffs += 1;
      skipped += n.skippedMoves.length;
      if (n.depth > maxDepth) maxDepth = n.depth;
    }
    return { leaves, cutoffs, skipped, maxDepth };
  }, [nodes]);

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectNode(id) {
    // Make sure every ancestor is open so the node is visible.
    setExpanded((prev) => {
      const next = new Set(prev);
      let cur = nodes[id];
      while (cur && cur.parent !== null) {
        next.add(cur.parent);
        cur = nodes[cur.parent];
      }
      return next;
    });
    setSelectedKey(`n${id}`);
    setTimeout(() => canvasRef.current?.centerOn(`n${id}`), 0);
  }

  function onKeyDown(e) {
    const items = layout.items;
    const cur = items.find((i) => i.key === selectedKey);
    if (!cur) return;
    let target = null;
    if (e.key === 'ArrowLeft') {
      const parentId = cur.type === 'node' ? cur.node.parent : cur.parent.id;
      if (parentId !== null && parentId !== undefined) target = `n${parentId}`;
    } else if (e.key === 'ArrowRight' && cur.type === 'node') {
      if (cur.expandable && !cur.open) {
        toggle(cur.node.id);
      } else if (cur.open) {
        const child = items.find((i) => (i.type === 'node' ? i.node.parent === cur.node.id : i.parent?.id === cur.node.id));
        if (child) target = child.key;
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const sameDepth = items.filter((i) => i.depth === cur.depth).sort((a, b) => a.y - b.y);
      const idx = sameDepth.indexOf(cur);
      const next = sameDepth[idx + (e.key === 'ArrowUp' ? -1 : 1)];
      if (next) target = next.key;
    } else if (e.key === 'Enter' && cur.type === 'node') {
      toggle(cur.node.id);
    } else {
      return;
    }
    e.preventDefault();
    if (target) {
      setSelectedKey(target);
      canvasRef.current?.centerOn(target);
    }
  }

  const rootNode = nodes[0];

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${fullscreen ? 'lg:flex-row' : ''}`}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 border-b px-3 py-2.5 sm:grid-cols-6" style={{ borderColor: 'var(--hairline)' }}>
          <Stat
            label="Chosen"
            value={`${run.moveFormatted}  ${formatExact(Number(run.value.toFixed(3)))}`}
            accent="var(--signal)"
            hint="Move returned by findBestMove and its value"
          />
          <Stat label="Nodes" value={run.nodes.toLocaleString()} hint="stats.nodes reported by the engine (minimax calls, root excluded)" />
          <Stat label="Cutoffs" value={run.prunes.toLocaleString()} accent="var(--violet)" hint="stats.prunes reported by the engine" />
          <Stat label="Leaves" value={summary.leaves.toLocaleString()} hint="Recorded nodes where the evaluator was called" />
          <Stat label="Pruned moves" value={summary.skipped.toLocaleString()} hint="Generated moves never searched because of a cutoff (recorded part of the tree)" />
          <Stat label="Time" value={`${run.elapsedMs.toFixed(0)} ms`} hint="Search time measured by findBestMove (includes recording overhead)" />
        </div>

        {(trace.truncated || trace.error) && (
          <div className="flex items-start gap-2 border-b px-4 py-2 text-xs" style={{ borderColor: 'var(--hairline)', background: 'rgba(245,166,35,0.08)', color: '#f7c46c' }}>
            <AlertTriangle size={14} className="mt-px shrink-0" />
            {trace.truncated ? (
              <span>
                Partial trace: the first {nodes.length.toLocaleString()} nodes were recorded and{' '}
                {trace.droppedNodes.toLocaleString()} more were searched but not stored (cap{' '}
                {trace.maxNodes.toLocaleString()}). The tree shows only what was captured. The engine's own counters
                above cover the whole search.
              </span>
            ) : (
              <span>The recorder hit an error ({trace.error}); the tree may be incomplete. The engine's result was not affected.</span>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: 'var(--hairline)' }}>
          <button className="icon-btn" onClick={() => canvasRef.current?.zoomIn()} data-tip="Zoom in" aria-label="Zoom in"><ZoomIn size={15} /></button>
          <button className="icon-btn" onClick={() => canvasRef.current?.zoomOut()} data-tip="Zoom out" aria-label="Zoom out"><ZoomOut size={15} /></button>
          <button className="icon-btn" onClick={() => canvasRef.current?.fit()} data-tip="Fit to view" aria-label="Fit to view"><Scan size={15} /></button>
          <button className="icon-btn" onClick={() => selectedKey && canvasRef.current?.centerOn(selectedKey)} data-tip="Center on selection" aria-label="Center on selection"><Locate size={15} /></button>
          <span className="mx-1 h-5 w-px" style={{ background: 'var(--hairline)' }} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setExpanded(chosenPathExpansion(nodes));
              setTimeout(() => canvasRef.current?.fitReadable(), 0);
            }}
          >
            <Route size={14} /> Chosen path
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setExpanded(expandWithinBudget(nodes, showPruned));
              setTimeout(() => canvasRef.current?.fitReadable(), 0);
            }}
            title="Expands level by level until about 1,200 items are visible"
          >
            <ListTree size={14} /> Expand more
          </button>
          <button
            className={`btn btn-sm ${showPruned ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setShowPruned((s) => !s)}
            aria-pressed={showPruned}
          >
            <Scissors size={13} /> Pruned
          </button>
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setLegendOpen((o) => !o)} aria-expanded={legendOpen}>
            Legend
          </button>
        </div>

        {legendOpen && <Legend game={game} rootPlayer={trace.rootPlayer} />}

        <div className="relative min-h-[240px] flex-1 outline-none" tabIndex={0} onKeyDown={onKeyDown} aria-label="Search tree canvas. Use arrow keys to navigate.">
          <TreeCanvas
            ref={canvasRef}
            game={game}
            layout={layout}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onToggle={toggle}
          />
          <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px]" style={{ background: 'rgba(11,14,20,0.85)', color: 'var(--dim)', border: '1px solid var(--hairline)' }}>
            Root: <SideDot color={game.sideColor[rootNode.player]} size={8} /> {game.sideLabel[rootNode.player]} to move · depth {rootNode.remaining}
          </div>
          {isSearching && (
            <div className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(245,166,35,0.15)', color: 'var(--signal)', border: '1px solid rgba(245,166,35,0.4)' }}>
              <ThinkingDots /> New search in progress, will appear when complete
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div
        className={`overflow-y-auto border-t ${fullscreen ? 'max-h-[45vh] lg:max-h-none lg:w-[420px] lg:border-l lg:border-t-0' : 'max-h-[36%] min-h-[150px]'}`}
        style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
      >
        <div className="eyebrow sticky top-0 z-10 border-b px-4 py-2" style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}>
          Node details
        </div>
        <NodeDetails game={game} trace={trace} selectedKey={selectedKey} onSelectNode={selectNode} />
      </div>
    </div>
  );
}

function LegendRow({ swatch, label, desc }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{swatch}</span>
      <span>
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>{label}</span>
        <span> {desc}</span>
      </span>
    </div>
  );
}

function Legend({ game, rootPlayer }) {
  const box = (style) => <span className="block h-3.5 w-6 rounded" style={style} />;
  return (
    <div className="grid gap-x-6 gap-y-1.5 border-b px-4 py-3 text-[11.5px] sm:grid-cols-2" style={{ borderColor: 'var(--hairline)', color: 'var(--dim)', background: 'var(--panel)' }}>
      <LegendRow swatch={box({ background: 'var(--panel-raised)', borderLeft: '4px solid var(--sky)' })} label="▲ MAX" desc={`node where the bot (${game.sideLabel[rootPlayer]}) picks the highest value`} />
      <LegendRow swatch={box({ background: 'var(--panel-raised)', borderLeft: '4px solid var(--rose)' })} label="▼ MIN" desc="node where the opponent picks the lowest value" />
      <LegendRow swatch={box({ background: 'rgba(245,166,35,0.13)', border: '1px solid rgba(245,166,35,0.75)' })} label="Chosen path" desc="root → best child at each level; the first step is the move played" />
      <LegendRow swatch={<span className="text-[11px]" style={{ color: 'var(--violet)' }}>✂</span>} label="Cutoff" desc="β ≤ α happened here; the remaining moves were skipped" />
      <LegendRow swatch={box({ border: '1px dashed var(--violet)', opacity: 0.7 })} label="Pruned" desc="generated by the parent but never searched (no value)" />
      <LegendRow swatch={<span className="font-mono-data text-[9px] font-bold" style={{ color: '#6b7891' }}>LEAF</span>} label="Leaf" desc="depth limit: the heuristic evaluator was called here" />
      <LegendRow swatch={<span className="font-mono-data text-[9px] font-bold" style={{ color: 'var(--good)' }}>TERM</span>} label="Terminal / no moves" desc="game over or side to move had no legal moves" />
      <LegendRow swatch={<span className="font-mono-data text-[10px]">v</span>} label="Value" desc="raw minimax value returned, from the bot's perspective (higher = better for the bot)" />
    </div>
  );
}
