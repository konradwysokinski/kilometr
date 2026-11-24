/** Tiny promise wrapper around one IndexedDB object store, used as a key-value store. */
const DB_NAME = 'kilometr';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const dbGet = <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key));
export const dbSet = (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key)).then(() => undefined);
export const dbDelete = (key: string) => run('readwrite', (s) => s.delete(key)).then(() => undefined);
