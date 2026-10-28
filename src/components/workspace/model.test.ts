import { describe, expect, it } from "vitest";
import {
  closeTabs,
  closePane,
  moveInDirection,
  initialLayout,
  mergePanes,
  moveTab,
  openResource,
  restoreLayout,
  splitPane,
  navigateResource,
  navigateLinkedResource,
  visiblePaneIds,
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

describe("per-note arrangements and four document splits", () => {
  const second: Resource = { id: "note:b", kind: "note", noteId: "b", title: "Geometry" };
  const pdf: Resource = {
    id: "pdf:a",
    kind: "attachment",
    attachmentKey: "a",
    title: "Algebra.pdf",
  };
  const otherPdf: Resource = {
    id: "pdf:b",
    kind: "attachment",
    attachmentKey: "b",
    title: "Geometry.pdf",
  };
  it("replaces companion documents per note and restores both pairs after refresh", () => {
    let state = openResource(openResource(initialLayout(), note), pdf, "right");
    state = navigateResource(state, second, "left");
    expect(state.split).toBe(false);
    expect(state.panes.right.active).toBeNull();
    state = openResource(state, otherPdf, "right");
    state = navigateResource(state, note, "left");
    expect(state.panes.right.active).toBe(pdf.id);
    expect(state.panes.right.tabs).not.toContain(otherPdf.id);
    state = navigateResource(restoreLayout(JSON.stringify(state)), second, "left");
    expect(state.panes.right.active).toBe(otherPdf.id);
    expect(state.resources).toContainEqual(pdf);
  });
  it("keeps the primary note's identity when splitting to its left", () => {
    const result = splitPane(openResource(initialLayout(), note), "left", "left");
    let state = openResource(result.layout, pdf, result.target);
    state = navigateResource(state, second, "left");
    state = navigateResource(state, note, "left");
    expect(state.primaryPane).toBe("left");
    expect(state.panes[result.target].active).toBe(pdf.id);
    expect(visiblePaneIds(state)[0]).toBe(result.target);
  });
  it("opens four slots with geometrically correct bottom splits and caps further splitting", () => {
    let state = openResource(initialLayout(), note);
    let result = splitPane(state, "left", "right");
    state = openResource(result.layout, pdf, result.target);
    result = splitPane(state, "left", "bottom");
    state = openResource(result.layout, second, result.target);
    expect(state.cells?.[result.target]).toBe(2);
    result = splitPane(state, "right", "bottom");
    state = openResource(result.layout, otherPdf, result.target);
    expect(state.cells?.[result.target]).toBe(3);
    expect(visiblePaneIds(state)).toHaveLength(4);
    expect(restoreLayout(JSON.stringify(state))).toEqual(state);
    expect(visiblePaneIds(splitPane(state, "left", "right").layout)).toHaveLength(4);
    const closed = closeTabs(state, result.target, [otherPdf.id]);
    expect(visiblePaneIds(closed)).toHaveLength(3);
    expect(closed.resources).toContainEqual(otherPdf);
  });
  it("restores a URL focused on a companion without replacing the primary note", () => {
    const state = openResource(openResource(initialLayout(), note), second, "right");
    const linked = navigateLinkedResource(restoreLayout(JSON.stringify(state)), second);
    expect(linked.panes.left.active).toBe(note.id);
    expect(linked.panes.right.active).toBe(second.id);
    expect(linked.activePane).toBe("right");
    expect(linked.split).toBe(true);
  });
  it("closes empty slots and prevents moving toward the wrong side", () => {
    const initial = openResource(initialLayout(), note);
    const result = splitPane(initial, "left", "right");
    const state = openResource(result.layout, code, result.target);
    expect(moveInDirection(state, note.id, "left", "left")).toBe(state);
    expect(moveInDirection(state, code.id, "right", "left").panes.left.active).toBe(code.id);
    expect(closePane(result.layout, "right").split).toBe(false);
  });
  it("validates corrupt pane cells and saved layout references", () => {
    const result = splitPane(openResource(initialLayout(), note), "left", "bottom");
    const state = restoreLayout(
      JSON.stringify({
        ...result.layout,
        cells: { left: 7, right: 7 },
        noteLayouts: {
          "note:a": {
            order: ["unknown"],
            panes: { left: { tabs: ["missing"], active: "missing" } },
          },
        },
      }),
    );
    expect(state.cells).toBeUndefined();
    expect(state.noteLayouts?.[note.id]?.panes.left.active).toBeNull();
  });
});
