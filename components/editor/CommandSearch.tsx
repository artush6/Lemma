'use client';
import { useRef, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import type { Note } from '@/lib/notes';
import Overlay from './Overlay';
export default function CommandSearch({ query, onQuery, results, folderName, onOpen, onClose }: {
    query: string;
    onQuery: (query: string) => void;
    results: Note[];
    folderName: (id: string | null) => string;
    onOpen: (note: Note) => void;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(0);
    const root = useRef<HTMLDivElement>(null);
    const visible = results.slice(0, 8);
    const selected = Math.min(index, Math.max(0, visible.length - 1));
    return <Overlay onClose={onClose}><div ref={root} className="command-search" role="dialog" aria-modal="true" aria-label="Search notes" onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const next = Math.max(0, Math.min(visible.length - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
                setIndex(next);
                root.current?.querySelectorAll('.command-results button')[next]?.scrollIntoView({ block: 'nearest' });
            }
            if (event.key === 'Enter' && event.target instanceof HTMLInputElement && visible[selected]) {
                event.preventDefault();
                onOpen(visible[selected]);
            }
        }}><label className="search-field"><Search size={18}/><input autoFocus aria-label="Search notes" placeholder="Search notes and their contents…" value={query} onChange={event => { onQuery(event.target.value); setIndex(0); }}/><kbd>ESC</kbd></label>
    <div className="command-results">{visible.map((note, position) => <button key={note.id} className={selected === position ? 'focused' : ''} onClick={() => onOpen(note)}><FileText size={15}/><strong>{note.title}</strong><small>{folderName(note.folder_id)}</small></button>)}{!visible.length && <p className="command-empty">No notes found. Try another title or phrase.</p>}</div>
    <footer><span><kbd>↑ ↓</kbd> to navigate · <kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></footer>
  </div></Overlay>;
}
