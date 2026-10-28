import { parseCardImport } from "./srs";

export type CardPair = { front: string; back: string };
export type CardImportFormat = "auto" | "qa" | "csv" | "tsv" | "json" | "text";
export const cardImportAccept = ".pdf,.docx,.html,.htm,.csv,.tsv,.json,.txt,.md,.markdown";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 1_000_000;
const MAX_CARDS = 2000;
const header = (front: string, back: string) =>
  /^(front|question|term)$/i.test(front.trim()) && /^(back|answer|definition)$/i.test(back.trim());

/** RFC-style quoted fields, including embedded newlines and doubled quotes. */
export function parseCardColumns(source: string, delimiter: string): CardPair[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const cell = () => {
    row.push(field.trim());
    field = "";
    closed = false;
  };
  const record = () => {
    cell();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === delimiter) cell();
    else if (char === "\n") record();
    else if (char === '"' && !field.trim() && !closed) {
      field = "";
      quoted = true;
    } else if (closed && !/\s/.test(char)) throw new Error("Unexpected text after a quoted field.");
    else if (!closed) field += char;
  }
  if (quoted) throw new Error("A quoted field is missing its closing quote.");
  record();
  if (rows[0]?.length === 2 && header(rows[0][0]!, rows[0][1]!)) rows.shift();
  return rows.map((values, i) => {
    if (values.length !== 2 || !values[0] || !values[1])
      throw new Error(`Row ${i + 1} needs exactly two non-empty columns: question and answer.`);
    return { front: values[0], back: values[1] };
  });
}

function parseQA(source: string): CardPair[] {
  const pairs: CardPair[] = [];
  let front: string[] = [],
    back: string[] = [],
    side: "front" | "back" | null = null;
  const finish = () => {
    if (!front.join("\n").trim() || !back.join("\n").trim())
      throw new Error(`Question ${pairs.length + 1} needs both a Q: question and an A: answer.`);
    pairs.push({ front: front.join("\n").trim(), back: back.join("\n").trim() });
    front = [];
    back = [];
  };
  for (const line of source.split(/\r?\n/)) {
    const match =
      /^\s*(?:#{1,6}\s+|[-*]\s+)?\*{0,2}(Q(?:uestion)?|A(?:nswer)?)\s*[:.]\*{0,2}\s*(.*)$/i.exec(
        line,
      );
    if (match) {
      if (match[1]!.toLowerCase().startsWith("q")) {
        if (side) finish();
        side = "front";
        front.push(match[2]!);
      } else {
        if (!side || side === "back") throw new Error("Each A: answer must follow a Q: question.");
        side = "back";
        back.push(match[2]!);
      }
    } else if (side === "front") front.push(line);
    else if (side === "back") back.push(line);
  }
  if (side) finish();
  if (!pairs.length)
    throw new Error(
      "No Q: / A: pairs found. Mark questions and answers or choose a two-column format.",
    );
  return pairs;
}

export function parseDocumentCards(source: string, format: CardImportFormat = "auto"): CardPair[] {
  const text = source.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  if (text.length > MAX_TEXT) throw new Error("Import up to 1 million characters at a time.");
  let selected = format;
  if (selected === "auto") {
    if (text.startsWith("[") || text.startsWith("{")) selected = "json";
    else if (/^\s*(?:#{1,6}\s+|[-*]\s+)?\*{0,2}(Q|Question)\s*[:.]/im.test(text)) selected = "qa";
    else if (text.includes("\t")) selected = "tsv";
    else if (/^(?:"?(?:front|question|term)"?)\s*,/i.test(text) || /^"[^\n]+",/.test(text))
      selected = "csv";
    else selected = "text";
  }
  let pairs: CardPair[];
  if (selected === "qa") pairs = parseQA(text);
  else if (selected === "csv" || selected === "tsv")
    pairs = parseCardColumns(text, selected === "csv" ? "," : "\t");
  else if (selected === "json") {
    const parsed: unknown = JSON.parse(text);
    const cards = parsed && typeof parsed === "object" && "cards" in parsed ? parsed.cards : parsed;
    if (!Array.isArray(cards))
      throw new Error(
        "Choose a JSON array of cards with front/back fields, or an object containing a cards array.",
      );
    pairs = parseCardImport(JSON.stringify(cards));
  } else pairs = parseCardImport(text);
  if (pairs.length > MAX_CARDS) throw new Error("Import up to 2,000 cards at a time.");
  return pairs;
}

const wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function wordText(element: Element): string {
  let text = "";
  const visit = (node: Element) => {
    if (node.localName === "t") text += node.textContent || "";
    else if (node.localName === "tab") text += "\t";
    else if (node.localName === "br") text += "\n";
    else [...node.children].forEach(visit);
  };
  visit(element);
  return text;
}
export function extractWordText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagNameNS(wordNamespace, "body")[0];
  if (doc.querySelector("parsererror") || !body)
    throw new Error("This Word document could not be read. Save it as .docx and try again.");
  return [...body.children]
    .map((element) => {
      if (element.localName !== "tbl") return wordText(element);
      return [...element.getElementsByTagNameNS(wordNamespace, "tr")]
        .map((row) => {
          const cells = [...row.children]
            .filter((e) => e.localName === "tc")
            .map((cell) =>
              [...cell.getElementsByTagNameNS(wordNamespace, "p")].map(wordText).join("\n").trim(),
            );
          if (cells.length !== 2)
            throw new Error("Word tables need two columns: question and answer.");
          return header(cells[0]!, cells[1]!) ? "" : `Q: ${cells[0]}\nA: ${cells[1]}`;
        })
        .join("\n\n");
    })
    .join("\n");
}

export function extractHtmlText(source: string): string {
  // Template contents stay inert: no scripts, frames or images are attached to the page.
  const template = document.createElement("template");
  template.innerHTML = source;
  template.content
    .querySelectorAll("script,style,iframe,object,embed,img,link,meta")
    .forEach((e) => e.remove());
  template.content.querySelectorAll("tr").forEach((row) => {
    const cells = [...row.children]
      .filter((e) => /^(TD|TH)$/.test(e.tagName))
      .map((e) => e.textContent?.trim() || "");
    if (cells.length === 2)
      row.textContent = header(cells[0]!, cells[1]!) ? "" : `\nQ: ${cells[0]}\nA: ${cells[1]}\n`;
  });
  template.content
    .querySelectorAll("p,li,h1,h2,h3,h4,h5,h6,div,br,tr")
    .forEach((e) => e.append(document.createTextNode("\n")));
  return template.content.textContent || "";
}

export async function readCardFile(
  file: File,
): Promise<{ text: string; format: CardImportFormat }> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file smaller than 10 MiB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  let text: string,
    format: CardImportFormat = "auto";
  if (ext === "docx") {
    const { unzipSync, strFromU8 } = await import("fflate");
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => {
        if (entry.name !== "word/document.xml") return false;
        if (entry.originalSize > 8 * 1024 * 1024)
          throw new Error("The Word document text is too large. Split it into smaller files.");
        return true;
      },
    });
    if (!files["word/document.xml"]) throw new Error("This file is not a readable .docx document.");
    text = extractWordText(strFromU8(files["word/document.xml"]));
  } else if (ext === "pdf") {
    const { readCardPdf } = await import("./cardImportPdf");
    text = await readCardPdf(new Uint8Array(await file.arrayBuffer()));
  } else if (["html", "htm", "csv", "tsv", "json", "txt", "md", "markdown"].includes(ext || "")) {
    text = await file.text();
    if (ext === "html" || ext === "htm") text = extractHtmlText(text);
    if (ext === "csv" || ext === "tsv" || ext === "json") format = ext;
  } else throw new Error("Choose PDF, Word (.docx), HTML, CSV, TSV, JSON, text or Markdown.");
  if (text.length > MAX_TEXT)
    throw new Error("The extracted text is too large. Split it into smaller files.");
  if (!text.trim()) throw new Error("No readable text found. Scanned PDFs need OCR before import.");
  return { text, format };
}
