# ControlMaq V10.0-A — Fundação PWA

## Entregue
- manifesto PWA revisado;
- Service Worker limitado ao App Shell e ativos estáticos do mesmo domínio;
- fallback offline;
- registro controlado do Service Worker somente em produção;
- serviço e hook de conectividade;
- indicador acessível de conexão;
- schema IndexedDB versionado;
- contratos de sessão offline, fila, idempotência e rastreabilidade;
- testes iniciais da fundação.

## Fora do escopo
- sincronização real com Supabase;
- horímetros ou ocorrências gravados offline;
- fotos, checklists e abastecimento;
- login novo sem conexão.

## Reversão
A fundação pode ser desativada removendo a chamada de registro em `src/main.tsx` e a referência ao manifesto em `index.html`. Nenhuma tabela remota foi alterada.
