# GOAL V2 — RODADA 18: O GRAFO DE DEPENDÊNCIAS (PASSO 2 DE 5)

**Data**: 05/11/2026 · **Item 7 — o orquestrador**
**Passo 2 de 5** da spec (`SOFIA-ORCHESTRATION-SPEC.md`)

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/sofia-grafo.ts` — **244 linhas**, **função pura**, sete exportações:

| Função | O que responde |
|---|---|
| `diagnosticarGrafo` | o plano pode rodar? (ciclos + dependências órfãs) |
| `ordemTopologica` | em que ordem as tarefas saem — ou `null` se há ciclo |
| `tarefasProntas` | quais podem ser delegadas **agora** |
| `dependenciasSatisfeitas` | uma tarefa específica teve as dependências cumpridas? |
| `profundidade` | quantos níveis de dependência uma tarefa tem |
| `profundidadeDoPlano` | a maior profundidade |

---

## POR QUE FUNÇÃO PURA

> **Porque o caso ruim é o que importa.**

Um plano com ciclo (`A → B → A`) **nunca termina**. O store, corretamente, **aceita** esse plano: ele grava planos, não valida grafos. A validação tem de existir em algum lugar — e **aqui**, sem tocar em arquivo nenhum.

**Se a validação morasse no `criar` do store**, dois problemas:
1. O plano ruim **nunca seria gravado**, então nunca poderia ser **inspecionado** para descobrir onde o ciclo está
2. Testar o ciclo exigiria **montar um plano real em disco**

**Aqui, o teste do ciclo é três linhas.**

---

## AS DECISÕES QUE IMPORTAM

### 1. Dependência órfã **não** é ciclo — é diagnóstico separado

```ts
// `b` espera por `nao-existe`
expect(d.ciclos).toEqual([])
expect(d.dependencias_orfas).toEqual([{ depende_de: 'nao-existe', tarefa_id: 'b' }])
```

> **São problemas diferentes com consertos diferentes.** Ciclo é "a ordem não existe"; órfã é "alguém escreveu um id errado". Juntar os dois faria o produto mostrar "ciclo" para um erro de digitação.

### 2. A ordem é **derivada**, e isso tem prova

Um teste monta o **mesmo grafo duas vezes** e verifica que a ordem é idêntica — Kahn com desempate pela ordem do array. **Sem isso, um teste que depende de `Math.random` não prova nada.**

> E **se alguém gravar a ordem no plano**, `tarefasProntas` passa a divergir do que está gravado — é aí que a invariante da r17 se rompe.

### 3. `bloqueada` **não** volta à fila

```ts
expect(tarefasProntas([t('a', [], 'concluida'), t('b', ['a'], 'bloqueada')])).toEqual([])
```

> **`bloqueada` diz "não é para tentar".** Uma decisão humana **não é revertida pelo grafo** — e é o teste que impede o orquestrador de "consertar" um bloqueio sozinho.

### 4. A profundidade de um ciclo é `null`, não um número

```ts
expect(profundidade('a', [t('a', ['b']), t('b', ['a'])])).toBeNull()
```

> **A profundidade de um ciclo é infinita.** Devolver um número seria mentira — e o GOAL exige limite de profundidade no multiagente; alimentar esse limite com um número inventado deixaria o limite passar.

### 5. Diamante tem profundidade 2, não 3

```
raiz → esq ┐
       dir ┘ → fim      profundidade(fim) = 2
```

> A junção espera **duas** ramificações no **mesmo nível**. Contar o caminho mais longo em vez do número de níveis daria 3 e limitaria a concorrência sem motivo.

---

## A PROVA — 47 testes, e os que mais importam

| Teste | Por que |
|---|---|
| **ciclo direto, de três, autodependência** | o plano que nunca termina tem de ser **detectado**, não travado |
| **ciclo não contamina o resto** | `x↔y` em ciclo, `solo` independente — `solo` não pode ser reportado como parte do ciclo |
| **`ordemTopologica` devolve `null` com ciclo** | devolver qualquer ordem seria mentira |
| **determinística** | duas chamadas, mesma ordem |
| **órfã não faz a ordem devolver `null`** | senão um erro de digitação pareceria ciclo |
| **`bloqueada` não volta à fila** | decisão humana não é revertida pelo grafo |
| **profundidade do diamante = 2** | limite de concorrência correto |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do grafo | **244** |
| Testes | **47 verdes** (19 do store + 28 do grafo) |
| Funções exportadas | **7** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Arquivos alterados | **2 novos** (grafo + teste) |

---

## ONDE ESTAMOS NA SPEC

| # | Passo | Estado |
|---|---|---|
| 1 | `sofia-store.ts` | ✅ r17 |
| **2** | **grafo de dependência** | ✅ **r18** |
| 3 | `sofia-ipc.ts` — canais **com guarda desde o 1º commit** | próxima |
| 4 | Ponte com `agent-execution-store` (`parent_execution_id`) | depois |
| 5 | Tela | depois |

---

## PRÓXIMA RODADA — passo 3

**`sofia-ipc.ts`.** Os canais, **todos com `exigirAtor` desde o primeiro commit** — a r2 mediu que canal sem guarda é dívida, e a dívida cresceu 30 canais antes de ser paga.

Canais previstos:
- `hermes:sofia:planos` (`read`)
- `hermes:sofia:plano` (`read`)
- `hermes:sofia:criar` (`execute`)
- `hermes:sofia:tarefa` (`execute`)
- `hermes:sofia:status` (`execute`)
- `hermes:sofia:aprovar` (`execute`)

**E o ratchet de permissão já vai pegar se algum nascer sem guarda** — é para isso que ele existe.
