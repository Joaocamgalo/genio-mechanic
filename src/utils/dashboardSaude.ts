import type { DashboardDadosFonte, DashboardKpi, DashboardQualidadeDados, DashboardSaudeOperacional } from '../types/dashboard';

function valorKpi(kpis: readonly DashboardKpi[], id: DashboardKpi['id']): number {
  return kpis.find((item) => item.id === id)?.valor || 0;
}

export function calcularSaudeOperacional(
  dados: DashboardDadosFonte,
  kpis: readonly DashboardKpi[],
  qualidade: DashboardQualidadeDados,
): DashboardSaudeOperacional {
  const totalMaquinas = Math.max(1, dados.maquinas.length);
  const paradas = valorKpi(kpis, 'maquinas_paradas');
  const urgentes = valorKpi(kpis, 'chamados_urgentes');
  const vencidas = valorKpi(kpis, 'preventivas_vencidas');
  const pendentes = valorKpi(kpis, 'horimetros_pendentes');

  const penalidade =
    (paradas / totalMaquinas) * 35 +
    Math.min(25, urgentes * 8) +
    Math.min(25, vencidas * 6) +
    Math.min(15, (pendentes / totalMaquinas) * 15);
  const pontuacao = Math.max(0, Math.min(100, Math.round(100 - penalidade)));

  const fatoresNegativos: string[] = [];
  const fatoresPositivos: string[] = [];
  if (paradas > 0) fatoresNegativos.push(`${paradas} máquina(s) parada(s)`); else fatoresPositivos.push('Nenhuma máquina parada');
  if (urgentes > 0) fatoresNegativos.push(`${urgentes} chamado(s) urgente(s)`); else fatoresPositivos.push('Nenhum chamado urgente aberto');
  if (vencidas > 0) fatoresNegativos.push(`${vencidas} preventiva(s) vencida(s)`); else fatoresPositivos.push('Nenhuma preventiva vencida');
  if (pendentes > 0) fatoresNegativos.push(`${pendentes} horímetro(s) pendente(s)`); else fatoresPositivos.push('Horímetros atualizados hoje');

  return {
    pontuacao,
    classificacao: pontuacao >= 90 ? 'excelente' : pontuacao >= 75 ? 'boa' : pontuacao >= 50 ? 'atencao' : 'critica',
    fatoresPositivos,
    fatoresNegativos,
    confiabilidade: qualidade.nivel === 'boa' ? 'alta' : qualidade.nivel === 'parcial' ? 'media' : 'baixa',
  };
}
