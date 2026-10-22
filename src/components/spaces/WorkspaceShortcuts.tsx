import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function WorkspaceShortcuts({ space }: { space: "code" | "cards" }) {
  const [open, setOpen] = useState(false);
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl";
  const shortcuts =
    space === "code"
      ? [
          [`${mod} + Enter`, "Run the current file"],
          [`${mod} + F`, "Find in code"],
          [mac ? "⌥ + ⌘ + F" : "Ctrl + H", "Find and replace"],
          [`${mod} + /`, "Toggle line comment"],
          ["Alt + Z", "Toggle word wrap"],
          [mac ? "⇧ + ⌥ + F" : "Shift + Alt + F", "Format JavaScript"],
          ["F1", "Editor command palette"],
          ["F8", "Next diagnostic"],
        ]
      : [
          ["Space / Enter", "Reveal the answer"],
          ["1", "Again · repeat in 10 minutes"],
          ["2", "Hard · needs more practice"],
          ["3", "Good · remembered correctly"],
          ["4", "Easy · review further out"],
          ["Escape", "Return to the deck"],
        ];
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input,textarea,[contenteditable=true],.monaco-editor,[role=dialog],[role=alertdialog]",
        )
      )
        return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="ghost-btn shortcut-trigger"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen(true)}
      >
        <Keyboard size={16} />
        <span>Shortcuts</span>
      </Button>
      <DialogContent
        className="workspace-dialog shortcut-dialog"
        aria-label={`${space === "code" ? "Code Lab" : "Flashcards"} shortcuts`}
      >
        <DialogHeader>
          <DialogTitle>{space === "code" ? "Code Lab" : "Flashcards"} shortcuts</DialogTitle>
          <DialogDescription>
            {space === "code"
              ? "Editing shortcuts work inside the enhanced code editor. Formatting is available for JavaScript."
              : "Study shortcuts work after you start a session. Reveal the answer before grading."}
          </DialogDescription>
        </DialogHeader>
        <dl className="shortcut-list">
          {shortcuts.map(([keys, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <kbd>{keys}</kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="shortcut-footnote">
          Alt + 1 / 2 / 3 switches between Notes, Code Lab and Flashcards. Press ? outside text
          fields to open this guide.
        </p>
      </DialogContent>
    </Dialog>
  );
}
