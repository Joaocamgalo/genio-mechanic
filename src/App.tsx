import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { supabase } from './lib/supabase';
import { StatusConexao } from './components/StatusConexao';
import {
  getConnectivitySnapshot,
  subscribeConnectivity,
} from './offline/connectivity/connectivityService';

import type {
  Tela,
  StatusChamado,
  PerfilUsuario,
  FiltroChamado,
  Usuario,
  Maquina,
  Chamado,
  LeituraHorimetro,
  OperacaoDiaria,
  HistoricoChamado,
  PreventivaMaquina,
  HistoricoPreventiva,
  FiltroPreventiva,
  StatusPreventiva,
} from './types/controlmaq';
import {
  CHAVE_USUARIO_LOGADO,
  normalizarTexto,
  dataLocalISO,
  hojeISO,
  primeiroDiaMesISO,
  prioridadeOrdem,
  calcularSituacaoMaquina,
  coresSituacaoMaquina,
  type SituacaoMaquina,
} from './utils/controlmaq';
import {
  iniciarOperacao,
  encerrarOperacao,
  mensagemErroOperacao,
} from './services/operacaoDiaria';
import {
  carregarPreventivas,
  carregarHistoricoPreventivas,
  configurarPreventiva,
  registrarPreventiva,
} from './services/preventivas';
import { DashboardExecutivo } from './screens/DashboardExecutivo';
import { executarAcaoDashboard } from './utils/dashboardNavegacao';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_USUARIO_LOGADO);
      if (salvo) {
        const u = JSON.parse(salvo) as Usuario;
        if (u?.id && u?.login && u?.tipo) {
          return u;
        }
      }
    } catch {
      // Ignora erro de parsing
    }
    return null;
  });

  const [tela, setTela] = useState<Tela>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_USUARIO_LOGADO);
      if (salvo) {
        const u = JSON.parse(salvo) as Usuario;
        if (u?.id && u?.login && u?.tipo) {
          return u.tipo === 'operador' ? 'operacaoDiaria' : 'dashboard';
        }
      }
    } catch {
      // Ignora erro de parsing
    }
    return 'login';
  });

  const [filtroChamados, setFiltroChamados] = useState<FiltroChamado>('Todos');
  const [buscaChamados, setBuscaChamados] = useState('');
  const [chamadoParaFinalizar, setChamadoParaFinalizar] =
    useState<Chamado | null>(null);
  const [chamadoParaEditar, setChamadoParaEditar] = useState<Chamado | null>(
    null
  );
  const [chamadoDetalhes, setChamadoDetalhes] = useState<Chamado | null>(null);
  const [chamadoAlerta, setChamadoAlerta] = useState<Chamado | null>(null);
  const [historicoAbertoId, setHistoricoAbertoId] = useState<number | null>(
    null
  );

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [historicos, setHistoricos] = useState<HistoricoChamado[]>([]);
  const [leiturasHorimetro, setLeiturasHorimetro] = useState<
    LeituraHorimetro[]
  >([]);
  const [operacoesDiarias, setOperacoesDiarias] = useState<OperacaoDiaria[]>(
    []
  );
  const [preventivas, setPreventivas] = useState<PreventivaMaquina[]>([]);
  const [historicoPreventivas, setHistoricoPreventivas] = useState<
    HistoricoPreventiva[]
  >([]);
  const [buscaPreventivas, setBuscaPreventivas] = useState('');
  const [filtroPreventivas, setFiltroPreventivas] =
    useState<FiltroPreventiva>('Todos');
  const [preventivaSelecionada, setPreventivaSelecionada] =
    useState<PreventivaMaquina | null>(null);
  const [modoPreventiva, setModoPreventiva] = useState<
    'configurar' | 'registrar' | null
  >(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSistema, setErroSistema] = useState('');

  const [dataInicioRelatorio, setDataInicioRelatorio] =
    useState(primeiroDiaMesISO);
  const [dataFimRelatorio, setDataFimRelatorio] = useState(hojeISO);
  const [dataRelatorioDiario, setDataRelatorioDiario] = useState(hojeISO);
  const [dataControleHorimetros, setDataControleHorimetros] = useState(hojeISO);
  const [buscaControleHorimetros, setBuscaControleHorimetros] = useState('');
  const [filtroControleHorimetros, setFiltroControleHorimetros] = useState<
    'todos' | 'atualizados' | 'pendentes'
  >('todos');
  const [filtroMaquinaRelatorio, setFiltroMaquinaRelatorio] = useState('');
  const [filtroMecanicoRelatorio, setFiltroMecanicoRelatorio] = useState('');
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const temaClaro = true;
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'kanban'>(
    'lista'
  );
  const [online, setOnline] = useState(getConnectivitySnapshot);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(
    null
  );
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);
  const [filtroDataInicioChamados, setFiltroDataInicioChamados] = useState('');
  const [filtroDataFimChamados, setFiltroDataFimChamados] = useState('');
  const [filtroPrioridadeChamados, setFiltroPrioridadeChamados] = useState('');
  const [filtroMecanicoChamados, setFiltroMecanicoChamados] = useState('');
  const [filtroMaquinaChamados, setFiltroMaquinaChamados] = useState('');
  const [buscaMaquinas, setBuscaMaquinas] = useState('');
  const [maquinaNovoChamado, setMaquinaNovoChamado] = useState('');
  const [statusMaquinaNovoChamado, setStatusMaquinaNovoChamado] =
    useState<Maquina['status_maquina']>('Operacional');

  const isAdmin = usuarioLogado?.tipo === 'admin';
  const isOperador = usuarioLogado?.tipo === 'operador';
  const operacaoAtiva =
    isOperador && usuarioLogado
      ? operacoesDiarias.find(
          (op) => op.operador_id === usuarioLogado.id && op.ativo
        ) || null
      : null;

  const chamadosVisiveis = isAdmin
    ? chamados
    : chamados.filter((chamado) => {
        if (!usuarioLogado) {
          return false;
        }

        if (chamado.status === 'Aberto') {
          return true;
        }

        return (
          normalizarTexto(chamado.mecanico) ===
          normalizarTexto(usuarioLogado.nome)
        );
      });

  const chamadosAbertos = chamadosVisiveis.filter(
    (chamado) => chamado.status === 'Aberto'
  );

  const chamadosAssumidos = chamadosVisiveis.filter(
    (chamado) => chamado.status === 'Assumido'
  );

  const chamadosFinalizados = chamadosVisiveis.filter(
    (chamado) => chamado.status === 'Finalizado'
  );

  const chamadosFiltradosPorStatus =
    filtroChamados === 'Todos'
      ? chamadosVisiveis
      : filtroChamados === 'Ativos'
      ? chamadosVisiveis.filter((chamado) => chamado.status !== 'Finalizado')
      : chamadosVisiveis.filter((chamado) => chamado.status === filtroChamados);

  const maquinasFiltroChamados = Array.from(
    new Set(chamadosVisiveis.map((chamado) => chamado.maquina).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const mecanicosFiltroChamados = Array.from(
    new Set(
      chamadosVisiveis
        .map((chamado) => chamado.mecanico || 'Não informado')
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const chamadosFiltrados = chamadosFiltradosPorStatus
    .filter((chamado) => {
      const busca = normalizarTexto(buscaChamados);

      if (!busca) {
        return true;
      }

      return [
        chamado.id,
        chamado.maquina,
        chamado.cliente,
        chamado.solicitante,
        chamado.telefone,
        chamado.local,
        chamado.problema,
        chamado.prioridade,
        chamado.status,
        chamado.mecanico,
        chamado.solucao,
        chamado.diagnostico_tecnico,
        chamado.maquina_liberada === true
          ? 'maquina liberada sim'
          : chamado.maquina_liberada === false
          ? 'maquina liberada não'
          : '',
        chamado.necessita_retorno === true
          ? 'necessita retorno sim'
          : chamado.necessita_retorno === false
          ? 'necessita retorno não'
          : '',
        chamado.motivo_reabertura,
        chamado.motivo_edicao,
        chamado.criado_por,
        chamado.finalizado_por,
      ]
        .map((valor) => normalizarTexto(String(valor || '')))
        .some((valor) => valor.includes(busca));
    })
    .filter((chamado) => {
      const dataBase = (chamado.created_at || '').slice(0, 10);

      if (filtroDataInicioChamados && dataBase < filtroDataInicioChamados) {
        return false;
      }

      if (filtroDataFimChamados && dataBase > filtroDataFimChamados) {
        return false;
      }

      if (
        filtroPrioridadeChamados &&
        chamado.prioridade !== filtroPrioridadeChamados
      ) {
        return false;
      }

      if (filtroMaquinaChamados && chamado.maquina !== filtroMaquinaChamados) {
        return false;
      }

      const mecanicoChamado = chamado.mecanico || 'Não informado';

      if (
        filtroMecanicoChamados &&
        mecanicoChamado !== filtroMecanicoChamados
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const prioridadeA = prioridadeOrdem(a.prioridade);
      const prioridadeB = prioridadeOrdem(b.prioridade);

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      return b.id - a.id;
    });

  const chamadosFinalizadosComTempo = chamadosFinalizados
    .map((chamado) =>
      calcularMinutosEntre(chamado.iniciado_at, chamado.finalizado_at)
    )
    .filter((minutos): minutos is number => minutos !== null);

  const tempoMedioGeral =
    chamadosFinalizadosComTempo.length > 0
      ? Math.round(
          chamadosFinalizadosComTempo.reduce(
            (total, minutos) => total + minutos,
            0
          ) / chamadosFinalizadosComTempo.length
        )
      : 0;

  const rankingMecanicosFinalizados = Object.entries(
    chamadosFinalizados.reduce<Record<string, number>>((acc, chamado) => {
      const mecanico = chamado.mecanico || 'Não informado';
      acc[mecanico] = (acc[mecanico] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const rankingMaquinasChamados = Object.entries(
    chamadosVisiveis.reduce<Record<string, number>>((acc, chamado) => {
      acc[chamado.maquina] = (acc[chamado.maquina] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chamadosPorPrioridade = {
    Urgente: chamadosVisiveis.filter(
      (chamado) => chamado.prioridade === 'Urgente'
    ).length,
    Alta: chamadosVisiveis.filter((chamado) => chamado.prioridade === 'Alta')
      .length,
    Média: chamadosVisiveis.filter((chamado) => chamado.prioridade === 'Média')
      .length,
    Baixa: chamadosVisiveis.filter((chamado) => chamado.prioridade === 'Baixa')
      .length,
  };

  const tempoMedioPorMecanico = Object.entries(
    chamadosFinalizados.reduce<
      Record<string, { total: number; quantidade: number }>
    >((acc, chamado) => {
      const mecanico = chamado.mecanico || 'Não informado';
      const minutos = calcularMinutosEntre(
        chamado.iniciado_at,
        chamado.finalizado_at
      );

      if (minutos === null) {
        return acc;
      }

      if (!acc[mecanico]) {
        acc[mecanico] = { total: 0, quantidade: 0 };
      }

      acc[mecanico].total += minutos;
      acc[mecanico].quantidade += 1;
      return acc;
    }, {})
  )
    .map(
      ([mecanico, dados]) =>
        [mecanico, Math.round(dados.total / dados.quantidade)] as [
          string,
          number
        ]
    )
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5);

  useEffect(() => {
    instalarCssResponsivo();
    carregarDados(false);

    const canal = supabase
      .channel('controlmaq-atualizacao-automatica')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chamados' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maquinas' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'historico_chamados' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leituras_horimetro' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operacoes_diarias' },
        () => carregarDados(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'historico_preventivas' },
        () => carregarDados(false)
      )
      .subscribe();

    const intervalo = window.setInterval(() => {
      carregarDados(false);
    }, 20000);

    return () => {
      supabase.removeChannel(canal);
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(
    () =>
      subscribeConnectivity((estaOnline) => {
        setOnline(estaOnline);
        if (estaOnline) carregarDados(false);
      }),
    []
  );

  useEffect(() => {
    if (!usuarioLogado || usuarioLogado.tipo !== 'mecanico') {
      return;
    }

    const chave = `controlmaq_chamados_notificados_${usuarioLogado.id}`;
    let idsVistos: number[] = [];

    try {
      idsVistos = JSON.parse(localStorage.getItem(chave) || '[]');
    } catch {
      idsVistos = [];
    }

    const novos = chamados.filter(
      (chamado) =>
        chamado.status === 'Assumido' &&
        normalizarTexto(chamado.mecanico) ===
          normalizarTexto(usuarioLogado.nome) &&
        !idsVistos.includes(chamado.id)
    );

    if (novos.length === 0) {
      return;
    }

    const primeiroNovo = novos[0];
    setChamadoAlerta(primeiroNovo);
    setFiltroChamados('Assumido');
    tocarSomAlerta();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Novo chamado designado', {
        body: `Chamado #${primeiroNovo.id} - ${primeiroNovo.maquina}`,
      });
    }

    const alertaTimer = window.setTimeout(() => {
      alert(
        `Novo chamado designado para você!\n\nChamado #${primeiroNovo.id}\nMáquina: ${primeiroNovo.maquina}\nSolicitante: ${primeiroNovo.solicitante}`
      );
    }, 300);

    const novosIds = novos.map((chamado) => chamado.id);
    localStorage.setItem(chave, JSON.stringify([...idsVistos, ...novosIds]));

    return () => window.clearTimeout(alertaTimer);
  }, [chamados, usuarioLogado]);

  function salvarLoginLocal(usuario: Usuario) {
    localStorage.setItem(CHAVE_USUARIO_LOGADO, JSON.stringify(usuario));
  }

  async function carregarDados(mostrarCarregando = false) {
    try {
      if (mostrarCarregando) {
        setCarregando(true);
      }

      setErroSistema('');

      const [
        usuariosRes,
        maquinasRes,
        chamadosRes,
        historicosRes,
        leiturasRes,
        operacoesRes,
        prevData,
        histPrevData,
      ] = await Promise.allSettled([
        supabase
          .from('usuarios')
          .select('*')
          .order('nome', { ascending: true }),
        supabase.from('maquinas').select('*').order('tag', { ascending: true }),
        supabase.from('chamados').select('*').order('id', { ascending: false }),
        supabase
          .from('historico_chamados')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('leituras_horimetro')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('operacoes_diarias')
          .select('*')
          .order('iniciado_at', { ascending: false }),
        carregarPreventivas(),
        carregarHistoricoPreventivas(),
      ]);

      if (usuariosRes.status === 'fulfilled' && !usuariosRes.value.error) {
        setUsuarios((usuariosRes.value.data || []) as Usuario[]);
      }
      if (maquinasRes.status === 'fulfilled' && !maquinasRes.value.error) {
        setMaquinas((maquinasRes.value.data || []) as Maquina[]);
      }
      if (chamadosRes.status === 'fulfilled' && !chamadosRes.value.error) {
        setChamados((chamadosRes.value.data || []) as Chamado[]);
      }
      if (historicosRes.status === 'fulfilled' && !historicosRes.value.error) {
        setHistoricos((historicosRes.value.data || []) as HistoricoChamado[]);
      }
      if (leiturasRes.status === 'fulfilled' && !leiturasRes.value.error) {
        setLeiturasHorimetro(
          (leiturasRes.value.data || []) as LeituraHorimetro[]
        );
      }
      if (operacoesRes.status === 'fulfilled' && !operacoesRes.value.error) {
        setOperacoesDiarias(
          (operacoesRes.value.data || []) as OperacaoDiaria[]
        );
      }
      if (prevData.status === 'fulfilled') {
        setPreventivas(prevData.value);
      }
      if (histPrevData.status === 'fulfilled') {
        setHistoricoPreventivas(histPrevData.value);
      }

      setUltimaSincronizacao(new Date());
    } catch (erro) {
      console.warn('Erro ao atualizar dados em segundo plano:', erro);
    } finally {
      if (mostrarCarregando) {
        setCarregando(false);
      }
    }
  }

  async function registrarHistorico(
    chamadoId: number,
    acao: string,
    usuario: string
  ) {
    await supabase.from('historico_chamados').insert({
      chamado_id: chamadoId,
      acao,
      usuario,
    });
  }

  function formatarData(data?: string | null) {
    if (!data) {
      return 'Não informado';
    }

    return new Date(data).toLocaleString('pt-BR');
  }

  function formatarDuracao(minutos: number) {
    if (!Number.isFinite(minutos) || minutos <= 0) {
      return 'Não informado';
    }

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    if (horas <= 0) {
      return `${mins}min`;
    }

    return `${horas}h ${mins}min`;
  }

  function calcularMinutosEntre(inicio?: string | null, fim?: string | null) {
    if (!inicio || !fim) {
      return null;
    }

    const inicioMs = new Date(inicio).getTime();
    const fimMs = new Date(fim).getTime();

    if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs)) {
      return null;
    }

    const minutos = Math.round((fimMs - inicioMs) / 60000);

    if (minutos < 0) {
      return null;
    }

    return minutos;
  }

  function dataEstaNoPeriodo(data?: string | null) {
    if (!data) {
      return false;
    }

    const dataISO = data.slice(0, 10);

    if (dataInicioRelatorio && dataISO < dataInicioRelatorio) {
      return false;
    }

    if (dataFimRelatorio && dataISO > dataFimRelatorio) {
      return false;
    }

    return true;
  }

  function historicosDoChamado(chamadoId: number) {
    return historicos
      .filter((historico) => Number(historico.chamado_id) === Number(chamadoId))
      .sort((a, b) => {
        const dataA = new Date(a.created_at || '').getTime();
        const dataB = new Date(b.created_at || '').getTime();
        return dataA - dataB;
      });
  }

  function instalarCssResponsivo() {
    const id = 'controlmaq-css-profissional';

    if (document.getElementById(id)) {
      return;
    }

    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color-scheme: light;
      }
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html { scroll-behavior: smooth; background: #f4f6f8; }
      body { margin: 0; background: #f4f6f8; color: #172033; }
      button, a, input, textarea, select { font: inherit; }
      button, a { touch-action: manipulation; }
      button:not(:disabled), a { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease; }
      button:not(:disabled):hover, a:hover { transform: translateY(-1px); }
      button:not(:disabled):active, a:active { transform: translateY(0); }
      button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: 3px solid rgba(37, 99, 235, .20) !important;
        outline-offset: 2px !important;
        border-color: #2563eb !important;
      }
      input::placeholder, textarea::placeholder { color: #98a2b3; opacity: 1; }
      input[type="file"]::file-selector-button {
        border: 1px solid #d0d5dd;
        background: #ffffff;
        color: #344054;
        border-radius: 9px;
        padding: 9px 12px;
        margin-right: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      ::selection { background: rgba(253, 181, 21, .30); color: #172033; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: #eef1f5; }
      ::-webkit-scrollbar-thumb { background: #c5cad3; border-radius: 999px; border: 2px solid #eef1f5; }
      .controlmaq-sidebar-scroll::-webkit-scrollbar { width: 6px; }
      .controlmaq-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
      .controlmaq-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border: 0; }
      @keyframes controlmaqFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      main > * { animation: controlmaqFadeIn .28s ease both; }
      .controlmaq-main h1,
      .controlmaq-main h2,
      .controlmaq-main h3,
      .controlmaq-main h4,
      .controlmaq-main h5,
      .controlmaq-main h6 { color: #172033 !important; }
      .controlmaq-main { font-size: 16px; }
      @media (max-width: 1024px) {
        .controlmaq-desktop-sidebar { transform: translateX(-100%); }
        .controlmaq-sidebar-open { transform: translateX(0) !important; }
        .controlmaq-mobile-overlay { display: block !important; }
        .controlmaq-topbar { left: 0 !important; }
        .controlmaq-main { margin-left: 0 !important; padding-top: 94px !important; width: 100% !important; }
        .controlmaq-menu-button { display: inline-flex !important; }
      }
      @media (min-width: 1025px) {
        .controlmaq-mobile-overlay { display: none !important; }
        .controlmaq-menu-button { display: none !important; }
      }
      .controlmaq-bottom-nav { display: none; }
      @media (max-width: 720px) {
        html, body, #root { width: 100%; max-width: 100%; overflow-x: hidden !important; }
        body { background: #f5f7fa; }
        input, textarea, select, button, a { font-size: 16px !important; }

        .controlmaq-topbar {
          height: 66px !important;
          padding: 0 10px !important;
          left: 0 !important;
          right: 0 !important;
        }
        .controlmaq-topbar > div { gap: 8px !important; }
        .controlmaq-menu-button {
          width: 44px !important;
          height: 44px !important;
          flex: 0 0 44px !important;
        }
        .controlmaq-topbar-title { min-width: 0 !important; }
        .controlmaq-topbar-title h1 {
          font-size: 17px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 118px !important;
        }
        .controlmaq-topbar-title small { display: none !important; }
        .cm-topbar-right { gap: 7px !important; margin-left: auto !important; }
        .cm-user-pill { display: none !important; }
        .cm-online-pill {
          min-width: 0 !important;
          padding: 7px 9px !important;
          font-size: 11px !important;
          white-space: nowrap !important;
        }

        .controlmaq-main {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding: 82px 12px 96px !important;
          overflow-x: hidden !important;
        }
        .controlmaq-main > * { min-width: 0 !important; max-width: 100% !important; }
        .controlmaq-main h1 { font-size: 25px !important; line-height: 1.2 !important; }
        .controlmaq-main h2 { font-size: 23px !important; line-height: 1.25 !important; }
        .controlmaq-main h3 { font-size: 19px !important; line-height: 1.3 !important; }
        .controlmaq-main p, .controlmaq-main span, .controlmaq-main small { overflow-wrap: anywhere; }

        .controlmaq-main [style*="grid-template-columns"] {
          grid-template-columns: minmax(0, 1fr) !important;
          grid-column: auto !important;
        }
        .cm-kpi-grid, .cm-mini-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }
        .cm-summary-grid, .cm-ranking-grid, .cm-action-grid {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 12px !important;
        }
        .cm-summary-grid > *, .cm-ranking-grid > *, .cm-action-grid > * {
          grid-column: auto !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .controlmaq-main [style*="min-width"] { min-width: 0 !important; }
        .controlmaq-main [style*="max-width"] { max-width: 100% !important; }
        .controlmaq-main [style*="width: calc"] { width: 100% !important; }
        .controlmaq-main [style*="overflow-x"] { max-width: 100% !important; }

        .controlmaq-main button, .controlmaq-main a {
          min-height: 46px;
          max-width: 100%;
        }
        .controlmaq-main input, .controlmaq-main select, .controlmaq-main textarea {
          width: 100% !important;
          max-width: 100% !important;
        }
        .controlmaq-main textarea { min-height: 118px !important; }

        .controlmaq-main table {
          min-width: 680px !important;
          font-size: 12px !important;
        }
        .controlmaq-main table.closest, .controlmaq-main .table-wrapper { overflow-x: auto !important; }

        .controlmaq-desktop-sidebar {
          width: min(86vw, 330px) !important;
          max-width: 330px !important;
          box-shadow: 18px 0 45px rgba(16,24,40,.28) !important;
        }

        .controlmaq-bottom-nav {
          position: fixed;
          left: 8px;
          right: 8px;
          bottom: max(8px, env(safe-area-inset-bottom));
          z-index: 70;
          height: 68px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: stretch;
          padding: 6px;
          border: 1px solid rgba(16,24,40,.10);
          border-radius: 18px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 12px 36px rgba(16,24,40,.20);
          backdrop-filter: blur(16px);
        }
        .controlmaq-bottom-item {
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #667085;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 4px 2px;
          min-width: 0;
          font-weight: 750;
        }
        .controlmaq-bottom-item span {
          font-size: 10px !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .controlmaq-bottom-item.ativo {
          background: #fff7df;
          color: #9a6700;
        }

        .controlmaq-main [style*="border-radius: 12px"],
        .controlmaq-main [style*="border-radius: 14px"] {
          max-width: 100% !important;
        }
        .controlmaq-main [style*="display: flex"][style*="justify-content: space-between"] {
          flex-wrap: wrap !important;
          align-items: flex-start !important;
        }
      }
      @media (max-width: 390px) {
        .cm-kpi-grid, .cm-mini-grid { grid-template-columns: 1fr !important; }
        .controlmaq-topbar-title h1 { max-width: 92px !important; font-size: 16px !important; }
        .cm-online-pill { padding: 6px 8px !important; }
      }
      @media print {
        .controlmaq-desktop-sidebar, .controlmaq-topbar { display: none !important; }
        .controlmaq-main { margin: 0 !important; padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function tocarSomAlerta() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audio = new AudioContextClass();
      const oscilador = audio.createOscillator();
      const ganho = audio.createGain();

      oscilador.connect(ganho);
      ganho.connect(audio.destination);
      oscilador.frequency.value = 880;
      ganho.gain.value = 0.08;
      oscilador.start();

      window.setTimeout(() => {
        oscilador.stop();
        audio.close();
      }, 180);
    } catch (erro) {
      console.warn('Som de alerta bloqueado pelo navegador:', erro);
    }
  }

  async function entrarNoApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const loginDigitado = String(form.get('usuario') || '')
      .trim()
      .toLowerCase();
    const senhaDigitada = String(form.get('senha') || '').trim();

    if (!loginDigitado || !senhaDigitada) {
      alert('Digite usuário e senha.');
      return;
    }

    try {
      setSalvando(true);
      setErroSistema('');

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('login', loginDigitado)
        .maybeSingle();

      if (error) {
        console.error('Erro no login:', error);
        alert('Erro ao consultar usuário no banco.');
        return;
      }

      if (!data || String(data.senha ?? '').trim() !== senhaDigitada) {
        alert('Usuário ou senha inválidos.');
        return;
      }

      if (data.ativo === false) {
        alert('Este usuário está bloqueado. Procure o administrador.');
        return;
      }

      const agoraAcesso = new Date().toISOString();
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: agoraAcesso })
        .eq('id', data.id);

      const usuarioEncontrado = {
        ...data,
        ultimo_acesso: agoraAcesso,
      } as Usuario;

      setUsuarioLogado(usuarioEncontrado);
      salvarLoginLocal(usuarioEncontrado);

      setTela(
        usuarioEncontrado.tipo === 'operador' ? 'operacaoDiaria' : 'dashboard'
      );
      await carregarDados(false);
    } catch (erro) {
      console.error(erro);
      alert('Erro ao fazer login. Verifique a conexão com o Supabase.');
    } finally {
      setSalvando(false);
    }
  }

  async function assumirChamado(id: number) {
    if (!usuarioLogado) {
      alert('Você precisa estar logado.');
      return;
    }

    const chamadoAtual = chamados.find((chamado) => chamado.id === id);

    if (!chamadoAtual) {
      alert('Chamado não encontrado.');
      return;
    }

    if (chamadoAtual.status !== 'Aberto') {
      alert('Esse chamado já foi assumido ou finalizado.');
      return;
    }

    let mecanicoResponsavel = usuarioLogado.nome;

    if (usuarioLogado.tipo === 'admin') {
      const mecanicosCadastrados = usuarios.filter(
        (usuario) => usuario.tipo === 'mecanico'
      );

      const listaMecanicos =
        mecanicosCadastrados.length > 0
          ? mecanicosCadastrados
              .map((usuario) => `- ${usuario.nome}`)
              .join('\n')
          : 'Nenhum mecânico cadastrado.';

      const nomeInformado = prompt(
        `Digite o nome do mecânico responsável por assumir este chamado:\n\nMecânicos cadastrados:\n${listaMecanicos}`
      );

      if (!nomeInformado || nomeInformado.trim() === '') {
        alert('Informe o nome do mecânico responsável.');
        return;
      }

      const mecanicoEncontrado = mecanicosCadastrados.find(
        (usuario) =>
          normalizarTexto(usuario.nome) === normalizarTexto(nomeInformado)
      );

      if (!mecanicoEncontrado) {
        const confirmar = confirm(
          'Esse nome não foi encontrado exatamente na lista de mecânicos cadastrados.\n\nSe o nome não bater com o cadastro, o chamado pode não aparecer para o mecânico.\n\nDeseja continuar mesmo assim?'
        );

        if (!confirmar) {
          return;
        }

        mecanicoResponsavel = nomeInformado.trim();
      } else {
        mecanicoResponsavel = mecanicoEncontrado.nome;
      }
    }

    try {
      setSalvando(true);

      const agora = new Date().toISOString();

      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Assumido',
          mecanico: mecanicoResponsavel,
          iniciado_at: agora,
        })
        .eq('id', id)
        .eq('status', 'Aberto')
        .select()
        .single();

      if (error || !data) {
        alert('Não foi possível assumir. Talvez outro mecânico já assumiu.');
        await carregarDados(false);
        return;
      }

      const chamadoAtualizado = data as Chamado;

      setChamados((listaAtual) =>
        listaAtual.map((chamado) =>
          chamado.id === id ? chamadoAtualizado : chamado
        )
      );

      await registrarHistorico(
        id,
        `Chamado assumido/designado para ${mecanicoResponsavel}`,
        usuarioLogado.nome
      );

      setFiltroChamados('Assumido');
      alert(`${mecanicoResponsavel} assumiu o chamado com sucesso!`);
    } catch (erro) {
      console.error(erro);
      alert('Erro ao assumir chamado.');
    } finally {
      setSalvando(false);
    }
  }

  async function reabrirChamado(chamadoAlvo: Chamado) {
    if (!isAdmin || !usuarioLogado) {
      alert('Apenas o administrador pode reabrir chamados.');
      return;
    }

    if (chamadoAlvo.status !== 'Assumido') {
      alert('Apenas chamados assumidos podem ser reabertos.');
      return;
    }

    const motivoReabertura = prompt(
      `Informe o motivo da reabertura do chamado #${chamadoAlvo.id}:\n\nExemplo: trocar mecânico responsável, corrigir designação ou complementar atendimento.`
    );

    if (!motivoReabertura || motivoReabertura.trim() === '') {
      alert('Para reabrir um chamado, informe o motivo.');
      return;
    }

    const confirmar = confirm(
      `Deseja reabrir o chamado #${
        chamadoAlvo.id
      }?\n\nO mecânico atual será removido e o chamado voltará para aberto.\n\nMotivo: ${motivoReabertura.trim()}`
    );

    if (!confirmar) {
      return;
    }

    try {
      setSalvando(true);

      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Aberto',
          mecanico: null,
          iniciado_at: null,
          motivo_reabertura: motivoReabertura.trim(),
        })
        .eq('id', chamadoAlvo.id)
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao reabrir chamado:', error);
        alert('Erro ao reabrir chamado.');
        return;
      }

      const chamadoAtualizado = data as Chamado;

      setChamados((listaAtual) =>
        listaAtual.map((chamado) =>
          chamado.id === chamadoAtualizado.id ? chamadoAtualizado : chamado
        )
      );

      await registrarHistorico(
        chamadoAtualizado.id,
        `Chamado reaberto por ${
          usuarioLogado.nome
        }. Motivo: ${motivoReabertura.trim()}`,
        usuarioLogado.nome
      );

      setFiltroChamados('Aberto');
      alert('Chamado reaberto com sucesso!');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao reabrir chamado.');
    } finally {
      setSalvando(false);
    }
  }

  function abrirTelaEditar(chamado: Chamado) {
    if (!isAdmin) {
      alert('Apenas o administrador pode editar chamados.');
      return;
    }

    if (chamado.status === 'Finalizado') {
      alert('Chamados finalizados não podem ser editados.');
      return;
    }

    setChamadoParaEditar(chamado);
    setTela('editarChamado');
  }

  async function salvarEdicaoChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin || !usuarioLogado || !chamadoParaEditar) {
      alert('Apenas o administrador pode editar chamados.');
      return;
    }

    const form = new FormData(event.currentTarget);

    const maquina = String(form.get('maquina') || '').trim();
    const cliente = String(form.get('cliente') || '').trim();
    const solicitante = String(form.get('solicitante') || '').trim();
    const telefone = String(form.get('telefone') || '').trim();
    const local = String(form.get('local') || '').trim();
    const problema = String(form.get('problema') || '').trim();
    const prioridade = String(
      form.get('prioridade') || 'Média'
    ) as Chamado['prioridade'];
    const observacaoInterna = String(
      form.get('observacaoInterna') || ''
    ).trim();

    if (!maquina || !cliente || !solicitante || !local || !problema) {
      alert('Preencha máquina, cliente, solicitante, local e problema.');
      return;
    }

    const motivoEdicao = prompt(
      `Informe o motivo da edição do chamado #${chamadoParaEditar.id}:\n\nExemplo: corrigir endereço, atualizar solicitante, ajustar prioridade ou complementar problema.`
    );

    if (!motivoEdicao || motivoEdicao.trim() === '') {
      alert('Para editar um chamado, informe o motivo da edição.');
      return;
    }

    try {
      setSalvando(true);

      const { data, error } = await supabase
        .from('chamados')
        .update({
          maquina,
          cliente,
          solicitante,
          telefone,
          local,
          problema,
          prioridade,
          observacao_interna: observacaoInterna || null,
          motivo_edicao: motivoEdicao.trim(),
        })
        .eq('id', chamadoParaEditar.id)
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao editar chamado:', error);
        alert('Erro ao editar chamado.');
        return;
      }

      const chamadoAtualizado = data as Chamado;

      setChamados((listaAtual) =>
        listaAtual.map((chamado) =>
          chamado.id === chamadoAtualizado.id ? chamadoAtualizado : chamado
        )
      );

      await registrarHistorico(
        chamadoAtualizado.id,
        `Chamado editado por ${
          usuarioLogado.nome
        }. Motivo: ${motivoEdicao.trim()}`,
        usuarioLogado.nome
      );

      setChamadoParaEditar(null);
      alert('Chamado editado com sucesso!');
      setTela('chamados');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao editar chamado.');
    } finally {
      setSalvando(false);
    }
  }

  function abrirTelaFinalizar(id: number) {
    if (!usuarioLogado) {
      alert('Você precisa estar logado.');
      return;
    }

    const chamadoAtual = chamados.find((chamado) => chamado.id === id);

    if (!chamadoAtual) {
      alert('Chamado não encontrado.');
      return;
    }

    if (chamadoAtual.status === 'Finalizado') {
      alert('Esse chamado já está finalizado.');
      return;
    }

    if (
      usuarioLogado.tipo === 'mecanico' &&
      normalizarTexto(chamadoAtual.mecanico) !==
        normalizarTexto(usuarioLogado.nome)
    ) {
      alert('Você só pode finalizar chamados assumidos por você.');
      return;
    }

    setChamadoParaFinalizar(chamadoAtual);
    setTela('finalizarChamado');
  }

  async function concluirFinalizacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuarioLogado || !chamadoParaFinalizar) {
      alert('Chamado não encontrado para finalização.');
      return;
    }

    let mecanicoResponsavel = chamadoParaFinalizar.mecanico;

    const form = new FormData(event.currentTarget);
    const mecanicoInterno = String(form.get('mecanicoInterno') || '').trim();
    const diagnosticoTecnico = String(
      form.get('diagnosticoTecnico') || ''
    ).trim();
    const solucao = String(form.get('solucao') || '').trim();
    const maquinaLiberada =
      String(form.get('maquinaLiberada') || 'sim') === 'sim';
    const necessitaRetorno =
      String(form.get('necessitaRetorno') || 'nao') === 'sim';

    if (usuarioLogado.tipo === 'admin' && !mecanicoResponsavel) {
      if (!mecanicoInterno) {
        alert('Informe o nome do mecânico interno.');
        return;
      }

      mecanicoResponsavel = mecanicoInterno;
    }

    if (!diagnosticoTecnico) {
      alert('Informe o diagnóstico técnico.');
      return;
    }

    if (!solucao) {
      alert('Informe o serviço realizado.');
      return;
    }

    try {
      setSalvando(true);

      const agora = new Date().toISOString();

      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Finalizado',
          mecanico: mecanicoResponsavel,
          diagnostico_tecnico: diagnosticoTecnico,
          solucao,
          maquina_liberada: maquinaLiberada,
          necessita_retorno: necessitaRetorno,
          finalizado_por: usuarioLogado.nome,
          iniciado_at: chamadoParaFinalizar.iniciado_at || agora,
          finalizado_at: agora,
        })
        .eq('id', chamadoParaFinalizar.id)
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao finalizar chamado:', error);
        alert('Erro ao finalizar chamado.');
        return;
      }

      const chamadoAtualizado = data as Chamado;

      setChamados((listaAtual) =>
        listaAtual.map((chamado) =>
          chamado.id === chamadoAtualizado.id ? chamadoAtualizado : chamado
        )
      );

      await registrarHistorico(
        chamadoAtualizado.id,
        `Chamado finalizado por ${usuarioLogado.nome}. Máquina liberada: ${
          maquinaLiberada ? 'Sim' : 'Não'
        }. Necessita retorno: ${necessitaRetorno ? 'Sim' : 'Não'}.`,
        usuarioLogado.nome
      );

      setChamadoParaFinalizar(null);
      setFiltroChamados('Finalizado');
      setTela('chamados');

      alert('Chamado finalizado e salvo no histórico!');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao finalizar chamado.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin || !usuarioLogado) {
      alert('Apenas o administrador pode criar chamados.');
      return;
    }

    const formulario = event.currentTarget;
    const form = new FormData(formulario);

    const maquina = String(form.get('maquina') || '').trim();
    const cliente = String(form.get('cliente') || '').trim();
    const solicitante = String(form.get('solicitante') || '').trim();
    const telefone = String(form.get('telefone') || '').trim();
    const local = String(form.get('local') || '').trim();
    const problema = String(form.get('problema') || '').trim();
    const prioridade = String(
      form.get('prioridade') || 'Média'
    ) as Chamado['prioridade'];
    const statusMaquina = String(
      form.get('statusMaquina') || 'Operacional'
    ) as Maquina['status_maquina'];
    const observacaoInterna = String(
      form.get('observacaoInterna') || ''
    ).trim();

    const campoFoto = form.get('fotoProblema');
    const arquivoFoto =
      campoFoto instanceof File && campoFoto.size > 0 ? campoFoto : null;

    if (!maquina || !cliente || !solicitante || !local || !problema) {
      alert('Preencha máquina, cliente, solicitante, local e problema.');
      return;
    }

    if (arquivoFoto) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

      if (!tiposPermitidos.includes(arquivoFoto.type)) {
        alert('A foto deve estar nos formatos JPG, PNG ou WEBP.');
        return;
      }

      if (arquivoFoto.size > 8 * 1024 * 1024) {
        alert('A foto deve ter no máximo 8 MB.');
        return;
      }
    }

    let chamadoCriado: Chamado | null = null;
    let caminhoFotoEnviada: string | null = null;

    try {
      setSalvando(true);

      const { data, error } = await supabase
        .from('chamados')
        .insert({
          maquina,
          cliente,
          solicitante,
          telefone: telefone || null,
          local,
          problema,
          prioridade,
          observacao_interna: observacaoInterna || null,
          foto_problema_url: null,
          status: 'Aberto',
          criado_por: usuarioLogado.nome,
        })
        .select()
        .single();

      if (error || !data) {
        alert('Erro do Supabase ao criar chamado.');
        return;
      }

      chamadoCriado = data as Chamado;

      const { data: maquinaAtualizada } = await supabase
        .from('maquinas')
        .update({ status_maquina: statusMaquina })
        .eq('tag', maquina)
        .select()
        .maybeSingle();

      if (maquinaAtualizada) {
        setMaquinas((listaAtual) =>
          listaAtual.map((item) =>
            item.id === (maquinaAtualizada as Maquina).id
              ? (maquinaAtualizada as Maquina)
              : item
          )
        );
      }

      if (arquivoFoto) {
        const extensao =
          arquivoFoto.name.split('.').pop()?.toLowerCase() || 'jpg';
        const nomeSeguro = `${
          chamadoCriado.id
        }-${Date.now()}-${crypto.randomUUID()}.${extensao}`;
        caminhoFotoEnviada = `chamados/${nomeSeguro}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos-chamados')
          .upload(caminhoFotoEnviada, arquivoFoto, {
            cacheControl: '3600',
            upsert: false,
            contentType: arquivoFoto.type || 'image/jpeg',
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('fotos-chamados')
            .getPublicUrl(caminhoFotoEnviada);

          const { data: chamadoComFoto } = await supabase
            .from('chamados')
            .update({ foto_problema_url: urlData.publicUrl })
            .eq('id', chamadoCriado.id)
            .select()
            .single();

          if (chamadoComFoto) {
            chamadoCriado = chamadoComFoto as Chamado;
          }
        }
      }

      setChamados((listaAtual) => [chamadoCriado as Chamado, ...listaAtual]);

      try {
        await registrarHistorico(
          chamadoCriado.id,
          `Chamado criado por ${usuarioLogado.nome}. Situação informada da máquina: ${statusMaquina}`,
          usuarioLogado.nome
        );
      } catch (historicoError) {
        console.warn('Histórico falhou:', historicoError);
      }

      formulario.reset();
      setMaquinaNovoChamado('');
      setStatusMaquinaNovoChamado('Operacional');
      setFiltroChamados('Aberto');
      alert(`Chamado #${chamadoCriado.id} criado com sucesso!`);
      setTela('chamados');
    } catch (erro) {
      console.error('Erro ao criar chamado:', erro);
      alert('Erro inesperado ao criar chamado.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarMaquina(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      alert('Apenas o administrador pode cadastrar máquinas.');
      return;
    }

    const form = new FormData(event.currentTarget);

    const tag = String(form.get('tag') || '')
      .trim()
      .toUpperCase();
    const modelo = String(form.get('modelo') || '').trim();
    const marca = String(form.get('marca') || '').trim();
    const horimetroTexto = String(form.get('horimetro') || '').trim();
    const horimetro = horimetroTexto
      ? Number(horimetroTexto.replace(',', '.'))
      : null;
    const observacao = String(form.get('observacao') || '').trim();

    if (!tag || !modelo || !marca) {
      alert('Preencha TAG, modelo e marca.');
      return;
    }

    try {
      setSalvando(true);

      const { data: maquinaExistente } = await supabase
        .from('maquinas')
        .select('*')
        .eq('tag', tag)
        .maybeSingle();

      if (maquinaExistente) {
        alert('Já existe uma máquina cadastrada com essa TAG.');
        return;
      }

      const { data, error } = await supabase
        .from('maquinas')
        .insert({
          tag,
          modelo,
          marca,
          horimetro: Number.isFinite(horimetro) ? horimetro : null,
          observacao: observacao || null,
        })
        .select()
        .single();

      if (error || !data) {
        alert('Erro ao cadastrar máquina.');
        return;
      }

      const maquinaCriada = data as Maquina;

      setMaquinas((listaAtual) =>
        [...listaAtual, maquinaCriada].sort((a, b) =>
          a.tag.localeCompare(b.tag)
        )
      );

      alert('Máquina cadastrada com sucesso!');
      setTela('maquinas');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao cadastrar máquina.');
    } finally {
      setSalvando(false);
    }
  }

  async function alterarHorimetroManual(maquinaAlvo: Maquina) {
    if (!isAdmin) {
      alert('Apenas o administrador pode alterar horímetros.');
      return;
    }

    const horimetroAtual = maquinaAlvo.horimetro ?? 0;
    const novoHorimetroTexto = prompt(
      `Máquina: ${
        maquinaAlvo.tag
      }\nHorímetro atual: ${horimetroAtual.toLocaleString(
        'pt-BR'
      )} h\n\nDigite o novo horímetro (Ex: 1250.5):`
    );

    if (!novoHorimetroTexto || novoHorimetroTexto.trim() === '') {
      return;
    }

    const novoHorimetro = Number(novoHorimetroTexto.replace(',', '.'));

    if (!Number.isFinite(novoHorimetro) || novoHorimetro < 0) {
      alert('Digite um horímetro válido (número maior ou igual a zero).');
      return;
    }

    const confirmar = confirm(
      `Confirmar alteração do horímetro?\n\nMáquina: ${
        maquinaAlvo.tag
      }\nDe: ${horimetroAtual.toLocaleString(
        'pt-BR'
      )} h\nPara: ${novoHorimetro.toLocaleString('pt-BR')} h`
    );

    if (!confirmar) return;

    try {
      setSalvando(true);

      const { data, error } = await supabase
        .from('maquinas')
        .update({ horimetro: novoHorimetro })
        .eq('id', maquinaAlvo.id)
        .select()
        .single();

      if (error || !data) {
        alert('Erro ao atualizar horímetro no banco.');
        return;
      }

      await supabase.from('leituras_horimetro').insert({
        maquina_id: maquinaAlvo.id,
        maquina_tag: maquinaAlvo.tag,
        operador_id: String(usuarioLogado?.id),
        operador_nome: usuarioLogado?.nome,
        horimetro: novoHorimetro,
        origem: 'ajuste_administrador',
        observacao: `Ajuste manual realizado pelo administrador (De: ${horimetroAtual.toLocaleString(
          'pt-BR'
        )} h)`,
      });

      setMaquinas((listaAtual) =>
        listaAtual.map((m) =>
          m.id === maquinaAlvo.id ? { ...m, horimetro: novoHorimetro } : m
        )
      );

      alert('Horímetro atualizado com sucesso!');
    } catch (erro) {
      console.error('Erro ao alterar horímetro:', erro);
      alert('Erro inesperado ao alterar horímetro.');
    } finally {
      setSalvando(false);
    }
  }

  function ehFiltroPreventiva(valor: string): valor is FiltroPreventiva {
    return [
      'Todos',
      'Em dia',
      'Atenção',
      'Urgente',
      'Vencida',
      'Não configurada',
    ].includes(valor);
  }

  function fecharModalPreventiva() {
    setModoPreventiva(null);
    setPreventivaSelecionada(null);
  }

  function corStatusPreventiva(status: StatusPreventiva): string {
    const cores: Record<StatusPreventiva, string> = {
      'Em dia': '#22c55e',
      Atenção: '#f59e0b',
      Urgente: '#f97316',
      Vencida: '#ef4444',
      'Não configurada': '#64748b',
      'Sem horímetro': '#64748b',
    };

    return cores[status];
  }

  function lerNumeroFormulario(valor: FormDataEntryValue | null): number {
    return Number(
      String(valor || '')
        .trim()
        .replace(',', '.')
    );
  }

  async function salvarConfiguracaoPreventiva(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!isAdmin || !preventivaSelecionada) {
      alert('Apenas o administrador pode configurar preventivas.');
      return;
    }

    const formulario = new FormData(event.currentTarget);
    const intervaloHoras = lerNumeroFormulario(formulario.get('intervalo'));
    const horimetroUltimaPreventiva = lerNumeroFormulario(
      formulario.get('ultima')
    );

    if (!Number.isFinite(intervaloHoras) || intervaloHoras <= 0) {
      alert('O intervalo da preventiva deve ser maior que zero.');
      return;
    }

    if (
      !Number.isFinite(horimetroUltimaPreventiva) ||
      horimetroUltimaPreventiva < 0
    ) {
      alert('Informe um horímetro válido para a última preventiva.');
      return;
    }

    try {
      setSalvando(true);

      await configurarPreventiva({
        maquinaId: preventivaSelecionada.maquina_id,
        intervaloHoras,
        horimetroUltimaPreventiva,
      });

      await carregarDados(false);
      fecharModalPreventiva();
      alert('Preventiva configurada com sucesso!');
    } catch (erro) {
      console.error('Erro ao configurar preventiva:', erro);
      alert('Não foi possível configurar a preventiva.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRegistroPreventiva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin || !preventivaSelecionada || !usuarioLogado) {
      alert('Apenas o administrador pode registrar preventivas.');
      return;
    }

    const formulario = new FormData(event.currentTarget);
    const horimetroPreventiva = lerNumeroFormulario(
      formulario.get('horimetro')
    );
    const mecanicoResponsavel = String(
      formulario.get('mecanicoResponsavel') || ''
    ).trim();
    const observacao = String(formulario.get('observacao') || '').trim();

    if (!Number.isFinite(horimetroPreventiva) || horimetroPreventiva < 0) {
      alert('Informe um horímetro válido para a preventiva.');
      return;
    }

    if (!observacao) {
      alert('Descreva os serviços realizados na preventiva.');
      return;
    }

    try {
      setSalvando(true);

      await registrarPreventiva({
        maquinaId: preventivaSelecionada.maquina_id,
        horimetroPreventiva,
        mecanicoResponsavel: mecanicoResponsavel || usuarioLogado.nome,
        observacao,
        registradoPor: usuarioLogado.nome,
      });

      await carregarDados(false);
      fecharModalPreventiva();
      alert('Preventiva registrada com sucesso!');
    } catch (erro) {
      console.error('Erro ao registrar preventiva:', erro);
      alert('Não foi possível registrar a preventiva.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMaquina(maquinaAlvo: Maquina) {
    if (!isAdmin) {
      alert('Apenas o administrador pode excluir máquinas.');
      return;
    }

    const confirmar = confirm(
      `Tem certeza que deseja excluir a máquina ${maquinaAlvo.tag}?`
    );

    if (!confirmar) {
      return;
    }

    try {
      setSalvando(true);

      const { error } = await supabase
        .from('maquinas')
        .delete()
        .eq('id', maquinaAlvo.id);

      if (error) {
        alert('Erro ao excluir máquina.');
        return;
      }

      setMaquinas((listaAtual) =>
        listaAtual.filter((maquina) => maquina.id !== maquinaAlvo.id)
      );

      alert('Máquina excluída do cadastro.');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao excluir máquina.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      alert('Apenas o administrador pode criar usuários.');
      return;
    }

    const form = new FormData(event.currentTarget);

    const nome = String(form.get('nome') || '').trim();
    const login = String(form.get('usuario') || '')
      .trim()
      .toLowerCase();
    const senha = String(form.get('senha') || '').trim();
    const tipo = String(form.get('perfil') || 'mecanico') as PerfilUsuario;

    if (!nome || !login || !senha) {
      alert('Preencha nome, usuário e senha.');
      return;
    }

    try {
      setSalvando(true);

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          nome,
          login,
          senha,
          tipo,
          ativo: true,
        })
        .select()
        .single();

      if (error || !data) {
        alert('Erro ao criar usuário.');
        return;
      }

      setUsuarios((listaAtual) =>
        [...listaAtual, data as Usuario].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        )
      );

      alert('Usuário criado com sucesso!');
      setTela('usuarios');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao criar usuário.');
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenha(usuarioAlvo: Usuario) {
    if (!isAdmin) {
      alert('Apenas o administrador pode alterar senhas.');
      return;
    }

    const novaSenha = prompt(`Digite a nova senha para ${usuarioAlvo.nome}:`);

    if (!novaSenha || novaSenha.trim() === '') {
      return;
    }

    try {
      setSalvando(true);

      const { error } = await supabase
        .from('usuarios')
        .update({ senha: novaSenha.trim() })
        .eq('id', usuarioAlvo.id);

      if (error) {
        alert('Erro ao alterar senha.');
        return;
      }

      setUsuarios((listaAtual) =>
        listaAtual.map((usuario) =>
          usuario.id === usuarioAlvo.id
            ? { ...usuario, senha: novaSenha.trim() }
            : usuario
        )
      );

      alert('Senha alterada com sucesso.');
    } catch (erro) {
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    if (usuarioLogado?.id === usuarioAlvo.id) {
      alert('Você não pode bloquear o usuário que está logado.');
      return;
    }

    const novoStatus = usuarioAlvo.ativo === false;
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: novoStatus })
      .eq('id', usuarioAlvo.id);

    if (!error) {
      setUsuarios((atuais) =>
        atuais.map((usuario) =>
          usuario.id === usuarioAlvo.id
            ? { ...usuario, ativo: novoStatus }
            : usuario
        )
      );
    }
  }

  async function alternarPerfilUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    if (usuarioLogado?.id === usuarioAlvo.id) {
      alert('Para segurança, altere o perfil de outro administrador.');
      return;
    }

    const novoPerfil: PerfilUsuario =
      usuarioAlvo.tipo === 'admin' ? 'mecanico' : 'admin';

    const { error } = await supabase
      .from('usuarios')
      .update({ tipo: novoPerfil })
      .eq('id', usuarioAlvo.id);

    if (!error) {
      setUsuarios((atuais) =>
        atuais.map((usuario) =>
          usuario.id === usuarioAlvo.id
            ? { ...usuario, tipo: novoPerfil }
            : usuario
        )
      );
    }
  }

  async function excluirUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin || usuarioLogado?.id === usuarioAlvo.id) return;

    const confirmar = confirm(
      `Tem certeza que deseja excluir o usuário ${usuarioAlvo.nome}?`
    );

    if (!confirmar) return;

    try {
      setSalvando(true);

      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuarioAlvo.id);

      if (!error) {
        setUsuarios((listaAtual) =>
          listaAtual.filter((usuario) => usuario.id !== usuarioAlvo.id)
        );
        alert('Usuário excluído com sucesso.');
      }
    } catch (erro) {
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirChamado(chamadoAlvo: Chamado) {
    if (!isAdmin) return;

    const confirmar = confirm(
      `Tem certeza que deseja excluir o chamado #${chamadoAlvo.id}?`
    );

    if (!confirmar) return;

    try {
      setSalvando(true);

      await supabase
        .from('historico_chamados')
        .delete()
        .eq('chamado_id', chamadoAlvo.id);

      const { error } = await supabase
        .from('chamados')
        .delete()
        .eq('id', chamadoAlvo.id);

      if (!error) {
        setChamados((listaAtual) =>
          listaAtual.filter((chamado) => chamado.id !== chamadoAlvo.id)
        );
        alert('Chamado excluído com sucesso.');
      }
    } catch (erro) {
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  async function iniciarOperacaoDiaria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;

    if (!usuarioLogado || usuarioLogado.tipo !== 'operador') {
      alert('Apenas operadores podem iniciar uma operação diária.');
      return;
    }

    const form = new FormData(event.currentTarget);
    const maquinaId = Number(form.get('maquina_id'));
    const horimetro = Number(
      String(form.get('horimetro') || '').replace(',', '.')
    );
    const observacao = String(form.get('observacao') || '').trim();
    const maquina = maquinas.find((item) => item.id === maquinaId);

    if (!maquina) {
      alert('Selecione o equipamento em operação.');
      return;
    }

    try {
      setSalvando(true);
      await iniciarOperacao({
        operadorId: String(usuarioLogado.id),
        operadorNome: usuarioLogado.nome,
        maquinaId: maquina.id,
        maquinaTag: maquina.tag,
        horimetro,
        observacao,
      });

      await carregarDados(false);
      alert(`Equipamento ${maquina.tag} vinculado com sucesso.`);
      formulario.reset();
    } catch (erro) {
      alert(
        `Não foi possível iniciar a operação.\n\n${mensagemErroOperacao(erro)}`
      );
    } finally {
      setSalvando(false);
    }
  }

  async function encerrarOperacaoDiaria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    if (!usuarioLogado || !operacaoAtiva) return;

    const form = new FormData(event.currentTarget);
    const horimetroFinal = Number(
      String(form.get('horimetro_final') || '').replace(',', '.')
    );
    const observacaoFinal = String(form.get('observacao_final') || '').trim();

    try {
      setSalvando(true);
      await encerrarOperacao({
        operacaoId: operacaoAtiva.id,
        operadorId: String(usuarioLogado.id),
        operadorNome: usuarioLogado.nome,
        maquinaId: operacaoAtiva.maquina_id,
        maquinaTag: operacaoAtiva.maquina_tag,
        horimetroFinal,
        observacao: observacaoFinal,
      });

      await carregarDados(false);
      alert('Operação encerrada e horímetro atualizado.');
      formulario.reset();
    } catch (erro) {
      alert(
        `Não foi possível encerrar a operação.\n\n${mensagemErroOperacao(erro)}`
      );
    } finally {
      setSalvando(false);
    }
  }

  function sair() {
    localStorage.removeItem(CHAVE_USUARIO_LOGADO);
    setUsuarioLogado(null);
    setTela('login');
  }

  function escaparHtml(valor?: string | number | null) {
    return String(valor ?? 'Não informado')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function textoPdf(valor?: string | number | null) {
    const texto = String(valor ?? 'Não informado').trim();
    return escaparHtml(texto || 'Não informado').replace(/\n/g, '<br />');
  }

  function classeStatusPdf(status: StatusChamado) {
    if (status === 'Aberto') return 'badge aberto';
    if (status === 'Assumido') return 'badge assumido';
    return 'badge finalizado';
  }

  function classePrioridadePdf(prioridade: Chamado['prioridade']) {
    if (prioridade === 'Urgente') return 'badge urgente';
    if (prioridade === 'Alta') return 'badge alta';
    if (prioridade === 'Média') return 'badge media';
    return 'badge baixa';
  }

  function gerarHtmlChamado(
    chamado: Chamado,
    incluirObservacaoInterna = false
  ) {
    const historico = historicosDoChamado(chamado.id);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      chamado.local
    )}`;

    const duracaoMinutos = calcularMinutosEntre(
      chamado.iniciado_at,
      chamado.finalizado_at
    );

    const observacaoInternaHtml = incluirObservacaoInterna
      ? `<section class="section alerta-interno">
          <div class="section-title">Observação interna do ADM</div>
          <div class="texto-longo">${textoPdf(
            chamado.observacao_interna || 'Nenhuma observação interna.'
          )}</div>
        </section>`
      : '';

    const historicoHtml =
      historico.length === 0
        ? `<div class="vazio">Nenhum histórico registrado.</div>`
        : historico
            .map(
              (item) => `<div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <strong>${textoPdf(formatarData(item.created_at))}</strong>
                    <span>${textoPdf(item.acao)}</span>
                    <small>Usuário: ${textoPdf(
                      item.usuario || 'Não informado'
                    )}</small>
                  </div>
                </div>`
            )
            .join('');

    return `
      <html>
        <head>
          <title>ControlMaq - Chamado #${chamado.id}</title>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #f1f5f9; padding: 15mm; }
            .pagina { width: 100%; max-width: 210mm; margin: 0 auto; background: #ffffff; padding: 10mm; border-radius: 8px; }
            .topo { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 18px; border-radius: 12px; margin-bottom: 15px; }
            .section { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
            .section-title { background: #0f172a; color: #ffffff; padding: 8px 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
            .campo { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            .campo-label { color: #64748b; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .campo-valor { font-size: 13px; font-weight: 600; margin-top: 2px; }
            .texto-longo { padding: 12px; font-size: 13px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <main class="pagina">
            <header class="topo">
              <div>
                <h1 style="margin:0; font-size:24px;">ControlMaq</h1>
                <p style="margin:0; color:#facc15; font-size:12px;">LOKMAX - Ordem de Serviço</p>
              </div>
              <div style="text-align:right;">
                <strong>Chamado #${textoPdf(chamado.id)}</strong>
                <div style="font-size:11px; color:#cbd5e1;">${textoPdf(
                  formatarData(new Date().toISOString())
                )}</div>
              </div>
            </header>

            <section class="section">
              <div class="section-title">Dados do Atendimento</div>
              <div class="grid">
                <div class="campo"><div class="campo-label">Máquina</div><div class="campo-valor">${textoPdf(
                  chamado.maquina
                )}</div></div>
                <div class="campo"><div class="campo-label">Cliente</div><div class="campo-valor">${textoPdf(
                  chamado.cliente
                )}</div></div>
                <div class="campo"><div class="campo-label">Solicitante</div><div class="campo-valor">${textoPdf(
                  chamado.solicitante
                )}</div></div>
                <div class="campo"><div class="campo-label">Mecânico</div><div class="campo-valor">${textoPdf(
                  chamado.mecanico
                )}</div></div>
              </div>
            </section>

            <section class="section">
              <div class="section-title">Problema Relatado</div>
              <div class="texto-longo">${textoPdf(chamado.problema)}</div>
            </section>

            <section class="section">
              <div class="section-title">Diagnóstico Técnico</div>
              <div class="texto-longo">${textoPdf(
                chamado.diagnostico_tecnico
              )}</div>
            </section>

            <section class="section">
              <div class="section-title">Serviço Realizado</div>
              <div class="texto-longo">${textoPdf(chamado.solucao)}</div>
            </section>

            ${observacaoInternaHtml}
          </main>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
  }

  function gerarPdfChamado(chamado: Chamado, incluirObservacaoInterna = false) {
    const janela = window.open('', '_blank');

    if (!janela) {
      alert(
        'O navegador bloqueou a abertura do PDF. Permita pop-ups para este site.'
      );
      return;
    }

    janela.document.open();
    janela.document.write(gerarHtmlChamado(chamado, incluirObservacaoInterna));
    janela.document.close();
  }

  function gerarPdfRelatorio(
    chamadosFinalizadosNoPeriodo: Chamado[],
    resumo: string
  ) {
    const janela = window.open('', '_blank');
    if (!janela) return;

    const linhas = chamadosFinalizadosNoPeriodo
      .map(
        (chamado) => `
          <tr>
            <td><strong>#${textoPdf(chamado.id)}</strong></td>
            <td>${textoPdf(chamado.maquina)}</td>
            <td>${textoPdf(chamado.solicitante)}</td>
            <td>${textoPdf(chamado.mecanico || 'Não informado')}</td>
            <td>${textoPdf(formatarData(chamado.finalizado_at))}</td>
            <td>${textoPdf(chamado.problema)}</td>
            <td>${textoPdf(chamado.solucao || 'Não informado')}</td>
          </tr>`
      )
      .join('');

    janela.document.open();
    janela.document.write(`
      <html>
        <head>
          <title>ControlMaq - Relatório</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #172033; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #0f172a; color: #fff; }
          </style>
        </head>
        <body>
          <h2>ControlMaq — Relatório por Período</h2>
          <p>${textoPdf(resumo)}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Máquina</th><th>Solicitante</th><th>Mecânico</th><th>Finalizado</th><th>Problema</th><th>Solução</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  function gerarPdfChamadosAbertosDia(
    chamadosDoDia: Chamado[],
    dataSelecionada: string
  ) {
    const janela = window.open('', '_blank');
    if (!janela) return;

    const linhas = chamadosDoDia
      .map(
        (chamado) => `
          <tr>
            <td><strong>#${textoPdf(chamado.id)}</strong></td>
            <td>${textoPdf(chamado.maquina)}</td>
            <td>${textoPdf(chamado.solicitante)}</td>
            <td>${textoPdf(chamado.problema)}</td>
            <td>${textoPdf(chamado.status)}</td>
          </tr>`
      )
      .join('');

    janela.document.open();
    janela.document.write(`
      <html>
        <head>
          <title>ControlMaq - Chamados do Dia ${dataSelecionada}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #0f172a; color: #fff; }
          </style>
        </head>
        <body>
          <h2>Chamados Registrados em ${dataSelecionada}</h2>
          <table>
            <thead><tr><th>#</th><th>Máquina</th><th>Solicitante</th><th>Problema</th><th>Status</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  function abrirDetalhesChamado(chamado: Chamado) {
    setChamadoDetalhes(chamado);
    setTela('detalhesChamado');
  }

  async function duplicarChamado(chamadoOrigem: Chamado) {
    if (!isAdmin || !usuarioLogado) return;

    const novoProblema = prompt(
      `Digite o problema do novo chamado para a máquina ${chamadoOrigem.maquina}:`,
      chamadoOrigem.problema
    );

    if (!novoProblema || novoProblema.trim() === '') return;

    try {
      setSalvando(true);
      const { data, error } = await supabase
        .from('chamados')
        .insert({
          maquina: chamadoOrigem.maquina,
          solicitante: chamadoOrigem.solicitante,
          telefone: chamadoOrigem.telefone,
          local: chamadoOrigem.local,
          problema: novoProblema.trim(),
          prioridade: chamadoOrigem.prioridade,
          observacao_interna: chamadoOrigem.observacao_interna || '',
          status: 'Aberto',
          criado_por: usuarioLogado.nome,
        })
        .select()
        .single();

      if (!error && data) {
        setChamados((atuais) => [data as Chamado, ...atuais]);
        setTela('chamados');
        alert('Chamado duplicado com sucesso!');
      }
    } catch (erro) {
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  function baixarArquivo(nomeArquivo: string, conteudo: string, tipo: string) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function escaparCSV(valor: unknown) {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return `"${texto}"`;
  }

  function exportarChamadosCSV(lista = chamadosVisiveis) {
    const cabecalho = [
      'id',
      'status',
      'prioridade',
      'maquina',
      'solicitante',
      'telefone',
      'local',
      'problema',
      'mecanico',
      'servico_realizado',
      'criado_por',
      'finalizado_por',
      'criado_em',
    ];

    const linhas = lista.map((chamado) => [
      chamado.id,
      chamado.status,
      chamado.prioridade,
      chamado.maquina,
      chamado.solicitante,
      chamado.telefone || '',
      chamado.local,
      chamado.problema,
      chamado.mecanico || '',
      chamado.solucao || '',
      chamado.criado_por || '',
      chamado.finalizado_por || '',
      chamado.created_at || '',
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map(escaparCSV).join(';'))
      .join('\n');

    baixarArquivo(
      `controlmaq_chamados_${hojeISO()}.csv`,
      `\ufeff${csv}`,
      'text/csv;charset=utf-8'
    );
  }

  function exportarChamadosJSON(lista = chamadosVisiveis) {
    baixarArquivo(
      `controlmaq_backup_${hojeISO()}.json`,
      JSON.stringify(lista, null, 2),
      'application/json;charset=utf-8'
    );
  }

  if (carregando) {
    return (
      <div style={estilos.paginaLogin}>
        <FundoLoginMaquinas />
        <div style={estilos.cardLogin}>
          <div style={estilos.cabecalhoLoginMarca}>
            <div style={estilos.iconeLogin}>🔧</div>
            <p style={estilos.empresaLogin}>LOKMAX</p>
          </div>
          <h1 style={estilos.tituloLogin}>ControlMaq</h1>
          <p style={estilos.subtituloLogin}>Sincronizando banco de dados...</p>
        </div>
      </div>
    );
  }

  if (tela === 'login' || !usuarioLogado) {
    return (
      <div style={estilos.paginaLogin}>
        <FundoLoginMaquinas />
        <div style={estilos.cardLogin}>
          <div style={estilos.cabecalhoLoginMarca}>
            <div style={estilos.iconeLogin}>🔧</div>
            <p style={estilos.empresaLogin}>LOKMAX</p>
          </div>
          <h1 style={estilos.tituloLogin}>ControlMaq</h1>
          <p style={estilos.subtituloLogin}>
            Gestão inteligente de chamados técnicos e manutenção em campo
          </p>

          <form onSubmit={entrarNoApp}>
            <label style={estilos.labelLogin}>Usuário</label>
            <input
              name="usuario"
              type="text"
              placeholder="Digite seu usuário"
              style={estilos.inputLogin}
              required
            />

            <label style={estilos.labelLogin}>Senha</label>
            <input
              name="senha"
              type="password"
              placeholder="Digite sua senha"
              style={estilos.inputLogin}
              required
            />

            <button
              type="submit"
              style={estilos.botaoLogin}
              disabled={salvando}
            >
              {salvando ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          <p style={estilos.direitosAutoraisLogin}>
            © 2026 — Criado por João Pedro Soares Ferreira
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={temaClaro ? estilos.paginaClara : estilos.pagina}>
      <Topo
        usuario={usuarioLogado}
        tela={tela}
        onNavigate={setTela}
        onSair={sair}
      />

      <main className="controlmaq-main" style={estilos.conteudo}>
        {tela === 'dashboard' && (
          <>
            {chamadoAlerta && (
              <div style={estilos.alertaChamadoNovo}>
                <strong>🔔 Novo chamado designado para você</strong>
                <span>
                  Chamado #{chamadoAlerta.id} - {chamadoAlerta.maquina}
                </span>
                <button
                  onClick={() => {
                    setFiltroChamados('Assumido');
                    setTela('chamados');
                    setChamadoAlerta(null);
                  }}
                  style={estilos.botaoAbrirAlerta}
                >
                  Abrir chamado
                </button>
              </div>
            )}

            <DashboardExecutivo
              usuario={usuarioLogado}
              chamados={chamadosVisiveis}
              maquinas={maquinas}
              leiturasHorimetro={leiturasHorimetro}
              operacoesDiarias={operacoesDiarias}
              preventivas={preventivas}
              historicoPreventivas={historicoPreventivas}
              carregando={carregando}
              erro={erroSistema}
              online={online}
              ultimaSincronizacao={ultimaSincronizacao}
              onAcao={(acao) =>
                executarAcaoDashboard(acao, {
                  chamados,
                  maquinas,
                  abrirChamado: abrirDetalhesChamado,
                  setTela,
                  setFiltroChamados,
                  setFiltroPrioridadeChamados,
                  setFiltroMaquinaChamados,
                  setFiltroMecanicoChamados,
                  setFiltroDataInicioChamados,
                  setFiltroDataFimChamados,
                  setFiltroPreventivas,
                  setBuscaPreventivas,
                  setFiltroControleHorimetros,
                  setBuscaControleHorimetros,
                  setBuscaChamados,
                  setBuscaMaquinas,
                  setMaquinaSelecionada,
                })
              }
            />
          </>
        )}

        {tela === 'operacaoDiaria' && (
          <div>
            <div style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Operação diária</span>
                <h2 style={estilos.tituloSecao}>Olá, {usuarioLogado.nome}</h2>
              </div>
            </div>

            {!operacaoAtiva ? (
              <div style={{ ...estilos.cardFormulario, maxWidth: 720 }}>
                <h3>Iniciar operação</h3>
                <form onSubmit={iniciarOperacaoDiaria}>
                  <label style={estilos.label}>Equipamento *</label>
                  <select
                    name="maquina_id"
                    style={estilos.input}
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione a máquina
                    </option>
                    {maquinas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.tag} — {m.marca} {m.modelo}
                      </option>
                    ))}
                  </select>
                  <label style={estilos.label}>Horímetro atual *</label>
                  <input
                    name="horimetro"
                    type="number"
                    step="0.1"
                    min="0"
                    style={estilos.input}
                    required
                  />
                  <label style={estilos.label}>Observação</label>
                  <textarea name="observacao" style={estilos.textarea} />
                  <button
                    type="submit"
                    style={estilos.botaoPrincipal}
                    disabled={salvando}
                  >
                    {salvando ? 'Registrando...' : 'Confirmar equipamento'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={estilos.cardFormulario}>
                <h3>Operação em andamento: {operacaoAtiva.maquina_tag}</h3>
                <form onSubmit={encerrarOperacaoDiaria}>
                  <label style={estilos.label}>Horímetro final *</label>
                  <input
                    name="horimetro_final"
                    type="number"
                    step="0.1"
                    style={estilos.input}
                    required
                  />
                  <button
                    type="submit"
                    style={estilos.botaoFinalizar}
                    disabled={salvando}
                  >
                    {salvando ? 'Encerrando...' : 'Encerrar Operação'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {tela === 'chamados' && (
          <div>
            <div style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Operação em campo</span>
                <h2 style={estilos.tituloSecao}>Chamados de manutenção</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setTela('novoChamado')}
                  style={estilos.botaoNovo}
                >
                  + Novo chamado
                </button>
              )}
            </div>

            <input
              value={buscaChamados}
              onChange={(e) => setBuscaChamados(e.target.value)}
              placeholder="Buscar por número, máquina, cliente, solicitante..."
              style={estilos.inputBusca}
            />

            <div style={estilos.filtros}>
              <BotaoFiltro
                texto={`Todos (${chamadosVisiveis.length})`}
                ativo={filtroChamados === 'Todos'}
                onClick={() => setFiltroChamados('Todos')}
              />
              <BotaoFiltro
                texto={`Abertos (${chamadosAbertos.length})`}
                ativo={filtroChamados === 'Aberto'}
                onClick={() => setFiltroChamados('Aberto')}
              />
              <BotaoFiltro
                texto={`Assumidos (${chamadosAssumidos.length})`}
                ativo={filtroChamados === 'Assumido'}
                onClick={() => setFiltroChamados('Assumido')}
              />
              <BotaoFiltro
                texto={`Finalizados (${chamadosFinalizados.length})`}
                ativo={filtroChamados === 'Finalizado'}
                onClick={() => setFiltroChamados('Finalizado')}
              />
            </div>

            <div style={estilos.listaChamados}>
              {chamadosFiltrados.map((chamado) => (
                <ChamadoCard
                  key={chamado.id}
                  chamado={chamado}
                  usuarioLogado={usuarioLogado}
                  historicos={historicosDoChamado(chamado.id)}
                  historicoAberto={historicoAbertoId === chamado.id}
                  onToggleHistorico={() =>
                    setHistoricoAbertoId(
                      historicoAbertoId === chamado.id ? null : chamado.id
                    )
                  }
                  onGerarPdf={() => gerarPdfChamado(chamado, isAdmin)}
                  onAbrirDetalhes={() => abrirDetalhesChamado(chamado)}
                  onDuplicar={() => duplicarChamado(chamado)}
                  onAssumir={() => assumirChamado(chamado.id)}
                  onFinalizar={() => abrirTelaFinalizar(chamado.id)}
                  onEditar={() => abrirTelaEditar(chamado)}
                  onReabrir={() => reabrirChamado(chamado)}
                  onExcluir={() => excluirChamado(chamado)}
                  formatarData={formatarData}
                />
              ))}
            </div>
          </div>
        )}

        {tela === 'maquinas' && isAdmin && (
          <div>
            <div style={estilos.linhaTitulo}>
              <div>
                <span style={estilos.preTitulo}>Cadastro técnico</span>
                <h2 style={estilos.tituloSemMargem}>Máquinas cadastradas</h2>
              </div>
              <button
                onClick={() => setTela('novaMaquina')}
                style={estilos.botaoNovo}
              >
                + Nova máquina
              </button>
            </div>

            <div style={estilos.listaChamados}>
              {maquinas.map((maquina) => (
                <MaquinaCard
                  key={maquina.id}
                  maquina={maquina}
                  situacao={calcularSituacaoMaquina(maquina.tag, chamados)}
                  totalChamados={
                    chamados.filter(
                      (c) =>
                        normalizarTexto(c.maquina) ===
                        normalizarTexto(maquina.tag)
                    ).length
                  }
                  ultimaManutencao={null}
                  onAbrirChamado={() => {
                    setMaquinaNovoChamado(maquina.tag);
                    setTela('novoChamado');
                  }}
                  onExcluir={() => excluirMaquina(maquina)}
                  onAlterarHorimetro={() => alterarHorimetroManual(maquina)}
                />
              ))}
            </div>
          </div>
        )}

        {tela === 'preventivas' && (
          <div>
            <h2>Planejamento de Manutenção Preventiva</h2>
            <div style={estilos.listaChamados}>
              {preventivas.map((p) => (
                <div
                  key={p.maquina_id}
                  style={{
                    ...estilos.cardChamado,
                    borderLeftColor: corStatusPreventiva(p.status_preventiva),
                  }}
                >
                  <h3>
                    {p.tag} — {p.marca} {p.modelo}
                  </h3>
                  <p>
                    Status: <strong>{p.status_preventiva}</strong>
                  </p>
                  <p>Horímetro atual: {p.horimetro_atual ?? 0} h</p>
                  <p>
                    Próxima preventiva:{' '}
                    {p.proxima_preventiva_horimetro ?? 'Não configurada'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tela === 'horimetros' && isAdmin && (
          <div>
            <h2>Controle Diário de Horímetros</h2>
            <input
              type="date"
              value={dataControleHorimetros}
              onChange={(e) => setDataControleHorimetros(e.target.value)}
              style={estilos.input}
            />
            <div style={{ marginTop: '20px' }}>
              <p>Acompanhamento de leituras diárias.</p>
            </div>
          </div>
        )}

        {tela === 'novoChamado' && (
          <div style={estilos.cardFormulario}>
            <span style={estilos.preTitulo}>Nova solicitação</span>
            <h2 style={estilos.tituloSecao}>Abrir chamado técnico</h2>
            <form onSubmit={criarChamado}>
              <label style={estilos.label}>Máquina *</label>
              <select
                name="maquina"
                style={estilos.input}
                value={maquinaNovoChamado}
                onChange={(e) => setMaquinaNovoChamado(e.target.value)}
                required
              >
                <option value="">Selecione a máquina</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.tag}>
                    {m.tag} - {m.modelo} / {m.marca}
                  </option>
                ))}
              </select>

              <Campo
                name="cliente"
                label="Cliente *"
                placeholder="Empresa ou pessoa"
              />
              <Campo
                name="solicitante"
                label="Solicitante *"
                placeholder="Nome de quem pediu"
              />
              <Campo
                name="telefone"
                label="Telefone"
                placeholder="(xx) xxxxx-xxxx"
              />
              <Campo
                name="local"
                label="Local do Atendimento *"
                placeholder="Endereço / Obra"
              />

              <label style={estilos.label}>Problema relatado *</label>
              <textarea name="problema" style={estilos.textarea} required />

              <label style={estilos.label}>Foto do problema (opcional)</label>
              <input
                name="fotoProblema"
                type="file"
                accept="image/*"
                style={estilos.input}
              />

              <label style={estilos.label}>Prioridade</label>
              <select name="prioridade" style={estilos.input}>
                <option>Média</option>
                <option>Alta</option>
                <option>Urgente</option>
                <option>Baixa</option>
              </select>

              <label style={estilos.label}>Observação interna do ADM</label>
              <textarea name="observacaoInterna" style={estilos.textarea} />

              <button
                type="submit"
                style={estilos.botaoPrincipal}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Criar chamado'}
              </button>
            </form>
          </div>
        )}

        {tela === 'detalhesChamado' && chamadoDetalhes && (
          <div style={estilos.cardFormulario}>
            <button
              onClick={() => setTela('chamados')}
              style={estilos.botaoVoltar}
            >
              ← Voltar
            </button>
            <h2>
              Chamado #{chamadoDetalhes.id} — {chamadoDetalhes.maquina}
            </h2>
            <p>
              <strong>Status:</strong> {chamadoDetalhes.status}
            </p>
            <p>
              <strong>Cliente:</strong> {chamadoDetalhes.cliente}
            </p>
            <p>
              <strong>Solicitante:</strong> {chamadoDetalhes.solicitante}
            </p>
            <p>
              <strong>Local:</strong> {chamadoDetalhes.local}
            </p>
            <p>
              <strong>Problema:</strong> {chamadoDetalhes.problema}
            </p>
            <p>
              <strong>Diagnóstico:</strong>{' '}
              {chamadoDetalhes.diagnostico_tecnico || 'Pendente'}
            </p>
            <p>
              <strong>Serviço realizado:</strong>{' '}
              {chamadoDetalhes.solucao || 'Pendente'}
            </p>

            <button
              onClick={() => gerarPdfChamado(chamadoDetalhes, isAdmin)}
              style={estilos.botaoPdf}
            >
              📄 Imprimir Ordem de Serviço (PDF)
            </button>
          </div>
        )}

        {tela === 'backupExportacao' && (
          <div style={estilos.cardFormulario}>
            <h2>Backup e Exportação de Dados</h2>
            <button
              onClick={() => exportarChamadosCSV()}
              style={estilos.botaoPdf}
            >
              📊 Exportar em Planilha (CSV)
            </button>
            <button
              onClick={() => exportarChamadosJSON()}
              style={estilos.botaoPrincipal}
            >
              💾 Exportar Backup Completo (JSON)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function FundoLoginMaquinas() {
  return <div style={estilos.gradienteLogin} />;
}

function IconeSistema(props: {
  nome:
    | 'dashboard'
    | 'chamados'
    | 'novo'
    | 'maquinas'
    | 'indicadores'
    | 'relatorios'
    | 'usuarios'
    | 'backup'
    | 'manual'
    | 'sair'
    | 'menu'
    | 'online';
  tamanho?: number;
}) {
  const tamanho = props.tamanho || 20;
  return (
    <span style={{ fontSize: tamanho }}>
      {props.nome === 'dashboard' && '📊'}
      {props.nome === 'chamados' && '📋'}
      {props.nome === 'novo' && '➕'}
      {props.nome === 'maquinas' && '🚜'}
      {props.nome === 'indicadores' && '📈'}
      {props.nome === 'relatorios' && '📄'}
      {props.nome === 'usuarios' && '👥'}
      {props.nome === 'backup' && '💾'}
      {props.nome === 'sair' && '🚪'}
      {props.nome === 'menu' && '☰'}
    </span>
  );
}

function Topo(props: {
  usuario: Usuario | null;
  tela: Tela;
  onNavigate: (tela: Tela) => void;
  onSair: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const isAdmin = props.usuario?.tipo === 'admin';
  const isOperador = props.usuario?.tipo === 'operador';

  const itens: Array<{ tela: Tela; label: string; admin?: boolean }> = [
    ...(isOperador
      ? [{ tela: 'operacaoDiaria' as const, label: 'Minha Operação' }]
      : [{ tela: 'dashboard' as const, label: 'Visão Geral' }]),
    { tela: 'novoChamado', label: 'Novo Chamado', admin: true },
    { tela: 'chamados', label: 'Chamados' },
    { tela: 'maquinas', label: 'Máquinas', admin: true },
    { tela: 'horimetros', label: 'Horímetros', admin: true },
    { tela: 'preventivas', label: 'Preventivas', admin: true },
    { tela: 'backupExportacao', label: 'Backup e CSV', admin: true },
  ];

  return (
    <>
      <aside
        className={`controlmaq-desktop-sidebar controlmaq-sidebar-scroll ${
          menuAberto ? 'controlmaq-sidebar-open' : ''
        }`}
        style={estilos.sidebar}
      >
        <div style={estilos.sidebarMarca}>
          <div style={estilos.sidebarLogo}>CM</div>
          <div>
            <strong style={estilos.sidebarNome}>ControlMaq</strong>
            <span style={estilos.sidebarEmpresa}>LOKMAX</span>
          </div>
        </div>

        <nav style={estilos.sidebarNav}>
          {itens
            .filter((item) => !item.admin || isAdmin)
            .map((item) => (
              <button
                key={item.tela}
                onClick={() => {
                  props.onNavigate(item.tela);
                  setMenuAberto(false);
                }}
                style={{
                  ...estilos.sidebarItem,
                  ...(props.tela === item.tela ? estilos.sidebarItemAtivo : {}),
                }}
              >
                {item.label}
              </button>
            ))}
        </nav>

        <div style={estilos.sidebarRodape}>
          <button onClick={props.onSair} style={estilos.sidebarSair}>
            Sair do sistema
          </button>
        </div>
      </aside>

      <header className="controlmaq-topbar" style={estilos.topo}>
        <div style={estilos.topoConteudo}>
          <div style={estilos.topbarEsquerda}>
            <button
              className="controlmaq-menu-button"
              onClick={() => setMenuAberto(!menuAberto)}
              style={estilos.botaoMenuMobile}
            >
              ☰
            </button>
            <h1 style={estilos.topbarTitulo}>ControlMaq</h1>
          </div>
          <div style={estilos.topbarDireita}>
            <StatusConexao />
            <span>{props.usuario?.nome}</span>
          </div>
        </div>
      </header>
    </>
  );
}

function Campo(props: { name: string; label: string; placeholder: string }) {
  return (
    <>
      <label style={estilos.label}>{props.label}</label>
      <input
        name={props.name}
        placeholder={props.placeholder}
        style={estilos.input}
        required
      />
    </>
  );
}

function BotaoFiltro(props: {
  texto: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      style={{
        ...estilos.botaoFiltro,
        background: props.ativo ? '#2563eb' : '#ffffff',
        color: props.ativo ? '#ffffff' : '#172033',
      }}
    >
      {props.texto}
    </button>
  );
}

function MaquinaCard(props: {
  maquina: Maquina;
  situacao: SituacaoMaquina;
  totalChamados: number;
  ultimaManutencao: string | null;
  onAbrirChamado: () => void;
  onExcluir: () => void;
  onAlterarHorimetro: () => void;
}) {
  return (
    <div style={estilos.cardChamado}>
      <div style={estilos.linhaChamadoTopo}>
        <strong>{props.maquina.tag}</strong>
        <span>{props.situacao}</span>
      </div>
      <p>
        Modelo: {props.maquina.modelo} ({props.maquina.marca})
      </p>
      <p>Horímetro: {props.maquina.horimetro ?? 0} h</p>
      <div style={estilos.botoesLinha}>
        <button onClick={props.onAbrirChamado} style={estilos.botaoPrincipal}>
          Abrir Chamado
        </button>
        <button
          onClick={props.onAlterarHorimetro}
          style={estilos.botaoSecundario}
        >
          Horímetro
        </button>
      </div>
    </div>
  );
}

function ChamadoCard(props: {
  chamado: Chamado;
  usuarioLogado: Usuario | null;
  historicos: HistoricoChamado[];
  historicoAberto: boolean;
  onToggleHistorico: () => void;
  onGerarPdf: () => void;
  onAbrirDetalhes: () => void;
  onDuplicar: () => void;
  onAssumir: () => void;
  onFinalizar: () => void;
  onEditar: () => void;
  onReabrir: () => void;
  onExcluir: () => void;
  formatarData: (data?: string | null) => string;
}) {
  return (
    <div style={estilos.cardChamado}>
      <div style={estilos.linhaChamadoTopo}>
        <strong>
          #{props.chamado.id} - {props.chamado.maquina}
        </strong>
        <span>{props.chamado.status}</span>
      </div>
      <p>
        <strong>Cliente:</strong> {props.chamado.cliente || 'Não informado'}
      </p>
      <p>
        <strong>Problema:</strong> {props.chamado.problema}
      </p>
      <p>
        <strong>Mecânico:</strong> {props.chamado.mecanico || 'Não designado'}
      </p>

      <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
        <button onClick={props.onAbrirDetalhes} style={estilos.botaoPrincipal}>
          Ver Detalhes / Gerar PDF
        </button>
        {props.chamado.status === 'Aberto' && (
          <button onClick={props.onAssumir} style={estilos.botaoSecundario}>
            Assumir Chamado
          </button>
        )}
        {props.chamado.status === 'Assumido' && (
          <button onClick={props.onFinalizar} style={estilos.botaoFinalizar}>
            Finalizar Atendimento
          </button>
        )}
      </div>
    </div>
  );
}

const estilos: Record<string, CSSProperties> = {
  pagina: { minHeight: '100vh', background: '#f4f6f8', color: '#172033' },
  paginaClara: { minHeight: '100vh', background: '#f4f6f8', color: '#172033' },
  paginaLogin: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: '20px',
  },
  cardLogin: {
    background: '#ffffff',
    padding: '32px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    zIndex: 5,
  },
  cabecalhoLoginMarca: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  iconeLogin: { fontSize: '28px' },
  empresaLogin: { margin: 0, fontWeight: 900, color: '#f59e0b' },
  tituloLogin: { margin: '0 0 8px', fontSize: '32px', color: '#0f172a' },
  subtituloLogin: { margin: '0 0 24px', color: '#64748b' },
  labelLogin: { display: 'block', margin: '12px 0 6px', fontWeight: 600 },
  inputLogin: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    marginBottom: '12px',
  },
  botaoLogin: {
    width: '100%',
    padding: '15px',
    background: '#f59e0b',
    color: '#000',
    border: 0,
    borderRadius: '8px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  direitosAutoraisLogin: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
  },
  topo: {
    position: 'fixed',
    top: 0,
    left: '288px',
    right: 0,
    height: '70px',
    background: '#0f172a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 50,
  },
  topoConteudo: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarEsquerda: { display: 'flex', alignItems: 'center', gap: '16px' },
  topbarDireita: { display: 'flex', alignItems: 'center', gap: '16px' },
  topbarTitulo: { margin: 0, fontSize: '20px', color: '#f59e0b' },
  conteudo: {
    marginLeft: '288px',
    padding: '94px 24px 32px',
    maxWidth: '1200px',
  },
  cabecalhoPagina: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  preTitulo: {
    color: '#2563eb',
    fontWeight: 800,
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  tituloSecao: { margin: '4px 0', fontSize: '28px' },
  tituloSemMargem: { margin: 0, fontSize: '24px' },
  descricaoSecao: { margin: 0, color: '#64748b' },
  linhaTitulo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  botaoNovo: {
    background: '#f59e0b',
    color: '#000',
    border: 0,
    padding: '12px 18px',
    borderRadius: '8px',
    fontWeight: 800,
  },
  filtros: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  botaoFiltro: {
    padding: '10px 16px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  listaChamados: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  cardChamado: {
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  linhaChamadoTopo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardFormulario: {
    background: '#fff',
    padding: '28px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    maxWidth: '700px',
    margin: '0 auto',
  },
  label: { display: 'block', margin: '14px 0 6px', fontWeight: 700 },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
  },
  inputBusca: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    marginBottom: '16px',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
  },
  botaoPrincipal: {
    padding: '12px',
    background: '#0f172a',
    color: '#fff',
    border: 0,
    borderRadius: '8px',
    fontWeight: 700,
  },
  botaoSecundario: {
    padding: '12px',
    background: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontWeight: 700,
  },
  botaoFinalizar: {
    padding: '12px',
    background: '#16a34a',
    color: '#fff',
    border: 0,
    borderRadius: '8px',
    fontWeight: 700,
  },
  botaoPdf: {
    padding: '12px',
    background: '#7c3aed',
    color: '#fff',
    border: 0,
    borderRadius: '8px',
    fontWeight: 700,
    marginBottom: '10px',
    width: '100%',
  },
  botaoExcluirChamado: {
    padding: '8px 12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontWeight: 700,
  },
  botoesLinha: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '12px',
  },
  alertaChamadoNovo: {
    background: '#fef3c7',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botaoAbrirAlerta: {
    background: '#d97706',
    color: '#fff',
    border: 0,
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: 700,
  },
  gradienteLogin: {
    position: 'absolute',
    inset: 0,
    background: '#0f172a',
    zIndex: 1,
  },
  sidebar: {
    position: 'fixed',
    inset: '0 auto 0 0',
    width: '288px',
    zIndex: 60,
    background: '#101828',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarMarca: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255,255,255,.08)',
  },
  sidebarLogo: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: '#fdb515',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
  },
  sidebarNome: { display: 'block', fontSize: '18px' },
  sidebarEmpresa: { display: 'block', fontSize: '10px', color: '#98a2b3' },
  sidebarNav: { display: 'grid', gap: '4px', padding: '12px' },
  sidebarItem: {
    width: '100%',
    padding: '10px 14px',
    border: 0,
    background: 'transparent',
    color: '#d0d5dd',
    textAlign: 'left',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  sidebarItemAtivo: { background: '#253149', color: '#fff' },
  sidebarRodape: {
    marginTop: 'auto',
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,.08)',
  },
  sidebarSair: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255,255,255,.08)',
    border: 0,
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
