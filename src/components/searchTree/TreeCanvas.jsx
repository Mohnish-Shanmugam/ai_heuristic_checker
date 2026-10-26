import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { NODE_W, NODE_H, formatValue } from './treeLayout.js';

const MIN_K = 0.08;
const MAX_K = 2.5;
const PAD = 40;

const EDGE_STYLE = {
  chosen: { stroke: 'var(--signal)', width: 2.6, dash: undefined, opacity: 1 },
  best: { stroke: '#7c8aa5', width: 1.6, dash: undefined, opacity: 0.9 },
  normal: { stroke: '#3a4560', width: 1.2, dash: undefined, opacity: 0.85 },
  pruned: { stroke: 'var(--violet)', width: 1.1, dash: '4 4', opacity: 0.55 },
  unrecorded: { stroke: 'var(--faint)', width: 1.1, dash: '1 4', opacity: 0.8 },
};

function nodeLabel(game, node) {
  if (node.kind === 'root') return 'ROOT';
  return game.formatMove(node.move);
}

function leafTag(node) {
  if (node.kind !== 'leaf') return null;
  if (node.leafReason === 'no-moves') return 'NO MOVES';
  if (node.leafReason === 'terminal' || node.evalTerminal) return 'TERMINAL';
  return 'LEAF';
}

// Pan/zoom SVG rendering of a laid-out tree. Interaction only changes the
// view transform and the selected key.
const TreeCanvas = forwardRef(function TreeCanvas({ game, layout, selectedKey, onSelect, onToggle }, ref) {
  const wrapRef = useRef(null);
  const [view, setView] = useState({ x: PAD, y: PAD, k: 1 });
  const [panning, setPanning] = useState(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const needsFitRef = useRef(true);
  const dragRef = useRef(null);
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // `minK` > 0 keeps labels readable: if the whole tree would need a smaller
  // scale, show it at `minK` anchored on the root instead.
  function fitView(minK = 0) {
    const { w, h } = sizeRef.current;
    const L = layoutRef.current;
    if (!w || !h) return;
    const k = Math.max(MIN_K, Math.min(1.1, (w - PAD * 2) / Math.max(L.width, 1), (h - PAD * 2) / Math.max(L.height, 1)));
    if (k < minK) {
      const root = L.items[0];
      setView({ k: minK, x: PAD, y: h / 2 - ((root?.y ?? 0) + NODE_H / 2) * minK });
      return;
    }
    setView({ k, x: (w - L.width * k) / 2, y: (h - L.height * k) / 2 });
  }

  function zoomAt(factor, cx, cy) {
    setView((v) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
      const ratio = k / v.k;
      return { k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
    });
  }

  function centerOn(key) {
    const item = layoutRef.current.items.find((i) => i.key === key);
    const { w, h } = sizeRef.current;
    if (!item || !w) return;
    setView((v) => {
      const k = Math.max(v.k, 0.7);
      return { k, x: w / 2 - (item.x + NODE_W / 2) * k, y: h / 2 - (item.y + NODE_H / 2) * k };
    });
  }

  useImperativeHandle(ref, () => ({
    fit: () => fitView(),
    fitReadable: () => fitView(0.6),
    zoomIn: () => zoomAt(1.25, sizeRef.current.w / 2, sizeRef.current.h / 2),
    zoomOut: () => zoomAt(0.8, sizeRef.current.w / 2, sizeRef.current.h / 2),
    centerOn,
  }));

  // Track container size; fit once the first real size is known.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      sizeRef.current = { w: width, h: height };
      if (needsFitRef.current && width > 0 && height > 0) {
        needsFitRef.current = false;
        fitView(0.6);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, moved: false, start: view };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      if (!d.moved) setPanning(true);
      d.moved = true;
      setView({ ...d.start, x: d.start.x + dx, y: d.start.y + dy });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setPanning(false);
      // Leave `moved` readable for the click that follows this pointerup.
      setTimeout(() => {
        dragRef.current = null;
      }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const wasDrag = () => dragRef.current?.moved;

  return (
    <div ref={wrapRef} className={`tree-canvas relative h-full w-full overflow-hidden ${panning ? 'panning' : ''}`} onPointerDown={onPointerDown}>
      <svg className="absolute inset-0 h-full w-full select-none" role="tree" aria-label="Recorded search tree">
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {layout.edges.map((e) => {
            const s = EDGE_STYLE[e.kind];
            const x1 = e.from.x + NODE_W;
            const y1 = e.from.y + NODE_H / 2;
            const x2 = e.to.x;
            const y2 = e.to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`${e.from.key}-${e.to.key}`}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                opacity={s.opacity}
              />
            );
          })}
          {layout.items.map((item) => (
            <TreeItem
              key={item.key}
              game={game}
              item={item}
              selected={item.key === selectedKey}
              onClick={() => !wasDrag() && onSelect(item.key)}
              onToggle={() => !wasDrag() && item.type === 'node' && onToggle(item.node.id)}
            />
          ))}
        </g>
      </svg>
      <div className="font-mono-data pointer-events-none absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(11,14,20,0.8)', color: 'var(--dim)' }}>
        {Math.round(view.k * 100)}% · {layout.items.length} visible
      </div>
    </div>
  );
});

export default TreeCanvas;

function TreeItem({ game, item, selected, onClick, onToggle }) {
  const { x, y } = item;
  const selRing = selected ? (
    <rect x={-4} y={-4} width={NODE_W + 8} height={NODE_H + 8} rx={11} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.9} />
  ) : null;

  if (item.type === 'pruned') {
    return (
      <g className="tree-node" transform={`translate(${x},${y})`} onClick={onClick} role="treeitem" aria-label={`Pruned move ${game.formatMove(item.move)}`}>
        {selRing}
        <rect className="tree-node-body" width={NODE_W} height={NODE_H} rx={8} fill="rgba(167,139,250,0.05)" stroke="var(--violet)" strokeOpacity={0.55} strokeDasharray="4 3" />
        <text x={12} y={18} fontSize={12} fontFamily="JetBrains Mono" fill="#9d93c9">{game.formatMove(item.move)}</text>
        <text x={12} y={34} fontSize={10} fontFamily="JetBrains Mono" fill="#7d74a8">pruned · not searched</text>
      </g>
    );
  }

  if (item.type === 'unrecorded') {
    return (
      <g className="tree-node" transform={`translate(${x},${y})`} onClick={onClick} role="treeitem">
        {selRing}
        <rect className="tree-node-body" width={NODE_W} height={NODE_H} rx={8} fill="rgba(93,103,124,0.08)" stroke="var(--faint)" strokeDasharray="1 3" />
        <text x={12} y={18} fontSize={11} fontFamily="JetBrains Mono" fill="var(--dim)">+{item.count} searched</text>
        <text x={12} y={34} fontSize={10} fontFamily="JetBrains Mono" fill="var(--faint)">not recorded (cap)</text>
      </g>
    );
  }

  const n = item.node;
  const isRoot = n.kind === 'root';
  const roleColor = isRoot ? 'var(--signal)' : n.maximizing ? 'var(--sky)' : 'var(--rose)';
  const fill = n.onChosenPath ? 'rgba(245,166,35,0.13)' : 'var(--panel-raised)';
  const stroke = n.onChosenPath ? 'rgba(245,166,35,0.75)' : '#2f3a52';
  const tag = leafTag(n);
  const expandable = item.expandable;
  const hiddenCount = item.slots;

  return (
    <g
      className="tree-node"
      transform={`translate(${x},${y})`}
      onClick={onClick}
      onDoubleClick={onToggle}
      role="treeitem"
      aria-selected={selected}
      aria-expanded={expandable ? item.open : undefined}
      aria-label={`${nodeLabel(game, n)} value ${formatValue(n.value)}`}
    >
      {selRing}
      <rect className="tree-node-body" width={NODE_W} height={NODE_H} rx={8} fill={fill} stroke={stroke} strokeWidth={n.onChosenPath ? 1.5 : 1} />
      <rect x={0} y={6} width={3.5} height={NODE_H - 12} rx={1.75} fill={roleColor} />
      <text x={12} y={18} fontSize={12} fontWeight={600} fontFamily="JetBrains Mono" fill="var(--ink)">
        {isRoot ? 'ROOT' : `${n.maximizing ? '▲' : '▼'} ${nodeLabel(game, n)}`}
      </text>
      <text x={12} y={35} fontSize={10.5} fontFamily="JetBrains Mono" fill={n.onChosenPath ? 'var(--signal)' : 'var(--dim)'}>
        v {formatValue(n.value)}
      </text>
      <text x={NODE_W - 8} y={14} fontSize={8.5} textAnchor="end" fontFamily="JetBrains Mono" fill="var(--faint)">#{n.id}</text>
      {tag && (
        <text x={NODE_W - 8} y={36} fontSize={8} fontWeight={700} textAnchor="end" fontFamily="JetBrains Mono" fill={tag === 'LEAF' ? '#6b7891' : 'var(--good)'} letterSpacing="0.06em">
          {tag}
        </text>
      )}
      {n.cutoff && (
        <g transform={`translate(${NODE_W - 22},-8)`}>
          <title>Alpha-beta cutoff happened here</title>
          <rect width={20} height={16} rx={8} fill="#2a2347" stroke="var(--violet)" strokeWidth={1} />
          <text x={10} y={12} fontSize={10} textAnchor="middle" fill="var(--violet)">✂</text>
        </g>
      )}
      {expandable && (
        <g
          transform={`translate(${NODE_W + 2},${NODE_H / 2 - 9})`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{ cursor: 'pointer' }}
        >
          <title>{item.open ? 'Collapse branch' : 'Expand branch'}</title>
          <rect width={item.open ? 18 : 30} height={18} rx={9} fill="#0d1119" stroke={item.open ? '#3a4560' : 'var(--sky)'} />
          <text x={item.open ? 9 : 15} y={12.5} fontSize={9.5} textAnchor="middle" fontFamily="JetBrains Mono" fill={item.open ? 'var(--dim)' : 'var(--sky)'}>
            {item.open ? '−' : `+${hiddenCount}`}
          </text>
        </g>
      )}
    </g>
  );
}
