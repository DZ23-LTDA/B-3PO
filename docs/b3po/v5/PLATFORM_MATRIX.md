---
tipo: matriz-de-plataforma
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G3/G7
---

# PLATFORM_MATRIX — desktop, web, mobile, medidos em 07/11

> G7 pede *"matriz de READY/PARTIAL/NOT_READY **por plataforma e fluxo**, não um selo global
> enganoso"*. Todo número abaixo foi medido nesta sessão; o que não foi está `NOT_TESTED`.

## Resumo

| Plataforma | Veredito | O que sustenta |
|---|---|---|
| **Desktop Windows** | **READY** (uso interno) | gate 14/14 · tipos 0 · **27 falhas = baseline classificado** · `axe` 0 em 27 rotas · console 0 |
| Desktop Linux | **PARTIAL** | 5 falhas exigem host Linux (SSH real, GPU NVIDIA, toolchain HUD) |
| Desktop macOS | **NOT_TESTED** | sem macOS |
| **Web** | **PARTIAL** | build ✓ 5,28 s · **478/478** · `axe` 0 em 15 rotas — **mas é o dashboard do Hermes** |
| **Mobile Android** | **PARTIAL** | **179 passed · 8 skipped** · typecheck PASS · APK 44,2 MB (07/11 08:39) · inspecionado em aparelho |
| Mobile iOS | **NOT_READY** | exige macOS (`EXT-2`) |
| Gateway Python | **PARTIAL** | coleta 13.337 · 5 arquivos isolados = 263 passed |
| Release assinado | **NOT_READY** | sem certificado (`EXT-1`) |

## Desktop — por fluxo

| Fluxo | Estado | Evidência |
|---|---|---|
| Home (6 modos, Sofia, agentes, projetos) | **READY** | capturas r30–r32 do V4 · 6/6 modos trocam `data-ambiente` |
| Navegação | **READY** | sem rota morta; console 0 em 27 rotas |
| Configurações | **READY** | `h1` + `h2`, `axe` 0 |
| **Prontidão de conectores** | **READY** | rota + cliente + tela · **1 de 28 prontos, 51 credenciais faltando** (r16) |
| Terminal | **READY** | posse por janela (r10) · guarda de ator (V4 r8) |
| Desinstalação · criptografia | **READY** | dono humano exigido (r2/r3) |
| Aprovação de agente | **READY** | identidade do main (r9) |
| **Execução de plano da Sofia** | **PARTIAL** | a ponte existe e cria `pendente` — **nada executa** |
| Empacotamento assinado | **NOT_READY** | `EXT-1` |

## Web — por fluxo

| Fluxo | Estado |
|---|---|
| Build | **READY** — `✓ built in 5.28s` |
| Suíte | **READY** — **71 arquivos · 478 testes** |
| Acessibilidade | **READY** — `axe` 0 em 15 rotas (V4 r12) |
| **Identidade B-3PO** | **AUSENTE** — o `web/` é o dashboard do Hermes upstream (`v4-web-r12.png`) |
| Seis modos | **AUSENTE** |

**O web não é uma segunda superfície do B-3PO** — é o dashboard do runtime. Isso não é defeito; é o
estado do produto, e está dito.

## Mobile — por fluxo

| Fluxo | Estado |
|---|---|
| Suíte | **READY** — **20 arquivos · 179 testes** (+8 skipped: `rest-client.live`, precisa de backend) |
| Typecheck | **READY** |
| Build APK | **READY** — 44,2 MB, 07/11 08:39 |
| Pareamento e conversa | **READY** — inspecionado em aparelho (V4 r18), pt-BR integral |
| Safe-area | **READY** — provado: APK 04/11 sobrepunha o wordmark, 07/11 não |
| **Seis modos** | **AUSENTE** — o app é cliente de conversa, não a plataforma |

## O que separa o estado medido do goal

| Critério do goal | Estado |
|---|---|
| A · autorização não vem do renderer | ✅ medido (329 handlers) |
| B · bot sem capacidade universal | ✅ fechado r7/r8 |
| C · Sofia conclui jornada ponta a ponta | ❌ **executor ausente** |
| D · identidade coerente nas 3 plataformas | 🟡 desktop ✅ · web é o Hermes · mobile sem modos |
| E · prontidão verdadeira de conectores | ✅ rota + tela (r14/r16) |
| F · benchmarks reproduzíveis | ❌ **não existe** (`NOT_TESTED`) |
| G · sem regressão crítica | ✅ baseline classificado (r18–r20) |
| H · não comprovado declarado | ✅ este documento |
