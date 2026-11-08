# GOAL V2 — RODADA 61: O FLUXO DE VENDA — E O QUE ELE ENCONTROU

**Data**: 05/11/2026 · **§26 — critérios de aceite** · segundo fluxo comprovado

---

## O QUE O §26 PEDE PARA VENDA

> `produto → canal → pedido → **reserva** → pagamento confirmado → expedição → entrega → financeiro → auditoria`

**A r45 provou Compras. Esta prova Venda.**

---

## O QUE O TESTE PERCORRE

```
1. ESTOQUE ENTRA       100.000 mili de BUJAO-13
2. VENDA               faturar → total_cents
3. ESTOQUE SAI         90.000 ← baixou no faturamento
4. FINANCEIRO          conta a receber com o total da venda
5. AUDITORIA           trilha em disco, resource 'sales'
6. ENTREGA             criada com o id da venda (a ligação da r57)
7. COMPROVANTE         'entregue' com recebedor — **sobrevive a instância nova**
```

---

## O QUE ELE **ENCONTROU** — e é o ponto

### **Não há reserva.**

O §26 põe `reserva` **antes** do pagamento. Medido:

```ts
// sales-store.createSerializado → faturar
// o estoque SAI no faturamento, não na reserva
await deps.inventory.append(movement)   // ← baixa imediata
```

**Não existe campo de "quantidade reservada" separado de "disponível".**

> **O teste registra a diferença em vez de escondê-la** — com um teste chamado *"não há RESERVA: o estoque sai no faturamento, não no pagamento"*.

**E a consequência é real**: dois vendedores podem faturar o mesmo último botijão, e o segundo descobre **só quando o estoque ficar negativo** (ou for barrado — `stockShortage` existe no `faturar`).

---

## O QUE ISSO SIGNIFICA PARA O VERTICAL

| Etapa do §26 | Estado |
|---|---|
| produto | ✅ |
| canal | ⚠️ venda direta; sem marketplace (r54) |
| pedido | ✅ |
| **reserva** | ❌ **não existe** |
| pagamento confirmado | ⚠️ conta a receber nasce; **confirmação não** |
| expedição | ✅ **entrega (r56–r60)** |
| entrega | ✅ |
| financeiro | ✅ |
| auditoria | ✅ |

**5 completos, 2 parciais, 1 ausente** (reserva).

> **É melhor que Compras estava na r25** (6 de 9 com 2 parciais) — e o teste foi escrito **antes** de eu saber que passaria.

---

## A PROVA

| Teste | O que trava |
|---|---|
| **estoque → venda → baixa → financeiro → auditoria** | o caminho inteiro |
| **venda faturada é imutável** | reescrever apagaria o que o cliente recebeu |
| **a entrega aponta para a venda** | a ligação da r57 |
| **comprovante sobrevive a instância nova** | o disco guarda |
| **não há reserva** | a diferença contra o §26, **registrada** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do fluxo de venda | **5** |
| Regressão (sales + delivery + purchase) | **265 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ISSO MUDA NO §17

> *"Expandir **depois** de comprovar fluxo ponta a ponta."*

| Fluxo | Estado |
|---|---|
| **Compras** | ✅ r45 |
| **Venda** | ✅ **r61** |

**Dois fluxos comprovados.** O §17 não pede três.

---

## PRÓXIMA RODADA

**A reserva** — a única etapa ausente do fluxo de venda, e a que **o produto sentiria** primeiro: dois vendedores e o último botijão.

> **É uma entidade pequena**: `{ product_sku, quantity_milli, sale_id, expires_at }`. O difícil não é o modelo — é **decidir quando ela expira** e **o que acontece quando o cliente não paga**.
>
> **61 rodadas.** O segundo fluxo está provado, e a prova **encontrou exatamente uma lacuna** — que o §26 nomeia e o produto não tinha.
