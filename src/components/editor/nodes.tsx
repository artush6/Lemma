// @ts-nocheck -- ported from the original Lemma codebase, which used looser type settings
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import 'katex/dist/katex.min.css';
import * as functionPlotModule from 'function-plot';
const functionPlot=((functionPlotModule as any).default?.default ?? (functionPlotModule as any).default ?? functionPlotModule) as any;
import { snippets, expand } from '@/lib/editor/snippets';
import { GraphView } from './graph';

type SourceRange = { start: number; end: number };
function groupEnd(source: string, start: number, open = '{', close = '}') {
 if (source[start] !== open) return -1;
 let depth = 0;
 for (let index = start; index < source.length; index++) {
  if (source[index] === open && source[index - 1] !== '\\') depth++;
  if (source[index] === close && source[index - 1] !== '\\' && --depth === 0) return index;
 }
 return -1;
}
function focusRange(source: string, selectionStart: number, selectionEnd: number): SourceRange | null {
 if (!source.length) return null;
 if (selectionStart !== selectionEnd) return { start: selectionStart, end: selectionEnd };
 const beforeCaret = source.slice(0, selectionStart).match(/\\[a-zA-Z]*$/)?.[0];
 let index = beforeCaret ? selectionStart - beforeCaret.length : Math.max(0, Math.min(selectionStart - 1, source.length - 1));
 if (/\s/.test(source[index]) && index > 0) index--;
 let start = index, end = index + 1;
 if (source[index] === '}') {
  for (let cursor = index; cursor >= 0; cursor--) if (source[cursor] === '{' && groupEnd(source, cursor) === index) { start = cursor + 1; end = index; break; }
 } else if (source[index] === '{') {
  const close = groupEnd(source, index);
  if (close > index) { start = index + 1; end = close; }
 } else if (source[index] === '\\') {
  const command = source.slice(index).match(/^\\[a-zA-Z]+|^\\./)?.[0];
  if (command) {
   start = index; end = index + command.length;
   let next = end;
   while (/\s/.test(source[next] || '')) next++;
   if (/^\\(?:dfrac|tfrac|frac|binom|dbinom|tbinom)$/.test(command)) {
    const firstEnd = groupEnd(source, next);
    const secondStart = firstEnd < 0 ? -1 : firstEnd + 1 + (source.slice(firstEnd + 1).match(/^\s*/)?.[0].length || 0);
    const secondEnd = secondStart >= 0 ? groupEnd(source, secondStart) : -1;
    if (secondEnd >= 0) end = secondEnd + 1;
   } else if (/^\\(?:sqrt|text|mathrm|mathbf|mathit|mathbb|mathcal|mathsf|mathtt|operatorname|overline|underline|boxed|hat|bar|vec|dot|ddot)$/.test(command)) {
    if (command === '\\sqrt' && source[next] === '[') {
     const optionalEnd = groupEnd(source, next, '[', ']');
     if (optionalEnd >= 0) next = optionalEnd + 1;
    }
    const argumentEnd = groupEnd(source, next);
    if (argumentEnd >= 0) end = argumentEnd + 1;
   }
  }
 } else if (/[a-zA-Z0-9]/.test(source[index])) {
  while (start > 0 && /[a-zA-Z0-9]/.test(source[start - 1])) start--;
  while (end < source.length && /[a-zA-Z0-9]/.test(source[end])) end++;
 }
 return end > start ? { start, end } : null;
}
function renderLatex(source: string, displayMode: boolean, focus?: SourceRange | null) {
 try {
  const marked = focus && focus.start >= 0 && focus.end <= source.length && focus.end > focus.start
   ? `${source.slice(0, focus.start)}\\htmlClass{lemma-active-focus}{${source.slice(focus.start, focus.end)}}${source.slice(focus.end)}`
   : source;
  const options = { displayMode, throwOnError: true, trust: context => context.command === '\\htmlClass' && context.class === 'lemma-active-focus', strict: 'ignore' };
  try { return katex.renderToString(marked || '\\;', options); }
  catch { return katex.renderToString(source || '\\;', { ...options, throwOnError: false }); }
 } catch { return ''; }
}
const graphColors=['#3478d4','#d45555','#3a9b72','#955ec7','#db8d2e','#2797a4'];
const glyphToTex:Record<string,string>={'∑':'\\sum','∫':'\\int','∏':'\\prod','√':'\\sqrt','∞':'\\infty','→':'\\to','≤':'\\le','≥':'\\ge','≠':'\\neq','∈':'\\in','⋅':'\\cdot','×':'\\times','∂':'\\partial','∇':'\\nabla','π':'\\pi','θ':'\\theta','λ':'\\lambda','μ':'\\mu','σ':'\\sigma','α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\epsilon','ϵ':'\\epsilon','φ':'\\phi','ω':'\\omega','∀':'\\forall','∃':'\\exists','∪':'\\cup','∩':'\\cap','⊂':'\\subset','⊆':'\\subseteq','−':'-','lim':'\\lim','sin':'\\sin','cos':'\\cos','tan':'\\tan','ln':'\\ln','log':'\\log','exp':'\\exp'};
/** Map a click inside the KaTeX preview back to a caret position in the LaTeX source. */
function sourceIndexFromPreview(preview:HTMLElement,target:HTMLElement,source:string):number|null{
 const leaf=target.closest('.mord,.mop,.mrel,.mbin,.mpunct,.mopen,.mclose,.minner') as HTMLElement|null; if(!leaf)return null;
 const text=(leaf.textContent||'').trim(); if(!text)return null;
 const token=glyphToTex[text]??text;
 const leaves=[...preview.querySelectorAll('.mord,.mop,.mrel,.mbin,.mpunct,.mopen,.mclose')].filter(el=>(el.textContent||'').trim()===text&&!el.querySelector('.mord,.mop,.mrel,.mbin'));
 const nth=Math.max(0,leaves.indexOf(leaf));
 let from=0,found=-1; for(let i=0;i<=nth;i++){const at=source.indexOf(token,from);if(at<0)break;found=at;from=at+token.length}
 return found<0?null:found+token.length;
}
function EquationView({node,updateAttributes,editor}:NodeViewProps) {
 const [editing,setEditing]=useState(false); const [value,setValue]=useState(String(node.attrs.latex||'')); const [query,setQuery]=useState(''); const [suggestIndex,setSuggestIndex]=useState(0); const [fields,setFields]=useState<[number,number][]>([]); const [fieldIndex,setFieldIndex]=useState(0); const [selection,setSelection]=useState<SourceRange>({start:0,end:0}); const input=useRef<HTMLTextAreaElement>(null); const matches=snippets.filter(s=>s.label.toLowerCase().startsWith(query.toLowerCase()));
 const beginEdit=()=>{const latex=String(node.attrs.latex||'');setValue(latex);setSelection(focusRange(latex,0,0)||{start:0,end:0});setEditing(true)};
 const block=node.type.name==='mathBlock'; const EditorShell='div'; const LabelRow='div'; const Preview='div';
 const commit=()=>{updateAttributes({latex:value});setEditing(false)};
 return <NodeViewWrapper as={block?'div':'span'} className={block?'equation-wrap':'inline-equation-wrap'}>
  <Popover.Root open={editing} onOpenChange={open=>{if(!open)setEditing(false)}}><Popover.Anchor asChild><span className={block?'equation-render':'inline-equation-render'} contentEditable={false} onMouseDown={e=>{e.preventDefault();e.stopPropagation()}} onClick={e=>{e.stopPropagation();if(editor.isEditable)beginEdit()}}>{node.attrs.latex?<span dangerouslySetInnerHTML={{__html:renderLatex(String(node.attrs.latex),block)}}/>:<span className="equation-placeholder">{block?'Click to write an equation…':'∑ add inline equation'}</span>}</span></Popover.Anchor>
  {editing&&<Popover.Portal container={document.querySelector('.lemma-app')}><Popover.Content side="bottom" align="start" sideOffset={8} collisionPadding={16} className={"equation-popup "+(block?'is-block':'is-inline')} aria-label="Edit equation" onOpenAutoFocus={e=>{e.preventDefault();input.current?.focus()}} onCloseAutoFocus={e=>e.preventDefault()} onInteractOutside={()=>setEditing(false)}><EditorShell className="equation-popup-editor" contentEditable={false}>
   <LabelRow className="equation-popup-label"><span>LaTeX</span><Button variant="ghost" size="icon" aria-label="Cancel equation editing" title="Cancel" onClick={()=>setEditing(false)}><X size={14}/></Button></LabelRow>
   <textarea aria-label="LaTeX expression" ref={input} autoFocus value={value} onSelect={e=>{const target=e.currentTarget;setSelection(focusRange(value,target.selectionStart,target.selectionEnd)||{start:0,end:0})}} onChange={e=>{const next=e.target.value;setValue(next);setSelection(focusRange(next,e.target.selectionStart,e.target.selectionEnd)||{start:0,end:0});const before=next.slice(0,e.target.selectionStart);const match=before.match(/\\([a-zA-Z]*)$/);setQuery(match&&match[1]?`\\${match[1]}`:'');setSuggestIndex(0)}} onKeyDown={e=>{if(query&&matches.length&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();const before=value.slice(0,e.currentTarget.selectionStart);const match=before.match(/\\([a-zA-Z]*)$/);const start=match?e.currentTarget.selectionStart-match[0].length:e.currentTarget.selectionStart;const expanded=expand(matches[suggestIndex].template,start);const after=value.slice(e.currentTarget.selectionEnd);const next=value.slice(0,start)+expanded.text+after;setValue(next);setQuery('');setFields(expanded.fields);setFieldIndex(0);requestAnimationFrame(()=>{input.current?.focus();if(expanded.fields.length)input.current?.setSelectionRange(...expanded.fields[0]);else input.current?.setSelectionRange(start+expanded.text.length,start+expanded.text.length)});return}if(query&&matches.length&&e.key==='ArrowDown'){e.preventDefault();setSuggestIndex(i=>Math.min(i+1,matches.length-1));return}if(query&&matches.length&&e.key==='ArrowUp'){e.preventDefault();setSuggestIndex(i=>Math.max(0,i-1));return}if(fields.length&&e.key==='Tab'){e.preventDefault();const next=(fieldIndex+1)%fields.length;setFieldIndex(next);input.current?.setSelectionRange(...fields[next]);return}if(e.key==='Escape'){e.preventDefault();setEditing(false);} if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();updateAttributes({latex:value});setEditing(false);}}} placeholder="Type a mathematical expression…" />
   {query&&matches.length>0&&<div className="latex-suggestions">{matches.slice(0,5).map((item,index)=><Button variant="ghost" type="button" key={item.label} className={index===suggestIndex?'active':''} onMouseDown={e=>{e.preventDefault();const caret=input.current?.selectionStart||value.length;const before=value.slice(0,caret);const match=before.match(/\\([a-zA-Z]*)$/);const start=match?caret-match[0].length:caret;const expanded=expand(item.template,start);const next=value.slice(0,start)+expanded.text+value.slice(input.current?.selectionEnd||caret);setValue(next);setQuery('');setFields(expanded.fields);requestAnimationFrame(()=>{input.current?.focus();if(expanded.fields.length)input.current?.setSelectionRange(...expanded.fields[0])})}}><code>{item.label}</code><span>{item.template.replace(/[«»]/g,'')}</span></Button>)}</div>}
   <Preview className="equation-live-preview" title="Click a symbol to jump to it in the code" onMouseDown={e=>{const at=sourceIndexFromPreview(e.currentTarget as HTMLElement,e.target as HTMLElement,value);if(at==null)return;e.preventDefault();const el=input.current;if(!el)return;el.focus();el.setSelectionRange(at,at);setSelection(focusRange(value,at,at)||{start:0,end:0})}} dangerouslySetInnerHTML={{__html:renderLatex(value,block,selection)}} />
   <div className="equation-popup-actions"><Button size="sm" className="equation-popup-done" onClick={commit}>Done <Check size={14}/></Button></div>
  </EditorShell></Popover.Content></Popover.Portal>}</Popover.Root>
 </NodeViewWrapper>
}
export const MathBlock=Node.create({name:'mathBlock',group:'block',atom:true,isolating:true,draggable:true,addAttributes(){return {latex:{default:'',parseHTML:(el:HTMLElement)=>el.getAttribute('data-latex')??el.getAttribute('latex')??'',renderHTML:(attrs:Record<string,unknown>)=>({'data-latex':attrs.latex})}}},parseHTML(){return [{tag:'div[data-type="math-block"]'}]},renderHTML({node,HTMLAttributes}){return ['div',mergeAttributes(HTMLAttributes,{'data-type':'math-block'}),`$$${node.attrs.latex||''}$$`]},renderText({node}){return `$$${node.attrs.latex||''}$$`},addNodeView(){return ReactNodeViewRenderer(EquationView)}});
export const InlineMath=Node.create({name:'inlineMath',group:'inline',inline:true,atom:true,selectable:true,addAttributes(){return {latex:{default:'',parseHTML:(el:HTMLElement)=>el.getAttribute('data-latex')??el.getAttribute('latex')??'',renderHTML:(attrs:Record<string,unknown>)=>({'data-latex':attrs.latex})}}},parseHTML(){return [{tag:'span[data-type="inline-math"]'}]},renderHTML({node,HTMLAttributes}){return ['span',mergeAttributes(HTMLAttributes,{'data-type':'inline-math'}),`$${node.attrs.latex||''}$`]},renderText({node}){return `$${node.attrs.latex||''}$`},addNodeView(){return ReactNodeViewRenderer(EquationView)}});
export const PageBreak=Node.create({name:'pageBreak',group:'block',atom:true,selectable:true,addAttributes(){return {number:{default:2},spacer:{default:1171}}},parseHTML(){return [{tag:'div[data-type="page-break"]'}]},renderHTML({HTMLAttributes}){return ['div',mergeAttributes(HTMLAttributes,{'data-type':'page-break','data-page':HTMLAttributes.number,style:`height:${HTMLAttributes.spacer}px`})]}});
const jsonAttr=(name:string,fallback:unknown)=>({default:fallback,parseHTML:(el:HTMLElement)=>{const raw=el.getAttribute(`data-${name}`);if(raw==null)return fallback;try{return JSON.parse(raw)}catch{return raw}},renderHTML:(attrs:Record<string,unknown>)=>({[`data-${name}`]:JSON.stringify(attrs[name])})});
export const Graph=Node.create({name:'graph',group:'block',atom:true,draggable:true,addAttributes(){return {expressions:jsonAttr('expressions',['x^2']),hidden:jsonAttr('hidden',[]),points:jsonAttr('points',[]),xMin:jsonAttr('xMin',-10),xMax:jsonAttr('xMax',10),yMin:jsonAttr('yMin',''),yMax:jsonAttr('yMax',''),height:jsonAttr('height',340),grid:jsonAttr('grid',true),axes:jsonAttr('axes',true),legend:jsonAttr('legend',true),equal:jsonAttr('equal',false),values:jsonAttr('values',true)}},parseHTML(){return [{tag:'div[data-type="graph"]'}]},renderHTML({HTMLAttributes}){return ['div',mergeAttributes(HTMLAttributes,{'data-type':'graph'})]},addNodeView(){return ReactNodeViewRenderer(GraphView)}});
export const Callout=Node.create({name:'callout',group:'block',content:'block+',defining:true,parseHTML(){return [{tag:'aside[data-type="callout"]'}]},renderHTML({HTMLAttributes}){return ['aside',mergeAttributes(HTMLAttributes,{'data-type':'callout'}),0]}});
