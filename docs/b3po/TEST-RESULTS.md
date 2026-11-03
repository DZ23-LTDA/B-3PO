# TEST-RESULTS — execução desta rodada

**Commit avaliado:** `b3po-brand @ 21595add` + docs desta rodada
**Ambiente:** Windows 11 Pro · Node v26.12.1 · npm 12.0.2 · Python 3.14.9 (PM)

| # | Teste | Comando | Resultado | Evidência |
|---|---|---|---|---|
| T1 | Gate do repositório | `python scripts/check` | **14 checks, ok** (exit 0) | saída no log da sessão |
| T2 | Gate de marca | `python scripts/brand_check.py` | **14 checagens, 0 falhas** | idem |
| T2b | Gerador idempotente | `python scripts/brand_sync.py --check` | verificado | idem |
| T3 | Typecheck desktop | `npm run typecheck` (apps/desktop) | **exit 0** | renderer + electron + e2e + config |
| T6 | Build desktop | `npm run build` | **exit 0** em 0,5 min | `.dist-build-*/product/electron-main.mjs` 3,0 MB |
| T7 | Empacotamento | `npm run pack` | **exit 0** em 1,3 min | `release/win-unpacked/Hermes.exe` |
| T10 | Turno real do agente | `hermes -z "Responda apenas: B-3PO online"` | **`B-3PO online ✅`**, exit 0, 13,4 s | `c3po-hermes-home/evidence/fase-b-turno.md` |

## Avisos registrados (não escondidos)

1. `[batch-sign] AZURE_SIGN_* not set — payload binaries will be UNSIGNED` — empacotamento Windows **sem
   assinatura** (ADR-007).
2. Build reporta callbacks lentos do plugin Babel (20,6 s em 865 chamadas) — performance de build, não de
   produto; registrado em `PERFORMANCE-REPORT.md` (pendente).
3. `npm ci` trouxe pacotes deprecados (inflight, rimraf@2/3, glob@7) — herdados do upstream; registrar na
   auditoria de dependências.

## Não executado nesta rodada

- `npm run test:ui` e `test:desktop:platforms` (Vitest) — **pendente**; rodar antes do PR final.
- `test:e2e` (Playwright) — exige app em display; não executado.
- `test:desktop:lifecycle` (instalação/atualização/desinstalação) — não executado.
- `npm audit` / SBOM — pendente.
- Android/iOS/Linux builds — impossíveis ou fora de escopo (ver `PLATFORM-MATRIX.md`).

## Atualização 21:30 — Android (pipeline nativo sem Gradle)

| # | Teste | Comando | Resultado |
|---|---|---|---|
| T12a | Build APK | `pwsh mobile/android-brand-shell/build.ps1` | **exit 0** — aapt2/javac/d8/zipalign/apksigner |
| T12b | Assinatura | `apksigner verify` | **verificado** (debug keystore) |
| T12c | Instalação | `adb install -r …apk` | **Success** no AVD `dsh_pixel` |
| T12d | Execução | `adb shell am start …` + `screencap` | app renderizou a marca; screenshot salvo |

## Atualização 21:31 — schema v1

| # | Teste | Comando | Resultado |
|---|---|---|---|
| T11a | Unit do schema | `npx vitest run src/plugins/hermes-bots/bot-schema.test.ts` | **12/12 passando** |
| T11b | Typecheck com o módulo | `npm run typecheck` | **exit 0** |
| T11c | Lint dos arquivos novos | `npx eslint …bot-schema*.ts` | **exit 0** |

## Atualização 21:34 — adaptador de orquestração

| # | Teste | Comando | Resultado |
|---|---|---|---|
| T11d | Unit do adaptador | `npx vitest run src/plugins/hermes-bots/orchestration.test.ts` | **13/13 passando** |
| T11e | Suítes do domínio juntas | vitest com schema + orchestration | **25/25 passando** |
| T11f | Lint | `npx eslint …orchestration*.ts` | exit 0 |

## Atualização 21:38 — varredura do plugin (112 arquivos de teste)

`npx vitest run src/plugins/hermes-bots/` → **932 testes passando, 2 falhando**, ambos **pré-existentes** e
sem relação com este trabalho:

| Teste | Falha | Avaliação |
|---|---|---|
| `cron-detail.test.tsx` > "labels a next run parked past the scheduler grace as overdue" | `expected null to be +0` | cron/relógio; nenhum arquivo novo é importado |
| `cron-prompt.test.ts` > "passes substitutions, backticks and quotes through as text" | comportamento de shell no Windows | idem |

Verificação: nenhum dos dois importa `bot-schema`/`orchestration` (`git grep` vazio). Não foram
"consertados" para não mascarar problema do upstream — ficam registrados para a Fase H.

## Atualização 21:53 — instalador Windows

| # | Teste | Comando | Resultado |
|---|---|---|---|
| T7b | Instalador MSIX | `npm run dist:win` | **exit 0** — `B3PO-0.0.0-win-x64.msix` (185,53 MB) |
| T7c | Assinatura do MSIX | `Get-AuthenticodeSignature` | **NotSigned** |
| T7d | Instalação limpa do MSIX | — | **não executada** (exige certificado/sideload) |

## Atualização 22:20 — suíte completa de UI

`npx vitest run --project ui` em `apps/desktop`:

| Métrica | Valor |
|---|---|
| Arquivos | **1521** (5 com falha) |
| Testes | **12766** — **12760 passando, 6 falhando** |
| Duração | 594 s |

### Falhas (nenhuma causada por esta entrega)

| Arquivo | Teste | Causa provável |
|---|---|---|
| `cron-prompt.test.ts` | substituições/aspas passam como texto | usa `spawnSync('sh')` — **`sh` não existe no Windows** |
| `cron-detail.test.tsx` | "next run" vencido marcado como overdue | cron/relógio; pré-existente (mesma falha antes das mudanças) |
| `use-keybinds-browser.test.tsx` | Alt defaults / ⌃⌘ no terminal | teclado/ambiente |
| `browser-hints.test.tsx` | dica de binding no first-run | teclado/ambiente |
| `terminal-ownership.test.ts` | retry na mesma gateway | terminal/gateway (timeout 24 s) |

Verificação: nenhum dos cinco importa `bot-schema`/`orchestration`; as referências a "Hermes" neles são
`@hermes/plugin-sdk` (nome de pacote **não** alterado, nível 2) ou o atributo interno
`hermesDesktopHost`. Não foram "consertados" para não mascarar falha do upstream.

## Atualização 22:19 — CI verde no GitHub

| Run | Evento | Commit | Resultado |
|---|---|---|---|
| `41558928386` | push em `b3po-brand` | `a33eda00` | **success** |
| `41558937586` | pull_request (#1) | `a33eda00` | **success** |
| `41558683918` | push (primeira tentativa) | `e7d63dab` | failure — `EBADENGINE`: runner com node 24, repo exige `>=26` |

O workflow roda no runner do GitHub: gate de marca, 26 testes de domínio e typecheck do desktop — todos
verdes. A falha inicial foi real e corrigida (`node-version: '26'`), não escondida.

**Observação:** o PR #1 também dispara os workflows herdados do upstream (CI, Docker, Nix). Eles não são
deste trabalho e não devem ser lidos como sinal de qualidade do B-3PO.
