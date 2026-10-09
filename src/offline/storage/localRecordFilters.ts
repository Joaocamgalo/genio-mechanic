import type { LocalRecordStatus } from './localRecordTypes';

export interface LocalRecordFilters {
  entidade?: string;
  usuarioId?: string;
  status?: LocalRecordStatus;
  includeDeleted?: boolean;
}
