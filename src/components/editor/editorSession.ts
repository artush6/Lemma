import type { SupabaseClient, User } from "@supabase/supabase-js";

/** INITIAL_SESSION owns startup; token renewals must not reload a document being edited. */
export function subscribeEditorSession(
  auth: Pick<SupabaseClient["auth"], "onAuthStateChange">,
  callbacks: {
    user: (user: User | null) => void;
    ready: () => void;
    load: () => void;
    clear: () => void;
    shared: boolean;
  },
) {
  let initialized = false;
  let owner: string | null = null;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const {
    data: { subscription },
  } = auth.onAuthStateChange((_event, session) => {
    if (disposed) return;
    const user = session?.user || null;
    callbacks.user(user);
    callbacks.ready();
    if (initialized && owner === (user?.id || null)) return;
    initialized = true;
    owner = user?.id || null;
    clearTimeout(timer);
    if (user || callbacks.shared) {
      // Query outside Supabase's auth callback/session lock.
      timer = setTimeout(() => {
        if (!disposed) callbacks.load();
      }, 0);
    } else callbacks.clear();
  });
  return () => {
    disposed = true;
    clearTimeout(timer);
    subscription.unsubscribe();
  };
}
