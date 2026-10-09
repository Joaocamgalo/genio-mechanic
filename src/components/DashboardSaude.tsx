import type { DashboardSaudeOperacional, DashboardQualidadeDados } from '../../types/dashboard';

type DashboardSaudeProps = {
  saude: DashboardSaudeOperacional;
  qualidade: DashboardQualidadeDados;
};

const ROTULOS = {
  excelente: 'Operação excelente',
  boa: 'Operação saudável',
  atencao: 'Operação exige atenção',
  critica: 'Situação operacional crítica',
};

export function DashboardSaude({ saude, qualidade }: DashboardSaudeProps) {
  const descricao = saude.fatoresNegativos[0] || saude.fatoresPositivos[0] || 'Indicadores operacionais dentro do esperado.';

  return (
    <section className="cm-dashboard-panel cm-dashboard-health" aria-label="Índice de saúde operacional">
      <div className="cm-dashboard-health-score">
        <div>
          <strong>{saude.pontuacao}</strong>
          <span>de 100</span>
        </div>
      </div>
      <div className="cm-dashboard-health-copy">
        <span className="cm-dashboard-eyebrow">Saúde operacional</span>
        <h3>{ROTULOS[saude.classificacao]}</h3>
        <p>{descricao}</p>
        <span className="cm-dashboard-quality">Confiabilidade {saude.confiabilidade} · dados {qualidade.nivel}</span>
      </div>
    </section>
  );
}
