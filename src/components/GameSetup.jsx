import { useState } from 'react';
import { ArrowLeft, Play, Bot, User, Info } from 'lucide-react';
import { AppHeader, SideDot } from './ui.jsx';

export default function GameSetup({ game, initialConfig, onBack, onHome, onStart }) {
  const [side, setSide] = useState(initialConfig?.humanSide ?? game.sides.first);
  // Fall back to a listed option: the registry's defaultDepth is not always one of depthOptions.
  const [depth, setDepth] = useState(() => {
    const wanted = initialConfig?.depth ?? game.defaultDepth;
    return game.depthOptions.some((o) => o.value === wanted) ? wanted : game.depthOptions[1].value;
  });

  const botSide = side === game.sides.first ? game.sides.second : game.sides.first;
  const maxDepth = game.depthOptions[game.depthOptions.length - 1].value;

  return (
    <div className="min-h-screen">
      <AppHeader onHome={onHome} crumbs={[game.name, 'Setup']} />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <button onClick={onBack} className="btn btn-ghost btn-sm -ml-2 mb-6">
          <ArrowLeft size={15} /> All games
        </button>
        <div className="animate-fade-up">
          <div className="eyebrow mb-2">Match setup</div>
          <h1 className="text-3xl font-extrabold tracking-tight">{game.name}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--dim)' }}>{game.tagline}</p>
        </div>

        <section className="mt-9">
          <h2 className="mb-3 text-sm font-semibold">Play as</h2>
          <div role="radiogroup" aria-label="Your side" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[game.sides.first, game.sides.second].map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className="option-card flex items-center gap-3 px-4 py-3.5"
              >
                <SideDot color={game.sideColor[s]} size={16} />
                <span className="flex flex-col">
                  <span className="font-semibold">{game.sideLabel[s]}</span>
                  <span className="text-xs" style={{ color: 'var(--dim)' }}>
                    {s === game.sides.first ? 'Moves first' : 'Moves second'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold">Bot difficulty <span style={{ color: 'var(--dim)' }}>(search depth)</span></h2>
          <div role="radiogroup" aria-label="Bot difficulty" className="flex flex-col gap-2">
            {game.depthOptions.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={depth === opt.value}
                onClick={() => setDepth(opt.value)}
                className="option-card flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="flex-1 font-medium">{opt.label.replace(/\s*\(depth \d+\)/, '')}</span>
                <span className="flex h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--hairline)' }}>
                  <span
                    className="h-full rounded-full"
                    style={{ width: `${(opt.value / maxDepth) * 100}%`, background: depth === opt.value ? 'var(--signal)' : 'var(--faint)' }}
                  />
                </span>
                <span className="font-mono-data w-10 text-right text-xs" style={{ color: 'var(--dim)' }}>d={opt.value}</span>
              </button>
            ))}
          </div>
          {depth >= 6 && (
            <p className="mt-3 flex items-start gap-2 text-xs" style={{ color: 'var(--dim)' }}>
              <Info size={14} className="mt-px shrink-0" />
              Higher depths search much more of the game tree and may take a few seconds per move. Very large
              searches are recorded only partially in the search-tree view (the panel says so when it happens).
            </p>
          )}
        </section>

        <div className="card mt-9 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <User size={15} style={{ color: 'var(--dim)' }} /> You: <SideDot color={game.sideColor[side]} />
              <b>{game.sideLabel[side]}</b>
            </span>
            <span className="flex items-center gap-2">
              <Bot size={15} style={{ color: 'var(--dim)' }} /> Bot: <SideDot color={game.sideColor[botSide]} />
              <b>{game.sideLabel[botSide]}</b>
              <span className="font-mono-data text-xs" style={{ color: 'var(--dim)' }}>depth {depth}</span>
            </span>
          </div>
          <button onClick={() => onStart({ humanSide: side, depth })} className="btn btn-primary px-6 py-3">
            <Play size={16} /> Start match
          </button>
        </div>
      </main>
    </div>
  );
}
