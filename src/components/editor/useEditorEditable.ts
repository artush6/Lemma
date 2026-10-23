import { useCallback, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";
/** Node views must react to Read/Edit changes even when document content is unchanged. */
export function useEditorEditable(editor: Editor) {
  const subscribe = useCallback(
    (notify: () => void) => {
      editor.on("update", notify);
      editor.on("transaction", notify);
      return () => {
        editor.off("update", notify);
        editor.off("transaction", notify);
      };
    },
    [editor],
  );
  return useSyncExternalStore(
    subscribe,
    () => editor.isEditable,
    () => false,
  );
}
