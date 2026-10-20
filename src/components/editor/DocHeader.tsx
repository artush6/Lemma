import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { NoteIcon } from "./NoteIcon";

import { iconCatalog, iconColors, decodeIcon } from "./iconCatalog";

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
  const [tab, setTab] = useState("icons");
  const [color, setColor] = useState(decodeIcon(icon).color || "default");
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
          <div className="icon-tabs">
            {["icons", "emoji"].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => {
                  setTab(t);
                  setQ("");
                }}
              >
                {t === "icons" ? "Icons" : "Emoji"}
              </button>
            ))}
          </div>
          <div className="icon-picker-head">
            <input
              autoFocus
              aria-label="Search icons or enter emoji"
              placeholder={tab === "icons" ? "Search icons…" : "Type an emoji or symbol…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tab === "emoji" && q.trim()) {
                  onChange(q.trim());
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
          {tab === "icons" && (
            <>
              <div className="icon-colors">
                {iconColors.map((c) => (
                  <button
                    key={c}
                    aria-label={`Color ${c}`}
                    aria-pressed={color === c}
                    style={{ background: c === "default" ? "var(--ink)" : c }}
                    onClick={() => {
                      setColor(c);
                      if (icon.startsWith("svg:")) onChange(`svg:${decodeIcon(icon).name}:${c}`);
                    }}
                  />
                ))}
              </div>
              <div className="icon-picker-grid svg-icon-grid">
                {Object.entries(iconCatalog)
                  .filter(([name]) =>
                    name.toLowerCase().includes(q.toLowerCase().replace(/\s/g, "")),
                  )
                  .map(([name, Icon]) => (
                    <button
                      key={name}
                      title={name}
                      aria-label={name}
                      onClick={() => {
                        onChange(`svg:${name}:${color}`);
                        setOpen(false);
                      }}
                    >
                      <Icon size={22} style={{ color: color === "default" ? undefined : color }} />
                    </button>
                  ))}
              </div>
              {Object.keys(iconCatalog).every(
                (name) => !name.toLowerCase().includes(q.toLowerCase().replace(/\s/g, "")),
              ) && <p>No icons found.</p>}
            </>
          )}
          {tab === "emoji" &&
            Object.entries(ICONS).map(([group, list]) => (
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
