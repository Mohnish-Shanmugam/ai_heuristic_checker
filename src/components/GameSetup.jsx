import { useState } from 'react';

export default function GameSetup({ game, onBack, onStart }) {
  const [side, setSide] = useState(game.sides.first);
  const [depth, setDepth] = useState(game.defaultDepth);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16" style={{ background: 'var(--void)' }}>
      <div className="max-w-md w-full">
        <button onClick={onBack} className="text-sm text-[var(--dim)] hover:text-[var(--ink)] mb-6">
          ← back
        </button>
        <h1 className="text-2xl font-semibold mb-1">{game.name}</h1>
        <p className="text-sm text-[var(--dim)] mb-8">{game.tagline}</p>

        <div className="mb-7">
          <div className="text-sm font-medium mb-3">Play as</div>
          <div className="grid grid-cols-2 gap-2">
            {[game.sides.first, game.sides.second].map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className="rounded-sm border px-4 py-3 text-sm transition-colors"
                style={{
                  borderColor: side === s ? game.sideColor[s] : 'var(--hairline)',
                  background: side === s ? 'var(--panel-raised)' : 'var(--panel)',
                  color: 'var(--ink)',
                }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                  style={{ background: game.sideColor[s] }}
                />
                {game.sideLabel[s]}
                {s === game.sides.first && <span className="text-[var(--dim)]"> (moves first)</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-9">
          <div className="text-sm font-medium mb-3">Bot difficulty</div>
          <div className="flex flex-col gap-2">
            {game.depthOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDepth(opt.value)}
                className="rounded-sm border px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between"
                style={{
                  borderColor: depth === opt.value ? 'var(--signal)' : 'var(--hairline)',
                  background: depth === opt.value ? 'var(--panel-raised)' : 'var(--panel)',
                }}
              >
                <span>{opt.label}</span>
                <span className="font-mono-data text-[var(--dim)] text-xs">d={opt.value}</span>
              </button>
            ))}
          </div>
          {depth >= 6 && (
            <p className="text-xs text-[var(--dim)] mt-2">
              Higher depths search more of the game tree and may take a few seconds per move.
            </p>
          )}
        </div>

        <button
          onClick={() => onStart({ humanSide: side, depth })}
          className="w-full rounded-sm py-3 font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--signal)', color: '#ffffff' }}
        >
          Start match
        </button>
      </div>
    </div>
  );
}