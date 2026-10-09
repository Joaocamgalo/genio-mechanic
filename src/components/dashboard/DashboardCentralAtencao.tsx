import { useMemo, useState } from 'react';
import type { DashboardAcao, DashboardAlerta, DashboardGrupoAlerta } from '../../types/dashboard';
import { DashboardGrupoPrioridades } from './DashboardGrupoPrioridades';
import { DashboardTodasPrioridades } from './DashboardTodasPrioridades';

type Props = {
  alertas: DashboardAlerta[];
  onAcao: (acao: DashboardAcao) => void;
};

const ORDEM: DashboardGrupoAlerta[] = ['criticas', 'atencao', 'pendencias'];

export function DashboardCentralAtencao({ alertas, onAcao }: Props) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const prioritarios = useMemo(() => alertas.slice(0, 5), [alertas]);
  const totais = useMemo(() => ({
    criticas: alertas.filter((alerta) => alerta.grupo === 'criticas').length,
    atencao: alertas.filter((alerta) => alerta.grupo === 'atencao').length,
    pendencias: alertas.filter((alerta) => alerta.grupo === 'pendencias').length,
  }), [alertas]);

  return (
    <section className="cm-dashboard-panel cm-attention-center">
      <div className="cm-dashboard-section-title cm-attention-center-header">
        <div>
          <span className="cm-attention-kicker">Central de atenção</span>
          <h3>Prioridades da operação</h3>
          <p>O que precisa de ação, acompanhamento ou regularização.</p>
        </div>
        <div className="cm-attention-totals" aria-label="Resumo das prioridades">
          <span className="cm-attention-total cm-attention-total--criticas">{totais.criticas} críticas</span>
          <span className="cm-attention-total cm-attention-total--atencao">{totais.atencao} atenção</span>
          <span className="cm-attention-total cm-attention-total--pendencias">{totais.pendencias} pendências</span>
        </div>
      </div>

      {prioritarios.length === 0 ? (
        <div className="cm-dashboard-empty">Nenhuma situação prioritária identificada.</div>
      ) : (
        <div className="cm-attention-groups">
          {ORDEM.map((grupo) => (
            <DashboardGrupoPrioridades
              key={grupo}
              grupo={grupo}
              alertas={prioritarios.filter((alerta) => alerta.grupo === grupo)}
              onAcao={onAcao}
            />
          ))}
        </div>
      )}

      {alertas.length > 5 && (
        <button type="button" className="cm-attention-see-all" onClick={() => setMostrarTodas(true)}>
          Ver todas as {alertas.length} prioridades
        </button>
      )}

      {mostrarTodas && (
        <DashboardTodasPrioridades alertas={alertas} onAcao={onAcao} onFechar={() => setMostrarTodas(false)} />
      )}
    </section>
  );
}
