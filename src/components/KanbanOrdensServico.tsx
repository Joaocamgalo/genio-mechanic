import React from 'react';
import type { Chamado, Usuario } from '../types/controlmaq';

interface KanbanOrdensServicoProps {
  chamados?: Chamado[];
  usuario: Usuario | null;
  onAbrirDetalhes: (chamado: Chamado) => void;
  onAssumirChamado: (chamado: Chamado) => void;
  onFinalizarChamado: (chamado: Chamado) => void;
}

export function KanbanOrdensServico({
  chamados = [],
  usuario,
  onAbrirDetalhes,
  onAssumirChamado,
  onFinalizarChamado,
}: KanbanOrdensServicoProps) {
  const isAdmin = usuario?.perfil === 'admin';
  const isMecanico = usuario?.perfil === 'mecanico';

  const colunas: {
    id: 'Aberto' | 'Assumido' | 'Finalizado';
    titulo: string;
    subtitulo: string;
    cor: string;
    borda: string;
    fundo: string;
  }[] = [
    {
      id: 'Aberto',
      titulo: 'Triagem & Abertas',
      subtitulo: 'Aguardando despacho técnico',
      cor: '#d97706',
      borda: '#f59e0b',
      fundo: '#fffbeb',
    },
    {
      id: 'Assumido',
      titulo: 'Em Execução / Oficina',
      subtitulo: 'Técnico em campo / mão na graxa',
      cor: '#2563eb',
      borda: '#3b82f6',
      fundo: '#eff6ff',
    },
    {
      id: 'Finalizado',
      titulo: 'Concluídas & Liberadas',
      subtitulo: 'Máquinas liberadas para operação',
      cor: '#16a34a',
      borda: '#22c55e',
      fundo: '#f0fdf4',
    },
  ];

  function formatarData(dataStr?: string) {
    if (!dataStr) return '';
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  const listaSegura = Array.isArray(chamados) ? chamados : [];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '16px',
      alignItems: 'start',
      marginTop: '16px',
    }}>
      {colunas.map((col) => {
        const chamadosColuna = listaSegura.filter((c) => c && c.status === col.id);

        return (
          <div
            key={col.id}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderTop: `4px solid ${col.borda}`,
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 220px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {/* Header da Coluna */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                  {col.titulo}
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {col.subtitulo}
                </span>
              </div>
              <span style={{
                background: col.fundo,
                color: col.cor,
                fontWeight: 900,
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '12px',
                border: `1px solid ${col.borda}40`,
              }}>
                {chamadosColuna.length}
              </span>
            </div>

            {/* Lista de Cards da Coluna */}
            <div style={{
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {chamadosColuna.length === 0 ? (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '2px dashed #e2e8f0',
                  borderRadius: '8px',
                }}>
                  Nenhuma OS nesta etapa
                </div>
              ) : (
                chamadosColuna.map((c) => {
                  const prob = (c.problema || '').toLowerCase();
                  const sol = (c.solucao || '').toLowerCase();
                  const precisaPeca = prob.includes('filtro') ||
                                      prob.includes('peça') ||
                                      prob.includes('peca') ||
                                      prob.includes('vazamento') ||
                                      sol.includes('aguardando');

                  return (
                    <div
                      key={c.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          background: '#0f172a',
                          color: '#f8fafc',
                          fontWeight: 900,
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          {c.maquina || 'SEM TAG'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          OS #{c.id}
                        </span>
                      </div>

                      {/* Informações Operacionais */}
                      <div>
                        {c.cliente && (
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                            {c.cliente}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Local: <strong style={{ color: '#334155' }}>{c.local || 'Não informado'}</strong>
                        </div>
                      </div>

                      {/* Descrição do Problema */}
                      <div style={{
                        fontSize: '12px',
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        lineHeight: '1.4',
                        maxHeight: '75px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {c.problema || 'Sem descrição cadastrada'}
                      </div>

                      {/* Tag de Suprimento */}
                      {precisaPeca && (
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          width: 'fit-content',
                        }}>
                          📦 Requer Peça / Filtro
                        </div>
                      )}

                      {/* Responsável e Data */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '6px',
                        color: '#64748b',
                      }}>
                        <span>
                          {c.mecanico ? `🔧 ${c.mecanico}` : '⏳ Sem técnico'}
                        </span>
                        <span>{formatarData(c.created_at)}</span>
                      </div>

                      {/* Botões de Ação Rápida */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: c.status === 'Aberto' && (isAdmin || isMecanico) ? '1fr 1fr' : '1fr',
                        gap: '6px',
                        marginTop: '4px',
                      }}>
                        <button
                          type="button"
                          onClick={() => onAbrirDetalhes(c)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Ver Detalhes
                        </button>

                        {c.status === 'Aberto' && (isAdmin || isMecanico) && (
                          <button
                            type="button"
                            onClick={() => onAssumirChamado(c)}
                            style={{
                              background: '#2563eb',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Assumir OS
                          </button>
                        )}

                        {c.status === 'Assumido' && (isAdmin || isMecanico) && (
                          <button
                            type="button"
                            onClick={() => onFinalizarChamado(c)}
                            style={{
                              background: '#16a34a',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Concluir OS
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
