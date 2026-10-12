import { useState } from 'react';
import type { Maquina } from '../types/controlmaq';

interface ModalDesmobilizacaoProps {
  aberto: boolean;
  onFechar: () => void;
  maquinas: Maquina[];
  onConfirmarDesmobilizacao: (dados: {
    maquinaId: string;
    tag: string;
    horimetroFinal: number;
    emailDestino: string;
    condicoes: string;
    observacoes: string;
  }) => Promise<void>;
}

export function ModalDesmobilizacao({
  aberto,
  onFechar,
  maquinas,
  onConfirmarDesmobilizacao,
}: ModalDesmobilizacaoProps) {
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState('');
  const [horimetroFinal, setHorimetroFinal] = useState<number | ''>('');
  const [emailDestino, setEmailDestino] = useState('');
  const [condicoes, setCondicoes] = useState('Sem avarias aparentes / Em boas condições');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!aberto) return null;

  const maquina = maquinas.find((m) => m.id === maquinaSelecionadaId);

  const handleSelecionarMaquina = (id: string) => {
    setMaquinaSelecionadaId(id);
    const m = maquinas.find((item) => item.id === id);
    if (m) {
      setHorimetroFinal(m.horimetro ?? m.horimetro_atual ?? 0);
    }
  };

  const dispararEmail = (tag: string, modelo: string, horimetro: number) => {
    const dataHora = new Date().toLocaleString('pt-BR');
    const assunto = encodeURIComponent(`[DESMOBILIZAÇÃO] Encerramento e Devolução de Máquina - TAG ${tag}`);
    const corpo = encodeURIComponent(`COMUNICADO OFICIAL DE DESMOBILIZAÇÃO DE EQUIPAMENTO
Ge-Nio Mechaniq Fleet Operations
Data/Hora: ${dataHora}

DADOS DO ATIVO:
- TAG: ${tag}
- Equipamento / Modelo: ${modelo}
- Horímetro Final de Devolução: ${horimetro}h
- Condições de Devolução: ${condicoes}

OBSERVAÇÕES TÉCNICAS:
${observacoes || 'Nenhuma ressalva técnica informada.'}

A desmobilização foi registrada no sistema. Favor acusar o recebimento e confirmar a liberação para vistoria de pátio.`);

    const url = `mailto:${emailDestino}?subject=${assunto}&body=${corpo}`;
    window.open(url, '_blank');
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maquina) {
      alert('Selecione uma máquina para desmobilizar.');
      return;
    }
    if (horimetroFinal === '') {
      alert('Informe o horímetro final de devolução.');
      return;
    }

    setEnviando(true);
    try {
      await onConfirmarDesmobilizacao({
        maquinaId: maquina.id,
        tag: maquina.tag,
        horimetroFinal: Number(horimetroFinal),
        emailDestino,
        condicoes,
        observacoes,
      });

      if (emailDestino.trim()) {
        dispararEmail(maquina.tag, `${maquina.marca || ''} ${maquina.modelo || ''}`.trim(), Number(horimetroFinal));
      }

      alert(`Máquina ${maquina.tag} desmobilizada com sucesso!`);
      onFechar();
    } catch (err: any) {
      alert(`Erro ao registrar desmobilização: ${err.message || 'Falha na operação'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        maxWidth: '560px',
        width: '100%',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
              GESTÃO DE DEVOLUÇÃO // FROTA
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              Desmobilização & Notificação
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Selecionar Máquina a Desmobilizar:
            </label>
            <select
              value={maquinaSelecionadaId}
              onChange={(e) => handleSelecionarMaquina(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="">Selecione um equipamento...</option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  TAG: {m.tag} — {m.marca} {m.modelo} (Atual: {m.horimetro ?? m.horimetro_atual ?? 0}h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Horímetro Final no Encerramento (h):
            </label>
            <input
              type="number"
              step="0.1"
              value={horimetroFinal}
              onChange={(e) => setHorimetroFinal(e.target.value === '' ? '' : Number(e.target.value))}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              E-mail para Notificação (Cliente / Fiscal de Contrato):
            </label>
            <input
              type="email"
              placeholder="exemplo@obra.com.br, encarregado@locacao.com"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Checklist / Condições do Equipamento:
            </label>
            <select
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <option value="Sem avarias aparentes / Em boas condições">Sem avarias aparentes / Em boas condições</option>
              <option value="Necessita limpeza pesada e lavagem de pátio">Necessita limpeza pesada e lavagem de pátio</option>
              <option value="Com avarias mecânicas / estruturais apontadas">Com avarias mecânicas / estruturais apontadas</option>
              <option value="Parada por manutenção pendente">Parada por manutenção pendente</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Observações Técnicas / Peças Faltantes:
            </label>
            <textarea
              rows={3}
              placeholder="Descreva detalhes como nível de combustível, pneus/esteiras ou peças que ficaram pendentes..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onFechar}
              disabled={enviando}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: '#f59e0b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {enviando ? 'Processando...' : 'Confirmar & Notificar E-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
