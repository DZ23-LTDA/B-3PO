---
tipo: prontidao-de-release
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G7
---

# RELEASE_READINESS — V5

> **Não existe selo global.** Cada linha tem o número que a produziu. O que não rodou é `NOT_TESTED`,
> nunca "ok".

## O que está pronto

| Item | Número | Comando |
|---|---|---|
| Gate | **15 checks, ok** | `python scripts/check` |
| Typecheck | **0 erros** em 2 projetos | `python scripts/check-b3po-types` |
| Suíte desktop | **27 failed · 19.000 passed** | `npx vitest run` |
| — as 27 | **classificadas** — 0 defeito de produto | `TEST_EVIDENCE.md` |
| Suíte web | **71 arquivos · 478 testes** | `npm test` (web) |
| Build web | **✓ built in 5.28s** | `npm run build` (web) |
| Suíte mobile | **20 arquivos · 179 testes · 8 skipped** | `npx vitest run` (mobile) |
| Typecheck mobile | **PASS** | `npm run typecheck` (mobile) |
| APK release | **44,2 MB** · 07/11 08:39 | `gradlew assembleRelease` |
| `axe` desktop | **0 em 27 rotas** | CDP + `axe.run(document, {})` |
| `axe` web | **0 em 15 rotas** | idem |
| Console desktop | **0 erros em 27 rotas** | varredura de `console`/`pageerror` |
| Gateway (amostra isolada) | **263 passed** | `pytest` por arquivo |

## O que **não** está pronto

| Item | Estado | Por quê |
|---|---|---|
| **Execução de plano da Sofia** | **NOT_READY** | a ponte cria a execução como `pendente`; **nada a executa**. É o G2 |
| **Benchmark** | **NOT_TESTED** | harness não existe; comparação externa exigiria contas pagas |
| Release assinado | **NOT_READY** | `EXT-1` — sem certificado Authenticode |
| iOS | **NOT_READY** | `EXT-2` — sem macOS |
| Suíte completa do gateway | **NOT_TESTED** | 1.685 arquivos ≈ 4,7 h; exige bash |
| IDOR / multi-tenant | **NOT_TESTED** | exige dois tenants reais |
| SSRF | **DEFENDIDO** | `tools/url_safety.py` + revalidacao de redirect, 169 testes (r36) |
| Allowlist de egress (destino) | **NAO EXISTE** | o modelo e' blocklist de endereco privado |
| Path traversal | **NOT_TESTED** | `fs`/`plugin-files` |
| Replay de webhook | **NOT_TESTED** | assinatura + janela existem; replay não exercitado |
| Performance (LCP/INP/CLS) | **NOT_RUN** | não medido |
| iOS · Android em aparelho **desta** rodada | **NOT_TESTED** | a inspeção é de 07/11 (V4 r18) |

## Checklist de release (G7)

| Item | Estado |
|---|---|
| Build reproduzível | 🟡 desktop e web constroem; **o backend é deployado como cópia** (`%TEMP%\<home>\hermes-agent\`), e essa cópia pode estar defasada — foi a causa do 404 da r15 |
| SBOM / dependências | **NOT_TESTED** — `npm audit` / `pip-audit` não rodados |
| Versão e changelog | **não verificado nesta sessão** |
| Assinatura | **NOT_READY** |
| Artefatos | APK ✓ · instalador desktop **NOT_TESTED** |
| Atualização / rollback | **NOT_TESTED** |
| Backups e restauração | existe `backup-ipc` + restore (V4 r88); **não exercitado nesta sessão** |

## Bloqueios externos

| ID | Bloqueio | Desbloqueio |
|---|---|---|
| `EXT-1` | certificado Authenticode | obter e assinar o `.exe` |
| `EXT-2` | macOS | rodar `npm run build` num macOS com Xcode |
| `EXT-3` | credencial de conector | `hermes auth add <provider>` ou `.env` do perfil |
| `EXT-4` | bash | suíte completa do gateway (1.685 arquivos) |

## O que este documento **não** afirma

- Não afirma "pronto para produção". O critério C (Sofia ponta a ponta) **não** está atendido.
- Não afirma que o release é reproduzível: o backend em uso é uma **cópia** que não é reconstruída a
  cada execução, e isso já produziu um 404 real (r15).
- Não afirma cobertura de segurança: `IDOR`, `SSRF` e `path traversal` **não foram testados**.
