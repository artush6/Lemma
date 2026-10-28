import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CardImportDialog } from "./CardImportDialog";

afterEach(cleanup);
const decks = [
  { id: "one", name: "One", created: 0 },
  { id: "two", name: "Two", created: 0 },
];
it("previews pasted cards and only adds them after confirmation", () => {
  const onImport = vi.fn();
  render(
    <CardImportDialog decks={decks} initialDeckId="two" onImport={onImport} onClose={vi.fn()} />,
  );
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Paste text" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.keyDown(screen.getByRole("tab", { name: "Paste text" }), { key: "Enter" });
  fireEvent.change(screen.getByRole("textbox", { name: "Import cards" }), {
    target: { value: "Q: Question\nA: Answer" },
  });
  expect(screen.getByRole("region", { name: "Import preview" })).toBeInTheDocument();
  expect(onImport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add 1 card" }));
  expect(onImport).toHaveBeenCalledWith([{ front: "Question", back: "Answer" }], "two");
});
it("blocks invalid pairs and allows cancelling without importing", () => {
  const onImport = vi.fn(),
    onClose = vi.fn();
  render(
    <CardImportDialog decks={decks} initialDeckId="one" onImport={onImport} onClose={onClose} />,
  );
  fireEvent.keyDown(screen.getByRole("tab", { name: "Paste text" }), { key: "Enter" });
  fireEvent.change(screen.getByRole("textbox", { name: "Import cards" }), {
    target: { value: "Q: Missing an answer" },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("both");
  expect(screen.getByRole("button", { name: /Add.*cards/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
  expect(onImport).not.toHaveBeenCalled();
});
