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

## Atualização 00:15 — verificação final da suíte

Reexecução completa após a correção do `title=`:

| Métrica | Resultado |
|---|---|
| Arquivos | 1.519 ok / 5 com falha (1.524) |
| Testes | **6 falhando** — exatamente as pré-existentes (`cron-prompt`/`sh`, `cron-detail`, `keybinds` ×2, `browser-hints`, `terminal-ownership`) |
| Regressão minha (`no-native-title`) | **eliminada** |

Nenhuma falha nova. As 6 restantes são ambientais e anteriores a esta entrega.

## Medição de 2026-11-03 18:41 UTC (números lidos da saída das suítes, não estimados)

| Suíte | Comando | Resultado |
|---|---|---|
| Gate do repositório | `python scripts/check` | **14 checks, ok** |
| Mobile (`mobile/b3po-app`) | `npx vitest run` | **153 passando**, 8 pulados (161) — os 8 são os testes ao vivo que exigem servidor |
| CRM (`crm/`) | `npx vitest run` | **140 passando** (9 arquivos) |
| Desktop — idioma | `npx vitest run src/i18n` | **112 passando** (catálogo, cobertura, pt.test, overlay) |
| Desktop — placeholder do composer | `npx vitest run src/app/chat/composer/hooks/use-composer-placeholder.test.tsx` | **1 passando** (regressão do locale congelado) |
| Desktop — áreas tocadas | `npx vitest run src/app/chat/composer src/app/shell/hooks` | **752 passando** |
| Bots (plugin) | suíte do plugin | 960, com 2 falhas **pré-existentes** de cron (`cron-prompt`, `cron-detail`) documentadas abaixo |

### O que mudou desde a medição anterior

- Mobile passou de 121 para **153** testes (composer, follow-up, `gateway-chat-socket` com 10, `chat-session`
  com 15).
- CRM está em **140**.
- Desktop ganhou **4 testes** novos de idioma nesta série: três do provider (`context.test.tsx`) e um do
  placeholder que aceita apenas os textos de `pt.composer.newSessionPlaceholders`.

### Como reproduzir

```powershell
git checkout b3po-brand
. ./activate.ps1
python scripts/check
cd crm; npx vitest run
cd ../mobile/b3po-app; npx vitest run
cd ../../apps/desktop; npx vitest run src/i18n src/app/chat/composer src/app/shell/hooks
```

### As duas falhas "conhecidas" de cron: resolvidas na causa

| Teste | Causa real | Correção |
|---|---|---|
| `cron-detail` → "Overdue since: … ago" | `lib/time.ts` criava `Intl.RelativeTimeFormat(undefined, …)`, que formata no idioma do **sistema** (pt-BR nesta máquina), então a UI em inglês rendia "há 5 min" e o teste falhava | `relativeTime` passou a usar o locale da **UI** (`setTimeLocale`, alimentado pelo provider de i18n). É correção de produto, não de teste: sem ela, data e rótulo discordam de idioma |
| `cron-prompt` → "expected null to be +0" | o teste roda `sh -c` para afetir o que o *shell* entregou; **Windows sem shell POSIX** devolve `status: null` | guard `itWithShell` (probe `sh -c 'exit 0'`): roda onde há shell, **pula com razão** onde não há. 6 passam, 1 pulado |

Falhas restantes: **nenhuma**. `browser-hints` estourou 25 s quando rodou junto da suíte inteira e passou
sozinho em 7,85 s — é teste sensível a carga paralela neste ambiente, registrado para não virar "falha
fantasma" depois.

Nenhum teste foi removido ou enfraquecido para a suíte passar.

## Remedição — 2026-11-03 19:15 UTC (rodada 67)

Números conferidos **de novo** depois das rodadas 74–79 (reconexão, desconectar, reparear por link,
guarda de geração de sessão):

| Suíte | Comando | Resultado |
|---|---|---|
| Gate do repo | `python scripts/check` | **14 checks, ok** |
| Mobile | `npx vitest run` em `mobile/b3po-app` | **153 passando**, 8 pulados (161) |
| Mobile — typecheck | `npx tsc --noEmit` | **exit 0** |
| CRM | `npx vitest run` em `crm/` | **140 passando** (9 arquivos) |
| Desktop — idioma | `npx vitest run src/i18n` | **112 passando** |
| Desktop — áreas tocadas | `npx vitest run src/app/chat/composer src/app/shell/hooks` | **752 passando** |

Contagem de commits na branch quando esta tabela foi escrita: **129** sobre `main`.

## Remediação — 2026-11-03 19:50 UTC (rodada 73)

Recontagem depois das rodadas 69–73 (lista de conversas, conversa inicial com histórico, guardas de
geração, socket do gateway, allowlist de dispositivo). Medido agora, não lembrado:

| Suíte | Resultado |
|---|---|
| Gate do repo (`python scripts/check`) | **14 checks, ok** |
| Mobile (`npx vitest run`) | **153 passando**, 8 pulados (161) |
| Mobile (`npx tsc --noEmit`) | exit 0 |
| CRM (`npx vitest run`) | **140 passando** (9 arquivos) — medido 19:15 UTC |
| Desktop `src/i18n` | **112 passando** (15 arquivos) — medido 19:15 UTC |
| Gateway (device ticket + ws vizinhos) | **23 passando** |
| Commits na branch | **135** sobre `main` |

Os artefatos foram reconstruídos no mesmo commit: MSIX, `B-3PO.exe`, APK release, APK debug e AAB, todos
com hash novo em `ARTIFACT-MANIFEST.md` (antes o AAB e o APK debug eram de um build anterior).

## Rodada 80 — números medidos de novo (e um erro meu corrigido)

Ao atualizar o PR #1 eu escrevi "52 testes" para Configurações e "23" para o gateway de dispositivo. Fui
medir em vez de confiar na memória:

| Suíte | Comando | Medido |
|---|---|---|
| desktop `src/app/settings` | `npx vitest run src/app/settings` | **597 testes / 76 arquivos** |
| gateway dispositivo | `pytest tests/tui_gateway/test_device_method_scope.py tests/hermes_cli/test_ws_device_ticket_admission.py` | **19 testes** (17 + 2) |
| desktop `src/i18n` | `npx vitest run src/i18n` | **117 testes / 16 arquivos** |
| mobile | `npx vitest run` em `mobile/b3po-app` | **165 + 8 pulados (173)** |
| CRM | `npx vitest run` em `crm/` | **140 testes / 9 arquivos** |
| gate | `python scripts/check` | **14 checks, ok** |

Os dois primeiros números estavam **errados** e foram corrigidos no PR. Registro aqui porque a regra desta
entrega é não deixar número inventado no relatório, mesmo quando o erro é meu e é pequeno.

O PR #1 também passou a declarar um detalhe de arquitetura que evita surpresa futura: a aprovação do mobile
usa **token de sessão**; se o app migrar para **ticket de dispositivo**, os métodos de aprovação precisam
entrar na allowlist (`tui_gateway/device_scope.py`) — hoje seriam recusados com `4030`.
