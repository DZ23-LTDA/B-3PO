# GOAL V2 — RODADA 76: O PROJETO — O QUE LIGAVA ORGANIZAÇÃO E TAREFA

**Data**: 05/11/2026 · **§12** · o item que faltava do P4

---

## O QUE O §12 DEFINE

> Três tipos de trabalho: **organização permanente**, **projeto** e **trabalho pontual**.

| Tipo | Estado antes desta rodada |
|---|---|
| **Organização** | ✅ `companies-store` |
| **Tarefa** | ✅ `sofia-store` + `sofia-grafo` (r17–r18) |
| **Projeto** | ❌ **não existia** |

> *"A organização guarda o que a empresa **é**; a tarefa guarda o que **precisa ser feito**. **Faltava o que liga as duas** — e sem ele, um conjunto de tarefas é uma lista, não um projeto."*

---

## O QUE FOI CONSTRUÍDO

`project.ts` — **~200 linhas**, funções puras.

### O modelo, e as três decisões que ele carrega

| Campo | Decisão |
|---|---|
| **`objetivo`** | **obrigatório** — *"um projeto sem objetivo tem tarefas e não tem direção"* |
| **`orcamento_cents: null \| number`** | **`null` é "não definido", não zero** — *"projeto sem orçamento e com orçamento zero são coisas diferentes"* |
| **`criterios: string[]`** | **o que permite declarar pronto** |

---

## AS DECISÕES QUE MAIS IMPORTAM

### 1. **Sem critério, ninguém declara pronto**

```ts
if (projeto.criterios.length === 0) return { error: 'sem_criterios' }
```

> **A r45 mostrou que um fluxo "completo" sem prova é uma afirmação; o critério é o que transforma a afirmação em verificação.**

### 2. **Rascunho não conclui**

> *"Registraria como entrega algo que ninguém fez."*

### 3. **Concluído e cancelado são finais**

> *"Reabrir apagaria o desfecho — e o desfecho é o que os relatórios contam."*

---

## A LIGAÇÃO COM O GRÁFICO DA r18

```ts
export function podeIniciar(projeto, tarefas) {
  ...
  const diagnostico = diagnosticarGrafo(tarefas)
  if (diagnostico.ciclos.length > 0 || diagnostico.dependencias_orfas.length > 0) return { motivo: 'diagnostico', ok: false }
}
```

> **Um projeto é um plano com nome** — e por isso a regra do grafo vale aqui.
>
> **E `podeIniciar` recebe as tarefas em vez de buscá-las**: o arquivo não conhece a `sofia-store`, e a r17 continua sendo a única dona da tarefa.

---

## A PROVA — 26 testes

| Grupo | O que trava |
|---|---|
| **normalizar** | nasce em **rascunho** · **sem objetivo recusa** · **status do payload ignorado** |
| | **orçamento zero é válido** · **negativo recusado** · **ausente é `null`** |
| **transições** | rascunho → ativo · **ativo → concluído com critério** |
| | **SEM CRITÉRIO RECUSADO** · **rascunho não conclui** |
| | **concluído e cancelado são finais** |
| **podeIniciar** | **com ciclo NÃO roda** · **com dependência órfã NÃO roda** · sem tarefa não roda |
| **situação** | conta tarefas · **prazo vencido é dito** · **sem critério é dito, não escondido** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~200** |
| Testes | **26** |
| Regressão (project + sofia) | **122 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P4 — ONDE FICOU

| Item | Estado |
|---|---|
| ADR operacional de Sofia | ✅ r?? |
| Task Orchestrator (fila, prioridade, retry, timeout) | ✅ r22 |
| **Planos persistentes** | ✅ **regra (r76)** |
| Organization Builder | ⚠️ `companies-store` existe; **o Builder não** |
| Project Builder | ⚠️ **regra existe (r76); o store e a tela não** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |
| policy/approval | ✅ r26–r28, r52–r53 |

---

## PRÓXIMA RODADA

**O store do projeto** — `projetos.json`, para que o plano **sobreviva ao reinício**.

> **76 rodadas.** O §12 pede três tipos de trabalho; o produto tinha dois. **O terceiro é o que dá nome ao conjunto** — e ele nasce com uma regra dura: **sem critério de aceite, ninguém declara pronto**.
