import { useCallback, useState, type SetStateAction } from "react";

type Stored<T> = { key: string; value: T; error: string };

/** Device-only, account-scoped state. Never write one account's data under another key. */
export function useStored<T>(ownerId: string | undefined, key: string, initial: () => T) {
  const storageKey = `lemma:${ownerId || "local"}:${key}`;
  const read = (): Stored<T> => {
    const fallback = initial();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { key: storageKey, value: fallback, error: "" };
      const value: T = JSON.parse(raw);
      if (value == null || (Array.isArray(fallback) && !Array.isArray(value)))
        throw new Error("Invalid saved data");
      return { key: storageKey, value, error: "" };
    } catch {
      return {
        key: storageKey,
        value: fallback,
        error: "Saved device data could not be read. Export your work before leaving this page.",
      };
    }
  };
  const [state, setState] = useState<Stored<T>>(read);
  if (state.key !== storageKey) setState(read());
  const setValue = useCallback(
    (update: SetStateAction<T>) => {
      setState((previous) => {
        // Ignore callbacks belonging to a workspace that has since changed accounts.
        if (previous.key !== storageKey) return previous;
        const value =
          typeof update === "function" ? (update as (value: T) => T)(previous.value) : update;
        let error = "";
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
          error =
            "Device storage is full or unavailable. Export your work before leaving this page.";
        }
        return { key: storageKey, value, error };
      });
    },
    [storageKey],
  );
  return [state.value, setValue, state.error] as const;
}
