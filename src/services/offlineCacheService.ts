export const OfflineCache = {
  salvar: <T>(chave: string, dados: T): void => {
    try {
      localStorage.setItem(`genio_cache_${chave}`, JSON.stringify({
        dados,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Erro ao gravar cache local:', e);
    }
  },

  obter: <T>(chave: string): T | null => {
    try {
      const item = localStorage.getItem(`genio_cache_${chave}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      return parsed.dados as T;
    } catch {
      return null;
    }
  },

  enfileirarLeituraHorimetro: (leitura: { maquina_id: string | number; horimetro: number; data: string }): void => {
    try {
      const fila = OfflineCache.obter<any[]>('fila_horimetros') || [];
      fila.push(leitura);
      OfflineCache.salvar('fila_horimetros', fila);
    } catch (e) {
      console.warn('Erro ao salvar na fila offline:', e);
    }
  },

  obterFilaHorimetros: (): any[] => {
    return OfflineCache.obter<any[]>('fila_horimetros') || [];
  },

  limparFilaHorimetros: (): void => {
    try {
      localStorage.removeItem('genio_cache_fila_horimetros');
    } catch (e) {
      console.warn('Erro ao limpar fila:', e);
    }
  }
};
