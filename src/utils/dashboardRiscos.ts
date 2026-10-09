import type { DashboardConfiguracao, DashboardDadosFonte, DashboardFatorRisco, DashboardRiscoMaquina } from '../types/dashboard';
import { houveLeituraHoje } from './dashboardDatas';
import { localizarMaquinaDoChamado } from './dashboardIndicadores';

function nivelPorPontuacao(pontos: number): DashboardRiscoMaquina['nivel'] {
  if (pontos >= 70) return 'critica';
  if (pontos >= 45) return 'alta';
  if (pontos >= 20) return 'media';
  if (pontos > 0) return 'baixa';
  return 'informativa';
}

export function calcularRiscosMaquinas(
  dados: DashboardDadosFonte,
  configuracao: DashboardConfiguracao,
): DashboardRiscoMaquina[] {
  return dados.maquinas.map((maquina) => {
    const fatores: DashboardFatorRisco[] = [];
    const adicionar = (codigo: string, descricao: string, pontos: number) => fatores.push({ codigo, descricao, pontos });

    if (maquina.status_maquina === 'Parada') adicionar('maquina_parada', 'Máquina parada', configuracao.pesosRisco.maquinaParada);
    if (maquina.status_maquina === 'Em manutenção') adicionar('em_manutencao', 'Máquina em manutenção', configuracao.pesosRisco.maquinaEmManutencao);

    const chamados = dados.chamados.filter((chamado) => chamado.status !== 'Finalizado' && localizarMaquinaDoChamado(chamado, [maquina]));
    const urgentes = chamados.filter((chamado) => chamado.prioridade === 'Urgente').length;
    if (urgentes > 0) adicionar('chamados_urgentes', `${urgentes} chamado(s) urgente(s)`, Math.min(40, urgentes * configuracao.pesosRisco.chamadoUrgente));
    const naoUrgentes = chamados.length - urgentes;
    if (naoUrgentes > 0) adicionar('chamados_abertos', `${naoUrgentes} chamado(s) aberto(s)`, Math.min(18, naoUrgentes * configuracao.pesosRisco.chamadoAberto));
    if (chamados.length >= configuracao.limiteRecorrenciaChamados) adicionar('recorrencia', 'Recorrência de chamados', configuracao.pesosRisco.recorrencia);

    const preventiva = dados.preventivas.find((item) => item.maquina_id === maquina.id);
    if (preventiva?.status_preventiva === 'Vencida') adicionar('preventiva_vencida', 'Preventiva vencida', configuracao.pesosRisco.preventivaVencida);
    if (preventiva?.status_preventiva === 'Urgente') adicionar('preventiva_urgente', 'Preventiva urgente', configuracao.pesosRisco.preventivaUrgente);
    if (!houveLeituraHoje(maquina.id, dados.leiturasHorimetro, dados.dataReferencia)) adicionar('horimetro_pendente', 'Horímetro pendente hoje', configuracao.pesosRisco.horimetroPendente);

    const pontuacao = Math.min(100, fatores.reduce((total, fator) => total + fator.pontos, 0));
    return { maquinaId: maquina.id, tag: maquina.tag, pontuacao, nivel: nivelPorPontuacao(pontuacao), fatores };
  }).sort((a, b) => b.pontuacao - a.pontuacao || a.tag.localeCompare(b.tag, 'pt-BR'));
}
