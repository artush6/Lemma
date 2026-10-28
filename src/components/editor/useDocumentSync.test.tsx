import { act, renderHook } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { expect, it } from "vitest";
import { useDocumentSync } from "./useDocumentSync";

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});
it("loads before input, preserves typing selection/undo on echoes, and isolates notes", () => {
  const editor = new Editor({ extensions: [StarterKit] });
  const lastContent = { current: "" };
  const { rerender, unmount } = renderHook(
    ({ id, content }) => useDocumentSync(editor, id, content, lastContent),
    { initialProps: { id: "one", content: doc("original") } },
  );
  // No animation frame is needed before the first input can safely arrive.
  expect(editor.getText()).toBe("original");
  act(() => {
    editor.commands.setTextSelection(5);
    editor.commands.insertContent("XYZ");
    lastContent.current = JSON.stringify(editor.getJSON());
  });
  const selection = editor.state.selection.from;
  rerender({ id: "one", content: editor.getJSON() as ReturnType<typeof doc> });
  expect(editor.getText()).toBe("origXYZinal");
  expect(editor.state.selection.from).toBe(selection);
  expect(editor.can().undo()).toBe(true);
  rerender({ id: "two", content: doc("second") });
  expect(editor.getText()).toBe("second");
  expect(editor.can().undo()).toBe(false);
  unmount();
  editor.destroy();
});
