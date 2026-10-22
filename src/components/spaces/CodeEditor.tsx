import { useReducedMotion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";

// Quiet surfaces, distinct syntax and visible diagnostics in both appearances.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("lemma-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "64748B", fontStyle: "italic" },
      { token: "keyword", foreground: "7C3AED" },
      { token: "string", foreground: "15803D" },
      { token: "number", foreground: "B45309" },
      { token: "type", foreground: "0F766E" },
      { token: "type.identifier", foreground: "0F766E" },
      { token: "identifier", foreground: "243247" },
      { token: "delimiter", foreground: "64748B" },
      { token: "operator", foreground: "0369A1" },
      { token: "regexp", foreground: "BE185D" },
      { token: "invalid", foreground: "B91C1C", fontStyle: "underline" },
    ],
    colors: {
      "editor.background": "#FCFCFD",
      "editor.foreground": "#243247",
      "editor.lineHighlightBackground": "#F0F4FA",
      "editorLineNumber.foreground": "#758396",
      "editorLineNumber.activeForeground": "#334155",
      "editor.selectionBackground": "#DBEAFE",
      "editor.inactiveSelectionBackground": "#E8EDF4",
      "editorCursor.foreground": "#2563EB",
      "editorIndentGuide.background1": "#E2E8F0",
      "editorIndentGuide.activeBackground1": "#94A3B8",
      "editorBracketMatch.background": "#DBEAFE",
      "editorBracketMatch.border": "#93C5FD",
      "editorError.foreground": "#DC2626",
      "editorWarning.foreground": "#B45309",
      "editorInfo.foreground": "#2563EB",
      "editorWidget.background": "#FFFFFF",
    },
  });
  monaco.editor.defineTheme("lemma-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8293AD", fontStyle: "italic" },
      { token: "keyword", foreground: "C4B5FD" },
      { token: "string", foreground: "86EFAC" },
      { token: "number", foreground: "FDBA74" },
      { token: "type", foreground: "5EEAD4" },
      { token: "type.identifier", foreground: "5EEAD4" },
      { token: "identifier", foreground: "DCE5F3" },
      { token: "delimiter", foreground: "94A3B8" },
      { token: "operator", foreground: "7DD3FC" },
      { token: "regexp", foreground: "F9A8D4" },
      { token: "invalid", foreground: "FCA5A5", fontStyle: "underline" },
    ],
    colors: {
      "editor.background": "#0D1420",
      "editor.foreground": "#DCE5F3",
      "editor.lineHighlightBackground": "#172235",
      "editorLineNumber.foreground": "#7E8FA9",
      "editorLineNumber.activeForeground": "#DBEAFE",
      "editor.selectionBackground": "#253F64",
      "editor.inactiveSelectionBackground": "#202F45",
      "editorCursor.foreground": "#93C5FD",
      "editorIndentGuide.background1": "#243147",
      "editorIndentGuide.activeBackground1": "#526783",
      "editorBracketMatch.background": "#253F64",
      "editorBracketMatch.border": "#607EAB",
      "editorError.foreground": "#F87171",
      "editorWarning.foreground": "#FDBA74",
      "editorInfo.foreground": "#93C5FD",
      "editorWidget.background": "#172235",
    },
  });
};

export type CodeEditorHandle = { find: () => void; format: () => void; toggleWrap: () => void };

const CodeEditor = forwardRef<
  CodeEditorHandle,
  {
    value: string;
    language: string;
    dark: boolean;
    onChange: (v: string) => void;
    onRun: () => void;
    onReady: (ready: boolean) => void;
  }
>(function CodeEditor({ value, language, dark, onChange, onRun, onReady }, ref) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [wrapped, setWrapped] = useState(false);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  useEffect(
    () => () => {
      editorRef.current = null;
      onReady(false);
    },
    [onReady],
  );
  useImperativeHandle(
    ref,
    () => ({
      find: () => {
        editorRef.current?.focus();
        void editorRef.current?.getAction("actions.find")?.run();
      },
      format: () => {
        editorRef.current?.focus();
        void editorRef.current?.getAction("editor.action.formatDocument")?.run();
      },
      toggleWrap: () => {
        editorRef.current?.focus();
        setWrapped((value) => !value);
      },
    }),
    [],
  );
  const reducedMotion = useReducedMotion();
  return (
    <Editor
      className="code-host"
      value={value}
      language={language}
      theme={dark ? "lemma-dark" : "lemma-light"}
      beforeMount={defineThemes}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        const wrapping = editor.onDidChangeConfiguration((event) => {
          if (event.hasChanged(monaco.editor.EditorOption.wordWrap))
            setWrapped(editor.getOption(monaco.editor.EditorOption.wordWrap) !== "off");
        });
        editor.onDidDispose(() => wrapping.dispose());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
        editor.addAction({
          id: "lemma.toggleWordWrap",
          label: "Toggle word wrap",
          keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
          run: () => setWrapped((value) => !value),
        });
        onReady(true);
      }}
      onChange={(v) => onChange(v ?? "")}
      loading={
        <div className="code-editor-fallback">
          <p className="space-hint">Loading enhanced editor… You can keep writing below.</p>
          <Textarea
            aria-label="Code source"
            className="code-area"
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onRun();
              }
            }}
          />
        </div>
      }
      options={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 13.5,
        lineHeight: 22,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 14 },
        renderLineHighlight: "line",
        tabSize: 2,
        automaticLayout: true,
        wordWrap: wrapped ? "on" : "off",
        ariaLabel: "Code editor",
        fontLigatures: true,
        folding: true,
        showFoldingControls: "mouseover",
        guides: { bracketPairs: true, indentation: true },
        renderValidationDecorations: "on",
        smoothScrolling: !reducedMotion,
        cursorBlinking: reducedMotion ? "solid" : "smooth",
        bracketPairColorization: { enabled: true },
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
});
export default CodeEditor;
