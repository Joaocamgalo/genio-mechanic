import type { DashboardKpi } from '../../types/dashboard';

type DashboardKpiCardProps = {
  kpi: DashboardKpi;
  contexto: string;
  onClick: () => void;
};

export function DashboardKpiCard({ kpi, contexto, onClick }: DashboardKpiCardProps) {
  return (
    <button type="button" className="cm-dashboard-panel cm-dashboard-kpi" onClick={onClick}>
      <div>
        <div className="cm-dashboard-kpi-top">
          <span className="cm-dashboard-kpi-label">{kpi.titulo}</span>
          <span className={`cm-dashboard-dot cm-dashboard-dot--${kpi.criticidade}`} aria-hidden="true" />
        </div>
        <strong className="cm-dashboard-kpi-value">{kpi.valor}</strong>
      </div>
      <span className="cm-dashboard-kpi-context">{contexto}</span>
    </button>
  );
}
