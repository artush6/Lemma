import { fileBlocks, trackInsertion } from "./insertFiles";
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

describe("document insertion targets", () => {
  it("maps an asynchronous file target through intervening text edits", () => {
    const editor = new Editor({ extensions: [StarterKit], content: "<p>first</p><p>second</p>" });
    editor.commands.setTextSelection(9);
    const target = trackInsertion(editor);
    editor.commands.insertContentAt(1, "++");
    editor.commands.setTextSelection(1);
    target.restore();
    expect(editor.state.selection.from).toBe(11);
    target.dispose();
    editor.destroy();
  });
  it("allows explicit HTTPS PDF embeds and rejects active URL schemes", () => {
    expect(
      validAttachment({
        name: "Lecture",
        src: "https://example.com/lecture.pdf",
        mime: "application/pdf",
      }),
    ).toBe(true);
    expect(
      validAttachment({ name: "Bad", src: "javascript:alert(1)", mime: "application/pdf" }),
    ).toBe(false);
    expect(
      validAttachment({ name: "Bad", src: "https://example.com/file", mime: "text/plain" }),
    ).toBe(false);
  });
});

describe("dropped file batches", () => {
  it("keeps supported image and document blocks and reports unsupported images", async () => {
    const blocks = await fileBlocks([
      new File(["image bytes"], "diagram.png", { type: "image/png" }),
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    ]);
    expect(blocks.map((block) => block.type)).toEqual(["image", "attachment"]);
    await expect(
      fileBlocks([new File(["svg"], "diagram.svg", { type: "image/svg+xml" })]),
    ).rejects.toThrow("PNG, JPEG, GIF or WebP");
    await expect(
      fileBlocks([
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
      ]),
    ).rejects.toThrow("2 MB");
  });
});
