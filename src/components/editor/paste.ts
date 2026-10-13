import { imageFileContent, safeImageSource } from "./blocks";
import { latexToHTML, looksLikeLatex } from "./latex";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice, type Node as PMNode, type Schema } from "@tiptap/pm/model";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Turn KaTeX/MathJax output (Notion, Wikipedia, ChatGPT…) into Lemma math nodes. */
export function mathFromHTML(html: string) {
  if (typeof DOMParser === "undefined" || !/katex|math|annotation|aside|notion-callout/i.test(html))
    return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("aside, .notion-callout-block")
    .forEach((el) => el.setAttribute("data-type", "callout"));
  doc.querySelectorAll(".katex-display, .katex, math").forEach((el) => {
    if (!el.isConnected) return;
    const tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (!tex) return;
    const display =
      el.classList.contains("katex-display") ||
      el.getAttribute("display") === "block" ||
      !!el.closest(".notion-equation-block");
    const host = (el.closest(".notion-equation-block") as HTMLElement) || (display ? el : el);
    const repl = doc.createElement(display ? "div" : "span");
    repl.setAttribute("data-type", display ? "math-block" : "inline-math");
    repl.setAttribute("data-latex", tex);
    host.replaceWith(repl);
  });
  return doc.body.innerHTML;
}

/** Light markdown for plain-text pastes (Notion "copy as markdown", Obsidian, ChatGPT). */
export function markdownToHTML(text: string) {
  const inline = (s: string) => {
    const tokens: string[] = [];
    const withImages = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (!safeImageSource(src)) return match;
      tokens.push(`<img src="${esc(src)}" alt="${esc(alt)}">`);
      return `\uE000${tokens.length - 1}\uE001`;
    });
    const protectedText = withImages.replace(
      /`([^`]+)`|\\\((.+?)\\\)|(?<![\\$])\$([^$\n]+?)\$/g,
      (match, code, tex, dollar) => {
        tokens.push(
          code !== undefined
            ? `<code>${esc(code)}</code>`
            : `<span data-type="inline-math" data-latex="${esc(tex || dollar)}"></span>`,
        );
        return `\uE000${tokens.length - 1}\uE001`;
      },
    );
    return esc(protectedText)
      .replace(
        /\*\*(.+?)\*\*|__(.+?)__/g,
        (_, stars, underscores) => `<strong>${stars || underscores}</strong>`,
      )
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] || "");
  };
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  const containers: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*<aside(?:\s[^>]*)?>\s*$/i.test(line)) {
      // Notion exports put their icon on its own line immediately after <aside>.
      let icon = "";
      let next = i + 1;
      while (next < lines.length && !lines[next]!.trim()) next++;
      if (
        /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\uFE0F\u200D]*$/u.test(
          lines[next]?.trim() || "",
        )
      ) {
        icon = lines[next]!.trim();
        i = next;
      }
      out.push(`<aside data-type="callout" data-icon="${esc(icon)}">`);
      containers.push("aside");
      continue;
    }
    if (/^\s*<\/aside>\s*$/i.test(line)) {
      if (containers.at(-1) === "aside") out.push(`</${containers.pop()}>`);
      continue;
    }
    const toggle = line.match(/^\s*(#{1,6})\s+>\s*(.*)$/) || line.match(/^\s*>\s*(#{1,6})\s+(.*)$/);
    if (toggle) {
      const body: string[] = [];
      const firstBodyLine = lines.slice(i + 1).find((candidate) => candidate.trim());
      const indented = /^\s{2,}\S/.test(firstBodyLine || "");
      while (i + 1 < lines.length) {
        const next = lines[i + 1]!;
        const heading = next.match(/^\s*(#{1,6})\s/);
        if (/^\s*<\/aside>/.test(next) || (heading && heading[1]!.length <= toggle[1]!.length))
          break;
        if (indented && next.trim() && !/^\s{2,}\S/.test(next)) break;
        body.push(indented ? lines[++i]!.replace(/^ {2}|^\t/, "") : lines[++i]!);
      }
      out.push(
        `<section data-type="toggle-heading" data-level="${toggle[1]!.length}"><h${toggle[1]!.length}>${inline(toggle[2]!)}</h${toggle[1]!.length}><div data-type="toggle-body">${markdownToHTML(body.join("\n")) || "<p></p>"}</div></section>`,
      );
      continue;
    }
    const missingImage = line.match(/^!\[?([^\n]+\.(?:png|jpe?g|gif|webp|svg))\]?$/i);
    if (missingImage) {
      out.push(
        `<figure data-type="image-placeholder" data-name="${esc(missingImage[1]!)}"></figure>`,
      );
      continue;
    }
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const body: string[] = [];
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i]!)) body.push(lines[i]!);
      out.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const display = line.match(/^\s*(?:\$\$|\\\[)([\s\S]*?)(?:\$\$|\\\])\s*$/);
    if (display) {
      out.push(`<div data-type="math-block" data-latex="${esc(display[1]!)}"></div>`);
      continue;
    }
    if (/^\s*(?:\$\$|\\\[)\s*$/.test(line)) {
      const body: string[] = [];
      while (++i < lines.length && !/^\s*(?:\$\$|\\\])\s*$/.test(lines[i]!)) body.push(lines[i]!);
      out.push(`<div data-type="math-block" data-latex="${esc(body.join("\n"))}"></div>`);
      continue;
    }
    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1]!.length;
      const ordered = /^\d/.test(listMatch[2]!);
      const task = !ordered && /^\[( |x)\]\s/i.test(listMatch[3]!);
      const tag = ordered ? "ol" : "ul";
      const start = ordered ? ` start="${parseInt(listMatch[2]!)}"` : "";
      out.push(`<${tag}${task ? ' data-type="taskList"' : start}>`);
      do {
        const item = lines[i]!.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)!;
        let label = item[3]!;
        const checked = label.match(/^\[( |x)\]\s+(.*)$/i);
        if (task && checked) label = checked[2]!;
        const children: string[] = [];
        while (i + 1 < lines.length) {
          const next = lines[i + 1]!;
          if (!next.trim() && /^\s+\S/.test(lines[i + 2] || "")) {
            i++;
            children.push("");
            continue;
          }
          if (!next.trim() || (next.match(/^\s*/)?.[0].length || 0) <= indent) break;
          children.push(next.slice(Math.min(indent + 2, next.match(/^\s*/)?.[0].length || 0)));
          i++;
        }
        out.push(
          `<li${task ? ` data-type="taskItem" data-checked="${checked?.[1]!.toLowerCase() === "x"}"` : ""}><p>${inline(label)}</p>${markdownToHTML(children.join("\n"))}</li>`,
        );
        const nextItem = lines[i + 1]?.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (
          !nextItem ||
          nextItem[1]!.length !== indent ||
          /^\d/.test(nextItem[2]!) !== ordered ||
          (!ordered && /^\[( |x)\]\s/i.test(nextItem[3]!) !== task)
        )
          break;
        i++;
      } while (i < lines.length);
      out.push(`</${tag}>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      out.push(`<h${m[1]!.length}>${inline(m[2]!)}</h${m[1]!.length}>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      out.push(`<blockquote><p>${inline(m[1]!)}</p></blockquote>`);
    } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      out.push("<hr>");
    } else if (line.trim()) {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  while (containers.length) out.push(`</${containers.pop()}>`);
  return out.join("");
}

/** Split any remaining $$…$$ / $…$ inside text into real math nodes. */
function convertDollars(fragment: Fragment, schema: Schema): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    if (node.type.name === "codeBlock" || node.marks.some((mark) => mark.type.name === "code")) {
      nodes.push(node);
      return;
    }
    if (node.isTextblock && node.type.name === "paragraph") {
      const text = node.textContent.trim();
      const whole = text.match(/^\$\$([\s\S]+)\$\$$/);
      if (whole && schema.nodes["mathBlock"] && node.childCount === 1) {
        nodes.push(schema.nodes["mathBlock"].create({ latex: whole[1]!.trim() }));
        return;
      }
    }
    if (node.isText && node.text && /\$/.test(node.text) && schema.nodes["inlineMath"]) {
      const re = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
      let last = 0;
      let m;
      const t = node.text;
      while ((m = re.exec(t))) {
        if (m.index > last) nodes.push(schema.text(t.slice(last, m.index), node.marks));
        nodes.push(schema.nodes["inlineMath"].create({ latex: (m[1] || m[2] || "").trim() }));
        last = m.index + m[0].length;
      }
      if (last === 0) nodes.push(node);
      else if (last < t.length) nodes.push(schema.text(t.slice(last), node.marks));
      return;
    }
    nodes.push(node.content.size ? node.copy(convertDollars(node.content, schema)) : node);
  });
  return Fragment.fromArray(nodes);
}

export const SmartPaste = Extension.create({
  name: "lemmaSmartPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("lemmaSmartPaste"),
        props: {
          transformPastedHTML: (html) => mathFromHTML(html),
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
              /^image\/(png|jpeg|gif|webp)$/.test(file.type),
            );
            if (!files.length || !editor.schema.nodes["image"] || !editor.isEditable) return false;
            const position =
              view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
              view.state.selection.from;
            editor.commands.setTextSelection(position);
            void Promise.all(files.map(imageFileContent))
              .then((content) => {
                if (!editor.isDestroyed) editor.commands.insertContent(content.filter(Boolean));
              })
              .catch((error) =>
                window.alert(
                  error instanceof Error ? error.message : "This image could not be opened.",
                ),
              );
            return true;
          },
          handlePaste: (_view, event) => {
            const files = Array.from(event.clipboardData?.files || []).filter((file) =>
              /^image\/(png|jpeg|gif|webp)$/.test(file.type),
            );
            if (files.length && editor.schema.nodes["image"] && editor.isEditable) {
              void Promise.all(files.map(imageFileContent))
                .then((content) => {
                  if (!editor.isDestroyed) editor.commands.insertContent(content.filter(Boolean));
                })
                .catch((error) =>
                  window.alert(
                    error instanceof Error ? error.message : "This image could not be opened.",
                  ),
                );
              return true;
            }
            const html = event.clipboardData?.getData("text/html");
            const text = event.clipboardData?.getData("text/plain");
            if (!text || editor.isActive("codeBlock")) return false;
            const looksMarkdown =
              /(^|\n)(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|\$\$|```|\\\[|<aside|!\[?)|\*\*.+\*\*|\$[^$\n]+\$|\\\(/.test(
                text,
              );
            const markdownStructure = /(^|\n)\s*(?:#{1,6}\s|<\/?aside>)/.test(text);
            const latexStructure =
              /\\(?:documentclass|begin\{|(?:section|subsection|chapter|textbf|textit|emph)\*?\s*\{)/.test(
                text,
              );
            if (
              looksLikeLatex(text) &&
              (!looksMarkdown ||
                (latexStructure && !markdownStructure) ||
                /^\s*```(?:latex|tex)\b/i.test(text)) &&
              !/^\s*```(?!latex\b|tex\b)/i.test(text)
            ) {
              editor.commands.insertContent(latexToHTML(text));
              return true;
            }
            // Source-like HTML (e.g. copying a Markdown file) must not suppress parsing.
            // Preserve rich clipboard formatting when its text is already rendered.
            const sourceMarkdown = /(^|\n)\s*(?:#{1,6}\s|<\/?aside>|!\[|```)/.test(text);
            if (html && !sourceMarkdown && !(looksMarkdown && /<pre\b/i.test(html))) return false;
            if (!looksMarkdown) return false;
            editor.commands.insertContent(markdownToHTML(text));
            return true;
          },
          transformPasted: (slice) =>
            new Slice(convertDollars(slice.content, editor.schema), slice.openStart, slice.openEnd),
        },
      }),
    ];
  },
});
