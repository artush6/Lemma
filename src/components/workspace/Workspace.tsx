import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import {
  Plus,
  X,
  FileText,
  Code2,
  Layers,
  Home,
  FolderOpen,
  FileUp,
  Columns2,
  Focus,
  ArrowLeftRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { newNote, repository, type Note } from "@/lib/notes";
import { draftStorage } from "@/lib/draftStorage";
import AuthScreen from "@/components/auth/AuthScreen";
import Editor from "../editor/Editor";
import { SpaceSwitcher, type Space } from "../spaces/SpaceSwitcher";
import {
  AttachmentPreview,
  attachmentAccept,
  readAttachment,
  type Attachment,
} from "../editor/attachments";
import { ReferencePane } from "../editor/ReferencePane";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  initialLayout,
  openResource,
  closeTabs,
  moveTab,
  mergePanes,
  restoreLayout,
  opposite,
  type Layout,
  type Resource,
  type PaneId,
} from "./model";
import { getAttachment, storeAttachment } from "./attachmentStore";
const CodeLab = lazy(() => import("../spaces/CodeLab"));
const Flashcards = lazy(() => import("../spaces/Flashcards"));
const dragType = "application/x-lemma-workspace";
export type EmbeddedWorkspace = {
  noteId?: string | undefined;
  active: boolean;
  headerHost: HTMLElement | null;
  onOpen: (note: Note) => void;
  onChange: (note: Note) => void;
  externalNote?: Note | undefined;
  onRemoved: (id: string) => void;
  onLibrary: () => void;
  onCreate: (folder?: string | null) => void;
  onSpace: (space: Space) => void;
  onFocus: () => void;
  onDragNote: (event: DragEvent, note: Note) => void;
};
export function HeaderPortal({
  host,
  children,
}: {
  host?: HTMLElement | null;
  children: React.ReactNode;
}) {
  return host ? createPortal(children, host) : children;
}
function FileView({
  resource,
  owner,
  cached,
}: {
  resource: Extract<Resource, { kind: "attachment" }>;
  owner: string;
  cached?: Attachment | undefined;
}) {
  const [attachment, setAttachment] = useState(cached);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    if (!cached)
      void getAttachment(`${owner}:${resource.attachmentKey}`)
        .then((a) => {
          if (alive) {
            setAttachment(a);
            if (!a) setError("This device no longer has this file. Open it again with +.");
          }
        })
        .catch(() => {
          if (alive)
            setError("The file could not be restored from this device. Open it again with +.");
        });
    return () => {
      alive = false;
    };
  }, [cached, owner, resource.attachmentKey]);
  return (
    <div className="workspace-file">
      {error ? (
        <p role="alert">{error}</p>
      ) : attachment ? (
        <AttachmentPreview attachment={attachment} />
      ) : (
        <p role="status">Loading document…</p>
      )}
    </div>
  );
}
export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const shared = new URLSearchParams(location.search).has("share");
  useEffect(() => {
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user || null);
        setReady(true);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          if (error) setAuthError(error.message);
          setUser(data.session?.user || null);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setAuthError("Could not connect. Reload to retry.");
          setReady(true);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (shared) return <Editor />;
  if (!ready) return <p role="status">Loading workspace…</p>;
  if (!user)
    return (
      <>
        {authError && <p role="alert">{authError}</p>}
        <AuthScreen />
      </>
    );
  return <StudyWorkspace key={user.id} owner={user.id} />;
}
export function StudyWorkspace({ owner }: { owner: string }) {
  const storageKey = `lemma:${owner}:workspace:v1`;
  const [layout, setLayout] = useState<Layout>(() => {
    let state = initialLayout();
    try {
      state = restoreLayout(localStorage.getItem(storageKey));
    } catch {
      /* blocked device storage */
    }
    const params = new URLSearchParams(location.search);
    const noteId = params.get("note");
    if (noteId)
      state = openResource(state, { id: `note:${noteId}`, kind: "note", noteId, title: "Note" });
    const space = params.get("space");
    if (space === "code" || space === "cards")
      state = openResource(state, {
        id: space,
        kind: space,
        title: space === "code" ? "Code Lab" : "Flashcards",
      });
    return state;
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<Record<string, Attachment>>({});
  const [headerHost, setHeaderHost] = useState<HTMLDivElement | null>(null);
  const [focus, setFocus] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [narrow, setNarrow] = useState(window.innerWidth < 900);
  const [picker, setPicker] = useState<{ pane: PaneId; type: "all" } | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [drop, setDrop] = useState<{ pane: PaneId; edge: string } | null>(null);
  const [retained, setRetained] = useState<Resource[]>(layout.resources);
  const grid = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileTarget = useRef<PaneId>("left");
  const stateRef = useRef(layout);
  stateRef.current = layout;
  const visiblePanes: PaneId[] =
    layout.split && !narrow && !focus ? ["left", "right"] : [layout.activePane];
  const activeResource = layout.resources.find(
    (r) => r.id === layout.panes[layout.activePane].active,
  );
  const space: Space =
    activeResource?.kind === "code" || activeResource?.kind === "cards"
      ? activeResource.kind
      : "notes";
  const updateNote = useCallback((note: Note) => {
    setNotes((old) => [note, ...old.filter((n) => n.id !== note.id)]);
    setLayout((old) =>
      !old.resources.some(
        (r) => r.kind === "note" && r.noteId === note.id && r.title !== (note.title || "Untitled"),
      )
        ? old
        : {
            ...old,
            resources: old.resources.map((r) =>
              r.kind === "note" && r.noteId === note.id
                ? { ...r, title: note.title || "Untitled" }
                : r,
            ),
          },
    );
  }, []);
  const open = useCallback(
    (resource: Resource, pane?: PaneId) => setLayout((old) => openResource(old, resource, pane)),
    [],
  );
  const openNote = (note: Note, pane?: PaneId) =>
    open(
      { id: `note:${note.id}`, kind: "note", noteId: note.id, title: note.title || "Untitled" },
      pane,
    );
  const openSpace = (next: Space) => {
    if (next === "notes") {
      const state = stateRef.current;
      const id = state.panes[state.activePane].tabs.find(
        (id) => state.resources.find((r) => r.id === id)?.kind === "note",
      );
      if (id)
        setLayout((old) => ({
          ...old,
          panes: { ...old.panes, [old.activePane]: { ...old.panes[old.activePane], active: id } },
        }));
      else open({ id: "library", kind: "library", title: "Library" });
    } else open({ id: next, kind: next, title: next === "code" ? "Code Lab" : "Flashcards" });
  };
  const create = async (pane: PaneId, folder: string | null = null) => {
    const note = newNote(folder);
    try {
      draftStorage.setItem(`lemma:${owner}:note:${note.id}`, JSON.stringify(note));
      await repository.save(note);
      updateNote(note);
      openNote(note, pane);
    } catch {
      setError(
        "Could not create the note. Your recovery draft is kept on this device. Retry when connected.",
      );
    }
  };
  useEffect(() => {
    let alive = true;
    void repository
      .list()
      .then((list) => {
        if (alive)
          setNotes((old) => [...old, ...list.filter((n) => !old.some((x) => x.id === n.id))]);
      })
      .catch(() => {
        if (alive)
          setError(
            "Could not refresh the note picker. Open notes and recovery drafts remain available.",
          );
      });
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia("(max-width: 899px)");
    const resize = () => setNarrow(media.matches);
    media.addEventListener("change", resize);
    return () => {
      alive = false;
      observer.disconnect();
      media.removeEventListener("change", resize);
    };
  }, []);
  useEffect(() => {
    try {
      const openIds = new Set([...layout.panes.left.tabs, ...layout.panes.right.tabs]);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...layout, resources: layout.resources.filter((r) => openIds.has(r.id)) }),
      );
    } catch {
      setError("Workspace layout could not be saved on this device. Note recovery is separate.");
    }
    // Closed resources stay mounted for this session so pending saves and undo history survive.
    setRetained((old) => {
      const added = layout.resources.filter((r) => !old.some((x) => x.id === r.id));
      return added.length ? [...old, ...added] : old;
    });
  }, [layout, storageKey]);
  const activeNoteId = activeResource?.kind === "note" ? activeResource.noteId : undefined;
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.delete("note");
    url.searchParams.delete("page");
    url.searchParams.delete("space");
    if (activeNoteId) url.searchParams.set("note", activeNoteId);
    if (space !== "notes") url.searchParams.set("space", space);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [activeNoteId, space]);
  useEffect(() => {
    const reference = (event: Event) => {
      const attachment = (event as CustomEvent<Attachment>).detail;
      void addAttachment(attachment, opposite(stateRef.current.activePane));
    };
    const end = () => {
      setDragging(false);
      setDrop(null);
    };
    const start = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes(dragType)) setDragging(true);
    };
    window.addEventListener("lemma:reference", reference);
    window.addEventListener("dragstart", start);
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("lemma:reference", reference);
      window.removeEventListener("dragstart", start);
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const pane = layout.activePane,
        current = layout.panes[pane];
      if (event.key === "Escape") {
        setFocus(false);
        setPicker(null);
      }
      if (event.altKey && !mod && ["Digit1", "Digit2", "Digit3"].includes(event.code)) {
        event.preventDefault();
        openSpace(
          ({ Digit1: "notes", Digit2: "code", Digit3: "cards" } as const)[event.code as "Digit1"],
        );
      }
      if (!mod) return;
      let handled = true;
      if (event.altKey && event.code === "KeyW")
        setLayout((s) => closeTabs(s, pane, current.active ? [current.active] : []));
      else if (event.altKey && event.code === "KeyT") {
        setQuery("");
        setPicker({ pane, type: "all" });
      } else if (event.altKey && event.code === "Backslash")
        setLayout((s) => (s.split ? mergePanes(s, pane) : { ...s, split: true }));
      else if (event.altKey && event.code === "ArrowRight" && current.active)
        setLayout((s) => moveTab(s, current.active!, pane, opposite(pane)));
      else if (event.altKey && event.code === "ArrowLeft")
        setLayout((s) => ({ ...s, activePane: s.split ? opposite(pane) : pane }));
      else if (
        event.altKey &&
        (event.code === "BracketRight" || event.code === "BracketLeft") &&
        current.tabs.length
      ) {
        const index =
          (current.tabs.indexOf(current.active || "") +
            (event.code === "BracketRight" ? 1 : -1) +
            current.tabs.length) %
          current.tabs.length;
        setLayout((s) => ({
          ...s,
          panes: { ...s.panes, [pane]: { ...current, active: current.tabs[index] } },
        }));
      } else if (event.shiftKey && event.code === "KeyF") {
        if (activeResource?.kind !== "note") setFocus((v) => !v);
      } else handled = false;
      if (handled) event.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const navigate = () => {
      const params = new URLSearchParams(location.search);
      const id = params.get("note");
      const next = params.get("space");
      if (next === "code" || next === "cards")
        open({ id: next, kind: next, title: next === "code" ? "Code Lab" : "Flashcards" });
      else if (id)
        open({
          id: `note:${id}`,
          kind: "note",
          noteId: id,
          title: notes.find((n) => n.id === id)?.title || "Note",
        });
      else open({ id: "library", kind: "library", title: "Library" });
    };
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, [open, notes]);
  const addAttachment = async (attachment: Attachment, pane: PaneId) => {
    // Stable content identity without embedding file bytes in localStorage.
    const bytes = new TextEncoder().encode(attachment.src);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const resource: Resource = {
      id: `file:${digest}`,
      kind: "attachment",
      title: attachment.name,
      attachmentKey: digest,
    };
    setFiles((old) => ({ ...old, [resource.id]: attachment }));
    try {
      await storeAttachment(`${owner}:${digest}`, attachment);
    } catch {
      setError(
        "This file is open, but device storage is unavailable. You will need to reopen it after refresh.",
      );
    }
    open(resource, pane);
  };
  const chooseFile = (pane: PaneId) => {
    fileTarget.current = pane;
    fileInput.current?.click();
  };
  const startNoteDrag = (event: DragEvent, note: Note) => {
    event.dataTransfer.setData(
      dragType,
      JSON.stringify({
        resource: { id: `note:${note.id}`, kind: "note", noteId: note.id, title: note.title },
      }),
    );
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "copyMove";
    setDragging(true);
  };
  const receive = (event: DragEvent, pane: PaneId, edge = "center", index?: number) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    setDrop(null);
    try {
      const data = JSON.parse(event.dataTransfer.getData(dragType));
      const resource: Resource | undefined =
        data.resource || layout.resources.find((r) => r.id === data.id);
      if (
        !resource ||
        (data.resource &&
          (resource.kind !== "note" || !notes.some((n) => n.id === resource.noteId)))
      )
        return;
      let target = pane;
      let next = layout;
      if (edge !== "center") {
        target = edge === "left" || edge === "top" ? "left" : "right";
        next = {
          ...next,
          split: true,
          orientation: edge === "top" || edge === "bottom" ? "vertical" : "horizontal",
        };
        // Keep the current content opposite the new drop in a previously single pane.
        if (!layout.split && target === "left")
          next = { ...next, panes: { left: { tabs: [], active: null }, right: layout.panes.left } };
      }
      if (!layout.split && target === "left" && edge !== "center" && data.from === "left")
        data.from = "right";
      if (data.from && next.panes[data.from as PaneId]?.tabs.includes(resource.id))
        next = moveTab(next, resource.id, data.from, target, index);
      else next = openResource(next, resource, target);
      setLayout(next);
    } catch {
      /* ignore unrelated or malformed drops */
    }
  };
  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const rect = grid.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio =
        layout.orientation === "horizontal"
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
      setLayout((s) => ({ ...s, ratio: Math.min(75, Math.max(25, ratio * 100)) }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };
  const availableAttachments: Attachment[] = [];
  const visit = (node: Note["content"]) => {
    if (node.type === "attachment") availableAttachments.push(node.attrs as Attachment);
    node.content?.forEach(visit);
  };
  notes.forEach((note) => {
    if (note.pages?.length) note.pages.forEach((p) => visit(p.content));
    else visit(note.content);
  });
  const pickerButton = (label: string, run: () => void) =>
    label.toLowerCase().includes(query.toLowerCase()) ? (
      <button
        key={label}
        onClick={() => {
          setPicker(null);
          run();
        }}
      >
        {label}
      </button>
    ) : null;
  const pickExisting = (pane: PaneId) => {
    setQuery("");
    setPicker({ pane, type: "all" });
  };
  const menu = (pane: PaneId) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="workspace-plus"
          aria-label={`Open resource in ${pane} pane`}
          title={`Open in ${pane} pane`}
        >
          <Plus size={17} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="workspace-context workspace-open-menu">
        <DropdownMenuLabel>
          Open as new tab{layout.split ? ` · ${pane} pane` : ""}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void create(pane)}>
          <FileText size={17} />
          New note
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => chooseFile(pane)}>
          <FileUp size={17} />
          Open PDF or document
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pickExisting(pane)}>
          <FolderOpen size={17} />
          Open existing document
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => open({ id: "code", kind: "code", title: "Code Lab" }, pane)}
        >
          <Code2 size={17} />
          Code Lab
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => open({ id: "cards", kind: "cards", title: "Flashcards" }, pane)}
        >
          <Layers size={17} />
          Flashcards
        </DropdownMenuItem>
        {!layout.split && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Open in split view</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => pickExisting(opposite(pane))}>
              <FileText size={17} />
              Open note on right
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chooseFile(opposite(pane))}>
              <FileUp size={17} />
              Open PDF on right
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLayout((s) => ({ ...s, split: true }))}>
              <Columns2 size={17} />
              Compare side by side
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <div
      className={`study-workspace lemma-app ${dark ? "dark" : ""} ${focus ? "workspace-focus" : ""}`}
    >
      <header className="workspace-header" hidden={focus}>
        <div className="workspace-header-tools">
          <button
            title="Library"
            aria-label="Library"
            onClick={() => open({ id: "library", kind: "library", title: "Library" })}
          >
            <Home size={17} />
          </button>
          <span className="workspace-brand">Lemma</span>
        </div>
        <div ref={setHeaderHost} className="workspace-editor-header" />
        <SpaceSwitcher value={space} onChange={openSpace} />
        {activeResource?.kind !== "note" && (
          <button
            className="workspace-tool-focus"
            onClick={() => setFocus(true)}
            title="Focus · ⌘/Ctrl Shift F"
          >
            <Focus size={16} /> Focus
          </button>
        )}
      </header>
      {focus && (
        <button className="workspace-exit-focus" onClick={() => setFocus(false)}>
          Restore workspace <kbd>Esc</kbd>
        </button>
      )}
      {error && (
        <div className="workspace-error" role="alert">
          {error}
          <button aria-label="Dismiss message" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {layout.split && narrow && !focus && (
        <button
          className="workspace-mobile-pane"
          onClick={() => setLayout((s) => ({ ...s, activePane: opposite(s.activePane) }))}
        >
          <ArrowLeftRight size={14} /> Switch pane
        </button>
      )}
      <div
        ref={grid}
        className={`workspace-grid ${layout.split && !narrow && !focus ? "is-split" : ""} orientation-${layout.orientation}`}
        style={{ "--split-ratio": `${layout.ratio}%` } as CSSProperties}
      >
        {visiblePanes.map((pane) => (
          <section key={pane} className={`workspace-pane-header pane-${pane}`} hidden={focus}>
            <div
              role="tablist"
              aria-label={`${pane} pane tabs`}
              className="workspace-tabs"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(dragType)) e.preventDefault();
              }}
              onDrop={(e) => receive(e, pane)}
            >
              {layout.panes[pane].tabs.map((id, index) => {
                const resource = layout.resources.find((r) => r.id === id);
                if (!resource) return null;
                const Icon =
                  resource.kind === "code" ? Code2 : resource.kind === "cards" ? Layers : FileText;
                return (
                  <ContextMenu key={id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={`workspace-tab ${layout.panes[pane].active === id ? "is-active" : ""}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(dragType, JSON.stringify({ id, from: pane }));
                          e.dataTransfer.effectAllowed = "move";
                          setDragging(true);
                        }}
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes(dragType)) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDrop={(e) => receive(e, pane, "center", index)}
                      >
                        <button
                          role="tab"
                          id={`tab-${pane}-${id}`}
                          aria-selected={layout.panes[pane].active === id}
                          tabIndex={layout.panes[pane].active === id ? 0 : -1}
                          aria-controls={`panel-${pane}-${id}`}
                          onClick={() =>
                            setLayout((s) => ({
                              ...s,
                              activePane: pane,
                              panes: { ...s.panes, [pane]: { ...s.panes[pane], active: id } },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                            e.preventDefault();
                            const tabs = layout.panes[pane].tabs;
                            const next =
                              e.key === "Home"
                                ? 0
                                : e.key === "End"
                                  ? tabs.length - 1
                                  : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                                    tabs.length;
                            setLayout((s) => ({
                              ...s,
                              activePane: pane,
                              panes: {
                                ...s.panes,
                                [pane]: { ...s.panes[pane], active: tabs[next] },
                              },
                            }));
                            document.getElementById(`tab-${pane}-${tabs[next]}`)?.focus();
                          }}
                        >
                          <Icon size={15} />
                          <span>{resource.title}</span>
                        </button>
                        <button
                          className="workspace-tab-close"
                          aria-label={`Close ${resource.title}`}
                          onClick={() => setLayout((s) => closeTabs(s, pane, [id]))}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="workspace-context">
                      <ContextMenuItem
                        onSelect={() => setLayout((s) => moveTab(s, id, pane, opposite(pane)))}
                      >
                        Move to {opposite(pane)} pane
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => open(resource, opposite(pane))}>
                        Duplicate view beside{resource.kind === "note" ? " (read only)" : ""}
                      </ContextMenuItem>
                      {resource.kind === "note" && (
                        <ContextMenuItem
                          onSelect={() => {
                            const url = new URL(location.href);
                            url.search = "";
                            url.searchParams.set("note", resource.noteId);
                            void navigator.clipboard
                              .writeText(url.href)
                              .catch(() => setError("Could not copy the note link."));
                          }}
                        >
                          Copy document link
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => setLayout((s) => closeTabs(s, pane, [id]))}>
                        Close tab
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={() =>
                          setLayout((s) =>
                            closeTabs(
                              s,
                              pane,
                              s.panes[pane].tabs.filter((tab) => tab !== id),
                            ),
                          )
                        }
                      >
                        Close other tabs
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={() =>
                          setLayout((s) => closeTabs(s, pane, s.panes[pane].tabs.slice(index + 1)))
                        }
                      >
                        Close tabs to the right
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
              {menu(pane)}
            </div>
            {layout.split && (
              <button
                className="workspace-merge"
                aria-label="Merge panes and preserve tabs"
                title="Merge panes · ⌘/Ctrl Alt \\"
                onClick={() => setLayout((s) => mergePanes(s, pane))}
              >
                <Columns2 size={16} />
              </button>
            )}
          </section>
        ))}
        {layout.split && !narrow && !focus && (
          <div
            className="workspace-divider"
            role="separator"
            tabIndex={0}
            aria-label="Resize panes"
            aria-orientation={layout.orientation === "horizontal" ? "vertical" : "horizontal"}
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(layout.ratio)}
            onPointerDown={resize}
            onDoubleClick={() => setLayout((s) => ({ ...s, ratio: 50 }))}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(e.key)) {
                e.preventDefault();
                setLayout((s) => ({
                  ...s,
                  ratio:
                    e.key === "Home"
                      ? 50
                      : Math.min(
                          75,
                          Math.max(
                            25,
                            s.ratio + (["ArrowLeft", "ArrowUp"].includes(e.key) ? -5 : 5),
                          ),
                        ),
                }));
              }
            }}
          >
            <span />
          </div>
        )}
        {retained
          .filter(
            (r) =>
              r.kind !== "note" ||
              !retained.some(
                (other) => other.kind === "note" && other.id !== r.id && other.noteId === r.noteId,
              ),
          )
          .map((resource) => {
            const containing = visiblePanes.filter((p) => layout.panes[p].active === resource.id);
            const pane = containing.includes(layout.activePane) ? layout.activePane : containing[0];
            const visible = !!pane;
            // One live editing instance per identity. A second visible view is a read-only mirror below.
            const embedded: EmbeddedWorkspace = {
              noteId: resource.kind === "note" ? resource.noteId : undefined,
              active: visible && pane === layout.activePane,
              headerHost,
              onOpen: (note) => openNote(note),
              onChange: updateNote,
              externalNote:
                resource.kind === "note" ? notes.find((n) => n.id === resource.noteId) : undefined,
              onRemoved: (id) => {
                const resourceId = `note:${id}`;
                setLayout((state) => {
                  let next = closeTabs(state, "left", [resourceId]);
                  next = closeTabs(next, "right", [resourceId]);
                  return { ...next, resources: next.resources.filter((r) => r.id !== resourceId) };
                });
                setRetained((old) => old.filter((r) => r.id !== resourceId));
                setNotes((old) => old.filter((n) => n.id !== id));
              },
              onLibrary: () => open({ id: "library", kind: "library", title: "Library" }),
              onCreate: (folder) => void create(layout.activePane, folder),
              onSpace: openSpace,
              onFocus: () => setFocus((v) => !v),
              onDragNote: startNoteDrag,
            };
            return (
              <div
                key={resource.id}
                role="tabpanel"
                data-active={visible && pane === layout.activePane}
                id={`panel-${pane || "closed"}-${resource.id}`}
                aria-labelledby={pane ? `tab-${pane}-${resource.id}` : undefined}
                className={`workspace-resource pane-${pane || "left"}`}
                hidden={!visible}
                onPointerDownCapture={() => {
                  if (pane && pane !== layout.activePane)
                    setLayout((s) => ({ ...s, activePane: pane }));
                }}
              >
                <Suspense fallback={<p role="status">Loading workspace…</p>}>
                  {resource.kind === "note" || resource.kind === "library" ? (
                    <Editor workspace={embedded} />
                  ) : resource.kind === "code" ? (
                    <CodeLab
                      ownerId={owner}
                      dark={dark}
                      active={visible && pane === layout.activePane}
                    />
                  ) : resource.kind === "cards" ? (
                    <Flashcards ownerId={owner} active={visible && pane === layout.activePane} />
                  ) : (
                    <FileView
                      resource={resource as Extract<Resource, { kind: "attachment" }>}
                      owner={owner}
                      cached={files[resource.id]}
                    />
                  )}
                </Suspense>
              </div>
            );
          })}
        {visiblePanes.map((pane) => {
          const id = layout.panes[pane].active;
          const both = id && visiblePanes.every((p) => layout.panes[p].active === id);
          const resource = layout.resources.find((r) => r.id === id);
          if (both && pane !== layout.activePane && resource)
            return (
              <div
                key={`mirror-${pane}`}
                className={`workspace-resource workspace-mirror pane-${pane}`}
                onPointerDownCapture={() => setLayout((s) => ({ ...s, activePane: pane }))}
              >
                {resource.kind === "note" ? (
                  <>
                    <div className="workspace-mirror-label">
                      Live read-only view · Edit in the other pane
                    </div>
                    <ReferencePane
                      notes={notes}
                      selected={resource.noteId}
                      attachment={null}
                      onSelect={() => {}}
                      onAttachment={() => {}}
                      onClose={() => {}}
                      side="right"
                      onSide={() => {}}
                    />
                  </>
                ) : (
                  <div className="workspace-empty">
                    <p>This tool is already open in the other pane.</p>
                    <button
                      onClick={() => setLayout((s) => ({ ...s, activePane: opposite(pane) }))}
                    >
                      Go to active view
                    </button>
                  </div>
                )}
              </div>
            );
          if (!id)
            return (
              <div
                key={`empty-${pane}`}
                className={`workspace-resource workspace-empty pane-${pane}`}
              >
                <Columns2 size={28} />
                <h2>Your space to study</h2>
                <p>Drop a tab here or open a note, PDF or study tool.</p>
                {menu(pane)}
              </div>
            );
          return null;
        })}
        {dragging &&
          visiblePanes.map((pane) => (
            <div key={`drop-${pane}`} className={`workspace-drop-layer pane-${pane}`}>
              {["left", "right", "top", "bottom", "center"].map((edge) => (
                <div
                  key={edge}
                  className={`workspace-drop-zone zone-${edge} ${drop?.pane === pane && drop.edge === edge ? "is-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrop({ pane, edge });
                  }}
                  onDrop={(e) => receive(e, pane, edge)}
                >
                  {edge === "center" ? "Open here" : `Split ${edge}`}
                </div>
              ))}
            </div>
          ))}
      </div>
      <input
        hidden
        ref={fileInput}
        type="file"
        accept={attachmentAccept}
        multiple
        onChange={async (e) => {
          const selected = Array.from(e.target.files || []);
          e.target.value = "";
          for (const file of selected)
            try {
              const block = await readAttachment(file);
              await addAttachment(block.attrs as Attachment, fileTarget.current);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not open file.");
            }
        }}
      />
      <Dialog
        open={!!picker}
        onOpenChange={(value) => {
          if (!value) setPicker(null);
        }}
      >
        <DialogContent
          className="workspace-picker"
          overlayClassName="workspace-picker-overlay"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Open in your workspace</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            aria-label="Search notes and documents"
            placeholder="Search notes and documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="workspace-picker-results">
            {picker && (
              <section>
                <h3>Open in the {picker.pane} pane</h3>
                <h4>Notes</h4>
                {notes
                  .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
                  .map((note) =>
                    pickerButton(note.title || "Untitled", () => openNote(note, picker.pane)),
                  )}
                <h4>Documents</h4>
                {availableAttachments
                  .filter(
                    (a, i, all) =>
                      all.findIndex((x) => x.src === a.src) === i &&
                      a.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((a) => pickerButton(a.name, () => void addAttachment(a, picker.pane)))}
                {pickerButton("Open PDF or document from device…", () => chooseFile(picker.pane))}
                {!notes.some((n) => n.title.toLowerCase().includes(query.toLowerCase())) &&
                  !availableAttachments.some((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  ) && <p className="workspace-picker-empty">No matching saved items.</p>}
              </section>
            )}
          </div>
          <p className="workspace-shortcuts">
            ⌘/Ctrl Alt T: open · W: close · \\: split/merge · →: move · ←: focus pane · [ / ]:
            switch tabs
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
