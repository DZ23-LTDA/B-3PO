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
