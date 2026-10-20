import { Columns, Column } from "./columns";
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { X } from "lucide-react";
import { MathBlock, InlineMath, Graph, Callout, PageBreak } from "./nodes";
import { ImageBlock, ImagePlaceholder, ToggleHeading, ToggleBody } from "./blocks";
import { AttachmentBlock, AttachmentPreview, type Attachment } from "./attachments";
import { documentContent } from "./document";
import type { Note } from "@/lib/notes";
export function ReferencePane({
  notes,
  selected,
  attachment,
  onSelect,
  onClose,
}: {
  notes: Note[];
  selected: string;
  attachment: Attachment | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const note = notes.find((n) => n.id === selected);
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      Columns,
      Column,
      StarterKit,
      TaskList,
      TaskItem,
      TextStyle,
      Color,
      Highlight,
      MathBlock,
      InlineMath,
      Graph,
      Callout,
      PageBreak,
      ImageBlock,
      ImagePlaceholder,
      ToggleHeading,
      ToggleBody,
      AttachmentBlock,
    ],
    editorProps: { attributes: { class: "lemma-prose reference-prose" } },
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (editor && !editor.isDestroyed)
        editor.commands.setContent(
          note ? documentContent(note) : { type: "doc", content: [{ type: "paragraph" }] },
        );
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, note]);
  return (
    <aside className="reference-pane" aria-label="Reference pane">
      <header>
        <strong>{attachment ? attachment.name : "Read beside your note"}</strong>
        <button onClick={onClose} aria-label="Close reference pane">
          <X size={18} />
        </button>
      </header>
      <select
        aria-label="Choose reference note"
        value={attachment ? "" : selected}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Choose a note…</option>
        {notes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
      <div className="reference-body">
        {attachment ? (
          <AttachmentPreview attachment={attachment} />
        ) : note ? (
          <>
            <h2>{note.title}</h2>
            <EditorContent editor={editor} />
          </>
        ) : (
          <p>Choose a note above, or open an attached document beside your work.</p>
        )}
      </div>
    </aside>
  );
}
