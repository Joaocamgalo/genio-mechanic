import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { supabase } from './lib/supabase';
import { StatusConexao } from './components/StatusConexao';
import {
  getConnectivitySnapshot,
  subscribeConnectivity,
} from './offline/connectivity/connectivityService';

import type {
  Tela,
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
  PerfilUsuario,
} from './types/controlmaq';
import {
  CHAVE_USUARIO_LOGADO,
  normalizarTexto,
  prioridadeOrdem,
  calcularSituacaoMaquina,
} from './utils/controlmaq';
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
      // Ignora erro
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
      // Ignora erro
    }
    return 'login';
  });

  // Filtros e Visualização de Chamados
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'kanban'>('kanban');
  const [filtroChamados, setFiltroChamados] = useState<FiltroChamado>('Todos');
  const [buscaChamados, setBuscaChamados] = useState('');
  const [filtroPrioridadeChamados, setFiltroPrioridadeChamados] = useState('');
  const [filtroMaquinaChamados, setFiltroMaquinaChamados] = useState('');
  const [filtroMecanicoChamados, setFiltroMecanicoChamados] = useState('');

  // Filtros e Gestão de Máquinas
  const [filtroStatusMaquina, setFiltroStatusMaquina] = useState<'Todos' | 'Operacional' | 'Parada' | 'Em manutenção'>('Todos');
  const [buscaMaquinas, setBuscaMaquinas] = useState('');
  const [modalNovaMaquina, setModalNovaMaquina] = useState(false);
  const [maquinaEmEdicao, setMaquinaEmEdicao] = useState<Maquina | null>(null);
  const [maquinaDossie, setMaquinaDossie] = useState<Maquina | null>(null);

  // Apontamento de Horímetro em Lote
  const [leiturasLote, setLeiturasLote] = useState<Record<string, string>>({});

  // Filtros de Usuários
  const [buscaUsuarios, setBuscaUsuarios] = useState('');

  // Filtros de Preventivas
  const [filtroPreventivas, setFiltroPreventivas] = useState<FiltroPreventiva>('Todos');
  const [buscaPreventivas, setBuscaPreventivas] = useState('');
  const [preventivaSelecionada, setPreventivaSelecionada] = useState<PreventivaMaquina | null>(null);
  const [modoPreventiva, setModoPreventiva] = useState<'configurar' | 'registrar' | null>(null);

  // Modal de Histórico Técnico da Máquina
  const [maquinaHistoricoModal, setMaquinaHistoricoModal] = useState<PreventivaMaquina | null>(null);

  // Estados dos Checkboxes de Revisão Preventiva
  const [itensRevisao, setItensRevisao] = useState({
    filtroCombustivel: false,
    filtroCombustivelSeparador: false,
    filtroArInterno: false,
    filtroArExterno: false,
    filtroLubrificante: false,
    filtroHidraulico: false,
    trocouOleoHidraulico: false,
    trocouOleoMotor: false,
  });
  const [litrosOleoHidraulico, setLitrosOleoHidraulico] = useState('');
  const [litrosOleoMotor, setLitrosOleoMotor] = useState('');

  // Finalização e Assinatura Digital de Chamados
  const [chamadoParaFinalizar, setChamadoParaFinalizar] = useState<Chamado | null>(null);
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string>('');
  const [chamadoDetalhes, setChamadoDetalhes] = useState<Chamado | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [historicos, setHistoricos] = useState<HistoricoChamado[]>([]);
  const [leiturasHorimetro, setLeiturasHorimetro] = useState<LeituraHorimetro[]>([]);
  const [operacoesDiarias, setOperacoesDiarias] = useState<OperacaoDiaria[]>([]);
  const [preventivas, setPreventivas] = useState<PreventivaMaquina[]>([]);
  const [historicoPreventivas, setHistoricoPreventivas] = useState<HistoricoPreventiva[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSistema, setErroSistema] = useState('');
  const [online, setOnline] = useState(getConnectivitySnapshot);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);
  const [maquinaNovoChamado, setMaquinaNovoChamado] = useState('');

  const isAdmin = usuarioLogado?.tipo === 'admin';

  const chamadosVisiveis = isAdmin
    ? chamados
    : chamados.filter((chamado) => {
        if (!usuarioLogado) return false;
        if (chamado.status === 'Aberto') return true;
        return (
          normalizarTexto(chamado.mecanico) === normalizarTexto(usuarioLogado.nome)
        );
      });

  const chamadosAbertos = chamadosVisiveis.filter((c) => c.status === 'Aberto');
  const chamadosAssumidos = chamadosVisiveis.filter((c) => c.status === 'Assumido');
  const chamadosFinalizados = chamadosVisiveis.filter((c) => c.status === 'Finalizado');

  const chamadosFiltradosPorStatus =
    filtroChamados === 'Todos'
      ? chamadosVisiveis
      : filtroChamados === 'Ativos'
      ? chamadosVisiveis.filter((c) => c.status !== 'Finalizado')
      : chamadosVisiveis.filter((c) => c.status === filtroChamados);

  const chamadosFiltrados = chamadosFiltradosPorStatus
    .filter((chamado) => {
      const busca = normalizarTexto(buscaChamados);
      if (!busca) return true;
      return [
        chamado.id,
        chamado.maquina,
        chamado.cliente,
        chamado.solicitante,
        chamado.local,
        chamado.problema,
        chamado.mecanico,
      ]
        .map((valor) => normalizarTexto(String(valor || '')))
        .some((valor) => valor.includes(busca));
    })
    .filter((chamado) => {
      if (filtroPrioridadeChamados && chamado.prioridade !== filtroPrioridadeChamados) return false;
      if (filtroMaquinaChamados && normalizarTexto(chamado.maquina) !== normalizarTexto(filtroMaquinaChamados)) return false;
      if (filtroMecanicoChamados && normalizarTexto(chamado.mecanico || '') !== normalizarTexto(filtroMecanicoChamados)) return false;
      return true;
    })
    .sort((a, b) => {
      const prioridadeA = prioridadeOrdem(a.prioridade);
      const prioridadeB = prioridadeOrdem(b.prioridade);
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
      return b.id - a.id;
    });

  const maquinasFiltradas = maquinas.filter((m) => {
    const busca = normalizarTexto(buscaMaquinas);
    const bateTexto =
      !busca ||
      normalizarTexto(m.tag).includes(busca) ||
      normalizarTexto(m.modelo).includes(busca) ||
      normalizarTexto(m.marca).includes(busca);

    if (!bateTexto) return false;
    if (filtroStatusMaquina === 'Todos') return true;

    const situacaoCalculada = calcularSituacaoMaquina(m.tag, chamados);
    if (filtroStatusMaquina === 'Em manutenção') {
      return situacaoCalculada === 'Em manutenção';
    }
    if (filtroStatusMaquina === 'Parada') {
      return m.status_maquina === 'Parada' || situacaoCalculada === 'Parada';
    }
    return m.status_maquina === 'Operacional' && situacaoCalculada === 'Operacional';
  });

  const preventivasFiltradas = preventivas.filter((p) => {
    const busca = normalizarTexto(buscaPreventivas);
    const bateTexto =
      !busca ||
      normalizarTexto(p.tag).includes(busca) ||
      normalizarTexto(p.modelo).includes(busca) ||
      normalizarTexto(p.marca).includes(busca);

    if (!bateTexto) return false;
    if (filtroPreventivas === 'Todos') return true;
    return p.status_preventiva === filtroPreventivas;
  });

  const usuariosFiltrados = usuarios.filter((u) => {
    const busca = normalizarTexto(buscaUsuarios);
    if (!busca) return true;
    return (
      normalizarTexto(u.nome).includes(busca) ||
      normalizarTexto(u.login).includes(busca) ||
      normalizarTexto(u.tipo).includes(busca)
    );
  });

  useEffect(() => {
    instalarCssResponsivo();
    carregarDados(false);

    const canal = supabase
      .channel('controlmaq-sync-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => carregarDados(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, () => carregarDados(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => carregarDados(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras_horimetro' }, () => carregarDados(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_preventivas' }, () => carregarDados(false))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    return subscribeConnectivity((estaOnline) => {
      setOnline(estaOnline);
      if (estaOnline) carregarDados(false);
    });
  }, []);

  function salvarLoginLocal(usuario: Usuario) {
    localStorage.setItem(CHAVE_USUARIO_LOGADO, JSON.stringify(usuario));
  }

  async function carregarDados(mostrarCarregando = false) {
    try {
      if (mostrarCarregando) setCarregando(true);
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
        supabase.from('usuarios').select('*').order('nome', { ascending: true }),
        supabase.from('maquinas').select('*').order('tag', { ascending: true }),
        supabase.from('chamados').select('*').order('id', { ascending: false }),
        supabase.from('historico_chamados').select('*').order('created_at', { ascending: false }),
        supabase.from('leituras_horimetro').select('*').order('created_at', { ascending: false }),
        supabase.from('operacoes_diarias').select('*').order('iniciado_at', { ascending: false }),
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
        setLeiturasHorimetro((leiturasRes.value.data || []) as LeituraHorimetro[]);
      }
      if (operacoesRes.status === 'fulfilled' && !operacoesRes.value.error) {
        setOperacoesDiarias((operacoesRes.value.data || []) as OperacaoDiaria[]);
      }
      if (prevData.status === 'fulfilled') {
        setPreventivas(prevData.value);
      }
      if (histPrevData.status === 'fulfilled') {
        setHistoricoPreventivas(histPrevData.value);
      }

      setUltimaSincronizacao(new Date());
    } finally {
      if (mostrarCarregando) setCarregando(false);
    }
  }

  function resetarCamposRevisao() {
    setItensRevisao({
      filtroCombustivel: false,
      filtroCombustivelSeparador: false,
      filtroArInterno: false,
      filtroArExterno: false,
      filtroLubrificante: false,
      filtroHidraulico: false,
      trocouOleoHidraulico: false,
      trocouOleoMotor: false,
    });
    setLitrosOleoHidraulico('');
    setLitrosOleoMotor('');
  }

  function instalarCssResponsivo() {
    const id = 'controlmaq-css-master-pro';
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      :root {
        --cm-primary: #f59e0b;
        --cm-dark: #0f172a;
        --cm-slate: #1e293b;
        --cm-bg: #f8fafc;
        --cm-border: #e2e8f0;
      }
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        background: var(--cm-bg);
        color: #0f172a;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow-x: hidden;
      }
      
      .cm-card {
        background: #ffffff;
        border: 1px solid var(--cm-border);
        border-radius: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        word-break: break-word;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .cm-card:hover {
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      }

      .cm-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .badge-aberto { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
      .badge-assumido { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
      .badge-finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
      
      .badge-op-operacional { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
      .badge-op-parada { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
      .badge-op-manutencao { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

      .badge-prev-em-dia { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
      .badge-prev-atencao { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
      .badge-prev-urgente { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
      .badge-prev-vencida { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
      .badge-prev-pendente { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 9px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        user-select: none;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .checkbox-item:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }
      .checkbox-item input[type="checkbox"] {
        width: 17px;
        height: 17px;
        cursor: pointer;
        accent-color: #f59e0b;
      }

      .timeline-container {
        border-left: 2px solid #e2e8f0;
        padding-left: 16px;
        margin-left: 8px;
        display: grid;
        gap: 16px;
      }
      .timeline-entry {
        position: relative;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px;
      }
      .timeline-dot {
        position: absolute;
        left: -23px;
        top: 14px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #f59e0b;
        border: 2px solid #ffffff;
      }

      .kanban-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(280px, 1fr));
        gap: 16px;
        align-items: start;
        overflow-x: auto;
        padding-bottom: 12px;
        -webkit-overflow-scrolling: touch;
      }
      .kanban-coluna {
        background: #f1f5f9;
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 480px;
      }
      .kanban-coluna-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 2px solid #e2e8f0;
      }

      /* COMPORTAMENTO RESPONSIVO EXCLUSIVO MOBILE */
      @media (max-width: 1024px) {
        .controlmaq-desktop-sidebar {
          transform: translateX(-100%) !important;
          transition: transform 0.25s ease-in-out !important;
          width: 270px !important;
        }
        .controlmaq-sidebar-open {
          transform: translateX(0) !important;
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.7) !important;
        }
        .controlmaq-topbar {
          left: 0 !important;
          width: 100% !important;
          padding: 0 14px !important;
        }
        .controlmaq-topbar-btn-menu {
          display: inline-flex !important;
        }
        .controlmaq-main {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: 100vw !important;
          padding: 76px 12px 30px !important;
        }
        .responsivo-grelha {
          grid-template-columns: 1fr !important;
        }
        .responsivo-cabecalho-acoes {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 10px !important;
        }
        .kanban-grid {
          display: flex !important;
          overflow-x: auto !important;
          scroll-snap-type: x mandatory !important;
        }
        .kanban-coluna {
          flex: 0 0 85vw !important;
          min-width: 270px !important;
          scroll-snap-align: start !important;
        }
        .modal-card-responsivo {
          width: 95vw !important;
          max-width: 95vw !important;
          padding: 16px 12px !important;
          margin: 0 auto !important;
        }
      }
    `;
  }

  // EXPORTADOR UNIVERSAL PARA CSV / EXCEL
  function exportarParaCsv(nomeArquivo: string, cabecalhos: string[], linhas: (string | number)[][]) {
    const conteudo = [
      cabecalhos.join(';'),
      ...linhas.map((l) => l.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${nomeArquivo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // GERADOR OFICIAL DE PDF DA ORDEM DE SERVIÇO COM ASSINATURA DIGITAL & DOWNTIME
  function gerarPdfChamado(chamado: Chamado) {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('Permita janelas pop-up no navegador para abrir o PDF.');
      return;
    }

    const dataAbertura = chamado.created_at ? new Date(chamado.created_at).toLocaleString('pt-BR') : 'Não informado';
    const dataConclusao = chamado.finalizado_at ? new Date(chamado.finalizado_at).toLocaleString('pt-BR') : 'Em andamento';
    const assinaturaSalva = localStorage.getItem(`controlmaq_assinatura_${chamado.id}`) || '';

    // Cálculo de Downtime (Tempo total parada)
    let downtimeTexto = 'Em atendimento';
    if (chamado.created_at && chamado.finalizado_at) {
      const ms = new Date(chamado.finalizado_at).getTime() - new Date(chamado.created_at).getTime();
      const horas = Math.floor(ms / (1000 * 60 * 60));
      const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      downtimeTexto = `${horas}h ${minutos}m`;
    }

    janela.document.open();
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço #${chamado.id} - ${chamado.maquina}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; padding: 15mm; }
            .pagina { width: 100%; max-width: 210mm; margin: 0 auto; }
            .cabecalho { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-empresa { font-size: 24px; font-weight: 900; color: #0f172a; }
            .logo-sub { font-size: 12px; color: #f59e0b; font-weight: 800; letter-spacing: 1px; }
            .titulo-doc { text-align: right; }
            .titulo-doc h2 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; }
            .titulo-doc span { font-size: 12px; color: #64748b; }
            .bloco-dados { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
            .dado-item small { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .dado-item strong { font-size: 14px; color: #0f172a; }
            .secao-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px; margin: 16px 0 8px; }
            .conteudo-caixa { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.5; background: #ffffff; }
            .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .linha-assinatura { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            .linha-assinatura strong { display: block; color: #0f172a; font-size: 13px; }
            .box-assinatura-digital { height: 75px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 6px; }
            .img-assinatura { max-height: 70px; max-width: 220px; object-fit: contain; }
            @media print { body { padding: 0; } @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="pagina">
            <header class="cabecalho">
              <div>
                <div class="logo-empresa">LOKMAX</div>
                <div class="logo-sub">GESTÃO TÉCNICA DE FROTAS</div>
              </div>
              <div class="titulo-doc">
                <h2>Ordem de Serviço #${chamado.id}</h2>
                <span>Situação: <strong>${chamado.status.toUpperCase()}</strong></span>
              </div>
            </header>

            <div class="bloco-dados">
              <div class="dado-item">
                <small>Equipamento (TAG)</small>
                <strong>${chamado.maquina}</strong>
              </div>
              <div class="dado-item">
                <small>Cliente</small>
                <strong>${chamado.cliente || 'Não informado'}</strong>
              </div>
              <div class="dado-item">
                <small>Abertura do Chamado</small>
                <strong>${dataAbertura}</strong>
              </div>
              <div class="dado-item">
                <small>Conclusão</small>
                <strong>${dataConclusao}</strong>
              </div>
            </div>

            <div class="bloco-dados" style="margin-top: -10px;">
              <div class="dado-item">
                <small>Solicitante</small>
                <strong>${chamado.solicitante}</strong>
              </div>
              <div class="dado-item">
                <small>Local do Atendimento</small>
                <strong>${chamado.local}</strong>
              </div>
              <div class="dado-item">
                <small>Tempo Parado (Downtime)</small>
                <strong>${downtimeTexto}</strong>
              </div>
              <div class="dado-item">
                <small>Mecânico Responsável</small>
                <strong>${chamado.mecanico || 'Não designado'}</strong>
              </div>
            </div>

            <div class="secao-titulo">Anomalia / Problema Relatado</div>
            <div class="conteudo-caixa">${chamado.problema}</div>

            <div class="secao-titulo">Diagnóstico Técnico da Falha</div>
            <div class="conteudo-caixa">${chamado.diagnostico_tecnico || 'Diagnóstico em elaboração ou pendente.'}</div>

            <div class="secao-titulo">Serviço, Peças & Insumos Utilizados</div>
            <div class="conteudo-caixa">${chamado.solucao || 'Serviço em execução.'}</div>

            <div class="assinaturas">
              <div>
                <div class="box-assinatura-digital">
                  ${assinaturaSalva ? `<img src="${assinaturaSalva}" class="img-assinatura" alt="Assinatura Digital" />` : ''}
                </div>
                <div class="linha-assinatura">
                  <strong>${chamado.mecanico || 'Técnico Especialista'}</strong>
                  Responsável Técnico da Execução
                </div>
              </div>

              <div>
                <div class="box-assinatura-digital"></div>
                <div class="linha-assinatura">
                  <strong>${chamado.solicitante || 'Responsável no Local'}</strong>
                  Aprovação / Visto do Cliente
                </div>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  // GERADOR DE DOSSIÊ COMPLETO DO ATIVO (PRONTUÁRIO TÉCNICO EM PDF)
  function gerarPdfDossie(m: Maquina) {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('Permita pop-ups no navegador para visualizar o prontuário.');
      return;
    }

    const chamadosDaMaquina = chamados.filter(
      (c) => normalizarTexto(c.maquina) === normalizarTexto(m.tag)
    );
    const revisoesDaMaquina = historicoPreventivas.filter((h) => h.maquina_id === m.id);

    janela.document.open();
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dossiê do Ativo - ${m.tag}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; padding: 15mm; }
            .pagina { width: 100%; max-width: 210mm; margin: 0 auto; }
            .cabecalho { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-empresa { font-size: 24px; font-weight: 900; color: #0f172a; }
            .logo-sub { font-size: 12px; color: #f59e0b; font-weight: 800; letter-spacing: 1px; }
            .bloco-dados { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
            .dado-item small { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .dado-item strong { font-size: 14px; color: #0f172a; }
            .secao-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px; margin: 24px 0 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            th { background: #0f172a; color: #fff; text-align: left; padding: 8px 10px; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            @media print { body { padding: 0; } @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="pagina">
            <header class="cabecalho">
              <div>
                <div class="logo-empresa">LOKMAX</div>
                <div class="logo-sub">PRONTUÁRIO TÉCNICO & CICLO DE VIDA DO ATIVO</div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Dossiê do Ativo</h2>
                <span style="font-size: 12px; color: #64748b;">Emitido em: ${new Date().toLocaleString('pt-BR')}</span>
              </div>
            </header>

            <div class="bloco-dados">
              <div class="dado-item"><small>TAG do Ativo</small><strong>${m.tag}</strong></div>
              <div class="dado-item"><small>Fabricante / Marca</small><strong>${m.marca}</strong></div>
              <div class="dado-item"><small>Modelo</small><strong>${m.modelo}</strong></div>
              <div class="dado-item"><small>Horímetro Acumulado</small><strong>${m.horimetro ?? 0} h</strong></div>
            </div>

            <div class="secao-titulo">Histórico de Manutenções Preventivas (${revisoesDaMaquina.length} registradas)</div>
            ${revisoesDaMaquina.length === 0 ? '<p style="font-size: 12px; color: #64748b;">Nenhuma revisão preventiva registrada.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horímetro</th>
                    <th>Responsável</th>
                    <th>Itens Substituídos / Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  ${revisoesDaMaquina.map((r) => `
                    <tr>
                      <td>${new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td><strong>${r.horimetro_preventiva} h</strong></td>
                      <td>${r.mecanico_responsavel || 'Não informado'}</td>
                      <td>${r.observacao}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}

            <div class="secao-titulo">Histórico de Ordens de Serviço & Corretivas (${chamadosDaMaquina.length} registradas)</div>
            ${chamadosDaMaquina.length === 0 ? '<p style="font-size: 12px; color: #64748b;">Nenhum chamado de manutenção corretiva registrado.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>OS #</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Falha / Problema</th>
                    <th>Solução Técnica Aplicada</th>
                  </tr>
                </thead>
                <tbody>
                  ${chamadosDaMaquina.map((c) => `
                    <tr>
                      <td>#${c.id}</td>
                      <td><strong>${c.status}</strong></td>
                      <td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>${c.problema}</td>
                      <td>${c.solucao || 'Em atendimento'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  // GERADOR OFICIAL DE PDF DA REVISÃO PREVENTIVA
  function gerarPdfPreventiva(
    maquina: { tag: string; marca: string; modelo: string },
    revisao: {
      horimetro_preventiva: number;
      mecanico_responsavel: string;
      observacao: string;
      created_at: string;
    }
  ) {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('O navegador bloqueou a abertura do PDF. Permita pop-ups para este site.');
      return;
    }

    const dataFormatada = new Date(revisao.created_at).toLocaleString('pt-BR');

    janela.document.open();
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Manutenção Preventiva - ${maquina.tag}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; padding: 15mm; }
            .pagina { width: 100%; max-width: 210mm; margin: 0 auto; }
            .cabecalho { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-empresa { font-size: 24px; font-weight: 900; color: #0f172a; }
            .logo-sub { font-size: 12px; color: #f59e0b; font-weight: 800; letter-spacing: 1px; }
            .titulo-doc { text-align: right; }
            .titulo-doc h2 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; }
            .titulo-doc span { font-size: 12px; color: #64748b; }
            .bloco-dados { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
            .dado-item small { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .dado-item strong { font-size: 14px; color: #0f172a; }
            .secao-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px; margin: 20px 0 10px; }
            .conteudo-caixa { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.6; background: #ffffff; }
            .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
            .linha-assinatura { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            .linha-assinatura strong { display: block; color: #0f172a; font-size: 13px; }
            @media print { body { padding: 0; } @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="pagina">
            <header class="cabecalho">
              <div>
                <div class="logo-empresa">LOKMAX</div>
                <div class="logo-sub">GESTÃO TÉCNICA DE FROTAS</div>
              </div>
              <div class="titulo-doc">
                <h2>Ficha de Revisão Preventiva</h2>
                <span>Emitido em: ${new Date().toLocaleString('pt-BR')}</span>
              </div>
            </header>

            <div class="bloco-dados">
              <div class="dado-item">
                <small>Equipamento (TAG)</small>
                <strong>${maquina.tag}</strong>
              </div>
              <div class="dado-item">
                <small>Modelo / Fabricante</small>
                <strong>${maquina.marca} ${maquina.modelo}</strong>
              </div>
              <div class="dado-item">
                <small>Horímetro da Revisão</small>
                <strong>${revisao.horimetro_preventiva} h</strong>
              </div>
              <div class="dado-item">
                <small>Data da Conclusão</small>
                <strong>${dataFormatada}</strong>
              </div>
            </div>

            <div class="secao-titulo">Responsável Técnico</div>
            <div class="conteudo-caixa">
              Mecânico Responsável: <strong>${revisao.mecanico_responsavel || 'Não especificado'}</strong>
            </div>

            <div class="secao-titulo">Detalhamento dos Serviços e Insumos Substituídos</div>
            <div class="conteudo-caixa">
              ${revisao.observacao ? revisao.observacao.replace(/\n/g, '<br/>') : 'Revisão periódica efetuada em conformidade técnica.'}
            </div>

            <div class="assinaturas">
              <div class="linha-assinatura">
                <strong>${revisao.mecanico_responsavel || 'Mecânico Responsável'}</strong>
                Técnico Executor
              </div>
              <div class="linha-assinatura">
                <strong>Visto do Responsável da Obra / Cliente</strong>
                Aprovação e Recebimento
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  async function entrarNoApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loginDigitado = String(form.get('usuario') || '').trim().toLowerCase();
    const senhaDigitada = String(form.get('senha') || '').trim();

    if (!loginDigitado || !senhaDigitada) return;

    try {
      setSalvando(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('login', loginDigitado)
        .maybeSingle();

      if (error || !data || String(data.senha ?? '').trim() !== senhaDigitada) {
        alert('Credenciais inválidas.');
        return;
      }

      const agoraAcesso = new Date().toISOString();
      await supabase.from('usuarios').update({ ultimo_acesso: agoraAcesso }).eq('id', data.id);

      const usuarioEncontrado = { ...data, ultimo_acesso: agoraAcesso } as Usuario;
      setUsuarioLogado(usuarioEncontrado);
      salvarLoginLocal(usuarioEncontrado);
      setTela(usuarioEncontrado.tipo === 'operador' ? 'operacaoDiaria' : 'dashboard');
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  // CADASTRO / EDIÇÃO DE MÁQUINA
  async function salvarMaquina(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const form = new FormData(event.currentTarget);
    const tag = String(form.get('tag') || '').trim().toUpperCase();
    const marca = String(form.get('marca') || '').trim();
    const modelo = String(form.get('modelo') || '').trim();
    const horimetro = Number(String(form.get('horimetro') || '0').replace(',', '.'));
    const status_maquina = String(form.get('status_maquina') || 'Operacional') as Maquina['status_maquina'];

    if (!tag || !marca || !modelo) {
      alert('Preencha a TAG, Marca e Modelo do equipamento.');
      return;
    }

    try {
      setSalvando(true);

      if (maquinaEmEdicao) {
        const { error } = await supabase
          .from('maquinas')
          .update({ tag, marca, modelo, horimetro, status_maquina })
          .eq('id', maquinaEmEdicao.id);

        if (error) {
          alert('Erro ao atualizar máquina.');
          return;
        }

        setMaquinas((prev) =>
          prev.map((m) => (m.id === maquinaEmEdicao.id ? { ...m, tag, marca, modelo, horimetro, status_maquina } : m))
        );
        alert(`Equipamento ${tag} atualizado com sucesso!`);
      } else {
        const { data, error } = await supabase
          .from('maquinas')
          .insert({ tag, marca, modelo, horimetro, status_maquina })
          .select()
          .single();

        if (error || !data) {
          alert('Erro ao cadastrar máquina. Verifique se a TAG já existe.');
          return;
        }

        setMaquinas((prev) => [...prev, data as Maquina].sort((a, b) => a.tag.localeCompare(b.tag)));
        alert(`Equipamento ${tag} inserido na frota com sucesso!`);
      }

      setModalNovaMaquina(false);
      setMaquinaEmEdicao(null);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  // EXCLUSÃO DE MÁQUINA DA FROTA
  async function excluirMaquina(m: Maquina) {
    if (!isAdmin) return;

    const confirmar = confirm(
      `⚠️ ATENÇÃO: Confirma a remoção definitiva da máquina ${m.tag} (${m.marca} ${m.modelo}) da frota?\n\nEsta ação excluirá o ativo e os vínculos no sistema.`
    );
    if (!confirmar) return;

    try {
      setSalvando(true);
      await supabase.from('leituras_horimetro').delete().eq('maquina_id', m.id);
      await supabase.from('historico_preventivas').delete().eq('maquina_id', m.id);
      await supabase.from('preventivas_maquinas').delete().eq('maquina_id', m.id);

      const { error } = await supabase.from('maquinas').delete().eq('id', m.id);

      if (error) {
        alert('Erro ao excluir equipamento da frota.');
        return;
      }

      setMaquinas((prev) => prev.filter((item) => item.id !== m.id));
      alert(`Máquina ${m.tag} excluída da frota com sucesso!`);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  // APONTAMENTO DE HORÍMETRO EM LOTE
  async function salvarHorimetrosEmLote() {
    const alteracoes = Object.entries(leiturasLote).filter(([_, valor]) => valor && valor.trim() !== '');

    if (alteracoes.length === 0) {
      alert('Nenhum novo horímetro foi preenchido para salvar.');
      return;
    }

    try {
      setSalvando(true);
      for (const [maquinaId, novoValorStr] of alteracoes) {
        const valor = Number(novoValorStr.replace(',', '.'));
        const maquinaAlvo = maquinas.find((m) => m.id === maquinaId);

        if (Number.isFinite(valor) && valor >= 0 && maquinaAlvo) {
          await supabase.from('maquinas').update({ horimetro: valor }).eq('id', maquinaId);
          await supabase.from('leituras_horimetro').insert({
            maquina_id: maquinaId,
            maquina_tag: maquinaAlvo.tag,
            operador_id: String(usuarioLogado?.id),
            operador_nome: usuarioLogado?.nome,
            horimetro: valor,
            origem: 'apontamento_em_lote',
            observacao: `Apontamento em lote (Anterior: ${maquinaAlvo.horimetro ?? 0} h)`,
          });
        }
      }

      setLeiturasLote({});
      await carregarDados(false);
      alert('Todas as leituras de horímetro foram salvas e sincronizadas!');
    } finally {
      setSalvando(false);
    }
  }

  // EXCLUSÃO DE ORDEM DE SERVIÇO COM CONFIRMAÇÃO
  async function excluirChamado(chamadoAlvo: Chamado) {
    const confirmar = confirm(
      `⚠️ ATENÇÃO: Confirma a exclusão da Ordem de Serviço #${chamadoAlvo.id}?\n\nMáquina: ${chamadoAlvo.maquina}\nProblema: ${chamadoAlvo.problema}\n\nEsta ação limpará o chamado definitivamente do sistema.`
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

      if (error) {
        alert('Erro ao excluir a Ordem de Serviço.');
        return;
      }

      localStorage.removeItem(`controlmaq_assinatura_${chamadoAlvo.id}`);
      setChamados((prev) => prev.filter((c) => c.id !== chamadoAlvo.id));
      alert(`Ordem de Serviço #${chamadoAlvo.id} excluída com sucesso!`);
    } finally {
      setSalvando(false);
    }
  }

  // OPERAÇÕES ADMINISTRATIVAS DE UTILIZADORES
  async function criarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const form = new FormData(event.currentTarget);
    const nome = String(form.get('nome') || '').trim();
    const login = String(form.get('usuario') || '').trim().toLowerCase();
    const senha = String(form.get('senha') || '').trim();
    const tipo = String(form.get('perfil') || 'mecanico') as PerfilUsuario;

    if (!nome || !login || !senha) {
      alert('Preencha o nome, utilizador e palavra-passe.');
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
        alert('Erro ao registar utilizador. Verifique se o login já existe.');
        return;
      }

      setUsuarios((prev) => [...prev, data as Usuario].sort((a, b) => a.nome.localeCompare(b.nome)));
      alert(`Utilizador ${nome} registado com sucesso!`);
      setTela('usuarios');
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenhaUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    const novaSenha = prompt(`Digite a nova palavra-passe para ${usuarioAlvo.nome}:`);
    if (!novaSenha || novaSenha.trim() === '') return;

    try {
      setSalvando(true);
      const { error } = await supabase
        .from('usuarios')
        .update({ senha: novaSenha.trim() })
        .eq('id', usuarioAlvo.id);

      if (error) {
        alert('Erro ao atualizar a palavra-passe.');
        return;
      }

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioAlvo.id ? { ...u, senha: novaSenha.trim() } : u))
      );
      alert('Palavra-passe alterada com sucesso.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    if (usuarioLogado?.id === usuarioAlvo.id) {
      alert('Não é possível bloquear o utilizador atualmente autenticado.');
      return;
    }

    const novoStatus = usuarioAlvo.ativo === false;
    try {
      setSalvando(true);
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: novoStatus })
        .eq('id', usuarioAlvo.id);

      if (!error) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioAlvo.id ? { ...u, ativo: novoStatus } : u))
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPerfilUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    if (usuarioLogado?.id === usuarioAlvo.id) {
      alert('Por segurança, altere o perfil através de outra conta administradora.');
      return;
    }

    const novoPerfil: PerfilUsuario =
      usuarioAlvo.tipo === 'admin'
        ? 'mecanico'
        : usuarioAlvo.tipo === 'mecanico'
        ? 'operador'
        : 'admin';

    try {
      setSalvando(true);
      const { error } = await supabase
        .from('usuarios')
        .update({ tipo: novoPerfil })
        .eq('id', usuarioAlvo.id);

      if (!error) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioAlvo.id ? { ...u, tipo: novoPerfil } : u))
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin || usuarioLogado?.id === usuarioAlvo.id) {
      alert('Não é possível eliminar o utilizador com sessão iniciada.');
      return;
    }

    const confirmar = confirm(`⚠️ Confirma a exclusão definitiva do utilizador ${usuarioAlvo.nome}?`);
    if (!confirmar) return;

    try {
      setSalvando(true);
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuarioAlvo.id);

      if (!error) {
        setUsuarios((prev) => prev.filter((u) => u.id !== usuarioAlvo.id));
        alert('Utilizador eliminado com sucesso.');
      }
    } finally {
      setSalvando(false);
    }
  }

  // CRIAÇÃO DE NOVA ORDEM DE SERVIÇO
  async function criarChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usuarioLogado) return;

    const form = new FormData(event.currentTarget);
    const maquina = String(form.get('maquina') || '').trim();
    const cliente = String(form.get('cliente') || '').trim();
    const solicitante = String(form.get('solicitante') || '').trim();
    const telefone = String(form.get('telefone') || '').trim();
    const local = String(form.get('local') || '').trim();
    const problema = String(form.get('problema') || '').trim();
    const prioridade = String(form.get('prioridade') || 'Média') as Chamado['prioridade'];

    if (!maquina || !solicitante || !local || !problema) {
      alert('Preencha os campos obrigatórios: Máquina, Solicitante, Local e Problema.');
      return;
    }

    try {
      setSalvando(true);
      const { data, error } = await supabase
        .from('chamados')
        .insert({
          maquina,
          cliente: cliente || null,
          solicitante,
          telefone: telefone || null,
          local,
          problema,
          prioridade,
          status: 'Aberto',
          criado_por: usuarioLogado.nome,
        })
        .select()
        .single();

      if (error || !data) {
        alert('Erro ao registar a Ordem de Serviço.');
        return;
      }

      setChamados((prev) => [data as Chamado, ...prev]);
      setMaquinaNovoChamado('');
      setFiltroChamados('Aberto');
      setTela('chamados');
      alert(`Ordem de Serviço #${(data as Chamado).id} aberta com sucesso!`);
    } finally {
      setSalvando(false);
    }
  }

  async function assumirChamado(id: number) {
    if (!usuarioLogado) return;
    const chamadoAtual = chamados.find((c) => c.id === id);
    if (!chamadoAtual || chamadoAtual.status !== 'Aberto') return;

    let mecanicoResponsavel = usuarioLogado.nome;

    if (usuarioLogado.tipo === 'admin') {
      const mecanicos = usuarios.filter((u) => u.tipo === 'mecanico');
      const nomeInformado = prompt(
        `Digite o nome do mecânico responsável:\n\n${mecanicos.map((m) => m.nome).join(', ')}`
      );
      if (!nomeInformado) return;
      mecanicoResponsavel = nomeInformado.trim();
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

      if (!error && data) {
        setChamados((prev) => prev.map((c) => (c.id === id ? (data as Chamado) : c)));
        setFiltroChamados('Assumido');
        alert(`Chamado #${id} assumido com sucesso por ${mecanicoResponsavel}!`);
      }
    } finally {
      setSalvando(false);
    }
  }

  function abrirTelaFinalizar(id: number) {
    const chamado = chamados.find((c) => c.id === id);
    if (chamado) {
      setChamadoParaFinalizar(chamado);
      setAssinaturaDataUrl('');
      setTela('finalizarChamado');
    }
  }

  async function concluirFinalizacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usuarioLogado || !chamadoParaFinalizar) return;

    const form = new FormData(event.currentTarget);
    const diagnostico = String(form.get('diagnosticoTecnico') || '').trim();
    const solucao = String(form.get('solucao') || '').trim();
    const pecasUtilizadas = String(form.get('pecasUtilizadas') || '').trim();
    const custoPecas = String(form.get('custoPecas') || '').trim();
    const maquinaLiberada = form.get('maquinaLiberada') === 'sim';
    const necessitaRetorno = form.get('necessitaRetorno') === 'sim';

    if (!diagnostico || !solucao) {
      alert('Preencha o diagnóstico e o serviço realizado.');
      return;
    }

    let textoSolucaoCompleta = solucao;
    if (pecasUtilizadas) {
      textoSolucaoCompleta += ` | Peças/Insumos: ${pecasUtilizadas}`;
    }
    if (custoPecas) {
      textoSolucaoCompleta += ` (Custo R$ ${custoPecas})`;
    }

    try {
      setSalvando(true);
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Finalizado',
          diagnostico_tecnico: diagnostico,
          solucao: textoSolucaoCompleta,
          maquina_liberada: maquinaLiberada,
          necessita_retorno: necessitaRetorno,
          finalizado_por: usuarioLogado.nome,
          finalizado_at: agora,
        })
        .eq('id', chamadoParaFinalizar.id)
        .select()
        .single();

      if (!error && data) {
        const chamadoSalvo = data as Chamado;

        if (assinaturaDataUrl) {
          localStorage.setItem(`controlmaq_assinatura_${chamadoSalvo.id}`, assinaturaDataUrl);
        }

        setChamados((prev) =>
          prev.map((c) => (c.id === chamadoParaFinalizar.id ? chamadoSalvo : c))
        );

        setChamadoParaFinalizar(null);
        setFiltroChamados('Finalizado');
        setTela('chamados');

        const desejaImprimir = confirm('Ordem de Serviço finalizada com sucesso!\n\nDeseja gerar o relatório em PDF com a assinatura digital agora?');
        if (desejaImprimir) {
          gerarPdfChamado(chamadoSalvo);
        }
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alterarHorimetroManual(maquinaAlvo: Maquina) {
    const horimetroAtual = maquinaAlvo.horimetro ?? 0;
    const novo = prompt(
      `Atualizar Horímetro da Máquina: ${maquinaAlvo.tag}\nValor atual: ${horimetroAtual} h\n\nDigite a nova leitura (ex: 1450.5):`
    );

    if (!novo) return;
    const valor = Number(novo.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) {
      alert('Por favor, informe um valor numérico válido.');
      return;
    }

    try {
      setSalvando(true);
      await supabase.from('maquinas').update({ horimetro: valor }).eq('id', maquinaAlvo.id);
      await supabase.from('leituras_horimetro').insert({
        maquina_id: maquinaAlvo.id,
        maquina_tag: maquinaAlvo.tag,
        operador_id: String(usuarioLogado?.id),
        operador_nome: usuarioLogado?.nome,
        horimetro: valor,
        origem: 'ajuste_administrador',
        observacao: `Ajuste manual via painel (Anterior: ${horimetroAtual} h)`,
      });

      setMaquinas((prev) =>
        prev.map((m) => (m.id === maquinaAlvo.id ? { ...m, horimetro: valor } : m))
      );
      await carregarDados(false);
      alert(`Horímetro da máquina ${maquinaAlvo.tag} atualizado para ${valor} h com sucesso!`);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfiguracaoPreventiva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preventivaSelecionada) return;

    const form = new FormData(event.currentTarget);
    const intervaloHoras = Number(String(form.get('intervalo') || '').replace(',', '.'));
    const horimetroUltimaPreventiva = Number(String(form.get('ultima') || '').replace(',', '.'));

    if (!Number.isFinite(intervaloHoras) || intervaloHoras <= 0) {
      alert('Informe um intervalo de revisão válido em horas (ex: 250 ou 500).');
      return;
    }

    try {
      setSalvando(true);
      await configurarPreventiva({
        maquinaId: preventivaSelecionada.maquina_id,
        intervaloHoras,
        horimetroUltimaPreventiva: Number.isFinite(horimetroUltimaPreventiva) ? horimetroUltimaPreventiva : 0,
      });

      await carregarDados(false);
      setModoPreventiva(null);
      setPreventivaSelecionada(null);
      alert('Plano preventivo configurado com sucesso!');
    } catch {
      alert('Erro ao guardar a configuração da preventiva.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRegistroPreventiva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preventivaSelecionada || !usuarioLogado) return;

    const form = new FormData(event.currentTarget);
    const horimetroPreventiva = Number(String(form.get('horimetro') || '').replace(',', '.'));
    const mecanicoResponsavel = String(form.get('mecanicoResponsavel') || '').trim();
    const observacaoComplementar = String(form.get('observacaoComplementar') || '').trim();

    if (!Number.isFinite(horimetroPreventiva) || horimetroPreventiva < 0) {
      alert('Informe o horímetro correto no momento da revisão.');
      return;
    }

    const itensExecutados: string[] = [];
    if (itensRevisao.filtroCombustivel) itensExecutados.push('Filtro de combustível');
    if (itensRevisao.filtroCombustivelSeparador) itensExecutados.push('Filtro combust. separador');
    if (itensRevisao.filtroArInterno) itensExecutados.push('Filtro de ar interno');
    if (itensRevisao.filtroArExterno) itensExecutados.push('Filtro de ar externo');
    if (itensRevisao.filtroLubrificante) itensExecutados.push('Filtro lubrificante');
    if (itensRevisao.filtroHidraulico) itensExecutados.push('Filtro hidráulico');

    if (itensRevisao.trocouOleoHidraulico) {
      const litros = litrosOleoHidraulico.trim() ? `${litrosOleoHidraulico.trim()}L` : 'Qtd não informada';
      itensExecutados.push(`Óleo hidráulico (${litros})`);
    }

    if (itensRevisao.trocouOleoMotor) {
      const litros = litrosOleoMotor.trim() ? `${litrosOleoMotor.trim()}L` : 'Qtd não informada';
      itensExecutados.push(`Óleo do motor (${litros})`);
    }

    if (itensExecutados.length === 0 && !observacaoComplementar) {
      alert('Selecione pelo menos um item substituído ou descreva o serviço realizado.');
      return;
    }

    let textoFinal = itensExecutados.length > 0 ? `Substituídos: ${itensExecutados.join(', ')}.` : '';
    if (observacaoComplementar) {
      textoFinal += textoFinal ? ` Observações: ${observacaoComplementar}` : observacaoComplementar;
    }

    try {
      setSalvando(true);
      const maquinaId = preventivaSelecionada.maquina_id;
      const responsavel = mecanicoResponsavel || usuarioLogado.nome;

      await registrarPreventiva({
        maquinaId,
        horimetroPreventiva,
        mecanicoResponsavel: responsavel,
        observacao: textoFinal,
        registradoPor: usuarioLogado.nome,
      });

      await carregarDados(false);
      resetarCamposRevisao();
      
      const maquinaSalva = { ...preventivaSelecionada };
      setModoPreventiva(null);
      setPreventivaSelecionada(null);

      const desejaImprimir = confirm('Revisão registrada com sucesso!\n\nDeseja gerar e imprimir o comprovante em PDF desta preventiva agora?');
      if (desejaImprimir) {
        gerarPdfPreventiva(
          { tag: maquinaSalva.tag, marca: maquinaSalva.marca, modelo: maquinaSalva.modelo },
          {
            horimetro_preventiva: horimetroPreventiva,
            mecanico_responsavel: responsavel,
            observacao: textoFinal,
            created_at: new Date().toISOString(),
          }
        );
      }
    } catch {
      alert('Não foi possível registrar a preventiva. Verifique se o plano básico já foi configurado.');
    } finally {
      setSalvando(false);
    }
  }

  function sair() {
    localStorage.removeItem(CHAVE_USUARIO_LOGADO);
    setUsuarioLogado(null);
    setTela('login');
  }

  if (tela === 'login' || !usuarioLogado) {
    return (
      <div style={estilos.paginaLogin}>
        <div style={estilos.cardLogin}>
          <div style={estilos.cabecalhoLoginMarca}>
            <span style={{ fontSize: '32px' }}>🚜</span>
            <div>
              <p style={estilos.empresaLogin}>LOKMAX MÁQUINAS</p>
              <h1 style={estilos.tituloLogin}>ControlMaq</h1>
            </div>
          </div>
          <p style={estilos.subtituloLogin}>
            Gestão técnica de frotas e ordens de serviço em campo
          </p>

          <form onSubmit={entrarNoApp}>
            <label style={estilos.labelLogin}>Usuário / Credencial</label>
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
              placeholder="••••••••"
              style={estilos.inputLogin}
              required
            />

            <button
              type="submit"
              style={estilos.botaoLogin}
              disabled={salvando}
            >
              {salvando ? 'Acessando...' : 'Acessar ao Painel'}
            </button>
          </form>

          <p style={estilos.direitosAutoraisLogin}>
            LOKMAX © 2026 — Plataforma Técnica de Manutenção
          </p>
        </div>
      </div>
    );
  }

  const historicoDaMaquinaModal = maquinaHistoricoModal
    ? historicoPreventivas.filter((h) => h.maquina_id === maquinaHistoricoModal.maquina_id)
    : [];

  return (
    <div style={estilos.pagina}>
      <Topo
        usuario={usuarioLogado}
        tela={tela}
        onNavigate={(t) => {
          setModoPreventiva(null);
          setPreventivaSelecionada(null);
          setMaquinaHistoricoModal(null);
          setMaquinaDossie(null);
          resetarCamposRevisao();
          setTela(t);
        }}
        onSair={sair}
      />

      <main className="controlmaq-main" style={estilos.conteudo}>
        {/* TELA 1: DASHBOARD EXECUTIVO */}
        {tela === 'dashboard' && (
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
                abrirChamado: (c) => {
                  setChamadoDetalhes(c);
                  setTela('detalhesChamado');
                },
                setTela,
                setFiltroChamados: (filtro) => {
                  setFiltroChamados(filtro);
                  setTela('chamados');
                },
                setFiltroPrioridadeChamados: (p) => setFiltroPrioridadeChamados(p),
                setFiltroMaquinaChamados: (m) => setFiltroMaquinaChamados(m),
                setFiltroMecanicoChamados: (mec) => setFiltroMecanicoChamados(mec),
                setFiltroStatusMaquina: (st) => {
                  setFiltroStatusMaquina(st);
                  setTela('maquinas');
                },
                setFiltroPreventivas: (f) => {
                  setFiltroPreventivas(f);
                  setTela('preventivas');
                },
                setBuscaPreventivas,
                setBuscaChamados,
                setBuscaMaquinas,
              })
            }
          />
        )}

        {/* TELA 2: GESTÃO DA FROTA DE MÁQUINAS (CRUD COMPLETO & EXPORTAÇÃO) */}
        {tela === 'maquinas' && (
          <div>
            <div className="responsivo-cabecalho-acoes" style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Inventário de Equipamentos</span>
                <h2 style={estilos.tituloSecao}>Frota de Máquinas Ativas</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    exportarParaCsv(
                      'Frota_Lokmax',
                      ['TAG', 'Marca', 'Modelo', 'Horímetro (h)', 'Status'],
                      maquinas.map((m) => [m.tag, m.marca, m.modelo, m.horimetro ?? 0, m.status_maquina])
                    )
                  }
                  style={estilos.botaoExportarCsv}
                >
                  📥 Exportar CSV
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMaquinaEmEdicao(null);
                      setModalNovaMaquina(true);
                    }}
                    style={estilos.botaoNovo}
                  >
                    + Nova Máquina
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <input
                value={buscaMaquinas}
                onChange={(e) => setBuscaMaquinas(e.target.value)}
                placeholder="Buscar por TAG, modelo ou fabricante (ex: Wacker, Ditch Witch, Yanmar)..."
                style={estilos.inputBusca}
              />

              <div style={estilos.filtros}>
                <button
                  onClick={() => setFiltroStatusMaquina('Todos')}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === 'Todos' ? '#0f172a' : '#fff',
                    color: filtroStatusMaquina === 'Todos' ? '#fff' : '#475569',
                  }}
                >
                  Todas ({maquinas.length})
                </button>
                <button
                  onClick={() => setFiltroStatusMaquina('Operacional')}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === 'Operacional' ? '#16a34a' : '#fff',
                    color: filtroStatusMaquina === 'Operacional' ? '#fff' : '#475569',
                  }}
                >
                  ● Operacionais ({maquinas.filter((m) => m.status_maquina === 'Operacional').length})
                </button>
                <button
                  onClick={() => setFiltroStatusMaquina('Parada')}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === 'Parada' ? '#dc2626' : '#fff',
                    color: filtroStatusMaquina === 'Parada' ? '#fff' : '#475569',
                  }}
                >
                  ● Paradas ({maquinas.filter((m) => m.status_maquina === 'Parada').length})
                </button>
                <button
                  onClick={() => setFiltroStatusMaquina('Em manutenção')}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === 'Em manutenção' ? '#f59e0b' : '#fff',
                    color: filtroStatusMaquina === 'Em manutenção' ? '#fff' : '#475569',
                  }}
                >
                  ● Em Manutenção
                </button>
              </div>
            </div>

            <div className="responsivo-grelha" style={estilos.listaMaquinas}>
              {maquinasFiltradas.length === 0 ? (
                <div style={{ ...estilos.cardFormulario, textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ color: '#64748b' }}>Nenhum equipamento encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                maquinasFiltradas.map((maquina) => {
                  const situacao = calcularSituacaoMaquina(maquina.tag, chamados);
                  const chamadosDaMaquina = chamados.filter(
                    (c) => normalizarTexto(c.maquina) === normalizarTexto(maquina.tag)
                  );
                  const abertos = chamadosDaMaquina.filter((c) => c.status !== 'Finalizado').length;

                  return (
                    <div key={maquina.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '18px', color: '#0f172a', display: 'block' }}>
                            {maquina.tag}
                          </strong>
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                            {maquina.marca} • {maquina.modelo}
                          </span>
                        </div>
                        <span
                          className={`cm-badge ${
                            situacao === 'Operacional'
                              ? 'badge-op-operacional'
                              : situacao === 'Parada'
                              ? 'badge-op-parada'
                              : 'badge-op-manutencao'
                          }`}
                        >
                          {situacao}
                        </span>
                      </div>

                      <div style={estilos.caixaHorimetro}>
                        <div>
                          <small style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>
                            Horímetro Acumulado
                          </small>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                            {maquina.horimetro !== null && maquina.horimetro !== undefined
                              ? `${maquina.horimetro.toLocaleString('pt-BR')} h`
                              : 'Sem leitura'}
                          </div>
                        </div>

                        <button
                          onClick={() => alterarHorimetroManual(maquina)}
                          style={estilos.botaoAjustarHorimetro}
                        >
                          Ajustar
                        </button>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', display: 'grid', gap: '4px' }}>
                        <div>
                          Chamados ativos: <strong style={{ color: abertos > 0 ? '#dc2626' : '#16a34a' }}>{abertos}</strong>
                        </div>
                        <div>
                          Histórico total: <strong>{chamadosDaMaquina.length} chamados registrados</strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '8px' }}>
                        <button
                          onClick={() => {
                            setMaquinaNovoChamado(maquina.tag);
                            setTela('novoChamado');
                          }}
                          style={estilos.botaoCardPrincipal}
                        >
                          + Abrir OS
                        </button>
                        <button
                          onClick={() => setMaquinaDossie(maquina)}
                          style={estilos.botaoHistorico}
                        >
                          📋 Dossiê
                        </button>
                      </div>

                      {isAdmin && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setMaquinaEmEdicao(maquina);
                              setModalNovaMaquina(true);
                            }}
                            style={{ ...estilos.botaoAjustarHorimetro, fontSize: '11px', padding: '6px 8px' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => excluirMaquina(maquina)}
                            style={{ ...estilos.botaoExcluirOS, fontSize: '11px', padding: '6px 8px' }}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MODAL: CADASTRO / EDIÇÃO DE MÁQUINA */}
        {modalNovaMaquina && isAdmin && (
          <div style={estilos.modalOverlay}>
            <div className="modal-card-responsivo" style={estilos.modalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  {maquinaEmEdicao ? `Editar Máquina: ${maquinaEmEdicao.tag}` : 'Cadastrar Novo Equipamento'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setModalNovaMaquina(false);
                    setMaquinaEmEdicao(null);
                  }}
                  style={estilos.botaoFecharModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={salvarMaquina}>
                <label style={estilos.label}>TAG / Identificação da Máquina *</label>
                <input
                  name="tag"
                  defaultValue={maquinaEmEdicao?.tag}
                  placeholder="Ex: C16X-01, RTX250-02, ST31-01"
                  style={estilos.input}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={estilos.label}>Marca / Fabricante *</label>
                    <input
                      name="marca"
                      defaultValue={maquinaEmEdicao?.marca}
                      placeholder="Ex: Ditch Witch, Yanmar"
                      style={estilos.input}
                      required
                    />
                  </div>
                  <div>
                    <label style={estilos.label}>Modelo *</label>
                    <input
                      name="modelo"
                      defaultValue={maquinaEmEdicao?.modelo}
                      placeholder="Ex: C16X, ST31"
                      style={estilos.input}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={estilos.label}>Horímetro Inicial (h)</label>
                    <input
                      name="horimetro"
                      type="number"
                      step="0.1"
                      defaultValue={maquinaEmEdicao?.horimetro ?? 0}
                      style={estilos.input}
                    />
                  </div>
                  <div>
                    <label style={estilos.label}>Status Operacional</label>
                    <select
                      name="status_maquina"
                      defaultValue={maquinaEmEdicao?.status_maquina ?? 'Operacional'}
                      style={estilos.input}
                    >
                      <option value="Operacional">Operacional</option>
                      <option value="Parada">Parada</option>
                      <option value="Em manutenção">Em manutenção</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModalNovaMaquina(false);
                      setMaquinaEmEdicao(null);
                    }}
                    style={estilos.botaoAjustarHorimetro}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={estilos.botaoNovoSubmit} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Gravar Equipamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DOSSIÊ COMPLETO DO ATIVO */}
        {maquinaDossie && (
          <div style={estilos.modalOverlay}>
            <div className="modal-card-responsivo" style={{ ...estilos.modalCard, maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px' }}>Dossiê do Ativo: {maquinaDossie.tag}</h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    {maquinaDossie.marca} • {maquinaDossie.modelo} — Horímetro: {maquinaDossie.horimetro ?? 0} h
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMaquinaDossie(null)}
                  style={estilos.botaoFecharModal}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                <button
                  onClick={() => gerarPdfDossie(maquinaDossie)}
                  style={estilos.botaoNovoSubmit}
                >
                  📄 Exportar Prontuário Completo (PDF)
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Seção 1: Revisões Preventivas */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
                    🔧 Histórico de Preventivas ({historicoPreventivas.filter((h) => h.maquina_id === maquinaDossie.id).length})
                  </strong>
                  {historicoPreventivas.filter((h) => h.maquina_id === maquinaDossie.id).length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Nenhuma preventiva registrada.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {historicoPreventivas
                        .filter((h) => h.maquina_id === maquinaDossie.id)
                        .map((rev) => (
                          <div key={rev.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span>Revisão aos {rev.horimetro_preventiva} h</span>
                              <span style={{ color: '#64748b' }}>{new Date(rev.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p style={{ margin: '4px 0 0', color: '#334155' }}>{rev.observacao}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Seção 2: Ordens de Serviço Corretivas */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
                    ⚠️ Ordens de Serviço & Intervenções ({chamados.filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag)).length})
                  </strong>
                  {chamados.filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag)).length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Nenhuma OS aberta para esta máquina.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {chamados
                        .filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag))
                        .map((ch) => (
                          <div key={ch.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span>OS #{ch.id} — Status: {ch.status}</span>
                              <span style={{ color: '#64748b' }}>{new Date(ch.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div style={{ margin: '4px 0', color: '#334155' }}><strong>Falha:</strong> {ch.problema}</div>
                            {ch.solucao && <div style={{ color: '#166534' }}><strong>Solução:</strong> {ch.solucao}</div>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TELA 3: ABRIR NOVA ORDEM DE SERVIÇO */}
        {tela === 'novoChamado' && (
          <div className="modal-card-responsivo" style={estilos.cardFormulario}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>
              ← Cancelar
            </button>
            <h2 style={{ margin: '8px 0 6px', fontSize: '22px' }}>Abrir Nova Ordem de Serviço</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px' }}>
              Registe a solicitação de manutenção para atendimento em campo ou oficina.
            </p>

            <form onSubmit={criarChamado}>
              <label style={estilos.label}>Máquina / Equipamento *</label>
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
                    {m.tag} — {m.marca} {m.modelo}
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={estilos.label}>Cliente</label>
                  <input
                    name="cliente"
                    placeholder="Empresa ou cliente da locação"
                    style={estilos.input}
                  />
                </div>
                <div>
                  <label style={estilos.label}>Solicitante *</label>
                  <input
                    name="solicitante"
                    placeholder="Nome de quem solicitou"
                    style={estilos.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={estilos.label}>Telefone de Contato</label>
                  <input
                    name="telefone"
                    placeholder="(xx) xxxxx-xxxx"
                    style={estilos.input}
                  />
                </div>
                <div>
                  <label style={estilos.label}>Prioridade</label>
                  <select name="prioridade" style={estilos.input} defaultValue="Média">
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <label style={estilos.label}>Local do Atendimento / Obra *</label>
              <input
                name="local"
                placeholder="Ex: Obra Vale Nova Lima, Pátio Central..."
                style={estilos.input}
                required
              />

              <label style={estilos.label}>Problema / Anomalia Relatada *</label>
              <textarea
                name="problema"
                placeholder="Descreva detalhadamente o sintoma apresentado pela máquina..."
                style={estilos.textarea}
                required
              />

              <button
                type="submit"
                style={{ ...estilos.botaoNovoSubmit, marginTop: '20px' }}
                disabled={salvando}
              >
                {salvando ? 'A registar...' : 'Confirmar e Abrir Ordem de Serviço'}
              </button>
            </form>
          </div>
        )}

        {/* TELA 4: PLANO PREVENTIVO (COM EXPORTAÇÃO CSV) */}
        {tela === 'preventivas' && (
          <div>
            <div className="responsivo-cabecalho-acoes" style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Engenharia de Confiabilidade</span>
                <h2 style={estilos.tituloSecao}>Plano de Manutenção Preventiva</h2>
              </div>
              <button
                onClick={() =>
                  exportarParaCsv(
                    'Plano_Preventivo_Lokmax',
                    ['TAG', 'Marca', 'Modelo', 'Horímetro Atual', 'Próxima Revisão', 'Intervalo', 'Status'],
                    preventivas.map((p) => [
                      p.tag,
                      p.marca,
                      p.modelo,
                      p.horimetro_atual ?? 0,
                      p.proxima_preventiva_horimetro ?? 'Pendente',
                      p.intervalo_horas ?? 0,
                      p.status_preventiva,
                    ])
                  )
                }
                style={estilos.botaoExportarCsv}
              >
                📥 Exportar CSV
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <input
                value={buscaPreventivas}
                onChange={(e) => setBuscaPreventivas(e.target.value)}
                placeholder="Filtrar por TAG da máquina, modelo ou fabricante..."
                style={estilos.inputBusca}
              />

              <div style={estilos.filtros}>
                {(['Todos', 'Vencida', 'Urgente', 'Atenção', 'Em dia', 'Não configurada'] as FiltroPreventiva[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroPreventivas(f)}
                    style={{
                      ...estilos.botaoFiltro,
                      background: filtroPreventivas === f ? '#0f172a' : '#fff',
                      color: filtroPreventivas === f ? '#fff' : '#475569',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="responsivo-grelha" style={estilos.listaMaquinas}>
              {preventivasFiltradas.length === 0 ? (
                <div style={{ ...estilos.cardFormulario, textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ color: '#64748b' }}>Nenhum plano preventivo localizado com estes critérios.</p>
                </div>
              ) : (
                preventivasFiltradas.map((p) => {
                  const statusClasse =
                    p.status_preventiva === 'Em dia'
                      ? 'badge-prev-em-dia'
                      : p.status_preventiva === 'Atenção'
                      ? 'badge-prev-atencao'
                      : p.status_preventiva === 'Urgente'
                      ? 'badge-prev-urgente'
                      : p.status_preventiva === 'Vencida'
                      ? 'badge-prev-vencida'
                      : 'badge-prev-pendente';

                  return (
                    <div key={p.maquina_id} className="cm-card" style={estilos.cardMaquinaNovo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '18px', color: '#0f172a', display: 'block' }}>
                            {p.tag}
                          </strong>
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                            {p.marca} • {p.modelo}
                          </span>
                        </div>
                        <span className={`cm-badge ${statusClasse}`}>
                          {p.status_preventiva}
                        </span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Horímetro Atual:</span>
                          <strong>{p.horimetro_atual ?? 0} h</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Próxima Revisão:</span>
                          <strong style={{ color: p.status_preventiva === 'Vencida' ? '#dc2626' : '#0f172a' }}>
                            {p.proxima_preventiva_horimetro !== null && p.proxima_preventiva_horimetro !== undefined
                              ? `${p.proxima_preventiva_horimetro} h`
                              : 'Pendente'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Intervalo Programado:</span>
                          <span>{p.intervalo_horas ? `A cada ${p.intervalo_horas} h` : 'Não definido'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            resetarCamposRevisao();
                            setPreventivaSelecionada(p);
                            setModoPreventiva('registrar');
                          }}
                          style={estilos.botaoCardPrincipal}
                        >
                          ✓ Revisão
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreventivaSelecionada(p);
                            setModoPreventiva('configurar');
                          }}
                          style={estilos.botaoAjustarHorimetro}
                        >
                          ⚙ Plano
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaquinaHistoricoModal(p)}
                          style={estilos.botaoHistorico}
                        >
                          📜 Histórico
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TELA 5: HORÍMETROS (APONTAMENTO EM LOTE INTELIGENTE) */}
        {tela === 'horimetros' && (
          <div>
            <div className="responsivo-cabecalho-acoes" style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Apontamento Diário</span>
                <h2 style={estilos.tituloSecao}>Registo de Horímetros da Frota</h2>
              </div>
              <button
                onClick={salvarHorimetrosEmLote}
                disabled={salvando || Object.keys(leiturasLote).length === 0}
                style={{ ...estilos.botaoNovo, background: '#16a34a', color: '#fff' }}
              >
                💾 Salvar Todas as Leituras
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '13px', margin: '-10px 0 20px' }}>
              Preencha os novos horímetros dos equipamentos e salve tudo com um único clique.
            </p>

            <div className="responsivo-grelha" style={estilos.listaMaquinas}>
              {maquinas.map((m) => {
                const valorDigitado = leiturasLote[m.id] ?? '';
                const numeroDigitado = Number(valorDigitado.replace(',', '.'));
                const ehMenor = valorDigitado && Number.isFinite(numeroDigitado) && numeroDigitado < (m.horimetro ?? 0);

                return (
                  <div key={m.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '18px' }}>{m.tag}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{m.marca} {m.modelo}</span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Leitura Atual:</span>
                        <strong>{m.horimetro ?? 0} h</strong>
                      </div>

                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Nova Leitura (h)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 1250.5"
                        value={valorDigitado}
                        onChange={(e) => setLeiturasLote({ ...leiturasLote, [m.id]: e.target.value })}
                        style={{
                          ...estilos.input,
                          borderColor: ehMenor ? '#dc2626' : '#cbd5e1',
                          background: ehMenor ? '#fef2f2' : '#ffffff',
                        }}
                      />
                      {ehMenor && (
                        <small style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                          ⚠️ Valor menor que o horímetro anterior!
                        </small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TELA 6: ORDENS DE SERVIÇO (MODO LISTA & KANBAN) */}
        {tela === 'chamados' && (
          <div>
            <div className="responsivo-cabecalho-acoes" style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Operações Ativas</span>
                <h2 style={estilos.tituloSecao}>Quadro de Ordens de Serviço</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    exportarParaCsv(
                      'Ordens_de_Servico_Lokmax',
                      ['OS #', 'Máquina', 'Status', 'Cliente', 'Solicitante', 'Local', 'Mecânico', 'Problema', 'Solução'],
                      chamados.map((c) => [
                        c.id,
                        c.maquina,
                        c.status,
                        c.cliente || '',
                        c.solicitante,
                        c.local,
                        c.mecanico || '',
                        c.problema,
                        c.solucao || '',
                      ])
                    )
                  }
                  style={estilos.botaoExportarCsv}
                >
                  📥 Exportar CSV
                </button>

                <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                  <button
                    onClick={() => setModoVisualizacao('lista')}
                    style={{
                      border: 0,
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: modoVisualizacao === 'lista' ? '#ffffff' : 'transparent',
                      color: modoVisualizacao === 'lista' ? '#0f172a' : '#64748b',
                    }}
                  >
                    📋 Lista
                  </button>
                  <button
                    onClick={() => setModoVisualizacao('kanban')}
                    style={{
                      border: 0,
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: modoVisualizacao === 'kanban' ? '#ffffff' : 'transparent',
                      color: modoVisualizacao === 'kanban' ? '#0f172a' : '#64748b',
                    }}
                  >
                    📊 Quadro Kanban
                  </button>
                </div>

                <button
                  onClick={() => {
                    setMaquinaNovoChamado('');
                    setTela('novoChamado');
                  }}
                  style={estilos.botaoNovo}
                >
                  + Abrir Nova OS
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                value={buscaChamados}
                onChange={(e) => setBuscaChamados(e.target.value)}
                placeholder="Pesquisar por TAG da máquina, cliente, falha ou mecânico..."
                style={estilos.inputBusca}
              />
            </div>

            {modoVisualizacao === 'lista' && (
              <>
                <div style={estilos.filtros}>
                  <button
                    onClick={() => setFiltroChamados('Todos')}
                    style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Todos' ? '#0f172a' : '#fff', color: filtroChamados === 'Todos' ? '#fff' : '#475569' }}
                  >
                    Todos ({chamadosVisiveis.length})
                  </button>
                  <button
                    onClick={() => setFiltroChamados('Aberto')}
                    style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Aberto' ? '#dc2626' : '#fff', color: filtroChamados === 'Aberto' ? '#fff' : '#475569' }}
                  >
                    Abertos ({chamadosAbertos.length})
                  </button>
                  <button
                    onClick={() => setFiltroChamados('Assumido')}
                    style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Assumido' ? '#2563eb' : '#fff', color: filtroChamados === 'Assumido' ? '#fff' : '#475569' }}
                  >
                    Em Andamento ({chamadosAssumidos.length})
                  </button>
                  <button
                    onClick={() => setFiltroChamados('Finalizado')}
                    style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Finalizado' ? '#16a34a' : '#fff', color: filtroChamados === 'Finalizado' ? '#fff' : '#475569' }}
                  >
                    Concluídos ({chamadosFinalizados.length})
                  </button>
                </div>

                <div className="responsivo-grelha" style={estilos.listaMaquinas}>
                  {chamadosFiltrados.length === 0 ? (
                    <div style={{ ...estilos.cardFormulario, textAlign: 'center', gridColumn: '1 / -1' }}>
                      <p style={{ color: '#64748b' }}>Nenhuma ordem de serviço localizada com estes filtros.</p>
                    </div>
                  ) : (
                    chamadosFiltrados.map((chamado) => (
                      <div key={chamado.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '16px' }}>{chamado.maquina}</strong>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{chamado.id}</span>
                          </div>
                          <span className={`cm-badge badge-${chamado.status.toLowerCase()}`}>{chamado.status}</span>
                        </div>

                        <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#334155', lineHeight: 1.4 }}>
                          {chamado.problema}
                        </p>

                        <div style={{ fontSize: '12px', color: '#64748b', display: 'grid', gap: '3px', marginBottom: '14px' }}>
                          <div>📍 Local: {chamado.local}</div>
                          <div>👤 Solicitante: <strong>{chamado.solicitante}</strong></div>
                          <div>🔧 Mecânico: <strong>{chamado.mecanico || 'Aguardando atribuição'}</strong></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                          <button
                            onClick={() => {
                              setChamadoDetalhes(chamado);
                              setTela('detalhesChamado');
                            }}
                            style={estilos.botaoAjustarHorimetro}
                          >
                            Detalhes
                          </button>

                          {chamado.status === 'Aberto' && (
                            <button
                              onClick={() => assumirChamado(chamado.id)}
                              style={estilos.botaoCardPrincipal}
                            >
                              Assumir OS
                            </button>
                          )}

                          {chamado.status === 'Assumido' && (
                            <button
                              onClick={() => abrirTelaFinalizar(chamado.id)}
                              style={{ ...estilos.botaoCardPrincipal, background: '#16a34a' }}
                            >
                              Concluir OS
                            </button>
                          )}

                          {chamado.status === 'Finalizado' && (
                            <button
                              onClick={() => gerarPdfChamado(chamado)}
                              style={{ ...estilos.botaoCardPrincipal, background: '#0f172a' }}
                            >
                              📄 PDF
                            </button>
                          )}

                          <button
                            onClick={() => excluirChamado(chamado)}
                            title="Excluir Ordem de Serviço"
                            style={estilos.botaoExcluirOS}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {modoVisualizacao === 'kanban' && (
              <div className="kanban-grid">
                {/* COLUNA 1: ABERTOS */}
                <div className="kanban-coluna">
                  <div className="kanban-coluna-header">
                    <strong style={{ color: '#dc2626', fontSize: '14px' }}>🔴 Abertos / Pendentes</strong>
                    <span style={estilos.badgeContador}>{chamadosAbertos.length}</span>
                  </div>

                  {chamadosAbertos.length === 0 ? (
                    <p style={estilos.textoVazioKanban}>Nenhum chamado aberto</p>
                  ) : (
                    chamadosAbertos.map((c) => (
                      <div key={c.id} className="cm-card" style={estilos.cardKanbanItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong>{c.maquina}</strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{c.id}</span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#334155', lineHeight: 1.3 }}>
                          {c.problema}
                        </p>
                        <small style={{ color: '#64748b', display: 'block', marginBottom: '10px' }}>
                          📍 {c.local}
                        </small>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => assumirChamado(c.id)}
                            style={{ ...estilos.botaoCardPrincipal, padding: '6px 8px', fontSize: '11px' }}
                          >
                            Assumir
                          </button>
                          <button
                            onClick={() => {
                              setChamadoDetalhes(c);
                              setTela('detalhesChamado');
                            }}
                            style={{ ...estilos.botaoAjustarHorimetro, padding: '6px 8px', fontSize: '11px' }}
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => excluirChamado(c)}
                            title="Excluir Chamado"
                            style={estilos.botaoExcluirOS}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* COLUNA 2: EM ATENDIMENTO */}
                <div className="kanban-coluna">
                  <div className="kanban-coluna-header">
                    <strong style={{ color: '#d97706', fontSize: '14px' }}>🟡 Em Atendimento</strong>
                    <span style={estilos.badgeContador}>{chamadosAssumidos.length}</span>
                  </div>

                  {chamadosAssumidos.length === 0 ? (
                    <p style={estilos.textoVazioKanban}>Nenhum chamado em execução</p>
                  ) : (
                    chamadosAssumidos.map((c) => (
                      <div key={c.id} className="cm-card" style={estilos.cardKanbanItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong>{c.maquina}</strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{c.id}</span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#334155', lineHeight: 1.3 }}>
                          {c.problema}
                        </p>
                        <small style={{ color: '#0f172a', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
                          🔧 Técnico: {c.mecanico}
                        </small>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => abrirTelaFinalizar(c.id)}
                            style={{ ...estilos.botaoCardPrincipal, background: '#16a34a', padding: '6px 8px', fontSize: '11px' }}
                          >
                            ✓ Concluir
                          </button>
                          <button
                            onClick={() => {
                              setChamadoDetalhes(c);
                              setTela('detalhesChamado');
                            }}
                            style={{ ...estilos.botaoAjustarHorimetro, padding: '6px 8px', fontSize: '11px' }}
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => excluirChamado(c)}
                            title="Excluir Chamado"
                            style={estilos.botaoExcluirOS}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* COLUNA 3: CONCLUÍDOS */}
                <div className="kanban-coluna">
                  <div className="kanban-coluna-header">
                    <strong style={{ color: '#16a34a', fontSize: '14px' }}>🟢 Concluídos</strong>
                    <span style={estilos.badgeContador}>{chamadosFinalizados.length}</span>
                  </div>

                  {chamadosFinalizados.length === 0 ? (
                    <p style={estilos.textoVazioKanban}>Nenhum chamado finalizado</p>
                  ) : (
                    chamadosFinalizados.map((c) => (
                      <div key={c.id} className="cm-card" style={estilos.cardKanbanItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong>{c.maquina}</strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{c.id}</span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#334155', lineHeight: 1.3 }}>
                          {c.problema}
                        </p>
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginBottom: '10px' }}>
                          ✓ Concluído por: {c.mecanico || c.finalizado_por}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => gerarPdfChamado(c)}
                            style={{ ...estilos.botaoCardPrincipal, background: '#0f172a', padding: '6px 8px', fontSize: '11px' }}
                          >
                            📄 PDF
                          </button>
                          <button
                            onClick={() => {
                              setChamadoDetalhes(c);
                              setTela('detalhesChamado');
                            }}
                            style={{ ...estilos.botaoAjustarHorimetro, padding: '6px 8px', fontSize: '11px' }}
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => excluirChamado(c)}
                            title="Excluir Chamado"
                            style={estilos.botaoExcluirOS}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TELA 7: DETALHES DE CHAMADO */}
        {tela === 'detalhesChamado' && chamadoDetalhes && (
          <div className="modal-card-responsivo" style={estilos.cardFormulario}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>
              ← Voltar ao Quadro
            </button>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '18px' }}>
              <span className={`cm-badge badge-${chamadoDetalhes.status.toLowerCase()}`}>
                {chamadoDetalhes.status}
              </span>
              <h2 style={{ margin: '6px 0 0', fontSize: '22px' }}>
                Ordem de Serviço #{chamadoDetalhes.id} — {chamadoDetalhes.maquina}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px', fontSize: '14px' }}>
              <div><strong>Cliente:</strong> {chamadoDetalhes.cliente || 'Não especificado'}</div>
              <div><strong>Solicitante:</strong> {chamadoDetalhes.solicitante}</div>
              <div><strong>Telefone:</strong> {chamadoDetalhes.telefone || 'Não informado'}</div>
              <div><strong>Local:</strong> {chamadoDetalhes.local}</div>
              <div><strong>Mecânico:</strong> {chamadoDetalhes.mecanico || 'Pendente'}</div>
              <div><strong>Prioridade:</strong> {chamadoDetalhes.prioridade}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
              <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Problema Relatado</strong>
              <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{chamadoDetalhes.problema}</p>
            </div>

            {chamadoDetalhes.diagnostico_tecnico && (
              <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#475569', textTransform: 'uppercase' }}>Diagnóstico Técnico</strong>
                <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{chamadoDetalhes.diagnostico_tecnico}</p>
              </div>
            )}

            {chamadoDetalhes.solucao && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '10px', marginBottom: '18px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#166534', textTransform: 'uppercase' }}>Serviço & Insumos Utilizados</strong>
                <p style={{ margin: '4px 0 0', lineHeight: 1.5, color: '#14532d' }}>{chamadoDetalhes.solucao}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
              <button
                onClick={() => gerarPdfChamado(chamadoDetalhes)}
                style={estilos.botaoNovoSubmit}
              >
                📄 Imprimir Ordem de Serviço (PDF)
              </button>

              {chamadoDetalhes.status === 'Assumido' && (
                <button
                  onClick={() => abrirTelaFinalizar(chamadoDetalhes.id)}
                  style={{ ...estilos.botaoNovoSubmit, background: '#16a34a', color: '#fff' }}
                >
                  Concluir Atendimento
                </button>
              )}

              <button
                onClick={() => {
                  excluirChamado(chamadoDetalhes);
                  setTela('chamados');
                }}
                style={{ ...estilos.botaoExcluirOS, padding: '10px 14px' }}
                title="Excluir Chamado"
              >
                🗑
              </button>
            </div>
          </div>
        )}

        {/* TELA 8: FINALIZAR CHAMADO COM INSUMOS, CUSTOS & ASSINATURA */}
        {tela === 'finalizarChamado' && chamadoParaFinalizar && (
          <div className="modal-card-responsivo" style={{ ...estilos.cardFormulario, maxWidth: '680px' }}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>
              ← Cancelar
            </button>
            <h2 style={{ margin: '8px 0 4px', fontSize: '22px' }}>
              Concluir OS #{chamadoParaFinalizar.id} — {chamadoParaFinalizar.maquina}
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '18px' }}>
              Preencha os pareceres técnicos, insumos utilizados e colha a assinatura digital para fechar o atendimento.
            </p>

            <form onSubmit={concluirFinalizacao}>
              <label style={estilos.label}>Diagnóstico Técnico do Problema *</label>
              <textarea
                name="diagnosticoTecnico"
                placeholder="Descreva a causa raiz identificada no equipamento..."
                style={estilos.textarea}
                required
              />

              <label style={estilos.label}>Serviço e Reparos Concluídos *</label>
              <textarea
                name="solucao"
                placeholder="Descreva os procedimentos efetuados..."
                style={estilos.textarea}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={estilos.label}>Peças / Insumos Utilizados</label>
                  <input
                    name="pecasUtilizadas"
                    placeholder="Ex: Mangueira 3/8, 4 dentes valetadeira, 2kg graxa"
                    style={estilos.input}
                  />
                </div>
                <div>
                  <label style={estilos.label}>Custo Estimado (R$)</label>
                  <input
                    name="custoPecas"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 380.00"
                    style={estilos.input}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0' }}>
                <div>
                  <label style={estilos.label}>Equipamento Liberado?</label>
                  <select name="maquinaLiberada" style={estilos.input} defaultValue="sim">
                    <option value="sim">Sim, totalmente operacional</option>
                    <option value="nao">Não, necessita bloqueio</option>
                  </select>
                </div>
                <div>
                  <label style={estilos.label}>Necessita Retorno Técnico?</label>
                  <select name="necessitaRetorno" style={estilos.input} defaultValue="nao">
                    <option value="nao">Não, caso concluído</option>
                    <option value="sim">Sim, aguarda sobressalente</option>
                  </select>
                </div>
              </div>

              <label style={{ ...estilos.label, marginTop: '16px' }}>
                Assinatura Digital do Técnico / Responsável
              </label>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>
                Desenhe a assinatura no quadro abaixo usando o dedo ou mouse:
              </p>

              <QuadroAssinaturaDigital onChange={(dataUrl) => setAssinaturaDataUrl(dataUrl)} />

              <button
                type="submit"
                style={{ ...estilos.botaoNovoSubmit, background: '#16a34a', color: '#fff', marginTop: '20px' }}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Concluir Chamado & Registrar Assinatura'}
              </button>
            </form>
          </div>
        )}

        {/* TELA 9: GESTÃO DE UTILIZADORES & TÉCNICOS */}
        {tela === 'usuarios' && isAdmin && (
          <div>
            <div className="responsivo-cabecalho-acoes" style={estilos.cabecalhoPagina}>
              <div>
                <span style={estilos.preTitulo}>Administração de Acessos</span>
                <h2 style={estilos.tituloSecao}>Equipa Técnica e Utilizadores</h2>
              </div>
              <button
                onClick={() => setTela('novoUsuario')}
                style={estilos.botaoNovo}
              >
                + Novo Utilizador
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <input
                value={buscaUsuarios}
                onChange={(e) => setBuscaUsuarios(e.target.value)}
                placeholder="Pesquisar utilizador por nome, login ou perfil..."
                style={estilos.inputBusca}
              />
            </div>

            <div className="responsivo-grelha" style={estilos.listaMaquinas}>
              {usuariosFiltrados.map((u) => {
                const isProprioUsuario = usuarioLogado?.id === u.id;
                const perfilCor =
                  u.tipo === 'admin'
                    ? '#0f172a'
                    : u.tipo === 'mecanico'
                    ? '#f59e0b'
                    : '#2563eb';

                return (
                  <div key={u.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${perfilCor}15`, color: perfilCor, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '16px' }}>
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block' }}>
                            {u.nome} {isProprioUsuario && <small style={{ color: '#16a34a', fontWeight: 700 }}>(Você)</small>}
                          </strong>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            @{u.login}
                          </span>
                        </div>
                      </div>

                      <span
                        className="cm-badge"
                        style={{
                          background: u.ativo ? '#ecfdf5' : '#fef2f2',
                          color: u.ativo ? '#047857' : '#b91c1c',
                          border: `1px solid ${u.ativo ? '#a7f3d0' : '#fecaca'}`,
                        }}
                      >
                        {u.ativo ? '● Ativo' : '● Bloqueado'}
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', fontSize: '13px', display: 'grid', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Perfil:</span>
                        <strong style={{ textTransform: 'capitalize', color: perfilCor }}>{u.tipo}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Último Acesso:</span>
                        <span>{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca acedeu'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <button
                        onClick={() => alterarSenhaUsuario(u)}
                        style={{ ...estilos.botaoAjustarHorimetro, fontSize: '11px', padding: '6px 8px' }}
                      >
                        Mudar Senha
                      </button>

                      <button
                        onClick={() => alternarPerfilUsuario(u)}
                        disabled={isProprioUsuario}
                        style={{ ...estilos.botaoAjustarHorimetro, fontSize: '11px', padding: '6px 8px', opacity: isProprioUsuario ? 0.5 : 1 }}
                      >
                        Trocar Perfil
                      </button>

                      <button
                        onClick={() => alternarStatusUsuario(u)}
                        disabled={isProprioUsuario}
                        style={{
                          ...estilos.botaoAjustarHorimetro,
                          fontSize: '11px',
                          padding: '6px 8px',
                          color: u.ativo ? '#dc2626' : '#16a34a',
                          opacity: isProprioUsuario ? 0.5 : 1,
                        }}
                      >
                        {u.ativo ? 'Bloquear' : 'Desbloquear'}
                      </button>

                      <button
                        onClick={() => excluirUsuario(u)}
                        disabled={isProprioUsuario}
                        style={{
                          ...estilos.botaoExcluirOS,
                          fontSize: '11px',
                          padding: '6px 8px',
                          opacity: isProprioUsuario ? 0.5 : 1,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TELA 10: REGISTO DE NOVO UTILIZADOR */}
        {tela === 'novoUsuario' && isAdmin && (
          <div className="modal-card-responsivo" style={estilos.cardFormulario}>
            <button onClick={() => setTela('usuarios')} style={estilos.botaoVoltar}>
              ← Cancelar
            </button>
            <h2 style={{ margin: '8px 0 6px', fontSize: '22px' }}>Registar Novo Membro da Equipa</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px' }}>
              Crie credenciais de acesso técnico com permissões personalizadas.
            </p>

            <form onSubmit={criarUsuario}>
              <label style={estilos.label}>Nome Completo *</label>
              <input
                name="nome"
                placeholder="Ex: Carlos Eduardo Silva"
                style={estilos.input}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={estilos.label}>Utilizador (Login) *</label>
                  <input
                    name="usuario"
                    placeholder="Ex: carlos.mecanico"
                    style={estilos.input}
                    required
                  />
                </div>
                <div>
                  <label style={estilos.label}>Palavra-passe *</label>
                  <input
                    name="senha"
                    type="password"
                    placeholder="••••••••"
                    style={estilos.input}
                    required
                  />
                </div>
              </div>

              <label style={estilos.label}>Perfil de Permissão *</label>
              <select name="perfil" style={estilos.input} defaultValue="mecanico">
                <option value="mecanico">Mecânico / Técnico de Campo</option>
                <option value="admin">Administrador (Controlo Total)</option>
                <option value="operador">Operador de Equipamento</option>
              </select>

              <button
                type="submit"
                style={{ ...estilos.botaoNovoSubmit, marginTop: '20px' }}
                disabled={salvando}
              >
                {salvando ? 'A guardar...' : 'Criar Utilizador'}
              </button>
            </form>
          </div>
        )}

        {/* MODAL: HISTÓRICO TÉCNICO DE PREVENTIVAS */}
        {maquinaHistoricoModal && (
          <div style={estilos.modalOverlay}>
            <div className="modal-card-responsivo" style={{ ...estilos.modalCard, maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                    Histórico de Preventivas: {maquinaHistoricoModal.tag}
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    {maquinaHistoricoModal.marca} • {maquinaHistoricoModal.modelo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMaquinaHistoricoModal(null)}
                  style={estilos.botaoFecharModal}
                >
                  ✕
                </button>
              </div>

              {historicoDaMaquinaModal.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                  <p>Nenhuma revisão preventiva registrada para este equipamento até o momento.</p>
                </div>
              ) : (
                <div className="timeline-container" style={{ marginTop: '16px' }}>
                  {historicoDaMaquinaModal.map((item) => (
                    <div key={item.id} className="timeline-entry">
                      <div className="timeline-dot" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                            Revisão aos {item.horimetro_preventiva} horas
                          </strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Data: {new Date(item.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            gerarPdfPreventiva(
                              {
                                tag: maquinaHistoricoModal.tag,
                                marca: maquinaHistoricoModal.marca,
                                modelo: maquinaHistoricoModal.modelo,
                              },
                              item
                            )
                          }
                          style={estilos.botaoPdfItem}
                        >
                          📄 Gerar PDF
                        </button>
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 6px', lineHeight: 1.4 }}>{item.observacao}</p>
                        <small style={{ color: '#64748b', fontWeight: 600 }}>
                          Responsável Técnico: <strong>{item.mecanico_responsavel || 'Não informado'}</strong>
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: CONFIGURAR PREVENTIVA */}
        {modoPreventiva === 'configurar' && preventivaSelecionada && (
          <div style={estilos.modalOverlay}>
            <div className="modal-card-responsivo" style={estilos.modalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  Configurar Plano: {preventivaSelecionada.tag}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setModoPreventiva(null);
                    setPreventivaSelecionada(null);
                  }}
                  style={estilos.botaoFecharModal}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                Defina o ciclo de manutenção preventiva de acordo com o horímetro.
              </p>

              <form onSubmit={salvarConfiguracaoPreventiva}>
                <label style={estilos.label}>Intervalo entre revisões (em horas) *</label>
                <input
                  name="intervalo"
                  type="number"
                  defaultValue={preventivaSelecionada.intervalo_horas || 250}
                  placeholder="Ex: 250 ou 500"
                  style={estilos.input}
                  required
                />

                <label style={estilos.label}>Horímetro da última preventiva realizada *</label>
                <input
                  name="ultima"
                  type="number"
                  step="0.1"
                  defaultValue={preventivaSelecionada.horimetro_ultima_preventiva || preventivaSelecionada.horimetro_atual || 0}
                  placeholder="Ex: 1200.0"
                  style={estilos.input}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModoPreventiva(null);
                      setPreventivaSelecionada(null);
                    }}
                    style={estilos.botaoAjustarHorimetro}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={estilos.botaoNovoSubmit} disabled={salvando}>
                    {salvando ? 'Guardando...' : 'Gravar Plano'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: REGISTAR REVISÃO PREVENTIVA (CHECKLIST COMPLETO & LITRAGEM) */}
        {modoPreventiva === 'registrar' && preventivaSelecionada && (
          <div style={estilos.modalOverlay}>
            <div className="modal-card-responsivo" style={{ ...estilos.modalCard, maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  Registar Revisão: {preventivaSelecionada.tag}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setModoPreventiva(null);
                    setPreventivaSelecionada(null);
                    resetarCamposRevisao();
                  }}
                  style={estilos.botaoFecharModal}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                Selecione os filtros e insumos trocados durante a intervenção técnica.
              </p>

              <form onSubmit={salvarRegistroPreventiva}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={estilos.label}>Horímetro na revisão *</label>
                    <input
                      name="horimetro"
                      type="number"
                      step="0.1"
                      defaultValue={preventivaSelecionada.horimetro_atual || 0}
                      style={estilos.input}
                      required
                    />
                  </div>

                  <div>
                    <label style={estilos.label}>Mecânico Responsável</label>
                    <input
                      name="mecanicoResponsavel"
                      defaultValue={usuarioLogado?.nome}
                      placeholder="Nome do técnico"
                      style={estilos.input}
                    />
                  </div>
                </div>

                <label style={{ ...estilos.label, marginTop: '8px', marginBottom: '8px' }}>
                  Itens e Filtros Substituídos *
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroCombustivel}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroCombustivel: e.target.checked })}
                    />
                    Filtro de combustível
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroCombustivelSeparador}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroCombustivelSeparador: e.target.checked })}
                    />
                    Filtro combust. separador
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroArInterno}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroArInterno: e.target.checked })}
                    />
                    Filtro de ar interno
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroArExterno}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroArExterno: e.target.checked })}
                    />
                    Filtro de ar externo
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroLubrificante}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroLubrificante: e.target.checked })}
                    />
                    Filtro lubrificante
                  </label>

                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={itensRevisao.filtroHidraulico}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, filtroHidraulico: e.target.checked })}
                    />
                    Filtro hidráulico
                  </label>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <label className="checkbox-item" style={{ background: 'transparent', border: 0, padding: 0 }}>
                    <input
                      type="checkbox"
                      checked={itensRevisao.trocouOleoHidraulico}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, trocouOleoHidraulico: e.target.checked })}
                    />
                    <span>Óleo Hidráulico</span>
                  </label>

                  {itensRevisao.trocouOleoHidraulico && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Quantidade adicionada:</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 20"
                        value={litrosOleoHidraulico}
                        onChange={(e) => setLitrosOleoHidraulico(e.target.value)}
                        style={{ ...estilos.input, width: '120px', padding: '6px 10px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Litros</span>
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <label className="checkbox-item" style={{ background: 'transparent', border: 0, padding: 0 }}>
                    <input
                      type="checkbox"
                      checked={itensRevisao.trocouOleoMotor}
                      onChange={(e) => setItensRevisao({ ...itensRevisao, trocouOleoMotor: e.target.checked })}
                    />
                    <span>Óleo do Motor</span>
                  </label>

                  {itensRevisao.trocouOleoMotor && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Quantidade adicionada:</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 8.5"
                        value={litrosOleoMotor}
                        onChange={(e) => setLitrosOleoMotor(e.target.value)}
                        style={{ ...estilos.input, width: '120px', padding: '6px 10px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Litros</span>
                    </div>
                  )}
                </div>

                <label style={estilos.label}>Observações Adicionais (Opcional)</label>
                <textarea
                  name="observacaoComplementar"
                  placeholder="Ex: Engraxamento de buchas e articulações, reaperto geral efetuado..."
                  style={{ ...estilos.textarea, minHeight: '65px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModoPreventiva(null);
                      setPreventivaSelecionada(null);
                      resetarCamposRevisao();
                    }}
                    style={estilos.botaoAjustarHorimetro}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={estilos.botaoNovoSubmit} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Concluir Revisão'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// COMPONENTE TÁTIL DE ASSINATURA DIGITAL (CANVAS INTERATIVO)
function QuadroAssinaturaDigital(props: { onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [desenhando, setDesenhando] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getCoordenadas(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  }

  function iniciarTraco(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDesenhando(true);
    const { x, y } = getCoordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function moverTraco(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordenadas(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function finalizarTraco() {
    if (!desenhando) return;
    setDesenhando(false);
    const canvas = canvasRef.current;
    if (canvas) {
      props.onChange(canvas.toDataURL('image/png'));
    }
  }

  function limparCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    props.onChange('');
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#f8fafc', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={580}
          height={160}
          onMouseDown={iniciarTraco}
          onMouseMove={moverTraco}
          onMouseUp={finalizarTraco}
          onMouseLeave={finalizarTraco}
          onTouchStart={iniciarTraco}
          onTouchMove={moverTraco}
          onTouchEnd={finalizarTraco}
          style={{ width: '100%', height: '160px', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={limparCanvas}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            color: '#dc2626',
          }}
        >
          Limpar Assinatura
        </button>
      </div>
    </div>
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
      : [{ tela: 'dashboard' as const, label: 'Painel Executivo' }]),
    { tela: 'chamados', label: 'Ordens de Serviço' },
    { tela: 'maquinas', label: 'Frota de Máquinas' },
    { tela: 'preventivas', label: 'Plano Preventivo', admin: true },
    { tela: 'horimetros', label: 'Horímetros', admin: true },
    { tela: 'usuarios', label: 'Equipa & Utilizadores', admin: true },
  ];

  return (
    <>
      <aside
        className={`controlmaq-desktop-sidebar ${menuAberto ? 'controlmaq-sidebar-open' : ''}`}
        style={estilos.sidebar}
      >
        <div style={estilos.sidebarMarca}>
          <div style={estilos.sidebarLogo}>CM</div>
          <div>
            <strong style={estilos.sidebarNome}>ControlMaq</strong>
            <span style={estilos.sidebarEmpresa}>LOKMAX ENGENHARIA</span>
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
          <div style={{ marginBottom: '12px', padding: '0 4px' }}>
            <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block' }}>Utilizador ativo:</small>
            <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{props.usuario?.nome}</strong>
          </div>
          <button onClick={props.onSair} style={estilos.sidebarSair}>
            Terminar Sessão
          </button>
        </div>
      </aside>

      <header className="controlmaq-topbar" style={estilos.topo}>
        <div style={estilos.topoConteudo}>
          <div style={estilos.topbarEsquerda}>
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="controlmaq-topbar-btn-menu"
              style={estilos.botaoMenuMobile}
            >
              ☰
            </button>
            <span style={{ fontWeight: 800, color: '#f59e0b', letterSpacing: '0.5px' }}>LOKMAX</span>
          </div>
          <div style={estilos.topbarDireita}>
            <StatusConexao />
          </div>
        </div>
      </header>
    </>
  );
}

const estilos: Record<string, CSSProperties> = {
  pagina: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a' },
  paginaLogin: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#090d16',
    padding: '20px',
  },
  cardLogin: {
    background: '#ffffff',
    padding: '36px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  },
  cabecalhoLoginMarca: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  empresaLogin: { margin: 0, fontWeight: 900, color: '#f59e0b', fontSize: '12px', letterSpacing: '1px' },
  tituloLogin: { margin: 0, fontSize: '28px', color: '#0f172a', fontWeight: 900 },
  subtituloLogin: { margin: '8px 0 24px', color: '#64748b', fontSize: '14px', lineHeight: 1.4 },
  labelLogin: { display: 'block', margin: '14px 0 6px', fontWeight: 700, fontSize: '13px', color: '#334155' },
  inputLogin: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    marginBottom: '8px',
  },
  botaoLogin: {
    width: '100%',
    padding: '14px',
    background: '#f59e0b',
    color: '#000',
    border: 0,
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: '15px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  direitosAutoraisLogin: { marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' },
  topo: {
    position: 'fixed',
    top: 0,
    left: '260px',
    right: 0,
    height: '64px',
    background: '#0f172a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 40,
    borderBottom: '1px solid #1e293b',
  },
  topoConteudo: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  topbarEsquerda: { display: 'flex', alignItems: 'center', gap: '12px' },
  topbarDireita: { display: 'flex', alignItems: 'center', gap: '16px' },
  botaoMenuMobile: {
    display: 'none',
    background: 'transparent',
    border: 0,
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
  },
  conteudo: {
    marginLeft: '260px',
    padding: '88px 28px 40px',
    maxWidth: '1300px',
  },
  cabecalhoPagina: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' },
  preTitulo: { color: '#64748b', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tituloSecao: { margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' },
  botaoNovo: {
    background: '#f59e0b',
    color: '#000',
    border: 0,
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
  },
  botaoExportarCsv: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    padding: '10px 14px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
  },
  filtros: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  botaoFiltro: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
  },
  inputBusca: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    background: '#ffffff',
  },
  listaMaquinas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  cardMaquinaNovo: {
    padding: '20px',
  },
  caixaHorimetro: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  botaoAjustarHorimetro: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  botaoHistorico: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    padding: '8px 10px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  botaoPdfItem: {
    background: '#0f172a',
    border: 0,
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '11px',
    cursor: 'pointer',
  },
  botaoCardPrincipal: {
    width: '100%',
    padding: '8px 12px',
    background: '#0f172a',
    color: '#ffffff',
    border: 0,
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
  },
  botaoExcluirOS: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
  },
  cardKanbanItem: {
    padding: '14px',
    background: '#ffffff',
  },
  badgeContador: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 800,
    color: '#0f172a',
  },
  textoVazioKanban: {
    color: '#94a3b8',
    fontSize: '12px',
    textAlign: 'center',
    margin: '30px 0',
  },
  cardFormulario: {
    background: '#fff',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
  },
  botaoVoltar: {
    background: 'none',
    border: 0,
    color: '#64748b',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    fontSize: '13px',
    marginBottom: '8px',
  },
  label: { display: 'block', margin: '14px 0 6px', fontWeight: 700, fontSize: '13px', color: '#334155' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' },
  textarea: { width: '100%', minHeight: '90px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' },
  botaoNovoSubmit: {
    width: '100%',
    padding: '10px 16px',
    background: '#f59e0b',
    color: '#000',
    border: 0,
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
  },
  botaoFecharModal: {
    background: '#f1f5f9',
    border: 0,
    color: '#475569',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  sidebar: {
    position: 'fixed',
    inset: '0 auto 0 0',
    width: '260px',
    zIndex: 50,
    background: '#0a0e17',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarMarca: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: '1px solid #1e293b',
  },
  sidebarLogo: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: '#f59e0b',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '14px',
  },
  sidebarNome: { display: 'block', fontSize: '16px', color: '#f8fafc' },
  sidebarEmpresa: { display: 'block', fontSize: '10px', color: '#94a3b8', letterSpacing: '0.5px' },
  sidebarNav: { display: 'grid', gap: '4px', padding: '16px 12px' },
  sidebarItem: {
    width: '100%',
    padding: '10px 14px',
    border: 0,
    background: 'transparent',
    color: '#94a3b8',
    textAlign: 'left',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  },
  sidebarItemAtivo: { background: '#1e293b', color: '#ffffff', fontWeight: 700 },
  sidebarRodape: { marginTop: 'auto', padding: '16px', borderTop: '1px solid #1e293b' },
  sidebarSair: {
    width: '100%',
    padding: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: 0,
    color: '#ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
  },
};