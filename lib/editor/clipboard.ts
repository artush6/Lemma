import type { JSONContent } from '@tiptap/core';

export function inlineContent(text: string): JSONContent[] {
    const parts: JSONContent[] = [];
    const pattern = /\$([^$\n]+)\$|\\\((.*?)\\\)|\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+)\*/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        if (match.index! > cursor) parts.push({ type: 'text', text: text.slice(cursor, match.index) });
        if (match[1] || match[2]) parts.push({ type: 'inlineMath', attrs: { latex: match[1] || match[2] } });
        else parts.push({ type: 'text', text: match[3] || match[4] || match[5] || match[6], marks: [{ type: match[5] ? 'code' : match[6] ? 'italic' : 'bold' }] });
        cursor = match.index! + match[0].length;
    }
    if (cursor < text.length) parts.push({ type: 'text', text: text.slice(cursor) });
    return parts;
}
export function markdownContent(text: string): JSONContent[] {
    const blocks: JSONContent[] = [];
    const segments = text.replace(/\r\n/g, '\n').split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|```[\s\S]*?```)/g);
    for (const segment of segments) {
        if (/^(\$\$|\\\[)/.test(segment)) { blocks.push({ type: 'mathBlock', attrs: { latex: segment.slice(2, -2).trim() } }); continue; }
        if (segment.startsWith('```')) {
            const body = segment.slice(3, -3); const newline = body.indexOf('\n');
            if (body.startsWith('lemma-graph\n')) { try { blocks.push({ type: 'graph', attrs: JSON.parse(body.slice(newline + 1)) }); } catch { blocks.push({ type: 'paragraph', content: [{ type: 'text', text: body }] }); } }
            else blocks.push({ type: 'codeBlock', attrs: { language: newline >= 0 ? body.slice(0, newline) : null }, content: [{ type: 'text', text: newline >= 0 ? body.slice(newline + 1).trimEnd() : body }] });
            continue;
        }
        for (const line of segment.split('\n')) {
            if (!line.trim()) continue;
            const heading = line.match(/^(#{1,3})\s+(.*)/), list = line.match(/^\s*([-*+] |\d+\. )(.*)/), quote = line.match(/^>\s?(.*)/);
            if (heading) blocks.push({ type: 'heading', attrs: { level: heading[1].length }, content: inlineContent(heading[2]) });
            else if (list) {
                const type = /^\d/.test(list[1]) ? 'orderedList' : 'bulletList';
                const item = { type: 'listItem', content: [{ type: 'paragraph', content: inlineContent(list[2]) }] };
                if (blocks.at(-1)?.type === type) blocks.at(-1)!.content!.push(item); else blocks.push({ type, content: [item] });
            } else if (quote) blocks.push({ type: 'blockquote', content: [{ type: 'paragraph', content: inlineContent(quote[1]) }] });
            else blocks.push({ type: 'paragraph', content: inlineContent(line) });
        }
    }
    return blocks.length ? blocks : [{ type: 'paragraph' }];
}
export function normalizePastedHTML(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,meta,link,iframe,object').forEach(node => node.remove());
    // Notion/KaTeX/MathJax expose the original TeX in an annotation or data attribute.
    doc.querySelectorAll('annotation[encoding="application/x-tex"], [data-equation]').forEach(node => {
        const root = node.closest('.katex-display, .katex, mjx-container, [data-equation]') || node;
        const block = root.classList.contains('katex-display') || root.getAttribute('display') === 'true' || root.tagName === 'DIV';
        const replacement = doc.createElement(block ? 'div' : 'span');
        replacement.dataset.type = block ? 'math-block' : 'inline-math'; replacement.dataset.latex = node.getAttribute('data-equation') || node.textContent || ''; root.replaceWith(replacement);
    });
    // Convert delimited math even when it arrives in otherwise rich HTML.
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT); const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    for (const node of texts) {
        if (node.parentElement?.closest('code,pre,[data-type="math-block"],[data-type="inline-math"],[data-type="graph"]')) continue;
        const pattern = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^$\n]+)\$|\\\((.*?)\\\)/g;
        const value = node.textContent || ''; const fragment = doc.createDocumentFragment(); let cursor = 0;
        for (const match of value.matchAll(pattern)) {
            fragment.append(doc.createTextNode(value.slice(cursor, match.index)));
            const block = match[1] !== undefined || match[2] !== undefined;
            const element = doc.createElement(block ? 'div' : 'span'); element.dataset.type = block ? 'math-block' : 'inline-math'; element.dataset.latex = (match[1] ?? match[2] ?? match[3] ?? match[4]).trim(); fragment.append(element); cursor = match.index! + match[0].length;
        }
        if (cursor) { fragment.append(doc.createTextNode(value.slice(cursor))); node.replaceWith(fragment); }
    }
    doc.querySelectorAll('table').forEach(table => {
        const fragment = doc.createDocumentFragment(); table.querySelectorAll('tr').forEach(row => { const paragraph = doc.createElement('p'); paragraph.textContent = [...row.querySelectorAll('th,td')].map(cell => cell.textContent?.trim()).join(' · '); fragment.append(paragraph); }); table.replaceWith(fragment);
    });
    doc.querySelectorAll('*').forEach(element => { for (const attr of [...element.attributes]) {
        if (/^on/i.test(attr.name) || ['style', 'class', 'id'].includes(attr.name)) element.removeAttribute(attr.name);
        if ((attr.name === 'href' || attr.name === 'src') && /^\s*(javascript|data:text\/html):/i.test(attr.value)) element.removeAttribute(attr.name);
    } });
    return doc.body.innerHTML;
}
export function clipboardText(node: JSONContent): string {
    if (node.type === 'mathBlock') return `\n$$${node.attrs?.latex || ''}$$\n`;
    if (node.type === 'inlineMath') return `$${node.attrs?.latex || ''}$`;
    if (node.type === 'graph') return `\n\`\`\`lemma-graph\n${JSON.stringify(node.attrs)}\n\`\`\`\n`;
    if (node.type === 'pageBreak') return '\n';
    if (node.text) return node.text;
    return (node.content || []).map(clipboardText).join(['doc', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(node.type || '') ? '\n' : '') + (['paragraph', 'heading'].includes(node.type || '') ? '\n' : '');
}
