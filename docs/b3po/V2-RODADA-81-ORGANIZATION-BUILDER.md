# GOAL V2 — RODADA 81: O ORGANIZATION BUILDER — E POR QUE O CATÁLOGO É FECHADO

**Data**: 05/11/2026 · **§12** · o Builder que faltava

---

## O QUE JÁ EXISTIA, E O QUE FALTAVA

`companies-store` guarda **o cadastro**: nome, CNPJ, endereço.

> **Um cadastro não é uma estrutura — é a certidão.** O desenho — **quem faz o quê, em que unidade** — não existia.

---

## A DECISÃO QUE DEFINE O ARQUIVO

### O catálogo de setores é **fechado, e pequeno**

```ts
export const SETORES = ['distribuidora_gas', 'varejo', 'servico'] as const
```

> **Um Organization Builder que "sugere" estrutura para qualquer negócio precisa conhecer o negócio.** O produto serve **três**.
>
> **Para os outros, devolve `null`** — e a tela pede que a pessoa monte, em vez de receber **uma sugestão inventada**.

### **Uma sugestão errada é pior que nenhuma**

> Ela **vira a estrutura real de uma empresa** — e desfazer uma estrutura **é mais caro que criar uma**.

---

## A ESTRUTURA DE CADA SETOR — e o teto de 3

```ts
distribuidora_gas: [
  { nome: 'Atendimento', faz: 'atende o pedido, agenda a entrega e resolve a troca' },
  { nome: 'Logística',   faz: 'mantém o estoque, carrega o caminhão e recolhe o vazio' },
  { nome: 'Financeiro',  faz: 'compra, cobra e paga' }
]
```

> **Três departamentos no máximo.** *"Uma estrutura que a pessoa não consegue explicar de memória não é uma estrutura — é um organograma de apresentação."*

---

## A SEGUNDA DECISÃO — e ela vem do §12

> *"Não criar equipe enorme para tarefa simples."*

```ts
dimensionar(org, frentesAbertas) → { aviso, departamentos, frentes, razoavel }
```

**6 departamentos para 1 frente:**

> *"São 6 departamentos para 1 frente de trabalho. **O §12 pede para não criar equipe grande para tarefa simples** — comece com o que tem trabalho."*

### **Avisa, não recusa**

> *"Quem sabe da ambição é o dono, e o produto não tem opinião sobre a ambição de ninguém. O que ele faz é **dizer o número**."*
>
> A função **não tem campo `error`** — e o teste prova isso.

---

## `podeOperar` — as três perguntas

| Pergunta | Recusa |
|---|---|
| tem setor conhecido? | `sem_setor` |
| tem departamento? | `sem_departamento` |
| **todo departamento diz o que faz?** | `departamento_sem_funcao` |

> **Um nome sem função é uma caixa no organograma.**

---

## A PROVA — 22 testes

| Grupo | O que trava |
|---|---|
| **catálogo** | **3 setores** · **desconhecido devolve `null`** · **cada um diz o que faz** |
| | **devolve cópia** · **no máximo 3 departamentos** |
| **validar** | **duplicata com caixa diferente recusada** · unidade duplicada |
| | **sem departamento é válido** — a organização pode nascer vazia |
| **dimensionar** | 2/1 razoável · **6/1 avisa e cita o §12** · **a mesma estrutura com 4 frentes é razoável** |
| | **avisa, não recusa** — não há `error` |
| **podeOperar** | **sem departamento** · **sem função** · **setor inválido** |
| **resumo** | **sem função é dito pelo NOME**, não pela contagem |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~260** |
| Testes | **22** |
| Regressão (organization + project + companies) | **89 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P4 — ONDE FICOU

| Item | Estado |
|---|---|
| ADR de Sofia · Task Orchestrator | ✅ |
| Planos persistentes · Project Builder | ✅ 6 camadas |
| **Organization Builder** | ✅ **regra (r81)** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |
| Trabalho pontual | ❌ **não existe** |

---

## PRÓXIMA RODADA

**O Agent Factory** — *"reutiliza agentes, skills, providers e ferramentas existentes, configurando especialização, escopo, permissão, ferramentas e contexto"*.

> **81 rodadas.** O §12 pede três tipos de trabalho e quatro componentes. **Três dos quatro existem** — e o Organization Builder nasce com a coragem de dizer **`null`** para o negócio que não conhece, que é o oposto de inventar uma estrutura para parecer completo.
