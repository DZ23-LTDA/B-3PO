# ACESSIBILIDADE — auditoria medida na janela (rodada 228)

## Como foi medido

Electron real, CDP, varredura do DOM nas telas **Home, `/crm`, `/finance`, `/stock`**. Não é checklist
teórico — são os elementos que existem na tela.

## O que está CERTO

| Item | Valor | Norma |
|---|---|---|
| **`documentElement.lang`** | **`pt`** | WCAG 3.1.1 ✅ |
| **`document.title`** | **`B-3PO`** | marca correta, sem "Hermes" ✅ |
| **Imagens sem `alt`** | **0 de 1** | WCAG 1.1.1 ✅ |
| `h1` em `/crm`, `/finance`, `/stock` | **1 em cada** | WCAG 1.3.1 ✅ nessas telas |

**O rebranding está correto no nível do documento**: `lang="pt"` e `title="B-3PO"`.

## O que FALTA — com número

### 1. Foco visível — **57 elementos interativos** — WCAG 2.4.7 (AA)

```
interativos_sem_foco_visivel: 57
```

Elementos com `outline-style: none` **e** sem `box-shadow` de foco. **Esta é a violação mais séria**: quem
navega por teclado não vê onde está.

### 2. Landmarks ausentes — WCAG 1.3.6 / 2.4.1

| Landmark | Quantidade |
|---|---|
| `main` / `role="main"` | **0** |
| `nav` / `role="navigation"` | **0** |

Sem `main`, o leitor de tela não tem como pular para o conteúdo. Sem `nav`, a navegação não é anunciada como
região.

### 3. Botão sem rótulo acessível — WCAG 4.1.2

**1 botão**, consistente nas quatro telas. Está na **barra de status**:

```html
<button class="inline-flex h-full items-center gap-1 rounded-none text-[0.6875rem] text-(--ui-text-tertiary)...">
```
Pai: `flex min-w-0 items-stretch gap-0.5 overflow-x-clip`

**Sem `aria-label`, sem `title`, sem texto** — um leitor de tela anuncia "botão" e nada mais.

### 4. Home sem `h1` — WCAG 1.3.1

`h1: 0` na Home; `1` nas telas de módulo.

### 5. Inputs sem label — intermitente

| Tela | Inputs sem label |
|---|---|
| Home | **1** |
| `/crm` | 0 |
| `/finance` | 0 |
| `/stock` | **1** |

## O que é NOSSO e o que é do UPSTREAM

| Achado | Origem |
|---|---|
| `lang="pt"`, `title="B-3PO"`, `alt` nas imagens | **nosso rebranding** — e está certo |
| `h1` nas telas de módulo | **nosso** (as telas que criamos têm `h1`) |
| **Foco visível (57)** | **shell do upstream** — CSS global |
| **Landmarks `main`/`nav`** | **shell do upstream** |
| **Botão da barra de status** | **shell do upstream** |
| **Home sem `h1`** | **shell do upstream** |

**Eu não vou "corrigir" os itens do shell nesta rodada.** Mexer no CSS global e na estrutura do shell é o tipo
de mudança que afeta **toda** a aplicação por um ganho que precisa ser verificado em todas as telas — e o F2-A
mantém o `main` como espelho limpo do upstream.

## O que isso significa para o §26 ("WCAG 2.2 AA quando aplicável")

| Critério | Estado |
|---|---|
| 3.1.1 Idioma da página | **ATENDE** (`pt`) |
| 1.1.1 Conteúdo não textual | **ATENDE** (0 imagens sem alt) |
| 4.1.2 Nome, função, valor | **FALHA PARCIAL** — 1 botão de status |
| 1.3.1 Informação e relações | **FALHA PARCIAL** — Home sem `h1` |
| **2.4.7 Foco visível (AA)** | **FALHA** — 57 elementos |
| 1.3.6 Identificar finalidade | **FALHA** — sem landmarks |

**Classificação honesta: `PARTIAL`.** O produto **não** atende WCAG 2.2 AA hoje, e **a maior parte do que falta
está no shell herdado, não nas telas de negócio que construímos**.

## O que continua sem medição

| Item | Estado |
|---|---|
| Contraste de cores (1.4.3) | **não medido** — precisaria calcular luminância par a par |
| Navegação por teclado ponta a ponta | **não testada** com teclado real |
| Leitor de tela (NVDA/JAWS) | **nunca executado** |
| Zoom 200% (1.4.4) | **não testado** |
| Movimento/redução (2.3.3) | **não testado** |

## Medido

| Medida | Valor |
|---|---|
| Telas auditadas | 4 |
| Botões na Home | 73 |
| Botões sem rótulo | **1** |
| Interativos sem foco visível | **57** |
| Landmarks `main`/`nav` | **0 / 0** |
| Imagens sem alt | **0** |
