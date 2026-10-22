import { afterEach, describe, expect, it, vi } from "vitest";
import { openDocumentWindow } from "./documentWindow";

afterEach(() => vi.restoreAllMocks());
describe("detached document previews", () => {
  it("rejects active content and non-document URLs before opening a window", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    for (const document of [
      { name: "page", src: "data:text/html;base64,PHNjcmlwdD4=", mime: "text/html" },
      { name: "bad.pdf", src: "javascript:alert(1)", mime: "application/pdf" },
      { name: "page", src: "https://example.com/page", mime: "text/plain" },
    ])
      await expect(openDocumentWindow(document)).rejects.toThrow();
    expect(open).not.toHaveBeenCalled();
  });
  it("reports popup blocking for a supported local PDF", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    await expect(
      openDocumentWindow({
        name: "notes.pdf",
        src: "data:application/pdf;base64,eA==",
        mime: "application/pdf",
      }),
    ).rejects.toThrow("Allow pop-ups");
  });
});
