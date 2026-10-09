import { supabase } from '../lib/supabase';

import type {
  HistoricoPreventiva,
  Maquina,
  PreventivaMaquina,
} from '../types/controlmaq';

type ConfigurarPreventivaParametros = {
  maquinaId: number;
  intervaloHoras: number;
  horimetroUltimaPreventiva: number;
};

type RegistrarPreventivaParametros = {
  maquinaId: number;
  horimetroPreventiva: number;
  mecanicoResponsavel?: string;
  observacao?: string;
  registradoPor?: string;
};

// Novo tipo de parâmetro para o ajuste do Admin
type AtualizarHorimetroAdminParametros = {
  maquinaId: number;
  novoHorimetro: number;
  justificativa?: string;
  usuarioAtual: {
    id: string | number;
    tipo: string; // Ex: 'admin'
    nome?: string;
  };
};

function montarMensagemErro(erro: unknown, mensagemPadrao: string): string {
  if (!erro) {
    return mensagemPadrao;
  }

  if (erro instanceof Error) {
    return erro.message || mensagemPadrao;
  }

  if (typeof erro === 'object') {
    const erroSupabase = erro as {
      message?: string;
      details?: string;
      hint?: string;
    };

    return (
      erroSupabase.message ||
      erroSupabase.details ||
      erroSupabase.hint ||
      mensagemPadrao
    );
  }

  return String(erro);
}

export async function carregarPreventivas(): Promise<PreventivaMaquina[]> {
  const { data, error } = await supabase
    .from('controlmaq_preventivas')
    .select('*')
    .order('tag', { ascending: true });

  if (error) {
    throw new Error(
      montarMensagemErro(error, 'Não foi possível carregar as preventivas.')
    );
  }

  return (data || []) as PreventivaMaquina[];
}

export async function carregarHistoricoPreventivas(): Promise<
  HistoricoPreventiva[]
> {
  const { data, error } = await supabase
    .from('historico_preventivas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      montarMensagemErro(
        error,
        'Não foi possível carregar o histórico de preventivas.'
      )
    );
  }

  return (data || []) as HistoricoPreventiva[];
}

export async function configurarPreventiva(
  parametros: ConfigurarPreventivaParametros
): Promise<Maquina> {
  const { maquinaId, intervaloHoras, horimetroUltimaPreventiva } = parametros;

  if (!Number.isFinite(maquinaId) || maquinaId <= 0) {
    throw new Error('Informe uma máquina válida.');
  }

  if (!Number.isFinite(intervaloHoras) || intervaloHoras <= 0) {
    throw new Error('O intervalo da preventiva deve ser maior que zero.');
  }

  if (
    !Number.isFinite(horimetroUltimaPreventiva) ||
    horimetroUltimaPreventiva < 0
  ) {
    throw new Error('Informe um horímetro válido para a última preventiva.');
  }

  const { data, error } = await supabase.rpc(
    'controlmaq_configurar_preventiva',
    {
      p_maquina_id: maquinaId,
      p_intervalo_preventiva_horas: intervaloHoras,
      p_horimetro_ultima_preventiva: horimetroUltimaPreventiva,
    }
  );

  if (error) {
    throw new Error(
      montarMensagemErro(error, 'Não foi possível configurar a preventiva.')
    );
  }

  if (!data) {
    throw new Error('O banco não retornou a máquina atualizada.');
  }

  return data as Maquina;
}

export async function registrarPreventiva(
  parametros: RegistrarPreventivaParametros
): Promise<Maquina> {
  const {
    maquinaId,
    horimetroPreventiva,
    mecanicoResponsavel,
    observacao,
    registradoPor,
  } = parametros;

  if (!Number.isFinite(maquinaId) || maquinaId <= 0) {
    throw new Error('Informe uma máquina válida.');
  }

  if (!Number.isFinite(horimetroPreventiva) || horimetroPreventiva < 0) {
    throw new Error('Informe um horímetro válido para a preventiva.');
  }

  const { data, error } = await supabase.rpc(
    'controlmaq_registrar_preventiva',
    {
      p_maquina_id: maquinaId,
      p_horimetro_preventiva: horimetroPreventiva,
      p_mecanico_responsavel: mecanicoResponsavel?.trim() || null,
      p_observacao: observacao?.trim() || null,
      p_registrado_por: registradoPor?.trim() || null,
    }
  );

  if (error) {
    throw new Error(
      montarMensagemErro(error, 'Não foi possível registrar a preventiva.')
    );
  }

  if (!data) {
    throw new Error('O banco não retornou a máquina atualizada.');
  }

  return data as Maquina;
}

/**
 * Função exclusiva para Administradores forçarem a correção de um horímetro.
 */
export async function atualizarHorimetroAdministrativo(
  parametros: AtualizarHorimetroAdminParametros
): Promise<Maquina> {
  const { maquinaId, novoHorimetro, justificativa, usuarioAtual } = parametros;

  // 1. Validação de segurança no nível da função
  if (usuarioAtual?.tipo !== 'admin') {
    throw new Error(
      'Acesso negado: Apenas administradores podem alterar horímetros manualmente.'
    );
  }

  if (!Number.isFinite(maquinaId) || maquinaId <= 0) {
    throw new Error('Informe uma máquina válida.');
  }

  if (!Number.isFinite(novoHorimetro) || novoHorimetro < 0) {
    throw new Error('Informe um valor de horímetro válido.');
  }

  // 2. Atualiza a máquina com o novo horímetro diretamente
  const { data: maquinaAtualizada, error } = await supabase
    .from('maquinas')
    .update({
      horimetro_atual: novoHorimetro,
      updated_at: new Date().toISOString(),
    })
    .eq('id', maquinaId)
    .select()
    .single();

  if (error) {
    throw new Error(
      montarMensagemErro(error, 'Falha ao atualizar o horímetro da máquina.')
    );
  }

  // 3. Opcional: Registra o log da alteração no banco para auditoria
  await supabase
    .from('logs_sistema')
    .insert({
      acao: 'AJUSTE_MANUAL_HORIMETRO',
      maquina_id: maquinaId,
      novo_valor: novoHorimetro,
      usuario_id: usuarioAtual.id,
      detalhes: justificativa || 'Ajuste manual feito pelo Administrador',
      created_at: new Date().toISOString(),
    })
    .catch(() => {
      // Ignora erro de log para não travar a operação principal caso a tabela não exista
    });

  return maquinaAtualizada as Maquina;
}
