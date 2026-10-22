import { mapFieldRanges, latexArgumentRanges } from "./mathEditing";
import { describe, it, expect } from "vitest";
import { latexTokens } from "./latexTokens";
import { graphLatex, splitGraphExpressions } from "./graphLatex";
import { parseExpressions } from "./graph";
import { documentTex } from "./exportDocument";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Columns, Column, columnContent } from "./columns";
describe("math workspace", () => {
  it("pairs nested delimiters and flags incomplete brackets", () => {
    const tokens = latexTokens("{(x)}");
    expect(tokens[0]?.className).toBe(tokens[4]?.className);
    expect(tokens[1]?.className).toBe(tokens[3]?.className);
    expect(latexTokens("{x")[0]?.className).toBe("latex-unmatched");
    expect(latexTokens("\\{x\\}")[0]?.className).toBe("latex-command");
  });
  it("plots a long LaTeX fraction and its shifted function", () => {
    const raw = String.raw`\frac{e^{\sin(x)} - e^{-\sin(x)}}{1 + e^{\cos(x)}} \\[20pt] f(x + 2\pi)`;
    const lines = splitGraphExpressions(raw);
    expect(lines).toHaveLength(2);
    const parsed = parseExpressions(lines);
    expect(parsed.map((p) => p.error)).toEqual([undefined, undefined]);
    const x = 1.3;
    expect(parsed[0]?.compiled.evaluate({ x })).toBeCloseTo(
      (Math.exp(Math.sin(x)) - Math.exp(-Math.sin(x))) / (1 + Math.exp(Math.cos(x))),
    );
    expect(parsed[1]?.compiled.evaluate({ x })).toBeCloseTo(parsed[0]?.compiled.evaluate({ x }));
  });
  it("rejects unsupported and broken LaTeX instead of silently changing it", () => {
    expect(() => graphLatex("\\frac{x}")).toThrow();
    expect(() => graphLatex("\\unknown{x}")).toThrow();
  });
  it("keeps column content in a serializable document", () => {
    const editor = new Editor({
      extensions: [StarterKit, Columns, Column],
      content: { type: "doc", content: [columnContent(3)] },
    });
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(3);
    editor.destroy();
  });
  it("can exit columns with the keyboard without losing their content", () => {
    const editor = new Editor({
      extensions: [StarterKit, Columns, Column],
      content: { type: "doc", content: [columnContent(2)] },
    });
    editor.commands.setTextSelection(3);
    expect(editor.commands.keyboardShortcut("Mod-Enter")).toBe(true);
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["columns", "paragraph"]);
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    editor.destroy();
  });
  it("exports escaped text and original equation source", () => {
    const tex = documentTex("A & B", {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "50% and _value" }] },
        { type: "mathBlock", attrs: { latex: "\\frac{x}{2}" } },
      ],
    });
    expect(tex).toContain("A \\& B");
    expect(tex).toContain("50\\%");
    expect(tex).toContain("\\frac{x}{2}");
  });
});

describe("equation source editing", () => {
  it("renders every source character including a trailing command slash", () => {
    for (const value of ["\\", "x+\\", "\\frac{a}{b}", "\\alpha\\"])
      expect(
        latexTokens(value)
          .map((token) => token.text)
          .join(""),
      ).toBe(value);
  });
  it("keeps later snippet arguments aligned after replacement", () => {
    expect(
      mapFieldRanges("\\frac{a}{b}", "\\frac{numerator}{b}", [
        [6, 7],
        [9, 10],
      ]),
    ).toEqual([
      [6, 15],
      [17, 18],
    ]);
    expect(latexArgumentRanges("\\frac{numerator}{b}")).toEqual([
      [6, 15],
      [17, 18],
    ]);
  });
});

describe("column navigation", () => {
  it("moves into the next column and back without changing content", () => {
    const editor = new Editor({
      extensions: [StarterKit, Columns, Column],
      content: { type: "doc", content: [columnContent(3)] },
    });
    editor.commands.setTextSelection(3);
    const original = editor.getJSON();
    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(editor.state.selection.from).toBe(7);
    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(editor.state.selection.from).toBe(3);
    expect(editor.getJSON()).toEqual(original);
    editor.destroy();
  });
});
