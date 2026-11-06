# B-3PO — TEST EVIDENCE

**Regra**: cada linha tem o comando, a saída e a data. O que não foi exercitado fica `NOT_TESTED`.
**Atualizado**: 06/11/2026 · **HEAD**: `35c87cfb36`

---

## E2E · Jornada de Compras (B4 do aditivo V3) — **PASSOU**

**Ferramenta**: Playwright sobre o Electron real (`dev:fake-boot`, CDP 9333), chamando o bridge
`hermesDesktop.purchases` — o MESMO que a tela usa. Nada de mock.

### Passo a passo, com saída real

| # | Etapa | Chamada | Resultado medido |
|---|---|---|---|
| 1 | **Solicitação** | `purchases.solicitar({motivo, product_sku, quantity_milli})` | `sol-f1d7fd26-b694-4ed2-b3b0-5bd8051fc5d4` · status `aberta` |
| 2 | **Fornecedor** | `purchases.saveSupplier({name, cnpj})` | `sup_1793997200272_u3nue2` · `active: true` |
| 3 | **Pedido** (da solicitação) | `purchases.atenderSolicitacao({id, supplier_id, unit_cost_cents})` | `po_1793997200286_p36vp8` · `status: rascunho` · `total_cents: 15000` |
| 4 | **Aprovação** | `purchases.aprovar({pedido_id})` | `{"error":"compra_nao_precisa"}` — **correto**: sem limite definido, não há aprovação a pedir |
| 5 | **Recebimento** | `purchases.receive({items:[…], supplier_id})` | `conferencia.semConferencia: true` · pedido novo com `status: "recebido"` |
| 6 | **Estoque** | `inventory.balances()` | **`{"balances":{"E2E-001":3000}}`** — 3.000 unidades entraram |
| 7 | **Financeiro** | veio dentro do `receive` | **`{amount_cents:15000, kind:"pagar", currency:"BRL", id:"fin_1793997249492_py51y9"}`** — conta a pagar de R$ 150,00 |

**As sete etapas do aditivo V3 existem e funcionam.** A UI dizia *"Receber um pedido coloca a
mercadoria no estoque"* — **é verdade, e está medido**.

### O que o código já sabia

`api/purchases.ts` documenta a armadilha que quase todo sistema de compras tem:

> *"zero não gera conta a pagar, então a compra existiria no estoque e não no financeiro"*
> (`atenderSolicitacao`, r49)

E resolve: o custo unitário é obrigatório na passagem para recebido. **É por isso que o
`finance` apareceu com 15000 e não com 0.**

---

## Auditoria dos seis modos (B3) — ver `AUDIT-MATRIX.md`

| Aspecto | Estado | Números |
|---|---|---|
| Persistência | **READY** | `engenharia` sobrevive ao reload |
| Foco | **READY** | `outline: solid 2px rgb(0,83,253)`, `:focus-visible` |
| Rolagem | **READY** | Empresa: 1215 de conteúdo em 937 visíveis |
| Rotas | **READY** | 27 itens clicados, 27 navegaram |
| RBAC | **PARCIAL** | filtra (27 vs 10), mas 5 de 6 modos sem item exclusivo |

---

## Gate e tipos (esta rodada)

| Comando | Saída |
|---|---|
| `python scripts/check` | **14 checks, ok** |
| `python scripts/check-b3po-types` | **0 erros** |
| `npm run build` | **exit 0** |

---

## NOT_TESTED (não foi exercitado — não é PASS)

| Item | Por quê | O que falta |
|---|---|---|
| Cotação com **dois fornecedores** e vencedor por SKU | o teste usou um fornecedor só | semear catálogo + 2 propostas |
| **Aprovação com limite** definido | o limite está `sem limite`, então `compra_nao_precisa` | definir limite + aprovador, refazer |
| Recebimento com **divergência de conferência** | `semConferencia: true` | enviar quantidade diferente da pedida |
| **Estorno** de compra recebida | não existe caminho exercitado | verificar se há e testar |
| Jornada **pela UI** (clique a clique) | exercitei o bridge, que é o que a UI chama | teste de clique completo |
| Financeiro em **tela própria** | `hermesDesktop.finance.payables` não existe como bridge | o dado VIVE no `receive`; conferir a tela |

---

## E2E · Vendas (B5 do aditivo V3) — **PASSOU com ressalvas**

**Mesmo método**: bridge `hermesDesktop.sales` no Electron real. Estoque herdado do E2E de compras
(3.000 unidades de `E2E-001`).

### A promessa da tela, verificada

A UI diz: *"Faturar dá baixa no estoque e lança a conta a receber."* **É verdade:**

```
estoqueAntes:  {"E2E-001": 3000}
faturar:       finance { amount_cents: 8000, kind: "receber", currency: "BRL",
                         id: "fin_1793997336388_oemw5w", status: "aberto" }
estoqueDepois: {"E2E-001": 2000}          ← baixou 1000
```

### Máquina de estados

| Operação | Status resultante |
|---|---|
| `sales.create(payload)` | **`orcamento`** |
| `sales.faturar(payload)` | **`faturado`** |
| `sales.cancel(id, motivo)` | **`cancelado`** |

**A venda cancelada NÃO baixou o estoque** — o saldo final foi 1000, compatível com as duas vendas
faturadas (1000 + 1000) e a cancelada (500) intocada. **É o comportamento correto.**

### Casos de borda — o que passou e o que NÃO passou

| Caso | Chamada | Resultado | Veredito |
|---|---|---|---|
| **Estoque insuficiente** | 9.999 unidades com 2.000 em saldo | `{"error":"saldo_insuficiente","message":"E2E-001"}` · **estoque permaneceu 2000** | **PASSOU** — rejeita e não corrompe |
| **SKU inexistente** | `product_sku: "NAO-EXISTE-999"` | `{"error":"saldo_insuficiente","message":"NAO-EXISTE-999"}` | **FALHOU** — o produto não existe, mas a mensagem culpa o saldo |
| **Preço zero** | `unit_price_cents: 0` | venda criada com `total_cents: 0`, **`finance: null`** | **FALHOU** — vende de graça e não lança nada no financeiro |

### O que isso significa, sem maquiar

- **O controle crítico está certo**: sem saldo, não fatura, e o estoque não é tocado. É o erro que
  mais dói num sistema de venda, e ele está coberto.
- **A mensagem do SKU inexistente é enganosa.** Quem lê "saldo insuficiente" para um produto que
  não existe vai procurar estoque em vez de cadastro. **É um bug de mensagem, não de controle.**
- **Preço zero é aceito.** Pode ser intencional (brinde, bonificação), mas **não há nada que diga
  isso ao operador** — e o financeiro fica sem registro. Precisa de decisão de produto: bloquear,
  ou marcar explicitamente como cortesia.

**Nenhuma dessas duas falhas foi corrigida nesta rodada** — a primeira exige saber o vocabulário de
erro que o backend usa para "produto não encontrado"; a segunda é decisão de negócio. Ficam
registradas como dívida com nome, não como "tudo certo".
