import { describe, expect, it } from "vitest";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import katex from "katex";
import { latexToHTML, looksLikeLatex } from "@/components/editor/latex";
import { SmartPaste, markdownToHTML } from "@/components/editor/paste";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const mathNodes = [false, true].map((inline) =>
  Node.create({
    name: inline ? "inlineMath" : "mathBlock",
    group: inline ? "inline" : "block",
    inline,
    atom: true,
    addAttributes: () => ({
      latex: { default: "", parseHTML: (el) => el.getAttribute("data-latex") },
    }),
    parseHTML: () => [
      { tag: `${inline ? "span" : "div"}[data-type="${inline ? "inline-math" : "math-block"}"]` },
    ],
    renderHTML: ({ node }) => [inline ? "span" : "div", { "data-latex": node.attrs["latex"] }],
  }),
);
const paste = (editor: Editor, text: string, html = "") => {
  const event = {
    clipboardData: { getData: (type: string) => (type === "text/plain" ? text : html) },
  } as ClipboardEvent;
  let handled = false;
  editor.view.someProp("handlePaste", (handler) => {
    handled = Boolean(handler(editor.view, event, null!));
    return handled;
  });
  return handled;
};

describe("smart paste", () => {
  it("imports complete documents, custom math, formatted text, quotes and citations", () => {
    const source = String.raw`\documentclass{article}
\newcommand{\R}{\mathbb{R}}
\DeclareMathOperator{\Var}{Var}
\DefineVerbatimEnvironment{PromptQuote}{Verbatim}{breaklines=true}
\begin{document}
{\raggedright\LARGE\sffamily\bfseries\color{ink}A title\par}
\section{An introduction}
A \textbf{bold {nested} phrase} with $x\in\R$ and \cite{ref}.
\[
\Var(X) \geq 0
\]
\begin{PromptQuote}
Literal $math$ and <script> tags
\end{PromptQuote}
\begin{thebibliography}{9}
\bibitem{ref} Author. \emph{A paper}. \url{https://example.com}.
\end{thebibliography}
\end{document}`;
    expect(looksLikeLatex(source)).toBe(true);
    const doc = parse(latexToHTML(source));
    expect(doc.querySelector("h1")?.textContent).toBe("A title");
    expect(doc.querySelector("strong")?.textContent).toBe("bold nested phrase");
    expect(doc.body.textContent).toContain("[1]");
    expect(doc.body.textContent).not.toContain("documentclass");
    expect(doc.querySelector("pre")?.textContent).toContain("Literal $math$ and <script> tags");
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    const equations = doc.querySelectorAll("[data-latex]");
    expect(equations).toHaveLength(2);
    for (const eq of equations)
      expect(() =>
        katex.renderToString(eq.getAttribute("data-latex")!, { throwOnError: true }),
      ).not.toThrow();
  });

  it("inserts actual editable math and heading nodes even when source clipboard includes HTML", () => {
    const editor = new Editor({ extensions: [StarterKit, ...mathNodes, SmartPaste] });
    expect(
      paste(
        editor,
        String.raw`\section{Test} A value \(x^2\). \begin{align}a&=b\\c&=d\end{align}`,
        "<pre>source</pre>",
      ),
    ).toBe(true);
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"type":"heading"');
    expect(json).toContain('"type":"inlineMath"');
    expect(json).toContain('"type":"mathBlock"');
    const doc = parse(editor.getHTML());
    for (const eq of doc.querySelectorAll("[data-latex]"))
      expect(() =>
        katex.renderToString(eq.getAttribute("data-latex")!, { throwOnError: true }),
      ).not.toThrow();
    editor.commands.undo();
    expect(editor.getText()).toBe("");
    editor.destroy();
  });

  it("renders markdown math while keeping inline and fenced code literal", () => {
    const doc = parse(
      markdownToHTML(
        "# Formula\n**Value** $x_1^2$ and `cost $5$`\n$$a+b$$\n```js\nconst value = '$x$';\n```",
      ),
    );
    expect(doc.querySelector("h1")?.textContent).toBe("Formula");
    expect(doc.querySelectorAll("[data-type=inline-math]")).toHaveLength(1);
    expect(doc.querySelectorAll("[data-type=math-block]")).toHaveLength(1);
    expect(doc.querySelector("pre")?.textContent).toContain("'$x$'");
    const editor = new Editor({ extensions: [StarterKit, ...mathNodes, SmartPaste] });
    expect(paste(editor, "**Value** $x_1^2$")).toBe(true);
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"inlineMath"');
    editor.commands.setCodeBlock();
    expect(paste(editor, String.raw`\section{literal}`)).toBe(false);
    editor.destroy();
  });

  it("keeps nested TeX lists and mixed Markdown/TeX delimiters", () => {
    const doc = parse(
      latexToHTML(
        String.raw`\begin{itemize}\item Outer\begin{enumerate}\item Inner\end{enumerate}\item Second\end{itemize}`,
      ),
    );
    expect(doc.querySelectorAll("ul > li")).toHaveLength(2);
    expect(doc.querySelectorAll("ol > li")).toHaveLength(1);
    const editor = new Editor({ extensions: [StarterKit, ...mathNodes, SmartPaste] });
    expect(
      paste(
        editor,
        String.raw`# Heading
\(x^2\)`,
      ),
    ).toBe(true);
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"heading"');
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"inlineMath"');
    editor.destroy();
  });

  it("recognizes math fragments and preserves unsupported commands and unsafe links as text", () => {
    expect(looksLikeLatex(String.raw`\(a+b\)`)).toBe(true);
    expect(looksLikeLatex("ordinary text")).toBe(false);
    const doc = parse(
      latexToHTML(
        String.raw`\unknown{important text} \href{javascript:alert(1)}{Link} \textbf{<img src=x onerror=alert(1)>}`,
      ),
    );
    expect(doc.body.textContent).toContain("\\unknownimportant text");
    expect(doc.querySelector("a, img")).toBeNull();
  });
});
