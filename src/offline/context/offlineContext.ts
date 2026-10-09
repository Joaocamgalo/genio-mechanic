export interface OfflineContext {
  empresaId: string;
  usuarioId: string;
  installationId: string;
}

export function cloneOfflineContext(context: OfflineContext): OfflineContext {
  return { ...context };
}
