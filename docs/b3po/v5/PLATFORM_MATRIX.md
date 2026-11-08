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

### ⚠️ O numero do `axe` nao e' reprodutivel como esta escrito (r54)

O documento afirma `axe 0 em 27 rotas`. Remedido na r54 em 5 rotas: **2 violacoes em `#/agents`** — e a
violacao **mudou entre duas cargas da mesma rota**:

| Carga | Violacoes |
|---|---|
| 1ª | `region` (2 nos: "No live subagents") |
| 2ª | `landmark-one-main` + `page-has-heading-one` |

**A causa e' medir durante o boot**: a pagina passa por shell de carregamento, estado vazio e estado
pronto, e cada um tem estrutura diferente. Um `waitForTimeout` fixo pega um estado arbitrario.

**O que isso invalida**: o "axe 0" do V4 **nao e' reproduzivel** com o metodo que eu descrevi (esperar
6-7 s). Para valer, a medicao precisa de um **sinal de prontidao** (um seletor do estado final), nao de
tempo.

**Corrigido na r55, com o metodo certo.** O erro da r54 foi duplo:

1. eu procurava `<section` no **JS transformado** do Vite, onde JSX vira `jsx("section", …)` — nao existe
   string literal. **O dev server nunca esteve velho**; eu procurei a marca errada;
2. o `axe` media um estado arbitrario do boot.

**Com sinal de prontidao** (h1 presente + DOM estavelpor 700 ms × 2), a medicao ficou reproduzivel:

| Rota | Antes | Depois |
|---|---:|---:|
| `#/agents` | **2** (`region`) | **0** |
| `#/sofia` | 0 | 0 |
| `#/settings` | 0 | 0 |

**A correcao**: `PanelEmpty` (o estado vazio do painel, compartilhado) passou de `<div>` a
`<section aria-label={title}>` — um `<section>` com nome acessivel **e** landmark. Nao escondi nada com
`aria-hidden`, que resolveria o relatorio e quebraria o leitor de tela.

### Censo de acessibilidade: **39 rotas medidas na r56**, 6 com violacao

O censo que o V4 nunca fez de verdade — com sinal de prontidao (h1/h2 presente + DOM estavel), nao
timeout.

| Rota | Nos | Violacoes |
|---|---:|---|
| `/profiles` | 6 → **5** | `landmark-no-duplicate-banner`, `landmark-unique`, `region` |
| `/messaging` | 4 | `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`, `page-has-heading-one` |
| `/cron` | 3 | `region` |
| `/webhooks` | 1 | `region` |
| `/artifacts` | 1 | `page-has-heading-one` |
| `/capabilities` | 1 | `page-has-heading-one` |

**33 das 39 rotas tem `axe` 0.** As 6 restantes somam **15 nos**.

### Corrigido nesta sessao

| Rodada | Achado | Correcao | Resultado |
|---|---|---|---|
| r55 | `#/agents` — `region` (2 nos) | `PanelEmpty` virou `<section aria-label>` | **2 → 0** |
| r56 | `#/profiles` — **`aria-input-field-name` (serious)** | `CodeEditor` ganhou `EditorView.contentAttributes.of({ 'aria-label': filePath })` | **1 no → 0**; o campo passou a anunciar `SOUL.md` |

**O `aria-input-field-name` era o unico de impacto `serious`**: o `.cm-content` do CodeMirror e um
`contenteditable` sem nome acessivel — quem usa leitor de tela ouvia "caixa de texto" e nada mais, e era
o unico campo da tela de perfis.

### O que **nao** foi corrigido

As **15 violacoes restantes** sao de **estrutura de landmark** (`region`, `landmark-unique`,
`landmark-no-duplicate-*`, `page-has-heading-one`). Corrigir exige mexer no **shell das paginas** — e nao
num componente isolado —, e cada uma muda o HTML de uma rota inteira. **Ficam declaradas, nao escondidas.**

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
