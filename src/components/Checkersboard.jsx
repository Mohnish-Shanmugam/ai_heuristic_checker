import { useState, useEffect } from 'react';
import { isDark } from '../engine/checkers/board.js';

export default function CheckersBoard({ board, legalMoves, onMove, disabled, sideColor, lastMove }) {
  const [selected, setSelected] = useState(null); // {row, col} of the piece currently selected

  useEffect(() => {
    setSelected(null);
  }, [board]);

  const movesFromSelected = selected
    ? legalMoves.filter((m) => m.from.row === selected.row && m.from.col === selected.col)
    : [];

  const selectableFromSquares = new Set(legalMoves.map((m) => `${m.from.row},${m.from.col}`));
  const destinationSquares = new Set(movesFromSelected.map((m) => `${m.to.row},${m.to.col}`));

  function handleSquareClick(row, col) {
    if (disabled) return;
    const key = `${row},${col}`;
    const piece = board[row][col];

    if (destinationSquares.has(key)) {
      const move = movesFromSelected.find((m) => m.to.row === row && m.to.col === col);
      onMove(move);
      setSelected(null);
      return;
    }

    if (piece && selectableFromSquares.has(key)) {
      setSelected({ row, col });
    } else {
      setSelected(null);
    }
  }

  const lastMoveSquares = new Set(
    lastMove ? [`${lastMove.from.row},${lastMove.from.col}`, `${lastMove.to.row},${lastMove.to.col}`] : []
  );

  return (
    <div
      className="grid grid-cols-8 rounded-sm overflow-hidden border"
      style={{ borderColor: 'var(--hairline)', width: 'min(92vw, 420px)', height: 'min(92vw, 420px)' }}
    >
      {Array.from({ length: 64 }, (_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const dark = isDark(row, col);
        const piece = board[row][col];
        const key = `${row},${col}`;
        const isSelected = selected && selected.row === row && selected.col === col;
        const isDestination = destinationSquares.has(key);
        const isSelectable = dark && piece && selectableFromSquares.has(key) && !disabled;
        const wasInLastMove = lastMoveSquares.has(key);

        let bg = dark ? '#2b2f3a' : '#12141a';
        if (isSelected) bg = 'rgba(245,166,35,0.30)';
        else if (isDestination) bg = 'rgba(56,189,248,0.22)';
        else if (wasInLastMove) bg = dark ? '#3a3320' : '#161208';

        return (
          <button
            key={i}
            onClick={() => dark && handleSquareClick(row, col)}
            className="relative flex items-center justify-center"
            style={{
              background: bg,
              cursor: isSelectable || isDestination ? 'pointer' : 'default',
            }}
            disabled={!dark}
          >
            {isDestination && !piece && (
              <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(56,189,248,0.75)' }} />
            )}
            {piece && (
              <span
                className="flex items-center justify-center rounded-full font-mono-data text-xs font-semibold animate-pop-in"
                style={{
                  width: '72%',
                  height: '72%',
                  background: piece[0] === 'B' ? sideColor.B : sideColor.W,
                  color: piece[0] === 'B' ? '#e8ebf1' : '#0a0d12',
                  border: isSelected ? '2px solid var(--signal)' : '2px solid rgba(0,0,0,0.25)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                }}
              >
                {piece.length === 2 ? '♛' : ''}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}