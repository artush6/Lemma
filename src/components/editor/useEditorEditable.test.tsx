import { act, renderHook } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { expect, it } from "vitest";
import { useEditorEditable } from "./useEditorEditable";
it("updates node-view editability without changing document contents", () => {
  const editor = new Editor({ extensions: [StarterKit], content: "<p>Keep my note</p>" });
  const content = editor.getJSON();
  const { result, unmount } = renderHook(() => useEditorEditable(editor));
  expect(result.current).toBe(true);
  act(() => editor.setEditable(false));
  expect(result.current).toBe(false);
  expect(editor.getJSON()).toEqual(content);
  act(() => editor.setEditable(true));
  expect(result.current).toBe(true);
  unmount();
  editor.destroy();
});
