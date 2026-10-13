import { afterEach, describe, expect, it, vi } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { EditorView } from "@tiptap/pm/view";
import { measurePageSpacers } from "@/components/editor/pagination";

const PAGE = (297 * 96) / 25.4;
const GAP = 48;
const MARGIN = 76;
const LINE = 26;
const schema = getSchema([StarterKit]);

// jsdom has no layout. Model 80 visual lines inside a real ProseMirror textblock.
function fixture(type: "paragraph" | "codeBlock", applied: Record<number, number> = {}) {
  const text = Array.from({ length: 80 }, () => "abcdefghij").join("\n");
  const block = schema.nodes[type]!.create(null, schema.text(text));
  const doc = schema.nodes["doc"]!.create(null, block);
  document.body.innerHTML = `<main class="lemma-app page-layout-a4"><article class="document" style="padding:76px"><div class="lemma-prose"><${type === "codeBlock" ? "pre" : "p"}></${type === "codeBlock" ? "pre" : "p"}></div></article></main>`;
  const root = document.querySelector<HTMLElement>(".lemma-prose")!;
  const paper = document.querySelector<HTMLElement>(".document")!;
  const el = root.firstElementChild as HTMLElement;
  const rect = (top: number, height: number) =>
    ({ top, bottom: top + height, height, width: 600, left: 0, right: 600 }) as DOMRect;
  paper.getBoundingClientRect = () => rect(0, PAGE);
  el.getBoundingClientRect = () =>
    rect(MARGIN, 80 * LINE + Object.values(applied).reduce((a, b) => a + b, 0));
  for (const [position, height] of Object.entries(applied)) {
    const spacer = document.createElement("span");
    spacer.dataset["pageSpacer"] = "true";
    spacer.dataset["position"] = position;
    spacer.getBoundingClientRect = () => rect(0, height);
    el.append(spacer);
  }
  const coordsAtPos = vi.fn((position: number) => {
    const added = Object.entries(applied).reduce(
      (total, [pos, height]) => total + (Number(pos) <= position ? height : 0),
      0,
    );
    return rect(MARGIN + Math.floor((position - 1) / 11) * LINE + added, LINE);
  });
  const view = {
    dom: root,
    state: { doc },
    nodeDOM: () => el,
    coordsAtPos,
  } as unknown as EditorView;
  return { view, doc, text, coordsAtPos };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("A4 oversized text pagination", () => {
  for (const type of ["paragraph", "codeBlock"] as const) {
    it(`keeps every ${type} line out of page margins without changing content`, () => {
      const { view, doc, text } = fixture(type);
      const before = doc.toJSON();
      const pushes = measurePageSpacers(view);
      expect(Object.keys(pushes).length).toBeGreaterThan(1);
      let shift = 0;
      for (let line = 0; line < 80; line++) {
        shift += pushes[line * 11 + 1] || 0;
        const top = MARGIN + line * LINE + shift;
        const pageTop = Math.floor(top / (PAGE + GAP)) * (PAGE + GAP);
        expect(top).toBeGreaterThanOrEqual(pageTop + MARGIN);
        expect(top + LINE).toBeLessThanOrEqual(pageTop + PAGE - MARGIN);
      }
      expect(doc.toJSON()).toEqual(before);
      expect(doc.textContent).toBe(text);
      // Re-measure the decorated geometry: spacers must not compound on updates.
      expect(measurePageSpacers(fixture(type, pushes).view)).toEqual(pushes);
    });
  }
  it("leaves horizontal and continuous layouts to CSS", () => {
    const { view, coordsAtPos } = fixture("codeBlock");
    const app = view.dom.closest(".lemma-app")!;
    app.classList.add("page-direction-horizontal");
    expect(measurePageSpacers(view)).toEqual({});
    app.classList.remove("page-direction-horizontal", "page-layout-a4");
    expect(measurePageSpacers(view)).toEqual({});
    expect(coordsAtPos).not.toHaveBeenCalled();
  });
});
