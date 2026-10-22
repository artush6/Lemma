import type { Editor } from "@tiptap/core";
import { readAttachment } from "./attachments";
import { imageFileContent } from "./blocks";

export async function fileBlocks(files: File[]) {
  const blocks = [];
  for (const file of files) {
    if (/^image\//.test(file.type)) {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose an image smaller than 2 MB.");
      const image = await imageFileContent(file);
      if (!image) throw new Error("Choose a PNG, JPEG, GIF or WebP image.");
      blocks.push(image);
    } else blocks.push(await readAttachment(file));
  }
  return blocks;
}
/** The bookmark maps through intervening edits while a file is read or chosen. */
export function trackInsertion(editor: Editor) {
  let bookmark = editor.state.selection.getBookmark();
  const map = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => {
    bookmark = bookmark.map(transaction.mapping);
  };
  editor.on("transaction", map);
  return {
    restore() {
      if (!editor.isDestroyed)
        editor.view.dispatch(editor.state.tr.setSelection(bookmark.resolve(editor.state.doc)));
    },
    dispose() {
      editor.off("transaction", map);
    },
  };
}
