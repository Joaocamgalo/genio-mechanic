export type Tela =
  | 'login'
  | 'dashboard'
  | 'novoChamado'
  | 'editarChamado'
  | 'chamados'
  | 'usuarios'
  | 'novoUsuario'
  | 'maquinas'
  | 'novaMaquina'
  | 'finalizarChamado'
  | 'relatorioMensal'
  | 'historicoMaquina'
  | 'detalhesChamado'
  | 'manualUso'
  | 'backupExportacao'
  | 'indicadores'
  | 'operacaoDiaria'
  | 'horimetros'
  | 'preventivas';

export type StatusChamado = 'Aberto' | 'Assumido' | 'Finalizado';

export type PerfilUsuario = 'admin' | 'mecanico' | 'operador';

export type FiltroChamado = 'Todos' | 'Ativos' | 'Aberto' | 'Assumido' | 'Finalizado';

export type StatusPreventiva =
  | 'Em dia'
  | 'Atenção'
  | 'Urgente'
  | 'Vencida'
  | 'Não configurada'
  | 'Sem horímetro';

export type FiltroPreventiva =
  | 'Todos'
  | 'Em dia'
  | 'Atenção'
  | 'Urgente'
  | 'Vencida'
  | 'Não configurada';

export type Usuario = {
  id: string;
  nome: string;
  login: string;
  senha: string;
  tipo: PerfilUsuario;
  ativo?: boolean;
  ultimo_acesso?: string | null;
  created_at?: string;
};

export type Maquina = {
  id: number;
  tag: string;
  modelo: string;
  marca: string;
  horimetro: number | null;
  status_maquina: 'Operacional' | 'Em manutenção' | 'Parada';
  observacao: string | null;
  intervalo_preventiva_horas?: number | null;
  horimetro_ultima_preventiva?: number | null;
  preventiva_atualizada_em?: string | null;
  created_at?: string;
};

export type Chamado = {
  id: number;
  maquina: string;
  cliente: string | null;
  solicitante: string;
  telefone: string | null;
  local: string;
  problema: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: StatusChamado;
  mecanico: string | null;
  solucao: string | null;
  criado_por: string | null;
  finalizado_por: string | null;
  iniciado_at: string | null;
  finalizado_at: string | null;
  observacao_interna: string | null;
  diagnostico_tecnico: string | null;
  maquina_liberada: boolean | null;
  necessita_retorno: boolean | null;
  motivo_reabertura: string | null;
  motivo_edicao: string | null;
  foto_problema_url: string | null;
  created_at?: string;
};

export type LeituraHorimetro = {
  id: number;
  maquina_id: number;
  maquina_tag: string;
  horimetro: number;
  operador_id: string;
  operador_nome: string;
  observacao: string | null;
  origem: 'login_diario' | 'atualizacao' | 'encerramento';
  created_at?: string;
};

export type OperacaoDiaria = {
  id: number;
  operador_id: string;
  operador_nome: string;
  maquina_id: number;
  maquina_tag: string;
  horimetro_inicial: number;
  horimetro_final: number | null;
  observacao: string | null;
  iniciado_at: string;
  encerrado_at: string | null;
  ativo: boolean;
  created_at?: string;
};

export type HistoricoChamado = {
  id?: number;
  chamado_id: number;
  acao: string;
  usuario: string | null;
  created_at?: string;
};

export type PreventivaMaquina = {
  maquina_id: number;
  tag: string;
  marca: string;
  modelo: string;
  horimetro_atual: number | null;
  intervalo_preventiva_horas: number | null;
  horimetro_ultima_preventiva: number | null;
  proxima_preventiva_horimetro: number | null;
  horas_restantes: number | null;
  status_preventiva: StatusPreventiva;
  status_maquina: 'Operacional' | 'Em manutenção' | 'Parada';
  observacao: string | null;
  preventiva_atualizada_em: string | null;
  created_at?: string;
};

export type HistoricoPreventiva = {
  id: number;
  maquina_id: number;
  maquina_tag: string;
  horimetro_preventiva: number;
  intervalo_preventiva_horas: number;
  proxima_preventiva_horimetro: number;
  mecanico_responsavel: string | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at?: string;
};
