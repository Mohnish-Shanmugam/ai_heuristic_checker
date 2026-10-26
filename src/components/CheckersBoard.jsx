import { useState } from 'react';
import { isDark } from '../engine/checkers/board.js';

const FILES = 'abcdefgh';

export default function CheckersBoard({ board, legalMoves, onMove, disabled, sideColor, lastMove }) {
  // Selection is tied to the board it was made on, so it clears itself when the board changes.
  const [selection, setSelection] = useState({ board: null, square: null });
  const selected = selection.board === board ? selection.square : null;
  const setSelected = (square) => setSelection({ board, square });

  const movesFromSelected = selected
    ? legalMoves.filter((m) => m.from.row === selected.row && m.from.col === selected.col)
    : [];

  const selectableFromSquares = new Set(legalMoves.map((m) => `${m.from.row},${m.from.col}`));
  const destinationSquares = new Set(movesFromSelected.map((m) => `${m.to.row},${m.to.col}`));
  const captureSquares = new Set(movesFromSelected.flatMap((m) => m.captures.map((c) => `${c.row},${c.col}`)));

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
    <div className="rounded-xl p-2" style={{ background: 'var(--hairline)', boxShadow: 'var(--shadow)' }}>
      <div
        className="grid grid-cols-8 overflow-hidden rounded-lg"
        style={{ width: 'min(88vw, 440px)', height: 'min(88vw, 440px)' }}
        role="grid"
        aria-label="Checkers board"
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
          const isCaptureTarget = captureSquares.has(key);
          const label = `${FILES[col]}${8 - row}`;

          let bg = dark ? '#2b3242' : '#151a24';
          if (isSelected) bg = 'rgba(245,166,35,0.32)';
          else if (isDestination) bg = 'rgba(56,189,248,0.24)';
          else if (wasInLastMove) bg = dark ? '#3d3622' : '#1b1709';

          return (
            <button
              key={i}
              onClick={() => dark && handleSquareClick(row, col)}
              className="relative flex items-center justify-center"
              style={{ background: bg, cursor: isSelectable || isDestination ? 'pointer' : 'default' }}
              disabled={!dark}
              aria-label={`${label}${piece ? ` ${piece[0] === 'B' ? 'black' : 'white'}${piece.length === 2 ? ' king' : ''}` : ''}`}
            >
              {col === 0 && (
                <span className="font-mono-data absolute left-0.5 top-0 text-[8px]" style={{ color: 'var(--faint)' }}>{8 - row}</span>
              )}
              {row === 7 && (
                <span className="font-mono-data absolute bottom-0 right-1 text-[8px]" style={{ color: 'var(--faint)' }}>{FILES[col]}</span>
              )}
              {isDestination && !piece && (
                <span className="h-3 w-3 rounded-full" style={{ background: 'rgba(56,189,248,0.85)', boxShadow: '0 0 10px rgba(56,189,248,0.6)' }} />
              )}
              {piece && (
                <span
                  className="animate-pop-in flex items-center justify-center rounded-full text-sm font-semibold transition-transform"
                  style={{
                    width: '74%',
                    height: '74%',
                    background:
                      piece[0] === 'B'
                        ? `radial-gradient(circle at 35% 30%, #3b475c, ${sideColor.B})`
                        : `radial-gradient(circle at 35% 30%, #ffffff, ${sideColor.W} 55%, #cbd5e1)`,
                    color: piece[0] === 'B' ? '#f5a623' : '#b45309',
                    border: isSelected ? '2px solid var(--signal)' : isSelectable ? '2px solid rgba(56,189,248,0.55)' : '2px solid rgba(0,0,0,0.3)',
                    boxShadow: isCaptureTarget ? '0 0 0 3px rgba(248,113,113,0.85)' : '0 3px 6px rgba(0,0,0,0.45)',
                    transform: isSelected ? 'scale(1.06)' : undefined,
                  }}
                >
                  {piece.length === 2 ? '♛' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
