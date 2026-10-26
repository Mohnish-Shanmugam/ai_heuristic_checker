const CELL_LABEL = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'];

export default function TicTacToeBoard({ board, onCellClick, disabled, winLine, sideColor, lastMove, ghostMark }) {
  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-2xl p-2"
      style={{
        width: 'min(86vw, 360px)',
        height: 'min(86vw, 360px)',
        background: 'var(--hairline)',
        boxShadow: 'var(--shadow)',
      }}
      role="grid"
      aria-label="Tic-tac-toe board"
    >
      {board.map((mark, i) => {
        const isWinning = winLine?.includes(i);
        const isLast = lastMove === i;
        const playable = !disabled && !mark;
        return (
          <button
            key={i}
            onClick={() => playable && onCellClick(i)}
            disabled={!playable}
            aria-label={`${CELL_LABEL[i]}${mark ? `: ${mark}` : ': empty'}`}
            className="group relative flex items-center justify-center rounded-xl text-6xl font-extrabold transition-colors"
            style={{
              background: isWinning ? 'rgba(245,166,35,0.2)' : 'var(--panel-raised)',
              boxShadow: isLast ? 'inset 0 0 0 2px rgba(245,166,35,0.55)' : 'inset 0 0 0 1px rgba(255,255,255,0.03)',
              color: mark ? sideColor[mark] : 'var(--dim)',
              cursor: playable ? 'pointer' : 'default',
            }}
          >
            {mark && <span className="animate-pop-in">{mark}</span>}
            {!mark && playable && ghostMark && (
              <span className="opacity-0 transition-opacity group-hover:opacity-25" style={{ color: sideColor[ghostMark] }}>
                {ghostMark}
              </span>
            )}
            <span className="font-mono-data absolute bottom-1.5 right-2 text-[9px] font-medium" style={{ color: 'var(--faint)' }}>
              {CELL_LABEL[i]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
