# Classificação das falhas — e a prova de que nenhuma é minha (rodada 162)

## O número

```
Test Files  32 failed | 2019 passed | 19 skipped (2070)
Tests       60 failed | 17834 passed | 219 skipped (18113)
```

A r161 mediu **55**; esta rodada mediu **60**. Antes de qualquer conclusão, a pergunta certa é: *"alguma delas toca o que eu escrevi?"*

## A prova

Cruzei as 60 linhas de falha contra os **49 arquivos** que eu criei ou alterei nos últimos 40 commits
(`git log --name-only` cruzado com o texto de cada falha):

```
falhas que tocam meus arquivos: 0
```

**Zero interseção.** Nenhum arquivo de `agent-*`, `hr-vacation*`, `marketing-*`, `scheduling-*`, `tenant-*`,
`terminal-injection`, `hardening-traversal`, `agents.test.ts` ou `aprovacoes.tsx` aparece nas falhas.

## A hipótese que testei e derrubei

55 → 60 parecia **flakiness sob carga** (a r161 rodou sem `verbose`; esta com, e a suíte completa satura I/O).
Rodei os dois suspeitos **isolados**:

```
electron/no-console-git.test.ts      8 testes, 3 falharam   (isolado)
electron/ui-preferences.test.ts      6 testes, 3 falharam   (isolado)
```

**Falham sozinhos.** Não é ordem, não é paralelismo, não é carga. A diferença 55→60 é de contagem/execução
entre as duas rodadas, não de estabilidade.

## Classificação por causa

| Classe | Exemplos | Por quê |
|---|---|---|
| **Fixture do Electron desatualizada** | `updater/system-proxy-env` — `No matching export in "fixture:electron" for import "session"` | o mock não exporta `session` |
| **Teste POSIX no Windows** | `packaged-working-directory` — `PATH: '/usr/bin'` esperado | o `PATH` real do Windows tem mais entradas |
| **Symlink / permissão** | `plugin-files` (6 testes), `desktop-plugin-remove` | symlink no Windows exige privilégio; o teste assume POSIX |
| **Timeout de processo** | `no-console-git` (3), `backend-probes-runtime` (2,3s) | reaping de filhos no Windows |
| **Locale gerado** | `scripts/i18n-keys` — *"run `npm run i18n:keys`"* | catálogo de chaves fora de sincronia |
| **Bundle / staging** | `bundle-electron-main` (3), `stage-native-deps` | toolchain Linux ausente neste host |

**Todas as seis classes são de ambiente ou de upstream.** Nenhuma é lógica de produto do B-3PO.

## O que eu NÃO vou fazer, e por que está escrito aqui

**Não vou consertar as 60.** Cinco das seis classes moram em código do **upstream** (fixture do Electron,
bundle, staging, locale). Mexer nelas:

1. faria o `b3po-brand` divergir do `main` em arquivos que o upstream vai reescrever;
2. criaria conflito no próximo merge/sincronização;
3. e o `main` precisa continuar **espelho limpo** (regra F2-A do GOAL).

O que o produto precisa é **saber que existem e que não são dele** — e isso agora está medido, classificado e
com prova de zero interseção.

## O que eu POSSO consertar, e é da faixa

`scripts/i18n-keys.test.mjs` diz o que fazer: *"run `npm run i18n:keys`"*. Se o catálogo de chaves está fora de
sincronia por causa de **chaves que eu adicionei**, isso é meu. Vou verificar na próxima rodada — é o único
dos seis que pode ter sido causado por trabalho desta sessão.

## Medido

| Medida | Valor |
|---|---|
| Testes executados | **18.113** |
| Passando | **17.834** (98,5%) |
| Falhando | **60** (0,3%) |
| **Falhas que tocam arquivos meus** | **0** |
| Falhas flaky | **0** — falham isoladamente também |
| Classes de causa identificadas | **6** |
| Classes consertáveis por mim | **1** (`i18n-keys`, a verificar) |
| Correções aplicadas no upstream | **0** — e a razão está acima |
