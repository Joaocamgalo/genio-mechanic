import { useEffect, useState } from 'react';

const INTERVALO_ATUALIZACAO_MS = 60_000;

export function useDashboardDataReferencia(ativo = true): Date {
  const [referencia, setReferencia] = useState(() => new Date());

  useEffect(() => {
    if (!ativo) return;

    const atualizar = () => setReferencia(new Date());
    atualizar();

    const intervalo = window.setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') atualizar();
    };

    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [ativo]);

  return referencia;
}
