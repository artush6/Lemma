export type Resource =
  | { id: string; kind: "note"; noteId: string; title: string }
  | { id: string; kind: "library" | "code" | "cards"; title: string }
  | { id: string; kind: "attachment"; title: string; attachmentKey: string };
export type PaneId = "left" | "right" | "bottomLeft" | "bottomRight";
export const paneIds: PaneId[] = ["left", "right", "bottomLeft", "bottomRight"];
export type Direction = "left" | "right" | "top" | "bottom";
export type Pane = { tabs: string[]; active: string | null };
export type Layout = {
  cells?: Partial<Record<PaneId, number>> | undefined;
  primaryPane?: PaneId | undefined;
  order?: PaneId[] | undefined;
  noteLayouts?: Record<
    string,
    {
      cells?: Partial<Record<PaneId, number>> | undefined;
      primaryPane?: PaneId | undefined;
      panes: Record<PaneId, Pane>;
      order: PaneId[];
      orientation: Layout["orientation"];
      ratio: number;
    }
  >;
  version: 1;
  resources: Resource[];
  panes: Record<PaneId, Pane>;
  activePane: PaneId;
  split: boolean;
  orientation: "horizontal" | "vertical";
  ratio: number;
};
export const initialLayout = (): Layout => ({
  version: 1,
  resources: [{ id: "library", kind: "library", title: "Library" }],
  panes: {
    left: { tabs: ["library"], active: "library" },
    right: { tabs: [], active: null },
    bottomLeft: { tabs: [], active: null },
    bottomRight: { tabs: [], active: null },
  },
  activePane: "left",
  split: false,
  orientation: "horizontal",
  ratio: 50,
});
export const visiblePaneIds = (state: Layout): PaneId[] =>
  state.split ? state.order || ["left", "right"] : ["left"];
export const opposite = (pane: PaneId): PaneId => (pane === "left" ? "right" : "left");
export function openResource(state: Layout, resource: Resource, pane = state.activePane): Layout {
  const target = state.panes[pane];
  return {
    ...state,
    resources: [...state.resources.filter((r) => r.id !== resource.id), resource],
    split: state.split || pane !== "left",
    order: state.order && !state.order.includes(pane) ? [...state.order, pane] : state.order,
    activePane: pane,
    panes: {
      ...state.panes,
      [pane]: {
        tabs: target.tabs.includes(resource.id) ? target.tabs : [...target.tabs, resource.id],
        active: resource.id,
      },
    },
  };
}
export function closeTabs(state: Layout, pane: PaneId, ids: string[]): Layout {
  const old = state.panes[pane];
  if (!ids.some((id) => old.tabs.includes(id))) return state;
  const tabs = old.tabs.filter((id) => !ids.includes(id));
  const next = {
    ...state,
    panes: {
      ...state.panes,
      [pane]: {
        tabs,
        active: tabs.includes(old.active || "")
          ? old.active
          : tabs[Math.max(0, old.tabs.indexOf(old.active || "") - 1)] || tabs[0] || null,
      },
    },
  };
  if (!tabs.length && state.split) return closePane(next, pane);
  return next;
}
export function closePane(state: Layout, pane: PaneId): Layout {
  if (!state.split) return closeTabs(state, pane, state.panes[pane].tabs);
  const order = visiblePaneIds(state).filter((p) => p !== pane);
  const next = { ...state, panes: { ...state.panes, [pane]: { tabs: [], active: null } } };
  if (order.length <= 1) return mergePanes(next, order[0] || "left");
  return {
    ...next,
    order,
    cells: undefined,
    primaryPane: state.primaryPane === pane ? order[0] : state.primaryPane,
    activePane: order.includes(state.activePane) ? state.activePane : order[0]!,
  };
}
export function moveTab(
  state: Layout,
  id: string,
  from: PaneId,
  to: PaneId,
  index?: number,
): Layout {
  if (!state.panes[from].tabs.includes(id)) return state;
  const tabs = state.panes[to].tabs.filter((tab) => tab !== id);
  tabs.splice(index === undefined ? tabs.length : Math.max(0, index), 0, id);
  const source = state.panes[from].tabs.filter((tab) => tab !== id);
  return {
    ...state,
    split: state.split || from !== to,
    order:
      from !== to && !visiblePaneIds(state).includes(to)
        ? [...visiblePaneIds(state), to]
        : state.order,
    primaryPane:
      from !== to &&
      (state.primaryPane || visiblePaneIds(state)[0]) === from &&
      state.panes[from].active === id &&
      state.resources.some((r) => r.id === id && r.kind === "note")
        ? to
        : state.primaryPane,
    activePane: to,
    panes: {
      ...state.panes,
      [from]: {
        tabs: source,
        active: state.panes[from].active === id ? source[0] || null : state.panes[from].active,
      },
      [to]: { tabs, active: id },
    },
  };
}
export function mergePanes(state: Layout, into: PaneId = "left"): Layout {
  const tabs = [
    ...new Set([into, ...paneIds.filter((p) => p !== into)].flatMap((p) => state.panes[p].tabs)),
  ];
  return {
    ...state,
    order: undefined,
    cells: undefined,
    primaryPane: undefined,
    split: false,
    activePane: "left",
    panes: {
      ...initialLayout().panes,
      left: { tabs, active: state.panes[into].active || tabs[0] || null },
    },
  };
}
/** Create at most four visible slots; at capacity, use the requested neighbouring slot. */
export function splitPane(
  state: Layout,
  pane: PaneId,
  direction: Direction,
): { layout: Layout; target: PaneId } {
  const order = [...visiblePaneIds(state)];
  const before = direction === "left" || direction === "top";
  const vertical = direction === "top" || direction === "bottom";
  const target = paneIds.find((p) => !order.includes(p));
  if (order.length === 1 && target) {
    order.splice(before ? 0 : 1, 0, target);
    return {
      target,
      layout: {
        ...state,
        split: true,
        order,
        cells: undefined,
        primaryPane: state.primaryPane || pane,
        activePane: target,
        orientation: vertical ? "vertical" : "horizontal",
      },
    };
  }
  const cells = { ...state.cells };
  order.forEach((p, index) => {
    if (cells[p] === undefined)
      cells[p] = order.length === 2 && state.orientation === "vertical" ? index * 2 : index;
  });
  const source = cells[pane] || 0;
  const destination = vertical ? (source < 2 ? source + 2 : source - 2) : source ^ 1;
  const neighbour = order.find((p) => cells[p] === destination);
  if (!target || neighbour) return { layout: state, target: neighbour || pane };
  // Put the new cell on the requested side, shifting the source to its opposite if needed.
  const sourceBefore = vertical ? source < 2 : source % 2 === 0;
  cells[target] = before === sourceBefore ? source : destination;
  cells[pane] = before === sourceBefore ? destination : source;
  order.push(target);
  return {
    target,
    layout: {
      ...state,
      split: true,
      order,
      cells,
      primaryPane: state.primaryPane || visiblePaneIds(state)[0],
      activePane: target,
      orientation: "horizontal",
    },
  };
}
/** Move only toward a real neighbour, or create a slot in that direction. */
export function moveInDirection(
  state: Layout,
  id: string,
  pane: PaneId,
  direction: Direction,
): Layout {
  const result = splitPane(state, pane, direction);
  if (result.layout === state) {
    const order = visiblePaneIds(state);
    const cell = (p: PaneId) =>
      state.cells?.[p] ??
      (state.orientation === "vertical" ? order.indexOf(p) * 2 : order.indexOf(p));
    const source = cell(pane),
      target = cell(result.target);
    const valid =
      direction === "left"
        ? target % 2 < source % 2
        : direction === "right"
          ? target % 2 > source % 2
          : direction === "top"
            ? Math.floor(target / 2) < Math.floor(source / 2)
            : Math.floor(target / 2) > Math.floor(source / 2);
    if (!valid) return state;
  }
  return moveTab(result.layout, id, pane, result.target);
}
/** Navigation in the primary slot swaps its companions, keeping editors cached by identity. */
export function navigateResource(
  state: Layout,
  resource: Resource,
  pane = state.activePane,
): Layout {
  const primary = state.primaryPane || visiblePaneIds(state)[0]!;
  if (pane !== primary) return openResource(state, resource, pane);
  const previous = state.panes[primary].active;
  if (previous === resource.id) return openResource(state, resource, pane);
  const noteLayouts = { ...state.noteLayouts };
  if (previous?.startsWith("note:"))
    noteLayouts[previous] = {
      cells: state.cells,
      primaryPane: state.primaryPane,
      panes: state.panes,
      order: visiblePaneIds(state),
      orientation: state.orientation,
      ratio: state.ratio,
    };
  if (resource.kind !== "note" || !previous?.startsWith("note:")) {
    if (!noteLayouts[resource.id]) return openResource({ ...state, noteLayouts }, resource, pane);
  }
  const saved = noteLayouts[resource.id];
  const main = {
    tabs: [...new Set([...state.panes[primary].tabs, resource.id])],
    active: resource.id,
  };
  if (saved) {
    const first = saved.primaryPane || saved.order[0]!;
    return openResource(
      {
        ...state,
        noteLayouts,
        panes: {
          ...saved.panes,
          [first]: { ...main, tabs: [...new Set([...main.tabs, ...saved.panes[first].tabs])] },
        },
        cells: saved.cells,
        primaryPane: saved.primaryPane,
        order: saved.order,
        split: saved.order.length > 1,
        orientation: saved.orientation,
        ratio: saved.ratio,
      },
      resource,
      first,
    );
  }
  // Unpaired notes begin alone; old companions stay in resources and their saved arrangement.
  return openResource(
    {
      ...state,
      noteLayouts,
      panes: { ...initialLayout().panes, left: main },
      cells: undefined,
      primaryPane: undefined,
      order: undefined,
      split: false,
    },
    resource,
    "left",
  );
}
/** URLs track the focused note, which may already be a companion. */
export function navigateLinkedResource(state: Layout, resource: Resource): Layout {
  const visible = visiblePaneIds(state).find((p) => state.panes[p].active === resource.id);
  return visible
    ? { ...state, activePane: visible }
    : navigateResource(state, resource, state.primaryPane || visiblePaneIds(state)[0]);
}
/** Storage is untrusted; reconstruct only known fields and valid references. */
export function restoreLayout(raw: string | null): Layout {
  try {
    const value = JSON.parse(raw || "null");
    if (value?.version !== 1 || !Array.isArray(value.resources)) return initialLayout();
    const resources: Resource[] = value.resources.filter(
      (r: Resource) =>
        r &&
        typeof r.id === "string" &&
        typeof r.title === "string" &&
        (["library", "code", "cards"].includes(r.kind) ||
          (r.kind === "note" && typeof r.noteId === "string") ||
          (r.kind === "attachment" && typeof r.attachmentKey === "string")),
    );
    const ids = new Set(resources.map((r) => r.id));
    const pane = (key: PaneId): Pane => {
      const p = value.panes?.[key];
      const tabs = [
        ...new Set<string>(
          (Array.isArray(p?.tabs) ? p.tabs : []).filter(
            (id: unknown) => typeof id === "string" && ids.has(id),
          ),
        ),
      ];
      return { tabs, active: tabs.includes(p?.active) ? p.active : tabs[0] || null };
    };
    const layout: Layout = {
      version: 1,
      resources,
      panes: {
        left: pane("left"),
        right: pane("right"),
        bottomLeft: pane("bottomLeft"),
        bottomRight: pane("bottomRight"),
      },
      activePane: paneIds.includes(value.activePane) && value.split ? value.activePane : "left",
      split: value.split === true,
      orientation: value.orientation === "vertical" ? "vertical" : "horizontal",
      ratio:
        typeof value.ratio === "number" && Number.isFinite(value.ratio)
          ? Math.min(75, Math.max(25, value.ratio))
          : 50,
    };
    const order = Array.isArray(value.order)
      ? [...new Set<PaneId>(value.order.filter((p: PaneId) => paneIds.includes(p)))]
      : undefined;
    if (order?.length) {
      layout.order = order;
      if (!order.includes(layout.activePane)) layout.activePane = order[0]!;
    }
    if (paneIds.includes(value.primaryPane) && visiblePaneIds(layout).includes(value.primaryPane))
      layout.primaryPane = value.primaryPane;
    if (value.cells && typeof value.cells === "object") {
      const cells: Partial<Record<PaneId, number>> = {};
      const used = new Set<number>();
      for (const p of visiblePaneIds(layout)) {
        const cell = value.cells[p];
        if (Number.isInteger(cell) && cell >= 0 && cell < 4 && !used.has(cell)) {
          cells[p] = cell;
          used.add(cell);
        }
      }
      if (Object.keys(cells).length === visiblePaneIds(layout).length) layout.cells = cells;
    }
    if (value.noteLayouts && typeof value.noteLayouts === "object") {
      layout.noteLayouts = {};
      for (const [id, saved] of Object.entries(value.noteLayouts)) {
        if (!ids.has(id) || !saved || typeof saved !== "object") continue;
        const restored = restoreLayout(
          JSON.stringify({
            ...(saved as object),
            noteLayouts: undefined,
            version: 1,
            resources,
            split: (saved as { order?: unknown[] }).order?.length !== 1,
          }),
        );
        layout.noteLayouts[id] = {
          cells: restored.cells,
          primaryPane: restored.primaryPane,
          panes: restored.panes,
          order: visiblePaneIds(restored),
          orientation: restored.orientation,
          ratio: restored.ratio,
        };
      }
    }
    return layout.split ? layout : mergePanes(layout);
  } catch {
    return initialLayout();
  }
}
