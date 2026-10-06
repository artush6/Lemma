// @ts-nocheck -- function-plot ships loose types
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import { createPortal } from 'react-dom';
import { create, all } from 'mathjs';
import * as functionPlotModule from 'function-plot';
import { Eye, EyeOff, Plus, RotateCcw, Spline, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const functionPlot = (functionPlotModule as any).default?.default ?? (functionPlotModule as any).default ?? functionPlotModule;
const math = create(all, {});
export const graphColors = ['#2f6fdd', '#e0523f', '#2f9e6b', '#8b5cf6', '#d9822b', '#1597a8'];

type Parsed = { name: string | null; label: string; kind: 'fn' | 'points'; fn?: string; compiled?: any; error?: string };

/** Turn "y = sin(x)", "f(x) = x^2", "f'(x)", "F(x)" (primitive of f), "d/dx(x^3)", "int(x^2)" into plottable data. */
export function parseExpressions(lines: string[]): Parsed[] {
  const defs = new Map<string, any>();
  const out: Parsed[] = [];
  for (const raw of lines) {
    const line = raw.trim().replace(/π/g, 'pi').replace(/·/g, '*');
    if (!line) { out.push({ name: null, label: raw, kind: 'fn', error: 'empty' }); continue; }
    try {
      let name: string | null = null;
      let rhs = line;
      const m = line.match(/^([a-zA-Z])('*)\s*\(\s*x\s*\)\s*=\s*(.+)$/) || line.match(/^(y)()\s*=\s*(.+)$/);
      if (m) { name = m[1] + m[2]; rhs = m[3]; }
      let node: any;
      let primitiveOf: any = null;
      const refDeriv = rhs.match(/^([a-zA-Z])('+)\s*\(\s*x\s*\)$/);
      const refPrim = rhs.match(/^([A-Z])\s*\(\s*x\s*\)$/);
      const ddx = rhs.match(/^d\/dx\s*\((.+)\)$/);
      const intg = rhs.match(/^(?:int|∫)\s*\((.+)\)$/);
      if (!m && refDeriv && defs.has(refDeriv[1])) { node = defs.get(refDeriv[1]); for (let i = 0; i < refDeriv[2].length; i++) node = math.derivative(node, 'x'); name = rhs.replace(/\s*\(\s*x\s*\)/, ''); }
      else if (m && m[2] && defs.has(m[1]) && !m[3]) node = null;
      else if (!m && refPrim && defs.has(refPrim[1].toLowerCase()) && !defs.has(refPrim[1])) { primitiveOf = defs.get(refPrim[1].toLowerCase()); name = refPrim[1]; }
      else if (ddx) node = math.derivative(math.parse(ddx[1]), 'x');
      else if (intg) primitiveOf = math.parse(intg[1]);
      else node = math.parse(rhs);
      // "f'(x) = ..." with empty body handled by regex; "f'(x)=" alone falls through
      if (m && m[2] && !node) { node = defs.get(m[1]); for (let i = 0; i < m[2].length; i++) node = math.derivative(node, 'x'); }
      if (primitiveOf) {
        out.push({ name, label: raw, kind: 'points', compiled: primitiveOf.compile() });
        continue;
      }
      if (name && !name.includes("'") && name !== 'y') defs.set(name, node);
      const compiled = node.compile();
      compiled.evaluate({ x: 0.5 });
      out.push({ name, label: raw, kind: 'fn', fn: node.toString({ implicit: 'show' }).replace(/\s+/g, ''), compiled });
    } catch (e) {
      out.push({ name: null, label: raw, kind: 'fn', error: e instanceof Error ? e.message : 'Invalid expression' });
    }
  }
  return out;
}

export function evalNumber(text: unknown, fallback: number) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : fallback;
  try { const v = math.evaluate(String(text).replace(/π/g, 'pi')); return typeof v === 'number' && Number.isFinite(v) ? v : fallback; } catch { return fallback; }
}

function primitivePoints(compiled: any, xMin: number, xMax: number, n = 600) {
  const origin = Math.max(xMin, Math.min(xMax, 0));
  const h = (xMax - xMin) / n;
  const f = (x: number) => { const v = compiled.evaluate({ x }); return Number.isFinite(v) ? v : 0; };
  const pts: [number, number][] = [];
  const right: [number, number][] = [[origin, 0]];
  let acc = 0;
  for (let x = origin; x < xMax; x += h) { acc += ((f(x) + f(x + h)) / 2) * h; right.push([x + h, acc]); }
  acc = 0;
  const left: [number, number][] = [];
  for (let x = origin; x > xMin; x -= h) { acc -= ((f(x) + f(x - h)) / 2) * h; left.push([x - h, acc]); }
  pts.push(...left.reverse(), ...right);
  return pts;
}

function Tex({ src }: { src: string }) {
  const html = useMemo(() => {
    const raw = src.trim();
    const parts = raw.split('=');
    const lhs = parts.length > 1 ? parts[0].trim() : '';
    const rhs = parts[parts.length - 1].trim();
    let rhsTex = rhs;
    if (!/^[a-zA-Z]'*\s*\(\s*x\s*\)$/.test(rhs)) { try { rhsTex = math.parse(rhs.replace(/π/g, 'pi')).toTex({ parenthesis: 'auto' }); } catch { rhsTex = rhs; } }
    return katex.renderToString((lhs ? lhs + ' = ' : '') + rhsTex, { throwOnError: false });
  }, [src]);
  return <span className="gc-tex" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function GraphView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const target = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const panelId = useId();
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  useEffect(() => {
    setPanelHost(document.getElementById('graph-editor-panel'));
    const closeOther = (event: Event) => { if ((event as CustomEvent).detail !== panelId) setOpen(false); };
    window.addEventListener('lemma:graph-editor', closeOther);
    return () => window.removeEventListener('lemma:graph-editor', closeOther);
  }, [panelId]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPlotWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const a = node.attrs;
  const expr: string[] = (Array.isArray(a.expressions) ? a.expressions : ['x^2']).filter((v) => typeof v === 'string').slice(0, 8);
  const hidden: number[] = Array.isArray(a.hidden) ? a.hidden : [];
  const points: number[][] = Array.isArray(a.points) ? a.points.slice(0, 100) : [];
  const opts = { grid: a.grid !== false, axes: a.axes !== false, legend: a.legend !== false, equal: !!a.equal, values: a.values !== false };
  const parsed = useMemo(() => parseExpressions(expr), [expr.join('\u0001')]);
  const xMin = evalNumber(a.xMin, -10), xMax = evalNumber(a.xMax, 10);
  const yMinRaw = a.yMin === '' || a.yMin == null ? null : evalNumber(a.yMin, NaN);
  const yMaxRaw = a.yMax === '' || a.yMax == null ? null : evalNumber(a.yMax, NaN);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    el.replaceChildren();
    const lo = xMax > xMin ? xMin : -10, hi = xMax > xMin ? xMax : 10;
    const data: any[] = [];
    parsed.forEach((p, i) => {
      if (p.error || hidden.includes(i)) return;
      const color = graphColors[i % graphColors.length];
      if (p.kind === 'fn') data.push({ fn: p.fn, graphType: 'polyline', color, nSamples: 800 });
      else data.push({ fnType: 'points', graphType: 'polyline', points: primitivePoints(p.compiled, lo - (hi - lo), hi + (hi - lo)), color });
    });
    points.forEach((pt, i) => data.push({ fnType: 'points', graphType: 'scatter', points: [pt], color: graphColors[i % graphColors.length] }));
    const width = Math.max(300, Math.min(1200, el.clientWidth || 640));
    const height = Math.max(240, Math.min(600, Number(a.height) || 340));
    let yDomain: [number, number] | undefined;
    if (yMinRaw != null && yMaxRaw != null && Number.isFinite(yMinRaw) && Number.isFinite(yMaxRaw) && yMaxRaw > yMinRaw) yDomain = [yMinRaw, yMaxRaw];
    if (opts.equal) { const span = ((hi - lo) * (height - 40)) / (width - 40); const mid = yDomain ? (yDomain[0] + yDomain[1]) / 2 : 0; yDomain = [mid - span / 2, mid + span / 2]; }
    try {
      functionPlot({ target: el, width, height, grid: opts.grid, disableZoom: false, tip: { xLine: opts.values, yLine: opts.values, renderer: (x: number, y: number) => (opts.values ? `(${x.toFixed(2)}, ${y.toFixed(2)})` : '') }, xAxis: { domain: [lo, hi] }, yAxis: yDomain ? { domain: yDomain } : undefined, data: data.length ? data : [{ fn: '0', color: 'transparent' }] });
      el.classList.toggle('gc-no-axes', !opts.axes);
    } catch {
      const err = document.createElement('span'); err.className = 'graph-error'; err.textContent = 'Could not plot these expressions.'; el.append(err);
    }
    return () => el.replaceChildren();
  }, [JSON.stringify(parsed.map((p) => [p.fn, p.kind, p.error])), hidden.join(','), JSON.stringify(points), xMin, xMax, yMinRaw, yMaxRaw, a.height, opts.grid, opts.axes, opts.equal, opts.values, plotWidth]);

  const setExpr = (i: number, v: string) => { const next = [...expr]; next[i] = v; updateAttributes({ expressions: next }); };
  const removeExpr = (i: number) => updateAttributes({ expressions: expr.filter((_, j) => j !== i), hidden: hidden.filter((h) => h !== i).map((h) => (h > i ? h - 1 : h)) });
  const toggle = (i: number) => updateAttributes({ hidden: hidden.includes(i) ? hidden.filter((h) => h !== i) : [...hidden, i] });

  return (
    <NodeViewWrapper className={`graph-block ${open ? 'is-composing' : ''} ${selected ? 'is-selected' : ''}`} contentEditable={false} data-drag-handle>
      <div className="graph-main">
        <div ref={target} className="graph-target" />
        {opts.legend && parsed.some((p, i) => !p.error && !hidden.includes(i)) && (
          <div className="graph-legend">
            {parsed.map((p, i) => (p.error || hidden.includes(i) ? null : (
              <span key={i}><i className={`graph-color-${i % graphColors.length}`} /><Tex src={p.label} /></span>
            )))}
          </div>
        )}
        <Button variant="ghost" className="graph-edit-toggle" disabled={!editor.isEditable} onClick={() => { if (!open) window.dispatchEvent(new CustomEvent('lemma:graph-editor', { detail: panelId })); setOpen(!open); }}>{open ? 'Done' : 'Edit graph'}</Button>
      </div>
      {open && panelHost && createPortal(
        <aside className="graph-composer" aria-label="Graph editor">
          <header><span><Spline size={15} /> Graph composer</span>
            <div className="gc-header-actions"><Button variant="ghost" title="Reset view" onClick={() => updateAttributes({ xMin: -10, xMax: 10, yMin: '', yMax: '' })}><RotateCcw size={14} /></Button><Button variant="ghost" title="Close graph editor" aria-label="Close graph editor" onClick={() => setOpen(false)}><X size={16}/></Button></div></header>
          <h4>Expressions</h4>
          {expr.map((v, i) => (
            <div key={i} className={`gc-row ${parsed[i]?.error && v.trim() ? 'has-error' : ''}`}>
              <i className={`graph-color-${i % graphColors.length}`} />
              <div className="gc-field">
                {focusRow !== i && v.trim() && !parsed[i]?.error ? (
                  <Button variant="ghost" className="gc-rendered" onClick={() => setFocusRow(i)}><Tex src={v} /></Button>
                ) : (
                  <input aria-label={`Expression ${i + 1}`} autoFocus={focusRow === i} value={v} placeholder="f(x) = sin(x)" onFocus={() => setFocusRow(i)} onBlur={() => setFocusRow(null)} onChange={(e) => setExpr(i, e.target.value.slice(0, 160))} onKeyDown={(e) => { if (e.key === 'Enter' && expr.length < 8) { e.preventDefault(); updateAttributes({ expressions: [...expr, ''] }); setFocusRow(expr.length); } }} />
                )}
              </div>
              <Button variant="ghost" title={hidden.includes(i) ? 'Show' : 'Hide'} onClick={() => toggle(i)}>{hidden.includes(i) ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
              <Button variant="ghost" title="Remove" onClick={() => removeExpr(i)}><X size={14} /></Button>
            </div>
          ))}
          {expr.length < 8 && <Button variant="ghost" className="gc-add" onClick={() => { updateAttributes({ expressions: [...expr, ''] }); setFocusRow(expr.length); }}><Plus size={14} /> Add expression</Button>}
          <h4>Viewport</h4>
          <div className="gc-viewport">
            {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((k) => (
              <label key={k}><span>{k.replace('M', ' m')}</span><input value={a[k] ?? ''} placeholder="auto" onChange={(e) => updateAttributes({ [k]: e.target.value })} /></label>
            ))}
          </div>
          <h4>Plot options</h4>
          <div className="gc-options">
            {([['grid', 'Show grid'], ['equal', 'Equal scaling'], ['axes', 'Show axes'], ['values', 'Show point values'], ['legend', 'Show legend']] as const).map(([k, l]) => (
              <label key={k}><input type="checkbox" checked={opts[k]} onChange={(e) => updateAttributes({ [k]: e.target.checked })} />{l}</label>
            ))}
          </div>
          <label className="gc-height"><span>Height</span><input type="range" min="240" max="600" step="20" value={a.height || 340} onChange={(e) => updateAttributes({ height: +e.target.value })} /></label>
        </aside>, panelHost
      )}
    </NodeViewWrapper>
  );
}
