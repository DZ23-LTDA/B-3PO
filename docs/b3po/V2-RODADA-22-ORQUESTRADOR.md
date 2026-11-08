# GOAL V2 — RODADA 22: O TASK ORCHESTRATOR (§12)

**Data**: 05/11/2026 · **§12 — Organization Builder, Project Builder, Agent Factory**

---

## O QUE O §12 PEDE, E O QUE JÁ EXISTIA

> *"Task Orchestrator controla filas, prioridade, dependência, retry, timeout, idempotência, cancelamento, recuperação e auditoria."*

| Capacidade | Antes desta rodada |
|---|---|
| **Dependência** | ✅ grafo (r18) |
| **Idempotência** | ✅ `execucao_id` / `ref` (r20) |
| **Auditoria** | ✅ `permission-guard` |
| **Prioridade** | ❌ **faltava** |
| **Retry** | ❌ **faltava** |
| **Timeout** | ❌ **faltava** |
| **Cancelamento** | ❌ **faltava** (o runtime tem `cancelar`; faltava a política) |

**Esta rodada fecha as quatro que faltavam.**

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/sofia-orquestrador.ts` — **175 linhas**, função pura:

| Função | O que decide |
|---|---|
| `esperaAntesDeRetentar` | backoff exponencial **com teto** — ou `null` quando desiste |
| `podeRetentar` | ainda há tentativa? |
| `estourouTimeout` | a tarefa passou do tempo? |
| `tarefasEstouradas` | quais cancelar |
| `filaDeDelegacao` | a fila, na ordem |
| `resumoDoPlano` | o agregado para a tela |

---

## AS TRÊS COISAS QUE OS TESTES IMPEDEM

### 1. Prioridade **não** fura dependência

```ts
filaDeDelegacao([
  t('normal', { prioridade: 'normal' }),
  t('critica', { prioridade: 'critica' }, ['normal'])
])
// → ['normal']
```

> **A crítica é mais urgente, mas depende da normal: o grafo manda.** Furar isso **quebraria o resultado**, não só a ordem — a tarefa rodaria sem o insumo que a outra produziria.

### 2. Retry **não** entra em laço

```ts
const politica = { baseMs: 1_000, maxTentativas: 20, tetoMs: 60_000 }
esperaAntesDeRetentar(10, politica)   // → 60_000, não 1_024_000
```

> **Sem teto, a tentativa 10 esperaria ~17 minutos** e a tarefa pareceria travada para quem olha a tela. **Sem `maxTentativas`, nunca desiste.**

### 3. Timeout **não** mata tarefa que não começou

```ts
estourouTimeout(t('a', {}, [], 'executando'), T0, 1000)   // → false
```

> `iniciada_em` ausente significa **"nunca rodou"**. **Cancelar ali mataria trabalho que nem saiu da fila.**
>
> E `status !== 'executando'` também protege: **uma tarefa pendente com `iniciada_em` antigo não estoura** — o status manda.

---

## A DECISÃO QUE PARECE DETALHE E NÃO É

### O limite conta as que **já estão executando**

```ts
const executando = tarefas.filter(t => t.status === 'executando').length
const limite = Math.max(0, (opcoes.limite ?? Infinity) - executando)
```

> **Sem isso o limite seria por chamada, não por plano** — e o runtime receberia `limite + executando` tarefas. Um limite de 2 com 2 rodando deixaria passar mais 2.

### `resumoDoPlano`: falha com retry disponível **não** é bloqueada

> **Para quem olha o total, "vai tentar de novo" e "desistiu" são coisas diferentes.** Contar as duas como bloqueada faria a prestação de contas pessimista — e o contrário esconderia trabalho travado.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **175** |
| Testes novos | **22** |
| Suíte de Sofia | **96 verdes** (19 store + 28 grafo + 12 canais + 15 ponte + 22 orquestrador) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE O §12 **AINDA** NÃO TEM

| Item | Por quê |
|---|---|
| **Organization Builder** | é um **assistente** de configuração: pergunta setor, sugere departamentos, cria módulos. Depende de decidir o fluxo de UX |
| **Project Builder** | idem — projetos de software/site/app exigem template de tarefas |
| **Agent Factory** | reusa agentes/skills/providers; precisa da decisão de como a especialização é editada |
| **Cancelamento pela tela** | a política existe (r22); o botão não |

**Os três Builders não são "mais um módulo"**: são a **camada de criação** que transforma uma entrevista em configuração. O §12 diz *"Não criar equipe enorme para tarefa simples"* — e o desenho disso é decisão de produto.

---

## O QUE O §13 MANDA, E EU AINDA NÃO FIZ

O §13 diz, com todas as letras:

> *"**Não escolher a opção A/B sugerida pelo DeepSeek como arranjo definitivo.** Adotar navegação contextual por ambiente."*

Na r15 eu **não** implementei A nem B — **reordenei** o menu plano. Mas o §13 quer **dois ambientes** (EMPRESA e ENGENHARIA), com o menu mudando conforme o contexto.

**Isso é o próximo alvo natural**, porque:
- é o **único item do GOAL que corrige diretamente o que eu já fiz**
- e a tela de Sofia (r21) vai precisar aparecer em **um** dos ambientes — não nos dois

---

## PRÓXIMA RODADA

**§13 — navegação contextual por ambiente.** Dois ambientes, menu que muda, e a tela de Sofia no lugar certo.

Não é "mais um item de menu": é a diferença entre um produto que lista 18 telas e um que sabe **em que contexto o usuário está**.
