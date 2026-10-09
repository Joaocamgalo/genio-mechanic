import { supabase } from '../lib/supabase';

export type IniciarOperacaoInput = {
  operadorId: string;
  operadorNome: string;
  maquinaId: number;
  maquinaTag: string;
  horimetro: number;
  observacao?: string;
};

export type EncerrarOperacaoInput = {
  operacaoId: number;
  operadorId: string;
  operadorNome: string;
  maquinaId: number;
  maquinaTag: string;
  horimetroFinal: number;
  observacao?: string;
};

// Novo tipo de parâmetro para edição administrativa de horímetro
export type EditarHorimetroOperacaoInput = {
  operacaoId: number;
  maquinaId: number;
  novoHorimetroInicial?: number;
  novoHorimetroFinal?: number;
  justificativa?: string;
  usuarioAtual: {
    id: string | number;
    tipo: string; // Ex: 'admin'
  };
};

export async function iniciarOperacao(
  input: IniciarOperacaoInput
): Promise<number> {
  const { data, error } = await supabase.rpc('controlmaq_iniciar_operacao', {
    p_operador_id: input.operadorId,
    p_operador_nome: input.operadorNome,
    p_maquina_id: input.maquinaId,
    p_maquina_tag: input.maquinaTag,
    p_horimetro: input.horimetro,
    p_observacao: input.observacao?.trim() || null,
  });

  if (error) {
    throw error;
  }

  if (data === null || data === undefined) {
    throw new Error('O banco não retornou a operação criada.');
  }

  return Number(data);
}

export async function encerrarOperacao(
  input: EncerrarOperacaoInput
): Promise<boolean> {
  const { data, error } = await supabase.rpc('controlmaq_encerrar_operacao', {
    p_operacao_id: input.operacaoId,
    p_operador_id: input.operadorId,
    p_operador_nome: input.operadorNome,
    p_maquina_id: input.maquinaId,
    p_maquina_tag: input.maquinaTag,
    p_horimetro_final: input.horimetroFinal,
    p_observacao: input.observacao?.trim() || null,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/**
 * Permite ao Administrador ajustar manualmente os horímetros de um registro de operação.
 */
export async function editarHorimetroOperacao(
  input: EditarHorimetroOperacaoInput
): Promise<boolean> {
  // 1. Validação do perfil de administrador
  if (input.usuarioAtual?.tipo !== 'admin') {
    throw new Error(
      'Acesso negado: Apenas administradores podem ajustar horímetros.'
    );
  }

  const updates: Record<string, any> = {};

  if (input.novoHorimetroInicial !== undefined) {
    if (
      !Number.isFinite(input.novoHorimetroInicial) ||
      input.novoHorimetroInicial < 0
    ) {
      throw new Error('Informe um horímetro inicial válido.');
    }
    updates.horimetro_inicial = input.novoHorimetroInicial;
  }

  if (input.novoHorimetroFinal !== undefined) {
    if (
      !Number.isFinite(input.novoHorimetroFinal) ||
      input.novoHorimetroFinal < 0
    ) {
      throw new Error('Informe um horímetro final válido.');
    }
    updates.horimetro_final = input.novoHorimetroFinal;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error(
      'Nenhum valor de horímetro foi informado para atualização.'
    );
  }

  // 2. Atualiza os horímetros no registro de operação diária
  const { error: erroOperacao } = await supabase
    .from('operacoes_diarias')
    .update(updates)
    .eq('id', input.operacaoId);

  if (erroOperacao) {
    throw erroOperacao;
  }

  // 3. Atualiza o horímetro atual da máquina caso o horímetro final editado seja o maior registrado
  const maiorHorimetro = input.novoHorimetroFinal ?? input.novoHorimetroInicial;
  if (maiorHorimetro !== undefined) {
    await supabase
      .from('maquinas')
      .update({ horimetro_atual: maiorHorimetro })
      .eq('id', input.maquinaId)
      .lt('horimetro_atual', maiorHorimetro);
  }

  return true;
}

export function mensagemErroOperacao(erro: unknown): string {
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const mensagem = String(
      (erro as { message?: unknown }).message || ''
    ).trim();

    if (mensagem) {
      return mensagem;
    }
  }

  return 'Ocorreu um erro inesperado ao registrar a operação.';
}
