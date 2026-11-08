# Compras com guarda: 10 de 40 (rodada 222)

## O domínio que move dinheiro e estoque ao mesmo tempo

`receive` faz **três coisas**: marca o pedido recebido, **lança entradas no estoque** e **cria a conta a pagar**. Tudo `execute`.

| Canal | Ação |
|---|---|
| `suppliers`, `orders`, `cotacao`, `quotations` | `read` |
| `saveSupplier`, `saveOrder`, `receive`, `saveQuotation`, `removeQuotation` | `execute` |

## A ordem que importa: guarda **antes** do limite de compra

```ts
exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
  // ...normalizePurchase
  if (deps.limiteDeCompra) { /* ...situacaoDaCompra... */ }
```

> **A guarda vem ANTES do limite de propósito**: primeiro se sabe **quem** está agindo, depois se pergunta **se o valor cabe no teto**.
>
> **Invertendo, um pedido acima do limite responderia "precisa de aprovação" a quem nem poderia comprar** — e a pessoa iria atrás da **assinatura errada**.

## O erro que eu cometi no próprio arquivo

Escrevi o handler `removeQuotation` usando `id` e tive certeza de que faltava o parâmetro. Fui corrigir e **o texto já estava igual** — o `id` **estava declarado**. O typecheck confirmou (0 erros nele).

**O que faltava era outra coisa**: `PurchasesDeps` ganhou `actorOf` obrigatório, e **`erp-ipc` e dois testes passavam deps sem ele**. O erro de tipo apontou os três na primeira execução.

## Medido

| | |
|---|---|
| Testes de compras | **33 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## O ratchet

| | r219 | r220 | r221 | **r222** |
|---|---|---|---|---|
| Canais com guarda | 7 | 8 | 9 | **10** |
| Dívida | 33 | 32 | 31 | **30** |

## O ERP protegido até aqui

| Domínio | Estado |
|---|---|
| CRM (4 canais) | **fechado** |
| Financeiro | ✓ |
| Estoque | ✓ |
| RH | ✓ |
| **Compras** | **✓ (r222)** |
| Vendas | ✓ (desde antes) |
| **Restantes** | `scheduling`, `services`, `marketing`, `documents`, `companies`, `catalog`, `fiscal`, `privacy`, `analytics`, `after-sales`, `service-desk` |

## Medido

| Medida | Valor |
|---|---|
| Handlers protegidos nesta rodada | **10** |
| Testes ajustados | 3 (`erp-ipc`, 2 arquivos de teste) |
| Erros de tipo pegos antes do commit | **3** |
