import { describe, expect, it } from "vitest";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import katex from "katex";
import { latexToHTML, looksLikeLatex } from "@/components/editor/latex";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Callout } from "@/components/editor/nodes";
import {
  safeImageSource,
  imageFileContent,
  ImageBlock,
  ImagePlaceholder,
  ToggleHeading,
  ToggleBody,
} from "@/components/editor/blocks";
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
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : type === "text/html" ? html : ""),
    },
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

describe("Markdown and Notion documents", () => {
  const create = () =>
    new Editor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        ...mathNodes,
        Callout,
        ImageBlock,
        ImagePlaceholder,
        ToggleHeading,
        ToggleBody,
        SmartPaste,
      ],
    });
  it("prioritizes Markdown structure over LaTeX inside equations, even with HTML on the clipboard", () => {
    const editor = create();
    const source = String.raw`# Functions
<aside>
📖
## Definition
A **bold** value $f(x)$.
$$
\begin{aligned}
f &: E \to F \\
x &\to f(x)
\end{aligned}
$$
<aside>
❗
#### Remark
Nested content.
</aside>
</aside>
!Missing screenshot.png`;
    expect(paste(editor, source, "<pre>Markdown source</pre>")).toBe(true);
    const doc = parse(editor.getHTML());
    expect(doc.querySelectorAll("aside")).toHaveLength(2);
    expect(doc.querySelector('aside[data-icon="📖"] h2')?.textContent).toBe("Definition");
    expect(doc.querySelector("h4")?.textContent).toBe("Remark");
    expect(doc.querySelector("strong")?.textContent).toBe("bold");
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"mathBlock"');
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"imagePlaceholder"');
    expect(editor.getText()).not.toContain("<aside>");
    editor.commands.undo();
    expect(editor.getText()).toBe("");
    editor.destroy();
  });
  it("imports nested lists, grouped tasks, H6, toggle headings and real image URLs", () => {
    const editor = create();
    paste(
      editor,
      `###### Small heading
## > Expand me
  Body **text**
  - First
    - Nested
- [x] Complete
- [ ] Next
![Diagram](https://example.com/diagram.png)`,
    );
    const doc = parse(editor.getHTML());
    expect(doc.querySelector("h6")?.textContent).toBe("Small heading");
    expect(doc.querySelector('section[data-type="toggle-heading"] h2')?.textContent).toBe(
      "Expand me",
    );
    expect(doc.querySelector("ul ul li")?.textContent).toBe("Nested");
    expect(doc.querySelectorAll('ul[data-type="taskList"] > li')).toHaveLength(2);
    expect(doc.querySelector("img")?.getAttribute("src")).toBe("https://example.com/diagram.png");
    editor.destroy();
  });
  it("preserves rich HTML headings and imports native HTML callouts and images", () => {
    const editor = create();
    expect(
      paste(
        editor,
        "Rendered heading",
        '<aside><h4>Rendered heading</h4><img src="https://example.com/image.png"></aside>',
      ),
    ).toBe(false);
    editor.commands.insertContent(
      '<aside><h4>Rendered heading</h4><img src="https://example.com/image.png"></aside>',
    );
    expect(editor.getJSON().content?.[0]?.type).toBe("callout");
    expect(parse(editor.getHTML()).querySelector("h4")).not.toBeNull();
    editor.destroy();
  });
});

describe("image attachment input", () => {
  it("accepts standard image URLs and relative exports while rejecting script URLs", async () => {
    expect(safeImageSource("diagrams/curve.png")).toBe(true);
    expect(safeImageSource("https://example.com/image.png")).toBe(true);
    expect(safeImageSource(" javascript:alert(1)")).toBe(false);
    expect(safeImageSource("data:text/html,document")).toBe(false);
    const image = new File(["image contents"], "diagram.png", { type: "image/png" });
    expect((await imageFileContent(image))?.attrs.src).toMatch(/^data:image\/png;base64,/);
    expect(
      await imageFileContent(new File(["text"], "note.txt", { type: "text/plain" })),
    ).toBeNull();
    await expect(
      imageFileContent(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
      ),
    ).rejects.toThrow("2 MB");
  });
});
