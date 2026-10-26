import { ArrowRight, GitBranch, Scissors, Activity } from 'lucide-react';
import { GAMES } from '../engine/GameRegistry.js';
import { AppHeader } from './ui.jsx';

const CARD_ART = {
  tictactoe: (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <g stroke="#34405a" strokeWidth="3" strokeLinecap="round" fill="none">
        <line x1="42" y1="12" x2="42" y2="108" />
        <line x1="78" y1="12" x2="78" y2="108" />
        <line x1="12" y1="42" x2="108" y2="42" />
        <line x1="12" y1="78" x2="108" y2="78" />
      </g>
      <g stroke="#38bdf8" strokeWidth="5" strokeLinecap="round">
        <line x1="18" y1="18" x2="34" y2="34" />
        <line x1="34" y1="18" x2="18" y2="34" />
        <line x1="86" y1="86" x2="102" y2="102" />
        <line x1="102" y1="86" x2="86" y2="102" />
      </g>
      <circle cx="60" cy="60" r="10" fill="none" stroke="#fb7185" strokeWidth="5" />
      <circle cx="94" cy="26" r="10" fill="none" stroke="#fb7185" strokeWidth="5" />
    </svg>
  ),
  checkers: (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const dark = (row + col) % 2 === 1;
        return <rect key={i} x={col * 30} y={row * 30} width="30" height="30" fill={dark ? '#2b3242' : '#151a24'} />;
      })}
      <circle cx="45" cy="15" r="10" fill="#f8fafc" />
      <circle cx="105" cy="15" r="10" fill="#f8fafc" />
      <circle cx="45" cy="45" r="10" fill="#1f2937" stroke="#f5a623" strokeWidth="2.5" />
      <circle cx="105" cy="75" r="10" fill="#1f2937" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="15" cy="105" r="10" fill="#f8fafc" />
      <text x="15" y="109.5" textAnchor="middle" fontSize="12" fill="#0b0e14">♛</text>
    </svg>
  ),
};

const CARD_FEATURES = {
  tictactoe: ['Fork pressure', 'Influence density', 'Opponent denial'],
  checkers: ['Voronoi territory', 'Phalanx support', 'Multi-jump exposure'],
};

export default function GameSelector({ onSelect }) {
  return (
    <div className="min-h-screen">
      <AppHeader
        onHome={() => {}}
        right={<span className="chip font-mono-data">minimax · alpha-beta</span>}
      />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="animate-fade-up">
          <div className="eyebrow mb-3">Algorithm visualization lab</div>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Watch a heuristic engine{' '}
            <span style={{ color: 'var(--signal)' }}>think</span>, one search tree at a time.
          </h1>
          <p className="mt-4 max-w-2xl text-base" style={{ color: 'var(--dim)' }}>
            Play against an alpha-beta minimax bot driven by non-traditional evaluation functions. Every move the bot
            makes is recorded as it searches, so you can inspect the nodes it really visited, its leaf scores and
            the branches it pruned.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip"><GitBranch size={12} /> Recorded search trees</span>
            <span className="chip"><Scissors size={12} /> Real alpha-beta cutoffs</span>
            <span className="chip"><Activity size={12} /> Live heuristic telemetry</span>
          </div>
        </div>

        <h2 className="eyebrow mb-4 mt-12">Choose a game</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {['tictactoe', 'checkers'].map((id, i) => {
            const game = GAMES[id];
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="option-card group animate-fade-up flex flex-col overflow-hidden"
                style={{ animationDelay: `${80 + i * 70}ms` }}
              >
                <div
                  className="grid h-44 place-items-center border-b"
                  style={{ borderColor: 'var(--hairline)', background: 'linear-gradient(180deg,#141a26,#0f131c)' }}
                >
                  <div className="h-32 w-32 transition-transform duration-300 group-hover:scale-105">{CARD_ART[id]}</div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{game.name}</span>
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full transition-all group-hover:translate-x-0.5"
                      style={{ background: 'var(--signal-soft)', color: 'var(--signal)' }}
                    >
                      <ArrowRight size={16} />
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--dim)' }}>{game.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {CARD_FEATURES[id].map((f) => (
                      <span key={f} className="chip">{f}</span>
                    ))}
                  </div>
                  <div className="font-mono-data mt-4 text-[11px]" style={{ color: 'var(--faint)' }}>
                    search depth {game.depthOptions[0].value}–{game.depthOptions[game.depthOptions.length - 1].value}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
