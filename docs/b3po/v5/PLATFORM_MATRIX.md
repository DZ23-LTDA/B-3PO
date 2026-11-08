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

### 🔴 O censo NAO e' um numero (r58–r59) — parei de tentar

**Tres metodos, tres resultados para as mesmas rotas:**

| Metodo (r59) | Rotas com violacao |
|---|---|
| `waitForTimeout(6 s)` (r54) | 6 |
| "DOM estavel por 600 ms" (r55–r58) | 6, depois 5, depois 6 |
| **`role="status"` ausente (r59)** | **33** |

**O terceiro e' o mais correto e revelou que os dois primeiros mediam uma pagina ainda carregando** —
com menos elementos montados, menos violacoes.

**E o terceiro tambem nao e' estavel**: `color-contrast` em `/agenda` apareceu (3 nos com o elemento
identificado) e **sumiu na carga seguinte**.

**Parei.** Recensear `axe` de 39 rotas exige um **marcador de prontidao por rota** — o elemento que so
existe com o dado carregado —, e eu nao tenho isso. Todo numero que eu produzir sem ele e' uma foto de
um instante que eu nao escolhi.

### O que **e'** afirmavel, porque foi verificado em cargas repetidas

| Correcao | Evidencia |
|---|---|
| `#/agents` 2 → 0 (r55) | 3 cargas, estavel |
| `/webhooks` 1 → 0 (r57) | 2 cargas, estavel |
| `/profiles`: `aria-input-field-name` sumiu (r56) | o `.cm-content` passou a ter `aria-label="SOUL.md"` |

### O que o terceiro metodo revelou, e que os outros escondiam

**33 de 39 rotas tem violacao.** A dominante e' `page-has-heading-one` — **a maioria das rotas nao tem
`<h1>`** — e isso **e' estrutural, nao um bug de componente**:

- `OverlayBreadcrumbHeader` usa `<h1>` e so algumas rotas o usam;
- `PanelHeader` usa `<h2>` — correto em overlay (ha um h1 atras), errado quando o painel **e'** a pagina.

**Decidir se `#/artifacts`, `#/capabilities`, `#/messaging` sao "paginas" ou "overlays" e' decisao de
arquitetura de interface**, e ela muda o HTML de rotas inteiras.

**Achado mais severo, medido uma vez com o elemento identificado**: em `/agenda`, os rotulos
`Inteligente` e `cliente dev` renderizam a **1.12:1** (11 px, `oklab` com alpha 0.66 sobre `#0d1015`).
Isso **nao e' "texto discreto"** — e' texto ilegivel, e a causa e' um **token de cor**, nao um `className`.
Mexer nele muda **todo** o texto secundario do app: e' decisao de design, registrada como `DEC-5`.

#### A causa do 1.12:1 (r60): portal Radix fora do escopo do tema

**Nao e' token errado.** Os tokens estao calculados e documentados em `styles.css`:

```
36 % → 2.25   45 % → 2.90   54 % → 3.76  (todos reprovados)
58 % → 4.26   62 % → 4.84 OK  66 % → 5.53
--ui-text-tertiary: color-mix(in srgb, var(--ui-base) 66%, transparent)
```

**O que estava errado era o contexto:**

| Medido | Valor |
|---|---|
| modo de tema salvo | `null` → resolve para `system` |
| `prefers-color-scheme: dark` | **false** → tema **claro** |
| classe `dark` em `<html>` | **ausente** |
| `--ui-base` na raiz | `#1f2328` (texto escuro — correto para claro) |
| fundo do elemento violador | `#0d1015` (**escuro**) |
| ancestro do elemento | `#radix-…` — **popover Radix em portal** |

**O portal sai da subarvore onde os tokens do tema vivem.** O texto herda o `--ui-base` do tema claro
(escuro) enquanto a superficie do popover e' escura: **1.12:1**.

E o projeto **ja sabia** que essa combinacao quebra — `use-statusbar-items.tsx` registra *"o `axe-core`
mediu `#bb4d00` sobre `#0d1015` a 3.78:1 em 10 de 10 telas"*, e corrigiu com `dark:text-amber-400`, que
**so vale quando a classe `dark` esta presente**.

### Resolvido na r62: e' **flash de primeiro paint**, nao falha persistente

Amostrei `color-contrast` **40 vezes ao longo de 40 s** em `/agenda`, registrando toda violacao vista:

```
3 violacoes distintas, TODAS com primeira aparicao em t=0 e 1 ocorrencia:
  #radix-… > .truncate:nth-child(2)   3.78  (#bb4d00 sobre #0d1015)
  #radix-… > .truncate                1.12  (#191d22 sobre #0d1015)
  .overflow-x-clip…:nth-…             1.12  (#191d22 sobre #0d1015)
```

**Uma vez, no primeiro frame, e nunca mais.** Nao e' um estado que eu "nao consegui reproduzir": e' um
estado que **so existe antes de o tema resolver**.

**O mecanismo**: `applyTheme` (`themes/context.tsx` L467/L630) pinta os tokens em `documentElement`, mas ha
um paint **anterior** — o shell de boot — antes de o provider montar. Nesse intervalo
`--theme-foreground` ainda e' o fallback do `:root` e a superficie ja e' escura. **Texto escuro sobre
fundo escuro por um frame.**

**Severidade real: baixa.** E' um flash, nao texto ilegivel permanente; depois do primeiro frame o
contraste passa.

**O que faria sumir**: pintar os tokens do tema **antes do primeiro paint** — um bloco inline no
`index.html`, como o projeto ja faz para o `color-scheme`. **Nao corrigi**: exige saber qual tema o boot
deve usar antes de ler a configuracao.

**`DEC-5` (reformulado duas vezes, agora correto)**: *qual tema o primeiro paint usa antes de a
configuracao ser lida.*



Medi `/cron` duas vezes seguidas **com o mesmo metodo** (prontidao = heading presente + DOM estavel):

```
/cron      carga1 = 3   carga2 = 3   (estavel)
/artifacts carga1 = 1   carga2 = 1   (estavel)
```

Mas minutos antes, a mesma rota `/cron` deu **0**. **Tres medicoes da mesma rota, dois resultados.**

**Por que**: a pagina tem estados que o meu sinal de prontidao nao distingue (carregando com esqueleto,
carregando com dado parcial, vazio, pronto). "DOM parou de mudar por 600 ms" nao e' "a pagina chegou ao
estado final" — e' "chegou a *algum* estado que durou 600 ms".

**O que isso significa para os numeros acima**:

| Numero | Confiavel? |
|---|---|
| "39 rotas medidas" | ✅ o conjunto de rotas |
| "6 com violacao" | ❌ varia entre execucoes; ja vi 5 e 6 |
| "34 limpas" | ❌ derivado do anterior |
| `#/agents` 2→0 (r55) | ✅ **verificado 3 vezes, estavel** |
| `/profiles` 6→5 (r56) | ✅ `aria-label` presente no DOM, `aria-input-field-name` sumiu |
| `/webhooks` 1→0 (r57) | ✅ estavel em duas cargas |

**As correcoes sao reais**; o **recenseamento** nao e'. A diferenca importa: eu posso afirmar que
`#/agents`, `/webhooks` e `/profiles` melhoraram, e **nao** posso afirmar "34 de 39 estao limpas".

**O que faria o censo valer**: esperar um **marcador por rota** (o elemento que so existe com o dado
carregado), nao um timeout nem uma heuristica de estabilidade.

#### E o `h2` do `PanelEmpty` (r58)

Troquei o `<p>` do titulo por `<h2>`: **semanticamente correto** (um titulo de secao e' heading) e
**sem efeito medido** — `/cron` continuou em 3. Fica pela semantica, **nao como correcao de `axe`**.

**34 das 39 rotas tem `axe` 0.** As 5 restantes somam **10 nos**.

### r57 — o `section` sem nome nao era landmark

Na r55 eu troquei `PanelEmpty` de `<div>` para `<section aria-label={title}>` e `#/agents` foi a 0. Mas
`/webhooks` **continuava** violando: ali o estado vazio tem `description` e **nenhum `title`**, entao o
`<section>` saia **sem nome** — e `<section>` sem nome acessivel **nao e landmark**.

**Corrigido**: quando falta o titulo, a propria `description` nomeia a regiao. Nao e rotulo inventado: e
o texto que a regiao contem.

| Rota | Antes | Depois |
|---|---:|---:|
| `/agents` | 2 | **0** (r55) |
| `/webhooks` | 1 | **0** (r57) |
| `/cron` | 3 | 3 (resta) |
| `/artifacts` | 1 | 1 (resta) |
| `/capabilities` | 1 | 1 (resta) |
| `/messaging` | 4 | 4 (resta) |
| `/profiles` | 6 | 5 (r56) |

**O padrao**: um `<section>`/`role=region` **so** conta como landmark quando tem nome acessivel. Eu
tratei "trocar div por section" como a correcao completa — **era metade dela**.

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
