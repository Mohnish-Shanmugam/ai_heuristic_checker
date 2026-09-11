const CARD_ART = {
  tictactoe: (
    <svg viewBox="0 0 120 120" className="w-full h-28">
      <g stroke="var(--hairline)" strokeWidth="2" fill="none">
        <line x1="40" y1="8" x2="40" y2="112" />
        <line x1="80" y1="8" x2="80" y2="112" />
        <line x1="8" y1="40" x2="112" y2="40" />
        <line x1="8" y1="80" x2="112" y2="80" />
      </g>
      <g stroke="#38bdf8" strokeWidth="4" strokeLinecap="round">
        <line x1="16" y1="16" x2="32" y2="32" />
        <line x1="32" y1="16" x2="16" y2="32" />
      </g>
      <circle cx="60" cy="60" r="9" fill="none" stroke="#fb7185" strokeWidth="4" />
      <g stroke="#38bdf8" strokeWidth="4" strokeLinecap="round">
        <line x1="88" y1="88" x2="104" y2="104" />
        <line x1="104" y1="88" x2="88" y2="104" />
      </g>
    </svg>
  ),
  checkers: (
    <svg viewBox="0 0 120 120" className="w-full h-28">
      {Array.from({ length: 16 }, (_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const dark = (row + col) % 2 === 1;
        return (
          <rect
            key={i}
            x={col * 30}
            y={row * 30}
            width="30"
            height="30"
            fill={dark ? '#2b2f3a' : '#12141a'}
          />
        );
      })}
      <circle cx="15" cy="15" r="9" fill="#f8fafc" />
      <circle cx="75" cy="15" r="9" fill="#f8fafc" />
      <circle cx="45" cy="45" r="9" fill="#1f2937" stroke="#f5a623" strokeWidth="2" />
      <circle cx="105" cy="75" r="9" fill="#1f2937" />
      <circle cx="15" cy="105" r="9" fill="#f8fafc" />
    </svg>
  ),
};

export default function GameSelector({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16" style={{ background: 'var(--void)' }}>
      <div className="max-w-3xl w-full">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">Heuristic Engine</h1>
          <span className="text-[11px] font-mono-data text-[var(--dim)]">v1.0 · alpha-beta minimax</span>
        </div>
        <p className="text-[var(--dim)] mb-10 max-w-lg">
          A small research lab for non-traditional position evaluation. Pick a
          game to watch fork pressure, territorial control, and structural
          vulnerability drive the bot's decisions in real time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['tictactoe', 'checkers'].map((id) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="text-left rounded-sm border p-5 transition-colors hover:border-[var(--signal)] group"
              style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
            >
              {CARD_ART[id]}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-medium">
                  {id === 'tictactoe' ? 'Tic-Tac-Toe' : 'Checkers'}
                </span>
                <span className="text-[var(--signal)] opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </div>
              <p className="text-sm text-[var(--dim)] mt-1">
                {id === 'tictactoe'
                  ? 'Fork-pressure & influence-density evaluation'
                  : 'Voronoi territory & structural-rigidity evaluation'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}