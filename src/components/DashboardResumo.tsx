import type { DashboardAcao, DashboardResumoExecutivo } from '../../types/dashboard';

type DashboardResumoProps = {
  resumo: DashboardResumoExecutivo;
  onAcao: (acao: DashboardAcao) => void;
};

export function DashboardResumo({ resumo, onAcao }: DashboardResumoProps) {
  return (
    <section className="cm-dashboard-panel cm-dashboard-summary">
      <div className="cm-dashboard-section-title">
        <div>
          <h3>{resumo.titulo}</h3>
          <p>Leitura consolidada do momento atual.</p>
        </div>
      </div>
      <p className="cm-dashboard-summary-message">{resumo.mensagemPrincipal}</p>
      <div className="cm-dashboard-highlights">
        {resumo.destaques.map((destaque, index) => (
          <div className="cm-dashboard-highlight" key={`${destaque.texto}-${index}`}>
            <span className={`cm-dashboard-dot cm-dashboard-dot--${destaque.criticidade}`} />
            <span>{destaque.texto}</span>
          </div>
        ))}
      </div>
      {resumo.proximaAcao && (
        <button className="cm-dashboard-primary-action" type="button" onClick={() => onAcao(resumo.proximaAcao!)}>
          {resumo.proximaAcao.rotulo}
        </button>
      )}
    </section>
  );
}
