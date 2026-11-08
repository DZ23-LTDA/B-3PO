# Concorrência no estoque: o bug existia (rodada 234)

## A pergunta que nunca tinha sido feita

`InventoryStore.append` faz **read → valida → push → write**. O `write` é atômico (temp + rename), mas a
**sequência não era serializada**.

Duas chamadas simultâneas **leem o mesmo saldo**, validam contra ele, e **a segunda grava por cima da primeira**.

## A prova

Escrevi `inventory-concurrency.test.ts` e **os 4 testes falharam** na primeira execução:

```
assertion: expected { aceitas: 2, saldo: 2000000 } to deeply equal { aceitas: 1, saldo: 2000 }
```

**Traduzindo**: duas saídas de 8 com saldo 10. **As duas responderam sucesso.** O ledger ficou com **uma**.

> **Venda fantasma**: o cliente paga, o sistema confirma, e **o estoque não baixa**. O saldo ficou **em 2.000.000
> quando deveria ter recusado ou ido a zero**.

## O bug é pior que "número errado"

| O que o operador vê | O que o ledger tem |
|---|---|
| "venda registrada" | um movimento a menos |
| "saldo 8" (resposta) | saldo 2.000.000 em milésimos |
| duas notas emitidas | uma baixa |

**Não é divergência de relatório — é mercadoria que sai do estoque sem baixa.**

## A correção

Fila de escrita por instância:

```ts
private fila: Promise<unknown> = Promise.resolve()

async append(input) {
  const resultado = this.fila.then(() => this.appendSerializado(input))
  this.fila = resultado.catch(() => undefined)
  return resultado
}
```

A próxima operação **só começa quando a anterior termina**. O histórico completo do `append` foi para
`appendSerializado` — a lógica não mudou, só passou a ter vez.

## O que a fila NÃO resolve, e está escrito no código

> A fila é **por instância**, que é a unidade de escrita do arquivo. **Duas instâncias sobre o mesmo arquivo
> continuam sem proteção mútua** — isso exigiria lock de sistema de arquivos, e o produto usa **uma instância
> por diretório** (`erp-ipc`).

## Medido depois da correção

| Teste | Antes | Depois |
|---|---|---|
| duas saídas que cabem → 3 movimentos, saldo 4000 | **falhou** | **passa** |
| duas que estouram → 1 aceita, saldo 2000 | **falhou** | **passa** |
| cinco simultâneas nunca deixam saldo negativo | **falhou** | **passa** |
| cinco saídas que cabem → 6 movimentos, saldo 0 | **falhou** | **passa** |

**Regressão**: **156 testes** de estoque + compras + vendas verdes.

## O que continua sem teste de concorrência

| Store | Serializado? |
|---|---|
| `inventory` | **sim (r234)** |
| `finance` | **não** — mesmo padrão read-modify-write |
| `sales` | **não** |
| `crm-*` | **não** |

**O mesmo defeito provavelmente existe nos outros.** O estoque foi o primeiro porque é onde a corrida custa
mercadoria; os demais precisam da mesma fila.

## Medido

| Medida | Valor |
|---|---|
| Testes novos | **4** |
| Falharam antes da correção | **4 de 4** |
| Regressão | **156 verdes** |
| Gate | **14 checks, ok** |
| Linhas de lógica alteradas | 0 — só a ordem de execução |
