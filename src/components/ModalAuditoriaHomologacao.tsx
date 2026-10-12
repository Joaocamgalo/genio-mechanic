import { useState } from 'react';
import type { Maquina, Chamado } from '../types/controlmaq';

interface ModalAuditoriaHomologacaoProps {
  maquinas: Maquina[];
  chamados: Chamado[];
  fechar: () => void;
}

export function ModalAuditoriaHomologacao({
  maquinas,
  chamados,
  fechar,
}: ModalAuditoriaHomologacaoProps) {
  const [etapas, setEtapas] = useState<{ [key: string]: boolean }>({
    bancoOnline: true,
    maquinasCarregadas: maquinas.length > 0,
    chamadosOperacionais: chamados.length > 0,
    horimetroSincronizado: maquinas.some((m) => (m.horimetro ?? 0) > 0),
    relatorioGeravel: true,
  });

  function toggle(id: string) {
    setEtapas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const todasConcluidas = Object.values(etapas).every(Boolean);

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
        maxWidth: '680px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
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
            <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase' }}>
              ENGENHARIA DA PLATAFORMA // AUDITORIA EM TEMPO REAL
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
              Homologação de Ciclo Operacional Completo
            </h3>
          </div>
          <button
            onClick={fechar}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
            Checklist de integridade operacional do <strong>Ge-Nio Mechaniq</strong> para validação em campo:
          </div>

          {[
            { id: 'bancoOnline', titulo: 'Comunicação Supabase Ativa', desc: 'Sincronização em tempo real de tabelas e leitura de credenciais.' },
            { id: 'maquinasCarregadas', titulo: `Frota Cadastrada (${maquinas.length} máquinas)`, desc: 'Validação de TAGs, marcas e modelos no catálogo operacional.' },
            { id: 'horimetroSincronizado', titulo: 'Atualização de Horímetro em Lote', desc: 'Gravação simultânea na tabela `maquinas` e em `leituras_horimetro`.' },
            { id: 'chamadosOperacionais', titulo: `Ordens de Serviço Ativas (${chamados.length} OSs)`, desc: 'Fluxo no Kanban (Aberto, Assumido e Finalizado com baixa de peças).' },
            { id: 'relatorioGeravel', titulo: 'Laudo Técnico Imprimível / PDF', desc: 'Emissão de documento de entrega técnica com assinatura do mecânico.' },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: etapas[item.id] ? '1px solid #86efac' : '1px solid #e2e8f0',
                background: etapas[item.id] ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={etapas[item.id]}
                onChange={() => {}}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.titulo}</strong>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: etapas[item.id] ? '#16a34a' : '#94a3b8',
              }}>
                {etapas[item.id] ? 'HOMOLOGADO' : 'PENDENTE'}
              </span>
            </div>
          ))}

          <div style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: todasConcluidas ? '#dcfce7' : '#fef3c7',
            border: todasConcluidas ? '1px solid #86efac' : '1px solid #fde047',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>{todasConcluidas ? '🏆' : '⚠️'}</span>
            <div>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                {todasConcluidas ? 'Sistema 100% Homologado para Operação Contínua!' : 'Etapas de Validação Pendentes'}
              </strong>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                {todasConcluidas
                  ? 'A plataforma atende aos padrões de gestão de frotas, confiabilidade MTBF/MTTR e controle de consumíveis.'
                  : 'Complete os testes de rotina acima para assegurar total estabilidade em campo.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={fechar}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Concluir Auditoria
          </button>
        </div>
      </div>
    </div>
  );
}
