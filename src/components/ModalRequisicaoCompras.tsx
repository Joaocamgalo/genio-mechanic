import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Maquina, ItemManutencaoPreventiva } from '../types/controlmaq';

interface ModalRequisicaoComprasProps {
  maquina: Maquina | null;
  fechar: () => void;
}

export function ModalRequisicaoCompras({ maquina, fechar }: ModalRequisicaoComprasProps) {
  const [itens, setItens] = useState<ItemManutencaoPreventiva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cicloSelecionado, setCicloSelecionado] = useState<number>(500);
  const [leadTimeDias, setLeadTimeDias] = useState<number>(20);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!maquina) return;
    async function carregar() {
      setCarregando(true);
      try {
        const { data } = await supabase
          .from('itens_manutencao_preventiva')
          .select('*')
          .eq('maquina_id', maquina?.id)
          .order('intervalo_horas', { ascending: true });
        setItens(data || []);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [maquina]);

  if (!maquina) return null;

  const itensDoCiclo = itens.filter((i) => i.intervalo_horas === cicloSelecionado);

  const textoRequisicao = `*REQUISIÇÃO DE PEÇAS & CONSUMÍVEIS - GE-NIO MECHANIQ*
----------------------------------------
*Equipamento:* ${maquina.tag} (${maquina.marca} ${maquina.modelo})
*Horímetro Atual:* ${maquina.horimetro ?? 0} h
*Revisão Alvo:* ${cicloSelecionado} h
*Lead Time Estimado:* ${leadTimeDias} dias
----------------------------------------
*ITENS / EQUIVALÊNCIAS REQUISITADAS:*
${itensDoCiclo.length === 0 ? '- Nenhum item cadastrado para este ciclo.' : itensDoCiclo.map((item, idx) => `
${idx + 1}. *${item.componente}*
   - OEM (Original): ${item.codigo_original || 'N/D'}
   - Mann Filter: ${item.equivalente_mann || 'N/D'}
   - Donaldson: ${item.equivalente_donaldson || 'N/D'}
   - Baldwin/Racor: ${item.equivalente_baldwin || item.equivalente_racor || 'N/D'}
   - Capacidade/Especificação: ${item.capacidade_oleo || 'N/D'}
`).join('')}
----------------------------------------
Emitido via Ge-Nio Mechaniq Management System`;

  function copiarTexto() {
    navigator.clipboard.writeText(textoRequisicao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function enviarWhatsApp() {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoRequisicao)}`;
    window.open(url, '_blank');
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
        maxWidth: '820px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
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
          borderBottom: '3px solid #2563eb',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                {maquina.tag}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '1px' }}>
                REQUISIÇÃO DE COMPRAS // LEAD TIME PREVENTIVO
              </span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
              {maquina.marca} {maquina.modelo}
            </h3>
          </div>
          <button
            onClick={fechar}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '22px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Configurações de Ciclo e Lead Time */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>REVISÃO ALVO:</span>
            {[250, 500, 1000, 2000].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCicloSelecionado(c)}
                style={{
                  background: cicloSelecionado === c ? '#2563eb' : '#ffffff',
                  color: cicloSelecionado === c ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {c}h
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>LEAD TIME:</span>
            <input
              type="number"
              value={leadTimeDias}
              onChange={(e) => setLeadTimeDias(Number(e.target.value))}
              style={{
                width: '60px',
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>dias (importação / entrega)</span>
          </div>
        </div>

        {/* Alerta Tático */}
        <div style={{
          padding: '10px 20px',
          background: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          fontSize: '12px',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⏱</span>
          <span>
            <strong>Aviso de Suprimentos:</strong> Com lead time de <strong>{leadTimeDias} dias</strong>, o pedido deste kit deve ser disparado com antecedência para evitar que a máquina chegue às <strong>{cicloSelecionado}h</strong> sem os filtros em armazém.
          </span>
        </div>

        {/* Preview Formatado */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#0f172a' }}>
          {carregando ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Carregando dados da ficha técnica...</p>
          ) : (
            <pre style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#38bdf8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
            }}>
              {textoRequisicao}
            </pre>
          )}
        </div>

        {/* Barra de Ações */}
        <div style={{
          padding: '14px 20px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <button
            type="button"
            onClick={fechar}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            Fechar
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={copiarTexto}
              style={{
                background: copiado ? '#16a34a' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {copiado ? '✓ Copiado!' : '📋 Copiar Requisição'}
            </button>

            <button
              type="button"
              onClick={enviarWhatsApp}
              style={{
                background: '#22c55e',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              📱 Enviar WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
