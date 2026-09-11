export default function TicTacToeBoard({ board, onCellClick, disabled, winLine, sideColor }) {
  return (
    <div
      className="grid grid-cols-3 gap-1.5 p-1.5 rounded-sm"
      style={{ background: 'var(--hairline)', width: 'min(90vw, 340px)', height: 'min(90vw, 340px)' }}
    >
      {board.map((mark, i) => {
        const isWinning = winLine?.includes(i);
        return (
          <button
            key={i}
            onClick={() => !disabled && !mark && onCellClick(i)}
            disabled={disabled || mark !== null}
            className="flex items-center justify-center text-5xl font-semibold transition-colors"
            style={{
              background: isWinning ? 'rgba(245,166,35,0.18)' : 'var(--panel-raised)',
              color: mark ? sideColor[mark] : 'var(--dim)',
              cursor: disabled || mark ? 'default' : 'pointer',
            }}
          >
            <span className={mark ? 'animate-pop-in' : ''}>{mark}</span>
          </button>
        );
      })}
    </div>
  );
}