import { 
  MapPin, 
  User, 
  Wrench, 
  Share2, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  FileText, 
  AlertTriangle, 
  LayoutDashboard, 
  ClipboardList, 
  Truck, 
  CalendarClock, 
  Gauge, 
  Users, 
  LogOut, 
  X,
  Search
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { supabase } from './lib/supabase';
import { StatusConexao } from './components/StatusConexao';
import { ModalFichaTecnica } from './components/ModalFichaTecnica';
import { ModalRequisicaoCompras } from './components/ModalRequisicaoCompras';
import { ModalConcluirOSAssistido } from './components/ModalConcluirOSAssistido';
import { ModalDesmobilizacao } from './components/ModalDesmobilizacao';
import { AlertaWhatsAppPreventivas } from './components/AlertaWhatsAppPreventivas';
import { ModalAuditoriaHomologacao } from './components/ModalAuditoriaHomologacao';
import { OfflineCache } from './services/offlineCacheService';
import { imprimirOuSalvarLaudoTecnico } from './services/relatorioOSService';
import { KanbanOrdensServico } from './components/KanbanOrdensServico';
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

// Som de alerta automotivo/industrial (Beep duplo audível)
const SOM_ALERTA_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

function dispararAlertaMecanico(chamado: Chamado) {
  // 1. Vibração intensa em pulso contínuo
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 800]);
    }
  } catch {
    // Silencia se não suportado
  }

  // 2. Som nítido via elemento Audio
  try {
    const audio = new Audio(SOM_ALERTA_URL);
    audio.volume = 1.0;
    audio.play().catch(() => {
      // Ignora bloqueio caso o utilizador ainda não tenha tocado no ecrã
    });
  } catch {
    // Silencia erro de reprodução
  }

  // 3. Notificação nativa do sistema operacional (Android / PC)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🚨 Nova O.S. #${chamado.id} - ${chamado.maquina}`, {
        body: `Local: ${chamado.local}\nProblema: ${chamado.problema}`,
        icon: '/favicon.ico',
      });
    }
  } catch {
    // Silencia se não suportado
  }
}

function compararNomes(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const limpoA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const limpoB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return limpoA === limpoB;
}

export default function App() {
  const [modalBuscaGlobalAberto, setModalBuscaGlobalAberto] = useState(false);
  const [termoBuscaGlobal, setTermoBuscaGlobal] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModalBuscaGlobalAberto((prev) => !prev);
      }
      if (e.key === "Escape") {
        setModalBuscaGlobalAberto(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const [modalEditarChamadoAberto, setModalEditarChamadoAberto] = useState(false);
  const [chamadoEdicao, setChamadoEdicao] = useState<any>(null);

  const abrirEdicaoChamado = (chamado: any) => {
    setChamadoEdicao({ ...chamado });
    setModalEditarChamadoAberto(true);
  };

  const salvarEdicaoChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chamadoEdicao) return;
    try {
      const { error } = await supabase
        .from("chamados")
        .update({
          maquina: chamadoEdicao.maquina,
          problema: chamadoEdicao.problema,
          local: chamadoEdicao.local,
          solicitante: chamadoEdicao.solicitante,
          mecanico: chamadoEdicao.mecanico,
        })
        .eq("id", chamadoEdicao.id);

      if (error) throw error;

      setChamados((prev: any[]) =>
        prev.map((item: any) => (item.id === chamadoEdicao.id ? { ...item, ...chamadoEdicao } : item))
      );

      setModalEditarChamadoAberto(false);
      alert("Chamado atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao atualizar chamado: " + (err.message || "Tente novamente"));
    }
  };

  const compartilharChamadoWhatsApp = (chamado: any) => {
    const linkMaps = chamado.local 
      ? "\n🗺️ *Rota Google Maps:* https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(chamado.local)
      : "";

    const texto = [
      "🛠️ *ORDEM DE SERVIÇO #" + (chamado.id || "") + "*",
      "🚜 *Máquina:* " + (chamado.maquina || "N/A"),
      "⚠️ *Problema:* " + (chamado.problema || "N/A"),
      "📍 *Local:* " + (chamado.local || "Não informado"),
      "👤 *Solicitante:* " + (chamado.solicitante || "N/A"),
      "🔧 *Mecânico:* " + (chamado.mecanico || "Não designado"),
      "📌 *Status:* " + (chamado.status || "Pendente") + linkMaps
    ].join("\n");

    window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(texto), "_blank");
  };

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth <= 900;
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
        if (u?.id && u?.login && u?.tipo) return u;
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

  // Banner Flutuante de Alerta Imediato para Mecânico
  const [chamadoAlertaEntrante, setChamadoAlertaEntrante] = useState<Chamado | null>(null);

  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'kanban'>('lista');
  const [filtroChamados, setFiltroChamados] = useState<FiltroChamado>('Todos');
  const [buscaChamados, setBuscaChamados] = useState('');
  const [filtroPrioridadeChamados, setFiltroPrioridadeChamados] = useState('');
  const [filtroMaquinaChamados, setFiltroMaquinaChamados] = useState('');
  const [filtroMecanicoChamados, setFiltroMecanicoChamados] = useState('');

  const [filtroStatusMaquina, setFiltroStatusMaquina] = useState<'Todos' | 'Operacional' | 'Parada' | 'Em manutenção' | 'Pedir Filtros (45d)'>('Todos');
  const [buscaMaquinas, setBuscaMaquinas] = useState('');
  const [modalDesmobilizacaoAberto, setModalDesmobilizacaoAberto] = useState(false);
  const [modalNovaMaquina, setModalNovaMaquina] = useState(false);
  const [maquinaEmEdicao, setMaquinaEmEdicao] = useState<Maquina | null>(null);
  const [maquinaDossie, setMaquinaDossie] = useState<Maquina | null>(null);
  const [leiturasDossie, setLeiturasDossie] = useState<any[]>([]);
  const [carregandoLeituras, setCarregandoLeituras] = useState(false);
  const [maquinaFichaTecnica, setMaquinaFichaTecnica] = useState<Maquina | null>(null);
  const [maquinaRequisicao, setMaquinaRequisicao] = useState<Maquina | null>(null);
  const [maquinaDesmobilizar, setMaquinaDesmobilizar] = useState<Maquina | null>(null);
  const [modalAuditoriaAberto, setModalAuditoriaAberto] = useState(false);
  const [modalLeituraRapidaAberto, setModalLeituraRapidaAberto] = useState(false);
  const [maquinaLeituraRapidaId, setMaquinaLeituraRapidaId] = useState("");
  const [valorNovoHorimetro, setValorNovoHorimetro] = useState("");
  const [chamadoConcluirAssistido, setChamadoConcluirAssistido] = useState<Chamado | null>(null);
  
  useEffect(() => {
    if (!maquinaDossie) {
      setLeiturasDossie([]);
      return;
    }
    async function buscarLeituras() {
      setCarregandoLeituras(true);
      try {
        const { data } = await supabase
          .from("leituras_horimetro")
          .select("*")
          .eq("maquina_id", maquinaDossie?.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setLeiturasDossie(data || []);
      } catch (err) {
        console.error("Erro ao carregar leituras do dossie:", err);
      } finally {
        setCarregandoLeituras(false);
      }
    }
    buscarLeituras();
  }, [maquinaDossie]);

  const [modoVisualizacaoOS, setModoVisualizacaoOS] = useState<'kanban' | 'lista'>('kanban');

  const [leiturasLote, setLeiturasLote] = useState<Record<string, string>>({});
  const [buscaUsuarios, setBuscaUsuarios] = useState('');
  const [filtroPreventivas, setFiltroPreventivas] = useState<FiltroPreventiva>('Todos');
  const [buscaPreventivas, setBuscaPreventivas] = useState('');
  const [preventivaSelecionada, setPreventivaSelecionada] = useState<PreventivaMaquina | null>(null);
  const [modoPreventiva, setModoPreventiva] = useState<'configurar' | 'registrar' | null>(null);

  const [maquinaHistoricoModal, setMaquinaHistoricoModal] = useState<PreventivaMaquina | null>(null);

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

  const [fotoNovoChamado, setFotoNovoChamado] = useState<string>('');
  const [chamadoParaFinalizar, setChamadoParaFinalizar] = useState<Chamado | null>(null);
  const [fotoFinalizacao, setFotoFinalizacao] = useState<string>('');
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

  // Pedir permissão de notificações nativas assim que logar
  useEffect(() => {
    if (usuarioLogado && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [usuarioLogado]);

  // Indicadores de Manutenção
  const chamadosConcluidosComTempo = chamados.filter(
    (c) => c.status === 'Finalizado' && c.iniciado_at && c.finalizado_at
  );
  const totalMinutosAtendimento = chamadosConcluidosComTempo.reduce((acc, c) => {
    const diff = new Date(c.finalizado_at!).getTime() - new Date(c.iniciado_at!).getTime();
    return acc + Math.max(0, diff / (1000 * 60));
  }, 0);
  const mttrHoras = chamadosConcluidosComTempo.length > 0
    ? (totalMinutosAtendimento / chamadosConcluidosComTempo.length / 60).toFixed(1)
    : '0.0';

  const totalMaquinas = maquinas.length;
  const maquinasOperacionais = maquinas.filter(
    (m) => calcularSituacaoMaquina(m.tag, chamados) === 'Operacional'
  ).length;
  const taxaDisponibilidade = totalMaquinas > 0
    ? Math.round((maquinasOperacionais / totalMaquinas) * 100)
    : 100;

  const preventivasCriticas = preventivas.filter(
    (p) => p.status_preventiva === 'Urgente' || p.status_preventiva === 'Vencida'
  );

  const chamadosVisiveis = isAdmin
    ? chamados
    : chamados.filter((chamado) => {
        if (!usuarioLogado) return false;
        return compararNomes(chamado.mecanico, usuarioLogado.nome);
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
      if (filtroMecanicoChamados && !compararNomes(chamado.mecanico, filtroMecanicoChamados)) return false;
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

    if (filtroStatusMaquina === 'Pedir Filtros (45d)') {
      const hAtual = Number(m.horimetro ?? 0);
      const ciclo = 250;
      const proximaRevisao = Math.ceil((hAtual + 1) / ciclo) * ciclo;
      const horasRestantes = Math.max(0, proximaRevisao - hAtual);
      const diasEstimados = Math.round(horasRestantes / 8);
      return diasEstimados <= 45;
    }

    const situacaoCalculada = calcularSituacaoMaquina(m.tag, chamados);
    if (filtroStatusMaquina === 'Em manutenção') return situacaoCalculada === 'Em manutenção';
    if (filtroStatusMaquina === 'Parada') return m.status_maquina === 'Parada' || situacaoCalculada === 'Parada';
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

    const canalId = `canal_${Math.random().toString(36).substring(7)}`;
    const canal = supabase
      .channel(canalId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chamados' },
        (payload) => {
          const novo = payload.new as Chamado;
          setChamados((prev) => {
            if (prev.some((c) => c.id === novo.id)) return prev;
            return [novo, ...prev];
          });

          // Se for mecânico e o chamado for para ele, dispara o alarme audiovisual
          if (usuarioLogado && compararNomes(novo.mecanico, usuarioLogado.nome)) {
            dispararAlertaMecanico(novo);
            setChamadoAlertaEntrante(novo);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados' },
        (payload) => {
          const atualizado = payload.new as Chamado;
          setChamados((prev) =>
            prev.map((c) => (c.id === atualizado.id ? atualizado : c))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chamados' },
        (payload) => {
          const idExcluido = (payload.old as { id: number }).id;
          setChamados((prev) => prev.filter((c) => c.id !== idExcluido));
        }
      )
      .subscribe();

    const intervaloPolling = setInterval(async () => {
      try {
        const { data } = await supabase.from('chamados').select('*').order('id', { ascending: false });
        if (data) setChamados(data as Chamado[]);
      } catch {
        // Ignora falhas temporárias
      }
    }, 4000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervaloPolling);
    };
  }, [usuarioLogado]);

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
        supabase.from('historico_chamados').select('*').order('id', { ascending: false }),
        supabase.from('leituras_horimetro').select('*').order('id', { ascending: false }),
        supabase.from('operacoes_diarias').select('*').order('id', { ascending: false }),
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
      if (prevData.status === 'fulfilled') setPreventivas(prevData.value);
      if (histPrevData.status === 'fulfilled') setHistoricoPreventivas(histPrevData.value);

      setUltimaSincronizacao(new Date());
    } finally {
      if (mostrarCarregando) setCarregando(false);
    }
  }

  function converterImagemParaBase64(e: React.ChangeEvent<HTMLInputElement>, setFoto: (b64: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setFoto(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
        margin: 0; padding: 0; width: 100%; min-height: 100%;
        background: var(--cm-bg); color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow-x: hidden;
      }
      .cm-card {
        background: #ffffff; border: 1px solid var(--cm-border);
        border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        word-break: break-word;
      }
      .cm-badge {
        padding: 4px 8px; border-radius: 20px; font-size: 11px;
        font-weight: 700; display: inline-flex; align-items: center; white-space: nowrap;
      }
      .badge-aberto { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
      .badge-assumido { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
      .badge-finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
      .badge-op-operacional { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
      .badge-op-parada { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
      .badge-op-manutencao { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
      .kpi-card {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;
      }
      .alerta-preventiva {
        background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px;
        padding: 12px 16px; margin-bottom: 16px; display: flex;
        justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
      }
      .banner-alerta-os {
        position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
        width: 92%; max-width: 500px; z-index: 1000;
        background: #ef4444; color: #fff; padding: 14px 18px;
        border-radius: 12px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
        display: flex; justify-content: space-between; align-items: center;
        animation: pulseAlert 1.5s infinite;
      }
      @keyframes pulseAlert {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.02); }
      }
      .checkbox-item {
        display: flex; align-items: center; gap: 8px; background: #f8fafc;
        border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;
        font-size: 13px; font-weight: 600; color: #334155; user-select: none;
      }
      .timeline-container {
        border-left: 2px solid #e2e8f0; padding-left: 14px; margin-left: 6px;
        display: grid; gap: 14px;
      }
      .timeline-entry {
        position: relative; background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 10px; padding: 12px;
      }
      .timeline-dot {
        position: absolute; left: -21px; top: 14px; width: 12px; height: 12px;
        border-radius: 50%; background: #f59e0b; border: 2px solid #ffffff;
      }
      .kanban-grid {
        display: flex; gap: 14px; overflow-x: auto; padding-bottom: 16px;
        -webkit-overflow-scrolling: touch;
      }
      .kanban-coluna {
        flex: 0 0 310px; background: #f1f5f9; border-radius: 12px;
        padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 400px;
      }
      @media (max-width: 900px) {
        .controlmaq-desktop-sidebar {
          transform: translateX(-100%) !important; transition: transform 0.25s ease-in-out !important; width: 270px !important;
        }
        .controlmaq-sidebar-open {
          transform: translateX(0) !important; box-shadow: 0 0 40px rgba(0, 0, 0, 0.7) !important;
        }
        .kanban-coluna { flex: 0 0 85vw !important; }
      }
    `;
  }

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

  function gerarPdfChamado(chamado: Chamado) {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('Permita janelas pop-up no navegador para abrir o PDF.');
      return;
    }

    const dataAbertura = chamado.created_at ? new Date(chamado.created_at).toLocaleString('pt-BR') : 'Não informado';
    const dataConclusao = chamado.finalizado_at ? new Date(chamado.finalizado_at).toLocaleString('pt-BR') : 'Em andamento';
    const assinaturaSalva = localStorage.getItem(`controlmaq_assinatura_${chamado.id}`) || '';
    const fotoAberturaSalva = localStorage.getItem(`controlmaq_foto_${chamado.id}`) || '';
    const fotoFinalizacaoSalva = localStorage.getItem(`controlmaq_foto_fim_${chamado.id}`) || '';

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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; padding: 15mm; }
            .cabecalho { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .bloco-dados { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .dado-item small { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .dado-item strong { font-size: 13px; color: #0f172a; }
            .secao-titulo { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px; margin: 14px 0 6px; }
            .conteudo-caixa { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.5; background: #ffffff; }
            .fotos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
            .foto-img { max-height: 180px; width: 100%; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px; }
            .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
            .linha-assinatura { border-top: 1px solid #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; }
            .box-assinatura-digital { height: 60px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px; }
            .img-assinatura { max-height: 55px; max-width: 180px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img src="/icon-192.png" alt="Ge-Nio" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "contain" }} /><div style={{ fontSize: "18px", fontWeight: 900, color: "#f59e0b", letterSpacing: "-0.5px" }}>Ge-Nio <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 700, letterSpacing: "1px" }}>MECHANIQ</span></div></div>
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

          ${(fotoAberturaSalva || fotoFinalizacaoSalva) ? `
            <div class="secao-titulo">Evidências Fotográficas</div>
            <div class="fotos-grid">
              ${fotoAberturaSalva ? `<div><small style="display:block;margin-bottom:4px;font-weight:700;">Antes / Anomalia</small><img src="${fotoAberturaSalva}" class="foto-img" /></div>` : ''}
              ${fotoFinalizacaoSalva ? `<div><small style="display:block;margin-bottom:4px;font-weight:700;">Depois / Conclusão</small><img src="${fotoFinalizacaoSalva}" class="foto-img" /></div>` : ''}
            </div>
          ` : ''}

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
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; padding: 15mm; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
            th { background: #0f172a; color: #fff; text-align: left; padding: 6px 8px; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h2>LOKMAX — Dossiê do Ativo</h2>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">TAG: <strong>${m.tag}</strong> (${m.marca} ${m.modelo}) | Horímetro: <strong>${m.horimetro ?? 0} h</strong></div>

          <h3>Preventivas (${revisoesDaMaquina.length})</h3>
          ${revisoesDaMaquina.length === 0 ? '<p>Nenhuma preventiva registada.</p>' : `
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

          <h3 style="margin-top: 20px;">Ordens de Serviço (${chamadosDaMaquina.length})</h3>
          ${chamadosDaMaquina.length === 0 ? '<p>Nenhum chamado registado.</p>' : `
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

      if (usuarioEncontrado.tipo === 'operador') setTela('operacaoDiaria');
      else if (usuarioEncontrado.tipo === 'mecanico') setTela('chamados');
      else setTela('dashboard');

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
    const alteracoes = Object.entries(leiturasLote).filter(([_, valor]) => valor && String(valor).trim() !== "");
    if (alteracoes.length === 0) {
      alert("Preencha pelo menos um horímetro.");
      return;
    }

    try {
      setSalvando(true);
      for (const [maquinaId, novoValorStr] of alteracoes) {
        const valor = Number(String(novoValorStr).replace(",", "."));
        const maquinaAlvo = maquinas.find((m) => String(m.id) === String(maquinaId));
        if (Number.isFinite(valor) && valor >= 0 && maquinaAlvo) {
          const { error: errMaq } = await supabase
            .from("maquinas")
            .update({ horimetro: valor })
            .eq("id", maquinaAlvo.id);

          if (errMaq) throw new Error(`Erro ao atualizar máquina ${maquinaAlvo.tag}: ${errMaq.message}`);

          const payloadLeitura: any = {
            maquina_id: maquinaAlvo.id,
            maquina_tag: maquinaAlvo.tag,
            horimetro: valor,
            origem: "apontamento_em_lote",
          };

          if (usuarioLogado?.id) payloadLeitura.operador_id = usuarioLogado.id;
          if (usuarioLogado?.nome) payloadLeitura.operador_nome = usuarioLogado.nome;

          const { error: errLeitura } = await supabase
            .from("leituras_horimetro")
            .insert(payloadLeitura);

          if (errLeitura) {
            console.warn("Aviso ao salvar histórico de leitura:", errLeitura.message);
          }
        }
      }
      setLeiturasLote({});
      await carregarDados(false);
      alert("Horímetro(s) atualizado(s) com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Falha ao salvar horímetro: " + (err.message || err));
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
      localStorage.removeItem(`controlmaq_foto_${chamadoAlvo.id}`);
      localStorage.removeItem(`controlmaq_foto_fim_${chamadoAlvo.id}`);
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

  async function criarChamado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usuarioLogado) {
      alert('Sessão expirada. Inicie sessão novamente.');
      return;
    }

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
      alert('Preencha os campos obrigatórios (Máquina, Solicitante, Local e Problema).');
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

      if (error) {
        alert('Erro ao gravar chamado: ' + error.message);
        return;
      }

      if (data) {
        if (fotoNovoChamado) {
          localStorage.setItem(`controlmaq_foto_${data.id}`, fotoNovoChamado);
        }
        setChamados((prev) => [data as Chamado, ...prev]);
        setMaquinaNovoChamado('');
        setFotoNovoChamado('');
        setFiltroChamados('Todos');
        setTela('chamados');
        alert('Ordem de Serviço criada com sucesso!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verifique a sua ligação.';
      alert('Erro inesperado: ' + msg);
    } finally {
      setSalvando(false);
    }
  }

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
      setFotoFinalizacao('');
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
        if (fotoFinalizacao) {
          localStorage.setItem(`controlmaq_foto_fim_${chamadoSalvo.id}`, fotoFinalizacao);
        }
        setChamados((prev) => prev.map((c) => (c.id === chamadoParaFinalizar.id ? chamadoSalvo : c)));
        setChamadoParaFinalizar(null);
        setTela('chamados');
        if (confirm('Deseja gerar o comprovativo em PDF com fotos e assinatura?')) {
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
              <p style={{ margin: 0, fontWeight: 900, color: '#f59e0b', fontSize: '11px' }}>GE-NIO MECHANIQ</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img src="/icon-192.png" alt="Ge-Nio" style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "contain" }} /><div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "18px", fontWeight: 900, color: "#f59e0b", lineHeight: "1.1" }}>Ge-Nio</span><span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", color: "#94a3b8" }}>MECHANIQ</span></div></div>
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
      {/* BANNER FLUTUANTE DE CHAMADA ENTRANTE (MECÂNICO) */}
      {chamadoAlertaEntrante && (
        <div className="banner-alerta-os">
          <div>
            <div style={{ fontWeight: 900, fontSize: '14px' }}>🚨 NOVA O.S. RECEBIDA!</div>
            <div style={{ fontSize: '12px' }}>
              <strong>{chamadoAlertaEntrante.maquina}</strong> — {chamadoAlertaEntrante.local}
            </div>
          </div>
          <button
            onClick={() => {
              setChamadoDetalhes(chamadoAlertaEntrante);
              setTela('detalhesChamado');
              setChamadoAlertaEntrante(null);
            }}
            style={{
              background: '#fff',
              color: '#dc2626',
              border: 0,
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Abrir
          </button>
        </div>
      )}

      <Topo onAbrirBusca={() => setModalBuscaGlobalAberto(true)} usuario={usuarioLogado}
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
        {/* BARRA SUPERIOR DE INDICADORES TÉCNICOS (NOVO LAYOUT INDUSTRIAL GE-NIO) */}
        {isAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "12px", marginBottom: "18px" }}>
            {/* Card 1: Disponibilidade */}
            <div style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid " + (taxaDisponibilidade >= 85 ? "#10b981" : "#ef4444"),
              boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)",
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.8px" }}>DISPONIBILIDADE</span>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: taxaDisponibilidade >= 85 ? "#10b981" : "#ef4444", display: "inline-block" }}></span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: taxaDisponibilidade >= 85 ? "#047857" : "#b91c1c", letterSpacing: "-0.5px" }}>
                {taxaDisponibilidade}%
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: 500 }}>
                <strong style={{ color: "#334155" }}>{maquinasOperacionais}</strong> de {totalMaquinas} operando
              </div>
            </div>

            {/* Card 2: MTTR */}
            <div style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #3b82f6",
              boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.8px" }}>MTTR (MÉDIO)</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#3b82f6", background: "#eff6ff", padding: "1px 6px", borderRadius: "4px" }}>TEMPO</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
                {mttrHoras} <span style={{ fontSize: "15px", fontWeight: 700, color: "#64748b" }}>h</span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: 500 }}>
                Tempo médio de reparo
              </div>
            </div>

            {/* Card 3: Chamados Ativos */}
            <div style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #f59e0b",
              boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.8px" }}>CHAMADOS ATIVOS</span>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: (chamadosAbertos.length + chamadosAssumidos.length) > 0 ? "#f59e0b" : "#10b981", display: "inline-block" }}></span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#b45309", letterSpacing: "-0.5px" }}>
                {chamadosAbertos.length + chamadosAssumidos.length}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: 500 }}>
                <strong style={{ color: "#d97706" }}>{chamadosAbertos.length}</strong> pendentes de ação
              </div>
            </div>

            {/* Card 4: Preventivas Críticas */}
            <div style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "14px 16px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid " + (preventivasCriticas.length > 0 ? "#dc2626" : "#10b981"),
              boxShadow: "0 2px 4px rgba(15, 23, 42, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.8px" }}>PREVENTIVAS CRÍTICAS</span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: preventivasCriticas.length > 0 ? "#dc2626" : "#059669",
                  background: preventivasCriticas.length > 0 ? "#fef2f2" : "#ecfdf5",
                  padding: "1px 6px",
                  borderRadius: "4px"
                }}>
                  {preventivasCriticas.length > 0 ? "URGENTE" : "OK"}
                </span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: preventivasCriticas.length > 0 ? "#dc2626" : "#059669", letterSpacing: "-0.5px" }}>
                {preventivasCriticas.length}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: 500 }}>
                {preventivasCriticas.length > 0 ? "Revisões estouradas" : "Todas em dia"}
              </div>
            </div>
          </div>
        )}

        {/* ALERTA DE PREVENTIVAS PRÓXIMAS / VENCIDAS */}
        {preventivasCriticas.length > 0 && (
          <div className="alerta-preventiva">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#9f1239' }}>Atenção: {preventivasCriticas.length} máquinas necessitam de revisão imediata!</strong>
                <div style={{ fontSize: '11px', color: '#be123c' }}>
                  TAGs: {preventivasCriticas.map((p) => p.tag).join(', ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setFiltroPreventivas('Todos');
                setTela('preventivas');
              }}
              style={{ ...estilos.botaoNovo, background: '#e11d48', color: '#fff', fontSize: '11px' }}
            >
              Ver Revisões
            </button>
          </div>
        )}

        {/* TELA 1: DASHBOARD EXECUTIVO */}
        {/* TELA 1: DASHBOARD EXECUTIVO */}
        {tela === "dashboard" && isAdmin && (
          <>
            {/* Topbar com Titulo, Subtitulo e Acoes Rapidas */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              flexDirection: isMobile ? "column" : "row",
              gap: "14px",
              marginBottom: "24px"
            }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Painel</h1>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                  Horímetro das máquinas, preventivas a vencer e ordens em aberto.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMaquinaLeituraRapidaId("");
                    setValorNovoHorimetro("");
                    setModalLeituraRapidaAberto(true);
                  }}
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    flex: isMobile ? 1 : "initial"
                  }}
                >
                  Registrar leitura
                </button>

      {/* MODAL APONTAMENTO RAPIDO DE HORIMETRO */}
      {modalLeituraRapidaAberto && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "16px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "480px",
            padding: "24px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Gauge size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>Registrar Horímetro</h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Atualização diária da frota</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalLeituraRapidaAberto(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!maquinaLeituraRapidaId) {
                alert("Por favor, selecione um equipamento.");
                return;
              }

              const maq = maquinas.find(m => m.id.toString() === maquinaLeituraRapidaId);
              if (!maq) return;

              const novoH = Number(valorNovoHorimetro);
              const atualH = Number(maq.horimetro || 0);

              if (isNaN(novoH) || novoH < atualH) {
                alert("O novo horímetro não pode ser menor que o atual (" + atualH.toLocaleString("pt-BR") + " h).");
                return;
              }

              try {
                setSalvando(true);
                const agora = new Date().toISOString();
                await supabase.from("maquinas").update({ horimetro: novoH, atualizado_em: agora }).eq("id", maq.id);
                await supabase.from("leituras_horimetro").insert({
                  maquina_id: maq.id,
                  maquina_tag: maq.tag,
                  horimetro: novoH,
                  responsavel: usuarioLogado?.nome || "Responsável",
                  origem: "painel_rapido"
                });

                setMaquinas(prev => prev.map(m => m.id === maq.id ? { ...m, horimetro: novoH } : m));
                setModalLeituraRapidaAberto(false);
                alert("Horímetro do equipamento " + maq.tag + " atualizado para " + novoH.toLocaleString("pt-BR") + " h com sucesso!");
              } catch (err) {
                alert("Erro ao gravar leitura de horímetro.");
              } finally {
                setSalvando(false);
              }
            }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Equipamento *
                </label>
                <select
                  value={maquinaLeituraRapidaId}
                  onChange={(e) => {
                    const idEscolhido = e.target.value;
                    setMaquinaLeituraRapidaId(idEscolhido);
                    const maqSel = maquinas.find(x => x.id.toString() === idEscolhido);
                    setValorNovoHorimetro(maqSel ? String(maqSel.horimetro || "") : "");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#0f172a",
                    background: "#ffffff"
                  }}
                  required
                >
                  <option value="">Selecione o equipamento...</option>
                  {[...maquinas]
                    .sort((a, b) => a.tag.localeCompare(b.tag))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.tag} — {m.modelo || m.marca || "Equipamento"} (Atual: {Number(m.horimetro || 0).toLocaleString("pt-BR")} h)
                      </option>
                    ))}
                </select>
              </div>

              {maquinaLeituraRapidaId && (() => {
                const maqSel = maquinas.find(x => x.id.toString() === maquinaLeituraRapidaId);
                return (
                  <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Último registro confirmado:</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                      {Number(maqSel?.horimetro || 0).toLocaleString("pt-BR")} horas
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Novo Horímetro Acumulado (Horas) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={valorNovoHorimetro}
                  onChange={(e) => setValorNovoHorimetro(e.target.value)}
                  placeholder="Ex: 2950"
                  disabled={!maquinaLeituraRapidaId}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: maquinaLeituraRapidaId ? "2px solid #ea580c" : "1px solid #cbd5e1",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0f172a",
                    background: maquinaLeituraRapidaId ? "#ffffff" : "#f1f5f9"
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setModalLeituraRapidaAberto(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || !maquinaLeituraRapidaId}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: !maquinaLeituraRapidaId ? "#94a3b8" : "#ea580c",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: !maquinaLeituraRapidaId ? "not-allowed" : "pointer",
                    boxShadow: !maquinaLeituraRapidaId ? "none" : "0 2px 4px rgba(234, 88, 12, 0.3)"
                  }}
                >
                  {salvando ? "Salvando..." : "Confirmar Leitura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


                <button
                  type="button"
                  onClick={() => {
                    setMaquinaNovoChamado("");
                    setFotoNovoChamado("");
                    setTela("novoChamado");
                  }}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.2)",
                    flex: isMobile ? 1 : "initial"
                  }}
                >
                  Ordens de serviço
                </button>
              </div>
            </div>

            {/* Grid dos 4 Cards de Metricas (KPIs) */}
            {(() => {
              const ordensAbertas = chamados.filter(c => c.status !== "Concluído" && c.status !== "Cancelado");
              const aguardandoPeca = ordensAbertas.filter(c => (c.descricao || "").toLowerCase().includes("peça") || (c.observacao || "").toLowerCase().includes("peça")).length;
              const prevVencidas = preventivasCriticas.length;
              const maquinasParadas = maquinas.filter(m => m.status === "parada" || m.status === "manutencao").length;
              
              const maquinasComLeitura = maquinas.filter(m => Number(m.horimetro || 0) > 0);
              const totalHorimetro = maquinas.reduce((acc, m) => acc + Number(m.horimetro || 0), 0);
              const mediaHorimetro = maquinasComLeitura.length > 0 ? Math.round(totalHorimetro / maquinasComLeitura.length) : 0;

              return (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr) repeat(2, 1fr)",
                  gap: "16px",
                  marginBottom: "24px"
                }}>
                  {/* Card 1: Ordens em Aberto */}
                  <div
                    onClick={() => { setFiltroChamados("Aberto"); setTela("chamados"); }}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 22px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "0.5px" }}>
                        ORDENS EM ABERTO
                      </span>
                      <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "8px", color: "#64748b" }}>
                        <FileText size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0284c7", margin: "14px 0 6px 0" }}>
                      {ordensAbertas.length}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {aguardandoPeca} aguardando peça
                    </div>
                  </div>

                  {/* Card 2: Preventivas Vencidas */}
                  <div
                    onClick={() => { setFiltroPreventivas("Crítica"); setTela("preventivas"); }}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 22px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "0.5px" }}>
                        PREVENTIVAS VENCIDAS
                      </span>
                      <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "8px", color: "#64748b" }}>
                        <AlertTriangle size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: prevVencidas > 0 ? "#dc2626" : "#16a34a", margin: "14px 0 6px 0" }}>
                      {prevVencidas}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Planos ativos com data estourada
                    </div>
                  </div>

                  {/* Card 3: Equipamentos Parados */}
                  <div
                    onClick={() => { setFiltroStatusMaquina("parada"); setTela("maquinas"); }}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 22px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "0.5px" }}>
                        EQUIPAMENTOS PARADOS
                      </span>
                      <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "8px", color: "#64748b" }}>
                        <Wrench size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: maquinasParadas > 0 ? "#ea580c" : "#16a34a", margin: "14px 0 6px 0" }}>
                      {maquinasParadas}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {maquinas.length} equipamentos cadastrados
                    </div>
                  </div>

                  {/* Card 4: Horímetro Acumulado */}
                  <div
                    onClick={() => setTela("horimetros")}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 22px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "0.5px" }}>
                        HORÍMETRO ACUMULADO
                      </span>
                      <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "8px", color: "#64748b" }}>
                        <Gauge size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#ea580c", margin: "14px 0 6px 0" }}>
                      {totalHorimetro.toLocaleString("pt-BR")} h
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {maquinasComLeitura.length} equipamentos com leitura · média de {mediaHorimetro.toLocaleString("pt-BR")} h
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setModalAuditoriaAberto(true)}
                style={{
                  background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Auditoria de Dados
              </button>
            </div>
            <AlertaWhatsAppPreventivas preventivas={preventivasCriticas} maquinas={maquinas} />
            <div style={{ marginBottom: "16px" }} />
            
            {/* PAINEL GRÁFICO E PREVENTIVAS (CONFORME REFERÊNCIA) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "16px",
              marginBottom: "24px"
            }}>
              {/* Box Esquerda: Ranking Horizontal de Horímetro */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px 22px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      Horímetro dos Equipamentos
                    </h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Maiores horas de operação acumuladas</span>
                  </div>
                  <button
                    onClick={() => setTela("horimetros")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    Gerenciar →
                  </button>
                </div>

                {/* Grafico de Barras Horizontais em HTML/CSS nativo */}
                {(() => {
                  const maquinasOrdenadas = [...maquinas]
                    .filter(m => Number(m.horimetro || 0) > 0)
                    .sort((a, b) => Number(b.horimetro || 0) - Number(a.horimetro || 0))
                    .slice(0, 5);

                  const maxHorimetro = maquinasOrdenadas.length > 0 ? Number(maquinasOrdenadas[0].horimetro || 1) : 1800;

                  if (maquinasOrdenadas.length === 0) {
                    return (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                        Nenhum horímetro registrado até o momento.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                      {maquinasOrdenadas.map(m => {
                        const h = Number(m.horimetro || 0);
                        const pct = Math.min(100, Math.round((h / maxHorimetro) * 100));
                        return (
                          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                              <span style={{ color: "#334155" }}>{m.tag} ({m.modelo || m.marca})</span>
                              <span style={{ color: "#ea580c" }}>{h.toLocaleString("pt-BR")} h</span>
                            </div>
                            <div style={{ width: "100%", height: "26px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  background: "#ea580c",
                                  transition: "width 0.4s ease",
                                  borderRadius: "4px 0 0 4px"
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "8px", fontSize: "10px", color: "#94a3b8" }}>
                        <span>0 h</span>
                        <span>{Math.round(maxHorimetro / 4)} h</span>
                        <span>{Math.round(maxHorimetro / 2)} h</span>
                        <span>{Math.round((maxHorimetro * 3) / 4)} h</span>
                        <span>{maxHorimetro} h</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Box Direita: Preventivas por Horimetro */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px 22px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      Preventivas por Horímetro
                    </h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {preventivasCriticas.length} planos com revisão requerida
                    </span>
                  </div>
                  <button
                    onClick={() => setTela("preventivas")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    Ver →
                  </button>
                </div>

                {preventivasCriticas.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "30px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      Nenhum plano fora do intervalo
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", maxWidth: "260px" }}>
                      Todas as máquinas estão dentro da periodicidade horária preventiva programada.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", maxHeight: "280px" }}>
                    {preventivasCriticas.slice(0, 5).map(prev => (
                      <div
                        key={prev.id}
                        onClick={() => { setPreventivaSelecionada(prev); setModoPreventiva("historico"); }}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #fee2e2",
                          background: "#fef2f2",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "13px", color: "#991b1b" }}>{prev.maquina_tag}</div>
                          <div style={{ fontSize: "11px", color: "#b91c1c" }}>{prev.descricao_servico || "Troca de filtros e lubrificantes"}</div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 800, background: "#dc2626", color: "#ffffff", padding: "4px 8px", borderRadius: "6px" }}>
                          Crítica
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DashboardExecutivo chamados={chamados}
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
          </>
        )}

        {/* TELA 2: FROTA DE MÁQUINAS */}
        {tela === 'maquinas' && (
          <div>
            <div style={{
              ...estilos.cabecalhoPagina,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "flex-end",
              gap: isMobile ? "12px" : "0",
              background: "#ffffff",
              padding: "16px 20px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #f59e0b",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              marginBottom: "16px"
            }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>
                  INVENTÁRIO TÉCNICO // ATIVOS
                </span>
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "4px 0 0 0", letterSpacing: "-0.5px" }}>
                  Frota de Equipamentos
                </h2>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() =>
                        exportarParaCsv(
                          "Frota_GenioMechaniq",
                          ["TAG", "Marca", "Modelo", "Horímetro", "Status"],
                          maquinas.map((m) => [m.tag, m.marca, m.modelo, m.horimetro ?? 0, m.status_maquina])
                        )
                      }
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      📥 EXPORTAR CSV
                    </button>
                    <button
                      onClick={() => { setMaquinaEmEdicao(null); setModalNovaMaquina(true); }}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #f59e0b",
                        color: "#f59e0b",
                        fontWeight: 800,
                        fontSize: "12px",
                        letterSpacing: "0.5px",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(15, 23, 42, 0.1)"
                      }}
                    >
                      + CADASTRAR MÁQUINA
                    </button>
                    <button
                      onClick={() => setModalDesmobilizacaoAberto(true)}
                      style={{
                        background: "#fef3c7",
                        border: "1px solid #f59e0b",
                        color: "#b45309",
                        fontWeight: 800,
                        fontSize: "12px",
                        letterSpacing: "0.5px",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(15, 23, 42, 0.05)"
                      }}
                    >
                      📦 DESMOBILIZAR MÁQUINA
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
              {(['Todos', 'Pedir Filtros (45d)', 'Operacional', 'Parada', 'Em manutenção'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroStatusMaquina(st)}
                  style={{
                    ...estilos.botaoFiltro,
                    background: filtroStatusMaquina === st ? (st === 'Pedir Filtros (45d)' ? '#ca8a04' : '#0f172a') : '#fff',
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
                  <div
                    key={maquina.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      padding: "16px",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {/* CABECALHO: TAG, MODELO E STATUS */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>
                            {maquina.tag}
                          </h4>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                            {maquina.marca} • {maquina.modelo}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "4px 9px",
                            borderRadius: "99px",
                            background: situacao.toLowerCase().includes("manut") ? "#fee2e2" : "#ecfdf5",
                            color: situacao.toLowerCase().includes("manut") ? "#b91c1c" : "#047857",
                            border: situacao.toLowerCase().includes("manut") ? "1px solid #fca5a5" : "1px solid #a7f3d0"
                          }}
                        >
                          {situacao}
                        </span>
                      </div>
                    </div>

                    {/* BLOCO PREDITIVO E HORIMETRO (NEUTRO CORPORATIVO) */}
                    {(() => {
                      const hAtual = Number(maquina.horimetro ?? 0);
                      const ciclo = 250;
                      const proximaRevisao = Math.ceil((hAtual + 1) / ciclo) * ciclo;
                      const horasRestantes = Math.max(0, proximaRevisao - hAtual);
                      const progressoCiclo = Math.min(100, Math.max(0, Math.round(((ciclo - horasRestantes) / ciclo) * 100)));

                      const diasEstimados = Math.max(0, Math.round(horasRestantes / 8));
                      const dataEstimada = new Date();
                      dataEstimada.setDate(dataEstimada.getDate() + diasEstimados);
                      const dataFormatada = dataEstimada.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

                      const isCritico = horasRestantes <= 10;
                      const isAtencao = horasRestantes <= 35 && !isCritico;

                      return (
                        <div
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px"
                          }}
                        >
                          {/* Horimetro e Ajuste Rapido */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Horímetro Atual
                              </span>
                              <div style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>
                                {hAtual.toLocaleString("pt-BR")} <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>h</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => alterarHorimetroManual(maquina)}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#334155",
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                              }}
                            >
                              Ajustar
                            </button>
                          </div>

                          {/* Barra de Progresso da Preventiva */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "5px" }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Próxima ({proximaRevisao}h)</span>
                              <strong style={{ color: isCritico ? "#dc2626" : isAtencao ? "#d97706" : "#2563eb" }}>
                                {horasRestantes === 0 ? "Vencida" : `${horasRestantes}h restantes`}
                              </strong>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${progressoCiclo}%`,
                                  height: "100%",
                                  background: isCritico ? "#dc2626" : isAtencao ? "#f59e0b" : "#2563eb",
                                  borderRadius: "99px",
                                  transition: "width 0.3s ease"
                                }}
                              />
                            </div>
                          </div>

                          {/* Previsao em Dias */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b", paddingTop: "4px", borderTop: "1px dashed #e2e8f0" }}>
                            <span>Previsão (~8h/dia):</span>
                            <strong style={{ color: isCritico ? "#b91c1c" : isAtencao ? "#b45309" : "#334155" }}>
                              ~{diasEstimados} dias ({dataFormatada})
                            </strong>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ACOES OPERACIONAIS */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setMaquinaNovoChamado(maquina.tag);
                            setTela("novoChamado");
                          }}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            background: "#ea580c",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(234, 88, 12, 0.25)"
                          }}
                        >
                          + Abrir OS
                        </button>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setMaquinaDossie(maquina)}
                          style={{
                            padding: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            color: "#334155",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px"
                          }}
                        >
                          📋 Dossiê
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaquinaFichaTecnica(maquina)}
                          style={{
                            padding: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            color: "#334155",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px"
                          }}
                        >
                          ⚙ Peças
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMaquinaRequisicao(maquina)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          color: "#1e40af",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px"
                        }}
                      >
                        📦 Pedido / Lead Time
                      </button>
                    </div>

                    {/* RODAPE ADMINISTRATIVO */}
                    {isAdmin && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "8px",
                          borderTop: "1px solid #f1f5f9"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setMaquinaDesmobilizar(maquina)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#c2410c",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "2px 4px"
                          }}
                        >
                          🚚 Desmobilizar
                        </button>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setMaquinaEmEdicao(maquina);
                              setModalNovaMaquina(true);
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#64748b",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirMaquina(maquina)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            Excluir
                          </button>
                        </div>
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
        {chamadoConcluirAssistido && (
          <ModalConcluirOSAssistido
            chamado={chamadoConcluirAssistido}
            maquina={maquinas.find((m) => m.tag === chamadoConcluirAssistido.maquina)}
            fechar={() => setChamadoConcluirAssistido(null)}
            onSucesso={() => {
              carregarChamados();
              carregarMaquinas();
            }}
          />
        )}
        
      {modalAuditoriaAberto && (
          <ModalAuditoriaHomologacao
            maquinas={maquinas}
            chamados={chamados}
            fechar={() => setModalAuditoriaAberto(false)}
          />
        )}
        {(modalDesmobilizacaoAberto || maquinaDesmobilizar) && (
          <ModalDesmobilizacao
            aberto={Boolean(modalDesmobilizacaoAberto || maquinaDesmobilizar)}
            maquinaPreSelecionada={maquinaDesmobilizar || undefined}
            maquinas={maquinas}
            onFechar={() => {
              setModalDesmobilizacaoAberto(false);
              setMaquinaDesmobilizar(null);
            }}
            onConfirmarDesmobilizacao={async ({ maquinaId, tag, horimetroFinal, emailDestino, condicoes, observacoes }) => {
              try {
                // 1. Atualizar maquina no Supabase
                const { error: errMaq } = await supabase
                  .from("maquinas")
                  .update({
                    horimetro: horimetroFinal,
                    status_maquina: "Parada"
                  })
                  .eq("id", maquinaId);

                if (errMaq) {
                  console.error("Erro no Supabase:", errMaq);
                  throw errMaq;
                }

                // 2. Atualizar estado local da aplicacao
                setMaquinas((prev) =>
                  prev.map((m) =>
                    m.id === maquinaId
                      ? {
                          ...m,
                          horimetro: horimetroFinal,
                          status_maquina: "Parada"
                        }
                      : m
                  )
                );

                // 3. Disparar notificacao por e-mail para o Resend
                const targetEmail = emailDestino || "jpsf016@gmail.com";
                try {
                  const resposta = await fetch("/api/desmobilizar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      tag,
                      horimetroFinal,
                      condicoes,
                      observacoes,
                      emailDestino: targetEmail
                    })
                  });
                  if (!resposta.ok) {
                    const errData = await resposta.json().catch(() => ({}));
                    console.warn("Aviso no envio de e-mail:", errData);
                  }
                } catch (eMail) {
                  console.warn("Falha de rede ao acionar API de e-mail:", eMail);
                }

                alert("Desmobilização concluída com sucesso!");
                setModalDesmobilizacaoAberto(false);
                setMaquinaDesmobilizar(null);
              } catch (err) {
                console.error("Falha ao salvar desmobilizacao:", err);
                throw err;
              }
            }}
          />
        )}
        {maquinaRequisicao && (
          <ModalRequisicaoCompras
            maquina={maquinaRequisicao}
            fechar={() => setMaquinaRequisicao(null)}
          />
        )}
        {maquinaFichaTecnica && (
          <ModalFichaTecnica
            maquina={maquinaFichaTecnica}
            fechar={() => setMaquinaFichaTecnica(null)}
            isAdmin={isAdmin}
          />
        )}
        {maquinaDossie && (
          <div style={estilos.modalOverlay}>
            <div style={{ ...estilos.modalCard, width: isMobile ? "95vw" : "100%", maxWidth: "750px", maxHeight: "88vh", overflowY: "auto", padding: isMobile ? "16px" : "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ background: "#0f172a", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px" }}>
                      {maquinaDossie.tag}
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Prontuário & Histórico</span>
                  </div>
                  <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", color: "#0f172a" }}>
                    {maquinaDossie.marca} {maquinaDossie.modelo}
                  </h3>
                </div>
                <button onClick={() => setMaquinaDossie(null)} style={estilos.botaoFecharModal}>✕</button>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                <button onClick={() => gerarPdfDossie(maquinaDossie)} style={{ ...estilos.botaoNovoSubmit, flex: 1, minWidth: "180px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  📄 Emitir Prontuário em PDF
                </button>
                <button onClick={() => { setMaquinaRequisicao(maquinaDossie); setMaquinaDossie(null); }} style={{ ...estilos.botaoNovoSubmit, background: "#ca8a04", flex: 1, minWidth: "180px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  📦 Abrir Requisição de Peças
                </button>
              </div>

              {/* Resumo Operacional */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>HORÍMETRO ATUAL</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{maquinaDossie.horimetro ?? 0} h</div>
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>TURNO ESTIMADO</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0284c7" }}>8 h/dia</div>
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>TOTAL ORDENS / OS</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#d97706" }}>
                    {chamados.filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag)).length}
                  </div>
                </div>
              </div>

              {/* Tabela de Histórico de Horímetros (leituras_horimetro) */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#334155", fontWeight: 800, textTransform: "uppercase" }}>
                  ⏱️ Últimos Apontamentos de Horímetro
                </h4>
                {carregandoLeituras ? (
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Buscando leituras...</p>
                ) : leiturasDossie.length === 0 ? (
                  <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
                    Nenhum apontamento registrado ainda no histórico. Novos ajustes manuais e medições em campo aparecerão aqui.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "#475569" }}>DATA/HORA</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "#475569" }}>HORÍMETRO</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "#475569" }}>APONTADOR / USUÁRIO</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "#475569" }}>ORIGEM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leiturasDossie.map((lei) => (
                          <tr key={lei.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 10px", color: "#334155" }}>
                              {new Date(lei.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td style={{ padding: "8px 10px", fontWeight: 800, color: "#0f172a" }}>
                              {lei.horimetro} h
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {lei.operador_nome || "Sistema / Ajuste"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#64748b", textTransform: "capitalize" }}>
                              {lei.origem ? lei.origem.replace("_", " ") : "Manual"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Lista Rápida de Chamados / O.S. Recentes */}
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#334155", fontWeight: 800, textTransform: "uppercase" }}>
                  🛠️ Histórico de Chamados & Manutenções
                </h4>
                {(() => {
                  const chams = chamados.filter((c) => normalizarTexto(c.maquina) === normalizarTexto(maquinaDossie.tag));
                  if (chams.length === 0) {
                    return (
                      <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
                        Nenhuma ordem de serviço ou chamado registrado para esta máquina.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {chams.slice(0, 5).map((c) => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", fontSize: "12px" }}>
                          <div>
                            <span style={{ fontWeight: 800, color: "#0f172a", marginRight: "6px" }}>OS #{c.id}</span>
                            <span style={{ color: "#475569" }}>{c.titulo || c.descricao?.substring(0, 45) || "Manutenção"}</span>
                          </div>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: c.status === "Concluído" ? "#dcfce7" : "#fee2e2",
                            color: c.status === "Concluído" ? "#15803d" : "#b91c1c"
                          }}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                    <button onClick={() => { setMaquinaNovoChamado(''); setFotoNovoChamado(''); setTela('novoChamado'); }} style={estilos.botaoNovo}>
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
                  chamadosFiltrados.map((c) => {
                    const fotoChamado = localStorage.getItem(`controlmaq_foto_${c.id}`);
                    return (
                      <div 
                      key={c.id} 
                      style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
                        padding: "16px",
                        marginBottom: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        textAlign: "left"
                      }}
                    >
                      {/* Topo: TAG, ID e Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
                            {c.maquina}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                            #{c.id}
                          </span>
                        </div>
                        
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          background: c.status === "Assumido" ? "#fef3c7" : c.status === "Finalizado" ? "#dcfce7" : "#e0f2fe",
                          color: c.status === "Assumido" ? "#92400e" : c.status === "Finalizado" ? "#166534" : "#0369a1",
                          border: `1px solid ${c.status === "Assumido" ? "#fde68a" : c.status === "Finalizado" ? "#bbf7d0" : "#bae6fd"}`
                        }}>
                          {c.status}
                        </span>
                      </div>

                      {/* Problema / Falha */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <AlertTriangle size={15} color="#d97706" style={{ marginTop: "2px", flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#334155", lineHeight: "1.4" }}>
                          {c.problema}
                        </p>
                      </div>

                      {/* Foto / Evidencia se houver */}
                      {fotoChamado && (
                        <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", maxHeight: "140px" }}>
                          <img src={fotoChamado} alt="Evidência" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}

                      {/* Box cinza com Dados Tecnicos e Local */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div 
                          onClick={() => {
                            if (c.local) {
                              window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.local), "_blank");
                            }
                          }}
                          title="Abrir rota no Google Maps"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            color: "#0284c7",
                            cursor: c.local ? "pointer" : "default",
                            fontWeight: 500
                          }}
                        >
                          <MapPin size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                          <span style={{ textDecoration: c.local ? "underline" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.local || "Sem local informado"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                          <User size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                          <span>Solicitante: <strong style={{ color: "#334155" }}>{c.solicitante || "N/A"}</strong></span>
                        </div>

                        {isAdmin && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                            <Wrench size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>Mecânico: <strong style={{ color: "#334155" }}>{c.mecanico || "Não designado"}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Barra de Acoes Profissional */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                        <button 
                          type="button"
                          onClick={() => { setChamadoDetalhes(c); setTela("detalhesChamado"); }}
                          style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            height: "36px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer"
                          }}
                        >
                          <Eye size={15} /> Ver
                        </button>

                        {c.status === "Assumido" && (
                          <button 
                            type="button"
                            onClick={() => abrirTelaFinalizar(c.id)}
                            style={{
                              flex: 1.3,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              height: "36px",
                              background: "#16a34a",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#ffffff",
                              cursor: "pointer"
                            }}
                          >
                            <CheckCircle2 size={15} /> Concluir OS
                          </button>
                        )}

                        {isAdmin && c.status === "Aberto" && (
                          <button 
                            type="button"
                            onClick={() => designarMecanicoAdmin(c.id)}
                            style={{
                              flex: 1.3,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              height: "36px",
                              background: "#0284c7",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#ffffff",
                              cursor: "pointer"
                            }}
                          >
                            <Wrench size={15} /> Designar
                          </button>
                        )}

                        {c.status === "Finalizado" && (
                          <button 
                            type="button"
                            onClick={() => gerarPdfChamado(c)}
                            style={{
                              flex: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              height: "36px",
                              background: "#0f172a",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#ffffff",
                              cursor: "pointer"
                            }}
                          >
                            <FileText size={15} /> PDF
                          </button>
                        )}

                        <button 
                          type="button"
                          onClick={() => abrirEdicaoChamado(c)}
                          title="Editar Chamado"
                          style={{
                            width: "36px",
                            height: "36px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            color: "#475569",
                            cursor: "pointer"
                          }}
                        >
                          <Pencil size={15} />
                        </button>

                        <button 
                          type="button"
                          onClick={() => compartilharChamadoWhatsApp(c)}
                          title="Compartilhar via WhatsApp com rota"
                          style={{
                            width: "36px",
                            height: "36px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#25D366",
                            border: "none",
                            borderRadius: "6px",
                            color: "#ffffff",
                            cursor: "pointer"
                          }}
                        >
                          <Share2 size={15} />
                        </button>

                        {isAdmin && (
                          <button 
                            type="button"
                            onClick={() => excluirChamado(c)}
                            title="Excluir Chamado"
                            style={{
                              width: "36px",
                              height: "36px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#fef2f2",
                              border: "1px solid #fee2e2",
                              borderRadius: "6px",
                              color: "#ef4444",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Modal de Edicao embutido */}
                      {modalEditarChamadoAberto && chamadoEdicao && chamadoEdicao.id === c.id && (
                        <div 
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(15, 23, 42, 0.75)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 99999,
                            padding: "16px",
                            boxSizing: "border-box"
                          }}
                        >
                          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "480px", padding: "20px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                                Editar Ordem de Serviço #{chamadoEdicao.id}
                              </h3>
                              <button 
                                type="button" 
                                onClick={() => setModalEditarChamadoAberto(false)}
                                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}
                              >
                                ✕
                              </button>
                            </div>

                            <form onSubmit={salvarEdicaoChamado} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Equipamento / TAG</label>
                                <input 
                                  type="text" 
                                  value={chamadoEdicao.maquina || ""} 
                                  onChange={(e) => setChamadoEdicao({ ...chamadoEdicao, maquina: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                                  required
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Descrição da Falha</label>
                                <textarea 
                                  rows={2}
                                  value={chamadoEdicao.problema || ""} 
                                  onChange={(e) => setChamadoEdicao({ ...chamadoEdicao, problema: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                                  required
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Localização / Endereço</label>
                                <input 
                                  type="text" 
                                  value={chamadoEdicao.local || ""} 
                                  onChange={(e) => setChamadoEdicao({ ...chamadoEdicao, local: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Solicitante</label>
                                <input 
                                  type="text" 
                                  value={chamadoEdicao.solicitante || ""} 
                                  onChange={(e) => setChamadoEdicao({ ...chamadoEdicao, solicitante: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Mecânico Designado</label>
                                <input 
                                  type="text" 
                                  value={chamadoEdicao.mecanico || ""} 
                                  onChange={(e) => setChamadoEdicao({ ...chamadoEdicao, mecanico: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                                />
                              </div>

                              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                                <button 
                                  type="button" 
                                  onClick={() => setModalEditarChamadoAberto(false)}
                                  style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="submit"
                                  style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "#0284c7", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                                >
                                  Salvar Alterações
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            )}

            {modoVisualizacao === "kanban" && (
              <KanbanOrdensServico
                chamados={chamadosVisiveis}
                isAdmin={isAdmin} isMecanico={isMecanico}
                onAbrirDetalhes={(c) => {
                  setChamadoDetalhes(c);
                  setTela("detalhesChamado");
                }}
                onAssumirChamado={(c) => {
                  if (isAdmin) {
                    designarMecanicoAdmin(c.id);
                  } else {
                    assumirChamado(c);
                  }
                }}
                onFinalizarChamado={(c) => setChamadoConcluirAssistido(c)}
              />
            )}
          </div>
        )}

        {/* TELA 4: NOVO CHAMADO */}
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

              <label style={estilos.label}>Foto do Defeito / Evidência</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => converterImagemParaBase64(e, setFotoNovoChamado)}
                style={{ ...estilos.input, padding: '4px' }}
              />
              {fotoNovoChamado && (
                <div style={{ marginTop: '6px' }}>
                  <img src={fotoNovoChamado} alt="Pré-visualização" style={{ maxHeight: '100px', borderRadius: '6px' }} />
                </div>
              )}

              <button type="submit" style={{ ...estilos.botaoNovoSubmit, marginTop: '14px' }} disabled={salvando}>
                {salvando ? 'A gravar...' : 'Confirmar'}
              </button>
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
              <input name="pecasUtilizadas" placeholder="Ex: Mangueira hidráulica 1/2, Óleo 68..." style={estilos.input} />

              <label style={estilos.label}>Foto do Serviço Concluído / Peça Nova</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => converterImagemParaBase64(e, setFotoFinalizacao)}
                style={{ ...estilos.input, padding: '4px' }}
              />
              {fotoFinalizacao && (
                <div style={{ marginTop: '6px' }}>
                  <img src={fotoFinalizacao} alt="Pré-visualização" style={{ maxHeight: '100px', borderRadius: '6px' }} />
                </div>
              )}

              <label style={{ ...estilos.label, marginTop: '12px' }}>Assinatura Digital (Técnico / Responsável)</label>
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
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => {
                  const m = maquinas.find((x) => x.tag === chamadoDetalhes.maquina);
                  imprimirOuSalvarLaudoTecnico(chamadoDetalhes, m);
                }}
                style={{ ...estilos.botaoNovoSubmit, background: "#0f172a" }}
              >
                🖨 Imprimir / Salvar Laudo Técnico
              </button>
              <button
                type="button"
                onClick={() => gerarPdfChamado(chamadoDetalhes)}
                style={estilos.botaoNovoSubmit}
              >
                📄 PDF Resumido
              </button>
            </div>
          </div>
        )}

        {/* TELA 7: HORÍMETROS */}
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
                    <span className={`cm-badge ${p.status_preventiva === 'Vencida' ? 'badge-op-parada' : p.status_preventiva === 'Urgente' ? 'badge-assumido' : 'badge-op-operacional'}`}>
                      {p.status_preventiva}
                    </span>
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

        {/* MODAL CONFIGURAR PREVENTIVA */}
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

        {/* TELA 9: UTILIZADORES */}
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

        {/* TELA 10: NOVO UTILIZADOR */}
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
      
        {/* MODAL_BUSCA_GLOBAL_START */}
        {modalBuscaGlobalAberto && (
          <div
            onClick={() => setModalBuscaGlobalAberto(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 999999,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: isMobile ? "20px 12px" : "60px 16px",
              boxSizing: "border-box",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "600px",
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.15s ease-out",
              }}
            >
              {/* Barra de entrada de pesquisa */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 18px",
                  borderBottom: "1px solid #f1f5f9",
                  gap: "12px",
                  background: "#ffffff",
                }}
              >
                <Search size={20} color="#0284c7" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar máquina, TAG, OS, cliente ou problema..."
                  value={termoBuscaGlobal}
                  onChange={(e) => setTermoBuscaGlobal(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#0f172a",
                    background: "transparent",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setModalBuscaGlobalAberto(false)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  ESC
                </button>
              </div>

              {/* Lista com scroll dos resultados */}
              <div style={{ maxHeight: "380px", overflowY: "auto", padding: "10px" }}>
                {/* Seção 1: Ordens de Serviço */}
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", padding: "6px 8px 4px" }}>
                  Ordens de Serviço ({chamados.filter((c: any) => !termoBuscaGlobal || String(c.id).includes(termoBuscaGlobal) || (c.maquina && c.maquina.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) || (c.problema && c.problema.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) || (c.solicitante && c.solicitante.toLowerCase().includes(termoBuscaGlobal.toLowerCase()))).length})
                </div>

                {chamados
                  .filter((c: any) =>
                    !termoBuscaGlobal ||
                    String(c.id).includes(termoBuscaGlobal) ||
                    (c.maquina && c.maquina.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) ||
                    (c.problema && c.problema.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) ||
                    (c.solicitante && c.solicitante.toLowerCase().includes(termoBuscaGlobal.toLowerCase()))
                  )
                  .slice(0, 6)
                  .map((c: any) => (
                    <div
                      key={"os-" + c.id}
                      onClick={() => {
                        setChamadoDetalhes(c);
                        setTela("detalhesChamado");
                        setModalBuscaGlobalAberto(false);
                        setTermoBuscaGlobal("");
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        marginBottom: "4px",
                        border: "1px solid transparent",
                        background: "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                          OS #{c.id} — {c.maquina}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {c.problema || "Sem descrição"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: c.status === "Concluído" ? "#dcfce7" : c.status === "Em Andamento" ? "#fef3c7" : "#e0f2fe",
                          color: c.status === "Concluído" ? "#15803d" : c.status === "Em Andamento" ? "#b45309" : "#0369a1",
                          whiteSpace: "nowrap",
                          marginLeft: "12px",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}

                {/* Seção 2: Frota de Máquinas */}
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", padding: "12px 8px 4px" }}>
                  Frota de Máquinas ({maquinas.filter((m: any) => !termoBuscaGlobal || (m.tag && m.tag.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) || (m.modelo && m.modelo.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) || (m.cliente && m.cliente.toLowerCase().includes(termoBuscaGlobal.toLowerCase()))).length})
                </div>

                {maquinas
                  .filter((m: any) =>
                    !termoBuscaGlobal ||
                    (m.tag && m.tag.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) ||
                    (m.modelo && m.modelo.toLowerCase().includes(termoBuscaGlobal.toLowerCase())) ||
                    (m.cliente && m.cliente.toLowerCase().includes(termoBuscaGlobal.toLowerCase()))
                  )
                  .slice(0, 6)
                  .map((m: any) => (
                    <div
                      key={"maq-" + m.id}
                      onClick={() => {
                        setTela("maquinas");
                        setModalBuscaGlobalAberto(false);
                        setTermoBuscaGlobal("");
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        marginBottom: "4px",
                        border: "1px solid transparent",
                        background: "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                          🚜 {m.tag || m.nome} — {m.modelo || "Equipamento"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          Cliente: {m.cliente || "Pátio"} · Horímetro: <strong>{m.horimetro_atual || m.horimetro || 0} h</strong>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Ver Frota
                      </span>
                    </div>
                  ))}
              </div>

              {/* Rodapé informativo */}
              <div
                style={{
                  padding: "10px 16px",
                  background: "#f8fafc",
                  borderTop: "1px solid #f1f5f9",
                  fontSize: "11px",
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Navegue e clique para abrir os detalhes</span>
                <span>Pressione <strong>ESC</strong> para sair</span>
              </div>
            </div>
          </div>
        )}
        {/* MODAL_BUSCA_GLOBAL_END */}

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

  onAbrirBusca?: () => void; }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const isAdmin = props.usuario?.tipo === "admin";
  const isMecanico = props.usuario?.tipo === "mecanico";

  const itens = [
    { tela: "dashboard" as const, label: "Painel", icon: LayoutDashboard },
    { tela: "maquinas" as const, label: "Equipamentos", icon: Wrench },
    { tela: "chamados" as const, label: "Ordens de serviço", icon: ClipboardList },
    { tela: "preventivas" as const, label: "Preventivas", icon: CalendarClock },
    { tela: "horimetros" as const, label: "Horímetro", icon: Gauge },
    ...(isAdmin ? [{ tela: "usuarios" as const, label: "Utilizadores", icon: Users }] : []),
  ];

  return (
    <>
      {props.isMobile && menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 49,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <aside 
        className={`controlmaq-desktop-sidebar ${menuAberto ? "controlmaq-sidebar-open" : ""}`} 
        style={{
          ...estilos.sidebar,
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)"
        }}
      >
        {/* Header ti Sidebar */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.4)"
            }}>
              <Wrench size={20} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>Manutenção</span>
              <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.8px", color: "#94a3b8" }}>EQUIPAMENTOS E MÁQUINAS</span>
            </div>
          </div>
          {props.isMobile && (
            <button
              onClick={() => setMenuAberto(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Listaan ti Menus */}
        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {itens.map((item) => {
            const Icon = item.icon;
            const activo = props.tela === item.tela;
            return (
              <button
                key={item.tela}
                onClick={() => { props.onNavigate(item.tela); setMenuAberto(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: activo ? 700 : 500,
                  color: activo ? "#ffffff" : "#94a3b8",
                  background: activo ? "rgba(30, 41, 59, 0.85)" : "transparent",
                  borderLeft: activo ? "3px solid #ea580c" : "3px solid transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  borderRadius: "0 8px 8px 0",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={18} color={activo ? "#ea580c" : "#94a3b8"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Perfil do Usuário e Logout */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #1e293b", background: "#0b1120", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {props.usuario?.nome || "João Pedro"}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {props.usuario?.login ? (props.usuario.login.includes("@") ? props.usuario.login : props.usuario.login + "@mecanica.com") : "jpsf016@gmail.com"}
            </span>
          </div>
          <button 
            onClick={props.onSair}
            title="Sair"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <header
        className="controlmaq-topbar"
        style={{
          ...estilos.topo,
          left: props.isMobile ? 0 : "260px",
          width: props.isMobile ? "100%" : "calc(100% - 260px)",
          padding: props.isMobile ? "0 16px" : "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

            {props.onAbrirBusca && !props.isMobile && (
              <button
                type="button"
                onClick={props.onAbrirBusca}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  cursor: "pointer"
                }}
              >
                <Search size={14} color="#94a3b8" />
                <span>Pesquisa rápida...</span>
                <kbd style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#cbd5e1"
                }}>Ctrl K</kbd>
              </button>
            )}
  

            
  
          {props.isMobile && (
            <button onClick={() => setMenuAberto(!menuAberto)} style={estilos.botaoMenuMobile}>☰</button>
          )}
          {props.isMobile ? (
            <span style={{ fontWeight: 900, color: "#f59e0b", fontSize: "16px" }}>Ge-Nio Mechaniq</span>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                background: "#1e293b",
                color: "#f59e0b",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "1px",
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #334155"
              }}>
                CONSOLE OPERACIONAL
              </span>
              <span style={{ color: "#475569", fontSize: "12px" }}>//</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                MONITORAMENTO DE FROTA & MANUTENÇÃO
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!props.isMobile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#1e293b",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid #334155",
              fontSize: "11px",
              color: "#94a3b8"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              OPERADOR: <strong style={{ color: "#f8fafc", textTransform: "uppercase" }}>{props.usuario?.nome || props.usuario?.tipo || "ADMIN"}</strong>
            </div>
          )}
          <StatusConexao />
        </div>
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
