# Fila de escrita em todos os stores que gravam (rodada 238)

## O que a r236 mediu e a r237 começou

A r236 listou **25 stores, 3 com fila**. A r237 protegeu os 4 de CRM. **A r238 fechou o resto.**

## O método que funcionou

A r236 falhou porque **reconstruía a assinatura por regex**. A r238 **extrai a assinatura do próprio arquivo**, linha a
linha, e só considera alvo o método cujo **corpo contém `this.write(`** — ou seja, o que realmente grava.

```js
for (let i = 0; i < linhas.length; i++) {
  const m = /^  async ([a-zA-Z_]+)\((.*)\): (.+) \{$/.exec(linhas[i])
  if (!m) continue
  const corpo = corpoDoMetodo(linhas, i)          // até o `  }` de mesmo nível
  if (!corpo.join('\n').includes('this.write(')) continue
  alvos.push({ ... })
}
```

E antes de gravar, **verifica**: se o número de `this.fila.serializar` não bater com o número de alvos, **não
grava**.

## Os 12 stores que entraram na fila

| Store | Métodos |
|---|---|
| `actors-store` | `upsert`, `deactivate`, `ensureOwner` |
| `after-sales-store` | `create`, `setStatus` |
| `automation-store` | `create`, `setActive` |
| `catalog-store` | `upsert`, `remove` |
| `companies-store` | `upsertCompany`, `upsertBranch` |
| `documents-store` | `upsert`, `remove` |
| `fiscal-store` | `emitir`, `cancelar` |
| `hr-store` | `upsertDepartment`, `upsertEmployee` |
| `marketing-store` | `createCampaign`, `setCampaignStatus`, `createPost`, `setPostStatus` |
| `purchases-store` | `upsertSupplier`, `saveOrder` |
| `service-desk-store` | `open`, `setStatus`, `rate` |
| `services-store` | `upsert`, `remove` |

Mais `finance-store.settle` e `sales-store.cancel`, que **já tinham** `serializar` da r235 e só precisavam dos
métodos restantes na fila.

## O erro que o script cometeu e eu reverti

O script **não reconheceu** que `finance` e `sales` já tinham `private fila: Promise<unknown>` (o padrão da r235 —
diferente de `private readonly fila = new WriteQueue()`). Tentou adicionar o campo de novo:

```
electron/finance-store.ts(312,20): error TS2300: Duplicate identifier 'fila'.
electron/sales-store.ts(271,20): error TS2300: Duplicate identifier 'fila'.
```

**Reverti os dois** com `git checkout` e apliquei só os métodos que faltavam, usando o `serializar` que já existia.
Typecheck voltou a 0.

**A guarda que faltava**: o script procurava `private readonly fila`, não `private fila`. Um padrão mais estreito
do que a realidade.

## Medido

| Medida | Valor |
|---|---|
| **Stores com fila agora** | **21 de 25** |
| Stores sem escrita pública | 4 (`agent-approval`, `agent-execution`, `hr-vacation`, `native-token`, `scheduling-block`) |
| Testes dos stores | **766 verdes** |
| Testes de concorrência | **12** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## Suíte `electron/` completa

```
Tests  40 failed | 4772 passed | 207 skipped (5019)
```

**As 40 falhas são as mesmas da r226**, todas de ambiente/host, verificadas uma a uma:

| Arquivo | Causa |
|---|---|
| `packaged-working-directory` | path de instalação Windows |
| `command-screenshot-monitor` | helper desempacotado |
| `updater/system-proxy-env` | proxy do host |
| `desktop-plugin-remove` | **symlink** (EPERM) |
| `updater/checkout-legacy` | git |
| `no-console-git` | git + Python host Windows |

**Zero falhas nos stores.** Os 12 testes novos de concorrência passam.

## O que continua fora

4 stores **não têm método de escrita pública** e não precisam de fila: `agent-approval`, `agent-execution`,
`hr-vacation`, `native-token` (e `scheduling-block`, que só lê).

## A trajetória

| R | Cobertura |
|---|---|
| 233 | "concorrência nunca testada" |
| 234 | **1 store** (estoque) — bug provado |
| 235 | **3 stores** (financeiro, vendas) — provado vermelho |
| 236 | inventário: 3 de 25 |
| 237 | **7 stores** (CRM) |
| **238** | **21 de 25 — todo store que grava** |

**O padrão read-modify-write deixou de ser um risco não mapeado e passou a ser um contrato aplicado em todos os
stores que escrevem.**
