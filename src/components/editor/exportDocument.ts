import type { JSONContent } from "@tiptap/react";
export const escapeTex = (text: string) =>
  text.replace(
    /[\\{}$&#%_^~]/g,
    (char) =>
      ({
        "\\": "\\textbackslash{}",
        "{": "\\{",
        "}": "\\}",
        $: "\\$",
        "&": "\\&",
        "#": "\\#",
        "%": "\\%",
        _: "\\_",
        "^": "\\textasciicircum{}",
        "~": "\\textasciitilde{}",
      })[char]!,
  );
export function documentTex(title: string, doc: JSONContent): string {
  const render = (node: JSONContent): string => {
    const children = () => (node.content || []).map(render).join("");
    if (node.type === "text") {
      let text = escapeTex(node.text || "");
      for (const mark of node.marks || []) {
        if (mark.type === "bold") text = `\\textbf{${text}}`;
        if (mark.type === "italic") text = `\\emph{${text}}`;
        if (mark.type === "code") text = `\\texttt{${text}}`;
        if (mark.type === "underline") text = `\\underline{${text}}`;
        if (mark.type === "strike") text = `\\sout{${text}}`;
      }
      return text;
    }
    switch (node.type) {
      case "columns":
        return (
          (node.content || [])
            .map(
              (col) =>
                `\\begin{minipage}[t]{${(0.94 / (node.content?.length || 2)).toFixed(3)}\\textwidth}\n${render(col)}\\end{minipage}\n`,
            )
            .join("\\hfill\n") + "\n\n"
        );
      case "column":
        return children();
      case "doc":
      case "toggleBody":
      case "toggleHeading":
        return children();
      case "paragraph":
        return children() + "\n\n";
      case "heading": {
        const levels = ["section", "subsection", "subsubsection", "paragraph", "subparagraph"];
        return `\\${levels[Math.min(Number(node.attrs?.["level"] || 1) - 1, 4)]}*{${children()}}\n`;
      }
      case "inlineMath":
        return `$${node.attrs?.["latex"] || ""}$`;
      case "mathBlock":
        return `\\[\n${node.attrs?.["latex"] || ""}\n\\]\n`;
      case "bulletList":
      case "taskList":
        return `\\begin{itemize}\n${children()}\\end{itemize}\n`;
      case "orderedList":
        return `\\begin{enumerate}[start=${Number(node.attrs?.["start"] || 1)}]\n${children()}\\end{enumerate}\n`;
      case "listItem":
        return `\\item ${children()}`;
      case "taskItem":
        return `\\item[${node.attrs?.["checked"] ? "$\\boxtimes$" : "$\\square$"}] ${children()}`;
      case "blockquote":
      case "callout":
        return `\\begin{quote}\n${children()}\\end{quote}\n`;
      case "codeBlock":
        return `\\begin{quote}\\ttfamily\n${escapeTex((node.content || []).map((n) => n.text || "").join("")).replace(/\n/g, "\\\\\n")}\n\\end{quote}\n`;
      case "hardBreak":
        return "\\\\\n";
      case "horizontalRule":
        return "\\noindent\\rule{\\linewidth}{0.4pt}\n";
      case "pageBreak":
        return "\\newpage\n";
      case "attachment":
        return `\\begin{quote}Attachment: ${escapeTex(String(node.attrs?.["name"] || "Document"))} (file retained in Lemma).\\end{quote}\n`;
      case "image":
        return `\\begin{quote}Image: ${escapeTex(String(node.attrs?.["alt"] || "Image"))} (image retained in Lemma).\\end{quote}\n`;
      case "graph":
        return `\\begin{quote}Graph expressions:\\newline ${escapeTex((node.attrs?.["expressions"] || []).join("; "))}\\end{quote}\n`;
      default:
        return children();
    }
  };
  return `\\documentclass[11pt,a4paper]{article}\n% Compile with LuaLaTeX or XeLaTeX for Unicode text.\n\\usepackage{fontspec}\n\\usepackage[margin=20mm]{geometry}\n\\usepackage{amsmath,amssymb,enumitem}\n\\usepackage[normalem]{ulem}\n\\title{${escapeTex(title)}}\n\\date{}\n\\begin{document}\n\\maketitle\n${render(doc)}\n\\end{document}\n`;
}
export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const exportName = (title: string) =>
  title
    .split("")
    .map((char) => (char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? "-" : char))
    .join("")
    .trim()
    .slice(0, 100) || "Untitled";

async function rasterizeMath(root: HTMLElement) {
  const equations = Array.from(root.querySelectorAll<HTMLElement>(".katex"));
  if (!equations.length) return;
  const fontRules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule && rule.style.fontFamily.includes("KaTeX")) {
          const match = rule.style
            .getPropertyValue("src")
            .match(/url\(["']?([^"')]+\.woff2(?:\?[^"')]+)?)["']?\)/);
          if (!match?.[1]) continue;
          const response = await fetch(new URL(match[1], sheet.href || location.href));
          if (!response.ok) throw Error("Could not load equation fonts for export.");
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            response.blob().then((blob) => reader.readAsDataURL(blob));
          });
          fontRules.push(
            `@font-face{font-family:${rule.style.fontFamily};font-style:${rule.style.fontStyle};font-weight:${rule.style.fontWeight};src:url(${data})}`,
          );
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "SecurityError")) throw error;
    }
  }
  for (const equation of equations) {
    const rect = equation.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const clone = equation.cloneNode(true) as HTMLElement;
    const originals = [equation, ...Array.from(equation.querySelectorAll<HTMLElement>("*"))];
    const copies = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
    originals.forEach((element, i) => {
      const computed = getComputedStyle(element);
      const copy = copies[i]!;
      for (const prop of Array.from(computed))
        copy.style.setProperty(prop, computed.getPropertyValue(prop));
    });
    clone.style.margin = "0";
    clone.style.position = "relative";
    clone.style.left = "0";
    clone.style.top = "0";
    const wrapper = document.createElement("div");
    wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    wrapper.style.cssText = `width:${rect.width + 4}px;height:${rect.height + 4}px;padding:2px;box-sizing:border-box;background:white;`;
    wrapper.append(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width + 4}" height="${rect.height + 4}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${fontRules.join("")}</style>${new XMLSerializer().serializeToString(wrapper)}</div></foreignObject></svg>`;
    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((rect.width + 4) * 3);
    canvas.height = Math.ceil((rect.height + 4) * 3);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = new Image();
    result.src = canvas.toDataURL("image/png");
    result.style.cssText = `width:${rect.width + 4}px;height:${rect.height + 4}px;max-width:none;display:inline-block;vertical-align:middle;margin:0;`;
    await result.decode();
    equation.replaceWith(result);
  }
}

/** Render a private, continuous copy; page cuts avoid text lines and ordinary blocks. */
export async function downloadPDF(title: string, source: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  const host = document.createElement("div");
  host.className = "lemma-app pdf-export-host";
  const paper = document.createElement("article");
  paper.className = "pdf-export-paper";
  const heading = document.createElement("h1");
  heading.textContent = title;
  paper.append(heading);
  const body = source.cloneNode(true) as HTMLElement;
  body
    .querySelectorAll(
      ".page-spacer, button, textarea, iframe, .graph-edit-toggle, .graph-editor-panel",
    )
    .forEach((el) => el.remove());
  body.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  body.querySelectorAll(".collapsed").forEach((el) => el.classList.remove("collapsed"));
  paper.append(body);
  host.append(paper);
  document.body.append(host);
  try {
    await Promise.all(
      Array.from(body.querySelectorAll("img")).map(async (img) => {
        if (!img.complete) await img.decode().catch(() => {});
      }),
    );
    await rasterizeMath(paper);
    // html2canvas does not parse CSS Color 4. Resolve theme colors through the
    // browser canvas before capture, without changing the live editor.
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = colorCanvas.height = 1;
    const context = colorCanvas.getContext("2d")!;
    for (const el of [host, paper, ...Array.from(paper.querySelectorAll<HTMLElement>("*"))]) {
      const computed = getComputedStyle(el);
      for (const property of [
        "color",
        "background-color",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "outline-color",
        "text-decoration-color",
      ]) {
        const value = computed.getPropertyValue(property);
        if (/oklch|oklab|color\(/.test(value)) {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
          el.style.setProperty(property, `rgba(${r},${g},${b},${a! / 255})`);
        }
      }
      el.style.boxShadow = "none";
      el.style.textShadow = "none";
    }
    const width = 643;
    const pageHeight = 971;
    const origin = paper.getBoundingClientRect().top;
    const intervals: [number, number][] = [];
    const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
    let text: Node | null;
    while ((text = walker.nextNode())) {
      if (!text.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const r of Array.from(range.getClientRects()))
        if (r.height && r.height < pageHeight) intervals.push([r.top - origin, r.bottom - origin]);
    }
    paper
      .querySelectorAll("img, svg, .equation-wrap, .attachment-block, h1,h2,h3,h4,h5,h6")
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height < pageHeight) intervals.push([r.top - origin, r.bottom - origin]);
      });
    const breaks = Array.from(paper.querySelectorAll('[data-type="page-break"]'))
      .map((el) => el.getBoundingClientRect().top - origin)
      .filter((y) => y > 0);
    const total = paper.scrollHeight;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    let top = 0;
    let page = 0;
    while (top < total - 1) {
      let bottom = Math.min(total, top + pageHeight, ...breaks.filter((y) => y > top + 1));
      for (let tries = 0; tries < 20; tries++) {
        const overlaps = intervals.filter(([a, b]) => a < bottom && b > bottom);
        if (!overlaps.length) break;
        const cut = Math.min(...overlaps.map(([a]) => a));
        if (cut <= top + 20) break;
        bottom = cut;
      }
      const height = Math.max(1, bottom - top);
      const canvas = await html2canvas(paper, {
        backgroundColor: "#ffffff",
        scale: 2,
        width,
        height,
        y: top,
        useCORS: true,
        logging: false,
        windowWidth: 1200,
        onclone: (doc) => {
          doc.body.style.background = "#fff";
          doc.body.style.color = "#191919";
          doc.documentElement.style.background = "#fff";
          doc.documentElement.style.color = "#191919";
        },
      });
      if (page++) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        20,
        20,
        170,
        (height * 170) / width,
      );
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(String(page), 105, 290, { align: "center" });
      top = bottom;
    }
    pdf.save(`${exportName(title)}.pdf`);
  } finally {
    host.remove();
  }
}
