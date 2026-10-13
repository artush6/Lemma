/** Import common TeX document structure into editable Lemma content, without executing TeX. */
export const escapeHTML = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function looksLikeLatex(text: string): boolean {
  return (
    /\\(?:documentclass|begin\{(?:document|equation\*?|align\*?|gather\*?|itemize|enumerate|quote|quotation|thebibliography)\}|(?:section|subsection|chapter|textbf|textit|texttt|emph)\*?\s*\{|[([])/.test(
      text,
    ) || /^\s*\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|lim|mathbb)\b/.test(text)
  );
}

const displayEnvironments = new Set([
  "equation",
  "equation*",
  "align",
  "align*",
  "alignat",
  "alignat*",
  "gather",
  "gather*",
  "multline",
  "multline*",
  "displaymath",
]);

export function latexToHTML(input: string): string {
  const source = input
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*```(?:latex|tex)\s*\n([\s\S]*?)\n\s*```\s*$/i, "$1");
  const docStart = source.indexOf("\\begin{document}");
  const preamble = docStart >= 0 ? source.slice(0, docStart) : source;
  const body =
    docStart >= 0 ? source.slice(docStart + 16).replace(/\\end\{document\}[\s\S]*$/, "") : source;
  const quoteEnvironments = new Set(["verbatim", "Verbatim", "lstlisting", "minted"]);
  for (const match of preamble.matchAll(/\\DefineVerbatimEnvironment\{([^}]+)\}/g))
    quoteEnvironments.add(match[1]!);
  const references = new Map<string, number>();
  for (const match of body.matchAll(/\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g))
    references.set(match[1]!, references.size + 1);

  // Retain local math definitions on every equation so they survive saving, copying, and reloads.
  const definitions: string[] = [];
  const declaration = /\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator)\*?/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(preamble))) {
    let end = declaration.lastIndex;
    while (/\s/.test(preamble[end] || "") && end < preamble.length) end++;
    const name = readGroup(preamble, end);
    if (!name || !/^\\[A-Za-z]+$/.test(name.value)) continue;
    end = name.end;
    while (/\s/.test(preamble[end] || "") && end < preamble.length) end++;
    let arity = "";
    if (preamble[end] === "[") {
      const option = readGroup(preamble, end, "[", "]");
      if (!option) continue;
      arity = `[${option.value}]`;
      end = option.end;
    }
    while (/\s/.test(preamble[end] || "") && end < preamble.length) end++;
    const value = readGroup(preamble, end);
    if (!value) continue;
    // Text/layout helper macros are not meaningful in KaTeX.
    if (/\\(?:par|Needspace|noindent|color|catcode)/.test(value.value)) continue;
    const operator = match[0].includes("DeclareMathOperator");
    definitions.push(
      operator
        ? `\\newcommand{${name.value}}{\\operatorname${match[0].endsWith("*") ? "*" : ""}{${value.value}}}`
        : `\\def${name.value}${Array.from({ length: Math.min(9, Number(arity.slice(1, -1)) || 0) }, (_, i) => `#${i + 1}`).join("")}{${value.value}}`,
    );
    declaration.lastIndex = value.end;
  }
  const math = (tex: string, display: boolean) => {
    const latex = definitions.join("") + tex.trim();
    return `<${display ? "div" : "span"} data-type="${display ? "math-block" : "inline-math"}" data-latex="${escapeHTML(latex)}"></${display ? "div" : "span"}>`;
  };
  const title = preamble.match(/\\title\{([^}]+)\}/)?.[1];

  function render(text: string, inlineOnly = false): string {
    const out: string[] = [];
    let paragraph = "";
    let i = 0;
    const flush = () => {
      if (paragraph.trim()) out.push(inlineOnly ? paragraph.trim() : `<p>${paragraph.trim()}</p>`);
      paragraph = "";
    };
    const block = (html: string) => {
      flush();
      out.push(html);
    };
    const group = () => {
      while (i < text.length && /\s/.test(text[i]!)) i++;
      const value = readGroup(text, i);
      if (value) i = value.end;
      return value?.value || "";
    };
    const option = () => {
      if (text[i] === "[") {
        const value = readGroup(text, i, "[", "]");
        if (value) i = value.end;
      }
    };
    while (i < text.length) {
      if (text[i] === "%") {
        while (i < text.length && text[i] !== "\n") i++;
        continue;
      }
      if (text[i] === "\n" && /^\n\s*\n/.test(text.slice(i))) {
        flush();
        while (i < text.length && /\s/.test(text[i]!)) i++;
        continue;
      }
      const delimiter = ["$$", "\\[", "\\(", "$"].find((d) => text.startsWith(d, i));
      if (delimiter) {
        const closing = delimiter === "\\[" ? "\\]" : delimiter === "\\(" ? "\\)" : delimiter;
        let end = text.indexOf(closing, i + delimiter.length);
        while (end > 0 && text[end - 1] === "\\") end = text.indexOf(closing, end + closing.length);
        if (end >= 0) {
          const display = delimiter === "$$" || delimiter === "\\[";
          const html = math(text.slice(i + delimiter.length, end), display);
          if (display) block(html);
          else paragraph += html;
          i = end + closing.length;
          continue;
        }
      }
      if (text[i] === "{") {
        const value = readGroup(text, i);
        if (value) {
          if (/\\(?:LARGE|Huge|huge)\b/.test(value.value))
            block(`<h1>${render(value.value, true)}</h1>`);
          else paragraph += render(value.value, true);
          i = value.end;
          continue;
        }
      }
      if (text[i] !== "\\") {
        const char = text[i++]!;
        paragraph += char === "~" ? "&nbsp;" : char === "\n" ? " " : escapeHTML(char);
        continue;
      }
      const command = text.slice(i).match(/^\\([A-Za-z]+\*?|.)/);
      if (!command) {
        paragraph += "\\";
        i++;
        continue;
      }
      const name = command[1]!;
      i += command[0].length;
      if (name === "begin") {
        const env = group();
        // Find the matching end, accounting for nested environments of the same kind.
        const marker = new RegExp(
          `\\\\(begin|end)\\{${env.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`,
          "g",
        );
        marker.lastIndex = i;
        let depth = 1;
        let end: RegExpExecArray | null = null;
        while ((end = marker.exec(text))) {
          depth += end[1] === "begin" ? 1 : -1;
          if (!depth) break;
        }
        if (!end) {
          paragraph += escapeHTML(command[0] + `{${env}}`);
          continue;
        }
        let content = text.slice(i, end.index);
        i = marker.lastIndex;
        if (displayEnvironments.has(env)) {
          const wrapper = /^align/.test(env)
            ? "aligned"
            : /^gather/.test(env)
              ? "gathered"
              : env.startsWith("multline")
                ? "gathered"
                : "";
          content = content.replace(/\\label\{[^}]*\}/g, "");
          block(math(wrapper ? `\\begin{${wrapper}}${content}\\end{${wrapper}}` : content, true));
        } else if (quoteEnvironments.has(env))
          block(`<pre><code>${escapeHTML(content.replace(/^\n|\n$/g, ""))}</code></pre>`);
        else if (env === "quote" || env === "quotation")
          block(`<blockquote>${render(content)}</blockquote>`);
        else if (env === "itemize" || env === "enumerate") {
          const items = listItems(content);
          block(
            `<${env === "itemize" ? "ul" : "ol"}>${items.map((item) => `<li>${render(item)}</li>`).join("")}</${env === "itemize" ? "ul" : "ol"}>`,
          );
        } else if (env === "thebibliography") {
          const width = readGroup(content.trimStart(), 0);
          content = width ? content.trimStart().slice(width.end) : content;
          block("<h2>References</h2>");
          for (const item of content.split(/\\bibitem(?:\[[^\]]*\])?\{[^}]*\}/).slice(1))
            block(render(item));
        } else block(render(content));
        continue;
      }
      if (/^(?:part|chapter|section|subsection|subsubsection|paragraph)\*?$/.test(name)) {
        option();
        const heading = group();
        const level =
          name.startsWith("subsub") || name === "paragraph" ? 3 : name.startsWith("sub") ? 2 : 1;
        block(`<h${level}>${render(heading, true)}</h${level}>`);
        continue;
      }
      if (["textbf", "textit", "emph", "texttt", "underline"].includes(name)) {
        const tag =
          name === "textbf"
            ? "strong"
            : name === "texttt"
              ? "code"
              : name === "underline"
                ? "u"
                : "em";
        paragraph += `<${tag}>${render(group(), true)}</${tag}>`;
        continue;
      }
      if (name === "url" || name === "href") {
        const url = group();
        const label = name === "href" ? render(group(), true) : escapeHTML(url);
        paragraph += /^https?:\/\//i.test(url)
          ? `<a href="${escapeHTML(url)}">${label}</a>`
          : label;
        continue;
      }
      if (/^cite(?:p|t)?\*?$/.test(name)) {
        option();
        option();
        paragraph += `[${group()
          .split(",")
          .map((key) => references.get(key.trim()) || escapeHTML(key.trim()))
          .join(", ")}]`;
        continue;
      }
      if (name === "maketitle") {
        if (title) block(`<h1>${render(title, true)}</h1>`);
        continue;
      }
      if (name === "QuoteSource") {
        group();
        block("<p><strong>Verbatim excerpt</strong></p>");
        continue;
      }
      if (
        ["label", "index", "color", "textcolor", "hspace", "vspace", "Needspace"].includes(name)
      ) {
        option();
        group();
        if (name === "textcolor") paragraph += render(group(), true);
        continue;
      }
      if (["par", "smallskip", "medskip", "bigskip", "newpage", "clearpage"].includes(name)) {
        flush();
        continue;
      }
      if (
        [
          "raggedright",
          "centering",
          "noindent",
          "sffamily",
          "rmfamily",
          "ttfamily",
          "bfseries",
          "itshape",
          "LARGE",
          "Large",
          "large",
          "small",
          "footnotesize",
          "normalsize",
          "Huge",
          "huge",
        ].includes(name)
      )
        continue;
      if (["&", "%", "$", "#", "_", "{", "}"].includes(name)) {
        paragraph += escapeHTML(name);
        continue;
      }
      if (name === "\\") {
        option();
        paragraph += "<br>";
        continue;
      }
      if (name === "," || name === ";" || name === " ") {
        paragraph += " ";
        continue;
      }
      // Preserve unsupported commands instead of silently deleting user content.
      paragraph += escapeHTML(command[0]);
    }
    flush();
    return out.join("");
  }
  if (docStart < 0 && /^\s*\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|lim|mathbb)\b/.test(body))
    return math(body, true);
  return render(body);
}

function readGroup(
  text: string,
  start: number,
  open = "{",
  close = "}",
): { value: string; end: number } | null {
  if (text[start] !== open) return null;
  let depth = 1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text[i] === open) depth++;
    if (text[i] === close && --depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
  }
  return null;
}

/** Split only items belonging to this list, keeping nested lists intact. */
function listItems(text: string): string[] {
  const markers = /\\(?:begin\{[^}]+\}|end\{[^}]+\}|item(?:\[[^\]]*\])?)/g;
  const items: string[] = [];
  let depth = 0;
  let start: number | null = null;
  for (const marker of text.matchAll(markers)) {
    if (marker[0].startsWith("\\begin")) depth++;
    else if (marker[0].startsWith("\\end")) depth--;
    else if (depth === 0) {
      if (start !== null) items.push(text.slice(start, marker.index));
      start = marker.index! + marker[0].length;
    }
  }
  if (start !== null) items.push(text.slice(start));
  return items;
}
