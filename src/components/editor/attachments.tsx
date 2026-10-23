import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
  type JSONContent,
} from "@tiptap/react";
import { useEffect, useState } from "react";
import { FileText, Download, PanelRightOpen } from "lucide-react";
export type Attachment = { name: string; src: string; mime: string };
export const attachmentAccept = ".pdf,.tex,.latex,.txt,.md,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx";
export function validAttachment(a: Attachment) {
  if (typeof a?.src !== "string" || a.src.length >= 8 * 1024 * 1024) return false;
  if (a.mime === "application/pdf" && /^https:\/\//i.test(a.src)) {
    try {
      return new URL(a.src).protocol === "https:";
    } catch {
      return false;
    }
  }
  const match = a.src.match(
    /^data:(application\/pdf|application\/octet-stream|text\/plain);base64,([a-z0-9+/]*={0,2})$/i,
  );
  return !!match && match[1] === a.mime && match[2]!.length % 4 === 0;
}
export async function readAttachment(file: File): Promise<JSONContent> {
  const limit = /\.pdf$/i.test(file.name) ? 5 : 2;
  if (file.size > limit * 1024 * 1024) throw Error(`Choose a file smaller than ${limit} MB.`);
  if (!/\.(pdf|tex|latex|txt|md|csv|docx?|pptx?|xlsx?)$/i.test(file.name))
    throw Error("Choose a PDF, LaTeX, text, or Office document.");
  const mime = /\.pdf$/i.test(file.name)
    ? "application/pdf"
    : /\.(tex|latex|txt|md|csv)$/i.test(file.name)
      ? "text/plain"
      : "application/octet-stream";
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;/, `data:${mime};`));
    reader.onerror = () => reject(Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
  return { type: "attachment", attrs: { name: file.name, src, mime } };
}
export function AttachmentPreview({
  attachment,
  showDownload = true,
}: {
  attachment: Attachment;
  showDownload?: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!validAttachment(attachment)) return;
    if (attachment.src.startsWith("https://")) {
      setUrl(attachment.src);
      return;
    }
    const bytes = Uint8Array.from(atob(attachment.src.split(",")[1] || ""), (c) => c.charCodeAt(0));
    const next = URL.createObjectURL(new Blob([bytes], { type: attachment.mime }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [attachment]);
  if (!validAttachment(attachment)) return <p>Attachment unavailable.</p>;
  return (
    <div className="attachment-preview">
      {attachment.mime === "application/pdf" && url ? (
        <iframe title={attachment.name} src={url} referrerPolicy="no-referrer" />
      ) : attachment.mime === "text/plain" ? (
        <pre>
          {new TextDecoder().decode(
            Uint8Array.from(atob(attachment.src.split(",")[1] || ""), (c) => c.charCodeAt(0)),
          )}
        </pre>
      ) : (
        <p>Download this document to open it in its application.</p>
      )}
      {showDownload && (
        <a href={url} download={attachment.name}>
          <Download size={14} /> Download {attachment.name}
        </a>
      )}
    </div>
  );
}
function AttachmentView({ node }: NodeViewProps) {
  const attachment = node.attrs as Attachment;
  const [expanded, setExpanded] = useState(false);
  return (
    <NodeViewWrapper className="attachment-block" contentEditable={false}>
      <div className="attachment-heading">
        <FileText size={20} />
        <button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {attachment.name || "Document"}
          <small>{expanded ? "Hide preview" : "Preview document"}</small>
        </button>
        <button
          title="Open beside note"
          aria-label="Open beside note"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("lemma:reference", { detail: attachment }))
          }
        >
          <PanelRightOpen size={18} />
        </button>
      </div>
      {expanded && <AttachmentPreview attachment={attachment} />}
    </NodeViewWrapper>
  );
}
export const AttachmentBlock = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    name: { default: "Document" },
    src: { default: "" },
    mime: { default: "application/octet-stream" },
  }),
  parseHTML: () => [{ tag: "div[data-attachment]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-attachment": "" }),
    HTMLAttributes["name"],
  ],
  addNodeView: () => ReactNodeViewRenderer(AttachmentView),
});
