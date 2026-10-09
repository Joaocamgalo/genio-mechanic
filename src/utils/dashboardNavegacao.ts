import type { Chamado, FiltroChamado, FiltroPreventiva, Maquina, Tela } from '../types/controlmaq';
import type { DashboardAcao, DashboardFiltroAcao } from '../types/dashboard';

type DashboardNavegacaoContexto = {
  chamados: readonly Chamado[];
  maquinas: readonly Maquina[];
  abrirChamado: (chamado: Chamado) => void;
  setTela: (tela: Tela) => void;
  setFiltroChamados: (filtro: FiltroChamado) => void;
  setFiltroPrioridadeChamados: (valor: string) => void;
  setFiltroMaquinaChamados: (valor: string) => void;
  setFiltroMecanicoChamados: (valor: string) => void;
  setFiltroDataInicioChamados: (valor: string) => void;
  setFiltroDataFimChamados: (valor: string) => void;
  setFiltroPreventivas: (filtro: FiltroPreventiva) => void;
  setBuscaPreventivas: (valor: string) => void;
  setFiltroControleHorimetros: (valor: 'todos' | 'atualizados' | 'pendentes') => void;
  setBuscaControleHorimetros: (valor: string) => void;
  setBuscaChamados: (valor: string) => void;
  setBuscaMaquinas: (valor: string) => void;
  setMaquinaSelecionada: (valor: string) => void;
};

function limparFiltrosChamados(contexto: DashboardNavegacaoContexto): void {
  contexto.setFiltroChamados('Todos');
  contexto.setFiltroPrioridadeChamados('');
  contexto.setFiltroMaquinaChamados('');
  contexto.setFiltroMecanicoChamados('');
  contexto.setFiltroDataInicioChamados('');
  contexto.setFiltroDataFimChamados('');
  contexto.setBuscaChamados('');
}

function aplicarFiltroChamados(
  filtro: DashboardFiltroAcao | undefined,
  contexto: DashboardNavegacaoContexto,
): void {
  limparFiltrosChamados(contexto);
  if (!filtro) return;

  if (filtro.status) contexto.setFiltroChamados(filtro.status);
  if (filtro.prioridade) contexto.setFiltroPrioridadeChamados(filtro.prioridade);
  if (filtro.maquina) contexto.setFiltroMaquinaChamados(filtro.maquina);
  if (filtro.busca) contexto.setBuscaChamados(filtro.busca);
}

function aplicarFiltroPreventivas(
  filtro: DashboardFiltroAcao | undefined,
  contexto: DashboardNavegacaoContexto,
): void {
  contexto.setFiltroPreventivas('Todos');
  contexto.setBuscaPreventivas('');
  if (filtro?.preventivaStatus && filtro.preventivaStatus !== 'Sem horímetro') {
    contexto.setFiltroPreventivas(filtro.preventivaStatus);
  }
  if (filtro?.maquina) contexto.setBuscaPreventivas(filtro.maquina);
}

export function executarAcaoDashboard(
  acao: DashboardAcao,
  contexto: DashboardNavegacaoContexto,
): void {
  if (acao.tipo === 'abrir_chamado' && acao.entidadeId !== undefined) {
    const chamado = contexto.chamados.find((item) => String(item.id) === String(acao.entidadeId));
    if (chamado) {
      contexto.abrirChamado(chamado);
      return;
    }
  }

  if (acao.tipo === 'abrir_maquina' && acao.entidadeId !== undefined) {
    const maquina = contexto.maquinas.find((item) => String(item.id) === String(acao.entidadeId));
    if (maquina) {
      contexto.setMaquinaSelecionada(maquina.tag);
      contexto.setBuscaMaquinas(maquina.tag);
    } else {
      contexto.setBuscaMaquinas('');
      contexto.setMaquinaSelecionada('');
    }
  }

  if (acao.destino === 'chamados') aplicarFiltroChamados(acao.filtro, contexto);
  if (acao.destino === 'preventivas') aplicarFiltroPreventivas(acao.filtro, contexto);
  if (acao.destino === 'horimetros') {
    contexto.setBuscaControleHorimetros(acao.filtro?.maquina ?? '');
    contexto.setFiltroControleHorimetros(acao.filtro?.horimetroPendente ? 'pendentes' : 'todos');
  }
  contexto.setTela(acao.destino);
}
