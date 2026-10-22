import { useReducedMotion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import Editor, { type BeforeMount } from "@monaco-editor/react";

// Monochrome VS Code themes with restrained syntax colours.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("lemma-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a8a8a", fontStyle: "italic" },
      { token: "keyword", foreground: "0033b3", fontStyle: "bold" },
      { token: "string", foreground: "067d17" },
      { token: "number", foreground: "1750eb" },
      { token: "type", foreground: "871094" },
      { token: "delimiter", foreground: "555555" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f5f5f5",
      "editorLineNumber.foreground": "#b5b5b5",
      "editorLineNumber.activeForeground": "#000000",
      "editor.selectionBackground": "#dcdcdc",
      "editorCursor.foreground": "#000000",
    },
  });
  monaco.editor.defineTheme("lemma-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6a6a6a", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ea" },
      { token: "string", foreground: "a5d6a7" },
      { token: "number", foreground: "f78c6c" },
      { token: "type", foreground: "82aaff" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.lineHighlightBackground": "#0f0f0f",
      "editorLineNumber.foreground": "#444444",
      "editorLineNumber.activeForeground": "#ffffff",
      "editor.selectionBackground": "#2a2a2a",
      "editorCursor.foreground": "#ffffff",
    },
  });
};

export default function CodeEditor({
  value,
  language,
  dark,
  onChange,
  onRun,
}: {
  value: string;
  language: string;
  dark: boolean;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Editor
      className="code-host"
      value={value}
      language={language}
      theme={dark ? "lemma-dark" : "lemma-light"}
      beforeMount={defineThemes}
      onMount={(editor, monaco) =>
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun)
      }
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
        wordWrap: "off",
        smoothScrolling: !reducedMotion,
        cursorBlinking: reducedMotion ? "solid" : "smooth",
        bracketPairColorization: { enabled: true },
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}
