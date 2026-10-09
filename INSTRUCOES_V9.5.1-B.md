# Instruções de atualização — V9.5.1-B

## Forma recomendada

1. Faça uma cópia da pasta atual do ControlMaq.
2. Extraia o ZIP da V9.5.1-B em uma nova pasta.
3. Copie seu arquivo `.env` ou `.env.local` para a nova pasta, caso exista.
4. Abra a nova pasta no VS Code / StackBlitz.
5. Execute:

```bash
npm install
npm run build
npm run dev
```

## Resultado esperado

Ao entrar como administrador ou mecânico e acessar **Visão Geral**, o Dashboard Executivo será exibido.

## Observação

Esta versão não altera o Supabase. Nenhum script SQL precisa ser executado.
