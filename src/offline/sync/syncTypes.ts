export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncQueueStatus =
  | 'pending'
  | 'processing'
  | 'synced'
  | 'failed'
  | 'conflict';

export interface SyncQueueItem<TPayload = unknown> {
  id: string;
  empresaId: string;
  usuarioId: string;
  entidade: string;
  operacao: SyncOperation;
  localId: string;
  idempotencyKey: string;
  payload: TPayload;
  status: SyncQueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string | null;
  lastError: string | null;
  remoteId: string | null;
  installationId: string;
  appVersion: string;
  schemaVersion: number;
}
