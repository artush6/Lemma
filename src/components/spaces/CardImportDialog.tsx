import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkspaceSelect } from "@/components/ui/workspace-select";
import {
  cardImportAccept,
  parseDocumentCards,
  readCardFile,
  type CardImportFormat,
  type CardPair,
} from "@/lib/cardImport";
import type { Deck } from "@/lib/srs";

export function CardImportDialog({
  decks,
  initialDeckId,
  onClose,
  onImport,
}: {
  decks: Deck[];
  initialDeckId: string;
  onClose: () => void;
  onImport: (pairs: CardPair[], deckId: string) => void;
}) {
  const [source, setSource] = useState("file");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<CardImportFormat>("auto");
  const [deckId, setDeckId] = useState(initialDeckId);
  const [filename, setFilename] = useState("");
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const preview = useMemo(() => {
    try {
      return { pairs: parseDocumentCards(text, format), error: "" };
    } catch (error) {
      return {
        pairs: [],
        error: error instanceof Error ? error.message : "Could not read these cards.",
      };
    }
  }, [text, format]);
  const canImport =
    !reading && !fileError && preview.pairs.length > 0 && decks.some((deck) => deck.id === deckId);
  const openFile = async (file: File) => {
    const id = ++request.current;
    setReading(true);
    setFileError("");
    setFilename(file.name);
    setText("");
    try {
      const result = await readCardFile(file);
      if (request.current !== id) return;
      setText(result.text);
      setFormat(result.format);
    } catch (error) {
      if (request.current === id)
        setFileError(error instanceof Error ? error.message : "Could not open this document.");
    } finally {
      if (request.current === id) setReading(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="card-import-dialog">
        <DialogHeader>
          <DialogTitle>Import cards</DialogTitle>
          <DialogDescription>
            Open a document or paste existing questions and answers. Review them before adding to a
            deck.
          </DialogDescription>
        </DialogHeader>
        <div className="card-import-body">
          <Tabs
            value={source}
            onValueChange={(value) => {
              request.current++;
              setReading(false);
              setFileError("");
              setSource(value);
            }}
          >
            <TabsList aria-label="Import source">
              <TabsTrigger value="file">
                <FileUp size={16} /> Open a file
              </TabsTrigger>
              <TabsTrigger value="paste">
                <ClipboardPaste size={16} /> Paste text
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="card-import-file">
              <label htmlFor="card-import-file">Choose a document</label>
              <Input
                id="card-import-file"
                type="file"
                accept={cardImportAccept}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void openFile(file);
                }}
              />
              <p>PDF, Word (.docx), HTML, CSV, TSV, JSON, text or Markdown · up to 10 MiB.</p>
              {filename && <span className="space-hint">{filename}</span>}
            </TabsContent>
            <TabsContent value="paste">
              <p className="space-hint">
                Paste your questions and answers in the text field below.
              </p>
            </TabsContent>
          </Tabs>
          <div className="card-import-options">
            <label>
              Destination deck
              <WorkspaceSelect
                label="Destination deck"
                value={deckId}
                onChange={setDeckId}
                options={decks.map((deck) => ({ value: deck.id, label: deck.name }))}
              />
            </label>
            <label>
              Card format
              <WorkspaceSelect
                label="Card format"
                value={format}
                onChange={(value) => setFormat(value as CardImportFormat)}
                options={[
                  { value: "auto", label: "Detect automatically" },
                  { value: "qa", label: "Q: / A: blocks" },
                  { value: "csv", label: "CSV · two columns" },
                  { value: "tsv", label: "TSV · two columns" },
                  { value: "json", label: "JSON deck" },
                  { value: "text", label: "Text · tabs, semicolons or dashes" },
                ]}
              />
            </label>
          </div>
          <p className="space-hint">
            Use Q: question / A: answer blocks or a two-column question/answer table. Document
            imports extract existing pairs; scanned PDFs need OCR. Text before the first Q: is not a
            card.
          </p>
          {(source === "paste" || text) && (
            <label className="card-import-text">
              {source === "file" ? "Review extracted text" : "Questions and answers"}
              <Textarea
                aria-label="Import cards"
                rows={6}
                value={text}
                disabled={reading}
                onChange={(event) => {
                  setText(event.target.value);
                  setFileError("");
                }}
                placeholder={
                  "Q: What is the derivative of $x^2$?\nA: $2x$\n\nQ: A prime number after 5?\nA: 7"
                }
              />
            </label>
          )}
          {reading && <p role="status">Reading the document on this device…</p>}
          {(fileError || preview.error) && (
            <p role="alert" className="card-import-error">
              {fileError || preview.error}
            </p>
          )}
          {!reading && preview.pairs.length > 0 && (
            <section aria-label="Import preview" className="card-import-preview">
              <p role="status">
                {preview.pairs.length} {preview.pairs.length === 1 ? "card" : "cards"} ready.{" "}
                {preview.pairs.length > 20 ? "Showing the first 20." : ""}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.pairs.slice(0, 20).map((pair, index) => (
                    <tr key={index}>
                      <td>{pair.front}</td>
                      <td>{pair.back}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
        <p className="space-hint">
          Files stay on this device. Only confirmed cards are saved; imported cards start a fresh
          review schedule.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canImport}
            onClick={() => {
              if (canImport) onImport(preview.pairs, deckId);
            }}
          >
            Add {preview.pairs.length || ""} {preview.pairs.length === 1 ? "card" : "cards"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
