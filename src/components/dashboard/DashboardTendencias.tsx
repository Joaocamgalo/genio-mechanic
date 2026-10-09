import type { DashboardTendenciaOperacional } from '../../types/dashboard';

type Props = { tendencias: DashboardTendenciaOperacional[] };

const ROTULO = {
  melhora: 'Melhora',
  piora: 'Piora',
  estavel: 'Estável',
  sem_comparacao: 'Sem comparação',
} as const;

function formatarVariacao(item: DashboardTendenciaOperacional): string {
  if (item.variacaoPercentual === null) return item.anterior === 0 ? 'Base anterior zerada' : 'Sem dados suficientes';
  if (item.variacaoPercentual === 0) return 'Sem variação';
  const sinal = item.variacaoPercentual > 0 ? '+' : '';
  return `${sinal}${item.variacaoPercentual.toLocaleString('pt-BR')}%`;
}

export function DashboardTendencias({ tendencias }: Props) {
  return (
    <section className="cm-dashboard-panel cm-trends-panel">
      <header className="cm-section-header">
        <div>
          <span>Evolução operacional</span>
          <h3>Tendências dos últimos 30 dias</h3>
          <p>Comparação com os 30 dias imediatamente anteriores.</p>
        </div>
      </header>

      <div className="cm-trends-list">
        {tendencias.map((item) => (
          <article className="cm-trend-item" key={item.id}>
            <div className="cm-trend-main">
              <strong>{item.titulo}</strong>
              <small>{item.contexto}</small>
            </div>
            <div className="cm-trend-values">
              <strong>{item.atual}</strong>
              <span>anterior: {item.anterior}</span>
            </div>
            <div className={`cm-trend-status cm-trend-${item.tendencia}`}>
              <strong>{formatarVariacao(item)}</strong>
              <span>{ROTULO[item.tendencia]}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
