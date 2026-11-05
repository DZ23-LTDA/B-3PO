# GOAL V2 — RODADA 39: A CONFERÊNCIA — O ERRO DE 100 vs 80

**Data**: 05/11/2026 · **§14 — Compras** · etapa `conferência` do §26

---

## O ERRO SILENCIOSO

```ts
for (const movimento of stockMovementsFor(salvo.order)) {
  // order.items[i].quantity_milli — o que foi PEDIDO
```

**Um pedido de 100 unidades que chega com 80 entra com 100 no estoque.**

E não havia **onde escrever que faltaram 20** — nem para quem conferiu, nem para o fornecedor, nem para o financeiro.

---

## O QUE FOI CONSTRUÍDO

`purchases-conferencia.ts` — separa **o que chegou** de **o que foi pedido**.

```ts
aplicarConferencia(pedido, conferidos?) → { divergencias, pedido, semConferencia }
```

### Por que a conferência é **opcional**

| Razão | |
|---|---|
| **Compatibilidade** | os 100 testes de compras continuam valendo — **verificado** |
| **A maioria está certa** | exigir contagem em todos puniria o caso comum por causa do raro |
| **Ausência ≠ zero** | `[]` = "ninguém contou"; `[{quantity_milli: 0}]` = "não chegou nada" |

### Cinco regras, cada uma com uma razão

| Regra | Por quê |
|---|---|
| **SKU conferida que não está no pedido é ignorada** | criar item a partir da conferência deixaria alguém **aumentar o estoque digitando um SKU que ninguém comprou** |
| **Item do pedido sem conferência fica com a quantidade pedida** | quem conferiu 3 de 5 itens **não quis dizer que os outros 2 não chegaram** |
| **Quantidade negativa vira zero** | estoque negativo por digitação é **pior que a menos** |
| **Mesma SKU duas vezes: a última vence** | somar duas leituras do mesmo item **dobraria o estoque por um erro de tela** |
| **`total_cents` não muda** | o financeiro paga o que foi **comprado**; mudar o total **esconderia a diferença justamente de quem precisa cobrá-la do fornecedor** |

---

## A DECISÃO MAIS IMPORTANTE

> **A divergência é REGISTRADA, não só aplicada.**
>
> Entrar com 80 e não dizer nada é melhor que entrar com 100 — **mas continua sendo um fato escondido**.

E o retorno do canal carrega:

```ts
{ conferencia: { divergencias, semConferencia }, finance, order, stock }
```

> **Um retorno que só diz `ok` obrigaria a tela a reler o estoque para descobrir que faltou mercadoria.**

---

## A PROVA — 17 testes

| Teste | O que trava |
|---|---|
| **pedido de 100 que chega com 80 entra com 80** | o erro original |
| **a divergência é registrada** | não basta aplicar |
| **chegou mais também é divergência** | o caso inverso |
| **zero conferido ≠ sem conferência** | ausência não é zero |
| **SKU inventada é ignorada** | ninguém aumenta estoque digitando |
| **item sem conferência fica com o pedido** | contagem parcial não é recusa |
| **negativo vira zero** | digitação não cria estoque negativo |
| **mesma SKU duas vezes: última vence** | sem dobrar |
| **o total NÃO muda** | o financeiro paga o comprado |
| **status continua `recebido`** | a conferência não muda o estado |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **139** |
| Testes novos | **17** |
| Suíte de compras | **117 verdes** (100 + 17) |
| Regressão completa | **175 verdes** |
| **Compatibilidade** | **100 testes antigos passam sem alteração** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE COMPRAS ESTÁ — §26, 10 etapas

| # | Etapa | Estado |
|---|---|---|
| 1 | **solicitação** (`purchase_requests`) | ❌ **não existe** |
| 2 | cotação | ✅ |
| 3 | comparação | ✅ |
| 4 | aprovação | ✅ r26–r28 |
| 5 | pedido | ✅ |
| 6 | recebimento | ✅ |
| 7 | **conferência** (`receipts`) | ✅ **r39** |
| 8 | estoque | ✅ |
| 9 | financeiro | ✅ |
| 10 | auditoria | ✅ r35–r37 |

**9 de 10.** Falta **solicitação** — e ela é a **única**, e é **entidade nova**, não ligação.

---

## O QUE A CONFERÊNCIA **AINDA** NÃO TEM

| Lacuna | Por quê |
|---|---|
| **Botão na tela** | o canal aceita `conferidos`; **a tela não os envia** — padrão da r2, **quinta vez** |
| **Entidade `receipts`** | a conferência vive no payload e no retorno, **não num arquivo próprio** |
| Divergência como pendência | fica no retorno, não em um store de pendências com o fornecedor |
| Contagem cega (sem ver o pedido) | a tela mostraria o pedido, o que **ancora** a contagem — em auditoria real, contar às cegas é mais confiável |

> **A primeira é a mesma de sempre**: a capacidade existe no processo principal e **falta o botão**.

---

## PRÓXIMA RODADA

**O botão da conferência** — e, com ele, **fechar o fluxo de Compras em 9 de 10 com a porta aberta**, não só a capacidade.

E depois: **solicitação**. É a última etapa do §26, e é a que transforma "alguém decidiu comprar" em **registro de que alguém pediu**.
