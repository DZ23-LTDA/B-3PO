# GOAL V2 — RODADA 5: AUTOMAÇÕES PROTEGIDAS

**Data**: 05/11/2026 · **Fase 2 — IPC** · 3 de 8 arquivos de domínio fechados

---

## O QUE FOI FECHADO

`automation-ipc.ts` — **6 canais**:

| Canal | Ação | Por quê |
|---|---|---|
| `hermes:automations:list` | `read` | ver as regras |
| `hermes:automations:triggers` | `read` | ver os gatilhos |
| `hermes:automations:tools` | `read` | ver o catálogo de ações |
| **`hermes:automations:sweep`** | **`execute`** | **dispara agora** |
| **`hermes:automations:create`** | **`execute`** | **arma uma regra** |
| **`hermes:automations:setActive`** | **`execute`** | **arma / desarma** |

**Por que este terceiro**: uma regra ativa **executa ações em nome do usuário sem ninguém olhando**. Com os canais abertos, qualquer renderer podia montar uma regra que dispara `execute` no financeiro e ligá-la sem que existisse um responsável.

---

## `setActive` — o caso menos óbvio

**Ativar uma regra parada é *armar*.** Tratar como `read` deixaria alguém com nível de leitura **armar um disparo de execução em outro domínio**.

**Desativar é *desarmar*** — também muda o que o sistema vai fazer sozinho. Os dois são `execute`.

**`sweep` é `execute`, não `read`.** *"Verificar agora"* dispara as regras ativas imediatamente: é a mesma ação de um tick do agendador. O chamador está pedindo que **ações aconteçam**, não consultando estado.

---

## A PROVA — 8 testes, 5 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com a guarda** | **8 de 8 passam** |
| **Sem a guarda** (`git stash`) | **5 de 8 falham** |

```
× sem ator, os seis recusam com sem_permissao
× sem ator, NENHUMA regra e criada
× sem ator, NENHUMA regra e ativada
× sem ator, a varredura NAO dispara acao nenhuma
× sem ator, a recusa acontece ANTES de validar o payload
```

**Três delas contam chamadas ao store** (`criadas`, `ativadas`, `varreduras`). Sem a guarda, os três contadores deixam de ser 0 — **ações reais teriam acontecido**.

---

## UM ERRO MEU, PEGO PELO TESTE

O primeiro teste *"com ator, criar e ativar chegam ao store"* **falhou**: `criadas` era 0.

**Causa**: eu tinha inventado o gatilho `estoque_baixo`. Os reais são:

```
venda.faturada · estoque.zerado · ticket.aberto · ticket.atrasado · conta.vencendo
```

**O teste pegou antes do commit.** Corrigido para `estoque.zerado`.

> É a diferença entre um teste que valida comportamento e um que só confirma que a função foi chamada: o meu teste *passou* quando deveria falhar, porque o gatilho inventado foi rejeitado pela validação real — e o contador ficou em 0. **A validação de gatilho continuar funcionando é parte do que o teste protege.**

---

## MEDIÇÕES

| Medida | Valor | Antes |
|---|---|---|
| Canais de domínio sem guarda | **20** | 30 |
| Arquivos na dívida do ratchet | **22** | 25 |
| Testes novos | **8** | — |
| **Provados vermelhos** | **5** | — |
| Regressão (5 arquivos) | **167 verdes** | — |
| Gate | **14 checks, ok** | — |
| Typecheck | **0 erros** | — |

---

## O QUE FALTA NA FASE 2

| Arquivo | Canais |
|---|---|
| `marketing-ipc.ts` | **7** |
| `after-sales-ipc.ts` | 4 |
| `scheduling-block-ipc.ts` | 3 |
| `service-desk-ipc.ts` | 2 |
| `analytics-ipc.ts` | 1 |
| **Total** | **17 canais em 5 arquivos** |

E os **188 de plataforma** — `git-ipc` (21), `fs-ipc` (13), `terminal-ipc` (6) com acesso à máquina.

---

## PRÓXIMA RODADA

**`marketing-ipc.ts`** — 7 canais. `posts` **publica fora da empresa**; é o último canal de domínio com efeito externo real.
