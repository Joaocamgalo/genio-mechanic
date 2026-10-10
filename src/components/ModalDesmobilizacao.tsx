import React, { useState } from 'react';
import type { Maquina } from '../types/controlmaq';

interface ModalDesmobilizacaoProps {
  maquina: Maquina | null;
  fechar: () => void;
}

export function ModalDesmobilizacao({ maquina, fechar }: ModalDesmobilizacaoProps) {
  const [cliente, setCliente] = useState(maquina?.cliente || '');
  const [obraLocal, setObraLocal] = useState(maquina?.local || '');
  const [horimetroFinal, setHorimetroFinal] = useState<number>(maquina?.horimetro ?? 0);
  const [motivo, setMotivo] = useState('Término de Contrato / Etapa da Obra');
  const [condicoes, setCondicoes] = useState('Equipamento operacional, limpo e abastecido');
  const [copiado, setCopiado] = useState(false);

  if (!maquina) return null;

  const assunto = `[DESMOBILIZAÇÃO] Devolução de Equipamento - TAG ${maquina.tag} (${maquina.modelo})`;
  
  const corpoEmail = `Prezados,

Informamos a desmobilização e encerramento das atividades do equipamento abaixo descrito:

--------------------------------------------------
DADOS DO EQUIPAMENTO:
- TAG: ${maquina.tag}
- Modelo / Marca: ${maquina.marca} ${maquina.modelo}
- Horímetro de Devolução: ${horimetroFinal} h
- Cliente / Contratante: ${cliente || 'Não informado'}
- Local / Frente de Obra: ${obraLocal || 'Não informado'}
- Motivo: ${motivo}
- Condições Físicas: ${condicoes}
--------------------------------------------------

Solicitamos as providências para liberação de transporte/vistoria de entrega.

Atenciosamente,
Gestão de Frota & Manutenção — Ge-Nio Mechaniq`;

  function copiarTexto() {
    navigator.clipboard.writeText(`Assunto: ${assunto}\n\n${corpoEmail}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function dispararEmail() {
    const link = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpoEmail)}`;
    window.location.href = link;
  }

  function enviarWhatsApp() {
    const link = `https://api.whatsapp.com/send?text=${encodeURIComponent(`*${assunto}*\n\n${corpoEmail}`)}`;
    window.open(link, '_blank');
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
        maxWidth: '740px',
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
          borderBottom: '3px solid #f97316',
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#fed7aa', fontWeight: 800, textTransform: 'uppercase' }}>
              LOGÍSTICA & CONTRATOS // DESMOBILIZAÇÃO
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
              {maquina.tag} — {maquina.marca} {maquina.modelo}
            </h3>
          </div>
          <button
            onClick={fechar}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Inputs rápidos */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>CLIENTE</label>
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>LOCAL / OBRA</label>
            <input
              value={obraLocal}
              onChange={(e) => setObraLocal(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>HORÍMETRO DE SAÍDA</label>
            <input
              type="number"
              value={horimetroFinal}
              onChange={(e) => setHorimetroFinal(Number(e.target.value))}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px', fontWeight: 800 }}
            />
          </div>
        </div>

        {/* Preview do E-mail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#0f172a' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>
            ASSUNTO: <strong style={{ color: '#ffffff' }}>{assunto}</strong>
          </div>
          <pre style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fdba74',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.5',
          }}>
            {corpoEmail}
          </pre>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={fechar}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Fechar
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={copiarTexto}
              style={{ background: copiado ? '#16a34a' : '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
            >
              {copiado ? '✓ Copiado!' : '📋 Copiar E-mail'}
            </button>
            <button
              type="button"
              onClick={enviarWhatsApp}
              style={{ background: '#22c55e', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
            >
              📱 WhatsApp
            </button>
            <button
              type="button"
              onClick={dispararEmail}
              style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
            >
              ✉ Abrir no E-mail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
