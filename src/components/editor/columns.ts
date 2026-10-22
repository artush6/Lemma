import { Node, mergeAttributes } from "@tiptap/core";
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  draggable: true,
  addKeyboardShortcuts() {
    const move = (direction: number) => {
      const { $from, empty } = this.editor.state.selection;
      if (!empty) return false;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name !== "column") continue;
        const parent = $from.node(depth - 1),
          index = $from.index(depth - 1),
          target = index + direction;
        if (target < 0 || target >= parent.childCount) return false;
        let pos = $from.before(depth);
        if (direction > 0) pos += $from.node(depth).nodeSize;
        else pos -= parent.child(target).nodeSize;
        return this.editor.commands.setTextSelection(pos + 2);
      }
      return false;
    };
    return {
      "Mod-Alt-ArrowRight": () => move(1),
      "Mod-Alt-ArrowLeft": () => move(-1),
      "Mod-Enter": () => {
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type !== this.type) continue;
          const after = $from.after(depth);
          const next = this.editor.state.doc.nodeAt(after);
          if (next?.type.name === "paragraph" && next.content.size === 0)
            return this.editor.commands.setTextSelection(after + 1);
          return this.editor
            .chain()
            .insertContentAt(after, { type: "paragraph" })
            .setTextSelection(after + 1)
            .run();
        }
        return false;
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-type="columns"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-type": "columns",
      style: `--column-count:${node.childCount}`,
    }),
    0,
  ],
});
export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="column"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "column" }),
    0,
  ],
});
export function columnContent(count: number) {
  return {
    type: "columns",
    content: Array.from({ length: count }, () => ({
      type: "column",
      content: [{ type: "paragraph" }],
    })),
  };
}
