import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot,
} from 'recharts';
import { analyzeHumanMoves } from '../engine/postMatchAnalysis.js';
import TelemetryPanel from './TelemetryPanel.jsx';

function fmtScore(n) {
  return `${n > 0 ? '+' : ''}${n}`;
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (payload.analysis?.isBlunder) {
    return <Dot cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#0a0d12" strokeWidth={1.5} />;
  }
  return <Dot cx={cx} cy={cy} r={2.5} fill="#38bdf8" stroke="none" />;
}

function CustomTooltip({ active, payload, game }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-sm border px-3 py-2 text-xs font-mono-data"
      style={{ background: 'var(--panel-raised)', borderColor: 'var(--hairline)' }}
    >
      <div>
        move {d.index + 1}: <span style={{ color: game.sideColor[d.player] }}>{game.sideLabel[d.player]}</span>{' '}
        {d.formattedMove}
      </div>
      <div>eval: {fmtScore(d.evalScore)}</div>
      {d.analysis?.isBlunder && <div className="text-red-400">⚠ blunder (−{d.analysis.deltaNormalized} pts)</div>}
    </div>
  );
}

export default function PostMatchAnalysis({ game, moveHistory, humanSide, finalBoard, onExit, onRematch }) {
  const [analyzed, setAnalyzed] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    setAnalyzed(null);
    const timer = setTimeout(() => {
      const result = analyzeHumanMoves(game, moveHistory, humanSide);
      setAnalyzed(result);
    }, 30);
    return () => clearTimeout(timer);
  }, [game, moveHistory, humanSide]);

  const chartData = useMemo(() => {
    const source = analyzed ?? moveHistory;
    return [{ index: -1, evalScore: 0, player: null, formattedMove: 'start' }, ...source];
  }, [analyzed, moveHistory]);

  const blunders = useMemo(() => (analyzed ?? []).filter((e) => e.analysis?.isBlunder), [analyzed]);

  const selected = selectedIndex !== null && analyzed ? analyzed[selectedIndex] : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10" style={{ background: 'var(--void)' }}>
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onExit} className="text-sm text-[var(--dim)] hover:text-[var(--ink)]">
            ← back to menu
          </button>
          <button
            onClick={onRematch}
            className="rounded-sm px-4 py-1.5 text-sm font-medium"
            style={{ background: 'var(--signal)', color: '#1a1305' }}
          >
            Rematch
          </button>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Post-match analysis</h1>
        <p className="text-sm text-[var(--dim)] mb-6">
          {game.name} · {moveHistory.length} plies ·{' '}
          {analyzed === null ? 're-analyzing your moves…' : `${blunders.length} blunder(s) flagged`}
        </p>

        {/* Evaluation graph */}
        <div
          className="rounded-sm border p-4 mb-6"
          style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
        >
          <div className="text-sm font-medium mb-3">Evaluation vs. move number</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--hairline)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="index"
                  tickFormatter={(v) => (v === -1 ? '0' : v + 1)}
                  stroke="var(--dim)"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  domain={[-100, 100]}
                  stroke="var(--dim)"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <ReferenceLine y={0} stroke="var(--hairline)" />
                <Tooltip content={<CustomTooltip game={game} />} />
                <Line
                  type="monotone"
                  dataKey="evalScore"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={<CustomDot />}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-[var(--dim)] font-mono-data">
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                style={{ background: '#ef4444' }}
              />
              flagged blunder
            </span>
            <span>
              positive favors {game.sideLabel[game.sides.first]}, negative favors {game.sideLabel[game.sides.second]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Move list with blunder flags */}
          <div className="rounded-sm border" style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}>
            <div className="px-4 py-2.5 border-b text-sm font-medium" style={{ borderColor: 'var(--hairline)' }}>
              Move-by-move review
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {(analyzed ?? moveHistory).map((entry, i) => {
                const isHuman = entry.player === humanSide;
                const isBlunder = entry.analysis?.isBlunder;
                return (
                  <button
                    key={entry.index}
                    onClick={() => isHuman && entry.analysis && setSelectedIndex(i)}
                    disabled={!isHuman || !entry.analysis}
                    className="w-full text-left px-4 py-2 text-sm flex items-center justify-between border-b transition-colors"
                    style={{
                      borderColor: 'rgba(38,44,58,0.5)',
                      background: selectedIndex === i ? 'var(--panel-raised)' : 'transparent',
                      cursor: isHuman && entry.analysis ? 'pointer' : 'default',
                    }}
                  >
                    <span className="font-mono-data">
                      {i + 1}.{' '}
                      <span style={{ color: game.sideColor[entry.player] }}>{game.sideLabel[entry.player]}</span>{' '}
                      {entry.formattedMove}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--dim)] font-mono-data text-xs">{fmtScore(entry.evalScore)}</span>
                      {isBlunder && <span className="text-red-400 text-xs">⚠</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Move suggester */}
          <div className="flex flex-col gap-4">
            {!selected && (
              <div
                className="rounded-sm border p-6 text-sm text-[var(--dim)]"
                style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
              >
                {analyzed === null
                  ? 'Re-running the engine over your moves…'
                  : 'Select one of your moves on the left to compare it against the engine\'s recommended move, with a full heuristic breakdown of each.'}
              </div>
            )}
            {selected && (
              <>
                <div
                  className="rounded-sm border p-4"
                  style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
                >
                  <div className="text-sm font-medium mb-3">
                    Move {selected.index + 1} — {selected.analysis.wasOptimal ? 'this was the engine\'s top choice' : 'comparison'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-sm p-3" style={{ background: 'var(--panel-raised)' }}>
                      <div className="text-[11px] text-[var(--dim)] mb-1">You played</div>
                      <div className="font-mono-data text-base">{selected.analysis.playedMoveFormatted}</div>
                      <div className="text-[var(--dim)] text-xs mt-1">
                        search value: {fmtScore(selected.analysis.playedNormalized)}
                      </div>
                    </div>
                    <div
                      className="rounded-sm p-3"
                      style={{ background: 'var(--panel-raised)', border: '1px solid var(--signal)' }}
                    >
                      <div className="text-[11px] text-[var(--signal)] mb-1">Engine recommends</div>
                      <div className="font-mono-data text-base">{selected.analysis.bestMoveFormatted}</div>
                      <div className="text-[var(--dim)] text-xs mt-1">
                        search value: {fmtScore(selected.analysis.bestNormalized)}
                      </div>
                    </div>
                  </div>
                  {!selected.analysis.wasOptimal && (
                    <div className="mt-3 text-sm text-[var(--dim)]">
                      This move gave up approximately{' '}
                      <span className="text-red-400 font-mono-data">{selected.analysis.deltaNormalized}</span>{' '}
                      evaluation points versus the engine's best line (searched to depth {selected.analysis.depth}).
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="text-xs text-[var(--dim)] px-1">Heuristic breakdown after your move:</div>
                  <TelemetryPanel
                    game={game}
                    breakdown={selected.analysis.playedBreakdown}
                    currentPlayer={game.nextPlayer(humanSide)}
                  />
                  <div className="text-xs text-[var(--dim)] px-1 mt-2">Heuristic breakdown after engine's move:</div>
                  <TelemetryPanel
                    game={game}
                    breakdown={selected.analysis.bestBreakdown}
                    currentPlayer={game.nextPlayer(humanSide)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}