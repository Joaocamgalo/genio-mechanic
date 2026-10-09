import type { OfflineContext } from '../context/offlineContext';
import { validateOfflineContext } from '../context/offlineContextValidation';
import { openOfflineDatabase, runOfflineTransaction } from './offlineDatabase';
import type { LocalRecordFilters } from './localRecordFilters';
import type {
  CreateLocalRecordInput,
  LocalRecord,
  UpdateLocalRecordInput,
} from './localRecordTypes';
import {
  OfflineAccessDeniedError,
  OfflineRecordNotFoundError,
  OfflineTransactionError,
} from './offlineStorageErrors';
import { cloneLocalValue, createOfflineLocalId } from './offlineStorageUtils';
import { OFFLINE_SCHEMA_VERSION, OFFLINE_STORES } from './offlineSchema';

function belongsToContext<T>(
  record: LocalRecord<T>,
  context: Readonly<OfflineContext>
): boolean {
  return (
    record.empresaId === context.empresaId &&
    record.usuarioId === context.usuarioId &&
    record.installationId === context.installationId
  );
}

function matchesFilters<T>(
  record: LocalRecord<T>,
  filters: LocalRecordFilters
): boolean {
  if (!filters.includeDeleted && record.status === 'deleted') return false;
  if (filters.entidade && record.entidade !== filters.entidade) return false;
  if (filters.usuarioId && record.usuarioId !== filters.usuarioId) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

async function getRawRecord<T>(localId: string): Promise<LocalRecord<T> | null> {
  const result = await runOfflineTransaction<unknown>(
    OFFLINE_STORES.localRecords,
    'readonly',
    (store) => store.get(localId)
  );
  return (result as LocalRecord<T> | undefined) ?? null;
}

export const localRecordRepository = {
  async create<TPayload>(
    contextInput: OfflineContext,
    input: CreateLocalRecordInput<TPayload>,
    now = new Date()
  ): Promise<LocalRecord<TPayload>> {
    const context = validateOfflineContext(contextInput);
    const entidade = input.entidade.trim();
    if (!entidade) throw new OfflineTransactionError('Entidade local inválida.');

    const timestamp = now.toISOString();
    const record: LocalRecord<TPayload> = {
      localId: createOfflineLocalId(),
      empresaId: context.empresaId,
      usuarioId: context.usuarioId,
      installationId: context.installationId,
      entidade,
      payload: cloneLocalValue(input.payload),
      status: input.status ?? 'draft',
      remoteId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
      appVersion: input.appVersion.trim(),
    };

    await runOfflineTransaction(
      OFFLINE_STORES.localRecords,
      'readwrite',
      (store) => store.add(record)
    );
    return cloneLocalValue(record);
  },

  async getByLocalId<TPayload>(
    contextInput: OfflineContext,
    localId: string
  ): Promise<LocalRecord<TPayload> | null> {
    const context = validateOfflineContext(contextInput);
    const record = await getRawRecord<TPayload>(localId);
    if (!record) return null;
    if (!belongsToContext(record, context)) {
      throw new OfflineAccessDeniedError(
        'O registro local pertence a outro contexto.'
      );
    }
    return cloneLocalValue(record);
  },

  async list<TPayload>(
    contextInput: OfflineContext,
    filters: LocalRecordFilters = {}
  ): Promise<LocalRecord<TPayload>[]> {
    const context = validateOfflineContext(contextInput);
    const results = await runOfflineTransaction<unknown[]>(
      OFFLINE_STORES.localRecords,
      'readonly',
      (store) => store.getAll()
    );

    return (results as LocalRecord<TPayload>[])
      .filter((record) => belongsToContext(record, context))
      .filter((record) => matchesFilters(record, filters))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(cloneLocalValue);
  },

  async update<TPayload>(
    contextInput: OfflineContext,
    localId: string,
    changes: UpdateLocalRecordInput<TPayload>,
    now = new Date()
  ): Promise<LocalRecord<TPayload>> {
    const context = validateOfflineContext(contextInput);
    const current = await getRawRecord<TPayload>(localId);
    if (!current) {
      throw new OfflineRecordNotFoundError('Registro local não encontrado.');
    }
    if (!belongsToContext(current, context)) {
      throw new OfflineAccessDeniedError(
        'O registro local pertence a outro contexto.'
      );
    }

    const updated: LocalRecord<TPayload> = {
      ...current,
      payload:
        changes.payload === undefined
          ? current.payload
          : cloneLocalValue(changes.payload),
      status: changes.status ?? current.status,
      remoteId:
        changes.remoteId === undefined ? current.remoteId : changes.remoteId,
      updatedAt: now.toISOString(),
    };

    await runOfflineTransaction(
      OFFLINE_STORES.localRecords,
      'readwrite',
      (store) => store.put(updated)
    );
    return cloneLocalValue(updated);
  },

  async markDeleted(
    contextInput: OfflineContext,
    localId: string,
    now = new Date()
  ): Promise<void> {
    const context = validateOfflineContext(contextInput);
    const current = await getRawRecord<unknown>(localId);
    if (!current) {
      throw new OfflineRecordNotFoundError('Registro local não encontrado.');
    }
    if (!belongsToContext(current, context)) {
      throw new OfflineAccessDeniedError(
        'O registro local pertence a outro contexto.'
      );
    }
    const timestamp = now.toISOString();
    await runOfflineTransaction(
      OFFLINE_STORES.localRecords,
      'readwrite',
      (store) =>
        store.put({
          ...current,
          status: 'deleted',
          deletedAt: timestamp,
          updatedAt: timestamp,
        })
    );
  },

  async clearContext(contextInput: OfflineContext): Promise<number> {
    const context = validateOfflineContext(contextInput);
    const databaseRecords = await this.list<unknown>(context, {
      includeDeleted: true,
    });
    if (databaseRecords.length === 0) return 0;

    const database = await openOfflineDatabase();
    return new Promise<number>((resolve, reject) => {
      const transaction = database.transaction(
        OFFLINE_STORES.localRecords,
        'readwrite'
      );
      const store = transaction.objectStore(OFFLINE_STORES.localRecords);
      for (const record of databaseRecords) store.delete(record.localId);
      transaction.oncomplete = () => resolve(databaseRecords.length);
      transaction.onerror = () =>
        reject(
          transaction.error ?? new OfflineTransactionError('Falha na limpeza local.')
        );
      transaction.onabort = () =>
        reject(
          transaction.error ?? new OfflineTransactionError('Limpeza local cancelada.')
        );
    });
  },
};
