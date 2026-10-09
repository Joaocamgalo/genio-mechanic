import { describe, expect, it } from 'vitest';
import {
  createIdempotencyKey,
  createSyncQueueItem,
  filterQueueByEmpresa,
  queueContainsIdempotencyKey,
} from '../offline/sync/syncQueue';

describe('syncQueue', () => {
  it('gera chave idempotente determinística e isolada por empresa', () => {
    expect(createIdempotencyKey('empresa-1', 'horimetro', 'local-1')).toBe(
      'empresa-1:horimetro:local-1'
    );
  });

  it('cria item pendente sem mutar o payload', () => {
    const payload = { valor: 1500 };
    const item = createSyncQueueItem(
      {
        empresaId: 'empresa-1',
        usuarioId: 'usuario-1',
        entidade: 'horimetro',
        operacao: 'create',
        localId: 'local-1',
        payload,
        installationId: 'instalacao-1',
        appVersion: '10.0-a',
      },
      new Date('2026-07-25T12:00:00.000Z')
    );

    expect(item.status).toBe('pending');
    expect(item.attempts).toBe(0);
    expect(item.idempotencyKey).toBe('empresa-1:horimetro:local-1');
    expect(payload).toEqual({ valor: 1500 });
  });

  it('filtra a fila por empresa sem alterar a entrada', () => {
    const base = [
      createSyncQueueItem({ empresaId: 'b', usuarioId: 'u', entidade: 'x', operacao: 'create', localId: '2', payload: {}, installationId: 'i', appVersion: 'v' }, new Date('2026-07-25T12:01:00Z')),
      createSyncQueueItem({ empresaId: 'a', usuarioId: 'u', entidade: 'x', operacao: 'create', localId: '1', payload: {}, installationId: 'i', appVersion: 'v' }, new Date('2026-07-25T12:00:00Z')),
    ];
    const snapshot = [...base];
    const result = filterQueueByEmpresa(base, 'a');

    expect(result).toHaveLength(1);
    expect(result[0].empresaId).toBe('a');
    expect(base).toEqual(snapshot);
    expect(queueContainsIdempotencyKey(base, result[0].idempotencyKey)).toBe(true);
  });
});
