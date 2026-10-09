import type { DashboardAcao, DashboardAlerta, DashboardGrupoAlerta } from '../../types/dashboard';
import { DashboardPrioridadeItem } from './DashboardPrioridadeItem';

const CONTEUDO: Record<DashboardGrupoAlerta, { titulo: string; descricao: string }> = {
  criticas: { titulo: 'Críticas', descricao: 'Exigem ação imediata.' },
  atencao: { titulo: 'Atenção', descricao: 'Devem ser acompanhadas.' },
  pendencias: { titulo: 'Pendências', descricao: 'Precisam ser regularizadas.' },
};

type Props = {
  grupo: DashboardGrupoAlerta;
  alertas: DashboardAlerta[];
  onAcao: (acao: DashboardAcao) => void;
};

export function DashboardGrupoPrioridades({ grupo, alertas, onAcao }: Props) {
  if (alertas.length === 0) return null;
  const conteudo = CONTEUDO[grupo];

  return (
    <section className="cm-attention-group">
      <header className="cm-attention-group-header">
        <div>
          <h4>{conteudo.titulo}</h4>
          <p>{conteudo.descricao}</p>
        </div>
        <span>{alertas.length}</span>
      </header>
      <div className="cm-attention-group-list">
        {alertas.map((alerta) => (
          <DashboardPrioridadeItem key={alerta.id} alerta={alerta} grupo={grupo} onAcao={onAcao} />
        ))}
      </div>
    </section>
  );
}
