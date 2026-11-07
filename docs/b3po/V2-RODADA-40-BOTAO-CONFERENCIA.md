# GOAL V2 — RODADA 40: O BOTÃO DA CONFERÊNCIA — E UM ERRO DE 1000× QUE EU QUASE COMETI

**Data**: 05/11/2026 · **§14 — Compras** · etapa 7 com a porta aberta

---

## O QUE FOI CONSTRUÍDO

A tela de compras agora pergunta **"chegou"** por item, na mesma lista que já mostrava o pedido:

```
A-001 · 100 un × R$ 50,00     chegou [  80 ]    [remover]
B-002 · 50 un × R$ 12,00      chegou [     ]    [remover]

[ salvar pedido ]  [ receber ]
```

**Vazio = não contei** (o pedido vale). **`0` = não chegou nada.** A distinção é a razão de o campo ser **texto e não número** — um input numérico não consegue representar "não preenchido" diferente de "zero".

---

## O ERRO DE 1000× QUE EU QUASE COMMITEI

Escrevi:

```ts
quantity_milli: Math.round(quantityValue(conferidos[sku]) * 1000)
```

**`quantityValue` já multiplica por 1000** — é a função que converte "10,00" em `10000` desde sempre.

| | Valor para "chegou 80" |
|---|---|
| **Meu código** | `Math.round(80_000 × 1000)` = **80.000.000** |
| **Correto** | `quantityValue('80')` = **80.000** |

> **Erro de 1000×: 80 mil unidades virariam 80 milhões.** O typecheck **não pega** — os dois lados são `number`.
>
> **O teste pegaria** (a r39 testa "pedido de 100 que chega com 80 entra com 80") — **mas só se o teste atravessasse a tela**, e ele testa a função pura.

**Corrigido antes do commit**, com verificação explícita: `grep '* 1000'` no arquivo → **0 ocorrências**.

---

## A LIÇÃO — e ela é nova

| Rodada | O que o typecheck **não** pegou |
|---|---|
| r30 | 10 handlers duplicados |
| r33 | 58 falsos positivos de duplicação |
| **r40** | **erro de unidade de 1000×** |

> **Em todas: os dois lados da comparação tinham o mesmo TIPO.** `number` e `number`; `string` e `string`.
>
> **Tipos não carregam unidade.** `100_000` mili-unidades e `100_000` unidades são o mesmo `number` — e a única coisa que distingue é **o nome e o teste**.

**A verificação que faltava**: procurar a multiplicação por 1000 num arquivo que já usa uma função que multiplica por 1000. **Uma linha de grep.**

---

## AS CINCO CAMADAS — de novo

| Camada | Desde |
|---|---|
| 1. Regra (`aplicarConferencia`) | r39 |
| 2. Canal (`receive` aceita `conferidos`) | r39 |
| 3. Preload | r39 (mesmo `receive`) |
| 4. Wrapper (`orderPayload[conferidos]`) | r39 |
| 5. **Tela** | **r40** |

> **É a terceira capacidade com as cinco camadas completas** — Compras (aprovação), Auditoria, e agora **Conferência**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela | **504 → 531 linhas** |
| Edições com `edit` | **4** |
| Erros de tipo | **0** |
| `* 1000` no arquivo | **0** |
| Testes | **124 verdes** |
| Gate | **14 checks, ok** |
| **Erro de 1000× evitado** | **sim** |

---

## ONDE COMPRAS ESTÁ — §26, 10 etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | **solicitação** | ❌ **não existe** |
| 2–6 | cotação · comparação · aprovação · pedido · recebimento | ✅ |
| 7 | **conferência** | ✅ **r39 + r40 (porta aberta)** |
| 8–10 | estoque · financeiro · auditoria | ✅ |

**9 de 10 — com a última etapa acessível pela interface.**

---

## O QUE AINDA FALTA

| Lacuna | Natureza |
|---|---|
| **solicitação** (`purchase_requests`) | **entidade nova** — a única etapa ausente |
| entidade `receipts` | a conferência vive no payload; não há arquivo próprio |
| divergência como pendência | fica no retorno; não há store de pendências com fornecedor |
| contagem cega | a tela mostra o pedido, o que **ancora** a contagem |

> **A contagem cega merece nota**: em auditoria real, **contar sem ver o pedido** é mais confiável. Mostrar o esperado convida a marcar o esperado.

---

## PRÓXIMA RODADA

**A solicitação** — a última etapa do §26, e a que transforma *"alguém decidiu comprar"* em **registro de que alguém pediu**.

Ordem do §14: `solicitação → cotação → comparação → aprovação → pedido`. Hoje o fluxo começa na **cotação**: alguém já sabe o que quer e por quanto. **A solicitação é o que existe antes disso** — e é o que permite medir se a compra foi necessária.
