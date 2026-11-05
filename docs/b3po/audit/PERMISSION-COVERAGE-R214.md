# Permissão nos canais: 2 de 40 (rodada 214)

## O achado

`permission-guard.ts` diz, no próprio cabeçalho:

> *"Sem isto, `rbac.ts` é uma política que ninguém consulta — **permissão que não decide nada**."*

**Medido hoje:**

| | |
|---|---|
| Canais IPC | **40** |
| Com `withPermission` / `guardedHandler` | **2** — `admin-ipc.ts`, `sales-ipc.ts` |
| **Sem guarda** | **38** |

**Os 38 incluem todo o ERP**: `crm-*` (4 canais), `finance`, `inventory`, `purchases`, `hr`, `scheduling`, `marketing`, `documents`, `companies`, `service-desk`, `catalog`, `fiscal`, `privacy`.

## Como o mecanismo funciona (onde ele existe)

`sales-ipc.ts` é o exemplo correto:

```ts
const actor = await deps.actorOf()
if (!actor) { /* recusa */ }
const permitido = await withPermission(actor, 'execute', { resource })
```

O ator é **injetado** (`actorOf: () => Promise<Actor | null>`) — o canal não o aceita do renderer, mesma disciplina do `serverTenant`.

## Por que eu NÃO envolvi os 38 nesta rodada

**Ligar autorização sem sujeito é pior que não ter autorização.**

Hoje o produto **não tem login**. `actorOf()` devolve o **dono da instalação**. Uma guarda que sempre permite **parece proteção e não é** — e passaria a esconder a ausência real de sujeito.

O caminho honesto tem duas etapas:
1. **decidir se o produto terá usuários distintos** (com login) ou se "uma instalação = um dono" é a resposta final;
2. só então ligar a guarda nos 38 — com o sujeito certo.

## O que foi feito: a dívida virou ratchet

`electron/permission-coverage-ratchet.test.ts` — 5 testes:

| # | Contrato |
|---|---|
| 1 | **nenhum canal novo nasce sem guarda** |
| 2 | a lista **não mente** — se um canal ganhou guarda, ele sai da lista |
| 3 | a lista só tem arquivo que existe |
| 4 | os dois que decidem permissão **continuam decidindo** |
| 5 | a dívida medida hoje é **38 de 40** |

**O teste 2 é o mais importante**: sem ele, alguém envolve um canal, esquece de tirar da lista, e **o número passa a mentir para pior**.

## O que isso significa para o §23 ("permissões aplicadas no backend")

| Item | Estado |
|---|---|
| Regra de RBAC (`can`, `canGrantLevel`, `audit`) | **IMPLEMENTED + TESTED** (r anterior) |
| Guarda de canal (`withPermission`, com auditoria de toda chamada) | **IMPLEMENTED + TESTED** |
| Aplicada em **2** canais | **VALIDATED** |
| Aplicada nos **38** restantes | **`BLOCKED_BY_PRODUCT_DECISION`** — falta sujeito |
| Dívida não pode crescer | **TESTED** (r214) |

## A frase que fica

> **A permissão existe, decide corretamente nos dois canais que a consultam, e não é consultada nos outros trinta e oito.**
>
> **Isso não é um bug de código — é uma decisão de produto que ainda não foi tomada, e agora tem um número e um teste.**

## Medido

| Medida | Valor |
|---|---|
| Canais | 40 |
| Com guarda | 2 |
| Sem guarda | 38 |
| Testes novos | 5 |
| Typecheck | 0 erros |
| Gate | 14 checks |
