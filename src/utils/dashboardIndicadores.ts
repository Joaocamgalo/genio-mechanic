import type { Chamado, Maquina, PreventivaMaquina } from '../types/controlmaq';
import type {
  DashboardConfiguracao,
  DashboardDadosFonte,
  DashboardIntervalo,
  DashboardKpi,
  DashboardTendencia,
} from '../types/dashboard';
import { estaNoIntervalo, houveLeituraHoje } from './dashboardDatas';

export function normalizarTexto(valor: string): string {
  return valor.trim().toLocaleLowerCase('pt-BR');
}

export function localizarMaquinaDoChamado(
  chamado: Chamado,
  maquinas: readonly Maquina[],
): Maquina | undefined {
  const identificador = normalizarTexto(chamado.maquina);
  return maquinas.find((maquina) => {
    const tag = normalizarTexto(maquina.tag);
    const modelo = normalizarTexto(maquina.modelo);
    return identificador === tag || identificador.includes(tag) || tag.includes(identificador) || identificador === modelo;
  });
}

function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return Number((((atual - anterior) / anterior) * 100).toFixed(1));
}

function classificarTendencia(
  atual: number,
  anterior: number,
  menorEhMelhor: boolean,
  tolerancia: number,
): DashboardTendencia {
  if (anterior === 0 && atual > 0) return menorEhMelhor ? 'piora' : 'melhora';
  const variacao = variacaoPercentual(atual, anterior);
  if (variacao === null) return 'sem_comparacao';
  if (Math.abs(variacao) <= tolerancia) return 'estavel';
  const aumentou = variacao > 0;
  return menorEhMelhor ? (aumentou ? 'piora' : 'melhora') : (aumentou ? 'melhora' : 'piora');
}

function contarFinalizados(chamados: readonly Chamado[], inicio: string, fim: string): number {
  return chamados.filter((chamado) =>
    chamado.status === 'Finalizado' && estaNoIntervalo(chamado.finalizado_at, inicio, fim),
  ).length;
}

function criticidadePorQuantidade(valor: number, altaEm: number, criticaEm: number) {
  if (valor >= criticaEm) return 'critica' as const;
  if (valor >= altaEm) return 'alta' as const;
  if (valor > 0) return 'media' as const;
  return 'informativa' as const;
}

export function maquinasComHorimetroPendente(dados: DashboardDadosFonte): Maquina[] {
  return dados.maquinas.filter((maquina) => !houveLeituraHoje(maquina.id, dados.leiturasHorimetro, dados.dataReferencia));
}

export function preventivasPorStatus(
  preventivas: readonly PreventivaMaquina[],
  status: PreventivaMaquina['status_preventiva'],
): PreventivaMaquina[] {
  return preventivas.filter((preventiva) => preventiva.status_preventiva === status);
}

export function calcularKpis(
  dados: DashboardDadosFonte,
  intervalo: DashboardIntervalo,
  configuracao: DashboardConfiguracao,
): DashboardKpi[] {
  const chamadosAbertos = dados.chamados.filter((item) => item.status !== 'Finalizado').length;
  const urgentes = dados.chamados.filter((item) => item.status !== 'Finalizado' && item.prioridade === 'Urgente').length;
  const finalizadosAtual = contarFinalizados(dados.chamados, intervalo.inicio, intervalo.fim);
  const finalizadosAnterior = contarFinalizados(dados.chamados, intervalo.inicioAnterior, intervalo.fimAnterior);
  const paradas = dados.maquinas.filter((item) => item.status_maquina === 'Parada').length;
  const vencidas = preventivasPorStatus(dados.preventivas, 'Vencida').length;
  const pendentes = maquinasComHorimetroPendente(dados).length;

  return [
    {
      id: 'chamados_abertos', titulo: 'Chamados abertos', valor: chamadosAbertos,
      valorAnterior: null, variacaoPercentual: null, tendencia: 'sem_comparacao',
      criticidade: criticidadePorQuantidade(chamadosAbertos, 5, 10),
    },
    {
      id: 'chamados_urgentes', titulo: 'Chamados urgentes', valor: urgentes,
      valorAnterior: null, variacaoPercentual: null, tendencia: 'sem_comparacao',
      criticidade: criticidadePorQuantidade(urgentes, 1, 3),
    },
    {
      id: 'chamados_finalizados_periodo', titulo: 'Finalizados no período', valor: finalizadosAtual,
      valorAnterior: finalizadosAnterior,
      variacaoPercentual: variacaoPercentual(finalizadosAtual, finalizadosAnterior),
      tendencia: classificarTendencia(finalizadosAtual, finalizadosAnterior, false, configuracao.toleranciaTendenciaPercentual),
      criticidade: 'informativa',
    },
    {
      id: 'maquinas_paradas', titulo: 'Máquinas paradas', valor: paradas,
      valorAnterior: null, variacaoPercentual: null, tendencia: 'sem_comparacao',
      criticidade: criticidadePorQuantidade(paradas, 1, 3),
    },
    {
      id: 'preventivas_vencidas', titulo: 'Preventivas vencidas', valor: vencidas,
      valorAnterior: null, variacaoPercentual: null, tendencia: 'sem_comparacao',
      criticidade: criticidadePorQuantidade(vencidas, 1, 4),
    },
    {
      id: 'horimetros_pendentes', titulo: 'Horímetros pendentes', valor: pendentes,
      valorAnterior: null, variacaoPercentual: null, tendencia: 'sem_comparacao',
      criticidade: criticidadePorQuantidade(pendentes, 2, 6),
    },
  ];
}

export function calcularTendenciasOperacionais(
  dados: DashboardDadosFonte,
  intervalo: DashboardIntervalo,
  configuracao: DashboardConfiguracao,
): import('../types/dashboard').DashboardTendenciaOperacional[] {
  const contarCriados = (inicio: string, fim: string) =>
    dados.chamados.filter((chamado) => estaNoIntervalo(chamado.created_at, inicio, fim)).length;

  const contarUrgentes = (inicio: string, fim: string) =>
    dados.chamados.filter(
      (chamado) => chamado.prioridade === 'Urgente' && estaNoIntervalo(chamado.created_at, inicio, fim),
    ).length;

  const criar = (
    id: import('../types/dashboard').DashboardTendenciaOperacionalId,
    titulo: string,
    atual: number,
    anterior: number,
    menorEhMelhor: boolean,
    contexto: string,
  ): import('../types/dashboard').DashboardTendenciaOperacional => ({
    id,
    titulo,
    atual,
    anterior,
    variacaoPercentual: variacaoPercentual(atual, anterior),
    tendencia: classificarTendencia(
      atual,
      anterior,
      menorEhMelhor,
      configuracao.toleranciaTendenciaPercentual,
    ),
    contexto,
  });

  const criadosAtual = contarCriados(intervalo.inicio, intervalo.fim);
  const criadosAnterior = contarCriados(intervalo.inicioAnterior, intervalo.fimAnterior);
  const finalizadosAtual = contarFinalizados(dados.chamados, intervalo.inicio, intervalo.fim);
  const finalizadosAnterior = contarFinalizados(dados.chamados, intervalo.inicioAnterior, intervalo.fimAnterior);
  const urgentesAtual = contarUrgentes(intervalo.inicio, intervalo.fim);
  const urgentesAnterior = contarUrgentes(intervalo.inicioAnterior, intervalo.fimAnterior);

  return [
    criar('chamados_criados', 'Chamados criados', criadosAtual, criadosAnterior, true, 'Demanda registrada no período.'),
    criar('chamados_finalizados', 'Chamados finalizados', finalizadosAtual, finalizadosAnterior, false, 'Atendimentos concluídos no período.'),
    criar('chamados_urgentes', 'Chamados urgentes', urgentesAtual, urgentesAnterior, true, 'Ocorrências urgentes abertas no período.'),
  ];
}
