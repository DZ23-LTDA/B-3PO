# SOFIA — ESPECIFICAÇÃO DE ORQUESTRAÇÃO

**Rodada**: 16 do GOAL V2 (§11) · **Data**: 05/11/2026
**Estado**: **DEFINIÇÃO**. Nenhuma linha de código de Sofia foi escrita. O §11 pede spec e ADR; a construção é o §12/§13.

---

## 0. O FATO DE PARTIDA

**`Sofia` não existe no código.** Busca por `\bSofia\b` em todo o repositório (fora de `node_modules`/`.git`):

| Onde apareceu | O que é |
|---|---|
| `website/build/api/skills*.json` (3×) | catálogo de **102.774 skills de terceiros** — nada a ver com o produto |
| `docs/b3po/V2-RODADA-15-NAVEGACAO.md` (2×) | **este documento**, escrito por mim na rodada anterior |

**Zero ocorrências em `apps/desktop`, `hermes_cli`, `gateway`, `tools`, `agent`.**

O GOAL V2 chama Sofia de *"inteligência central"* e não define o que ela é. **Não vou inventar que ela existe.** O que segue é a especificação do que ela **deve ser**, escolhida entre três alternativas contra o código que já está aqui.

---

## 1. O QUE JÁ EXISTE (e não pode ser duplicado)

A instrução é explícita: *"Não duplicar sessão, transcript, memória canônica, tool loop ou runtime."*

| Capacidade | Dono canônico hoje | Arquivo |
|---|---|---|
| Execução, loop, transcript, memória | **Hermes runtime** | `agent/`, `run_agent.py` |
| Sessões | **Gateway** | `tui_gateway/`, `gateway/` |
| Registro de execuções de agente | **`agent-execution-store`** | `apps/desktop/electron/agent-execution-store.ts` |
| Identidade e nível de ator | **`actors-store` + `rbac`** | `actors-store.ts`, `rbac.ts` |
| Guarda de permissão | **`permission-guard`** | `permission-guard.ts` |
| Aprovação humana | **`agent-approval`** | `agent-approval-store.ts` |
| Domínios de negócio | **25 stores** | `*-store.ts` |
| Auditoria | **`audit`** (em memória) | `permission-guard.ts` |

### O modelo de execução que já está modelado

```ts
interface ExecucaoGravada {
  execution_id: string
  task_id: string
  parent_execution_id?: string | null
  owner: string
  status: ...
}
```

> **`parent_execution_id` já existe.** O comentário em `agent-execution-store.ts:6` registra que ele *"não existe em lugar nenhum"* — isto é, o campo está no tipo mas **nada o preenche**. É exatamente o gancho que uma camada de coordenação precisa, e ele já está pago.

---

## 2. AS TRÊS ALTERNATIVAS

### A. Serviço de orquestração Python/Node

Processo próprio, com a própria noção de plano, fila e execução.

| Critério | Avaliação |
|---|---|
| Duplicação | **Alta** — recriaria fila, retry, status e ciclo de vida que o runtime já tem |
| Persistência | Nova — precisaria de esquema próprio |
| Segurança | Nova — precisaria de guarda própria, **e a nossa já tem 30 canais fechados** |
| Testes | Nova suíte inteira |
| Recuperação | Nova — o runtime já recupera sessão |

**Rejeitada.** É o *"segundo runtime"* que o GOAL proíbe duas vezes (§6 e §11).

### B. Conjunto de skills e configurações Hermes

Sofia como prompt + skills, sem código.

| Critério | Avaliação |
|---|---|
| Duplicação | **Nenhuma** |
| Persistência | **Nenhuma própria** — o plano viveria no transcript |
| Segurança | Passa pelo runtime, **mas sem policy check próprio** |
| Testes | Difícil: comportamento de prompt não tem contrato |
| Recuperação | Depende do runtime |

**Rejeitada parcialmente** — resolve o "não duplicar", mas **não entrega** o que o §11 exige: *plano estruturado*, *grafo de tarefas*, *verificação de políticas*, *prestação de contas*. Um prompt não tem plano inspecionável.

### C. Camada que delega por interfaces reais ✅

Uma camada **pequena** de planejamento/coordenação: persiste o plano, valida política, delega ao Hermes, acompanha e presta contas.

| Critério | Avaliação |
|---|---|
| Duplicação | **Baixa** — reusa `agent-execution-store`, `permission-guard`, `agent-approval`, gateway |
| Persistência | **Reusa** o padrão JSON atômico dos 26 stores |
| Segurança | **Reusa** `exigirAtor` — sem guarda paralela |
| Testes | Testável: o plano é dado, não prompt |
| Recuperação | Reusa o `ref` determinístico e o status persistido |

**Escolhida.**

---

## 3. O QUE SOFIA É

> **Sofia é a camada que transforma uma intenção em um plano persistente, verifica política, delega ao Hermes por interfaces reais, acompanha e presta contas.**
>
> **Ela não executa.** O Hermes executa. Ela **não guarda verdade de negócio** — os 25 stores guardam. Ela **não decide permissão** — o `policy engine` decide.

### As quatro fronteiras, explícitas

| Sofia **faz** | Sofia **não faz** |
|---|---|
| interpreta intenção e classifica escopo | executar o turno do agente |
| produz plano com tarefas e dependências | manter transcript ou sessão |
| verifica política **chamando** o guard | decidir permissão por conta própria |
| solicita aprovação quando a política exige | aprovar a si mesma |
| delega ao Hermes e acompanha | rodar tool loop |
| registra resultado e erro | guardar dado de negócio |
| apresenta prestação de contas | reescrever histórico |

---

## 4. O MODELO DE DADOS PROPOSTO

Um store novo, no padrão dos outros 26 (JSON atômico em `userData/b3po/`, fila de escrita, `tenant_id`).

```ts
interface Plano {
  plano_id: string
  tenant_id: string
  ator_id: string            // quem pediu
  objetivo: string
  escopo: 'organizacao' | 'projeto' | 'trabalho_pontual'
  status: 'rascunho' | 'aguardando_aprovacao' | 'executando' | 'concluido' | 'falhou' | 'cancelado'
  criado_em: number
  aprovacao?: { por: string; em: number } | null
}

interface Tarefa {
  tarefa_id: string
  plano_id: string
  titulo: string
  depende_de: string[]        // grafo explícito, sem ciclo
  agente_id: string | null    // null = a designar
  execucao_id: string | null  // preenchido quando delega; liga ao agent-execution-store
  status: 'pendente' | 'pronta' | 'executando' | 'concluida' | 'falhou' | 'bloqueada'
  resultado?: unknown
  erro?: string
}
```

### Três decisões de desenho

**1. `execucao_id` liga ao store existente — não o duplica.**
Uma `Tarefa` **aponta** para uma `ExecucaoGravada`. Sofia não guarda transcript nem status de execução; ela guarda **qual execução corresponde a qual tarefa do plano**.

**2. `parent_execution_id` é preenchido pela primeira vez.**
Quando Sofia delega a tarefa B que depende da A, a execução de B recebe `parent_execution_id` da execução de A. É o campo que já existe e nunca foi usado.

**3. `depende_de` é grafo, não lista.**
A ordem de execução é **derivada** do grafo (topológica), nunca armazenada como sequência. Guardar a ordem criaria duas verdades: a lista e o grafo.

---

## 5. O CICLO

```
intenção
   │
   ├─ 1. interpretar  → escopo (organização | projeto | pontual)
   │
   ├─ 2. planejar     → Plano + Tarefas com depende_de
   │
   ├─ 3. verificar    → permission-guard por tarefa, com o ator do plano
   │
   ├─ 4. aprovar?     → se a política exigir: status = aguardando_aprovacao
   │
   ├─ 5. delegar      → Hermes executa; execucao_id gravado na tarefa
   │
   ├─ 6. acompanhar   → status vem do agent-execution-store, não de cópia
   │
   └─ 7. prestar contas → resultado agregado + auditoria
```

**O passo 6 é o que impede a duplicação**: Sofia **lê** o status da execução no store existente. Ela não mantém uma cópia que possa divergir.

---

## 6. SEGURANÇA — as três regras

1. **Sofia não contorna o Policy Engine** (§ do GOAL).
   Cada tarefa passa por `exigirAtor` com o **ator do plano** — não com um ator de sistema. Se o plano foi pedido por um `operator`, as tarefas rodam como `operator`.

2. **Sofia não altera as próprias permissões.**
   `manage_actor` e `change_role` são `HUMAN_ONLY` no `rbac.ts` — Sofia não os alcança nem se quisesse.

3. **Aprovação não é opcional quando a política a exige.**
   O plano entra em `aguardando_aprovacao` e **não progride** sem `agent-approval` registrado. A aprovação é do store existente, não de um campo em Sofia.

---

## 7. O QUE ESTA RODADA **NÃO** FEZ

| Item | Por quê |
|---|---|
| Escrever `sofia-store.ts` | o §11 pede spec e ADR; a construção é o §12/§13 |
| Criar canais IPC de Sofia | idem — e a r2 mostrou que canal sem guarda é dívida |
| Escolher a interface de entrada (chat? formulário?) | é decisão de produto, não de arquitetura |
| Definir o formato do plano em linguagem natural | depende do modelo; o plano **estruturado** é o contrato |

---

## 8. O QUE FALTA PARA CONSTRUIR

Em ordem, e cada um com seu pré-requisito:

1. **`sofia-store.ts`** — `Plano` + `Tarefa`, fila de escrita, `tenant_id` (padrão dos 26 stores)
2. **Grafo de dependência** — validação de ciclo + ordem topológica (função pura, testável)
3. **`sofia-ipc.ts`** — 4–6 canais, **todos com `exigirAtor`** desde o primeiro commit
4. **Ponte com `agent-execution-store`** — preencher `execucao_id` e `parent_execution_id`
5. **Tela** — o plano, o grafo e a prestação de contas

**Nenhum desses passos existe hoje.** Este documento é o contrato que eles vão cumprir.
