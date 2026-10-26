import { useState } from "react";
import { Home, PanelLeftClose, Plus, Search, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteIcon } from "../editor/NoteIcon";
import type { Note, Folder } from "@/lib/notes";

/** Library navigation for a document view that does not own an Editor sidebar. */
export function FileSidebar({
  notes,
  folders,
  onOpen,
  onLibrary,
  onCreate,
  onClose,
}: {
  notes: (Note & { icon?: string })[];
  folders: Folder[];
  onOpen: (note: Note) => void;
  onLibrary: () => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = notes.filter((note) =>
    (note.title || "Untitled").toLowerCase().includes(query.toLowerCase()),
  );
  const noteButton = (note: Note & { icon?: string }) => (
    <Button
      key={note.id}
      variant="ghost"
      className="note-item tree-note"
      onClick={() => onOpen(note)}
    >
      <NoteIcon {...(note.icon ? { icon: note.icon } : {})} className="tree-type-icon" />
      <span className="tree-note-title">{note.title || "Untitled"}</span>
    </Button>
  );
  return (
    <>
      <button className="sidebar-dismiss" aria-label="Close document sidebar" onClick={onClose} />
      <aside className="sidebar" aria-label="Document library">
        <div className="brand">
          <Button variant="ghost" className="brand-button" onClick={onLibrary}>
            <span className="brand-mark">λ</span>
            <span>lemma</span>
          </Button>
          <Button
            variant="ghost"
            className="icon-button sidebar-collapse"
            aria-label="Collapse document sidebar"
            onClick={onClose}
          >
            <PanelLeftClose size={16} />
          </Button>
        </div>
        <Button variant="ghost" className="new-note" onClick={onCreate}>
          <Plus size={15} />
          New note
        </Button>
        <Button variant="ghost" className="side-link" onClick={onLibrary}>
          <Home size={15} />
          All notes
        </Button>
        <label className="search-field">
          <Search size={14} />
          <input
            aria-label="Search document library"
            placeholder="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="notes-label">Folders & notes</div>
        <div className="notes-list folder-navigation">
          {folders
            .filter((folder) => !query || matches.some((note) => note.folder_id === folder.id))
            .map((folder) => (
              <div key={folder.id} className="folder-tree-node">
                <div className="folder-link">
                  <FolderIcon size={16} />
                  <span>{folder.name}</span>
                </div>
                <div className="folder-tree-children">
                  {matches.filter((note) => note.folder_id === folder.id).map(noteButton)}
                </div>
              </div>
            ))}
          {matches
            .filter((note) => !folders.some((folder) => folder.id === note.folder_id))
            .map(noteButton)}
          {!matches.length && (
            <p className="workspace-sidebar-empty">
              {query ? "No matching notes." : "No notes yet."}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
