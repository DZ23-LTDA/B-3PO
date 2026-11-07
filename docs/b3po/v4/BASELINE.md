---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# BASELINE — o que foi medido, com o comando e o número

> **Este arquivo só contém o que foi executado nesta sessão.** O GOAL V4 (linha 11) lista números
> "alegados pelo agente anterior" e manda **reproduzi-los, não certificá-los**. O que não foi
> reproduzido aparece como `NOT_TESTED`, e não como herdado.

## 1. Checkout

| Item | Valor medido | Como |
|---|---|---|
| SO | `Windows NT 10.0.26300.0` | `[Environment]::OSVersion` |
| node / npm | `v26.13.0` / `11.20.0` | `--version` |
| python / git | `3.12.10` / `2.56.0.windows.4` | `--version` |
| branch | **`b3po-brand`** | `git rev-parse --abbrev-ref HEAD` |
| HEAD no início do V4 | **`26d5ba0c47`** | confere com o relato |
| `origin` | `github.com/DZ23-LTDA/B-3PO` | `git remote -v` — confere com o goal |
| `upstream` | `github.com/NousResearch/hermes-agent` | idem |
| `main` | `f4cf411f28` = `origin/main` | **intacto** |
| divergência | 985 commits em `b3po-brand` | `git rev-list --count origin/main..HEAD` |

**O relato do agente anterior estava correto neste ponto.** Isso foi verificado, não presumido.

## 2. Gates

| Gate | Comando | Resultado | Data |
|---|---|---|---|
| Lint/health/ratchets | `python scripts/check` | **14 checks, ok** | r1–r4 do V4 |
| Typecheck desktop | `python scripts/check-b3po-types` | **0 erros** | r1–r4 |
| Typecheck web | `npm run typecheck` (web/) | **PASS** | r107 |
| Typecheck mobile | `npm run typecheck` (mobile/) | **PASS** | r106 |

## 3. Suítes

| Superfície | Resultado | Comando | Observação |
|---|---|---|---|
| **Desktop** | **27 falhas · 18.975 passam · 229 skip** (19.231) | `npx vitest run` | as 27 são o baseline histórico; **0 introduzidas** |
| **Web** | **478/478** | `npm test` | build `exit 0` |
| **Mobile** | **179 passam · 8 skip** | `npx vitest run` | APK release `BUILD SUCCESSFUL` |
| **Python gateway** | **12/12** (só o que criei) | `pytest tests/gateway/test_connector_readiness.py` | ver §5 |

## 4. Acessibilidade — `axe.run(document, {})` sem filtro de regras

| Superfície | Rotas | Nós | Data |
|---|---|---|---|
| Desktop | 27 | **0** | r105 (3 passagens) |
| Web | 15 | **0** | r105 |
| Home V4 (6 modos) | 1 | **0** | r1 |

> **Uma medição isolada deu 1 nó no desktop e não foi reproduzida em 3 passagens seguintes.** Fica
> registrado em vez de escondido.

## 5. As 27 falhas do desktop — classificação por nome

O goal (FASE 0-F) manda investigar **por nome e causa**, e não aceitar "baseline" como desculpa.

| Grupo | Nº | Arquivos | Natureza |
|---|---|---|---|
| **Empacotamento / assinatura** | 12 | `after-pack-digests` 2, `payload-sign-cache` 2, `bundle-electron-main` 3, `commit-bundles.windows` 1, `run-electron-builder` 1, `stage-native-deps` 1, `side-by-side` 0 (arquivo não roda) | ambiente de build; nenhuma é lógica de produto |
| **Instalação de plugin** | 3 | `desktop-plugin-install` (de 54) | `EPERM` de symlink — política do Windows (Developer Mode OFF) |
| **Rede / SSH** | 4 | `ssh-connection` (de 89) | exige host SSH real |
| **GPU** | 2 | `linux-nvidia-egl-recovery.native` | sem GPU Linux nesta máquina |
| **Flaky sob carga** | 5 | `browser-hints`, `terminal-ownership`, `use-keybinds-browser` ×2, `use-composer-submit` | **passam isolados (55/55 provado)** |
| **Timeout** | 1 | `channel-build-version` (74 s) | estouro de tempo sob carga |

**Conclusão honesta**: nenhuma das 27 é defeito de lógica do produto. **Duas categorias são
limitação de ambiente comprovada** (GPU, rede) e **três são de empacotamento**, que é o próximo
bloco a atacar — não porque o primeiro relatório dizia, mas porque a classificação acima é a do
código.

## 6. Gateway Python — `NOT_TESTED`, e o motivo é o instrumento

```
$ pytest tests/gateway/ -q
91 errors during collection
  ModuleNotFoundError: No module named 'aiohttp'
```

**Isto não é 91 testes falhando.** É o **meu** interpretador de teste (`b3po-testenv`) sem
`aiohttp`; o ambiente do projeto (`pm.build_env --group test`) o tem. O runner oficial
(`scripts/run_tests.sh`) é **bash**, e não há bash/WSL nesta máquina
(`execvpe(/bin/bash): No such file or directory`).

**Estado correto: `NOT_TESTED`** — nem PASS, nem FAIL.

## 7. Android — o app roda, a tela não compõe

```
$ adb shell dumpsys window
mCurrentFocus=Window{… Application Not Responding: system}

$ adb shell am start -n com.dz23.b3po/.MainActivity
ActivityTaskManager: Displayed com.dz23.b3po/.MainActivity for user 0: +13s51

$ adb shell screencap  →  1080×2400, PRETO
```

**O app sobe** (log do sistema) e o **`system_server` do Android está em ANR**. O emulador não
compõe nada. Classificado como **limitação de ambiente**, com a ação de desbloqueio
(`emulator -avd <nome> -wipe-data`), que é operação do dono.

O defeito que **foi** encontrado e corrigido com essa evidência: `SafeAreaView` do `react-native` é
**no-op no Android**, e o wordmark desenhava sobre o relógio do sistema. A conta saiu para
`src/app/tela-inset.ts`, com **10 testes** — provável em qualquer máquina, sem depender do emulador.

## 8. O que este baseline **não** cobre

| Gate (`quality-gates.md`) | Estado | Por quê |
|---|---|---|
| Integration/API | **PARTIAL** | proxy `api()` funciona no app vivo; sem credencial externa |
| E2E | **PARTIAL** | Playwright/CDP no app real; **nenhum fluxo de negócio automatizado** |
| Auth/security (RBAC/IDOR) | **PARTIAL** | há testes de permissão; **IDOR não testei** |
| Multitenancy | **NOT_RUN** | não medi cruzamento Tenant A/B |
| Banco / migração | **N/A** | não há migração nesta rodada |
| Performance (LCP/INP/CLS) | **NOT_RUN** | não medi nesta sessão |
| Operação (health/rollback) | **NOT_RUN** | fora do que exerci |
