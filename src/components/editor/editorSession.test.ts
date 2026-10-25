import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { subscribeEditorSession } from "./editorSession";

function fixture(shared = false) {
  let emit!: (event: AuthChangeEvent, session: Session | null) => void;
  const unsubscribe = vi.fn();
  const auth = {
    onAuthStateChange: vi.fn((callback: typeof emit) => {
      emit = callback;
      return { data: { subscription: { id: "test", callback, unsubscribe } } };
    }),
  };
  const callbacks = { user: vi.fn(), ready: vi.fn(), load: vi.fn(), clear: vi.fn(), shared };
  const dispose = subscribeEditorSession(auth, callbacks);
  return { emit, unsubscribe, callbacks, dispose };
}
const session = (id: string) => ({ user: { id } as User }) as Session;
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("loads once at startup and keeps edits intact through token renewals and repeated sign-in", () => {
  const f = fixture();
  f.emit("INITIAL_SESSION", session("a"));
  expect(f.callbacks.user).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  expect(f.callbacks.load).not.toHaveBeenCalled();
  vi.runAllTimers();
  f.emit("TOKEN_REFRESHED", session("a"));
  f.emit("SIGNED_IN", session("a"));
  f.emit("USER_UPDATED", session("a"));
  vi.runAllTimers();
  expect(f.callbacks.load).toHaveBeenCalledTimes(1);
  expect(f.callbacks.clear).not.toHaveBeenCalled();
  f.dispose();
});

it("cancels a pending startup on sign-out and reloads for a new account", () => {
  const f = fixture();
  f.emit("INITIAL_SESSION", session("a"));
  f.emit("SIGNED_OUT", null);
  vi.runAllTimers();
  expect(f.callbacks.load).not.toHaveBeenCalled();
  expect(f.callbacks.clear).toHaveBeenCalledTimes(1);
  f.emit("SIGNED_IN", session("b"));
  vi.runAllTimers();
  expect(f.callbacks.user).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b" }));
  expect(f.callbacks.load).toHaveBeenCalledTimes(1);
  f.dispose();
});

it("collapses rapid account changes into a load for the latest owner", () => {
  const f = fixture();
  f.emit("INITIAL_SESSION", session("a"));
  f.emit("SIGNED_IN", session("b"));
  vi.runAllTimers();
  expect(f.callbacks.load).toHaveBeenCalledTimes(1);
  expect(f.callbacks.user).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b" }));
  f.dispose();
});

it("loads anonymous shared links, while an ordinary signed-out editor clears its state", () => {
  const shared = fixture(true);
  const ordinary = fixture();
  shared.emit("INITIAL_SESSION", null);
  ordinary.emit("INITIAL_SESSION", null);
  vi.runAllTimers();
  expect(shared.callbacks.load).toHaveBeenCalledTimes(1);
  expect(shared.callbacks.clear).not.toHaveBeenCalled();
  expect(ordinary.callbacks.load).not.toHaveBeenCalled();
  expect(ordinary.callbacks.clear).toHaveBeenCalledTimes(1);
  shared.dispose();
  ordinary.dispose();
});

it("cancels scheduled loads and ignores callbacks after disposal", () => {
  const f = fixture();
  f.emit("INITIAL_SESSION", session("a"));
  f.dispose();
  f.emit("SIGNED_IN", session("b"));
  vi.runAllTimers();
  expect(f.unsubscribe).toHaveBeenCalledOnce();
  expect(f.callbacks.load).not.toHaveBeenCalled();
  expect(f.callbacks.user).toHaveBeenCalledTimes(1);
});
