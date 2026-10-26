import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Dot } from 'recharts';
import { ArrowLeft, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, ListOrdered, Sparkles } from 'lucide-react';
import { analyzeHumanMoves } from '../engine/postMatchAnalysis.js';
import TelemetryPanel from './TelemetryPanel.jsx';
import { AppHeader, Card, SideDot, Stat, ThinkingDots } from './ui.jsx';

function fmtScore(n) {
  return `${n > 0 ? '+' : ''}${n}`;
}

// Terminal tic-tac-toe positions score ±1000; clamp for the ±100 chart axis only.
const clampForChart = (n) => Math.max(-100, Math.min(100, n));

function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  if (payload.analysis?.isBlunder) {
    return <Dot cx={cx} cy={cy} r={5.5} fill="#f87171" stroke="#0b0e14" strokeWidth={1.5} />;
  }
  return <Dot cx={cx} cy={cy} r={2.5} fill="#38bdf8" stroke="none" />;
}

function CustomTooltip({ active, payload, game }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="font-mono-data rounded-lg border px-3 py-2 text-xs" style={{ background: '#05070b', borderColor: 'var(--hairline)' }}>
      {d.index === -1 ? (
        <div>start position</div>
      ) : (
        <div>
          move {d.index + 1}: <span style={{ color: game.sideColor[d.player] }}>{game.sideLabel[d.player]}</span> {d.formattedMove}
        </div>
      )}
      <div style={{ color: 'var(--dim)' }}>eval: {fmtScore(d.evalScore)}</div>
      {d.analysis?.isBlunder && <div style={{ color: 'var(--bad)' }}>⚠ blunder (−{d.analysis.deltaNormalized} pts)</div>}
    </div>
  );
}

export default function PostMatchAnalysis({ game, moveHistory, humanSide, aiDepth, onExit, onRematch }) {
  const [analyzed, setAnalyzed] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    // Defer so the "analyzing" state paints before the synchronous searches run.
    const timer = setTimeout(() => {
      setAnalyzed(analyzeHumanMoves(game, moveHistory, humanSide));
    }, 30);
    return () => clearTimeout(timer);
  }, [game, moveHistory, humanSide]);

  const chartData = useMemo(() => {
    const source = analyzed ?? moveHistory;
    return [{ index: -1, evalScore: 0, player: null, formattedMove: 'start' }, ...source].map((d) => ({
      ...d,
      chartScore: clampForChart(d.evalScore),
    }));
  }, [analyzed, moveHistory]);

  const humanMoves = (analyzed ?? []).filter((e) => e.player === humanSide);
  const blunders = humanMoves.filter((e) => e.analysis?.isBlunder);
  const optimal = humanMoves.filter((e) => e.analysis?.wasOptimal);
  const reviewed = humanMoves.filter((e) => e.analysis);
  const finalStatus = game.getStatus(moveHistory[moveHistory.length - 1]?.boardAfter ?? game.createInitialState(), game.nextPlayer(moveHistory[moveHistory.length - 1]?.player ?? game.sides.second));
  const resultLabel = finalStatus ? (finalStatus.winner === 'draw' ? 'Draw' : `${game.sideLabel[finalStatus.winner]} won`) : 'Unfinished';

  const selected = selectedIndex !== null && analyzed ? analyzed[selectedIndex] : null;

  return (
    <div className="min-h-screen">
      <AppHeader
        onHome={onExit}
        crumbs={[game.name, 'Analysis']}
        right={
          <>
            <button onClick={onExit} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Menu</button>
            <button onClick={onRematch} className="btn btn-primary btn-sm"><RotateCcw size={14} /> Rematch</button>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-fade-up mb-6">
          <div className="eyebrow mb-2">Post-match analysis</div>
          <h1 className="text-3xl font-extrabold tracking-tight">{resultLabel}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm" style={{ color: 'var(--dim)' }}>
            {game.name} · you played <SideDot color={game.sideColor[humanSide]} size={9} /> {game.sideLabel[humanSide]} vs. bot at depth {aiDepth}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Plies" value={moveHistory.length} />
          <Stat label="Your moves reviewed" value={analyzed ? reviewed.length : '…'} hint="Moves with more than one legal option" />
          <Stat label="Engine-matching" value={analyzed ? optimal.length : '…'} accent="var(--good)" />
          <Stat label="Blunders" value={analyzed ? blunders.length : '…'} accent={blunders.length ? 'var(--bad)' : undefined} />
        </div>

        <Card title="Evaluation over the game" icon={TrendingUp} className="mb-6" bodyClassName="p-4">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1f2738" strokeDasharray="3 3" />
                <XAxis dataKey="index" tickFormatter={(v) => (v === -1 ? '0' : v + 1)} stroke="#5d677c" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis domain={[-100, 100]} stroke="#5d677c" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <ReferenceLine y={0} stroke="#34405a" />
                <Tooltip content={<CustomTooltip game={game} />} />
                <Line type="monotone" dataKey="chartScore" stroke="#38bdf8" strokeWidth={2} dot={<CustomDot />} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[11px]" style={{ color: 'var(--dim)' }}>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--bad)' }} /> flagged blunder</span>
            <span>positive favors {game.sideLabel[game.sides.first]}, negative favors {game.sideLabel[game.sides.second]}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <Card title="Move-by-move review" icon={ListOrdered}>
            <div className="max-h-[460px] overflow-y-auto p-1.5">
              {(analyzed ?? moveHistory).map((entry, i) => {
                const isHuman = entry.player === humanSide;
                const isBlunder = entry.analysis?.isBlunder;
                const clickable = isHuman && entry.analysis;
                return (
                  <button
                    key={entry.index}
                    onClick={() => clickable && setSelectedIndex(i)}
                    disabled={!clickable}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors"
                    style={{
                      background: selectedIndex === i ? 'var(--panel-raised)' : 'transparent',
                      boxShadow: selectedIndex === i ? 'inset 2px 0 0 var(--signal)' : undefined,
                      cursor: clickable ? 'pointer' : 'default',
                      opacity: isHuman ? 1 : 0.6,
                    }}
                  >
                    <span className="font-mono-data flex items-center gap-2">
                      <span className="w-6 text-right" style={{ color: 'var(--faint)' }}>{i + 1}.</span>
                      <SideDot color={game.sideColor[entry.player]} size={8} />
                      {entry.formattedMove}
                      {!isHuman && <span className="text-[10px]" style={{ color: 'var(--faint)' }}>bot</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono-data text-xs" style={{ color: 'var(--dim)' }}>{fmtScore(entry.evalScore)}</span>
                      {isBlunder && <AlertTriangle size={13} style={{ color: 'var(--bad)' }} />}
                      {entry.analysis?.wasOptimal && <CheckCircle2 size={13} style={{ color: 'var(--good)' }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {!selected && (
              <div className="card flex items-start gap-3 p-6 text-sm" style={{ color: 'var(--dim)' }}>
                {analyzed === null ? (
                  <>
                    <span style={{ color: 'var(--signal)' }}><ThinkingDots /></span> Re-running the engine over your moves…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mt-0.5 shrink-0" />
                    Select one of your moves on the left to compare it with the engine's recommended move, with a full
                    heuristic breakdown of each.
                  </>
                )}
              </div>
            )}
            {selected && (
              <>
                <div className="card animate-fade-up p-4">
                  <div className="mb-3 text-sm font-semibold">
                    Move {selected.index + 1} — {selected.analysis.wasOptimal ? "this was the engine's top choice" : 'comparison'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg p-3" style={{ background: 'var(--panel-raised)' }}>
                      <div className="mb-1 text-[11px]" style={{ color: 'var(--dim)' }}>You played</div>
                      <div className="font-mono-data text-lg">{selected.analysis.playedMoveFormatted}</div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--dim)' }}>search value: {fmtScore(selected.analysis.playedNormalized)}</div>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'var(--panel-raised)', border: '1px solid var(--signal)' }}>
                      <div className="mb-1 text-[11px]" style={{ color: 'var(--signal)' }}>Engine recommends</div>
                      <div className="font-mono-data text-lg">{selected.analysis.bestMoveFormatted}</div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--dim)' }}>search value: {fmtScore(selected.analysis.bestNormalized)}</div>
                    </div>
                  </div>
                  {!selected.analysis.wasOptimal && (
                    <div className="mt-3 text-sm" style={{ color: 'var(--dim)' }}>
                      This move gave up approximately{' '}
                      <span className="font-mono-data" style={{ color: 'var(--bad)' }}>{selected.analysis.deltaNormalized}</span> evaluation points
                      versus the engine's best line (searched to depth {selected.analysis.depth}).
                    </div>
                  )}
                </div>
                <TelemetryPanel game={game} breakdown={selected.analysis.playedBreakdown} title="Breakdown at the end of your line" compact />
                <TelemetryPanel game={game} breakdown={selected.analysis.bestBreakdown} title="Breakdown at the end of the engine's line" compact />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
