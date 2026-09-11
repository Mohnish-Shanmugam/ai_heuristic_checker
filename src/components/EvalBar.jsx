// Vertical evaluation bar: fills from the middle, first-side (top) positive
// and second-side (bottom) negative, mirroring chess-engine eval bars.
export default function EvalBar({ score, game, terminal }) {
  const clamped = Math.max(-100, Math.min(100, score));
  // fillFromTop = percentage of the bar (0-100) filled with the "first side" color, from the top.
  const fillFromTop = 50 + clamped / 2;

  const firstKey = game.sides.first;
  const secondKey = game.sides.second;

  let label = `${clamped > 0 ? '+' : ''}${clamped}`;
  if (terminal === firstKey) label = `${game.sideLabel[firstKey]} wins`;
  else if (terminal === secondKey) label = `${game.sideLabel[secondKey]} wins`;
  else if (terminal === 'draw') label = 'Draw';

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="text-[11px] tracking-wide text-[var(--dim)] font-mono-data">EVAL</div>
      <div
        className="relative w-9 h-64 rounded-sm overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', background: 'var(--panel-raised)' }}
      >
        <div
          className="absolute top-0 left-0 w-full transition-all duration-500 ease-out"
          style={{ height: `${fillFromTop}%`, background: game.sideColor[firstKey] }}
        />
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-500 ease-out"
          style={{ height: `${100 - fillFromTop}%`, background: game.sideColor[secondKey] }}
        />
        <div
          className="absolute left-0 w-full border-t border-dashed"
          style={{ top: '50%', borderColor: 'rgba(232,235,241,0.35)' }}
        />
      </div>
      <div
        className="font-mono-data text-sm px-2 py-0.5 rounded-sm"
        style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', color: 'var(--ink)' }}
      >
        {label}
      </div>
    </div>
  );
}