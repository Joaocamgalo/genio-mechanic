import { useEffect, useState, type CSSProperties } from 'react';
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
  // Detector de dispositivo móvel em tempo real
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 900;
    }
    return false;
  });

  useEffect(() => {
    function tratarResize() {
      setIsMobile(window.innerWidth <= 900);
    }
    window.addEventListener('resize', tratarResize);
    return () => window.removeEventListener('resize', tratarResize);
  }, []);

  const [mostrarPendentesHorimetro, setMostrarPendentesHorimetro] = useState(false);

  const chamadosAbertos = chamados.filter((c) => c.status === 'Aberto');
  const chamadosAssumidos = chamados.filter((c) => c.status === 'Assumido');
  const chamadosFinalizados = chamados.filter((c) => c.status === 'Finalizado');

  const urgentes = chamados.filter((c) => c.prioridade === 'Urgente' && c.status !== 'Finalizado');
  const altas = chamados.filter((c) => c.prioridade === 'Alta' && c.status !== 'Finalizado');

  const maquinasParadas = maquinas.filter((m) => m.status_maquina === 'Parada');
  const preventivasVencidas = preventivas.filter(
    (p) => p.status_preventiva === 'Vencida'
  );

  const hoje = new Date().toDateString();
  const leiturasHoje = leiturasHorimetro.filter(
    (leitura) => new Date(leitura.created_at).toDateString() === hoje
  );
  const pendentesHorimetro = maquinas.filter(
    (m) => !leiturasHoje.some((l) => l.maquina_id === m.id)
  );

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

  const percentualDisponibilidade =
    totalMaquinas > 0
      ? Math.round((maquinasOperacionais / totalMaquinas) * 100)
      : 100;

  // Cor status de disponibilidade
  const corDisponibilidade =
    percentualDisponibilidade >= 85
      ? '#16a34a'
      : percentualDisponibilidade >= 65
      ? '#f59e0b'
      : '#dc2626';

  const rankingMecanicos = Object.entries(
    chamadosFinalizados.reduce<Record<string, number>>((acc, c) => {
      const mecanico = c.mecanico || 'Não informado';
      acc[mecanico] = (acc[mecanico] || 0) + 1;
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
      {/* Linha superior - Boas vindas e Disponibilidade Operacional */}
      <div
        style={{
          ...styles.gridTopo,
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.4fr) minmax(320px, 0.6fr)',
        }}
      >
        <div style={{
          ...styles.heroCard,
          padding: isMobile ? "20px" : "28px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderLeft: "4px solid #f59e0b",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05)"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0f172a", color: "#f59e0b", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, letterSpacing: "1px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }}></span>
              GE-NIO MECHANIQ
            </div>
          </div>
          <h2 style={{ ...styles.heroTitulo, fontSize: isMobile ? '20px' : '26px' }}>
            Painel Técnico de Operações
          </h2>
          <p style={styles.heroSubtitulo}>
            Olá, <strong>{usuario?.nome || 'Gestor'}</strong>. Atualmente existem{' '}
            <strong style={{ color: urgentes.length > 0 ? '#dc2626' : '#0f172a' }}>
              {urgentes.length} chamado(s) crítico(s)
            </strong>{' '}
            e <strong>{maquinasParadas.length} máquina(s) parada(s)</strong> demandando intervenção em campo.
          </p>

          <div style={styles.heroBadges}>
            <span style={styles.badgeOnline}>
              <span style={styles.pontoOnline} /> Sistema Ativo & Sincronizado
            </span>
            <span style={styles.badgeAtualizado}>
              Última sincronização:{' '}
              {ultimaSincronizacao
                ? ultimaSincronizacao.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : horaAtual}
            </span>
          </div>
        </div>

        {/* Card de Confiabilidade / Disponibilidade da Frota */}
        <div style={{
          ...styles.statusGeralCard,
          padding: isMobile ? "20px" : "24px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05)"
        }}>
          <div style={styles.statusGeralTopo}>
            <span style={styles.statusGeralTitulo}>Disponibilidade da Frota</span>
            <span
              style={{
                ...styles.statusGeralBadge,
                color: corDisponibilidade,
                borderColor: corDisponibilidade,
                background: `${corDisponibilidade}15`,
              }}
            >
              {percentualDisponibilidade >= 85
                ? 'ESTÁVEL'
                : percentualDisponibilidade >= 65
                ? 'ATENÇÃO'
                : 'CRÍTICA'}
            </span>
          </div>

          <div
            style={{
              ...styles.statusGeralCentro,
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '14px' : '20px',
            }}
          >
            {/* Medidor Circular em SVG Real */}
            <div style={styles.graficoArcoContainer}>
              <svg viewBox="0 0 100 100" style={{ width: '84px', height: '84px', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={corDisponibilidade}
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * percentualDisponibilidade) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={styles.textoDentroGrafico}>
                <span style={styles.circuloNumero}>{percentualDisponibilidade}%</span>
                <span style={styles.circuloTexto}>ativa</span>
              </div>
            </div>

            <div style={styles.statusGeralInfo}>
              <div style={styles.indicadorItem}>
                <span style={{ color: '#64748b' }}>Frota total:</span>
                <strong>{totalMaquinas} máquinas</strong>
              </div>
              <div style={styles.indicadorItem}>
                <span style={{ color: '#16a34a' }}>● Em operação:</span>
                <strong>{maquinasOperacionais} unid.</strong>
              </div>
              <div style={styles.indicadorItem}>
                <span style={{ color: '#dc2626' }}>● Indisponíveis:</span>
                <strong style={{ color: '#dc2626' }}>{maquinasParadas.length} unid.</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Expansível de Horímetros em Falta */}
      {pendentesHorimetro.length > 0 && (
        <div style={styles.avisoAmarelo}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span>
                <strong>{pendentesHorimetro.length} máquina(s)</strong> sem apontamento de horímetro hoje.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setMostrarPendentesHorimetro(!mostrarPendentesHorimetro)}
                style={styles.botaoVerPendentes}
              >
                {mostrarPendentesHorimetro ? 'Ocultar Máquinas' : 'Ver Máquinas Pendentes'}
              </button>
              <button
                type="button"
                onClick={() => onAcao({ tipo: 'irParaHorimetros' })}
                style={styles.botaoApontarHorimetro}
              >
                Registrar Leituras →
              </button>
            </div>
          </div>

          {mostrarPendentesHorimetro && (
            <div style={styles.listaTagsHorimetros}>
              {pendentesHorimetro.map((m) => (
                <span key={m.id} style={styles.chipTagMaquina}>
                  {m.tag} — <small style={{ opacity: 0.8 }}>{m.modelo}</small>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPIs Principais em Grid Responsivo */}
      <div
        style={{
          ...styles.gridKpis,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        }}
      >
        <KpiCard
          titulo="Ordens Abertas"
          numero={chamadosAbertos.length}
          descricao="Aguardando atribuição de técnico"
          cor="#ef4444"
          destaque={chamadosAbertos.length > 0}
          onClick={() =>
            onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
          }
        />
        <KpiCard
          titulo="Chamados Críticos"
          numero={urgentes.length}
          descricao="Ocorrências de emergência ativa"
          cor="#dc2626"
          destaque={urgentes.length > 0}
          onClick={() =>
            onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
          }
        />
        <KpiCard
          titulo="Máquinas Paradas"
          numero={maquinasParadas.length}
          descricao="Equipamentos fora de combate"
          cor="#b91c1c"
          destaque={maquinasParadas.length > 0}
          onClick={() => onAcao({ tipo: 'irParaMaquinas' })}
        />
        <KpiCard
          titulo="Preventivas Vencidas"
          numero={preventivasVencidas.length}
          descricao="Horímetro ultrapassou plano"
          cor="#d97706"
          destaque={preventivasVencidas.length > 0}
          onClick={() => onAcao({ tipo: 'irParaPreventivas' })}
        />
        <KpiCard
          titulo="Em Atendimento"
          numero={chamadosAssumidos.length}
          descricao="Técnicos executando no campo"
          cor="#2563eb"
          destaque={false}
          onClick={() =>
            onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Assumido' })
          }
        />
      </div>

      {/* Grid Inferior: Ações Imediatas e Confiabilidade da Equipe */}
      <div
        style={{
          ...styles.gridInferior,
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
        }}
      >
        {/* Painel de Prioridades e Intervenção Rápida */}
        <div style={{ ...styles.cardExecutivo, padding: isMobile ? '18px' : '24px' }}>
          <div style={styles.cardHeaderFlex}>
            <div>
              <span style={styles.preTitulo}>Ações Imediatas</span>
              <h3 style={styles.cardTitulo}>Central de Resolução Rápida</h3>
            </div>
            <button
              onClick={() => onAcao({ tipo: 'novoChamado' })}
              style={styles.botaoAbrirOS}
            >
              + Nova OS
            </button>
          </div>

          <div
            style={{
              ...styles.centralAtencaoLista,
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            <AtencaoItem
              label="Urgências Não Atendidas"
              quantidade={urgentes.length}
              cor="#ef4444"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
              }
            />
            <AtencaoItem
              label="Alta Prioridade"
              quantidade={altas.length}
              cor="#f59e0b"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Aberto' })
              }
            />
            <AtencaoItem
              label="Chamados em Andamento"
              quantidade={chamadosAssumidos.length}
              cor="#2563eb"
              onClick={() =>
                onAcao({ tipo: 'irParaChamadosFiltrados', filtro: 'Assumido' })
              }
            />
            <AtencaoItem
              label="Preventivas a Vencer/Vencidas"
              quantidade={preventivasVencidas.length}
              cor="#b45309"
              onClick={() => onAcao({ tipo: 'irParaPreventivas' })}
            />
          </div>

          {/* Lista com as 3 Máquinas com Intervenção Mais Urgente */}
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              Máquinas com intervenção pendente
            </span>
            <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
              {maquinasParadas.length === 0 && preventivasVencidas.length === 0 ? (
                <p style={styles.semDados}>Nenhuma máquina paralisada ou preventiva em atraso.</p>
              ) : (
                [...maquinasParadas.slice(0, 3)].map((m) => (
                  <div
                    key={m.id}
                    style={{
                      ...styles.linhaAlertaMaquina,
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? '8px' : '0',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#dc2626' }}>{m.tag}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: isMobile ? '0' : '8px', display: isMobile ? 'block' : 'inline' }}>
                        {m.marca} {m.modelo} (Equipamento Parado)
                      </span>
                    </div>
                    <button
                      onClick={() => onAcao({ tipo: 'irParaMaquinas' })}
                      style={{
                        ...styles.botaoAcaoLinha,
                        width: isMobile ? '100%' : 'auto',
                      }}
                    >
                      Acessar Ativo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Indicadores de Eficiência Técnica e Desempenho */}
        <div style={{ ...styles.cardExecutivo, padding: isMobile ? '18px' : '24px' }}>
          <span style={styles.preTitulo}>Eficiência Técnica</span>
          <h3 style={styles.cardTitulo}>Rendimento da Manutenção</h3>

          <div style={styles.statusResumo}>
            <div style={styles.statusResumoItem}>
              <span style={styles.statusResumoNumero}>{chamadosAbertos.length}</span>
              <span style={styles.statusResumoLabel}>Abertos</span>
            </div>
            <div style={styles.statusResumoItem}>
              <span style={styles.statusResumoNumero}>{chamadosAssumidos.length}</span>
              <span style={styles.statusResumoLabel}>Em Reparo</span>
            </div>
            <div style={styles.statusResumoItem}>
              <span style={{ ...styles.statusResumoNumero, color: '#16a34a' }}>
                {chamadosFinalizados.length}
              </span>
              <span style={styles.statusResumoLabel}>Concluídos</span>
            </div>
          </div>

          <div style={styles.tempoMedioBox}>
            <div>
              <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                Tempo Médio de Reparo (MTTR)
              </span>
              <span style={{ fontSize: '13px', color: '#334155' }}>Duração média por atendimento</span>
            </div>
            <strong style={{ fontSize: '20px', color: '#1e3a8a' }}>
              {formatarDuracao(tempoMedioGeral)}
            </strong>
          </div>

          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              Técnicos com Mais Finalizações
            </span>
            <div style={styles.listaRanking}>
              {rankingMecanicos.length > 0 ? (
                rankingMecanicos.map(([nome, total], idx) => (
                  <div key={nome} style={styles.itemRanking}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.medalhaRank}>{idx + 1}</span>
                      <strong style={{ color: '#0f172a' }}>{nome}</strong>
                    </div>
                    <span style={styles.badgeFinalizados}>{total} concluído(s)</span>
                  </div>
                ))
              ) : (
                <p style={styles.semDados}>Nenhum atendimento finalizado registrado.</p>
              )}
            </div>
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
  destaque?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.kpiCard,
        borderTop: `4px solid ${props.cor}`,
        background: props.destaque ? '#fff' : '#ffffff',
      }}
      onClick={props.onClick}
    >
      <div style={styles.kpiCabecalho}>
        <span style={{ ...styles.kpiPonto, background: props.cor }} />
        <span style={styles.kpiTitulo}>{props.titulo}</span>
      </div>
      <strong style={{ ...styles.kpiNumero, color: props.numero > 0 ? props.cor : '#0f172a' }}>
        {props.numero}
      </strong>
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
      <strong
        style={{
          ...styles.atencaoNumero,
          color: props.quantidade > 0 ? props.cor : '#64748b',
        }}
      >
        {props.quantidade}
      </strong>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  gridTopo: {
    display: 'grid',
    gap: '18px',
    alignItems: 'stretch',
    width: '100%',
  },
  heroCard: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    color: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
  },
  tagEmpresa: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.6px',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  heroTitulo: {
    margin: '8px 0 0',
    fontWeight: 900,
    letterSpacing: '-0.5px',
    color: '#0f172a',
    wordBreak: 'break-word',
  },
  heroSubtitulo: {
    margin: '10px 0 0',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.5,
    maxWidth: '540px',
  },
  heroBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '18px',
  },
  badgeOnline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
  },
  pontoOnline: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
  },
  badgeAtualizado: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#475569',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusGeralCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
  },
  statusGeralTopo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '8px',
  },
  statusGeralTitulo: {
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: 800,
  },
  statusGeralBadge: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  statusGeralCentro: {
    display: 'flex',
    width: '100%',
  },
  graficoArcoContainer: {
    position: 'relative',
    width: '84px',
    height: '84px',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  textoDentroGrafico: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloNumero: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#0f172a',
    lineHeight: 1,
  },
  circuloTexto: {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  statusGeralInfo: {
    display: 'grid',
    gap: '6px',
    width: '100%',
  },
  indicadorItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '4px 0',
    borderBottom: '1px dashed #f1f5f9',
  },
  avisoAmarelo: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#92400e',
    padding: '14px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  botaoVerPendentes: {
    background: '#ffffff',
    border: '1px solid #fcd34d',
    color: '#b45309',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  botaoApontarHorimetro: {
    background: '#d97706',
    border: 0,
    color: '#ffffff',
    padding: '6px 14px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  listaTagsHorimetros: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px dashed #fde68a',
  },
  chipTagMaquina: {
    background: '#fef3c7',
    border: '1px solid #fde68a',
    color: '#78350f',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
  },
  gridKpis: {
    display: 'grid',
    gap: '14px',
    width: '100%',
  },
  kpiCard: {
    borderRadius: '14px',
    padding: '20px',
    display: 'grid',
    gap: '6px',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 6px rgba(15,23,42,0.03)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
    width: '100%',
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
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 700,
  },
  kpiNumero: {
    fontSize: '34px',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-1px',
    margin: '4px 0',
  },
  kpiDescricao: {
    color: '#94a3b8',
    fontSize: '11px',
    lineHeight: 1.3,
  },
  gridInferior: {
    display: 'grid',
    gap: '18px',
    alignItems: 'start',
    width: '100%',
  },
  cardExecutivo: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
    display: 'grid',
    gap: '14px',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
    width: '100%',
  },
  cardHeaderFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  preTitulo: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  cardTitulo: {
    margin: '4px 0 0',
    color: '#0f172a',
    fontSize: '18px',
    fontWeight: 800,
    wordBreak: 'break-word',
  },
  botaoAbrirOS: {
    background: '#0f172a',
    color: '#ffffff',
    border: 0,
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  centralAtencaoLista: {
    display: 'grid',
    gap: '10px',
  },
  atencaoItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
    width: '100%',
  },
  atencaoPonto: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  atencaoLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#334155',
  },
  atencaoNumero: {
    fontSize: '16px',
    fontWeight: 900,
  },
  linhaAlertaMaquina: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    padding: '10px 14px',
    borderRadius: '8px',
    boxSizing: 'border-box',
    width: '100%',
  },
  botaoAcaoLinha: {
    background: '#ffffff',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '11px',
    cursor: 'pointer',
  },
  statusResumo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  statusResumoItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    display: 'grid',
    placeItems: 'center',
    gap: '4px',
    boxSizing: 'border-box',
  },
  statusResumoNumero: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#0f172a',
    lineHeight: 1,
  },
  statusResumoLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  tempoMedioBox: {
    background: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    gap: '8px',
  },
  listaRanking: {
    display: 'grid',
    gap: '8px',
    marginTop: '6px',
  },
  itemRanking: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    boxSizing: 'border-box',
  },
  medalhaRank: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#e2e8f0',
    color: '#0f172a',
    fontSize: '11px',
    fontWeight: 800,
    display: 'grid',
    placeItems: 'center',
  },
  badgeFinalizados: {
    background: '#dcfce7',
    color: '#15803d',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
  },
  semDados: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
    padding: '8px 0',
  },
};