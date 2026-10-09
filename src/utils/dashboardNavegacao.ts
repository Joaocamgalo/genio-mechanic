import type {
  Chamado,
  Maquina,
  Tela,
  FiltroChamado,
  FiltroPreventiva,
} from '../types/controlmaq';

export type AcaoDashboard =
  | { tipo: 'abrirChamado'; chamadoId: number }
  | { tipo: 'novoChamado' }
  | { tipo: 'irParaChamados' }
  | {
      tipo: 'irParaChamadosFiltrados';
      filtro: 'Aberto' | 'Assumido' | 'Finalizado';
    }
  | { tipo: 'irParaMaquinas'; status?: 'Todos' | 'Operacional' | 'Parada' | 'Em manutenção' }
  | { tipo: 'irParaHorimetros' }
  | { tipo: 'irParaPreventivas'; status?: FiltroPreventiva }
  | { tipo: 'irParaRelatorios' }
  | { tipo: 'irParaIndicadores' }
  | { tipo: 'irParaBackup' }
  | { tipo: 'irParaHistoricoMaquina' }
  | { tipo: 'irParaUsuarios' };

interface NavegacaoContexto {
  chamados: Chamado[];
  maquinas: Maquina[];
  abrirChamado: (chamado: Chamado) => void;
  setTela: (tela: Tela) => void;
  setFiltroChamados: (filtro: FiltroChamado) => void;
  setFiltroPrioridadeChamados?: (p: string) => void;
  setFiltroMaquinaChamados?: (m: string) => void;
  setFiltroMecanicoChamados?: (mec: string) => void;
  setFiltroDataInicioChamados?: (d: string) => void;
  setFiltroDataFimChamados?: (d: string) => void;
  setFiltroPreventivas?: (f: FiltroPreventiva) => void;
  setBuscaPreventivas?: (b: string) => void;
  setFiltroControleHorimetros?: (f: any) => void;
  setBuscaControleHorimetros?: (b: string) => void;
  setBuscaChamados?: (b: string) => void;
  setBuscaMaquinas?: (b: string) => void;
  setMaquinaSelecionada?: (m: string) => void;
  setFiltroStatusMaquina?: (status: 'Todos' | 'Operacional' | 'Parada' | 'Em manutenção') => void;
}

export function executarAcaoDashboard(
  acao: AcaoDashboard,
  contexto: NavegacaoContexto
) {
  switch (acao.tipo) {
    case 'abrirChamado': {
      const chamadoEncontrado = contexto.chamados.find(
        (c) => c.id === acao.chamadoId
      );
      if (chamadoEncontrado) {
        contexto.abrirChamado(chamadoEncontrado);
      } else {
        contexto.setTela('chamados');
      }
      break;
    }

    case 'novoChamado': {
      contexto.setTela('novoChamado');
      break;
    }

    case 'irParaChamados': {
      contexto.setFiltroChamados('Todos');
      if (contexto.setBuscaChamados) contexto.setBuscaChamados('');
      contexto.setTela('chamados');
      break;
    }

    case 'irParaChamadosFiltrados': {
      contexto.setFiltroChamados(acao.filtro);
      if (contexto.setBuscaChamados) contexto.setBuscaChamados('');
      contexto.setTela('chamados');
      break;
    }

    case 'irParaMaquinas': {
      if (acao.status && contexto.setFiltroStatusMaquina) {
        contexto.setFiltroStatusMaquina(acao.status);
      } else if (contexto.setFiltroStatusMaquina) {
        contexto.setFiltroStatusMaquina('Todos');
      }
      if (contexto.setBuscaMaquinas) contexto.setBuscaMaquinas('');
      contexto.setTela('maquinas');
      break;
    }

    case 'irParaPreventivas': {
      if (acao.status && contexto.setFiltroPreventivas) {
        contexto.setFiltroPreventivas(acao.status);
      } else if (contexto.setFiltroPreventivas) {
        contexto.setFiltroPreventivas('Todos');
      }
      if (contexto.setBuscaPreventivas) contexto.setBuscaPreventivas('');
      contexto.setTela('preventivas');
      break;
    }

    case 'irParaHorimetros': {
      contexto.setTela('horimetros');
      break;
    }

    default:
      break;
  }
}