import type { Command } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

/** Select the new atom so its node view opens the source editor, without stored UI flags. */
export function insertEquation(inline: boolean): Command {
  return ({ tr, dispatch, state }) => {
    const type = state.schema.nodes[inline ? "inlineMath" : "mathBlock"];
    if (!type) return false;
    if (dispatch) {
      const equation = type.create({ latex: "" });
      tr.replaceSelectionWith(equation);
      tr.doc.descendants((node, pos) => {
        if (node === equation) tr.setSelection(NodeSelection.create(tr.doc, pos));
      });
      tr.scrollIntoView();
    }
    return true;
  };
}
