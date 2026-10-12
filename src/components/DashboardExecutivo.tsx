import { useMemo } from 'react';
import type { Maquina, PreventivaMaquina, LeituraHorimetro, Chamado } from '../types/controlmaq';

interface DashboardExecutivoProps {
  maquinas: Maquina[];
  preventivas: PreventivaMaquina[];
  leituras: LeituraHorimetro[];
  chamados: Chamado[];
}

export function DashboardExecutivo({
  maquinas,
  preventivas,
  leituras,
  chamados,
}: DashboardExecutivoProps) {
  // 1. Cálculos de Frota e Preventivas
  const totalMaquinas = maquinas.length;
  const maquinasCriticas = preventivas.filter((p) => p.status === 'vencida').length;
  const maquinasAlerta = preventivas.filter((p) => p.status === 'proxima').length;
  const maquinasOk = preventivas.filter((p) => p.status === 'em_dia').length;

  // 2. Cálculo dos Indicadores Industriais: MTBF, MTTR e Disponibilidade
  const kpis = useMemo(() => {
    const chamadosFinalizados = chamados.filter((c) => c.status === 'Finalizado' && c.created_at && c.updated_at);
    
    // MTTR (Mean Time to Repair) em horas
    let horasTotaisReparo = 0;
    chamadosFinalizados.forEach((c) => {
      const inicio = new Date(c.created_at).getTime();
      const fim = new Date(c.updated_at!).getTime();
      const diffHoras = (fim - inicio) / (1000 * 60 * 60);
      if (diffHoras > 0) horasTotaisReparo += diffHoras;
    });
    const mttr = chamadosFinalizados.length > 0 ? (horasTotaisReparo / chamadosFinalizados.length).toFixed(1) : '0.0';

    // MTBF (Mean Time Between Failures) aproximado baseado nas horas médias da frota
    const horasOperacionaisFrota = maquinas.reduce((acc, m) => acc + (m.horimetro || 0), 0);
    const totalFalhas = chamados.filter((c) => c.status !== 'Finalizado' || c.problema).length;
    const mtbf = totalFalhas > 0 ? Math.round(horasOperacionaisFrota / totalFalhas) : Math.round(horasOperacionaisFrota || 0);

    // Disponibilidade Física da Frota (%)
    // Máquinas sem OS em aberto divididas pelo total
    const tagsComFalhaAberta = new Set(chamados.filter((c) => c.status !== 'Finalizado').map((c) => c.maquina));
    const maquinasParadas = maquinas.filter((m) => tagsComFalhaAberta.has(m.tag)).length;
    const disponibilidade = totalMaquinas > 0 ? (((totalMaquinas - maquinasParadas) / totalMaquinas) * 100).toFixed(1) : '100.0';

    return { mttr, mtbf, disponibilidade, maquinasParadas };
  }, [maquinas, chamados]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Bloco 1: Indicadores Confiabilidade da Frota */}
      <div>
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ENGENHARIA DE MANUTENÇÃO // INDICADORES TÁTICOS
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
            Confiabilidade & Disponibilidade da Frota
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}>
          {/* Card Disponibilidade */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #22c55e',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>DISPONIBILIDADE FÍSICA</span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {kpis.disponibilidade}%
            </div>
            <span style={{ fontSize: '11px', color: kpis.maquinasParadas > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
              {kpis.maquinasParadas > 0 ? `⚠️ ${kpis.maquinasParadas} máquina(s) com OS aberta` : '✓ 100% da frota operando'}
            </span>
          </div>

          {/* Card MTBF */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #3b82f6',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>MTBF (TEMPO MÉDIO ENTRE FALHAS)</span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {kpis.mtbf} <span style={{ fontSize: '14px', fontWeight: 600 }}>horas</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Média estimada de operação sem paradas
            </span>
          </div>

          {/* Card MTTR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #f59e0b',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>MTTR (TEMPO MÉDIO DE REPARO)</span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {kpis.mttr} <span style={{ fontSize: '14px', fontWeight: 600 }}>horas</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Tempo médio de resposta técnica e oficina
            </span>
          </div>

          {/* Card Preventivas Vencidas / Alerta */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '5px solid #ef4444',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>STATUS PREVENTIVO</span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: maquinasCriticas > 0 ? '#dc2626' : '#0f172a', margin: '4px 0' }}>
              {maquinasCriticas} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>críticas</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {maquinasAlerta} em alerta // {maquinasOk} em dia
            </span>
          </div>
        </div>
      </div>

      {/* Bloco 2: Monitoramento das Máquinas */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
          Visão Geral da Frota Cadastrada ({totalMaquinas} equipamentos)
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {maquinas.map((m) => {
            const osAberta = chamados.some((c) => c.maquina === m.tag && c.status !== 'Finalizado');
            return (
              <div
                key={m.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{m.tag}</strong>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: osAberta ? '#fee2e2' : '#dcfce7',
                      color: osAberta ? '#b91c1c' : '#15803d',
                    }}>
                      {osAberta ? 'EM MANUTENÇÃO' : 'DISPONÍVEL'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {m.marca} {m.modelo} — {m.cliente || 'Base Lokmax'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                    {m.horimetro ?? 0} h
                  </div>
                  <small style={{ fontSize: '10px', color: '#64748b' }}>Horímetro atual</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
