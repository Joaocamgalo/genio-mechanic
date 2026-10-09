export const OFFLINE_DATABASE_NAME = 'controlmaq-offline';
export const OFFLINE_SCHEMA_VERSION = 2;

export const OFFLINE_STORES = {
  metadata: 'metadata',
  offlineSession: 'offline_session',
  localRecords: 'local_records',
  syncQueue: 'sync_queue',
  syncLog: 'sync_log',
} as const;

export type OfflineStoreName =
  (typeof OFFLINE_STORES)[keyof typeof OFFLINE_STORES];

export const OFFLINE_STORE_NAMES: readonly OfflineStoreName[] = Object.freeze(
  Object.values(OFFLINE_STORES)
);

export const LOCAL_RECORD_INDEXES = {
  empresaId: 'empresaId',
  usuarioId: 'usuarioId',
  entidade: 'entidade',
  status: 'status',
  createdAt: 'createdAt',
  empresaEntidade: 'empresa_entidade',
  empresaUsuario: 'empresa_usuario',
  empresaStatus: 'empresa_status',
} as const;
