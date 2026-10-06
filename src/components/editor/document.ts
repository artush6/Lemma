import type { JSONContent } from "@tiptap/react";
import type { Note } from "@/lib/notes";
import { pagesFor } from "@/lib/notes";

/** Legacy stored pages remain intact until the user edits; the canvas is one continuous document. */
export function documentContent(note: Note): JSONContent {
  const pages = pagesFor(note);
  return {
    type: "doc",
    content: pages.flatMap((page, i) => [
      ...(i ? [{ type: "pageBreak", attrs: { number: i + 1 } }] : []),
      ...(page.content?.content || [{ type: "paragraph" }]),
    ]),
  };
}
