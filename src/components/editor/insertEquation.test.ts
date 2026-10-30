import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { expect, it } from "vitest";
import { insertEquation } from "./insertEquation";

const math = (inline: boolean) =>
  Node.create({
    name: inline ? "inlineMath" : "mathBlock",
    group: inline ? "inline" : "block",
    inline,
    atom: true,
    addAttributes: () => ({ latex: { default: "" } }),
    renderHTML: () => [inline ? "span" : "div", { "data-math": "" }],
  });

it.each([true, false])(
  "selects a new equation for immediate source editing (inline=%s), preserving surrounding content",
  (inline) => {
    const editor = new Editor({
      extensions: [StarterKit, math(true), math(false)],
      content: "<p>Before after</p>",
    });
    editor.commands.setTextSelection(8);
    editor.commands.command(insertEquation(inline));
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect((editor.state.selection as NodeSelection).node.type.name).toBe(
      inline ? "inlineMath" : "mathBlock",
    );
    expect(editor.getText()).toContain("Before");
    expect(editor.getText()).toContain("after");
    editor.commands.undo();
    expect(editor.getText()).toBe("Before after");
    editor.destroy();
  },
);
