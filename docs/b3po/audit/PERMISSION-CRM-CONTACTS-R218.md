# CRM de contatos com guarda: 5 de 40 (rodada 218)

## O que foi feito

`crm-contacts-ipc.ts` passa a usar `exigirAtor`:

| Canal | Ação | Por quê |
|---|---|---|
| `list` | `read` | expõe nome, telefone, e-mail, empresa |
| `upsert` | `execute` | grava dado pessoal e consentimento |
| `remove` | `execute` | **irreversível** — o armazenamento não tem lixeira |

## O obstáculo: `main.ts` está no teto do ratchet

`mountCrmContacts` é chamado de `main.ts`, que **não pode crescer** (`18220` linhas). Minha primeira tentativa
adicionou um import e uma chamada → **18221 → 18222 linhas**. O gate teria barrado.

**Reverti e mudei a abordagem**: `mountCrmContacts` **já recebe `userDataDir`**. Ele resolve o ator sozinho.

```ts
export function mountCrmContacts(ipcMain: IpcRegistrar, userDataDir: string): CrmConversationStore {
  const deps: CrmContactsIpcDeps = { actorOf: installationActorOf(userDataDir) }
```

**`main.ts` não mudou uma linha.**

## `installation-actor.ts`: uma verdade sobre quem é o dono

`erp-ipc` já tinha `actorOf` (ensureOwner + primaryOwner). `main.ts` não tinha. Copiar a lógica criaria **duas
verdades** sobre o dono — e uma ficaria desatualizada no dia em que o produto tivesse login.

O módulo resolve uma vez por `userDataDir` (cache), porque:

> *duas instâncias sobre o mesmo arquivo leem bem, mas `ensureOwner` concorrente pode criar dois donos.*

Devolve `null` só com arquivo de atores corrompido — e aí a guarda recusa, **que é o comportamento certo: sem
dono, ninguém assina.**

## Medido

| | |
|---|---|
| Testes de CRM de contatos | **16 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| `main.ts` | **inalterado** |
| Typecheck | **0 erros** |

## O ratchet

| | r214 | r215 | r216 | r217 | **r218** |
|---|---|---|---|---|---|
| Canais com guarda | 2 | 3 | 3 | 4 | **5** |
| Dívida | 38 | 37 | 37 | 36 | **35** |

## O que continua sem guarda no próprio CRM

`mountCrmContacts` monta **cinco** canais. Só contatos está protegido. Continuam abertos:

- `crm-pipeline` (oportunidades — valor de negócio)
- `crm-tasks` (tarefas)
- `crm-conversations` (conversas do WhatsApp)
- `crm-company-logo`

**O `deps` já está resolvido no mount** — passar para os outros quatro é uma linha cada, nas próximas rodadas.

## Medido

| Medida | Valor |
|---|---|
| Canal novo protegido | `crm-contacts` (3 handlers) |
| Módulo novo | `installation-actor.ts` (resolvedor único) |
| Rodada de correção | 1 (a primeira tentativa estourou o ratchet e foi revertida) |
| `main.ts` | **18220 → 18220** |
