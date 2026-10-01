import type { JSONContent } from '@tiptap/react';
import { supabase } from './supabase/client';
export type Note = { id: string; title: string; content: JSONContent; is_favorite: boolean; folder_id: string | null; icon: string; document_label: string; page_layout: 'infinite' | 'vertical' | 'horizontal' | 'spread'; created_at: string; updated_at: string };
export type Folder = { id: string; name: string; icon: string; parent_id: string | null; created_at: string };
export type Version = { id: string; note_id: string; title: string; content: JSONContent; created_at: string };
export const emptyContent = { type: 'doc', content: [{ type: 'paragraph' }] };
export function newNote(folder_id: string | null = null): Note { const now = new Date().toISOString(); return { id: crypto.randomUUID(), title: 'Untitled', content: emptyContent, is_favorite: false, folder_id, icon: '📄', document_label: 'LECTURE NOTES', page_layout: 'infinite', created_at: now, updated_at: now }; }
export const repository = {
 async list(): Promise<Note[]> { if (!supabase) throw Error('Cloud is not configured'); const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false }); if (error) throw error; return data; },
 async listFolders(): Promise<Folder[]> { if (!supabase) throw Error('Cloud is not configured'); const { data, error } = await supabase.from('folders').select('*').order('created_at'); if (error) throw error; return data; },
 async saveFolder(folder: Folder) { if (!supabase) throw Error('Cloud is not configured'); const { error } = await supabase.from('folders').upsert(folder); if (error) throw error; },
 async removeFolder(id: string) { if (!supabase) throw Error('Cloud is not configured'); const { error } = await supabase.from('folders').delete().eq('id', id); if (error) throw error; },
 async save(note: Note) { if (!supabase) throw Error('Cloud is not configured'); const { error } = await supabase.from('notes').upsert(note); if (error) throw error; },
 async remove(id: string) { if (!supabase) throw Error('Cloud is not configured'); const { error } = await supabase.from('notes').delete().eq('id', id); if (error) throw error; },
 async history(id: string): Promise<Version[]> { if (!supabase) throw Error('Cloud is not configured'); const { data, error } = await supabase.from('note_versions').select('*').eq('note_id', id).order('created_at', { ascending: false }); if (error) throw error; return data; },
 async snapshot(note: Note) { if (!supabase) throw Error('Cloud is not configured'); const { error } = await supabase.from('note_versions').insert({ note_id: note.id, title: note.title, content: note.content }); if (error) throw error; },
};
export function initialTitle(content: JSONContent): string { const text = (n: JSONContent): string => n.text || (n.content || []).map(text).join(' '); return text(content).trim().slice(0, 70) || 'Untitled'; }
