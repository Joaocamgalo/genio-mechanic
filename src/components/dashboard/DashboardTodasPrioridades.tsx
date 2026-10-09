import { useEffect, useRef } from 'react';
import type { DashboardAcao, DashboardAlerta, DashboardGrupoAlerta } from '../../types/dashboard';
import { DashboardGrupoPrioridades } from './DashboardGrupoPrioridades';

const ORDEM: DashboardGrupoAlerta[] = ['criticas', 'atencao', 'pendencias'];
const SELETOR_FOCO = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  alertas: DashboardAlerta[];
  onAcao: (acao: DashboardAcao) => void;
  onFechar: () => void;
};

export function DashboardTodasPrioridades({ alertas, onAcao, onFechar }: Props) {
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const primeiroFoco = modalRef.current?.querySelector<HTMLElement>(SELETOR_FOCO);
    primeiroFoco?.focus();

    const aoPressionarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onFechar();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;
      const focaveis = Array.from(modalRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCO));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoPressionarTecla);
    return () => {
      document.removeEventListener('keydown', aoPressionarTecla);
      elementoAnterior?.focus();
    };
  }, [onFechar]);

  return (
    <div className="cm-attention-modal-backdrop" role="presentation" onMouseDown={onFechar}>
      <section
        ref={modalRef}
        className="cm-attention-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-attention-modal-title"
        aria-describedby="cm-attention-modal-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cm-attention-modal-header">
          <div>
            <span>Central de atenção</span>
            <h3 id="cm-attention-modal-title">Todas as prioridades</h3>
            <p id="cm-attention-modal-description">{alertas.length} situação(ões) identificada(s) na operação.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar prioridades">×</button>
        </header>
        <div className="cm-attention-modal-content">
          {ORDEM.map((grupo) => (
            <DashboardGrupoPrioridades
              key={grupo}
              grupo={grupo}
              alertas={alertas.filter((alerta) => alerta.grupo === grupo)}
              onAcao={(acao) => { onFechar(); onAcao(acao); }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
