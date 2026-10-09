import { describe, expect, it } from 'vitest';
import { LOCAL_RECORD_INDEXES, OFFLINE_SCHEMA_VERSION } from '../offline/storage/offlineSchema';

describe('offline migration v2', () => {
  it('incrementa o schema sem remover os stores anteriores', () => {
    expect(OFFLINE_SCHEMA_VERSION).toBe(2);
    expect(Object.values(LOCAL_RECORD_INDEXES)).toContain('empresa_entidade');
    expect(Object.values(LOCAL_RECORD_INDEXES)).toContain('empresa_usuario');
    expect(Object.values(LOCAL_RECORD_INDEXES)).toContain('empresa_status');
  });
});
