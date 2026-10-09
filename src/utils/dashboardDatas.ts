import type { DashboardFiltroPeriodo, DashboardIntervalo } from '../types/dashboard';

const DIA_MS = 24 * 60 * 60 * 1000;

export function inicioDoDia(data: Date): Date {
  const resultado = new Date(data);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

export function fimDoDia(data: Date): Date {
  const resultado = new Date(data);
  resultado.setHours(23, 59, 59, 999);
  return resultado;
}

export function dataLocalISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseDataLocal(valor: string, finalDoDia = false): Date {
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return finalDoDia ? fimDoDia(data) : inicioDoDia(data);
}

export function criarIntervaloDashboard(
  filtro: DashboardFiltroPeriodo,
  referencia: Date,
): DashboardIntervalo {
  const hojeInicio = inicioDoDia(referencia);
  const hojeFim = fimDoDia(referencia);
  let inicio: Date;
  let fim: Date;

  switch (filtro.preset) {
    case 'hoje':
      inicio = hojeInicio;
      fim = hojeFim;
      break;
    case 'ultimos_7_dias':
      inicio = new Date(hojeInicio.getTime() - 6 * DIA_MS);
      fim = hojeFim;
      break;
    case 'ultimos_30_dias':
      inicio = new Date(hojeInicio.getTime() - 29 * DIA_MS);
      fim = hojeFim;
      break;
    case 'personalizado':
      if (!filtro.inicio || !filtro.fim) {
        throw new Error('Período personalizado exige data inicial e final.');
      }
      inicio = parseDataLocal(filtro.inicio);
      fim = parseDataLocal(filtro.fim, true);
      if (inicio > fim) throw new Error('A data inicial não pode ser posterior à data final.');
      break;
  }

  const duracao = fim.getTime() - inicio.getTime() + 1;
  const fimAnterior = new Date(inicio.getTime() - 1);
  const inicioAnterior = new Date(fimAnterior.getTime() - duracao + 1);

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    inicioAnterior: inicioAnterior.toISOString(),
    fimAnterior: fimAnterior.toISOString(),
  };
}

export function estaNoIntervalo(
  valor: string | null | undefined,
  inicioIso: string,
  fimIso: string,
): boolean {
  if (!valor) return false;
  const timestamp = new Date(valor).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp >= new Date(inicioIso).getTime() && timestamp <= new Date(fimIso).getTime();
}

export function horasDesde(valor: string | null | undefined, referencia: Date): number | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return Math.max(0, (referencia.getTime() - data.getTime()) / (60 * 60 * 1000));
}

export function houveLeituraHoje(
  maquinaId: number,
  leituras: readonly { maquina_id: number; created_at?: string }[],
  referencia: Date,
): boolean {
  const inicio = inicioDoDia(referencia).getTime();
  const fim = fimDoDia(referencia).getTime();
  return leituras.some((leitura) => {
    if (leitura.maquina_id !== maquinaId || !leitura.created_at) return false;
    const momento = new Date(leitura.created_at).getTime();
    return momento >= inicio && momento <= fim;
  });
}
