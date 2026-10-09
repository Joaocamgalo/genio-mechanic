import type { DashboardAcao, DashboardAlerta } from '../../types/dashboard';

type DashboardPrioridadesProps = {
  alertas: DashboardAlerta[];
  onAcao: (acao: DashboardAcao) => void;
};

export function DashboardPrioridades({ alertas, onAcao }: DashboardPrioridadesProps) {
  const alertasPrioritarios = alertas.filter(
    (alerta) => alerta.criticidade === 'critica' || alerta.criticidade === 'alta',
  );
  const prioridades = (alertasPrioritarios.length > 0 ? alertasPrioritarios : alertas).slice(0, 5);

  return (
    <section className="cm-dashboard-panel cm-dashboard-priorities">
      <div className="cm-dashboard-section-title">
        <div>
          <h3>Prioridades da operação</h3>
          <p>As situações mais relevantes, ordenadas por impacto e urgência.</p>
        </div>
        <span className="cm-dashboard-count">{prioridades.length} prioridade(s)</span>
      </div>

      {prioridades.length === 0 ? (
        <div className="cm-dashboard-empty">Nenhuma situação prioritária identificada.</div>
      ) : (
        <div className="cm-dashboard-priority-list">
          {prioridades.map((alerta) => (
            <article className="cm-dashboard-priority" key={alerta.id}>
              <span className={`cm-dashboard-priority-bar cm-dashboard-priority-bar--${alerta.criticidade}`} />
              <div className="cm-dashboard-priority-copy">
                <strong>{alerta.titulo}</strong>
                <span title={alerta.descricao}>{alerta.descricao}</span>
              </div>
              <button type="button" onClick={() => onAcao(alerta.acao)}>{alerta.acao.rotulo} →</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
