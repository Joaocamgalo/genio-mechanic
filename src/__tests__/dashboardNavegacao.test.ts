import { describe, expect, it, vi } from 'vitest';
import { executarAcaoDashboard } from '../utils/dashboardNavegacao';
import { chamado, maquina } from './fixtures/dashboardFixtures';

function contexto() {
  return {
    chamados: [chamado()],
    maquinas: [maquina()],
    abrirChamado: vi.fn(),
    setTela: vi.fn(),
    setFiltroChamados: vi.fn(),
    setFiltroPrioridadeChamados: vi.fn(),
    setFiltroMaquinaChamados: vi.fn(),
    setFiltroMecanicoChamados: vi.fn(),
    setFiltroDataInicioChamados: vi.fn(),
    setFiltroDataFimChamados: vi.fn(),
    setFiltroPreventivas: vi.fn(),
    setBuscaPreventivas: vi.fn(),
    setBuscaChamados: vi.fn(),
    setBuscaMaquinas: vi.fn(),
    setMaquinaSelecionada: vi.fn(),
    setFiltroControleHorimetros: vi.fn(),
    setBuscaControleHorimetros: vi.fn(),
  };
}

describe('navegação do dashboard', () => {
  it('limpa filtros incompatíveis e aplica prioridade urgente', () => {
    const ctx = contexto();
    executarAcaoDashboard({
      tipo: 'navegar',
      destino: 'chamados',
      rotulo: 'Ver urgentes',
      filtro: { status: 'Ativos', prioridade: 'Urgente' },
    }, ctx);
    expect(ctx.setFiltroChamados).toHaveBeenLastCalledWith('Ativos');
    expect(ctx.setFiltroPrioridadeChamados).toHaveBeenLastCalledWith('Urgente');
    expect(ctx.setFiltroMaquinaChamados).toHaveBeenCalledWith('');
    expect(ctx.setTela).toHaveBeenCalledWith('chamados');
  });

  it('abre chamado existente diretamente', () => {
    const ctx = contexto();
    executarAcaoDashboard({
      tipo: 'abrir_chamado', destino: 'detalhesChamado', entidadeId: 1, rotulo: 'Abrir',
    }, ctx);
    expect(ctx.abrirChamado).toHaveBeenCalledOnce();
    expect(ctx.setTela).not.toHaveBeenCalled();
  });

  it('usa fallback seguro para máquina inexistente', () => {
    const ctx = contexto();
    executarAcaoDashboard({
      tipo: 'abrir_maquina', destino: 'historicoMaquina', entidadeId: 999, rotulo: 'Abrir',
    }, ctx);
    expect(ctx.setBuscaMaquinas).toHaveBeenCalledWith('');
    expect(ctx.setMaquinaSelecionada).toHaveBeenCalledWith('');
    expect(ctx.setTela).toHaveBeenCalledWith('historicoMaquina');
  });
});
