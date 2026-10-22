import { describe, expect, it } from "vitest";
import { newCard, schedule, parseCardImport } from "./srs";

const DAY = 86_400_000;
const c = () => newCard("d", "q", "a", 0);

describe("flashcard scheduling", () => {
  it("new cards are due at their exact creation timestamp", () => {
    const card = newCard("deck", "chat", "cat", 1_000);
    expect(card.due).toBe(1_000);
    expect(card.created).toBe(1_000);
  });
  it("first Good shows the card again in 1 day", () => {
    const n = schedule(c(), "good", 0);
    expect(n.interval).toBe(1);
    expect(n.due).toBe(DAY);
  });
  it("second Good waits 6 days", () => {
    expect(schedule(schedule(c(), "good", 0), "good", 0).interval).toBe(6);
  });
  it("Again resets progress and repeats in 10 minutes", () => {
    const n = schedule(schedule(c(), "good", 0), "again", 0);
    expect(n.reps).toBe(0);
    expect(n.due).toBe(600_000);
    expect(n.ease).toBe(2.3);
  });
  it("Easy waits longer than Good for a new card", () => {
    expect(schedule(c(), "easy", 0).due).toBeGreaterThan(schedule(c(), "good", 0).due);
  });
  it("ease never drops below 1.3", () => {
    let card = c();
    for (let i = 0; i < 20; i++) card = schedule(card, "again", 0);
    expect(card.ease).toBe(1.3);
  });
});

describe("card import", () => {
  it("preserves delimiters in answers and multiline JSON cards", () => {
    expect(parseCardImport("Derivative\t$2x$; slope")).toEqual([
      { front: "Derivative", back: "$2x$; slope" },
    ]);
    expect(
      parseCardImport(JSON.stringify([{ front: "Proof\nStep 1", back: "$x$\nStep 2" }]))[0]?.front,
    ).toContain("\n");
  });
  it("rejects invalid rows instead of silently dropping cards", () => {
    expect(() => parseCardImport("valid;answer\nbroken")).toThrow("Line 2");
    expect(() => parseCardImport('[{"front":"question","back":42}]')).toThrow("front and back");
  });
});
