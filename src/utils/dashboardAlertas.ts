import type {
  DashboardAlerta,
  DashboardConfiguracao,
  DashboardDadosFonte,
  DashboardGrupoAlerta,
} from '../types/dashboard';
import { horasDesde } from './dashboardDatas';
import {
  localizarMaquinaDoChamado,
  maquinasComHorimetroPendente,
} from './dashboardIndicadores';

function grupoPorCriticidade(
  criticidade: DashboardAlerta['criticidade'],
): DashboardGrupoAlerta {
  if (criticidade === 'critica') return 'criticas';
  if (criticidade === 'alta' || criticidade === 'media') return 'atencao';
  return 'pendencias';
}

function prepararAlerta(alerta: DashboardAlerta): DashboardAlerta {
  return {
    ...alerta,
    grupo: alerta.grupo ?? grupoPorCriticidade(alerta.criticidade),
    chaveAgrupamento: alerta.chaveAgrupamento ?? `${alerta.tipo}-${alerta.entidadeId ?? alerta.id}`,
  };
}

export function gerarAlertas(
  dados: DashboardDadosFonte,
  configuracao: DashboardConfiguracao,
): DashboardAlerta[] {
  const alertas: DashboardAlerta[] = [];

  dados.chamados
    .filter(
      (chamado) =>
        chamado.status === 'Aberto' &&
        chamado.prioridade === 'Urgente' &&
        !chamado.mecanico,
    )
    .forEach((chamado) =>
      alertas.push(
        prepararAlerta({
          id: `urgente-sem-responsavel-${chamado.id}`,
          tipo: 'chamado_urgente_sem_responsavel',
          titulo: `Chamado urgente #${chamado.id} sem responsável`,
          descricao: `${chamado.maquina}: ${chamado.problema}`,
          criticidade: 'critica',
          prioridade: 100,
          entidadeId: chamado.id,
          entidadeNome: chamado.maquina,
          detalhes: ['Prioridade urgente', 'Aguardando responsável'],
          acao: {
            tipo: 'abrir_chamado',
            destino: 'detalhesChamado',
            entidadeId: chamado.id,
            rotulo: 'Abrir chamado',
          },
        }),
      ),
    );

  dados.chamados
    .filter(
      (chamado) =>
        chamado.status === 'Assumido' && chamado.prioridade === 'Urgente',
    )
    .forEach((chamado) =>
      alertas.push(
        prepararAlerta({
          id: `urgente-assumido-${chamado.id}`,
          tipo: 'chamado_urgente_assumido',
          titulo: `Chamado urgente #${chamado.id} em atendimento`,
          descricao: `${chamado.maquina}: responsável ${chamado.mecanico || 'não informado'}.`,
          criticidade: 'alta',
          prioridade: 82,
          entidadeId: chamado.id,
          entidadeNome: chamado.maquina,
          acao: {
            tipo: 'abrir_chamado',
            destino: 'detalhesChamado',
            entidadeId: chamado.id,
            rotulo: 'Acompanhar chamado',
          },
        }),
      ),
    );

  dados.maquinas
    .filter((maquina) => maquina.status_maquina === 'Parada')
    .forEach((maquina) =>
      alertas.push(
        prepararAlerta({
          id: `maquina-parada-${maquina.id}`,
          tipo: 'maquina_parada',
          titulo: `${maquina.tag} está parada`,
          descricao: maquina.observacao || `${maquina.marca} ${maquina.modelo}`,
          criticidade: 'critica',
          prioridade: 95,
          entidadeId: maquina.id,
          entidadeNome: maquina.tag,
          acao: {
            tipo: 'abrir_maquina',
            destino: 'historicoMaquina',
            entidadeId: maquina.id,
            rotulo: 'Ver máquina',
          },
        }),
      ),
    );

  dados.maquinas
    .filter((maquina) => maquina.status_maquina === 'Em manutenção')
    .forEach((maquina) =>
      alertas.push(
        prepararAlerta({
          id: `maquina-manutencao-${maquina.id}`,
          tipo: 'maquina_em_manutencao',
          titulo: `${maquina.tag} está em manutenção`,
          descricao: maquina.observacao || `${maquina.marca} ${maquina.modelo}`,
          criticidade: 'media',
          prioridade: 58,
          entidadeId: maquina.id,
          entidadeNome: maquina.tag,
          acao: {
            tipo: 'abrir_maquina',
            destino: 'historicoMaquina',
            entidadeId: maquina.id,
            rotulo: 'Acompanhar máquina',
          },
        }),
      ),
    );

  dados.preventivas
    .filter(
      (preventiva) =>
        preventiva.status_preventiva === 'Vencida' ||
        preventiva.status_preventiva === 'Urgente',
    )
    .forEach((preventiva) => {
      const vencida = preventiva.status_preventiva === 'Vencida';
      alertas.push(
        prepararAlerta({
          id: `preventiva-${vencida ? 'vencida' : 'urgente'}-${preventiva.maquina_id}`,
          tipo: vencida ? 'preventiva_vencida' : 'preventiva_urgente',
          titulo: `Preventiva ${vencida ? 'vencida' : 'urgente'} — ${preventiva.tag}`,
          descricao:
            preventiva.horas_restantes === null
              ? 'Horímetro insuficiente para detalhar a situação.'
              : vencida
                ? `${Math.abs(preventiva.horas_restantes)} h acima do limite.`
                : `${preventiva.horas_restantes} h restantes.`,
          criticidade: vencida ? 'critica' : 'alta',
          prioridade: vencida ? 90 : 75,
          entidadeId: preventiva.maquina_id,
          entidadeNome: preventiva.tag,
          acao: {
            tipo: 'navegar',
            destino: 'preventivas',
            entidadeId: preventiva.maquina_id,
            rotulo: 'Ver preventiva',
            filtro: { preventivaStatus: preventiva.status_preventiva, maquina: preventiva.tag },
          },
        }),
      );
    });

  const horimetrosPendentes = maquinasComHorimetroPendente(dados);
  if (horimetrosPendentes.length > 0) {
    const nomes = horimetrosPendentes.slice(0, 4).map((maquina) => maquina.tag);
    alertas.push(
      prepararAlerta({
        id: 'horimetros-pendentes-agrupados',
        tipo: 'horimetro_pendente',
        titulo: `${horimetrosPendentes.length} horímetro(s) pendente(s)`,
        descricao:
          horimetrosPendentes.length <= 4
            ? `Sem leitura hoje: ${nomes.join(', ')}.`
            : `Sem leitura hoje: ${nomes.join(', ')} e mais ${horimetrosPendentes.length - 4}.`,
        criticidade: 'media',
        prioridade: 45,
        quantidade: horimetrosPendentes.length,
        chaveAgrupamento: 'horimetros-pendentes',
        detalhes: horimetrosPendentes.map((maquina) => maquina.tag),
        acao: {
          tipo: 'navegar',
          destino: 'horimetros',
          rotulo: 'Ver pendências',
          filtro: { horimetroPendente: true },
        },
      }),
    );
  }

  dados.chamados
    .filter((chamado) => chamado.status !== 'Finalizado')
    .forEach((chamado) => {
      const horas = horasDesde(chamado.created_at, dados.dataReferencia);
      if (horas === null || horas < configuracao.limiteChamadoAntigoHoras) return;

      alertas.push(
        prepararAlerta({
          id: `chamado-antigo-${chamado.id}`,
          tipo: 'chamado_antigo',
          titulo: `Chamado #${chamado.id} aberto há ${Math.floor(horas)} h`,
          descricao: `${chamado.maquina}: ${chamado.problema}`,
          criticidade: 'alta',
          prioridade: 70,
          entidadeId: chamado.id,
          entidadeNome: chamado.maquina,
          acao: {
            tipo: 'abrir_chamado',
            destino: 'detalhesChamado',
            entidadeId: chamado.id,
            rotulo: 'Revisar chamado',
          },
        }),
      );
    });

  const quantidadePorMaquina = new Map<number, number>();
  dados.chamados
    .filter((chamado) => chamado.status !== 'Finalizado')
    .forEach((chamado) => {
      const maquina = localizarMaquinaDoChamado(chamado, dados.maquinas);
      if (maquina) {
        quantidadePorMaquina.set(
          maquina.id,
          (quantidadePorMaquina.get(maquina.id) || 0) + 1,
        );
      }
    });

  quantidadePorMaquina.forEach((quantidade, maquinaId) => {
    if (quantidade < configuracao.limiteRecorrenciaChamados) return;
    const maquina = dados.maquinas.find((item) => item.id === maquinaId);
    if (!maquina) return;

    alertas.push(
      prepararAlerta({
        id: `recorrencia-${maquina.id}`,
        tipo: 'recorrencia_chamados',
        titulo: `Recorrência de chamados — ${maquina.tag}`,
        descricao: `${quantidade} chamados ativos relacionados ao equipamento.`,
        criticidade: 'alta',
        prioridade: 72,
        quantidade,
        entidadeId: maquina.id,
        entidadeNome: maquina.tag,
        acao: {
          tipo: 'abrir_maquina',
          destino: 'historicoMaquina',
          entidadeId: maquina.id,
          rotulo: 'Analisar histórico',
        },
      }),
    );
  });

  const unicos = new Map<string, DashboardAlerta>();
  alertas.forEach((alerta) => {
    const chave = alerta.chaveAgrupamento || alerta.id;
    const existente = unicos.get(chave);
    if (!existente || alerta.prioridade > existente.prioridade) unicos.set(chave, alerta);
  });

  return [...unicos.values()].sort(
    (a, b) => b.prioridade - a.prioridade || a.titulo.localeCompare(b.titulo, 'pt-BR'),
  );
}
