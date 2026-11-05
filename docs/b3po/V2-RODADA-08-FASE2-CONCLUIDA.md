# GOAL V2 — RODADA 8: FASE 2 CONCLUÍDA — TODOS OS CANAIS DE DOMÍNIO FECHADOS

**Data**: 05/11/2026 · **Fase 2 — IPC: 8 de 8 arquivos de domínio protegidos**

---

## O QUE FOI FECHADO NESTA RODADA

Três arquivos, **6 canais do inventário** (14 handlers no total):

### `scheduling-block-ipc.ts` — 3 canais

| Canal | Ação |
|---|---|
| `scheduling:block:list` | `read` |
| **`scheduling:block:create`** | **`execute`** |
| **`scheduling:block:remove`** | **`execute`** |

> **Um bloqueio de agenda impede que um horário seja vendido.** Criar um bloqueio falso **tira horário de venda**; remover um bloqueio real **vende um horário que o profissional não tem**.

### `service-desk-ipc.ts` — 5 canais no arquivo

| Canal | Ação |
|---|---|
| `desk:tickets` / `desk:indicators` | `read` |
| **`desk:open`** | **`execute`** — abre ticket com SLA correndo |
| **`desk:setStatus`** | **`execute`** — `fechado` encerra o SLA |
| **`desk:rate`** | **`execute`** — a nota pode disparar revisão humana |

### `analytics-ipc.ts` — 1 canal

**`analytics:dashboard`** → `read` **+ ator**.

> **É o canal mais amplo do sistema**: lê financeiro, vendas, estoque, atendimento, pós-venda e marketing num único payload. `read` — **mas exige ator**, porque o **agregado revela o negócio inteiro** mesmo que cada parte isolada pareça inofensiva.

---

## A PROVA — 6 testes, 5 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com as guardas** | **6 de 6 passam** |
| **Sem as guardas** (os 3 originais) | **5 de 6 falham** |

```
× os três canais recusam sem ator
× sem ator, NENHUM bloqueio é criado no disco
× os cinco canais recusam sem ator
× sem ator, NENHUM ticket é aberto
× sem ator, o dashboard recusa
```

> **A prova do bloqueio é a mais forte**: ela cria um bloqueio sem ator e depois **lê o disco com ator** para confirmar que a lista continua vazia. Não é "respondeu erro" — é **nada ficou gravado**.

---

## FASE 2 CONCLUÍDA — o balanço das 6 rodadas

| Rodada | Arquivo | Canais | Provados vermelhos | Não tem desfazer? |
|---|---|---|---|---|
| r3 | `privacy` | 3 | 3 | **anonimização LGPD** |
| r4 | `fiscal` | 4 | 4 | **nota fiscal** |
| r5 | `automation` | 6 | 5 | **disparo automático** |
| r6 | `marketing` | 7 | 4 | **publicação externa** |
| r7 | `after-sales` | 4 | 3 | *(era o que parecia protegido)* |
| r8 | `scheduling-block` + `service-desk` + `analytics` | 6 | 5 | bloqueio de venda |
| **Total** | **8 arquivos** | **30 canais** | **24 provados vermelhos** | |

---

## MEDIÇÕES FINAIS DA FASE 2

| Medida | Valor | Início da fase |
|---|---|---|
| Canais de domínio sem guarda | **0** | 30 |
| Arquivos na dívida do ratchet | **17** | 25 |
| Gate | **14 checks, ok** | — |
| Typecheck | **0 erros** | — |
| Regressão (permissão + erp + r8) | **34 verdes** | — |

**Os 30 canais de domínio empresarial estão fechados.** O ratchet continua em 17 porque **os 17 restantes não são de domínio** — são de plataforma.

---

## O QUE O RATCHET AINDA LISTA — 17 arquivos

| Nível | Arquivos | Canais | Ação necessária |
|---|---|---|---|
| **2 — acesso à máquina** | `git-ipc` | **21** | fronteira própria (hoje não tem nenhuma) |
| | `fs-ipc` | **13** | idem |
| | `terminal-ipc` | **6** | idem |
| **4 — plataforma** | `erp-ipc`, `hud-ipc`, `lookup-ipc`, `notification-ipc`, `clipboard-ipc`, `pet-overlay-ipc`, `plugin-files-ipc`, `spellcheck-dictionary-ipc`, `startup-latency-ipc`, `challenge-window-ipc`, `mcp-oauth-callback-ipc`, `agent-ipc`, `scheduling-catalog-ipc`, `ui-preferences-ipc` | ~40 | **não é RBAC de empresa** |

**`git-ipc` e `terminal-ipc` são o próximo alvo real**: eles dão ao renderer **acesso a comando e a repositório**, e hoje não têm **nenhuma** fronteira.

---

## PRÓXIMA RODADA

**`terminal-ipc.ts`** (6 canais) e **`git-ipc.ts`** (21) — não com `exigirAtor` (que é RBAC de domínio), mas com uma **fronteira de máquina**: estes canais não são "permissão de financeiro", são "pode executar comando neste computador". Merecem decisão explícita sobre quem pode.
