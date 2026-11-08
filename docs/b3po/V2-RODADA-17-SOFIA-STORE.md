# GOAL V2 — RODADA 17: O STORE DE PLANOS (PASSO 1 DE 5)

**Data**: 05/11/2026 · **Item 7 — construir o orquestrador**
**Contrato**: `docs/b3po/SOFIA-ORCHESTRATION-SPEC.md` + `adr/ADR-001-SOFIA.md`

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/sofia-store.ts` — **357 linhas**, o **passo 1 dos cinco** que a spec lista:

| # | Passo | Estado |
|---|---|---|
| **1** | **`sofia-store.ts`** — `Plano` + `Tarefa` | ✅ **esta rodada** |
| 2 | Grafo de dependência (topológico + detecção de ciclo) | próxima |
| 3 | `sofia-ipc.ts` — canais **com guarda desde o primeiro commit** | depois |
| 4 | Ponte com `agent-execution-store` (preencher `parent_execution_id`) | depois |
| 5 | Tela | depois |

---

## AS QUATRO INVARIANTES — e os testes que as travam

A spec §4 fixa quatro invariantes. **Se qualquer uma quebrar, a camada vira um segundo runtime disfarçado.** Cada uma tem teste.

### 1. `execucao_id` **aponta**, não duplica

```ts
execucao_id: null | string   // liga ao agent-execution-store
```

**O store guarda o id e o status do PLANO. Não há campo copiado do runtime.**

```ts
it('não há campo copiado do runtime', () => {
  expect(Object.keys(tarefa)).not.toContain('transcript')
  expect(Object.keys(tarefa)).not.toContain('sessao_id')
})
```

**E o `resultado` só entra se vier no patch** — o store não inventa um resultado para parecer que rodou.

### 2. `depende_de` é a **única** representação de precedência

O grafo é gravado como veio. **A ordem de execução nunca é armazenada** — ela é derivada por ordenação topológica no passo 2.

> **Gravar a ordem criaria uma segunda verdade** que ninguém atualiza quando uma dependência muda.

### 3. "Concluído" exige tarefas concluídas

```ts
if (novo === 'concluido' && plano.tarefas.some(t => t.status !== 'concluida')) {
  return { error: 'tarefas_pendentes' }
}
```

> **"Concluído" é afirmação sobre o trabalho, não sobre a intenção.** Aceitar isso faria a prestação de contas mentir.

### 4. Não existe autoaprovação

```ts
if (plano.ator_id === por) return { error: 'autoaprovacao' }
```

> **A aprovação existe porque alguém além de quem pediu precisa concordar.** Se o mesmo ator aprovasse, a aprovação seria decorativa — e o `agent-approval` já existe exatamente para isso.

---

## OUTRAS DECISÕES

| Decisão | Por quê |
|---|---|
| **Fila de escrita** (padrão dos 25 stores) | dois `criar` concorrentes não podem perder um plano — **tem teste** |
| **Recusas nomeadas** (`objetivo_obrigatorio`, `ator_obrigatorio`, `tarefa_duplicada`, `autoaprovacao`) | um "erro" genérico não diz o que corrigir |
| **`tenant_id` obrigatório** (default `local`) | padrão dos 26 stores; r11 mostrou o custo de um store fora do padrão |
| **Id de tarefa duplicado recusado** | duas tarefas com o mesmo id tornam o grafo **ambíguo**: a dependência não sabe a qual aponta |
| **`parseSofia` tolerante** | JSON corrompido vira lista vazia, não exceção — o CRM não pode deixar de abrir por causa de um plano ruim |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do store | **357** (teto 2000) |
| Testes | **19 verdes** |
| Invariantes da spec cobertas | **4 de 4** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Canlais IPC criados | **0** — canal sem guarda é dívida (r2) |

---

## PRÓXIMA RODADA — passo 2

**O grafo de dependência.** Função pura:

1. **Detecção de ciclo** — um plano com `A→B→A` nunca termina, e o store aceita (é dado, não validação de grafo)
2. **Ordem topológica** — quais tarefas estão `prontas` (todas as dependências `concluida`)
3. **Profundidade** — para o limite de concorrência que o `multiagent` do GOAL exige

**É função pura porque é o único jeito de testar o caso ruim sem montar um plano real.** E porque a ordem derivada é a prova de que ela não foi gravada.
