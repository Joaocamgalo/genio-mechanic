import { describe, expect, it } from 'vitest';
import { criarIntervaloDashboard, dataLocalISO, houveLeituraHoje } from '../utils/dashboardDatas';
import { leitura, REFERENCIA } from './fixtures/dashboardFixtures';

describe('dashboardDatas', () => {
  it('gera a data ISO usando o calendário local', () => {
    expect(dataLocalISO(new Date(2026, 6, 21, 23, 30))).toBe('2026-07-21');
  });

  it('cria períodos atual e anterior equivalentes', () => {
    const intervalo = criarIntervaloDashboard({ preset: 'ultimos_30_dias' }, REFERENCIA);
    const atual = new Date(intervalo.fim).getTime() - new Date(intervalo.inicio).getTime();
    const anterior = new Date(intervalo.fimAnterior).getTime() - new Date(intervalo.inicioAnterior).getTime();
    expect(atual).toBe(anterior);
  });

  it('reconhece leitura feita no dia local de referência', () => {
    expect(houveLeituraHoje(1, [leitura()], REFERENCIA)).toBe(true);
    expect(houveLeituraHoje(2, [leitura()], REFERENCIA)).toBe(false);
  });
});
