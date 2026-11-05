# Inventário de concorrência: 3 de 25 stores têm fila (rodada 236)

## O que foi medido

Varredura dos 25 stores de arquivo JSON em `apps/desktop/electron/`, verificando a presença de uma fila de
escrita (`private fila` / `WriteQueue`). Não é estimativa: é a lista real, com os métodos de escrita de cada um.

## O resultado

| Store | Fila | Métodos de escrita |
|---|---|---|
| `inventory-store` | **SIM** (r234) | `append` |
| `finance-store` | **SIM** (r235) | `append`, `settle` |
| `sales-store` | **SIM** (r235) | `create`, `cancel` |
| `actors-store` | não | `upsert`, `deactivate`, `ensureOwner` |
| `after-sales-store` | não | `create`, `setStatus` |
| `automation-store` | não | `create`, `setActive` |
| `catalog-store` | não | `upsert`, `remove` |
| `companies-store` | não | `branches`, `upsertCompany`, `upsertBranch` |
| `crm-contacts-store` | não | `upsert`, `remove` |
| `crm-conversations-store` | não | `upsert`, `remove` |
| `crm-pipeline-store` | não | `upsert`, `remove` |
| `crm-tasks-store` | não | `upsert`, `remove` |
| `documents-store` | não | `upsert`, `remove` |
| `fiscal-store` | não | `emitir`, `cancelar` |
| `hr-store` | não | `upsertDepartment`, `upsertEmployee` |
| `marketing-store` | não | `createCampaign`, `setCampaignStatus`, `createPost`, `setPostStatus` |
| `purchases-store` | não | `upsertSupplier`, `saveOrder` |
| `quotation-store` | não | `save`, `remove` |
| `scheduling-store` | não | `book`, `cancel`, `confirm` |
| `service-desk-store` | não | `open`, `setStatus`, `rate` |
| `services-store` | não | `upsert`, `remove` |
| `agent-approval-store` | não | — (sem escrita pública) |
| `agent-execution-store` | não | — |
| `hr-vacation-store` | não | — |
| `native-token-store` | não | — |
| `scheduling-block-store` | não | — |

**3 de 25 com fila. 18 com métodos de escrita pública sem serialização.**

## O que foi entregue

**`apps/desktop/electron/write-queue.ts`** — a fila extraída, pronta para reuso:

```ts
export class WriteQueue {
  private ultima: Promise<unknown> = Promise.resolve()

  serializar<T>(run: () => Promise<T>): Promise<T> {
    const resultado = this.ultima.then(run)

    this.ultima = resultado.catch(() => undefined)

    return resultado
  }
}
```

O `catch` no fim da fila é deliberado: **uma escrita que falha não pode travar as seguintes**. Quem chamou recebe
a rejeição; a fila só segue limpa.

## A tentativa que falhou, e por que ela importa

Tentei aplicar a fila nos quatro stores de CRM com um script que reescrevia as assinaturas via regex. **Quebrou os
quatro arquivos** — o padrão de tipo usado (`Promise<{ contacts: CrmContact[] } | { error: string }>`) não casou
com a regex:

```
electron/crm-contacts-store.ts(192,5): error TS1131: Property or signature expected.
electron/crm-pipeline-store.ts(155,5): error TS1131
electron/crm-tasks-store.ts(201,5): error TS1131
electron/crm-conversations-store.ts(286,5): error TS1131
```

**Reverti os quatro com `git checkout`.** O typecheck voltou a 0 erros.

**Esta é a terceira vez na sessão que uma substituição por regex sobre estrutura aninhada falha** (r223, r224,
r236). **A lição já está registrada e eu a repeti**: para mudança estrutural, substituição **literal** copiada do
arquivo real, ou número de linha com verificação — nunca regex sobre tipos compostos.

## A receita, para quem for continuar

Cada store precisa de duas mudanças:

1. **Campo:** `private readonly fila = new WriteQueue()`
2. **Método:** o público entra na fila e delega ao `*Serializado` privado, **com a assinatura literal copiada do
   arquivo** (não reconstruída por regex).

E um teste como `inventory-concurrency.test.ts` ou `finance-sales-concurrency.test.ts`, **rodado também com a fila
removida** — porque passar com a correção não prova nada.

## O que isto significa para o produto

| Domínio | Estado |
|---|---|
| Estoque | **protegido** |
| Financeiro | **protegido** |
| Vendas | **protegido** |
| CRM (contatos, funil, tarefas, conversas) | **exposto** — mesmo desenho, sem fila |
| Compras, catálogo, agenda, RH, marketing, serviços, documentos | **expostos** |

**Os três que movem dinheiro e mercadoria estão protegidos.** O CRM é o próximo da fila: perder um contato
simultâneo é menos caro que perder uma venda, **mas é o mesmo defeito**.

## Medido

| Medida | Valor |
|---|---|
| Stores varridos | **25** |
| Com fila | **3** |
| Com escrita pública sem fila | **18** |
| Helper entregue | `write-queue.ts` |
| Tentativa de aplicação em massa | **falhou, revertida** |
| Typecheck depois da reversão | **0 erros** |
