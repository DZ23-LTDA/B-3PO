# ADR-001 — Sofia é uma camada de coordenação, não um runtime

**Status**: aceita · **Rodada**: 16 do GOAL V2 · **Data**: 05/11/2026
**Decide**: como a "inteligência central" do B-3PO se relaciona com o Hermes
**Contexto completo**: `docs/b3po/SOFIA-ORCHESTRATION-SPEC.md`

---

## Contexto

O GOAL V2 diz *"Inteligência central: Sofia"* e não define o que ela é. A busca no repositório encontrou **zero ocorrências** de Sofia no código — as 8 ocorrências são de um catálogo de skills de terceiros e deste próprio documento.

O §11 pede três alternativas comparadas e uma escolha *"com base no código atual, menor duplicação, persistência, segurança, facilidade de testes e capacidade de recuperação"*.

Restrições, dadas não como sugestão mas como condição:

- *"Hermes permanece o único runtime."*
- *"Não duplicar sessão, transcript, memória canônica, tool loop ou runtime."*
- *"Sofia não contorna Policy Engine."*

## Decisão

**Sofia é uma camada de interpretação, planejamento e coordenação que persiste planos e delega execução ao Hermes por interfaces reais.**

Ela **não executa** turnos, **não guarda** transcript, **não decide** permissão e **não mantém** dado de negócio.

## Alternativas consideradas

| | Alternativa | Por que não |
|---|---|---|
| **A** | Serviço de orquestração Python/Node próprio | Recria fila, retry, status e ciclo de vida que o runtime já tem. É o **segundo runtime** que o GOAL proíbe duas vezes |
| **B** | Conjunto de skills e configurações Hermes | Não duplica nada, mas **não entrega** plano estruturado, grafo de dependências nem prestação de contas. Um prompt não tem plano inspecionável |
| **C** | Camada que delega por interfaces reais | **Escolhida** |

## Consequências

### Positivas

- **Nada de infraestrutura nova**: `agent-execution-store`, `permission-guard`, `agent-approval` e o gateway já existem e são reusados.
- **O plano é dado, não prompt** — inspecionável, testável, recuperável.
- **`parent_execution_id` passa a ser preenchido.** O campo existe no tipo desde que o store nasceu e nunca foi usado; a árvore de coordenação é exatamente o que ele modela.
- **A guarda é a mesma dos 30 canais fechados nas rodadas 3–8** — não há uma segunda política para manter.

### Negativas

- **Sofia não pode "pensar" sozinha.** Ela produz um plano estruturado; a interpretação de linguagem natural depende do modelo e acontece **antes** dela, não dentro.
- **O plano precisa de um formato.** Isso é contrato novo e vai exigir migração se mudar.
- **Aprovação adiciona latência** — um plano com tarefa que exige aprovação não progride até alguém decidir. É o comportamento desejado, e é um custo real.

### Neutras

- Sofia **não é um agente** no sentido do `agent-roster`. Se o produto quiser uma persona chamada Sofia na interface, ela será uma **entrada para esta camada**, não a camada.

## O que esta ADR **não** decide

| Fica para | Decisão |
|---|---|
| **Produto (proprietário)** | Sofia aparece no chat? Como formulário? Nos dois? |
| **§12 do GOAL** | Organization Builder, Project Builder, Agent Factory |
| **§13 do GOAL** | A construção — store, grafo, canais, tela |
| **Fora de escopo** | Modelo de linguagem para interpretar intenção |

## Como revisar esta decisão

Ela deve ser revista se:

1. O Hermes passar a oferecer uma **API de plano persistente nativa** — aí a camada vira adaptador, não store.
2. O produto exigir **múltiplos runtimes** por outro motivo — o que reabriria o §6 do GOAL.
3. O agrupamento de tarefas provar que **não precisa de grafo** (só fila). Isso simplificaria bastante, e o teste seria: existe tarefa que só pode rodar depois de duas outras?
