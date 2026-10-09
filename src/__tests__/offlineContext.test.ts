import { describe, expect, it } from 'vitest';
import { validateOfflineContext } from '../offline/context/offlineContextValidation';
import { OfflineContextInvalidError } from '../offline/storage/offlineStorageErrors';

describe('offlineContext', () => {
  it('normaliza e congela um contexto válido sem alterar a entrada', () => {
    const input = {
      empresaId: ' empresa-1 ',
      usuarioId: ' usuario-1 ',
      installationId: ' instalacao-1 ',
    };
    const result = validateOfflineContext(input);
    expect(result).toEqual({
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      installationId: 'instalacao-1',
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(input.empresaId).toBe(' empresa-1 ');
  });

  it('rejeita contexto incompleto', () => {
    expect(() =>
      validateOfflineContext({
        empresaId: '',
        usuarioId: 'u1',
        installationId: 'i1',
      })
    ).toThrow(OfflineContextInvalidError);
  });
});
