import { LOCAL_RECORD_INDEXES, OFFLINE_STORES } from './offlineSchema';

function createIndexIfMissing(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options: IDBIndexParameters = { unique: false }
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

export function migrateOfflineDatabase(
  database: IDBDatabase,
  oldVersion: number,
  transaction?: IDBTransaction | null
): void {
  if (oldVersion < 1) {
    if (!database.objectStoreNames.contains(OFFLINE_STORES.metadata)) {
      database.createObjectStore(OFFLINE_STORES.metadata, { keyPath: 'key' });
    }
    if (!database.objectStoreNames.contains(OFFLINE_STORES.offlineSession)) {
      database.createObjectStore(OFFLINE_STORES.offlineSession, {
        keyPath: 'empresaId',
      });
    }
    if (!database.objectStoreNames.contains(OFFLINE_STORES.localRecords)) {
      const store = database.createObjectStore(OFFLINE_STORES.localRecords, {
        keyPath: 'localId',
      });
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.empresaId, 'empresaId');
    }
    if (!database.objectStoreNames.contains(OFFLINE_STORES.syncQueue)) {
      const store = database.createObjectStore(OFFLINE_STORES.syncQueue, {
        keyPath: 'id',
      });
      store.createIndex('empresaId', 'empresaId', { unique: false });
      store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
      store.createIndex('status', 'status', { unique: false });
    }
    if (!database.objectStoreNames.contains(OFFLINE_STORES.syncLog)) {
      const store = database.createObjectStore(OFFLINE_STORES.syncLog, {
        keyPath: 'id',
      });
      store.createIndex('empresaId', 'empresaId', { unique: false });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    }
  }

  if (oldVersion < 2) {
    const store = transaction?.objectStore(OFFLINE_STORES.localRecords);
    if (store) {
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.empresaId, 'empresaId');
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.usuarioId, 'usuarioId');
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.entidade, 'entidade');
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.status, 'status');
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.createdAt, 'createdAt');
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.empresaEntidade, [
        'empresaId',
        'entidade',
      ]);
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.empresaUsuario, [
        'empresaId',
        'usuarioId',
      ]);
      createIndexIfMissing(store, LOCAL_RECORD_INDEXES.empresaStatus, [
        'empresaId',
        'status',
      ]);
    }
  }
}
