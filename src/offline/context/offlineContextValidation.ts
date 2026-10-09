import type { OfflineContext } from './offlineContext';
import { OfflineContextInvalidError } from '../storage/offlineStorageErrors';

export function validateOfflineContext(
  context: OfflineContext
): Readonly<OfflineContext> {
  const empresaId = context.empresaId.trim();
  const usuarioId = context.usuarioId.trim();
  const installationId = context.installationId.trim();

  if (!empresaId || !usuarioId || !installationId) {
    throw new OfflineContextInvalidError(
      'Empresa, usuário e instalação são obrigatórios para o armazenamento local.'
    );
  }

  return Object.freeze({ empresaId, usuarioId, installationId });
}
