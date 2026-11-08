# GOAL V2 — RODADA 50: O BECO DA r25 TINHA VOLTADO, DISFARÇADO

**Data**: 05/11/2026 · **§14 — Compras** · o caminho aprovado

---

## O QUE EU FUI PROVAR, E O QUE ENCONTREI

A r49 deixou: *"falta provar que aprovar libera."*

**Fui escrever o teste. Ele não podia existir.** Medido:

```
receive(payload)
  → limite → situacaoDaCompra → precisa?
    → return { error: 'aprovacao_necessaria' }   ← SAI AQUI
  → saveOrder(status: 'recebido')                 ← O PEDIDO NUNCA É CRIADO
```

**E `aprovarCompra` faz:**

```ts
const pedido = await deps.obterPedido(pedidoId)
if (!pedido) return { error: 'pedido_inexistente' }
```

> **A recusa acontecia ANTES de o pedido existir.** Então:
>
> `aprovacao_necessaria` → `aprovar` → **`pedido_inexistente`**
>
> **O beco sem saída da r25 tinha voltado** — mais sutil: não era "ninguém pode aprovar", era **"não há o que aprovar"**.

---

## A CORREÇÃO — em três partes

### 1. A recusa passou a gravar o pedido

```ts
const aguardando = await deps.store.saveOrder({
  ...payload,
  approval: { ..., solicitante: atorDoPedido?.id ?? '', ... },
  status: 'pedido'                             // ← não `recebido`
})

return { error: 'aprovacao_necessaria', excedente_cents, pedido_id: aguardando.order.id }
```

> **Gravar em `pedido` resolve os dois lados**: o pedido existe (com o seu id) **para ser aprovado**, e **não entrou no estoque nem no financeiro** — que é o que "não recebido" significa.

### 2. O pedido aguardando leva o **solicitante**

> **Sem ele**, `decidirAprovacao` compara `decisor === solicitante` contra **string vazia** — e a regra **"quem pediu não aprova o próprio pedido" ficaria INERTE justamente no caminho que mais precisa dela**.

### 3. Receber um pedido aprovado pula o limite

```ts
const jaAprovado = typeof payload?.['aprovado_por'] === 'string'
if (deps.limiteDeCompra && !jaAprovado) { ... }
```

> **Sem isto, aprovar não serviria para nada**: a segunda tentativa de receber seria barrada igual.

---

## O BECO, FECHADO — de verdade

```
receive(payload grande)
  → 'aprovacao_necessaria' + pedido_id     ← o pedido EXISTE, aguardando
  → aprovar(pedido_id)                     ← alguém aprova
  → receive({ id, aprovado_por })          ← passa, entra estoque + financeiro
```

---

## A PROVA — 2 testes novos

| Teste | O que trava |
|---|---|
| **a recusa grava o pedido e devolve o id aprovAvel** | o id existe **e o estoque continua zero** |
| **aprovado, o recebimento entra no estoque e no financeiro** | `10_000` no saldo e conta de `50_000` |

> **O primeiro é a prova do beco fechado**: ele chama `aprovar` com o id que a **recusa devolveu** — e antes da r50 essa chamada responderia `pedido_inexistente`.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do fluxo | **9** (eram 7) |
| Regressão | **176 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O FLUXO DE COMPRAS — completo, incluindo a aprovação

| Etapa | Teste |
|---|---|
| solicitação | ✅ |
| cotação | ✅ (store + painel) |
| comparação | ✅ |
| **aprovação** | ✅ **r50 — barra E libera** |
| pedido | ✅ |
| recebimento | ✅ |
| conferência | ✅ |
| estoque | ✅ |
| financeiro | ✅ |
| auditoria | ✅ |

> **O §26 finalmente tem o caminho completo — não só as etapas.**

---

## O QUE ISSO ENSINA

> **A r25 fechou o beco "ninguém pode aprovar". A r50 encontrou o mesmo beco de outro ângulo: "não há o que aprovar".**
>
> **A correção de uma reivindicação é o teste do caminho feliz.** Ele não existia — e por isso o beco sobreviveu por 24 rodadas.

---

## PRÓXIMA RODADA

O §14 está **completo e provado**. Próximo: **§15 — Policy Engine e Aprovações**, que ainda não li.

> **50 rodadas.** O módulo de Compras passou de "33 testes e uma tela simplificada" a **um fluxo de 10 etapas com o caminho aprovado medido de fora**.
