// @ts-nocheck -- ProseMirror schema node lookups are dynamic
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fragment, Slice, type Node as PMNode, type Schema } from '@tiptap/pm/model';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Turn KaTeX/MathJax output (Notion, Wikipedia, ChatGPT…) into Lemma math nodes. */
function mathFromHTML(html: string) {
  if (typeof DOMParser === 'undefined' || !/katex|math|annotation/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('.katex-display, .katex, math').forEach((el) => {
    if (!el.isConnected) return;
    const tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (!tex) return;
    const display = el.classList.contains('katex-display') || el.getAttribute('display') === 'block' || !!el.closest('.notion-equation-block');
    const host = (el.closest('.notion-equation-block') as HTMLElement) || (display ? el : el);
    const repl = doc.createElement(display ? 'div' : 'span');
    repl.setAttribute('data-type', display ? 'math-block' : 'inline-math');
    repl.setAttribute('data-latex', tex);
    host.replaceWith(repl);
  });
  return doc.body.innerHTML;
}

/** Light markdown for plain-text pastes (Notion "copy as markdown", Obsidian, ChatGPT). */
function markdownToHTML(text: string) {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\$\$\s*$/.test(line)) {
      close();
      const body: string[] = [];
      while (++i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) body.push(lines[i]);
      out.push(`<div data-type="math-block" data-latex="${esc(body.join('\n'))}"></div>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
    else if ((m = line.match(/^\s*[-*+]\s+\[( |x)\]\s+(.*)$/i))) { close(); out.push(`<ul data-type="taskList"><li data-type="taskItem" data-checked="${m[1] !== ' '}"><p>${inline(m[2])}</p></li></ul>`); }
    else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li><p>${inline(m[1])}</p></li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li><p>${inline(m[1])}</p></li>`); }
    else if ((m = line.match(/^>\s?(.*)$/))) { close(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); }
    else if (/^\s*(---|\*\*\*)\s*$/.test(line)) { close(); out.push('<hr>'); }
    else if (!line.trim()) { close(); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join('');
}

/** Split any remaining $$…$$ / $…$ inside text into real math nodes. */
function convertDollars(fragment: Fragment, schema: Schema): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    if (node.isTextblock && node.type.name === 'paragraph') {
      const text = node.textContent.trim();
      const whole = text.match(/^\$\$([\s\S]+)\$\$$/);
      if (whole && schema.nodes.mathBlock && node.childCount === 1) { nodes.push(schema.nodes.mathBlock.create({ latex: whole[1].trim() })); return; }
    }
    if (node.isText && node.text && /\$/.test(node.text) && schema.nodes.inlineMath) {
      const re = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
      let last = 0; let m;
      const t = node.text;
      while ((m = re.exec(t))) {
        if (m.index > last) nodes.push(schema.text(t.slice(last, m.index), node.marks));
        nodes.push(schema.nodes.inlineMath.create({ latex: (m[1] || m[2]).trim() }));
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
  name: 'lemmaSmartPaste',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('lemmaSmartPaste'),
        props: {
          transformPastedHTML: (html) => mathFromHTML(html),
          handlePaste: (_view, event) => {
            const html = event.clipboardData?.getData('text/html');
            const text = event.clipboardData?.getData('text/plain');
            if (html || !text) return false;
            const looksMarkdown = /(^|\n)(#{1,3}\s|[-*+]\s|\d+[.)]\s|>\s|\$\$)|\*\*.+\*\*|\$[^$\n]+\$/.test(text);
            if (!looksMarkdown) return false;
            editor.commands.insertContent(markdownToHTML(text));
            return true;
          },
          transformPasted: (slice) => new Slice(convertDollars(slice.content, editor.schema), slice.openStart, slice.openEnd),
        },
      }),
    ];
  },
});
