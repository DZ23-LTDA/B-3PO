# GOAL V2 — RODADA 4: FISCAL PROTEGIDO

**Data**: 05/11/2026 · **Fase 2 — IPC** · 2 de 8 arquivos de domínio fechados

---

## O QUE FOI FECHADO

`fiscal-ipc.ts` — **4 canais**, todos pela guarda:

| Canal | Ação | Por quê |
|---|---|---|
| `hermes:fiscal:list` | `read` | leitura de documentos |
| `hermes:fiscal:status` | `read` | estado do emissor |
| **`hermes:fiscal:emitir`** | **`execute`** | **cria documento fiscal** |
| **`hermes:fiscal:cancelar`** | **`execute`** | **desfaz documento perante o fisco** |

**Por que este segundo**: depois da anonimização (r3), era o único canal com **efeito legal**. Emitir nota em nome da empresa sem exigir ator não é cobertura incompleta — é **a empresa respondendo por um documento que ninguém autorizou**.

---

## A PROVA — 7 testes, 4 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com a guarda** | **7 de 7 passam** |
| **Sem a guarda** (`git stash`) | **4 de 7 falham** |

As 4 que falham sem a guarda:

```
× sem ator, os quatro recusam com sem_permissao
× sem ator, NAO emite nota — o store nem e chamado
× sem ator, NAO cancela nota — o store nem e chamado
× sem ator, a recusa acontece ANTES de validar o payload
```

**As duas do meio são as mais fortes**: contam chamadas ao store. **Sem a guarda, `emitidos` deixa de ser 0.**

> A prova mais forte não é *"respondeu erro"* — é **nada foi escrito**.

---

## A ORDEM DE DECLARAÇÃO (um detalhe que quase virou bug)

`registerFiscalIpc` é chamado na **linha 89** do `erp-ipc.ts`, e `actorOf` é declarado na **linha 155**.

**Não quebra**, porque `actorOf: () => actorOf()` é uma **closure** — ela lê o `actorOf` no **momento da chamada**, não na montagem. O comentário no código registra isso para o próximo leitor não "consertar" movendo a montagem.

---

## MEDIÇÕES

| Medida | Valor | Antes |
|---|---|---|
| Canais de domínio sem guarda | **26** | 30 |
| Arquivos na dívida do ratchet | **23** | 25 |
| Testes novos | **7** | — |
| Provados vermelhos sem a correção | **4** | — |
| Regressão (fiscal + permissão + erp + privacy) | **109 verdes** | — |
| Gate | **14 checks, ok** | — |
| Typecheck | **0 erros** | — |

---

## O QUE FALTA NA FASE 2

| Arquivo | Canais |
|---|---|
| `marketing-ipc.ts` | **7** |
| `automation-ipc.ts` | **6** |
| `after-sales-ipc.ts` | 4 |
| `scheduling-block-ipc.ts` | 3 |
| `service-desk-ipc.ts` | 2 |
| `analytics-ipc.ts` | 1 |
| **Total** | **23 canais em 6 arquivos** |

E, fora do ratchet (188 canais de plataforma): **`git-ipc` (21)**, **`fs-ipc` (13)**, **`terminal-ipc` (6)** — os três com acesso à máquina, sem fronteira.

---

## PRÓXIMA RODADA

**`automation-ipc.ts`** — 6 canais. Automatizações **executam ações em nome do usuário**; é o próximo com efeito externo real.

`marketing-ipc.ts` (7) vem depois: `posts` publica fora.
