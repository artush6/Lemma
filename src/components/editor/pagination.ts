import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

const PAGE = (297 * 96) / 25.4; // A4 at CSS 96dpi
const GAP = 48; // desk gap between sheets
const key = new PluginKey<Record<number, number>>("lemmaA4Pagination");

/** Keep short blocks together; paginate the children of containers taller than a sheet. */
export function measurePageSpacers(view: EditorView): Record<number, number> {
  const root = view.dom as HTMLElement;
  const doc = root.closest(".document") as HTMLElement | null;
  if (
    !doc ||
    !root.closest(".lemma-app")?.classList.contains("page-layout-a4") ||
    root.closest(".page-direction-horizontal")
  )
    return {};
  // Collapsed sections retain their document nodes, but hidden spacers contribute no height.
  const current: Record<number, number> = {};
  root.querySelectorAll<HTMLElement>("[data-page-spacer]").forEach((spacer) => {
    const height = spacer.getBoundingClientRect().height;
    if (height > 0) current[Number(spacer.getAttribute("data-position"))] = height;
  });
  const margin = parseFloat(getComputedStyle(doc).paddingTop) || 76;
  const docTop = doc.getBoundingClientRect().top;
  const pushes: Record<number, number> = {};
  const appliedBefore = (position: number) =>
    Object.entries(current).reduce(
      (total, [pos, height]) => total + (Number(pos) <= position ? height : 0),
      0,
    );
  let shift = 0;
  let previousApplied = 0;
  view.state.doc.descendants((node, offset) => {
    const el = view.nodeDOM(offset) as HTMLElement | null;
    if (!el || !(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const subtreeApplied = Object.entries(current).reduce((total, [position, push]) => {
      const pos = Number(position);
      return pos >= offset && pos < offset + node.nodeSize ? total + push : total;
    }, 0);
    const ownApplied = current[offset] || 0;
    const top = r.top - docTop - previousApplied - ownApplied + shift;
    const height = r.height - subtreeApplied + ownApplied;
    // Oversized text blocks cannot move as a unit. Find visual line starts with
    // coordinate searches, then add view-only space before the overflowing line.
    // Positions/content remain unchanged, including fenced code and legacy notes.
    if (node.isTextblock && height >= PAGE - 2 * margin && node.content.size) {
      const end = offset + node.nodeSize - 1;
      let position = offset + 1;
      while (position < end) {
        const line = view.coordsAtPos(position);
        const lineTop = line.top - docTop - appliedBefore(position) + shift;
        const linePage = Math.floor(lineTop / (PAGE + GAP));
        const lineLimit = linePage * (PAGE + GAP) + PAGE - margin;
        if (lineTop + (line.bottom - line.top) > lineLimit) {
          const push = Math.ceil((linePage + 1) * (PAGE + GAP) + margin - lineTop);
          pushes[position] = push;
          shift += push;
        }
        // Binary search the next rendered line rather than measure every character.
        let low = position + 1;
        let high = end;
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          const next = view.coordsAtPos(mid);
          const unspacedTop = next.top - appliedBefore(mid);
          if (unspacedTop > line.top - appliedBefore(position) + 1) high = mid;
          else low = mid + 1;
        }
        position = low;
      }
      previousApplied += subtreeApplied;
      return false;
    }
    const container = [
      "callout",
      "bulletList",
      "orderedList",
      "taskList",
      "listItem",
      "taskItem",
      "toggleHeading",
      "toggleBody",
      "blockquote",
    ].includes(node.type.name);
    if (container && height >= PAGE - 2 * margin) {
      previousApplied += ownApplied;
      return true;
    }
    const next = el.nextElementSibling as HTMLElement | null;
    // Keep headings with the beginning of the following block.
    const followingHeight =
      node.type.name === "heading" && next ? Math.min(next.getBoundingClientRect().height, 80) : 0;
    const page = Math.floor(top / (PAGE + GAP));
    const limit = page * (PAGE + GAP) + PAGE - margin;
    if (
      node.type.name === "pageBreak" ||
      (top + height + followingHeight > limit && height < PAGE - 2 * margin)
    ) {
      const push = Math.round((page + 1) * (PAGE + GAP) + margin - top);
      pushes[offset] = push;
      shift += push;
    }
    previousApplied += subtreeApplied;
    return false;
  });
  return pushes;
}

const same = (a: Record<number, number>, b: Record<number, number>) => {
  const ka = Object.keys(a),
    kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => Math.abs((a[Number(k)] ?? 0) - (b[Number(k)] ?? -1)) < 2)
  );
};

export const A4Pagination = Extension.create({
  name: "lemmaA4Pagination",
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
              if (node)
                decos.push(
                  Decoration.widget(
                    +pos,
                    () => {
                      const spacer = document.createElement("span");
                      spacer.className = "page-spacer";
                      spacer.setAttribute("data-page-spacer", "true");
                      spacer.setAttribute("data-position", pos);
                      spacer.setAttribute("aria-hidden", "true");
                      spacer.contentEditable = "false";
                      spacer.style.height = `${px}px`;
                      return spacer;
                    },
                    { side: -1, key: `${pos}:${px}` },
                  ),
                );
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
        view: (view) => {
          let frame = 0;
          const updateSheets = () => {
            const doc = view.dom.closest(".document") as HTMLElement | null;
            if (!doc) return;
            const horizontal =
              !!doc.closest(".page-direction-horizontal") && !!doc.closest(".page-layout-a4");
            const paged = !!doc.closest(".page-layout-a4");
            if (!paged) {
              doc.style.minHeight = "";
              doc.style.removeProperty("--horizontal-width");
              return;
            }
            const margin = parseFloat(getComputedStyle(doc).paddingBottom) || 76;
            const contentEnd =
              view.dom.getBoundingClientRect().bottom - doc.getBoundingClientRect().top;
            const width = (210 * 96) / 25.4;
            const count = horizontal
              ? Math.max(1, Math.round((view.dom.scrollWidth + 2 * margin + GAP) / (width + GAP)))
              : Math.max(1, Math.ceil((contentEnd + margin + GAP) / (PAGE + GAP)));
            const height = horizontal ? PAGE : count * PAGE + (count - 1) * GAP;
            if (horizontal)
              doc.style.setProperty("--horizontal-width", `${count * width + (count - 1) * GAP}px`);
            else doc.style.removeProperty("--horizontal-width");
            if (doc.style.minHeight !== `${height}px`) doc.style.minHeight = `${height}px`;
            let activeTop = 0;
            try {
              activeTop = horizontal
                ? view.coordsAtPos(view.state.selection.from).left -
                  doc.getBoundingClientRect().left
                : view.coordsAtPos(view.state.selection.from).top - doc.getBoundingClientRect().top;
            } catch {
              /* Selection may be transient while switching notes. */
            }
            const active = Math.max(
              1,
              Math.min(count, Math.floor(activeTop / ((horizontal ? width : PAGE) + GAP)) + 1),
            );
            doc.style.setProperty(
              "--active-sheet-bottom",
              `${(horizontal ? 0 : (active - 1) * (PAGE + GAP)) + PAGE - 28}px`,
            );
            doc.style.setProperty(
              "--active-sheet-left",
              `${horizontal ? (active - 1) * (width + GAP) : 0}px`,
            );
            const currentLabel = doc.querySelector("[data-current-sheet]");
            const totalLabel = doc.querySelector("[data-sheet-total]");
            if (currentLabel) currentLabel.textContent = String(active);
            if (totalLabel) totalLabel.textContent = String(count);
          };
          const run = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              if (!view.dom.isConnected) return;
              const next = measurePageSpacers(view);
              if (!same(next, key.getState(view.state) || {}))
                view.dispatch(view.state.tr.setMeta(key, next).setMeta("addToHistory", false));
              updateSheets();
            });
          };
          const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
          ro?.observe(view.dom);
          const app = view.dom.closest(".lemma-app");
          const mutations = new MutationObserver(run);
          if (app)
            mutations.observe(app, { attributes: true, attributeFilter: ["class", "style"] });
          view.dom.addEventListener("load", run, true);
          document.fonts?.ready.then(run);
          window.addEventListener("resize", run);
          const timers = [150, 600, 1500].map((t) => setTimeout(run, t));
          run();
          return {
            update: () => run(),
            destroy: () => {
              timers.forEach(clearTimeout);
              cancelAnimationFrame(frame);
              ro?.disconnect();
              mutations.disconnect();
              view.dom.removeEventListener("load", run, true);
              window.removeEventListener("resize", run);
            },
          };
        },
      }),
    ];
  },
});
