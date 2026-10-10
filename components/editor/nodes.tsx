'use client';
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import MathPalette from './MathPalette';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import GraphView from './GraphView';
import { mappedLatex } from '@/lib/editor/latex-map';
import { snippets, expand } from '@/lib/editor/snippets';
type SourceRange = {
    start: number;
    end: number;
};
function groupEnd(source: string, start: number, open = '{', close = '}') {
    if (source[start] !== open)
        return -1;
    let depth = 0;
    for (let index = start; index < source.length; index++) {
        if (source[index] === open && source[index - 1] !== '\\')
            depth++;
        if (source[index] === close && source[index - 1] !== '\\' && --depth === 0)
            return index;
    }
    return -1;
}
function focusRange(source: string, selectionStart: number, selectionEnd: number): SourceRange | null {
    if (!source.length)
        return null;
    if (selectionStart !== selectionEnd)
        return { start: selectionStart, end: selectionEnd };
    const beforeCaret = source.slice(0, selectionStart).match(/\\[a-zA-Z]*$/)?.[0];
    let index = beforeCaret ? selectionStart - beforeCaret.length : Math.max(0, Math.min(selectionStart - 1, source.length - 1));
    if (/\s/.test(source[index]) && index > 0)
        index--;
    let start = index, end = index + 1;
    if (source[index] === '}') {
        for (let cursor = index; cursor >= 0; cursor--)
            if (source[cursor] === '{' && groupEnd(source, cursor) === index) {
                start = cursor + 1;
                end = index;
                break;
            }
    }
    else if (source[index] === '{') {
        const close = groupEnd(source, index);
        if (close > index) {
            start = index + 1;
            end = close;
        }
    }
    else if (source[index] === '\\') {
        const command = source.slice(index).match(/^\\[a-zA-Z]+|^\\./)?.[0];
        if (command) {
            start = index;
            end = index + command.length;
            let next = end;
            while (/\s/.test(source[next] || ''))
                next++;
            if (/^\\(?:dfrac|tfrac|frac|binom|dbinom|tbinom)$/.test(command)) {
                const firstEnd = groupEnd(source, next);
                const secondStart = firstEnd < 0 ? -1 : firstEnd + 1 + (source.slice(firstEnd + 1).match(/^\s*/)?.[0].length || 0);
                const secondEnd = secondStart >= 0 ? groupEnd(source, secondStart) : -1;
                if (secondEnd >= 0)
                    end = secondEnd + 1;
            }
            else if (/^\\(?:sqrt|text|mathrm|mathbf|mathit|mathbb|mathcal|mathsf|mathtt|operatorname|overline|underline|boxed|hat|bar|vec|dot|ddot)$/.test(command)) {
                if (command === '\\sqrt' && source[next] === '[') {
                    const optionalEnd = groupEnd(source, next, '[', ']');
                    if (optionalEnd >= 0)
                        next = optionalEnd + 1;
                }
                const argumentEnd = groupEnd(source, next);
                if (argumentEnd >= 0)
                    end = argumentEnd + 1;
            }
        }
    }
    else if (/[a-zA-Z0-9]/.test(source[index])) {
        while (start > 0 && /[a-zA-Z0-9]/.test(source[start - 1]))
            start--;
        while (end < source.length && /[a-zA-Z0-9]/.test(source[end]))
            end++;
    }
    return end > start ? { start, end } : null;
}
function renderLatex(source: string, displayMode: boolean, focus?: SourceRange | null) {
    try {
        const marked = focus && focus.start >= 0 && focus.end <= source.length && focus.end > focus.start
            ? `${source.slice(0, focus.start)}\\htmlClass{lemma-active-focus}{${source.slice(focus.start, focus.end)}}${source.slice(focus.end)}`
            : source;
        return katex.renderToString(marked || '\\;', { displayMode, throwOnError: false, trust: context => context.command === '\\htmlClass' && context.class === 'lemma-active-focus', strict: 'ignore' });
    }
    catch {
        return '';
    }
}
function EquationView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
    const [editing, setEditing] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [value, setValue] = useState(String(node.attrs.latex || ''));
    const [query, setQuery] = useState('');
    const [suggestIndex, setSuggestIndex] = useState(0);
    const [fields, setFields] = useState<[
        number,
        number
    ][]>([]);
    const [fieldIndex, setFieldIndex] = useState(0);
    const [selection, setSelection] = useState<SourceRange>({ start: 0, end: 0 });
    const input = useRef<HTMLTextAreaElement>(null);
    const matches = snippets.filter(s => s.label.toLowerCase().startsWith(query.toLowerCase()));
    const beginEdit = () => { if (!editor.isEditable)
        return; const latex = String(node.attrs.latex || ''); setValue(latex); setSelection(focusRange(latex, 0, 0) || { start: 0, end: 0 }); setEditing(true); };
    useEffect(() => { const insert = (event: Event) => { const detail = (event as CustomEvent<{
        position: number;
        template: string;
    }>).detail; if (!editor.isEditable || getPos() !== detail.position)
        return; const expanded = expand(detail.template, 0); setValue(expanded.text); setFields(expanded.fields); setFieldIndex(0); setEditing(true); requestAnimationFrame(() => { input.current?.focus(); if (expanded.fields.length)
        input.current?.setSelectionRange(...expanded.fields[0]); }); }; window.addEventListener('lemma:edit-snippet', insert); return () => window.removeEventListener('lemma:edit-snippet', insert); }, [editor, getPos]);
    useEffect(() => { const stop = () => { if (!editor.isEditable) {
        setEditing(false);
        setPaletteOpen(false);
    } }; editor.on('update', stop); editor.on('transaction', stop); return () => { editor.off('update', stop); editor.off('transaction', stop); }; }, [editor]);
    const block = node.type.name === 'mathBlock';
    const EditorShell = block ? 'div' : 'span';
    const LabelRow = block ? 'div' : 'span';
    const Preview = block ? 'div' : 'span';
    return <NodeViewWrapper as={block ? 'div' : 'span'} className={block ? 'equation-wrap' : 'inline-equation-wrap'}>
  {editing ? <EditorShell className={block ? 'equation-editor' : 'inline-equation-editor'} contentEditable={false}>
   <LabelRow className="equation-editor-label"><span>LATEX</span><span>LIVE PREVIEW</span></LabelRow>
   <textarea aria-label="LaTeX source" ref={input} autoFocus value={value} onSelect={e => { const target = e.currentTarget; setSelection(focusRange(value, target.selectionStart, target.selectionEnd) || { start: 0, end: 0 }); }} onChange={e => { const next = e.target.value; setValue(next); setSelection(focusRange(next, e.target.selectionStart, e.target.selectionEnd) || { start: 0, end: 0 }); const before = next.slice(0, e.target.selectionStart); const match = before.match(/\\([a-zA-Z]*)$/); setQuery(match && match[1] ? `\\${match[1]}` : ''); setSuggestIndex(0); }} onKeyDown={e => { if (query && matches.length && (e.key === 'Enter' || e.key === 'Tab')) {
            e.preventDefault();
            const before = value.slice(0, e.currentTarget.selectionStart);
            const match = before.match(/\\([a-zA-Z]*)$/);
            const start = match ? e.currentTarget.selectionStart - match[0].length : e.currentTarget.selectionStart;
            const expanded = expand(matches[suggestIndex].template, start);
            const after = value.slice(e.currentTarget.selectionEnd);
            const next = value.slice(0, start) + expanded.text + after;
            setValue(next);
            setQuery('');
            setFields(expanded.fields);
            setFieldIndex(0);
            requestAnimationFrame(() => { input.current?.focus(); if (expanded.fields.length)
                input.current?.setSelectionRange(...expanded.fields[0]);
            else
                input.current?.setSelectionRange(start + expanded.text.length, start + expanded.text.length); });
            return;
        } if (query && matches.length && e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestIndex(i => Math.min(i + 1, matches.length - 1));
            return;
        } if (query && matches.length && e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestIndex(i => Math.max(0, i - 1));
            return;
        } if (fields.length && e.key === 'Tab') {
            e.preventDefault();
            const next = (fieldIndex + 1) % fields.length;
            setFieldIndex(next);
            input.current?.setSelectionRange(...fields[next]);
            return;
        } if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
        } if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            updateAttributes({ latex: value });
            setEditing(false);
        } }} placeholder="Type a mathematical expression…"/>
   {query && matches.length > 0 && <div className="latex-suggestions">{matches.slice(0, 5).map((item, index) => <button type="button" key={item.label} className={index === suggestIndex ? 'active' : ''} onMouseDown={e => { e.preventDefault(); const caret = input.current?.selectionStart || value.length; const before = value.slice(0, caret); const match = before.match(/\\([a-zA-Z]*)$/); const start = match ? caret - match[0].length : caret; const expanded = expand(item.template, start); const next = value.slice(0, start) + expanded.text + value.slice(input.current?.selectionEnd || caret); setValue(next); setQuery(''); setFields(expanded.fields); requestAnimationFrame(() => { input.current?.focus(); if (expanded.fields.length)
            input.current?.setSelectionRange(...expanded.fields[0]); }); }}><code>{item.label}</code><span>{item.template.replace(/[«»]/g, '')}</span></button>)}</div>}
   <Preview className="equation-live-preview" onMouseDown={event => { const element = (event.target as Element).closest<HTMLElement>('[data-source-start]'); if (!element) return; event.preventDefault(); const start = Number(element.dataset.sourceStart), end = Number(element.dataset.sourceEnd); setSelection({ start, end }); input.current?.focus(); input.current?.setSelectionRange(start, end); }} dangerouslySetInnerHTML={{ __html: mappedLatex(value, block, selection) }}/>

   <button className="equation-snippets" onClick={() => setPaletteOpen(true)}>∑ Math snippets</button>
   {paletteOpen && <span className="equation-palette"><MathPalette onClose={() => setPaletteOpen(false)} onSelect={snippet => { const start = input.current?.selectionStart || 0; const end = input.current?.selectionEnd || start; const expanded = expand(snippet.template, start); setValue(value.slice(0, start) + expanded.text + value.slice(end)); setFields(expanded.fields); setFieldIndex(0); setPaletteOpen(false); requestAnimationFrame(() => { input.current?.focus(); if (expanded.fields.length)
            input.current?.setSelectionRange(...expanded.fields[0]); }); }}/></span>}
   <button className="equation-done" onClick={() => { updateAttributes({ latex: value }); setEditing(false); }}>Done <kbd>⌘ ↵</kbd></button>
  </EditorShell> : <span className={block ? 'equation-render' : 'inline-equation-render'} role="button" tabIndex={editor.isEditable ? 0 : undefined} aria-label="Edit equation" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            beginEdit();
        } }} onClick={beginEdit}>{node.attrs.latex ? <span dangerouslySetInnerHTML={{ __html: renderLatex(String(node.attrs.latex), block) }}/> : <span className="equation-placeholder">{block ? 'Click to write an equation…' : '∑ add inline equation'}</span>}</span>}
 </NodeViewWrapper>;
}
export const MathBlock = Node.create({ name: 'mathBlock', group: 'block', atom: true, isolating: true, addAttributes() { return { latex: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('data-latex') || element.getAttribute('latex') || '', rendered: false } }; }, parseHTML() { return [{ tag: 'div[data-type="math-block"]' }]; }, renderHTML({ node, HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block', 'data-latex': node.attrs.latex }), `$$${node.attrs.latex}$$`]; }, addNodeView() { return ReactNodeViewRenderer(EquationView); } });
export const InlineMath = Node.create({ name: 'inlineMath', group: 'inline', inline: true, atom: true, selectable: true, addAttributes() { return { latex: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('data-latex') || element.getAttribute('latex') || '', rendered: false } }; }, parseHTML() { return [{ tag: 'span[data-type="inline-math"]' }]; }, renderHTML({ node, HTMLAttributes }) { return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-math', 'data-latex': node.attrs.latex }), `$${node.attrs.latex}$`]; }, addNodeView() { return ReactNodeViewRenderer(EquationView); } });
export const PageBreak = Node.create({ name: 'pageBreak', group: 'block', atom: true, selectable: true, addAttributes() { return { number: { default: 2 }, spacer: { default: 1171 } }; }, parseHTML() { return [{ tag: 'div[data-type="page-break"]' }]; }, renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break', 'data-page': HTMLAttributes.number, style: `height:${HTMLAttributes.spacer}px` })]; } });
const graphDefaults = { expressions: ['x^2'], modes: [], hidden: [], points: [], xMin: -10, xMax: 10, yMin: -5, yMax: 5, height: 340, showGrid: true, showAxes: true, showLegend: true, showPointValues: true, equalScaling: false };
export const Graph = Node.create({ name: 'graph', group: 'block', atom: true, addAttributes() { return Object.fromEntries(Object.entries(graphDefaults).map(([key, value]) => [key, { default: value, parseHTML: (element: HTMLElement) => { try { return JSON.parse(element.getAttribute('data-graph') || '{}')[key] ?? value; } catch { return value; } }, rendered: false }])); }, parseHTML() { return [{ tag: 'div[data-type="graph"]' }]; }, renderHTML({ node }) { return ['div', { 'data-type': 'graph', 'data-graph': JSON.stringify(node.attrs) }, `Graph: ${(node.attrs.expressions || []).join('; ')}`]; }, addNodeView() { return ReactNodeViewRenderer(GraphView); } });
export const Callout = Node.create({ name: 'callout', group: 'block', content: 'block+', defining: true, parseHTML() { return [{ tag: 'aside[data-type="callout"]' }]; }, renderHTML({ HTMLAttributes }) { return ['aside', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]; } });
