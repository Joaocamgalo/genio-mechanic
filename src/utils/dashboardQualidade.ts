import type { DashboardDadosFonte, DashboardQualidadeDados } from '../types/dashboard';

export function avaliarQualidadeDados(dados: DashboardDadosFonte): DashboardQualidadeDados {
  const avisos: string[] = [];
  if (dados.maquinas.length === 0) avisos.push('Nenhuma máquina cadastrada.');
  if (dados.chamados.some((item) => !item.created_at)) avisos.push('Existem chamados sem data de criação disponível.');
  if (dados.chamados.some((item) => item.status === 'Finalizado' && !item.finalizado_at)) avisos.push('Existem chamados finalizados sem data de conclusão.');
  if (dados.maquinas.some((item) => item.horimetro === null)) avisos.push('Existem máquinas sem horímetro atual.');
  if (dados.preventivas.length < dados.maquinas.length) avisos.push('Nem todas as máquinas possuem dados de preventiva.');

  if (dados.maquinas.length === 0) return { nivel: 'insuficiente', avisos };
  if (avisos.length > 0) return { nivel: 'parcial', avisos };
  return { nivel: 'boa', avisos };
}
