# ControlMaq V9.5.1-B.1 — Estabilização do Dashboard Executivo

## Ajustes realizados

- Corrigido o contraste da saudação no cabeçalho executivo.
- A mensagem principal agora conta apenas situações críticas e de alta prioridade como prioridades operacionais.
- Pendências de média prioridade continuam disponíveis nos alertas, mas não inflam o resumo executivo.
- A Central de Prioridades exibe no máximo cinco itens e informa a quantidade realmente mostrada.
- Compactado o cabeçalho do Dashboard em telas pequenas.
- Ajustados os rótulos da navegação inferior para evitar cortes: “Horas” e “KPIs”.
- Preservadas as regras, telas, serviços e integrações existentes.

## Arquivos alterados

- src/App.tsx
- src/components/dashboard/DashboardPrioridades.tsx
- src/components/dashboard/dashboard.css
- src/utils/dashboardResumo.ts

## Banco de dados

Nenhuma alteração necessária.
