'use client';
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import katex from 'katex';
import { snippets, expand, type Snippet } from '@/lib/editor/snippets';
const labels: Record<string, string> = { sum: 'Summation', prod: 'Product', frac: 'Fraction', sqrt: 'Square root', int: 'Integral', lim: 'Limit', vec: 'Vector', mathbb: 'Number set', mathbf: 'Bold symbol', overline: 'Overline', underline: 'Underline', left: 'Parentheses', 'begin{aligned}': 'Aligned equations', 'begin{cases}': 'Cases', 'begin{pmatrix}': 'Matrix', 'begin{bmatrix}': 'Bracket matrix' };
const category = (snippet: Snippet) => /sum|prod|int|lim/.test(snippet.label) ? 'Calculus' : /vec|mathbf|matrix/.test(snippet.label) ? 'Linear algebra' : /frac|sqrt|begin|left|right|overline|underline/.test(snippet.label) ? 'Structures' : 'Symbols';
export default function MathPalette({ onSelect, onClose }: {
    onSelect: (snippet: Snippet) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('All');
    const cards = useMemo(() => snippets.filter(snippet => snippet.label !== '\\right').map(snippet => ({ snippet, label: labels[snippet.label.slice(1)] || snippet.label.slice(1), category: category(snippet), html: katex.renderToString(expand(snippet.template, 0).text, { throwOnError: false, displayMode: true }) })), []);
    const results = cards.filter(card => (tab === 'All' || card.category === tab) && `${card.label} ${card.snippet.label}`.toLowerCase().includes(query.toLowerCase()));
    return <section className="math-palette" aria-label="Math snippets">
    <header><div><span className="palette-symbol">∑</span><h2>Math snippets</h2></div><button aria-label="Close math snippets" onClick={onClose}><X size={17}/></button></header>
    <label className="palette-search"><Search size={15}/><input autoFocus placeholder="Search symbols and structures…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && results[0])
        onSelect(results[0].snippet); }}/><kbd>↵</kbd></label>
    <div className="palette-tabs" aria-label="Snippet categories">{['All', 'Symbols', 'Structures', 'Calculus', 'Linear algebra'].map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</div>
    <div className="palette-grid">{results.map(card => <button key={card.snippet.label} title={card.snippet.label} onClick={() => onSelect(card.snippet)}><span className="palette-math" dangerouslySetInnerHTML={{ __html: card.html }}/><span>{card.label}</span></button>)}</div>
    {!results.length && <p className="palette-empty">No snippets match your search.</p>}
    <footer>Insert a structure, then use <kbd>Tab</kbd> to move between its fields.</footer>
  </section>;
}
