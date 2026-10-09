import { describe, expect, it } from 'vitest';
import { gerarDashboardExecutivo } from '../services/dashboard';
import { chamado, dados } from './fixtures/dashboardFixtures';

describe('tendências', () => {
  it('classifica aumento de chamados criados como piora', () => {
    const resultado = gerarDashboardExecutivo({
      dados: dados({
        chamados: [
          chamado({ id: 1, created_at: '2026-07-20T10:00:00-03:00' }),
          chamado({ id: 2, created_at: '2026-07-19T10:00:00-03:00' }),
          chamado({ id: 3, created_at: '2026-06-20T10:00:00-03:00' }),
        ],
      }),
    });
    const tendencia = resultado.tendenciasOperacionais.find((item) => item.id === 'chamados_criados');
    expect(tendencia?.atual).toBe(2);
    expect(tendencia?.anterior).toBe(1);
    expect(tendencia?.variacaoPercentual).toBe(100);
    expect(tendencia?.tendencia).toBe('piora');
  });

  it('trata período anterior zerado sem Infinity ou NaN', () => {
    const resultado = gerarDashboardExecutivo({
      dados: dados({ chamados: [chamado({ created_at: '2026-07-20T10:00:00-03:00' })] }),
    });
    const tendencia = resultado.tendenciasOperacionais.find((item) => item.id === 'chamados_criados');
    expect(tendencia?.variacaoPercentual).toBeNull();
    expect(tendencia?.tendencia).toBe('piora');
  });
});
