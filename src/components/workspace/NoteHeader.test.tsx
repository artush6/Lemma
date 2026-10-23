import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NoteHeader } from "./NoteHeader";
afterEach(cleanup);
it("selects an explicit reading mode from a menu", async () => {
  const onRead = vi.fn();
  render(
    <NoteHeader
      title="Algebra"
      folder="Math"
      read={false}
      saved="saved"
      onRead={onRead}
      onFocus={() => {}}
      onShare={() => {}}
      onRename={() => {}}
      onLibrary={() => {}}
      onSidebar={() => {}}
      onExport={() => {}}
      onHistory={() => {}}
      onSettings={() => {}}
      onFavorite={() => {}}
      shared={false}
      onRevoke={() => {}}
      exportDialog={null}
    />,
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "Document mode: Edit" }), { key: "Enter" });
  expect(onRead).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("menuitemradio", { name: "Read" }));
  expect(onRead).toHaveBeenCalledWith(true);
});
