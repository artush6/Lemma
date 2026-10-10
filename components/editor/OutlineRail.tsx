'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ListTree, X } from 'lucide-react';
export type OutlineItem = {
    title: string;
    level: number;
    position: number;
};
export default function OutlineRail({ items, pageKey }: {
    items: OutlineItem[];
    pageKey: string;
}) {
    const [active, setActive] = useState(0);
    const [pinned, setPinned] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const open = !dismissed && (pinned || hovered || focused);
    const root = useRef<HTMLElement>(null);
    const structure = items.map(item => `${item.level}:${item.title}`).join('|');
    useEffect(() => {
        const scroll = document.querySelector('.doc-scroll');
        if (!scroll)
            return;
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const headings = [...scroll.querySelectorAll<HTMLElement>('.lemma-prose h1, .lemma-prose h2, .lemma-prose h3')];
                const top = scroll.getBoundingClientRect().top + 90;
                let current = 0;
                headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= top)
                    current = index; });
                if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 8 && headings.length)
                    current = headings.length - 1;
                setActive(current);
            });
        };
        scroll.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(scroll);
        const prose = scroll.querySelector('.lemma-prose');
        if (prose)
            observer.observe(prose);
        update();
        return () => { scroll.removeEventListener('scroll', update); observer.disconnect(); cancelAnimationFrame(frame); };
    }, [pageKey, structure]);
    const navigate = (index: number) => {
        const scroll = document.querySelector('.doc-scroll');
        const heading = scroll?.querySelectorAll<HTMLElement>('.lemma-prose h1, .lemma-prose h2, .lemma-prose h3')[index];
        if (!scroll || !heading)
            return;
        scroll.scrollTo({ top: scroll.scrollTop + heading.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 64, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    return <aside ref={root} style={{'--outline-count':Math.max(1,items.length)} as CSSProperties} className={`outline-rail ${open ? 'is-open' : ''}`} aria-label="Document outline" onMouseEnter={() => { setHovered(true); setDismissed(false); }} onMouseLeave={() => { setHovered(false); setDismissed(false); }} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) {
        setFocused(false);
        setDismissed(false);
    } }} onKeyDown={event => { if (event.key === 'Escape') {
        setPinned(false);
        setDismissed(true);
        root.current?.querySelector<HTMLButtonElement>('.outline-toggle')?.focus();
    } }}>
    <button className="outline-toggle" aria-label="Expand document outline" aria-expanded={open} onClick={() => { setDismissed(false); setPinned(value => !value); }}><ListTree size={16}/></button>
    <div className="outline-strokes" aria-hidden="true">{items.map((item, index) => <span key={index} className={`level-${item.level} ${active === index ? 'active' : ''}`}/>)}</div>
    <nav className="outline-panel" aria-label="On this page">
      <div className="outline-head"><span>On this page</span><button aria-label="Close document outline" onClick={() => { setPinned(false); setDismissed(true); root.current?.querySelector<HTMLButtonElement>('.outline-toggle')?.focus(); }}><X size={14}/></button></div>
      {items.map((item, index) => <button key={`${item.title}-${index}`} aria-current={active === index ? 'location' : undefined} className={`outline-item level-${item.level} ${active === index ? 'active' : ''}`} onClick={() => navigate(index)}>{item.title || 'Untitled section'}</button>)}
      {!items.length && <p className="outline-empty">Add headings to navigate your note.</p>}
    </nav>
  </aside>;
}
