import { beforeEach, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: mocked.getDocument }));
import { readCardPdf } from "./cardImportPdf";
beforeEach(() => {
  vi.clearAllMocks();
  mocked.destroy.mockResolvedValue(undefined);
});
it("extracts page text and releases the PDF worker", async () => {
  const cleanup = vi.fn();
  mocked.getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [
            { str: "Q: Question", hasEOL: true },
            { str: "A: Answer", hasEOL: true },
          ],
        }),
        cleanup,
      }),
    }),
    destroy: mocked.destroy,
  });
  expect(await readCardPdf(new Uint8Array([1]))).toContain("Q: Question\nA: Answer");
  expect(cleanup).toHaveBeenCalledOnce();
  expect(mocked.destroy).toHaveBeenCalledOnce();
  expect(mocked.getDocument.mock.calls[0]?.[0]).toMatchObject({
    useWorkerFetch: false,
    useWasm: false,
  });
});
it("releases the worker on oversized or unreadable PDF failures", async () => {
  mocked.getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 101 }),
    destroy: mocked.destroy,
  });
  await expect(readCardPdf(new Uint8Array([1]))).rejects.toThrow("100 PDF pages");
  expect(mocked.destroy).toHaveBeenCalledOnce();
  mocked.getDocument.mockReturnValue({
    promise: Promise.reject(new Error("Invalid PDF")),
    destroy: mocked.destroy,
  });
  await expect(readCardPdf(new Uint8Array([1]))).rejects.toThrow("Invalid PDF");
  expect(mocked.destroy).toHaveBeenCalledTimes(2);
});
