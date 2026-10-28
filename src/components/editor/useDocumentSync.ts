import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { loadDocument } from "./loadDocument";

/** Never leave a captured document replacement queued across a keystroke. */
export function useDocumentSync(
  editor: Editor | null,
  noteId: string | undefined,
  content: JSONContent | null,
  lastContent: RefObject<string>,
) {
  const loadedNoteId = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (!editor || !content || !noteId) return;
    const serialized = JSON.stringify(content);
    if (loadedNoteId.current !== noteId || lastContent.current !== serialized) {
      loadDocument(editor, content);
      lastContent.current = serialized;
      loadedNoteId.current = noteId;
    }
  }, [editor, noteId, content, lastContent]);
}
