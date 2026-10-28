import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Lazy-loaded and locally bundled: document bytes never leave the browser. */
export async function readCardPdf(data: Uint8Array): Promise<string> {
  GlobalWorkerOptions.workerSrc = workerUrl;
  const loading = getDocument({
    data,
    useWorkerFetch: false,
    useWasm: false,
    disableFontFace: true,
  });
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > 100) throw new Error("Import up to 100 PDF pages at a time.");
    const pages: string[] = [];
    let length = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("");
      length += text.length;
      if (length > 1_000_000)
        throw new Error("The PDF text is too large. Split it into smaller files.");
      pages.push(text);
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await loading.destroy();
  }
}
