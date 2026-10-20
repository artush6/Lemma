// Large attachment drafts exceed localStorage's quota. Keep the same owner-scoped
// keys and use IndexedDB only as an additive overflow store.
const touched = new Set<string>();
const memory = new Map<string, string>();
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("lemma-large-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}
function localValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function removeLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Memory and IndexedDB remain available. */
  }
}
let queue = Promise.resolve();
function persist(key: string, value: string | null) {
  queue = queue
    .then(async () => {
      const database = await db();
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("drafts", "readwrite");
        if (value === null) tx.objectStore("drafts").delete(key);
        else tx.objectStore("drafts").put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    })
    .catch(() => {
      window.dispatchEvent(new CustomEvent("lemma:draft-error"));
    });
}
export const draftStorage = {
  async hydrate() {
    await queue;
    try {
      const database = await db();
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("drafts");
        const request = tx.objectStore("drafts").openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            if (!touched.has(String(cursor.key)) && !localValue(String(cursor.key)))
              memory.set(String(cursor.key), cursor.value);
            cursor.continue();
          } else resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      /* Existing localStorage recovery remains available. */
    }
  },
  keys() {
    let keys: string[] = [];
    try {
      keys = Object.keys(localStorage);
    } catch {
      /* IndexedDB-only recovery. */
    }
    return [...new Set([...keys, ...memory.keys()])];
  },
  getItem(key: string) {
    return memory.get(key) ?? localValue(key);
  },
  setItem(key: string, value: string) {
    touched.add(key);
    try {
      localStorage.setItem(key, value);
      const hadOverflow = memory.delete(key);
      if (hadOverflow) persist(key, null);
    } catch {
      memory.set(key, value);
      removeLocal(key);
      persist(key, value);
    }
  },
  removeItem(key: string) {
    touched.add(key);
    memory.delete(key);
    removeLocal(key);
    persist(key, null);
  },
};
