import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { extractHtmlText, extractWordText, parseDocumentCards, readCardFile } from "./cardImport";

const file = (name: string, content: string | Uint8Array) => {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  return Object.assign(new File([new Uint8Array(bytes)], name), {
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.slice().buffer,
  });
};
const word = (body: string) =>
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
const paragraph = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

describe("document card parsing", () => {
  it("preserves quoted CSV delimiters, escaped quotes and multiline cells, skipping a header", () => {
    expect(
      parseDocumentCards(
        'Question,Answer\r\n"Why, exactly?","Line 1\nLine 2 with ""quotes"""',
        "csv",
      ),
    ).toEqual([{ front: "Why, exactly?", back: 'Line 1\nLine 2 with "quotes"' }]);
    expect(parseDocumentCards("Front\tBack\n$\\frac{a}{b}$\tA fraction", "tsv")[0]!.front).toBe(
      "$\\frac{a}{b}$",
    );
  });
  it("rejects incomplete, malformed and extra-column records instead of dropping them", () => {
    expect(() => parseDocumentCards("q,a,extra", "csv")).toThrow("two");
    expect(() => parseDocumentCards('"q,a', "csv")).toThrow("closing quote");
    expect(() => parseDocumentCards("q,", "csv")).toThrow("non-empty");
    expect(() => parseDocumentCards("q;a\nbroken")).toThrow("Line 2");
  });
  it("recognizes Q/A documents and Markdown with multiline answers", () => {
    expect(
      parseDocumentCards(
        "Lecture 1\n\n**Question:** What?\n**Answer:** First line\nSecond line\n\nQ: Next?\nA: Next answer",
      ),
    ).toEqual([
      { front: "What?", back: "First line\nSecond line" },
      { front: "Next?", back: "Next answer" },
    ]);
    expect(() => parseDocumentCards("Q: Missing answer", "qa")).toThrow("both");
    expect(() => parseDocumentCards("Q: One\nQ: Two\nA: answer")).toThrow("both");
  });
  it("accepts exported JSON and cards envelopes without carrying scheduling fields", () => {
    expect(parseDocumentCards('{"cards":[{"front":"Q","back":"A","due":9,"id":"old"}]}')).toEqual([
      { front: "Q", back: "A" },
    ]);
    expect(() => parseDocumentCards('[{"front":"Q","back":null}]')).toThrow("front and back");
  });
  it("bounds text and card batch sizes", () => {
    expect(() => parseDocumentCards("x".repeat(1_000_001))).toThrow("1 million");
    expect(() => parseDocumentCards("q;a\n".repeat(2001))).toThrow("2,000");
  });
});

describe("local file extraction", () => {
  it("reads Word paragraphs and a two-column Word table", async () => {
    const xml = word(paragraph("Q: Word question") + paragraph("A: Word answer"));
    const docx = zipSync({
      "word/document.xml": strToU8(xml),
      "ignored.bin": new Uint8Array(1000),
    });
    expect(parseDocumentCards((await readCardFile(file("deck.docx", docx))).text)).toEqual([
      { front: "Word question", back: "Word answer" },
    ]);
    const table = word(
      "<w:tbl><w:tr><w:tc>" +
        paragraph("Question") +
        "</w:tc><w:tc>" +
        paragraph("Answer") +
        "</w:tc></w:tr><w:tr><w:tc>" +
        paragraph("Term") +
        "</w:tc><w:tc>" +
        paragraph("Meaning") +
        "</w:tc></w:tr></w:tbl>",
    );
    expect(parseDocumentCards(extractWordText(table))).toEqual([
      { front: "Term", back: "Meaning" },
    ]);
  });
  it("extracts HTML tables and excludes executable content", async () => {
    const source =
      '<script>bad()</script><iframe src="https://invalid.example"></iframe><table><tr><th>Question</th><th>Answer</th></tr><tr><td>HTML?</td><td>Yes</td></tr></table>';
    expect(parseDocumentCards(extractHtmlText(source))).toEqual([{ front: "HTML?", back: "Yes" }]);
    expect((await readCardFile(file("deck.html", source))).text).not.toContain("bad");
  });
  it("selects the file's delimited format and reports unsupported, corrupt and oversized files", async () => {
    expect((await readCardFile(file("deck.csv", "Q,A"))).format).toBe("csv");
    await expect(readCardFile(file("old.doc", "bytes"))).rejects.toThrow("docx");
    await expect(
      readCardFile(file("broken.docx", zipSync({ unrelated: strToU8("x") }))),
    ).rejects.toThrow("readable");
    const large = new File([], "big.pdf");
    Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 });
    await expect(readCardFile(large)).rejects.toThrow("10 MiB");
    await expect(readCardFile(file("empty.txt", " "))).rejects.toThrow("No readable text");
  });
});
