# GOAL V2 — RODADA 101: O PRIMEIRO USO REAL DO ORQUESTRADOR

**Data**: 05/11/2026 · **a 7ª ordem do dono**

---

## O QUE EXISTIA, E O QUE FALTAVA

| Rodada | Peça |
|---|---|
| r17 | `sofia-store` — o plano em disco |
| r18 | `sofia-grafo` — ciclos, órfãs, ordem topológica |
| r20 | `sofia-ponte` — delegação ao runtime |
| r22 | `sofia-orquestrador` — fila, prioridade, retry, timeout |
| r76 | `project-store` — o objetivo com critério |
| r82 | `agent-factory` — quem executa |

> **Cada peça tem teste próprio, e nenhum teste as juntou.** É exatamente a forma da r45: **um teste de unidade prova que a função faz o que ela diz; só o fluxo prova que elas fazem sentido juntas.**

---

## O TESTE — 14 verdes

**O único mock é o runtime** — porque o de verdade exige credencial (r54).

| Grupo | O que prova |
|---|---|
| **plano em disco** | criar → obter · **o grafo não acha ciclo** · **a ordem topológica respeita as dependências** |
| | **só a primeira está pronta** |
| **delegação** | **chama o runtime com o agente do plano** |
| | **delegar a segunda antes da primeira é RECUSADO** — a dependência não é decorativa |
| | tarefa inexistente · **a ponte grava o `execucao_id`** |
| **orquestrador** | a fila respeita o grafo · **o resumo é um objeto, não texto** |
| **agentes** | **toda tarefa aponta para um agente que existe no roster** |
| **o fluxo inteiro** | plano → grafo → fila → delegação → **o plano sobreviveu ao disco** |

---

## O QUE O TESTE PEGOU — e são três coisas que eu presumi erradas

### 1. `escopo` é um **enum**, não um objeto

```ts
// eu escrevi
escopo: { referencia: 'proj-loja', tipo: 'projeto' }

// é
escopo: 'projeto'   // 'organizacao' | 'projeto' | 'trabalho_pontual'
```

> **O §11:361 pede "classificar organização, projeto ou trabalho pontual"** — e a r17 fez disso um **enum do tipo de trabalho**, não um objeto com referência. **Eu tinha inventado um shape.**

### 2. `tarefasProntas` exige **`status: 'pendente'`**

> Sem o status, a tarefa não é "pronta" — e o grafo **devolveu lista vazia**. O campo não é decoração.

### 3. A ponte **não checa credencial** — e isso é **deliberado**

> A r20 decidiu: *"Sofia não transforma «sem credencial» em «plano falhou»: **são fatos diferentes** e a tela precisa mostrar qual."*
>
> **Quem recusa é o runtime**, e a ponte repassa. **Eu tinha presumido que a ponte barrava.**

**Os dois testes que presumiam o contrário foram removidos** — e a remoção está documentada **aqui**, não escondida.

---

## O QUE O FLUXO PROVA

> **Um plano de três tarefas com dependência real atravessa seis módulos** — store, grafo, orquestrador, ponte, roster, disco — **e continua íntegro no fim**.

**É a diferença entre "as peças existem" e "as peças encaixam"** — e é a única coisa que o §11:368 (*"delegar ao Hermes"*) pede de verdade.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do teste | **~215** |
| Testes | **14** |
| Módulos atravessados | **6** |
| Presunções minhas derrubadas | **3** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## A 7ª ORDEM — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Plano persistente** | ✅ r77 |
| **Grafo de tarefas** | ✅ r18 |
| **Delegação ao runtime** | ✅ r20 |
| **Fila, prioridade, retry, timeout** | ✅ r22 |
| **O primeiro uso real — as peças juntas** | ✅ **r101** |
| **Execução real com o Hermes** | ❌ **exige credencial** (r54) |

> **O orquestrador está construído e provado.** O que falta é **o runtime de verdade** — e ele é o mesmo bloqueio do §16 desde a r54.

---

## PRÓXIMA RODADA

**Expandir o negócio** — o §17 diz *"expandir **depois** de comprovar fluxo ponta a ponta"*, e agora **três fluxos** estão provados: compras (r45), venda (r61) e orquestração (r101).

> **101 rodadas.** A 7ª ordem pedia *"construir o orquestrador"* — ele estava construído desde a r22, **e o que faltava era a prova de que funciona junto**. Agora está provado, e **as três coisas que eu presumi erradas estão nomeadas**.
