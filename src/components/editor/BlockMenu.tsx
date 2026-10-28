import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Editor } from "@tiptap/react";

export default function BlockMenu({
  editor,
  children,
  onClose,
}: {
  editor: Editor;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onClose();
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [onClose]);
  const [position, setPosition] = useState({ left: 16, top: 0, maxHeight: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = 0;
    const update = () => {
      if (editor.isDestroyed) return;
      const caret = editor.view.coordsAtPos(editor.state.selection.from);
      const gap = 12;
      const below = window.innerHeight - caret.bottom - gap - 16;
      const above = caret.top - gap - 16;
      const useBelow = below >= 220 || below >= above;
      const maxHeight = Math.max(100, Math.min(500, useBelow ? below : above));
      const height = Math.min(element.scrollHeight, maxHeight);
      setPosition({
        left: Math.max(16, Math.min(caret.left, window.innerWidth - element.offsetWidth - 16)),
        top: useBelow ? caret.bottom + gap : Math.max(16, caret.top - gap - height),
        maxHeight,
      });
    };
    update();
    const frame = requestAnimationFrame(() => {
      element.scrollTop = 0;
      element.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      element.scrollTop = 0;
    });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    editor.on("selectionUpdate", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      editor.off("selectionUpdate", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor]);
  return (
    <motion.div
      ref={ref}
      className="slash-menu caret-block-menu"
      style={position}
      initial={{ opacity: 0, y: reduced ? 0 : 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
    >
      {children}
    </motion.div>
  );
}
