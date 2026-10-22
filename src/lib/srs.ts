export type Grade = "again" | "hard" | "good" | "easy";
export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  ease: number;
  interval: number;
  reps: number;
  due: number;
  created: number;
};
export type Deck = { id: string; name: string; created: number };

const DAY = 86_400_000;
const MIN = 60_000;

export function newCard(deckId: string, front: string, back: string, now = Date.now()): Card {
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: now,
    created: now,
  };
}

/** SM-2 style scheduling (Anki-like). interval is in days. */
export function schedule(card: Card, grade: Grade, now = Date.now()): Card {
  let { ease, interval } = card;
  const { reps } = card;
  if (grade === "again") {
    ease = Math.max(1.3, ease - 0.2);
    return { ...card, ease: round(ease), interval: 0, reps: 0, due: now + 10 * MIN };
  }
  if (grade === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2));
  } else {
    const base = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ease);
    if (grade === "easy") {
      interval = Math.max(2, Math.round(Math.max(base, 1) * 1.3));
      ease += 0.15;
    } else interval = base;
  }
  return { ...card, ease: round(ease), interval, reps: reps + 1, due: now + interval * DAY };
}

export function previewLabel(card: Card, grade: Grade): string {
  const next = schedule(card, grade, 0);
  if (next.interval === 0) return "10m";
  return next.interval < 30
    ? `${next.interval}d`
    : next.interval < 365
      ? `${Math.round(next.interval / 30)}mo`
      : `${(next.interval / 365).toFixed(1)}y`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** JSON backups or two-column text; imported cards always start a fresh review schedule. */
export function parseCardImport(source: string): { front: string; back: string }[] {
  if (source.trimStart().startsWith("[")) {
    const parsed: unknown = JSON.parse(source);
    if (!Array.isArray(parsed)) throw new Error("Expected a list of cards.");
    return parsed.map((item: unknown) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("front" in item) ||
        !("back" in item) ||
        typeof item.front !== "string" ||
        typeof item.back !== "string" ||
        !item.front.trim() ||
        !item.back.trim()
      )
        throw new Error("Every card needs a front and back.");
      return { front: item.front.trim(), back: item.back.trim() };
    });
  }
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const separator = /\t|;| — | - /.exec(line);
      if (!separator || separator.index === undefined)
        throw new Error(
          `Line ${index + 1} needs a front and back separated by a tab, semicolon or spaced dash.`,
        );
      const front = line.slice(0, separator.index).trim();
      const back = line.slice(separator.index + separator[0].length).trim();
      if (!front || !back) throw new Error(`Line ${index + 1} has an empty front or back.`);
      return { front, back };
    });
}
