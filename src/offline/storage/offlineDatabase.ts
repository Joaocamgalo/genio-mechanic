import { migrateOfflineDatabase } from './offlineMigrations';
import {
  OFFLINE_DATABASE_NAME,
  OFFLINE_SCHEMA_VERSION,
  type OfflineStoreName,
} from './offlineSchema';

let databasePromise: Promise<IDBDatabase> | null = null;

export function openOfflineDatabase(): Promise<IDBDatabase> {
  if (databasePromise !== null) return databasePromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new Error('IndexedDB não está disponível neste navegador.')
    );
  }

  const openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      OFFLINE_DATABASE_NAME,
      OFFLINE_SCHEMA_VERSION
    );

    request.onupgradeneeded = (event) => {
      migrateOfflineDatabase(
        request.result,
        event.oldVersion,
        request.transaction
      );
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
    request.onblocked = () =>
      reject(new Error('Atualização do banco local bloqueada.'));
  });

  databasePromise = openingPromise.catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

export async function runOfflineTransaction<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openOfflineDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Falha na operação local.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Transação local cancelada.'));
  });
}

export async function putOfflineRecord<T>(
  storeName: OfflineStoreName,
  value: T
): Promise<void> {
  await runOfflineTransaction(storeName, 'readwrite', (store) =>
    store.put(value)
  );
}

export async function getOfflineRecord<T>(
  storeName: OfflineStoreName,
  key: IDBValidKey
): Promise<T | null> {
  const result = await runOfflineTransaction<unknown>(
    storeName,
    'readonly',
    (store) => store.get(key)
  );
  return (result as T | undefined) ?? null;
}

export function resetOfflineDatabaseConnectionForTests(): void {
  databasePromise = null;
}
