import { useState } from 'react';
import type { PreventivaMaquina, Maquina } from '../types/controlmaq';

interface AlertaWhatsAppPreventivasProps {
  preventivas: PreventivaMaquina[];
  maquinas: Maquina[];
}

export function AlertaWhatsAppPreventivas({ preventivas, maquinas }: AlertaWhatsAppPreventivasProps) {
  const [telefone, setTelefone] = useState('');
  const [copiado, setCopiado] = useState(false);

  const maquinasAtencao = preventivas.filter(
    (p) => p.status === 'vencida' || p.status === 'proxima'
  );

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  const textoAlerta = `*🚨 GE-NIO MECHANIQ - ALERTA DE PREVENTIVAS CRÍTICAS (${dataAtual})*
--------------------------------------------------
*Total de equipamentos em atenção:* ${maquinasAtencao.length}

${maquinasAtencao.length === 0 ? '✓ Nenhuma máquina com revisão vencida no momento.' : maquinasAtencao.map((p, idx) => {
  const maq = maquinas.find((m) => m.tag === p.maquina_tag);
  const statusEmoji = p.status === 'vencida' ? '🔴 VENCIDA' : '🟡 PRÓXIMA';
  const clienteNome = maq?.cliente || 'Pátio';
  const localNome = maq?.local || 'Base';
  return `${idx + 1}. *TAG ${p.maquina_tag}* (${maq?.modelo || 'Equipamento'})
   - Status: ${statusEmoji}
   - Horímetro Atual: ${p.horimetro_atual}h
   - Revisão Alvo: ${p.proxima_revisao_horas}h
   - Saldo: ${p.horas_restantes < 0 ? `Vencida há ${Math.abs(p.horas_restantes)}h` : `Faltam ${p.horas_restantes}h`}
   - Cliente / Local: ${clienteNome} (${localNome})
`;
}).join('\n')}
--------------------------------------------------
*Ação necessária:* Programar envio de kits de filtros ou parada técnica imediata.
Painel Ge-Nio Mechaniq Fleet Operations`;

  function copiar() {
    navigator.clipboard.writeText(textoAlerta);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function enviarWhatsApp() {
    const foneLimpo = telefone.replace(/\D/g, '');
    const url = foneLimpo
      ? `https://api.whatsapp.com/send?phone=55${foneLimpo}&text=${encodeURIComponent(textoAlerta)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(textoAlerta)}`;
    window.open(url, '_blank');
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: '5px solid #d97706',
      borderRadius: '10px',
      padding: '16px',
      marginTop: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
            DESPACHO PROATIVO // NOTIFICAÇÃO OFICINA
          </span>
          <h4 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Disparo de Preventivas Críticas via WhatsApp
          </h4>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="DDD + Telefone Encarregado (opcional)"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              width: '240px',
            }}
          />
          <button
            type="button"
            onClick={copiar}
            style={{
              background: copiado ? '#16a34a' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {copiado ? '✓ Copiado!' : '📋 Copiar Resumo'}
          </button>
          <button
            type="button"
            onClick={enviarWhatsApp}
            style={{
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📱 Disparar WhatsApp ({maquinasAtencao.length})
          </button>
        </div>
      </div>

      <div style={{
        background: '#0f172a',
        borderRadius: '6px',
        padding: '12px',
        maxHeight: '130px',
        overflowY: 'auto',
      }}>
        <pre style={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fbbf24',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.4',
        }}>
          {textoAlerta}
        </pre>
      </div>
    </div>
  );
}
