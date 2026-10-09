import { describe, expect, it } from 'vitest';
import type { LocalRecord } from '../offline/storage/localRecordTypes';
import { cloneLocalValue } from '../offline/storage/offlineStorageUtils';

describe('localRecord infrastructure', () => {
  it('clona payloads para evitar mutação externa', () => {
    const payload = { horimetro: 120, detalhes: { origem: 'campo' } };
    const cloned = cloneLocalValue(payload);
    cloned.detalhes.origem = 'alterado';
    expect(payload.detalhes.origem).toBe('campo');
  });

  it('mantém os campos obrigatórios do contrato local', () => {
    const record: LocalRecord<{ valor: number }> = {
      localId: 'local-1',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      installationId: 'instalacao-1',
      entidade: 'teste',
      payload: { valor: 1 },
      status: 'draft',
      remoteId: null,
      createdAt: '2026-07-25T10:00:00.000Z',
      updatedAt: '2026-07-25T10:00:00.000Z',
      deletedAt: null,
      schemaVersion: 2,
      appVersion: '10.0.0-b',
    };
    expect(record.empresaId).toBe('empresa-1');
    expect(record.status).toBe('draft');
  });
});
