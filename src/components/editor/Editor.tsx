// @ts-nocheck -- ported from the original Lemma codebase, which used looser type settings
import { SidebarPortal } from "../workspace/SidebarPortal";
import { lazy, Suspense } from "react";
import { HeaderPortal } from "../workspace/Workspace";
import { NoteHeader } from "../workspace/NoteHeader";
import type { EmbeddedWorkspace } from "../workspace/Workspace";
const CodeLab = lazy(() => import("@/components/spaces/CodeLab"));
const Flashcards = lazy(() => import("@/components/spaces/Flashcards"));
import { fileBlocks, trackInsertion } from "./insertFiles";
import { AttachmentPicker } from "./AttachmentPicker";
import { SelectionMenu } from "./SelectionMenu";
import { SpaceSwitcher, type Space } from "@/components/spaces/SpaceSwitcher";
import HomeDashboard from "./Home";
import { Columns, Column, columnContent } from "./columns";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
const stableRouter = {
  push: (url: string, _o?: unknown) => window.history.pushState(null, "", url),
};
const useRouter = () => stableRouter;
import type { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { loadDocument } from "./loadDocument";
import { useDocumentSync } from "./useDocumentSync";
import { trackSlashTrigger } from "./slashTrigger";
import {
  deviceSettingsEvent,
  readDevicePreferences,
  readThemePreference,
  isDarkTheme,
  writeDevicePreferences,
  writeThemePreference,
} from "@/lib/devicePreferences";
import { WorkspaceSelect } from "@/components/ui/workspace-select";
import { Input } from "@/components/ui/input";
import { subscribeEditorSession } from "./editorSession";
import { ExportDialog } from "./ExportDialog";
import { draftStorage } from "@/lib/draftStorage";
import { AttachmentBlock, readAttachment, attachmentAccept } from "./attachments";
import { ReferencePane } from "./ReferencePane";
import { BlockControls } from "./BlockControls";
import BlockMenu from "./BlockMenu";
import { Extension, InputRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { MathBlock, InlineMath, Graph, Callout, PageBreak } from "./nodes";
import { snippets, expand } from "@/lib/editor/snippets";
import {
  Bold,
  Italic,
  Strikethrough,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Columns2,
  Columns3,
  FileUp,
  ChevronRight as ToggleIcon,
  Image as ImageIcon,
  MessageSquare,
  ChartLine,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Sigma,
  Underline,
  Link2,
  Undo2,
  Redo2,
  Highlighter,
  Palette,
  Minus,
  Plus,
  Search,
  FileText,
  Folder as FolderIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Eye,
  Clock3,
  Star,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Keyboard,
  FolderPlus,
  Settings2,
  Share2,
  BookOpen,
  Focus,
  Type,
  Home,
  Contrast,
} from "lucide-react";
import "katex/dist/katex.min.css";
import type { Folder, Note, NotePage, Version } from "@/lib/notes";
import { sample } from "@/lib/editor/sample";
import { initialTitle, newNote, newPage, pagesFor, repository } from "@/lib/notes";
import { supabase } from "@/integrations/supabase/client";
import AuthScreen from "@/components/auth/AuthScreen";
import { Settings, defaultPreferences, type Preferences } from "./Settings";
import { OrganizerItem } from "./OrganizerItem";
import { documentContent } from "./document";
import { Button } from "@/components/ui/button";
import { NoteIcon } from "./NoteIcon";
import { Outline } from "./Outline";
import { IconPicker, TagRow } from "./DocHeader";
import { SmartPaste, mathFromHTML } from "./paste";
import { ImageBlock, ImagePlaceholder, ToggleHeading, ToggleBody } from "./blocks";
import { A4Pagination } from "./pagination";
import { Focus as FocusExtension } from "@tiptap/extensions";

const commands = [
  "2 columns",
  "3 columns",
  "Document / PDF",
  "Text",
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Heading 4",
  "Toggle heading",
  "Image",
  "Bullet list",
  "Numbered list",
  "Task list",
  "Quote",
  "Callout",
  "Divider",
  "Equation",
  "Graph",
  "Code block",
];
const commandShortcuts: Record<string, string> = {
  Text: "⌘⌥0",
  "Heading 1": "⌘⌥1",
  "Heading 2": "⌘⌥2",
  "Heading 3": "⌘⌥3",
  "Heading 4": "⌘⌥4",
  "2 columns": "⌘⌥7",
  "3 columns": "⌘⌥8",
  "Document / PDF": "⌘⇧U",
  "Toggle heading": "## >",
  Image: "/image",
  "Bullet list": "⌘⇧8",
  "Numbered list": "⌘⇧7",
  "Task list": "⌘⇧9",
  Quote: "> Space",
  Callout: "/callout",
  Divider: "---",
  Equation: "⌘⇧M",
  Graph: "/graph",
  "Code block": "⌘⌥C",
};
const commandIcons = [
  Columns2,
  Columns3,
  FileUp,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ToggleIcon,
  ImageIcon,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  MessageSquare,
  Minus,
  Sigma,
  ChartLine,
  Code2,
];
const ownerStoragePrefix = (ownerId: string | undefined | null) => `lemma:${ownerId || "local"}:`;
const draftStorageKey = (ownerId: string | undefined | null, id: string) =>
  `${ownerStoragePrefix(ownerId)}note:${id}`;
const folderStorageKey = (ownerId: string | undefined | null) =>
  `${ownerStoragePrefix(ownerId)}folders`;
export default function Editor({ workspace }: { workspace?: EmbeddedWorkspace } = {}) {
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const router = useRouter();
  const changeTheme = (value: "system" | "light" | "dark") => {
    writeThemePreference(value);
    setTheme(value);
    setDark(isDarkTheme(value));
  };
  const toggleTheme = () => changeTheme(dark ? "light" : "dark");
  const [notes, setNotes] = useState<Note[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [active, setActive] = useState<Note | null>(null),
    [activePageId, setActivePageId] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false),
    [shareError, setShareError] = useState(""),
    [saved, setSaved] = useState<"saved" | "saving" | "offline">("saved"),
    [search, setSearch] = useState(""),
    [standaloneSidebar, setStandaloneSidebar] = useState(true),
    [menu, setMenu] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [preview, setPreview] = useState(false),
    [sharedView, setSharedView] = useState(false),
    [focus, setFocus] = useState(false),
    [history, setHistory] = useState<Version[]>([]),
    [historyOpen, setHistoryOpen] = useState(false),
    [dark, setDark] = useState(() => document.documentElement.classList.contains("dark")),
    [theme, setTheme] = useState<"system" | "light" | "dark">("system"),
    [darkinit, setDarkinit] = useState(false),
    [menuIndex, setMenuIndex] = useState(0),
    [slashFilter, setSlashFilter] = useState(""),
    [snipQuery, setSnipQuery] = useState(""),
    [snippetIndex, setSnippetIndex] = useState(0),
    [snipFields, setSnipFields] = useState<[number, number][]>([]),
    [fieldIndex, setFieldIndex] = useState(0),
    [library, setLibrary] = useState(() => !!workspace && !workspace.noteId),
    [currentFolder, setCurrentFolder] = useState<string | null>(null),
    [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set()),
    [favoritesOnly, setFavoritesOnly] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [fontFamily, setFontFamily] = useState("sans"),
    [fontSize, setFontSize] = useState(16),
    [demoMode, setDemoMode] = useState(false);
  const sidebar = workspace ? workspace.sidebarOpen : standaloneSidebar;
  const setSidebar = (value: boolean | ((open: boolean) => boolean)) => {
    if (workspaceRef.current) {
      const current = workspaceRef.current;
      current.onSidebarChange(typeof value === "function" ? value(current.sidebarOpen) : value);
    } else setStandaloneSidebar(value);
  };
  const [space, setSpace] = useState<Space>(() => {
    if (typeof location === "undefined") return "notes";
    const params = new URLSearchParams(location.search);
    if (params.has("share")) return "notes";
    if (workspace) return "notes";
    const value = params.get("space");
    return value === "code" || value === "cards" ? value : "notes";
  });
  const [home, setHome] = useState(true);
  const changeSpace = useCallback((next: Space) => {
    if (workspaceRef.current) {
      workspaceRef.current.onSpace(next);
      return;
    }
    setSpace(next);
    setFocus(false);
    setMenu(false);
    setSearchOpen(false);
    const url = new URL(location.href);
    if (next === "notes") url.searchParams.delete("space");
    else url.searchParams.set("space", next);
    window.history.pushState(null, "", url.pathname + url.search);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (workspaceRef.current || sharedView || !event.altKey || event.metaKey || event.ctrlKey)
        return;
      const next = { Digit1: "notes", Digit2: "code", Digit3: "cards" }[event.code] as
        Space | undefined;
      if (next) {
        event.preventDefault();
        changeSpace(next);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [changeSpace, sharedView]);
  const sidebarDismiss = sidebar ? (
    <Button
      variant="ghost"
      className="sidebar-dismiss"
      aria-label="Close sidebar"
      onClick={() => setSidebar(false)}
    />
  ) : null;
  const switcher =
    !workspace && !sharedView && !focus ? (
      <SpaceSwitcher value={space} onChange={changeSpace} />
    ) : null;
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const changePreferences = (next: Preferences) => {
    setPreferences(next);
    setFontFamily(next.font);
    setFontSize(next.size);
    writeDevicePreferences(next);
  };
  useEffect(() => {
    const sync = () => {
      const next = readDevicePreferences();
      setPreferences(next);
      setFontFamily(next.font);
      setFontSize(next.size);
      const nextTheme = readThemePreference();
      setTheme(nextTheme);
      setDark(isDarkTheme(nextTheme));
    };
    window.addEventListener(deviceSettingsEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(deviceSettingsEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const settingsDialog = (
    <>
      <style>{`@media print { @page { size: A4; margin: ${preferences.margin}mm; ${preferences.printNumbers ? "@bottom-center { content: counter(page); font-size: 9pt; }" : ""} } }`}</style>
      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={changePreferences}
        theme={theme}
        onTheme={changeTheme}
        dark={dark}
        email={user?.email}
        saved={saved}
        onSignOut={async () => {
          if (active) await repository.save(active);
          await supabase?.auth.signOut();
        }}
      />
    </>
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceSide, setReferenceSide] = useState<"left" | "right">("right");
  const [attachmentPicker, setAttachmentPicker] = useState(false);
  const attachmentTarget = useRef<ReturnType<typeof trackInsertion> | null>(null);
  const [referenceId, setReferenceId] = useState("");
  const [referenceAttachment, setReferenceAttachment] = useState(null);
  useEffect(() => {
    const warn = () =>
      window.alert(
        "Device recovery storage is full or unavailable. Keep this tab open until cloud saving completes.",
      );
    window.addEventListener("lemma:draft-error", warn);
    const open = (event) => {
      if (workspaceRef.current) return;
      setReferenceAttachment(event.detail);
      setReferenceOpen(true);
    };
    window.addEventListener("lemma:reference", open);
    return () => {
      window.removeEventListener("lemma:reference", open);
      window.removeEventListener("lemma:draft-error", warn);
    };
  }, []);
  useEffect(() => {
    setReferenceOpen(false);
    setReferenceAttachment(null);
    setReferenceId("");
  }, [user?.id, sharedView]);
  useEffect(() => {
    setAttachmentPicker(false);
    attachmentTarget.current?.dispose();
    attachmentTarget.current = null;
    return () => {
      attachmentTarget.current?.dispose();
      attachmentTarget.current = null;
    };
  }, [active?.id]);
  const activeRef = useRef<Note | null>(active);
  const commandSearchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const note = workspace?.externalNote;
    const current = activeRef.current;
    if (note && current?.id === note.id && note.updated_at > current.updated_at) {
      activeRef.current = note;
      setActive(note);
      setNotes((old) => old.map((n) => (n.id === note.id ? note : n)));
    }
  }, [workspace?.externalNote]);
  const insertSnippetRef = useRef<(item: { template: string }) => void>(() => {});
  const runCommandRef = useRef<(command: string) => void>(() => {});
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const activePages = useMemo(() => (active ? pagesFor(active) : []), [active]);
  const activePage = activePages.find((page) => page.id === activePageId) || activePages[0] || null;
  const lastEditorContent = useRef("");
  const slashTrigger = useRef<ReturnType<typeof trackSlashTrigger> | null>(null);
  useEffect(() => {
    if (!menu) {
      slashTrigger.current?.dispose();
      slashTrigger.current = null;
    }
  }, [menu]);
  useEffect(
    () => () => {
      slashTrigger.current?.dispose();
    },
    [],
  );
  const editor = useEditor({
    immediatelyRender: false,
    editable: !preview && !sharedView,
    extensions: [
      Columns,
      Column,
      AttachmentBlock,
      SmartPaste,
      A4Pagination,
      FocusExtension.configure({ className: "has-focus", mode: "shallowest" }),
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Placeholder.configure({ placeholder: "Start writing, or type “/” for commands…" }),
      TextStyle,
      Color,
      Extension.create({
        name: "lemmaMathShortcuts",
        addKeyboardShortcuts() {
          return {
            "Mod-m": () =>
              this.editor
                .chain()
                .focus()
                .insertContent({ type: "inlineMath", attrs: { latex: "" } })
                .run(),
            "Mod-Shift-m": () =>
              this.editor
                .chain()
                .focus()
                .insertContent({ type: "mathBlock", attrs: { latex: "" } })
                .run(),
            "Mod-Shift-e": () =>
              this.editor
                .chain()
                .focus()
                .insertContent({ type: "mathBlock", attrs: { latex: "" } })
                .run(),
          };
        },
        addInputRules() {
          return [
            new InputRule({
              find: /\$([^$]+)\$$/,
              handler: ({ range, match, commands }) => {
                const from = range.to - match[0].length;
                commands.insertContentAt(
                  { from, to: range.to },
                  { type: "inlineMath", attrs: { latex: match[1] } },
                );
              },
            }),
            new InputRule({
              find: /^\$\$$/,
              handler: ({ state, range, chain }) => {
                const $from = state.doc.resolve(range.from);
                if (!$from.parent.isTextblock || $from.depth === 0) return;
                const start = $from.before();
                const end = $from.after();
                chain()
                  .insertContentAt({ from: start, to: end }, [
                    { type: "mathBlock", attrs: { latex: "" } },
                    { type: "paragraph" },
                  ])
                  .setTextSelection(start + 2)
                  .run();
              },
            }),
          ];
        },
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      MathBlock,
      InlineMath,
      Graph,
      ImageBlock,
      ImagePlaceholder,
      ToggleHeading,
      ToggleBody,
      Callout,
      PageBreak,
    ],
    content: activePage?.content || { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) return;
      const json = editor.getJSON();
      const current = activeRef.current;
      if (current) {
        const pages = pagesFor(current);
        const pageId = activePageId || pages[0]?.id;
        const nextPages = [{ ...pages[0], content: json, updated_at: new Date().toISOString() }];
        setActivePageId(pages[0]?.id || "");
        const updated = {
          ...current,
          pages: nextPages,
          content: json,
          title: current.title,
          updated_at: new Date().toISOString(),
        };
        lastEditorContent.current = JSON.stringify(documentContent(updated));
        activeRef.current = updated;
        setActive(updated);
        setNotes((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
        draftStorage.setItem(
          draftStorageKey(userRef.current?.id, updated.id),
          JSON.stringify(updated),
        );
        setSaved("saving");
      }
    },
    editorProps: {
      attributes: { class: "lemma-prose" },
      handleKeyDown: (view, event) => {
        if (
          event.key === "/" &&
          !event.isComposing &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          preferences.slashCommands &&
          view.editable &&
          view.state.selection.empty &&
          view.state.selection.$from.parent.isTextblock &&
          view.state.selection.$from.parent.textContent.trim() === ""
        ) {
          event.preventDefault();
          const position = view.state.selection.from;
          view.dispatch(view.state.tr.insertText("/"));
          slashTrigger.current?.dispose();
          slashTrigger.current = trackSlashTrigger(editor, position);
          setMenuIndex(0);
          setSlashFilter("");
          setMenu(true);
          return true;
        }
        return false;
      },
      transformPastedHTML: (html) => {
        const doc = new DOMParser().parseFromString(mathFromHTML(html), "text/html");
        doc.querySelectorAll("script,style,meta,link").forEach((node) => node.remove());
        doc.querySelectorAll("table").forEach((table) => {
          const rows = [...table.querySelectorAll("tr")].map((row) =>
            [...row.querySelectorAll("th,td")]
              .map((cell) => cell.textContent?.trim())
              .filter(Boolean)
              .join("  ·  "),
          );
          const fragment = doc.createDocumentFragment();
          rows.forEach((text) => {
            const p = doc.createElement("p");
            p.textContent = text;
            fragment.append(p);
          });
          table.replaceWith(fragment);
        });
        doc.body.querySelectorAll("*").forEach((node) => {
          for (const attr of [...node.attributes])
            if (
              ["style", "class", "id", "data-*"].includes(attr.name) ||
              (attr.name.startsWith("data-") &&
                ![
                  "data-type",
                  "data-latex",
                  "data-icon",
                  "data-level",
                  "data-collapsed",
                  "data-name",
                  "data-checked",
                ].includes(attr.name))
            )
              node.removeAttribute(attr.name);
        });
        return doc.body.innerHTML;
      },
    },
  });
  const refresh = useCallback(async () => {
    const ownerId = userRef.current?.id;
    const params = new URLSearchParams(location.search);
    const token = params.get("share");
    if (token && supabase) {
      try {
        const { data, error } = await supabase.rpc("get_shared_note", { p_token: token });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw Error("This shared note is unavailable.");
        const shared = { ...row, is_favorite: false, folder_id: null, share_token: token } as Note;
        setNotes([shared]);
        setActive(shared);
        const page =
          pagesFor(shared).find((item) => item.id === params.get("page")) || pagesFor(shared)[0];
        setActivePageId(page.id);
        setLibrary(false);
        setPreview(true);
        setSharedView(true);
        setShareError("");
        return;
      } catch {
        setSharedView(true);
        setPreview(true);
        setNotes([]);
        setActive(null);
        setShareError("This share link is invalid or no longer available.");
        setSaved("offline");
        return;
      }
    }
    try {
      await draftStorage.hydrate();
      if (userRef.current?.id !== ownerId) return;
      const remote = await repository.list();
      let remoteFolders: Folder[] = [];
      try {
        remoteFolders = await repository.listFolders();
      } catch {}
      if (userRef.current?.id !== ownerId) return;
      const prefix = ownerStoragePrefix(ownerId);
      let localFolders: Folder[] = [];
      try {
        localFolders = JSON.parse(
          localStorage.getItem(folderStorageKey(ownerId)) || "[]",
        ) as Folder[];
      } catch {}
      for (const folder of localFolders)
        if (!remoteFolders.some((item) => item.id === folder.id))
          try {
            if (userRef.current?.id !== ownerId) return;
            await repository.saveFolder(folder);
          } catch {}
      if (userRef.current?.id !== ownerId) return;
      const mergedFolders = [...remoteFolders];
      for (const folder of localFolders)
        if (!mergedFolders.some((item) => item.id === folder.id)) mergedFolders.push(folder);
      setFolders(mergedFolders);
      setExpandedFolders(new Set(mergedFolders.map((folder) => folder.id)));
      const local = draftStorage
        .keys()
        .filter((key) => key.startsWith(`${prefix}note:`))
        .map((key) => {
          try {
            return JSON.parse(draftStorage.getItem(key) || "null") as Note;
          } catch {
            return null;
          }
        })
        .filter((note): note is Note => !!note);
      const merged: Note[] = [
        ...remote.map((note) => ({
          ...note,
          folder_id: note.folder_id || null,
          document_label: note.document_label || "LECTURE NOTES",
          pages: note.pages || [],
          page_layout: (note.page_layout === "infinite"
            ? "infinite"
            : "vertical") as Note["page_layout"],
        })),
      ];
      for (const note of local) {
        const index = merged.findIndex((item) => item.id === note.id);
        if (index < 0 || new Date(note.updated_at) > new Date(merged[index].updated_at)) {
          if (index < 0) merged.push(note);
          else merged[index] = note;
        }
      }
      merged.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setNotes(merged);
      const id =
        workspaceRef.current?.noteId ||
        params.get("note") ||
        (localStorage.getItem("lemma:preferences")?.includes('\"startup\":\"last\"')
          ? localStorage.getItem("lemma:last-note")
          : null);
      let current =
        merged.find((note) => note.id === id) ||
        (workspaceRef.current?.noteId ? null : merged[0]) ||
        null;
      if (!current && !workspaceRef.current?.noteId && (!supabase || ownerId)) {
        const demo = newNote();
        demo.title = "Sommes géométriques";
        demo.content = sample;
        demo.pages = [{ ...pagesFor(demo)[0], content: sample }];
        draftStorage.setItem(draftStorageKey(ownerId, demo.id), JSON.stringify(demo));
        merged.unshift(demo);
        current = demo;
        try {
          await repository.save(demo);
        } catch {
          setSaved("offline");
        }
      }
      if (userRef.current?.id !== ownerId) return;
      setActive(current);
      if (current) {
        const page =
          pagesFor(current).find((item) => item.id === params.get("page")) || pagesFor(current)[0];
        setActivePageId(page.id);
      }
      setLibrary(workspaceRef.current ? !workspaceRef.current.noteId : !id);
      setPreview(params.get("mode") === "read");
      setSharedView(false);
      setDemoMode(localStorage.getItem("lemma:demo") === "true");
    } catch {
      if (userRef.current?.id !== ownerId) return;
      try {
        setFolders(JSON.parse(localStorage.getItem(folderStorageKey(ownerId)) || "[]") as Folder[]);
      } catch {}
      const prefix = `${ownerStoragePrefix(ownerId)}note:`;
      const local = draftStorage
        .keys()
        .filter((key) => key.startsWith(prefix))
        .map((key) => {
          try {
            return JSON.parse(draftStorage.getItem(key) || "null") as Note;
          } catch {
            return null;
          }
        })
        .filter((note): note is Note => !!note)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setNotes(local);
      const current =
        local.find((note) => note.id === (workspaceRef.current?.noteId || params.get("note"))) ||
        (workspaceRef.current?.noteId ? null : local[0]) ||
        null;
      setActive(current);
      if (current)
        setActivePageId(
          pagesFor(current).find((page) => page.id === params.get("page"))?.id ||
            pagesFor(current)[0].id,
        );
      setPreview(params.get("mode") === "read");
      setLibrary(workspaceRef.current ? !workspaceRef.current.noteId : !params.has("note"));
      setSaved("offline");
    }
  }, [
    setNotes,
    setActive,
    setActivePageId,
    setPreview,
    setSharedView,
    setShareError,
    setSaved,
    setFolders,
  ]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!workspaceRef.current)
        setStandaloneSidebar(!window.matchMedia("(max-width: 700px)").matches);
      const storedTheme = localStorage.getItem("lemma:theme");
      const initialTheme =
        storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
          ? storedTheme
          : localStorage.getItem("lemma:dark") === "true"
            ? "dark"
            : "system";
      setTheme(initialTheme);
      setDark(
        initialTheme === "dark" ||
          (initialTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
      );
      try {
        const prefs = {
          ...defaultPreferences,
          ...(localStorage.getItem("lemma:preferences")
            ? JSON.parse(localStorage.getItem("lemma:preferences")!)
            : {
                font: localStorage.getItem("lemma:font") || defaultPreferences.font,
                size: Number(localStorage.getItem("lemma:size")) || defaultPreferences.size,
              }),
        };
        setPreferences(prefs);
        setFontFamily(prefs.font);
        setFontSize(prefs.size);
      } catch {}
      setDemoMode(localStorage.getItem("lemma:demo") === "true");
      setDarkinit(true);
    });
    if (!supabase) {
      requestAnimationFrame(() => setAuthReady(true));
      const timer = setTimeout(() => void refresh(), 0);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    const unsubscribe = subscribeEditorSession(supabase.auth, {
      user: (nextUser) => {
        userRef.current = nextUser;
        setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));
      },
      ready: () => setAuthReady(true),
      load: () => void refresh(),
      shared: new URLSearchParams(location.search).has("share"),
      clear: () => {
        setNotes([]);
        setFolders([]);
        setActive(null);
      },
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      userRef.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);
  useEffect(() => {
    if (!darkinit || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      setDark(media.matches);
      localStorage.setItem("lemma:dark", String(media.matches));
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [darkinit, theme]);
  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => commandSearchRef.current?.focus());
  }, [searchOpen]);
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (workspaceRef.current && !workspaceRef.current.active) return;
      if (space !== "notes") return;
      if (!sharedView && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!sharedView && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (workspaceRef.current) workspaceRef.current.onFocus();
        else setFocus((v) => !v);
        return;
      }
      if (e.key === "Escape" && focus) setFocus(false);
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [focus, sharedView, space]);
  useEffect(() => {
    if (!editor) return;
    let previous = "";
    const onDemoKey = (e: KeyboardEvent) => {
      if (workspaceRef.current && !workspaceRef.current.active) return;
      if (
        e.key === "\\" &&
        previous === "$" &&
        e.target instanceof HTMLElement &&
        e.target.closest(".ProseMirror") &&
        editor.state.selection.empty
      ) {
        const { from } = editor.state.selection;
        if (from > 1 && editor.state.doc.textBetween(from - 1, from) === "$") {
          e.preventDefault();
          editor
            .chain()
            .focus()
            .deleteRange({ from: from - 1, to: from })
            .run();
          setDemoMode((v) => {
            localStorage.setItem("lemma:demo", String(!v));
            return !v;
          });
        }
      }
      previous = e.key;
    };
    window.addEventListener("keydown", onDemoKey);
    return () => window.removeEventListener("keydown", onDemoKey);
  }, [editor]);
  const continuousContent = useMemo(() => (active ? documentContent(active) : null), [active]);
  useDocumentSync(editor, active?.id, continuousContent, lastEditorContent);
  const editorActive = workspace?.active ?? true;
  useEffect(() => {
    if (!editorActive) {
      setMenu(false);
      setSearchOpen(false);
      setHistoryOpen(false);
      setExportOpen(false);
      setSettingsOpen(false);
      setSnipQuery("");
      setAttachmentPicker(false);
      attachmentTarget.current?.dispose();
      attachmentTarget.current = null;
      editor?.view.dom.dispatchEvent(new Event("lemma:deactivate"));
    }
  }, [editor, editorActive]);
  useEffect(() => {
    if (editor) editor.view.dom.spellcheck = preferences.spellcheck;
  }, [editor, preferences.spellcheck]);
  useEffect(() => {
    editor?.setEditable(!preview && !sharedView);
  }, [editor, preview, sharedView]);
  useEffect(() => {
    if (!active || sharedView || (workspaceRef.current && library)) return;
    const timer = setTimeout(async () => {
      try {
        await repository.save(active);
        setSaved("saved");
        const key = draftStorageKey(user?.id, active.id);
        if (draftStorage.getItem(key) === JSON.stringify(active)) draftStorage.removeItem(key);
      } catch {
        setSaved("offline");
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [active, sharedView, user?.id, library]);
  useEffect(() => {
    if (active && workspace?.noteId === active.id) workspaceRef.current?.onChange(active);
  }, [active, workspace?.noteId]);
  useEffect(() => {
    const onPop = () => {
      if (workspaceRef.current) return;
      const params = new URLSearchParams(location.search);
      const nextSpace = params.get("space");
      setSpace(
        !params.has("share") && (nextSpace === "code" || nextSpace === "cards")
          ? nextSpace
          : "notes",
      );
      if (params.has("share")) {
        void refresh();
        return;
      }
      const note = notes.find((item) => item.id === params.get("note"));
      if (note) {
        setActive(note);
        setActivePageId(
          pagesFor(note).find((page) => page.id === params.get("page"))?.id || pagesFor(note)[0].id,
        );
        setLibrary(false);
        setPreview(params.get("mode") === "read");
        setSharedView(false);
      } else setLibrary(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [notes, refresh]);

  const searchableText = (content: Note["content"]): string => {
    const visit = (node: Note["content"]): string =>
      [
        node.text || "",
        ...(node.content || []).map((child) => visit(child as Note["content"])),
      ].join(" ");
    return visit(content);
  };
  const searchResults = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      pagesFor(n).some((page) =>
        searchableText(page.content).toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const filteredCommands = commands.filter((c) =>
    c.toLowerCase().includes(slashFilter.toLowerCase()),
  );
  const matchingSnippets = snippets.filter((s) =>
    s.label.toLowerCase().includes(snipQuery.toLowerCase()),
  );
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (workspaceRef.current && !workspaceRef.current.active) return;
      if (
        e.defaultPrevented ||
        space !== "notes" ||
        library ||
        !(e.target instanceof HTMLElement) ||
        !e.target.closest(".ProseMirror,.slash-menu,.block-menu")
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.code === "Digit7" || e.code === "Digit8")) {
        e.preventDefault();
        runCommandRef.current(e.code === "Digit7" ? "2 columns" : "3 columns");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyU") {
        e.preventDefault();
        runCommandRef.current("Document / PDF");
        return;
      }
      if (snipFields.length && e.key === "Tab") {
        e.preventDefault();
        const next = fieldIndex + 1;
        if (next < snipFields.length) {
          editor.commands.setTextSelection({ from: snipFields[next][0], to: snipFields[next][1] });
          setFieldIndex(next);
        } else {
          editor.commands.setTextSelection({ from: snipFields[0][0], to: snipFields[0][1] });
          setFieldIndex(0);
        }
        return;
      }
      if (snipQuery) {
        if (e.key === "Escape") {
          setSnipQuery("");
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSnippetIndex((i) => Math.min(i + 1, matchingSnippets.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSnippetIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" && matchingSnippets.length) {
          e.preventDefault();
          insertSnippetRef.current(matchingSnippets[snippetIndex]);
          return;
        }
      }
      if (menu) {
        if (e.key === "Escape") {
          e.preventDefault();
          setMenu(false);
          editor.commands.focus(undefined, { scrollIntoView: false });
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMenuIndex((i) => Math.max(0, Math.min(i + 1, filteredCommands.length - 1)));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMenuIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" && filteredCommands.length) {
          e.preventDefault();
          runCommandRef.current(filteredCommands[Math.min(menuIndex, filteredCommands.length - 1)]);
          return;
        }
      }
      if (snipQuery && e.key.length === 1) {
        setSnipQuery((q) => q + e.key);
      }
      if (snipQuery && e.key === "Backspace") {
        setSnipQuery((q) => q.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    space,
    library,
    preferences.slashCommands,
    editor,
    snipQuery,
    snippetIndex,
    matchingSnippets,
    menu,
    menuIndex,
    filteredCommands,
    fieldIndex,
    snipFields,
  ]);
  const insertSnippet = useCallback(
    (s: { template: string }) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const { text, fields } = expand(s.template, from);
      editor.chain().focus().insertContentAt({ from, to }, text).run();
      setSnipFields(fields);
      setFieldIndex(0);
      if (fields.length) editor.commands.setTextSelection({ from: fields[0][0], to: fields[0][1] });
      setSnipQuery("");
    },
    [editor],
  );
  const insertMath = useCallback(
    (inline: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent(
          inline
            ? { type: "inlineMath", attrs: { latex: "" } }
            : { type: "mathBlock", attrs: { latex: "" } },
        )
        .run();
    },
    [editor],
  );
  const runCommand = useCallback(
    (c: string) => {
      if (!editor) return;
      slashTrigger.current?.consume();
      slashTrigger.current = null;
      setMenu(false);
      setSlashFilter("");
      editor.commands.focus(undefined, { scrollIntoView: false });
      switch (c) {
        case "2 columns":
        case "3 columns":
          editor
            .chain()
            .focus()
            .insertContent(columnContent(c === "2 columns" ? 2 : 3))
            .run();
          {
            const { $from } = editor.state.selection;
            let found = -1;
            editor.state.doc.descendants((node, pos) => {
              if (
                node.type.name === "columns" &&
                pos <= $from.pos &&
                pos + node.nodeSize >= $from.pos
              )
                found = pos;
            });
            if (found >= 0) editor.commands.setTextSelection(found + 3);
          }
          break;
        case "Image":
        case "Document / PDF": {
          attachmentTarget.current?.dispose();
          attachmentTarget.current = trackInsertion(editor);
          setAttachmentPicker(true);
          break;
        }
        case "Text":
          editor.chain().focus().setParagraph().run();
          break;
        case "Heading 1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "Heading 2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "Heading 3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "Heading 4":
          editor.chain().focus().toggleHeading({ level: 4 }).run();
          break;
        case "Toggle heading":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "toggleHeading",
              attrs: { level: 2 },
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [{ type: "text", text: "Toggle heading" }],
                },
                { type: "toggleBody", content: [{ type: "paragraph" }] },
              ],
            })
            .run();
          break;
        case "Bullet list":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "Numbered list":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "Task list":
          editor.chain().focus().toggleTaskList().run();
          break;
        case "Quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "Callout":
          editor
            .chain()
            .focus()
            .insertContent({ type: "callout", content: [{ type: "paragraph" }] })
            .run();
          break;
        case "Divider":
          editor.chain().focus().setHorizontalRule().run();
          break;
        case "Equation":
          insertMath(false);
          break;
        case "Graph":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "graph",
              attrs: {
                expressions: ["x^2"],
                xMin: -10,
                xMax: 10,
                height: 320,
                legend: preferences.graphLegend,
              },
            })
            .run();
          break;
        case "Code block":
          editor.chain().focus().toggleCodeBlock().run();
      }
    },
    [editor, insertMath, setMenu, setSlashFilter],
  );
  useEffect(() => {
    insertSnippetRef.current = insertSnippet;
    runCommandRef.current = runCommand;
  }, [insertSnippet, runCommand]);
  const showLibrary = (folderId: string | null = null, favorites = false) => {
    setHome(false);
    setCurrentFolder(folderId);
    if (workspaceRef.current) {
      workspaceRef.current.onLibrary();
      return;
    }
    setFavoritesOnly(favorites);
    setLibrary(true);
    router.push("/", { scroll: false });
  };
  const activate = (note: Note, pageId?: string) => {
    if (workspaceRef.current) {
      workspaceRef.current.onOpen(note);
      return;
    }
    if (window.matchMedia("(max-width: 700px)").matches) setSidebar(false);
    setSpace("notes");
    activeRef.current = note;
    localStorage.setItem("lemma:last-note", note.id);
    const pages = pagesFor(note);
    const page = pages.find((item) => item.id === pageId) || pages[0];
    setActive(note);
    setActivePageId(page.id);
    setLibrary(false);
    setSharedView(false);
    setFocus(false);
    setMenu(false);
    if (historyOpen) setHistoryOpen(false);
    setHistory([]);
    const u = new URL(location.href);
    u.searchParams.delete("space");
    u.searchParams.set("note", note.id);
    u.searchParams.set("page", page.id);
    u.searchParams.delete("mode");
    u.searchParams.delete("share");
    router.push(`${u.pathname}${u.search}`, { scroll: false });
  };
  const openPage = (page: NotePage) => {
    if (!active) return;
    setActivePageId(page.id);
    const u = new URL(location.href);
    u.searchParams.set("note", active.id);
    u.searchParams.set("page", page.id);
    router.push(`${u.pathname}${u.search}`, { scroll: false });
  };
  const importDocument = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = attachmentAccept;
    const ownerId = userRef.current?.id;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const block = await readAttachment(file);
        if (userRef.current?.id !== ownerId) return;
        const n = newNote(currentFolder);
        n.title = file.name;
        n.content = { type: "doc", content: [block, { type: "paragraph" }] };
        n.pages[0].content = n.content;
        draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
        setNotes((ns) => [n, ...ns]);
        activate(n);
        setLibrary(false);
        try {
          await repository.save(n);
        } catch {
          setSaved("offline");
        }
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Could not import file.");
      }
    };
    input.click();
  };
  const create = async (folderId: string | null = currentFolder) => {
    if (workspaceRef.current) {
      workspaceRef.current.onCreate(folderId);
      return;
    }
    const n = newNote(folderId);
    activeRef.current = n;
    const page = pagesFor(n)[0];
    setNotes((ns) => [n, ...ns]);
    setActive(n);
    setActivePageId(page.id);
    setLibrary(false);
    if (editor) loadDocument(editor, page.content);
    draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
    setSaved("saving");
    activate(n, page.id);
    try {
      await repository.save(n);
      await repository.snapshot(n);
      setSaved("saved");
    } catch {
      setSaved("offline");
    }
  };
  const addPage = () => {
    if (!active) return;
    const pages = pagesFor(active);
    const page = newPage(pages.length);
    const next = {
      ...active,
      pages: [...pages, page],
      content: page.content,
      updated_at: new Date().toISOString(),
    };
    setActive(next);
    activeRef.current = next;
    setNotes((ns) => ns.map((n) => (n.id === next.id ? next : n)));
    setActivePageId(page.id);
    setSaved("saving");
    draftStorage.setItem(draftStorageKey(user?.id, next.id), JSON.stringify(next));
    const u = new URL(location.href);
    u.searchParams.set("page", page.id);
    router.push(`${u.pathname}${u.search}`, { scroll: false });
  };
  const removePage = (page: NotePage) => {
    if (!active || activePages.length < 2 || !window.confirm(`Delete ${page.title}?`)) return;
    const pages = activePages
      .filter((item) => item.id !== page.id)
      .map((item, index) => ({ ...item, position: index, title: `Page ${index + 1}` }));
    const nextPage = pages[0];
    const next = {
      ...active,
      pages,
      content: nextPage.content,
      updated_at: new Date().toISOString(),
    };
    setActive(next);
    activeRef.current = next;
    setNotes((ns) => ns.map((n) => (n.id === next.id ? next : n)));
    setActivePageId(nextPage.id);
    draftStorage.setItem(draftStorageKey(user?.id, next.id), JSON.stringify(next));
    const u = new URL(location.href);
    u.searchParams.set("page", nextPage.id);
    router.push(`${u.pathname}${u.search}`, { scroll: false });
  };
  const reorderPage = (pageId: string, toIndex: number) => {
    if (!active || toIndex < 0 || toIndex >= activePages.length) return;
    const pages = [...activePages];
    const from = pages.findIndex((page) => page.id === pageId);
    if (from < 0) return;
    const [page] = pages.splice(from, 1);
    pages.splice(toIndex, 0, page);
    const reordered = pages.map((item, index) => ({
      ...item,
      position: index,
      title: `Page ${index + 1}`,
    }));
    const next = { ...active, pages: reordered, updated_at: new Date().toISOString() };
    setActive(next);
    activeRef.current = next;
    setNotes((ns) => ns.map((n) => (n.id === next.id ? next : n)));
    draftStorage.setItem(draftStorageKey(user?.id, next.id), JSON.stringify(next));
    setSaved("saving");
  };
  const deleteCurrent = async () => {
    if (!active || !window.confirm(`Delete “${active.title}”? This cannot be undone.`)) return;
    const id = active.id;
    if (workspaceRef.current) {
      try {
        await repository.remove(id);
        draftStorage.removeItem(draftStorageKey(user?.id, id));
        workspaceRef.current.onRemoved(id);
      } catch {
        setSaved("offline");
      }
      return;
    }
    setNotes((ns) => ns.filter((n) => n.id !== id));
    draftStorage.removeItem(draftStorageKey(user?.id, id));
    setActive(notes.find((n) => n.id !== id) || null);
    try {
      await repository.remove(id);
    } catch {
      setSaved("offline");
    }
  };
  const rename = () => {
    if (!active) return;
    const title = window.prompt("Rename note", active.title);
    if (title?.trim()) {
      const n = { ...active, title: title.trim(), updated_at: new Date().toISOString() };
      activeRef.current = n;
      draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
      setActive(n);
      setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
    }
  };
  const loadHistory = async () => {
    if (!active) return;
    try {
      setHistory(await repository.history(active.id));
    } catch {
      setHistory([]);
    }
    setHistoryOpen(true);
  };
  const restore = async (v: Version) => {
    if (!active) return;
    try {
      await repository.snapshot(active);
      const pages = pagesFor({
        ...active,
        title: v.title,
        content: v.content,
        pages: v.pages || [],
      });
      const page = pages.find((item) => item.id === activePageId) || pages[0];
      const n = {
        ...active,
        title: v.title,
        pages,
        content: page.content,
        updated_at: new Date().toISOString(),
      };
      setActive(n);
      activeRef.current = n;
      setActivePageId(page.id);
      setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
      editor?.commands.setContent(page.content);
    } catch {
      setSaved("offline");
    }
  };
  const toggleFav = () => {
    if (!active) return;
    const n = { ...active, is_favorite: !active.is_favorite };
    setActive(n);
    activeRef.current = n;
    setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
    draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
  };
  const createFolder = async (parent_id: string | null = null) => {
    const name = window.prompt(parent_id ? "Name this folder" : "Name this folder");
    if (!name?.trim()) return;
    const folder: Folder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parent_id,
      created_at: new Date().toISOString(),
    };
    setFolders([...folders, folder]);
    localStorage.setItem(folderStorageKey(user?.id), JSON.stringify([...folders, folder]));
    setCurrentFolder(folder.id);
    setExpandedFolders((current) => new Set(current).add(folder.id));
    try {
      await repository.saveFolder(folder);
    } catch {
      setSaved("offline");
    }
  };
  const removeFolder = async (folder: Folder) => {
    if (!window.confirm(`Delete “${folder.name}”? Notes inside will move to the library.`)) return;
    const descendants = (parentId: string): string[] =>
      folders
        .filter((item) => item.parent_id === parentId)
        .flatMap((item) => [item.id, ...descendants(item.id)]);
    const ids = new Set([folder.id, ...descendants(folder.id)]);
    setFolders(folders.filter((f) => !ids.has(f.id)));
    localStorage.setItem(
      folderStorageKey(user?.id),
      JSON.stringify(folders.filter((f) => !ids.has(f.id))),
    );
    setNotes((ns) => ns.map((n) => (ids.has(n.folder_id || "") ? { ...n, folder_id: null } : n)));
    if (currentFolder && ids.has(currentFolder)) setCurrentFolder(null);
    try {
      await repository.removeFolder(folder.id);
    } catch {
      setSaved("offline");
    }
  };
  const moveActive = (folder_id: string | null) => {
    if (!active) return;
    const n = { ...active, folder_id, updated_at: new Date().toISOString() };
    setActive(n);
    activeRef.current = n;
    setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
    draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
  };
  const updateLabel = () => {
    if (!active) return;
    const document_label = window.prompt(
      "Document label",
      active.document_label || "LECTURE NOTES",
    );
    if (document_label?.trim()) {
      const n = { ...active, document_label: document_label.trim().toUpperCase() };
      setActive(n);
      setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
      draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
    }
  };
  const updatePageLayout = (page_layout: Note["page_layout"]) => {
    if (!active) return;
    const n = { ...active, page_layout };
    setActive(n);
    setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
    draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
  };
  const shareLink = async () => {
    if (!active) return;
    const share_token = active.share_token || crypto.randomUUID();
    const updated = { ...active, share_token };
    setActive(updated);
    activeRef.current = updated;
    setNotes((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
    try {
      await repository.save(updated);
      const u = new URL(location.href);
      u.search = "";
      u.searchParams.set("share", share_token);
      u.searchParams.set("page", activePage?.id || pagesFor(updated)[0].id);
      await navigator.clipboard.writeText(u.toString());
      setSaved("saved");
    } catch {
      setSaved("offline");
    }
  };
  const revokeShare = async () => {
    if (!active?.share_token) return;
    const updated = { ...active, share_token: null };
    setActive(updated);
    activeRef.current = updated;
    setNotes((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
    draftStorage.setItem(draftStorageKey(user?.id, updated.id), JSON.stringify(updated));
    try {
      await repository.save(updated);
      setSaved("saved");
    } catch {
      setSaved("offline");
    }
  };
  const exportPDF = () => setExportOpen(true);
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name || "All notes";
  const toggleFolderExpanded = (id: string) =>
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const moveItem = async (id: string, target: string | null, kind: "note" | "folder") => {
    if (kind === "folder") {
      if (id === target) return;
      let ancestor = folders.find((f) => f.id === target);
      const seen = new Set<string>();
      while (ancestor) {
        if (ancestor.id === id || seen.has(ancestor.id)) return;
        seen.add(ancestor.id);
        ancestor = folders.find((f) => f.id === ancestor.parent_id);
      }
      const item = folders.find((f) => f.id === id);
      if (!item) return;
      const next = { ...item, parent_id: target };
      setFolders((fs) => fs.map((f) => (f.id === id ? next : f)));
      localStorage.setItem(
        folderStorageKey(user?.id),
        JSON.stringify(folders.map((f) => (f.id === id ? next : f))),
      );
      try {
        await repository.saveFolder(next);
      } catch {
        setSaved("offline");
      }
    } else {
      const item = notes.find((n) => n.id === id);
      if (!item) return;
      const next = { ...item, folder_id: target, updated_at: new Date().toISOString() };
      setNotes((ns) => ns.map((n) => (n.id === id ? next : n)));
      if (active?.id === id) {
        setActive(next);
        activeRef.current = next;
      }
      try {
        await repository.save(next);
      } catch {
        draftStorage.setItem(draftStorageKey(user?.id, id), JSON.stringify(next));
        setSaved("offline");
      }
    }
  };
  const renameItem = async (item: Note | Folder, kind: "note" | "folder") => {
    const name = window.prompt(
      "Rename",
      kind === "note" ? (item as Note).title : (item as Folder).name,
    );
    if (!name?.trim()) return;
    if (kind === "note") {
      const n = { ...item, title: name.trim(), updated_at: new Date().toISOString() } as Note;
      setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
      if (active?.id === n.id) {
        setActive(n);
        activeRef.current = n;
      }
      await repository.save(n);
      workspaceRef.current?.onChange(n);
    } else {
      const f = { ...item, name: name.trim() } as Folder;
      setFolders((fs) => fs.map((x) => (x.id === f.id ? f : x)));
      await repository.saveFolder(f);
    }
  };
  const deleteNote = async (note: Note) => {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    await repository.remove(note.id);
    workspaceRef.current?.onRemoved(note.id);
    setNotes((ns) => ns.filter((n) => n.id !== note.id));
    if (active?.id === note.id) showLibrary();
    draftStorage.removeItem(draftStorageKey(user?.id, note.id));
  };
  const wrapNote = (note: Note, child: ReactNode) => (
    <OrganizerItem
      key={note.id}
      id={note.id}
      kind="note"
      dark={dark}
      folders={folders}
      onMove={moveItem}
      onRename={() => void renameItem(note, "note")}
      onDelete={() => void deleteNote(note)}
      onDuplicate={async () => {
        const copy = {
          ...note,
          id: crypto.randomUUID(),
          title: `${note.title} (copy)`,
          share_token: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await repository.save(copy);
        setNotes((ns) => [copy, ...ns]);
      }}
    >
      {child}
    </OrganizerItem>
  );
  const wrapFolder = (folder: Folder, child: ReactNode) => (
    <OrganizerItem
      key={folder.id}
      id={folder.id}
      kind="folder"
      dark={dark}
      folders={folders}
      onMove={moveItem}
      onRename={() => void renameItem(folder, "folder")}
      onDelete={() => void removeFolder(folder)}
      onNewNote={() => void create(folder.id)}
      onNewFolder={() => void createFolder(folder.id)}
    >
      {child}
    </OrganizerItem>
  );
  const renderSidebarNote = (note: Note) =>
    wrapNote(
      note,
      <Button
        variant="ghost"
        key={note.id}
        draggable={!!workspace}
        onDragStart={(event) => workspace?.onDragNote(event, note)}
        className={`note-item tree-note ${active?.id === note.id ? "active" : ""}`}
        onClick={() => activate(note)}
      >
        <NoteIcon icon={note.icon} className="tree-type-icon" />
        <span className="tree-note-title">{note.title}</span>
        {note.is_favorite && <Star size={12} fill="currentColor" />}
      </Button>,
    );
  const renderFolderTree = (folder: Folder, depth = 0): ReactNode => {
    const expanded = expandedFolders.has(folder.id);
    const children = folders.filter((item) => item.parent_id === folder.id);
    const folderNotes = notes.filter(
      (note) =>
        note.folder_id === folder.id &&
        !favoritesOnly &&
        (!search || searchResults.some((result) => result.id === note.id)),
    );
    return wrapFolder(
      folder,
      <div className="folder-tree-node" key={folder.id}>
        <div className={`folder-tree-row depth-${Math.min(depth, 3)}`}>
          <Button
            variant="ghost"
            className="folder-disclosure"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
            aria-expanded={expanded}
            onClick={() => toggleFolderExpanded(folder.id)}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </Button>
          <Button
            variant="ghost"
            className={`folder-link ${currentFolder === folder.id ? "selected" : ""}`}
            onClick={() => showLibrary(folder.id, false)}
          >
            <FolderIcon
              size={16}
              className={`tree-type-icon space-${folder.color || "blue"}`}
              aria-hidden="true"
            />
            <span>{folder.name}</span>
          </Button>
          <Button
            variant="ghost"
            className="tree-add"
            title={`New note in ${folder.name}`}
            onClick={() => create(folder.id)}
          >
            <Plus size={13} />
          </Button>
        </div>
        {expanded && (
          <div className="folder-tree-children">
            {folderNotes.map(renderSidebarNote)}
            {children.map((child) => renderFolderTree(child, depth + 1))}
          </div>
        )}
      </div>,
    );
  };
  const renderFolderNavigation = () => (
    <>
      <div className="notes-label">
        Folders & notes{" "}
        <Button variant="ghost" title="New folder" onClick={() => void createFolder(null)}>
          <Plus size={14} />
        </Button>
      </div>
      <div className="notes-list folder-navigation">
        {folders.filter((folder) => !folder.parent_id).map((folder) => renderFolderTree(folder))}
        {notes
          .filter(
            (note) =>
              !note.folder_id &&
              (!favoritesOnly || note.is_favorite) &&
              (!search || searchResults.some((result) => result.id === note.id)),
          )
          .map(renderSidebarNote)}
      </div>
    </>
  );
  const outlineItems = (() => {
    const items: { title: string; level: number; position: number }[] = [];
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        let title = "";
        node.forEach((part) => {
          title += part.text || part.attrs?.latex || "";
        });
        items.push({ title, level: Number(node.attrs?.level) || 1, position });
      }
    });
    return items;
  })();
  const folderNoteCount = notes.filter((note) => note.folder_id === currentFolder).length;
  const childFolderCount = folders.filter((folder) => folder.parent_id === currentFolder).length;
  const renderLibraryNote = (note: Note) =>
    wrapNote(
      note,
      <Button
        variant="ghost"
        key={note.id}
        className="library-note"
        draggable={!!workspace}
        onDragStart={(event) => workspace?.onDragNote(event, note)}
        onClick={() =>
          activate(
            note,
            search
              ? pagesFor(note).find((page) =>
                  searchableText(page.content).toLowerCase().includes(search.toLowerCase()),
                )?.id
              : undefined,
          )
        }
      >
        <NoteIcon icon={note.icon} className="tree-type-icon" />
        <span className="library-note-copy">
          <strong>{note.title}</strong>
          <small>
            {folderName(note.folder_id)} · Updated {new Date(note.updated_at).toLocaleDateString()}
          </small>
        </span>
        {note.is_favorite && <Star size={14} fill="currentColor" />}
      </Button>,
    );
  const showNoteHeader =
    !focus && (!workspace || (workspace.active && !!active && workspace.noteId === active.id));
  if (!darkinit || !authReady) return null;
  if (sharedView && !active && shareError)
    return (
      <main className="share-error-screen">
        <span className="brand-mark">λ</span>
        <h1>That note isn’t available</h1>
        <p>{shareError}</p>
        <Button
          variant="ghost"
          onClick={() => {
            setSharedView(false);
            setShareError("");
            router.push("/", { scroll: false });
          }}
        >
          Go to sign in
        </Button>
      </main>
    );
  if (supabase && !user && !sharedView) return <AuthScreen />;
  if (workspace?.noteId && !active)
    return (
      <p role="status">This note is loading or unavailable. Reopen it from the library to retry.</p>
    );
  if (space !== "notes" && !sharedView)
    return (
      <main className={`lemma-app space-app ${dark ? "dark" : ""}`}>
        {switcher}
        <div className="space-account-tools">
          <Button variant="ghost" aria-label="Toggle appearance" onClick={toggleTheme}>
            <Contrast size={16} />
          </Button>
          <Button variant="ghost" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={16} />
          </Button>
        </div>
        <Suspense
          fallback={
            <p className="space-loading" role="status">
              Loading workspace…
            </p>
          }
        >
          {space === "code" ? (
            <CodeLab key={user?.id || "local"} ownerId={user?.id} dark={dark} />
          ) : (
            <Flashcards key={user?.id || "local"} ownerId={user?.id} />
          )}
        </Suspense>
        {settingsDialog}
      </main>
    );
  if (library)
    return (
      <main
        className={`lemma-app library-app ${dark ? "dark" : ""} page-direction-${preferences.pageDirection} density-${preferences.density} ${preferences.showIcons ? "" : "hide-note-icons"}`}
        style={{ "--sidebar-width": `${preferences.sidebarWidth}px` } as React.CSSProperties}
      >
        {switcher}
        {!workspace && sidebarDismiss}
        {sidebar && (
          <SidebarPortal
            host={workspace?.sidebarHost}
            visible={!workspace || (workspace.active && !!workspace.sidebarHost)}
          >
            <aside
              className={`sidebar density-${preferences.density}`}
              style={{ "--sidebar-width": `${preferences.sidebarWidth}px` }}
            >
              <div className="brand">
                <Button
                  variant="ghost"
                  className="brand-button"
                  onClick={() => {
                    showLibrary();
                    setHome(true);
                  }}
                >
                  <span className="brand-mark">λ</span>
                  <span>lemma</span>
                </Button>
                <Button
                  variant="ghost"
                  className="icon-button sidebar-collapse"
                  aria-label="Collapse sidebar"
                  onClick={() => setSidebar(false)}
                >
                  <PanelLeftClose size={16} />
                </Button>
              </div>
              <Button variant="ghost" className="new-note" onClick={() => create(currentFolder)}>
                <Plus size={15} />
                New note<span>⌘ N</span>
              </Button>
              <Button
                variant="ghost"
                className={`side-link ${!home && !favoritesOnly && !currentFolder ? "selected" : ""}`}
                onClick={() => {
                  setHome(false);
                  setCurrentFolder(null);
                  setFavoritesOnly(false);
                }}
              >
                <Home size={15} /> All notes
              </Button>
              <Button
                variant="ghost"
                className={`side-link ${favoritesOnly ? "selected" : ""}`}
                onClick={() => {
                  setCurrentFolder(null);
                  setFavoritesOnly(true);
                }}
              >
                <Star size={15} /> Favorites
              </Button>
              <label className="search-field">
                <Search size={14} />
                <input
                  aria-label="Search notes"
                  placeholder="Search notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  variant="ghost"
                  className="search-shortcut"
                  aria-label="Open note search"
                  onClick={() => setSearchOpen(true)}
                >
                  <kbd>⇧⌘ P</kbd>
                </Button>
              </label>
              {renderFolderNavigation()}
              {(() => {
                const all = [
                  ...new Set(notes.flatMap((n) => ((n as any).tags || []) as string[])),
                ].sort();
                return all.length ? (
                  <section className="sidebar-tags">
                    <div className="notes-label">Tags</div>
                    <div className="sidebar-tag-list">
                      {all.map((t) => (
                        <Button
                          variant="ghost"
                          key={t}
                          className={`sidebar-tag ${tagFilter === t ? "active" : ""}`}
                          onClick={() => setTagFilter(tagFilter === t ? null : t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </section>
                ) : null;
              })()}
              <div className="sidebar-bottom">
                <Button
                  variant="ghost"
                  className="settings-item"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={15} /> Settings
                </Button>
                <Button variant="ghost" className="settings-item" onClick={toggleTheme}>
                  <Contrast size={15} />
                  <span>{dark ? "Dark appearance" : "Light appearance"}</span>
                </Button>
              </div>
            </aside>
          </SidebarPortal>
        )}
        <section className="library-workspace">
          {home && !currentFolder && !favoritesOnly && !search && !tagFilter ? (
            <>
              {!sidebar && (
                <Button
                  variant="ghost"
                  className="home-sidebar-open icon-button"
                  aria-label="Open sidebar"
                  onClick={() => setSidebar(true)}
                >
                  <PanelLeftOpen size={16} />
                </Button>
              )}
              <HomeDashboard
                name={
                  user?.user_metadata?.full_name?.split(" ")[0] ||
                  user?.email?.split("@")[0] ||
                  "there"
                }
                notes={notes}
                folders={folders}
                onOpen={activate}
                onNewNote={() => create(null)}
                onNewFolder={() => void createFolder(null)}
                onSearch={() => setSearchOpen(true)}
                onFavorites={() => showLibrary(null, true)}
                onFolder={showLibrary}
              />
            </>
          ) : (
            <>
              <header className="library-header">
                <div className="library-heading">
                  {!sidebar && (
                    <Button
                      variant="ghost"
                      className="icon-button library-sidebar-open"
                      aria-label="Open sidebar"
                      onClick={() => setSidebar(true)}
                    >
                      <PanelLeftOpen size={16} />
                    </Button>
                  )}
                  {currentFolder && (
                    <Button
                      variant="ghost"
                      className="library-back"
                      onClick={() =>
                        setCurrentFolder(
                          folders.find((f) => f.id === currentFolder)?.parent_id || null,
                        )
                      }
                    >
                      ← {folderName(folders.find((f) => f.id === currentFolder)?.parent_id || null)}
                    </Button>
                  )}
                  <span className="panel-eyebrow">YOUR WORKSPACE</span>
                  <h1>
                    {favoritesOnly
                      ? "Favorites"
                      : currentFolder
                        ? folderName(currentFolder)
                        : "All notes"}
                  </h1>
                  {currentFolder && (
                    <p>
                      {folderNoteCount} {folderNoteCount === 1 ? "note" : "notes"}
                      {childFolderCount > 0 &&
                        ` · ${childFolderCount} ${childFolderCount === 1 ? "folder" : "folders"}`}
                    </p>
                  )}
                </div>
                <div className="library-actions">
                  <Button variant="ghost" onClick={importDocument}>
                    <Plus size={16} /> Import document
                  </Button>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    title="Search notes · ⇧⌘ P"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="action-button"
                    onClick={() => void createFolder(currentFolder)}
                  >
                    <FolderPlus size={15} />
                    <span>New folder</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="new-note"
                    onClick={() => create(currentFolder)}
                  >
                    <Plus size={15} />
                    New note
                  </Button>
                  {currentFolder && (
                    <Button
                      variant="ghost"
                      className="icon-button library-delete"
                      aria-label="Delete folder"
                      title="Delete folder"
                      onClick={() => {
                        const folder = folders.find((item) => item.id === currentFolder);
                        if (folder) void removeFolder(folder);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </header>
              <div className="library-content">
                {!search && !favoritesOnly && childFolderCount > 0 && (
                  <section className="library-folder-list" aria-label="Folders">
                    {folders
                      .filter((f) => f.parent_id === currentFolder)
                      .map((f) =>
                        wrapFolder(
                          f,
                          <Button
                            variant="ghost"
                            className="library-folder"
                            key={f.id}
                            onClick={() => showLibrary(f.id)}
                          >
                            <FolderIcon size={20} />
                            <span>
                              <strong>{f.name}</strong>
                              <small>
                                {notes.filter((n) => n.folder_id === f.id).length} notes
                              </small>
                            </span>
                            <ChevronRight size={16} />
                          </Button>,
                        ),
                      )}
                  </section>
                )}
                <h2>
                  {search
                    ? `Search results · ${searchResults.length}`
                    : favoritesOnly
                      ? "Favorite notes"
                      : currentFolder
                        ? "Notes in this folder"
                        : "Recently updated"}
                </h2>
                <div className="library-notes">
                  {(search
                    ? searchResults
                    : notes.filter(
                        (note) =>
                          (!favoritesOnly || note.is_favorite) &&
                          (favoritesOnly || note.folder_id === currentFolder) &&
                          (!tagFilter || ((note as any).tags || []).includes(tagFilter)),
                      )
                  )
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                    .map(renderLibraryNote)}
                </div>
                {!notes.length && (
                  <p className="library-empty">Create a class or a note to start your workspace.</p>
                )}
                {currentFolder && notes.length > 0 && !search && folderNoteCount === 0 && (
                  <p className="library-empty">
                    No notes here yet. Create a new note to get started.
                  </p>
                )}
                {notes.length > 0 && search && !searchResults.length && (
                  <p className="library-empty">
                    No notes match “{search}”. Try another title or phrase.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
        {searchOpen && (
          <div className="search-scrim" onClick={() => setSearchOpen(false)}>
            <div
              className="command-search"
              role="dialog"
              aria-modal="true"
              aria-label="Search notes"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  return;
                }
                if (event.key === "Tab") {
                  const controls = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      "input, button:not(:disabled)",
                    ),
                  );
                  const first = controls[0],
                    last = controls[controls.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                  }
                  if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                  }
                  return;
                }
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                const results = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    ".command-results button",
                  ),
                );
                if (!results.length) return;
                event.preventDefault();
                const current = results.indexOf(document.activeElement as HTMLButtonElement);
                const next =
                  event.key === "ArrowDown"
                    ? (current + 1) % results.length
                    : current <= 0
                      ? results.length - 1
                      : current - 1;
                results[next].focus();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <label className="search-field">
                <Search size={16} />
                <input
                  ref={commandSearchRef}
                  aria-label="Search notes"
                  placeholder="Search notes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                    if (e.key === "Enter" && searchResults[0]) {
                      activate(searchResults[0]);
                      setSearchOpen(false);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  className="search-dismiss"
                  aria-label="Close search"
                  onClick={() => setSearchOpen(false)}
                >
                  Esc
                </Button>
              </label>
              <div className="command-results">
                {!searchResults.length && (
                  <p className="search-empty" role="status">
                    No notes found. Try another title or phrase.
                  </p>
                )}
                {searchResults.slice(0, 8).map((note) => (
                  <Button
                    variant="ghost"
                    key={note.id}
                    onClick={() => {
                      activate(
                        note,
                        search
                          ? pagesFor(note).find((page) =>
                              searchableText(page.content)
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )?.id
                          : undefined,
                      );
                      setSearchOpen(false);
                    }}
                  >
                    <strong>{note.title}</strong>
                    <small>{folderName(note.folder_id)}</small>
                  </Button>
                ))}
              </div>
              <footer>
                <span className="search-help">
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> Navigate
                </span>
                <Button
                  variant="ghost"
                  className="search-open-action"
                  disabled={!searchResults.length}
                  onClick={() => {
                    if (searchResults[0]) {
                      activate(searchResults[0]);
                      setSearchOpen(false);
                    }
                  }}
                >
                  Open first result <kbd>↵</kbd>
                </Button>
              </footer>
            </div>
          </div>
        )}
        {settingsDialog}
      </main>
    );
  if (!darkinit) return null;
  return (
    <main
      className={`lemma-app ${dark ? "dark" : ""} ${preview ? "is-preview" : ""} ${focus ? "is-focus" : ""} ${demoMode ? "demo-mode" : ""} ${outlineItems.length ? "has-outline" : ""} ${preferences.boundaries ? "" : "hide-boundaries"} ${preferences.pageNumbers ? "" : "hide-page-numbers"} ${preferences.printNumbers ? "print-page-numbers" : ""} page-direction-${preferences.pageDirection} density-${preferences.density} ${preferences.showIcons ? "" : "hide-note-icons"} page-layout-${active?.page_layout === "infinite" ? "infinite" : "a4"}`}
      style={
        {
          "--sidebar-width": `${preferences.sidebarWidth}px`,
          "--page-margin": `${(preferences.margin * 96) / 25.4}px`,
          "--doc-line-height": preferences.lineHeight,
          "--math-scale": preferences.mathSize,
          "--doc-font-size": `${fontSize}px`,
          "--doc-font-family":
            fontFamily === "serif"
              ? "KaTeX_Main, Georgia, serif"
              : fontFamily === "mono"
                ? "ui-monospace, SFMono-Regular, Menlo, monospace"
                : 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        } as React.CSSProperties
      }
    >
      {switcher}
      {!workspace && !preview && !focus && sidebarDismiss}
      {sidebar && (!preview || workspace) && !focus && (
        <SidebarPortal
          host={workspace?.sidebarHost}
          visible={!workspace || (workspace.active && !!workspace.sidebarHost)}
        >
          <aside
            className={`sidebar density-${preferences.density}`}
            style={{ "--sidebar-width": `${preferences.sidebarWidth}px` }}
          >
            <div className="brand">
              <Button variant="ghost" className="brand-button" onClick={() => showLibrary()}>
                <span className="brand-mark">λ</span>
                <span>lemma</span>
              </Button>
              <Button
                variant="ghost"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="icon-button sidebar-collapse"
                onClick={() => setSidebar(false)}
              >
                <PanelLeftClose size={16} />
              </Button>
            </div>
            <Button variant="ghost" className="new-note" onClick={() => create(currentFolder)}>
              <Plus size={15} />
              New note<span>⌘ N</span>
            </Button>
            <Button variant="ghost" className="side-link" onClick={() => showLibrary(null, false)}>
              <Home size={15} /> All notes
            </Button>
            <Button variant="ghost" className="side-link" onClick={() => showLibrary(null, true)}>
              <Star size={15} /> Favorites
            </Button>
            <label className="search-field">
              <Search size={14} />
              <input
                aria-label="Search notes"
                placeholder="Search notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant="ghost"
                className="search-shortcut"
                aria-label="Open note search"
                onClick={() => setSearchOpen(true)}
              >
                <kbd>⇧⌘ P</kbd>
              </Button>
            </label>
            {renderFolderNavigation()}
            {(() => {
              const all = [
                ...new Set(notes.flatMap((n) => ((n as any).tags || []) as string[])),
              ].sort();
              return all.length ? (
                <section className="sidebar-tags">
                  <div className="notes-label">Tags</div>
                  <div className="sidebar-tag-list">
                    {all.map((t) => (
                      <Button
                        variant="ghost"
                        key={t}
                        className={`sidebar-tag ${tagFilter === t ? "active" : ""}`}
                        onClick={() => setTagFilter(tagFilter === t ? null : t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
            <div className="sidebar-bottom">
              <div className="sidebar-help">
                <Keyboard size={14} />{" "}
                <span>
                  <kbd>⇧⌘ P</kbd> Search notes
                </span>
              </div>
              <Button
                variant="ghost"
                className="settings-item"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 size={15} /> Settings
              </Button>
              <Button variant="ghost" onClick={toggleTheme} className="settings-item">
                <Contrast size={15} />
                <span>{dark ? "Dark appearance" : "Light appearance"}</span>
              </Button>
            </div>
          </aside>
        </SidebarPortal>
      )}
      <section
        className={`workspace ${referenceOpen ? `has-reference reference-${referenceSide}` : ""}`}
      >
        {!workspace && !sharedView && (
          <div className="reference-tools">
            <Button variant="ghost" onClick={() => setReferenceOpen((v) => !v)}>
              Open beside
            </Button>
            {!preview && (
              <Button variant="ghost" onClick={() => runCommand("Document / PDF")}>
                Attach document
              </Button>
            )}
          </div>
        )}
        {referenceOpen && (
          <ReferencePane
            notes={sharedView ? [] : notes}
            selected={referenceId}
            attachment={referenceAttachment}
            side={referenceSide}
            onSide={setReferenceSide}
            onAttachment={(attachment) => {
              setReferenceAttachment(attachment);
              setReferenceId("");
            }}
            onSelect={(id) => {
              setReferenceId(id);
              setReferenceAttachment(null);
            }}
            onClose={() => setReferenceOpen(false)}
          />
        )}

        {showNoteHeader && (
          <HeaderPortal host={workspace?.headerHost}>
            {workspace ? (
              <NoteHeader
                title={active?.title || "Untitled"}
                folder={folderName(active?.folder_id || null)}
                read={preview}
                saved={saved}
                onRead={setPreview}
                onFocus={workspace.onFocus}
                onShare={shareLink}
                onRename={rename}
                onLibrary={() => showLibrary()}
                onSidebar={() => setSidebar((v) => !v)}
                onExport={() => setExportOpen(true)}
                onHistory={loadHistory}
                onSettings={() => setSettingsOpen(true)}
                onFavorite={toggleFav}
                shared={!!active?.share_token}
                onRevoke={revokeShare}
                exportDialog={
                  exportOpen && editor ? (
                    <ExportDialog
                      title={active?.title || "Untitled"}
                      editor={editor}
                      onClose={() => setExportOpen(false)}
                    />
                  ) : null
                }
              />
            ) : (
              <header className="topbar">
                {!sidebar && !preview && (
                  <Button
                    variant="ghost"
                    className="icon-button"
                    title="Open sidebar"
                    onClick={() => setSidebar(true)}
                  >
                    <PanelLeftOpen size={17} />
                  </Button>
                )}
                <div className="breadcrumb">
                  <Button
                    variant="ghost"
                    className="breadcrumb-library"
                    disabled={sharedView}
                    onClick={() => showLibrary()}
                  >
                    <Home size={14} />
                    {folderName(active?.folder_id || null)}
                  </Button>
                  <span className="crumb-sep" aria-hidden="true">
                    /
                  </span>
                  <Button
                    variant="ghost"
                    onClick={rename}
                    disabled={sharedView}
                    className="breadcrumb-title"
                  >
                    {active?.title || "Untitled"} <ChevronDown size={13} />
                  </Button>
                </div>
                <div className="top-actions">
                  {!sharedView && (
                    <Button
                      variant="ghost"
                      className="icon-button"
                      title="Search notes (⌘⇧P)"
                      onClick={() => setSearchOpen(true)}
                    >
                      <Search size={16} />
                    </Button>
                  )}
                  <div className={`save-status ${saved}`}>
                    <span className="status-dot" />
                    {saved === "saving"
                      ? "Saving…"
                      : saved === "offline"
                        ? "Saved locally"
                        : "Saved"}
                  </div>
                  {active && !preview && (
                    <>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        title="Favorite"
                        onClick={toggleFav}
                      >
                        <Star size={16} fill={active.is_favorite ? "currentColor" : "none"} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        title="Share read-only link"
                        onClick={shareLink}
                      >
                        <Share2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        title="Focus mode (⌘⇧F)"
                        onClick={() => (workspace ? workspace.onFocus() : setFocus(true))}
                      >
                        <Focus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        title="Writing settings"
                        onClick={() => setSettingsOpen(true)}
                      >
                        <Settings2 size={16} />
                      </Button>
                    </>
                  )}
                  {sharedView ? (
                    <span className="shared-read-label">
                      <Eye size={14} /> Shared · read only
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      className={`action-button ${preview ? "selected" : ""}`}
                      onClick={() => setPreview(!preview)}
                    >
                      <Eye size={15} />
                      <span>{preview ? "Edit" : "Read mode"}</span>
                    </Button>
                  )}
                  {preview && (
                    <Button
                      variant="ghost"
                      className="icon-button"
                      title="Focus mode"
                      onClick={() => (workspace ? workspace.onFocus() : setFocus(true))}
                    >
                      <Focus size={16} />
                    </Button>
                  )}
                  <div className="menu-anchor">
                    <Button
                      variant="ghost"
                      className="export-button"
                      onClick={() => setExportOpen(!exportOpen)}
                    >
                      <Download size={15} />
                      <span>Export</span>
                      <ChevronDown size={13} />
                    </Button>
                    {active?.share_token && !sharedView && (
                      <Button variant="ghost" title="Stop sharing" onClick={revokeShare}>
                        <X size={15} />
                      </Button>
                    )}
                    {exportOpen && editor && (
                      <ExportDialog
                        title={active?.title || "Untitled"}
                        editor={editor}
                        onClose={() => setExportOpen(false)}
                      />
                    )}
                    {!sharedView && (
                      <Button variant="ghost" title="Version history" onClick={loadHistory}>
                        <Clock3 size={15} />
                      </Button>
                    )}
                  </div>
                </div>
              </header>
            )}
          </HeaderPortal>
        )}
        {focus && (
          <Button
            variant="ghost"
            className="focus-exit"
            onClick={() => setFocus(false)}
            title="Exit focus mode · Escape"
          >
            Exit focus <kbd>esc</kbd>
          </Button>
        )}
        <div className="note-chrome">
          <div className="document-controls">
            <div className="folder-select">
              <span>Move to</span>
              <WorkspaceSelect
                label="Move note"
                value={active?.folder_id || ""}
                options={[
                  { value: "", label: "All notes" },
                  ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                ]}
                onChange={(value) => moveActive(value || null)}
              />
            </div>
          </div>
          <div className="document-meta">
            <Button
              variant="ghost"
              className="doc-subject"
              disabled={preview}
              onClick={updateLabel}
            >
              {active?.document_label || "LECTURE NOTES"}
            </Button>
            <span>
              {active
                ? new Date(active.updated_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "New document"}
            </span>
          </div>
          {(() => {
            const patchActive = (patch: Record<string, unknown>) => {
              if (!active) return;
              const n = { ...active, ...patch, updated_at: new Date().toISOString() };
              setActive(n);
              activeRef.current = n;
              setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
              draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
              void repository.save(n).catch(() => {});
            };
            return (
              <IconPicker
                icon={(active as any)?.icon || "📄"}
                readOnly={preview}
                onChange={(icon) => patchActive({ icon })}
              />
            );
          })()}
          <input
            className="document-title"
            value={active?.title || ""}
            placeholder="Untitled"
            readOnly={preview}
            onChange={(e) => {
              if (!active) return;
              const n = {
                ...active,
                title: e.target.value || "Untitled",
                updated_at: new Date().toISOString(),
              };
              setActive(n);
              activeRef.current = n;
              setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
              draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
            }}
          />
          {(() => {
            const patchActive = (patch: Record<string, unknown>) => {
              if (!active) return;
              const n = { ...active, ...patch, updated_at: new Date().toISOString() };
              setActive(n);
              activeRef.current = n;
              setNotes((ns) => ns.map((x) => (x.id === n.id ? n : x)));
              draftStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
              void repository.save(n).catch(() => {});
            };
            return (
              <TagRow
                tags={(active as any)?.tags || []}
                readOnly={preview}
                onChange={(tags) => patchActive({ tags })}
              />
            );
          })()}
        </div>
        <div
          className="editor-toolbar"
          onMouseDownCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("button"))
              event.preventDefault();
          }}
        >
          <div className="toolbar-history">
            <Button
              variant="ghost"
              title="Undo · ⌘Z"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 size={15} />
            </Button>
            <Button
              variant="ghost"
              title="Redo · ⇧⌘Z"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 size={15} />
            </Button>
          </div>
          <div className="toolbar-rule" />
          {[
            [Bold, "Bold", "bold"],
            [Italic, "Italic", "italic"],
            [Underline, "Underline", "underline"],
            [Strikethrough, "Strikethrough", "strike"],
            [Code2, "Inline code", "code"],
            [Heading1, "Heading", "h1"],
            [Heading2, "Subheading", "h2"],
            [List, "Bulleted list", "bullet"],
            [ListOrdered, "Numbered list", "ordered"],
            [ListTodo, "Task list", "task"],
            [Quote, "Quote", "quote"],
            [Highlighter, "Highlight", "highlight"],
            [Link2, "Link", "link"],
            [Sigma, "Equation", "math"],
            ["$", "Inline equation", "inlineMath"],
            [Minus, "Divider", "divider"],
          ].map((item) => {
            const [Icon, label, action] = item as [LucideIcon | string, string, string];
            return (
              <Button
                variant="ghost"
                key={action}
                className={
                  action === "h1" || action === "bullet" || action === "math"
                    ? "toolbar-group-start"
                    : ""
                }
                title={label}
                onClick={() => {
                  if (!editor) return;
                  switch (action) {
                    case "bold":
                      editor.chain().focus().toggleBold().run();
                      break;
                    case "italic":
                      editor.chain().focus().toggleItalic().run();
                      break;
                    case "underline":
                      editor.chain().focus().toggleMark("underline").run();
                      break;
                    case "strike":
                      editor.chain().focus().toggleStrike().run();
                      break;
                    case "code":
                      editor.chain().focus().toggleCode().run();
                      break;
                    case "h1":
                      editor.chain().focus().toggleHeading({ level: 1 }).run();
                      break;
                    case "h2":
                      editor.chain().focus().toggleHeading({ level: 2 }).run();
                      break;
                    case "bullet":
                      editor.chain().focus().toggleBulletList().run();
                      break;
                    case "ordered":
                      editor.chain().focus().toggleOrderedList().run();
                      break;
                    case "task":
                      editor.chain().focus().toggleTaskList().run();
                      break;
                    case "quote":
                      editor.chain().focus().toggleBlockquote().run();
                      break;
                    case "highlight":
                      editor.chain().focus().toggleHighlight({ color: "#e4ede7" }).run();
                      break;
                    case "link": {
                      const href = window.prompt("Link URL");
                      if (href) editor.chain().focus().setMark("link", { href }).run();
                      break;
                    }
                    case "math":
                      insertMath(false);
                      break;
                    case "inlineMath":
                      insertMath(true);
                      break;
                    case "divider":
                      editor.chain().focus().setHorizontalRule().run();
                      break;
                  }
                }}
              >
                {typeof Icon === "string" ? (
                  <span className="inline-math-icon">{Icon}</span>
                ) : (
                  <Icon size={15} />
                )}
              </Button>
            );
          })}
          <div className="toolbar-rule" />
          <Button
            variant="ghost"
            title="Text color"
            onClick={() => editor?.chain().focus().setColor("#688674").run()}
          >
            <Palette size={15} />
          </Button>
          <Button
            variant="ghost"
            className={demoMode ? "toolbar-selected" : ""}
            title="Demonstration typography · type $\\ to toggle"
            onClick={() =>
              setDemoMode((v) => {
                localStorage.setItem("lemma:demo", String(!v));
                return !v;
              })
            }
          >
            <Type size={15} />
          </Button>
        </div>

        <div
          className="doc-scroll"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files") && !preview && !sharedView) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          }}
          onDropCapture={async (event) => {
            if (!event.dataTransfer.files.length || preview || sharedView || !editor) return;
            event.preventDefault();
            event.stopPropagation();
            const noteId = activeRef.current?.id;
            const point = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (point) editor.commands.setTextSelection(point.pos);
            const target = trackInsertion(editor);
            try {
              const blocks = await fileBlocks(Array.from(event.dataTransfer.files));
              if (activeRef.current?.id === noteId && !editor.isDestroyed) {
                target.restore();
                editor
                  .chain()
                  .focus(undefined, { scrollIntoView: false })
                  .insertContent(blocks)
                  .run();
              }
            } catch (error) {
              window.alert(error instanceof Error ? error.message : "Could not open these files.");
            } finally {
              target.dispose();
            }
          }}
        >
          <article className="document" id="document">
            {editor && (
              <div
                className="editor-area"
                onKeyDownCapture={(e) => {
                  if (
                    menu &&
                    !(e.target instanceof HTMLInputElement) &&
                    e.key.length === 1 &&
                    !e.metaKey &&
                    !e.ctrlKey
                  ) {
                    e.preventDefault();
                    setSlashFilter((f) => f + e.key);
                    setMenuIndex(0);
                  }
                  if (menu && !(e.target instanceof HTMLInputElement) && e.key === "Backspace") {
                    e.preventDefault();
                    setSlashFilter((f) => f.slice(0, -1));
                    setMenuIndex(0);
                  }
                }}
              >
                <EditorContent editor={editor} />
                {!preview && !sharedView && !menu && (!workspace || workspace.active) && (
                  <SelectionMenu editor={editor} />
                )}
                {attachmentPicker && (
                  <AttachmentPicker
                    onLink={(url) => {
                      attachmentTarget.current?.restore();
                      editor
                        .chain()
                        .focus(undefined, { scrollIntoView: false })
                        .insertContent({
                          type: "attachment",
                          attrs: {
                            src: url,
                            mime: "application/pdf",
                            name: decodeURIComponent(
                              new URL(url).pathname.split("/").pop() || "Linked PDF",
                            ),
                          },
                        })
                        .run();
                    }}
                    onClose={() => {
                      setAttachmentPicker(false);
                      attachmentTarget.current?.dispose();
                      attachmentTarget.current = null;
                    }}
                    onChoose={async (files) => {
                      const noteId = activeRef.current?.id;
                      const blocks = await fileBlocks(files);
                      if (!editor.isDestroyed && activeRef.current?.id === noteId) {
                        attachmentTarget.current?.restore();
                        editor
                          .chain()
                          .focus(undefined, { scrollIntoView: false })
                          .insertContent(blocks)
                          .run();
                      }
                    }}
                  />
                )}
                {!preview && !sharedView && (!workspace || workspace.active) && (
                  <BlockControls
                    editor={editor}
                    onInsert={() => {
                      setMenuIndex(0);
                      setMenu(true);
                      setSlashFilter("");
                    }}
                  />
                )}
                {menu && (
                  <BlockMenu editor={editor} onClose={() => setMenu(false)}>
                    <label className="slash-search">
                      <Search size={16} />
                      <Input
                        onFocus={(event) => {
                          const menu = event.currentTarget.closest(".caret-block-menu");
                          if (menu) menu.scrollTop = 0;
                        }}
                        aria-label="Search blocks"
                        placeholder="Search blocks…"
                        value={slashFilter}
                        onChange={(e) => {
                          setSlashFilter(e.target.value);
                          setMenuIndex(0);
                        }}
                      />
                    </label>
                    <div className="slash-heading">
                      Insert block <kbd>↑ ↓ ↵</kbd>
                    </div>
                    {filteredCommands.map((c, i) => (
                      <Button
                        variant="ghost"
                        key={c}
                        className={i === menuIndex ? "focused" : ""}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runCommand(c)}
                      >
                        <span className="slash-icon" aria-hidden="true">
                          {(() => {
                            const Icon = commandIcons[commands.indexOf(c)];
                            return <Icon size={16} />;
                          })()}
                        </span>
                        <span>{c}</span>
                        <kbd>{commandShortcuts[c]}</kbd>
                      </Button>
                    ))}
                    {!filteredCommands.length && <div className="slash-empty">No blocks found</div>}
                  </BlockMenu>
                )}
                {snipQuery && matchingSnippets.length > 0 && (
                  <div className="snippet-menu">
                    <div className="slash-heading">
                      SNIPPETS <span>TAB TO MOVE</span>
                    </div>
                    {matchingSnippets.slice(0, 6).map((s, i) => (
                      <Button
                        variant="ghost"
                        key={s.label}
                        className={i === snippetIndex ? "focused" : ""}
                        onClick={() => insertSnippet(s)}
                      >
                        <code>{s.label}</code>
                        <span>{s.template.replace(/[«»]/g, "")}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="editor-footer">
              <span className="sheet-indicator" aria-label="Page count">
                <span data-current-sheet>1</span>/<span data-sheet-total>1</span>
              </span>
            </div>
          </article>
        </div>
        <div className="graph-editor-panel" />
        {outlineItems.length > 0 && (
          <Outline
            key={active?.id}
            items={outlineItems}
            onSelect={(target) => {
              if (!editor) return;
              const resolved = editor.state.doc.resolve(target);
              const transaction = editor.state.tr;
              for (let depth = 1; depth <= resolved.depth; depth++) {
                const node = resolved.node(depth);
                if (node.type.name === "toggleHeading" && node.attrs.collapsed)
                  transaction.setNodeMarkup(resolved.before(depth), undefined, {
                    ...node.attrs,
                    collapsed: false,
                  });
              }
              if (transaction.docChanged) editor.view.dispatch(transaction);
              editor
                .chain()
                .setTextSelection(target + 1)
                .scrollIntoView()
                .focus()
                .run();
            }}
          />
        )}
        {preview && (
          <div className="preview-banner">
            <span>Document preview</span>
            <Button variant="ghost" onClick={exportPDF}>
              <Download size={14} /> Print / Save PDF
            </Button>
          </div>
        )}
      </section>
      {searchOpen && (
        <div className="search-scrim" onClick={() => setSearchOpen(false)}>
          <div
            className="command-search"
            role="dialog"
            aria-modal="true"
            aria-label="Search notes"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchOpen(false);
                return;
              }
              if (event.key === "Tab") {
                const controls = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>("input, button:not(:disabled)"),
                );
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                }
                if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
                return;
              }
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const results = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(".command-results button"),
              );
              if (!results.length) return;
              event.preventDefault();
              const current = results.indexOf(document.activeElement as HTMLButtonElement);
              const next =
                event.key === "ArrowDown"
                  ? (current + 1) % results.length
                  : current <= 0
                    ? results.length - 1
                    : current - 1;
              results[next].focus();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <label className="search-field">
              <Search size={16} />
              <input
                ref={commandSearchRef}
                aria-label="Search notes"
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                  if (e.key === "Enter" && searchResults[0]) {
                    activate(searchResults[0]);
                    setSearchOpen(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                className="search-dismiss"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                Esc
              </Button>
            </label>
            <div className="command-results">
              {!searchResults.length && (
                <p className="search-empty" role="status">
                  No notes found. Try another title or phrase.
                </p>
              )}
              {searchResults.slice(0, 8).map((note) => (
                <Button
                  variant="ghost"
                  key={note.id}
                  onClick={() => {
                    activate(
                      note,
                      search
                        ? pagesFor(note).find((page) =>
                            searchableText(page.content)
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                          )?.id
                        : undefined,
                    );
                    setSearchOpen(false);
                  }}
                >
                  <strong>{note.title}</strong>
                  <small>{folderName(note.folder_id)}</small>
                </Button>
              ))}
            </div>
            <footer>
              <span className="search-help">
                <kbd>↑</kbd>
                <kbd>↓</kbd> Navigate
              </span>
              <Button
                variant="ghost"
                className="search-open-action"
                disabled={!searchResults.length}
                onClick={() => {
                  if (searchResults[0]) {
                    activate(searchResults[0]);
                    setSearchOpen(false);
                  }
                }}
              >
                Open first result <kbd>↵</kbd>
              </Button>
            </footer>
          </div>
        </div>
      )}
      {settingsDialog}
      {historyOpen && (
        <div className="history-scrim" onClick={() => setHistoryOpen(false)}>
          <aside className="history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="history-head">
              <div>
                <span className="panel-eyebrow">DOCUMENT</span>
                <h2>Version history</h2>
              </div>
              <Button variant="ghost" onClick={() => setHistoryOpen(false)}>
                <X size={17} />
              </Button>
            </div>
            <p className="history-note">Showing the 25 most recent snapshots.</p>
            {history.length ? (
              history.map((v) => (
                <div key={v.id} className="history-entry">
                  <span>{new Date(v.created_at).toLocaleString()}</span>
                  <strong>{v.title}</strong>
                  <Button variant="ghost" onClick={() => restore(v)}>
                    Restore version
                  </Button>
                </div>
              ))
            ) : (
              <p className="history-empty">No earlier versions yet.</p>
            )}
          </aside>
        </div>
      )}
      {!preview && active && (
        <Button
          variant="ghost"
          className="delete-floating"
          title="Delete note"
          onClick={deleteCurrent}
        >
          <Trash2 size={14} />
        </Button>
      )}
    </main>
  );
}
