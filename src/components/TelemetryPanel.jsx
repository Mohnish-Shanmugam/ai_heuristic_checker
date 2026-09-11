function fmt(n) {
  if (n === undefined || n === null) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function TelemetryPanel({ game, breakdown, currentPlayer }) {
  if (!breakdown) {
    return (
      <div
        className="rounded-sm border p-4 text-sm text-[var(--dim)]"
        style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}
      >
        Game over — no further telemetry.
      </div>
    );
  }

  const firstKey = game.sides.first;
  const secondKey = game.sides.second;

  return (
    <div className="rounded-sm border" style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}>
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--hairline)' }}
      >
        <span className="text-sm font-medium">Heuristic telemetry</span>
        <span className="text-[11px] font-mono-data text-[var(--dim)]">
          to move: <span style={{ color: game.sideColor[currentPlayer] }}>{game.sideLabel[currentPlayer]}</span>
        </span>
      </div>
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--dim)]">
              <th className="font-normal pb-2">Term</th>
              <th className="font-normal pb-2 text-right font-mono-data" style={{ color: game.sideColor[firstKey] }}>
                {game.sideLabel[firstKey]}
              </th>
              <th className="font-normal pb-2 text-right font-mono-data" style={{ color: game.sideColor[secondKey] }}>
                {game.sideLabel[secondKey]}
              </th>
            </tr>
          </thead>
          <tbody>
            {game.telemetryFields.map((field) => (
              <tr key={field.key} className="border-t" style={{ borderColor: 'var(--hairline)' }} title={field.hint}>
                <td className="py-2 pr-2 text-[var(--ink)]">
                  {field.label}
                  <div className="text-[10px] text-[var(--dim)] font-normal leading-tight mt-0.5 max-w-[220px]">
                    {field.hint}
                  </div>
                </td>
                <td className="py-2 text-right font-mono-data">{fmt(breakdown[firstKey]?.[field.key])}</td>
                <td className="py-2 text-right font-mono-data">{fmt(breakdown[secondKey]?.[field.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}