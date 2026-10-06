import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { NoteIcon } from "./NoteIcon";

const ICONS: Record<string, string[]> = {
  Maths: [
    "∑",
    "∫",
    "π",
    "∞",
    "√",
    "Δ",
    "λ",
    "θ",
    "ƒ",
    "≈",
    "∂",
    "∇",
    "📐",
    "📏",
    "🧮",
    "📈",
    "📉",
    "📊",
  ],
  Study: [
    "📄",
    "📝",
    "📓",
    "📔",
    "📒",
    "📕",
    "📗",
    "📘",
    "📙",
    "📚",
    "🗂️",
    "📎",
    "🖊️",
    "✏️",
    "🔖",
    "🎓",
    "🧠",
    "💡",
  ],
  Science: [
    "🔬",
    "🧪",
    "⚗️",
    "🧬",
    "🔭",
    "⚛️",
    "🌍",
    "🌡️",
    "🧲",
    "⚡",
    "🔋",
    "💻",
    "🖥️",
    "⌨️",
    "🤖",
    "🛰️",
    "🧫",
    "🦠",
  ],
  Things: [
    "⭐",
    "🔥",
    "✅",
    "❗",
    "❓",
    "🎯",
    "🚀",
    "🏆",
    "🧩",
    "🎨",
    "🎵",
    "⚽",
    "🥋",
    "☕",
    "🍀",
    "🌙",
    "☀️",
    "🌈",
  ],
};

export function IconPicker({
  icon,
  onChange,
  readOnly,
}: {
  icon: string;
  onChange: (icon: string) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="doc-icon-wrap" ref={root}>
      <button
        className="doc-icon"
        title="Change icon"
        disabled={readOnly}
        onClick={() => setOpen((v) => !v)}
      >
        <NoteIcon icon={icon} />
      </button>
      {open && (
        <div className="icon-picker" role="dialog" aria-label="Choose an icon">
          <div className="icon-picker-head">
            <input
              autoFocus
              placeholder="Type any emoji or symbol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) {
                  onChange(Array.from(q.trim())[0] ?? q.trim());
                  setOpen(false);
                }
              }}
            />
            <button
              onClick={() => {
                onChange("📄");
                setOpen(false);
              }}
            >
              Reset
            </button>
          </div>
          {Object.entries(ICONS).map(([group, list]) => (
            <section key={group}>
              <div className="icon-picker-group">{group}</div>
              <div className="icon-picker-grid">
                {list.map((i) => (
                  <button
                    key={i}
                    className={i === icon ? "active" : ""}
                    onClick={() => {
                      onChange(i);
                      setOpen(false);
                    }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function TagRow({
  tags,
  onChange,
  readOnly,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const commit = () => {
    const t = v.trim().toLowerCase().slice(0, 32);
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setV("");
    setAdding(false);
  };
  return (
    <div className="tag-row">
      {tags.map((t) => (
        <span key={t} className="tag-chip">
          {t}
          {!readOnly && (
            <button title="Remove tag" onClick={() => onChange(tags.filter((x) => x !== t))}>
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      {!readOnly &&
        (adding ? (
          <input
            className="tag-input"
            autoFocus
            value={v}
            placeholder="tag"
            onChange={(e) => setV(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setV("");
                setAdding(false);
              }
            }}
          />
        ) : (
          <button className="tag-add" title="Add tag" onClick={() => setAdding(true)}>
            <Plus size={13} />
            {tags.length ? "" : " Add tag"}
          </button>
        ))}
    </div>
  );
}
