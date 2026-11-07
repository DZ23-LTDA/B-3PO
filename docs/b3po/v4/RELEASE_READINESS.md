---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# RELEASE_READINESS — matriz por plataforma, medida

> **Nada aqui é estimativa.** Cada linha cita o número que a produziu, e o número foi medido nesta
> sessão. O que não foi medido está marcado `NOT_TESTED` — nunca inferido.

## Veredito por plataforma

| Plataforma | Veredito | O que o sustenta |
|---|---|---|
| **Desktop (Windows)** | **READY** para uso interno | gate 14/14 · tipos 0 · suíte **27 falhas = baseline · 0 minhas** · `axe` **0** em 27 rotas · os seis modos com **6/6 menus distintos** |
| **Desktop (Linux)** | **PARTIAL** | 2 falhas de GPU (`linux-nvidia-egl-recovery`) sem hardware para provar |
| **Desktop (macOS)** | **NOT_TESTED** | sem macOS nesta máquina |
| **Web** | **PARTIAL** | build exit 0 · 478/478 · `axe` 0 em 15 rotas — **mas é o dashboard do Hermes**, sem identidade B-3PO (`PLATFORM_MATRIX.md` §2) |
| **Mobile (Android)** | **PARTIAL** | APK 44,2 MB constrói · 179 testes · **inspecionado em aparelho** (r18) · **sem os seis modos** |
| **Mobile (iOS)** | **NOT_READY** | exige macOS (`EXT-4`) |
| **Gateway Python** | **NOT_TESTED** | coleta **13.337** testes com 1 erro (`fcntl`, Unix-only); suíte completa não terminou (>30 min) |
| **Release assinado** | **NOT_READY** | sem certificado Authenticode (`EXT-3`) |

## O que está provado, item por item

| Item | Número | Comando/Fonte |
|---|---|---|
| Gate | **14 checks, ok** | `python scripts/check` |
| Typecheck | **0 erros** em 2 projetos | `python scripts/check-b3po-types` |
| Suíte desktop | **27 failed · 19.017 passed** | `npx vitest run` |
| Suíte web | **478/478** · build exit 0 | `npm test` · `npm run build` |
| Suíte mobile | **179 passed** | `npx vitest run` |
| `axe` desktop | **0 em 27 rotas** · `main=1` em todas | `axe.run(document, {})` sem `runOnly` |
| `axe` web | **0 em 15 rotas** | idem |
| Seis modos | **6/6 cores distintas · 6/6 menus distintos** | r15 |
| Home | 11 agentes reais · 1 projeto real · 1 plano da Sofia | r1–r2 |
| Android no aparelho | wordmark fora do relógio (fix provado) | r18, `mobile-r18.png` |

## O que **não** pode ser declarado pronto

| Item | Por quê | Unlock |
|---|---|---|
| Assinatura Authenticode | sem certificado | **`EXT-3`** — comprar/instalar certificado |
| iOS | sem macOS | **`EXT-4`** |
| Conector externo ativo | sem credencial real | **`EXT-6`** — `hermes auth add <provider>` |
| Suíte do gateway | 13k testes levam horas | rodar `scripts/run_tests.sh` num ambiente com bash |
| Os seis modos no mobile | não implementados | decisão de produto (`PLATFORM_MATRIX.md` §6) |
| Identidade B-3PO no web | é o SPA do upstream | decisão de produto |
| IDOR / multitenant | não testados | threat model (F8-1) |

## Regra que este documento segue

**`READY` não é "não achei problema".** É "os gates aplicáveis rodaram e passaram, e o que não rodou
está nomeado". Um `NOT_TESTED` honesto vale mais que um `READY` sem comando.
