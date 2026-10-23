import { describe, expect, it } from "vitest";
import {
  closeTabs,
  initialLayout,
  mergePanes,
  moveTab,
  openResource,
  restoreLayout,
  type Resource,
} from "./model";
const note: Resource = { id: "note:a", kind: "note", noteId: "a", title: "Algebra" };
const code: Resource = { id: "code", kind: "code", title: "Code Lab" };
describe("unified workspace layout", () => {
  it("reopens stable identities without duplicating tabs or documents", () => {
    const state = openResource(openResource(initialLayout(), note), note);
    expect(state.panes.left.tabs).toEqual(["library", "note:a"]);
    expect(state.resources.filter((r) => r.id === note.id)).toHaveLength(1);
  });
  it("moves and reorders tabs while keeping each pane's active tab independent", () => {
    let state = openResource(openResource(initialLayout(), note), code, "right");
    state = moveTab(state, note.id, "left", "right", 0);
    expect(state.panes.left).toEqual({ tabs: ["library"], active: "library" });
    expect(state.panes.right).toEqual({ tabs: [note.id, code.id], active: note.id });
    state = moveTab(state, code.id, "right", "right", 0);
    expect(state.panes.right.tabs).toEqual([code.id, note.id]);
  });
  it("merges panes without losing tabs and deduplicates a second view", () => {
    const split = openResource(
      openResource(openResource(initialLayout(), note), code, "right"),
      note,
      "right",
    );
    const merged = mergePanes(split, "right");
    expect(merged.split).toBe(false);
    expect(merged.panes.left.tabs).toEqual([code.id, note.id, "library"]);
    expect(merged.panes.left.active).toBe(note.id);
    expect(merged.resources.filter((r) => r.kind === "note")).toHaveLength(1);
  });
  it("closing the last tab in a pane preserves the other pane and never deletes resources", () => {
    const split = openResource(openResource(initialLayout(), note), code, "right");
    const closed = closeTabs(split, "right", [code.id]);
    expect(closed.split).toBe(false);
    expect(closed.panes.left.tabs).toContain(note.id);
    expect(closed.resources.find((r) => r.id === code.id)).toEqual(code);
  });
  it("round trips independent active tabs, ordering, orientation and divider position", () => {
    const split = {
      ...openResource(openResource(initialLayout(), note), code, "right"),
      ratio: 62,
      orientation: "vertical" as const,
    };
    expect(restoreLayout(JSON.stringify(split))).toEqual(split);
  });
  it("recovers malformed storage and clamps unsafe layout values", () => {
    expect(restoreLayout("{broken")).toEqual(initialLayout());
    expect(restoreLayout('{"version":2}')).toEqual(initialLayout());
    const state = openResource(initialLayout(), note);
    const restored = restoreLayout(
      JSON.stringify({
        ...state,
        ratio: 100,
        panes: { left: { tabs: [note.id, note.id, "missing"], active: "missing" } },
      }),
    );
    expect(restored.ratio).toBe(75);
    expect(restored.panes.left).toEqual({ tabs: [note.id], active: note.id });
  });
});
