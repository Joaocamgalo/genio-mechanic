# ControlMaq V9.5.1-B — Dashboard Executivo

## Implementado

- A tela **Visão Geral** passou a exibir o Dashboard Executivo.
- Saudação contextual ao usuário.
- Índice de Saúde Operacional.
- Cinco KPIs principais:
  - chamados abertos;
  - chamados urgentes;
  - máquinas paradas;
  - preventivas vencidas;
  - horímetros pendentes.
- Central de prioridades com até cinco situações críticas.
- Resumo executivo e próxima ação recomendada.
- Estados de carregamento, erro, ausência de dados e dados parciais.
- Navegação dos cartões e alertas para as áreas relacionadas.
- Layout responsivo preparado para desktop, tablet e celular.

## Arquivos criados

- `src/screens/DashboardExecutivo.tsx`
- `src/components/dashboard/DashboardKpiCard.tsx`
- `src/components/dashboard/DashboardSaude.tsx`
- `src/components/dashboard/DashboardPrioridades.tsx`
- `src/components/dashboard/DashboardResumo.tsx`
- `src/components/dashboard/dashboard.css`

## Arquivo alterado

- `src/App.tsx`

## Preservado

- Banco de dados e RPCs.
- Serviços de preventiva e operação diária.
- Demais telas e rotinas do sistema.
