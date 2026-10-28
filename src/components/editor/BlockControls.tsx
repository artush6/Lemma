import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import * as Menu from "@radix-ui/react-dropdown-menu";
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
  ArrowRightLeft,
  ArrowLeft,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Quote,
  Check,
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
  const [activeSubmenu, setActiveSubmenu] = useState<"turn" | "color" | null>(null);
  const controls = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const interactedOutside = useRef(false);
  const previousSelection = useRef<{ from: number; to: number } | null>(null);
  useEffect(() => {
    const update = (event?: MouseEvent) => {
      if (!editor.isEditable || !editor.view.dom.getBoundingClientRect().width) {
        setBlock(null);
        return;
      }
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
      const viewport = editor.view.dom.closest(".doc-scroll")?.getBoundingClientRect();
      if (viewport && (rect.bottom <= viewport.top || rect.top >= viewport.bottom)) {
        setBlock(null);
        return;
      }
      setBlock({ pos: start, top: rect.top, left: Math.max(4, rect.left - 54) });
    };
    const hover = (e: MouseEvent) => {
      if (!open) update(e);
    };
    const refresh = () => {
      if (!open) update();
    };
    editor.view.dom.addEventListener("mousemove", hover);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    window.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    return () => {
      editor.view.dom.removeEventListener("mousemove", hover);
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
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
      if (kind === "Numbered list") chain.toggleOrderedList().run();
      if (kind === "Code") chain.toggleCodeBlock().run();
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
  const normalizedQuery = query.trim().toLowerCase();
  const conversions = [
    { label: "Text", icon: Type, active: node.type.name === "paragraph" },
    {
      label: "Heading 1",
      icon: Heading1,
      active: node.type.name === "heading" && node.attrs["level"] === 1,
    },
    {
      label: "Heading 2",
      icon: Heading2,
      active: node.type.name === "heading" && node.attrs["level"] === 2,
    },
    {
      label: "Heading 3",
      icon: Heading3,
      active: node.type.name === "heading" && node.attrs["level"] === 3,
    },
    { label: "Bullet list", icon: List, active: node.type.name === "bulletList" },
    { label: "Numbered list", icon: ListOrdered, active: node.type.name === "orderedList" },
    { label: "Task list", icon: ListTodo, active: node.type.name === "taskList" },
    { label: "Code", icon: Code, active: node.type.name === "codeBlock" },
    { label: "Quote", icon: Quote, active: node.type.name === "blockquote" },
  ];
  const blockLabel =
    conversions.find(({ active }) => active)?.label || node.type.name.replace(/([A-Z])/g, " $1");
  const actions = [
    { label: "Copy text", icon: Copy },
    { label: "Duplicate", icon: Copy },
    { label: "Move up", icon: ArrowUp },
    { label: "Move down", icon: ArrowDown },
    { label: "Delete", icon: Trash2 },
  ];
  const changeOpen = (value: boolean) => {
    if (value) {
      interactedOutside.current = false;
      const { from, to } = editor.state.selection;
      previousSelection.current =
        from > block.pos && to < block.pos + node.nodeSize ? { from, to } : null;
      editor.commands.setNodeSelection(block.pos);
      setQuery("");
    }
    if (!value) setActiveSubmenu(null);
    setOpen(value);
  };
  return (
    <div ref={controls} className="block-controls" style={{ top: block.top, left: block.left }}>
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
      <Menu.Root modal={false} open={open} onOpenChange={changeOpen}>
        <Menu.Trigger asChild>
          <button
            draggable
            onPointerDownCapture={(event) => {
              // Keep native drag initiation; Radix normally prevents pointer-down on its trigger.
              event.stopPropagation();
            }}
            onClick={() => changeOpen(!open)}
            title="Drag to move · click for actions"
            aria-label="Block actions"
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
        </Menu.Trigger>
        <Menu.Portal container={controls.current}>
          <Menu.Content
            className="block-actions"
            aria-label="Block actions"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            onFocus={(event) => {
              if (event.target === event.currentTarget) search.current?.focus();
            }}
            onInteractOutside={() => {
              interactedOutside.current = true;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!interactedOutside.current)
                editor.commands.focus(undefined, { scrollIntoView: false });
            }}
          >
            <input
              ref={search}
              aria-label="Search block actions"
              placeholder="Search actions…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const items = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
                    '[role="menuitem"]:not([data-disabled])',
                  );
                  (event.key === "ArrowDown" ? items?.[0] : items?.[items.length - 1])?.focus();
                }
                if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
              }}
            />
            <Menu.Label className="block-menu-caption">{blockLabel}</Menu.Label>
            {node.isTextblock && (!query || "turn into".includes(normalizedQuery)) && (
              <Menu.Sub
                open={activeSubmenu === "turn"}
                onOpenChange={(value) => setActiveSubmenu(value ? "turn" : null)}
              >
                <Menu.SubTrigger className="block-action-item">
                  <ArrowRightLeft size={17} />
                  <span>Turn into</span>
                  <ChevronRight size={15} />
                </Menu.SubTrigger>
                <Menu.Portal container={controls.current}>
                  <Menu.SubContent
                    className="block-actions block-actions-submenu"
                    sideOffset={4}
                    collisionPadding={12}
                    aria-label="Turn into"
                  >
                    <Menu.Item
                      className="block-action-item block-submenu-back"
                      onSelect={(event) => {
                        event.preventDefault();
                        setActiveSubmenu(null);
                      }}
                    >
                      <ArrowLeft size={17} />
                      <span>Turn into</span>
                    </Menu.Item>
                    {conversions.map(({ label, icon: Icon, active }) => (
                      <Menu.Item
                        key={label}
                        className="block-action-item"
                        onSelect={() => run(`Turn into ${label}`)}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                        {active && <Check size={16} aria-label="Current block type" />}
                      </Menu.Item>
                    ))}
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
            )}
            {node.isTextblock &&
              query &&
              conversions
                .filter(({ label }) => label.toLowerCase().includes(normalizedQuery))
                .map(({ label, icon: Icon }) => (
                  <Menu.Item
                    key={label}
                    className="block-action-item"
                    onSelect={() => run(`Turn into ${label}`)}
                  >
                    <Icon size={18} />
                    <span>Turn into {label}</span>
                  </Menu.Item>
                ))}
            {(!query || "color".includes(normalizedQuery)) && (
              <Menu.Sub
                open={activeSubmenu === "color"}
                onOpenChange={(value) => setActiveSubmenu(value ? "color" : null)}
              >
                <Menu.SubTrigger className="block-action-item">
                  <Palette size={17} />
                  <span>Color</span>
                  <ChevronRight size={15} />
                </Menu.SubTrigger>
                <Menu.Portal container={controls.current}>
                  <Menu.SubContent
                    className="block-actions block-actions-submenu"
                    sideOffset={4}
                    collisionPadding={12}
                    aria-label="Text color"
                  >
                    <Menu.Item
                      className="block-action-item block-submenu-back"
                      onSelect={(event) => {
                        event.preventDefault();
                        setActiveSubmenu(null);
                      }}
                    >
                      <ArrowLeft size={17} />
                      <span>Back</span>
                    </Menu.Item>
                    <Menu.Label className="block-menu-caption">Text color</Menu.Label>
                    {[
                      ["Default", "var(--ink)"],
                      ["Red", "#c24141"],
                      ["Orange", "#b45309"],
                      ["Green", "#16803e"],
                      ["Blue", "#2563eb"],
                    ].map(([label, color]) => (
                      <Menu.Item
                        key={label}
                        className="block-action-item"
                        onSelect={() => run(`Color ${color}`)}
                      >
                        <Type size={18} style={{ color }} />
                        <span>{label}</span>
                      </Menu.Item>
                    ))}
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
            )}
            {!query && <Menu.Separator className="block-action-separator" />}
            {actions
              .filter(({ label }) => label.toLowerCase().includes(normalizedQuery))
              .map(({ label, icon: Icon }) => (
                <Menu.Item
                  key={label}
                  className={`block-action-item${label === "Delete" ? " is-destructive" : ""}`}
                  disabled={
                    (label === "Move up" && block.pos === 0) ||
                    (label === "Move down" && !editor.state.doc.nodeAt(block.pos + node.nodeSize))
                  }
                  onSelect={() => run(label)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </Menu.Item>
              ))}
            {query &&
              !actions.some(({ label }) => label.toLowerCase().includes(normalizedQuery)) &&
              !(
                node.isTextblock &&
                ("turn into".includes(normalizedQuery) ||
                  conversions.some(({ label }) => label.toLowerCase().includes(normalizedQuery)))
              ) &&
              !"color".includes(normalizedQuery) && (
                <div className="block-menu-caption">No actions found</div>
              )}
            {!query && (
              <>
                <Menu.Separator className="block-action-separator" />
                <div className="block-menu-caption block-menu-stats">
                  {node.textContent.split(/\s+/).filter(Boolean).length} words ·{" "}
                  {node.textContent.length} characters
                </div>
              </>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
