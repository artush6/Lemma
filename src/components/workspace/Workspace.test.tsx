import { fireEvent, render, screen, waitFor, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialLayout, openResource } from "./model";
import { StudyWorkspace } from "./Workspace";
import { repository, type Note } from "@/lib/notes";
const mount = vi.hoisted(() => vi.fn());
vi.mock("../editor/Editor", () => ({
  default: ({
    workspace,
  }: {
    workspace: { noteId?: string; sidebarOpen: boolean; onSidebarChange: (open: boolean) => void };
  }) => {
    mount(workspace.noteId);
    return (
      <>
        {workspace.sidebarOpen && (
          <aside aria-label="Note sidebar">
            <button onClick={() => workspace.onSidebarChange(false)}>Collapse sidebar</button>
          </aside>
        )}
        <textarea aria-label={`Editor ${workspace.noteId || "library"}`} defaultValue="Original" />
      </>
    );
  },
}));
vi.mock("../spaces/CodeLab", () => ({ default: () => <p>Code lab content</p> }));
vi.mock("../spaces/Flashcards", () => ({ default: () => <p>Flashcard content</p> }));
vi.mock("@/lib/notes", () => ({
  repository: { list: vi.fn().mockResolvedValue([]), listFolders: vi.fn().mockResolvedValue([]) },
  newNote: vi.fn(),
}));
vi.mock("../editor/ReferencePane", () => ({ ReferencePane: () => <p>Read-only mirror</p> }));
beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});
afterEach(cleanup);
const note = { id: "note:a", kind: "note" as const, noteId: "a", title: "Algebra" };
const seed = () => {
  const state = openResource(openResource(initialLayout(), note), {
    id: "code",
    kind: "code",
    title: "Code Lab",
  });
  localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
};
describe("workspace views", () => {
  it("keeps the sidebar open on direct note links and toggles it across spaces", async () => {
    window.history.replaceState(null, "", "/?note=a");
    render(<StudyWorkspace owner="test" />);
    expect(screen.getByRole("complementary", { name: "Note sidebar" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByRole("complementary", { name: "Note sidebar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sidebar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sidebar" }));
    expect(screen.getByRole("complementary", { name: "Note sidebar" })).toBeVisible();
    for (const [space, content] of [
      ["Code Lab", "Code lab content"],
      ["Flashcards", "Flashcard content"],
    ] as const) {
      fireEvent.keyDown(
        within(screen.getByRole("tablist", { name: "Spaces" })).getByRole("tab", { name: space }),
        { key: "Enter" },
      );
      const tool = await screen.findByText(content);
      fireEvent.click(screen.getByRole("button", { name: "Sidebar" }));
      expect(tool.closest(".workspace-resource")).toHaveClass("sidebar-hidden");
      fireEvent.click(screen.getByRole("button", { name: "Sidebar" }));
      expect(tool.closest(".workspace-resource")).not.toHaveClass("sidebar-hidden");
    }
    fireEvent.keyDown(
      within(screen.getByRole("tablist", { name: "Spaces" })).getByRole("tab", { name: "Notes" }),
      { key: "Enter" },
    );
    expect(screen.getByRole("complementary", { name: "Note sidebar" })).toBeVisible();
  });
  it("allows the sidebar to reopen on a narrow note view", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    window.history.replaceState(null, "", "/?note=a");
    render(<StudyWorkspace owner="test" />);
    expect(screen.queryByRole("complementary", { name: "Note sidebar" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sidebar" }));
    expect(screen.getByRole("complementary", { name: "Note sidebar" })).toBeVisible();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });
  it("controls each split sidebar independently without discarding editor state", async () => {
    const state = openResource(
      openResource(initialLayout(), note),
      { id: "code", kind: "code", title: "Code Lab" },
      "right",
    );
    localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
    render(<StudyWorkspace owner="test" />);
    const editor = await screen.findByLabelText("Editor a");
    fireEvent.change(editor, { target: { value: "Keep this draft" } });
    const tool = await screen.findByText("Code lab content");
    fireEvent.click(screen.getByRole("button", { name: "left sidebar" }));
    expect(screen.queryByRole("complementary", { name: "Note sidebar" })).toBeNull();
    expect(tool.closest(".workspace-resource")).not.toHaveClass("sidebar-hidden");
    fireEvent.click(screen.getByRole("button", { name: "right sidebar" }));
    expect(tool.closest(".workspace-resource")).toHaveClass("sidebar-hidden");
    fireEvent.click(screen.getByRole("button", { name: "left sidebar" }));
    expect(screen.getByRole("complementary", { name: "Note sidebar" })).toBeVisible();
    expect(screen.getByLabelText("Editor a")).toBe(editor);
    expect(editor).toHaveValue("Keep this draft");
    expect(screen.getByRole("separator", { name: "Resize panes" })).toBeVisible();
  });
  it("offers navigation beside a PDF and opens notes on that same side", async () => {
    const listedNote: Note = {
      id: "a",
      title: "Algebra",
      content: { type: "doc" },
      is_favorite: false,
      folder_id: null,
      document_label: "Note",
      page_layout: "vertical",
      created_at: "2026-10-26",
      updated_at: "2026-10-26",
    };
    vi.mocked(repository.list).mockResolvedValueOnce([listedNote]);
    const state = openResource(
      openResource(initialLayout(), {
        id: "pdf",
        kind: "attachment",
        attachmentKey: "missing-fixture",
        title: "Example.pdf",
      }),
      { id: "code", kind: "code", title: "Code Lab" },
      "right",
    );
    localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
    render(<StudyWorkspace owner="test" />);
    const navigation = await screen.findByRole("complementary", { name: "Document library" });
    fireEvent.click(await within(navigation).findByRole("button", { name: "Algebra" }));
    expect(
      within(screen.getByRole("tablist", { name: "left pane tabs" })).getByRole("tab", {
        name: "Algebra",
        selected: true,
      }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("tablist", { name: "right pane tabs" })).getByRole("tab", {
        name: "Code Lab",
        selected: true,
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Close Example.pdf" })).toBeVisible();
  });
  it("preserves unsaved view state across switching, closing and reopening a tab", async () => {
    seed();
    render(<StudyWorkspace owner="test" />);
    const editor = await screen.findByLabelText("Editor a");
    fireEvent.change(editor, { target: { value: "Unsaved working text" } });
    fireEvent.click(screen.getByRole("tab", { name: "Algebra" }));
    expect(screen.getByLabelText("Editor a")).toBe(editor);
    fireEvent.click(screen.getByRole("button", { name: "Close Algebra" }));
    fireEvent.keyDown(window, { ctrlKey: true, altKey: true, code: "KeyT" });
    // Closing hides the mounted resource; it does not discard its local state or trigger deletion.
    expect(editor).toHaveValue("Unsaved working text");
    expect(editor.closest("[hidden]")).not.toBeNull();
  });
  it("moves by shortcut, resizes by keyboard and restores the split from storage", async () => {
    seed();
    const { unmount } = render(<StudyWorkspace owner="test" />);
    fireEvent.keyDown(window, { ctrlKey: true, altKey: true, code: "ArrowRight" });
    const divider = await screen.findByRole("separator", { name: "Resize panes" });
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(divider).toHaveAttribute("aria-valuenow", "45");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("lemma:test:workspace:v1")!).split).toBe(true),
    );
    unmount();
    render(<StudyWorkspace owner="test" />);
    expect(await screen.findByRole("separator", { name: "Resize panes" })).toHaveAttribute(
      "aria-valuenow",
      "45",
    );
  });
  it("renders one writable instance when the same note is visible in both panes", async () => {
    const state = openResource(openResource(initialLayout(), note), note, "right");
    localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
    render(<StudyWorkspace owner="test" />);
    expect(await screen.findByText("Read-only mirror")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Editor a")).toHaveLength(1);
  });
  it("keeps the saved split on narrow screens and switches between its panes", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const state = openResource(
      openResource(initialLayout(), note),
      { id: "code", kind: "code", title: "Code Lab" },
      "right",
    );
    localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
    render(<StudyWorkspace owner="test" />);
    expect(screen.queryByRole("separator", { name: "Resize panes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch pane" }));
    expect(screen.getByRole("tab", { name: "Algebra" })).toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("lemma:test:workspace:v1")!).split).toBe(true),
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });
  it("opens tools in the pane whose plus menu was used", async () => {
    const state = openResource(
      openResource(initialLayout(), note),
      { id: "cards", kind: "cards", title: "Flashcards" },
      "right",
    );
    localStorage.setItem("lemma:test:workspace:v1", JSON.stringify(state));
    render(<StudyWorkspace owner="test" />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Open resource in left pane" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Code Lab" }));
    expect(
      await within(screen.getByRole("tablist", { name: "left pane tabs" })).findByRole("tab", {
        name: "Code Lab",
        selected: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("tablist", { name: "right pane tabs" })).getByRole("tab", {
        name: "Flashcards",
        selected: true,
      }),
    ).toBeInTheDocument();
  });
  it("opens the existing document picker as a centered modal with one target pane", async () => {
    render(<StudyWorkspace owner="test" />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Open resource in left pane" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open existing document" }));
    expect(await screen.findByRole("dialog")).toHaveClass("workspace-picker");
    expect(screen.getByText("Open in the left pane")).toBeInTheDocument();
    expect(screen.queryByText("Open beside")).not.toBeInTheDocument();
  });
});
