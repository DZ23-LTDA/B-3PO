# GOAL V2 — RODADA 38: EU ESTAVA ERRADO, E O RISCO REAL É OUTRO

**Data**: 05/11/2026 · **§14 — Compras**

---

## PRIMEIRO: A r37 ESTAVA ERRADA

Eu escrevi:

> *"cotação persistida — compara ao vivo; **a tela simplesmente não chama**"*

**É falso.** Medido:

```
cotacao-panel.tsx      tem `onGravar` e `onRemover` desde a r198
compras/index.tsx      JÁ passa `onGravar` → `saveQuotation` com id derivado
purchases-ipc.ts       canal `:saveQuotation` COM guarda
quotation-store.test   19 verdes
```

> **O fluxo de cotação está completo.** Eu supus sem verificar — e o §14 diz exatamente isso: *"deve ser reexecutado e confirmado, não presumido"*.
>
> **A lição vale para mim, não para o produto**: uma suposição sobre o que falta é tão perigosa quanto uma suposição sobre o que existe.

---

## O QUE O §14 REALMENTE DIZ — E QUE EU NÃO TINHA LIDO

> *"Recebimento deve ser idempotente e transacional dentro das garantias reais que a arquitetura suporta. **Se arquivos por domínio não permitem transação atômica entre domínios, projetar saga/outbox/reconciliação e explicitar risco.**"*

---

## O RISCO REAL — MEDIDO NO CÓDIGO

O recebimento grava em **três domínios**, em sequência, **sem transação**:

```ts
const salvo = await deps.store.saveOrder({ ...payload, status: 'recebido' })   // 1

for (const movimento of stockMovementsFor(salvo.order)) {
  const entrada = await deps.inventory.append(movimento)                        // 2
  if ('balance' in entrada) { stock.push(...) }
  else if (entrada.error !== 'ref_duplicado') return { error: entrada.error }   // ← SAI
}

const lancado = await deps.finance.append(pagar)                                // 3
else if (lancado.error !== 'ref_duplicado') return { error: lancado.error }     // ← SAI
```

### Os três estados possíveis

| Falha | Consequência |
|---|---|
| **passo 2** | pedido diz `recebido`, **estoque vazio**, e a tela **não oferece receber de novo** (não está mais em `pedido`) |
| **passo 3** | mercadoria no depósito, **sem conta a pagar** — passivo não registrado |
| ambos ok | correto |

> **A idempotência funciona** (`ref_duplicado` é sucesso, não falha), **mas não cobre a falha parcial**: o pedido já foi marcado antes de o estoque ser tentado.

---

## O QUE FOI CONSTRUÍDO

`purchases-reconciliacao.ts` — **leitura pura** que encontra os pedidos cuja trilha está incompleta.

### Três decisões

| Decisão | Por quê |
|---|---|
| **Não conserta com transação** | não há transação entre arquivos JSON de domínios diferentes. **Inventar uma seria mentir sobre a garantia** |
| **Não grava nada** | uma reconciliação que escreve sozinha vira **um segundo caminho de escrita** com as mesmas garantias que o primeiro — e o dobro de estado para divergir |
| **Só olha `recebido`** | um rascunho não deve nada a ninguém; cobrar dele encheria o relatório de ruído **até ninguém ler** |

### Os três achados

```ts
'estoque_ausente'      pedido recebido, item sem entrada no ledger
'financeiro_ausente'   pedido recebido, sem conta a pagar
'valor_divergente'     conta existe, valor diferente do pedido
```

> `valor_divergente` **não é necessariamente erro** (frete, desconto) — mas **um relatório que omite a diferença não serve para achar fraude**.

---

## O ERRO QUE EU COMETI **DENTRO** DA CORREÇÃO

Escrevi `refEstoque`/`refCompra` **locais** no arquivo novo. Mas as refs reais estão em **`refs.ts` desde a r12**:

```ts
refCompra(id)            → `compra:<id>`
refCompraItem(id, sku)   → `compra:<id>:<sku>`
```

**Corrigido**: os três usos agora vêm de `refs.ts`, e o teste importa **as mesmas funções de produção**.

> **Redefinir a ref no teste faria o teste concordar consigo mesmo e discordar do store** — que é a forma mais silenciosa de um teste passar sem provar nada.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da reconciliação | **122** |
| Testes novos | **12** |
| Regressão (purchase + refs + quotation + invariantes) | **138 verdes** |
| Refs duplicadas | **0** (importadas de `refs.ts`) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE AINDA FALTA NO FLUXO DE COMPRAS (§26, 10 etapas)

| Etapa | Estado |
|---|---|
| **solicitação** (`purchase_requests`) | ❌ **não existe** — o pedido nasce em rascunho |
| cotação | ✅ **completa** (a r37 estava errada) |
| comparação | ✅ preço, prazo, quantidade |
| aprovação | ✅ r26–r28 |
| pedido | ✅ |
| recebimento | ✅ |
| **conferência** (`receipts`) | ❌ **não existe** — a entrada é gerada do pedido |
| estoque | ✅ |
| financeiro | ✅ |
| auditoria | ✅ r35–r37 |

**7 de 10.** Faltam **solicitação** e **conferência** — e as duas são **entidades**, não ligações.

---

## PRÓXIMA RODADA

**A conferência no recebimento.** O §14 exige, e o risco é concreto: hoje a entrada de estoque é **gerada do pedido**, sem ninguém registrar **quanto realmente chegou**.

> Um pedido de 100 unidades que chega com 80 entra com **100** no estoque. **E não há onde escrever que faltaram 20.**

É maior que a solicitação, e é a que **corrige um erro silencioso** em vez de adicionar um passo.
