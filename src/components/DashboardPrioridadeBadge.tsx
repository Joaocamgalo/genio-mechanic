import type { DashboardGrupoAlerta } from '../../types/dashboard';

const ROTULOS: Record<DashboardGrupoAlerta, string> = {
  criticas: 'Crítica',
  atencao: 'Atenção',
  pendencias: 'Pendência',
};

export function DashboardPrioridadeBadge({ grupo }: { grupo: DashboardGrupoAlerta }) {
  return (
    <span className={`cm-attention-badge cm-attention-badge--${grupo}`}>
      {ROTULOS[grupo]}
    </span>
  );
}
