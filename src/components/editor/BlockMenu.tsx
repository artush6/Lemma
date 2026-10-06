import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";

export default function BlockMenu({ editor, children }: { editor: Editor; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 0, maxHeight: 0 });
  useLayoutEffect(() => {
    const update = () => {
      if (editor.isDestroyed || !ref.current) return;
      const caret = editor.view.coordsAtPos(editor.state.selection.from);
      const gap = 12;
      const below = window.innerHeight - caret.bottom - gap - 16;
      const above = caret.top - gap - 16;
      const useBelow = below >= 180 || below >= above;
      const maxHeight = Math.max(0, useBelow ? below : above);
      const height = Math.min(ref.current.scrollHeight, maxHeight);
      setPosition({
        left: Math.max(16, Math.min(caret.left, window.innerWidth - ref.current.offsetWidth - 16)),
        top: useBelow ? caret.bottom + gap : caret.top - gap - height,
        maxHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    editor.on("selectionUpdate", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      editor.off("selectionUpdate", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor]);
  return (
    <div ref={ref} className="slash-menu caret-block-menu" style={position}>
      {children}
    </div>
  );
}
