import { Network } from 'lucide-react';

// Top navigation bar shared by every screen.
export function AppHeader({ crumbs = [], right = null, onHome }) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{ borderColor: 'var(--hairline)', background: 'rgba(11,14,20,0.82)' }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onHome}
          className="flex items-center gap-2 rounded-md pr-1 text-sm font-bold tracking-tight"
          aria-label="Heuristic Lab home"
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: 'var(--signal-soft)', color: 'var(--signal)', border: '1px solid rgba(245,166,35,0.35)' }}
          >
            <Network size={15} />
          </span>
          <span>
            HEURISTIC<span style={{ color: 'var(--signal)' }}>.LAB</span>
          </span>
        </button>
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
            {crumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-2">
                <span style={{ color: 'var(--faint)' }}>/</span>
                <span className="truncate" style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--dim)' }}>
                  {c}
                </span>
              </span>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function Card({ title, icon: Icon, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div className="card-title">
            {Icon && <Icon size={15} style={{ color: 'var(--dim)' }} />}
            {title}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, accent }) {
  return (
    <div className="min-w-0 rounded-lg px-3 py-2" style={{ background: 'var(--panel-raised)' }} title={hint}>
      <div className="truncate text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--dim)' }}>
        {label}
      </div>
      <div className="font-mono-data truncate text-sm font-semibold" style={{ color: accent ?? 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}

export function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function SideDot({ color, size = 10 }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full align-middle"
      style={{ width: size, height: size, background: color, boxShadow: '0 0 0 1px rgba(255,255,255,0.25)' }}
    />
  );
}
