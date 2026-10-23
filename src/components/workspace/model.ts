export type Resource =
  | { id: string; kind: "note"; noteId: string; title: string }
  | { id: string; kind: "library" | "code" | "cards"; title: string }
  | { id: string; kind: "attachment"; title: string; attachmentKey: string };
export type PaneId = "left" | "right";
export type Pane = { tabs: string[]; active: string | null };
export type Layout = {
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
  panes: { left: { tabs: ["library"], active: "library" }, right: { tabs: [], active: null } },
  activePane: "left",
  split: false,
  orientation: "horizontal",
  ratio: 50,
});
export const opposite = (pane: PaneId): PaneId => (pane === "left" ? "right" : "left");
export function openResource(state: Layout, resource: Resource, pane = state.activePane): Layout {
  const target = state.panes[pane];
  return {
    ...state,
    resources: [...state.resources.filter((r) => r.id !== resource.id), resource],
    split: state.split || pane === "right",
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
  if (!tabs.length && state.split) return mergePanes(next, opposite(pane));
  return next;
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
  const other = opposite(into);
  const tabs = [...new Set([...state.panes[into].tabs, ...state.panes[other].tabs])];
  return {
    ...state,
    split: false,
    activePane: "left",
    panes: {
      left: { tabs, active: state.panes[into].active || state.panes[other].active },
      right: { tabs: [], active: null },
    },
  };
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
      panes: { left: pane("left"), right: pane("right") },
      activePane: value.activePane === "right" && value.split ? "right" : "left",
      split: value.split === true,
      orientation: value.orientation === "vertical" ? "vertical" : "horizontal",
      ratio:
        typeof value.ratio === "number" && Number.isFinite(value.ratio)
          ? Math.min(75, Math.max(25, value.ratio))
          : 50,
    };
    return layout.split ? layout : mergePanes(layout);
  } catch {
    return initialLayout();
  }
}
