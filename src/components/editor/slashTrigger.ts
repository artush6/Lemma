import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";

/** Track only the slash that opened this menu, never a neighbouring literal slash. */
export function trackSlashTrigger(editor: Editor, position: number) {
  let from = position;
  let to = position + 1;
  let valid = true;
  const map = ({ transaction }: { transaction: Transaction }) => {
    const start = transaction.mapping.mapResult(from, 1);
    const end = transaction.mapping.mapResult(to, -1);
    valid = valid && !start.deleted && !end.deleted;
    from = start.pos;
    to = end.pos;
  };
  editor.on("transaction", map);
  const dispose = () => editor.off("transaction", map);
  return {
    dispose,
    consume() {
      dispose();
      if (
        !editor.isDestroyed &&
        valid &&
        to === from + 1 &&
        editor.state.doc.textBetween(from, to) === "/"
      )
        editor.commands.deleteRange({ from, to });
    },
  };
}
