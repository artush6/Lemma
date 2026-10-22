import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStored } from "./store";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
describe("account-scoped workspace storage", () => {
  it("loads another account without copying the previous account data", () => {
    localStorage.setItem("lemma:a:cards", '["private A"]');
    localStorage.setItem("lemma:b:cards", '["private B"]');
    const { result, rerender } = renderHook(
      ({ owner }) => useStored<string[]>(owner, "cards", () => []),
      { initialProps: { owner: "a" } },
    );
    const staleSetter = result.current[1];
    expect(result.current[0]).toEqual(["private A"]);
    rerender({ owner: "b" });
    expect(result.current[0]).toEqual(["private B"]);
    act(() => staleSetter(["stale update"]));
    act(() => result.current[1]((list) => [...list, "new B"]));
    expect(localStorage.getItem("lemma:a:cards")).toBe('["private A"]');
    expect(JSON.parse(localStorage.getItem("lemma:b:cards")!)).toEqual(["private B", "new B"]);
  });
  it("retains edits in memory and reports unavailable storage", () => {
    const { result } = renderHook(() => useStored<string[]>("a", "cards", () => []));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    act(() => result.current[1](["unsaved"]));
    expect(result.current[0]).toEqual(["unsaved"]);
    expect(result.current[2]).toContain("Export");
  });
  it("does not overwrite unreadable saved data on mount", () => {
    localStorage.setItem("lemma:a:cards", "{broken");
    const { result } = renderHook(() => useStored<string[]>("a", "cards", () => []));
    expect(result.current[0]).toEqual([]);
    expect(result.current[2]).toContain("could not be read");
    expect(localStorage.getItem("lemma:a:cards")).toBe("{broken");
  });
});
