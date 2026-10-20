import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.resetModules();
});
describe("device draft recovery", () => {
  it("keeps ordinary drafts working when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const { draftStorage } = await import("./draftStorage");
    draftStorage.setItem("lemma:owner-a:note:one", "saved locally");
    await draftStorage.hydrate();
    expect(draftStorage.getItem("lemma:owner-a:note:one")).toBe("saved locally");
    expect(draftStorage.getItem("lemma:owner-b:note:one")).toBeNull();
  });
  it("retains unsaved content in memory and reports failure if both stores fail", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Unavailable", "SecurityError");
    });
    const warning = vi.fn();
    window.addEventListener("lemma:draft-error", warning);
    try {
      const { draftStorage } = await import("./draftStorage");
      draftStorage.setItem("lemma:owner-a:note:one", "unsaved attachment");
      await draftStorage.hydrate();
      expect(draftStorage.getItem("lemma:owner-a:note:one")).toBe("unsaved attachment");
      expect(warning).toHaveBeenCalledTimes(1);
      draftStorage.removeItem("lemma:owner-a:note:one");
      await draftStorage.hydrate();
      expect(draftStorage.getItem("lemma:owner-a:note:one")).toBeNull();
    } finally {
      window.removeEventListener("lemma:draft-error", warning);
    }
  });
});
