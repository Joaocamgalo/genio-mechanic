# Validação da V9.5.1-E

Os testes automatizados estão em `src/__tests__/` para garantir que sejam incluídos quando a pasta `src` for substituída no projeto.

Execute, na raiz do projeto:

```bash
npm install
npm run lint
npm run test
npm run typecheck
npm run build
```

O comando `npm run test` usa explicitamente `vitest.config.ts` e procura arquivos em `src/**/*.test.ts`.

Não use `--passWithNoTests`: a ausência de testes deve continuar sendo tratada como erro.
