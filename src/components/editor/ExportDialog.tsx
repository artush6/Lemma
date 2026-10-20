import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Editor } from "@tiptap/react";
import { FileText, Code, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentTex, downloadFile, downloadPDF, exportName } from "./exportDocument";
const formats: [string, string, string, LucideIcon][] = [
  ["pdf", "PDF", "Formatted pages with equations and graphs", FileText],
  ["tex", "LaTeX", "Editable source for LuaLaTeX or XeLaTeX", Code],
];
export function ExportDialog({
  title,
  editor,
  onClose,
}: {
  title: string;
  editor: Editor;
  onClose: () => void;
}) {
  const [format, setFormat] = useState("pdf");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      if (format === "tex")
        downloadFile(
          `${exportName(title)}.tex`,
          new Blob([documentTex(title, editor.getJSON())], {
            type: "application/x-tex;charset=utf-8",
          }),
        );
      else await downloadPDF(title, editor.view.dom);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal container={document.querySelector(".lemma-app")}>
        <Dialog.Overlay className="equation-modal-backdrop" />
        <Dialog.Content className="export-dialog">
          <Dialog.Title>Export document</Dialog.Title>
          <Dialog.Description>Choose a format for “{title}”.</Dialog.Description>
          <button
            className="export-close"
            aria-label="Close export"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
          <div className="export-formats">
            {formats.map(([id, label, description, Icon]) => (
              <button
                key={String(id)}
                disabled={busy}
                aria-pressed={format === id}
                onClick={() => setFormat(String(id))}
              >
                <Icon size={22} />
                <strong>{String(label)}</strong>
                <span>{String(description)}</span>
              </button>
            ))}
          </div>
          <p className="export-note">
            {format === "pdf"
              ? "Downloads directly. Pages are rendered as images; attached files are not merged into the PDF."
              : "Equations and text are exported as source. Images, graphs and attachments are represented by descriptions or expressions."}
          </p>
          {error && <p role="alert">{error}</p>}
          <Button disabled={busy} onClick={download}>
            {busy ? "Preparing export…" : `Download .${format}`}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
