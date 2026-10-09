import type {
  Chamado,
  HistoricoPreventiva,
  LeituraHorimetro,
  Maquina,
  OperacaoDiaria,
  PreventivaMaquina,
  Tela,
} from './controlmaq';

export type DashboardCriticidade =
  | 'informativa'
  | 'baixa'
  | 'media'
  | 'alta'
  | 'critica';

export type DashboardPeriodoPreset =
  | 'hoje'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'personalizado';

export type DashboardFiltroPeriodo = {
  preset: DashboardPeriodoPreset;
  inicio?: string;
  fim?: string;
};

export type DashboardIntervalo = {
  inicio: string;
  fim: string;
  inicioAnterior: string;
  fimAnterior: string;
};

export type DashboardDadosFonte = {
  chamados: readonly Chamado[];
  maquinas: readonly Maquina[];
  leiturasHorimetro: readonly LeituraHorimetro[];
  operacoesDiarias: readonly OperacaoDiaria[];
  preventivas: readonly PreventivaMaquina[];
  historicoPreventivas: readonly HistoricoPreventiva[];
  dataReferencia: Date;
};

export type DashboardKpiId =
  | 'chamados_abertos'
  | 'chamados_urgentes'
  | 'chamados_finalizados_periodo'
  | 'maquinas_paradas'
  | 'preventivas_vencidas'
  | 'horimetros_pendentes';

export type DashboardTendencia = 'melhora' | 'piora' | 'estavel' | 'sem_comparacao';

export type DashboardTendenciaOperacionalId =
  | 'chamados_criados'
  | 'chamados_finalizados'
  | 'chamados_urgentes';

export type DashboardTendenciaOperacional = {
  id: DashboardTendenciaOperacionalId;
  titulo: string;
  atual: number;
  anterior: number;
  variacaoPercentual: number | null;
  tendencia: DashboardTendencia;
  contexto: string;
};

export type DashboardKpi = {
  id: DashboardKpiId;
  titulo: string;
  valor: number;
  valorAnterior: number | null;
  variacaoPercentual: number | null;
  tendencia: DashboardTendencia;
  criticidade: DashboardCriticidade;
};

export type DashboardFiltroAcao = {
  status?: 'Todos' | 'Ativos' | 'Aberto' | 'Assumido' | 'Finalizado';
  prioridade?: Chamado['prioridade'];
  busca?: string;
  maquina?: string;
  preventivaStatus?: PreventivaMaquina['status_preventiva'];
  horimetroPendente?: boolean;
};

export type DashboardAcao = {
  tipo: 'navegar' | 'abrir_chamado' | 'abrir_maquina' | 'aplicar_filtro';
  destino: Tela;
  rotulo: string;
  entidadeId?: number | string;
  filtro?: DashboardFiltroAcao;
};

export type DashboardGrupoAlerta = 'criticas' | 'atencao' | 'pendencias';

export type DashboardTipoAlerta =
  | 'chamado_urgente_sem_responsavel'
  | 'chamado_urgente_assumido'
  | 'maquina_parada'
  | 'maquina_em_manutencao'
  | 'preventiva_vencida'
  | 'preventiva_urgente'
  | 'horimetro_pendente'
  | 'chamado_antigo'
  | 'recorrencia_chamados';

export type DashboardAlerta = {
  id: string;
  tipo: DashboardTipoAlerta;
  titulo: string;
  descricao: string;
  criticidade: DashboardCriticidade;
  prioridade: number;
  quantidade?: number;
  entidadeId?: number | string;
  entidadeNome?: string;
  acao: DashboardAcao;
  grupo?: DashboardGrupoAlerta;
  chaveAgrupamento?: string;
  detalhes?: string[];
};

export type DashboardFatorRisco = {
  codigo: string;
  descricao: string;
  pontos: number;
};

export type DashboardRiscoMaquina = {
  maquinaId: number;
  tag: string;
  pontuacao: number;
  nivel: DashboardCriticidade;
  fatores: DashboardFatorRisco[];
};

export type DashboardSaudeOperacional = {
  pontuacao: number;
  classificacao: 'excelente' | 'boa' | 'atencao' | 'critica';
  fatoresPositivos: string[];
  fatoresNegativos: string[];
  confiabilidade: 'alta' | 'media' | 'baixa';
};

export type DashboardQualidadeDados = {
  nivel: 'boa' | 'parcial' | 'insuficiente';
  avisos: string[];
};

export type DashboardResumoDestaque = {
  texto: string;
  criticidade: DashboardCriticidade;
};

export type DashboardResumoExecutivo = {
  titulo: string;
  mensagemPrincipal: string;
  destaques: DashboardResumoDestaque[];
  quantidadeSituacoesCriticas: number;
  proximaAcao: DashboardAcao | null;
};

export type DashboardExecutivoResultado = {
  geradoEm: string;
  periodo: DashboardIntervalo;
  kpis: DashboardKpi[];
  alertas: DashboardAlerta[];
  riscosMaquinas: DashboardRiscoMaquina[];
  tendenciasOperacionais: DashboardTendenciaOperacional[];
  saudeOperacional: DashboardSaudeOperacional;
  resumoExecutivo: DashboardResumoExecutivo;
  qualidadeDados: DashboardQualidadeDados;
};

export type DashboardConfiguracao = {
  limiteChamadoAntigoHoras: number;
  limiteRecorrenciaChamados: number;
  toleranciaTendenciaPercentual: number;
  pesosRisco: {
    maquinaParada: number;
    maquinaEmManutencao: number;
    chamadoUrgente: number;
    chamadoAberto: number;
    preventivaVencida: number;
    preventivaUrgente: number;
    horimetroPendente: number;
    recorrencia: number;
  };
};
