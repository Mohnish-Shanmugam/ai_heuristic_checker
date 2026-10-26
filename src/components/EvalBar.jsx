// Vertical evaluation bar: fills from the middle, first-side (top) positive
// and second-side (bottom) negative, mirroring chess-engine eval bars.
export default function EvalBar({ score, game, terminal, height = 320 }) {
  const clamped = Math.max(-100, Math.min(100, score));
  // fillFromTop = percentage of the bar (0-100) filled with the "first side" color, from the top.
  const fillFromTop = 50 + clamped / 2;

  const firstKey = game.sides.first;
  const secondKey = game.sides.second;

  let label = `${clamped > 0 ? '+' : ''}${clamped}`;
  if (terminal === firstKey) label = `${game.sideLabel[firstKey]} wins`;
  else if (terminal === secondKey) label = `${game.sideLabel[secondKey]} wins`;
  else if (terminal === 'draw') label = 'Draw';

  const leader = clamped > 0 ? firstKey : clamped < 0 ? secondKey : null;

  return (
    <div
      className="flex select-none flex-col items-center gap-2"
      role="meter"
      aria-label="Position evaluation"
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={clamped}
      title={`Heuristic evaluation (normalized). Positive favors ${game.sideLabel[firstKey]}, negative favors ${game.sideLabel[secondKey]}.`}
    >
      <div className="eyebrow text-[9px]">Eval</div>
      <div
        className="relative w-8 overflow-hidden rounded-full border"
        style={{ height, borderColor: 'var(--hairline)', background: 'var(--panel-raised)' }}
      >
        <div
          className="absolute left-0 top-0 w-full transition-all duration-500 ease-out"
          style={{ height: `${fillFromTop}%`, background: game.sideColor[firstKey] }}
        />
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-500 ease-out"
          style={{ height: `${100 - fillFromTop}%`, background: game.sideColor[secondKey] }}
        />
        <div className="absolute left-0 w-full border-t border-dashed" style={{ top: '50%', borderColor: 'rgba(232,235,241,0.45)' }} />
      </div>
      <div
        className="font-mono-data rounded-md px-2 py-0.5 text-xs font-semibold"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--hairline)',
          color: leader && !terminal ? 'var(--ink)' : 'var(--signal)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
