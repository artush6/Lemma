import { Button } from "@/components/ui/button";
import { ArrowRight, FilePlus2, FolderPlus, Search, Star } from "lucide-react";
import type { Folder, Note } from "@/lib/notes";
import { NoteIcon } from "./NoteIcon";

type Props = {
  name: string;
  notes: Note[];
  folders: Folder[];
  onOpen: (note: Note) => void;
  onNewNote: () => void;
  onNewFolder: () => void;
  onSearch: () => void;
  onFavorites: () => void;
  onFolder: (id: string) => void;
};

const dayMs = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} min ago`;
  if (diff < dayMs) return `${Math.round(diff / 3_600_000)} h ago`;
  if (diff < 2 * dayMs) return "Yesterday";
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function Home({
  name,
  notes,
  folders,
  onOpen,
  onNewNote,
  onNewFolder,
  onSearch,
  onFavorites,
  onFolder,
}: Props) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const sorted = [...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const last = sorted[0];
  const recent = sorted.slice(last ? 1 : 0, 6);
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name || "Notes";

  // Snapshot of each note’s most recent edit; this is not a full activity log.
  const today = startOfDay(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    const day = date.getTime();
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const count = notes.filter((n) => {
      const t = new Date(n.updated_at).getTime();
      return t >= day && t < next.getTime();
    }).length;
    return { day, count, label: new Date(day).toLocaleDateString([], { weekday: "narrow" }) };
  });
  const max = Math.max(1, ...week.map((d) => d.count));
  const activeDays = week.filter((d) => d.count > 0).length;

  const actions = [
    { label: "New note", hint: "", icon: FilePlus2, run: onNewNote },
    { label: "New folder", hint: "", icon: FolderPlus, run: onNewFolder },
    { label: "Search", hint: "⇧⌘ P", icon: Search, run: onSearch },
    { label: "Favorites", hint: "", icon: Star, run: onFavorites },
  ];

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <h1>
            {greeting}, {name}.
          </h1>
          <p>{last ? "Here’s where you left off." : "A calm place to start writing."}</p>
        </div>
        <time className="home-date">
          {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
        </time>
      </header>

      <nav className="home-actions" aria-label="Quick actions">
        {actions.map(({ label, hint, icon: Icon, run }) => (
          <Button variant="ghost" key={label} className="home-action" onClick={run}>
            <Icon size={15} />
            <span>{label}</span>
            {hint && <kbd>{hint}</kbd>}
          </Button>
        ))}
      </nav>

      {last && (
        <Button variant="ghost" className="home-continue" onClick={() => onOpen(last)}>
          <span className="home-eyebrow">Continue writing</span>
          <strong>{last.title || "Untitled"}</strong>
          <small>
            {folderName(last.folder_id)} · edited {relative(last.updated_at)}
          </small>
          <span className="home-continue-cta">
            Open <ArrowRight size={14} />
          </span>
        </Button>
      )}

      <div className="home-grid">
        <section className="home-card">
          <h2>Recent notes</h2>
          {recent.length === 0 && <p className="home-empty">Your recent notes will appear here.</p>}
          {recent.map((n) => (
            <Button variant="ghost" key={n.id} className="home-note" onClick={() => onOpen(n)}>
              <span className="home-note-icon">
                <NoteIcon icon={(n as Note & { icon?: string }).icon ?? "📄"} />
              </span>
              <span className="home-note-copy">
                <strong>{n.title || "Untitled"}</strong>
                <small>
                  {folderName(n.folder_id)} · {relative(n.updated_at)}
                </small>
              </span>
            </Button>
          ))}
        </section>

        <section className="home-card">
          <h2>This week</h2>
          <div className="home-week-summary">
            <strong>{activeDays}</strong>
            <span>/ 7 days with updated notes</span>
          </div>
          <div className="home-bars" aria-hidden="true">
            {week.map((d) => (
              <span key={d.day} className={d.day === today ? "today" : ""}>
                <i
                  style={{
                    height: `${Math.max(8, (d.count / max) * 100)}%`,
                    opacity: d.count ? 1 : 0.35,
                  }}
                />
                <em>{d.label}</em>
              </span>
            ))}
          </div>
          {folders.filter((f) => !f.parent_id).length > 0 && (
            <>
              <h2 className="home-sub">Spaces</h2>
              <div className="home-spaces">
                {folders
                  .filter((f) => !f.parent_id)
                  .slice(0, 6)
                  .map((f) => (
                    <Button variant="ghost" key={f.id} onClick={() => onFolder(f.id)}>
                      <i
                        className={`space-dot space-${(f as Folder & { color?: string }).color || "blue"}`}
                      />
                      {f.name}
                    </Button>
                  ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
