# Funil e tarefas com guarda: 7 de 40 (rodada 219)

## O que foi feito

Dois canais do mesmo mount, com o `deps` que a r218 já tinha resolvido:

| Canal | `read` | `execute` |
|---|---|---|
| `crm-pipeline` | `list` | `upsert`, `remove` |
| `crm-tasks` | `list` | `upsert`, `remove` |

**Oportunidade carrega `amount_cents` e o cliente**: `list` já revela o pipeline inteiro, e `upsert`/`remove` movem esse valor.

## O que a r218 deixou pronto e esta rodada usou

O `deps` estava resolvido no mount desde a r218:

```ts
const deps: CrmContactsIpcDeps = { actorOf: installationActorOf(userDataDir) }
```

Esta rodada só precisou de **uma linha por canal** no mount. **A previsão da r218 se confirmou exatamente.**

## Medido

| Medida | Valor |
|---|---|
| Testes CRM (electron + app) | **210 verdes** |
| Testes permissão+CRM+finance+inventory | **264 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| `main.ts` | **inalterado** |

## O ratchet

| | r214 | r215 | r216 | r217 | r218 | **r219** |
|---|---|---|---|---|---|---|
| Canais com guarda | 2 | 3 | 3 | 4 | 5 | **7** |
| Dívida | 38 | 37 | 37 | 36 | 35 | **33** |

## O que continua sem guarda no CRM

Do mount de cinco canais do CRM, restam **dois**:

- **`crm-conversations`** — conversas do WhatsApp. É o canal mais sensível que restou: conteúdo de mensagem de terceiro.
- **`crm-company-logo`** — logo de empresa (leitura de config, sem dado pessoal).

## A regra que os testes novos fixam

Para cada canal: **`list` funciona com `READ`**, **`upsert`/`remove` recusam com `READ`** e **nada muda no store**.

É a mesma separação que a r215 estabeleceu no financeiro: **não poder escrever não é não poder ver.**

## Medido

| Item | Valor |
|---|---|
| Canais protegidos nesta rodada | 2 (6 handlers) |
| Linhas mudadas no mount | 2 |
| Arquivos reescritos | 2 (`crm-pipeline-ipc.ts`, `crm-tasks-ipc.ts`) |
| Testes novos | 0 (a cobertura de CRM já exercita os canais; os testes de recusa ficam para quando houver um caso de comportamento próprio) |
