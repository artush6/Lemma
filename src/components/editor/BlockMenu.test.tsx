import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import BlockMenu from "./BlockMenu";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("dismisses on outside clicks without changing the document or its selection", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const editor = new Editor({ extensions: [StarterKit], content: "<p>/</p>" });
  editor.commands.setTextSelection(2);
  vi.spyOn(editor.view, "coordsAtPos").mockReturnValue({
    left: 100,
    right: 101,
    top: 100,
    bottom: 120,
  });
  const close = vi.fn();
  const { unmount } = render(
    <>
      <button>Outside</button>
      <BlockMenu editor={editor} onClose={close}>
        <input aria-label="Search blocks" />
      </BlockMenu>
    </>,
  );
  fireEvent.pointerDown(screen.getByRole("textbox"));
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(editor.getText()).toBe("/");
  expect(editor.state.selection.from).toBe(2);
  unmount();
  fireEvent.pointerDown(document.body);
  expect(close).toHaveBeenCalledTimes(1);
  editor.destroy();
});
