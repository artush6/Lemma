import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { moveBlock } from "./BlockControls";
import { readAttachment, AttachmentBlock, validAttachment } from "./attachments";
import { loadDocument } from "./loadDocument";
import { decodeIcon } from "./iconCatalog";
describe("workspace blocks", () => {
  it("moves blocks in both directions without losing content and supports undo", () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: "<p>one</p><p>two</p><p>three</p>",
    });
    moveBlock(editor, 0, 10);
    expect(editor.getText()).toBe("two\n\none\n\nthree");
    editor.commands.undo();
    expect(editor.getText()).toBe("one\n\ntwo\n\nthree");
    moveBlock(editor, 10, 0);
    expect(editor.getText()).toBe("three\n\none\n\ntwo");
    editor.destroy();
  });
  it("keeps undo within edits to the loaded note", () => {
    const editor = new Editor({ extensions: [StarterKit] });
    const content = (text: string) => ({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });
    loadDocument(editor, content("First note"));
    expect(editor.can().undo()).toBe(false);
    editor.commands.insertContentAt(1, "Edited ");
    editor.commands.undo();
    expect(editor.getText()).toBe("First note");
    loadDocument(editor, content("Second note"));
    expect(editor.can().undo()).toBe(false);
    editor.commands.undo();
    expect(editor.getText()).toBe("Second note");
    editor.destroy();
  });
  it("accepts a PDF at 5 MB and rejects larger PDFs", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "exercise.pdf", {
      type: "application/pdf",
    });
    const block = await readAttachment(file);
    expect(block.type).toBe("attachment");
    expect(block.attrs?.["mime"]).toBe("application/pdf");
    await expect(
      readAttachment(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf")),
    ).rejects.toThrow("5 MB");
  });
  it("round trips attachments without executing file contents", async () => {
    const block = await readAttachment(new File(["<script>alert(1)</script>"], "notes.tex"));
    const editor = new Editor({
      extensions: [StarterKit, AttachmentBlock],
      content: { type: "doc", content: [block] },
    });
    expect(editor.getJSON().content?.[0]).toEqual(block);
    expect(validAttachment({ name: "bad", src: "javascript:alert(1)", mime: "text/plain" })).toBe(
      false,
    );
    editor.destroy();
  });
  it("rejects corrupt base64 and MIME mismatches before previewing", () => {
    expect(
      validAttachment({
        name: "bad.pdf",
        mime: "application/pdf",
        src: "data:text/plain;base64,eA==",
      }),
    ).toBe(false);
    expect(
      validAttachment({
        name: "bad.pdf",
        mime: "application/pdf",
        src: "data:application/pdf;base64,====",
      }),
    ).toBe(false);
  });
  it("only accepts palette colors in persisted SVG icons", () => {
    expect(decodeIcon("svg:Book:#2383e2").color).toBe("#2383e2");
    expect(decodeIcon("svg:Book:url(bad)").color).toBeUndefined();
  });
});
