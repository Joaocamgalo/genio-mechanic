import type { DashboardAlerta, DashboardResumoExecutivo, DashboardSaudeOperacional } from '../types/dashboard';

function alertasPrioritarios(alertas: readonly DashboardAlerta[]): DashboardAlerta[] {
  return alertas.filter((item) => item.criticidade === 'critica' || item.criticidade === 'alta');
}

export function gerarResumoExecutivo(
  saude: DashboardSaudeOperacional,
  alertas: readonly DashboardAlerta[],
): DashboardResumoExecutivo {
  const criticos = alertas.filter((item) => item.criticidade === 'critica');
  const prioritarios = alertasPrioritarios(alertas);
  const destaques = (prioritarios.length > 0 ? prioritarios : alertas).slice(0, 4);

  const titulo = saude.classificacao === 'excelente' ? 'Operação saudável' :
    saude.classificacao === 'boa' ? 'Operação sob controle' :
    saude.classificacao === 'atencao' ? 'A operação exige atenção' : 'Situação operacional crítica';

  let mensagemPrincipal: string;

  if (alertas.length === 0) {
    mensagemPrincipal = 'Não existem situações operacionais pendentes identificadas neste momento.';
  } else if (prioritarios.length > 0) {
    mensagemPrincipal = `Existem ${prioritarios.length} situação(ões) prioritária(s) neste momento, sendo ${criticos.length} crítica(s).`;
  } else {
    mensagemPrincipal = `Existem ${alertas.length} pendência(s) de acompanhamento, sem situação crítica ou de alta prioridade.`;
  }

  return {
    titulo,
    mensagemPrincipal,
    destaques: destaques.map((item) => ({ texto: item.titulo, criticidade: item.criticidade })),
    quantidadeSituacoesCriticas: criticos.length,
    proximaAcao: (prioritarios[0] || alertas[0])?.acao || null,
  };
}
