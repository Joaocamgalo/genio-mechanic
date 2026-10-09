import { describe, expect, it } from 'vitest';
import { gerarDashboardExecutivo } from '../services/dashboard';
import { chamado, dados, leitura, maquina, preventiva } from './fixtures/dashboardFixtures';

describe('motor do Dashboard Executivo', () => {
  it('representa uma operação saudável sem alertas críticos', () => {
    const resultado = gerarDashboardExecutivo({ dados: dados() });
    expect(resultado.saudeOperacional.pontuacao).toBe(100);
    expect(resultado.saudeOperacional.classificacao).toBe('excelente');
    expect(resultado.alertas.some((alerta) => alerta.criticidade === 'critica')).toBe(false);
  });

  it('coloca máquina parada e urgente no topo do ranking', () => {
    const entrada = dados({
      maquinas: [maquina({ status_maquina: 'Parada' })],
      chamados: [chamado({ prioridade: 'Urgente', mecanico: null })],
      leiturasHorimetro: [],
      preventivas: [preventiva({ status_preventiva: 'Vencida', horas_restantes: -25 })],
    });
    const resultado = gerarDashboardExecutivo({ dados: entrada });
    expect(resultado.riscosMaquinas[0].tag).toBe('EQ-001');
    expect(resultado.riscosMaquinas[0].pontuacao).toBe(83);
    expect(resultado.riscosMaquinas[0].nivel).toBe('critica');
    expect(resultado.alertas[0].criticidade).toBe('critica');
    expect(resultado.saudeOperacional.pontuacao).toBeLessThan(50);
  });

  it('identifica recorrência sem inventar parada', () => {
    const entrada = dados({
      chamados: [
        chamado({ id: 1 }),
        chamado({ id: 2 }),
        chamado({ id: 3 }),
      ],
    });
    const resultado = gerarDashboardExecutivo({ dados: entrada });
    const risco = resultado.riscosMaquinas[0];
    expect(risco.fatores.some((fator) => fator.codigo === 'recorrencia')).toBe(true);
    expect(risco.fatores.some((fator) => fator.codigo === 'maquina_parada')).toBe(false);
  });

  it('sinaliza qualidade parcial quando faltam dados', () => {
    const resultado = gerarDashboardExecutivo({
      dados: dados({
        maquinas: [maquina({ horimetro: null })],
        leiturasHorimetro: [],
        preventivas: [],
      }),
    });
    expect(resultado.qualidadeDados.nivel).toBe('parcial');
    expect(resultado.qualidadeDados.avisos.length).toBeGreaterThan(0);
  });

  it('não altera os arrays de entrada', () => {
    const chamados = [chamado({ id: 2 }), chamado({ id: 1 })];
    const ordemOriginal = chamados.map((item) => item.id);
    gerarDashboardExecutivo({ dados: dados({ chamados }) });
    expect(chamados.map((item) => item.id)).toEqual(ordemOriginal);
  });

  it('considera horímetro atualizado quando há leitura no dia', () => {
    const resultado = gerarDashboardExecutivo({
      dados: dados({ leiturasHorimetro: [leitura()] }),
    });
    const kpi = resultado.kpis.find((item) => item.id === 'horimetros_pendentes');
    expect(kpi?.valor).toBe(0);
  });
});
