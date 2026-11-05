# GOAL V2 — RODADA 6: MARKETING PROTEGIDO

**Data**: 05/11/2026 · **Fase 2 — IPC** · 4 de 8 arquivos de domínio fechados

---

## O QUE FOI FECHADO

`marketing-ipc.ts` — **7 canais**, o **maior arquivo de domínio em exposição**:

| Canal | Ação | Por quê |
|---|---|---|
| `hermes:marketing:campaigns` | `read` | ver campanhas |
| `hermes:marketing:posts` | `read` | ver calendário editorial |
| `hermes:marketing:indicators` | `read` | ver métricas |
| **`hermes:marketing:createCampaign`** | **`execute`** | **cria verba** |
| **`hermes:marketing:setCampaignStatus`** | **`execute`** | **põe verba em circulação** |
| **`hermes:marketing:createPost`** | **`execute`** | **conteúdo que vai sair** |
| **`hermes:marketing:setPostStatus`** | **`execute`** | **PUBLICA FORA** |

**Por que este quarto**: `setPostStatus` com status de publicação é o ato de **publicar em conta social que carrega o nome da empresa**. Não dá para recolher.

---

## A PROVA — 7 testes, 4 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com a guarda** | **7 de 7 passam** |
| **Sem a guarda** (`git stash`) | **4 de 7 falham** |

```
× sem ator, os sete recusam com sem_permissao
× sem ator, NAO publica — o store nem e chamado
× sem ator, NAO cria campanha nem post
× sem ator, a recusa acontece ANTES de validar o payload
```

> **Sem a guarda, `statusPublicados` deixa de ser 0** — **o post teria saído**.

---

## MEDIÇÕES

| Medida | Valor | Antes |
|---|---|---|
| Canais de domínio sem guarda | **13** | 30 |
| Arquivos na dívida do ratchet | **21** | 25 |
| Testes novos | **7** | — |
| **Provados vermelhos** | **4** | — |
| Regressão (6 arquivos) | **218 verdes** | — |
| Gate | **14 checks, ok** | — |
| Typecheck | **0 erros** | — |

**Quatro arquivos fechados em quatro rodadas.** Nenhuma regressão em nenhuma delas.

---

## O QUE FALTA NA FASE 2 — os 5 restantes

| Arquivo | Canais | Natureza |
|---|---|---|
| `after-sales-ipc.ts` | 4 | pós-venda: follow-up, satisfação |
| `scheduling-block-ipc.ts` | 3 | bloqueio de agenda |
| `service-desk-ipc.ts` | 2 | abertura de ticket |
| `analytics-ipc.ts` | 1 | dashboard |
| **Total** | **13 canais em 4 arquivos** |

**Nenhum deles tem efeito externo irreversível** — são leitura de dado de negócio e escrita comum. É por isso que vêm depois dos quatro que tinham: anonimização, nota fiscal, automação e publicação.

---

## PRÓXIMA RODADA

**`after-sales-ipc.ts`** — 4 canais. `create` de follow-up **agenda contato com cliente**, que é efeito externo — mas reversível (dá para não enviar).

Depois: `scheduling-block` (3) · `service-desk` (2) · `analytics` (1). **Fecha a fase 2 dos canais de domínio.**
