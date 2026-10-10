'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, InputRule } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import { Fragment, Slice } from '@tiptap/pm/model';
import { clipboardText, markdownContent, normalizePastedHTML } from '@/lib/editor/clipboard';
import { Pagination } from '@/lib/editor/pagination';
import IconPicker, { DocumentIcon } from './IconPicker';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { MathBlock, InlineMath, Graph, Callout, PageBreak } from './nodes';
import { snippets, expand } from '@/lib/editor/snippets';
import { Bold, Italic, Strikethrough, Code2, Heading1, Heading2, List, ListOrdered, ListTodo, Quote, Sigma, Underline, Link2, Undo2, Redo2, Highlighter, Palette, Minus, Plus, Search, FileText, Folder as FolderIcon, PanelLeftClose, PanelLeftOpen, Download, Eye, Clock3, Star, Trash2, X, ChevronDown, ChevronRight, Keyboard, FolderPlus, Settings2, Share2, BookOpen, Focus, Type, Home, Check } from 'lucide-react';
import 'katex/dist/katex.min.css';
import type { Folder, Note, NotePage, Version } from '@/lib/notes';
import { sample } from '@/lib/editor/sample';
import { initialTitle, newNote, pagesFor, repository } from '@/lib/notes';
import { supabase } from '@/lib/supabase/client';
import AuthScreen from '@/components/auth/AuthScreen';
import OutlineRail from './OutlineRail';
import MathPalette from './MathPalette';
import CommandSearch from './CommandSearch';
import Overlay from './Overlay';
const commands = ['Inline equation', 'Text', 'Heading 1', 'Heading 2', 'Heading 3', 'Bullet list', 'Numbered list', 'Task list', 'Quote', 'Callout', 'Divider', 'Equation', 'Graph', 'Code block'];
const commandIcon = ['ƒ', 'T', 'H1', 'H2', 'H3', '•', '1.', '☑', '❝', '▧', '—', '∑', '⌁', '</>'];
const ownerStoragePrefix = (ownerId: string | undefined | null) => `lemma:${ownerId || 'local'}:`;
const draftStorageKey = (ownerId: string | undefined | null, id: string) => `${ownerStoragePrefix(ownerId)}note:${id}`;
const folderStorageKey = (ownerId: string | undefined | null) => `${ownerStoragePrefix(ownerId)}folders`;
type DropdownOption = {
    value: string;
    label: string;
};
function Dropdown({ value, options, onChange, label }: {
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => { if (!open)
        return; const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node))
        setOpen(false); }; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape')
        setOpen(false); }; document.addEventListener('mousedown', close); document.addEventListener('keydown', escape); return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); }; }, [open]);
    const selected = options.find(option => option.value === value)?.label || options[0]?.label || '';
    return <div className="dropdown" ref={root}><button type="button" className="dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(value => !value)}><span>{selected}</span><ChevronDown size={14}/></button>{open && <div className="dropdown-menu" role="listbox" aria-label={label}>{options.map(option => <button type="button" role="option" aria-selected={option.value === value} className="dropdown-option" key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={14}/>}</button>)}</div>}</div>;
}
export default function Editor() {
    const router = useRouter();
    const changeTheme = (value: 'system' | 'light' | 'dark') => { setTheme(value); localStorage.setItem('lemma:theme', value); const next = value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); setDark(next); localStorage.setItem('lemma:dark', String(next)); };
    const toggleTheme = () => changeTheme(dark ? 'light' : 'dark');
    const [notes, setNotes] = useState<Note[]>([]), [folders, setFolders] = useState<Folder[]>([]), [active, setActive] = useState<Note | null>(null), [activePageId, setActivePageId] = useState(''), [user, setUser] = useState<User | null>(null), [authReady, setAuthReady] = useState(false), [shareError, setShareError] = useState(''), [saved, setSaved] = useState<'saved' | 'saving' | 'offline'>('saved'), [search, setSearch] = useState(''), [sidebar, setSidebar] = useState(true), [menu, setMenu] = useState(false), [exportOpen, setExportOpen] = useState(false), [preview, setPreview] = useState(false), [sharedView, setSharedView] = useState(false), [focus, setFocus] = useState(false), [history, setHistory] = useState<Version[]>([]), [historyOpen, setHistoryOpen] = useState(false), [dark, setDark] = useState(false), [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system'), [darkinit, setDarkinit] = useState(false), [menuIndex, setMenuIndex] = useState(0), [slashFilter, setSlashFilter] = useState(''), [snipQuery, setSnipQuery] = useState(''), [snippetIndex, setSnippetIndex] = useState(0), [snipFields, setSnipFields] = useState<[
        number,
        number
    ][]>([]), [fieldIndex, setFieldIndex] = useState(0), [library, setLibrary] = useState(false), [currentFolder, setCurrentFolder] = useState<string | null>(null), [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set()), [favoritesOnly, setFavoritesOnly] = useState(false), [settingsOpen, setSettingsOpen] = useState(false), [searchOpen, setSearchOpen] = useState(false), [fontFamily, setFontFamily] = useState('serif'), [fontSize, setFontSize] = useState(16), [demoMode, setDemoMode] = useState(false), [outline, setOutline] = useState(true);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [iconPicker, setIconPicker] = useState(false), [typewriter, setTypewriter] = useState(true);
    const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
    const activeRef = useRef<Note | null>(active);
    useEffect(() => { activeRef.current = active; }, [active]);
    const insertSnippetRef = useRef<(item: {
        template: string;
    }) => void>(() => { });
    const runCommandRef = useRef<(command: string) => void>(() => { });
    const userRef = useRef<User | null>(user);
    useEffect(() => { userRef.current = user; }, [user]);
    const activePages = useMemo(() => active ? pagesFor(active) : [], [active]);
    const activePage = useMemo(() => { const first = activePages[0]; if (!first) return null; if (activePages.length === 1) return first; return { ...first, content: { ...first.content, content: activePages.flatMap((page, index) => [...(index ? [{ type: 'pageBreak' }] : []), ...(page.content.content || [])]) } }; }, [activePages]);
    const editor = useEditor({ immediatelyRender: false, editable: !preview && !sharedView, extensions: [Document.extend({ addAttributes() { return { icon: { default: 'document' } }; } }), Pagination, PageBreak, StarterKit.configure({ document: false, heading: { levels: [1, 2, 3] } }), Placeholder.configure({ placeholder: 'Start writing, or type “/” for commands…' }), TextStyle, Color, Extension.create({ name: 'lemmaMathShortcuts', addKeyboardShortcuts() { return { 'Mod-m': () => this.editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex: '' } }).run(), 'Mod-Shift-m': () => this.editor.chain().focus().insertContent({ type: 'mathBlock', attrs: { latex: '' } }).run(), 'Mod-Shift-e': () => this.editor.chain().focus().insertContent({ type: 'mathBlock', attrs: { latex: '' } }).run() }; }, addInputRules() { return [new InputRule({ find: /\$([^$]+)\$$/, handler: ({ range, match, commands }) => { const from = range.to - match[0].length; commands.insertContentAt({ from, to: range.to }, { type: 'inlineMath', attrs: { latex: match[1] } }); } }), new InputRule({ find: /^\$\$$/, handler: ({ state, range, chain }) => { const $from = state.doc.resolve(range.from); if (!$from.parent.isTextblock || $from.depth === 0)
                            return; const start = $from.before(); const end = $from.after(); chain().insertContentAt({ from: start, to: end }, [{ type: 'mathBlock', attrs: { latex: '' } }, { type: 'paragraph' }]).setTextSelection(start + 2).run(); } })]; } }), Highlight.configure({ multicolor: true }), TaskList, TaskItem.configure({ nested: true }), MathBlock, InlineMath, Graph, Callout], content: activePage?.content || { type: 'doc', content: [{ type: 'paragraph' }] }, onUpdate: ({ editor }) => { const json = editor.getJSON(); const current = activeRef.current; if (current) {
            const pages = pagesFor(current);
            const pageId = pages[0]?.id;
            const nextPages = [{ ...pages[0], content: json, updated_at: new Date().toISOString() }];
            const updated = { ...current, pages: nextPages, content: json, title: current.title === 'Untitled' || (pageId === pages[0]?.id && current.title === initialTitle(current.content)) ? initialTitle(json) : current.title, updated_at: new Date().toISOString() };
            activeRef.current = updated;
            setActive(updated);
            setNotes(ns => ns.map(n => n.id === updated.id ? updated : n));
            localStorage.setItem(draftStorageKey(userRef.current?.id, updated.id), JSON.stringify(updated));
            setSaved('saving');
        } }, editorProps: { attributes: { class: 'lemma-prose' }, transformPastedHTML: normalizePastedHTML, clipboardTextSerializer: slice => clipboardText({ type: 'doc', content: slice.content.toJSON() }), handlePaste: (view, event) => { const text = event.clipboardData?.getData('text/plain') || '', html = event.clipboardData?.getData('text/html'); if (html || !text || !/(\$|\\[([\]]|^#{1,3} |^[-*+] |^\d+\. |\*\*|```)/m.test(text)) return false; event.preventDefault(); const blocks = markdownContent(text); const nodes = blocks.map(block => view.state.schema.nodeFromJSON(block)); view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.fromArray(nodes), 0, 0)).scrollIntoView()); return true; } } });
    const refresh = useCallback(async () => { const ownerId = userRef.current?.id; const params = new URLSearchParams(location.search); const token = params.get('share'); if (token && supabase) {
        try {
            const { data, error } = await supabase.rpc('get_shared_note', { p_token: token });
            if (error)
                throw error;
            const row = Array.isArray(data) ? data[0] : data;
            if (!row)
                throw Error('This shared note is unavailable.');
            const shared = { ...row, is_favorite: false, folder_id: null, share_token: token } as Note;
            setNotes([shared]);
            setActive(shared);
            const page = pagesFor(shared).find(item => item.id === params.get('page')) || pagesFor(shared)[0];
            setActivePageId(page.id);
            setLibrary(false);
            setPreview(true);
            setSharedView(true);
            setShareError('');
            return;
        }
        catch {
            setSharedView(true);
            setPreview(true);
            setNotes([]);
            setActive(null);
            setShareError('This share link is invalid or no longer available.');
            setSaved('offline');
            return;
        }
    } try {
        const remote = await repository.list();
        let remoteFolders: Folder[] = [];
        try {
            remoteFolders = await repository.listFolders();
        }
        catch { }
        const prefix = ownerStoragePrefix(ownerId);
        let localFolders: Folder[] = [];
        try {
            localFolders = JSON.parse(localStorage.getItem(folderStorageKey(ownerId)) || '[]') as Folder[];
        }
        catch { }
        for (const folder of localFolders)
            if (!remoteFolders.some(item => item.id === folder.id))
                try {
                    await repository.saveFolder(folder);
                }
                catch { }
        const mergedFolders = [...remoteFolders];
        for (const folder of localFolders)
            if (!mergedFolders.some(item => item.id === folder.id))
                mergedFolders.push(folder);
        setFolders(mergedFolders);
        setExpandedFolders(new Set(mergedFolders.map(folder => folder.id)));
        const local = Object.keys(localStorage).filter(key => key.startsWith(`${prefix}note:`)).map(key => { try {
            return JSON.parse(localStorage.getItem(key)!) as Note;
        }
        catch {
            return null;
        } }).filter((note): note is Note => !!note);
        const merged: Note[] = [...remote.map(note => ({ ...note, folder_id: note.folder_id || null, document_label: note.document_label || 'LECTURE NOTES', pages: note.pages || [], page_layout: (note.page_layout === 'infinite' ? 'infinite' : 'vertical') as Note['page_layout'] }))];
        for (const note of local) {
            const index = merged.findIndex(item => item.id === note.id);
            if (index < 0 || new Date(note.updated_at) > new Date(merged[index].updated_at)) {
                if (index < 0)
                    merged.push(note);
                else
                    merged[index] = note;
            }
        }
        merged.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        setNotes(merged);
        const id = params.get('note');
        let current = merged.find(note => note.id === id) || merged[0] || null;
        if (!current && (!supabase || ownerId)) {
            const demo = newNote();
            demo.title = 'Sommes géométriques';
            demo.content = sample;
            demo.pages = [{ ...pagesFor(demo)[0], content: sample }];
            localStorage.setItem(draftStorageKey(ownerId, demo.id), JSON.stringify(demo));
            merged.unshift(demo);
            current = demo;
            try {
                await repository.save(demo);
            }
            catch {
                setSaved('offline');
            }
        }
        setActive(current);
        if (current) {
            const page = pagesFor(current).find(item => item.id === params.get('page')) || pagesFor(current)[0];
            setActivePageId(page.id);
        }
        setLibrary(!id);
        setPreview(params.get('mode') === 'read');
        setSharedView(false);
        setDemoMode(localStorage.getItem('lemma:demo') === 'true');
    }
    catch {
        try {
            const storedFolders = JSON.parse(localStorage.getItem(folderStorageKey(ownerId)) || '[]') as Folder[];
            setFolders(storedFolders);
            setExpandedFolders(new Set(storedFolders.map(folder => folder.id)));
        }
        catch { }
        const prefix = `${ownerStoragePrefix(ownerId)}note:`;
        const local = Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => { try {
            return JSON.parse(localStorage.getItem(key)!) as Note;
        }
        catch {
            return null;
        } }).filter((note): note is Note => !!note).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        setNotes(local);
        const current = local.find(note => note.id === params.get('note')) || local[0] || null;
        setActive(current);
        if (current)
            setActivePageId(pagesFor(current).find(page => page.id === params.get('page'))?.id || pagesFor(current)[0].id);
        setPreview(params.get('mode') === 'read');
        setLibrary(!params.has('note'));
        setSaved('offline');
    } }, [setNotes, setActive, setActivePageId, setPreview, setSharedView, setShareError, setSaved, setFolders]);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const storedTheme = localStorage.getItem('lemma:theme');
            const initialTheme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : localStorage.getItem('lemma:dark') === 'true' ? 'dark' : 'system';
            setSidebar(window.innerWidth > 760);
            setTheme(initialTheme);
            setDark(initialTheme === 'dark' || (initialTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
            setFontFamily(localStorage.getItem('lemma:font') || 'serif');
            setFontSize(Number(localStorage.getItem('lemma:size')) || 16);
            setDemoMode(localStorage.getItem('lemma:demo') === 'true');
            setDarkinit(true);
        });
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;
        if (!supabase) {
            refreshTimer = setTimeout(() => { setAuthReady(true); void refresh(); }, 0);
            return () => { cancelAnimationFrame(frame); clearTimeout(refreshTimer); };
        }
        let initialized = false;
        let loadedOwner: string | null = null;
        // INITIAL_SESSION supplies startup state. Re-subscribing on user object
        // changes creates an auth/load loop; token refreshes must keep edits intact.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user || null;
            const ownerId = nextUser?.id || null;
            userRef.current = nextUser;
            setUser(nextUser);
            setAuthReady(true);
            if (initialized && loadedOwner === ownerId) return;
            initialized = true;
            loadedOwner = ownerId;
            clearTimeout(refreshTimer);
            if (nextUser || new URLSearchParams(location.search).has('share')) {
                // Leave the auth callback before querying Supabase (its session lock).
                refreshTimer = setTimeout(() => void refresh(), 0);
            } else {
                setNotes([]);
                setFolders([]);
                setActive(null);
            }
        });
        return () => { cancelAnimationFrame(frame); clearTimeout(refreshTimer); subscription.unsubscribe(); };
    }, [refresh]);
    useEffect(() => { const onOnline = () => void refresh(); window.addEventListener('online', onOnline); return () => window.removeEventListener('online', onOnline); }, [refresh]);
    useEffect(() => { if (!darkinit || theme !== 'system')
        return; const media = window.matchMedia('(prefers-color-scheme: dark)'); const update = () => { setDark(media.matches); localStorage.setItem('lemma:dark', String(media.matches)); }; media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, [darkinit, theme]);
    useEffect(() => { const onGlobalKey = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        setPaletteOpen(false);
        setExportOpen(false);
        setSettingsOpen(false);
        setHistoryOpen(false);
        setSearchOpen(false);
    } if (!sharedView && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setSearchOpen(true);
        return;
    } if (!sharedView && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocus(v => !v);
        return;
    } if (e.key === 'Escape' && focus)
        setFocus(false); }; window.addEventListener('keydown', onGlobalKey); return () => window.removeEventListener('keydown', onGlobalKey); }, [focus, sharedView]);
    useEffect(() => { if (!editor)
        return; let previous = ''; const onDemoKey = (e: KeyboardEvent) => { if (e.key === '\\' && previous === '$' && e.target instanceof HTMLElement && e.target.closest('.ProseMirror') && editor.state.selection.empty) {
        const { from } = editor.state.selection;
        if (from > 1 && editor.state.doc.textBetween(from - 1, from) === '$') {
            e.preventDefault();
            editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
            setDemoMode(v => { localStorage.setItem('lemma:demo', String(!v)); return !v; });
        }
    } previous = e.key; }; window.addEventListener('keydown', onDemoKey); return () => window.removeEventListener('keydown', onDemoKey); }, [editor]);
    useEffect(() => { const page = activePage; if (!editor || !page)
        return; const frame = requestAnimationFrame(() => { if (JSON.stringify(editor.getJSON()) !== JSON.stringify(page.content))
        editor.commands.setContent(page.content, { emitUpdate: false }); }); return () => cancelAnimationFrame(frame); }, [editor, active?.id, activePageId, activePage]);
    useEffect(() => { editor?.setEditable(!preview && !sharedView); }, [editor, preview, sharedView]);
    useEffect(() => { if (!active || sharedView)
        return; const timer = setTimeout(async () => { try {
        await repository.save(active);
        setSaved('saved');
        const key = draftStorageKey(user?.id, active.id);
        if (localStorage.getItem(key) === JSON.stringify(active))
            localStorage.removeItem(key);
    }
    catch {
        setSaved('offline');
    } }, 750); return () => clearTimeout(timer); }, [active, sharedView, user?.id]);
    useEffect(() => { const onPop = () => { const params = new URLSearchParams(location.search); if (params.has('share')) {
        void refresh();
        return;
    } const note = notes.find(item => item.id === params.get('note')); if (note) {
        setActive(note);
        setActivePageId(pagesFor(note).find(page => page.id === params.get('page'))?.id || pagesFor(note)[0].id);
        setLibrary(false);
        setPreview(params.get('mode') === 'read');
        setSharedView(false);
    }
    else
        setLibrary(true); }; window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, [notes, refresh]);
    const searchableText = (content: Note['content']): string => { const visit = (node: Note['content']): string => [node.text || '', ...(node.content || []).map(child => visit(child as Note['content']))].join(' '); return visit(content); };
    const searchResults = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || pagesFor(n).some(page => searchableText(page.content).toLowerCase().includes(search.toLowerCase())));
    const filteredCommands = commands.filter(c => c.toLowerCase().includes(slashFilter.toLowerCase()));
    const matchingSnippets = snippets.filter(s => s.label.toLowerCase().includes(snipQuery.toLowerCase()));
    useEffect(() => {
        if (!editor)
            return;
        const onKey = (e: KeyboardEvent) => {
            if (snipFields.length && e.key === 'Tab') {
                e.preventDefault();
                const next = fieldIndex + 1;
                if (next < snipFields.length) {
                    editor.commands.setTextSelection({ from: snipFields[next][0], to: snipFields[next][1] });
                    setFieldIndex(next);
                }
                else {
                    editor.commands.setTextSelection({ from: snipFields[0][0], to: snipFields[0][1] });
                    setFieldIndex(0);
                }
                return;
            }
            if (snipQuery) {
                if (e.key === 'Escape') {
                    setSnipQuery('');
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSnippetIndex(i => Math.min(i + 1, matchingSnippets.length - 1));
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSnippetIndex(i => Math.max(i - 1, 0));
                    return;
                }
                if (e.key === 'Enter' && matchingSnippets.length) {
                    e.preventDefault();
                    insertSnippetRef.current(matchingSnippets[snippetIndex]);
                    return;
                }
            }
            if (menu) {
                if (e.key === 'Escape') {
                    setMenu(false);
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMenuIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMenuIndex(i => Math.max(i - 1, 0));
                    return;
                }
                if (e.key === 'Enter' && filteredCommands.length) {
                    e.preventDefault();
                    runCommandRef.current(filteredCommands[menuIndex]);
                    return;
                }
            }
            if (e.key === '/' && editor.isEditable && e.target instanceof HTMLElement && e.target.closest('.ProseMirror') && editor.state.selection.empty && !menu) {
                const { from } = editor.state.selection;
                const $from = editor.state.doc.resolve(from);
                if ($from.parent.isTextblock && $from.parent.textContent.trim() === '') {
                    setTimeout(() => { editor.commands.deleteRange({ from, to: from + 1 }); const caret = editor.view.coordsAtPos(from); const area = document.querySelector('.editor-area')?.getBoundingClientRect(); if (area)
                        setSlashPosition({ top: (document.querySelector('.doc-scroll')?.getBoundingClientRect().bottom || window.innerHeight) - caret.bottom < 200 ? Math.max(0, caret.top - area.top - 420) : caret.bottom - area.top + 8, left: Math.max(0, Math.min(caret.left - area.left, area.width - 310)) }); setMenuIndex(0); setMenu(true); setSlashFilter(''); }, 0);
                }
            }
            if (snipQuery && e.key.length === 1) {
                setSnipQuery(q => q + e.key);
            }
            if (snipQuery && e.key === 'Backspace') {
                setSnipQuery(q => q.slice(0, -1));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editor, snipQuery, snippetIndex, matchingSnippets, menu, menuIndex, filteredCommands, fieldIndex, snipFields]);
    const insertSnippet = useCallback((s: {
        template: string;
    }) => { if (!editor)
        return; const { from, to } = editor.state.selection; const { text, fields } = expand(s.template, from); editor.chain().focus().insertContentAt({ from, to }, text).run(); setSnipFields(fields); setFieldIndex(0); if (fields.length)
        editor.commands.setTextSelection({ from: fields[0][0], to: fields[0][1] }); setSnipQuery(''); }, [editor]);
    const insertMath = useCallback((inline: boolean) => { if (!editor)
        return; editor.chain().focus().insertContent(inline ? { type: 'inlineMath', attrs: { latex: '' } } : { type: 'mathBlock', attrs: { latex: '' } }).run(); }, [editor]);
    const runCommand = useCallback((c: string) => { if (!editor)
        return; setMenu(false); setSlashFilter(''); switch (c) {
        case 'Inline equation':
            insertMath(true);
            break;
        case 'Text':
            editor.chain().focus().setParagraph().run();
            break;
        case 'Heading 1':
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            break;
        case 'Heading 2':
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            break;
        case 'Heading 3':
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            break;
        case 'Bullet list':
            editor.chain().focus().toggleBulletList().run();
            break;
        case 'Numbered list':
            editor.chain().focus().toggleOrderedList().run();
            break;
        case 'Task list':
            editor.chain().focus().toggleTaskList().run();
            break;
        case 'Quote':
            editor.chain().focus().toggleBlockquote().run();
            break;
        case 'Callout':
            editor.chain().focus().insertContent({ type: 'callout', content: [{ type: 'paragraph' }] }).run();
            break;
        case 'Divider':
            editor.chain().focus().setHorizontalRule().run();
            break;
        case 'Equation':
            insertMath(false);
            break;
        case 'Graph':
            editor.chain().focus().insertContent({ type: 'graph', attrs: { expressions: ['x^2'], xMin: -10, xMax: 10, height: 320 } }).run();
            break;
        case 'Code block': editor.chain().focus().toggleCodeBlock().run();
    } }, [editor, insertMath, setMenu, setSlashFilter]);
    useEffect(() => { insertSnippetRef.current = insertSnippet; runCommandRef.current = runCommand; }, [insertSnippet, runCommand]);
    const changeIcon = (value: string) => { editor?.commands.command(({ tr, dispatch }) => { if (dispatch) tr.setDocAttribute('icon', value); return true; }); };
    const showLibrary = (folderId: string | null = null, favorites = false) => { setCurrentFolder(folderId); setFavoritesOnly(favorites); setLibrary(true); router.push('/', { scroll: false }); };
    const activate = (note: Note, pageId?: string) => { const pages = pagesFor(note); const page = pages.find(item => item.id === pageId) || pages[0]; setActive(note); setActivePageId(page.id); setLibrary(false); setSharedView(false); setFocus(false); setMenu(false); if (historyOpen)
        setHistoryOpen(false); setHistory([]); const u = new URL(location.href); u.searchParams.set('note', note.id); u.searchParams.set('page', page.id); u.searchParams.delete('mode'); u.searchParams.delete('share'); router.push(`${u.pathname}${u.search}`, { scroll: false }); };
    const create = async (folderId: string | null = currentFolder) => { const n = newNote(folderId); const page = pagesFor(n)[0]; setNotes(ns => [n, ...ns]); setActive(n); activeRef.current = n; setActivePageId(page.id); setLibrary(false); editor?.commands.setContent(page.content, { emitUpdate: false }); localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n)); setSaved('saving'); try {
        await repository.save(n);
        await repository.snapshot(n);
        setSaved('saved');
    }
    catch {
        setSaved('offline');
    } activate(n, page.id); };
    const remove = async () => { if (!active || !window.confirm(`Delete “${active.title}”?`)) return; const id = active.id; try { await repository.remove(id); } catch { setSaved('offline'); return; } localStorage.removeItem(draftStorageKey(userRef.current?.id, id)); setNotes(current => current.filter(note => note.id !== id)); setActive(null); activeRef.current = null; setLibrary(true); router.push('/', { scroll: false }); };
    const rename = () => { if (!active)
        return; const title = window.prompt('Rename note', active.title); if (title?.trim()) {
        const n = { ...active, title: title.trim(), updated_at: new Date().toISOString() };
        setActive(n);
        activeRef.current = n;
        setNotes(ns => ns.map(x => x.id === n.id ? n : x));
        localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
    } };
    const loadHistory = async () => { setExportOpen(false); if (!active)
        return; try {
        setHistory(await repository.history(active.id));
    }
    catch {
        setHistory([]);
    } setHistoryOpen(true); };
    const restore = async (v: Version) => { if (!active)
        return; try {
        await repository.snapshot(active);
        const pages = pagesFor({ ...active, title: v.title, content: v.content, pages: v.pages || [] });
        const page = pages.find(item => item.id === activePageId) || pages[0];
        const n = { ...active, title: v.title, pages, content: page.content, updated_at: new Date().toISOString() };
        setActive(n);
        activeRef.current = n;
        setActivePageId(page.id);
        setNotes(ns => ns.map(x => x.id === n.id ? n : x));
        editor?.commands.setContent(page.content);
    }
    catch {
        setSaved('offline');
    } };
    const toggleFav = () => { if (!active)
        return; const n = { ...active, is_favorite: !active.is_favorite }; setActive(n); activeRef.current = n; setNotes(ns => ns.map(x => x.id === n.id ? n : x)); localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n)); };
    const createFolder = async (parent_id: string | null = null) => { const name = window.prompt(parent_id ? 'Name this folder' : 'Name this class or folder'); if (!name?.trim())
        return; const folder: Folder = { id: crypto.randomUUID(), name: name.trim(), parent_id, created_at: new Date().toISOString() }; setFolders([...folders, folder]); localStorage.setItem(folderStorageKey(user?.id), JSON.stringify([...folders, folder])); setCurrentFolder(folder.id); setExpandedFolders(current => new Set(current).add(folder.id)); try {
        await repository.saveFolder(folder);
    }
    catch {
        setSaved('offline');
    } };
    const removeFolder = async (folder: Folder) => { if (!window.confirm(`Delete “${folder.name}”? Notes inside will move to the library.`))
        return; const descendants = (parentId: string): string[] => folders.filter(item => item.parent_id === parentId).flatMap(item => [item.id, ...descendants(item.id)]); const ids = new Set([folder.id, ...descendants(folder.id)]); setFolders(folders.filter(f => !ids.has(f.id))); localStorage.setItem(folderStorageKey(user?.id), JSON.stringify(folders.filter(f => !ids.has(f.id)))); setNotes(ns => ns.map(n => ids.has(n.folder_id || '') ? { ...n, folder_id: null } : n)); if (currentFolder && ids.has(currentFolder))
        setCurrentFolder(null); try {
        await repository.removeFolder(folder.id);
    }
    catch {
        setSaved('offline');
    } };
    const moveActive = (folder_id: string | null) => { if (!active)
        return; const n = { ...active, folder_id, updated_at: new Date().toISOString() }; setActive(n); activeRef.current = n; setNotes(ns => ns.map(x => x.id === n.id ? n : x)); localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n)); };
    const updateLabel = () => { if (!active)
        return; const document_label = window.prompt('Document label', active.document_label || 'LECTURE NOTES'); if (document_label?.trim()) {
        const n = { ...active, document_label: document_label.trim().toUpperCase() };
        setActive(n);
        setNotes(ns => ns.map(x => x.id === n.id ? n : x));
        localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n));
    } };
    const updatePageLayout = (page_layout: Note['page_layout']) => { if (!active)
        return; const n = { ...active, page_layout }; setActive(n); setNotes(ns => ns.map(x => x.id === n.id ? n : x)); localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n)); };
    const shareLink = async () => { if (!active)
        return; const share_token = active.share_token || crypto.randomUUID(); const updated = { ...active, share_token }; setActive(updated); activeRef.current = updated; setNotes(ns => ns.map(n => n.id === updated.id ? updated : n)); try {
        await repository.save(updated);
        const u = new URL(location.href);
        u.search = '';
        u.searchParams.set('share', share_token);
        u.searchParams.set('page', activePage?.id || pagesFor(updated)[0].id);
        await navigator.clipboard.writeText(u.toString());
        setSaved('saved');
    }
    catch {
        setSaved('offline');
    } };
    const revokeShare = async () => { if (!active?.share_token)
        return; const updated = { ...active, share_token: null }; setActive(updated); activeRef.current = updated; setNotes(ns => ns.map(n => n.id === updated.id ? updated : n)); localStorage.setItem(draftStorageKey(user?.id, updated.id), JSON.stringify(updated)); try {
        await repository.save(updated);
        setSaved('saved');
    }
    catch {
        setSaved('offline');
    } };
    const exportPDF = () => { setExportOpen(false); setPreview(true); setTimeout(() => window.print(), 150); };
    const folderNoteCount = (id: string) => notes.filter(note => {
        let parent = note.folder_id;
        const visited = new Set<string>();
        while (parent && !visited.has(parent)) {
            if (parent === id) return true;
            visited.add(parent);
            parent = folders.find(folder => folder.id === parent)?.parent_id || null;
        }
        return false;
    }).length;
    const folderName = (id: string | null) => folders.find(f => f.id === id)?.name || 'Library';
    const toggleFolderExpanded = (id: string) => setExpandedFolders(current => { const next = new Set(current); if (next.has(id))
        next.delete(id);
    else
        next.add(id); return next; });
    const renderSidebarNote = (note: Note) => <button key={note.id} className={`note-item tree-note ${active?.id === note.id ? 'active' : ''}`} onClick={() => activate(note)}><DocumentIcon value={pagesFor(note)[0]?.content.attrs?.icon}/><span>{note.title}</span>{note.is_favorite && <Star size={12} fill="currentColor"/>}</button>;
    const renderFolderTree = (folder: Folder, depth = 0): ReactNode => { const expanded = expandedFolders.has(folder.id); const children = folders.filter(item => item.parent_id === folder.id); return <div className="folder-tree-node" key={folder.id}><div className={`folder-tree-row depth-${Math.min(depth, 3)}`}><button className="folder-disclosure" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${folder.name}`} aria-expanded={expanded} onClick={() => toggleFolderExpanded(folder.id)}>{expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</button><button className={`folder-link ${currentFolder === folder.id ? 'selected' : ''}`} onClick={() => showLibrary(folder.id, false)}><FolderIcon size={14} className="tree-type-icon" aria-hidden="true"/><span>{folder.name}</span></button><button className="tree-add" title={`New note in ${folder.name}`} onClick={() => create(folder.id)}><Plus size={13}/></button></div>{expanded && <div className="folder-tree-children">{children.map(child => renderFolderTree(child, depth + 1))}</div>}</div>; };
    const renderFolderNavigation = () => <><div className="notes-label">CLASSES <button title="New class or folder" onClick={() => void createFolder(null)}><Plus size={14}/></button></div><div className="notes-list folder-navigation">{folders.filter(folder => !folder.parent_id).map(folder => renderFolderTree(folder))}{notes.filter(note => !note.folder_id && (!favoritesOnly || note.is_favorite) && (!search || searchResults.some(result => result.id === note.id))).map(renderSidebarNote)}</div></>;
    const breadcrumbFolders = (() => {
        const path: Folder[] = [];
        const visited = new Set<string>();
        let id = active?.folder_id;
        while (id && !visited.has(id)) {
            visited.add(id);
            const folder = folders.find(item => item.id === id);
            if (!folder) break;
            path.unshift(folder);
            id = folder.parent_id;
        }
        return path;
    })();
    const outlineItems = (() => { const items: {
        title: string;
        level: number;
        position: number;
    }[] = []; const walk = (node: Note['content']) => { for (const child of node.content || []) {
        if (child.type === 'heading') {
            items.push({ title: (child.content || []).map(part => part.text || '').join(''), level: Number(child.attrs?.level) || 1, position: items.length });
        }
        if (child.content)
            walk(child as Note['content']);
    } }; if (activePage)
        walk(activePage.content); return items; })();
    const renderLibraryNote = (note: Note) => <button key={note.id} className="library-note" onClick={() => activate(note, search ? pagesFor(note).find(page => searchableText(page.content).toLowerCase().includes(search.toLowerCase()))?.id : undefined)}><DocumentIcon value={pagesFor(note)[0]?.content.attrs?.icon}/><span className="library-note-copy"><strong>{note.title}</strong><small>{folderName(note.folder_id)} · {pagesFor(note).length} {pagesFor(note).length === 1 ? 'page' : 'pages'} · Updated {new Date(note.updated_at).toLocaleDateString()}</small></span>{note.is_favorite && <Star size={14} fill="currentColor"/>}</button>;
    if (!darkinit || !authReady)
        return null;
    if (sharedView && !active && shareError)
        return <main className="share-error-screen"><span className="brand-mark">L</span><h1>That note isn’t available</h1><p>{shareError}</p><button onClick={() => { setSharedView(false); setShareError(''); router.push('/', { scroll: false }); }}>Go to sign in</button></main>;
    if (supabase && !user && !sharedView)
        return <AuthScreen />;
    if (library)
        return <main className={`lemma-app library-app ${dark ? 'dark' : ''}`}>
  {sidebar && <aside className="sidebar">
   <div className="brand"><button className="brand-button" onClick={() => showLibrary()}><span className="brand-mark">L</span><span>Lemma</span></button><button title="Collapse sidebar" className="icon-button" onClick={() => setSidebar(false)}><PanelLeftClose size={16}/></button></div>
   <button className="new-note" onClick={() => create(currentFolder)}><Plus size={15}/>New note<span>⌘ N</span></button>
   <button className={`side-link ${!favoritesOnly && !currentFolder ? 'selected' : ''}`} onClick={() => { setCurrentFolder(null); setFavoritesOnly(false); }}><Home size={15}/> All notes</button>
   <button className={`side-link ${favoritesOnly ? 'selected' : ''}`} onClick={() => { setCurrentFolder(null); setFavoritesOnly(true); }}><Star size={15}/> Favorites</button>
   <label className="search-field"><Search size={14}/><input placeholder="Search notes" value={search} onChange={e => setSearch(e.target.value)}/><kbd>⇧⌘ P</kbd></label>
   {renderFolderNavigation()}
   <div className="sidebar-bottom"><button className="settings-item" onClick={() => setSettingsOpen(true)}><Settings2 size={15}/> Settings</button><button className="settings-item" onClick={toggleTheme}>◐ <span>{dark ? 'Dark appearance' : 'Light appearance'}</span></button></div>
  </aside>}
  {sidebar && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebar(false)}/>}
  <section className="library-workspace">
   <header className="library-header">{!sidebar && <button className="icon-button" title="Open sidebar" onClick={() => setSidebar(true)}><PanelLeftOpen size={17}/></button>}<div><span className="panel-eyebrow">YOUR WORKSPACE</span><h1>{favoritesOnly ? 'Favorites' : currentFolder ? folderName(currentFolder) : 'Your study space'}</h1><p>{currentFolder ? 'Notes in this class or folder.' : 'Your notes, arranged by class and folder.'}</p></div><div className="library-actions"><button className="icon-button" title="Search notes · ⇧⌘ P" onClick={() => setSearchOpen(true)}><Search size={16}/></button><button className="action-button" onClick={() => void createFolder(currentFolder)}><FolderPlus size={15}/><span>New folder</span></button><button className="new-note" onClick={() => create(currentFolder)}><Plus size={15}/>New note</button></div></header>
   <div className="library-content">{currentFolder && <div className="library-folder-toolbar"><button onClick={() => setCurrentFolder(folders.find(f => f.id === currentFolder)?.parent_id || null)}>← Back to {folderName(folders.find(f => f.id === currentFolder)?.parent_id || null)}</button><button onClick={() => { const folder = folders.find(item => item.id === currentFolder); if (folder)
            void removeFolder(folder); }}>Delete folder</button></div>}{!favoritesOnly && !search && folders.some(folder => folder.parent_id === currentFolder) && <section className="library-courses"><h2>{currentFolder ? 'Folders' : 'Classes & folders'}</h2><div className="class-grid">{folders.filter(folder => folder.parent_id === currentFolder).map(folder => <button className="class-tile" key={folder.id} onClick={() => showLibrary(folder.id)}><FolderIcon size={20}/><strong>{folder.name}</strong><small>{folderNoteCount(folder.id)} {folderNoteCount(folder.id) === 1 ? 'note' : 'notes'}</small><ChevronRight size={15}/></button>)}</div></section>}<h2>{search ? `Search results · ${searchResults.length}` : favoritesOnly ? 'Favorite notes' : currentFolder ? 'Notes in this folder' : 'Recently updated'}</h2><div className="library-notes">{(search ? searchResults : notes.filter(note => (!favoritesOnly || note.is_favorite) && (!currentFolder || note.folder_id === currentFolder))).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(renderLibraryNote)}</div>{!notes.length && <p className="library-empty">Create a class or a note to start your workspace.</p>}{notes.length > 0 && search && !searchResults.length && <p className="library-empty">No notes match “{search}”. Try another title or phrase.</p>}</div>
  </section>
  {searchOpen && <CommandSearch query={search} onQuery={setSearch} results={searchResults} folderName={folderName} onClose={() => setSearchOpen(false)} onOpen={note => { activate(note, search ? pagesFor(note).find(page => searchableText(page.content).toLowerCase().includes(search.toLowerCase()))?.id : undefined); setSearchOpen(false); }}/>}
  {iconPicker && <IconPicker onSelect={changeIcon} onClose={() => setIconPicker(false)}/>}
  {settingsOpen && <Overlay className="history-scrim" onClose={() => setSettingsOpen(false)}><aside className="history-panel settings-panel" role="dialog" aria-modal="true" aria-label="Writing settings" onClick={e => e.stopPropagation()}><div className="history-head"><div><span className="panel-eyebrow">PREFERENCES</span><h2>Writing settings</h2></div><button aria-label="Close writing settings" onClick={() => setSettingsOpen(false)}><X size={17}/></button></div><label>Default typeface<Dropdown label="Default typeface" value={fontFamily} options={[{ value: 'serif', label: 'Serif · textbook' }, { value: 'sans', label: 'Sans serif' }, { value: 'mono', label: 'Monospace' }]} onChange={value => { setFontFamily(value); localStorage.setItem('lemma:font', value); }}/></label><label>Default text size <strong>{fontSize}px</strong><input type="range" min="14" max="24" value={fontSize} onChange={e => { setFontSize(+e.target.value); localStorage.setItem('lemma:size', e.target.value); }}/></label><label>Appearance<Dropdown label="Appearance" value={theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={value => changeTheme(value as 'system' | 'light' | 'dark')}/></label>{user && <div className="settings-account"><span>Signed in as</span><strong>{user.is_anonymous ? 'Guest workspace' : user.email}</strong><button onClick={async () => { if (active)
            await repository.save(active); await supabase?.auth.signOut(); }}>Sign out</button></div>}<div className="settings-hint">Type <kbd>$\</kbd> in the document to toggle demonstration typography.</div></aside></Overlay>}
 </main>;
    if (!darkinit)
        return null;
    return <main className={`lemma-app ${dark ? 'dark' : ''} ${preview ? 'is-preview' : ''} ${focus ? 'is-focus' : ''} ${typewriter ? 'is-typewriter' : ''} ${demoMode ? 'demo-mode' : ''} page-layout-${active?.page_layout === 'infinite' ? 'infinite' : 'a4'}`} style={{ '--doc-font-size': `${fontSize}px`, '--doc-font-family': fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' : fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'Arial, Helvetica, sans-serif' } as React.CSSProperties}>
  {sidebar && !preview && !focus && <aside className="sidebar">
   <div className="brand"><button className="brand-button" onClick={() => showLibrary()}><span className="brand-mark">L</span><span>Lemma</span></button><button title="Collapse sidebar" className="icon-button sidebar-collapse" onClick={() => setSidebar(false)}><PanelLeftClose size={16}/></button></div>
   <button className="new-note" onClick={() => create(currentFolder)}><Plus size={15}/>New note<span>⌘ N</span></button>
   <button className="side-link" onClick={() => showLibrary(null, false)}><Home size={15}/> Workspace</button>
   <button className="side-link" onClick={() => showLibrary(null, true)}><Star size={15}/> Favorites</button>
   <label className="search-field"><Search size={14}/><input placeholder="Search notes" value={search} onChange={e => setSearch(e.target.value)}/><kbd>⇧⌘ P</kbd></label>
   {renderFolderNavigation()}
   <div className="sidebar-bottom"><div className="sidebar-help"><Keyboard size={14}/> <span><kbd>⇧⌘ P</kbd> Search notes</span></div><button className="settings-item" onClick={() => setSettingsOpen(true)}><Settings2 size={15}/> Settings</button><button onClick={toggleTheme} className="settings-item">◐ <span>{dark ? 'Dark appearance' : 'Light appearance'}</span></button></div>
  </aside>}
  {sidebar && !preview && !focus && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebar(false)}/>}
  {!preview && !focus && sidebar && <aside className="note-browser" aria-label="Notes in this class"><header><strong>{folderName(active?.folder_id || null)}</strong><button aria-label="New note in this class" onClick={() => create(active?.folder_id || null)}><Plus size={17}/></button></header><span className="note-browser-label">NOTES</span>{notes.filter(note => note.folder_id === (active?.folder_id || null)).map(note => <button className={`note-browser-item ${note.id === active?.id ? 'selected' : ''}`} key={note.id} onClick={() => activate(note)}><DocumentIcon value={pagesFor(note)[0]?.content.attrs?.icon} size={22}/><span><strong>{note.title}</strong><small>{searchableText(note.content).slice(0, 90) || 'Start writing…'}</small><time>{new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></span></button>)}</aside>}
  <section className="workspace">{!focus && <header className="topbar">{!sidebar && !preview && <button className="icon-button" title="Open sidebar" onClick={() => setSidebar(true)}><PanelLeftOpen size={17}/></button>}<div className="breadcrumb"><button className="breadcrumb-library" disabled={sharedView} onClick={() => showLibrary()}><Home size={14}/>Library</button>{breadcrumbFolders.map(folder=><span className="breadcrumb-group" key={folder.id}><span className="crumb-sep">/</span><button className="breadcrumb-parent" disabled={sharedView} onClick={()=>showLibrary(folder.id)}>{folder.name}</button></span>)}<span className="crumb-sep">/</span><button onClick={rename} disabled={sharedView} className="breadcrumb-title">{active?.title || 'Untitled'} <ChevronDown size={13}/></button></div><div className="top-actions">{!sharedView && <button className="icon-button" title="Search notes (⌘⇧P)" onClick={() => setSearchOpen(true)}><Search size={16}/></button>}<div className={`save-status ${saved}`}><span className="status-dot"/>{saved === 'saving' ? 'Saving…' : saved === 'offline' ? 'Saved locally' : 'Saved'}</div>{active && !preview && <><button className="action-button" title="Share read-only link" onClick={shareLink}><Share2 size={14}/><span>Share</span></button></>}{sharedView ? <span className="shared-read-label"><Eye size={14}/> Shared · read only</span> : <button className={`action-button ${preview ? 'selected' : ''}`} onClick={() => setPreview(!preview)}><Eye size={15}/><span>{preview ? 'Edit' : 'Read mode'}</span></button>}{!sharedView && <button className="icon-button" title="Focus mode" onClick={() => setFocus(true)}><Focus size={16}/></button>}<div className="menu-anchor"><button className="export-button" onClick={() => setExportOpen(!exportOpen)}><Download size={15}/><span>Export</span><ChevronDown size={13}/></button>{exportOpen && <div className="export-menu" role="group" aria-label="Document actions"><button onClick={exportPDF}><FileText size={15}/> Export as PDF</button><div className="document-controls"><div className="folder-select"><span>Move to</span><Dropdown label="Move note" value={active?.folder_id || ''} options={[{ value: '', label: 'Library' }, ...folders.map(folder => ({ value: folder.id, label: folder.name }))]} onChange={value => moveActive(value || null)}/></div></div>{!sharedView && <><button onClick={toggleFav}><Star size={15}/> {active?.is_favorite ? 'Remove favorite' : 'Add to favorites'}</button><button onClick={() => { setFocus(true); setExportOpen(false); }}><Focus size={15}/> Focus mode <kbd>⇧⌘ F</kbd></button><button onClick={() => { setOutline(value => !value); setExportOpen(false); }}><BookOpen size={15}/> {outline ? 'Hide outline' : 'Show outline'}</button><button onClick={() => { setSettingsOpen(true); setExportOpen(false); }}><Settings2 size={15}/> Writing settings</button><button onClick={loadHistory}><Clock3 size={15}/> Version history</button>{active && <button onClick={remove}><Trash2 size={15}/> Delete note</button>}{active && <button onClick={rename}><FileText size={15}/> Rename note</button>}{active?.share_token && <button onClick={revokeShare}><X size={15}/> Stop sharing</button>}</>}</div>}</div></div></header>}{focus && <div className="focus-controls"><button aria-pressed={typewriter} onClick={() => setTypewriter(!typewriter)}>Dim other paragraphs</button><button className="focus-exit" onClick={() => setFocus(false)} title="Exit focus mode · Escape">Exit focus <kbd>esc</kbd></button></div>}
   {!preview && !sharedView && <div className="editor-toolbar" role="toolbar" aria-label="Document formatting">{[[Bold, 'Bold', 'bold'], [Italic, 'Italic', 'italic'], [Underline, 'Underline', 'underline'], [Strikethrough, 'Strikethrough', 'strike'], [Code2, 'Inline code', 'code'], [Heading1, 'Heading', 'h1'], [Heading2, 'Subheading', 'h2'], [List, 'Bulleted list', 'bullet'], [ListOrdered, 'Numbered list', 'ordered'], [ListTodo, 'Task list', 'task'], [Quote, 'Quote', 'quote'], [Highlighter, 'Highlight', 'highlight'], [Link2, 'Link', 'link'], [Sigma, 'Equation', 'math'], ['$', 'Inline equation', 'inlineMath'], [Minus, 'Divider', 'divider']].map((item) => { const [Icon, label, action] = item as [
        LucideIcon | string,
        string,
        string
    ]; return <button key={action} title={label} aria-label={label} className={editor?.isActive({ h1: "heading", h2: "heading", bullet: "bulletList", ordered: "orderedList", task: "taskList", quote: "blockquote" }[action] || action, action === 'h1' ? { level: 1 } : action === 'h2' ? { level: 2 } : undefined) ? "toolbar-selected" : ""} onMouseDown={e => e.preventDefault()} onClick={() => { if (!editor)
        return; switch (action) {
        case 'bold':
            editor.chain().focus().toggleBold().run();
            break;
        case 'italic':
            editor.chain().focus().toggleItalic().run();
            break;
        case 'underline':
            editor.chain().focus().toggleMark('underline').run();
            break;
        case 'strike':
            editor.chain().focus().toggleStrike().run();
            break;
        case 'code':
            editor.chain().focus().toggleCode().run();
            break;
        case 'h1':
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            break;
        case 'h2':
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            break;
        case 'bullet':
            editor.chain().focus().toggleBulletList().run();
            break;
        case 'ordered':
            editor.chain().focus().toggleOrderedList().run();
            break;
        case 'task':
            editor.chain().focus().toggleTaskList().run();
            break;
        case 'quote':
            editor.chain().focus().toggleBlockquote().run();
            break;
        case 'highlight':
            editor.chain().focus().toggleHighlight({ color: '#e4ede7' }).run();
            break;
        case 'link': {
            const href = window.prompt('Link URL');
            if (href)
                editor.chain().focus().setMark('link', { href }).run();
            break;
        }
        case 'math':
            insertMath(false);
            break;
        case 'inlineMath':
            insertMath(true);
            break;
        case 'divider':
            editor.chain().focus().setHorizontalRule().run();
            break;
    } }}>{typeof Icon === 'string' ? <span className="inline-math-icon">{Icon}</span> : <Icon size={15}/>}</button>; })}<div className="toolbar-rule"/><button title="Math snippets" aria-label="Math snippets" onMouseDown={e => e.preventDefault()} onClick={() => setPaletteOpen(true)}><Sigma size={15}/></button><button title="Insert graph" aria-label="Insert graph" onClick={() => runCommand("Graph")}><span>⌁</span></button><button title="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={15}/></button><button title="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={15}/></button><button title="Text color" onClick={() => editor?.chain().focus().setColor('#688674').run()}><Palette size={15}/></button><button className={demoMode ? 'toolbar-selected' : ''} title="Demonstration typography · type $\\ to toggle" onClick={() => setDemoMode(v => { localStorage.setItem('lemma:demo', String(!v)); return !v; })}><Type size={15}/></button></div>}
   <div className="doc-scroll"><article className="document" id="document" style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' : fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'Arial, Helvetica, sans-serif', fontSize: `var(--doc-font-size)` }}><div className="document-meta"><button className="document-icon-button" aria-label="Change document icon" disabled={preview || sharedView} onClick={() => setIconPicker(true)}><DocumentIcon value={activePage?.content.attrs?.icon} size={30}/></button><button className="doc-subject" disabled={preview} onClick={updateLabel}>{active?.document_label || 'LECTURE NOTES'}</button><span>{activePage?.title || 'Page 1'} · {active ? new Date(active.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'New document'}</span></div><input aria-label="Note title" className="document-title" value={active?.title || ''} placeholder="Untitled" readOnly={preview} onChange={e => { if (!active)
        return; const n = { ...active, title: e.target.value || 'Untitled', updated_at: new Date().toISOString() }; setActive(n); activeRef.current = n; setNotes(ns => ns.map(x => x.id === n.id ? n : x)); localStorage.setItem(draftStorageKey(user?.id, n.id), JSON.stringify(n)); }}/>
    {editor && <div className="editor-area" onKeyDownCapture={e => { if (menu && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSlashFilter(f => f + e.key);
        setMenuIndex(0);
    } if (menu && e.key === 'Backspace') {
        e.preventDefault();
        setSlashFilter(f => f.slice(0, -1));
        setMenuIndex(0);
    } }}><EditorContent editor={editor}/>{menu && <div className="slash-menu" role="menu" aria-label="Insert block" style={{ top: slashPosition.top, left: slashPosition.left }}><div className="slash-heading">INSERT BLOCK <span>↑↓ ENTER</span></div>{filteredCommands.map((c, i) => <button key={c} className={i === menuIndex ? 'focused' : ''} role="menuitem" onMouseDown={e => e.preventDefault()} onClick={() => runCommand(c)}><span className="slash-icon">{commandIcon[commands.indexOf(c)]}</span><span>{c}<small>{c === 'Equation' ? 'Display mathematics' : c === 'Graph' ? 'Plot a function in your note' : c === 'Callout' ? 'Highlight a result or remark' : c === 'Inline equation' ? 'Mathematics within a sentence' : ''}</small></span><kbd>↵</kbd></button>)}</div>}{snipQuery && matchingSnippets.length > 0 && <div className="snippet-menu"><div className="slash-heading">SNIPPETS <span>TAB TO MOVE</span></div>{matchingSnippets.slice(0, 6).map((s, i) => <button key={s.label} className={i === snippetIndex ? 'focused' : ''} onClick={() => insertSnippet(s)}><code>{s.label}</code><span>{s.template.replace(/[«»]/g, '')}</span></button>)}</div>}</div>}
    <div className="editor-footer"><span>⌘ ⇧ E block equation <span className="footer-dot">·</span> ⌘ M inline equation</span><span>Lemma editor</span></div>
   </article></div>{outline && <OutlineRail items={outlineItems} pageKey={activePage?.id || ''}/>}{preview && <div className="preview-banner"><span>Document preview</span><button onClick={exportPDF}><Download size={14}/> Print / Save PDF</button></div>}
  </section>
  {searchOpen && <CommandSearch query={search} onQuery={setSearch} results={searchResults} folderName={folderName} onClose={() => setSearchOpen(false)} onOpen={note => { activate(note, search ? pagesFor(note).find(page => searchableText(page.content).toLowerCase().includes(search.toLowerCase()))?.id : undefined); setSearchOpen(false); }}/>}
  {iconPicker && <IconPicker onSelect={changeIcon} onClose={() => setIconPicker(false)}/>}
  {settingsOpen && <Overlay className="history-scrim" onClose={() => setSettingsOpen(false)}><aside className="history-panel settings-panel" role="dialog" aria-modal="true" aria-label="Writing settings" onClick={e => e.stopPropagation()}><div className="history-head"><div><span className="panel-eyebrow">PREFERENCES</span><h2>Writing settings</h2></div><button aria-label="Close writing settings" onClick={() => setSettingsOpen(false)}><X size={17}/></button></div><label>Default typeface<Dropdown label="Default typeface" value={fontFamily} options={[{ value: 'serif', label: 'Serif · textbook' }, { value: 'sans', label: 'Sans serif' }, { value: 'mono', label: 'Monospace' }]} onChange={value => { setFontFamily(value); localStorage.setItem('lemma:font', value); }}/></label><label>Default text size <strong>{fontSize}px</strong><input type="range" min="14" max="24" value={fontSize} onChange={e => { setFontSize(+e.target.value); localStorage.setItem('lemma:size', e.target.value); }}/></label><label>Page format<Dropdown label="Page format" value={active?.page_layout === 'infinite' ? 'infinite' : 'vertical'} options={[{ value: 'infinite', label: 'Infinite page' }, { value: 'vertical', label: 'A4 pages · vertical' }]} onChange={value => updatePageLayout(value as Note['page_layout'])}/></label><label>Appearance<Dropdown label="Appearance" value={theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={value => changeTheme(value as 'system' | 'light' | 'dark')}/></label>{user && <div className="settings-account"><span>Signed in as</span><strong>{user.is_anonymous ? 'Guest workspace' : user.email}</strong><button onClick={async () => { if (active)
        await repository.save(active); await supabase?.auth.signOut(); }}>Sign out</button></div>}<div className="settings-hint">Type <kbd>$\</kbd> in the document to toggle demonstration typography.</div></aside></Overlay>}
  {historyOpen && <Overlay className="history-scrim" onClose={() => setHistoryOpen(false)}><aside className="history-panel" role="dialog" aria-modal="true" aria-label="Version history" onClick={e => e.stopPropagation()}><div className="history-head"><div><span className="panel-eyebrow">DOCUMENT</span><h2>Version history</h2></div><button aria-label="Close version history" onClick={() => setHistoryOpen(false)}><X size={17}/></button></div><p className="history-note">Showing the 25 most recent snapshots.</p>{history.length ? history.map(v => <div key={v.id} className="history-entry"><span>{new Date(v.created_at).toLocaleString()}</span><strong>{v.title}</strong><button onClick={() => restore(v)}>Restore version</button></div>) : <p className="history-empty">No earlier versions yet.</p>}</aside></Overlay>}
  {paletteOpen && <Overlay onClose={() => setPaletteOpen(false)}><div role="dialog" aria-modal="true" aria-label="Math snippets" onClick={e => e.stopPropagation()}><MathPalette onClose={() => setPaletteOpen(false)} onSelect={snippet => { if (!editor)
        return; const latex = expand(snippet.template, 0).text; const from = editor.state.selection.from; editor.chain().focus().insertContent({ type: 'mathBlock', attrs: { latex } }).run(); let position = -1; editor.state.doc.descendants((node, pos) => { if (position < 0 && pos >= from - 1 && node.type.name === 'mathBlock' && node.attrs.latex === latex)
        position = pos; }); setPaletteOpen(false); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('lemma:edit-snippet', { detail: { position, template: snippet.template } }))); }}/></div></Overlay>}

 </main>;
}
