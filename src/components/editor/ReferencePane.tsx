import { WorkspaceSelect } from "@/components/ui/workspace-select";
import { ReferencePlacement } from "./ReferencePlacement";
import { openDocumentWindow } from "./documentWindow";
import { Columns, Column } from "./columns";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { X, FileUp } from "lucide-react";
import { MathBlock, InlineMath, Graph, Callout, PageBreak } from "./nodes";
import { ImageBlock, ImagePlaceholder, ToggleHeading, ToggleBody } from "./blocks";
import { AttachmentBlock, AttachmentPreview, readAttachment, type Attachment } from "./attachments";
import { documentContent } from "./document";
import type { Note } from "@/lib/notes";
export function ReferencePane({
  notes,
  selected,
  attachment,
  onSelect,
  onAttachment,
  onClose,
  side,
  onSide,
}: {
  notes: Note[];
  selected: string;
  attachment: Attachment | null;
  onSelect: (id: string) => void;
  onAttachment: (attachment: Attachment) => void;
  onClose: () => void;
  side: "left" | "right";
  onSide: (side: "left" | "right") => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const openFiles = async (files: File[]) => {
    if (!files[0]) return;
    try {
      const block = await readAttachment(files[0]);
      onAttachment(block.attrs as Attachment);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read PDF.");
    }
  };
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
    <aside
      className="reference-pane"
      aria-label="Reference pane"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void openFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <header>
        <strong>{attachment ? attachment.name : "Read beside your note"}</strong>
        <ReferencePlacement
          side={side}
          onSide={onSide}
          disabled={!attachment && !note}
          onWindow={async () => {
            try {
              if (attachment) {
                if (await openDocumentWindow(attachment)) onClose();
              } else if (note) {
                const url = new URL(window.location.href);
                url.search = "";
                url.searchParams.set("note", note.id);
                window.open(url.href, "_blank", "popup,width=1000,height=850,noopener,noreferrer");
              }
            } catch (error) {
              setError(error instanceof Error ? error.message : "Could not open a window.");
            }
          }}
        />
        <input
          hidden
          type="file"
          accept="application/pdf"
          ref={file}
          onChange={(event) => void openFiles(Array.from(event.target.files || []))}
        />
        <button
          onClick={() => file.current?.click()}
          aria-label="Open PDF beside note"
          title="Open PDF"
        >
          <FileUp size={18} />
        </button>
        <button onClick={onClose} aria-label="Close reference pane">
          <X size={18} />
        </button>
      </header>
      {error && (
        <p role="alert" className="attachment-error">
          {error}
        </p>
      )}
      {!attachment && (
        <WorkspaceSelect
          className="reference-note-select"
          label="Choose reference note"
          value={selected}
          onChange={onSelect}
          options={[
            { value: "", label: "Choose a note…" },
            ...notes.map((note) => ({ value: note.id, label: note.title || "Untitled" })),
          ]}
        />
      )}
      <div className="reference-body">
        {attachment ? (
          <AttachmentPreview attachment={attachment} />
        ) : note ? (
          <>
            <h2>{note.title}</h2>
            <EditorContent editor={editor} />
          </>
        ) : (
          <p>
            Choose a note above, drop a PDF here, or use the PDF button to read it beside your work.
          </p>
        )}
      </div>
    </aside>
  );
}
