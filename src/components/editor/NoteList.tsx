import { Plus } from 'lucide-react';
import type { Folder, Note } from '@/lib/notes';

type Props = {
  notes: Note[];
  folders: Folder[];
  activeId: string | null;
  folderId: string | null;
  onOpen: (note: Note) => void;
  onCreate: () => void;
  tag?: string | null;
  onClearTag?: () => void;
};

const dayMs = 86_400_000;

function groupLabel(date: Date, now: Date) {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= startToday) return 'Today';
  if (t >= startToday - dayMs) return 'Yesterday';
  if (t >= startToday - 6 * dayMs) return 'This week';
  if (t >= startToday - 29 * dayMs) return 'This month';
  return 'Older';
}

function timeLabel(date: Date, group: string) {
  if (group === 'Today') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (group === 'Yesterday' || group === 'This week') return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

type Json = { text?: string; type?: string; content?: Json[]; attrs?: Record<string, unknown> };
function preview(note: Note): string {
  const out: string[] = [];
  const walk = (n: Json) => {
    if (out.join(' ').length > 120) return;
    if (n.type === 'heading') return;
    if (n.text) out.push(n.text);
    if (n.type === 'inlineMath' && typeof n.attrs?.['latex'] === 'string') out.push(n.attrs['latex'] as string);
    n.content?.forEach(walk);
  };
  const pages = (note.pages?.length ? note.pages.map((p) => p.content) : [note.content]) as Json[];
  pages.forEach(walk);
  return out.join(' ').replace(/\s+/g, ' ').trim() || 'Empty note';
}

export default function NoteList({ notes, folders, activeId, folderId, onOpen, onCreate, tag, onClearTag }: Props) {
  const folder = folders.find((f) => f.id === folderId);
  const now = new Date();
  const scoped = folderId && !tag ? notes.filter((n) => n.folder_id === folderId) : notes;
  const sorted = [...scoped].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  const groups: { label: string; items: Note[] }[] = [];
  for (const n of sorted) {
    const label = groupLabel(new Date(n.updated_at), now);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return (
    <aside className="note-column" aria-label="Notes">
      <header className="note-column-head">
        <h2>{tag ? `#${tag}` : folder?.name || 'All notes'}</h2>
        {tag && <button className="note-column-clear" onClick={onClearTag}>Clear</button>}
        <button className="note-column-add" title="New note" onClick={onCreate}>
          <Plus size={16} />
        </button>
      </header>
      <div className="note-column-scroll">
        {groups.length === 0 && <p className="note-column-empty">No notes yet.</p>}
        {groups.map((g) => (
          <section key={g.label}>
            <div className="note-column-group">{g.label}</div>
            {g.items.map((n) => (
              <button
                key={n.id}
                className={`note-card ${n.id === activeId ? 'active' : ''}`}
                onClick={() => onOpen(n)}
              >
                <span className="note-card-icon">{(n as Note & { icon?: string }).icon || '📄'}</span>
                <span className="note-card-body">
                  <span className="note-card-top">
                    <strong>{n.title || 'Untitled'}</strong>
                    <time>{timeLabel(new Date(n.updated_at), g.label)}</time>
                  </span>
                  <span className="note-card-preview">{preview(n)}</span>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
