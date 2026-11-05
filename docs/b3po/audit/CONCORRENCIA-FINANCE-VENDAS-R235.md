# Financeiro e vendas: o mesmo defeito da r234, agora corrigido (rodada 235)

## A pergunta

Se duas vendas simultâneas perdiam uma escrita no estoque, **o dinheiro perdia também?** Testei antes de assumir.

## A prova, na direção que importa

Escrevi `finance-sales-concurrency.test.ts` e **rodei com a correção já aplicada: 4 de 4 passaram.**

**Passar não prova nada** — um teste pode passar porque nunca exercitou a corrida. Então **removi a fila
temporariamente** (`git stash` nos dois stores) e rodei de novo:

```
AssertionError: expected { registros: 1, ids_unicos: 1 } to deeply equal { registros: 3, ids_unicos: 3 }
Tests  4 failed (4)
```

**Três vendas simultâneas viraram UMA.** Não é número errado de relatório: **duas vendas sumiram do arquivo.**

Depois restaurei a fila e voltei aos 4 verdes.

## O que foi corrigido

| Store | Método | Estado |
|---|---|---|
| `inventory` | `append` | **serializado na r234** |
| **`finance`** | **`append`** | **serializado na r235** |
| **`sales`** | **`create`** | **serializado na r235** |

O mesmo padrão nos três: o método público entra na fila e delega ao `*Serializado` privado. **A lógica não
mudou — só passou a ter vez.**

```ts
private fila: Promise<unknown> = Promise.resolve()

private serializar<T>(run: () => Promise<T>): Promise<T> {
  const resultado = this.fila.then(run)
  this.fila = resultado.catch(() => undefined)
  return resultado
}
```

## O que a fila NÃO resolve, e está escrito no código

> É **por instância**, que é a unidade de escrita do arquivo. **Duas instâncias sobre o mesmo arquivo continuam
> sem proteção mútua** — isso exigiria lock de sistema de arquivos, e o produto usa **uma instância por
> diretório**.

## Medido

| Medida | Valor |
|---|---|
| Testes novos | **4** |
| Falharam sem a correção | **4 de 4** — `3 vendas → 1 registro` |
| Regressão (finance + sales + inventory + purchases) | **205 verdes** |
| Gate | **14 checks, ok** |
| Lógica de negócio alterada | **0 linhas** |

## O que continua sem fila

| Store | Defeito |
|---|---|
| `crm-contacts` | **provável** — mesmo read-modify-write |
| `crm-pipeline` | **provável** |
| `crm-tasks` | **provável** |
| `crm-conversations` | **provável** |
| `hr`, `purchases`, `catalog`, `companies`, `services`, `documents`, `scheduling` | **não auditados** |

**O padrão se repete em todo store de arquivo JSON deste produto.** Os três que movem dinheiro e mercadoria
estão protegidos; os demais **precisam da mesma linha**, e agora há um teste que mostra como provar.
