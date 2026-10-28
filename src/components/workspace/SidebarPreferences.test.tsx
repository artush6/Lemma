import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SidebarPreferences } from "./SidebarPreferences";
import { writeDevicePreferences } from "@/lib/devicePreferences";
import { defaultPreferences } from "../editor/Settings";
beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
it("changes theme without a note and edits the same device preferences", () => {
  render(<SidebarPreferences />);
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
  expect(document.documentElement).toHaveClass("dark");
  expect(localStorage.getItem("lemma:theme")).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Sync" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Editor" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Text size" }), {
    target: { value: "18" },
  });
  expect(JSON.parse(localStorage.getItem("lemma:preferences") || "{}").size).toBe(18);
  act(() => writeDevicePreferences({ ...defaultPreferences, size: 20 }));
  expect(screen.getByRole("spinbutton", { name: "Text size" })).toHaveValue(20);
});
