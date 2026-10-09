export type LocalRecordStatus =
  | 'draft'
  | 'pending'
  | 'synced'
  | 'failed'
  | 'deleted';

export interface LocalRecord<TPayload> {
  localId: string;
  empresaId: string;
  usuarioId: string;
  installationId: string;
  entidade: string;
  payload: TPayload;
  status: LocalRecordStatus;
  remoteId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  schemaVersion: number;
  appVersion: string;
}

export interface CreateLocalRecordInput<TPayload> {
  entidade: string;
  payload: TPayload;
  status?: Exclude<LocalRecordStatus, 'deleted'>;
  appVersion: string;
}

export interface UpdateLocalRecordInput<TPayload> {
  payload?: TPayload;
  status?: Exclude<LocalRecordStatus, 'deleted'>;
  remoteId?: string | null;
}
