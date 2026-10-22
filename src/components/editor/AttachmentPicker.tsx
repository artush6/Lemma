import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileUp, Link2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { attachmentAccept } from "./attachments";

export function AttachmentPicker({
  onChoose,
  onLink,
  onClose,
}: {
  onChoose: (files: File[]) => Promise<void>;
  onLink?: (url: string) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const choose = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    try {
      await onChoose(files);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "The file could not be opened.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="workspace-dialog attachment-picker"
        aria-label="Add a document"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            Upload a PDF, image or document. You can also drop files directly into your note.
          </DialogDescription>
        </DialogHeader>
        <div className="attachment-tabs" role="tablist" aria-label="Document source">
          <Button
            role="tab"
            aria-selected={tab === "upload"}
            variant="ghost"
            onClick={() => setTab("upload")}
          >
            <FileUp size={16} />
            Upload
          </Button>
          {onLink && (
            <Button
              role="tab"
              aria-selected={tab === "link"}
              variant="ghost"
              onClick={() => setTab("link")}
            >
              <Link2 size={16} />
              Link
            </Button>
          )}
        </div>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.16 }}
        >
          {tab === "upload" ? (
            <div
              className="attachment-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void choose(Array.from(event.dataTransfer.files));
              }}
            >
              <UploadCloud size={28} />
              <strong>Drop files here</strong>
              <p>PDFs up to 5 MB · images and other documents up to 2 MB</p>
              <input
                ref={file}
                type="file"
                multiple
                hidden
                accept={`${attachmentAccept},image/png,image/jpeg,image/gif,image/webp`}
                onChange={(event) => void choose(Array.from(event.target.files || []))}
              />
              <Button disabled={busy} onClick={() => file.current?.click()}>
                {busy ? "Adding…" : "Choose files"}
              </Button>
            </div>
          ) : (
            <form
              className="attachment-link-form"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  const parsed = new URL(url);
                  if (parsed.protocol !== "https:") throw new Error("Use an HTTPS PDF link.");
                  onLink?.(parsed.href);
                  onClose();
                } catch (error) {
                  setError(error instanceof Error ? error.message : "Enter a valid PDF URL.");
                }
              }}
            >
              <label htmlFor="pdf-link">PDF URL</label>
              <input
                id="pdf-link"
                type="url"
                required
                placeholder="https://example.com/document.pdf"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <p>
                External PDF previews connect to the website in this link. Some websites prevent
                embedding.
              </p>
              <Button type="submit">Embed PDF</Button>
            </form>
          )}
        </motion.div>
        {error && (
          <p role="alert" className="attachment-error">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
