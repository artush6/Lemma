import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

const PAGE = 297 * 96 / 25.4; // A4 at CSS 96dpi
const GAP = 48; // desk gap between sheets
const key = new PluginKey<Record<number, number>>('lemmaA4Pagination');

/** Measure top-level blocks and compute how far each must be pushed to start on the next sheet. */
function measure(view: EditorView): Record<number, number> {
  const root = view.dom as HTMLElement;
  const doc = root.closest('.document') as HTMLElement | null;
  if (!doc || !root.closest('.lemma-app')?.classList.contains('page-layout-a4')) return {};
  const current = key.getState(view.state) || {};
  const margin = parseFloat(getComputedStyle(doc).paddingTop) || 76;
  const docTop = doc.getBoundingClientRect().top;
  const pushes: Record<number, number> = {};
  let shift = 0;
  let previousApplied = 0;
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset) as HTMLElement | null;
    if (!el || !(el instanceof HTMLElement)) return;
    const r = el.getBoundingClientRect();
    const applied = current[offset] || 0;
    const top = r.top - docTop - applied - previousApplied + shift;
    const height = r.height;
    const page = Math.floor(top / (PAGE + GAP));
    const limit = page * (PAGE + GAP) + PAGE - margin;
    if (node.type.name === 'pageBreak' || (top + height > limit && height < PAGE - 2 * margin)) {
      const push = Math.round((page + 1) * (PAGE + GAP) + margin - top);
      pushes[offset] = push;
      shift += push;
    }
    previousApplied += applied;
  });
  return pushes;
}

const same = (a: Record<number, number>, b: Record<number, number>) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Math.abs((a[Number(k)] ?? 0) - (b[Number(k)] ?? -1)) < 2);
};

export const A4Pagination = Extension.create({
  name: 'lemmaA4Pagination',
  addProseMirrorPlugins() {
    return [
      new Plugin<Record<number, number>>({
        key,
        state: {
          init: () => ({}),
          apply: (tr, value) => {
            const next = tr.getMeta(key);
            if (next) return next;
            if (!tr.docChanged) return value;
            const mapped: Record<number, number> = {};
            for (const [pos, px] of Object.entries(value)) mapped[tr.mapping.map(+pos)] = px;
            return mapped;
          },
        },
        props: {
          decorations(state) {
            const pushes = key.getState(state) || {};
            const decos: Decoration[] = [];
            for (const [pos, px] of Object.entries(pushes)) {
              const node = state.doc.nodeAt(+pos);
              if (node) decos.push(Decoration.node(+pos, +pos + node.nodeSize, { style: `margin-top:${px}px !important`, 'data-page-start': 'true' }));
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
        view: (view) => {
          let frame = 0;
          const updateSheets = () => {
            const doc = view.dom.closest('.document') as HTMLElement | null;
            if (!doc) return;
            const margin = parseFloat(getComputedStyle(doc).paddingBottom) || 76;
            const contentEnd = view.dom.getBoundingClientRect().bottom - doc.getBoundingClientRect().top;
            const count = Math.max(1, Math.ceil((contentEnd + margin + GAP) / (PAGE + GAP)));
            const height = count * PAGE + (count - 1) * GAP;
            if (doc.style.minHeight !== `${height}px`) doc.style.minHeight = `${height}px`;
            let activeTop = 0;
            try { activeTop = view.coordsAtPos(view.state.selection.from).top - doc.getBoundingClientRect().top; } catch { /* Selection may be transient while switching notes. */ }
            const active = Math.max(1, Math.min(count, Math.floor(activeTop / (PAGE + GAP)) + 1));
            doc.style.setProperty('--active-sheet-bottom', `${(active - 1) * (PAGE + GAP) + PAGE - 28}px`);
            const currentLabel = doc.querySelector('[data-current-sheet]');
            const totalLabel = doc.querySelector('[data-sheet-total]');
            if (currentLabel) currentLabel.textContent = String(active);
            if (totalLabel) totalLabel.textContent = String(count);
          };
          const run = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              if (!view.dom.isConnected) return;
              const next = measure(view);
              if (!same(next, key.getState(view.state) || {})) view.dispatch(view.state.tr.setMeta(key, next).setMeta('addToHistory', false));
              updateSheets();
            });
          };
          const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
          ro?.observe(view.dom);
          window.addEventListener('resize', run);
          const timers = [150, 600, 1500].map((t) => setTimeout(run, t));
          run();
          return { update: () => run(), destroy: () => { timers.forEach(clearTimeout); cancelAnimationFrame(frame); ro?.disconnect(); window.removeEventListener('resize', run); } };
        },
      }),
    ];
  },
});
