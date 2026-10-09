import type { DashboardAcao, DashboardRiscoMaquina } from '../../types/dashboard';

type Props = {
  riscos: DashboardRiscoMaquina[];
  onAcao: (acao: DashboardAcao) => void;
};

const ROTULOS = {
  critica: 'Crítico',
  alta: 'Alto',
  media: 'Moderado',
  baixa: 'Baixo',
  informativa: 'Sem risco relevante',
} as const;

export function DashboardRankingRisco({ riscos, onAcao }: Props) {
  const principais = riscos.filter((risco) => risco.pontuacao > 0).slice(0, 5);

  return (
    <section className="cm-dashboard-panel cm-risk-ranking">
      <header className="cm-section-header">
        <div>
          <span>Risco operacional</span>
          <h3>Máquinas que exigem atenção</h3>
          <p>Ranking calculado por situação, chamados, preventiva e horímetro.</p>
        </div>
      </header>

      {principais.length === 0 ? (
        <div className="cm-dashboard-empty-inline">Nenhuma máquina apresenta risco relevante neste momento.</div>
      ) : (
        <div className="cm-risk-list">
          {principais.map((risco, indice) => (
            <article className="cm-risk-item" key={risco.maquinaId}>
              <div className="cm-risk-position">{indice + 1}º</div>
              <div className="cm-risk-content">
                <div className="cm-risk-title-row">
                  <strong>{risco.tag}</strong>
                  <span className={`cm-risk-level cm-risk-level-${risco.nivel}`}>
                    {ROTULOS[risco.nivel]} · {risco.pontuacao} pontos
                  </span>
                </div>
                <div className="cm-risk-bar" aria-label={`Risco ${risco.pontuacao} de 100`}>
                  <span style={{ width: `${risco.pontuacao}%` }} />
                </div>
                <ul className="cm-risk-factors">
                  {risco.fatores.slice(0, 3).map((fator) => (
                    <li key={fator.codigo}>{fator.descricao} <small>+{fator.pontos}</small></li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onAcao({
                  tipo: 'abrir_maquina',
                  destino: 'historicoMaquina',
                  entidadeId: risco.maquinaId,
                  rotulo: 'Abrir máquina',
                })}
              >
                Ver máquina
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
