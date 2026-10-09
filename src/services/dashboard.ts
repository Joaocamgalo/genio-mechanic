import { DASHBOARD_CONFIGURACAO_PADRAO } from '../config/dashboard';
import type {
  DashboardConfiguracao,
  DashboardDadosFonte,
  DashboardExecutivoResultado,
  DashboardFiltroPeriodo,
} from '../types/dashboard';
import { gerarAlertas } from '../utils/dashboardAlertas';
import { criarIntervaloDashboard } from '../utils/dashboardDatas';
import { calcularKpis, calcularTendenciasOperacionais } from '../utils/dashboardIndicadores';
import { avaliarQualidadeDados } from '../utils/dashboardQualidade';
import { gerarResumoExecutivo } from '../utils/dashboardResumo';
import { calcularRiscosMaquinas } from '../utils/dashboardRiscos';
import { calcularSaudeOperacional } from '../utils/dashboardSaude';

export type GerarDashboardExecutivoParametros = {
  dados: DashboardDadosFonte;
  filtroPeriodo?: DashboardFiltroPeriodo;
  configuracao?: DashboardConfiguracao;
};

export function gerarDashboardExecutivo({
  dados,
  filtroPeriodo = { preset: 'ultimos_30_dias' },
  configuracao = DASHBOARD_CONFIGURACAO_PADRAO,
}: GerarDashboardExecutivoParametros): DashboardExecutivoResultado {
  const intervalo = criarIntervaloDashboard(filtroPeriodo, dados.dataReferencia);
  const qualidadeDados = avaliarQualidadeDados(dados);
  const kpis = calcularKpis(dados, intervalo, configuracao);
  const alertas = gerarAlertas(dados, configuracao);
  const riscosMaquinas = calcularRiscosMaquinas(dados, configuracao);
  const tendenciasOperacionais = calcularTendenciasOperacionais(dados, intervalo, configuracao);
  const saudeOperacional = calcularSaudeOperacional(dados, kpis, qualidadeDados);
  const resumoExecutivo = gerarResumoExecutivo(saudeOperacional, alertas);

  return {
    geradoEm: dados.dataReferencia.toISOString(),
    periodo: intervalo,
    kpis,
    alertas,
    riscosMaquinas,
    tendenciasOperacionais,
    saudeOperacional,
    resumoExecutivo,
    qualidadeDados,
  };
}
