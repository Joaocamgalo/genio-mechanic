import type { CSSProperties } from 'react';
import type {
  Chamado,
  Maquina,
  LeituraHorimetro,
  OperacaoDiaria,
  PreventivaMaquina,
  HistoricoPreventiva,
  Usuario,
} from '../types/controlmaq';
import { normalizarTexto } from '../utils/controlmaq';

type AcaoDashboard =
  | { tipo: 'abrirChamado'; chamadoId: number }
  | { tipo: 'novoChamado' }
  | { tipo: 'irParaChamados' }
  | {
      tipo: 'irParaChamadosFiltrados';
      filtro: 'Aberto' | 'Assumido' | 'Finalizado';
    }
  | { tipo: 'irParaMaquinas' }
  | { tipo: 'irParaHorimetros' }
  | { tipo: 'irParaPreventivas' }
  | { tipo: 'irParaRelatorios' }
  | { tipo: 'irParaIndicadores' }
  | { tipo: 'irParaBackup' }
  | { tipo: 'irParaHistoricoMaquina' }
  | { tipo: 'irParaUsuarios' };

interface DashboardProps {
  usuario: Usuario | null;
  chamados: Chamado[];
  maquinas: Maquina[];
  leiturasHorimetro: LeituraHorimetro[];
  operacoesDiarias: OperacaoDiaria[];
  preventivas: PreventivaMaquina[];
  historicoPreventivas: HistoricoPreventiva[];
  carregando: boolean;
  erro: string;
  online: boolean;
  ultimaSincronizacao: Date | null;
  onAcao: (acao: AcaoDashboard) => void;
}

export function DashboardExecutivo({
  usuario,
  chamados,
  maquinas,
  leiturasHorimetro,
  operacoesDiarias,
  preventivas,
  historicoPreventivas,
  carregando,
  erro,
  online,
  ultimaSincronizacao,
  onAcao,
}: DashboardProps) {
  const chamadosAbertos = chamados.filter((c) => c.status === 'Aberto');
  const chamadosAssumidos = chamados.filter((c) => c.status === 'Assumido');
  const chamadosFinalizados = chamados.filter((c) => c.status === 'Finalizado');

  const urgentes = chamados.filter((c) => c.prioridade === 'Urgente');
  const altaPrioridade = chamados.filter((c) => c.prioridade === 'Alta');

  const maquinasParadas = maquinas.filter((m) => m.status_maquina === 'Parada');
  const preventivasVencidas = preventivas.filter(
    (p) => p.status_preventiva === 'Vencida'
  );

  const leiturasHoje = leiturasHorimetro.filter(
    (leitura) =>
      new Date(leitura.created_at).toDateString() === new Date().toDateString()
  );
  const pendentesHorimetro = maquinas.filter(
    (m) => !leiturasHoje.some((l) => l.maquina_id === m.id)
  );

  function calcularSituacaoMaquina(tag: string, chamados: Chamado[]): string {
    if (!tag) return 'Indisponível';
    const chamadosDaMaquina = chamados.filter(
      (c) => normalizarTexto(c.maquina) === normalizarTexto(tag)
    );
    if (
      chamadosDaMaquina.some(
        (c) => c.status === 'Aberto' || c.status === 'Assumido'
      )
    )
      return 'Em manutenção';
    return 'Operacional';
  }

  function formatarDuracao(minutos: number) {
    if (minutos <= 0) return '0min';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
  }

  const totalFinalizados = chamadosFinalizados.length;
  const tempoMedioGeral =
    totalFinalizados > 0
      ? Math.round(
          chamadosFinalizados.reduce((acc, c) => {
            const inicio = new Date(c.iniciado_at || '').getTime();
            const fim = new Date(c.finalizado_at || '').getTime();
            return acc + (fim > inicio ? (fim - inicio) / 60000 : 0);
          }, 0) / totalFinalizados
        )
      : 0;

  const totalMaquinas = maquinas.length;
  const maquinasOperacionais = maquinas.filter(
    (m) => m.status_maquina === 'Operacional'
  ).length;
  const percentualOperacional =
    totalMaquinas > 0
      ? Math.round((maquinasOperacionais / totalMaquinas) * 100)
      : 0;

  const rankingMecanicos = Object.entries(
    chamadosFinalizados.reduce<Record<string, number>>((acc, c) => {
      const mecanico = c.mecanico || 'Não informado';
      acc[mecanico] = (acc[mecanico] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const rankingMaquinas = Object.entries(
    chamados.reduce<Record<string, number>>((acc, c) => {
      acc[c.maquina] = (acc[c.maquina] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const horaAtual = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={styles.container}>
      {/* Linha superior - Resumo Executivo */}
      <div style={styles.gridTopo}>
        <div style={styles.heroCard}>
          <h2 style={styles.heroTitulo}>Boa tarde, {usuario?.nome}.</h2>
          <p style={styles.heroSubtitulo}>
            Existem {urgentes.length} situação(ões) prioritária(s) neste
            momento, sendo{' '}
            {chamadosAbertos.filter((c) => c.prioridade === 'Urgente').length}{' '}
            crítica(s).
          </p>
          <div style={styles.heroBadges}>
            <span style={styles.badgeOnline}>
              <span style={styles.pontoOnline} /> Sistema online
            </span>
            <span style={styles.badgeAtualizado}>
              Atualizado{' '}
              {ultimaSincronizacao
                ? ultimaSincronizacao.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : horaAtual}
            </span>
          </div>
        </div>

        <div style={styles.statusGeralCard}>
          <div style={styles.statusGeralTopo}>
            <span style={styles.statusGeralTitulo}>Situação operacional</span>
            <span style={styles.statusGeralCritica}>crítica</span>
          </div>
          <div style={styles.statusGeralCentro}>
            <div style={styles.circuloProgresso}>
              <span style={styles.circuloNumero}>{percentualOperacional}</span>
              <span style={styles.circuloTexto}>de 100</span>
            </div>
            <div style={styles.statusGeralInfo}>
              <p style={styles.statusGeralTexto}>
                <strong>{maquinasParadas.length}</strong> máquina(s) parada(s)
              </p>
              <div style={styles.avisoParcial}>
                <span>Confiabilidade média</span>
                <span>dados parciais</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso de horímetros */}
      {pendentesHorimetro.length > 0 && (
        <div style={styles.avisoAmarelo}>
          Dados parciais: Existem máquinas sem horímetro atual.
        </div>
      )}

      {/* KPIs principais */}
      <div style={styles.gridKpis}>
        <KpiCard
          titulo="Chamados abertos"
          numero={chamadosAbertos.length}
          descricao="Solicitações ainda não finalizadas."
          cor="#ef4444"
          onClick={() =>
            onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
          }
        />
        <KpiCard
          titulo="Chamados urgentes"
          numero={urgentes.length}
          descricao="Ocorrências com prioridade máxima."
          cor="#f97316"
          onClick={() =>
            onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
          }
        />
        <KpiCard
          titulo="Máquinas paradas"
          numero={maquinasParadas.length}
          descricao="Equipamentos indisponíveis agora."
          cor="#dc2626"
          onClick={() => onAcao({ tipo: 'irParaMaquinas' })}
        />
        <KpiCard
          titulo="Preventivas vencidas"
          numero={preventivasVencidas.length}
          descricao="Revisões que ultrapassaram o limite."
          cor="#f59e0b"
          onClick={() => onAcao({ tipo: 'irParaPreventivas' })}
        />
        <KpiCard
          titulo="Horímetros pendentes"
          numero={pendentesHorimetro.length}
          descricao="Máquinas sem leitura registrada hoje."
          cor="#7c3aed"
          onClick={() => onAcao({ tipo: 'irParaHorimetros' })}
        />
      </div>

      {/* Linha inferior - Central de atenção e rankings */}
      <div style={styles.gridInferior}>
        {/* Central de atenção */}
        <div style={styles.cardCentralAtencao}>
          <span style={styles.preTitulo}>Central de atenção</span>
          <h3 style={styles.cardTitulo}>Prioridades da operação</h3>
          <p style={styles.cardDescricao}>
            O que precisa de ação, acompanhamento ou regularização.
          </p>

          <div style={styles.centralAtencaoLista}>
            <AtencaoItem
              label="Críticas"
              quantidade={
                chamados.filter(
                  (c) => c.prioridade === 'Urgente' && c.status !== 'Finalizado'
                ).length
              }
              cor="#ef4444"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
              }
            />
            <AtencaoItem
              label="Atenção"
              quantidade={
                chamados.filter(
                  (c) => c.prioridade === 'Alta' && c.status !== 'Finalizado'
                ).length
              }
              cor="#f59e0b"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Assumido' })
              }
            />
            <AtencaoItem
              label="Pendências"
              quantidade={chamadosAssumidos.length}
              cor="#2563eb"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Assumido' })
              }
            />
            <AtencaoItem
              label="Vencidas"
              quantidade={preventivasVencidas.length}
              cor="#dc2626"
              onClick={() => onAcao({ tipo: 'irParaPreventivas' })}
            />
          </div>

          <div style={styles.listaRanking}>
            {rankingMecanicos.length > 0 ? (
              rankingMecanicos.map(([nome, total], idx) => (
                <div key={nome} style={styles.itemRanking}>
                  <strong>
                    {idx + 1}. {nome}
                  </strong>
                  <span>{total} finalizado(s)</span>
                </div>
              ))
            ) : (
              <p style={styles.semDados}>Sem mecânicos com finalizações.</p>
            )}
          </div>
        </div>

        {/* Situação operacional consolidada */}
        <div style={styles.cardSituacaoOperacional}>
          <span style={styles.preTitulo}>Situação operacional</span>
          <h3 style={styles.cardTitulo}>
            Leitura consolidada do momento atual.
          </h3>
          <p style={styles.cardDescricao}>
            Existem {urgentes.length} situação(ões) prioritária(s) neste
            momento, sendo{' '}
            {chamadosAbertos.filter((c) => c.prioridade === 'Urgente').length}{' '}
            crítica(s).
          </p>

          <div style={styles.statusResumo}>
            <div style={styles.statusResumoItem}>
              <span style={styles.statusResumoNumero}>
                {chamadosAbertos.length}
              </span>
              <span style={styles.statusResumoLabel}>Abertos</span>
            </div>
            <div style={styles.statusResumoItem}>
              <span style={styles.statusResumoNumero}>
                {chamadosAssumidos.length}
              </span>
              <span style={styles.statusResumoLabel}>Em atendimento</span>
            </div>
            <div style={styles.statusResumoItem}>
              <span style={styles.statusResumoNumero}>
                {chamadosFinalizados.length}
              </span>
              <span style={styles.statusResumoLabel}>Finalizados</span>
            </div>
          </div>

          <div style={styles.tempoMedioBox}>
            <span>Tempo médio de atendimento</span>
            <strong>{formatarDuracao(tempoMedioGeral)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard(props: {
  titulo: string;
  numero: number;
  descricao: string;
  cor: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" style={styles.kpiCard} onClick={props.onClick}>
      <div style={styles.kpiCabecalho}>
        <span style={{ ...styles.kpiPonto, background: props.cor }} />
        <span style={styles.kpiTitulo}>{props.titulo}</span>
      </div>
      <strong style={styles.kpiNumero}>{props.numero}</strong>
      <span style={styles.kpiDescricao}>{props.descricao}</span>
    </button>
  );
}

function AtencaoItem(props: {
  label: string;
  quantidade: number;
  cor: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" style={styles.atencaoItem} onClick={props.onClick}>
      <span style={{ ...styles.atencaoPonto, background: props.cor }} />
      <span style={styles.atencaoLabel}>{props.label}</span>
      <strong style={styles.atencaoNumero}>{props.quantidade}</strong>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'grid',
    gap: '18px',
    width: '100%',
    maxWidth: '100%',
  },
  gridTopo: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)',
    gap: '18px',
    alignItems: 'stretch',
  },
  heroCard: {
    background: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e4e7ec',
    color: '#172033',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '180px',
    boxShadow: '0 8px 24px rgba(16,24,40,.06)',
  },
  heroTitulo: {
    margin: 0,
    fontSize: 'clamp(26px, 3vw, 36px)',
    fontWeight: 800,
    letterSpacing: '-1px',
    color: '#172033',
    lineHeight: 1.1,
  },
  heroSubtitulo: {
    margin: '12px 0 0',
    color: '#667085',
    fontSize: '15px',
    lineHeight: 1.5,
    maxWidth: '500px',
  },
  heroBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  badgeOnline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#ecfdf3',
    color: '#027a48',
    border: '1px solid #abefc6',
    padding: '7px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  pontoOnline: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#12b76a',
  },
  badgeAtualizado: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#f2f4f7',
    border: '1px solid #eaecf0',
    color: '#344054',
    padding: '7px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusGeralCard: {
    background: '#ffffff',
    border: '1px solid #e4e7ec',
    borderRadius: '14px',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(16,24,40,.04)',
  },
  statusGeralTopo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  statusGeralTitulo: {
    color: '#172033',
    fontSize: '15px',
    fontWeight: 700,
  },
  statusGeralCritica: {
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  statusGeralCentro: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  circuloProgresso: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '5px solid #f2f4f7',
    borderTopColor: '#fdb515',
    borderRightColor: '#fdb515',
    background: '#ffffff',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  circuloNumero: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#172033',
    lineHeight: 1,
  },
  circuloTexto: {
    fontSize: '10px',
    color: '#667085',
    lineHeight: 1,
    marginTop: '2px',
  },
  statusGeralInfo: {
    display: 'grid',
    gap: '8px',
    minWidth: 0,
  },
  statusGeralTexto: {
    margin: 0,
    color: '#667085',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  avisoParcial: {
    background: '#fffaeb',
    border: '1px solid #fedf89',
    color: '#93370d',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  avisoAmarelo: {
    background: '#fffaeb',
    border: '1px solid #fedf89',
    color: '#93370d',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  gridKpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    alignItems: 'stretch',
  },
  kpiCard: {
    background: '#ffffff',
    border: '1px solid #e4e7ec',
    borderRadius: '12px',
    padding: '18px',
    display: 'grid',
    gap: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#172033',
    boxShadow: '0 1px 3px rgba(16,24,40,.04)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    minHeight: '130px',
  },
  kpiCabecalho: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  kpiPonto: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  kpiTitulo: {
    color: '#667085',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  kpiNumero: {
    fontSize: '38px',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-1px',
  },
  kpiDescricao: {
    color: '#98a2b3',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  gridInferior: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)',
    gap: '18px',
    alignItems: 'start',
  },
  cardCentralAtencao: {
    background: '#ffffff',
    border: '1px solid #e4e7ec',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 1px 3px rgba(16,24,40,.04)',
    display: 'grid',
    gap: '16px',
  },
  cardSituacaoOperacional: {
    background: '#ffffff',
    border: '1px solid #e4e7ec',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 1px 3px rgba(16,24,40,.04)',
    display: 'grid',
    gap: '16px',
    alignContent: 'start',
  },
  preTitulo: {
    color: '#fdb515',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  cardTitulo: {
    margin: 0,
    color: '#172033',
    fontSize: '20px',
    fontWeight: 750,
    letterSpacing: '-0.3px',
    lineHeight: 1.3,
  },
  cardDescricao: {
    margin: 0,
    color: '#667085',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  centralAtencaoLista: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '10px',
  },
  atencaoItem: {
    background: '#f9fafb',
    border: '1px solid #eaecf0',
    borderRadius: '10px',
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#344054',
  },
  atencaoPonto: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  atencaoLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#344054',
  },
  atencaoNumero: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#172033',
  },
  listaRanking: {
    display: 'grid',
    gap: '8px',
    marginTop: '8px',
  },
  itemRanking: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    background: '#f9fafb',
    border: '1px solid #eaecf0',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#344054',
    fontSize: '13px',
  },
  semDados: {
    color: '#98a2b3',
    fontSize: '13px',
    margin: 0,
    padding: '12px 0',
  },
  statusResumo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  statusResumoItem: {
    background: '#f9fafb',
    border: '1px solid #eaecf0',
    borderRadius: '10px',
    padding: '14px',
    display: 'grid',
    placeItems: 'center',
    gap: '4px',
  },
  statusResumoNumero: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#172033',
    lineHeight: 1,
  },
  statusResumoLabel: {
    fontSize: '11px',
    color: '#667085',
    fontWeight: 600,
    textAlign: 'center',
  },
  tempoMedioBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
};

if (typeof window !== 'undefined' && window.innerWidth < 900) {
  styles.gridTopo = { ...styles.gridTopo, gridTemplateColumns: '1fr' };
  styles.gridInferior = { ...styles.gridInferior, gridTemplateColumns: '1fr' };
}
