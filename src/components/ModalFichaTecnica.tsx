import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Maquina, ItemManutencaoPreventiva } from '../types/controlmaq';

interface ModalFichaTecnicaProps {
  maquina: Maquina | null;
  fechar: () => void;
  isAdmin: boolean;
}

export function ModalFichaTecnica({ maquina, fechar, isAdmin }: ModalFichaTecnicaProps) {
  const [itens, setItens] = useState<ItemManutencaoPreventiva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroIntervalo, setFiltroIntervalo] = useState<number | 'todos'>('todos');
  const [adicionando, setAdicionando] = useState(false);

  // Form states
  const [componente, setComponente] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState(500);
  const [codigoOriginal, setCodigoOriginal] = useState('');
  const [mann, setMann] = useState('');
  const [donaldson, setDonaldson] = useState('');
  const [baldwin, setBaldwin] = useState('');
  const [racor, setRacor] = useState('');
  const [capacidade, setCapacidade] = useState('');

  useEffect(() => {
    if (!maquina) return;
    carregarItens();
  }, [maquina]);

  async function carregarItens() {
    if (!maquina) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('itens_manutencao_preventiva')
        .select('*')
        .eq('maquina_id', maquina.id)
        .order('intervalo_horas', { ascending: true });

      if (error) throw error;
      setItens(data || []);
    } catch (err) {
      console.error('Erro ao carregar ficha tecnica:', err);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!maquina || !componente.trim()) return;

    try {
      const { error } = await supabase
        .from('itens_manutencao_preventiva')
        .insert({
          maquina_id: maquina.id,
          componente: componente.trim(),
          intervalo_horas: Number(intervaloHoras),
          codigo_original: codigoOriginal.trim() || null,
          equivalente_mann: mann.trim() || null,
          equivalente_donaldson: donaldson.trim() || null,
          equivalente_baldwin: baldwin.trim() || null,
          equivalente_racor: racor.trim() || null,
          capacidade_oleo: capacidade.trim() || null,
        });

      if (error) throw error;

      // Limpar campos
      setComponente('');
      setCodigoOriginal('');
      setMann('');
      setDonaldson('');
      setBaldwin('');
      setRacor('');
      setCapacidade('');
      setAdicionando(false);
      await carregarItens();
    } catch (err: any) {
      alert('Erro ao salvar item: ' + err.message);
    }
  }

  async function excluirItem(id: number) {
    if (!confirm('Remover este item da ficha técnica?')) return;
    try {
      await supabase.from('itens_manutencao_preventiva').delete().eq('id', id);
      await carregarItens();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  if (!maquina) return null;

  const itensFiltrados = filtroIntervalo === 'todos' 
    ? itens 
    : itens.filter(i => i.intervalo_horas === filtroIntervalo);

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
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '940px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Topo do Modal */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #f59e0b'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#f59e0b',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {maquina.tag}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                FICHA TÉCNICA // CROSS-REFERENCE DE FILTROS & PEÇAS
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
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Barra de Filtro e Ações */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>CICLO:</span>
            {[ 'todos', 250, 500, 1000, 2000 ].map((ciclo) => (
              <button
                key={ciclo}
                onClick={() => setFiltroIntervalo(ciclo as any)}
                style={{
                  background: filtroIntervalo === ciclo ? '#0f172a' : '#ffffff',
                  color: filtroIntervalo === ciclo ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {ciclo === 'todos' ? 'Todos os Ciclos' : `${ciclo}h`}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={() => setAdicionando(!adicionando)}
              style={{
                background: adicionando ? '#ef4444' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {adicionando ? 'Cancelar' : '+ Cadastrar Peça / Filtro'}
            </button>
          )}
        </div>

        {/* Formulário de Cadastro Rápido de Peça */}
        {adicionando && isAdmin && (
          <form onSubmit={salvarItem} style={{
            padding: '16px 20px',
            background: '#f1f5f9',
            borderBottom: '2px solid #cbd5e1',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>COMPONENTE *</label>
              <input
                required
                value={componente}
                onChange={e => setComponente(e.target.value)}
                placeholder="Ex: Filtro Óleo Motor"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>CICLO (HORAS)</label>
              <input
                type="number"
                value={intervaloHoras}
                onChange={e => setIntervaloHoras(Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>CÓDIGO ORIGINAL (OEM)</label>
              <input
                value={codigoOriginal}
                onChange={e => setCodigoOriginal(e.target.value)}
                placeholder="Ex: 510001234"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>MANN FILTER</label>
              <input
                value={mann}
                onChange={e => setMann(e.target.value)}
                placeholder="Ex: W 940"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>DONALDSON</label>
              <input
                value={donaldson}
                onChange={e => setDonaldson(e.target.value)}
                placeholder="Ex: P550388"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>BALDWIN / RACOR</label>
              <input
                value={baldwin}
                onChange={e => setBaldwin(e.target.value)}
                placeholder="Ex: BT237 / R20P"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', display: 'block' }}>CAPACIDADE / ESPECIFICAÇÃO</label>
              <input
                value={capacidade}
                onChange={e => setCapacidade(e.target.value)}
                placeholder="Ex: 8.5L 15W40 CI-4"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12px' }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Gravar
            </button>
          </form>
        )}

        {/* Tabela de Conversão Cruzada */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {carregando ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Carregando dados técnicos...</p>
          ) : itensFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Nenhum item cadastrado para este ciclo.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Cadastre os códigos originais e equivalentes para agilizar as compras e o campo.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#1e293b' }}>COMPONENTE</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#1e293b' }}>CICLO</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#b45309' }}>CÓD. ORIGINAL (OEM)</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#2563eb' }}>MANN</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#059669' }}>DONALDSON</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#475569' }}>BALDWIN / RACOR</th>
                    <th style={{ padding: '10px', fontWeight: 800, color: '#475569' }}>FLUIDO / CAPACIDADE</th>
                    {isAdmin && <th style={{ padding: '10px', textAlign: 'center' }}>AÇÃO</th>}
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>{item.componente}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, color: '#475569' }}>
                          {item.intervalo_horas}h
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#b45309' }}>
                        {item.codigo_original || '—'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#2563eb' }}>
                        {item.equivalente_mann || '—'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#059669' }}>
                        {item.equivalente_donaldson || '—'}
                      </td>
                      <td style={{ padding: '10px', color: '#475569' }}>
                        {item.equivalente_baldwin || item.equivalente_racor || '—'}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b' }}>
                        {item.capacidade_oleo || '—'}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => excluirItem(item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                          >
                            🗑
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
