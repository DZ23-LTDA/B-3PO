# GOAL V2 — RODADA 20: A PONTE PLANO → EXECUÇÃO (PASSO 4 DE 5)

**Data**: 05/11/2026 · **Item 7 — o orquestrador**

---

## O CAMPO QUE ESPEROU VINTE RODADAS

A r16 mediu: **`parent_execution_id` existe no tipo `IniciarInput` e em `ExecucaoGravada`, e nada em todo o repositório o preenche.**

O comentário no próprio `agent-execution-store.ts:6` registra isso: *"`parent_execution_id` não existe em lugar nenhum"* — o campo estava no tipo, a árvore de coordenação estava modelada, e **ninguém a usava**.

**Esta rodada é o primeiro lugar do repositório que o preenche.**

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/sofia-ponte.ts` — **5 exportações**:

| Função | O que faz |
|---|---|
| `paiDaTarefa` | a execução da primeira dependência concluída — ou `null` |
| `motivoDeRecusa` | por que a tarefa não pode ser delegada agora |
| `delegarTarefa` | chama `execucoes.iniciar` e grava `execucao_id` |
| `lerExecucao` | status e resultado, **lidos agora** |
| `statusDerivadoDaExecucao` | o status da tarefa, **calculado** da execução |

---

## `parent_execution_id` É UMA ÁRVORE, NÃO UM GRAFO

```ts
export function paiDaTarefa(tarefa, plano): null | string {
  for (const dep of tarefa.depende_de) {
    const anterior = plano.tarefas.find(t => t.tarefa_id === dep)
    if (anterior?.execucao_id) return anterior.execucao_id
  }
  return null
}
```

> **Um nó com duas dependências não pode ter dois pais.** Escolher o **primeiro na ordem do `depende_de`** é determinístico.
>
> **O que se perde (a segunda aresta) já está preservado** no próprio `depende_de` do plano — a árvore é derivada dele, não substituta.

**Teste:** plano com `t3` dependendo de `['t2', 't1']`, ambos com execução → pai é `exec-2`.

---

## AS QUATRO RECUSAS, CADA UMA DIZENDO O QUE FAZER

| Recusa | Quando |
|---|---|
| `tarefa_inexistente` | id errado |
| `ja_delegada` | a tarefa já tem execução — delegar de novo **duplicaria o trabalho** |
| `dependencias_pendentes` | o grafo não liberou; **esperar, não forçar** |
| `sem_agente` | o plano não escolheu quem executa |

---

## O ERRO DO RUNTIME **SOBE COMO ESTÁ**

```ts
if (r.error) return { error: r.error }   // 'sem_credencial' continua 'sem_credencial'
```

> **Sofia não transforma "sem credencial" em "plano falhou".** São fatos diferentes e a tela precisa mostrar qual: um pede configuração, o outro pede investigação.
>
> **E nada é gravado** — a tarefa continua sem execução, pronta para tentar de novo quando a credencial existir.

---

## A INVARIANTE CENTRAL — o status é **lido**, não copiado

```ts
export function statusDerivadoDaExecucao(deps, execucaoId): null | string {
  const execucao = lerExecucao(deps, execucaoId)   // ← consulta AGORA
  ...
}
```

**O teste que decide:**

```ts
fake.store.iniciar({ execution_id: 'exec-1', ... })
expect(statusDerivadoDaExecucao(deps, 'exec-1')).toBe('executando')

fake.mudarStatus('exec-1', 'concluida')          // ninguém tocou no plano
expect(statusDerivadoDaExecucao(deps, 'exec-1')).toBe('concluida')
```

> **Se a ponte copiasse o status, a segunda leitura ficaria `executando`** — e a prestação de contas mentiria sobre o que aconteceu.

### O mapeamento é explícito porque os vocabulários são diferentes de propósito

| Runtime | Tarefa |
|---|---|
| `rodando` | `executando` |
| `concluida` | `concluida` |
| `falhou` | `falhou` |
| `cancelada` | **`bloqueada`** |

> **A tarefa fala do plano; a execução fala do runtime.** Traduzir num lugar só é o que impede os dois vocabulários de vazarem um para o outro.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Exportações da ponte | **5** |
| Testes novos | **15** |
| Suíte de Sofia | **74 verdes** (19 store + 28 grafo + 12 canais + 15 ponte) |
| Regressão (sofia + agent + permissão) | **195 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| **`parent_execution_id` preenchido pela 1ª vez** | **sim** |

---

## ONDE ESTAMOS NA SPEC

| # | Passo | Estado |
|---|---|---|
| 1 | `sofia-store.ts` | ✅ r17 |
| 2 | grafo de dependência | ✅ r18 |
| 3 | `sofia-ipc.ts` | ✅ r19 |
| **4** | **ponte com `agent-execution-store`** | ✅ **r20** |
| 5 | Tela | próxima |

---

## PRÓXIMA RODADA — passo 5, o último

**A tela.** Um plano precisa ser visível: objetivo, tarefas, o grafo (quais estão prontas, qual ciclo existe), e a prestação de contas.

**E é onde a r15 volta**: a tela entra no menu com `SIDEBAR_NAV_AREA`, e a ordem nova já existe para receber o item — depois de `Automações`, na faixa "o que automatiza".

**A spec não inclui a tela na lista de cinco passos por acaso**: sem ela, os quatro passos anteriores são código inalcançável — exatamente o padrão que a r2 mediu em cinco camadas.
