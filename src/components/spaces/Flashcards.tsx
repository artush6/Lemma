import { CardImportDialog } from "./CardImportDialog";
import type { CardPair } from "@/lib/cardImport";
import { SidebarPortal } from "../workspace/SidebarPortal";
import { motion, useReducedMotion } from "framer-motion";
import { useWorkspaceDialogs } from "@/components/ui/workspace-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { Plus, Layers, Trash2, Upload, Play, ArrowLeft, Pencil, Download } from "lucide-react";
import { newCard, previewLabel, schedule, type Card, type Deck, type Grade } from "@/lib/srs";
import { useStored } from "./store";
import katex from "katex";
import { WorkspaceShortcuts } from "./WorkspaceShortcuts";

function CardText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g).map((part, i) =>
        part.startsWith("$") && part.endsWith("$") ? (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(
                part.slice(part.startsWith("$$") ? 2 : 1, part.startsWith("$$") ? -2 : -1),
                {
                  displayMode: part.startsWith("$$"),
                  throwOnError: false,
                  trust: false,
                  strict: "ignore",
                },
              ),
            }}
          />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const grades: { g: Grade; label: string; key: string }[] = [
  { g: "again", label: "Again", key: "1" },
  { g: "hard", label: "Hard", key: "2" },
  { g: "good", label: "Good", key: "3" },
  { g: "easy", label: "Easy", key: "4" },
];

export default function Flashcards({
  ownerId,
  sidebarHost,
  active = true,
}: {
  ownerId?: string;
  sidebarHost?: HTMLElement | null;
  active?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const { ask, confirm, dialogs } = useWorkspaceDialogs();
  const [decks, setDecks, deckError] = useStored<Deck[]>(ownerId, "cards:decks", () => [
    { id: "default", name: "Mathematics", created: Date.now() },
  ]);
  const [cards, setCards, cardError] = useStored<Card[]>(ownerId, "cards:cards", () => []);
  const [deckId, setDeckId] = useState(decks[0]?.id);
  const [studying, setStudying] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    const update = () => setNow(Date.now());
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  const deck = decks.find((d) => d.id === deckId) || decks[0];
  const deckCards = cards.filter((c) => c.deckId === deck?.id);
  const dueOf = (did: string) => cards.filter((c) => c.deckId === did && c.due <= now).length;
  const queue = useMemo(
    () => deckCards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due),
    [deckCards, now],
  );
  const current = queue[0];

  const grade = (g: Grade) => {
    if (!current) return;
    const t = Date.now();
    setCards((l) => l.map((c) => (c.id === current.id ? schedule(c, g, t) : c)));
    setFlipped(false);
    setNow(t);
  };
  useEffect(() => {
    if (!studying) return;
    const k = (e: KeyboardEvent) => {
      if (!active) return;
      if (
        e.altKey ||
        e.metaKey ||
        e.ctrlKey ||
        e.repeat ||
        (e.target as HTMLElement).closest("input,textarea,[role=dialog],[role=alertdialog]")
      )
        return;
      if ((e.key === " " || e.key === "Enter") && !(e.target as HTMLElement).closest("button")) {
        e.preventDefault();
        setFlipped(true);
      }
      const g = grades.find((x) => x.key === e.key);
      if (g && flipped) grade(g.g);
      if (e.key === "Escape") setStudying(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const clearEditor = () => {
    setEditingId(null);
    setFront("");
    setBack("");
  };
  const add = () => {
    if (!front.trim() || !back.trim() || !deck) return;
    const time = Date.now();
    if (editingId)
      setCards((list) =>
        list.map((card) =>
          card.id === editingId ? { ...card, front: front.trim(), back: back.trim() } : card,
        ),
      );
    else setCards((list) => [...list, newCard(deck.id, front.trim(), back.trim(), time)]);
    clearEditor();
    setNow(time);
    document.getElementById("card-front")?.focus();
  };
  const doImport = (pairs: CardPair[], targetDeckId: string) => {
    if (!decks.some((item) => item.id === targetDeckId) || !pairs.length) return;
    const time = Date.now();
    setCards((list) => [
      ...list,
      ...pairs.map((pair) => newCard(targetDeckId, pair.front, pair.back, time)),
    ]);
    setImporting(false);
    setNow(time);
    setFeedback(
      `Imported ${pairs.length} cards into ${decks.find((item) => item.id === targetDeckId)?.name}.`,
    );
  };
  useEffect(() => {
    setImporting(false);
  }, [active, ownerId]);
  const exportDeck = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(deckCards, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${deck?.name || "cards"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const addDeck = async () => {
    const name = await ask("Deck name");
    if (!name?.trim()) return;
    const d = { id: crypto.randomUUID(), name: name.trim(), created: Date.now() };
    setDecks((l) => [...l, d]);
    setDeckId(d.id);
    setStudying(false);
    clearEditor();
    setFeedback("");
  };
  const removeDeck = async () => {
    if (!deck || !(await confirm(`Delete “${deck.name}” and its ${deckCards.length} cards?`)))
      return;
    setCards((l) => l.filter((c) => c.deckId !== deck.id));
    const rest = decks.filter((d) => d.id !== deck.id);
    setDecks(rest);
    setDeckId(rest[0]?.id);
    clearEditor();
    setStudying(false);
  };
  const when = (c: Card) => {
    const d = c.due - now;
    if (d <= 0) return "due";
    const h = d / 3_600_000;
    return h < 24 ? `${Math.ceil(h)}h` : `${Math.round(h / 24)}d`;
  };

  if (!deck)
    return (
      <motion.div
        className="space-page flashcards"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.18 }}
      >
        {dialogs}
        <section className="space-main">
          {(deckError || cardError) && (
            <p className="workspace-storage-error" role="alert">
              {deckError || cardError}
            </p>
          )}
          <span className="panel-eyebrow">Flashcards</span>
          <h1>Make room for what you’re learning.</h1>
          <p className="space-hint">
            Create a deck, add questions and review them at your own pace. Saved on this device.
          </p>
          <div className="space-actions">
            <Button className="primary-btn" onClick={addDeck}>
              <Plus size={16} />
              Create a deck
            </Button>
          </div>
        </section>
      </motion.div>
    );
  return (
    <motion.div
      className="space-page flashcards"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
    >
      {dialogs}
      {importing && (
        <CardImportDialog
          decks={decks}
          initialDeckId={deck.id}
          onClose={() => setImporting(false)}
          onImport={doImport}
        />
      )}
      <SidebarPortal
        host={sidebarHost}
        visible={sidebarHost === undefined || (active && !!sidebarHost)}
      >
        <aside className="space-rail">
          <div className="space-rail-head">
            <span>Decks</span>
            <Button variant="ghost" type="button" aria-label="New deck" onClick={addDeck}>
              <Plus size={15} />
            </Button>
          </div>
          {decks.map((d) => (
            <Button
              variant="ghost"
              type="button"
              key={d.id}
              className={`rail-item ${d.id === deck.id ? "is-active" : ""}`}
              onClick={() => {
                setDeckId(d.id);
                setStudying(false);
                setFlipped(false);
                clearEditor();
                setFeedback("");
                setNow(Date.now());
              }}
            >
              <Layers size={15} />
              <span>{d.name}</span>
              {dueOf(d.id) > 0 && <em className="due-pill">{dueOf(d.id)}</em>}
            </Button>
          ))}
        </aside>
      </SidebarPortal>
      <section className="space-main">
        {(deckError || cardError) && (
          <p className="workspace-storage-error" role="alert">
            {deckError || cardError}
          </p>
        )}
        <p className="space-hint device-storage-note">
          Saved on this device · Use $LaTeX$ for mathematics. Export a deck to keep a backup.
        </p>
        <header className="space-header">
          <div className="min-w-0">
            <span className="panel-eyebrow">Flashcards</span>
            <Input
              className="space-title"
              value={deck.name}
              aria-label="Deck name"
              onChange={(e) =>
                setDecks((l) =>
                  l.map((d) => (d.id === deck.id ? { ...d, name: e.target.value } : d)),
                )
              }
            />
          </div>
          <div className="space-actions">
            <WorkspaceShortcuts space="cards" />
            {studying ? (
              <Button
                variant="ghost"
                type="button"
                className="ghost-btn"
                onClick={() => setStudying(false)}
              >
                <ArrowLeft size={15} />
                Deck
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  type="button"
                  className="ghost-btn"
                  aria-label="Delete deck"
                  onClick={removeDeck}
                >
                  <Trash2 size={15} />
                </Button>
                <Button
                  variant="ghost"
                  className="ghost-btn"
                  disabled={!deckCards.length}
                  onClick={exportDeck}
                >
                  <Download size={15} />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  className="ghost-btn"
                  onClick={() => setImporting((v) => !v)}
                >
                  <Upload size={15} />
                  Import
                </Button>
                <Button
                  type="button"
                  className="primary-btn"
                  disabled={!queue.length}
                  onClick={() => {
                    setNow(Date.now());
                    setStudying(true);
                    setFlipped(false);
                    clearEditor();
                  }}
                >
                  <Play size={14} />
                  Study {queue.length > 0 && <kbd>{queue.length}</kbd>}
                </Button>
              </>
            )}
          </div>
        </header>

        {studying ? (
          current ? (
            <div className="study">
              <span className="space-hint" role="status">
                {queue.length} left
              </span>
              <Button
                variant="ghost"
                type="button"
                className={`study-card ${flipped ? "is-flipped" : ""}`}
                aria-label={flipped ? "Question and answer" : "Show answer"}
                onClick={() => setFlipped(true)}
              >
                <div className="study-front">
                  <CardText text={current.front} />
                </div>
                {flipped ? (
                  <>
                    <hr />
                    <motion.div
                      className="study-back"
                      aria-live="polite"
                      initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.2 }}
                    >
                      <CardText text={current.back} />
                    </motion.div>
                  </>
                ) : (
                  <span className="space-hint">Space to show answer</span>
                )}
              </Button>
              {flipped && (
                <motion.div
                  className="grade-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.16 }}
                >
                  {grades.map(({ g, label, key }) => (
                    <Button
                      variant="ghost"
                      type="button"
                      key={g}
                      className={`grade grade-${g}`}
                      onClick={() => grade(g)}
                    >
                      <span>{label}</span>
                      <em>
                        {previewLabel(current, g)} · {key}
                      </em>
                    </Button>
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="study-done">
              <h2>All caught up</h2>
              <p className="space-hint">No more cards due in this deck right now.</p>
              <Button
                variant="ghost"
                type="button"
                className="ghost-btn"
                onClick={() => setStudying(false)}
              >
                Back to deck
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="deck-stats">
              <div>
                <strong>{queue.length}</strong>
                <span>Due now</span>
              </div>
              <div>
                <strong>{deckCards.filter((c) => c.reps === 0).length}</strong>
                <span>New</span>
              </div>
              <div>
                <strong>{deckCards.length}</strong>
                <span>Total</span>
              </div>
            </div>
            {feedback && (
              <p role="status" className="import-feedback">
                {feedback}
              </p>
            )}
            <form
              className="card-add"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <Textarea
                aria-label="Card front"
                id="card-front"
                placeholder="Question — e.g. What is the derivative of $x^2$?"
                value={front}
                onChange={(e) => setFront(e.target.value)}
              />
              <Textarea
                aria-label="Card back"
                placeholder="Answer — e.g. $2x$"
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
              <Button
                type="submit"
                className="primary-btn"
                disabled={!front.trim() || !back.trim()}
              >
                <Plus size={14} />
                {editingId ? "Save card" : "Add card"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={clearEditor}>
                  Cancel edit
                </Button>
              )}
            </form>
            {deckCards.length ? (
              <ul className="card-list" aria-label={`Cards in ${deck.name}`} tabIndex={0}>
                {deckCards.map((c) => (
                  <li key={c.id}>
                    <span>
                      <CardText text={c.front} />
                    </span>
                    <span>
                      <CardText text={c.back} />
                    </span>
                    <em>{when(c)}</em>
                    <Button
                      variant="ghost"
                      type="button"
                      aria-label={`Edit card: ${c.front}`}
                      onClick={() => {
                        setEditingId(c.id);
                        setFront(c.front);
                        setBack(c.back);
                        document.getElementById("card-front")?.focus();
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      aria-label={`Delete card: ${c.front}`}
                      onClick={async () => {
                        if (await confirm(`Delete this card: “${c.front}”?`)) {
                          setCards((l) => l.filter((x) => x.id !== c.id));
                          if (editingId === c.id) clearEditor();
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="space-hint empty">No cards yet. Add one above or import a list.</p>
            )}
          </>
        )}
      </section>
    </motion.div>
  );
}
