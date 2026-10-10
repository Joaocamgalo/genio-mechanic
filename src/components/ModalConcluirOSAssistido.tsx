import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Chamado, Maquina, ItemManutencaoPreventiva } from '../types/controlmaq';

interface ModalConcluirOSAssistidoProps {
  chamado: Chamado;
  maquina?: Maquina | null;
  fechar: () => void;
  onSucesso: () => void;
}

export function ModalConcluirOSAssistido({
  chamado,
  maquina,
  fechar,
  onSucesso,
}: ModalConcluirOSAssistidoProps) {
  const horimetroBase = maquina?.horimetro ?? 0;
  const [horimetroFinal, setHorimetroFinal] = useState<number>(horimetroBase);
  const [diagnostico, setDiagnostico] = useState(chamado.diagnostico_tecnico || '');
  const [solucao, setSolucao] = useState(chamado.solucao || '');
  const [itensFicha, setItensFicha] = useState<ItemManutencaoPreventiva[]>([]);
  const [itensAplicados, setItensAplicados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarItens() {
      if (!maquina?.id) return;
      try {
        const { data } = await supabase
          .from('itens_manutencao_preventiva')
          .select('*')
          .eq('maquina_id', maquina.id);
        if (data) setItensFicha(data);
      } catch (err) {
        console.error('Erro ao buscar itens de preventiva:', err);
      }
    }
    carregarItens();
  }, [maquina?.id]);

  function toggleItem(nome: string) {
    setItensAplicados((prev) =>
      prev.includes(nome) ? prev.filter((i) => i !== nome) : [...prev, nome]
    );
  }

  async function handleConcluir(e: React.FormEvent) {
    e.preventDefault();
    if (horimetroFinal < horimetroBase) {
      if (!confirm(`Atenção: O horímetro informado (${horimetroFinal}h) é menor que o atual da máquina (${horimetroBase}h). Deseja continuar mesmo assim?`)) {
        return;
      }
    }

    setSalvando(true);
    try {
      const solucaoCompleta = [
        solucao.trim(),
        itensAplicados.length > 0 ? `\n[Peças/Filtros Aplicados: ${itensAplicados.join(', ')}]` : '',
        `[Horímetro no Fechamento: ${horimetroFinal}h]`
      ].filter(Boolean).join('\n');

      // 1. Atualizar chamado
      const { error: errChamado } = await supabase
        .from('chamados')
        .update({
          status: 'Finalizado',
          diagnostico_tecnico: diagnostico.trim() || null,
          solucao: solucaoCompleta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chamado.id);

      if (errChamado) throw errChamado;

      // 2. Atualizar máquina se o horímetro avançou
      if (maquina?.id && horimetroFinal >= horimetroBase) {
        await supabase
          .from('maquinas')
          .update({ horimetro: horimetroFinal })
          .eq('id', maquina.id);

        await supabase
          .from('leituras_horimetro')
          .insert({
            maquina_id: maquina.id,
            horimetro: horimetroFinal,
            observacao: `Fechamento OS #${chamado.id}`
          });
      }

      onSucesso();
      fechar();
    } catch (err: any) {
      alert('Erro ao concluir OS: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '92vh',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #16a34a',
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 800, textTransform: 'uppercase' }}>
              FECHAMENTO TÉCNICO // CONCLUSÃO DE OS
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
              OS #{chamado.id} — {chamado.maquina}
            </h3>
          </div>
          <button
            onClick={fechar}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConcluir} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Horímetro */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
              HORÍMETRO ATUALIZADO NA ENTREGA TÉCNICA (HORAS) *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                step="0.1"
                required
                value={horimetroFinal}
                onChange={(e) => setHorimetroFinal(Number(e.target.value))}
                style={{
                  width: '140px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Último registro em sistema: <strong>{horimetroBase}h</strong>
              </span>
            </div>
          </div>

          {/* Checklist de Peças e Filtros */}
          {itensFicha.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                CONSUMÍVEIS / FILTROS APLICADOS NESTE ATENDIMENTO
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {itensFicha.map((item) => {
                  const labelItem = `${item.componente} (${item.codigo_original || item.equivalente_mann || item.intervalo_horas + 'h'})`;
                  const selecionado = itensAplicados.includes(labelItem);
                  return (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        background: selecionado ? '#dcfce7' : '#ffffff',
                        border: selecionado ? '1px solid #86efac' : '1px solid #cbd5e1',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: selecionado ? 700 : 500
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => toggleItem(labelItem)}
                      />
                      <span>{labelItem}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Diagnóstico */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
              DIAGNÓSTICO TÉCNICO (O que foi constatado em campo)
            </label>
            <textarea
              rows={2}
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Ex: Identificado desgaste na vedação do filtro e folga nos pinos de fixação..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>

          {/* Solução Final */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
              SOLUÇÃO EFETUADA / TESTES DE LIBERAÇÃO *
            </label>
            <textarea
              rows={3}
              required
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              placeholder="Ex: Realizada troca de filtros, abastecido óleo 15W40, máquina testada sob pressão por 20 minutos sem vazamentos."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={fechar}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
            >
              {salvando ? 'Concluindo...' : '✓ Finalizar & Liberar Máquina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
