// export default function TicTacToeBoard({ board, onCellClick, disabled, winLine, sideColor }) {
//   return (
//     <div
//       className="grid grid-cols-3 gap-1.5 p-1.5 rounded-sm border-2 border-slate-400"
//       style={{ background: 'var(--hairline)', width: 'min(90vw, 340px)', height: 'min(90vw, 340px)',border: '2px solid var(--hairline)' }}
//     >
//       {board.map((mark, i) => {
//         const isWinning = winLine?.includes(i);
//         return (
//           <button
//             key={i}
//             onClick={() => !disabled && !mark && onCellClick(i)}
//             disabled={disabled || mark !== null}
//             className="flex items-center justify-center text-5xl font-semibold transition-colors"
//             style={{
//               background: isWinning ? 'rgba(245,166,35,0.18)' : 'var(--panel-raised)',
//               color: mark ? sideColor[mark] : 'var(--dim)',
//               cursor: disabled || mark ? 'default' : 'pointer',
//             }}
//           >
//             <span className={mark ? 'animate-pop-in' : ''}>{mark}</span>
//           </button>
//         );
//       })}
//     </div>
//   );
// }


export default function TicTacToeBoard({ board, onCellClick, disabled, winLine, sideColor }) {
  return (
    <div
      className="grid grid-cols-3"
      style={{ width: 'min(90vw, 340px)', height: 'min(90vw, 340px)' }}
    >
      {board.map((mark, i) => {
        const isWinning = winLine?.includes(i);
        
        // Calculate row and column index to apply borders conditionally
        const row = Math.floor(i / 3);
        const col = i % 3;

        return (
          <button
            key={i}
            onClick={() => !disabled && !mark && onCellClick(i)}
            disabled={disabled || mark !== null}
            className={`flex items-center justify-center text-5xl font-semibold transition-colors
              ${row < 2 ? 'border-b-2' : ''} 
              ${col < 2 ? 'border-r-2' : ''} 
              border-[#ffffff]`} // Matches your App.jsx layout border color
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
