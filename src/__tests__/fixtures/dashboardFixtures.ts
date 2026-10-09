import type {
  Chamado,
  HistoricoPreventiva,
  LeituraHorimetro,
  Maquina,
  OperacaoDiaria,
  PreventivaMaquina,
} from '../../types/controlmaq';
import type { DashboardDadosFonte } from '../../types/dashboard';

export const REFERENCIA = new Date(2026, 6, 21, 12, 0, 0);

export function maquina(overrides: Partial<Maquina> = {}): Maquina {
  return {
    id: 1,
    tag: 'EQ-001',
    modelo: 'Modelo X',
    marca: 'Marca',
    horimetro: 1000,
    status_maquina: 'Operacional',
    observacao: null,
    intervalo_preventiva_horas: 250,
    horimetro_ultima_preventiva: 900,
    preventiva_atualizada_em: '2026-07-01T12:00:00-03:00',
    created_at: '2026-01-01T12:00:00-03:00',
    ...overrides,
  };
}

export function chamado(overrides: Partial<Chamado> = {}): Chamado {
  return {
    id: 1,
    maquina: 'EQ-001',
    cliente: null,
    solicitante: 'Operador',
    telefone: null,
    local: 'Obra',
    problema: 'Falha simulada',
    prioridade: 'Baixa',
    status: 'Aberto',
    mecanico: null,
    solucao: null,
    criado_por: null,
    finalizado_por: null,
    iniciado_at: null,
    finalizado_at: null,
    observacao_interna: null,
    diagnostico_tecnico: null,
    maquina_liberada: null,
    necessita_retorno: null,
    motivo_reabertura: null,
    motivo_edicao: null,
    foto_problema_url: null,
    created_at: '2026-07-21T09:00:00-03:00',
    ...overrides,
  };
}

export function leitura(overrides: Partial<LeituraHorimetro> = {}): LeituraHorimetro {
  return {
    id: 1,
    maquina_id: 1,
    maquina_tag: 'EQ-001',
    horimetro: 1000,
    operador_id: 'op-1',
    operador_nome: 'João',
    observacao: null,
    origem: 'atualizacao',
    created_at: '2026-07-21T08:00:00-03:00',
    ...overrides,
  };
}

export function preventiva(overrides: Partial<PreventivaMaquina> = {}): PreventivaMaquina {
  return {
    maquina_id: 1,
    tag: 'EQ-001',
    marca: 'Marca',
    modelo: 'Modelo X',
    horimetro_atual: 1000,
    intervalo_preventiva_horas: 250,
    horimetro_ultima_preventiva: 900,
    proxima_preventiva_horimetro: 1150,
    horas_restantes: 150,
    status_preventiva: 'Em dia',
    status_maquina: 'Operacional',
    observacao: null,
    preventiva_atualizada_em: '2026-07-01T12:00:00-03:00',
    created_at: '2026-01-01T12:00:00-03:00',
    ...overrides,
  };
}

export function dados(overrides: Partial<DashboardDadosFonte> = {}): DashboardDadosFonte {
  return {
    chamados: [],
    maquinas: [maquina()],
    leiturasHorimetro: [leitura()],
    operacoesDiarias: [] as OperacaoDiaria[],
    preventivas: [preventiva()],
    historicoPreventivas: [] as HistoricoPreventiva[],
    dataReferencia: new Date(REFERENCIA),
    ...overrides,
  };
}
