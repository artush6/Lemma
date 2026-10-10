import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
const key = new PluginKey<DecorationSet>('lemmaPagination');
export const Pagination = Extension.create({
    name: 'lemmaPagination',
    addProseMirrorPlugins() {
        return [new Plugin({
            key,
            state: { init: () => DecorationSet.empty, apply: (tr, previous) => tr.getMeta(key) || previous.map(tr.mapping, tr.doc) },
            props: { decorations: state => key.getState(state) },
            view(view) {
                let frame = 0, disposed = false, last = '';
                const measure = (current: EditorView) => {
                    if (disposed || !current.dom.isConnected) return;
                    const article = current.dom.closest<HTMLElement>('.document');
                    if (!article || !article.closest('.page-layout-a4')) { if (last) { last = ''; current.dispatch(current.state.tr.setMeta(key, DecorationSet.empty).setMeta('addToHistory', false)); } return; }
                    const decorations: Decoration[] = []; const proseTop = current.dom.getBoundingClientRect().top, articleTop = article.getBoundingClientRect().top;
                    const headerHeight = proseTop - articleTop, pageHeight = 1123, margin = 60, gap = 32;
                    let used = headerHeight, page = 1;
                    // Measure real blocks, excluding the old spacers, so layout converges in one pass.
                    current.state.doc.forEach((node, position) => {
                        const dom = current.nodeDOM(position) as HTMLElement | null;
                        if (!dom || dom.nodeType !== 1) return;
                        const style = getComputedStyle(dom), height = dom.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
                        const manual = node.type.name === 'pageBreak';
                        if ((used + height > pageHeight - margin && used > margin + 1) || manual) {
                            const spacer = Math.max(0, pageHeight - used) + gap + margin;
                            const pageNumber = ++page, gapTop = Math.max(0, pageHeight - used);
                            decorations.push(Decoration.widget(position, () => { const element = document.createElement('div'); element.className = 'a4-page-gap'; element.contentEditable = 'false'; element.style.height = `${spacer}px`; element.style.setProperty('--gap-top', `${gapTop}px`); element.dataset.page = String(pageNumber); element.setAttribute('aria-label', `Page ${pageNumber}`); return element; }, { side: -1, key: `${position}:${spacer}:${pageNumber}`, ignoreSelection: true }));
                            used = margin;
                        }
                        if (!manual) used += height;
                    });
                    const signature = decorations.map(item => `${item.from}:${item.spec.key}`).join('|');
                    article.style.minHeight = `${pageHeight * page + gap * (page - 1)}px`;
                    article.dataset.pageCount = String(page);
                    if (signature === last) return;
                    last = signature; current.dispatch(current.state.tr.setMeta(key, DecorationSet.create(current.state.doc, decorations)).setMeta('addToHistory', false));
                };
                const schedule = () => { if (!frame && !disposed) frame = requestAnimationFrame(() => { frame = 0; measure(view); }); };
                const resize = new ResizeObserver(schedule); resize.observe(view.dom);
                document.fonts?.ready.then(schedule); schedule();
                return { update: schedule, destroy: () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); } };
            },
        }), new Plugin({ props: { decorations(state) { const { $from } = state.selection; if (!$from.depth) return null; return DecorationSet.create(state.doc, [Decoration.node($from.before(1), $from.after(1), { class: 'writing-current' })]); } } })];
    },
});
