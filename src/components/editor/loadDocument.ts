import type { Editor, JSONContent } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

/** A loaded note starts a fresh undo history; undo must never restore another note. */
export function loadDocument(editor: Editor, content: JSONContent) {
  editor.commands.setContent(content, { emitUpdate: false });
  editor.view.updateState(
    EditorState.create({
      schema: editor.schema,
      doc: editor.state.doc,
      plugins: editor.state.plugins,
    }),
  );
}
