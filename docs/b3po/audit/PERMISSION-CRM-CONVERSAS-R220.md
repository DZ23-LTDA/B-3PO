# Conversas do CRM com guarda: 8 de 40 (rodada 220)

## O canal mais sensível do CRM

Uma conversa carrega **o conteúdo do que um cliente escreveu** — não é um telefone numa lista, é o histórico do
atendimento de terceiro.

> **Se este canal ficasse aberto, todo o trabalho das rodadas 218–219 estaria protegendo o índice e deixando o
> livro aberto.**

| Canal | `read` | `execute` |
|---|---|---|
| `crm-conversations` | `list` | `upsert`, `remove` |

## Medido (6 testes novos)

| Situação | Resultado |
|---|---|
| sem ator → `list` | recusa, **`conversations` ausente** |
| sem ator → `upsert` | recusa, **store vazio** |
| sem ator → `remove` | recusa, **conversa continua lá** |
| **`READ` → `list`** | **funciona** |
| **`READ` → `upsert`** | **recusa, store vazio** |
| dono → `upsert` | grava |

**Cada caso verifica o estado, não só a resposta.** Uma guarda que roda depois da escrita devolve `sem_permissao` e **grava assim mesmo**.

## O erro que a rodada quase cometeu

Meu primeiro payload de teste foi `{ contact_phone, id, messages, preview }`. O tipo real é:

```ts
export interface CrmConversation {
  contact_phone, created_at, id, last_message_at, last_message_preview,
  messages, notes, tags, title
}
```

**`preview` não existe**, e os campos faltantes faziam o `upsert` **recusar** — três testes ficaram vermelhos **pelo motivo certo**: o store não gravou. A correção foi completar o payload, não afrouxar a asserção.

## O ratchet, e onde ele chegou no CRM

| | r214 | r215 | r216 | r217 | r218 | r219 | **r220** |
|---|---|---|---|---|---|---|---|
| Canais com guarda | 2 | 3 | 3 | 4 | 5 | 7 | **8** |
| Dívida | 38 | 37 | 37 | 36 | 35 | 33 | **32** |

**O CRM está fechado, com uma exceção declarada**: `crm-company-logo` (leitura de configuração visual, sem dado
pessoal).

## O que isso significa em quatro rodadas de trabalho

| Rodada | Canal | Sensibilidade |
|---|---|---|
| 218 | `crm-contacts` | dado pessoal + consentimento |
| 219 | `crm-pipeline`, `crm-tasks` | valor de negócio |
| **220** | **`crm-conversations`** | **conteúdo de mensagem de terceiro** |

**Antes da r218, qualquer código no renderer lia os quatro — sem verificação e sem registro.**

## Medido

| Medida | Valor |
|---|---|
| Testes | **270 verdes** (crm + permissão + finance + inventory) |
| Testes novos | **6** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| CR no arquivo do ratchet | **0** (normalizado) |
