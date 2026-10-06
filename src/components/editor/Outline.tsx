import { useState } from "react";
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
  return (
    <aside
      className="compact-outline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        variant="ghost"
        className="outline-rail"
        aria-label="Document outline"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
      >
        {items.slice(0, 32).map((item) => (
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
