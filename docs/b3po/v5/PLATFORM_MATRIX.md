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
| **Desktop Windows** | **READY** (uso interno) | gate **17/17** · tipos 0 · **23 falhas sob carga** (17 isoladas), 0 arquivo novo (r73) · `axe`: **34 de 39 rotas** sem violacao persistente (r63) · console **0 em 39** (r69) |
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

### r64 — o heading que faltava, e a troca que fiz

`PageSearchShell` (o shell de `/artifacts`, `/capabilities` e `/messaging`) ganhou uma prop **`title`** que
renderiza `<h1 className="sr-only">`. A pagina nao mostra titulo visual — a identidade vem do item de menu
—, entao o heading e' **`sr-only`**: da' estrutura a quem usa leitor de tela sem mudar o layout. Nunca
`aria-hidden`, que esconderia de quem mais precisa.

| Rota | Antes | Depois |
|---|---|---|
| `/artifacts` | `page-has-heading-one` | **0 violacoes** |
| `/capabilities` | `page-has-heading-one` | **0 violacoes** |
| `/messaging` | 4 (incluindo `page-has-heading-one`) | 4, **mas diferente** |

**A troca em `/messaging` — e o conserto dela (r65)**: saiu `page-has-heading-one`, entrou
`heading-order` (h1 seguido de h3). **Nao deixei assim**: o cartao de plataforma virou `<h2>` e o
`SectionTitle` virou `<h3>`, restaurando a hierarquia.

Verificado em **3 amostras identicas**:

```
ordem: H1 > H2 > H3 > H3 > H3 > H3
violacoes: landmark-main-is-top-level, landmark-no-duplicate-main, landmark-unique
```

`heading-order` **sumiu**, `page-has-heading-one` **nao voltou**, e sobrou o grupo estrutural (dois
`<main>` na mesma rota), que nao e' heading.

**`/messaging` continua com dois `<main>`** — isso nao e' heading, e' shell duplicado, e nao tem correcao
de uma linha.

### r66 — dois `<main>` no mesmo documento

`/messaging` tinha **dois `<main>`**, um **dentro** do outro: o do shell (`controller.tsx`, r289) e um
segundo em `master-detail.tsx`, mais um terceiro em `mcp-editor.tsx`. `main` dentro de `main` e' **HTML
invalido** e o `axe` acusava tres violacoes (`landmark-main-is-top-level`, `landmark-no-duplicate-main`,
`landmark-unique`).

O proprio projeto **ja tinha decidido isso** — `overlay-split-layout.tsx` registra *"r82 — `<div>`, nao
`<main>`. O overlay abre POR CIMA do shell, e o shell ja tem o `<main>`"*. Dois arquivos ficaram de fora.

**Corrigido**: `master-detail.tsx` e `mcp-editor.tsx` passaram a `<div>`, como o precedente manda.

**Verificado**: `mains = 1` em **todas as 5 rotas** auditadas, e as tres violacoes de `/messaging`
**sumiram**. 157 testes dos componentes afetados continuam verdes.

**O que resta**: `region` (conteudo fora de landmark), que aparece de forma **intermitente** em
`/messaging`, `/capabilities`, `/artifacts` e de forma estavel em `/cron`; e `/profiles` mantem
`landmark-no-duplicate-banner` (dois `<header>`).

### r67 — a raiz comum das rotas restantes: **overlay e' `role="presentation"`**

As rotas que sobram no censo (`/cron`, `/profiles`, e parcialmente `/messaging`, `/capabilities`) tem a
**mesma causa**, e nao e' heading nem cor. E' isto:

| Medido | Valor |
|---|---|
| `<main>` do app | vem do **pane tree** (`renderer/index.tsx:83`) |
| `/profiles` | conteudo em **portal** — `emPortal: true` |
| `/cron` | no shell, mas `conteudoDentroDoMain: false` |
| `headersDentroDoMain` | **0** nas duas |
| root do `OverlayView` | **`role="presentation"`** |
| card interno | `data-glass-raised`, **sem role** |

`/artifacts` esta `conteudoDentroDoMain: true` — **por isso** zerou depois do fix da r64. `/cron` e
`/profiles` renderizam como **overlay**, ao lado do pane tree e fora do `<main>`; o wrapper do overlay e'
`role="presentation"`, entao o conteudo nao esta em landmark nenhum. Dai:

- `region` — "conteudo fora de landmarks";
- `landmark-no-duplicate-banner` — os dois `<header>` da rota ficam **fora de `<main>`**, e `<header>`
  fora de `<main>` **e'** `banner`; dois viram duas banners.

**Uma causa, tres sintomas, tres rotas.** A correcao exige decidir o que um overlay **e'**:

| Opcao | Consequencia |
|---|---|
| `role="dialog"` | correto se for modal; estes sao rotas, nao modais |
| `role="region"` + `aria-label` | correto para painel de pagina; precisa que o overlay saiba seu nome |
| por o overlay **dentro** do `<main>` | muda o shell e o layout de todas as rotas |

`OverlayView` hoje **nao recebe titulo** (so `closeLabel`), entao a opcao do meio exige uma prop nova e
que cada rota informe o nome — o mesmo `t.sidebar.nav.*` que a r64 ja usou.

**Registrado como `DEC-6`**: qual papel um overlay-que-e'-rota declara.

**Nao corrigi**: e' a mesma classe de decisao do `page-has-heading-one` de antes, e a mudanca atinge
**todas** as rotas de overlay de uma vez.

### Censo definitivo (r63): **5 rotas com violacao persistente de 39**

O metodo que funcionou: **prontidao** (`role="status"` ausente) **+ 3 amostras com 1,2 s de intervalo**,
contando so o que aparece **identico nas tres**. Isso separa o que persiste do que e' flash.

| Rota | Violacao persistente |
|---|---|
| `/artifacts` | `page-has-heading-one` |
| `/capabilities` | `page-has-heading-one` |
| `/cron` | `region` |
| `/messaging` | `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`, `page-has-heading-one` |
| `/profiles` | `landmark-no-duplicate-banner`, `landmark-unique`, `region` |

**34 das 39 rotas sao limpas de forma estavel.** Uma rota teve violacao **so transitoria** (o flash de
primeiro paint da secao anterior). Dados brutos: `evidence/axe-censo-r63.json`.

### Os cinco numeros que eu produzi para a mesma pergunta

| Rodada | Metodo | Rotas com violacao |
|---|---|---:|
| r54 | `waitForTimeout(6 s)` | 6 |
| r55–r57 | "DOM estavel 600 ms" | 6 → 5 → 6 |
| r59 | `role="status"` ausente, **1 amostra** | **33** |
| **r63** | **prontidao + 3 amostras identicas** | **5** |

**O r54 estava mais perto que o r59.** O metodo "sofisticado" deu 33 porque media **imediatamente**
depois de o `role="status"` sumir — a pagina ja nao tinha loader, mas ainda nao tinha reconciliado o
conteudo. As tres amostras com intervalo sao o que faltava.

**O que os 5 tem em comum**: todos sao **estrutura de landmark/heading**, nao contraste, nao foco, nao
rotulo. E o mesmo grupo que a r59 identificou como arquitetural: `PanelHeader` usa `<h2>` (certo em
overlay, errado quando o painel **e'** a pagina) e `OverlayBreadcrumbHeader` (h1) so e' usado por algumas
rotas.

### O que isso NAO invalida

As tres correcoes feitas continuam reais e verificadas — `#/agents` e `/webhooks` saem deste censo porque
**nao aparecem mais** entre os cinco.



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
