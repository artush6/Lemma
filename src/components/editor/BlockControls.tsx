import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { GripVertical, Plus } from "lucide-react";
export function moveBlock(editor: Editor, from: number, target: number) {
  const node = editor.state.doc.nodeAt(from);
  if (!node || (target >= from && target <= from + node.nodeSize)) return;
  const tr = editor.state.tr.delete(from, from + node.nodeSize);
  const to = target > from ? target - node.nodeSize : target;
  tr.insert(to, node);
  tr.setSelection(NodeSelection.create(tr.doc, to));
  editor.view.dispatch(tr);
  editor.commands.focus();
}
export function BlockControls({ editor, onInsert }: { editor: Editor; onInsert: () => void }) {
  const [block, setBlock] = useState<{ pos: number; top: number; left: number } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = (event?: MouseEvent) => {
      if (!editor.isEditable) return;
      let pos = editor.state.selection.from;
      if (event) {
        const found = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!found) return;
        pos = found.pos;
      }
      const resolved = editor.state.doc.resolve(pos);
      const start = resolved.depth ? resolved.before(1) : pos;
      const el = editor.view.nodeDOM(start);
      if (!(el instanceof HTMLElement)) return;
      const rect = el.getBoundingClientRect();
      setBlock({ pos: start, top: rect.top, left: Math.max(4, rect.left - 54) });
    };
    const hover = (e: MouseEvent) => {
      if (!open) update(e);
    };
    const refresh = () => {
      if (!open) update();
    };
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        editor.commands.focus();
      }
    };
    editor.view.dom.addEventListener("mousemove", hover);
    editor.on("selectionUpdate", refresh);
    editor.on("update", refresh);
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    window.addEventListener("keydown", close);
    return () => {
      editor.view.dom.removeEventListener("mousemove", hover);
      editor.off("selectionUpdate", refresh);
      editor.off("update", refresh);
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("keydown", close);
    };
  }, [editor, open]);
  if (!block || !editor.isEditable) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (!node) return null;
  const run = (action: string) => {
    const { pos } = block;
    const end = pos + node.nodeSize;
    if (action === "Duplicate") editor.commands.insertContentAt(end, node.toJSON());
    if (action === "Delete") editor.commands.deleteRange({ from: pos, to: end });
    if (action === "Move up" && pos > 0)
      moveBlock(editor, pos, pos - editor.state.doc.resolve(pos).nodeBefore!.nodeSize);
    if (action === "Move down") {
      const next = editor.state.doc.nodeAt(end);
      if (next) moveBlock(editor, pos, end + next.nodeSize);
    }
    setOpen(false);
  };
  return (
    <div className="block-controls" style={{ top: block.top, left: block.left }}>
      <button
        title="Insert below"
        aria-label="Insert block below"
        onClick={() => {
          editor
            .chain()
            .focus()
            .insertContentAt(block.pos + node.nodeSize, { type: "paragraph" })
            .setTextSelection(block.pos + node.nodeSize + 1)
            .run();
          onInsert();
        }}
      >
        <Plus size={16} />
      </button>
      <button
        draggable
        title="Drag to move · click for actions"
        aria-label="Block actions"
        aria-expanded={open}
        onClick={() => {
          editor.commands.setNodeSelection(block.pos);
          setOpen((v) => !v);
        }}
        onDragStart={(e) => {
          editor.commands.setNodeSelection(block.pos);
          e.dataTransfer.setData("text/plain", node.textContent || node.type.name);
          e.dataTransfer.effectAllowed = "move";
          const origin = block.pos;
          const drop = (event: DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const found = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (found) {
              const resolved = editor.state.doc.resolve(found.pos);
              const start = resolved.depth ? resolved.before(1) : found.pos;
              const el = editor.view.nodeDOM(start);
              const rect = el instanceof HTMLElement ? el.getBoundingClientRect() : null;
              const target =
                rect && event.clientY > rect.top + rect.height / 2
                  ? start + (editor.state.doc.nodeAt(start)?.nodeSize || 0)
                  : start;
              moveBlock(editor, origin, target);
            }
            cleanup();
          };
          const over = (event: DragEvent) => event.preventDefault();
          const cleanup = () => {
            editor.view.dom.removeEventListener("drop", drop, true);
            editor.view.dom.removeEventListener("dragover", over);
            window.removeEventListener("dragend", cleanup);
          };
          editor.view.dom.addEventListener("drop", drop, true);
          editor.view.dom.addEventListener("dragover", over);
          window.addEventListener("dragend", cleanup, { once: true });
        }}
      >
        <GripVertical size={16} />
      </button>
      {open && (
        <div className="block-actions" role="menu">
          {["Move up", "Move down", "Duplicate", "Delete"].map((action) => (
            <button role="menuitem" key={action} onClick={() => run(action)}>
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
