# CRM: os 4 stores serializados, com prova vermelha (rodada 237)

## O que a r236 deixou

A r236 mediu que **4 dos 4 stores de CRM estavam expostos** e **falhou** ao aplicar a fila em massa por regex (o
padrão `Promise<{ contacts: CrmContact[] } | { error: string }>` não casou, e os quatro arquivos quebraram).

**A r237 aplicou com a assinatura LITERAL copiada de cada arquivo.** Sem regex sobre tipo composto.

## O que mudou

| Store | Métodos serializados |
|---|---|
| `crm-contacts-store` | `upsert`, `remove` |
| `crm-pipeline-store` | `upsert`, `remove` |
| `crm-tasks-store` | `upsert`, `remove` |
| `crm-conversations-store` | `upsert`, `remove` |

Cada um recebeu `private readonly fila = new WriteQueue()` e os pares público/serializado.

## A prova, na direção que importa

`crm-concurrency.test.ts` — 4 escritas simultâneas por store:

| Estado | Resultado |
|---|---|
| **Com a fila** | **4 de 4 passam** |
| **Sem a fila** (`git stash` nos quatro) | **4 de 4 falham** |

## Dois problemas encontrados ao escrever o teste

### 1. Nomes de exportador errados

Escrevi `crmContactsStorePath`, `crmPipelineStorePath`, `crmTasksStorePath`, `crmConversationsStorePath`. **Os
nomes reais são** `crmStorePath`, `pipelineStorePath`, `tasksStorePath`, `conversationsStorePath`. O TypeScript
apontou cada um.

### 2. Dois testes passavam "por acidente" — e eu não deixei

Depois de corrigir os nomes, **2 de 4 passaram e 2 falharam** com `expected +0 to be 4`: **três registros... zero
registros**. Os `upsert` de pipeline e conversas estavam sendo **recusados por validação**, não testando
concorrência nenhuma.

Lendo o `normalizeOpportunity`: exige `title` **e** `contact_phone` **e** `stage` válido. O `normalizeConversation`
exige `title`.

**Um teste que passa (ou falha) porque o payload era inválido não diz nada sobre concorrência.** Corrigi os
payloads; aí sim 4 de 4 verdes, e 4 de 4 vermelhos sem a fila.

## Medido

| Medida | Valor |
|---|---|
| Stores serializados agora | **7** (estoque, financeiro, vendas + 4 CRM) |
| Testes de concorrência no repo | **12** |
| Falharam sem a fila | **8 de 8 provados** (4 estoque/financeiro + 4 CRM) |
| Regressão (crm + inventory + finance + sales + purchases) | **363 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## O que continua sem fila (18 stores)

`actors`, `after-sales`, `automation`, `catalog`, `companies`, `documents`, `fiscal`, `hr`, `marketing`,
`purchases`, `quotation`, `scheduling`, `service-desk`, `services` — mais 4 sem escrita pública.

**Nenhum deles move dinheiro ou mercadoria.** Os três que movem estão protegidos desde as r234–r235; o CRM — onde
a perda é um cliente — está protegido agora.
