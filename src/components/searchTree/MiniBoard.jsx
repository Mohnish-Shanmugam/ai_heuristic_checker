// Read-only, compact rendering of a recorded search state.
export default function MiniBoard({ game, state, move, size = 168 }) {
  if (!state) return null;

  if (game.id === 'tictactoe') {
    return (
      <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg p-1" style={{ width: size * 0.75, height: size * 0.75, background: 'var(--hairline)' }}>
        {state.map((mark, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-md text-xl font-extrabold"
            style={{
              background: 'var(--panel-raised)',
              color: mark ? game.sideColor[mark] : 'transparent',
              boxShadow: move === i ? 'inset 0 0 0 2px var(--signal)' : undefined,
            }}
          >
            {mark ?? '·'}
          </div>
        ))}
      </div>
    );
  }

  const from = move?.from ? `${move.from.row},${move.from.col}` : null;
  const to = move?.to ? `${move.to.row},${move.to.col}` : null;
  const caps = new Set((move?.captures ?? []).map((c) => `${c.row},${c.col}`));
  return (
    <div className="grid shrink-0 grid-cols-8 overflow-hidden rounded-md" style={{ width: size, height: size, border: '1px solid var(--hairline)' }}>
      {state.flatMap((r, row) =>
        r.map((piece, col) => {
          const key = `${row},${col}`;
          const dark = (row + col) % 2 === 1;
          let bg = dark ? '#2b3242' : '#151a24';
          if (key === from) bg = 'rgba(245,166,35,0.25)';
          if (key === to) bg = 'rgba(245,166,35,0.45)';
          return (
            <div key={key} className="relative flex items-center justify-center" style={{ background: bg }}>
              {caps.has(key) && <span className="absolute inset-0.5 rounded-full border border-dashed" style={{ borderColor: 'var(--bad)' }} />}
              {piece && (
                <span
                  className="flex items-center justify-center rounded-full text-[8px] leading-none"
                  style={{
                    width: '72%',
                    height: '72%',
                    background: piece[0] === 'B' ? game.sideColor.B : game.sideColor.W,
                    color: piece[0] === 'B' ? '#f5a623' : '#b45309',
                    border: '1px solid rgba(0,0,0,0.4)',
                    boxShadow: piece[0] === 'B' ? '0 0 0 1px #64748b' : undefined,
                  }}
                >
                  {piece.length === 2 ? '♛' : ''}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
