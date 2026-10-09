import { describe, expect, it } from 'vitest';
import {
  createOfflineSession,
  isOfflineSessionValid,
} from '../offline/auth/offlineSession';

describe('offlineSession', () => {
  const now = new Date('2026-07-25T12:00:00.000Z');

  it('cria autorização limitada sem senha', () => {
    const session = createOfflineSession(
      {
        usuarioId: 'u1',
        usuarioNome: 'João',
        empresaId: 'e1',
        perfil: 'operador',
        equipamentosPermitidos: ['CAT320'],
      },
      now
    );

    expect(session.expiresAt).toBe('2026-07-26T12:00:00.000Z');
    expect('password' in session).toBe(false);
  });

  it('rejeita sessão expirada ou de outra empresa', () => {
    const session = createOfflineSession(
      { usuarioId: 'u1', usuarioNome: 'João', empresaId: 'e1', perfil: 'operador', equipamentosPermitidos: [] },
      now,
      1
    );

    expect(isOfflineSessionValid(session, 'e1', 'u1', new Date('2026-07-25T12:30:00Z'))).toBe(true);
    expect(isOfflineSessionValid(session, 'e2', 'u1', now)).toBe(false);
    expect(isOfflineSessionValid(session, 'e1', 'u1', new Date('2026-07-25T13:01:00Z'))).toBe(false);
  });
});
