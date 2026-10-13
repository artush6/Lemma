import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function Outline({
  items,
  onSelect,
}: {
  items: { title: string; level: number; position: number }[];
  onSelect: (position: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const workspace = root.current?.closest(".workspace");
    const scroll = workspace?.querySelector(".doc-scroll");
    if (!scroll) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const headings = workspace?.querySelectorAll(
          ".lemma-prose h1, .lemma-prose h2, .lemma-prose h3, .lemma-prose h4, .lemma-prose h5, .lemma-prose h6",
        );
        const horizontal = !!workspace?.closest(".page-direction-horizontal");
        const bounds = scroll.getBoundingClientRect();
        let active = items[0]?.position ?? null;
        headings?.forEach((heading, index) => {
          const r = heading.getBoundingClientRect();
          if (
            r.width &&
            r.height &&
            (horizontal ? r.left <= bounds.left + 160 : r.top <= bounds.top + 120)
          )
            active = items[index]?.position ?? active;
        });
        setSelected(active);
      });
    };
    scroll.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      scroll.removeEventListener("scroll", update);
    };
  }, [items]);
  return (
    <aside
      ref={root}
      className="compact-outline"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        variant="ghost"
        className="outline-rail"
        style={{ height: `min(65vh, ${items.length * 9 + 20}px)` }}
        aria-label="Document outline"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
      >
        {items.map((item) => (
          <span
            key={item.position}
            className={`outline-mark level-${item.level} ${selected === item.position ? "active" : ""}`}
          />
        ))}
      </Button>
      {open && (
        <nav className="outline-popover" aria-label="Document contents">
          {items.map((item) => (
            <Button
              variant="ghost"
              key={item.position}
              className={`outline-entry level-${item.level} ${selected === item.position ? "active" : ""}`}
              onClick={() => {
                setSelected(item.position);
                onSelect(item.position);
              }}
            >
              {item.title || "Untitled section"}
            </Button>
          ))}
        </nav>
      )}
    </aside>
  );
}
