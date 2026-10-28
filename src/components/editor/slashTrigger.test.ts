import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { expect, it } from "vitest";
import { trackSlashTrigger } from "./slashTrigger";

it("keeps the slash on cancellation and consumes it before running a command", () => {
  const editor = new Editor({ extensions: [StarterKit], content: "<p>/</p>" });
  const cancelled = trackSlashTrigger(editor, 1);
  cancelled.dispose();
  expect(editor.getText()).toBe("/");
  const chosen = trackSlashTrigger(editor, 1);
  chosen.consume();
  editor.commands.setHeading({ level: 1 });
  expect(editor.state.doc.textContent).toBe("");
  expect(editor.isActive("heading", { level: 1 })).toBe(true);
  editor.destroy();
});
it("maps the trigger through edits and preserves neighbouring literal slashes", () => {
  const editor = new Editor({ extensions: [StarterKit], content: "<p>/</p>" });
  const trigger = trackSlashTrigger(editor, 1);
  editor.commands.insertContentAt(1, "literal/");
  trigger.consume();
  expect(editor.getText()).toBe("literal/");
  editor.destroy();
});
it("does not remove text that replaces a deleted trigger", () => {
  const editor = new Editor({ extensions: [StarterKit], content: "<p>/</p>" });
  const trigger = trackSlashTrigger(editor, 1);
  editor.commands.insertContentAt({ from: 1, to: 2 }, "/replacement");
  trigger.consume();
  expect(editor.getText()).toBe("/replacement");
  editor.destroy();
});
