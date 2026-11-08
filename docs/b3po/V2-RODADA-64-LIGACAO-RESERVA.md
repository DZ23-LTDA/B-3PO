# GOAL V2 — RODADA 64: A LIGAÇÃO — A VENDA CONSOME A RESERVA

**Data**: 05/11/2026 · **§26** · fecha a reserva

---

## O QUE FALTAVA

A r63 deixou: *"a reserva existe e não muda a venda. O store está pronto e **o chamador não existe**."*

```
reserva criada → (ninguém fatura usando a reserva) → reserva vence
```

---

## O QUE FOI CONSTRUÍDO

```ts
// SalesDeps
reservations?: { confirmarDaVenda: (saleId: string) => Promise<unknown> }

// em faturar, depois de estoque e financeiro:
if (deps.reservations) {
  try { await deps.reservations.confirmarDaVenda(criada.sale.id) } catch { /* engolido */ }
}
```

### Três decisões

| Decisão | Por quê |
|---|---|
| **Depois do estoque e do financeiro** | a reserva **não é o fato principal** — a venda é. Confirmá-la antes faria a promessa parecer cumprida antes de a mercadoria sair |
| **`catch` engolido** | falhar aqui **não desfaz a venda**: o estoque baixou, a conta nasceu. O que falha é **o registro da reserva**, e **a reconciliação o encontra** |
| **Opcional** | quem monta sem reservas continua funcionando, **e o balcão que vende sem reservar não passa a exigir uma** |

---

## A PROVA — 2 testes novos

| Teste | O que trava |
|---|---|
| **faturar confirma a reserva daquela venda** | a promessa **vira fato** — sem isto ela venceria sozinha |
| **faturar SEM reserva continua funcionando** | o balcão **não é obrigado** a reservar |

> **O primeiro é a prova da ligação**: a reserva existe **antes** da venda, e depois do faturamento está `confirmada` — não `ativa` vencendo.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Dependência nova | **1** (`reservations?`) |
| Testes do fluxo | **7** (eram 5) |
| Regressão | **312 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O ␣26 — VENDA, AGORA

| Etapa | Estado |
|---|---|
| produto | ✅ |
| canal | ⚠️ **venda direta** (marketplace bloqueado, r54) |
| pedido | ✅ |
| **reserva** | ✅ **r62 + r63 + r64** |
| pagamento confirmado | ⚠️ conta a receber nasce; **confirmação não** |
| expedição | ✅ entrega |
| entrega | ✅ |
| financeiro | ✅ |
| auditoria | ✅ |

**7 completo · 2 parciais · 0 ausente.**

> **A evolução**: na r61 eram **5 completo · 2 parciais · 1 ausente**. A reserva saiu de ausente para completo em três rodadas.

---

## O QUE A RESERVA ENSINOU

| Rodada | A decisão que importou |
|---|---|
| r62 | **a reserva vence e devolve** — não decide pelo dono |
| r63 | **"nunca houve" ≠ "venceu"** — o filtro escondia a diferença |
| **r64** | **a reserva é registro secundário** — falhar nela não desfaz a venda |

> **É o oposto do instinto**: a parte nova não é a mais importante. **O estoque e o dinheiro são o fato; a promessa é o que se ajusta a eles.**

---

## PRÓXIMA RODADA

**O "pagamento confirmado"** — o único parcial que **não depende de credencial externa**.

> Hoje a conta a receber **nasce** e ninguém **confirma** o pagamento. Uma venda faturada fica `aberta` no financeiro para sempre — e o dono não tem como dizer *"este cliente pagou"*.
>
> **64 rodadas.** A reserva foi de ideia a fato em três rodadas — e a ligação que a tornou real **é uma linha**.
