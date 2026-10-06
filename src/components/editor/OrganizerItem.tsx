import type { ReactNode } from 'react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import type { Folder } from '@/lib/notes';

export function OrganizerItem({ children, kind, id, dark, folders, onMove, onRename, onDelete, onNewNote, onNewFolder, onDuplicate }: {
  children: ReactNode; kind: 'note' | 'folder'; id: string; dark: boolean; folders: Folder[];
  onMove: (id: string, folder: string | null, kind: 'note' | 'folder') => void;
  onRename: () => void; onDelete: () => void; onNewNote?: () => void; onNewFolder?: () => void; onDuplicate?: () => void;
}) {
  return <ContextMenu><ContextMenuTrigger asChild><div className="organizer-item" draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('application/lemma-item', JSON.stringify({ id, kind })); e.dataTransfer.effectAllowed = 'move'; }} onDragOver={e => { if (kind === 'folder' && e.dataTransfer.types.includes('application/lemma-item')) { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drop-target'); } }} onDragLeave={e => e.currentTarget.classList.remove('drop-target')} onDrop={e => {
    e.currentTarget.classList.remove('drop-target'); if (kind !== 'folder') return; e.preventDefault(); e.stopPropagation();
    try { const data = JSON.parse(e.dataTransfer.getData('application/lemma-item')); if ((data.kind === 'folder' || data.kind === 'note') && typeof data.id === 'string') onMove(data.id, id, data.kind); } catch { /* Ignore unrelated drops. */ }
  }}>{children}</div></ContextMenuTrigger><ContextMenuContent className={`organizer-menu ${dark ? 'dark' : ''}`}>
    {onNewNote && <ContextMenuItem onSelect={onNewNote}>New note</ContextMenuItem>}
    {onNewFolder && <ContextMenuItem onSelect={onNewFolder}>New folder</ContextMenuItem>}
    <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem>
    {onDuplicate && <ContextMenuItem onSelect={onDuplicate}>Duplicate</ContextMenuItem>}
    <ContextMenuSub><ContextMenuSubTrigger>Move to</ContextMenuSubTrigger><ContextMenuSubContent className={`organizer-menu ${dark ? 'dark' : ''}`}><ContextMenuItem onSelect={() => onMove(id, null, kind)}>All notes</ContextMenuItem>{folders.filter(f => f.id !== id).map(f => <ContextMenuItem key={f.id} onSelect={() => onMove(id, f.id, kind)}>{f.name}</ContextMenuItem>)}</ContextMenuSubContent></ContextMenuSub>
    <ContextMenuSeparator /><ContextMenuItem onSelect={onDelete}>Delete</ContextMenuItem>
  </ContextMenuContent></ContextMenu>;
}