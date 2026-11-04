# EVIDENCE-INDEX — afirmação → prova

| Afirmação | Evidência | Arquivo / comando |
|---|---|---|
| `main` não recebeu commit DZ23 | `git rev-list --count upstream/main..main` → 0 | git |
| Fork 26 commits atrás | `git rev-list --count main..upstream/main` → 26 | git |
| Ambiente provisionado | `setup-hermes.ps1 -RuntimeOnly` exit 0; Python 3.14.9 | log da sessão |
| Turno real do agente | `hermes -z "…"` → `B-3PO online ✅`, 13,4 s | `c3po-hermes-home/evidence/fase-b-turno.md` |
| Provider local sem chave | Ollama 0.40.13, `/v1/chat/completions` respondeu | log da sessão |
| Marca como dado | `brand.json`, `palette.json`, `generated/*` | `brand/` |
| Gate de marca | 14 checagens, 0 falhas | `python scripts/brand_check.py` |
| Gate do repo | 14 checks, ok | `python scripts/check` |
| 20 mascotes 512×512 | contagem + dimensões por IHDR | `brand/avatars/` + `manifest.json` |
| Contraste AA | 20,49 / 15,04 / 10,16 / 10,74 :1 | `BRAND-ASSET-REPORT.md` |
| Dependências instaladas | 1222 pacotes, 1 min, exit 0 | `npm ci` |
| Desktop typecheck | exit 0 | `npm run typecheck` |
| Desktop build | exit 0, 0,5 min | `npm run build` |
| Desktop empacotado | exit 0, 1,3 min; `Hermes.exe` 235,4 MB | `release/win-unpacked/` |
| Artefato não assinado | aviso `AZURE_SIGN_* not set` | log do `pack` |
| Eventos reais do runtime | `turn.start/end/error`, `tool.start/complete` | `tui_gateway/` |
| Aprovação existente | `tools/approval.py` | código |
| Sem macOS/iOS | `xcodebuild`/`xcrun` ausentes | `PLATFORM-MATRIX.md` |
| Sem projeto mobile | caminhos `apps/android|ios` inexistentes | `MOBILE-FEASIBILITY-REPORT.md` |

## O que NÃO tem evidência (e por isso não é afirmado como pronto)

- Fluxo F5 na UI (criar bot → mascote → turno → cancelar → reiniciar).
- Instalação limpa / upgrade / desinstalação.
- Vitest (`test:ui`, `test:desktop:platforms`) e Playwright E2E.
- `npm audit`, SBOM, revisão de licenças de dependências.
- macOS, Linux, Android, iOS.

## Atualização 21:30 — Android

| Afirmação | Evidência |
|---|---|
| APK gerado e assinado | `dist/b3po-android-shell-debug.apk` 301 KB, `apksigner verify` ok |
| APK instalado no emulador | `adb install -r` → **Success** (`emulator-5554`, AVD `dsh_pixel`) |
| App abre e renderiza a marca | `am start` + screenshot `evidence/android-brand-shell.png` |
| Toolchain Android funciona | aapt2 36.0.0 + javac 21 + d8 + zipalign + apksigner, exit 0 |
| Emulador disponível | `emulator -list-avds` → `dsh_pixel`; `sys.boot_completed=1` |

---

## Atualização 23:20 — evidências de domínio e UI (rodadas 10–16)

| Evidência | Arquivo | O que prova |
|---|---|---|
| Schema v1 + política restritiva | `bot-schema.test.ts` (15) | contrato F4, migração, default restritivo |
| Adaptador de eventos | `orchestration.test.ts` (13) | mapeamento real, `null` para desconhecido, idempotência |
| Persistência do mascote | `data.bot-meta.test.ts` | `mascot_id`/`permission_policy` gravados pelo caminho real |
| Catálogo empacotado | `mascots.test.ts` (6) | 20 mascotes, manifest idêntico, 512×512 em disco |
| Grade de escolha | `mascot-grid.test.tsx` (4) | 20 botões acessíveis, seleção única, id desconhecido |
| Edição do look | `edit-profile-look.test.ts` (5) | patch só do que mudou; limpar mascote grava `null` |
| Vista e criação | `create-dialog.single-flight` + `create-agent-lazy-profile` | fluxo de criação não regrediu com a fiação |

**Ainda sem evidência:** roteiro visual ponta a ponta no app empacotado (abrir → escolher → reiniciar →
mascote de volta). É o próximo item de prova do F5.

## Evidências novas (2026-11-03)

| Evidência | Arquivo de teste | O que prova |
|---|---|---|
| Empréstimo de login opt-in | `tests/agent/test_adopt_external_logins_default.py` (13) | só `true` literal liga; inválido/ilegível desliga |
| Opt-out do Claude Code | `tests/agent/test_anthropic_external_login_optout.py` | padrão/false/inválido/true com efeito real no token |
| Self-heal do Codex | `tests/hermes_cli/test_auth_codex_self_heal.py` | recuperação exige opt-in explícito |
| Contrato do mobile | `mobile/b3po-app/src/protocol/execution.test.ts` (12) | frame desconhecido → null; log idempotente |
| Cliente de API | `mobile/b3po-app/src/api/gateway.test.ts` (7) | correlação, dedupe, queda rejeita pendentes |
| Sessão segura | `mobile/b3po-app/src/auth/session.test.ts` (7) | cofre validado; logout honesto sobre revogação |

## Rodada 27 — evidências do bootstrap e do pt-BR

| Evidência | Arquivo | O que prova |
|---|---|---|
| Diagnóstico do bootstrap | `BOOTSTRAP-DIAGNOSTIC.md` | etapas, causa raiz, correção e tempos |
| Log do bootstrap interrompido | `logs/bootstrap-2026-11-03T05-09-41-686Z.log` (no HERMES_HOME) | `cancelled by user` na etapa 1 |
| Log manual por etapa | `%TEMP%\b3po-f5-home\bootstrap-manual.log` | 7 etapas ok, exit code por etapa |
| Gateway real | `hermes gateway ensure --json` | `state: ready`, `code_sha 6b25838e` |
| Tela de Ajustes com config | `evidence/f5-pt-settings-dialog.png` | app anexado ao gateway, provider/model reais |
| Árvore de acessibilidade em pt | captura UIA (nomes) | botão **"Aplicar"** do catálogo pt |
| Regressão long path | `tests/pm/test_workspace_long_paths.py` | 2 testes verdes no Windows |
| `evidence/configuracoes-pt-final.png` | Configurações › Modelo em pt-BR, app empacotado, capturado por CDP em 2026-11-03 |
