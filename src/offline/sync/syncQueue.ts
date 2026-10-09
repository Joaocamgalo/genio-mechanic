import { OFFLINE_SCHEMA_VERSION } from '../storage/offlineSchema';
import type { SyncOperation, SyncQueueItem } from './syncTypes';

export interface CreateSyncQueueItemInput<TPayload> {
  empresaId: string;
  usuarioId: string;
  entidade: string;
  operacao: SyncOperation;
  localId: string;
  payload: TPayload;
  installationId: string;
  appVersion: string;
}

export function createLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createIdempotencyKey(
  empresaId: string,
  entidade: string,
  localId: string
): string {
  return `${empresaId.trim()}:${entidade.trim()}:${localId.trim()}`;
}

export function createSyncQueueItem<TPayload>(
  input: CreateSyncQueueItemInput<TPayload>,
  now = new Date()
): SyncQueueItem<TPayload> {
  const timestamp = now.toISOString();
  return {
    id: createLocalId(),
    empresaId: input.empresaId,
    usuarioId: input.usuarioId,
    entidade: input.entidade,
    operacao: input.operacao,
    localId: input.localId,
    idempotencyKey: createIdempotencyKey(
      input.empresaId,
      input.entidade,
      input.localId
    ),
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    nextAttemptAt: null,
    lastError: null,
    remoteId: null,
    installationId: input.installationId,
    appVersion: input.appVersion,
    schemaVersion: OFFLINE_SCHEMA_VERSION,
  };
}

export function queueContainsIdempotencyKey<T>(
  items: readonly SyncQueueItem<T>[],
  idempotencyKey: string
): boolean {
  return items.some((item) => item.idempotencyKey === idempotencyKey);
}

export function filterQueueByEmpresa<T>(
  items: readonly SyncQueueItem<T>[],
  empresaId: string
): SyncQueueItem<T>[] {
  return items
    .filter((item) => item.empresaId === empresaId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
