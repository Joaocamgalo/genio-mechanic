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
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 900;
    }
    return false;
  });

  useEffect(() => {
    function tratarRedimensionamento() {
      setIsMobile(window.innerWidth <= 900);
    }
    window.addEventListener('resize', tratarRedimensionamento);
    return () => window.removeEventListener('resize', tratarRedimensionamento);
  }, []);

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
          if (u.tipo === 'operador') return 'operacaoDiaria';
          if (u.tipo === 'mecanico') return 'chamados';
          return 'dashboard';
        }
      }
    } catch {
      // Ignora erro
    }
    return 'login';
  });

  // Filtros e Visualização de Chamados
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'kanban'>('lista');
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
  const isMecanico = usuarioLogado?.tipo === 'mecanico';

  // REGRA DE OURO: Mecânico só vê rigorosamente o que foi designado para ele!
  const chamadosVisiveis = isAdmin
    ? chamados
    : chamados.filter((chamado) => {
        if (!usuarioLogado) return false;
        return (
          normalizarTexto(chamado.mecanico || '') ===
          normalizarTexto(usuarioLogado.nome)
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
    const id = 'controlmaq-css-pro';
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow-x: hidden;
      }
      
      .cm-card {
        background: #ffffff;
        border: 1px solid var(--cm-border);
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        word-break: break-word;
      }

      .cm-badge {
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
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
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        user-select: none;
      }

      .timeline-container {
        border-left: 2px solid #e2e8f0;
        padding-left: 14px;
        margin-left: 6px;
        display: grid;
        gap: 14px;
      }
      .timeline-entry {
        position: relative;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
      }
      .timeline-dot {
        position: absolute;
        left: -21px;
        top: 14px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #f59e0b;
        border: 2px solid #ffffff;
      }

      .kanban-grid {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        padding-bottom: 16px;
        -webkit-overflow-scrolling: touch;
      }
      .kanban-coluna {
        flex: 0 0 310px;
        background: #f1f5f9;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 400px;
      }

      @media (max-width: 900px) {
        .controlmaq-desktop-sidebar {
          transform: translateX(-100%) !important;
          transition: transform 0.25s ease-in-out !important;
          width: 270px !important;
        }
        .controlmaq-sidebar-open {
          transform: translateX(0) !important;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.7) !important;
        }
        .kanban-coluna {
          flex: 0 0 85vw !important;
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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; background: #fff; padding: 15mm; }
            .cabecalho { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .bloco-dados { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .dado-item small { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .dado-item strong { font-size: 13px; color: #0f172a; }
            .secao-titulo { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px; margin: 14px 0 6px; }
            .conteudo-caixa { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.5; background: #ffffff; }
            .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
            .linha-assinatura { border-top: 1px solid #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; }
            .box-assinatura-digital { height: 60px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px; }
            .img-assinatura { max-height: 55px; max-width: 180px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <div>
              <div style="font-size: 20px; font-weight: 900;">LOKMAX</div>
              <div style="font-size: 10px; color: #f59e0b; font-weight: 800;">GESTÃO TÉCNICA DE FROTAS</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px;">OS #${chamado.id}</h2>
              <span style="font-size: 11px;">Status: <strong>${chamado.status}</strong></span>
            </div>
          </div>

          <div class="bloco-dados">
            <div class="dado-item"><small>Equipamento (TAG)</small><strong>${chamado.maquina}</strong></div>
            <div class="dado-item"><small>Cliente</small><strong>${chamado.cliente || 'Não informado'}</strong></div>
            <div class="dado-item"><small>Solicitante</small><strong>${chamado.solicitante}</strong></div>
            <div class="dado-item"><small>Local</small><strong>${chamado.local}</strong></div>
            <div class="dado-item"><small>Abertura</small><strong>${dataAbertura}</strong></div>
            <div class="dado-item"><small>Conclusão</small><strong>${dataConclusao}</strong></div>
            <div class="dado-item"><small>Tempo Parado</small><strong>${downtimeTexto}</strong></div>
            <div class="dado-item"><small>Mecânico</small><strong>${chamado.mecanico || 'Não informado'}</strong></div>
          </div>

          <div class="secao-titulo">Anomalia / Problema</div>
          <div class="conteudo-caixa">${chamado.problema}</div>

          <div class="secao-titulo">Diagnóstico Técnico</div>
          <div class="conteudo-caixa">${chamado.diagnostico_tecnico || 'Diagnóstico em elaboração.'}</div>

          <div class="secao-titulo">Serviço & Insumos Utilizados</div>
          <div class="conteudo-caixa">${chamado.solucao || 'Serviço em execução.'}</div>

          <div class="assinaturas">
            <div>
              <div class="box-assinatura-digital">
                ${assinaturaSalva ? `<img src="${assinaturaSalva}" class="img-assinatura" alt="Assinatura" />` : ''}
              </div>
              <div class="linha-assinatura"><strong>${chamado.mecanico || 'Técnico'}</strong>Técnico Executor</div>
            </div>
            <div>
              <div class="box-assinatura-digital"></div>
              <div class="linha-assinatura"><strong>${chamado.solicitante}</strong>Aprovação / Cliente</div>
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
      alert('Permita janelas pop-up no navegador.');
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
          <title>Dossiê - ${m.tag}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; padding: 15mm; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
            th { background: #0f172a; color: #fff; text-align: left; padding: 6px 8px; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px;">
            <h2 style="margin: 0; font-size: 18px;">LOKMAX — Dossiê do Ativo</h2>
            <div style="font-size: 12px; color: #64748b;">TAG: <strong>${m.tag}</strong> (${m.marca} ${m.modelo}) | Horímetro: <strong>${m.horimetro ?? 0} h</strong></div>
          </div>

          <h3 style="font-size: 13px; text-transform: uppercase;">Preventivas (${revisoesDaMaquina.length})</h3>
          ${revisoesDaMaquina.length === 0 ? '<p style="font-size: 11px; color: #64748b;">Nenhuma preventiva registada.</p>' : `
            <table>
              <thead><tr><th>Data</th><th>Horímetro</th><th>Responsável</th><th>Descrição</th></tr></thead>
              <tbody>
                ${revisoesDaMaquina.map((r) => `
                  <tr>
                    <td>${new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>${r.horimetro_preventiva} h</td>
                    <td>${r.mecanico_responsavel || '-'}</td>
                    <td>${r.observacao}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3 style="font-size: 13px; text-transform: uppercase; margin-top: 20px;">Ordens de Serviço (${chamadosDaMaquina.length})</h3>
          ${chamadosDaMaquina.length === 0 ? '<p style="font-size: 11px; color: #64748b;">Nenhum chamado registado.</p>' : `
            <table>
              <thead><tr><th>OS #</th><th>Status</th><th>Data</th><th>Problema</th><th>Solução</th></tr></thead>
              <tbody>
                ${chamadosDaMaquina.map((c) => `
                  <tr>
                    <td>#${c.id}</td>
                    <td>${c.status}</td>
                    <td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>${c.problema}</td>
                    <td>${c.solucao || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
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
      alert('Permita janelas pop-up no navegador.');
      return;
    }

    janela.document.open();
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha Preventiva - ${maquina.tag}</title>
          <meta charset="UTF-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 15mm; }
            .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>LOKMAX — Relatório de Revisão Preventiva</h2>
          <div class="box">
            <div>Equipamento: <strong>${maquina.tag}</strong> (${maquina.marca} ${maquina.modelo})</div>
            <div>Horímetro da Revisão: <strong>${revisao.horimetro_preventiva} h</strong></div>
            <div>Data: <strong>${new Date(revisao.created_at).toLocaleString('pt-BR')}</strong></div>
            <div>Mecânico: <strong>${revisao.mecanico_responsavel}</strong></div>
          </div>
          <h4>Itens Executados e Insumos</h4>
          <div class="box">${revisao.observacao.replace(/\n/g, '<br/>')}</div>
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
      
      if (usuarioEncontrado.tipo === 'operador') {
        setTela('operacaoDiaria');
      } else if (usuarioEncontrado.tipo === 'mecanico') {
        setTela('chamados');
      } else {
        setTela('dashboard');
      }

      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

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
      alert('Preencha a TAG, Marca e Modelo.');
      return;
    }

    try {
      setSalvando(true);
      if (maquinaEmEdicao) {
        await supabase
          .from('maquinas')
          .update({ tag, marca, modelo, horimetro, status_maquina })
          .eq('id', maquinaEmEdicao.id);
      } else {
        await supabase
          .from('maquinas')
          .insert({ tag, marca, modelo, horimetro, status_maquina });
      }

      setModalNovaMaquina(false);
      setMaquinaEmEdicao(null);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMaquina(m: Maquina) {
    if (!isAdmin) return;
    const confirmar = confirm(`Eliminar a máquina ${m.tag} da frota?`);
    if (!confirmar) return;

    try {
      setSalvando(true);
      await supabase.from('leituras_horimetro').delete().eq('maquina_id', m.id);
      await supabase.from('historico_preventivas').delete().eq('maquina_id', m.id);
      await supabase.from('preventivas_maquinas').delete().eq('maquina_id', m.id);
      await supabase.from('maquinas').delete().eq('id', m.id);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarHorimetrosEmLote() {
    const alteracoes = Object.entries(leiturasLote).filter(([_, valor]) => valor && valor.trim() !== '');
    if (alteracoes.length === 0) {
      alert('Preencha pelo menos um horímetro.');
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
          });
        }
      }
      setLeiturasLote({});
      await carregarDados(false);
      alert('Horímetros gravados com sucesso!');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirChamado(chamadoAlvo: Chamado) {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir Ordens de Serviço.');
      return;
    }
    const confirmar = confirm(`Eliminar a Ordem de Serviço #${chamadoAlvo.id}?`);
    if (!confirmar) return;

    try {
      setSalvando(true);
      await supabase.from('historico_chamados').delete().eq('chamado_id', chamadoAlvo.id);
      await supabase.from('chamados').delete().eq('id', chamadoAlvo.id);
      localStorage.removeItem(`controlmaq_assinatura_${chamadoAlvo.id}`);
      setChamados((prev) => prev.filter((c) => c.id !== chamadoAlvo.id));
    } finally {
      setSalvando(false);
    }
  }

  async function criarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const form = new FormData(event.currentTarget);
    const nome = String(form.get('nome') || '').trim();
    const login = String(form.get('usuario') || '').trim().toLowerCase();
    const senha = String(form.get('senha') || '').trim();
    const tipo = String(form.get('perfil') || 'mecanico') as PerfilUsuario;

    if (!nome || !login || !senha) return;

    try {
      setSalvando(true);
      await supabase.from('usuarios').insert({ nome, login, senha, tipo, ativo: true });
      await carregarDados(false);
      setTela('usuarios');
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenhaUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin) return;
    const novaSenha = prompt(`Nova palavra-passe para ${usuarioAlvo.nome}:`);
    if (!novaSenha) return;

    try {
      setSalvando(true);
      await supabase.from('usuarios').update({ senha: novaSenha.trim() }).eq('id', usuarioAlvo.id);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin || usuarioLogado?.id === usuarioAlvo.id) return;
    try {
      setSalvando(true);
      await supabase.from('usuarios').update({ ativo: !usuarioAlvo.ativo }).eq('id', usuarioAlvo.id);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPerfilUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin || usuarioLogado?.id === usuarioAlvo.id) return;
    const novoPerfil: PerfilUsuario =
      usuarioAlvo.tipo === 'admin'
        ? 'mecanico'
        : usuarioAlvo.tipo === 'mecanico'
        ? 'operador'
        : 'admin';
    try {
      setSalvando(true);
      await supabase.from('usuarios').update({ tipo: novoPerfil }).eq('id', usuarioAlvo.id);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(usuarioAlvo: Usuario) {
    if (!isAdmin || usuarioLogado?.id === usuarioAlvo.id) return;
    const confirmar = confirm(`Eliminar o utilizador ${usuarioAlvo.nome}?`);
    if (!confirmar) return;

    try {
      setSalvando(true);
      await supabase.from('usuarios').delete().eq('id', usuarioAlvo.id);
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

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
    const mecanicoDesignado = String(form.get('mecanicoDesignado') || '').trim();

    if (!maquina || !solicitante || !local || !problema) {
      alert('Preencha os campos obrigatórios.');
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
          status: mecanicoDesignado ? 'Assumido' : 'Aberto',
          mecanico: mecanicoDesignado || null,
          iniciado_at: mecanicoDesignado ? new Date().toISOString() : null,
          criado_por: usuarioLogado.nome,
        })
        .select()
        .single();

      if (!error && data) {
        setChamados((prev) => [data as Chamado, ...prev]);
        setMaquinaNovoChamado('');
        setFiltroChamados('Todos');
        setTela('chamados');
      }
    } finally {
      setSalvando(false);
    }
  }

  // Apenas o Administrador designa o mecânico
  async function designarMecanicoAdmin(id: number) {
    if (!isAdmin) return;
    const mecanicos = usuarios.filter((u) => u.tipo === 'mecanico');
    const nomes = mecanicos.map((m) => m.nome).join(', ');
    const nomeInformado = prompt(`Selecione o mecânico responsável:\n\nOpções: ${nomes}`);
    if (!nomeInformado) return;

    try {
      setSalvando(true);
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Assumido',
          mecanico: nomeInformado.trim(),
          iniciado_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        setChamados((prev) => prev.map((c) => (c.id === id ? (data as Chamado) : c)));
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
    const maquinaLiberada = form.get('maquinaLiberada') === 'sim';
    const necessitaRetorno = form.get('necessitaRetorno') === 'sim';

    if (!diagnostico || !solucao) return;

    let textoSolucaoCompleta = solucao;
    if (pecasUtilizadas) textoSolucaoCompleta += ` | Peças: ${pecasUtilizadas}`;

    try {
      setSalvando(true);
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status: 'Finalizado',
          diagnostico_tecnico: diagnostico,
          solucao: textoSolucaoCompleta,
          maquina_liberada: maquinaLiberada,
          necessita_retorno: necessitaRetorno,
          finalizado_por: usuarioLogado.nome,
          finalizado_at: new Date().toISOString(),
        })
        .eq('id', chamadoParaFinalizar.id)
        .select()
        .single();

      if (!error && data) {
        const chamadoSalvo = data as Chamado;
        if (assinaturaDataUrl) {
          localStorage.setItem(`controlmaq_assinatura_${chamadoSalvo.id}`, assinaturaDataUrl);
        }
        setChamados((prev) => prev.map((c) => (c.id === chamadoParaFinalizar.id ? chamadoSalvo : c)));
        setChamadoParaFinalizar(null);
        setTela('chamados');
        if (confirm('Deseja gerar o comprovativo em PDF com a assinatura?')) {
          gerarPdfChamado(chamadoSalvo);
        }
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alterarHorimetroManual(maquinaAlvo: Maquina) {
    const novo = prompt(`Horímetro da máquina ${maquinaAlvo.tag}:`, String(maquinaAlvo.horimetro ?? 0));
    if (!novo) return;
    const valor = Number(novo.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) return;

    try {
      setSalvando(true);
      await supabase.from('maquinas').update({ horimetro: valor }).eq('id', maquinaAlvo.id);
      await supabase.from('leituras_horimetro').insert({
        maquina_id: maquinaAlvo.id,
        maquina_tag: maquinaAlvo.tag,
        operador_id: String(usuarioLogado?.id),
        operador_nome: usuarioLogado?.nome,
        horimetro: valor,
        origem: 'ajuste_manual',
      });
      await carregarDados(false);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfiguracaoPreventiva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preventivaSelecionada || !isAdmin) return;

    const form = new FormData(event.currentTarget);
    const intervaloHoras = Number(String(form.get('intervalo') || '').replace(',', '.'));
    const horimetroUltima = Number(String(form.get('ultima') || '').replace(',', '.'));

    try {
      setSalvando(true);
      await configurarPreventiva({
        maquinaId: preventivaSelecionada.maquina_id,
        intervaloHoras,
        horimetroUltimaPreventiva: horimetroUltima,
      });
      await carregarDados(false);
      setModoPreventiva(null);
      setPreventivaSelecionada(null);
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

    let textoFinal = itensExecutados.join(', ');
    if (observacaoComplementar) textoFinal += ` | Obs: ${observacaoComplementar}`;

    try {
      setSalvando(true);
      await registrarPreventiva({
        maquinaId: preventivaSelecionada.maquina_id,
        horimetroPreventiva,
        mecanicoResponsavel: mecanicoResponsavel || usuarioLogado.nome,
        observacao: textoFinal || 'Revisão periódica.',
        registradoPor: usuarioLogado.nome,
      });
      await carregarDados(false);
      resetarCamposRevisao();
      setModoPreventiva(null);
      setPreventivaSelecionada(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '30px' }}>🚜</span>
            <div>
              <p style={{ margin: 0, fontWeight: 900, color: '#f59e0b', fontSize: '11px' }}>LOKMAX MÁQUINAS</p>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>ControlMaq</h1>
            </div>
          </div>
          <form onSubmit={entrarNoApp}>
            <label style={estilos.label}>Utilizador</label>
            <input name="usuario" type="text" placeholder="Seu login" style={estilos.input} required />

            <label style={estilos.label}>Palavra-passe</label>
            <input name="senha" type="password" placeholder="••••••••" style={estilos.input} required />

            <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '16px', padding: '12px' }} disabled={salvando}>
              {salvando ? 'A entrar...' : 'Entrar no Sistema'}
            </button>
          </form>
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
        isMobile={isMobile}
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

      <main
        style={{
          ...estilos.conteudo,
          marginLeft: isMobile ? 0 : '260px',
          padding: isMobile ? '76px 12px 30px' : '88px 28px 40px',
          width: isMobile ? '100%' : 'calc(100% - 260px)',
          maxWidth: '100vw',
        }}
      >
        {/* TELA 1: DASHBOARD EXECUTIVO (APENAS ADMINISTRADOR) */}
        {tela === 'dashboard' && isAdmin && (
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
                setFiltroPrioridadeChamados,
                setFiltroMaquinaChamados,
                setFiltroMecanicoChamados,
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

        {/* TELA 2: FROTA DE MÁQUINAS */}
        {tela === 'maquinas' && (
          <div>
            <div style={{ ...estilos.cabecalhoPagina, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '10px' : '0' }}>
              <div>
                <span style={estilos.preTitulo}>Inventário</span>
                <h2 style={estilos.tituloSecao}>Frota de Máquinas</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() =>
                        exportarParaCsv(
                          'Frota_Lokmax',
                          ['TAG', 'Marca', 'Modelo', 'Horímetro', 'Status'],
                          maquinas.map((m) => [m.tag, m.marca, m.modelo, m.horimetro ?? 0, m.status_maquina])
                        )
                      }
                      style={estilos.botaoExportarCsv}
                    >
                      📥 CSV
                    </button>
                    <button onClick={() => { setMaquinaEmEdicao(null); setModalNovaMaquina(true); }} style={estilos.botaoNovo}>
                      + Nova Máquina
                    </button>
                  </>
                )}
              </div>
            </div>

            <input
              value={buscaMaquinas}
              onChange={(e) => setBuscaMaquinas(e.target.value)}
              placeholder="Buscar TAG, modelo ou fabricante..."
              style={{ ...estilos.inputBusca, marginBottom: '14px' }}
            />

            <div style={estilos.filtros}>
              {(['Todos', 'Operacional', 'Parada', 'Em manutenção'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroStatusMaquina(st)}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === st ? '#0f172a' : '#fff',
                    color: filtroStatusMaquina === st ? '#fff' : '#475569',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ ...estilos.listaMaquinas, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {maquinasFiltradas.map((maquina) => {
                const situacao = calcularSituacaoMaquina(maquina.tag, chamados);
                return (
                  <div key={maquina.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong>{maquina.tag}</strong>
                      <span className={`cm-badge badge-op-${situacao.toLowerCase().replace(' ', '-')}`}>{situacao}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                      {maquina.marca} • {maquina.modelo}
                    </div>

                    <div style={estilos.caixaHorimetro}>
                      <div>
                        <small style={{ color: '#64748b', fontSize: '10px' }}>Horímetro</small>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{maquina.horimetro ?? 0} h</div>
                      </div>
                      <button onClick={() => alterarHorimetroManual(maquina)} style={estilos.botaoAjustarHorimetro}>
                        Ajustar
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1.2fr 1fr' : '1fr', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setMaquinaNovoChamado(maquina.tag);
                            setTela('novoChamado');
                          }}
                          style={estilos.botaoCardPrincipal}
                        >
                          + Abrir OS
                        </button>
                      )}
                      <button onClick={() => setMaquinaDossie(maquina)} style={estilos.botaoHistorico}>
                        📋 Dossiê
                      </button>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                        <button onClick={() => { setMaquinaEmEdicao(maquina); setModalNovaMaquina(true); }} style={estilos.botaoAjustarHorimetro}>
                          Editar
                        </button>
                        <button onClick={() => excluirMaquina(maquina)} style={estilos.botaoExcluirOS}>
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL MÁQUINA */}
        {modalNovaMaquina && isAdmin && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? '95vw' : '100%', maxWidth: '500px', padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>{maquinaEmEdicao ? `Editar ${maquinaEmEdicao.tag}` : 'Novo Equipamento'}</h3>
                <button onClick={() => { setModalNovaMaquina(false); setMaquinaEmEdicao(null); }} style={estilos.botaoFecharModal}>✕</button>
              </div>
              <form onSubmit={salvarMaquina}>
                <label style={estilos.label}>TAG *</label>
                <input name="tag" defaultValue={maquinaEmEdicao?.tag} style={estilos.input} required />
                <label style={estilos.label}>Marca *</label>
                <input name="marca" defaultValue={maquinaEmEdicao?.marca} style={estilos.input} required />
                <label style={estilos.label}>Modelo *</label>
                <input name="modelo" defaultValue={maquinaEmEdicao?.modelo} style={estilos.input} required />
                <label style={estilos.label}>Horímetro Inicial</label>
                <input name="horimetro" type="number" step="0.1" defaultValue={maquinaEmEdicao?.horimetro ?? 0} style={estilos.input} />
                <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '16px' }} disabled={salvando}>Gravar</button>
              </form>
            </div>
          </div>
        )}

        {/* DOSSIÊ MODAL */}
        {maquinaDossie && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? '95vw' : '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Dossiê: {maquinaDossie.tag}</h3>
                <button onClick={() => setMaquinaDossie(null)} style={estilos.botaoFecharModal}>✕</button>
              </div>
              <button onClick={() => gerarPdfDossie(maquinaDossie)} style={{ ...estilos.botaoNovoSubmit, marginBottom: '12px' }}>
                📄 Emitir Prontuário em PDF
              </button>
              <div style={{ fontSize: '13px' }}>
                <strong>Total de Chamados:</strong> {chamados.filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag)).length}
              </div>
            </div>
          </div>
        )}

        {/* TELA 3: ORDENS DE SERVIÇO */}
        {tela === 'chamados' && (
          <div>
            <div style={{ ...estilos.cabecalhoPagina, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '10px' : '0' }}>
              <div>
                <span style={estilos.preTitulo}>{isMecanico ? 'Atendimento Técnico' : 'Operação'}</span>
                <h2 style={estilos.tituloSecao}>{isMecanico ? 'Minhas Ordens de Serviço' : 'Ordens de Serviço'}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() =>
                        exportarParaCsv(
                          'Ordens_de_Servico_Lokmax',
                          ['OS #', 'Máquina', 'Status', 'Cliente', 'Solicitante', 'Local', 'Mecânico', 'Problema', 'Solução'],
                          chamados.map((c) => [c.id, c.maquina, c.status, c.cliente || '', c.solicitante, c.local, c.mecanico || '', c.problema, c.solucao || ''])
                        )
                      }
                      style={estilos.botaoExportarCsv}
                    >
                      📥 CSV
                    </button>
                    <button onClick={() => { setMaquinaNovoChamado(''); setTela('novoChamado'); }} style={estilos.botaoNovo}>
                      + Abrir OS
                    </button>
                  </>
                )}
                {isAdmin && (
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setModoVisualizacao('lista')}
                      style={{ border: 0, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', background: modoVisualizacao === 'lista' ? '#fff' : 'transparent' }}
                    >
                      Lista
                    </button>
                    <button
                      onClick={() => setModoVisualizacao('kanban')}
                      style={{ border: 0, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', background: modoVisualizacao === 'kanban' ? '#fff' : 'transparent' }}
                    >
                      Kanban
                    </button>
                  </div>
                )}
              </div>
            </div>

            <input
              value={buscaChamados}
              onChange={(e) => setBuscaChamados(e.target.value)}
              placeholder="Buscar por TAG, cliente, falha..."
              style={{ ...estilos.inputBusca, marginBottom: '14px' }}
            />

            {/* Filtros de Status (No mecânico, focado no que é dele) */}
            <div style={estilos.filtros}>
              <button
                onClick={() => setFiltroChamados('Todos')}
                style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Todos' ? '#0f172a' : '#fff', color: filtroChamados === 'Todos' ? '#fff' : '#475569' }}
              >
                Todas ({chamadosVisiveis.length})
              </button>
              <button
                onClick={() => setFiltroChamados('Assumido')}
                style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Assumido' ? '#f59e0b' : '#fff', color: filtroChamados === 'Assumido' ? '#fff' : '#475569' }}
              >
                Em Andamento ({chamadosAssumidos.length})
              </button>
              <button
                onClick={() => setFiltroChamados('Finalizado')}
                style={{ ...estilos.botaoFiltro, background: filtroChamados === 'Finalizado' ? '#16a34a' : '#fff', color: filtroChamados === 'Finalizado' ? '#fff' : '#475569' }}
              >
                Concluídas ({chamadosFinalizados.length})
              </button>
            </div>

            {modoVisualizacao === 'lista' && (
              <div style={{ ...estilos.listaMaquinas, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {chamadosFiltrados.length === 0 ? (
                  <div style={{ ...estilos.cardFormulario, textAlign: 'center', gridColumn: '1 / -1', padding: '30px' }}>
                    <p style={{ color: '#64748b', margin: 0 }}>
                      {isMecanico ? 'Você não possui Ordens de Serviço designadas no momento.' : 'Nenhuma OS encontrada.'}
                    </p>
                  </div>
                ) : (
                  chamadosFiltrados.map((c) => (
                    <div key={c.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <strong>{c.maquina}</strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>#{c.id}</span>
                        </div>
                        <span className={`cm-badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '13px' }}>{c.problema}</p>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', display: 'grid', gap: '3px' }}>
                        <div>📍 {c.local}</div>
                        <div>👤 Solicitante: {c.solicitante}</div>
                        {isAdmin && <div>🔧 Mecânico: <strong>{c.mecanico || 'Não designado'}</strong></div>}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px' }}>
                        <button onClick={() => { setChamadoDetalhes(c); setTela('detalhesChamado'); }} style={estilos.botaoAjustarHorimetro}>
                          Ver
                        </button>
                        
                        {/* Apenas o admin designa */}
                        {isAdmin && c.status === 'Aberto' && (
                          <button onClick={() => designarMecanicoAdmin(c.id)} style={estilos.botaoCardPrincipal}>
                            Designar
                          </button>
                        )}

                        {/* O mecânico só vê o botão de concluir quando a OS está com ele */}
                        {c.status === 'Assumido' && (
                          <button onClick={() => abrirTelaFinalizar(c.id)} style={{ ...estilos.botaoCardPrincipal, background: '#16a34a' }}>
                            Concluir OS
                          </button>
                        )}

                        {c.status === 'Finalizado' && (
                          <button onClick={() => gerarPdfChamado(c)} style={estilos.botaoCardPrincipal}>
                            PDF
                          </button>
                        )}

                        {isAdmin && (
                          <button onClick={() => excluirChamado(c)} style={estilos.botaoExcluirOS}>🗑</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {modoVisualizacao === 'kanban' && isAdmin && (
              <div className="kanban-grid">
                <div className="kanban-coluna">
                  <strong>🔴 Abertos ({chamadosAbertos.length})</strong>
                  {chamadosAbertos.map((c) => (
                    <div key={c.id} className="cm-card" style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700 }}>{c.maquina}</div>
                      <p style={{ fontSize: '12px', margin: '4px 0 8px' }}>{c.problema}</p>
                      <button onClick={() => designarMecanicoAdmin(c.id)} style={estilos.botaoCardPrincipal}>Designar Mecânico</button>
                    </div>
                  ))}
                </div>

                <div className="kanban-coluna">
                  <strong>🟡 Em Atendimento ({chamadosAssumidos.length})</strong>
                  {chamadosAssumidos.map((c) => (
                    <div key={c.id} className="cm-card" style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700 }}>{c.maquina}</div>
                      <p style={{ fontSize: '12px', margin: '4px 0 8px' }}>{c.problema}</p>
                      <small style={{ color: '#0f172a', fontWeight: 600, display: 'block', marginBottom: '6px' }}>🔧 {c.mecanico}</small>
                      <button onClick={() => abrirTelaFinalizar(c.id)} style={{ ...estilos.botaoCardPrincipal, background: '#16a34a' }}>Concluir</button>
                    </div>
                  ))}
                </div>

                <div className="kanban-coluna">
                  <strong>🟢 Concluídos ({chamadosFinalizados.length})</strong>
                  {chamadosFinalizados.map((c) => (
                    <div key={c.id} className="cm-card" style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700 }}>{c.maquina}</div>
                      <p style={{ fontSize: '12px', margin: '4px 0 8px' }}>{c.problema}</p>
                      <button onClick={() => gerarPdfChamado(c)} style={estilos.botaoCardPrincipal}>PDF</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TELA 4: NOVO CHAMADO (ADMIN DESIGNANDO DIRETO) */}
        {tela === 'novoChamado' && (
          <div style={{ ...estilos.cardFormulario, width: isMobile ? '95vw' : '100%', padding: isMobile ? '16px' : '28px' }}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>← Cancelar</button>
            <h3>Nova Ordem de Serviço</h3>
            <form onSubmit={criarChamado}>
              <label style={estilos.label}>Máquina *</label>
              <select name="maquina" defaultValue={maquinaNovoChamado} style={estilos.input} required>
                <option value="">Selecione</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.tag}>{m.tag} - {m.marca} {m.modelo}</option>
                ))}
              </select>
              
              {isAdmin && (
                <>
                  <label style={estilos.label}>Designar para Mecânico</label>
                  <select name="mecanicoDesignado" style={estilos.input}>
                    <option value="">Deixar em Aberto (Designar Depois)</option>
                    {usuarios.filter((u) => u.tipo === 'mecanico').map((m) => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </>
              )}

              <label style={estilos.label}>Solicitante *</label>
              <input name="solicitante" style={estilos.input} required />
              <label style={estilos.label}>Local *</label>
              <input name="local" style={estilos.input} required />
              <label style={estilos.label}>Problema *</label>
              <textarea name="problema" style={estilos.textarea} required />
              <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '14px' }} disabled={salvando}>Confirmar</button>
            </form>
          </div>
        )}

        {/* TELA 5: FINALIZAR CHAMADO */}
        {tela === 'finalizarChamado' && chamadoParaFinalizar && (
          <div style={{ ...estilos.cardFormulario, width: isMobile ? '95vw' : '100%', maxWidth: '650px', padding: isMobile ? '16px' : '28px' }}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>← Cancelar</button>
            <h3>Concluir OS #{chamadoParaFinalizar.id} — {chamadoParaFinalizar.maquina}</h3>
            <form onSubmit={concluirFinalizacao}>
              <label style={estilos.label}>Diagnóstico Técnico *</label>
              <textarea name="diagnosticoTecnico" style={estilos.textarea} required />
              <label style={estilos.label}>Serviço Executado *</label>
              <textarea name="solucao" style={estilos.textarea} required />
              <label style={estilos.label}>Peças / Insumos Utilizados</label>
              <input name="pecasUtilizadas" placeholder="Ex: Mangueira, Graxa..." style={estilos.input} />

              <label style={{ ...estilos.label, marginTop: '12px' }}>Assinatura do Responsável na Obra / Técnico</label>
              <QuadroAssinaturaDigital onChange={setAssinaturaDataUrl} />

              <button type="submit" style={{ ...estilos.botaoNovoSubmit, background: '#16a34a', marginTop: '16px' }} disabled={salvando}>
                Concluir OS
              </button>
            </form>
          </div>
        )}

        {/* TELA 6: DETALHES DE CHAMADO */}
        {tela === 'detalhesChamado' && chamadoDetalhes && (
          <div style={{ ...estilos.cardFormulario, width: isMobile ? '95vw' : '100%', padding: isMobile ? '16px' : '28px' }}>
            <button onClick={() => setTela('chamados')} style={estilos.botaoVoltar}>← Voltar</button>
            <h3>OS #{chamadoDetalhes.id} - {chamadoDetalhes.maquina}</h3>
            <p><strong>Problema:</strong> {chamadoDetalhes.problema}</p>
            {chamadoDetalhes.diagnostico_tecnico && <p><strong>Diagnóstico:</strong> {chamadoDetalhes.diagnostico_tecnico}</p>}
            {chamadoDetalhes.solucao && <p><strong>Solução:</strong> {chamadoDetalhes.solucao}</p>}
            <button onClick={() => gerarPdfChamado(chamadoDetalhes)} style={estilos.botaoNovoSubmit}>📄 Gerar PDF</button>
          </div>
        )}

        {/* TELA 7: HORÍMETROS (ADMINISTRADOR) */}
        {tela === 'horimetros' && isAdmin && (
          <div>
            <div style={{ ...estilos.cabecalhoPagina, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '10px' : '0' }}>
              <div>
                <span style={estilos.preTitulo}>Apontamento</span>
                <h2 style={estilos.tituloSecao}>Registo de Horímetros</h2>
              </div>
              <button onClick={salvarHorimetrosEmLote} style={{ ...estilos.botaoNovo, background: '#16a34a' }}>
                💾 Gravar Todos
              </button>
            </div>
            <div style={{ ...estilos.listaMaquinas, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {maquinas.map((m) => (
                <div key={m.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{m.tag}</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Atual: {m.horimetro ?? 0} h</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Novo horímetro..."
                    value={leiturasLote[m.id] ?? ''}
                    onChange={(e) => setLeiturasLote({ ...leiturasLote, [m.id]: e.target.value })}
                    style={estilos.input}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TELA 8: PREVENTIVAS */}
        {tela === 'preventivas' && (
          <div>
            <div style={{ ...estilos.cabecalhoPagina, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '10px' : '0' }}>
              <div>
                <span style={estilos.preTitulo}>Revisões</span>
                <h2 style={estilos.tituloSecao}>Plano Preventivo</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() =>
                    exportarParaCsv(
                      'Plano_Preventivo_Lokmax',
                      ['TAG', 'Marca', 'Modelo', 'Horímetro Atual', 'Próxima Revisão', 'Intervalo', 'Status'],
                      preventivas.map((p) => [p.tag, p.marca, p.modelo, p.horimetro_atual ?? 0, p.proxima_preventiva_horimetro ?? 'Pendente', p.intervalo_horas ?? 0, p.status_preventiva])
                    )
                  }
                  style={estilos.botaoExportarCsv}
                >
                  📥 CSV
                </button>
              )}
            </div>
            <div style={{ ...estilos.listaMaquinas, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {preventivasFiltradas.map((p) => (
                <div key={p.maquina_id} className="cm-card" style={estilos.cardMaquinaNovo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong>{p.tag}</strong>
                    <span className="cm-badge badge-prev-atencao">{p.status_preventiva}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                    Atual: <strong>{p.horimetro_atual ?? 0} h</strong> | Próxima: <strong>{p.proxima_preventiva_horimetro ?? 'Pendente'} h</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: '6px' }}>
                    <button onClick={() => { setPreventivaSelecionada(p); setModoPreventiva('registrar'); }} style={estilos.botaoCardPrincipal}>
                      ✓ Revisão
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setPreventivaSelecionada(p); setModoPreventiva('configurar'); }} style={estilos.botaoAjustarHorimetro}>
                        ⚙ Plano
                      </button>
                    )}
                    <button onClick={() => setMaquinaHistoricoModal(p)} style={estilos.botaoHistorico}>
                      📜 Histórico
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL CONFIGURAR PREVENTIVA (ADMIN) */}
        {modoPreventiva === 'configurar' && preventivaSelecionada && isAdmin && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? '95vw' : '100%', maxWidth: '500px', padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Plano: {preventivaSelecionada.tag}</h3>
                <button onClick={() => setModoPreventiva(null)} style={estilos.botaoFecharModal}>✕</button>
              </div>
              <form onSubmit={salvarConfiguracaoPreventiva}>
                <label style={estilos.label}>Intervalo (horas) *</label>
                <input name="intervalo" type="number" defaultValue={preventivaSelecionada.intervalo_horas || 250} style={estilos.input} required />
                <label style={estilos.label}>Última Revisão (horímetro) *</label>
                <input name="ultima" type="number" step="0.1" defaultValue={preventivaSelecionada.horimetro_ultima_preventiva || 0} style={estilos.input} required />
                <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '14px' }}>Gravar</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL REGISTAR PREVENTIVA */}
        {modoPreventiva === 'registrar' && preventivaSelecionada && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? '95vw' : '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Revisão: {preventivaSelecionada.tag}</h3>
                <button onClick={() => setModoPreventiva(null)} style={estilos.botaoFecharModal}>✕</button>
              </div>
              <form onSubmit={salvarRegistroPreventiva}>
                <label style={estilos.label}>Horímetro na Revisão *</label>
                <input name="horimetro" type="number" step="0.1" defaultValue={preventivaSelecionada.horimetro_atual || 0} style={estilos.input} required />
                <label style={estilos.label}>Mecânico</label>
                <input name="mecanicoResponsavel" defaultValue={usuarioLogado.nome} style={estilos.input} />

                <label style={{ ...estilos.label, marginTop: '10px' }}>Checklist de Filtros Substituídos</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroCombustivel} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroCombustivel: e.target.checked })} />
                    Filtro de combustível
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroCombustivelSeparador} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroCombustivelSeparador: e.target.checked })} />
                    Filtro combust. separador
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroArInterno} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroArInterno: e.target.checked })} />
                    Filtro de ar interno
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroArExterno} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroArExterno: e.target.checked })} />
                    Filtro de ar externo
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroLubrificante} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroLubrificante: e.target.checked })} />
                    Filtro lubrificante
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={itensRevisao.filtroHidraulico} onChange={(e) => setItensRevisao({ ...itensRevisao, filtroHidraulico: e.target.checked })} />
                    Filtro hidráulico
                  </label>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                  <label className="checkbox-item" style={{ background: 'transparent', border: 0, padding: 0 }}>
                    <input type="checkbox" checked={itensRevisao.trocouOleoHidraulico} onChange={(e) => setItensRevisao({ ...itensRevisao, trocouOleoHidraulico: e.target.checked })} />
                    Óleo Hidráulico
                  </label>
                  {itensRevisao.trocouOleoHidraulico && (
                    <input type="number" step="0.5" placeholder="Litros adicionados (ex: 20)" value={litrosOleoHidraulico} onChange={(e) => setLitrosOleoHidraulico(e.target.value)} style={{ ...estilos.input, marginTop: '6px' }} />
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <label className="checkbox-item" style={{ background: 'transparent', border: 0, padding: 0 }}>
                    <input type="checkbox" checked={itensRevisao.trocouOleoMotor} onChange={(e) => setItensRevisao({ ...itensRevisao, trocouOleoMotor: e.target.checked })} />
                    Óleo do Motor
                  </label>
                  {itensRevisao.trocouOleoMotor && (
                    <input type="number" step="0.5" placeholder="Litros adicionados (ex: 8.5)" value={litrosOleoMotor} onChange={(e) => setLitrosOleoMotor(e.target.value)} style={{ ...estilos.input, marginTop: '6px' }} />
                  )}
                </div>

                <label style={estilos.label}>Observações</label>
                <textarea name="observacaoComplementar" style={estilos.textarea} />
                <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '14px' }}>Concluir</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL HISTÓRICO DE PREVENTIVAS */}
        {maquinaHistoricoModal && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? '95vw' : '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0 }}>Histórico: {maquinaHistoricoModal.tag}</h3>
                <button onClick={() => setMaquinaHistoricoModal(null)} style={estilos.botaoFecharModal}>✕</button>
              </div>
              {historicoDaMaquinaModal.length === 0 ? (
                <p style={{ color: '#64748b' }}>Nenhuma preventiva registrada.</p>
              ) : (
                <div className="timeline-container">
                  {historicoDaMaquinaModal.map((item) => (
                    <div key={item.id} className="timeline-entry">
                      <div className="timeline-dot" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong>{item.horimetro_preventiva} h</strong>
                        <button
                          onClick={() =>
                            gerarPdfPreventiva(
                              { tag: maquinaHistoricoModal.tag, marca: maquinaHistoricoModal.marca, modelo: maquinaHistoricoModal.modelo },
                              item
                            )
                          }
                          style={estilos.botaoPdfItem}
                        >
                          📄 PDF
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px' }}>{item.observacao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TELA 9: UTILIZADORES (APENAS ADMINISTRADOR) */}
        {tela === 'usuarios' && isAdmin && (
          <div>
            <div style={{ ...estilos.cabecalhoPagina, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '10px' : '0' }}>
              <div>
                <span style={estilos.preTitulo}>Acessos</span>
                <h2 style={estilos.tituloSecao}>Equipa Técnica</h2>
              </div>
              <button onClick={() => setTela('novoUsuario')} style={estilos.botaoNovo}>+ Novo Utilizador</button>
            </div>
            <div style={{ ...estilos.listaMaquinas, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {usuariosFiltrados.map((u) => (
                <div key={u.id} className="cm-card" style={estilos.cardMaquinaNovo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong>{u.nome}</strong>
                    <span className="cm-badge badge-op-operacional">{u.tipo}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Login: @{u.login}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button onClick={() => alterarSenhaUsuario(u)} style={estilos.botaoAjustarHorimetro}>Mudar Senha</button>
                    <button onClick={() => alternarStatusUsuario(u)} style={estilos.botaoExcluirOS}>
                      {u.ativo ? 'Bloquear' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TELA 10: NOVO UTILIZADOR (ADMINISTRADOR) */}
        {tela === 'novoUsuario' && isAdmin && (
          <div style={{ ...estilos.cardFormulario, width: isMobile ? '95vw' : '100%', padding: isMobile ? '16px' : '28px' }}>
            <button onClick={() => setTela('usuarios')} style={estilos.botaoVoltar}>← Cancelar</button>
            <h3>Novo Utilizador</h3>
            <form onSubmit={criarUsuario}>
              <label style={estilos.label}>Nome Completo *</label>
              <input name="nome" style={estilos.input} required />
              <label style={estilos.label}>Login *</label>
              <input name="usuario" style={estilos.input} required />
              <label style={estilos.label}>Palavra-passe *</label>
              <input name="senha" type="password" style={estilos.input} required />
              <label style={estilos.label}>Perfil *</label>
              <select name="perfil" style={estilos.input}>
                <option value="mecanico">Mecânico</option>
                <option value="admin">Administrador</option>
                <option value="operador">Operador</option>
              </select>
              <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '14px' }}>Gravar</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

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
  }, []);

  function getCoords(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDesenhando(true);
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function finalizar() {
    if (!desenhando) return;
    setDesenhando(false);
    const canvas = canvasRef.current;
    if (canvas) props.onChange(canvas.toDataURL('image/png'));
  }

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={340}
          height={140}
          onMouseDown={iniciar}
          onMouseMove={mover}
          onMouseUp={finalizar}
          onTouchStart={iniciar}
          onTouchMove={mover}
          onTouchEnd={finalizar}
          style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none' }}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          const c = canvasRef.current;
          if (c) {
            c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
            props.onChange('');
          }
        }}
        style={{ background: 'transparent', border: 0, color: '#dc2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'right' }}
      >
        Limpar Assinatura
      </button>
    </div>
  );
}

function Topo(props: {
  usuario: Usuario | null;
  tela: Tela;
  isMobile: boolean;
  onNavigate: (tela: Tela) => void;
  onSair: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const isAdmin = props.usuario?.tipo === 'admin';
  const isMecanico = props.usuario?.tipo === 'mecanico';

  // Menu customizado estritamente pelo perfil logado
  const itens = [
    ...(isAdmin ? [{ tela: 'dashboard' as const, label: 'Painel Executivo' }] : []),
    { tela: 'chamados' as const, label: isMecanico ? 'Minhas O.S.' : 'Ordens de Serviço' },
    { tela: 'maquinas' as const, label: 'Frota de Máquinas' },
    { tela: 'preventivas' as const, label: 'Plano Preventivo' },
    ...(isAdmin ? [{ tela: 'horimetros' as const, label: 'Horímetros' }] : []),
    ...(isAdmin ? [{ tela: 'usuarios' as const, label: 'Utilizadores' }] : []),
  ];

  return (
    <>
      {props.isMobile && menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 49,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside className={`controlmaq-desktop-sidebar ${menuAberto ? 'controlmaq-sidebar-open' : ''}`} style={estilos.sidebar}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f59e0b', color: '#000', fontWeight: 900, padding: '6px 10px', borderRadius: '6px' }}>CM</div>
            <strong>ControlMaq</strong>
          </div>
          {props.isMobile && (
            <button
              onClick={() => setMenuAberto(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 0,
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <nav style={{ padding: '10px', display: 'grid', gap: '4px' }}>
          {itens.map((item) => (
            <button
              key={item.tela}
              onClick={() => { props.onNavigate(item.tela); setMenuAberto(false); }}
              style={{
                ...estilos.sidebarItem,
                background: props.tela === item.tela ? '#1e293b' : 'transparent',
                color: props.tela === item.tela ? '#fff' : '#94a3b8',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid #1e293b' }}>
          <div style={{ marginBottom: '8px', fontSize: '11px', color: '#64748b' }}>
            Perfil: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{props.usuario?.tipo}</strong>
          </div>
          <button onClick={props.onSair} style={estilos.sidebarSair}>Terminar Sessão</button>
        </div>
      </aside>

      <header
        className="controlmaq-topbar"
        style={{
          ...estilos.topo,
          left: props.isMobile ? 0 : '260px',
          width: props.isMobile ? '100%' : 'calc(100% - 260px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {props.isMobile && (
            <button onClick={() => setMenuAberto(!menuAberto)} style={estilos.botaoMenuMobile}>☰</button>
          )}
          <span style={{ fontWeight: 900, color: '#f59e0b' }}>LOKMAX</span>
        </div>
        <StatusConexao />
      </header>
    </>
  );
}

const estilos: Record<string, CSSProperties> = {
  pagina: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a' },
  paginaLogin: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', padding: '16px' },
  cardLogin: { background: '#ffffff', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '380px' },
  topo: {
    position: 'fixed',
    top: 0,
    height: '60px',
    background: '#0f172a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 40,
    borderBottom: '1px solid #1e293b',
    boxSizing: 'border-box',
  },
  botaoMenuMobile: { background: 'transparent', border: 0, color: '#fff', fontSize: '24px', cursor: 'pointer', padding: 0 },
  conteudo: { boxSizing: 'border-box' },
  cabecalhoPagina: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  preTitulo: { color: '#64748b', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase' },
  tituloSecao: { margin: '2px 0 0', fontSize: '20px', fontWeight: 800 },
  botaoNovo: { background: '#f59e0b', color: '#000', border: 0, padding: '8px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' },
  botaoExportarCsv: { background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' },
  filtros: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' },
  botaoFiltro: { padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '12px', cursor: 'pointer' },
  inputBusca: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', boxSizing: 'border-box' },
  listaMaquinas: { display: 'grid', gap: '12px' },
  cardMaquinaNovo: { padding: '14px' },
  caixaHorimetro: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  botaoAjustarHorimetro: { background: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' },
  botaoHistorico: { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' },
  botaoPdfItem: { background: '#0f172a', border: 0, color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' },
  botaoCardPrincipal: { width: '100%', padding: '7px 10px', background: '#0f172a', color: '#fff', border: 0, borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' },
  botaoExcluirOS: { background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 },
  cardFormulario: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '0 auto', boxSizing: 'border-box' },
  botaoVoltar: { background: 'none', border: 0, color: '#64748b', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '12px', marginBottom: '6px' },
  label: { display: 'block', margin: '10px 0 4px', fontWeight: 700, fontSize: '12px', color: '#334155' },
  input: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: '70px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
  botaoNovoSubmit: { width: '100%', padding: '10px', background: '#f59e0b', color: '#000', border: 0, borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '10px' },
  modalCard: { background: '#fff', borderRadius: '14px', boxSizing: 'border-box' },
  botaoFecharModal: { background: '#f1f5f9', border: 0, color: '#475569', width: '28px', height: '28px', borderRadius: '50%', fontWeight: 800, cursor: 'pointer' },
  sidebar: { position: 'fixed', inset: '0 auto 0 0', width: '260px', zIndex: 50, background: '#0a0e17', color: '#fff', display: 'flex', flexDirection: 'column' },
  sidebarItem: { width: '100%', padding: '10px 12px', border: 0, textAlign: 'left', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  sidebarSair: { width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: 0, color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' },
};