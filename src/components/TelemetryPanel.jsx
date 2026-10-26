import { Activity, Info } from 'lucide-react';
import { Card, SideDot } from './ui.jsx';

function fmt(n) {
  if (n === undefined || n === null) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function TelemetryPanel({ game, breakdown, currentPlayer, title = 'Heuristic telemetry', compact = false }) {
  if (!breakdown) {
    return (
      <Card title={title} icon={Activity}>
        <div className="flex items-start gap-2 p-4 text-sm" style={{ color: 'var(--dim)' }}>
          <Info size={15} className="mt-0.5 shrink-0" />
          Terminal position — the evaluator returns a fixed win/draw score here, so there is no term breakdown.
        </div>
      </Card>
    );
  }

  const firstKey = game.sides.first;
  const secondKey = game.sides.second;

  return (
    <Card
      title={title}
      icon={Activity}
      actions={
        currentPlayer && (
          <span className="chip">
            to move <SideDot color={game.sideColor[currentPlayer]} size={8} /> {game.sideLabel[currentPlayer]}
          </span>
        )
      }
    >
      <div className="px-4 pb-3 pt-3">
        <table className="data-table">
          <thead>
            <tr>
              <th>Term</th>
              <th className="text-right" style={{ textAlign: 'right' }}>
                <span className="inline-flex items-center gap-1.5"><SideDot color={game.sideColor[firstKey]} size={8} />{game.sideLabel[firstKey]}</span>
              </th>
              <th className="text-right" style={{ textAlign: 'right' }}>
                <span className="inline-flex items-center gap-1.5"><SideDot color={game.sideColor[secondKey]} size={8} />{game.sideLabel[secondKey]}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {game.telemetryFields.map((field) => {
              const a = breakdown[firstKey]?.[field.key];
              const b = breakdown[secondKey]?.[field.key];
              const subtracted = /subtracted/i.test(field.label);
              const aLeads = typeof a === 'number' && typeof b === 'number' && (subtracted ? a < b : a > b);
              const bLeads = typeof a === 'number' && typeof b === 'number' && (subtracted ? b < a : b > a);
              return (
                <tr key={field.key} title={field.hint}>
                  <td className="pr-2">
                    <div className="text-[13px]">{field.label}</div>
                    {!compact && (
                      <div className="mt-0.5 max-w-[240px] text-[10.5px] leading-snug" style={{ color: 'var(--faint)' }}>
                        {field.hint}
                      </div>
                    )}
                  </td>
                  <td className="font-mono-data text-right" style={{ color: aLeads ? 'var(--ink)' : 'var(--dim)', fontWeight: aLeads ? 600 : 400 }}>
                    {fmt(a)}
                  </td>
                  <td className="font-mono-data text-right" style={{ color: bLeads ? 'var(--ink)' : 'var(--dim)', fontWeight: bLeads ? 600 : 400 }}>
                    {fmt(b)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
