import { describe, expect, it } from 'vitest';
import { validateOfflineContext } from '../offline/context/offlineContextValidation';

describe('offline isolation', () => {
  it('mantém contextos de empresas diferentes distintos', () => {
    const empresaA = validateOfflineContext({
      empresaId: 'empresa-a',
      usuarioId: 'usuario-1',
      installationId: 'instalacao-1',
    });
    const empresaB = validateOfflineContext({
      empresaId: 'empresa-b',
      usuarioId: 'usuario-1',
      installationId: 'instalacao-1',
    });
    expect(empresaA.empresaId).not.toBe(empresaB.empresaId);
  });
});
