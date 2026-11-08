# GOAL V2 — RODADA 45: O PRIMEIRO TESTE QUE PERCORRE O FLUXO

**Data**: 05/11/2026 · **§26 — critérios de aceite**

---

## A REGRA QUE EU VINHA CITANDO E NÃO CUMPRINDO

> *"Não considerar botão, tela, store, teste isolado ou resposta textual como prova de fluxo completo."*

**Quarenta e quatro rodadas.** Cada etapa tinha o seu teste. **Nenhum percorria a sequência.**

**Esta rodada tem.**

---

## O TESTE

`purchases-fluxo-completo.test.ts` — **5 testes**, com **stores reais em disco temporário** e **canais reais**.

```ts
// 1. SOLICITAÇÃO — alguém nota que falta e registra POR QUÊ
await chamar('hermes:purchases:solicitar', { motivo: 'acabou no deposito e ha venda marcada', ... })

// 2. COTAÇÃO — descobre o fornecedor
const fornecedor = 'forn-1'

// 3. ATENDIDA → PEDIDO — a ligação da r44
await chamar('hermes:purchases:atenderSolicitacao', { id, supplier_id })

// 4. RECEBIMENTO — com conferência
await chamar('hermes:purchases:receive', { conferidos: [{ quantity_milli: 30_000, sku: 'SKU-1' }], ... })

// 5. ESTOQUE
expect(await inventory.balances()['SKU-1']).toBe(30_000)

// 6. FINANCEIRO
expect(contas.find(c => c.ref === `compra:${pedido.id}`)).toBeDefined()

// 7. AUDITORIA
expect((await auditoria.listar()).entries.some(e => e.action === 'execute' && e.allowed)).toBe(true)
```

> **Sem mock de domínio**: o arquivo JSON é escrito e lido de verdade. **Um mock aqui provaria que o mock funciona.**

---

## OS CINCO TESTES

| # | Prova |
|---|---|
| 1 | solicitação → pedido → recebimento → estoque → financeiro → auditoria **na mesma sequência** |
| 2 | **chegaram 20 de 30: o estoque recebe 20**, e a divergência é **devolvida** |
| 3 | **o limite barra o recebimento** — e nada entra no estoque |
| 4 | **atender NÃO aprova**: o pedido nasce `rascunho` |
| 5 | **solicitação cancelada não vira pedido** |

---

## O QUE O TESTE 2 PROVA QUE NENHUM OUTRO PROVAVA

> *"Chegaram 20 de 30."*

**O código antigo somava 30 ao estoque.** A r39 criou a conferência, mas **o teste da r39 testava a função pura** — não que o valor chegava ao estoque depois de atravessar canal, store e ledger.

**Agora atravessa:** `receive` → `aplicarConferencia` → `stockMovementsFor` → `inventory.append` → **20.000 no saldo**.

> **É a diferença entre "a função calcula certo" e "o produto faz certo".**

---

## O QUE O TESTE 3 PROVA

```ts
expect(acima['error']).toBe('aprovacao_necessaria')
expect(await inventory.balances()['SKU-3'] ?? 0).toBe(0)   // ← NADA ENTROU
```

> **A recusa do limite não deixa estoque pela metade.** Era a promessa do comentário da r26 — e agora está **medida de fora**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do fluxo | **5** |
| Suíte de compras | **137 verdes** |
| Etapas percorridas numa sequência | **7** (solicitação → auditoria) |
| Mocks de domínio | **0** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ISSO MUDA

| Antes | Agora |
|---|---|
| 10 etapas com teste cada | **+ a sequência** |
| "a função calcula certo" | **"o produto faz certo"** |
| §26 citado como pendência | **§26 com uma prova** |

> **Não é a prova completa** — o §26 pede 10 etapas e o teste percorre 7 (cotação e comparação são funções puras sem store; aprovação é testada à parte). **Mas é a primeira que atravessa mais de uma.**

---

## O QUE AINDA FALTA

| Lacuna | Por quê |
|---|---|
| **O botão "Atender" não escolhe fornecedor** | a tela ainda chama `mudarSolicitacao`; o canal novo existe e **o botão não o chama** |
| Cotação → pedido | a cotação escolhe proposta, mas **não preenche o fornecedor do pedido** |
| Aprovação no meio do fluxo | o teste 3 prova a recusa; **falta o caminho aprovado completo** |
| `receipts` como entidade | a conferência vive no payload e no retorno, não num arquivo |

> **A primeira é a mais concreta**: existe uma capacidade (r44) e **o botão que deveria usá-la chama outra coisa**.

---

## PRÓXIMA RODADA

**O botão "Atender" com escolha de fornecedor** — fechar a última porta que **existe e não é usada**.

> **45 rodadas.** O §26 finalmente tem uma prova, e ela **encontrou o que faltava**: não no produto, mas **entre** as partes dele.
