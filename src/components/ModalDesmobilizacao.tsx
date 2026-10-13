import { useState, useEffect } from 'react';
import type { Maquina } from '../types/controlmaq';

interface ModalDesmobilizacaoProps {
  aberto: boolean;
  onFechar: () => void;
  maquinas: Maquina[];
  maquinaPreSelecionada?: Maquina | null;
  onConfirmarDesmobilizacao: (dados: {
    maquinaId: any;
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
  maquinaPreSelecionada,
  onConfirmarDesmobilizacao,
}: ModalDesmobilizacaoProps) {
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState<string>('');
  const [horimetroFinal, setHorimetroFinal] = useState<number | ''>('');
  const [emailDestino, setEmailDestino] = useState('jpsf016@gmail.com');
  const [condicoes, setCondicoes] = useState('Sem avarias aparentes / Em boas condições');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (maquinaPreSelecionada) {
      setMaquinaSelecionadaId(String(maquinaPreSelecionada.id));
      const h = maquinaPreSelecionada.horimetro ?? maquinaPreSelecionada.horimetro_atual ?? '';
      setHorimetroFinal(h !== '' ? Number(h) : '');
    }
  }, [maquinaPreSelecionada, aberto]);

  if (!aberto) return null;

  const maquina = maquinas.find((m) => String(m.id) === String(maquinaSelecionadaId));

  const handleSelecionarMaquina = (id: string) => {
    setMaquinaSelecionadaId(id);
    const m = maquinas.find((item) => String(item.id) === String(id));
    if (m) {
      const h = m.horimetro ?? m.horimetro_atual ?? '';
      setHorimetroFinal(h !== '' ? Number(h) : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maquinaSelecionadaId || horimetroFinal === '') {
      alert('Por favor, selecione a máquina e informe o horímetro final.');
      return;
    }

    setEnviando(true);
    try {
      await onConfirmarDesmobilizacao({
        maquinaId: maquinaSelecionadaId,
        tag: maquina ? `${maquina.nome || ''} (${maquina.tag || maquina.modelo || ''})`.trim() : 'Equipamento',
        horimetroFinal: Number(horimetroFinal),
        emailDestino: emailDestino.trim() || 'jpsf016@gmail.com',
        condicoes,
        observacoes,
      });
      onFechar();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar: ' + (err?.message || 'Falha na operação'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            📦 Desmobilização de Equipamento
          </h2>
          <button
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Equipamento *
            </label>
            <select
              value={maquinaSelecionadaId}
              onChange={(e) => handleSelecionarMaquina(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                background: '#fff',
              }}
              required
            >
              <option value="">Selecione o equipamento...</option>
              {maquinas.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.nome} - {m.modelo || m.tag || 'Sem Tag'} ({m.status_maquina || 'Disponível'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Horímetro Final no Retorno ao Pátio *
            </label>
            <input
              type="number"
              value={horimetroFinal}
              onChange={(e) => setHorimetroFinal(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 1699"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Condições de Devolução
            </label>
            <select
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                background: '#fff',
              }}
            >
              <option value="Sem avarias aparentes / Em boas condições">Sem avarias aparentes / Em boas condições</option>
              <option value="Necessita de lavagem e lubrificação">Necessita de lavagem e lubrificação</option>
              <option value="Necessita de manutenção corretiva">Necessita de manutenção corretiva</option>
              <option value="Avarias em implementos / pneus / esteiras">Avarias em implementos / pneus / esteiras</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Notificação por E-mail
            </label>
            <input
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              placeholder="jpsf016@gmail.com"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Observações Adicionais
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva detalhes do pátio, pendências de peças, limpeza, etc."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
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
                background: '#f1f5f9',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
                cursor: enviando ? 'not-allowed' : 'pointer',
              }}
            >
              {enviando ? 'A processar...' : 'Confirmar Retorno ao Pátio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
