export interface OfflineSession {
  usuarioId: string;
  usuarioNome: string;
  empresaId: string;
  perfil: 'operador' | 'mecanico' | 'admin';
  equipamentosPermitidos: readonly string[];
  validatedAt: string;
  expiresAt: string;
}

export function isOfflineSessionValid(
  session: OfflineSession | null,
  empresaId: string,
  usuarioId: string,
  now = new Date()
): boolean {
  if (!session) return false;
  if (session.empresaId !== empresaId || session.usuarioId !== usuarioId) {
    return false;
  }
  return new Date(session.expiresAt).getTime() > now.getTime();
}

export function createOfflineSession(
  input: Omit<OfflineSession, 'validatedAt' | 'expiresAt'>,
  now = new Date(),
  validityHours = 24
): OfflineSession {
  const expiresAt = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
  return {
    ...input,
    equipamentosPermitidos: [...input.equipamentosPermitidos],
    validatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
