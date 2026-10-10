'use client';
import { useEffect, useRef, type ReactNode } from 'react';
/** Shared dismissal and focus handling for modal palettes and side panels. */
export default function Overlay({ children, onClose, className = 'search-scrim' }: {
    children: ReactNode;
    onClose: () => void;
    className?: string;
}) {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const surface = root.current;
        const frame = requestAnimationFrame(() => {
            const field = root.current?.querySelector<HTMLElement>('input, textarea, button');
            field?.focus();
        });
        return () => { cancelAnimationFrame(frame); if (previous?.isConnected && (document.activeElement === document.body || surface?.contains(document.activeElement)))
            previous.focus(); };
    }, []);
    return <div ref={root} className={className} onMouseDown={event => { if (event.target === event.currentTarget)
        onClose(); }} onKeyDown={event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
            if (event.key !== 'Tab')
                return;
            const fields = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
            const first = fields[0], last = fields[fields.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }}>{children}</div>;
}
