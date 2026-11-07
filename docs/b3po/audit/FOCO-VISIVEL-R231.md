# Foco visível: 57 elementos — a causa é uma regra explícita (rodada 231)

## O que eu encontrei ao ir corrigir

Os 57 elementos "sem foco visível" da r228 **não são esquecimento**. São o efeito de uma regra com
justificativa escrita, em `apps/desktop/src/styles.css`:

```css
/* No focus rings, anywhere. Kills the native outline plus Tailwind's
   `focus-visible:ring-*` (a box-shadow driven by --tw-ring-*). Unlayered so it
   beats the utilities layer without !important on the outline. The composer /
   .desktop-input-chrome focus glow is untouched — those set `box-shadow`
   directly rather than through the ring vars. */
*:focus,
*:focus-visible {
  outline: none;
}

*:focus-visible {
  --tw-ring-shadow: 0 0 #0000 !important;
  --tw-ring-offset-shadow: 0 0 #0000 !important;
}
```

**Isso é decisão de design do upstream, não defeito de implementação.** O comentário diz o que faz, onde, e por
que vence a camada de utilities.

## Por que eu NÃO reverto

| Razão | Detalhe |
|---|---|
| **É escolha do produto upstream** | o comentário é explícito: "No focus rings, **anywhere**" |
| **O seletor é global e unlayered** | vencer exigiria `!important` ou seletor mais específico, e aí **todo** elemento muda de aparência |
| **Afeta toda a aplicação** | não é uma tela; é o shell, a sidebar, o composer, os menus |
| **F2-A** | `main` continua espelho limpo; mudar isso é divergência de design, não correção de defeito |
| **O produto tem um glow alternativo** | o comentário registra que o composer usa `box-shadow` próprio |

## O que isso muda na classificação

| Antes (r228) | Agora (r231) |
|---|---|
| "57 elementos sem foco visível — FALHA" | **"a aplicação remove o foco visível por decisão registrada"** |
| parecia dívida de acessibilidade nossa | **é escolha de design do upstream, com o custo de WCAG 2.4.7 assumido** |

**A violação de WCAG 2.4.7 continua existindo** — o que muda é **de quem é**. Não é um bug que passou; é uma
regra que alguém escreveu de propósito.

## O que seria preciso para atender 2.4.7, se o dono decidir

Duas opções, ambas **decisão de produto**:

1. **Reverter a regra** e aceitar o anel de foco nativo em toda a aplicação.
2. **Substituir por um indicador próprio** — um `box-shadow` de foco desenhado para o tema, aplicado em
   `*:focus-visible`, mantendo a estética.

**Nenhuma das duas eu faço sozinho**: a primeira muda a cara do produto; a segunda é design, e o dono tem
referência visual própria (a que ele forneceu).

## O que a auditoria de acessibilidade passa a dizer, com precisão

| Critério | Estado | Origem |
|---|---|---|
| 3.1.1 Idioma (`lang="pt"`) | **ATENDE** | nosso |
| 1.1.1 Imagens com `alt` | **ATENDE** (0 sem alt) | nosso |
| 4.1.2 Nome acessível | **ATENDE** (0 botões sem rótulo, 0 inputs sem label) | **nosso, corrigido nas r229–r230** |
| 1.3.1 `h1` nas telas de módulo | **ATENDE** | nosso |
| 1.3.1 Home sem `h1` | **FALHA** | shell upstream |
| 1.3.6 Landmarks `main`/`nav` | **FALHA** | shell upstream |
| **2.4.7 Foco visível** | **FALHA POR DECISÃO** | shell upstream, regra explícita |

## O padrão que se repete

> **Quatro rodadas de acessibilidade, e a cada uma o "defeito" se revela outra coisa**: um botão sem rótulo
> (real, corrigido), um input sem label (real, corrigido), um falso positivo do meu detector (r230), e agora
> **uma regra deliberada que eu ia "consertar"**.
>
> **A pergunta certa nunca foi "quantos elementos falham" — foi "por que".**

## Medido

| Medida | Valor |
|---|---|
| Elementos sem foco visível | **57** |
| Causa | **regra global `outline: none` em `*:focus`** |
| Origem | **upstream, com comentário justificando** |
| O que eu mudei nesta rodada | **nada no CSS** — documentei a origem |
