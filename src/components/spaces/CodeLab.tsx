import { SidebarPortal } from "../workspace/SidebarPortal";
import { ReferencePlacement } from "@/components/editor/ReferencePlacement";
import { openDocumentWindow } from "@/components/editor/documentWindow";
import { motion, useReducedMotion } from "framer-motion";
import { WorkspaceSelect } from "@/components/ui/workspace-select";
import { useWorkspaceDialogs } from "@/components/ui/workspace-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Plus,
  Trash2,
  Database,
  FileCode2,
  Square,
  FileUp,
  PanelLeftClose,
  Eraser,
  Folder,
  FolderPlus,
  ChevronRight,
  Download,
  Search,
  WrapText,
  Braces,
  CheckCircle2,
  AlertTriangle,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { runCpp } from "@/lib/cpp.functions";
import { runSandboxed, runPython, runOutcome, type RunResult } from "@/lib/sandbox";
import { useStored } from "./store";
import CodeEditor, { type CodeEditorHandle } from "./CodeEditor";
import { WorkspaceShortcuts } from "./WorkspaceShortcuts";

type Lang = "javascript" | "python" | "cpp";
const langs: { id: Lang; label: string; ext: string; starter: string }[] = [
  {
    id: "javascript",
    label: "JavaScript",
    ext: "main.js",
    starter: '// Write JavaScript here, then press ⌘↵\nconsole.log("Hello, world!");\n',
  },
  {
    id: "cpp",
    label: "C++ 20",
    ext: "main.cpp",
    starter:
      '// Write C++ here, then press ⌘↵. The first selected dataset arrives on standard input.\n#include <iostream>\n#include <string>\n\nint main() {\n  std::string line;\n  int n = 0;\n  while (std::getline(std::cin, line)) n++;\n  std::cout << "Hello, world! Lines on stdin: " << n << "\\n";\n}\n',
  },
  {
    id: "python",
    label: "Python 3",
    ext: "main.py",
    starter: '# Write Python here, then press ⌘↵\nprint("Hello, world!")\n',
  },
];
type Snippet = {
  id: string;
  name: string;
  lang?: Lang;
  code: string;
  datasetIds: string[];
  updated: number;
  folderId?: string | null;
};
type CodeFolder = { id: string; name: string };
type Dataset = { id: string; name: string; text: string };

const sampleData: Dataset = {
  id: "sample",
  name: "corpus",
  text: "word\tlemma\tpos\nchats\tchat\tNOUN\nmangeaient\tmanger\tVERB\nles\tle\tDET\nsouris\tsouris\tNOUN\nrapidement\trapidement\tADV\nmangé\tmanger\tVERB\nchat\tchat\tNOUN",
};
const sampleCode = `// Datasets are available as \`rows\`, \`lines\`, \`text\` (first one) or data.name
// Helpers: tokens(text), freq(list), ngrams(list, n), table(rows)
const byPos = freq(rows.map(r => r.pos));
console.table(byPos.map(([pos, n]) => ({ pos, n })));

const lemmas = freq(rows.map(r => r.lemma));
console.log('Most frequent lemma:', lemmas[0]);
console.log(ngrams(tokens('le chat mange la souris'), 2));`;

const id = () => crypto.randomUUID();
const ident = (s: string) =>
  s
    .trim()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^(\d)/, "_$1") || "dataset";

export default function CodeLab({
  ownerId,
  sidebarHost,
  dark = false,
  active: paneActive = true,
}: {
  ownerId?: string;
  sidebarHost?: HTMLElement | null;
  dark?: boolean;
  active?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const { ask, confirm, dialogs } = useWorkspaceDialogs();
  const [datasets, setDatasets, datasetError] = useStored<Dataset[]>(
    ownerId,
    "codelab:datasets",
    () => [sampleData],
  );
  const [snippets, setSnippets, snippetError] = useStored<Snippet[]>(
    ownerId,
    "codelab:snippets",
    () => [
      {
        id: id(),
        name: "Part-of-speech counts",
        code: sampleCode,
        datasetIds: ["sample"],
        updated: Date.now(),
      },
    ],
  );
  const [codeFolders, setCodeFolders, folderError] = useStored<CodeFolder[]>(
    ownerId,
    "codelab:folders",
    () => [],
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState(snippets[0]?.id);
  const [tab, setTab] = useState<"code" | string>("code");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<CodeEditorHandle>(null);
  const outcome = result ? runOutcome(result) : null;
  const modifier =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);
  const [pdfSide, setPdfSide] = useState<"left" | "right">("left");
  const [pdfError, setPdfError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    },
    [pdf],
  );
  const active = snippets.find((s) => s.id === activeId) || snippets[0];
  const editingData = datasets.find((d) => d.id === tab);
  const lang = active?.lang || "javascript";

  const patch = (p: Partial<Snippet>) =>
    setSnippets((list) =>
      list.map((s) => (s.id === active?.id ? { ...s, ...p, updated: Date.now() } : s)),
    );
  const run = useCallback(async () => {
    if (!active || running) return;
    setRunning(true);
    setResult(null);
    const used = datasets
      .filter((d) => active.datasetIds.includes(d.id))
      .map((d) => ({ name: ident(d.name), text: d.text }));
    try {
      setResult(
        await (lang === "cpp"
          ? runCpp({ data: { code: active.code, stdin: used[0]?.text || "" } })
          : lang === "python"
            ? runPython(active.code, used)
            : runSandboxed(active.code, used)),
      );
    } catch (error) {
      setResult({
        logs: [
          { kind: "error", text: error instanceof Error ? error.message : "Execution failed" },
        ],
        ms: 0,
        timedOut: false,
      });
    } finally {
      setRunning(false);
    }
  }, [active, datasets, running, lang]);

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!paneActive) return;
      if (
        e.defaultPrevented ||
        e.repeat ||
        (e.target as HTMLElement).closest?.(".monaco-editor,[role=dialog],[role=alertdialog]")
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [run, paneActive]);

  const addFolder = async () => {
    const name = await ask("Folder name");
    if (!name?.trim()) return;
    setCodeFolders((l) => [...l, { id: id(), name: name.trim() }]);
  };
  const renameFolder = async (f: CodeFolder) => {
    const name = await ask("Rename folder", f.name);
    if (name?.trim())
      setCodeFolders((l) => l.map((x) => (x.id === f.id ? { ...x, name: name.trim() } : x)));
  };
  const removeFolder = async (f: CodeFolder) => {
    if (!(await confirm(`Delete folder “${f.name}”? Its files move to the top level.`))) return;
    setCodeFolders((l) => l.filter((x) => x.id !== f.id));
    setSnippets((l) => l.map((s) => (s.folderId === f.id ? { ...s, folderId: null } : s)));
  };
  const addSnippet = (folderId: string | null = active?.folderId ?? null) => {
    const s = {
      id: id(),
      folderId,
      name: "Untitled",
      lang,
      code: (langs.find((l) => l.id === lang) || langs[0])?.starter || "",
      datasetIds: datasets.slice(0, 1).map((d) => d.id),
      updated: Date.now(),
    };
    setSnippets((l) => [s, ...l]);
    setActiveId(s.id);
    setTab("code");
    setResult(null);
  };
  const addDataset = () => {
    const d = { id: id(), name: `dataset${datasets.length + 1}`, text: "word\tgloss\n" };
    setDatasets((l) => [...l, d]);
    setTab(d.id);
  };
  const removeSnippet = async (sid: string) => {
    if (snippets.length < 2 || !(await confirm("Delete this snippet?"))) return;
    const rest = snippets.filter((s) => s.id !== sid);
    setSnippets(rest);
    setActiveId(rest[0]?.id);
  };
  const removeDataset = async (did: string) => {
    if (!(await confirm("Delete this dataset?"))) return;
    setDatasets((l) => l.filter((d) => d.id !== did));
    setSnippets((l) => l.map((s) => ({ ...s, datasetIds: s.datasetIds.filter((x) => x !== did) })));
    setTab("code");
  };
  const exportWorkspace = () => {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version: 1, snippets, datasets, folders: codeFolders }, null, 2)],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lemma-code-lab.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const rowsOf = (text: string) =>
    Math.max(0, text.split(/\r?\n/).filter((l) => l.trim()).length - 1);

  if (!active)
    return (
      <motion.div
        className="space-page codelab"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
      >
        {dialogs}
        <section className="space-main">
          <h1>Code Lab</h1>
          <p className="space-hint">Create a file to start experimenting.</p>
          <Button className="primary-btn" onClick={() => addSnippet(null)}>
            New file
          </Button>
        </section>
      </motion.div>
    );
  return (
    <motion.div
      className="space-page codelab"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
    >
      {dialogs}
      <SidebarPortal
        host={sidebarHost}
        visible={sidebarHost === undefined || (paneActive && !!sidebarHost)}
      >
        <aside className="space-rail">
          <div className="space-rail-head">
            <span>Files</span>
            <span className="rail-head-tools">
              <Button variant="ghost" type="button" aria-label="New folder" onClick={addFolder}>
                <FolderPlus size={15} />
              </Button>
              <Button
                variant="ghost"
                type="button"
                aria-label="New file"
                onClick={() => addSnippet(null)}
              >
                <Plus size={15} />
              </Button>
            </span>
          </div>
          {codeFolders.map((f) => {
            const open = !collapsed.has(f.id);
            return (
              <div key={f.id} className="rail-folder">
                <div
                  className="rail-item rail-folder-row"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  onClick={() =>
                    setCollapsed((c) => {
                      const n = new Set(c);
                      if (n.has(f.id)) n.delete(f.id);
                      else n.add(f.id);
                      return n;
                    })
                  }
                  onDoubleClick={() => renameFolder(f)}
                >
                  <ChevronRight size={13} className={open ? "is-open" : ""} />
                  <Folder size={15} />
                  <span>{f.name}</span>
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label="New file in folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      addSnippet(f.id);
                    }}
                  >
                    <Plus size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label="Delete folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFolder(f);
                    }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                {open && (
                  <div className="rail-children">
                    {snippets
                      .filter((s) => s.folderId === f.id)
                      .map((s: Snippet) => (
                        <Button
                          variant="ghost"
                          type="button"
                          key={s.id}
                          className={`rail-item ${s.id === active.id && !editingData ? "is-active" : ""}`}
                          onClick={() => {
                            setActiveId(s.id);
                            setTab("code");
                            setResult(null);
                          }}
                        >
                          <FileCode2 size={15} />
                          <span>{s.name}</span>
                          <em>
                            {
                              langs
                                .find((l) => l.id === (s.lang || "javascript"))
                                ?.ext.split(".")[1]
                            }
                          </em>
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {snippets
            .filter((s) => !s.folderId || !codeFolders.some((f) => f.id === s.folderId))
            .map((s: Snippet) => (
              <Button
                variant="ghost"
                type="button"
                key={s.id}
                className={`rail-item ${s.id === active.id && !editingData ? "is-active" : ""}`}
                onClick={() => {
                  setActiveId(s.id);
                  setTab("code");
                  setResult(null);
                }}
              >
                <FileCode2 size={15} />
                <span>{s.name}</span>
                <em>{langs.find((l) => l.id === (s.lang || "javascript"))?.ext.split(".")[1]}</em>
              </Button>
            ))}
          <div className="space-rail-head">
            <span>Datasets</span>
            <Button variant="ghost" type="button" aria-label="New dataset" onClick={addDataset}>
              <Plus size={15} />
            </Button>
          </div>
          {datasets.map((d) => (
            <Button
              variant="ghost"
              type="button"
              key={d.id}
              className={`rail-item ${tab === d.id ? "is-active" : ""}`}
              onClick={() => setTab(d.id)}
            >
              <Database size={15} />
              <span>{d.name}</span>
              <em>{rowsOf(d.text)}</em>
            </Button>
          ))}
        </aside>
      </SidebarPortal>
      <section className="space-main">
        {(datasetError || snippetError || folderError) && (
          <p role="alert" className="workspace-storage-error">
            {datasetError || snippetError || folderError}
          </p>
        )}
        <p className="space-hint device-storage-note">
          Saved on this device · C++ sends code and selected input to Compiler Explorer. Python
          loads its runtime from jsDelivr.
        </p>
        <header className="space-header">
          <div className="min-w-0">
            <span className="panel-eyebrow">Code Lab</span>
            <Input
              className="space-title"
              value={editingData ? editingData.name : active.name}
              aria-label="Name"
              onChange={(e) =>
                editingData
                  ? setDatasets((l) =>
                      l.map((d) => (d.id === editingData.id ? { ...d, name: e.target.value } : d)),
                    )
                  : patch({ name: e.target.value })
              }
            />
          </div>
          <div className="space-actions">
            <WorkspaceShortcuts space="code" />
            <Button
              variant="ghost"
              className="ghost-btn"
              aria-label="Export Code Lab"
              onClick={exportWorkspace}
            >
              <Download size={15} />
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="ghost-btn"
              aria-label="Delete"
              disabled={!editingData && snippets.length < 2}
              onClick={() =>
                editingData ? removeDataset(editingData.id) : removeSnippet(active.id)
              }
            >
              <Trash2 size={15} />
            </Button>
            {!editingData && (
              <>
                <Input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPdf({ url: URL.createObjectURL(f), name: f.name });
                    e.target.value = "";
                  }}
                />
                {pdf ? (
                  <Button
                    variant="ghost"
                    type="button"
                    className="ghost-btn"
                    onClick={() => setPdf(null)}
                  >
                    <PanelLeftClose size={15} />
                    Hide PDF
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    type="button"
                    className="ghost-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileUp size={15} />
                    Add PDF
                  </Button>
                )}
                {codeFolders.length > 0 && (
                  <WorkspaceSelect
                    className="lang-select"
                    label="Folder"
                    value={active.folderId || ""}
                    onChange={(value) => patch({ folderId: value || null })}
                    options={[
                      { value: "", label: "No folder" },
                      ...codeFolders.map((f) => ({ value: f.id, label: f.name })),
                    ]}
                  />
                )}
                <WorkspaceSelect
                  className="lang-select"
                  label="Language"
                  value={lang}
                  options={langs.map((l) => ({ value: l.id, label: l.label }))}
                  onChange={(value) => {
                    const next = langs.find((l) => l.id === value);
                    if (!next) return;
                    const isStarter = langs.some((l) => l.starter === active.code);
                    patch({ lang: next.id, ...(isStarter ? { code: next.starter } : {}) });
                  }}
                />
                <Button type="button" className="primary-btn" onClick={run} disabled={running}>
                  {running ? <Square size={14} /> : <Play size={14} />}
                  {running ? "Running" : "Run"}
                  <kbd>{modifier}↵</kbd>
                </Button>
              </>
            )}
          </div>
        </header>
        {editingData ? (
          <div className="dataset-editor">
            <p className="space-hint">
              Paste a table with a header row (tab or comma separated), or plain text. Code reads it
              as <code>data.{ident(editingData.name)}</code> in JavaScript or{" "}
              <code>data["{ident(editingData.name)}"]</code> in Python, plus <code>rows</code>,{" "}
              <code>lines</code> and <code>text</code> for the first selected dataset.
            </p>
            <Textarea
              aria-label="Dataset content"
              className="code-area"
              spellCheck={false}
              value={editingData.text}
              onChange={(e) =>
                setDatasets((l) =>
                  l.map((d) => (d.id === editingData.id ? { ...d, text: e.target.value } : d)),
                )
              }
            />
            <span className="space-hint">
              {rowsOf(editingData.text)} rows · {editingData.text.length.toLocaleString()}{" "}
              characters
            </span>
          </div>
        ) : (
          <div className={`ide ${pdf ? `has-pdf pdf-${pdfSide}` : ""}`}>
            {pdf && (
              <div className="ide-pane pdf-pane">
                <div className="pane-head">
                  <span>{pdf.name}</span>
                  <ReferencePlacement
                    side={pdfSide}
                    onSide={setPdfSide}
                    onWindow={async () => {
                      try {
                        if (
                          await openDocumentWindow({
                            name: pdf.name,
                            src: pdf.url,
                            mime: "application/pdf",
                          })
                        )
                          setPdf(null);
                      } catch (error) {
                        setPdfError(
                          error instanceof Error ? error.message : "Could not open a window.",
                        );
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label="Remove PDF"
                    onClick={() => setPdf(null)}
                  >
                    ×
                  </Button>
                </div>
                {pdfError && (
                  <p role="alert" className="attachment-error">
                    {pdfError}
                  </p>
                )}
                <iframe title={pdf.name} src={pdf.url} />
              </div>
            )}
            <div className="ide-pane monaco-pane">
              <div className="pane-head">
                <span>{langs.find((l) => l.id === lang)?.ext}</span>
                <div className="dataset-chips">
                  {datasets.map((d) => {
                    const on = active.datasetIds.includes(d.id);
                    return (
                      <Button
                        variant="ghost"
                        type="button"
                        key={d.id}
                        className={on ? "is-on" : ""}
                        aria-label={`Use dataset ${d.name}`}
                        aria-pressed={on}
                        onClick={() =>
                          patch({
                            datasetIds: on
                              ? active.datasetIds.filter((x) => x !== d.id)
                              : [...active.datasetIds, d.id],
                          })
                        }
                      >
                        <Database size={12} />
                        {d.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="code-editing-tools" role="toolbar" aria-label="Code editing actions">
                <Button
                  variant="ghost"
                  disabled={!editorReady}
                  onClick={() => editorRef.current?.find()}
                  title={`Find in code (${modifier}+F)`}
                >
                  <Search size={14} />
                  Find
                </Button>
                <Button
                  variant="ghost"
                  disabled={!editorReady || lang !== "javascript"}
                  onClick={() => editorRef.current?.format()}
                  title={`Format JavaScript (${modifier === "⌘" ? "Shift+Option+F" : "Shift+Alt+F"})`}
                >
                  <Braces size={14} />
                  Format
                </Button>
                <Button
                  variant="ghost"
                  disabled={!editorReady}
                  onClick={() => editorRef.current?.toggleWrap()}
                  title="Toggle word wrap (Alt+Z)"
                >
                  <WrapText size={14} />
                  Wrap
                </Button>
                <span className="code-language-label">
                  {langs.find((l) => l.id === lang)?.label}
                </span>
              </div>
              <CodeEditor
                ref={editorRef}
                onReady={setEditorReady}
                value={active.code}
                language={lang}
                dark={dark}
                onChange={(code) => patch({ code })}
                onRun={() => runRef.current()}
              />
            </div>
            <div className="ide-pane console" aria-live="polite">
              <div className="pane-head">
                <span>Output</span>
                <span className="pane-tools">
                  {(running || outcome) && (
                    <span
                      className={`run-status status-${running ? "info" : outcome}`}
                      role="status"
                    >
                      {running ? (
                        <LoaderCircle size={13} />
                      ) : outcome === "error" ? (
                        <CircleX size={13} />
                      ) : outcome === "warning" ? (
                        <AlertTriangle size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {running
                        ? "Running"
                        : outcome === "error"
                          ? result?.timedOut
                            ? "Timed out"
                            : "Error"
                          : outcome === "warning"
                            ? "Warnings"
                            : "Success"}
                    </span>
                  )}
                  {result && <em>{result.ms} ms</em>}
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label="Clear output"
                    onClick={() => setResult(null)}
                  >
                    <Eraser size={13} />
                  </Button>
                </span>
              </div>
              <div className="console-body">
                {!result ? (
                  <p className="space-hint">
                    {running
                      ? lang === "python"
                        ? "Starting Python… the first run takes a few seconds."
                        : "Running your code…"
                      : `Press Run or ${modifier}+Enter. JavaScript and Python run in a worker; C++ runs on Compiler Explorer.`}
                  </p>
                ) : result.logs.length ? (
                  result.logs.map((l, i) => (
                    <pre
                      key={i}
                      className={
                        l.kind === "error" ? "is-error" : l.kind === "warning" ? "is-warning" : ""
                      }
                    >
                      {l.text}
                    </pre>
                  ))
                ) : (
                  <p className="space-hint">No output. Print something to see it here.</p>
                )}
                {result && (
                  <p className={`execution-summary status-${outcome}`}>
                    {outcome === "error"
                      ? "Execution stopped. Check the error above."
                      : outcome === "warning"
                        ? "Completed with warnings."
                        : "Completed successfully."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
