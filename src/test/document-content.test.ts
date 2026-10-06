import { describe, expect, it } from 'vitest';
import { documentContent } from '@/components/editor/document';
import type { Note } from '@/lib/notes';

describe('continuous note canvas', () => {
  it('preserves all legacy pages in order with physical sheet breaks', () => {
    const pages = ['First', 'Second', 'Third'].map((text, position) => ({ id: String(position), title: `Page ${position + 1}`, position, updated_at: '', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } }));
    const note = { id: 'temporary', pages, content: pages[0]?.content, updated_at: '' } as Note;
    const original = JSON.stringify(note);
    const content = documentContent(note);
    expect(content.content?.map(n => n.type)).toEqual(['paragraph', 'pageBreak', 'paragraph', 'pageBreak', 'paragraph']);
    expect(content.content?.filter(n => n.type === 'paragraph').map(n => n.content?.[0]?.text)).toEqual(['First', 'Second', 'Third']);
    expect(JSON.stringify(note)).toBe(original);
  });
  it('keeps a blank note as a single sheet without inserted breaks', () => {
    const note = { id: 'temporary', content: { type: 'doc', content: [{ type: 'paragraph' }] }, updated_at: '' } as Note;
    expect(documentContent(note).content).toEqual([{ type: 'paragraph' }]);
  });
});