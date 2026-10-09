import type { Chamado } from '../types/controlmaq';

export const CHAVE_USUARIO_LOGADO = 'controlmaq_usuario_logado';

export function normalizarTexto(valor?: string | null): string {
  return (valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte uma data para YYYY-MM-DD respeitando o fuso horário local
 * do dispositivo. Não utiliza toISOString(), pois esse método converte
 * a data para UTC e pode trocar o dia no Brasil durante a noite.
 */
export function dataLocalISO(data: Date | string = new Date()): string {
  const valor = data instanceof Date ? data : new Date(data);

  if (!Number.isFinite(valor.getTime())) {
    return '';
  }

  const ano = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

export function hojeISO(): string {
  return dataLocalISO();
}

export function primeiroDiaMesISO(): string {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');

  return `${ano}-${mes}-01`;
}

export function minutosDesdeData(data?: string | null): number | null {
  if (!data) {
    return null;
  }

  const base = new Date(data).getTime();

  if (!Number.isFinite(base)) {
    return null;
  }

  const minutos = Math.round((Date.now() - base) / 60000);

  if (minutos < 0) {
    return null;
  }

  return minutos;
}

export function formatarMinutosOperacional(
  minutos?: number | null
): string {
  if (minutos === null || minutos === undefined || !Number.isFinite(minutos)) {
    return 'Não informado';
  }

  if (minutos < 60) {
    return `${minutos}min`;
  }

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (horas < 24) {
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  }

  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;

  return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
}

export function pesoPrioridade(prioridade?: string | null): number {
  if (prioridade === 'Urgente') return 4;
  if (prioridade === 'Alta') return 3;
  if (prioridade === 'Média') return 2;
  if (prioridade === 'Baixa') return 1;
  return 0;
}

export function prioridadeOrdem(prioridade?: string | null): number {
  return 5 - pesoPrioridade(prioridade);
}

export type SituacaoMaquina =
  | 'Operacional'
  | 'Aguardando atendimento'
  | 'Em manutenção'
  | 'Parada crítica';

export function calcularSituacaoMaquina(
  tag: string,
  chamados: Chamado[]
): SituacaoMaquina {
  const chamadosDaMaquina = chamados.filter(
    (chamado) => normalizarTexto(chamado.maquina) === normalizarTexto(tag)
  );

  const possuiCriticoAberto = chamadosDaMaquina.some(
    (chamado) =>
      chamado.status !== 'Finalizado' &&
      (chamado.prioridade === 'Urgente' || chamado.prioridade === 'Alta')
  );

  if (possuiCriticoAberto) return 'Parada crítica';

  if (chamadosDaMaquina.some((chamado) => chamado.status === 'Assumido')) {
    return 'Em manutenção';
  }

  if (chamadosDaMaquina.some((chamado) => chamado.status === 'Aberto')) {
    return 'Aguardando atendimento';
  }

  return 'Operacional';
}

export function coresSituacaoMaquina(situacao: SituacaoMaquina): {
  fundo: string;
  texto: string;
  borda: string;
  ponto: string;
} {
  if (situacao === 'Parada crítica') {
    return {
      fundo: '#fef2f2',
      texto: '#b91c1c',
      borda: '#fecaca',
      ponto: '#dc2626',
    };
  }

  if (situacao === 'Em manutenção') {
    return {
      fundo: '#eff6ff',
      texto: '#1d4ed8',
      borda: '#bfdbfe',
      ponto: '#2563eb',
    };
  }

  if (situacao === 'Aguardando atendimento') {
    return {
      fundo: '#fffbeb',
      texto: '#92400e',
      borda: '#fde68a',
      ponto: '#f59e0b',
    };
  }

  return {
    fundo: '#ecfdf5',
    texto: '#047857',
    borda: '#bbf7d0',
    ponto: '#16a34a',
  };
}
