import { describe, expect, it } from 'vitest';
import {
  OFFLINE_DATABASE_NAME,
  OFFLINE_SCHEMA_VERSION,
  OFFLINE_STORE_NAMES,
} from '../offline/storage/offlineSchema';

describe('offlineSchema', () => {
  it('mantém nome e versão explícitos', () => {
    expect(OFFLINE_DATABASE_NAME).toBe('controlmaq-offline');
    expect(OFFLINE_SCHEMA_VERSION).toBe(2);
  });

  it('define todos os stores da fundação', () => {
    expect(OFFLINE_STORE_NAMES).toEqual([
      'metadata',
      'offline_session',
      'local_records',
      'sync_queue',
      'sync_log',
    ]);
  });
});
