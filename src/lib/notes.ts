// @ts-nocheck -- ported from the original Lemma codebase, which used looser type settings
import type { JSONContent } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";
export type Note = {
  id: string;
  title: string;
  content: JSONContent;
  pages?: NotePage[];
  share_token?: string | null;
  is_favorite: boolean;
  folder_id: string | null;
  document_label: string;
  page_layout: "infinite" | "vertical" | "horizontal" | "spread";
  created_at: string;
  updated_at: string;
};
export type NotePage = {
  id: string;
  title: string;
  content: JSONContent;
  position: number;
  updated_at: string;
};
export type Folder = { id: string; name: string; parent_id: string | null; created_at: string };
export type Version = {
  id: string;
  note_id: string;
  title: string;
  content: JSONContent;
  pages?: NotePage[];
  created_at: string;
};
export const emptyContent = { type: "doc", content: [{ type: "paragraph" }] };
export function newPage(position = 0, title = `Page ${position + 1}`): NotePage {
  return {
    id: crypto.randomUUID(),
    title,
    content: structuredClone(emptyContent),
    position,
    updated_at: new Date().toISOString(),
  };
}
export function pagesFor(note: Note): NotePage[] {
  const stored = (note as Note & { pages?: NotePage[] }).pages;
  const basePages =
    Array.isArray(stored) && stored.length
      ? stored
      : [
          {
            id: `${note.id}-page-1`,
            title: "Page 1",
            content: note.content || structuredClone(emptyContent),
            position: 0,
            updated_at: note.updated_at,
          },
        ];
  if (basePages.length !== 1) return [...basePages].sort((a, b) => a.position - b.position);
  const blocks = basePages[0].content?.content || [];
  if (!blocks.some((block) => block.type === "pageBreak")) return basePages;
  const split: NotePage[] = [];
  let current = [] as NonNullable<JSONContent["content"]>;
  for (const block of blocks) {
    if (block.type === "pageBreak") {
      split.push({
        id: split.length === 0 ? basePages[0].id : `${note.id}-page-${split.length + 1}`,
        title: `Page ${split.length + 1}`,
        content: { type: "doc", content: current.length ? current : [{ type: "paragraph" }] },
        position: split.length,
        updated_at: note.updated_at,
      });
      current = [];
    } else current.push(block);
  }
  split.push({
    id: `${note.id}-page-${split.length + 1}`,
    title: `Page ${split.length + 1}`,
    content: { type: "doc", content: current.length ? current : [{ type: "paragraph" }] },
    position: split.length,
    updated_at: note.updated_at,
  });
  return split;
}
export function newNote(folder_id: string | null = null): Note {
  const now = new Date().toISOString();
  const firstPage = newPage();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: firstPage.content,
    pages: [firstPage],
    is_favorite: false,
    folder_id,
    document_label: "LECTURE NOTES",
    page_layout: "vertical",
    created_at: now,
    updated_at: now,
  };
}
export const repository = {
  async list(): Promise<Note[]> {
    if (!supabase) throw Error("Cloud is not configured");
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async listFolders(): Promise<Folder[]> {
    if (!supabase) throw Error("Cloud is not configured");
    const { data, error } = await supabase.from("folders").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
  async saveFolder(folder: Folder) {
    if (!supabase) throw Error("Cloud is not configured");
    const { error } = await supabase.from("folders").upsert(folder);
    if (error) throw error;
  },
  async removeFolder(id: string) {
    if (!supabase) throw Error("Cloud is not configured");
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) throw error;
  },
  async save(note: Note) {
    if (!supabase) throw Error("Cloud is not configured");
    const { error } = await supabase.from("notes").upsert(note);
    if (error) throw error;
  },
  async remove(id: string) {
    if (!supabase) throw Error("Cloud is not configured");
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
  },
  async history(id: string): Promise<Version[]> {
    if (!supabase) throw Error("Cloud is not configured");
    const { data, error } = await supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", id)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw error;
    return data;
  },
  async snapshot(note: Note) {
    if (!supabase) throw Error("Cloud is not configured");
    const { error } = await supabase.from("note_versions").insert({
      note_id: note.id,
      title: note.title,
      content: note.content,
      pages: note.pages || pagesFor(note),
    });
    if (error) throw error;
  },
};
export function initialTitle(content: JSONContent): string {
  const text = (n: JSONContent): string => n.text || (n.content || []).map(text).join(" ");
  return text(content).trim().slice(0, 70) || "Untitled";
}
