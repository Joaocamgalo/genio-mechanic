import type { DashboardConfiguracao } from '../types/dashboard';

export const DASHBOARD_CONFIGURACAO_PADRAO: DashboardConfiguracao = {
  limiteChamadoAntigoHoras: 48,
  limiteRecorrenciaChamados: 3,
  toleranciaTendenciaPercentual: 5,
  pesosRisco: {
    maquinaParada: 30,
    maquinaEmManutencao: 15,
    chamadoUrgente: 25,
    chamadoAberto: 6,
    preventivaVencida: 20,
    preventivaUrgente: 12,
    horimetroPendente: 8,
    recorrencia: 12,
  },
};
