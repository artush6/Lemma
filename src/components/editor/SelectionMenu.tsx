import { useEffect, useState } from "react";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bold, Italic, Code, Highlighter, Heading2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SelectionMenu({ editor }: { editor: Editor }) {
  const reduced = useReducedMotion();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const dom = editor.view.dom;
    let frame = 0;
    const update = () => {
      if (editor.isDestroyed || !dom.getBoundingClientRect().width) {
        setPosition(null);
        return;
      }
      const { from, to, empty } = editor.state.selection;
      if (
        !(editor.state.selection instanceof TextSelection) ||
        empty ||
        !editor.isEditable ||
        !editor.view.hasFocus() ||
        !editor.state.doc.textBetween(from, to).trim()
      ) {
        setPosition(null);
        return;
      }
      const a = editor.view.coordsAtPos(from),
        b = editor.view.coordsAtPos(to);
      const top = Math.min(a.top, b.top);
      setPosition({
        left: Math.max(12, Math.min((a.left + b.left) / 2 - 140, window.innerWidth - 292)),
        top: top > 64 ? top - 48 : Math.max(a.bottom, b.bottom) + 8,
      });
    };
    const focus = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    editor.on("selectionUpdate", update);
    editor.on("blur", update);
    editor.on("focus", update);
    editor.on("transaction", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    dom.addEventListener("mouseup", focus);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", update);
      editor.off("blur", update);
      editor.off("focus", update);
      editor.off("transaction", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      dom.removeEventListener("mouseup", focus);
    };
  }, [editor]);
  const actions = [
    {
      label: "Bold",
      Icon: Bold,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run(),
    },
    {
      label: "Italic",
      Icon: Italic,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run(),
    },
    {
      label: "Inline code",
      Icon: Code,
      active: editor.isActive("code"),
      run: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleCode().run(),
    },
    {
      label: "Highlight",
      Icon: Highlighter,
      active: editor.isActive("highlight"),
      run: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHighlight().run(),
    },
    {
      label: "Heading 2",
      Icon: Heading2,
      active: editor.isActive("heading", { level: 2 }),
      run: () =>
        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleHeading({ level: 2 })
          .run(),
    },
    {
      label: "Add link",
      Icon: Link2,
      active: editor.isActive("link"),
      run: () => {
        const url = window.prompt("Link URL", editor.getAttributes("link")["href"] || "https://");
        if (!url) return;
        try {
          const value = new URL(url);
          if (!["https:", "http:", "mailto:"].includes(value.protocol)) return;
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .setLink({ href: value.href })
            .run();
        } catch {
          /* Keep the selection when a link is invalid. */
        }
      },
    },
  ];
  return (
    <AnimatePresence>
      {position && (
        <motion.div
          className="selection-toolbar"
          role="toolbar"
          aria-label="Text formatting"
          style={position}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.12 }}
          onMouseDown={(event) => event.preventDefault()}
        >
          {actions.map(({ label, Icon, active, run }) => (
            <Button
              key={label}
              variant="ghost"
              aria-label={label}
              title={label}
              aria-pressed={active}
              onClick={run}
            >
              <Icon size={16} />
            </Button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
