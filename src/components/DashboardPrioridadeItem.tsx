import type { DashboardAcao, DashboardAlerta, DashboardGrupoAlerta } from '../../types/dashboard';
import { DashboardPrioridadeBadge } from './DashboardPrioridadeBadge';

type Props = {
  alerta: DashboardAlerta;
  grupo: DashboardGrupoAlerta;
  onAcao: (acao: DashboardAcao) => void;
};

export function DashboardPrioridadeItem({ alerta, grupo, onAcao }: Props) {
  return (
    <article className={`cm-attention-item cm-attention-item--${grupo}`}>
      <div className="cm-attention-item-head">
        <DashboardPrioridadeBadge grupo={grupo} />
        {alerta.entidadeNome && <span className="cm-attention-entity">{alerta.entidadeNome}</span>}
      </div>
      <strong className="cm-attention-title">{alerta.titulo}</strong>
      <p className="cm-attention-description">{alerta.descricao}</p>
      {alerta.detalhes && alerta.detalhes.length > 0 && (
        <div className="cm-attention-details" aria-label="Detalhes da prioridade">
          {alerta.detalhes.slice(0, 3).map((detalhe) => <span key={detalhe}>{detalhe}</span>)}
        </div>
      )}
      <button type="button" className="cm-attention-action" onClick={() => onAcao(alerta.acao)}>
        {alerta.acao.rotulo} <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}
