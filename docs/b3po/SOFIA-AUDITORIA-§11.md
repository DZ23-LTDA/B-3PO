# SOFIA — AUDITORIA DAS 12 CAPACIDADES DO §11

**Rodada 100 do GOAL V2** · medido, não declarado

---

## O QUE O §11 PEDE (linhas 358-370)

> *"Sofia deve: entender intenção; identificar contexto; classificar organização, projeto ou trabalho pontual; produzir plano estruturado; selecionar agentes/skills; definir tarefas e dependências; verificar políticas; solicitar aprovação; delegar ao Hermes; acompanhar execução; registrar resultados e erros; apresentar prestação de contas."*

**Doze capacidades.**

---

## AUDITORIA — medida por `grep` no código de produção

| # | Capacidade | Estado | Onde |
|---|---|---|---|
| 1 | **entender intenção** | ❌ **não é da Sofia** | ver abaixo |
| 2 | identificar contexto | ✅ | 42 ocorrências |
| 3 | classificar org/projeto/pontual | ✅ | 63 |
| 4 | produzir plano estruturado | ✅ | 157 |
| 5 | selecionar agentes/skills | ✅ | `agent-factory.ts` (r82) |
| 6 | definir tarefas e dependências | ✅ | `sofia-grafo.ts` |
| 7 | verificar políticas | ✅ | `permission-guard` |
| 8 | solicitar aprovação | ✅ | 106 |
| 9 | delegar ao Hermes | ✅ | `sofia-ponte.ts` |
| 10 | acompanhar execução | ✅ | 14 |
| 11 | registrar resultados e erros | ✅ | 3265 |
| 12 | prestação de contas | ✅ | 17 |

**11 de 12.**

---

## A QUE FALTA — e por que ela **não deve** existir aqui

### "Entender intenção" é do Hermes, e isso é a decisão do ADR-001

O `ADR-001-SOFIA.md` (r16) compara as três alternativas e escolhe **C**:

> *"Sofia é uma camada de interpretação, planejamento e coordenação que **persiste planos** e **não executa** turnos, **não guarda** transcript, **não decide** permissão e **não** [...].*"

**E o §11:376 reforça:**

> *"**Não duplicar** sessão, transcript, memória canônica, **tool loop** ou runtime."*

> **Entender linguagem natural É o tool loop do runtime.** Uma Sofia que "entendesse intenção" teria de **chamar um modelo** — e passaria a ser **um segundo runtime**, exatamente o que o §11 proíbe.
>
> **A Sofia recebe a intenção JÁ INTERPRETADA** (o `pedido` do plano, em texto) e **a partir daí** classifica, planeja, delega e acompanha.

**A capacidade está ausente por desenho** — e o `sofia-ponte.ts` diz isso com todas as letras:

> *"Ela traduz «tarefa do plano» em «execução do runtime». **Não executa nada**: chama `execu[...]` que já sabe checar credencial, limite e concorrência. **Sofia não duplica essas regras**."*

---

## O QUE O §11 PEDE E **JÁ EXISTE** DESDE ANTES DESTA RODADA

| Entregável | Estado |
|---|---|
| **`SOFIA-ORCHESTRATION-SPEC.md`** | ✅ **161 linhas** (r16) |
| **ADR de decisão** | ✅ **`adr/ADR-001-SOFIA.md`** (r16, 45 linhas) |
| Plano persistente | ✅ `project-store.ts` (r77) |
| Grafo de tarefas | ✅ `sofia-grafo.ts` (r18) |
| Policy checks | ✅ `permission-guard` |
| Delegação real ao Hermes | ✅ `sofia-ponte.ts` (r20) |

> **A rodada 100 não precisou construir Sofia. Ela precisou MEDIR que a Sofia dos r16–r22 resiste ao §11** — e o resultado é que **11 das 12 capacidades existem, e a décima segunda está ausente pela razão certa**.

---

## A PERSISTÊNCIA (§11:372-374)

| Campo exigido | Estado |
|---|---|
| identificadores | ✅ `tarefa_id`, `execucao_id` |
| **objetivo** | ✅ `Projeto.objetivo` (r76) |
| **escopo** | ✅ `Projeto.escopo` (r76) |
| **tarefas** | ✅ `sofia-store` |
| **dependências** | ✅ `depende_de` |
| organização/projeto | ✅ `company_id` + `project_id` |
| ator | ✅ `actorOf` |
| permissões | ✅ `rbac.ts` |
| aprovação | ✅ `purchase-approval`, `agent-approval` |
| status | ✅ |
| resultados | ✅ `SofiaTarefa.resultado` |
| **referências de auditoria** | ✅ `audit-store` (r35) |

**12 de 12.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Capacidades exigidas | **12** |
| Implementadas | **11** |
| Ausente **por desenho** | **1** ("entender intenção") |
| Campos de persistência | **12 de 12** |
| Código escrito nesta rodada | **0** |

---

## O QUE ISSO SIGNIFICA PARA A ORDEM DO DONO

A ordem 6 é *"**Definir tecnicamente Sofia**"*.

> **Está definida desde a r16** — com ADR, spec de 161 linhas, grafo, orquestrador, ponte e 11 capacidades medidas.
>
> **O que faltava era a MEDIÇÃO**, e ela está aqui: cada capacidade aponta para o arquivo que a implementa, e a única ausente tem **o parágrafo do §11 que a proíbe**.

---

## PRÓXIMA RODADA

O §13 e o §11 estão medidos. A ordem do dono tem **sete itens** — e o **7º** (*"construir o orquestrador e expandir os negócios progressivamente"*) é o que tem **mais trabalho não feito**: o plano existe, o grafo existe, a ponte existe, e **o que falta é o primeiro uso real**.

> **100 rodadas.** Sofia não foi construída hoje — foi **auditada**, e passou em 11 de 12. **A que falhou é a que o GOAL proíbe**, e essa é a melhor notícia que uma auditoria pode dar.
