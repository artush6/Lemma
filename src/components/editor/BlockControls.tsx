import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  GripVertical,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Palette,
  ChevronRight,
} from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);
  const reduced = useReducedMotion();
  const previousSelection = useRef<{ from: number; to: number } | null>(null);
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
      let depth = resolved.depth;
      while (
        depth > 1 &&
        ["column", "columns", "toggleBody"].includes(resolved.node(depth).type.name)
      )
        depth--;
      const start = depth ? resolved.before(depth) : pos;
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
    const outside = (event: MouseEvent) => {
      if (event.target instanceof HTMLElement && !event.target.closest(".block-controls"))
        setOpen(false);
    };
    window.addEventListener("mousedown", outside);
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
      window.removeEventListener("mousedown", outside);
    };
  }, [editor, open]);
  if (!block || !editor.isEditable) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (!node) return null;
  const run = (action: string) => {
    const { pos } = block;
    const end = pos + node.nodeSize;
    if (action.startsWith("Turn into ")) {
      editor.commands.setTextSelection(
        previousSelection.current || Math.min(pos + 1, editor.state.doc.content.size),
      );
      const kind = action.slice(10);
      const chain = editor.chain().focus(undefined, { scrollIntoView: false });
      if (kind === "Text") chain.setParagraph().run();
      if (kind === "Heading 1") chain.setHeading({ level: 1 }).run();
      if (kind === "Heading 2") chain.setHeading({ level: 2 }).run();
      if (kind === "Heading 3") chain.setHeading({ level: 3 }).run();
      if (kind === "Bullet list") chain.toggleBulletList().run();
      if (kind === "Task list") chain.toggleTaskList().run();
      if (kind === "Quote") chain.toggleBlockquote().run();
    }
    if (action.startsWith("Color ")) {
      editor
        .chain()
        .setTextSelection({ from: pos + 1, to: Math.max(pos + 1, end - 1) })
        .setColor(action.slice(6))
        .run();
    }
    if (action === "Copy text")
      void navigator.clipboard
        .writeText(node.textContent)
        .catch(() => window.alert("Text could not be copied. Select it and use Copy."));
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
          const { from, to } = editor.state.selection;
          previousSelection.current =
            from > block.pos && to < block.pos + node.nodeSize ? { from, to } : null;
          editor.commands.setNodeSelection(block.pos);
          setQuery("");
          setTurnIntoOpen(false);
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
      <AnimatePresence>
        {open && (
          <motion.div
            className="block-actions"
            role="menu"
            aria-label="Block actions"
            initial={{ opacity: 0, y: reduced ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.14 }}
            style={{
              maxHeight: Math.max(
                120,
                Math.min(
                  560,
                  window.innerHeight - block.top > 300
                    ? window.innerHeight - block.top - 48
                    : block.top - 24,
                ),
              ),
              overflowY: "auto",
              ...(window.innerHeight - block.top > 300 ? { top: 32 } : { top: "auto", bottom: 4 }),
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
              );
              const current = items.indexOf(document.activeElement as HTMLButtonElement);
              items[
                (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
              ]?.focus();
            }}
          >
            <input
              autoFocus
              aria-label="Search block actions"
              placeholder="Search actions…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="block-menu-caption">
              {node.type.name.replace(/([A-Z])/g, " $1")} ·{" "}
              {node.textContent.split(/\s+/).filter(Boolean).length} words
            </span>
            {node.isTextblock && (!query || "turn into".includes(query.toLowerCase())) && (
              <>
                <button
                  role="menuitem"
                  aria-expanded={turnIntoOpen}
                  aria-controls="block-turn-into"
                  onClick={() => setTurnIntoOpen((value) => !value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      setTurnIntoOpen(true);
                    }
                  }}
                >
                  <Type size={15} />
                  <span>Turn into…</span>
                  <ChevronRight size={14} className={turnIntoOpen ? "is-expanded" : ""} />
                </button>
                <AnimatePresence initial={false}>
                  {turnIntoOpen && (
                    <motion.div
                      id="block-turn-into"
                      className="block-turn-into"
                      role="menu"
                      aria-label="Turn into"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.16 }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          setTurnIntoOpen(false);
                          document
                            .querySelector<HTMLButtonElement>('[aria-controls="block-turn-into"]')
                            ?.focus();
                        }
                      }}
                    >
                      {[
                        "Text",
                        "Heading 1",
                        "Heading 2",
                        "Heading 3",
                        "Bullet list",
                        "Task list",
                        "Quote",
                      ].map((kind) => (
                        <button role="menuitem" key={kind} onClick={() => run(`Turn into ${kind}`)}>
                          <span>{kind}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            {["Copy text", "Move up", "Move down", "Duplicate", "Delete"]
              .filter((action) => action.toLowerCase().includes(query.toLowerCase()))
              .map((action) => (
                <button
                  role="menuitem"
                  key={action}
                  className={action === "Delete" ? "is-destructive" : ""}
                  disabled={
                    (action === "Move up" && block.pos === 0) ||
                    (action === "Move down" && !editor.state.doc.nodeAt(block.pos + node.nodeSize))
                  }
                  onClick={() => run(action)}
                >
                  {action.startsWith("Turn into") ? (
                    <Type size={15} />
                  ) : action === "Delete" ? (
                    <Trash2 size={15} />
                  ) : action === "Move up" ? (
                    <ArrowUp size={15} />
                  ) : action === "Move down" ? (
                    <ArrowDown size={15} />
                  ) : (
                    <Copy size={15} />
                  )}
                  <span>{action}</span>
                </button>
              ))}
            {!query && (
              <>
                <span className="block-menu-caption">
                  <Palette size={13} />
                  Text color
                </span>
                <div className="block-color-actions">
                  {[
                    ["Default", "var(--ink)"],
                    ["Red", "#c24141"],
                    ["Orange", "#b45309"],
                    ["Green", "#16803e"],
                    ["Blue", "#2563eb"],
                  ].map(([label, color]) => (
                    <button
                      key={label}
                      title={label}
                      aria-label={`Text color ${label}`}
                      style={{ color }}
                      onClick={() => run(`Color ${color}`)}
                    >
                      A
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
