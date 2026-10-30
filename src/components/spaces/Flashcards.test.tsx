import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Flashcards from "./Flashcards";
import { newCard } from "@/lib/srs";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("keeps an optional response across reveal, ignores review shortcuts while typing, and clears it for the next card", () => {
  const cards = [
    newCard("default", "First question", "First expected answer", 0),
    newCard("default", "Second question", "Second expected answer", 1),
  ];
  localStorage.setItem("lemma:test:cards:cards", JSON.stringify(cards));
  render(<Flashcards ownerId="test" />);
  fireEvent.click(screen.getByRole("button", { name: /Study 2/ }));
  const response = screen.getByRole("textbox", { name: "Your answer" });
  fireEvent.change(response, { target: { value: "My answer 1\nwith spaces" } });
  fireEvent.keyDown(response, { key: " " });
  fireEvent.keyDown(response, { key: "Enter" });
  expect(screen.queryByText("First expected answer")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  expect(screen.getByText("First expected answer")).toBeInTheDocument();
  expect(response).toHaveValue("My answer 1\nwith spaces");
  fireEvent.keyDown(response, { key: "3" });
  expect(screen.getByText("First question")).toBeInTheDocument();
  expect(localStorage.getItem("lemma:test:cards:cards")).not.toContain("My answer");
  fireEvent.click(screen.getByRole("button", { name: /Good/ }));
  expect(screen.getByText("Second question")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("");
});
